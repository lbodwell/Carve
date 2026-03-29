import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { seedGroups, seedInstructors, seedStudents } from "./seed";

import { hasDuplicateIdentity } from "./group-identity";
import {
  instructorFitsGroup,
  rosterValidationError,
  studentFitsGroup,
} from "./placement";
import {
  instructorHasOverlappingAssignment,
  studentHasOverlappingAssignment,
} from "./schedule";
import type { ReactNode } from "react";
import type { Instructor, LessonGroup, Student } from "./types";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export type UpsertStudentInput = Omit<Student, "id"> & { id?: string };
export type UpsertInstructorInput = Omit<Instructor, "id"> & { id?: string };
export type UpsertGroupInput = Omit<LessonGroup, "id"> & { id?: string };

export type UpsertGroupResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type AssignmentResult = { ok: true } | { ok: false; error: string };

export { groupIdentityKey } from "./group-identity";

export function normalizeGroupLead(g: LessonGroup): LessonGroup {
  if (g.instructorIds.length === 0) {
    return { ...g, leadInstructorId: null };
  }
  if (
    g.leadInstructorId == null ||
    !g.instructorIds.includes(g.leadInstructorId)
  ) {
    return { ...g, leadInstructorId: g.instructorIds[0] };
  }
  return g;
}

type SkiSchoolContextValue = {
  students: Array<Student>;
  instructors: Array<Instructor>;
  groups: Array<LessonGroup>;
  getStudent: (id: string) => Student | undefined;
  getInstructor: (id: string) => Instructor | undefined;
  getGroup: (id: string) => LessonGroup | undefined;
  upsertStudent: (input: UpsertStudentInput) => string;
  removeStudent: (id: string) => void;
  upsertInstructor: (input: UpsertInstructorInput) => string;
  removeInstructor: (id: string) => void;
  upsertGroup: (input: UpsertGroupInput) => UpsertGroupResult;
  removeGroup: (id: string) => void;
  addStudentToGroup: (groupId: string, studentId: string) => AssignmentResult;
  removeStudentFromGroup: (groupId: string, studentId: string) => void;
  addInstructorToGroup: (
    groupId: string,
    instructorId: string
  ) => AssignmentResult;
  removeInstructorFromGroup: (groupId: string, instructorId: string) => void;
  setGroupSchedule: (
    groupId: string,
    patch: Partial<
      Pick<
        LessonGroup,
        | "day"
        | "time"
        | "level"
        | "ageRange"
        | "discipline"
        | "notes"
        | "leadInstructorId"
      >
    >
  ) => { ok: true } | { ok: false; error: string };
};

const SkiSchoolContext = createContext<SkiSchoolContextValue | null>(null);

