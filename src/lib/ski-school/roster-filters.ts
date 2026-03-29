import {
  
  
  
  
  comparePersonName,
  formatFullName
} from "./types";
import type {Discipline, GroupAgeRange, Instructor, Student} from "./types";

export type StudentAgeBandFilter = "all" | GroupAgeRange;

export type StudentMedicalFilter = "all" | "has" | "urgent";

export type StudentSortKey = "name" | "age" | "level";

export type InstructorSortKey = "name" | "conflict";

export function studentSearchHaystack(s: Student): string {
  return `${formatFullName(s)} ${s.firstName} ${s.lastName} ${s.notes} ${s.parentName} ${s.parentPhone} ${s.parentEmail} ${s.medicalInfo}`.toLowerCase();
}

export function instructorSearchHaystack(i: Instructor): string {
  return `${formatFullName(i)} ${i.firstName} ${i.lastName} ${i.notes} ${i.phone} ${i.email} ${i.disciplines.join(" ")}`.toLowerCase();
}

export function studentAgeBand(age: number): GroupAgeRange | null {
  if (age >= 4 && age <= 6) return "4-6";
  if (age >= 7 && age <= 12) return "7-12";
  return null;
}

export function isUrgentMedical(medicalInfo: string): boolean {
  if (!hasMeaningfulMedicalInfo(medicalInfo)) return false;
  const lower = medicalInfo.trim().toLowerCase();
  return (
    lower.includes("epi") ||
    lower.includes("allerg") ||
    lower.includes("diabet")
  );
}

const MEDICAL_EMPTY_PHRASES = new Set([
  "",
  "none",
  "n/a",
  "na",
  "no",
  "nil",
  "nope",
  "nothing",
  "not applicable",
  "no known",
  "no medical",
  "no issues",
  "healthy",
]);

/** True when medical text should be treated as empty for display and “has medical” filters. */
export function hasMeaningfulMedicalInfo(medicalInfo: string): boolean {
  const t = medicalInfo.trim().toLowerCase();
  if (!t) return false;
  if (MEDICAL_EMPTY_PHRASES.has(t)) return false;
  if (/^no\s*(known\s*)?(medical|allerg|issues?)?\.?$/.test(t)) return false;
  return true;
}

export type StudentFilterOptions = {
  query: string;
  level: string;
  ageBand: StudentAgeBandFilter;
  medical: StudentMedicalFilter;
  /** Omit or `"all"` = no discipline filter */
  discipline?: "all" | Discipline;
};

export function matchesStudentFilters(
  s: Student,
  opts: StudentFilterOptions
): boolean {
  const q = opts.query.trim().toLowerCase();
  if (opts.level !== "all" && String(s.level) !== opts.level) return false;

  const discipline = opts.discipline ?? "all";
  if (discipline !== "all" && s.discipline !== discipline) {
    return false;
  }

  if (opts.ageBand !== "all") {
    const band = studentAgeBand(s.age);
    if (band !== opts.ageBand) return false;
  }

  if (opts.medical === "has") {
    if (!hasMeaningfulMedicalInfo(s.medicalInfo)) return false;
  }
  if (opts.medical === "urgent") {
    if (!isUrgentMedical(s.medicalInfo)) return false;
  }

  if (!q) return true;
  return studentSearchHaystack(s).includes(q);
}

export type InstructorFilterOptions = {
  query: string;
  discipline: "all" | Discipline;
  slotConflictOnly?: boolean;
  hasSlotConflict?: (instructorId: string) => boolean;
};

export function matchesInstructorFilters(
  i: Instructor,
  opts: InstructorFilterOptions
): boolean {
  if (
    opts.discipline !== "all" &&
    !i.disciplines.includes(opts.discipline)
  ) {
    return false;
  }
  if (opts.slotConflictOnly && opts.hasSlotConflict) {
    if (!opts.hasSlotConflict(i.id)) return false;
  }
  const q = opts.query.trim().toLowerCase();
  if (!q) return true;
  return instructorSearchHaystack(i).includes(q);
}

export function sortStudents(
  list: Array<Student>,
  key: StudentSortKey,
  dir: "asc" | "desc"
): Array<Student> {
  const m = dir === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    let r = 0;
    if (key === "name") r = comparePersonName(a, b);
    else if (key === "age") r = a.age - b.age;
    else r = a.level - b.level;
    return r * m;
  });
}

export function sortInstructors(
  list: Array<Instructor>,
  key: InstructorSortKey,
  dir: "asc" | "desc",
  hasConflict?: (id: string) => boolean
): Array<Instructor> {
  const m = dir === "desc" ? -1 : 1;
  return [...list].sort((a, b) => {
    if (key === "conflict" && hasConflict) {
      const ca = hasConflict(a.id) ? 1 : 0;
      const cb = hasConflict(b.id) ? 1 : 0;
      if (ca !== cb) return (cb - ca) * m;
    }
    return comparePersonName(a, b) * m;
  });
}
