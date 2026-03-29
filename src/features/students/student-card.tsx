import { useDraggable } from "@dnd-kit/core";
import { GripVertical } from "lucide-react";

import type { LessonGroup, Student } from "@/lib/ski-school/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatGroupIdentity } from "@/lib/ski-school/group-label";
import { NotesPreview } from "@/features/shared/notes-preview";
import { useSkiSchool } from "@/lib/ski-school/context";
import { cn } from "@/lib/utils";

type StudentCardProps = {
  student: Student;
  mode: "static" | "drag";
  otherGroups?: Array<LessonGroup>;
  className?: string;
};

function StudentCard({
  student,
  mode,
  otherGroups = [],
  className,
}: StudentCardProps) {
  const { getInstructor } = useSkiSchool();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `student:${student.id}`,
      disabled: mode !== "drag",
    });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const hasMedical = student.medicalInfo.trim().length > 0;
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
          mode === "drag" && "touch-none select-none",
          isDragging && "opacity-60 ring-2 ring-primary/30"
        )}
      >
        <CardContent className="flex flex-col gap-2 px-3">
          <div className="flex items-start gap-2">
            {mode === "drag" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-0.5 h-auto cursor-grab px-0.5 py-0 text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label={`Drag ${student.name}`}
                {...listeners}
                {...attributes}
              >
                <GripVertical />
              </Button>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-sm leading-tight font-semibold">
                  {student.name}
                </p>
                <Badge variant="outline" className="font-mono">
                  Lv{student.level}
                </Badge>
                <Badge variant="muted">Age {student.age}</Badge>
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
                  {otherGroups.map((g) => (
                    <Badge
                      key={g.id}
                      variant="outline"
                      title={formatGroupIdentity(
                        g,
                        (id) => getInstructor(id)?.name
                      )}
                    >
                      {formatGroupIdentity(g, (id) => getInstructor(id)?.name)}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <NotesPreview text={student.notes} />
        </CardContent>
      </Card>
    </div>
  );
}

export { StudentCard };
