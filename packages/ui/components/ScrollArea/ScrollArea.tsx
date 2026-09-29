import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "../../lib/utils";

export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => {
  const hasResizeObserver =
    typeof globalThis !== "undefined" &&
    "ResizeObserver" in (globalThis as { ResizeObserver?: unknown });

  if (!hasResizeObserver) {
    return (
      <div
        ref={ref as React.ForwardedRef<HTMLDivElement>}
        className={cn(
          "overflow-auto [scrollbar-color:hsl(var(--secondary)/0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-secondary/20 [&::-webkit-scrollbar-thumb]:bg-clip-content [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-secondary/40",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none p-1 transition-colors",
      orientation === "vertical" && "h-full w-3 border-l border-l-transparent",
      orientation === "horizontal" &&
        "h-3 flex-col border-t border-t-transparent",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-secondary/20 hover:bg-secondary/40 transition-colors" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;
