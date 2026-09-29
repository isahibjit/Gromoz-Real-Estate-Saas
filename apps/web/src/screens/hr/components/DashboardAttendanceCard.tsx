import { useState } from "react";
import toast from "react-hot-toast";
import { Clock3, LogIn, LogOut } from "lucide-react";
import {
  Button,
  Card,
  cn,
} from "ui";

import { AttendanceSelfieCaptureDialog } from "./AttendanceSelfieCaptureDialog";
import { AttendanceBadge } from "./attendance-calendar/AttendanceBadge";
import { hrKeys, useHrMutations, useHrQuery } from "../useHrWorkspace";
import { getApiErrorMessage } from "../../../common/apiError";
import { usePermission } from "../../../common/access/usePermission";

type TodayAttendanceResponse = {
  status?: string | null;
  isLate?: boolean;
  lateMinutes?: number | null;
  canPunchIn?: boolean;
  canPunchOut?: boolean;
  blockedReason?: string | null;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  shift?: {
    name?: string | null;
    scheduleLabel?: string | null;
  } | null;
};

const formatTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--";

const getBadgeStatus = (attendance?: TodayAttendanceResponse) => {
  const status = attendance?.status?.toLowerCase() ?? "not checked in";
  if (status === "present" && attendance?.isLate) return "late";
  if (status === "on leave") return "leave";
  return status;
};

export function DashboardAttendanceCard({ className }: { className?: string }) {
  const [punchInCaptureOpen, setPunchInCaptureOpen] = useState(false);
  const [punchOutCaptureOpen, setPunchOutCaptureOpen] = useState(false);
  const { canPunchIn, canPunchOut } = usePermission("attendance");
  const canUseAttendance = canPunchIn || canPunchOut;
  const attendanceToday = useHrQuery<TodayAttendanceResponse>(
    hrKeys.attendanceToday,
    "/attendance/today",
    undefined,
    { enabled: canUseAttendance },
  );
  const mutations = useHrMutations();
  const attendance = attendanceToday.data;

  if (!canUseAttendance) return null;

  return (
    <Card className={cn("rounded-md border border-slate-200 p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Attendance
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-secondary">
            Today&apos;s punch
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 p-2 text-slate-600">
          <Clock3 className="size-4" strokeWidth={1.5} />
        </span>
      </div>

      {attendanceToday.isLoading ? (
        <div className="mt-5 space-y-3">
          <div className="h-10 animate-pulse rounded-md bg-slate-100" />
          <div className="h-20 animate-pulse rounded-md bg-slate-100" />
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs font-bold text-muted-foreground">
              Current status
            </p>
            <div className="mt-2">
              <AttendanceBadge status={getBadgeStatus(attendance)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Shift
              </p>
              <p className="mt-1 text-sm font-bold text-secondary">
                {attendance?.shift?.name
                  ? `${attendance.shift.name}${attendance.shift.scheduleLabel ? ` (${attendance.shift.scheduleLabel})` : ""}`
                  : "No shift assigned"}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                Punch log
              </p>
              <p className="mt-1 text-sm font-bold text-secondary">
                In {formatTime(attendance?.checkInAt)} · Out{" "}
                {formatTime(attendance?.checkOutAt)}
              </p>
            </div>
          </div>

          {attendance?.blockedReason ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              {attendance.blockedReason}
            </div>
          ) : null}
          {attendance?.lateMinutes ? (
            <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700">
              Late by {attendance.lateMinutes} minutes
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {canPunchIn ? (
              <Button
                type="button"
                disabled={!attendance?.canPunchIn || mutations.punchIn.isPending}
                onClick={() => setPunchInCaptureOpen(true)}
              >
                <LogIn className="size-4" strokeWidth={1.5} />
                {mutations.punchIn.isPending ? "Punching..." : "Punch In"}
              </Button>
            ) : null}
            {canPunchOut ? (
              <Button
                type="button"
                variant="outline"
                disabled={!attendance?.canPunchOut || mutations.punchOut.isPending}
                onClick={() => setPunchOutCaptureOpen(true)}
              >
                <LogOut className="size-4" strokeWidth={1.5} />
                {mutations.punchOut.isPending ? "Punching..." : "Punch Out"}
              </Button>
            ) : null}
          </div>
        </div>
      )}
      <AttendanceSelfieCaptureDialog
        mode="punchIn"
        open={punchInCaptureOpen}
        onOpenChange={setPunchInCaptureOpen}
        isSubmitting={mutations.punchIn.isPending}
        onSuccess={(checkInImageUrl, locationData, note) => {
          mutations.punchIn.mutate(
            { checkInImageUrl, ...locationData, note },
            {
              onSuccess: () => {
                setPunchInCaptureOpen(false);
                toast.success("Punched in");
              },
              onError: (error: unknown) =>
                toast.error(getApiErrorMessage(error, "Unable to punch in")),
            },
          );
        }}
      />
      <AttendanceSelfieCaptureDialog
        mode="punchOut"
        open={punchOutCaptureOpen}
        onOpenChange={setPunchOutCaptureOpen}
        isSubmitting={mutations.punchOut.isPending}
        onSuccess={(checkOutImageUrl) => {
          mutations.punchOut.mutate(
            { checkOutImageUrl },
            {
              onSuccess: () => {
                setPunchOutCaptureOpen(false);
                toast.success("Punched out");
              },
              onError: (error: unknown) =>
                toast.error(getApiErrorMessage(error, "Unable to punch out")),
            },
          );
        }}
      />
    </Card>
  );
}
