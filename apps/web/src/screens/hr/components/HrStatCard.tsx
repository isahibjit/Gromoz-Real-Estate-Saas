import type { ComponentType } from "react";

import { Card } from "ui";

export function HrStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "bg-blue-50 text-blue-600",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card transition-all sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12 ${tone}`}
        >
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-secondary">{title}</p>
          <p className="mt-1 truncate text-xl font-extrabold text-secondary sm:text-2xl">{value}</p>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {subtitle}
          </p>
        </div>
      </div>
    </Card>
  );
}
