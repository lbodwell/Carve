import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";

import type {
  Discipline,
  Student,
  StudentLevel,
} from "@/lib/ski-school/types";
import {
  studentFormFieldSchemas,
  studentFormRawSchema,
} from "@/lib/ski-school/schemas";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSkiSchool } from "@/lib/ski-school/context";

const LEVELS: Array<StudentLevel> = [1, 2, 3, 4, 5, 6];

type StudentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Student | null;
};

const emptyDefaults = {
  name: "",
  age: "6",
  level: 1 as StudentLevel,
  discipline: "ski" as Discipline,
  medicalInfo: "",
  parentName: "",
  parentPhone: "",
  parentEmail: "",
  notes: "",
};

function fieldErrorMessage(errors: ReadonlyArray<unknown>): string | null {
  if (!errors.length) return null;
  const first = errors[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "message" in first) {
    const m = (first as { message?: string }).message;
    if (m) return m;
  }
  return "Invalid value";
}

function StudentFormDialog({
  open,
  onOpenChange,
  initial,
}: StudentFormDialogProps) {
  const { upsertStudent } = useSkiSchool();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: emptyDefaults,
    onSubmit: ({ value }) => {
      setSubmitError(null);
      const parsed = studentFormRawSchema.safeParse(value);
      if (!parsed.success) {
        const msg =
          parsed.error.issues[0]?.message ??
          "Please fix the highlighted fields.";
        setSubmitError(msg);
        return;
      }
      const v = parsed.data;
      upsertStudent({
        id: initial?.id,
        name: v.name.trim(),
        age: Math.round(Number(v.age)),
        discipline: v.discipline,
        level: v.level,
        medicalInfo: v.medicalInfo.trim(),
        parentName: v.parentName.trim(),
        parentPhone: v.parentPhone.trim(),
        parentEmail: v.parentEmail.trim(),
        notes: v.notes.trim(),
      });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (initial) {
      form.reset({
        name: initial.name,
        age: String(initial.age),
        level: initial.level,
        discipline: initial.discipline,
        medicalInfo: initial.medicalInfo,
        parentName: initial.parentName,
        parentPhone: initial.parentPhone,
        parentEmail: initial.parentEmail,
        notes: initial.notes,
      });
    } else {
      form.reset(emptyDefaults);
    }
  }, [open, initial, form]);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit student" : "Add student"}
      description="Student roster fields used for placement, medical visibility, and parent contact."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        {submitError ? (
          <p className="text-xs font-medium text-destructive" role="alert">
            {submitError}
          </p>
        ) : null}
        <form.Field
          name="name"
          validators={{
            onBlur: ({ value }) => {
              const r = studentFormFieldSchemas.name.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => {
            const err = fieldErrorMessage(field.state.meta.errors);
            return (
              <div className="grid gap-1.5">
                <Label htmlFor="stu-name">Name</Label>
                <Input
                  id="stu-name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  autoComplete="name"
                  aria-invalid={Boolean(err)}
                />
                {err ? (
                  <p className="text-xs font-medium text-destructive" role="status">
                    {err}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <div className="grid grid-cols-2 gap-3">
          <form.Field
            name="age"
            validators={{
              onBlur: ({ value }) => {
                const r = studentFormFieldSchemas.age.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const err = fieldErrorMessage(field.state.meta.errors);
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="stu-age">Age (4–12)</Label>
                  <Input
                    id="stu-age"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    inputMode="numeric"
                    aria-invalid={Boolean(err)}
                  />
                  {err ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="status"
                    >
                      {err}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          <form.Field name="level">
            {(field) => (
              <div className="grid gap-1.5">
                <Label>Level (1-6)</Label>
                <Select
                  value={String(field.state.value)}
                  onValueChange={(v) => {
                    if (v == null) return;
                    field.handleChange(Number(v) as StudentLevel);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {LEVELS.map((lv) => (
                        <SelectItem key={lv} value={String(lv)}>
                          {lv}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
        </div>

        <form.Field
          name="discipline"
          validators={{
            onBlur: ({ value }) => {
              const r = studentFormFieldSchemas.discipline.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => {
            const err = fieldErrorMessage(field.state.meta.errors);
            return (
              <div className="grid gap-1.5">
                <Label>Discipline</Label>
                <Select
                  value={field.state.value}
                  onValueChange={(v) => {
                    if (v == null) return;
                    field.handleChange(v as Discipline);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ski">Ski</SelectItem>
                      <SelectItem value="snowboard">Snowboard</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {err ? (
                  <p className="text-xs font-medium text-destructive" role="status">
                    {err}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field
          name="medicalInfo"
          validators={{
            onBlur: ({ value }) => {
              const r = studentFormFieldSchemas.medicalInfo.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => {
            const err = fieldErrorMessage(field.state.meta.errors);
            return (
              <div className="grid gap-1.5">
                <Label htmlFor="stu-medical">Medical info</Label>
                <Textarea
                  id="stu-medical"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  rows={2}
                  aria-invalid={Boolean(err)}
                />
                {err ? (
                  <p className="text-xs font-medium text-destructive" role="status">
                    {err}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <form.Field name="parentName">
          {(field) => (
            <div className="grid gap-1.5">
              <Label htmlFor="stu-parent">Parent / guardian name</Label>
              <Input
                id="stu-parent"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </div>
          )}
        </form.Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.Field
            name="parentPhone"
            validators={{
              onBlur: ({ value }) => {
                const r = studentFormFieldSchemas.parentPhone.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const err = fieldErrorMessage(field.state.meta.errors);
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="stu-phone">Parent phone</Label>
                  <Input
                    id="stu-phone"
                    type="tel"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete="tel"
                    aria-invalid={Boolean(err)}
                  />
                  {err ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="status"
                    >
                      {err}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>

          <form.Field
            name="parentEmail"
            validators={{
              onBlur: ({ value }) => {
                const r = studentFormFieldSchemas.parentEmail.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const err = fieldErrorMessage(field.state.meta.errors);
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="stu-email">Parent email</Label>
                  <Input
                    id="stu-email"
                    type="email"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete="email"
                    aria-invalid={Boolean(err)}
                  />
                  {err ? (
                    <p
                      className="text-xs font-medium text-destructive"
                      role="status"
                    >
                      {err}
                    </p>
                  ) : null}
                </div>
              );
            }}
          </form.Field>
        </div>
        <p className="text-[0.625rem] leading-snug text-muted-foreground">
          At least one of phone or email is required.
        </p>

        <form.Field
          name="notes"
          validators={{
            onBlur: ({ value }) => {
              const r = studentFormFieldSchemas.notes.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => {
            const err = fieldErrorMessage(field.state.meta.errors);
            return (
              <div className="grid gap-1.5">
                <Label htmlFor="stu-notes">Placement notes</Label>
                <Textarea
                  id="stu-notes"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  rows={3}
                  aria-invalid={Boolean(err)}
                />
                {err ? (
                  <p className="text-xs font-medium text-destructive" role="status">
                    {err}
                  </p>
                ) : null}
              </div>
            );
          }}
        </form.Field>

        <div className="mt-1 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit">{initial ? "Save" : "Create"}</Button>
        </div>
      </form>
    </AppDialog>
  );
}

export { StudentFormDialog };
