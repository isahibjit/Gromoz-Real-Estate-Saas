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
      viewBox={variant === "mark" ? "40 133 138 156" : "40 133 511 156"}
      preserveAspectRatio="xMidYMid meet"
      className={cn("block max-w-full", className)}
      focusable="false"
    >
      <image href={gromozeLogo} width="577" height="433" />
    </svg>
  );
}
