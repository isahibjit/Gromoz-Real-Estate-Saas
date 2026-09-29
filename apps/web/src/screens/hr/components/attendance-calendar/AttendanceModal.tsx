import { Clock3, PencilLine, UserCheck, UserMinus, UserRound } from "lucide-react";
import { Button, Dialog, DialogContent } from "ui";

import { AttendanceBadge } from "./AttendanceBadge";
import type { AttendanceCalendarDay } from "./types";

type AttendanceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  day: AttendanceCalendarDay | null;
  employeeName: string;
  employeeAvatar?: string | null;
  onMarkPresent?: (day: AttendanceCalendarDay) => void;
  onMarkAbsent?: (day: AttendanceCalendarDay) => void;
  onAddLeave?: (day: AttendanceCalendarDay) => void;
  onEditEntry?: (day: AttendanceCalendarDay) => void;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-secondary">{value}</p>
    </div>
  );
}

function formatDate(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function formatWeekday(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-IN", { weekday: "long" });
}

export function AttendanceModal({
  open,
  onOpenChange,
  day,
  employeeName,
  employeeAvatar,
  onMarkPresent,
  onMarkAbsent,
  onAddLeave,
  onEditEntry,
}: AttendanceModalProps) {
  const actions = day
    ? [
        onMarkPresent && { label: "Mark Present", icon: UserCheck, onClick: () => onMarkPresent(day) },
        onMarkAbsent && { label: "Mark Absent", icon: UserMinus, onClick: () => onMarkAbsent(day) },
        onAddLeave && { label: "Add Leave", icon: Clock3, onClick: () => onAddLeave(day) },
        onEditEntry && { label: "Edit Entry", icon: PencilLine, onClick: () => onEditEntry(day) },
      ].filter(Boolean) as { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }[]
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[82vh] w-[min(92vw,860px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-lg sm:max-w-[860px]">
        {day && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-4">
                  {employeeAvatar ? (
                    <img src={employeeAvatar} alt={employeeName} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200 text-secondary">
                      <UserRound className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-secondary">
                      {formatDate(day.date)}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {employeeName} — {formatWeekday(day.date)}
                    </p>
                  </div>
                </div>

                <AttendanceBadge status={day.status} className="self-start" />
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoRow
                  label="Attendance status"
                  value={day.status === "unmarked" ? "No entry" : day.status.charAt(0).toUpperCase() + day.status.slice(1)}
                />
                <InfoRow
                  label="Punch in"
                  value={
                    day.loggedInAt
                      ? new Date(day.loggedInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "Not available"
                  }
                />
                <InfoRow
                  label="Punch out"
                  value={
                    day.checkOutAt
                      ? new Date(day.checkOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                      : "Not available"
                  }
                />
                <InfoRow label="Source" value={day.source ? day.source.charAt(0).toUpperCase() + day.source.slice(1) : "System"} />
                <InfoRow label="Shift" value={day.shift?.name || "Not assigned"} />
                <InfoRow
                  label="Late"
                  value={day.lateMinutes ? `${day.lateMinutes} minutes` : "On time"}
                />
                <InfoRow label="Notes" value={day.derivedStatusReason || day.notes || day.holidayDetails?.description || day.leaveDetails?.reason || "No notes available"} />
              </div>

              {day.checkInImageUrl || day.checkOutImageUrl ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {day.checkInImageUrl ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <h4 className="text-sm font-semibold text-secondary">
                        Punch-in selfie
                      </h4>
                      <img
                        src={day.checkInImageUrl}
                        alt="Punch-in selfie"
                        className="mt-4 max-h-[320px] w-full rounded-xl object-contain"
                      />
                    </div>
                  ) : null}
                  {day.checkOutImageUrl ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-5">
                      <h4 className="text-sm font-semibold text-secondary">
                        Punch-out selfie
                      </h4>
                      <img
                        src={day.checkOutImageUrl}
                        alt="Punch-out selfie"
                        className="mt-4 max-h-[320px] w-full rounded-xl object-contain"
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {day.leaveDetails && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h4 className="text-sm font-semibold text-secondary">Leave details</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <InfoRow label="Leave type" value={day.leaveDetails.type} />
                    <InfoRow label="Approved by" value={day.leaveDetails.approvedBy?.name || "Not available"} />
                    <InfoRow
                      label="Approved on"
                      value={day.leaveDetails.approvedAt ? formatDate(day.leaveDetails.approvedAt) : "Not available"}
                    />
                  </div>
                </div>
              )}

              {day.holidayDetails && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h4 className="text-sm font-semibold text-secondary">Holiday details</h4>
                  <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <InfoRow label="Holiday" value={day.holidayDetails.name} />
                    <InfoRow label="Type" value={day.holidayDetails.type} />
                    <InfoRow label="Session" value={day.holidayDetails.isHalfDay ? "Half day" : "Full day"} />
                    {day.holidayDetails.description && (
                      <InfoRow label="Description" value={day.holidayDetails.description} />
                    )}
                  </div>
                </div>
              )}
            </div>

            {actions.length > 0 && (
              <div className="flex shrink-0 flex-wrap gap-3 border-t border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant="outline"
                      type="button"
                      onClick={action.onClick}
                      className="h-10 px-4 text-xs font-semibold shadow-none"
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
