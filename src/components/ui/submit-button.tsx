"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  pendingChildren?: ReactNode;
  showSpinner?: boolean;
};

export function SubmitButton({
  children,
  className,
  disabled,
  pendingLabel,
  pendingChildren,
  showSpinner = true,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  const content = pending
    ? (pendingChildren ?? (
        <>
          {showSpinner ? <Spinner className="h-4 w-4" /> : null}
          <span>{pendingLabel ?? "Traitement..."}</span>
        </>
      ))
    : children;

  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className ?? ""}${pending ? " cursor-wait" : ""}`}
      {...props}
    >
      {content}
    </button>
  );
}
