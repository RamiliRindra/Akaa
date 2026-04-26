"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Root ─────────────────────────────────────────────────────────────── */
export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;
export const DialogPortal = RadixDialog.Portal;

/* ─── Overlay ───────────────────────────────────────────────────────────── */
export function DialogOverlay({ className, ...props }: RadixDialog.DialogOverlayProps) {
  return (
    <RadixDialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-(--color-text-dark)/35 backdrop-blur-[2px]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

/* ─── Content ───────────────────────────────────────────────────────────── */
type DialogContentProps = RadixDialog.DialogContentProps & {
  showClose?: boolean;
};

export function DialogContent({ className, children, showClose = true, ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-featured bg-[var(--color-surface)] p-6",
          "shadow-card-elevated",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          "duration-150",
          className
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <DialogClose
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text)]/50 transition hover:bg-[var(--color-surface-low)] hover:text-[var(--color-text)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        ) : null}
      </RadixDialog.Content>
    </DialogPortal>
  );
}

/* ─── Header / Title / Description ─────────────────────────────────────── */
export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-1.5 pr-8", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: RadixDialog.DialogTitleProps) {
  return (
    <RadixDialog.Title
      className={cn("font-display text-lg font-bold text-[var(--color-text-dark)]", className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: RadixDialog.DialogDescriptionProps) {
  return (
    <RadixDialog.Description
      className={cn("text-sm leading-relaxed text-(--color-text)/70", className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}
