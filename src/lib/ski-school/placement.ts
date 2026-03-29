import {
  instructorHasOverlappingAssignment,
  studentHasOverlappingAssignment,
} from "./schedule";
import { studentAgeBand } from "./roster-filters";
import type { Instructor, LessonGroup, Student } from "./types";

export function studentFitsGroup(s: Student, g: LessonGroup): boolean {
  if (s.discipline !== g.discipline) return false;
  const band = studentAgeBand(s.age);
  if (band == null || band !== g.ageRange) return false;
  return true;
}

export function instructorFitsGroup(i: Instructor, g: LessonGroup): boolean {
  return i.disciplines.includes(g.discipline);
}

/** Returns a user-facing error message if the group's roster breaks rules; otherwise null. */
export function rosterValidationError(
  groups: Array<LessonGroup>,
  g: LessonGroup,
  getStudent: (id: string) => Student | undefined,
  getInstructor: (id: string) => Instructor | undefined
): string | null {
  for (const sid of g.studentIds) {
    const s = getStudent(sid);
    if (!s) return "A student on this roster no longer exists.";
    if (!studentFitsGroup(s, g)) {
      return `${s.name} doesn’t match this lesson’s age range or discipline.`;
    }
    if (studentHasOverlappingAssignment(groups, sid, g.day, g.time, g.id)) {
      return `${s.name} is already in another lesson at an overlapping time.`;
    }
  }
  for (const iid of g.instructorIds) {
    const ins = getInstructor(iid);
    if (!ins) return "An instructor on this roster no longer exists.";
    if (!instructorFitsGroup(ins, g)) {
      return `${ins.name} doesn’t teach this lesson’s discipline.`;
    }
    if (instructorHasOverlappingAssignment(groups, iid, g.day, g.time, g.id)) {
      return `${ins.name} is already in another lesson at an overlapping time.`;
    }
  }
  return null;
}
