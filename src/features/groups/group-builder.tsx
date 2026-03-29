import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { X } from "lucide-react";
import { useMemo, useState } from "react";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type {
  Discipline,
  GroupAgeRange,
  Instructor,
  LessonGroup,
  LessonTimeSlot,
  Student,
  StudentLevel,
  Weekday,
} from "@/lib/ski-school/types";
import {
  DROP_POOL_INSTRUCTORS,
  DROP_POOL_STUDENTS,
  DROP_ROSTER_INSTRUCTORS,
  DROP_ROSTER_STUDENTS,
  GROUP_AGE_RANGES,
  parseDragPayload,
} from "@/lib/ski-school/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InstructorCard } from "@/features/instructors/instructor-card";
import { StudentCard } from "@/features/students/student-card";
import { groupIdentityKey, useSkiSchool } from "@/lib/ski-school/context";
import { formatGroupIdentity } from "@/lib/ski-school/group-label";
import { cn } from "@/lib/utils";

const WEEKDAYS: Array<Weekday> = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

const LEVELS: Array<StudentLevel> = [1, 2, 3, 4, 5, 6];

const TIMES: Array<{ value: LessonTimeSlot; label: string }> = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
  { value: "FULL_DAY", label: "Full day" },
];

/** Base UI Select.Value reads labels from `items` on Root; option nodes in the portal are unmounted while closed. */
const TIME_SLOT_LABELS: Record<LessonTimeSlot, string> = Object.fromEntries(
  TIMES.map((t) => [t.value, t.label] as const)
) as Record<LessonTimeSlot, string>;

const GROUP_SCHEDULE_LEVEL_LABELS: Record<string, string> = Object.fromEntries(
  LEVELS.map((lv) => [String(lv), `Lv${lv}`])
);

const DISCIPLINE_FILTER_LABELS: Record<string, string> = {
  all: "All disciplines",
  ski: "Ski",
  snowboard: "Snowboard",
};

const STUDENT_PANEL_LEVEL_LABELS: Record<string, string> = {
  all: "All levels",
  ...Object.fromEntries(
    LEVELS.map((lv) => [String(lv), `Level ${lv}`] as const)
  ),
};

function nextAvailableEmptyGroupSlot(groups: Array<LessonGroup>): {
  day: Weekday;
  time: LessonTimeSlot;
  level: StudentLevel;
  ageRange: GroupAgeRange;
} {
  for (const day of WEEKDAYS) {
    for (const t of TIMES) {
      for (const level of LEVELS) {
        for (const ageRange of GROUP_AGE_RANGES) {
          const key = groupIdentityKey({
            day,
            time: t.value,
            level,
            leadInstructorId: null,
            ageRange,
          });
          const clash = groups.some((g) => groupIdentityKey(g) === key);
          if (!clash) {
            return { day, time: t.value, level, ageRange };
          }
        }
      }
    }
  }
  return { day: "Mon", time: "AM", level: 1, ageRange: "7-12" };
}

type DropKind = "student" | "instructor";

type DropPanelProps = {
  id: string;
  children: ReactNode;
  emptyHint: string;
  isEmpty: boolean;
  acceptKind: DropKind;
  activeDragKind: DropKind | null;
};

