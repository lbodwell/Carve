import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import type { LessonTimeSlot, Weekday } from "@/lib/ski-school/types";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GroupBuilder } from "@/features/groups/group-builder";
import { GroupsTable } from "@/features/groups/groups-table";
import { useSkiSchool } from "@/lib/ski-school/context";
import { formatGroupIdentity } from "@/lib/ski-school/group-label";
import {
  filterGroupsInSlot,
  nextAvailableEmptyGroupSlotInWorkspace,
} from "@/lib/ski-school/schedule";

const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const satisfies ReadonlyArray<Weekday>;

const TIME_SLOTS = ["AM", "PM", "FULL_DAY"] as const satisfies ReadonlyArray<LessonTimeSlot>;

const WORKSPACE_DAY_ITEMS: Record<Weekday, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const WORKSPACE_TIME_ITEMS: Record<LessonTimeSlot, string> = {
  AM: "AM",
  PM: "PM",
  FULL_DAY: "Full day",
};

const groupsSearchSchema = z.object({
  groupId: z.string().optional(),
  day: z.enum(WEEKDAYS).optional(),
  time: z.enum(TIME_SLOTS).optional(),
});

export const Route = createFileRoute("/groups")({
  validateSearch: (raw) => groupsSearchSchema.parse(raw),
  component: GroupsPage,
});

function timeLabel(t: LessonTimeSlot) {
  return t === "FULL_DAY" ? "Full day" : t;
}

