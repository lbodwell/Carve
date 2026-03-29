import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";

import type { Discipline, Instructor } from "@/lib/ski-school/types";
import {
  instructorFormFieldSchemas,
  instructorFormRawSchema,
} from "@/lib/ski-school/schemas";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSkiSchool } from "@/lib/ski-school/context";

type InstructorFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Instructor | null;
};

const emptyDefaults = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  notes: "",
  ski: true,
  snowboard: false,
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

function InstructorFormDialog({
  open,
  onOpenChange,
  initial,
}: InstructorFormDialogProps) {
  const { upsertInstructor } = useSkiSchool();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: emptyDefaults,
    onSubmit: ({ value }) => {
      setSubmitError(null);
      const parsed = instructorFormRawSchema.safeParse(value);
      if (!parsed.success) {
        const msg =
          parsed.error.issues[0]?.message ??
          "Please fix the highlighted fields.";
        setSubmitError(msg);
        return;
      }
      const v = parsed.data;
      const disciplines: Array<Discipline> = [];
      if (v.ski) disciplines.push("ski");
      if (v.snowboard) disciplines.push("snowboard");

      upsertInstructor({
        id: initial?.id,
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        phone: v.phone.trim(),
        email: v.email.trim(),
        notes: v.notes.trim(),
        disciplines,
      });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    if (initial) {
      form.reset({
        firstName: initial.firstName,
        lastName: initial.lastName,
        phone: initial.phone,
        email: initial.email,
        notes: initial.notes,
        ski: initial.disciplines.includes("ski"),
        snowboard: initial.disciplines.includes("snowboard"),
      });
    } else {
      form.reset(emptyDefaults);
    }
  }, [open, initial, form]);

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={initial ? "Edit instructor" : "Add instructor"}
      description="Disciplines and notes help match instructors to lesson groups."
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.Field
            name="firstName"
            validators={{
              onBlur: ({ value }) => {
                const r = instructorFormFieldSchemas.firstName.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const err = fieldErrorMessage(field.state.meta.errors);
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="ins-first-name">First name</Label>
                  <Input
                    id="ins-first-name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete="given-name"
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
            name="lastName"
            validators={{
              onBlur: ({ value }) => {
                const r = instructorFormFieldSchemas.lastName.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const err = fieldErrorMessage(field.state.meta.errors);
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="ins-last-name">Last name</Label>
                  <Input
                    id="ins-last-name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    autoComplete="family-name"
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <form.Field
            name="phone"
            validators={{
              onBlur: ({ value }) => {
                const r = instructorFormFieldSchemas.phone.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const err = fieldErrorMessage(field.state.meta.errors);
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="ins-phone">Phone</Label>
                  <Input
                    id="ins-phone"
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
            name="email"
            validators={{
              onBlur: ({ value }) => {
                const r = instructorFormFieldSchemas.email.safeParse(value);
                return r.success ? undefined : r.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const err = fieldErrorMessage(field.state.meta.errors);
              return (
                <div className="grid gap-1.5">
                  <Label htmlFor="ins-email">Email</Label>
                  <Input
                    id="ins-email"
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

        <form.Field name="ski">
          {(skiField) => (
            <form.Field name="snowboard">
              {(sbField) => {
                const comboErr =
                  !skiField.state.value && !sbField.state.value
                    ? "Select at least one discipline"
                    : null;
                return (
                  <fieldset className="grid gap-2 rounded-md border px-3 py-2">
                    <legend className="px-1 text-[0.625rem] font-semibold tracking-wide text-muted-foreground uppercase">
                      Disciplines
                    </legend>
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={skiField.state.value}
                        onChange={(e) =>
                          skiField.handleChange(e.target.checked)
                        }
                        className="size-3.5 rounded-sm border-input accent-primary"
                      />
                      Ski
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={sbField.state.value}
                        onChange={(e) =>
                          sbField.handleChange(e.target.checked)
                        }
                        className="size-3.5 rounded-sm border-input accent-primary"
                      />
                      Snowboard
                    </label>
                    {comboErr ? (
                      <p
                        className="text-xs font-medium text-destructive"
                        role="status"
                      >
                        {comboErr}
                      </p>
                    ) : null}
                  </fieldset>
                );
              }}
            </form.Field>
          )}
        </form.Field>

        <form.Field
          name="notes"
          validators={{
            onBlur: ({ value }) => {
              const r = instructorFormFieldSchemas.notes.safeParse(value);
              return r.success ? undefined : r.error.issues[0]?.message;
            },
          }}
        >
          {(field) => {
            const err = fieldErrorMessage(field.state.meta.errors);
            return (
              <div className="grid gap-1.5">
                <Label htmlFor="ins-notes">Notes</Label>
                <Textarea
                  id="ins-notes"
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

export { InstructorFormDialog };
