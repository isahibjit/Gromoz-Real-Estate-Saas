import * as React from "react";
import { CalendarDays, Filter } from "lucide-react";

import { Button, type ButtonProps } from "../Button/Button";
import { cn } from "../../lib/utils";

export const FilterButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children = "Filter", className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      className={cn("font-semibold", className)}
      {...props}
    >
      <Filter className="size-3.5" />
      {children}
    </Button>
  ),
);
FilterButton.displayName = "FilterButton";

export const DateRangeButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children = "Select dates", className, ...props }, ref) => (
    <Button
      ref={ref}
      variant="outline"
      size="sm"
      className={cn("font-semibold", className)}
      {...props}
    >
      <CalendarDays className="size-3.5" />
      {children}
    </Button>
  ),
);
DateRangeButton.displayName = "DateRangeButton";
