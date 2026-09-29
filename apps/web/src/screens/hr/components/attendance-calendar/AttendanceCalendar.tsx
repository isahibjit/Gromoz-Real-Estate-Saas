import { useMemo } from "react";

import { CalendarGrid } from "./CalendarGrid";
import { CalendarToolbar } from "./CalendarToolbar";
import { AttendanceModal } from "./AttendanceModal";
import { AttendanceBadge } from "./AttendanceBadge";
import type { AttendanceCalendarDay, SelectOption } from "./types";

type AttendanceCalendarProps = {
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
  days: AttendanceCalendarDay[];
  selectedDate: string | null;
  onSelectDate: (day: AttendanceCalendarDay) => void;
  modalDay: AttendanceCalendarDay | null;
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
  employeeName: string;
  employeeAvatar?: string | null;
  onMarkPresent?: (day: AttendanceCalendarDay) => void;
  onMarkAbsent?: (day: AttendanceCalendarDay) => void;
  onAddLeave?: (day: AttendanceCalendarDay) => void;
  onEditEntry?: (day: AttendanceCalendarDay) => void;
};

const legendStatuses = ["present", "absent", "holiday", "late", "leave"] as const;

export function AttendanceCalendar({
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
  days,
  selectedDate,
  onSelectDate,
  modalDay,
  modalOpen,
  onModalOpenChange,
  employeeName,
  employeeAvatar,
  onMarkPresent,
  onMarkAbsent,
  onAddLeave,
  onEditEntry,
}: AttendanceCalendarProps) {
  const filteredDays = useMemo(() => {
    return days.map((day) => {
      if (selectedStatus === "all" || day.status === selectedStatus) return day;
      return day.isCurrentMonth ? { ...day, status: "unmarked" as const, loggedInAt: null } : day;
    });
  }, [days, selectedStatus]);

  return (
    <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
      <CalendarToolbar
        visibleMonth={visibleMonth}
        monthOptions={monthOptions}
        selectedMonth={selectedMonth}
        onMonthChange={onMonthChange}
        selectedStatus={selectedStatus}
        statusOptions={statusOptions}
        onStatusChange={onStatusChange}
        onToday={onToday}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onExport={onExport}
      />

      <CalendarGrid
        days={filteredDays}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        {legendStatuses.map((status) => (
          <div key={status} className="flex items-center gap-2">
            <AttendanceBadge status={status} />
          </div>
        ))}
      </div>

      <AttendanceModal
        open={modalOpen}
        onOpenChange={onModalOpenChange}
        day={modalDay}
        employeeName={employeeName}
        employeeAvatar={employeeAvatar}
        onMarkPresent={onMarkPresent}
        onMarkAbsent={onMarkAbsent}
        onAddLeave={onAddLeave}
        onEditEntry={onEditEntry}
      />
    </div>
  );
}

export type { AttendanceCalendarDay, SelectOption } from "./types";
export { AttendanceBadge } from "./AttendanceBadge";
