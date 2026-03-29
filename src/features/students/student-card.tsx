import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import type {
  LessonGroup,
  LessonTimeSlot,
  Student,
  Weekday,
} from "@/lib/ski-school/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatGroupIdentity } from "@/lib/ski-school/group-label";
import { NotesPreview } from "@/features/shared/notes-preview";
import { useSkiSchool } from "@/lib/ski-school/context";
import { hasMeaningfulMedicalInfo } from "@/lib/ski-school/roster-filters";
import { schedulesOverlap } from "@/lib/ski-school/schedule";
import { cn } from "@/lib/utils";

type StudentCardProps = {
  student: Student;
  mode: "static" | "drag";
  otherGroups?: Array<LessonGroup>;
  /** When set, other groups in this day/time show as schedule conflicts. */
  workspaceSlot?: { day: Weekday; time: LessonTimeSlot };
  /** Compact list layout for dense roster rows. */
  density?: "comfortable" | "compact";
  /** When true, keeps `mode="drag"` visuals but disables dragging (e.g. ineligible for group). */
  dragDisabled?: boolean;
  className?: string;
};

function StudentCard({
  student,
  mode,
  otherGroups = [],
  workspaceSlot,
  density = "comfortable",
  dragDisabled = false,
  className,
}: StudentCardProps) {
  const { getInstructor } = useSkiSchool();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `student:${student.id}`,
      disabled: mode !== "drag" || dragDisabled,
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const hasMedical = hasMeaningfulMedicalInfo(student.medicalInfo);
  const medicalLower = student.medicalInfo.trim().toLowerCase();
  const isUrgentMedical =
    hasMedical &&
    (medicalLower.includes("epi") ||
      medicalLower.includes("allerg") ||
      medicalLower.includes("diabet"));

  const contactBits = [
    student.parentPhone.trim(),
    student.parentEmail.trim(),
  ].filter(Boolean);

  return (
    <div ref={setNodeRef} style={style} className={cn(className)}>
      <Card
        className={cn(
          "relative gap-2 py-3",
          density === "compact" && "py-2",
          mode === "drag" && "touch-none select-none",
          dragDisabled && "opacity-60",
          isDragging && "opacity-60 ring-2 ring-primary/30"
        )}
      >
        <CardContent
          className={cn(
            "flex flex-col gap-2 px-3",
            density === "compact" && "gap-1.5 px-2"
          )}
        >
          <div className="flex items-start gap-2">
            {mode === "drag" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "mt-0.5 h-auto px-0.5 py-0 text-muted-foreground hover:text-foreground",
                  dragDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-grab active:cursor-grabbing"
                )}
                aria-label={
                  dragDisabled
                    ? `${student.name} cannot be dragged into this lesson`
                    : `Drag ${student.name}`
                }
                {...(dragDisabled ? {} : listeners)}
                {...(dragDisabled ? {} : attributes)}
              >
                <GripVertical />
              </Button>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p
                  className={cn(
                    "leading-tight font-semibold",
                    density === "compact" ? "text-xs" : "text-sm"
                  )}
                >
                  {student.name}
                </p>
                <Badge variant="outline" className="font-mono">
                  Lv{student.level}
                </Badge>
                <Badge variant="muted">Age {student.age}</Badge>
                <Badge variant="outline">
                  {student.discipline === "ski" ? "Ski" : "Snowboard"}
                </Badge>
                {hasMedical ? (
                  <Badge
                    variant={isUrgentMedical ? "destructive" : "secondary"}
                  >
                    Medical
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-[0.625rem] leading-snug text-muted-foreground">
                <span className="font-medium text-foreground/80">Parent: </span>
                {student.parentName}
              </p>
              {contactBits.length > 0 ? (
                <p className="mt-0.5 text-[0.625rem] leading-snug text-muted-foreground">
                  {contactBits.join(" · ")}
                </p>
              ) : null}
              {hasMedical ? (
                <p className="mt-1 text-[0.625rem] leading-snug font-medium text-destructive">
                  {student.medicalInfo}
                </p>
              ) : null}
              {otherGroups.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {otherGroups.map((g) => {
                    const label = formatGroupIdentity(
                      g,
                      (id) => getInstructor(id)?.name
                    );
                    const isSlotConflict = Boolean(
                      workspaceSlot &&
                        schedulesOverlap(
                          workspaceSlot.day,
                          workspaceSlot.time,
                          g.day,
                          g.time
                        )
                    );
                    return (
                      <Badge
                        key={g.id}
                        variant={isSlotConflict ? "destructive" : "outline"}
                        title={label}
                      >
                        {density === "compact" && isSlotConflict
                          ? "Also this slot"
                          : label}
                      </Badge>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          {density === "comfortable" ? (
            <NotesPreview text={student.notes} />
          ) : (
            <NotesPreview
              text={student.notes}
              className="[&_p:last-child]:line-clamp-1"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { StudentCard };
