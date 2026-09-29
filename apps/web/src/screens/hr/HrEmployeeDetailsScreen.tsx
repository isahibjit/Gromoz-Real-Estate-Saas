import { useEffect, useMemo, useRef, useState } from "react";
import { getUserRoleLabel } from "../../common/roleLabels";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  Loader2,
  IndianRupee,
  List,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  ShieldCheck,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  SearchableSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui";

import { canAccess } from "../../common/access/access";
import { useAppSelector } from "../../store";
import { useDashboardLayoutContext } from "../admin/dashboard/DashboardLayoutContext";
import { sidebarItems } from "../admin/dashboard/dashboardData";
import { telecallerSidebarItems } from "../telecaller/dashboard/telecallerDashboardData";
import { fieldExecutiveSidebarItems } from "../field-executive/fieldExecutiveData";
import { hrKeys, useHrQuery } from "./useHrWorkspace";
import { AttendanceCalendar } from "./components/attendance-calendar/AttendanceCalendar";
import { AttendanceBadge } from "./components/attendance-calendar/AttendanceBadge";
import type {
  AttendanceCalendarDay,
  SelectOption,
} from "./components/attendance-calendar/types";

// --- Helpers ---

const dateLabel = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";
const money = (value?: string | number | null) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
const roleLabel = getUserRoleLabel;
const formatShiftLabel = (shift?: {
  name?: string | null;
  startTimeMinutes?: number | null;
  endTimeMinutes?: number | null;
} | null, fallbackName?: string | null) => {
  const name = shift?.name ?? fallbackName;
  if (!name) return "-";
  if (
    shift?.startTimeMinutes === undefined ||
    shift?.startTimeMinutes === null ||
    shift?.endTimeMinutes === undefined ||
    shift?.endTimeMinutes === null
  ) {
    return name;
  }

  const formatTime = (minutes: number) =>
    new Date(2026, 0, 1, Math.floor(minutes / 60), minutes % 60).toLocaleTimeString(
      "en-IN",
      { hour: "2-digit", minute: "2-digit" },
    );

  return `${name} (${formatTime(shift.startTimeMinutes)} - ${formatTime(shift.endTimeMinutes)})`;
};
const initials = (name?: string | null) =>
  (name ?? "Employee")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

const dashboardPathForRole = (role?: string | null) => {
  if (role === "SALES_AGENT") return "/field-executive/dashboard";
  if (role === "TELECALLER") return "/telecaller/dashboard";
  return "/dashboard";
};

const formatDatePill = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : dateLabel(new Date().toISOString());

const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: new Date(2026, index, 1).toLocaleDateString("en-IN", {
    month: "long",
  }),
}));

const yearOptions = Array.from({ length: 4 }, (_, index) =>
  String(currentYear - 1 + index),
);

const attendanceStatusOptions: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "present", label: "Present" },
  { value: "not checked in", label: "Not checked in" },
  { value: "half day", label: "Half day" },
  { value: "absent", label: "Absent" },
  { value: "holiday", label: "Holiday" },
  { value: "leave", label: "Leave" },
  { value: "late", label: "Late" },
];

// --- Calendar Grid Builder ---

