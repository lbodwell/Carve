import type { LessonGroup, LessonTimeSlot } from "./types";

function timeLabel(t: LessonTimeSlot) {
  return t === "FULL_DAY" ? "Full day" : t;
}

export function formatGroupIdentity(
  g: LessonGroup,
  getInstructorName: (id: string) => string | undefined
): string {
  const lead =
    g.leadInstructorId != null
      ? (getInstructorName(g.leadInstructorId) ?? "Unknown lead")
      : "No lead";
  return `${g.day} ${timeLabel(g.time)} · ${g.ageRange} · Lv${g.level} · ${lead}`;
}
