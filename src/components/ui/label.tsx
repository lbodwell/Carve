import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export type LabelProps = ComponentProps<"label">;

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "inline-flex items-center gap-1 text-xs leading-none font-medium text-foreground select-none peer-disabled:pointer-events-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
