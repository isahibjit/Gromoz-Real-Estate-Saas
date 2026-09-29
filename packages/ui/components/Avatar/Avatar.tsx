import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "../../lib/utils";

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, style, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full aspect-square min-w-0 min-h-0",
      className,
    )}
    style={{
      overflow: "hidden",
      borderRadius: "9999px",
      flexShrink: 0,
      ...style,
    }}
    {...props}
  />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

export const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, style, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn(
      "block aspect-square h-full max-h-full w-full max-w-full object-cover shrink-0 rounded-full",
      className,
    )}
    style={{
      width: "100%",
      height: "100%",
      maxWidth: "100%",
      maxHeight: "100%",
      objectFit: "cover",
      borderRadius: "9999px",
      display: "block",
      ...style,
    }}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

export const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center bg-secondary text-xs font-bold text-secondary-foreground",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
