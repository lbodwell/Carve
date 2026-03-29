import { groupIdentityKey } from "./group-identity";
import { GROUP_AGE_RANGES } from "./types";
import type {
  Discipline,
  GroupAgeRange,
  LessonGroup,
  LessonTimeSlot,
  StudentLevel,
  Weekday,
} from "./types";

const DEFAULT_LEVELS: Array<StudentLevel> = [1, 2, 3, 4, 5, 6];

/** Same schedule key: weekday + coarse slot (AM / PM / FULL_DAY). */
export function isSameScheduleSlot(
  g: Pick<LessonGroup, "day" | "time">,
  day: Weekday,
  time: LessonTimeSlot
): boolean {
  return g.day === day && g.time === time;
}

/** True when two (day, time) pairs conflict: same day and overlapping lesson length. */
export function schedulesOverlap(
  dayA: Weekday,
  timeA: LessonTimeSlot,
  dayB: Weekday,
  timeB: LessonTimeSlot
): boolean {
  if (dayA !== dayB) return false;
  if (timeA === timeB) return true;
  if (timeA === "FULL_DAY" || timeB === "FULL_DAY") return true;
  return false;
}

export function filterGroupsInSlot(
  groups: Array<LessonGroup>,
  day: Weekday,
  time: LessonTimeSlot
): Array<LessonGroup> {
  return groups.filter((g) => isSameScheduleSlot(g, day, time));
}

export function studentAssignedInSlot(
  groups: Array<LessonGroup>,
  studentId: string,
  day: Weekday,
  time: LessonTimeSlot,
  excludeGroupId?: string | null
): boolean {
  return groups.some(
    (g) =>
      g.id !== excludeGroupId &&
      isSameScheduleSlot(g, day, time) &&
      g.studentIds.includes(studentId)
  );
}

export function instructorAssignedInSlot(
  groups: Array<LessonGroup>,
  instructorId: string,
  day: Weekday,
  time: LessonTimeSlot,
  excludeGroupId?: string | null
): boolean {
  return groups.some(
    (g) =>
      g.id !== excludeGroupId &&
      isSameScheduleSlot(g, day, time) &&
      g.instructorIds.includes(instructorId)
  );
}

export function studentHasOverlappingAssignment(
  groups: Array<LessonGroup>,
  studentId: string,
  day: Weekday,
  time: LessonTimeSlot,
  excludeGroupId?: string | null
): boolean {
  return groups.some(
    (g) =>
      g.id !== excludeGroupId &&
      schedulesOverlap(g.day, g.time, day, time) &&
      g.studentIds.includes(studentId)
  );
}

export function instructorHasOverlappingAssignment(
  groups: Array<LessonGroup>,
  instructorId: string,
  day: Weekday,
  time: LessonTimeSlot,
  excludeGroupId?: string | null
): boolean {
  return groups.some(
    (g) =>
      g.id !== excludeGroupId &&
      schedulesOverlap(g.day, g.time, day, time) &&
      g.instructorIds.includes(instructorId)
  );
}

/**
 * First non-conflicting (day, time, discipline, level, age, lead=null) identity for this slot.
 */
export function nextAvailableEmptyGroupSlotInWorkspace(
  groups: Array<LessonGroup>,
  day: Weekday,
  time: LessonTimeSlot,
  discipline: Discipline,
  levels: Array<StudentLevel> = DEFAULT_LEVELS,
  ageRanges: Array<GroupAgeRange> = [...GROUP_AGE_RANGES]
): {
  day: Weekday;
  time: LessonTimeSlot;
  discipline: Discipline;
  level: StudentLevel;
  ageRange: GroupAgeRange;
} {
  for (const level of levels) {
    for (const ageRange of ageRanges) {
      const key = groupIdentityKey({
        day,
        time,
        discipline,
        level,
        leadInstructorId: null,
        ageRange,
      });
      const clash = groups.some((g) => groupIdentityKey(g) === key);
      if (!clash) {
        return { day, time, discipline, level, ageRange };
      }
    }
  }
  return {
    day,
    time,
    discipline,
    level: levels[0] ?? 1,
    ageRange: ageRanges[0] ?? "7-12",
  };
}
