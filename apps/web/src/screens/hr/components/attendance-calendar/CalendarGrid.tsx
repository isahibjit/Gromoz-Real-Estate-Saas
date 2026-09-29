import { CalendarCell } from "./CalendarCell";
import type { AttendanceCalendarDay } from "./types";

type CalendarGridProps = {
  days: AttendanceCalendarDay[];
  selectedDate: string | null;
  onSelectDate: (day: AttendanceCalendarDay) => void;
};

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarGrid({ days, selectedDate, onSelectDate }: CalendarGridProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70">
        {weekdays.map((weekday) => (
          <div
            key={weekday}
            className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {weekday}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {days.map((day, index) => (
          <CalendarCell
            key={`${day.date}-${index}`}
            day={day}
            isSelected={selectedDate === day.date}
            onClick={onSelectDate}
          />
        ))}
      </div>
    </div>
  );
}
