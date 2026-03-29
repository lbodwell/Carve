import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

function AppDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: AppDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center p-4">
          <Dialog.Popup
            className={cn(
              "max-h-[min(90vh,640px)] w-full max-w-lg overflow-y-auto rounded-xl border bg-card p-4 text-card-foreground shadow-lg outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
              className
            )}
          >
            <div className="flex flex-col gap-3">
              <Dialog.Title className="font-heading text-base leading-tight font-semibold">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="text-xs leading-relaxed text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
              {children}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { AppDialog };