function DropPanel({
  id,
  children,
  emptyHint,
  isEmpty,
  acceptKind,
  activeDragKind,
}: DropPanelProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const isMismatch = Boolean(
    activeDragKind != null && isOver && activeDragKind !== acceptKind
  );
  const isMatch = Boolean(
    activeDragKind != null && isOver && activeDragKind === acceptKind
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[120px] flex-1 flex-col gap-1.5 rounded-lg border-2 border-dashed p-2 transition-colors",
        isMismatch && "border-destructive bg-destructive/10",
        isMatch && "border-primary bg-primary/5",
        !isMismatch &&
          !isMatch &&
          (isOver
            ? "border-muted-foreground/25 bg-muted/15"
            : "border-border/60 bg-muted/5")
      )}
    >
      {isEmpty ? (
        <p className="flex flex-1 items-center justify-center px-2 text-center text-[0.625rem] leading-relaxed text-muted-foreground">
          {emptyHint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

type ActiveDrag =
  | { kind: "student"; student: Student }
  | { kind: "instructor"; instructor: Instructor };

export type GroupBuilderProps = {
  selectedGroupId: string | null;
  onSelectedGroupIdChange: (id: string | null) => void;
};

function GroupBuilder({
  selectedGroupId,
  onSelectedGroupIdChange,
}: GroupBuilderProps) {
  const {
    students,
    instructors,
    groups,
    getStudent,
    getInstructor,
    getGroup,
    upsertGroup,
    removeGroup,
    addStudentToGroup,
    removeStudentFromGroup,
    addInstructorToGroup,
    removeInstructorFromGroup,
    setGroupSchedule,
  } = useSkiSchool();

  const [studentQuery, setStudentQuery] = useState("");
  const [studentLevel, setStudentLevel] = useState<string>("all");
  const [instructorQuery, setInstructorQuery] = useState("");
  const [disciplineFilter, setDisciplineFilter] = useState<"all" | Discipline>(
    "all"
  );

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null);
  const activeDragKind: DropKind | null = activeDrag?.kind ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const selectedGroup = selectedGroupId ? getGroup(selectedGroupId) : undefined;

  function applySchedulePatch(
    groupId: string,
    patch: Parameters<typeof setGroupSchedule>[1]
  ) {
    const r = setGroupSchedule(groupId, patch);
    if (!r.ok && typeof window !== "undefined") {
      window.alert(r.error);
    }
  }

  const poolStudents = useMemo(() => {
    if (!selectedGroup) return students;
    const inRoster = new Set(selectedGroup.studentIds);
    return students.filter((s) => !inRoster.has(s.id));
  }, [students, selectedGroup]);

  const rosterStudents = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.studentIds
      .map((id) => getStudent(id))
      .filter((s): s is Student => Boolean(s));
  }, [selectedGroup, getStudent]);

  const poolInstructors = useMemo(() => {
    if (!selectedGroup) return instructors;
    const inRoster = new Set(selectedGroup.instructorIds);
    return instructors.filter((i) => !inRoster.has(i.id));
  }, [instructors, selectedGroup]);

  const rosterInstructors = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.instructorIds
      .map((id) => getInstructor(id))
      .filter((i): i is NonNullable<typeof i> => Boolean(i));
  }, [selectedGroup, getInstructor]);

  function otherGroupsForStudent(studentId: string): Array<LessonGroup> {
    if (!selectedGroupId) return [];
    return groups.filter(
      (g) => g.id !== selectedGroupId && g.studentIds.includes(studentId)
    );
  }

  function otherGroupsForInstructor(instructorId: string): Array<LessonGroup> {
    if (!selectedGroupId) return [];
    return groups.filter(
      (g) => g.id !== selectedGroupId && g.instructorIds.includes(instructorId)
    );
  }

  const filteredPoolStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    return poolStudents.filter((s) => {
      if (studentLevel !== "all" && String(s.level) !== studentLevel)
        return false;
      if (!q) return true;
      const hay =
        `${s.name} ${s.notes} ${s.parentName} ${s.parentPhone} ${s.parentEmail} ${s.medicalInfo}`.toLowerCase();
      return hay.includes(q);
    });
  }, [poolStudents, studentQuery, studentLevel]);

  const filteredPoolInstructors = useMemo(() => {
    const q = instructorQuery.trim().toLowerCase();
    return poolInstructors.filter((i) => {
      if (
        disciplineFilter !== "all" &&
        !i.disciplines.includes(disciplineFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const hay =
        `${i.name} ${i.notes} ${i.phone} ${i.email} ${i.disciplines.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [poolInstructors, instructorQuery, disciplineFilter]);

  function groupOptionLabel(g: LessonGroup) {
    return formatGroupIdentity(g, (id) => getInstructor(id)?.name);
  }

  const groupSelectLabels = useMemo(
    () =>
      Object.fromEntries(
        groups.map((g) => [
          g.id,
          formatGroupIdentity(g, (id) => getInstructor(id)?.name),
        ])
      ),
    [groups, getInstructor]
  );

  const leadInstructorLabels = useMemo(() => {
    if (rosterInstructors.length === 0) {
      return { __none__: "Add instructors first" };
    }
    return Object.fromEntries(
      rosterInstructors.map((i) => [i.id, i.name] as const)
    );
  }, [rosterInstructors]);

  function handleDragStart(event: DragStartEvent) {
    const payload = parseDragPayload(event.active.id);
    if (!payload) return;
    if (payload.kind === "student") {
      const student = getStudent(payload.entityId);
      if (student) setActiveDrag({ kind: "student", student });
      return;
    }
    const instructor = getInstructor(payload.entityId);
    if (instructor) setActiveDrag({ kind: "instructor", instructor });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !selectedGroupId) return;
    const payload = parseDragPayload(active.id);
    if (!payload) return;
    const target = String(over.id);

    if (payload.kind === "student") {
      if (target === DROP_ROSTER_STUDENTS) {
        addStudentToGroup(selectedGroupId, payload.entityId);
      } else if (target === DROP_POOL_STUDENTS) {
        removeStudentFromGroup(selectedGroupId, payload.entityId);
      }
      return;
    }

    if (target === DROP_ROSTER_INSTRUCTORS) {
      addInstructorToGroup(selectedGroupId, payload.entityId);
    } else if (target === DROP_POOL_INSTRUCTORS) {
      removeInstructorFromGroup(selectedGroupId, payload.entityId);
    }
  }

  function handleDragCancel() {
    setActiveDrag(null);
  }

  function handleCreateGroup() {
    const slot = nextAvailableEmptyGroupSlot(groups);
    const result = upsertGroup({
      studentIds: [],
      instructorIds: [],
      leadInstructorId: null,
      day: slot.day,
      time: slot.time,
      level: slot.level,
      ageRange: slot.ageRange,
      notes: "",
    });
    if (result.ok) {
      onSelectedGroupIdChange(result.id);
    } else if (typeof window !== "undefined") {
      window.alert(result.error);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-[70svh] max-h-[56rem] min-h-[32rem] flex-col gap-3">
        {/* Group selector bar */}
        <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 shadow-sm">
          <div className="grid min-w-[220px] gap-1">
            <Label className="text-[0.625rem]">Group</Label>
            <Select
              value={selectedGroupId ?? ""}
              items={groupSelectLabels}
              onValueChange={(v) => onSelectedGroupIdChange(v || null)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a group..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {groupOptionLabel(g)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          {selectedGroup ? (
            <>
              <div className="grid gap-1">
                <Label className="text-[0.625rem]">Day</Label>
                <Select
                  value={selectedGroup.day}
                  onValueChange={(v) =>
                    applySchedulePatch(selectedGroup.id, {
                      day: v as Weekday,
                    })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[0.625rem]">Time</Label>
                <Select
                  value={selectedGroup.time}
                  items={TIME_SLOT_LABELS}
                  onValueChange={(v) =>
                    applySchedulePatch(selectedGroup.id, {
                      time: v as LessonTimeSlot,
                    })
                  }
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {TIMES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[0.625rem]">Level</Label>
                <Select
                  value={String(selectedGroup.level)}
                  items={GROUP_SCHEDULE_LEVEL_LABELS}
                  onValueChange={(v) =>
                    applySchedulePatch(selectedGroup.id, {
                      level: Number(v) as StudentLevel,
                    })
                  }
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {LEVELS.map((lv) => (
                        <SelectItem key={lv} value={String(lv)}>
                          Lv{lv}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1">
                <Label className="text-[0.625rem]">Ages</Label>
                <Select
                  value={selectedGroup.ageRange}
                  onValueChange={(v) =>
                    applySchedulePatch(selectedGroup.id, {
                      ageRange: v as GroupAgeRange,
                    })
                  }
                >
                  <SelectTrigger className="w-18">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {GROUP_AGE_RANGES.map((ar) => (
                        <SelectItem key={ar} value={ar}>
                          {ar}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-[160px] gap-1">
                <Label className="text-[0.625rem]">
                  Lead instructor
                  {rosterInstructors.length > 0 ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </Label>
                <Select
                  value={
                    rosterInstructors.length === 0
                      ? "__none__"
                      : selectedGroup.leadInstructorId ||
                        rosterInstructors[0].id
                  }
                  items={leadInstructorLabels}
                  disabled={rosterInstructors.length === 0}
                  onValueChange={(v) => {
                    if (v !== "__none__") {
                      applySchedulePatch(selectedGroup.id, {
                        leadInstructorId: v,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {rosterInstructors.length === 0 ? (
                        <SelectItem value="__none__">
                          Add instructors first
                        </SelectItem>
                      ) : (
                        rosterInstructors.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          <Button type="button" variant="secondary" onClick={handleCreateGroup}>
            New group
          </Button>
          {selectedGroupId ? (
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const id = selectedGroupId;
                const remaining = groups.filter((g) => g.id !== id);
                removeGroup(id);
                onSelectedGroupIdChange(remaining[0]?.id ?? null);
              }}
            >
              Delete
            </Button>
          ) : null}
        </div>

        {/* Three-panel horizontal layout (resizable) */}
        <ResizablePanelGroup
          orientation="horizontal"
          className="flex min-h-0 flex-1"
        >
          <ResizablePanel
            id="gb-instructors"
            defaultSize="25%"
            minSize="22%"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col rounded-lg border shadow-sm">
              <div className="border-b bg-muted/30 px-3 py-2">
                <h3 className="text-xs font-semibold">Instructors</h3>
                <p className="mt-0.5 text-[0.5625rem] leading-snug text-muted-foreground">
                  Drag into the center to assign
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  <Input
                    placeholder="Search..."
                    value={instructorQuery}
                    onChange={(e) => setInstructorQuery(e.target.value)}
                  />
                  <Select
                    value={disciplineFilter}
                    items={DISCIPLINE_FILTER_LABELS}
                    onValueChange={(v) =>
                      setDisciplineFilter(v as "all" | Discipline)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">All disciplines</SelectItem>
                        <SelectItem value="ski">Ski</SelectItem>
                        <SelectItem value="snowboard">Snowboard</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <DropPanel
                  id={DROP_POOL_INSTRUCTORS}
                  acceptKind="instructor"
                  activeDragKind={activeDragKind}
                  emptyHint="All instructors are assigned to this group."
                  isEmpty={filteredPoolInstructors.length === 0}
                >
                  {filteredPoolInstructors.map((i) => (
                    <InstructorCard
                      key={i.id}
                      instructor={i}
                      mode="drag"
                      otherGroups={otherGroupsForInstructor(i.id)}
                    />
                  ))}
                </DropPanel>
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="gb-center"
            defaultSize="50%"
            minSize="36%"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col rounded-lg border shadow-sm">
              <div className="border-b bg-muted/30 px-3 py-2">
                <h3 className="text-xs font-semibold">
                  {selectedGroup
                    ? groupOptionLabel(selectedGroup)
                    : "Group roster"}
                </h3>
                {selectedGroup ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{selectedGroup.day}</Badge>
                    <Badge variant="outline">
                      {selectedGroup.time === "FULL_DAY"
                        ? "Full day"
                        : selectedGroup.time}
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      Lv{selectedGroup.level}
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {selectedGroup.ageRange}
                    </Badge>
                    <Badge variant="muted">
                      {rosterInstructors.length} instructor
                      {rosterInstructors.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="muted">
                      {rosterStudents.length} student
                      {rosterStudents.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ) : (
                  <p className="mt-0.5 text-[0.5625rem] text-muted-foreground">
                    Select or create a group above
                  </p>
                )}
                {selectedGroup ? (
                  <div className="mt-2">
                    <Textarea
                      placeholder="Group notes..."
                      value={selectedGroup.notes}
                      onChange={(e) =>
                        applySchedulePatch(selectedGroup.id, {
                          notes: e.target.value,
                        })
                      }
                      rows={2}
                      className="text-[0.625rem]"
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2">
                {selectedGroup ? (
                  <>
                    <div>
                      <p className="mb-1.5 px-1 text-[0.5625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                        Assigned instructors
                      </p>
                      <DropPanel
                        id={DROP_ROSTER_INSTRUCTORS}
                        acceptKind="instructor"
                        activeDragKind={activeDragKind}
                        emptyHint="Drag instructors from the left panel."
                        isEmpty={rosterInstructors.length === 0}
                      >
                        {rosterInstructors.map((i) => (
                          <div key={i.id} className="group relative">
                            <InstructorCard
                              instructor={i}
                              mode="drag"
                              otherGroups={otherGroupsForInstructor(i.id)}
                              isLead={i.id === selectedGroup.leadInstructorId}
                              onMakeLead={
                                rosterInstructors.length > 1
                                  ? () =>
                                      applySchedulePatch(selectedGroup.id, {
                                        leadInstructorId: i.id,
                                      })
                                  : undefined
                              }
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-xs"
                              className="text-destructive-foreground! absolute -top-1 -right-1 rounded-full bg-destructive! opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-destructive/90!"
                              aria-label={`Remove ${i.name}`}
                              onClick={() =>
                                removeInstructorFromGroup(
                                  selectedGroupId!,
                                  i.id
                                )
                              }
                            >
                              <X />
                            </Button>
                          </div>
                        ))}
                      </DropPanel>
                    </div>
                    <div>
                      <p className="mb-1.5 px-1 text-[0.5625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                        Assigned students
                      </p>
                      <DropPanel
                        id={DROP_ROSTER_STUDENTS}
                        acceptKind="student"
                        activeDragKind={activeDragKind}
                        emptyHint="Drag students from the right panel."
                        isEmpty={rosterStudents.length === 0}
                      >
                        {rosterStudents.map((s) => (
                          <div key={s.id} className="group relative">
                            <StudentCard
                              student={s}
                              mode="drag"
                              otherGroups={otherGroupsForStudent(s.id)}
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon-xs"
                              className="text-destructive-foreground! absolute -top-1 -right-1 rounded-full bg-destructive! opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-destructive/90!"
                              aria-label={`Remove ${s.name}`}
                              onClick={() =>
                                removeStudentFromGroup(selectedGroupId!, s.id)
                              }
                            >
                              <X />
                            </Button>
                          </div>
                        ))}
                      </DropPanel>
                    </div>
                  </>
                ) : (
                  <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
                    Create or select a group to start assigning.
                  </p>
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id="gb-students"
            defaultSize="25%"
            minSize="22%"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col rounded-lg border shadow-sm">
              <div className="border-b bg-muted/30 px-3 py-2">
                <h3 className="text-xs font-semibold">Students</h3>
                <p className="mt-0.5 text-[0.5625rem] leading-snug text-muted-foreground">
                  Drag into the center to assign
                </p>
                <div className="mt-2 flex flex-col gap-1.5">
                  <Input
                    placeholder="Search..."
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                  />
                  <Select
                    value={studentLevel}
                    items={STUDENT_PANEL_LEVEL_LABELS}
                    onValueChange={(v) => setStudentLevel(v ?? "all")}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">All levels</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((lv) => (
                          <SelectItem key={lv} value={String(lv)}>
                            Level {lv}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <DropPanel
                  id={DROP_POOL_STUDENTS}
                  acceptKind="student"
                  activeDragKind={activeDragKind}
                  emptyHint="All students are assigned to this group."
                  isEmpty={filteredPoolStudents.length === 0}
                >
                  {filteredPoolStudents.map((s) => (
                    <StudentCard
                      key={s.id}
                      student={s}
                      mode="drag"
                      otherGroups={otherGroupsForStudent(s.id)}
                    />
                  ))}
                </DropPanel>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag?.kind === "student" ? (
          <StudentCard student={activeDrag.student} mode="static" />
        ) : null}
        {activeDrag?.kind === "instructor" ? (
          <InstructorCard instructor={activeDrag.instructor} mode="static" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export { GroupBuilder };
