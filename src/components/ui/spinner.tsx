"use client";

import { LoaderCircle } from "lucide-react";

type SpinnerProps = React.ComponentProps<typeof LoaderCircle>;

export function Spinner({ className = "", ...props }: SpinnerProps) {
  return (
    <LoaderCircle
      role="status"
      aria-label="Chargement"
      className={`h-4 w-4 animate-spin ${className}`.trim()}
      {...props}
    />
  );
}
