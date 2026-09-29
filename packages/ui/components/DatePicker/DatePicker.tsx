import * as React from "react";
import { CalendarDays } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../Button/Button";
import { Input, type InputProps } from "../Input/Input";

export interface DatePickerProps extends Omit<InputProps, "type"> {}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, disabled, onClick, readOnly, ...props }, forwardedRef) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    const openPicker = () => {
      const input = inputRef.current;
      if (!input || disabled || readOnly) return;

      input.focus({ preventScroll: true });
      input.showPicker?.();
    };

    return (
      <div className="relative">
        <CalendarDays
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          type="date"
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "cursor-pointer pl-10 pr-11 [&::-webkit-calendar-picker-indicator]:opacity-0",
            className,
          )}
          onClick={(event) => {
            onClick?.(event);
            openPicker();
          }}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Open ${props["aria-label"] ?? "date"} calendar`}
          disabled={disabled || readOnly}
          className="absolute right-1 top-1/2 size-8 -translate-y-1/2 rounded-md text-secondary hover:bg-slate-100"
          onClick={openPicker}
        >
          <CalendarDays className="size-4" />
        </Button>
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";
