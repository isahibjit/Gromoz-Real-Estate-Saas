import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, cn } from "ui";

import type { KpiItem } from "./dashboardData";
import { dashboardCardClass } from "./dashboardStyles";

export function KpiCard({ item }: { item: KpiItem }) {
  const Icon = item.icon;
  const isUp = item.trendDirection === "up";
  const [trendValue, trendContext] = item.trend.split(/\s+(?=vs\s)/);
  const isNeutral = item.trendDirection === "neutral";

  return (
    <Card
      className={cn(
        dashboardCardClass,
        "flex min-h-[104px] min-w-0 items-start gap-3 p-4 sm:min-h-[112px] sm:p-5",
      )}
    >
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md p-2 text-white sm:size-[55px] sm:p-3",
          item.tone,
        )}
      >
        <Icon aria-hidden="true" className="size-5 sm:size-6" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold leading-tight text-foreground">
          {item.label}
        </p>
        <p className="mt-2 truncate text-xl font-extrabold leading-none text-foreground sm:text-2xl">
          {item.value}
        </p>
        <p
          className={cn(
            "mt-2 flex min-w-0 items-center text-[11px] font-semibold",
            isUp ? "text-success" : "text-destructive",
            isNeutral && "text-muted-foreground",
            item.trendClassName,
          )}
        >
          {isNeutral ? null : isUp ? (
            <ArrowUp className="mr-0.5 size-3.5" />
          ) : (
            <ArrowDown className="mr-0.5 size-3.5" />
          )}
          <span className="shrink-0">{trendValue}</span>
          {trendContext ? (
            <span className="ml-1 truncate text-foreground">{trendContext}</span>
          ) : null}
        </p>
      </div>
    </Card>
  );
}
