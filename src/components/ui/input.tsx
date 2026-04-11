import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: string | boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, style, ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <div className="relative w-full">
        {leftIcon ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text)]/45">
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          style={
            leftIcon || rightIcon
              ? {
                  paddingLeft: leftIcon ? "2.5rem" : undefined,
                  paddingRight: rightIcon ? "2.5rem" : undefined,
                  ...style,
                }
              : style
          }
          className={cn(
            "form-input",
            hasError &&
              "border-red-400 focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]",
            className
          )}
          aria-invalid={hasError || undefined}
          {...props}
        />
        {rightIcon ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text)]/45">
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
