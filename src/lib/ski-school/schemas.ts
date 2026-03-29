import { z } from "zod";

import type {
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

/** Raw form shape before coercion (age as string from inputs). */
export const studentFormRawSchema = z
  .object({
    name: z.string(),
    age: z.string(),
    level: studentLevelSchema,
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
      return Number.isFinite(n) && Number.isInteger(n) && n >= 0 && n <= 120;
    },
    { message: "Enter a valid age", path: ["age"] }
  )
  .refine(
    (d) => d.parentPhone.trim().length > 0 || d.parentEmail.trim().length > 0,
    {
      message: "Provide at least one parent phone or email",
      path: ["parentEmail"],
    }
  );

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
  level: studentLevelSchema,
  ageRange: groupAgeRangeSchema,
  notes: z.string(),
});

export type GroupSchemaShape = z.infer<typeof groupSchema>;
