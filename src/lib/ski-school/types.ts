export type StudentLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Discipline = "ski" | "snowboard";

export type LessonTimeSlot = "AM" | "PM" | "FULL_DAY";

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

/** Target age band for a lesson group (years). */
export const GROUP_AGE_RANGES = ["4-6", "7-12"] as const;
export type GroupAgeRange = (typeof GROUP_AGE_RANGES)[number];

export type Student = {
  id: string;
  name: string;
  age: number;
  level: StudentLevel;
  medicalInfo: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  notes: string;
};

export type Instructor = {
  id: string;
  name: string;
  phone: string;
  email: string;
  disciplines: Array<Discipline>;
  notes: string;
};

export type LessonGroup = {
  id: string;
  studentIds: Array<string>;
  instructorIds: Array<string>;
  leadInstructorId: string | null;
  day: Weekday;
  time: LessonTimeSlot;
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
export const DROP_POOL_INSTRUCTORS = "drop-pool-instructors";
export const DROP_ROSTER_STUDENTS = "drop-roster-students";
export const DROP_ROSTER_INSTRUCTORS = "drop-roster-instructors";
