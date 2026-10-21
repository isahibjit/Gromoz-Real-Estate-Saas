import { getApiErrorMessage } from '../../common/apiError';
import { AddSeatsDialog } from '../billing/AddSeatsDialog';
import { isAxiosError } from 'axios';
import { presentRecordDetails } from "../../common/displayReference";
import { useEffect, useMemo, useRef, useState } from "react";
import { getUserRoleLabel } from "../../common/roleLabels";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Landmark,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserRound,
  UserX,
  UsersRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ConfirmDeleteDialog,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  TablePageSizeOptions,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "ui";
import { WorkspacePage } from "../../components/layout/PageHeader";

function TablePagination({
  total,
  label = "records",
  currentPage,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: {
  total: number;
  label?: string;
  currentPage?: number;
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
}) {
  const isControlled = Boolean(currentPage && rowsPerPage);
  const activePage = currentPage ?? 1;
  const activeRowsPerPage = rowsPerPage ?? total;
  const totalPages = Math.max(1, Math.ceil(total / Math.max(activeRowsPerPage, 1)));
  const rangeStart = total === 0 ? 0 : (activePage - 1) * activeRowsPerPage + 1;
  const rangeEnd =
    total === 0 ? 0 : Math.min(total, activePage * activeRowsPerPage);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between bg-white">
      <p className="text-xs font-semibold text-secondary">
        Showing {isControlled ? rangeStart : 1} to{" "}
        {isControlled ? rangeEnd : total} of {total} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-8 w-8 rounded-md p-0 shadow-none"
          disabled={!onPageChange || activePage <= 1}
          onClick={() => onPageChange?.(Math.max(1, activePage - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="navy"
          className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
        >
          {activePage}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-8 w-8 rounded-md p-0 shadow-none"
          disabled={!onPageChange || activePage >= totalPages}
          onClick={() =>
            onPageChange?.(Math.min(totalPages, activePage + 1))
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Select
        value={String(rowsPerPage ?? 10)}
        onValueChange={(value) => onRowsPerPageChange?.(Number(value))}
        disabled={!onRowsPerPageChange}
      >
        <SelectTrigger
          aria-label="Rows per page"
          className="h-8 w-[100px] rounded-md text-xs font-bold shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <TablePageSizeOptions />
        </SelectContent>
      </Select>
    </div>
  );
}

import { api } from "../../common/api";
import { canAccess } from "../../common/access/access";
import {
  getActiveNavigation,
  getNavigationForUser,
} from "../../common/navigation/navigationRegistry";
import { useAppSelector } from "../../store";
import { useDashboardLayoutContext } from "../admin/dashboard/DashboardLayoutContext";
import { hrKeys, useHrMutations, useHrQuery } from "./useHrWorkspace";
import { EmployeeModal, type Employee } from "./components/EmployeeModal";
import { HrEmployeeIdentityCell } from "./components/HrEmployeeIdentityCell";
import { HrStatCard } from "./components/HrStatCard";
import { HrTeamsScreen } from "./HrTeamsScreen";
import { HrPayrollPanel } from "./payroll/HrPayrollPanel";
import { HolidaysPage } from "./holidays/HolidaysPage";
import { PayrollSettingsPage } from "./settings/PayrollSettingsPage";
import { PersonalSettingsPage } from "./settings/PersonalSettingsPage";

type Workspace =
  | "employees"
  | "teams"
  | "attendance"
  | "holidays"
  | "leaves"
  | "payroll"
  | "payslips"
  | "settings"
  | "personal-settings"
  | "me";
type ListResponse<T> = { data: T[]; meta?: { total: number } };

// const dateValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";
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
const hrRoleFilterOptions = [
  { value: "all", label: "All roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "TEAM_LEADER", label: "Team Leader" },
  { value: "TELECALLER", label: "Pre Sales Executive" },
  { value: "FIELD_EXECUTIVE", label: "Sales Executive" },
  { value: "BACKEND", label: "Back-End Executive" },
  { value: "HR", label: "HR" },
];
const attendanceStatusOptions = [
  { value: "all", label: "All statuses" },
  { value: "Present", label: "Present" },
  { value: "Late Present", label: "Late present" },
  { value: "Not Checked In", label: "Not Checked In" },
  { value: "Half Day", label: "Half Day" },
  { value: "Absent", label: "Absent" },
  { value: "On Leave", label: "On Leave" },
  { value: "Holiday", label: "Holiday" },
  { value: "Manual Correction", label: "Manual Correction" },
];
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
function StatusBadge({ value }: { value?: string | null }) {
  const normalized = value?.toLowerCase() ?? "";
  const tone =
    normalized.includes("approved") ||
    normalized.includes("present") ||
    normalized.includes("paid") ||
    normalized.includes("active")
      ? "bg-green-50 text-success"
      : normalized.includes("pending") || normalized.includes("draft")
      ? "bg-amber-50 text-amber-700"
      : normalized.includes("reject") ||
        normalized.includes("inactive") ||
        normalized.includes("absent")
      ? "bg-red-50 text-red-600"
      : "bg-blue-50 text-blue-700";
  return <Badge className={`border-0 ${tone}`}>{value ?? "-"}</Badge>;
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-extrabold text-secondary">{title}</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </section>
  );
}

function EmptyState({
  label,
  icon: Icon,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const IconComponent = Icon ?? FileText;
  return (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 mb-3">
        <IconComponent className="size-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-bold text-muted-foreground">
        No {label.toLowerCase()} found
      </p>
    </div>
  );
}

function LeaveDialog({
  open,
  onOpenChange,
  onSave,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, unknown>) => void;
  pending: boolean;
}) {
  const [form, setForm] = useState({
    leaveType: "Casual Leave",
    startDate: "",
    endDate: "",
    reason: "",
    note: "",
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-md">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>
            Leave days exclude configured holidays. Pending requests can be
            cancelled before review.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold">Leave type</span>
            <SearchableSelect
              value={form.leaveType}
              onValueChange={(leaveType) => setForm({ ...form, leaveType })}
              options={[
                "Casual Leave",
                "Sick Leave",
                "Earned Leave",
                "Unpaid Leave",
              ].map((value) => ({ value, label: value }))}
              placeholder="Select leave type"
              searchPlaceholder="Search leave type..."
              noOptionsText="No leave type found"
              modal={false}
              portaled={false}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">Start date</span>
            <DatePicker
              value={form.startDate}
              onChange={(event) =>
                setForm({ ...form, startDate: event.target.value })
              }
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-bold">End date</span>
            <DatePicker
              value={form.endDate}
              onChange={(event) =>
                setForm({ ...form, endDate: event.target.value })
              }
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold">Reason</span>
            <Textarea
              value={form.reason}
              onChange={(event) =>
                setForm({ ...form, reason: event.target.value })
              }
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-bold">Supporting note</span>
            <Input
              value={form.note}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
            />
          </label>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !form.reason || !form.startDate || !form.endDate || pending
            }
            onClick={() => onSave(form)}
          >
            {pending ? "Submitting..." : "Submit request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function HrWorkspaceScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const layout = useDashboardLayoutContext();
  const setSidebar = layout?.setSidebar;
  const setHeader = layout?.setHeader;
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "HR", "SALES_MANAGER"].includes(
    user?.role ?? "",
  );
  const canViewEmployeeDirectory =
    canAccess(user, "employees") && canAccess(user, "page.employee_directory");
  const canCreateEmployees = canAccess(user, "employees", "create");
  const canUpdateEmployees = canAccess(user, "employees", "update");
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const workspace = useMemo<Workspace>(() => {
    if (location.pathname.endsWith("/employees")) return "employees";
    if (location.pathname.endsWith("/teams")) return "teams";
    if (location.pathname.endsWith("/attendance")) return "attendance";
    if (location.pathname.endsWith("/holidays")) return "holidays";
    if (location.pathname.endsWith("/leaves")) return "leaves";
    if (location.pathname.endsWith("/payroll")) return "payroll";
    if (location.pathname.endsWith("/payslips")) return "payslips";
    if (location.pathname.endsWith("/settings")) {
      return isAdmin ? "settings" : "personal-settings";
    }
    return "me";
  }, [location.pathname, isAdmin]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [employeeDialog, setEmployeeDialog] = useState(false);
  const [seatUpgradeOpen, setSeatUpgradeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payslipSearch, setPayslipSearch] = useState("");
  const [payslipTeamFilter, setPayslipTeamFilter] = useState("all");
  const [payslipRoleFilter, setPayslipRoleFilter] = useState("all");
  const [payslipMonthFilter, setPayslipMonthFilter] = useState("all");
  const [payslipYearFilter, setPayslipYearFilter] = useState("all");
  const [payslipDateFrom, setPayslipDateFrom] = useState("");
  const [payslipDateTo, setPayslipDateTo] = useState("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [attendanceDateTo, setAttendanceDateTo] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("all");
  const [attendanceRoleFilter, setAttendanceRoleFilter] = useState("all");
  const [attendanceTeamFilter, setAttendanceTeamFilter] = useState("all");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendancePage, setAttendancePage] = useState(1);
  const [attendanceRowsPerPage, setAttendanceRowsPerPage] = useState(10);
  const [attendanceReportEmployeeId, setAttendanceReportEmployeeId] =
    useState("all");
  const [attendanceReportDownloading, setAttendanceReportDownloading] =
    useState(false);
  const [correction, setCorrection] = useState<{
    id: string;
    status: string;
    reason: string;
  } | null>(null);
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
  const mutations = useHrMutations();
  const employees = useHrQuery<ListResponse<any>>(
    hrKeys.employees,
    "/employees",
    {
      search,
      limit: 100,
      ...(canViewEmployeeDirectory ? {} : { self: true }),
    },
  );
  const me = useHrQuery<any>(["hr", "me"], "/employees/me", undefined);
  const attendance = useHrQuery<ListResponse<any>>(
    hrKeys.attendance,
    "/attendance",
    {
      dateFrom: attendanceDateFrom,
      dateTo: attendanceDateTo,
      status:
        attendanceStatusFilter === "all" ? undefined : attendanceStatusFilter,
      role: attendanceRoleFilter === "all" ? undefined : attendanceRoleFilter,
      teamId: attendanceTeamFilter === "all" ? undefined : attendanceTeamFilter,
      search: attendanceSearch || undefined,
    },
  );
  const attendanceToday = useHrQuery<any>(
    hrKeys.attendanceToday,
    "/attendance/today",
    undefined,
  );
  const teams = useHrQuery<ListResponse<any>>(["hr", "teams"], "/teams", {});

  const leaves = useHrQuery<ListResponse<any>>(hrKeys.leaves, "/leaves", {});
  const payroll = useHrQuery<ListResponse<any>>(hrKeys.payroll, "/payroll", {
    month,
    year,
  });
  const payslips = useHrQuery<ListResponse<any>>(
    hrKeys.payslips,
    "/payslips",
    {
      ...(isAdmin
        ? {
            search: payslipSearch || undefined,
            teamId:
              payslipTeamFilter === "all" ? undefined : payslipTeamFilter,
            role:
              payslipRoleFilter === "all" ? undefined : payslipRoleFilter,
          }
        : {}),
      month: payslipMonthFilter === "all" ? undefined : payslipMonthFilter,
      year: payslipYearFilter === "all" ? undefined : payslipYearFilter,
      dateFrom: payslipDateFrom || undefined,
      dateTo: payslipDateTo || undefined,
    },
  );

  useEffect(() => {
    if (!setSidebar || !setHeader) return;
    const navItems = getNavigationForUser(user);
    const active = getActiveNavigation(location.pathname);
    const activeItem =
      active.activeItem ??
      (workspace === "settings"
        ? "Settings"
        : canViewEmployeeDirectory && workspace === "employees"
        ? "Employees"
        : isAdmin
        ? "Employees"
        : "My Employment");
    const nextSidebar = {
      activeItem,
      activeChild:
        active.activeChild ??
        (workspace === "settings"
          ? undefined
          : workspace === "personal-settings"
          ? "Settings"
          : workspace === "me"
          ? "My Profile"
          : workspace === "employees"
          ? "Directory"
          : workspace === "teams"
          ? "Teams"
          : workspace[0].toUpperCase() + workspace.slice(1)),
      sidebarItems: navItems,
    };
    const nextHeader = {
      search,
      onSearchChange: workspace === "employees" ? setSearch : undefined,
      breadcrumbs: (
        <span>
          {workspace === "settings" || workspace === "personal-settings" ? (
            "Settings"
          ) : (
            <>
              {canViewEmployeeDirectory && workspace === "employees"
                ? "Employees"
                : isAdmin
                ? "Employees"
                : "My Employment"}{" "}
              /{" "}
              {workspace === "me"
                ? "My Profile"
                : workspace === "employees"
                ? "Directory"
                : workspace === "teams"
                ? "Teams"
                : workspace[0].toUpperCase() + workspace.slice(1)}
            </>
          )}
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
    isAdmin,
    search,
    user?.role,
    workspace,
    setSidebar,
    setHeader,
  ]);

  const employeeRows = useMemo(
    () => employees.data?.data ?? [],
    [employees.data?.data],
  );
  const attendanceRows = useMemo(
    () => attendance.data?.data ?? [],
    [attendance.data?.data],
  );
  const attendanceTotalPages = Math.max(
    1,
    Math.ceil(attendanceRows.length / attendanceRowsPerPage),
  );
  const paginatedAttendanceRows = useMemo(() => {
    const start = (attendancePage - 1) * attendanceRowsPerPage;
    return attendanceRows.slice(start, start + attendanceRowsPerPage);
  }, [attendancePage, attendanceRows, attendanceRowsPerPage]);
  const teamRows = useMemo(() => teams.data?.data ?? [], [teams.data?.data]);
  const leaveRows = useMemo(() => leaves.data?.data ?? [], [leaves.data?.data]);
  const payrollRows = useMemo(
    () => payroll.data?.data ?? [],
    [payroll.data?.data],
  );
  const payslipRows = useMemo(
    () => payslips.data?.data ?? [],
    [payslips.data?.data],
  );
  const payslipYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => String(currentYear - index));
  }, []);

  // Derived KPI data
  const kpi = useMemo(() => {
    const total = employeeRows.length;
    const activeCount = employeeRows.filter((e: any) => e.isActive).length;
    const presentToday = employeeRows.filter(
      (e: any) => e.attendanceStatus?.toLowerCase() === "present",
    ).length;
    const roles = { admin: 0, telecaller: 0, fieldExec: 0 };
    for (const emp of employeeRows) {
      if (
        emp.role === "ADMIN" ||
        emp.role === "SUPER_ADMIN" ||
        emp.role === "SALES_MANAGER"
      )
        roles.admin++;
      else if (emp.role === "TELECALLER") roles.telecaller++;
      else roles.fieldExec++;
    }
    return { total, activeCount, presentToday, roles };
  }, [employeeRows]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    let result = employeeRows;
    if (roleFilter !== "all") {
      if (roleFilter === "FIELD_EXECUTIVE")
        result = result.filter(
          (e: any) => e.role === "SALES_AGENT" || e.role === "FIELD_EXECUTIVE",
        );
      else
        result = result.filter((e: any) => e.role === roleFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((e: any) => {
        const name = String(e.fullName ?? e.name ?? "").toLowerCase();
        const email = String(e.email ?? "").toLowerCase();
        const phone = String(e.phone ?? e.mobile ?? "").toLowerCase();
        const code = String(e.employeeCode ?? "").toLowerCase();
        const designation = String(e.designation ?? "").toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          code.includes(q) ||
          designation.includes(q)
        );
      });
    }
    return result;
  }, [employeeRows, roleFilter, search]);

  const leaveKpi = useMemo(() => {
    const pending = leaveRows.filter(
      (leave: any) => leave.status === "Pending",
    ).length;
    const approved = leaveRows.filter(
      (leave: any) => leave.status === "Approved",
    ).length;
    const rejected = leaveRows.filter(
      (leave: any) => leave.status === "Rejected",
    ).length;
    const totalDays = leaveRows.reduce(
      (sum: number, leave: any) => sum + Number(leave.days ?? 0),
      0,
    );
    return { total: leaveRows.length, pending, approved, rejected, totalDays };
  }, [leaveRows]);

  const attendanceKpi = useMemo(() => {
    const uniqueEmployeeCount = new Set(
      attendanceRows.map((record: any) => record.employeeId),
    ).size;
    const present = attendanceRows.filter(
      (record: any) => record.status?.toLowerCase() === "present",
    ).length;
    const notCheckedIn = attendanceRows.filter(
      (record: any) => record.status === "Not Checked In",
    ).length;
    const leaveOrHoliday = attendanceRows.filter((record: any) => {
      const status = record.status?.toLowerCase() ?? "";
      return status.includes("leave") || status.includes("holiday");
    }).length;

    return {
      totalEmployees: uniqueEmployeeCount,
      present,
      notCheckedIn,
      leaveOrHoliday,
    };
  }, [attendanceRows]);

  useEffect(() => {
    setAttendancePage(1);
  }, [
    attendanceDateFrom,
    attendanceDateTo,
    attendanceStatusFilter,
    attendanceRoleFilter,
    attendanceTeamFilter,
    attendanceSearch,
    attendanceRowsPerPage,
  ]);

  useEffect(() => {
    if (attendancePage > attendanceTotalPages) {
      setAttendancePage(attendanceTotalPages);
    }
  }, [attendancePage, attendanceTotalPages]);

  const handleDownloadAttendanceReport = async () => {
    const fromDate = new Date(`${attendanceDateFrom}T00:00:00`);
    const toDate = new Date(`${attendanceDateTo}T00:00:00`);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      toast.error("Select a valid attendance month");
      return;
    }
    if (
      fromDate.getMonth() !== toDate.getMonth() ||
      fromDate.getFullYear() !== toDate.getFullYear()
    ) {
      toast.error("Attendance PDF can be downloaded for one month at a time");
      return;
    }
    if (isAdmin && attendanceReportEmployeeId === "none") {
      toast.error("Select an employee for the attendance report");
      return;
    }

    setAttendanceReportDownloading(true);
    try {
      const response = await api.get<Blob>("/attendance/report.pdf", {
        params: {
          month: fromDate.getMonth() + 1,
          year: fromDate.getFullYear(),
          ...(isAdmin ? { employeeId: attendanceReportEmployeeId } : {}),
        },
        responseType: "blob",
      });
      const disposition = String(response.headers["content-disposition"] ?? "");
      const fileName =
        /filename="?([^"]+)"?/i.exec(disposition)?.[1] ??
        `attendance-report-${fromDate.getFullYear()}-${String(
          fromDate.getMonth() + 1,
        ).padStart(2, "0")}.pdf`;
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Attendance PDF downloaded");
    } catch {
      toast.error("Could not download attendance PDF");
    } finally {
      setAttendanceReportDownloading(false);
    }
  };

  const payslipKpi = useMemo(() => {
    const total = payslipRows.length;
    const currentYear = new Date().getFullYear();
    const thisYear = payslipRows.filter(
      (payslip: any) => Number(payslip.payroll?.year) === currentYear,
    ).length;
    const totalNetPay = payslipRows.reduce(
      (sum: number, payslip: any) => sum + Number(payslip.payroll?.netPay ?? 0),
      0,
    );
    const latestGeneratedAt = payslipRows
      .map((payslip: any) => payslip.generatedAt)
      .filter(Boolean)
      .sort()
      .at(-1);
    return { total, thisYear, totalNetPay, latestGeneratedAt };
  }, [payslipRows]);

  const handleCreateEmployee = async (data: Record<string, unknown>) => {
    try {
      await mutations.createEmployee.mutateAsync(data);
      toast.success("Employee created");
      return true;
    } catch (error: unknown) {
      if (isAxiosError<{ code?: string; message?: string }>(error) && error.response?.data?.code === 'SEAT_LIMIT_REACHED') {
        setSeatUpgradeOpen(true);
        return false;
      }
      toast.error(getApiErrorMessage(error, "Unable to create employee"));
      return false;
    }
  };

  const handleUpdateEmployee = async (data: any) => {
    if (!editingEmployee) return false;
    try {
      await mutations.updateEmployee.mutateAsync({
        id: editingEmployee.id,
        data,
      });
      toast.success("Employee updated");
      return true;
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? "Unable to update employee");
      return false;
    }
  };

  const openCreateEmployee = () => {
    setEditingEmployee(null);
    setEmployeeDialog(true);
  };

  const openEditEmployee = (employee: any) => {
    setEditingEmployee({
      ...employee,
      id: employee.id,
      fullName: employee.fullName ?? "",
      role: employee.role === "SALES_AGENT" ? "FIELD_EXECUTIVE" : employee.role,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      password: employee.password ?? "ChangeMe@123",
      joiningDate: employee.joiningDate ?? new Date().toISOString(),
      image: employee.image,
      designation: employee.designation,
      monthlyBasic: Number(employee.monthlyBasic ?? 0),
      justificationMultiplier: Number(employee.justificationMultiplier ?? 0),
      justificationMode: employee.justificationMode ?? "MULTIPLIER",
      justificationAmount: Number(employee.justificationAmount ?? 0),
      reportingManagerId: employee.reportingToId,
      manager: employee.reportingToName,
      teamId: employee.teamId,
      teamName: employee.teamName,
      leaderOfTeamId: employee.leaderOfTeamId,
      leaderOfTeamName: employee.leaderOfTeamName,
      leaderOfTeamIds: employee.leaderOfTeamIds ?? [],
      leaderOfTeamNames: employee.leaderOfTeamNames ?? [],
      isTeamLeader: employee.isTeamLeader,
      shiftId: employee.shiftId ?? employee.shift?.id,
      shiftName: employee.shiftName ?? employee.shift?.name,
      shift: employee.shift ?? null,
      isActive: employee.isActive,
      twoFactorEnabled: Boolean(employee.twoFactorEnabled),
      permissions: employee.permissions ?? [],
      isAccessCustomized: Boolean(employee.isAccessCustomized),
      rankingTeamIds: employee.rankingTeamIds ?? [],
      rankingTeams: employee.rankingTeams ?? [],
      managedTeamIds: employee.managedTeamIds ?? [],
      managedTeams: employee.managedTeams ?? [],
      monitorTeamIds: employee.monitorTeamIds ?? [],
      monitorTeams: employee.monitorTeams ?? [],
      monitorUserIds: employee.monitorUserIds ?? [],
      monitorUsers: employee.monitorUsers ?? [],
      leadVisibilityAllowedUserIds:
        employee.leadVisibilityAllowedUserIds ?? [],
      leadVisibilityAllowedUsers:
        employee.leadVisibilityAllowedUsers ?? [],
      leadVisibilityBlockedUserIds:
        employee.leadVisibilityBlockedUserIds ?? [],
      leadVisibilityBlockedUsers:
        employee.leadVisibilityBlockedUsers ?? [],
    });
    setEmployeeDialog(true);
  };

  const closeEmployeeDialog = () => {
    setEmployeeDialog(false);
    setEditingEmployee(null);
  };

  if (!canViewEmployeeDirectory && workspace === "employees") return null;

  return (
    <WorkspacePage>
      {workspace === "employees" && (
        <>
          <SectionHeading
            title="Employees"
            description="Manage employee accounts, joining information, roles, and salary configuration."
            action={
              canCreateEmployees ? (
                <Button type="button" onClick={openCreateEmployee}>
                  <Plus className="size-4" /> Add employee
                </Button>
              ) : undefined
            }
          />

          {/* KPI Overview */}
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HrStatCard
              title="Total employees"
              value={kpi.total}
              subtitle={`${kpi.activeCount} active`}
              icon={UsersRound}
              tone="bg-blue-50 text-blue-600"
            />
            <HrStatCard
              title="Present today"
              value={kpi.presentToday}
              subtitle={`of ${kpi.total} employees`}
              icon={CheckCircle2}
              tone="bg-green-50 text-success"
            />
            <HrStatCard
              title="Pre Sales executives"
              value={kpi.roles.telecaller}
              subtitle="Active staff"
              icon={UserRound}
              tone="bg-amber-50 text-amber-600"
            />
            <HrStatCard
              title="Sales executives"
              value={kpi.roles.fieldExec}
              subtitle="Active staff"
              icon={CalendarDays}
              tone="bg-red-50 text-red-600"
            />
          </section>

          {/* Filter bar */}
          <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-1 items-end gap-3">
                <label className="space-y-2 flex-1 max-w-sm">
                  <span className="text-xs font-extrabold text-secondary">
                    Search
                  </span>
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or mobile number..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-10 rounded-md text-xs font-bold shadow-none"
                    />
                  </div>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Role
                  </span>
                  <SearchableSelect
                    value={roleFilter}
                    onValueChange={setRoleFilter}
                    options={hrRoleFilterOptions}
                    placeholder="All roles"
                    searchPlaceholder="Search role..."
                    noOptionsText="No role found"
                    className="h-10 w-[180px] rounded-md text-xs font-bold shadow-none"
                  />
                </label>
              </div>
            </div>
          </Card>

          {/* Employee table */}
          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50 text-[11px] font-extrabold text-secondary">
                  <tr>
                    {[
                      "Employee",
                      "Employee Code",
                      "Role",
                      "Team",
                      "Joining Date",
                      "Attendance",
                      "Status",
                      "",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length ? (
                    filteredEmployees.map((employee: any) => (
                      <tr
                        key={employee.id}
                        className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                        onClick={() =>
                          navigate(`/admin/employees/${employee.id}`)
                        }
                      >
                        <td className="px-4 py-3">
                          <HrEmployeeIdentityCell
                            fullName={employee.fullName}
                            email={employee.email}
                            image={employee.image}
                            href={`/admin/employees/${employee.id}`}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                          {employee.employeeCode ?? "Pending"}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {roleLabel(employee.role)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {employee.teamName ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-auto rounded-md bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-secondary hover:bg-slate-200"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (employee.teamId) {
                                    navigate(`/admin/teams/${employee.teamId}`);
                                  }
                                }}
                              >
                                {employee.teamName}
                              </Button>
                            ) : null}
                            {employee.isTeamLeader && employee.leaderOfTeamName ? (
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-auto rounded-md bg-blue-50 px-2 py-1 text-[11px] font-extrabold text-blue-700 hover:bg-blue-100"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (employee.leaderOfTeamId) {
                                    navigate(`/admin/teams/${employee.leaderOfTeamId}`);
                                  }
                                }}
                              >
                                TL · {employee.leaderOfTeamName}
                              </Button>
                            ) : null}
                            {!employee.teamName && !employee.isTeamLeader ? (
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                Unassigned
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {dateLabel(employee.joiningDate)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={employee.attendanceStatus} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={employee.isActive ? "Active" : "Inactive"}
                          />
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-md border border-slate-200 bg-white shadow-none hover:bg-slate-50"
                                aria-label={`Open actions for ${employee.fullName}`}
                              >
                                <MoreVertical className="h-4 w-4 text-blue-700" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              sideOffset={8}
                              className="min-w-[220px] rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,37,68,0.16)]"
                            >
                              <DropdownMenuLabel className="px-3 py-2">
                                <span className="block truncate text-xs font-extrabold text-secondary">
                                  {employee.fullName}
                                </span>
                                <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                                  {employee.employeeCode ?? employee.email}
                                </span>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
                                onSelect={() =>
                                  navigate(`/admin/employees/${employee.id}`)
                                }
                              >
                                <Eye className="h-4 w-4 text-blue-700" />
                                View details
                              </DropdownMenuItem>
                              {canUpdateEmployees ? (
                                <>
                                  <DropdownMenuItem
                                    className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
                                    onSelect={() => openEditEmployee(employee)}
                                  >
                                    <Pencil className="h-4 w-4 text-blue-700" />
                                    Edit employee
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className={`gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold ${
                                      employee.isActive
                                        ? "text-red-600 focus:bg-red-50 focus:text-red-700"
                                        : "text-success focus:bg-green-50 focus:text-success"
                                    }`}
                                    onSelect={() => {
                                      mutations.updateEmployee.mutate(
                                        {
                                          id: employee.id,
                                          data: { isActive: !employee.isActive },
                                        },
                                        {
                                          onSuccess: () =>
                                            toast.success(
                                              `Employee ${
                                                employee.isActive
                                                  ? "deactivated"
                                                  : "activated"
                                              }`,
                                            ),
                                          onError: () =>
                                            toast.error(
                                              "Unable to update employee",
                                            ),
                                        },
                                      );
                                    }}
                                  >
                                    {employee.isActive ? (
                                      <UserX className="h-4 w-4" />
                                    ) : (
                                      <UserCheck className="h-4 w-4" />
                                    )}
                                    {employee.isActive
                                      ? "Deactivate employee"
                                      : "Activate employee"}
                                  </DropdownMenuItem>
                                  {isSuperAdmin ? (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-red-600 focus:bg-red-50 focus:text-red-700"
                                        onSelect={() =>
                                          setDeleteTarget({
                                            id: employee.id,
                                            name: employee.fullName ?? employee.email,
                                          })
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                        Permanently delete
                                      </DropdownMenuItem>
                                    </>
                                  ) : null}
                                </>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState label="employees" icon={UsersRound} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              total={filteredEmployees.length}
              label="employees"
            />
          </Card>
          <EmployeeModal
            isOpen={employeeDialog}
            onClose={closeEmployeeDialog}
            onSave={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
            employee={editingEmployee}
          />
          <AddSeatsDialog open={seatUpgradeOpen} onOpenChange={setSeatUpgradeOpen} onPurchased={() => toast.success('Seats added. You can now create the employee.')} />
          <ConfirmDeleteDialog
            open={!!deleteTarget}
            title="Permanently delete employee?"
            description={`This will permanently remove ${deleteTarget?.name ?? "this employee"} and all their attendance records, leave history, payroll data, team memberships, and visibility settings.\n\nThis action cannot be undone.`}
            entityName={deleteTarget?.name}
            confirmLabel="Yes, permanently delete"
            isLoading={mutations.deleteEmployee.isPending}
            onConfirm={() => {
              if (!deleteTarget) return;
              mutations.deleteEmployee.mutate(deleteTarget.id, {
                onSuccess: () => {
                  toast.success(`${deleteTarget.name} has been permanently deleted`);
                  setDeleteTarget(null);
                },
                onError: (error: any) => {
                  const msg =
                    error?.response?.data?.message ?? "Unable to delete employee";
                  toast.error(msg);
                },
              });
            }}
            onCancel={() => setDeleteTarget(null)}
            onClose={() => setDeleteTarget(null)}
          />
        </>
      )}

      {workspace === "me" && (
        <>
          <SectionHeading
            title="My Employment"
            description="Your employment profile, current attendance status, and payroll details."
          />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
            <Card className="rounded-md border border-slate-200 p-5 shadow-card">
              <div className="flex items-center gap-4">
                <span className="grid size-12 place-items-center rounded-full bg-blue-50 text-blue-700">
                  <UsersRound className="size-6" />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-secondary">
                    {me.data?.fullName ?? user?.fullName}
                  </h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    {me.data?.designation ?? roleLabel(user?.role)}
                  </p>
                </div>
              </div>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                {[
                  ["Employee code", me.data?.employeeCode],
                  ["Work email", me.data?.email],
                  ["Joining date", dateLabel(me.data?.joiningDate)],
                  ["Employment status", me.data?.employmentStatus],
                  ["Monthly basic", money(me.data?.monthlyBasic)],
                  [
                    "Justification method",
                    me.data?.justificationMode === "MANUAL"
                      ? "Manual amount"
                      : "Salary multiplier",
                  ],
                  [
                    "Monthly justification target",
                    money(
                      me.data?.justificationMode === "MANUAL"
                        ? Number(me.data?.justificationAmount ?? 0)
                        : Number(me.data?.monthlyBasic ?? 0) *
                            Number(me.data?.justificationMultiplier ?? 0),
                    ),
                  ],
                  ["Allowances", money(me.data?.monthlyAllowances)],
                  [
                    "Assigned shift",
                    formatShiftLabel(
                      me.data?.shift ?? attendanceToday.data?.shift,
                      me.data?.shiftName ?? attendanceToday.data?.shift?.name,
                    ),
                  ],
                ].map(([label, value]) => (
                  <div key={String(label)}>
                    <dt className="text-xs font-bold text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 font-bold text-secondary">
                      {value ?? "-"}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="rounded-md border border-slate-200 p-5 shadow-card">
              <h2 className="font-extrabold text-secondary">Today</h2>
              <div className="mt-5 space-y-4">
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-bold text-muted-foreground">
                    Attendance status
                  </p>
                  <div className="mt-2">
                    <StatusBadge
                      value={attendanceToday.data?.status ?? "Not checked in"}
                    />
                  </div>
                </div>
                <div className="rounded-md bg-slate-50 p-4">
                  <p className="text-xs font-bold text-muted-foreground">
                    Shift and rules
                  </p>
                  <p className="mt-2 text-xs font-semibold text-secondary">
                    {attendanceToday.data?.shift?.name
                      ? `${attendanceToday.data.shift.name} (${attendanceToday.data.shift.scheduleLabel})`
                      : "No shift assigned"}
                  </p>
                  {attendanceToday.data?.blockedReason ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      {attendanceToday.data.blockedReason}
                    </p>
                  ) : null}
                  {attendanceToday.data?.lateMinutes ? (
                    <p className="mt-2 text-xs font-semibold text-amber-700">
                      Late by {attendanceToday.data.lateMinutes} minutes
                    </p>
                  ) : null}
                  {attendanceToday.data?.checkInImageUrl ||
                  attendanceToday.data?.checkOutImageUrl ? (
                    <div className="mt-3 flex gap-3">
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
                            className="h-24 w-24 rounded-xl object-cover"
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
                            className="h-24 w-24 rounded-xl object-cover"
                          />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-muted-foreground">
                  Punch in and punch out are available on your dashboard.
                </div>
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="w-full"
                >
                  <Link to="/employee/attendance">View attendance history</Link>
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}

      {workspace === "attendance" && (
        <>
          <SectionHeading
            title={isAdmin ? "Attendance" : "My Attendance"}
            description={
              isAdmin
                ? "Review attendance by employee and correct records with an audit reason."
                : "Punch in and punch out against your assigned shift. Approved leave and holidays override attendance automatically."
            }
          />
          <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  From date
                </span>
                <DatePicker
                  value={attendanceDateFrom}
                  onChange={(event) =>
                    setAttendanceDateFrom(event.target.value)
                  }
                  className="h-10 rounded-md text-xs font-bold shadow-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  To date
                </span>
                <DatePicker
                  value={attendanceDateTo}
                  onChange={(event) => setAttendanceDateTo(event.target.value)}
                  className="h-10 rounded-md text-xs font-bold shadow-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Status
                </span>
                <SearchableSelect
                  value={attendanceStatusFilter}
                  onValueChange={setAttendanceStatusFilter}
                  options={attendanceStatusOptions}
                  placeholder="All statuses"
                  searchPlaceholder="Search status..."
                  noOptionsText="No status found"
                  className="h-10 rounded-md text-xs font-bold shadow-none"
                />
              </label>
              {isAdmin ? (
                <>
                  <label className="space-y-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Role
                    </span>
                    <SearchableSelect
                      value={attendanceRoleFilter}
                      onValueChange={setAttendanceRoleFilter}
                      options={hrRoleFilterOptions}
                      placeholder="All roles"
                      searchPlaceholder="Search role..."
                      noOptionsText="No role found"
                      className="h-10 rounded-md text-xs font-bold shadow-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Team
                    </span>
                    <SearchableSelect
                      value={attendanceTeamFilter}
                      onValueChange={setAttendanceTeamFilter}
                      options={[
                        { value: "all", label: "All teams" },
                        ...teamRows.map((team: any) => ({
                          value: team.id,
                          label: team.name,
                          description: team.code,
                        })),
                      ]}
                      placeholder="All teams"
                      searchPlaceholder="Search team..."
                      noOptionsText="No team found"
                      className="h-10 rounded-md text-xs font-bold shadow-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Report employee
                    </span>
                    <SearchableSelect
                      value={attendanceReportEmployeeId}
                      onValueChange={setAttendanceReportEmployeeId}
                      options={[
                        { value: "all", label: "All employees" },
                        { value: "none", label: "Select employee" },
                        ...employeeRows.map((employee: any) => ({
                          value: employee.id,
                          label: employee.fullName ?? employee.email,
                          description: employee.email,
                          avatarUrl:
                            employee.avatarStorageKey ?? employee.image ?? undefined,
                        })),
                      ]}
                      placeholder="All employees"
                      searchPlaceholder="Search employee..."
                      noOptionsText="No employee found"
                      className="h-10 rounded-md text-xs font-bold shadow-none"
                    />
                  </label>
                </>
              ) : null}
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Search employee
                </span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={attendanceSearch}
                    placeholder="Name, email, code"
                    className="h-10 rounded-md pl-9 text-xs font-bold shadow-none"
                    onChange={(event) => setAttendanceSearch(event.target.value)}
                    disabled={!isAdmin}
                  />
                </div>
              </label>
            </div>
            <div className="mt-4 flex flex-col justify-end gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
                disabled={attendanceReportDownloading}
                onClick={handleDownloadAttendanceReport}
              >
                <Download className="size-4" />
                {attendanceReportDownloading ? "Downloading..." : "Download PDF"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
                onClick={() => {
                  const todayValue = new Date().toISOString().slice(0, 10);
                  setAttendanceDateFrom(todayValue);
                  setAttendanceDateTo(todayValue);
                  setAttendanceStatusFilter("all");
                  setAttendanceRoleFilter("all");
                  setAttendanceTeamFilter("all");
                  setAttendanceSearch("");
                }}
              >
                <Filter className="size-4" />
                Reset filters
              </Button>
            </div>
          </Card>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HrStatCard
              title="Employees in range"
              value={attendanceKpi.totalEmployees}
              subtitle={`${dateLabel(attendanceDateFrom)} - ${dateLabel(
                attendanceDateTo,
              )}`}
              icon={CalendarDays}
              tone="bg-blue-50 text-blue-600"
            />
            <HrStatCard
              title="Present"
              value={attendanceKpi.present}
              subtitle="Recorded check-ins"
              icon={CheckCircle2}
              tone="bg-green-50 text-success"
            />
            <HrStatCard
              title="Leave / Holiday"
              value={attendanceKpi.leaveOrHoliday}
              subtitle="Approved non-working entries"
              icon={Landmark}
              tone="bg-amber-50 text-amber-600"
            />
            <HrStatCard
              title="Not checked in"
              value={attendanceKpi.notCheckedIn}
              subtitle="No punch recorded"
              icon={FileText}
              tone="bg-red-50 text-red-600"
            />
          </section>
          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead className="bg-slate-50 text-[11px] font-extrabold text-secondary">
                  <tr>
                    {[
                      "Date",
                      ...(isAdmin ? ["Employee"] : []),
                      ...(isAdmin ? ["Role / Team"] : []),
                      "Status",
                      "Punches",
                      "Location",
                      "Selfie",
                      "Shift",
                      "Late",
                      "Note",
                      ...(isAdmin ? [""] : []),
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAttendanceRows.length ? (
                    paginatedAttendanceRows.map((record: any) => (
                      <tr key={record.id}>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {dateLabel(record.attendanceDate)}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <HrEmployeeIdentityCell
                              fullName={record.employee?.fullName}
                              email={record.employee?.email}
                              image={record.employee?.image}
                              href={
                                record.employeeId
                                  ? `/admin/employees/${record.employeeId}`
                                  : undefined
                              }
                            />
                          </td>
                        )}
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <p className="text-xs font-extrabold text-secondary">
                              {roleLabel(record.employee?.role)}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              {record.employee?.teamName ?? "No team"}
                            </p>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <StatusBadge value={record.status} />
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {record.checkInAt
                            ? `${new Date(record.checkInAt).toLocaleTimeString(
                                "en-IN",
                                { hour: "2-digit", minute: "2-digit" },
                              )} - ${
                                record.checkOutAt
                                  ? new Date(
                                      record.checkOutAt,
                                    ).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "--"
                              }`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {record.checkInLocationAddress ? (
                            record.checkInLatitude && record.checkInLongitude ? (
                              <a
                                href={`https://maps.google.com/?q=${record.checkInLatitude},${record.checkInLongitude}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                              >
                                <MapPin className="size-3 shrink-0" />
                                {record.checkInLocationAddress}
                              </a>
                            ) : (
                              record.checkInLocationAddress
                            )
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {record.checkInImageUrl || record.checkOutImageUrl ? (
                            <div className="flex flex-wrap gap-2">
                              {record.checkInImageUrl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shadow-none"
                                  onClick={() =>
                                    setAttendanceImagePreview({
                                      title: `${dateLabel(record.attendanceDate)} punch-in selfie`,
                                      url: record.checkInImageUrl,
                                    })
                                  }
                                >
                                  <Eye className="mr-2 size-4" />
                                  In
                                </Button>
                              ) : null}
                              {record.checkOutImageUrl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 shadow-none"
                                  onClick={() =>
                                    setAttendanceImagePreview({
                                      title: `${dateLabel(record.attendanceDate)} punch-out selfie`,
                                      url: record.checkOutImageUrl,
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
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {record.shift?.name ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {record.isLate
                            ? `${record.lateMinutes ?? 0} min`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {record.derivedStatusReason ?? record.note ?? "-"}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            {record.isGenerated ? (
                              <span className="text-[11px] font-bold text-muted-foreground">
                                No record
                              </span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 shadow-none"
                                onClick={() =>
                                  setCorrection({
                                    id: record.id,
                                    status: record.status,
                                    reason: "",
                                  })
                                }
                              >
                                Correct
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 11 : 7}>
                        <EmptyState
                          label="attendance records"
                          icon={CalendarDays}
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              total={attendanceRows.length}
              label="records"
              currentPage={attendancePage}
              rowsPerPage={attendanceRowsPerPage}
              onPageChange={setAttendancePage}
              onRowsPerPageChange={setAttendanceRowsPerPage}
            />
          </Card>
          <Dialog
            open={Boolean(correction)}
            onOpenChange={(open) => !open && setCorrection(null)}
          >
            <DialogContent className="max-w-md rounded-md">
              <DialogHeader>
                <DialogTitle>Correct attendance</DialogTitle>
                <DialogDescription>
                  A reason is mandatory and the prior value is retained in the
                  audit log.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <SearchableSelect
                  value={correction?.status ?? ""}
                  onValueChange={(status) =>
                    setCorrection(correction ? { ...correction, status } : null)
                  }
                  options={[
                    "Present",
                    "Absent",
                    "On Leave",
                    "Holiday",
                    "Half Day",
                    "Manual Correction",
                  ].map((value) => ({ value, label: value }))}
                  placeholder="Select status"
                  searchPlaceholder="Search status..."
                  noOptionsText="No status found"
                  modal={false}
                  portaled={false}
                />
                <Textarea
                  placeholder="Reason for correction"
                  value={correction?.reason ?? ""}
                  onChange={(event) =>
                    setCorrection(
                      correction
                        ? { ...correction, reason: event.target.value }
                        : null,
                    )
                  }
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCorrection(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    !correction?.reason || mutations.correctAttendance.isPending
                  }
                  onClick={() =>
                    correction &&
                    mutations.correctAttendance.mutate(
                      {
                        id: correction.id,
                        data: {
                          status: correction.status,
                          reason: correction.reason,
                        },
                      },
                      {
                        onSuccess: () => {
                          setCorrection(null);
                          toast.success("Attendance corrected");
                        },
                        onError: () =>
                          toast.error("Unable to correct attendance"),
                      },
                    )
                  }
                >
                  Save correction
                </Button>
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
        </>
      )}

      {workspace === "holidays" && <HolidaysPage />}

      {workspace === "leaves" && (
        <>
          <SectionHeading
            title={isAdmin ? "Leave Requests" : "My Leave"}
            description={
              isAdmin
                ? "Review requests, decide with remarks, and keep attendance in sync."
                : "Apply, track, and cancel pending leave requests."
            }
            action={
              !isAdmin ? (
                <Button type="button" onClick={() => setLeaveDialog(true)}>
                  <Plus className="size-4" /> Apply for leave
                </Button>
              ) : undefined
            }
          />
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HrStatCard
              title={isAdmin ? "Total Requests" : "My Requests"}
              value={leaveKpi.total}
              subtitle={`${leaveKpi.totalDays} leave days logged`}
              icon={CalendarDays}
              tone="bg-blue-50 text-blue-600"
            />
            <HrStatCard
              title="Pending Review"
              value={leaveKpi.pending}
              subtitle="Awaiting decision"
              icon={Landmark}
              tone="bg-amber-50 text-amber-600"
            />
            <HrStatCard
              title="Approved"
              value={leaveKpi.approved}
              subtitle="Cleared requests"
              icon={CheckCircle2}
              tone="bg-green-50 text-success"
            />
            <HrStatCard
              title="Rejected"
              value={leaveKpi.rejected}
              subtitle="Requests declined"
              icon={FileText}
              tone="bg-red-50 text-red-600"
            />
          </section>
          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50 text-[11px] font-extrabold text-secondary">
                  <tr>
                    {[
                      ...(isAdmin ? ["Employee"] : []),
                      "Leave type",
                      "Period",
                      "Days",
                      "Reason",
                      "Status",
                      "",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRows.length ? (
                    leaveRows.map((leave: any) => (
                      <tr
                        key={leave.id}
                        className={isAdmin ? "cursor-pointer hover:bg-slate-50/80 transition-colors" : undefined}
                        onClick={() =>
                          isAdmin &&
                          leave.employee?.id &&
                          navigate(`/admin/employees/${leave.employee.id}`)
                        }
                      >
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <HrEmployeeIdentityCell
                              fullName={leave.employee?.fullName}
                              email={leave.employee?.email}
                              image={leave.employee?.image}
                              href={
                                leave.employee?.id
                                  ? `/admin/employees/${leave.employee.id}`
                                  : undefined
                              }
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {leave.leaveType}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {dateLabel(leave.startDate)} -{" "}
                          {dateLabel(leave.endDate)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {String(leave.days)}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary max-w-xs truncate">
                          {leave.reason}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge value={leave.status} />
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {isAdmin && leave.status === "Pending" ? (
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                size="sm"
                                className="h-8"
                                onClick={() =>
                                  mutations.decideLeave.mutate(
                                    {
                                      id: leave.id,
                                      data: { status: "Approved" },
                                    },
                                    {
                                      onSuccess: () =>
                                        toast.success("Leave approved"),
                                      onError: () =>
                                        toast.error("Unable to approve leave"),
                                    },
                                  )
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 shadow-none"
                                onClick={() =>
                                  mutations.decideLeave.mutate(
                                    {
                                      id: leave.id,
                                      data: { status: "Rejected" },
                                    },
                                    {
                                      onSuccess: () =>
                                        toast.success("Leave rejected"),
                                      onError: () =>
                                        toast.error("Unable to reject leave"),
                                    },
                                  )
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          ) : !isAdmin && leave.status === "Pending" ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 shadow-none"
                              onClick={() =>
                                mutations.cancelLeave.mutate(leave.id, {
                                  onSuccess: () =>
                                    toast.success("Leave request cancelled"),
                                  onError: () =>
                                    toast.error("Unable to cancel leave"),
                                })
                              }
                            >
                              Cancel
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6}>
                        <EmptyState label="leave requests" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination total={leaveRows.length} label="requests" />
          </Card>
          <LeaveDialog
            open={leaveDialog}
            onOpenChange={setLeaveDialog}
            pending={mutations.createLeave.isPending}
            onSave={(data) =>
              mutations.createLeave.mutate(data, {
                onSuccess: () => {
                  setLeaveDialog(false);
                  toast.success("Leave request submitted");
                },
                onError: (error: any) =>
                  toast.error(
                    error.response?.data?.message ??
                      "Unable to submit leave request",
                  ),
              })
            }
          />
        </>
      )}

      {workspace === "payroll" && (
        <HrPayrollPanel
          year={year}
          month={month}
          setYear={setYear}
          setMonth={setMonth}
          payrollRecords={payrollRows}
          employees={employeeRows}
          isLoading={payroll.isLoading}
          mutations={mutations}
        />
      )}

      {workspace === "payslips" && (
        <>
          <SectionHeading
            title={isAdmin ? "Payslips" : "My Payslips"}
            description="Finalized payroll snapshots remain unchanged even when salary configuration changes."
          />
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HrStatCard
              title={isAdmin ? "Total Payslips" : "Available Payslips"}
              value={payslipKpi.total}
              subtitle="Printable snapshots"
              icon={FileText}
              tone="bg-blue-50 text-blue-600"
            />
            <HrStatCard
              title="Current Year"
              value={payslipKpi.thisYear}
              subtitle={`Generated in ${new Date().getFullYear()}`}
              icon={CalendarDays}
              tone="bg-amber-50 text-amber-600"
            />
            <HrStatCard
              title="Net Pay Total"
              value={money(payslipKpi.totalNetPay)}
              subtitle="Across visible payslips"
              icon={Landmark}
              tone="bg-green-50 text-success"
            />
            <HrStatCard
              title="Latest Generated"
              value={
                payslipKpi.latestGeneratedAt
                  ? dateLabel(payslipKpi.latestGeneratedAt)
                  : "-"
              }
              subtitle="Most recent snapshot"
              icon={CheckCircle2}
              tone="bg-red-50 text-red-600"
            />
          </section>
          <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
            <div className="grid gap-4 lg:grid-cols-6">
              {isAdmin ? (
                <>
                  <label className="space-y-2 lg:col-span-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Search Employee
                    </span>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={payslipSearch}
                        onChange={(event) => setPayslipSearch(event.target.value)}
                        placeholder="Search by name, email, or employee code"
                        className="h-10 rounded-md pl-9 text-xs font-bold shadow-none"
                      />
                    </div>
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Role
                    </span>
                    <SearchableSelect
                      value={payslipRoleFilter}
                      onValueChange={setPayslipRoleFilter}
                      options={hrRoleFilterOptions}
                      placeholder="All roles"
                      searchPlaceholder="Search role..."
                      noOptionsText="No role found"
                      className="h-10 rounded-md text-xs font-bold shadow-none"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Team
                    </span>
                    <SearchableSelect
                      value={payslipTeamFilter}
                      onValueChange={setPayslipTeamFilter}
                      options={[
                        { value: "all", label: "All teams" },
                        ...teamRows.map((team: any) => ({
                          value: team.id,
                          label: team.name,
                          description: team.code,
                        })),
                      ]}
                      placeholder="All teams"
                      searchPlaceholder="Search team..."
                      noOptionsText="No team found"
                      className="h-10 rounded-md text-xs font-bold shadow-none"
                    />
                  </label>
                </>
              ) : null}
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Payroll Month
                </span>
                <SearchableSelect
                  value={payslipMonthFilter}
                  onValueChange={setPayslipMonthFilter}
                  options={[
                    { value: "all", label: "All months" },
                    ...Array.from({ length: 12 }, (_, index) => ({
                      value: String(index + 1),
                      label: new Date(2026, index, 1).toLocaleString("en-IN", {
                        month: "long",
                      }),
                    })),
                  ]}
                  placeholder="All months"
                  searchPlaceholder="Search month..."
                  noOptionsText="No month found"
                  className="h-10 rounded-md text-xs font-bold shadow-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Payroll Year
                </span>
                <SearchableSelect
                  value={payslipYearFilter}
                  onValueChange={setPayslipYearFilter}
                  options={[
                    { value: "all", label: "All years" },
                    ...payslipYearOptions.map((option) => ({
                      value: option,
                      label: option,
                    })),
                  ]}
                  placeholder="Select year"
                  searchPlaceholder="Search year..."
                  noOptionsText="No year found"
                  className="h-10 rounded-md text-xs font-bold shadow-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Generated From
                </span>
                <DatePicker
                  value={payslipDateFrom}
                  onChange={(event) => setPayslipDateFrom(event.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Generated To
                </span>
                <DatePicker
                  value={payslipDateTo}
                  onChange={(event) => setPayslipDateTo(event.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs shadow-none"
                onClick={() => {
                  setPayslipSearch("");
                  setPayslipTeamFilter("all");
                  setPayslipRoleFilter("all");
                  setPayslipMonthFilter("all");
                  setPayslipYearFilter("all");
                  setPayslipDateFrom("");
                  setPayslipDateTo("");
                }}
              >
                Reset
              </Button>
            </div>
          </Card>
          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left">
                <thead className="bg-slate-50 text-[11px] font-extrabold text-secondary">
                  <tr>
                    {[
                      ...(isAdmin ? ["Employee"] : []),
                      "Payroll month",
                      "Team",
                      "Net pay",
                      "Delivery",
                      "Generated",
                      "",
                    ].map((heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslipRows.length ? (
                    payslipRows.map((payslip: any) => (
                      <tr
                        key={payslip.id}
                        className={isAdmin ? "cursor-pointer hover:bg-slate-50/80 transition-colors" : undefined}
                        onClick={() =>
                          isAdmin &&
                          payslip.employee?.id &&
                          navigate(`/admin/employees/${payslip.employee.id}`)
                        }
                      >
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <HrEmployeeIdentityCell
                              fullName={payslip.employee?.fullName}
                              email={payslip.employee?.email}
                              image={payslip.employee?.image ?? payslip.employee?.avatarStorageKey}
                              href={
                                payslip.employee?.id
                                  ? `/admin/employees/${payslip.employee.id}`
                                  : undefined
                              }
                            />
                          </td>
                        )}
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {new Date(
                            payslip.payroll?.year,
                            (payslip.payroll?.month ?? 1) - 1,
                          ).toLocaleString("en-IN", {
                            month: "long",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {payslip.employee?.employeeProfile?.team?.name ??
                            payslip.employee?.ledTeam?.name ??
                            payslip.snapshot?.employee?.teamName ??
                            "-"}
                        </td>
                        <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                          {money(payslip.payroll?.netPay)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            value={payslip.deliveryStatus ?? "Generated"}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs font-semibold text-secondary">
                          {dateLabel(payslip.generatedAt)}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 shadow-none"
                            onClick={() => {
                              if (payslip.fileUrl) {
                                window.open(payslip.fileUrl, "_blank");
                              } else {
                                const printable = JSON.stringify(
                                  presentRecordDetails(payslip.snapshot),
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
                            View / Print
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6}>
                        <EmptyState label="payslips" icon={FileText} />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination total={payslipRows.length} label="payslips" />
          </Card>
        </>
      )}
      {workspace === "teams" && <HrTeamsScreen />}
      {workspace === "settings" && (
        <>
          <SectionHeading
            title="System Settings"
            description="Configure organization-wide presence rules, salary divisor logic, and math calculations."
          />
          <PayrollSettingsPage />
        </>
      )}
      {workspace === "personal-settings" && (
        <>
          <SectionHeading
            title="Personal Settings"
            description="Update your personal details, profile picture, and manage your account password."
          />
          <PersonalSettingsPage />
        </>
      )}
    </WorkspacePage>
  );
}
