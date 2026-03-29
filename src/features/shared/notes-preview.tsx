import { cn } from "@/lib/utils";

type NotesPreviewProps = {
  label?: string;
  text: string;
  className?: string;
};

function NotesPreview({ label = "Notes", text, className }: NotesPreviewProps) {
  const trimmed = text.trim();
  if (!trimmed) {
    return (
      <p
        className={cn(
          "rounded-md border border-dashed border-border/80 px-2 py-1.5 text-[0.625rem] leading-snug text-muted-foreground italic",
          className
        )}
      >
        No {label.toLowerCase()} yet.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border/80 bg-muted/40 px-2 py-1.5",
        className
      )}
    >
      <p className="mb-0.5 text-[0.5625rem] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="line-clamp-4 text-[0.625rem] leading-snug whitespace-pre-wrap text-foreground/90">
        {trimmed}
      </p>
    </div>
  );
}

export { NotesPreview };
