import { CheckCircle2, Clock3, Landmark, MoonStar, TimerOff } from "lucide-react";
import { cn } from "ui";

import { AttendanceBadge } from "./AttendanceBadge";
import type { AttendanceCalendarDay } from "./types";

type CalendarCellProps = {
  day: AttendanceCalendarDay;
  isSelected: boolean;
  onClick: (day: AttendanceCalendarDay) => void;
};

const statusIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  present: CheckCircle2,
  absent: TimerOff,
  holiday: Landmark,
  leave: MoonStar,
  late: Clock3,
};

function getSecondaryText(day: AttendanceCalendarDay) {
  if (day.holidayDetails?.name) return day.holidayDetails.name;
  if (day.loggedInAt) {
    return new Date(day.loggedInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  if (day.status === "leave") {
    return day.leaveDetails?.isHalfDay ? "Half day leave" : "Approved leave";
  }
  if (day.status === "absent") return "No attendance";
  if (day.status === "unmarked") return "No entry";
  return null;
}

function isToday(dateString: string) {
  const today = new Date();
  const d = new Date(dateString);
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

export function CalendarCell({ day, isSelected, onClick }: CalendarCellProps) {
  const Icon = statusIconMap[day.status];
  const today = isToday(day.date);
  const secondaryText = getSecondaryText(day);

  return (
    <button
      type="button"
      onClick={() => onClick(day)}
      className={cn(
        "group relative flex min-h-[120px] cursor-pointer flex-col justify-between bg-white p-3 text-left transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:ring-inset",
        "hover:bg-slate-50",
        !day.isCurrentMonth && "bg-slate-50/70",
        isSelected && "z-10 ring-2 ring-inset ring-secondary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex min-w-8 items-center justify-center rounded-md px-1.5 py-1 text-sm font-semibold text-secondary",
            !day.isCurrentMonth && "text-slate-400",
            today && "bg-blue-50 text-blue-600",
            isSelected && !today && "bg-slate-100",
          )}
        >
          {day.dayNum}
        </span>

        {Icon && day.status !== "unmarked" ? (
          <span className="rounded-md border border-slate-200 bg-white p-1 text-slate-500">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>

      <div className="space-y-2">
        <AttendanceBadge status={day.status} />
        <div
          className={cn(
            "min-h-[16px] text-[11px] font-medium leading-4 text-muted-foreground",
            !day.isCurrentMonth && "text-slate-400",
          )}
        >
          {secondaryText ? <span className="block truncate">{secondaryText}</span> : <span>&nbsp;</span>}
        </div>
      </div>
    </button>
  );
}
