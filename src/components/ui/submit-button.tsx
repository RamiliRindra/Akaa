"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = Omit<ButtonProps, "type" | "loading"> & {
  pendingLabel?: string;
  pendingChildren?: ReactNode;
};

export function SubmitButton({
  children,
  pendingLabel,
  pendingChildren,
  disabled,
  variant = "primary",
  size = "md",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      loading={pending}
      disabled={disabled}
      {...props}
    >
      {pending
        ? (pendingChildren ?? <span>{pendingLabel ?? "Traitement..."}</span>)
        : children}
    </Button>
  );
}
