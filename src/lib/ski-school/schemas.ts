import { z } from "zod";

import type {
  Discipline,
  GroupAgeRange,
  LessonTimeSlot,
  StudentLevel,
  Weekday,
} from "./types";

export const studentLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]) satisfies z.ZodType<StudentLevel>;

const disciplineSchema = z.enum([
  "ski",
  "snowboard",
]) satisfies z.ZodType<Discipline>;

const phoneSchema = z.string().refine(
  (s) => {
    const t = s.trim();
    if (t.length === 0) return true;
    return /^[\d\s\-+().]{7,}$/.test(t);
  },
  { message: "Invalid phone number" }
);

const emailSchema = z.string().refine(
  (s) => {
    const t = s.trim();
    if (t.length === 0) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  },
  { message: "Invalid email address" }
);

export const studentFormFieldSchemas = {
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name is too long"),
  age: z
    .string()
    .min(1, "Age is required")
    .refine(
      (s) => {
        const n = Number(s);
        return (
          Number.isFinite(n) &&
          Number.isInteger(n) &&
          n >= 4 &&
          n <= 12
        );
      },
      { message: "Enter an age between 4 and 12" }
    ),
  level: studentLevelSchema,
  discipline: disciplineSchema,
  medicalInfo: z.string().max(2000, "Medical notes are too long"),
  parentName: z.string().max(200, "Name is too long"),
  parentPhone: phoneSchema,
  parentEmail: emailSchema,
  notes: z.string().max(5000, "Notes are too long"),
} as const;

export const studentNameSchema = studentFormFieldSchemas.name;
export const studentAgeInputSchema = studentFormFieldSchemas.age;
export const studentDisciplineSchema = studentFormFieldSchemas.discipline;

/** Raw form shape before coercion (age as string from inputs). */
export const studentFormRawSchema = z
  .object({
    name: z.string(),
    age: z.string(),
    level: studentLevelSchema,
    discipline: disciplineSchema,
    medicalInfo: z.string(),
    parentName: z.string(),
    parentPhone: phoneSchema,
    parentEmail: emailSchema,
    notes: z.string(),
  })
  .refine((d) => d.name.trim().length > 0, {
    message: "Name is required",
    path: ["name"],
  })
  .refine(
    (d) => {
      const n = Number(d.age);
      return Number.isFinite(n) && Number.isInteger(n) && n >= 4 && n <= 12;
    },
    { message: "Enter an age between 4 and 12", path: ["age"] }
  )
  .refine(
    (d) => d.parentPhone.trim().length > 0 || d.parentEmail.trim().length > 0,
    {
      message: "Provide at least one parent phone or email",
      path: ["parentEmail"],
    }
  );

export const instructorFormFieldSchemas = {
  name: z
    .string()
    .min(1, "Name is required")
    .max(200, "Name is too long"),
  phone: phoneSchema,
  email: emailSchema,
  notes: z.string().max(5000, "Notes are too long"),
  ski: z.boolean(),
  snowboard: z.boolean(),
} as const;

export const instructorFormRawSchema = z
  .object({
    name: z.string(),
    phone: phoneSchema,
    email: emailSchema,
    notes: z.string(),
    ski: z.boolean(),
    snowboard: z.boolean(),
  })
  .refine((d) => d.name.trim().length > 0, {
    message: "Name is required",
    path: ["name"],
  })
  .refine((d) => d.ski || d.snowboard, {
    message: "Select at least one discipline",
    path: ["ski"],
  })
  .refine((d) => d.phone.trim().length > 0 || d.email.trim().length > 0, {
    message: "Provide at least one phone or email",
    path: ["email"],
  });

export type StudentFormRaw = z.infer<typeof studentFormRawSchema>;
export type InstructorFormRaw = z.infer<typeof instructorFormRawSchema>;

const weekdaySchema = z.enum([
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]) satisfies z.ZodType<Weekday>;

const lessonTimeSlotSchema = z.enum([
  "AM",
  "PM",
  "FULL_DAY",
]) satisfies z.ZodType<LessonTimeSlot>;

const groupAgeRangeSchema = z.enum([
  "4-6",
  "7-12",
]) satisfies z.ZodType<GroupAgeRange>;

/** Core persisted lesson group fields (no id). */
export const groupSchema = z.object({
  studentIds: z.array(z.string()),
  instructorIds: z.array(z.string()),
  leadInstructorId: z.string().nullable(),
  day: weekdaySchema,
  time: lessonTimeSlotSchema,
  discipline: disciplineSchema,
  level: studentLevelSchema,
  ageRange: groupAgeRangeSchema,
  notes: z.string(),
});

export type GroupSchemaShape = z.infer<typeof groupSchema>;
