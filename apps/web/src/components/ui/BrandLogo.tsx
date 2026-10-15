import { cn } from "ui";
import gromozeLogo from "../../assets/gromoze-logo.png";

interface BrandLogoProps {
  variant?: "lockup" | "mark";
  className?: string;
}

/** Frame the supplied artwork without changing its pixels or stretching it. */
export function BrandLogo({ variant = "lockup", className }: BrandLogoProps) {
  return (
    <svg
      role="img"
      aria-label={variant === "mark" ? "Gromoze logo" : "Gromoze — Real Estate Sales. Simplified."}
      viewBox={variant === "mark" ? "104 338 338 384" : "104 338 1272 384"}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block max-w-full", className)}
      focusable="false"
    >
      <image href={gromozeLogo} width="1448" height="1086" />
    </svg>
  );
}
