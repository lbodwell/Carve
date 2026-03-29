import { schedulesOverlap } from "./schedule";
import {
  INSTRUCTOR_FAMILY_NAMES,
  INSTRUCTOR_FIRST_NAMES,
  STUDENT_FAMILY_NAMES,
  STUDENT_FIRST_NAMES,
} from "./seed-names";
import type {
  Discipline,
  GroupAgeRange,
  Instructor,
  LessonGroup,
  LessonTimeSlot,
  Student,
  StudentLevel,
  Weekday,
} from "./types";

function emailLocalPart(prefix: string, suffix: string): string {
  const a = prefix.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const b = suffix.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${a}.${b}`;
}

const WEEKDAYS: Array<Weekday> = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

/** Weekend-heavy weights: indices align with WEEKDAYS */
const DAY_WEIGHTS = [1, 1, 1, 1, 5, 8, 8];

const TIME_SLOTS: Array<LessonTimeSlot> = ["AM", "PM", "FULL_DAY"];

const TIME_WEIGHTS = [40, 40, 12];

const MEDICAL_SAMPLES = [
  "EpiPen in jacket pocket — front desk copy on file.",
  "Asthma — rescue inhaler in right pocket; use before lunch.",
  "Nut allergy — no shared snacks; labeled lunch only.",
  "Hearing aids — prefer instructor on skier’s right.",
  "",
  "",
  "",
  "",
] as const;

type Assignment = {
  kind: "student" | "instructor";
  id: string;
  day: Weekday;
  time: LessonTimeSlot;
};

function pickWeightedIndex(weights: ReadonlyArray<number>, roll: number): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let t = roll * total;
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i];
    if (t <= 0) return i;
  }
  return weights.length - 1;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatParentPhone(n: number): string {
  const area = 303 + (n % 4);
  const mid = 555;
  const last = 1000 + (n % 9000);
  return `(${area}) ${mid}-${String(last).slice(-4)}`;
}

function formatStaffPhone(n: number): string {
  const area = 720 + (n % 5);
  const mid = 555;
  const last = 2000 + (n % 7999);
  return `(${area}) ${mid}-${String(last).slice(-4)}`;
}

function buildStudents(rand: () => number): Array<Student> {
  const out: Array<Student> = [];
  for (let i = 1; i <= 200; i++) {
    const age = 4 + Math.floor(rand() * 9);
    const band: GroupAgeRange = age <= 6 ? "4-6" : "7-12";
    const level = Math.min(
      6,
      Math.max(1, Math.round(1 + (age - 4) * 0.45 + rand() * 2))
    ) as StudentLevel;
    const discipline: Discipline = i % 2 === 0 ? "ski" : "snowboard";
    const med =
      MEDICAL_SAMPLES[Math.floor(rand() * MEDICAL_SAMPLES.length)] ?? "";
    const fn = STUDENT_FIRST_NAMES[i - 1];
    const ln = STUDENT_FAMILY_NAMES[i - 1];
    const name = `${fn} ${ln}`;
    out.push({
      id: `stu-${String(i).padStart(3, "0")}`,
      name,
      age,
      discipline,
      level,
      medicalInfo: med,
      parentName: `${fn} parent`,
      parentPhone: formatParentPhone(i * 17 + 101),
      parentEmail: `parent.stu${i}@example.com`,
      notes:
        band === "4-6"
          ? "Beginner group placement; sticker rewards help."
          : rand() > 0.5
            ? "Standard lesson pacing; video feedback OK."
            : "Prefers verbal cues; helmet cam opt-out.",
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function buildInstructors(rand: () => number): Array<Instructor> {
  const out: Array<Instructor> = [];
  for (let i = 1; i <= 50; i++) {
    const r = rand();
    let disciplines: Array<Discipline>;
    if (r < 0.38) disciplines = ["ski"];
    else if (r < 0.76) disciplines = ["snowboard"];
    else disciplines = ["ski", "snowboard"];

    const fn = INSTRUCTOR_FIRST_NAMES[i - 1];
    const ln = INSTRUCTOR_FAMILY_NAMES[i - 1];
    out.push({
      id: `ins-${String(i).padStart(2, "0")}`,
      name: `${fn} ${ln}`,
      phone: formatStaffPhone(i * 131),
      email: `${emailLocalPart(fn, ln)}${i}@alpineschool.example`,
      disciplines,
      notes:
        disciplines.length === 2
          ? "Dual-certified; prefers mixed-discipline groups."
          : disciplines[0] === "ski"
            ? "Kids specialist; levels 1–4."
            : "Beginner-friendly; clear switch drills.",
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function hasOverlap(
  list: Array<Assignment>,
  kind: Assignment["kind"],
  id: string,
  day: Weekday,
  time: LessonTimeSlot
): boolean {
  return list.some(
    (a) =>
      a.kind === kind &&
      a.id === id &&
      schedulesOverlap(a.day, a.time, day, time)
  );
}

function studentMatchesGroup(
  s: Student,
  discipline: Discipline,
  ageRange: GroupAgeRange
): boolean {
  if (s.discipline !== discipline) return false;
  const band: GroupAgeRange = s.age <= 6 ? "4-6" : "7-12";
  return band === ageRange;
}

function buildGroups(
  rand: () => number,
  students: Array<Student>,
  instructors: Array<Instructor>
): Array<LessonGroup> {
  const assignments: Array<Assignment> = [];
  const groups: Array<LessonGroup> = [];
  const usedStudentIds = new Set<string>();

  let tries = 0;
  while (groups.length < 25 && tries < 500) {
    tries += 1;
    const day = WEEKDAYS[pickWeightedIndex(DAY_WEIGHTS, rand())];
    const time = TIME_SLOTS[pickWeightedIndex(TIME_WEIGHTS, rand())];
    const discipline: Discipline = rand() > 0.48 ? "ski" : "snowboard";
    const ageRange: GroupAgeRange = rand() > 0.42 ? "7-12" : "4-6";
    const level = Math.max(
      1,
      Math.min(6, 1 + Math.floor(rand() * 5))
    ) as StudentLevel;

    const eligibleInstructors = instructors.filter(
      (i) =>
        i.disciplines.includes(discipline) &&
        !hasOverlap(assignments, "instructor", i.id, day, time)
    );
    if (eligibleInstructors.length === 0) continue;

    const lead =
      eligibleInstructors[Math.floor(rand() * eligibleInstructors.length)];

    const rosterSize = 3 + Math.floor(rand() * 5);
    const pool = students.filter(
      (s) =>
        !usedStudentIds.has(s.id) &&
        studentMatchesGroup(s, discipline, ageRange) &&
        !hasOverlap(assignments, "student", s.id, day, time)
    );
    if (pool.length === 0) continue;
    for (let j = pool.length - 1; j > 0; j--) {
      const k = Math.floor(rand() * (j + 1));
      [pool[j], pool[k]] = [pool[k], pool[j]];
    }
    const studentIds = pool.slice(0, rosterSize).map((s) => s.id);
    for (const sid of studentIds) {
      usedStudentIds.add(sid);
      assignments.push({ kind: "student", id: sid, day, time });
    }
    assignments.push({
      kind: "instructor",
      id: lead.id,
      day,
      time,
    });

    groups.push({
      id: `grp-${String(groups.length + 1).padStart(2, "0")}`,
      studentIds,
      instructorIds: [lead.id],
      leadInstructorId: lead.id,
      day,
      time,
      discipline,
      level,
      ageRange,
      notes:
        time === "FULL_DAY"
          ? "Full-day camp block — indoor break at lunch."
          : `${discipline === "ski" ? "Ski" : "Snowboard"} focus; small group dynamics.`,
    });
  }

  return groups;
}

const rand = mulberry32(20260228);

const builtStudents = buildStudents(rand);
const builtInstructors = buildInstructors(rand);
const builtGroups = buildGroups(rand, builtStudents, builtInstructors);

export const seedStudents = builtStudents;
export const seedInstructors = builtInstructors;
export const seedGroups = builtGroups;
