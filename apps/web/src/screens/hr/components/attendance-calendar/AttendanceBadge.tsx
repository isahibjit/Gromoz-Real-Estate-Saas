import { cn } from "ui";
import type { AttendanceStatus } from "./types";

const toneMap: Record<string, { container: string; dot: string; text: string }> = {
  present: {
    container: "border-green-200 bg-green-50",
    dot: "bg-green-500",
    text: "text-green-700",
  },
  absent: {
    container: "border-red-200 bg-red-50",
    dot: "bg-red-500",
    text: "text-red-700",
  },
  holiday: {
    container: "border-blue-200 bg-blue-50",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  leave: {
    container: "border-violet-200 bg-violet-50",
    dot: "bg-violet-500",
    text: "text-violet-700",
  },
  late: {
    container: "border-amber-200 bg-amber-50",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  "half day": {
    container: "border-orange-200 bg-orange-50",
    dot: "bg-orange-500",
    text: "text-orange-700",
  },
  "not checked in": {
    container: "border-slate-200 bg-slate-50",
    dot: "bg-slate-400",
    text: "text-slate-700",
  },
};

type AttendanceBadgeProps = {
  status: AttendanceStatus | string;
  className?: string;
};

const formatLabel = (status: string) =>
  status
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function AttendanceBadge({ status, className }: AttendanceBadgeProps) {
  if (status === "unmarked") return null;

  const tone = toneMap[status] || {
    container: "border-slate-200 bg-slate-50",
    dot: "bg-slate-400",
    text: "text-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        tone.container,
        tone.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} />
      <span className="truncate">{formatLabel(status)}</span>
    </span>
  );
}