function buildCalendarGrid(
  month: number,
  year: number,
  records: any[],
  holidays: any[] = [],
): AttendanceCalendarDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();

  const recordMap = new Map<string, any>();
  for (const record of records) {
    const dateKey =
      record.attendanceDate?.slice(0, 10) ?? record.date?.slice(0, 10);
    if (dateKey) recordMap.set(dateKey, record);
  }

  const days: AttendanceCalendarDay[] = [];

  // Padding for previous month
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = new Date(year, month - 2, prevMonthDays - i);
    days.push({
      date: d.toISOString().slice(0, 10),
      dayLabel: d.toLocaleDateString("en-IN", {
        day: "2-digit",
        weekday: "short",
      }),
      dayNum: d.getDate(),
      isCurrentMonth: false,
      status: "unmarked",
      source: null,
      loggedInAt: null,
    });
  }

  // Current month
  for (let index = 0; index < daysInMonth; index++) {
    const date = new Date(year, month - 1, index + 1);
    const isoDate = date.toISOString().slice(0, 10);
    const existing = recordMap.get(isoDate);
    const holiday = holidays.find((h: any) => {
      const hDate = h.holidayDate ?? h.date;
      return hDate?.startsWith(isoDate);
    });

    let status = existing?.status?.toLowerCase() || "unmarked";
    if (status === "present" && existing?.isLate) {
      status = "late";
    }
    if (status === "unmarked" && holiday) {
      status = "holiday";
    }

    days.push({
      id: existing?.id,
      date: isoDate,
      dayLabel: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        weekday: "short",
      }),
      dayNum: date.getDate(),
      isCurrentMonth: true,
      status,
      source: existing?.source || null,
      loggedInAt: existing?.checkInAt || existing?.loggedInAt || null,
      checkInImageUrl: existing?.checkInImageUrl || null,
      checkInImageCapturedAt: existing?.checkInImageCapturedAt || null,
      checkOutImageUrl: existing?.checkOutImageUrl || null,
      checkOutImageCapturedAt: existing?.checkOutImageCapturedAt || null,
      checkInLocationAddress: existing?.checkInLocationAddress || null,
      checkInLatitude: existing?.checkInLatitude ?? null,
      checkInLongitude: existing?.checkInLongitude ?? null,
      checkOutAt: existing?.checkOutAt || null,
      lateMinutes: existing?.lateMinutes ?? null,
      derivedStatusReason: existing?.derivedStatusReason ?? existing?.note ?? null,
      shift: existing?.shift ?? null,
      notes: existing?.note || existing?.notes || null,
      leaveDetails: existing?.leaveDetails || null,
      holidayDetails:
        existing?.holidayDetails ||
        (holiday
          ? {
              id: holiday.id,
              name: holiday.name,
              type: holiday.type,
              description: holiday.description,
              isHalfDay: holiday.isHalfDay ?? false,
            }
          : null),
    });
  }

  // Padding for next month
  const remainingDays = days.length % 7 === 0 ? 0 : 7 - (days.length % 7);
  for (let i = 1; i <= remainingDays; i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d.toISOString().slice(0, 10),
      dayLabel: d.toLocaleDateString("en-IN", {
        day: "2-digit",
        weekday: "short",
      }),
      dayNum: d.getDate(),
      isCurrentMonth: false,
      status: "unmarked",
      source: null,
      loggedInAt: null,
    });
  }

  return days;
}

// --- Main Component ---

type ListResponse<T> = { data: T[]; meta?: { total: number } };

