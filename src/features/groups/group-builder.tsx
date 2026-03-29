import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { ReactNode } from "react";
import type {
  Discipline,
  Instructor,
  LessonGroup,
  LessonTimeSlot,
  Student,
  StudentLevel,
  Weekday,
} from "@/lib/ski-school/types";
import {
  DROP_POOL_STUDENTS,
  DROP_ROSTER_STUDENTS,
  GROUP_AGE_RANGES,
  comparePersonName,
  formatFullName,
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
import { StudentCard } from "@/features/students/student-card";
import { useSkiSchool } from "@/lib/ski-school/context";
import { formatGroupIdentity } from "@/lib/ski-school/group-label";
import {
  instructorFitsGroup,
  studentFitsGroup,
} from "@/lib/ski-school/placement";
import {
  instructorSearchHaystack,
  matchesStudentFilters,
} from "@/lib/ski-school/roster-filters";
import {
  instructorHasOverlappingAssignment,
  studentHasOverlappingAssignment,
} from "@/lib/ski-school/schedule";
import { cn } from "@/lib/utils";

const LEVELS: Array<StudentLevel> = [1, 2, 3, 4, 5, 6];

const GROUP_BUILDER_DISCIPLINE_ITEMS: Record<Discipline, string> = {
  ski: "Ski",
  snowboard: "Snowboard",
};

const GROUP_BUILDER_LEVEL_ITEMS: Record<string, string> = Object.fromEntries(
  LEVELS.map((lv) => [String(lv), `Lv${lv}`])
) as Record<string, string>;

/** Muted icon/text; hover switches to destructive (group builder remove actions). */
const GROUP_BUILDER_DELETE_STYLE = "text-muted-foreground hover:text-destructive";

type DropPanelProps = {
  id: string;
  children: ReactNode;
  emptyHint: string;
  isEmpty: boolean;
  isDragging: boolean;
  zone: "pool" | "roster";
  title?: string;
};

function DropPanel({
  id,
  children,
  emptyHint,
  isEmpty,
  isDragging,
  zone,
  title,
}: DropPanelProps) {
  const { isOver, setNodeRef } = useDroppable({ id });
  const isMatch = isDragging && isOver;

  return (
    <div className="flex flex-col gap-1.5">
      {title ? (
        <p className="px-0.5 text-xs font-semibold text-foreground">{title}</p>
      ) : null}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-20 flex-1 flex-col gap-1.5 rounded-lg p-2 transition-[box-shadow,background-color,border-color] duration-150",
          zone === "pool" &&
            !isMatch &&
            "border-[3px] border-dashed border-amber-600/55 bg-amber-500/10 dark:border-amber-500/50 dark:bg-amber-500/10",
          zone === "roster" &&
            !isMatch &&
            "border-[3px] border-solid border-primary/35 bg-primary/5 shadow-inner",
          isMatch &&
            "border-[3px] border-solid border-primary bg-primary/20 ring-2 ring-primary/40 shadow-md"
        )}
      >
        {isEmpty ? (
          <p className="flex min-h-12 flex-1 items-center justify-center px-2 text-center text-xs leading-relaxed font-medium text-muted-foreground">
            {emptyHint}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export type GroupBuilderProps = {
  workspaceDay: Weekday;
  workspaceTime: LessonTimeSlot;
  selectedGroupId: string | null;
  onSelectedGroupIdChange: (id: string | null) => void;
  onDuplicateIdentity?: (message: string) => void;
};

function GroupBuilder({
  workspaceDay,
  workspaceTime,
  selectedGroupId,
  onSelectedGroupIdChange,
  onDuplicateIdentity,
}: GroupBuilderProps) {
  const {
    students,
    instructors,
    groups,
    getStudent,
    getInstructor,
    getGroup,
    removeGroup,
    addStudentToGroup,
    removeStudentFromGroup,
    addInstructorToGroup,
    removeInstructorFromGroup,
    setGroupSchedule,
  } = useSkiSchool();

  const [studentQuery, setStudentQuery] = useState("");
  const [studentLevel, setStudentLevel] = useState<string>("all");
  const [showOnlyMatchingStudents, setShowOnlyMatchingStudents] =
    useState(true);
  const [instructorQuery, setInstructorQuery] = useState("");
  const [showUnavailableInstructors, setShowUnavailableInstructors] =
    useState(false);

  const [activeDrag, setActiveDrag] = useState<{
    student: Student;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const workspaceSlot = useMemo(
    () => ({ day: workspaceDay, time: workspaceTime }),
    [workspaceDay, workspaceTime]
  );

  const selectedGroup = selectedGroupId ? getGroup(selectedGroupId) : undefined;

  useEffect(() => {
    if (!selectedGroup) {
      setStudentLevel("all");
      return;
    }
    setStudentLevel(String(selectedGroup.level));
  }, [selectedGroupId, selectedGroup?.level]);

  function notify(message: string) {
    const fn = onDuplicateIdentity ?? ((m: string) => window.alert(m));
    fn(message);
  }

  const instructorOverlaps = useMemo(() => {
    if (!selectedGroup) return () => false;
    return (instructorId: string) =>
      instructorHasOverlappingAssignment(
        groups,
        instructorId,
        selectedGroup.day,
        selectedGroup.time,
        selectedGroupId
      );
  }, [groups, selectedGroup, selectedGroupId]);

  const studentOverlaps = useMemo(() => {
    if (!selectedGroup) return () => false;
    return (studentId: string) =>
      studentHasOverlappingAssignment(
        groups,
        studentId,
        selectedGroup.day,
        selectedGroup.time,
        selectedGroupId
      );
  }, [groups, selectedGroup, selectedGroupId]);

  function applySchedulePatch(
    groupId: string,
    patch: Parameters<typeof setGroupSchedule>[1]
  ) {
    const r = setGroupSchedule(groupId, patch);
    if (!r.ok) {
      notify(r.error);
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
      .filter((i): i is Instructor => Boolean(i));
  }, [selectedGroup, getInstructor]);

  function otherGroupsForStudent(studentId: string): Array<LessonGroup> {
    if (!selectedGroupId) return [];
    return groups.filter(
      (g) => g.id !== selectedGroupId && g.studentIds.includes(studentId)
    );
  }

  function studentEligibleForSelectedGroup(s: Student): boolean {
    if (!selectedGroup) return false;
    return (
      studentFitsGroup(s, selectedGroup) &&
      !studentOverlaps(s.id)
    );
  }

  const filteredPoolStudentsBase = useMemo(() => {
    return poolStudents.filter((s) =>
      matchesStudentFilters(s, {
        query: studentQuery,
        level: studentLevel,
        ageBand: "all",
        medical: "all",
      })
    );
  }, [poolStudents, studentQuery, studentLevel]);

  const filteredPoolStudents = useMemo(() => {
    if (!selectedGroup || !showOnlyMatchingStudents) {
      return filteredPoolStudentsBase;
    }
    return filteredPoolStudentsBase.filter(
      (s) =>
        studentFitsGroup(s, selectedGroup) &&
        !studentHasOverlappingAssignment(
          groups,
          s.id,
          selectedGroup.day,
          selectedGroup.time,
          selectedGroupId
        )
    );
  }, [
    filteredPoolStudentsBase,
    selectedGroup,
    showOnlyMatchingStudents,
    groups,
    selectedGroupId,
  ]);

  const addCandidateInstructors = useMemo(() => {
    if (!selectedGroup) return [];
    const q = instructorQuery.trim().toLowerCase();
    let list = poolInstructors.filter((i) =>
      instructorFitsGroup(i, selectedGroup)
    );
    if (q) {
      list = list.filter((i) => instructorSearchHaystack(i).includes(q));
    }
    const busy = (i: Instructor) => instructorOverlaps(i.id);
    const ranked = [...list].sort((a, b) => {
      const ba = busy(a);
      const bb = busy(b);
      if (ba !== bb) return ba ? 1 : -1;
      return comparePersonName(a, b);
    });
    if (showUnavailableInstructors) return ranked;
    return ranked.filter((i) => !busy(i));
  }, [
    poolInstructors,
    selectedGroup,
    instructorQuery,
    showUnavailableInstructors,
    instructorOverlaps,
  ]);

  function handleDragStart(event: DragStartEvent) {
    const payload = parseDragPayload(event.active.id);
    if (!payload || payload.kind !== "student") return;
    const student = getStudent(payload.entityId);
    if (student) setActiveDrag({ student });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !selectedGroupId || !selectedGroup) return;
    const payload = parseDragPayload(active.id);
    if (!payload || payload.kind !== "student") return;
    const student = getStudent(payload.entityId);
    if (!student || !studentEligibleForSelectedGroup(student)) return;
    const target = String(over.id);
    if (target === DROP_ROSTER_STUDENTS) {
      const r = addStudentToGroup(selectedGroupId, payload.entityId);
      if (!r.ok) notify(r.error);
    } else if (target === DROP_POOL_STUDENTS) {
      removeStudentFromGroup(selectedGroupId, payload.entityId);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="flex min-h-128 flex-col gap-3 md:h-[min(78svh,56rem)]">
        {selectedGroup ? (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold leading-tight">
                {formatGroupIdentity(selectedGroup, (id) => {
                  const ins = getInstructor(id);
                  return ins ? formatFullName(ins) : undefined;
                })}
              </p>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="muted">
                  {rosterStudents.length} student
                  {rosterStudents.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="muted">
                  {rosterInstructors.length} instructor
                  {rosterInstructors.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </div>
            <div className="grid gap-1">
              <Label className="text-[0.625rem]">Discipline</Label>
              <Select
                value={selectedGroup.discipline}
                items={GROUP_BUILDER_DISCIPLINE_ITEMS}
                onValueChange={(v) => {
                  if (v == null) return;
                  applySchedulePatch(selectedGroup.id, {
                    discipline: v as Discipline,
                  });
                }}
              >
                <SelectTrigger className="w-[6.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ski">Ski</SelectItem>
                    <SelectItem value="snowboard">Snowboard</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-[0.625rem]">Level</Label>
              <Select
                value={String(selectedGroup.level)}
                items={GROUP_BUILDER_LEVEL_ITEMS}
                onValueChange={(v) => {
                  if (v == null) return;
                  applySchedulePatch(selectedGroup.id, {
                    level: Number(v) as StudentLevel,
                  });
                }}
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
                onValueChange={(v) => {
                  if (v == null) return;
                  applySchedulePatch(selectedGroup.id, {
                    ageRange: v,
                  });
                }}
              >
                <SelectTrigger className="w-20">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "shrink-0 gap-1.5",
                GROUP_BUILDER_DELETE_STYLE
              )}
              onClick={() => {
                const id = selectedGroupId!;
                const remaining = groups.filter((g) => g.id !== id);
                removeGroup(id);
                onSelectedGroupIdChange(remaining[0]?.id ?? null);
              }}
            >
              <Trash2 className="size-3.5 shrink-0" aria-hidden />
              <span>Delete group</span>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-sm text-muted-foreground">
            Select a group in this time slot above, or create a new one.
          </div>
        )}

        <ResizablePanelGroup
          orientation="horizontal"
          className="flex min-h-0 flex-1"
        >
          <ResizablePanel
            id="gb-center"
            defaultSize="65%"
            minSize="48%"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border shadow-sm">
              {selectedGroup ? (
                <>
                  <div className="border-b bg-muted/30 px-3 py-2">
                    <Textarea
                      placeholder="Group notes…"
                      value={selectedGroup.notes}
                      onChange={(e) =>
                        applySchedulePatch(selectedGroup.id, {
                          notes: e.target.value,
                        })
                      }
                      rows={2}
                      className="text-xs"
                    />
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
                    <DropPanel
                      id={DROP_ROSTER_STUDENTS}
                      zone="roster"
                      isDragging={activeDrag != null}
                      title={`Students (${rosterStudents.length})`}
                      emptyHint="Drag matching students from the pool, or use the + button on a card."
                      isEmpty={rosterStudents.length === 0}
                    >
                      {rosterStudents.map((s) => (
                        <div key={s.id} className="group relative">
                          <StudentCard
                            student={s}
                            mode="drag"
                            workspaceSlot={workspaceSlot}
                            otherGroups={otherGroupsForStudent(s.id)}
                            density="compact"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className={cn(
                              "absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100",
                              GROUP_BUILDER_DELETE_STYLE
                            )}
                            aria-label={`Remove ${formatFullName(s)} from group`}
                            onClick={() =>
                              removeStudentFromGroup(selectedGroupId!, s.id)
                            }
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </Button>
                        </div>
                      ))}
                    </DropPanel>

                    <div className="flex flex-col gap-2">
                      <p className="px-0.5 text-xs font-semibold text-foreground">
                        Instructors ({rosterInstructors.length})
                      </p>

                      {rosterInstructors.length === 0 ? (
                        <p className="px-1 text-xs text-muted-foreground">
                          No instructors assigned yet. Search below to add one.
                        </p>
                      ) : null}

                      {rosterInstructors.map((i) => {
                        const isLead =
                          i.id === selectedGroup.leadInstructorId;
                        const busy = instructorOverlaps(i.id);
                        return (
                          <div
                            key={i.id}
                            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium">
                                  {formatFullName(i)}
                                </span>
                                {isLead ? <Badge>Lead</Badge> : null}
                                {i.disciplines.map((d) => (
                                  <Badge key={d} variant="outline">
                                    {d === "ski" ? "Ski" : "Snowboard"}
                                  </Badge>
                                ))}
                                {busy ? (
                                  <Badge variant="destructive">
                                    Overlapping time
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {rosterInstructors.length > 1 && !isLead ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() =>
                                    applySchedulePatch(selectedGroup.id, {
                                      leadInstructorId: i.id,
                                    })
                                  }
                                >
                                  Make lead
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className={GROUP_BUILDER_DELETE_STYLE}
                                aria-label={`Remove ${formatFullName(i)}`}
                                onClick={() =>
                                  removeInstructorFromGroup(
                                    selectedGroupId!,
                                    i.id
                                  )
                                }
                              >
                                <Trash2 aria-hidden />
                              </Button>
                            </div>
                          </div>
                        );
                      })}

                      {poolInstructors.length > 0 ? (
                        <div className="flex flex-col gap-2 rounded-md border bg-muted/20 p-2">
                          <Input
                            placeholder="Search instructors…"
                            value={instructorQuery}
                            onChange={(e) => setInstructorQuery(e.target.value)}
                            className="text-xs"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              size="xs"
                              variant={
                                showUnavailableInstructors
                                  ? "secondary"
                                  : "outline"
                              }
                              onClick={() =>
                                setShowUnavailableInstructors((v) => !v)
                              }
                            >
                              {showUnavailableInstructors
                                ? "Hiding busy"
                                : "Show busy too"}
                            </Button>
                            <span className="text-[0.5625rem] text-muted-foreground">
                              Only coaches who teach this discipline are listed.
                            </span>
                          </div>
                          <div className="max-h-36 overflow-y-auto rounded-md border bg-background p-1">
                            {addCandidateInstructors.length === 0 ? (
                              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                                No instructors match. Try search or “Show busy
                                too”.
                              </p>
                            ) : (
                              addCandidateInstructors.map((i) => {
                                const busy = instructorOverlaps(i.id);
                                return (
                                  <Button
                                    key={i.id}
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={busy}
                                    title={
                                      busy
                                        ? "Already assigned at an overlapping time"
                                        : `Add ${formatFullName(i)}`
                                    }
                                    className="h-auto w-full justify-start gap-2 py-1.5 whitespace-normal"
                                    onClick={() => {
                                      if (!selectedGroupId || busy) return;
                                      const r = addInstructorToGroup(
                                        selectedGroupId,
                                        i.id
                                      );
                                      if (!r.ok) notify(r.error);
                                    }}
                                  >
                                    <span className="text-left font-medium">
                                      {formatFullName(i)}
                                    </span>
                                    {busy ? (
                                      <Badge variant="destructive" className="shrink-0">
                                        Busy
                                      </Badge>
                                    ) : null}
                                  </Button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            id="gb-students"
            defaultSize="35%"
            minSize="24%"
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <div className="flex h-full min-h-0 flex-col rounded-lg border shadow-sm">
              <div className="space-y-2 border-b bg-muted/30 px-3 py-2">
                <h3 className="text-xs font-semibold">Student pool</h3>
                <Input
                  placeholder="Search students…"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  className="text-xs"
                />
                <div className="flex flex-wrap gap-1">
                  <Button
                    type="button"
                    variant={studentLevel === "all" ? "default" : "outline"}
                    size="xs"
                    onClick={() => setStudentLevel("all")}
                  >
                    All
                  </Button>
                  {LEVELS.map((lv) => (
                    <Button
                      key={lv}
                      type="button"
                      variant={
                        studentLevel === String(lv) ? "default" : "outline"
                      }
                      size="xs"
                      onClick={() => setStudentLevel(String(lv))}
                    >
                      Lv{lv}
                    </Button>
                  ))}
                </div>
                {selectedGroup ? (
                  <Button
                    type="button"
                    variant={showOnlyMatchingStudents ? "default" : "outline"}
                    size="xs"
                    onClick={() =>
                      setShowOnlyMatchingStudents((v) => !v)
                    }
                  >
                    {showOnlyMatchingStudents
                      ? "Only age/discipline fit"
                      : "Show everyone"}
                  </Button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <DropPanel
                  id={DROP_POOL_STUDENTS}
                  zone="pool"
                  isDragging={activeDrag != null}
                  emptyHint="No students match. Clear search or turn off “only fit”."
                  isEmpty={filteredPoolStudents.length === 0}
                >
                  {filteredPoolStudents.map((s) => {
                    const eligible =
                      selectedGroup != null &&
                      studentEligibleForSelectedGroup(s);
                    const dragOff =
                      selectedGroup != null && !eligible;
                    return (
                      <div key={s.id} className="group relative">
                        <StudentCard
                          student={s}
                          mode="drag"
                          workspaceSlot={workspaceSlot}
                          otherGroups={otherGroupsForStudent(s.id)}
                          density="compact"
                          dragDisabled={dragOff}
                        />
                        {selectedGroupId && eligible ? (
                          <Button
                            type="button"
                            variant="default"
                            size="icon-xs"
                            className="absolute -top-1 -right-1 rounded-full opacity-0 shadow transition-opacity group-hover:opacity-100"
                            aria-label={`Add ${formatFullName(s)} to group`}
                            onClick={() => {
                              const r = addStudentToGroup(
                                selectedGroupId,
                                s.id
                              );
                              if (!r.ok) notify(r.error);
                            }}
                          >
                            <Plus />
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </DropPanel>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <StudentCard student={activeDrag.student} mode="static" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export { GroupBuilder };
