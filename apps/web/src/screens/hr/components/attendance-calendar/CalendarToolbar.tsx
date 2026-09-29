import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button, SearchableSelect } from "ui";

import type { SelectOption } from "./types";

type CalendarToolbarProps = {
  visibleMonth: Date;
  monthOptions: SelectOption[];
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  selectedStatus: string;
  statusOptions: SelectOption[];
  onStatusChange: (value: string) => void;
  onToday: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onExport?: () => void;
};

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function CalendarToolbar({
  visibleMonth,
  monthOptions,
  selectedMonth,
  onMonthChange,
  selectedStatus,
  statusOptions,
  onStatusChange,
  onToday,
  onPreviousMonth,
  onNextMonth,
  onExport,
}: CalendarToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="grid gap-3 sm:grid-cols-2 xl:flex">
          <SearchableSelect
            value={selectedMonth}
            onValueChange={onMonthChange}
            options={monthOptions}
            placeholder="Month"
            searchPlaceholder="Search month..."
            noOptionsText="No month found"
            className="w-full min-w-[160px] shadow-none focus:ring-0"
          />

          <SearchableSelect
            value={selectedStatus}
            onValueChange={onStatusChange}
            options={statusOptions}
            placeholder="Status"
            searchPlaceholder="Search status..."
            noOptionsText="No status found"
            className="w-full min-w-[140px] shadow-none focus:ring-0"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onToday}
            className="h-10 px-4 text-xs font-semibold"
          >
            Today
          </Button>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
            <button
              type="button"
              onClick={onPreviousMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[116px] text-center text-sm font-semibold text-secondary">
              {formatMonthYear(visibleMonth)}
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {onExport && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={onExport}
            className="h-10 px-4 text-xs font-semibold"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </div>
    </div>
  );
}
