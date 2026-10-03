import type { LucideIcon } from "lucide-react";
import { Card, cn } from "ui";

interface DashboardKpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  toneClassName: string;
  helper?: string;
  badge?: string;
  onClick?: () => void;
  iconPosition?: "leading" | "trailing";
  className?: string;
  iconContainerClassName?: string;
  helperClassName?: string;
}

export function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  toneClassName,
  helper = "Live data",
  badge,
  onClick,
  iconPosition = "leading",
  className,
  iconContainerClassName,
  helperClassName,
}: DashboardKpiCardProps) {
  const iconElement = (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md p-2",
        toneClassName,
        iconContainerClassName,
      )}
    >
      <Icon className="size-5" strokeWidth={1.5} />
    </span>
  );

  return (
    <Card
      className={cn(
        "flex min-h-[96px] min-w-0 items-start gap-3 overflow-hidden border-border p-4",
        iconPosition === "trailing" && "justify-between",
        onClick &&
          "cursor-pointer transition-colors hover:border-primary/25 hover:bg-muted/30",
        className,
      )}
      onClick={onClick}
    >
      {iconPosition === "leading" ? iconElement : null}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <p className="truncate text-xs font-bold text-muted-foreground">
            {label}
          </p>
          {badge ? (
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xl font-extrabold text-secondary sm:text-2xl">
          {value}
        </p>
        <p
          className={cn(
            "truncate text-[11px] font-semibold text-muted-foreground",
            helperClassName,
          )}
        >
          {helper}
        </p>
      </div>
      {iconPosition === "trailing" ? iconElement : null}
    </Card>
  );
}
