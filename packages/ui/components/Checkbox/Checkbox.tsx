import * as React from "react";
import { Check } from "lucide-react";

import { cn } from "../../lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const checkboxId = id ?? generatedId;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "inline-flex items-center gap-3 text-sm font-medium text-foreground",
          disabled && "cursor-not-allowed opacity-70",
          !disabled && "cursor-pointer",
          className,
        )}
      >
        <span className="relative flex size-5 items-center justify-center">
          <input
            ref={ref}
            id={checkboxId}
            type="checkbox"
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <span className="flex size-5 items-center justify-center rounded-md border border-input bg-card text-primary transition-colors [&>svg]:opacity-0 [&>svg]:transition-opacity peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:[&>svg]:opacity-100">
            <Check aria-hidden="true" className="size-3.5" />
          </span>
        </span>
        {label ? <span>{label}</span> : null}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
