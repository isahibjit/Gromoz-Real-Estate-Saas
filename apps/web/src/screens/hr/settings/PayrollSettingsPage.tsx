import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";
import {
  Card,
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  SearchableSelect,
  Checkbox,
} from "ui";
import { cn } from "ui";
import type { UserRole } from "@truroot/shared/auth";
import { api } from "../../../common/api";
import { useAppSelector } from "../../../store";
import { PayrollSettingsModal } from "../payroll/PayrollSettingsModal";
import { MailTemplateManager } from "./MailTemplateManager";
import { ClockTimePicker } from "../../admin/leads/assignment/ClockTimePicker";
import {
  Coins,
  MessageSquare,
  Mail,
  ShieldCheck,
  CalendarRange,
  Scale,
  Award,
  RefreshCw,
  Info,
  Key,
  FileText,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  X,
  Shield,
  ShieldAlert,
  Activity,
  User,
  Clock,
  Laptop,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
} from "lucide-react";
// Local Sub-Modal Components

// 1. IncentiveSettingsModal
interface IncentiveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface IncentivePolicySettings {
  minimumDealsToQualify: number;
  salesIncentivePct: number;
  preSalesIncentivePct: number;
  teamLeaderIncentivePct: number;
}

interface IncentiveVisibilitySetting {
  roleScope: "SALES" | "PRE_SALES" | "TEAM_LEADER";
  visibilityScope: "OWN" | "OWN_AND_TEAM" | "ALL";
  canEdit: boolean;
}

interface TwoFactorRoleSetting {
  role: UserRole;
  enabled: boolean;
}

const twoFactorManagedRoles: UserRole[] = [
  "ADMIN",
  "HR",
  "SALES_MANAGER",
  "TEAM_LEADER",
  "MANAGER",
  "TELECALLER",
  "SALES_AGENT",
  "MARKETING",
  "BACKEND",
];

const twoFactorRoleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  HR: "HR",
  SALES_MANAGER: "Sales Manager",
  TEAM_LEADER: "Team Leader",
  MANAGER: "Manager",
  TELECALLER: "Pre Sales Executive",
  SALES_AGENT: "Sales Executive",
  MARKETING: "Marketing",
  BACKEND: "Back-End Executive",
};

const defaultIncentivePolicy: IncentivePolicySettings = {
  minimumDealsToQualify: 3,
  salesIncentivePct: 2.5,
  preSalesIncentivePct: 1,
  teamLeaderIncentivePct: 0.5,
};

const defaultIncentiveVisibility: IncentiveVisibilitySetting[] = [
  { roleScope: "SALES", visibilityScope: "OWN", canEdit: false },
  { roleScope: "PRE_SALES", visibilityScope: "OWN", canEdit: false },
  {
    roleScope: "TEAM_LEADER",
    visibilityScope: "OWN_AND_TEAM",
    canEdit: false,
  },
];

const incentiveRoleLabels: Record<IncentiveVisibilitySetting["roleScope"], string> = {
  SALES: "Sales",
  PRE_SALES: "Pre-sales",
  TEAM_LEADER: "Team leader",
};

const visibilityLabels: Record<IncentiveVisibilitySetting["visibilityScope"], string> = {
  OWN: "Own incentive only",
  OWN_AND_TEAM: "Own plus team incentives",
  ALL: "All incentives",
};

const numberSetting = (value: unknown, fallback: number) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

type ShiftTemplate = {
  id: string;
  name: string;
  startTimeMinutes: number;
  endTimeMinutes: number;
  workingDays: number[];
  lateGraceMinutes: number;
  lateThresholdCount: number;
  latePenaltyStatus: string;
  isActive: boolean;
};

type ShiftSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const timeInputValue = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60,
  ).padStart(2, "0")}`;
const timeToMinutes = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  }
  let hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM") {
    hour += 12;
  }
  return hour * 60 + minute;
};
const shiftTimeOptions = [
  "07:00 AM",
  "07:30 AM",
  "08:00 AM",
  "08:30 AM",
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "01:00 PM",
  "01:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
  "07:00 PM",
  "07:30 PM",
  "08:00 PM",
  "08:30 PM",
  "09:00 PM",
];

const DEFAULT_SHIFT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const shiftWeekDays = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
];

const formatWorkingDays = (days?: number[]) => {
  const selectedDays = days?.length ? days : DEFAULT_SHIFT_WORKING_DAYS;
  return shiftWeekDays
    .filter((day) => selectedDays.includes(day.value))
    .map((day) => day.label)
    .join(", ");
};

const ShiftSettingsModal: React.FC<ShiftSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [editingShift, setEditingShift] = useState<ShiftTemplate | null>(null);
  const [form, setForm] = useState({
    name: "",
    startTime: "09:30",
    endTime: "18:30",
    lateGraceMinutes: 15,
    lateThresholdCount: 3,
    latePenaltyStatus: "Half Day",
    workingDays: DEFAULT_SHIFT_WORKING_DAYS,
    isActive: true,
  });

  const shifts = useQuery<{ data: ShiftTemplate[] }>({
    queryKey: ["hr", "shifts", "settings"],
    queryFn: async () =>
      (await api.get<{ data: ShiftTemplate[] }>("/shifts", {
        params: { includeInactive: true },
      })).data,
    enabled: isOpen,
  });

  const saveShift = useMutation({
    mutationFn: async (payload: typeof form) => {
      const body = {
        name: payload.name,
        startTimeMinutes: timeToMinutes(payload.startTime),
        endTimeMinutes: timeToMinutes(payload.endTime),
        lateGraceMinutes: Number(payload.lateGraceMinutes),
        lateThresholdCount: Number(payload.lateThresholdCount),
        latePenaltyStatus: payload.latePenaltyStatus,
        workingDays: payload.workingDays,
        isActive: payload.isActive,
      };
      if (editingShift) {
        return api.patch(`/shifts/${editingShift.id}`, body);
      }
      return api.post("/shifts", body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hr", "shifts"] });
      toast.success(editingShift ? "Shift updated." : "Shift created.");
      setEditingShift(null);
      setForm({
        name: "",
        startTime: "09:30",
        endTime: "18:30",
        lateGraceMinutes: 15,
        lateThresholdCount: 3,
        latePenaltyStatus: "Half Day",
        workingDays: DEFAULT_SHIFT_WORKING_DAYS,
        isActive: true,
      });
    },
    onError: (error: any) =>
      toast.error(error.response?.data?.message ?? "Unable to save shift."),
  });

  useEffect(() => {
    if (!isOpen) {
      setEditingShift(null);
      setForm({
        name: "",
        startTime: "09:30",
        endTime: "18:30",
        lateGraceMinutes: 15,
        lateThresholdCount: 3,
        latePenaltyStatus: "Half Day",
        workingDays: DEFAULT_SHIFT_WORKING_DAYS,
        isActive: true,
      });
    }
  }, [isOpen]);

  const startEdit = (shift: ShiftTemplate) => {
    setEditingShift(shift);
    setForm({
      name: shift.name,
      startTime: timeInputValue(shift.startTimeMinutes),
      endTime: timeInputValue(shift.endTimeMinutes),
      lateGraceMinutes: shift.lateGraceMinutes,
      lateThresholdCount: shift.lateThresholdCount,
      latePenaltyStatus: shift.latePenaltyStatus,
      workingDays: shift.workingDays?.length
        ? shift.workingDays
        : DEFAULT_SHIFT_WORKING_DAYS,
      isActive: shift.isActive,
    });
  };

  const previewStart = timeInputValue(timeToMinutes(form.startTime));
  const previewEnd = timeInputValue(timeToMinutes(form.endTime));
  const previewPenalty =
    form.latePenaltyStatus === "Half Day"
      ? "mark as half day"
      : form.latePenaltyStatus === "Absent"
      ? "mark as absent"
      : "keep as present";
  const resetForm = () => {
    setEditingShift(null);
    setForm({
      name: "",
      startTime: "09:30",
      endTime: "18:30",
      lateGraceMinutes: 15,
      lateThresholdCount: 3,
      latePenaltyStatus: "Half Day",
      workingDays: DEFAULT_SHIFT_WORKING_DAYS,
      isActive: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[980px] border-none bg-transparent p-0 shadow-none">
        <div className="flex max-h-[86vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Shift Management
                  </DialogTitle>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    HR Ops
                  </span>
                </div>
                <DialogDescription className="mt-1 max-w-[680px] text-xs font-medium leading-relaxed text-slate-500">
                  Shifts define working days, punch timing, grace, and late penalties for every employee assignment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto bg-white p-4 lg:grid-cols-[340px_minmax(0,1fr)]">
            <Card className="flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-secondary">
                      {editingShift ? "Edit shift" : "Create shift"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Define working days, timing window, and late arrival rules.
                    </p>
                  </div>
                  {editingShift ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Editing
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                <div className="rounded-md border border-blue-100 bg-blue-50/60 p-3">
                  <div className="flex items-start gap-3">
                    <Activity className="mt-0.5 size-4 text-blue-700" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">
                        Live Rule Preview
                      </p>
                      <p className="text-xs font-bold text-slate-800">
                        {form.name.trim() || "Unnamed shift"} • {previewStart} to {previewEnd}
                      </p>
                      <p className="text-[11px] font-medium leading-relaxed text-slate-600">
                        Allow {form.lateGraceMinutes} minutes grace after start time. On the{" "}
                        {form.lateThresholdCount}
                        {form.lateThresholdCount === 1 ? "st" : form.lateThresholdCount === 2 ? "nd" : form.lateThresholdCount === 3 ? "rd" : "th"}{" "}
                        late punch in a month, {previewPenalty}.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Shift Name
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="General shift"
                    className="h-10 rounded-md border-slate-200 font-semibold shadow-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      Start Time
                    </label>
                    <ClockTimePicker
                      value={form.startTime}
                      options={shiftTimeOptions}
                      onChange={(e) =>
                        setForm({ ...form, startTime: e })
                      }
                      widthClassName="h-10 w-full rounded-md border-slate-200 font-semibold shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      End Time
                    </label>
                    <ClockTimePicker
                      value={form.endTime}
                      options={shiftTimeOptions}
                      onChange={(e) => setForm({ ...form, endTime: e })}
                      widthClassName="h-10 w-full rounded-md border-slate-200 font-semibold shadow-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Working days
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {shiftWeekDays.map((day) => {
                      const isSelected = form.workingDays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          aria-pressed={isSelected}
                          className={cn(
                            "h-9 rounded-md border text-[10px] font-black transition-colors",
                            isSelected
                              ? "border-primary bg-primary text-white"
                              : "border-slate-200 bg-white text-slate-500 hover:border-primary/40 hover:text-primary",
                          )}
                          onClick={() =>
                            setForm((current) => {
                              const nextDays = isSelected
                                ? current.workingDays.filter(
                                    (value) => value !== day.value,
                                  )
                                : [...current.workingDays, day.value];
                              return {
                                ...current,
                                workingDays: nextDays.length
                                  ? nextDays.sort((a, b) => a - b)
                                  : current.workingDays,
                              };
                            })
                          }
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] font-medium text-slate-500">
                    Selected days define weekly offs for attendance and payroll.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      Grace Minutes
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.lateGraceMinutes}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lateGraceMinutes: Number(e.target.value || 0),
                        })
                      }
                      placeholder="15"
                      className="h-10 rounded-md border-slate-200 font-semibold shadow-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                      Late Threshold
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={form.lateThresholdCount}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          lateThresholdCount: Number(e.target.value || 1),
                        })
                      }
                      placeholder="3"
                      className="h-10 rounded-md border-slate-200 font-semibold shadow-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    Late Penalty
                  </label>
                  <SearchableSelect
                    value={form.latePenaltyStatus}
                    onValueChange={(value) =>
                      setForm({ ...form, latePenaltyStatus: value })
                    }
                    options={[
                      { value: "Half Day", label: "Half day" },
                      { value: "Absent", label: "Absent" },
                      { value: "Present", label: "Present only" },
                    ]}
                    placeholder="Select penalty"
                    searchPlaceholder="Search penalty..."
                    noOptionsText="No penalty found"
                    className="h-10 rounded-md border-slate-200 font-semibold shadow-none"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-semibold text-secondary">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span>Shift is active and available for employee assignment</span>
                </label>

                <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-slate-100 bg-white px-4 pb-1 pt-3">
                  <Button
                    type="button"
                    className="h-10 flex-1 rounded-md px-4 text-sm font-bold"
                    disabled={saveShift.isPending || !form.name.trim()}
                    onClick={() => saveShift.mutate(form)}
                  >
                    {saveShift.isPending
                      ? "Saving..."
                      : editingShift
                      ? "Update Shift"
                      : "Create Shift"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md px-4 text-sm font-bold shadow-none"
                    onClick={resetForm}
                  >
                    {editingShift ? "Cancel Edit" : "Reset"}
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="flex min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
              <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-secondary">
                      Existing shifts
                    </p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Review timing rules and open a shift for editing.
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {(shifts.data?.data ?? []).length} configured
                  </span>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {shifts.isLoading ? (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 rounded-md border border-dashed border-slate-200 bg-slate-50/50">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm font-semibold text-slate-500">
                      Loading shifts...
                    </p>
                  </div>
                ) : (shifts.data?.data ?? []).length ? (
                  <div className="space-y-3">
                    {(shifts.data?.data ?? []).map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => startEdit(shift)}
                        className={cn(
                          "w-full rounded-md border px-4 py-3 text-left transition-all",
                          editingShift?.id === shift.id
                            ? "border-primary/40 bg-primary/5"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-secondary">
                                {shift.name}
                              </p>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest",
                                  shift.isActive
                                    ? "bg-green-50 text-green-700"
                                    : "bg-slate-100 text-slate-500",
                                )}
                              >
                                {shift.isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-700">
                              {timeInputValue(shift.startTimeMinutes)} to{" "}
                              {timeInputValue(shift.endTimeMinutes)}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Working days: {formatWorkingDays(shift.workingDays)}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                Grace {shift.lateGraceMinutes} mins
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                {shift.lateThresholdCount} lates threshold
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                                Penalty: {shift.latePenaltyStatus}
                              </span>
                            </div>
                          </div>
                          <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-none">
                            Edit
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                      <CalendarRange className="size-5" />
                    </div>
                    <p className="mt-4 text-base font-bold text-secondary">
                      No shifts configured yet
                    </p>
                    <p className="mt-2 max-w-[320px] text-sm font-medium leading-relaxed text-slate-500">
                      Create your first reusable shift to assign attendance timing, grace windows, and late penalties to employees.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-700" />
              <p className="text-[11px] font-medium leading-relaxed text-amber-900">
                Shift working days now control weekly offs for punch attendance and payroll. Public holidays still override the assigned shift calendar.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const IncentiveSettingsModal: React.FC<IncentiveSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [policy, setPolicy] =
    useState<IncentivePolicySettings>(defaultIncentivePolicy);
  const [visibilityRows, setVisibilityRows] = useState<
    IncentiveVisibilitySetting[]
  >(defaultIncentiveVisibility);

  const policyQuery = useQuery({
    queryKey: ["payroll", "settings", "incentives"],
    queryFn: async () => (await api.get("/payroll/settings")).data,
    enabled: isOpen,
  });

  const visibilityQuery = useQuery<IncentiveVisibilitySetting[]>({
    queryKey: ["bookings", "incentive-visibility"],
    queryFn: async () =>
      (await api.get<IncentiveVisibilitySetting[]>("/bookings/incentive-visibility"))
        .data,
    enabled: isOpen,
  });

  useEffect(() => {
    if (policyQuery.data) {
      setPolicy({
        minimumDealsToQualify: numberSetting(
          policyQuery.data.minimumDealsToQualify,
          defaultIncentivePolicy.minimumDealsToQualify,
        ),
        salesIncentivePct: numberSetting(
          policyQuery.data.salesIncentivePct,
          defaultIncentivePolicy.salesIncentivePct,
        ),
        preSalesIncentivePct: numberSetting(
          policyQuery.data.preSalesIncentivePct,
          defaultIncentivePolicy.preSalesIncentivePct,
        ),
        teamLeaderIncentivePct: numberSetting(
          policyQuery.data.teamLeaderIncentivePct,
          defaultIncentivePolicy.teamLeaderIncentivePct,
        ),
      });
    }
  }, [policyQuery.data]);

  useEffect(() => {
    if (visibilityQuery.data?.length) {
      setVisibilityRows(
        defaultIncentiveVisibility.map((defaultRow) => {
          const matchedRow = visibilityQuery.data?.find(
            (row) => row.roleScope === defaultRow.roleScope,
          );
          return matchedRow
            ? {
                roleScope: matchedRow.roleScope,
                visibilityScope:
                  matchedRow.visibilityScope ?? defaultRow.visibilityScope,
                canEdit: Boolean(matchedRow.canEdit),
              }
            : defaultRow;
        }),
      );
    }
  }, [visibilityQuery.data]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      await Promise.all([
        api.patch("/payroll/settings", policy),
        api.patch("/bookings/incentive-visibility", {
          settings: visibilityRows,
        }),
      ]);
    },
    onSuccess: () => {
      toast.success("Incentive policy updated.");
      void queryClient.invalidateQueries({ queryKey: ["payroll"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        (error as AxiosError<{ message?: string }>)?.response?.data?.message ??
        "Unable to update incentive policy.";
      toast.error(message);
    },
  });

  const isLoading = policyQuery.isLoading || visibilityQuery.isLoading;
  const isSubmitting = saveSettings.isPending;
  const updateVisibilityRow = (
    roleScope: IncentiveVisibilitySetting["roleScope"],
    updater: Partial<IncentiveVisibilitySetting>,
  ) => {
    setVisibilityRows((current) =>
      current.map((row) =>
        row.roleScope === roleScope ? { ...row, ...updater } : row,
      ),
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[980px] border-none bg-transparent p-0 shadow-none">
        <div className="flex max-h-[88vh] flex-col overflow-hidden rounded-md border border-slate-200 bg-white">
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
            <div className="flex items-start gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600">
                <Award className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle className="text-lg font-bold text-slate-900">
                    Global incentive defaults
                  </DialogTitle>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    Fallback policy
                  </span>
                </div>
                <DialogDescription className="mt-1 max-w-[720px] text-xs font-medium leading-relaxed text-slate-500">
                  Set the default qualification threshold, fallback incentive
                  percentages, and role-wise visibility. Each project can still
                  define its own brokerage and incentive master from Project
                  Details.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-bold text-slate-500">
                  Loading global incentive defaults...
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    {
                      label: "Sales default",
                      value: `${policy.salesIncentivePct}%`,
                      helper: "Used only without a project rule.",
                    },
                    {
                      label: "Pre-sales default",
                      value: `${policy.preSalesIncentivePct}%`,
                      helper: "Fallback for Pre Sales incentive.",
                    },
                    {
                      label: "Team leader default",
                      value: `${policy.teamLeaderIncentivePct}%`,
                      helper: "Fallback when a team leader is mapped.",
                    },
                  ].map((item) => (
                    <Card
                      key={item.label}
                      className="rounded-md border border-slate-200 bg-slate-50/70 p-4 shadow-none"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-500">
                            {item.label}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {item.helper}
                          </p>
                        </div>
                        <p className="shrink-0 text-2xl font-extrabold text-secondary">
                          {item.value}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-5 lg:grid-cols-5">
                  <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-none lg:col-span-3">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-secondary">
                          Fallback qualification and percentages
                        </h3>
                        <p className="mt-1 max-w-xl text-xs font-medium leading-relaxed text-slate-500">
                          These values apply only when the selected project has
                          no configured brokerage and incentive master.
                        </p>
                      </div>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                        Global fallback
                      </span>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-extrabold text-secondary">
                          Minimum deals to qualify
                        </span>
                        <Input
                          type="number"
                          min="0"
                          value={policy.minimumDealsToQualify}
                          onChange={(e) =>
                            setPolicy((current) => ({
                              ...current,
                              minimumDealsToQualify: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            }))
                          }
                          placeholder="e.g. 3"
                          className="h-11 rounded-md text-sm font-bold shadow-none"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-extrabold text-secondary">
                          Sales incentive percentage
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={policy.salesIncentivePct}
                          onChange={(e) =>
                            setPolicy((current) => ({
                              ...current,
                              salesIncentivePct: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            }))
                          }
                          placeholder="e.g. 2.5"
                          className="h-11 rounded-md text-sm font-bold shadow-none"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-extrabold text-secondary">
                          Pre-sales incentive percentage
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={policy.preSalesIncentivePct}
                          onChange={(e) =>
                            setPolicy((current) => ({
                              ...current,
                              preSalesIncentivePct: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            }))
                          }
                          placeholder="e.g. 1"
                          className="h-11 rounded-md text-sm font-bold shadow-none"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-extrabold text-secondary">
                          Team leader incentive percentage
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          value={policy.teamLeaderIncentivePct}
                          onChange={(e) =>
                            setPolicy((current) => ({
                              ...current,
                              teamLeaderIncentivePct: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            }))
                          }
                          placeholder="e.g. 0.5"
                          className="h-11 rounded-md text-sm font-bold shadow-none"
                        />
                      </label>
                    </div>
                  </Card>

                  <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-none lg:col-span-2">
                    <div className="mb-5">
                      <h3 className="text-sm font-bold text-secondary">
                        Role-wise visibility
                      </h3>
                      <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                        Decide who can view incentive data and whether that
                        role can edit visible incentive rows.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {visibilityRows.map((row) => (
                        <div
                          key={row.roleScope}
                          className="rounded-md border border-slate-200 bg-slate-50/70 p-3"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-extrabold text-secondary">
                                {incentiveRoleLabels[row.roleScope]}
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {visibilityLabels[row.visibilityScope]}
                              </p>
                            </div>
                            <label className="flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-secondary">
                              <Checkbox
                                checked={row.canEdit}
                                className="gap-0"
                                onChange={(event) =>
                                  updateVisibilityRow(row.roleScope, {
                                    canEdit: event.target.checked,
                                  })
                                }
                              />
                              Can edit
                            </label>
                          </div>

                          <SearchableSelect
                            value={row.visibilityScope}
                            onValueChange={(value) =>
                              updateVisibilityRow(row.roleScope, {
                                visibilityScope:
                                  value as IncentiveVisibilitySetting["visibilityScope"],
                              })
                            }
                            options={[
                              { value: "OWN", label: "Own incentive only" },
                              {
                                value: "OWN_AND_TEAM",
                                label: "Own plus team incentives",
                              },
                              { value: "ALL", label: "All incentives" },
                            ]}
                            placeholder="Select visibility"
                            searchPlaceholder="Search visibility..."
                            noOptionsText="No visibility option found"
                            className="h-10 rounded-md border-slate-200 bg-white text-sm font-semibold shadow-none"
                          />
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="rounded-md border border-blue-100 bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 size-4 shrink-0 text-blue-700" />
                    <div className="space-y-1 text-xs font-medium leading-relaxed text-blue-900">
                      <p>
                        Project Details remains the source of truth for each
                        project's brokerage and incentive percentages.
                      </p>
                      <p>
                        These defaults are used only as fallback percentages
                        and visibility access across the CRM.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 rounded-md px-5 shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveSettings.mutate()}
              disabled={isSubmitting}
              className="h-10 rounded-md px-5"
            >
              {isSubmitting ? "Saving..." : "Save defaults"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// 2. ChangePasswordModal
interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: me } = useQuery<any>({
    queryKey: ["hr", "me"],
    queryFn: async () => (await api.get<any>("/employees/me")).data,
    enabled: isOpen,
  });

  const handleSave = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (!me?.id) {
      toast.error("User profile not loaded yet.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch(`/employees/${me.id}`, { password: newPassword });
      toast.success("Password updated successfully.");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message ?? "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-md p-6 bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="size-5 text-slate-500" />
            <DialogTitle>Update Password</DialogTitle>
          </div>
          <DialogDescription>
            Change your system login credentials. Make sure it has at least 8 characters.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-extrabold text-secondary">New Password</span>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new secure password"
                className="h-10 text-sm font-bold shadow-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-extrabold text-secondary">Confirm Password</span>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="h-10 text-sm font-bold shadow-none"
            />
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// 3. AuditLogsModal
interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockLogs = [
  { time: "Just now", action: "SETTINGS_UPDATED", actor: "Admin User", ip: "192.168.1.48", status: "Success" },
  { time: "10 mins ago", action: "PAYROLL_RUN_INITIATED", actor: "Admin User", ip: "192.168.1.48", status: "Success" },
  { time: "2 hours ago", action: "LEAVE_APPROVED", actor: "HR Manager", ip: "192.168.1.12", status: "Success" },
  { time: "Yesterday", action: "EMPLOYEE_CREATED", actor: "HR Manager", ip: "192.168.1.12", status: "Success" },
  { time: "Yesterday", action: "LOGIN_SUCCESS", actor: "Sales Lead", ip: "103.58.20.14", status: "Success" },
];

const AuditLogsModal: React.FC<AuditLogsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-md p-6 bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="size-5 text-slate-500" />
            <DialogTitle>Audit Logs</DialogTitle>
          </div>
          <DialogDescription>
            System security log. Monitors all configuration modifications and access events.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 overflow-x-auto rounded-md border border-slate-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 font-extrabold text-secondary">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Event Action</th>
                <th className="p-3">User</th>
                <th className="p-3">IP Address</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
              {mockLogs.map((log, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="p-3 whitespace-nowrap text-slate-500">{log.time}</td>
                  <td className="p-3 font-bold text-slate-800">{log.action}</td>
                  <td className="p-3">{log.actor}</td>
                  <td className="p-3 text-slate-500 font-mono">{log.ip}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main PayrollSettingsPage component (serves as the settings wrapper screen)
export const PayrollSettingsPage: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);
  const queryClient = useQueryClient();
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "HR"].includes(
    user?.role ?? "",
  );

  const [activeTab, setActiveTab] = useState<"payroll" | "whatsapp" | "mail" | "system">(
    isAdmin ? "payroll" : "system"
  );
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  
  // Modal states
  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
  const [isIncentiveModalOpen, setIsIncentiveModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isAuditLogsModalOpen, setIsAuditLogsModalOpen] = useState(false);

  // Security settings states
  const [sessionTimeout, setSessionTimeout] = useState<number>(24);
  const [maxFailedAttempts, setMaxFailedAttempts] = useState<number>(3);
  const [auditEnabled, setAuditEnabled] = useState<boolean>(true);
  const twoFactorSettingsQuery = useQuery({
    queryKey: ["auth", "two-factor-settings"],
    queryFn: async () => {
      const { data } = await api.get<{ data: TwoFactorRoleSetting[] }>(
        "/auth/two-factor-settings",
      );
      return data.data;
    },
    enabled: isAdmin,
  });
  const updateTwoFactorSettingsMutation = useMutation({
    mutationFn: async (roles: TwoFactorRoleSetting[]) => {
      const { data } = await api.patch<{ data: TwoFactorRoleSetting[] }>(
        "/auth/two-factor-settings",
        { roles },
      );
      return data.data;
    },
    onSuccess: (roles) => {
      queryClient.setQueryData(["auth", "two-factor-settings"], roles);
      toast.success("Two-factor role policy updated");
    },
    onError: () => {
      toast.error("Unable to update two-factor policy");
    },
  });

  const securitySettingsQuery = useQuery({
    queryKey: ["auth", "security-settings"],
    queryFn: async () => {
      const { data } = await api.get<{
        maxFailedLoginAttempts?: number;
        data?: { maxFailedLoginAttempts?: number };
      }>("/auth/security-settings");
      return data.data?.maxFailedLoginAttempts ?? data.maxFailedLoginAttempts ?? 3;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (typeof securitySettingsQuery.data === "number") {
      setMaxFailedAttempts(securitySettingsQuery.data);
    }
  }, [securitySettingsQuery.data]);

  const updateSecuritySettingsMutation = useMutation({
    mutationFn: async (maxAttempts: number) => {
      const { data } = await api.patch<{
        success: boolean;
        maxFailedLoginAttempts?: number;
        data?: { maxFailedLoginAttempts?: number };
      }>("/auth/security-settings", { maxFailedLoginAttempts: maxAttempts });
      return data.data?.maxFailedLoginAttempts ?? data.maxFailedLoginAttempts ?? maxAttempts;
    },
    onSuccess: (newVal) => {
      queryClient.setQueryData(["auth", "security-settings"], newVal);
      toast.success(`Account lockout threshold updated to ${newVal} failed attempts`);
    },
    onError: () => {
      toast.error("Unable to update account lockout threshold");
    },
  });

  const handleLockoutThresholdCommit = (val: number) => {
    updateSecuritySettingsMutation.mutate(val);
  };

  // Load security settings from local storage
  useEffect(() => {
    const savedTimeout = localStorage.getItem("security_session_timeout");
    if (savedTimeout) {
      setSessionTimeout(Number(savedTimeout));
    }
    const savedAudit = localStorage.getItem("security_audit_enabled");
    if (savedAudit) {
      setAuditEnabled(savedAudit === "true");
    }
  }, []);

  const handleTimeoutCommit = (val: number) => {
    setSessionTimeout(val);
    localStorage.setItem("security_session_timeout", String(val));
    toast.success(`Session timeout updated to ${val} hours`);
  };

  const handleTwoFactorRoleToggle = (role: UserRole, enabled: boolean) => {
    const currentSettings =
      twoFactorSettingsQuery.data ??
      twoFactorManagedRoles.map((roleKey) => ({
        role: roleKey,
        enabled: false,
      }));
    const settingByRole = new Map(
      currentSettings.map((setting) => [setting.role, setting.enabled]),
    );
    settingByRole.set(role, enabled);
    updateTwoFactorSettingsMutation.mutate(
      twoFactorManagedRoles.map((roleKey) => ({
        role: roleKey,
        enabled: settingByRole.get(roleKey) ?? false,
      })),
    );
  };

  const handleAuditToggle = (val: boolean) => {
    setAuditEnabled(val);
    localStorage.setItem("security_audit_enabled", String(val));
    toast.success(`System audit logging ${val ? "enabled" : "disabled"}`);
  };

  const tabs = [
    ...(isAdmin
      ? [
          { id: "payroll" as const, label: "Payroll & HR", icon: Coins, color: "text-slate-500" },
          { id: "whatsapp" as const, label: "WhatsApp API", icon: MessageSquare, color: "text-green-600" },
          { id: "mail" as const, label: "Email Templates", icon: Mail, color: "text-blue-600" },
        ]
      : []),
    { id: "system" as const, label: "System Access", icon: ShieldCheck, color: "text-indigo-600" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 gap-8 items-start lg:flex lg:gap-8 lg:overflow-hidden">
        {/* Navigation Sidebar */}
        <aside
          className={cn(
            "space-y-2 transition-all duration-300 ease-in-out lg:shrink-0 lg:overflow-hidden",
            isNavCollapsed
              ? "lg:w-0 lg:-translate-x-8 lg:opacity-0 lg:pointer-events-none"
              : "lg:w-[18rem] lg:translate-x-0 lg:opacity-100",
          )}
        >
          <div className="mb-3 flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 shadow-card">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Settings sections
              </p>
              <p className="mt-1 text-base font-bold text-secondary">
                Select a section
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 rounded-md text-slate-500 hover:bg-slate-100"
              onClick={() => setIsNavCollapsed(true)}
            >
              <PanelLeftClose className="size-4" />
            </Button>
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? "primary" : "ghost"}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full !justify-start gap-4 px-6 py-4 rounded-md transition-all duration-300 group border border-transparent shadow-none",
                  isActive
                    ? "bg-primary text-white scale-[1.01]"
                    : "bg-white text-slate-500 hover:bg-primary/5 hover:text-primary hover:border-primary/10 border-slate-100"
                )}
              >
                <Icon className={cn("size-5 transition-colors shrink-0", isActive ? "text-white" : tab.color)} />
                <span className="font-bold text-sm tracking-tight">{tab.label}</span>
              </Button>
            );
          })}
        </aside>

        {/* Content Pane */}
        <section className="min-w-0 flex-1 transition-all duration-300 ease-in-out">
          <Card className="rounded-md border border-slate-200 bg-white p-8 min-h-[500px] shadow-card">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  Current section
                </p>
                <p className="mt-1 text-base font-bold text-secondary">
                  {tabs.find((tab) => tab.id === activeTab)?.label}
                </p>
              </div>
              {isNavCollapsed ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md px-4 text-sm font-bold shadow-none"
                  onClick={() => setIsNavCollapsed(false)}
                >
                  <PanelLeftOpen className="size-4" />
                  Show Sections
                </Button>
              ) : null}
            </div>
            {activeTab === "payroll" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-headline font-bold text-slate-900">Payroll & Incentive Operations</h2>
                    <p className="text-sm text-slate-500 font-medium">Configure attendance math, payroll behavior, and global incentive fallbacks.</p>
                  </div>
                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <Button
                      variant="outline"
                      onClick={() => setIsPayrollModalOpen(true)}
                    >
                      Payroll Settings
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsShiftModalOpen(true)}
                    >
                      Shift Management
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => setIsIncentiveModalOpen(true)}
                    >
                      Global incentive defaults
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-3">
                  <div className="p-6 rounded-lg bg-primary/[0.02] border border-primary/5 space-y-3">
                    <div className="flex items-center gap-3 text-slate-700">
                      <CalendarRange className="size-5" />
                      <h4 className="font-bold text-xs uppercase tracking-widest">Working Days</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Working days are now configured per shift, so each employee can follow their assigned weekly calendar.
                    </p>
                  </div>
                  <div className="p-6 rounded-lg bg-indigo-50/20 border border-indigo-100/50 space-y-3">
                    <div className="flex items-center gap-3 text-indigo-600">
                      <Scale className="size-5" />
                      <h4 className="font-bold text-xs uppercase tracking-widest">Divisor Policy</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Salary per-day rate calculation follows Fixed 30, Calendar Days, or employee shift Working Days.
                    </p>
                  </div>
                  <div className="p-6 rounded-lg bg-emerald-50/40 border border-emerald-100 space-y-3">
                    <div className="flex items-center gap-3 text-emerald-700">
                      <Award className="size-5" />
                      <h4 className="font-bold text-xs uppercase tracking-widest">Incentive Defaults</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Configure fallback incentive percentages and visibility. Project-specific brokerage masters are managed from each project.
                    </p>
                  </div>
                  <div className="p-6 rounded-lg bg-amber-50/30 border border-amber-100 space-y-3">
                    <div className="flex items-center gap-3 text-amber-700">
                      <Clock className="size-5" />
                      <h4 className="font-bold text-xs uppercase tracking-widest">Shift Rules</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Reusable shifts control working days, punch windows, late grace, threshold counts, and half-day penalties per employee.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsShiftModalOpen(true)}
                    >
                      Manage shifts
                    </Button>
                  </div>
                </div>

                <div className="mt-12 p-12 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                  <Coins className="size-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-700">Compensation Automation Summary</h3>
                  <p className="text-xs text-slate-400 max-w-md mt-2 leading-relaxed">
                    Use the settings above to manage attendance calculation rules and incentive policy automation without code changes.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "whatsapp" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <h2 className="text-2xl font-headline font-bold text-green-700">WhatsApp API Integration</h2>
                <div className="bg-green-50/50 p-6 rounded-lg border border-green-100 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                    <RefreshCw className="size-5 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-green-900">API Status: Connected</p>
                    <p className="text-xs text-green-700/60 font-medium font-mono">Using WhatsApp Business API v18.0</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { label: "Template Synchronization", desc: "Auto-sync WhatsApp templates from Meta portal", action: "Sync Now" },
                    { label: "Webhook Endpoint", desc: "https://api.trurootrealty.com/api/v1/whatsapp/webhook", action: "Copy" },
                    { label: "Message Rate Limit", desc: "Currently set to 100 messages/minute", action: "Configure" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-6 rounded-lg bg-slate-50 border border-slate-100">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-500 font-medium mt-1">{item.desc}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.success(`${item.label} action triggered.`)}
                      >
                        {item.action}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "mail" && (
              <div className="animate-in fade-in duration-200">
                <MailTemplateManager />
              </div>
            )}

            {activeTab === "system" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                <h2 className="text-2xl font-headline font-bold text-indigo-700">System Access & Security</h2>
                <div className="space-y-6">
                  {isAdmin && (
                    <>
                      {/* Session Timeout */}
                      <div className="p-6 rounded-lg bg-indigo-50/10 border border-indigo-100/50 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-indigo-900">Session Timeout</h4>
                            <p className="text-xs text-slate-500 mt-1">Adjust how long users stay logged in (1 to 72 hours). Applies to new logins.</p>
                          </div>
                          <span className="text-sm font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md">{sessionTimeout} HOURS</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="72"
                          step="1"
                          value={sessionTimeout}
                          onChange={(e) => setSessionTimeout(Number(e.target.value))}
                          onMouseUp={() => handleTimeoutCommit(sessionTimeout)}
                          onTouchEnd={() => handleTimeoutCommit(sessionTimeout)}
                          className="w-full accent-primary cursor-pointer"
                        />
                      </div>

                      {/* Failed Login Lockout Threshold */}
                      <div className="p-6 rounded-lg bg-amber-50/20 border border-amber-200/60 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <ShieldAlert className="size-4 text-amber-600" />
                              <h4 className="font-bold text-sm text-slate-800">Account Lockout Threshold</h4>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Number of consecutive incorrect password attempts before a user ID is automatically deactivated (3 to 10 attempts).
                            </p>
                          </div>
                          <span className="text-sm font-black text-amber-700 bg-amber-100/80 px-3 py-1 rounded-md border border-amber-200">
                            {securitySettingsQuery.isLoading
                              ? "..."
                              : `${maxFailedAttempts} ATTEMPTS`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="3"
                          max="10"
                          step="1"
                          value={maxFailedAttempts}
                          onChange={(e) => setMaxFailedAttempts(Number(e.target.value))}
                          onMouseUp={() => handleLockoutThresholdCommit(maxFailedAttempts)}
                          onTouchEnd={() => handleLockoutThresholdCommit(maxFailedAttempts)}
                          className="w-full accent-amber-600 cursor-pointer"
                          disabled={updateSecuritySettingsMutation.isPending}
                        />
                        <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                          <span>3 attempts (Default & Strictest)</span>
                          <span>5 attempts (Recommended)</span>
                          <span>10 attempts (Relaxed)</span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-slate-700">
                              Two-factor authentication by role
                            </h4>
                            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                              Enabled roles must enter an SMS OTP after the correct password. Employee-level OTP can still be enabled from employee details.
                            </p>
                          </div>
                          {twoFactorSettingsQuery.isFetching ? (
                            <span className="text-xs font-bold text-slate-500">
                              Loading...
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          {twoFactorManagedRoles.map((role) => {
                            const checked =
                              twoFactorSettingsQuery.data?.find(
                                (setting) => setting.role === role,
                              )?.enabled ?? false;
                            return (
                              <label
                                key={role}
                                className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3"
                              >
                                <span>
                                  <span className="block text-sm font-bold text-secondary">
                                    {twoFactorRoleLabels[role]}
                                  </span>
                                  <span className="text-[11px] font-semibold text-muted-foreground">
                                    {checked ? "OTP required" : "Password only"}
                                  </span>
                                </span>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={
                                    twoFactorSettingsQuery.isLoading ||
                                    updateTwoFactorSettingsMutation.isPending
                                  }
                                  onChange={(event) =>
                                    handleTwoFactorRoleToggle(
                                      role,
                                      event.currentTarget.checked,
                                    )
                                  }
                                  className="h-4 w-4 cursor-pointer rounded border-slate-300 text-primary focus:ring-primary"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Toggles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold text-slate-700 block">Audit Logging</span>
                            <span
                              className="text-xs font-bold text-primary cursor-pointer hover:underline"
                              onClick={() => setIsAuditLogsModalOpen(true)}
                            >
                              View System Logs
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={auditEnabled}
                            onChange={(e) => handleAuditToggle(e.target.checked)}
                            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Change Password Card */}
                  <div className="p-6 rounded-lg bg-slate-50 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-700">Change Password</h4>
                      <p className="text-xs font-medium text-slate-500 mt-1">Update your account password securely.</p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => setIsChangePasswordModalOpen(true)}
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>

      {/* Modals */}
      <PayrollSettingsModal
        isOpen={isPayrollModalOpen}
        onClose={() => setIsPayrollModalOpen(false)}
      />
      <IncentiveSettingsModal
        isOpen={isIncentiveModalOpen}
        onClose={() => setIsIncentiveModalOpen(false)}
      />
      <ShiftSettingsModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
      <AuditLogsModal
        isOpen={isAuditLogsModalOpen}
        onClose={() => setIsAuditLogsModalOpen(false)}
      />
    </div>
  );
};