export function SkiSchoolProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Array<Student>>(() => [
    ...seedStudents,
  ]);
  const [instructors, setInstructors] = useState<Array<Instructor>>(() => [
    ...seedInstructors,
  ]);
  const [groups, setGroups] = useState<Array<LessonGroup>>(() =>
    [...seedGroups].map((g) => normalizeGroupLead(g))
  );

  const getStudent = useCallback(
    (id: string) => students.find((s) => s.id === id),
    [students]
  );
  const getInstructor = useCallback(
    (id: string) => instructors.find((i) => i.id === id),
    [instructors]
  );
  const getGroup = useCallback(
    (id: string) => groups.find((g) => g.id === id),
    [groups]
  );

  const upsertStudent = useCallback((input: UpsertStudentInput) => {
    const id = input.id ?? uid("stu");
    setStudents((prev) => {
      const next = input.id ? prev.filter((s) => s.id !== input.id) : prev;
      const row: Student = {
        id,
        name: input.name,
        age: input.age,
        discipline: input.discipline,
        level: input.level,
        medicalInfo: input.medicalInfo,
        parentName: input.parentName,
        parentPhone: input.parentPhone,
        parentEmail: input.parentEmail,
        notes: input.notes,
      };
      return [...next, row].sort((a, b) => a.name.localeCompare(b.name));
    });
    return id;
  }, []);

  const removeStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        studentIds: g.studentIds.filter((e) => e !== id),
      }))
    );
  }, []);

  const upsertInstructor = useCallback((input: UpsertInstructorInput) => {
    const id = input.id ?? uid("ins");
    setInstructors((prev) => {
      const next = input.id ? prev.filter((i) => i.id !== input.id) : prev;
      const row: Instructor = {
        id,
        name: input.name,
        phone: input.phone,
        email: input.email,
        disciplines: [...input.disciplines],
        notes: input.notes,
      };
      return [...next, row].sort((a, b) => a.name.localeCompare(b.name));
    });
    return id;
  }, []);

  const removeInstructor = useCallback((id: string) => {
    setInstructors((prev) => prev.filter((i) => i.id !== id));
    setGroups((prev) =>
      prev.map((g) => {
        const instructorIds = g.instructorIds.filter((e) => e !== id);
        let leadInstructorId = g.leadInstructorId;
        if (leadInstructorId === id) {
          leadInstructorId = instructorIds[0] ?? null;
        }
        return normalizeGroupLead({
          ...g,
          instructorIds,
          leadInstructorId,
        });
      })
    );
  }, []);

  const upsertGroup = useCallback(
    (input: UpsertGroupInput): UpsertGroupResult => {
      const newId = input.id ?? uid("grp");
      let outcome: UpsertGroupResult = { ok: true, id: newId };

      setGroups((prev) => {
        const without = input.id ? prev.filter((g) => g.id !== input.id) : prev;
        const row: LessonGroup = normalizeGroupLead({
          id: newId,
          studentIds: [...input.studentIds],
          instructorIds: [...input.instructorIds],
          leadInstructorId: input.leadInstructorId,
          day: input.day,
          time: input.time,
          discipline: input.discipline,
          level: input.level,
          ageRange: input.ageRange,
          notes: input.notes,
        });

        const rosterErr = rosterValidationError(
          without,
          row,
          (sid) => students.find((s) => s.id === sid),
          (iid) => instructors.find((i) => i.id === iid)
        );
        if (rosterErr) {
          outcome = { ok: false, error: rosterErr };
          return prev;
        }

        if (hasDuplicateIdentity(without, row, input.id)) {
          outcome = {
            ok: false,
            error:
              "A group with this day, time, discipline, age range, level, and lead instructor already exists.",
          };
          return prev;
        }

        outcome = { ok: true, id: newId };
        return [...without, row];
      });

      return outcome;
    },
    [students, instructors]
  );

  const removeGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const addStudentToGroup = useCallback(
    (groupId: string, studentId: string): AssignmentResult => {
      let result: AssignmentResult = { ok: true };
      setGroups((prev) => {
        const g = prev.find((x) => x.id === groupId);
        const s = students.find((x) => x.id === studentId);
        if (!g || !s) {
          result = { ok: false, error: "Group or student not found." };
          return prev;
        }
        if (g.studentIds.includes(studentId)) return prev;
        if (!studentFitsGroup(s, g)) {
          result = {
            ok: false,
            error: `${s.name} doesn’t match this lesson’s age range or discipline.`,
          };
          return prev;
        }
        if (
          studentHasOverlappingAssignment(prev, studentId, g.day, g.time, g.id)
        ) {
          result = {
            ok: false,
            error: `${s.name} is already in another lesson at an overlapping time.`,
          };
          return prev;
        }
        result = { ok: true };
        return prev.map((grp) =>
          grp.id === groupId
            ? { ...grp, studentIds: [...grp.studentIds, studentId] }
            : grp
        );
      });
      return result;
    },
    [students]
  );

  const removeStudentFromGroup = useCallback(
    (groupId: string, studentId: string) => {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                studentIds: g.studentIds.filter((e) => e !== studentId),
              }
            : g
        )
      );
    },
    []
  );

  const addInstructorToGroup = useCallback(
    (groupId: string, instructorId: string): AssignmentResult => {
      let result: AssignmentResult = { ok: true };
      setGroups((prev) => {
        const g = prev.find((x) => x.id === groupId);
        const ins = instructors.find((x) => x.id === instructorId);
        if (!g || !ins) {
          result = { ok: false, error: "Group or instructor not found." };
          return prev;
        }
        if (g.instructorIds.includes(instructorId)) return prev;
        if (!instructorFitsGroup(ins, g)) {
          result = {
            ok: false,
            error: `${ins.name} doesn’t teach ${g.discipline === "ski" ? "ski" : "snowboard"}.`,
          };
          return prev;
        }
        if (
          instructorHasOverlappingAssignment(
            prev,
            instructorId,
            g.day,
            g.time,
            g.id
          )
        ) {
          result = {
            ok: false,
            error: `${ins.name} is already in another lesson at an overlapping time.`,
          };
          return prev;
        }
        result = { ok: true };
        return prev.map((grp) => {
          if (grp.id !== groupId) return grp;
          const instructorIds = [...grp.instructorIds, instructorId];
          const leadInstructorId = grp.leadInstructorId ?? instructorId;
          return normalizeGroupLead({
            ...grp,
            instructorIds,
            leadInstructorId,
          });
        });
      });
      return result;
    },
    [instructors]
  );

  const removeInstructorFromGroup = useCallback(
    (groupId: string, instructorId: string) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== groupId) return g;
          const instructorIds = g.instructorIds.filter(
            (e) => e !== instructorId
          );
          let leadInstructorId = g.leadInstructorId;
          if (leadInstructorId === instructorId) {
            leadInstructorId = instructorIds[0] ?? null;
          }
          return normalizeGroupLead({
            ...g,
            instructorIds,
            leadInstructorId,
          });
        })
      );
    },
    []
  );

  const setGroupSchedule = useCallback(
    (
      groupId: string,
      patch: Partial<
        Pick<
          LessonGroup,
          | "day"
          | "time"
          | "level"
          | "ageRange"
          | "discipline"
          | "notes"
          | "leadInstructorId"
        >
      >
    ): { ok: true } | { ok: false; error: string } => {
      let result: { ok: true } | { ok: false; error: string } = {
        ok: true,
      };

      setGroups((prev) => {
        const g = prev.find((x) => x.id === groupId);
        if (!g) {
          result = { ok: false, error: "Group not found." };
          return prev;
        }
        const merged = normalizeGroupLead({ ...g, ...patch });

        if (merged.leadInstructorId != null) {
          if (!merged.instructorIds.includes(merged.leadInstructorId)) {
            result = {
              ok: false,
              error: "Lead instructor must be assigned to this group.",
            };
            return prev;
          }
        }
        if (
          merged.instructorIds.length > 0 &&
          merged.leadInstructorId == null
        ) {
          result = {
            ok: false,
            error: "Choose a lead instructor for this group.",
          };
          return prev;
        }

        const rosterErr = rosterValidationError(
          prev,
          merged,
          (sid) => students.find((s) => s.id === sid),
          (iid) => instructors.find((i) => i.id === iid)
        );
        if (rosterErr) {
          result = { ok: false, error: rosterErr };
          return prev;
        }

        if (hasDuplicateIdentity(prev, merged, groupId)) {
          result = {
            ok: false,
            error:
              "Another group already uses this day, time, discipline, age range, level, and lead instructor.",
          };
          return prev;
        }
        result = { ok: true };
        return prev.map((x) => (x.id === groupId ? merged : x));
      });

      return result;
    },
    [students, instructors]
  );

  const value = useMemo(
    () => ({
      students,
      instructors,
      groups,
      getStudent,
      getInstructor,
      getGroup,
      upsertStudent,
      removeStudent,
      upsertInstructor,
      removeInstructor,
      upsertGroup,
      removeGroup,
      addStudentToGroup,
      removeStudentFromGroup,
      addInstructorToGroup,
      removeInstructorFromGroup,
      setGroupSchedule,
    }),
    [
      students,
      instructors,
      groups,
      getStudent,
      getInstructor,
      getGroup,
      upsertStudent,
      removeStudent,
      upsertInstructor,
      removeInstructor,
      upsertGroup,
      removeGroup,
      addStudentToGroup,
      removeStudentFromGroup,
      addInstructorToGroup,
      removeInstructorFromGroup,
      setGroupSchedule,
    ]
  );

  return (
    <SkiSchoolContext.Provider value={value}>
      {children}
    </SkiSchoolContext.Provider>
  );
}

export function useSkiSchool() {
  const ctx = useContext(SkiSchoolContext);
  if (!ctx) {
    throw new Error("useSkiSchool must be used within SkiSchoolProvider");
  }
  return ctx;
}
