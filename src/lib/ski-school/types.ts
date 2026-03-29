export type StudentLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Discipline = "ski" | "snowboard";

export type LessonTimeSlot = "AM" | "PM" | "FULL_DAY";

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

/** Target age range for a lesson group (years). */
export const GROUP_AGE_RANGES = ["4-6", "7-12"] as const;
export type GroupAgeRange = (typeof GROUP_AGE_RANGES)[number];

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  discipline: Discipline;
  level: StudentLevel;
  medicalInfo: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  notes: string;
};

export type Instructor = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  disciplines: Array<Discipline>;
  notes: string;
};

/** Display “First Last” for roster UI and messages. */
export function formatFullName(p: {
  firstName: string;
  lastName: string;
}): string {
  const f = p.firstName.trim();
  const l = p.lastName.trim();
  if (f && l) return `${f} ${l}`;
  return f || l;
}

/** Sort roster-style: last name, then first. */
export function comparePersonName(
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string }
): number {
  const c = a.lastName.localeCompare(b.lastName);
  if (c !== 0) return c;
  return a.firstName.localeCompare(b.firstName);
}

export type LessonGroup = {
  id: string;
  studentIds: Array<string>;
  instructorIds: Array<string>;
  leadInstructorId: string | null;
  day: Weekday;
  time: LessonTimeSlot;
  discipline: Discipline;
  level: StudentLevel;
  ageRange: GroupAgeRange;
  notes: string;
};

export function parseDragPayload(
  id: string | number
): { kind: "student" | "instructor"; entityId: string } | null {
  const s = String(id);
  const studentPrefix = "student:";
  const instructorPrefix = "instructor:";
  if (s.startsWith(studentPrefix)) {
    return { kind: "student", entityId: s.slice(studentPrefix.length) };
  }
  if (s.startsWith(instructorPrefix)) {
    return {
      kind: "instructor",
      entityId: s.slice(instructorPrefix.length),
    };
  }
  return null;
}

export const DROP_POOL_STUDENTS = "drop-pool-students";
export const DROP_ROSTER_STUDENTS = "drop-roster-students";
