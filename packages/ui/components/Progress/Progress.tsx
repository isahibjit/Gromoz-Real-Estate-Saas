import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "../../lib/utils";

export interface ProgressProps
  extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorClassName?: string;
}

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, indicatorClassName, value = 0, ...props }, ref) => {
  const clampedValue = Math.min(Math.max(value ?? 0, 0), 100);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      value={clampedValue}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full rounded-full bg-primary transition-[width]",
          indicatorClassName,
        )}
        style={{ width: `${clampedValue}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;
