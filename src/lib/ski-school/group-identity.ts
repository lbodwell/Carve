import type { LessonGroup } from "./types";

export function groupIdentityKey(
  g: Pick<
    LessonGroup,
    "day" | "time" | "level" | "leadInstructorId" | "ageRange" | "discipline"
  >
) {
  const lead = g.leadInstructorId ?? "__null__";
  return `${g.day}|${g.time}|${g.discipline}|${g.ageRange}|${g.level}|${lead}`;
}

export function hasDuplicateIdentity(
  groups: Array<LessonGroup>,
  candidate: LessonGroup,
  excludeId?: string
) {
  const key = groupIdentityKey(candidate);
  return groups.some((g) => g.id !== excludeId && groupIdentityKey(g) === key);
}
