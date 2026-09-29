import type { LucideIcon } from "lucide-react";
import { Button, Card, cn } from "ui";

export type LeadStatsRowItem = {
  label: string;
  value: string;
  change: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
};

export function StatsRow({
  stats,
  onStatClick,
  activeLabels = [],
  className,
}: {
  stats: LeadStatsRowItem[];
  onStatClick?: (label: string) => void;
  activeLabels?: string[];
  className?: string;
}) {
  const activeSet = new Set(activeLabels);
  const gridClassName = cn(
    "grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]",
    className,
  );

  const renderCard = (stat: LeadStatsRowItem, interactive: boolean) => {
    const Icon = stat.icon;
    return (
      <Card
        className={cn(
          "w-full overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card transition sm:p-4",
          interactive && "hover:border-blue-200",
          activeSet.has(stat.label) && "border-blue-600 bg-blue-50/40",
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12",
              stat.tone,
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 truncate text-xl font-extrabold leading-none text-secondary sm:text-2xl">
              {stat.value}
            </p>
            <p className={cn("mt-2 truncate text-xs font-semibold", stat.helper ? "text-secondary" : "invisible select-none")}>
              {stat.helper || "-"}
            </p>
            <p className={cn("mt-1 truncate text-[11px] font-extrabold", stat.change ? "text-blue-700" : "invisible select-none")}>
              {stat.change || "-"}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <section className={gridClassName}>
      {stats.map((stat) =>
        onStatClick ? (
          <Button
            key={stat.label}
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start rounded-none bg-transparent p-0 text-left hover:bg-transparent focus-visible:ring-offset-0"
            onClick={() => onStatClick(stat.label)}
          >
            {renderCard(stat, true)}
          </Button>
        ) : (
          <div key={stat.label}>{renderCard(stat, false)}</div>
        ),
      )}
    </section>
  );
}
