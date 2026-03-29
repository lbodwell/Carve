import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import type {Discipline, Instructor, LessonGroup, LessonTimeSlot, Weekday} from "@/lib/ski-school/types";
import {
  
  
  
  
  
  formatFullName
} from "@/lib/ski-school/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatGroupIdentity } from "@/lib/ski-school/group-label";
import { NotesPreview } from "@/features/shared/notes-preview";
import { useSkiSchool } from "@/lib/ski-school/context";
import { schedulesOverlap } from "@/lib/ski-school/schedule";
import { cn } from "@/lib/utils";

type InstructorCardProps = {
  instructor: Instructor;
  mode: "static" | "drag";
  otherGroups?: Array<LessonGroup>;
  workspaceSlot?: { day: Weekday; time: LessonTimeSlot };
  density?: "comfortable" | "compact";
  className?: string;
  isLead?: boolean;
  /** Shown for non-lead instructors in a group roster when reassignment is allowed. */
  onMakeLead?: () => void;
};

function disciplineLabel(d: Discipline) {
  return d === "ski" ? "Ski" : "Snowboard";
}

function InstructorCard({
  instructor,
  mode,
  otherGroups = [],
  workspaceSlot,
  density = "comfortable",
  className,
  isLead = false,
  onMakeLead,
}: InstructorCardProps) {
  const { getInstructor } = useSkiSchool();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `instructor:${instructor.id}`,
      disabled: mode !== "drag",
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const contactBits = [instructor.phone.trim(), instructor.email.trim()].filter(
    Boolean
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(className)}>
      <Card
        className={cn(
          "relative gap-2 py-3",
          density === "compact" && "py-2",
          mode === "drag" && "touch-none select-none",
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
                className="mt-0.5 h-auto cursor-grab px-0.5 py-0 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label={`Drag ${formatFullName(instructor)}`}
                {...listeners}
                {...attributes}
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
                  {formatFullName(instructor)}
                </p>
                {isLead ? (
                  <Badge variant="default" className="text-[0.5625rem]">
                    Lead
                  </Badge>
                ) : null}
                {instructor.disciplines.map((d) => (
                  <Badge key={d} variant="outline">
                    {disciplineLabel(d)}
                  </Badge>
                ))}
              </div>
              {contactBits.length > 0 ? (
                <p className="mt-1 text-[0.625rem] leading-snug text-muted-foreground">
                  {contactBits.join(" · ")}
                </p>
              ) : null}
              {otherGroups.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {otherGroups.map((g) => {
                    const label = formatGroupIdentity(g, (id) => {
                      const ins = getInstructor(id);
                      return ins ? formatFullName(ins) : undefined;
                    });
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
              {onMakeLead && !isLead ? (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="mt-2 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMakeLead();
                  }}
                >
                  Make lead
                </Button>
              ) : null}
            </div>
          </div>
          {density === "comfortable" ? (
            <NotesPreview text={instructor.notes} />
          ) : (
            <NotesPreview
              text={instructor.notes}
              className="[&_p:last-child]:line-clamp-1"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { InstructorCard };
