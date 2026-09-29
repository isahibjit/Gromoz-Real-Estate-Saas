import * as React from "react";
import { Search } from "lucide-react";

import { cn } from "../../lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        "flex h-10 w-full rounded-md border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
        invalid &&
          "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input ref={ref} className={cn("pl-9", className)} {...props} />
    </div>
  ),
);
SearchInput.displayName = "SearchInput";
