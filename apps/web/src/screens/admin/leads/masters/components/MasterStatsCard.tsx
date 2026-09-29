import { CheckCircle2, Flag, PauseCircle, Settings2 } from "lucide-react";

interface MasterStatsCardProps {
  total: number;
  active: number;
  inactive: number;
  systemDefault: number;
  totalLabel?: string;
}

export function MasterStatsCard({
  total,
  active,
  inactive,
  systemDefault,
  totalLabel = "Total Items",
}: MasterStatsCardProps) {
  // Better to define it explicitly to match the design
  return (
    <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
      <div className="flex min-w-0 items-start gap-3 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 sm:size-12">
          <Flag className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-muted-foreground">
            {totalLabel}
          </p>
          <p className="truncate text-xl font-extrabold text-secondary">{total}</p>
        </div>
      </div>
      <div className="flex min-w-0 items-start gap-3 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 sm:size-12">
          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-muted-foreground">Active</p>
          <p className="truncate text-xl font-extrabold text-secondary">{active}</p>
        </div>
      </div>
      <div className="flex min-w-0 items-start gap-3 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-500 sm:size-12">
          <PauseCircle className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-muted-foreground">Inactive</p>
          <p className="truncate text-xl font-extrabold text-secondary">{inactive}</p>
        </div>
      </div>
      <div className="flex min-w-0 items-start gap-3 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-500 sm:size-12">
          <Settings2 className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-muted-foreground">
            System Default
          </p>
          <p className="truncate text-xl font-extrabold text-secondary">
            {systemDefault}
          </p>
        </div>
      </div>
    </div>
  );
}