export function HrEmployeeDetailsScreen() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const layout = useDashboardLayoutContext();
  const setSidebar = layout?.setSidebar;
  const setHeader = layout?.setHeader;
  const canViewEmployeeDirectory =
    canAccess(user, "employees") && canAccess(user, "page.employee_directory");
  const resolvedEmployeeId = employeeId ?? user?.id;
  const isSelfProfile = !employeeId;

  // State
  const [activeSection, setActiveSection] = useState<"attendance" | "payroll">(
    "attendance",
  );
  const [attendanceView, setAttendanceView] = useState<"calendar" | "list">(
    "calendar",
  );
  const [attendanceMonth, setAttendanceMonth] = useState(String(currentMonth));
  const [attendanceYear, setAttendanceYear] = useState(String(currentYear));
  const [selectedDate, setSelectedDate] = useState<string | null>(
    currentDate.toISOString().slice(0, 10),
  );
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [attendanceImagePreview, setAttendanceImagePreview] = useState<{
    title: string;
    url: string;
  } | null>(null);
  const lastAttendanceImagePreview = useRef<{
    title: string;
    url: string;
  } | null>(null);

  if (attendanceImagePreview) {
    lastAttendanceImagePreview.current = attendanceImagePreview;
  }
  const activeImagePreview =
    attendanceImagePreview || lastAttendanceImagePreview.current;
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const [payrollYearFilter, setPayrollYearFilter] = useState(
    String(currentYear),
  );
  const [payrollMonthFilter, setPayrollMonthFilter] = useState("all");
  // Queries
  const employee = useHrQuery<any>(
    ["hr", "employee", resolvedEmployeeId],
    `/employees/${resolvedEmployeeId}`,
    undefined,
  );
  const attendance = useHrQuery<ListResponse<any>>(
    ["hr", "employee-attendance", employeeId, attendanceMonth, attendanceYear],
    "/attendance",
    {
      month: Number(attendanceMonth),
      year: Number(attendanceYear),
      employeeId: resolvedEmployeeId,
    },
  );
  const holidays = useHrQuery<ListResponse<any>>(
    ["hr", "holidays", attendanceYear],
    "/holidays",
    { year: Number(attendanceYear) },
  );
  const attendanceToday = useHrQuery<any>(
    hrKeys.attendanceToday,
    "/attendance/today",
    undefined,
  );
  const payroll = useHrQuery<ListResponse<any>>(
    ["hr", "employee-payroll", employeeId],
    "/payroll",
    { employeeId: resolvedEmployeeId },
  );

  const emp = employee.data;
  const attendanceRows = useMemo(
    () => attendance.data?.data ?? [],
    [attendance.data?.data],
  );
  const holidayRows = useMemo(
    () => holidays.data?.data ?? [],
    [holidays.data?.data],
  );
  const payrollRows = useMemo(
    () => payroll.data?.data ?? [],
    [payroll.data?.data],
  );

  // Sidebar
  useEffect(() => {
    if (!setSidebar || !setHeader) return;
    const baseItems = canViewEmployeeDirectory
      ? sidebarItems
      : user?.role === "SALES_AGENT"
      ? fieldExecutiveSidebarItems
      : telecallerSidebarItems;
    const nextSidebar = {
      activeItem: canViewEmployeeDirectory ? "Employees" : "My Employment",
      activeChild: canViewEmployeeDirectory ? "Directory" : "My Profile",
      sidebarItems: baseItems,
    };
    const nextHeader = {
      breadcrumbs: (
        <span className="inline-flex items-center gap-1">
          {canViewEmployeeDirectory ? (
            <Button
              type="button"
              variant="ghost"
              className="h-auto p-0 text-xs font-semibold text-muted-foreground hover:bg-transparent hover:text-secondary"
              onClick={() => navigate("/admin/employees")}
            >
              Employees
            </Button>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground">
              My Employment
            </span>
          )}
          {" / "}
          <span className="text-secondary font-semibold">
            {isSelfProfile ? "My Profile" : emp?.fullName ?? "Employee"}
          </span>
        </span>
      ),
    };
    setSidebar(nextSidebar);
    setHeader(nextHeader);
    return () => {
      setSidebar((current) => (current === nextSidebar ? {} : current));
      setHeader((current) => (current === nextHeader ? {} : current));
    };
  }, [
    canViewEmployeeDirectory,
    isSelfProfile,
    user?.role,
    emp?.fullName,
    navigate,
    setSidebar,
    setHeader,
  ]);

  // Calendar data
  const attendanceDays = useMemo(
    () =>
      buildCalendarGrid(
        Number(attendanceMonth),
        Number(attendanceYear),
        attendanceRows,
        holidayRows,
      ),
    [attendanceRows, attendanceMonth, attendanceYear, holidayRows],
  );

  const attendanceSummary = useMemo(() => {
    return attendanceDays
      .filter((d) => d.isCurrentMonth)
      .reduce(
        (summary, day) => {
          if (day.status === "present") summary.present += 1;
          if (day.status === "absent") summary.absent += 1;
          if (day.status === "leave") summary.leave += 1;
          if (day.status === "half day") summary.halfDay += 1;
          return summary;
        },
        { present: 0, absent: 0, leave: 0, halfDay: 0 },
      );
  }, [attendanceDays]);

  const attendancePercent = useMemo(() => {
    const currentMonthDays = attendanceDays.filter((d) => d.isCurrentMonth);
    const countedDays = currentMonthDays.filter(
      (day) => day.status !== "holiday",
    ).length;
    if (!countedDays) return 0;
    return Math.round((attendanceSummary.present / countedDays) * 100);
  }, [attendanceDays, attendanceSummary.present]);

  const previewDay = useMemo(() => {
    if (!previewDate) return null;
    return attendanceDays.find((day) => day.date === previewDate) ?? null;
  }, [attendanceDays, previewDate]);

  const visibleMonth = useMemo(
    () => new Date(Number(attendanceYear), Number(attendanceMonth) - 1, 1),
    [attendanceMonth, attendanceYear],
  );

  const filteredPayroll = useMemo(() => {
    return payrollRows.filter((row: any) => {
      if (
        payrollMonthFilter !== "all" &&
        String(row.month) !== payrollMonthFilter
      )
        return false;
      if (payrollYearFilter !== "all" && String(row.year) !== payrollYearFilter)
        return false;
      return true;
    });
  }, [payrollRows, payrollMonthFilter, payrollYearFilter]);

  const filteredAttendanceDays = useMemo(
    () =>
      attendanceDays
        .filter((day) => day.isCurrentMonth)
        .filter(
          (day) =>
            attendanceStatusFilter === "all" ||
            day.status === attendanceStatusFilter,
        ),
    [attendanceDays, attendanceStatusFilter],
  );

  const primaryMeta = [emp?.designation ?? roleLabel(emp?.role), emp?.teamName]
    .filter(Boolean)
    .join(" • ");
  const reportingName = emp?.teamLeaderName ?? "Not assigned";
  const reportingRole = emp?.teamName ? `${emp.teamName} lead` : "Reporting manager";
  const officeLocation = emp?.address ?? emp?.teamName ?? "Location not available";
  const officeLocationSubtext = emp?.address ? "Current work location" : "Mapped from team details";
  const profileCompletion = [
    emp?.fullName,
    emp?.email,
    emp?.phone,
    emp?.employeeCode,
    emp?.designation,
    emp?.joiningDate,
    emp?.teamName,
    emp?.monthlyBasic,
    emp?.justificationMode === "MANUAL"
      ? emp?.justificationAmount
      : emp?.justificationMultiplier,
    emp?.shiftName ?? emp?.shift?.name,
  ].filter(Boolean).length;
  const profileCompletionPercent = Math.round((profileCompletion / 10) * 100);
  const justificationTarget =
    emp?.justificationMode === "MANUAL"
      ? Number(emp?.justificationAmount ?? 0)
      : Number(emp?.monthlyBasic ?? 0) *
        Number(emp?.justificationMultiplier ?? 0);
  const profileSummaryCards = [
    {
      label: "Present",
      value: attendanceSummary.present,
      helper: "Days",
      icon: BadgeCheck,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Absent",
      value: attendanceSummary.absent,
      helper: "Days",
      icon: UserRound,
      tone: "bg-red-50 text-red-500",
    },
    {
      label: "Leave",
      value: attendanceSummary.leave,
      helper: "Days",
      icon: FileText,
      tone: "bg-violet-50 text-violet-600",
    },
    {
      label: "Half Day",
      value: attendanceSummary.halfDay,
      helper: "Days",
      icon: CalendarRange,
      tone: "bg-blue-50 text-blue-600",
    },
  ];
  const infoPairs = [
    {
      label: "Join Date",
      value: dateLabel(emp?.joiningDate),
      icon: CalendarDays,
    },
    {
      label: "Department",
      value: emp?.teamName ?? emp?.department ?? "-",
      icon: BriefcaseBusiness,
    },
    {
      label: "Employment Type",
      value: emp?.employmentStatus ?? "Active",
      icon: Clock3,
    },
    {
      label: "Basic Salary",
      value: emp?.monthlyBasic ? money(emp.monthlyBasic) : "-",
      icon: IndianRupee,
    },
    {
      label: "Justification Target",
      value: justificationTarget ? money(justificationTarget) : "-",
      icon: Target,
    },
    {
      label: "Employee Code",
      value: emp?.employeeCode ?? "Pending",
      icon: BadgeCheck,
    },
    {
      label: "Work Email",
      value: emp?.email ?? "-",
      icon: Mail,
    },
  ];
  const managerHierarchy = emp?.managerHierarchy;
  const managerHierarchyLeaders = managerHierarchy?.teamLeaders ?? [];
  const showManagerHierarchy =
    emp?.role === "MANAGER" || emp?.role === "SALES_MANAGER";

  // Handlers
  const handleAttendanceToday = () => {
    setAttendanceMonth(String(currentMonth));
    setAttendanceYear(String(currentYear));
  };

  const handleAttendanceMonthStep = (direction: "prev" | "next") => {
    const m = Number(attendanceMonth);
    const y = Number(attendanceYear);
    if (direction === "prev") {
      if (m === 1) {
        setAttendanceMonth("12");
        setAttendanceYear(String(y - 1));
      } else setAttendanceMonth(String(m - 1));
    } else {
      if (m === 12) {
        setAttendanceMonth("1");
        setAttendanceYear(String(y + 1));
      } else setAttendanceMonth(String(m + 1));
    }
  };

  const handleAttendanceExport = () => {
    const rows = [
      ["Date", "Status", "Source", "Check in", "Notes"],
      ...attendanceDays
        .filter((day) => day.isCurrentMonth)
        .map((day) => [
          day.date,
          day.status,
          day.source || "system",
          day.loggedInAt
            ? new Date(day.loggedInAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          day.notes ||
            day.holidayDetails?.description ||
            day.leaveDetails?.reason ||
            "",
        ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(emp?.fullName ?? "employee")
      .replace(/\s+/g, "-")
      .toLowerCase()}-attendance-${attendanceMonth}-${attendanceYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (employee.isLoading) {
    return (
      <main className="flex items-center justify-center p-12">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading employee...
        </div>
      </main>
    );
  }

  if (!emp) {
    return (
      <main className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-sm font-semibold text-muted-foreground">
          Employee not found.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigate(
              canViewEmployeeDirectory
                ? "/admin/employees"
                : dashboardPathForRole(user?.role),
            )
          }
        >
          <ArrowLeft className="mr-2 size-4" />{" "}
          {canViewEmployeeDirectory ? "Back to directory" : "Back to dashboard"}
        </Button>
      </main>
    );
  }

  return (
    <main className="space-y-5 bg-slate-50/60 p-4 pb-16 sm:p-6 2xl:px-8">
      {canViewEmployeeDirectory ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/employees")}
          className="h-10 rounded-md border-slate-200 bg-white px-4 shadow-none"
        >
          <ArrowLeft className="mr-2 size-4" /> Back to directory
        </Button>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden rounded-md border border-slate-200/90 bg-white p-6 shadow-none sm:p-7">
          <div className="space-y-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!emp.image}
                  className="group h-24 w-24 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-0 shadow-none disabled:cursor-default disabled:opacity-100 sm:h-28 sm:w-28"
                  onClick={() => emp.image && setImagePreviewOpen(true)}
                >
                  {emp.image ? (
                    <span className="relative block h-full w-full">
                      <img
                        src={emp.image}
                        alt={emp.fullName}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 hidden items-center justify-center bg-slate-900/35 text-white group-hover:flex">
                        <Eye className="size-5" />
                      </span>
                    </span>
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[2rem] font-extrabold text-secondary">
                      {initials(emp.fullName)}
                    </span>
                  )}
                </Button>

                <div className="min-w-0">
                  <Badge className="border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {emp.teamName ?? roleLabel(emp.role)}
                  </Badge>
                  <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.03em] text-secondary">
                    {emp.fullName}
                  </h1>
                  <p className="mt-3 text-base font-medium text-slate-600">
                    {primaryMeta || "Employee profile"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start">
                {isSelfProfile ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-md border-blue-200 px-5 text-sm font-bold text-blue-700 shadow-none hover:border-blue-300 hover:bg-blue-50"
                    onClick={() => navigate("/employee/settings")}
                  >
                    <Pencil className="size-4" />
                    Edit profile
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-md text-slate-500 shadow-none hover:bg-slate-100"
                >
                  <MoreVertical className="size-5" />
                </Button>
              </div>
            </div>

            <div className="border-t border-slate-200/80 pt-7">
              <div className="mb-6 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <UsersRound className="size-5" />
                </span>
                <div>
                  <h2 className="text-[1.45rem] font-extrabold tracking-[-0.02em] text-secondary">
                    Employee information
                  </h2>
                  <p className="text-sm font-medium text-slate-500">
                    Employment profile, structure, and contact details.
                  </p>
                </div>
              </div>

              <div className="grid gap-x-6 gap-y-0 lg:grid-cols-2">
                {infoPairs.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className={`flex items-start gap-4 py-5 ${
                        index < infoPairs.length - 2 ? "border-b border-slate-200/80" : ""
                      }`}
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-600">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-1 text-[1.05rem] font-bold text-secondary">
                          {item.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                <div className="rounded-md border border-slate-200 bg-white p-5 shadow-none">
                  <div className="flex items-center gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-violet-50 text-lg font-extrabold text-violet-600">
                      {initials(reportingName)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500">
                        Reporting to
                      </p>
                      <p className="mt-1 truncate text-[1.15rem] font-bold text-secondary">
                        {reportingName}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {reportingRole}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-5 shadow-none">
                  <div className="flex items-center gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <MapPin className="size-6" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500">
                        Office location
                      </p>
                      <p className="mt-1 text-[1.15rem] font-bold text-secondary">
                        {officeLocation}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {officeLocationSubtext}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {showManagerHierarchy ? (
                <div className="mt-7 rounded-md border border-slate-200 bg-white p-5 shadow-none">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                        <UsersRound className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-lg font-extrabold text-secondary">
                          Reporting hierarchy
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Team leaders and active teams mapped under this manager.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                      <div className="border-r border-slate-200 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase text-slate-500">
                          Leaders
                        </p>
                        <p className="mt-1 text-xl font-extrabold text-secondary">
                          {managerHierarchy?.teamLeaderCount ?? 0}
                        </p>
                      </div>
                      <div className="border-r border-slate-200 px-4 py-3">
                        <p className="text-[11px] font-bold uppercase text-slate-500">
                          Teams
                        </p>
                        <p className="mt-1 text-xl font-extrabold text-secondary">
                          {managerHierarchy?.teamCount ?? 0}
                        </p>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[11px] font-bold uppercase text-slate-500">
                          Members
                        </p>
                        <p className="mt-1 text-xl font-extrabold text-secondary">
                          {managerHierarchy?.memberCount ?? 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {managerHierarchyLeaders.length ? (
                    <div className="mt-5 divide-y divide-slate-100 rounded-md border border-slate-100">
                      {managerHierarchyLeaders.map((leader: any) => (
                        <div
                          key={leader.id}
                          className="grid gap-4 p-4 lg:grid-cols-[minmax(180px,240px)_1fr]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-extrabold text-secondary">
                              {leader.image ? (
                                <img
                                  src={leader.image}
                                  alt={leader.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                initials(leader.name)
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-extrabold text-secondary">
                                {leader.name}
                              </p>
                              <p className="truncate text-xs font-semibold text-slate-500">
                                {leader.email}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            {leader.teams.length ? (
                              leader.teams.map((team: any) => (
                                <div
                                  key={team.id}
                                  className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-extrabold text-secondary">
                                        {team.name}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold text-slate-500">
                                        {team.code ?? "Team code pending"}
                                      </p>
                                    </div>
                                    <Badge className="shrink-0 border border-blue-100 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                      {team.memberCount} members
                                    </Badge>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
                                No active team assigned to this team leader.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                      No team leaders are reporting to this manager yet.
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-7 flex flex-col gap-4 rounded-md border border-blue-100 bg-gradient-to-r from-blue-50/90 to-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-blue-600">
                    <ShieldCheck className="size-7" />
                  </span>
                  <div>
                    <p className="text-lg font-bold text-secondary">
                      Your profile is {profileCompletionPercent}% complete
                    </p>
                    <p className="text-sm font-medium text-slate-500">
                      {profileCompletionPercent >= 100
                        ? "Great job! All your information is up to date."
                        : "Complete the remaining profile fields to keep HR records accurate."}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-md border-blue-200 bg-white px-5 text-sm font-bold text-blue-700 shadow-none hover:bg-blue-50"
                  onClick={() =>
                    navigate(
                      isSelfProfile
                        ? "/employee/settings"
                        : canViewEmployeeDirectory
                        ? "/admin/employees"
                        : dashboardPathForRole(user?.role),
                    )
                  }
                >
                  {isSelfProfile ? "View profile" : "Back to profile"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="rounded-md border border-slate-200/90 bg-white p-6 shadow-none">
          <h2 className="text-[1.8rem] font-extrabold tracking-[-0.03em] text-secondary">
            {visibleMonth.toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}{" "}
            Summary
          </h2>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {profileSummaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-md border border-slate-200 bg-white p-4 shadow-none"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex size-10 items-center justify-center rounded-md ${item.tone}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="text-sm font-medium text-slate-600">
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-4 text-[2.2rem] font-extrabold leading-none text-secondary">
                    {item.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    {item.helper}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[1.05rem] font-medium text-slate-600">
                Attendance %
              </span>
              <span className="text-[1.9rem] font-extrabold leading-none text-secondary">
                {attendancePercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${attendancePercent}%` }}
              />
            </div>
          </div>

          <div className="mt-8 rounded-md border border-slate-200 bg-white p-5 shadow-none">
            <p className="text-[1.2rem] font-extrabold text-secondary">Today</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
              <CalendarDays className="size-4" />
              {formatDatePill(new Date().toISOString())}
            </div>

            <div className="mt-5">
              <AttendanceBadge
                status={
                  attendanceToday.data?.status?.toLowerCase() === "present" &&
                  attendanceToday.data?.isLate
                    ? "late"
                    : (attendanceToday.data?.status?.toLowerCase() ?? "unmarked")
                }
              />
            </div>

            <p className="mt-5 text-base font-bold text-secondary">
              {attendanceToday.data?.shift?.name
                ? `${attendanceToday.data.shift.name} (${attendanceToday.data.shift.scheduleLabel})`
                : formatShiftLabel(
                    emp.shift,
                    emp.shiftName ?? (isSelfProfile ? attendanceToday.data?.shift?.name : null),
                  )}
            </p>

            {attendanceToday.data?.blockedReason ? (
              <p className="mt-3 text-sm font-semibold text-amber-700">
                {attendanceToday.data.blockedReason}
              </p>
            ) : null}
            {attendanceToday.data?.lateMinutes ? (
              <p className="mt-3 text-sm font-semibold text-amber-700">
                Late by {attendanceToday.data.lateMinutes} minutes
              </p>
            ) : null}
            {attendanceToday.data?.checkInImageUrl ||
            attendanceToday.data?.checkOutImageUrl ? (
              <div className="mt-4 flex gap-3">
                {attendanceToday.data?.checkInImageUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAttendanceImagePreview({
                        title: "Today's punch-in selfie",
                        url: attendanceToday.data.checkInImageUrl,
                      })
                    }
                  >
                    <img
                      src={attendanceToday.data.checkInImageUrl}
                      alt="Today's punch-in selfie"
                      className="h-24 w-24 rounded-md object-cover"
                    />
                  </button>
                ) : null}
                {attendanceToday.data?.checkOutImageUrl ? (
                  <button
                    type="button"
                    onClick={() =>
                      setAttendanceImagePreview({
                        title: "Today's punch-out selfie",
                        url: attendanceToday.data.checkOutImageUrl,
                      })
                    }
                  >
                    <img
                      src={attendanceToday.data.checkOutImageUrl}
                      alt="Today's punch-out selfie"
                      className="h-24 w-24 rounded-md object-cover"
                    />
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-4 text-base font-medium leading-relaxed text-slate-700">
              Punch in and punch out to track your attendance.
            </div>
          </div>
        </Card>
      </section>

      <nav className="flex items-center gap-6 border-b border-slate-200">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveSection("attendance")}
          className={`relative h-12 rounded-none px-0 text-sm font-bold hover:bg-transparent ${
            activeSection === "attendance"
              ? "text-secondary"
              : "text-muted-foreground hover:text-secondary"
          }`}
        >
          <CalendarDays className="size-4" />
          Attendance
          {activeSection === "attendance" ? (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
          ) : null}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setActiveSection("payroll")}
          className={`relative h-12 rounded-none px-0 text-sm font-bold hover:bg-transparent ${
            activeSection === "payroll"
              ? "text-secondary"
              : "text-muted-foreground hover:text-secondary"
          }`}
        >
          <FileText className="size-4" />
          Payroll History
          {activeSection === "payroll" ? (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
          ) : null}
        </Button>
      </nav>

      {/* Attendance section */}
      {activeSection === "attendance" && (
        <Card className="rounded-md border border-slate-200 bg-white p-6 shadow-none">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-secondary">
                Attendance
              </h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Monthly attendance records for {emp.fullName}.
              </p>
            </div>
            <div className="flex gap-1 rounded-md border border-slate-200 bg-slate-50 p-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAttendanceView("calendar")}
                className={`h-10 rounded-md px-4 text-sm font-semibold shadow-none hover:bg-white ${
                  attendanceView === "calendar"
                    ? "bg-white text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                <CalendarDays className="size-4" />
                Calendar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAttendanceView("list")}
                className={`h-10 rounded-md px-4 text-sm font-semibold shadow-none hover:bg-white ${
                  attendanceView === "list"
                    ? "bg-white text-secondary"
                    : "text-muted-foreground"
                }`}
              >
                <List className="size-4" />
                List
              </Button>
            </div>
          </div>

          <div className="mt-6">
            {attendanceView === "calendar" ? (
              <AttendanceCalendar
                visibleMonth={visibleMonth}
                monthOptions={monthOptions}
                selectedMonth={attendanceMonth}
                onMonthChange={setAttendanceMonth}
                selectedStatus={attendanceStatusFilter}
                statusOptions={attendanceStatusOptions}
                onStatusChange={setAttendanceStatusFilter}
                onToday={handleAttendanceToday}
                onPreviousMonth={() => handleAttendanceMonthStep("prev")}
                onNextMonth={() => handleAttendanceMonthStep("next")}
                onExport={handleAttendanceExport}
                days={attendanceDays}
                selectedDate={selectedDate}
                onSelectDate={(day) => {
                  setSelectedDate(day.date);
                  setPreviewDate(day.date);
                }}
                modalDay={previewDay}
                modalOpen={!!previewDay}
                onModalOpenChange={(open) => !open && setPreviewDate(null)}
                employeeName={emp.fullName}
                employeeAvatar={emp.image || null}
              />
            ) : (
              <Card className="overflow-hidden rounded-xl border border-slate-200 shadow-none">
                <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <SearchableSelect
                      value={attendanceMonth}
                      onValueChange={setAttendanceMonth}
                      options={monthOptions}
                      placeholder="Month"
                      searchPlaceholder="Search month..."
                      className="h-10 w-full rounded-lg bg-white shadow-none sm:w-[150px]"
                    />
                    <SearchableSelect
                      value={attendanceStatusFilter}
                      onValueChange={setAttendanceStatusFilter}
                      options={attendanceStatusOptions}
                      placeholder="Status"
                      searchPlaceholder="Search status..."
                      className="h-10 w-full rounded-lg bg-white shadow-none sm:w-[160px]"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-lg bg-white shadow-none"
                      onClick={handleAttendanceToday}
                    >
                      Today
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg bg-white shadow-none"
                      onClick={() => handleAttendanceMonthStep("prev")}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-lg bg-white shadow-none"
                      onClick={() => handleAttendanceMonthStep("next")}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-lg bg-white shadow-none"
                      onClick={handleAttendanceExport}
                    >
                      <Download className="size-4" />
                      Export
                    </Button>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {[
                        "Date",
                        "Status",
                        "Source",
                        "Punches",
                        "Location",
                        "Selfie",
                        "Shift",
                        "Note",
                      ].map((heading) => (
                        <TableHead key={heading}>{heading}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendanceDays.length ? (
                      filteredAttendanceDays.map((day) => (
                        <TableRow key={day.date}>
                          <TableCell>
                            {dateLabel(day.date)}
                          </TableCell>
                          <TableCell>
                            <AttendanceBadge
                              status={day.status ?? "unmarked"}
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {day.source ?? "system"}
                          </TableCell>
                          <TableCell>
                            {day.loggedInAt
                              ? `${new Date(day.loggedInAt).toLocaleTimeString(
                                  "en-IN",
                                  { hour: "2-digit", minute: "2-digit" },
                                )} - ${
                                  day.checkOutAt
                                    ? new Date(day.checkOutAt).toLocaleTimeString(
                                        "en-IN",
                                        { hour: "2-digit", minute: "2-digit" },
                                      )
                                    : "--"
                                }`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-secondary">
                            {day.checkInLocationAddress ? (
                              day.checkInLatitude && day.checkInLongitude ? (
                                <a
                                  href={`https://maps.google.com/?q=${day.checkInLatitude},${day.checkInLongitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                                >
                                  <MapPin className="size-3 shrink-0" />
                                  {day.checkInLocationAddress}
                                </a>
                              ) : (
                                day.checkInLocationAddress
                              )
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {day.checkInImageUrl || day.checkOutImageUrl ? (
                              <div className="flex flex-wrap gap-2">
                                {day.checkInImageUrl ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shadow-none"
                                    onClick={() =>
                                      setAttendanceImagePreview({
                                        title: `${dateLabel(day.date)} punch-in selfie`,
                                        url: day.checkInImageUrl!,
                                      })
                                    }
                                  >
                                    <Eye className="mr-2 size-4" />
                                    In
                                  </Button>
                                ) : null}
                                {day.checkOutImageUrl ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shadow-none"
                                    onClick={() =>
                                      setAttendanceImagePreview({
                                        title: `${dateLabel(day.date)} punch-out selfie`,
                                        url: day.checkOutImageUrl!,
                                      })
                                    }
                                  >
                                    <Eye className="mr-2 size-4" />
                                    Out
                                  </Button>
                                ) : null}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{day.shift?.name ?? "-"}</TableCell>
                          <TableCell>
                            {day.derivedStatusReason ||
                              day.notes ||
                              day.holidayDetails?.description ||
                              day.leaveDetails?.reason ||
                              (day.status === "not checked in"
                                ? "No punch recorded"
                                : "-")}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground">
                            {attendance.isLoading
                              ? "Loading attendance records..."
                              : "No attendance records found for this month."}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </Card>
      )}

      {/* Payroll section */}
      {activeSection === "payroll" && (
        <Card className="rounded-md border border-slate-200 p-6 shadow-card">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-secondary">
                Payroll History
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Historical payroll records and salary disbursements.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <SearchableSelect
                value={payrollYearFilter}
                onValueChange={setPayrollYearFilter}
                options={[
                  { value: "all", label: "All years" },
                  ...yearOptions.map((year) => ({ value: year, label: year })),
                ]}
                placeholder="Year"
                searchPlaceholder="Search year..."
                className="w-full shadow-none focus:ring-0 sm:w-[120px]"
              />
              <SearchableSelect
                value={payrollMonthFilter}
                onValueChange={setPayrollMonthFilter}
                options={[
                  { value: "all", label: "All months" },
                  ...monthOptions,
                ]}
                placeholder="Month"
                searchPlaceholder="Search month..."
                className="w-full shadow-none focus:ring-0 sm:w-[140px]"
              />
            </div>
          </div>

          <div className="mt-6">
            <Card className="overflow-hidden rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      "Period",
                      "Payable / divisor",
                      "Gross pay",
                      "Net pay",
                      "Status",
                      "",
                    ].map((heading) => (
                      <TableHead key={heading}>{heading}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayroll.length ? (
                    filteredPayroll.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-semibold text-secondary">
                          {new Date(
                            record.year,
                            record.month - 1,
                          ).toLocaleString("en-IN", {
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          {String(record.payableDays ?? "-")} /{" "}
                          {String(
                            record.salaryDivisorDays ??
                              record.payableDays ??
                              "-",
                          )}
                        </TableCell>
                        <TableCell>{money(record.grossPay)}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          {money(record.netPay)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`border-0 ${
                              record.status === "Paid"
                                ? "bg-green-50 text-green-700"
                                : record.status === "Finalized"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (record.payslip?.fileUrl) {
                                window.open(record.payslip.fileUrl, "_blank");
                              } else {
                                const printable = JSON.stringify(
                                  record.payslip?.snapshot ?? record.snapshot ?? record,
                                  null,
                                  2,
                                );
                                const popup = window.open("", "_blank");
                                if (popup) {
                                  popup.document.write(`<pre>${printable}</pre>`);
                                  popup.print();
                                }
                              }
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-14 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 mb-3">
                            <FileText className="size-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-bold text-muted-foreground">
                            No payroll records found
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            No records match the selected filters.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </Card>
      )}

      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-slate-100 px-5 py-4">
            <DialogTitle className="text-base font-extrabold text-secondary">
              {emp.fullName}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5">
            {emp.image ? (
              <img
                src={emp.image}
                alt={emp.fullName}
                className="max-h-[70vh] w-full rounded-xl object-contain"
              />
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-xl bg-slate-50 text-3xl font-extrabold text-secondary">
                {initials(emp.fullName)}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(attendanceImagePreview)}
        onOpenChange={(open) => !open && setAttendanceImagePreview(null)}
      >
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white p-0 shadow-xl">
          <DialogHeader className="border-b border-slate-100 px-5 py-4">
            <DialogTitle className="text-base font-extrabold text-secondary">
              {activeImagePreview?.title ?? "Attendance selfie"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5">
            {activeImagePreview?.url ? (
              <img
                src={activeImagePreview.url}
                alt={activeImagePreview.title}
                className="max-h-[70vh] w-full rounded-xl object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
