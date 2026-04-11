import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string | boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, resize = "vertical", style, ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <textarea
        ref={ref}
        style={{ resize, ...style }}
        className={cn(
          "form-textarea min-h-[6rem]",
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

Textarea.displayName = "Textarea";
