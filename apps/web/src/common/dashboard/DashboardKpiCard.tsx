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
}

export function DashboardKpiCard({
  label,
  value,
  icon: Icon,
  toneClassName,
  helper = "Live data",
  badge,
  onClick,
}: DashboardKpiCardProps) {
  return (
    <Card
      className={cn(
        "flex min-h-[92px] min-w-0 items-start gap-3 overflow-hidden rounded-md border border-slate-200 p-3 shadow-card sm:p-4",
        onClick && "cursor-pointer transition-all hover:border-slate-300 hover:shadow-md active:scale-[0.99]",
      )}
      onClick={onClick}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full p-2",
          toneClassName,
        )}
      >
        <Icon className="size-5" strokeWidth={1.5} />
      </span>
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
        <p className="truncate text-[11px] font-semibold text-muted-foreground">
          {helper}
        </p>
      </div>
    </Card>
  );
}
