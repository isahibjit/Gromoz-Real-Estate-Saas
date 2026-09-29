import * as React from "react";

import { cn } from "../../lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex min-h-24 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
        invalid &&
          "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