function GroupsPage() {
  const { groups, getGroup, getInstructor, upsertGroup } = useSkiSchool();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const workspaceDay: Weekday = search.day ?? "Mon";
  const workspaceTime: LessonTimeSlot = search.time ?? "AM";

  const slotGroups = useMemo(
    () => filterGroupsInSlot(groups, workspaceDay, workspaceTime),
    [groups, workspaceDay, workspaceTime]
  );

  const [showAllGroups, setShowAllGroups] = useState(false);

  const effectiveGroupId = useMemo(() => {
    if (search.groupId) {
      const g = getGroup(search.groupId);
      if (
        g &&
        g.day === workspaceDay &&
        g.time === workspaceTime
      ) {
        return search.groupId;
      }
    }
    return slotGroups[0]?.id ?? null;
  }, [search.groupId, getGroup, workspaceDay, workspaceTime, slotGroups]);

  useEffect(() => {
    if (search.groupId && !getGroup(search.groupId)) {
      navigate({
        search: { day: search.day, time: search.time },
        replace: true,
      });
    }
  }, [search.groupId, search.day, search.time, getGroup, navigate]);

  useEffect(() => {
    const needsSync =
      effectiveGroupId !== (search.groupId ?? null) ||
      search.day == null ||
      search.time == null;
    if (!needsSync) return;
    navigate({
      search: {
        day: workspaceDay,
        time: workspaceTime,
        ...(effectiveGroupId ? { groupId: effectiveGroupId } : {}),
      },
      replace: true,
    });
  }, [
    effectiveGroupId,
    search.groupId,
    search.day,
    search.time,
    workspaceDay,
    workspaceTime,
    navigate,
  ]);

  const setWorkspace = (day: Weekday, time: LessonTimeSlot) => {
    const nextSlot = filterGroupsInSlot(groups, day, time);
    const nextGroupId = nextSlot[0]?.id;
    navigate({
      search: {
        day,
        time,
        ...(nextGroupId ? { groupId: nextGroupId } : {}),
      },
      replace: true,
    });
  };

  const setSelectedGroupId = (id: string | null) => {
    const g = id ? getGroup(id) : undefined;
    navigate({
      search: {
        day: g?.day ?? workspaceDay,
        time: g?.time ?? workspaceTime,
        ...(id ? { groupId: id } : {}),
      },
      replace: true,
    });
  };

  const openGroupInWorkspace = (g: Parameters<typeof formatGroupIdentity>[0]) => {
    navigate({
      search: { day: g.day, time: g.time, groupId: g.id },
      replace: true,
    });
  };

  const handleCreateGroupInSlot = () => {
    const discipline = slotGroups[0]?.discipline ?? "ski";
    const slot = nextAvailableEmptyGroupSlotInWorkspace(
      groups,
      workspaceDay,
      workspaceTime,
      discipline
    );
    const result = upsertGroup({
      studentIds: [],
      instructorIds: [],
      leadInstructorId: null,
      day: slot.day,
      time: slot.time,
      discipline: slot.discipline,
      level: slot.level,
      ageRange: slot.ageRange,
      notes: "",
    });
    if (result.ok) {
      navigate({
        search: {
          day: workspaceDay,
          time: workspaceTime,
          groupId: result.id,
        },
        replace: true,
      });
    } else if (typeof window !== "undefined") {
      window.alert(result.error);
    }
  };

  const totalStudentsInSlot = useMemo(
    () =>
      slotGroups.reduce((acc, g) => acc + g.studentIds.length, 0),
    [slotGroups]
  );

  return (
    <AppShell
      title="Lesson groups"
      description="Pick a day and time, build rosters for that slot, then assign instructors. Expand “All groups” when you need the full schedule."
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid min-w-[5.5rem] gap-1">
              <span className="text-[0.625rem] font-medium text-muted-foreground">
                Day
              </span>
              <Select
                value={workspaceDay}
                items={WORKSPACE_DAY_ITEMS}
                onValueChange={(v) => {
                  if (v == null) return;
                  setWorkspace(v as Weekday, workspaceTime);
                }}
              >
                <SelectTrigger className="h-9 w-full text-xs" aria-label="Lesson day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {WEEKDAYS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {WORKSPACE_DAY_ITEMS[d]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid min-w-[7.5rem] gap-1">
              <span className="text-[0.625rem] font-medium text-muted-foreground">
                Time
              </span>
              <Select
                value={workspaceTime}
                items={WORKSPACE_TIME_ITEMS}
                onValueChange={(v) => {
                  if (v == null) return;
                  setWorkspace(workspaceDay, v as LessonTimeSlot);
                }}
              >
                <SelectTrigger
                  className="h-9 w-full text-xs"
                  aria-label="Lesson time slot"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {WORKSPACE_TIME_ITEMS[t]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <Badge variant="secondary">
                {slotGroups.length} group
                {slotGroups.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline">
                {totalStudentsInSlot} student
                {totalStudentsInSlot !== 1 ? "s" : ""} in slot
              </Badge>
            </div>
            <Button type="button" className="gap-1" onClick={handleCreateGroupInSlot}>
              <Plus data-icon="inline-start" />
              New group in slot
            </Button>
          </div>

          {slotGroups.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {slotGroups.map((g) => {
                const active = g.id === effectiveGroupId;
                return (
                  <Button
                    key={g.id}
                    type="button"
                    size="xs"
                    variant={active ? "default" : "outline"}
                    className="h-auto max-w-[min(100%,18rem)] flex-col items-start gap-0.5 py-1.5 whitespace-normal"
                    onClick={() => setSelectedGroupId(g.id)}
                  >
                    <span className="text-left font-medium">
                      Lv{g.level} · {g.ageRange}
                    </span>
                    <span className="max-w-full break-words text-left text-[0.5625rem] font-normal text-muted-foreground">
                      {formatGroupIdentity(g, (id) => getInstructor(id)?.name)}
                    </span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              No groups for {workspaceDay} {timeLabel(workspaceTime)} yet. Create
              one to start assigning students.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card shadow-sm">
          <Button
            type="button"
            variant="ghost"
            className="flex h-auto w-full items-center justify-start gap-2 rounded-none border-b px-3 py-2 text-xs"
            onClick={() => setShowAllGroups((v) => !v)}
          >
            {showAllGroups ? (
              <ChevronDown className="size-4 shrink-0" />
            ) : (
              <ChevronRight className="size-4 shrink-0" />
            )}
            <span className="font-semibold">All groups</span>
            <Badge variant="secondary" className="ml-auto">
              {groups.length} total
            </Badge>
          </Button>
          {showAllGroups ? (
            <div className="p-2">
              <GroupsTable
                activeGroupId={effectiveGroupId}
                onOpenInBuilder={openGroupInWorkspace}
              />
            </div>
          ) : null}
        </div>

        <GroupBuilder
          workspaceDay={workspaceDay}
          workspaceTime={workspaceTime}
          selectedGroupId={effectiveGroupId}
          onSelectedGroupIdChange={setSelectedGroupId}
          onDuplicateIdentity={(message) => {
            if (typeof window !== "undefined") window.alert(message);
          }}
        />
      </div>
    </AppShell>
  );
}
