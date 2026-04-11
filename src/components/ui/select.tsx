import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string | boolean;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <select
        ref={ref}
        className={cn(
          "form-select",
          hasError &&
            "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]",
          className
        )}
        aria-invalid={hasError || undefined}
        {...props}
      />
    );
  }
);

Select.displayName = "Select";
