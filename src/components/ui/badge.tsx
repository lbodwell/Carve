import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-[0.625rem] leading-snug font-medium whitespace-nowrap transition-[color,box-shadow]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        outline:
          "border-border bg-transparent text-foreground [a&]:hover:bg-muted",
        muted:
          "border-transparent bg-muted text-muted-foreground [a&]:hover:bg-muted/80",
        destructive:
          "border-transparent bg-destructive/15 text-destructive dark:bg-destructive/20",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
);

function Badge({
  className,
  variant = "secondary",
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
