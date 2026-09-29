import * as React from "react";
import { cn } from "../../lib/utils";

interface SwitchProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "className"
  > {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => {
    return (
      <label
        className={cn(
          "relative inline-flex items-center cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        <input
          type="checkbox"
          role="switch"
          aria-checked={checked}
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          ref={ref}
          {...props}
        />
        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    );
  },
);

Switch.displayName = "Switch";
