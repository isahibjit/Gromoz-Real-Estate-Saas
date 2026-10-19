import React, { useMemo, useState } from "react";
import {
  User,
  Calendar,
  ChevronDown,
  FileCheck,
  Filter,
  History,
  Search,
  Send,
  Settings,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { PayrollSettingsModal } from "./PayrollSettingsModal";
import { BrandLogo } from "../../../components/ui/BrandLogo";

import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  RefreshCw,
  Calculator,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SearchableSelect,
  Textarea,
} from "ui";
import { HrStatCard } from "../components/HrStatCard";
import { HrEmployeeIdentityCell } from "../components/HrEmployeeIdentityCell";
import { useAppSelector } from "../../../store";
import { usePermission } from "../../../common/access/usePermission";

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ");

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const hashEmployeeId = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return Math.abs(hash).toString().padStart(5, "0");
};
const getDisplayEmployeeId = (value: string) =>
  `KM-EMP-${hashEmployeeId(value || "")}`;

interface PayrollIncentiveBreakdownRow {
  id: string;
  title: string;
  amount: string | number;
  status: string;
  customerName?: string | null;
  projectName?: string | null;
}

interface PayrollIncentiveBreakdown {
  included?: PayrollIncentiveBreakdownRow[];
  pending?: PayrollIncentiveBreakdownRow[];
  includedTotal?: string | number;
  pendingTotal?: string | number;
  includedCount?: number;
  pendingCount?: number;
}

const incentiveSourceLabel = (item: PayrollIncentiveBreakdownRow) =>
  [item.customerName, item.projectName].filter(Boolean).join(" · ") ||
  "Booking incentive";

interface PayrollEmployeeOptionSource {
  id?: string;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
  employeeProfile?: {
    designation?: string | null;
  } | null;
}

interface PayslipPreviewDetail {
  readonly label: string;
  readonly value: string | number | null | undefined;
}

interface PayslipPreviewAttendance {
  readonly label: string;
  readonly value: string | number | null | undefined;
  readonly className: string;
}

interface PayslipPdfPreviewProps {
  readonly employeeName?: string | null;
  readonly payPeriod: string;
  readonly designation: string;
  readonly teamName: string;
  readonly payableDays: string | number | null | undefined;
  readonly salaryDivisorDays: string | number | null | undefined;
  readonly baseSalary: number;
  readonly deductions: number;
  readonly pfAmount: number;
  readonly incentive: number;
  readonly netPayable: number;
  readonly presentDays: string | number | null | undefined;
  readonly unpaidDays: string | number | null | undefined;
  readonly holidayDays: string | number | null | undefined;
  readonly paidLeaveDays: string | number | null | undefined;
  readonly overrideReason: string;
}

function PayslipPdfPreview({
  employeeName,
  payPeriod,
  designation,
  teamName,
  payableDays,
  salaryDivisorDays,
  baseSalary,
  deductions,
  pfAmount,
  incentive,
  netPayable,
  presentDays,
  unpaidDays,
  holidayDays,
  paidLeaveDays,
  overrideReason,
}: PayslipPdfPreviewProps) {
  const employeeDetails: readonly PayslipPreviewDetail[] = [
    { label: "Employee name", value: employeeName || "-" },
    { label: "Employee code", value: "Generated at finalization" },
    { label: "Designation", value: designation || "-" },
    { label: "Department / team", value: teamName || "-" },
  ];
  const payrollDetails: readonly PayslipPreviewDetail[] = [
    { label: "Pay period", value: payPeriod },
    { label: "Payable days", value: `${payableDays ?? "-"} days` },
    { label: "Salary divisor", value: `${salaryDivisorDays ?? "-"} days` },
    { label: "Payslip status", value: "Draft preview" },
  ];

  const earningsRows: readonly PayslipPreviewDetail[] = [
    {
      label: "Basic salary and allowances",
      value: formatCurrency(baseSalary),
    },
    {
      label: "Approved incentives",
      value: formatCurrency(incentive),
    },
  ];
  const deductionRows: readonly PayslipPreviewDetail[] = [
    { label: "Attendance deductions", value: formatCurrency(deductions) },
    { label: "PF amount", value: formatCurrency(pfAmount) },
  ];
  const attendanceCards: readonly PayslipPreviewAttendance[] = [
    {
      label: "Present",
      value: presentDays,
      className: "border-emerald-100 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Absent",
      value: unpaidDays,
      className: "border-rose-100 bg-rose-50 text-rose-700",
    },
    {
      label: "Holiday",
      value: holidayDays,
      className: "border-blue-100 bg-blue-50 text-blue-700",
    },
    {
      label: "Leave",
      value: paidLeaveDays,
      className: "border-amber-100 bg-amber-50 text-amber-700",
    },
  ];

  const totalEarnings = baseSalary + incentive;
  const totalDeductions = deductions + pfAmount;

  const renderInfoTable = (
    title: string,
    rows: readonly PayslipPreviewDetail[],
  ) => (
    <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="text-sm font-bold text-secondary">{title}</h4>
      </div>
      <div className="grid sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={`${title}-${row.label}`}
            className="border-b border-slate-100 px-4 py-3 last:border-b-0 sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <p className="text-[11px] font-semibold text-slate-500">
              {row.label}
            </p>
            <p className="mt-1 truncate text-[13px] font-bold text-slate-950">
              {row.value || "-"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderAmountRows = (rows: readonly PayslipPreviewDetail[]) =>
    rows.map((row) => (
      <div
        key={row.label}
        className="grid grid-cols-[minmax(0,1fr)_140px] border-b border-slate-100 px-4 py-3 text-[13px] last:border-b-0"
      >
        <span className="font-semibold text-slate-700">{row.label}</span>
        <span className="text-right font-bold text-slate-950">
          {row.value}
        </span>
      </div>
    ));

  return (
    <div className="rounded-md border border-slate-200 bg-slate-100/70 p-3 sm:p-5">
      <div className="mx-auto max-w-[920px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b-4 border-primary bg-white px-6 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <BrandLogo className="h-auto w-44 object-contain" />
              <p className="mt-3 text-[12px] font-semibold text-slate-500">
                Gromoze payroll preview
              </p>
            </div>
            <div className="md:text-right">
              <p className="text-[12px] font-semibold text-primary">
                Draft preview - not finalized
              </p>
              <h3 className="mt-1 font-headline text-3xl font-extrabold tracking-tight text-secondary">
                Payslip for {payPeriod}
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Review, amend, then finalize to generate the official payslip.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {renderInfoTable("Employee details", employeeDetails)}
            {renderInfoTable("Payroll details", payrollDetails)}
          </div>

          <section className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] bg-secondary text-sm font-bold text-white">
              <div className="border-r border-white/15 px-4 py-3">Earnings</div>
              <div className="px-4 py-3">Deductions</div>
            </div>
            <div className="grid lg:grid-cols-2">
              <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
                {renderAmountRows(earningsRows)}
                <div className="grid grid-cols-[minmax(0,1fr)_140px] bg-emerald-50 px-4 py-3 text-[13px]">
                  <span className="font-bold text-emerald-800">
                    Total earnings
                  </span>
                  <span className="text-right font-extrabold text-emerald-800">
                    {formatCurrency(totalEarnings)}
                  </span>
                </div>
              </div>
              <div>
                {renderAmountRows(deductionRows)}
                <div className="grid grid-cols-[minmax(0,1fr)_140px] bg-rose-50 px-4 py-3 text-[13px]">
                  <span className="font-bold text-rose-800">
                    Total deductions
                  </span>
                  <span className="text-right font-extrabold text-rose-800">
                    {formatCurrency(totalDeductions)}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-3 border-t border-primary/15 bg-primary/5 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-[12px] font-semibold text-primary/70">
                  Net payable amount
                </p>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  Total earnings minus attendance and payroll deductions.
                </p>
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-primary">
                {formatCurrency(netPayable)}
              </p>
            </div>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h4 className="text-sm font-bold text-secondary">
                  Attendance summary
                </h4>
                <p className="text-[12px] font-medium text-slate-500">
                  These values are used to calculate payable salary for the
                  period.
                </p>
              </div>
              <p className="text-[12px] font-semibold text-slate-500">
                Payable {payableDays ?? "-"} / divisor{" "}
                {salaryDivisorDays ?? "-"} days
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {attendanceCards.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-md border px-3 py-3 text-center",
                    item.className,
                  )}
                >
                  <p className="text-[11px] font-bold">{item.label}</p>
                  <p className="mt-1 text-2xl font-extrabold">
                    {item.value ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {overrideReason.trim() ? (
            <section className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-[12px] font-bold text-amber-900">
                Amendment reason
              </p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-amber-800">
                {overrideReason.trim()}
              </p>
            </section>
          ) : null}

          <div className="grid gap-4 border-t border-slate-200 pt-5 text-[12px] font-semibold text-slate-500 md:grid-cols-3">
            <div>
              <p className="text-slate-400">Prepared by</p>
              <p className="mt-1 text-slate-700">Payroll admin</p>
            </div>
            <div>
              <p className="text-slate-400">Employee acknowledgment</p>
              <p className="mt-1 text-slate-700">Available after finalization</p>
            </div>
            <div className="md:text-right">
              <p className="text-slate-400">System note</p>
              <p className="mt-1 text-slate-700">
                Official PDF is generated after finalization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RunPayrollResponse {
  data?: {
    meta?: {
      skippedPaidCount?: number;
    };
  };
}

export const HrPayrollPanel: React.FC<{
  year: number;
  month: number;
  setYear: (y: number) => void;
  setMonth: (m: number) => void;
  payrollRecords: any[];
  employees: PayrollEmployeeOptionSource[];
  isLoading: boolean;
  mutations: any;
}> = ({
  year,
  month,
  setYear,
  setMonth,
  payrollRecords,
  employees,
  mutations,
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const permission = usePermission("payroll");
  const isPayrollAdministrator = ["SUPER_ADMIN", "ADMIN", "HR", "SALES_MANAGER"].includes(
    currentUser?.role ?? "",
  );
  const canRunPayroll = isPayrollAdministrator && permission.canCreate;
  const canUpdatePayroll = isPayrollAdministrator && permission.canUpdate;
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterDesignation, setFilterDesignation] = useState<string>("all");
  const [filterMinSalary, setFilterMinSalary] = useState<string>("");
  const [filterMaxSalary, setFilterMaxSalary] = useState<string>("");
  const [filterAttendanceStatus, setFilterAttendanceStatus] =
    useState<string>("all");

  const [draftMonth, setDraftMonth] = useState(month);
  const [draftYear, setDraftYear] = useState(year);
  const [runPayrollScope, setRunPayrollScope] = useState<"all" | "employee">(
    "all",
  );
  const [runPayrollEmployeeId, setRunPayrollEmployeeId] = useState("");
  const [rerunExistingPayroll, setRerunExistingPayroll] = useState(false);

  const [runPayrollModalOpen, setRunPayrollModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [processModalEntry, setProcessModalEntry] = useState<any | null>(null);
  const [processModalMode, setProcessModalMode] = useState<"edit" | "preview">(
    "edit",
  );
  const [savingProcessNetSalary, setSavingProcessNetSalary] = useState(false);

  const [processIncentiveInput, setProcessIncentiveInput] =
    useState<string>("");
  const [processPfInput, setProcessPfInput] = useState<string>("");
  const [processCalculatedSalaryInput, setProcessCalculatedSalaryInput] =
    useState<string>("");
  const [processOverrideReason, setProcessOverrideReason] =
    useState<string>("");

  React.useEffect(() => {
    if (processModalEntry) {
      setProcessIncentiveInput(String(processModalEntry.adjustment || "0"));
      const pfAmount = Number(processModalEntry.pfAmount || 0);
      setProcessPfInput(String(processModalEntry.pfAmount || "0"));
      const calculated =
        Number(processModalEntry.netPay || 0) -
        Number(processModalEntry.adjustment || 0) +
        pfAmount;
      setProcessCalculatedSalaryInput(
        calculated.toFixed(2).replace(/\.00$/, ""),
      );
      setProcessOverrideReason("");
      setProcessModalMode("edit");
    }
  }, [processModalEntry]);
  const processIncentiveBreakdown = (processModalEntry?.incentiveBreakdown ??
    {}) as PayrollIncentiveBreakdown;
  const includedIncentives = processIncentiveBreakdown.included ?? [];
  const pendingIncentives = processIncentiveBreakdown.pending ?? [];

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const years = [2024, 2025, 2026, 2027];

  const previewPayPeriod = processModalEntry
    ? `${months[Number(processModalEntry.month ?? month) - 1]} ${
        processModalEntry.year ?? year
      }`
    : "";
  const previewBaseSalary = processModalEntry
    ? Number(processModalEntry.basicSalary || 0) +
      Number(processModalEntry.allowances || 0)
    : 0;
  const previewDeductions = processModalEntry
    ? Number(processModalEntry.deductions || 0)
    : 0;
  const previewIncentive = Number(processIncentiveInput || 0);
  const previewPfAmount = Number(processPfInput || 0);
  const previewNetPayable =
    Number(processCalculatedSalaryInput || 0) +
    previewIncentive -
    previewPfAmount;
  const previewDesignation =
    processModalEntry?.employee?.employeeProfile?.designation || "Team Member";
  const previewTeamName =
    processModalEntry?.employee?.employeeProfile?.team?.name ||
    processModalEntry?.employee?.ledTeam?.name ||
    "No team assigned";

  const syncDraftPeriod = () => {
    setDraftMonth(month);
    setDraftYear(year);
    setRunPayrollScope("all");
    setRunPayrollEmployeeId("");
    setRerunExistingPayroll(false);
  };

  const stats = useMemo(() => {
    const totalPayout = payrollRecords.reduce(
      (acc, curr) => acc + Number(curr.netPay || 0),
      0,
    );
    const totalIncentives = payrollRecords.reduce(
      (acc, curr) => acc + Number(curr.adjustment || 0),
      0,
    );
    const totalDeductions = payrollRecords.reduce(
      (acc, curr) =>
        acc + Number(curr.deductions || 0) + Number(curr.pfAmount || 0),
      0,
    );
    const processedCount = payrollRecords.filter(
      (entry) => entry.status === "Paid",
    ).length;

    return [
      {
        title: "Total Net Payout",
        value: formatCurrency(totalPayout),
        subtitle: "+2.4% Trend",
        icon: TrendingUp,
        tone: "bg-green-50 text-success",
      },
      {
        title: "Incentives",
        value: formatCurrency(totalIncentives),
        subtitle: "+5.1% Growth",
        icon: CircleDollarSign,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        title: "Deductions",
        value: formatCurrency(totalDeductions),
        subtitle: "Tax & PF",
        icon: TrendingDown,
        tone: "bg-amber-50 text-amber-600",
      },
      {
        title: "Progress",
        value: `${processedCount}/${payrollRecords.length}`,
        subtitle:
          processedCount === payrollRecords.length && payrollRecords.length > 0
            ? "All Processed"
            : "Pending rows",
        icon: RefreshCw,
        tone: "bg-red-50 text-red-600",
      },
    ];
  }, [payrollRecords]);

  const designations = useMemo(() => {
    const des = new Set(
      payrollRecords
        .map((e) => e.employee?.employeeProfile?.designation)
        .filter(Boolean),
    );
    return Array.from(des) as string[];
  }, [payrollRecords]);

  const payrollEmployeeOptions = useMemo(
    () =>
      employees
        .filter((employee) => employee?.id && employee?.employeeProfile)
        .map((employee) => ({
          id: employee.id,
          label: employee.fullName || employee.email || "Unnamed employee",
          detail:
            employee.employeeProfile?.designation ||
            (employee.role === "SALES_AGENT"
              ? "Sales Executive"
              : employee.role),
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [employees],
  );

  const filteredData = useMemo(() => {
    return payrollRecords.filter((entry) => {
      const name = entry.employee?.fullName || "";
      const email = entry.employee?.email || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        entry.status.toUpperCase() === filterStatus.toUpperCase();

      const matchesDesignation =
        filterDesignation === "all" ||
        entry.employee?.employeeProfile?.designation === filterDesignation;

      const netSal = Number(entry.netPay || 0);
      const minSal = filterMinSalary === "" ? 0 : Number(filterMinSalary);
      const maxSal =
        filterMaxSalary === "" ? Infinity : Number(filterMaxSalary);
      const matchesSalary = netSal >= minSal && netSal <= maxSal;

      const pDays = Number(entry.presentDays || 0);
      const wDays = Number(entry.salaryDivisorDays || entry.payableDays || 0);
      const matchesAttendance =
        filterAttendanceStatus === "all" ||
        (filterAttendanceStatus === "full" && pDays >= wDays - 2) ||
        (filterAttendanceStatus === "low" && pDays < wDays / 2);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDesignation &&
        matchesSalary &&
        matchesAttendance
      );
    });
  }, [
    filterStatus,
    payrollRecords,
    searchQuery,
    filterDesignation,
    filterMinSalary,
    filterMaxSalary,
    filterAttendanceStatus,
  ]);

  const handleRunPayroll = async () => {
    if (!canRunPayroll) return;
    if (runPayrollScope === "employee" && !runPayrollEmployeeId) {
      toast.error("Select an employee before running payroll.");
      return;
    }
    mutations.runPayroll.mutate(
      {
        year: draftYear,
        month: draftMonth,
        rerun: rerunExistingPayroll,
        ...(runPayrollScope === "employee"
          ? { employeeId: runPayrollEmployeeId }
          : {}),
      },
      {
        onSuccess: (response: RunPayrollResponse) => {
          const skippedPaidCount = Number(
            response?.data?.meta?.skippedPaidCount ?? 0,
          );
          toast.success(
            `${
              rerunExistingPayroll
                ? "Payroll rerun completed"
                : "Payroll is ready for processing"
            } for ${months[draftMonth - 1]} ${draftYear}${
              skippedPaidCount
                ? ` · ${skippedPaidCount} paid row(s) skipped`
                : ""
            }`,
          );
          setYear(draftYear);
          setMonth(draftMonth);
          setRunPayrollModalOpen(false);
        },
        onError: (error: any) => {
          toast.error(error.response?.data?.message ?? "Unable to run payroll");
        },
      },
    );
  };

  const buildPayrollProcessPayload = () => {
    if (!processModalEntry) return;

    const nextAdjustment = Number(processIncentiveInput || 0);
    const nextPfAmount = Number(processPfInput || 0);
    const nextBaseSalary = Number(processCalculatedSalaryInput || 0);
    const nextNetPay = nextAdjustment + nextBaseSalary - nextPfAmount;

    if (nextPfAmount < 0) {
      toast.error("PF amount cannot be negative.");
      return null;
    }

    if (nextNetPay < 0) {
      toast.error("Net payable cannot be negative.");
      return null;
    }

    const amountChanged =
      nextAdjustment !== Number(processModalEntry.adjustment || 0) ||
      nextPfAmount !== Number(processModalEntry.pfAmount || 0) ||
      nextNetPay !== Number(processModalEntry.netPay || 0);

    if (amountChanged && processOverrideReason.trim().length === 0) {
      toast.error("Add a reason before changing payroll amounts.");
      return null;
    }

    return {
      amountChanged,
      nextAdjustment,
      nextPfAmount,
      nextBaseSalary,
      nextNetPay,
      data: {
        adjustment: nextAdjustment,
        pfAmount: nextPfAmount,
        netPay: nextNetPay,
        ...(amountChanged
          ? {
              manualOverrideReason: processOverrideReason.trim(),
              pfOverrideReason: processOverrideReason.trim(),
            }
          : {}),
      },
    };
  };

  const handleSaveDraft = () => {
    if (!canUpdatePayroll) return;
    if (!processModalEntry || processModalEntry.status !== "Draft") return;

    const payload = buildPayrollProcessPayload();
    if (!payload) return;

    setSavingProcessNetSalary(true);
    mutations.updatePayrollDraft.mutate(
      {
        id: processModalEntry.id,
        data: payload.data,
      },
      {
        onSuccess: (response: any) => {
          const updatedEntry = response?.data ?? response;
          setProcessModalEntry((entry: any) =>
            entry
              ? {
                  ...entry,
                  ...updatedEntry,
                  adjustment: payload.nextAdjustment,
                  pfAmount: payload.nextPfAmount,
                  netPay: payload.nextNetPay,
                }
              : entry,
          );
          setProcessOverrideReason("");
          toast.success("Draft payslip amendments saved.");
          setSavingProcessNetSalary(false);
        },
        onError: (error: any) => {
          toast.error(
            error.response?.data?.message ?? "Failed to save payroll draft",
          );
          setSavingProcessNetSalary(false);
        },
      },
    );
  };

  const handlePreviewDraft = () => {
    if (!processModalEntry) return;
    if (processModalEntry.status === "Draft" && !buildPayrollProcessPayload()) {
      return;
    }
    setProcessModalMode("preview");
  };

  const handleProcessEntry = async () => {
    if (!canUpdatePayroll) return;
    if (!processModalEntry) return;

    setSavingProcessNetSalary(true);
    if (processModalEntry.status === "Draft") {
      const payload = buildPayrollProcessPayload();
      if (!payload) {
        setSavingProcessNetSalary(false);
        return;
      }
      mutations.finalizePayroll.mutate(
        {
          id: processModalEntry.id,
          data: payload.data,
        },
        {
          onSuccess: () => {
            toast.success(
              `Finalized payslip for ${processModalEntry.employee?.fullName}`,
            );
            setProcessModalEntry(null);
            setSavingProcessNetSalary(false);
          },
          onError: () => {
            toast.error("Failed to finalize payroll");
            setSavingProcessNetSalary(false);
          },
        },
      );
    } else if (processModalEntry.status === "Finalized") {
      mutations.payPayroll.mutate(processModalEntry.id, {
        onSuccess: () => {
          toast.success(
            `Marked as paid for ${processModalEntry.employee?.fullName}`,
          );
          setProcessModalEntry(null);
          setSavingProcessNetSalary(false);
        },
        onError: () => {
          toast.error("Failed to mark as paid");
          setSavingProcessNetSalary(false);
        },
      });
    } else {
      setSavingProcessNetSalary(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in zoom-in-95 duration-300">
      {/* 🏛️ ENTERPRISE HEADER */}
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary">
            Payroll Management
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Institutional salary disbursement, incentives, and net payouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-primary/10 bg-white p-0.5 shadow-sm">
            <div className="flex items-center px-2 py-1.5 text-primary/40">
              <Calendar className="h-4 w-4" />
            </div>
            <SearchableSelect
              value={String(month)}
              onValueChange={(value) => setMonth(Number(value))}
              options={months.map((m, index) => ({
                value: String(index + 1),
                label: m,
              }))}
              placeholder="Month"
              searchPlaceholder="Search month..."
              className="h-8 w-[132px] border-0 bg-transparent py-1.5 pl-1 pr-2 text-sm font-bold text-primary hover:bg-transparent"
              contentClassName="min-w-[180px]"
            />
            <div className="h-4 w-px bg-primary/10" />
            <SearchableSelect
              value={String(year)}
              onValueChange={(value) => setYear(Number(value))}
              options={years.map((y) => ({
                value: String(y),
                label: String(y),
              }))}
              placeholder="Year"
              searchPlaceholder="Search year..."
              className="h-8 w-[96px] border-0 bg-transparent py-1.5 pl-3 pr-2 text-sm font-bold text-primary hover:bg-transparent"
              contentClassName="min-w-[160px]"
            />
          </div>

          <div className="h-6 w-px bg-primary/5 mx-1 hidden sm:block" />

          {canUpdatePayroll ? <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-primary/20 bg-white px-5 py-2 text-sm font-bold text-primary shadow-sm transition-all hover:bg-primary/5 active:scale-95"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button> : null}

          {canRunPayroll ? <button
            onClick={() => {
              syncDraftPeriod();
              setRunPayrollModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            disabled={mutations.runPayroll.isPending}
          >
            <FileCheck className="h-4 w-4" />
            <span>
              {mutations.runPayroll.isPending ? "Running..." : "Run Payroll"}
            </span>
          </button> : null}
        </div>
      </section>

      {/* 📊 ANALYTICS WIDGETS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <HrStatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* 🔍 ENTERPRISE FILTER SYSTEM */}
      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
        <div className="border-b border-zinc-100 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search by name, email or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-md border border-zinc-200 bg-zinc-50/50 py-2 pl-9 pr-4 text-[13px] font-medium outline-none transition-all focus:border-zinc-300 focus:bg-white"
                />
              </div>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-semibold transition-all border",
                  showAdvancedFilters
                    ? "bg-primary border-primary text-white"
                    : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50",
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filters</span>
                <ChevronDown
                  className={cn(
                    "h-3 w-3 transition-transform",
                    showAdvancedFilters && "rotate-180",
                  )}
                />
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50/50 p-0.5">
              {["all", "DRAFT", "FINALIZED", "PAID"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-[12px] font-bold transition-all",
                    filterStatus === status
                      ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200"
                      : "text-zinc-500 hover:text-zinc-700",
                  )}
                >
                  {status === "all"
                    ? "All"
                    : status.charAt(0) + status.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-in-out",
              showAdvancedFilters
                ? "max-h-[500px] opacity-100 mt-4"
                : "max-h-0 opacity-0",
            )}
          >
            <div className="grid grid-cols-1 gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Position
                </label>
                <SearchableSelect
                  value={filterDesignation}
                  onValueChange={setFilterDesignation}
                  options={[
                    { value: "all", label: "All Positions" },
                    ...designations.map((designation) => ({
                      value: designation,
                      label: designation,
                    })),
                  ]}
                  placeholder="All Positions"
                  searchPlaceholder="Search position..."
                  noOptionsText="No position found"
                  className="h-9 w-full rounded-md border-zinc-200 bg-white text-[13px] font-semibold text-zinc-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Payable Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filterMinSalary}
                    onChange={(e) => setFilterMinSalary(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-zinc-900 outline-none focus:border-zinc-300"
                  />
                  <span className="text-zinc-300">/</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filterMaxSalary}
                    onChange={(e) => setFilterMaxSalary(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-zinc-900 outline-none focus:border-zinc-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Eligibility
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setFilterAttendanceStatus(
                        filterAttendanceStatus === "full" ? "all" : "full",
                      )
                    }
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-all border",
                      filterAttendanceStatus === "full"
                        ? "bg-primary border-primary text-white"
                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50",
                    )}
                  >
                    Full Att.
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end border-t border-zinc-100 pt-3">
              <button
                onClick={() => {
                  setFilterDesignation("all");
                  setFilterMinSalary("");
                  setFilterMaxSalary("");
                  setFilterAttendanceStatus("all");
                  setSearchQuery("");
                  setFilterStatus("all");
                }}
                className="flex items-center gap-1.5 text-[12px] font-bold text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-3 w-3" />
                Reset all filters
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 text-[11px] font-extrabold text-secondary">
              <tr>
                <th className="px-4 py-3 min-w-[180px]">Employee</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Base Salary</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Incentive</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net Payable</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/20">
                      <History className="mb-4 h-10 w-10 text-zinc-200" />
                      <p className="text-[13px] font-bold text-zinc-400 uppercase tracking-wider">
                        No payroll records found
                      </p>
                      <button
                        onClick={() => setSearchQuery("")}
                        className="mt-2 text-[12px] font-semibold text-primary hover:underline"
                      >
                        Clear search and filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 min-w-[180px]">
                      <HrEmployeeIdentityCell
                        fullName={entry.employee?.fullName}
                        email={entry.employee?.email}
                        image={
                          entry.employee?.avatarStorageKey ||
                          entry.employee?.image
                        }
                        href={`/admin/employees/${entry.employeeId}`}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-medium text-zinc-600">
                        {entry.employee?.employeeProfile?.designation ||
                          "Staff"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-[13px] font-semibold text-zinc-900">
                        {formatCurrency(
                          Number(entry.basicSalary || 0) +
                            Number(entry.allowances || 0),
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="flex h-1.5 w-16 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full bg-emerald-500"
                            style={{
                              width: `${Math.min(
                                (Number(entry.presentDays) /
                                  Number(
                                    entry.salaryDivisorDays ||
                                      entry.payableDays ||
                                      1,
                                  )) *
                                  100,
                                100,
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-zinc-400">
                          {entry.presentDays}d
                        </span>
                      </div>
                      <p className="mt-1 text-center text-[11px] font-medium text-zinc-400">
                        Payable {entry.payableDays}d · divisor{" "}
                        {entry.salaryDivisorDays ?? entry.payableDays}d
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-[13px] font-semibold text-emerald-600">
                        +{formatCurrency(Number(entry.adjustment || 0))}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-zinc-400">
                        Manual / Bonus
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-[13px] font-semibold text-rose-600">
                        -
                        {formatCurrency(
                          Number(entry.deductions || 0) +
                            Number(entry.pfAmount || 0),
                        )}
                      </p>
                      {Number(entry.pfAmount || 0) > 0 ? (
                        <p className="mt-1 text-[11px] font-medium text-zinc-400">
                          Includes PF {formatCurrency(Number(entry.pfAmount))}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-sm font-bold text-zinc-900 tabular-nums">
                        {formatCurrency(Number(entry.netPay || 0))}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                          entry.status === "Paid"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
                            : entry.status === "Finalized"
                            ? "bg-amber-50 text-amber-700 ring-amber-600/10"
                            : "bg-zinc-50 text-zinc-600 ring-zinc-500/10",
                        )}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canUpdatePayroll && entry.status === "Draft" ? (
                          <button
                            onClick={() => setProcessModalEntry(entry)}
                            className="rounded-md p-1.5 transition-all text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                            title="Finalize"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        ) : canUpdatePayroll && entry.status === "Finalized" ? (
                          <button
                            onClick={() => setProcessModalEntry(entry)}
                            className="rounded-md p-1.5 transition-all text-amber-500 hover:bg-amber-50 hover:text-amber-700"
                            title="Mark as Paid"
                          >
                            <FileCheck className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={canRunPayroll && runPayrollModalOpen} onOpenChange={setRunPayrollModalOpen}>
        <DialogContent className="max-w-md rounded-xl border border-zinc-200 bg-white p-0 shadow-xl">
          <div className="px-6 py-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-xl font-bold tracking-tight text-zinc-900">
                Run Payroll
              </DialogTitle>
              <DialogDescription className="text-[13px] font-medium leading-relaxed text-zinc-500">
                Finalize calculations and prepare payslips for the selected
                period. This will enable row-level processing.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Month
                </label>
                <SearchableSelect
                  value={draftMonth}
                  onValueChange={(value) => setDraftMonth(Number(value))}
                  options={months.map((m, index) => ({
                    value: String(index + 1),
                    label: m,
                  }))}
                  placeholder="Select month"
                  searchPlaceholder="Search month..."
                  className="h-10 rounded-md border-zinc-200 bg-white text-[13px] font-semibold text-zinc-900"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Year
                </label>
                <SearchableSelect
                  value={draftYear}
                  onValueChange={(value) => setDraftYear(Number(value))}
                  options={years.map((y) => ({
                    value: String(y),
                    label: String(y),
                  }))}
                  placeholder="Select year"
                  searchPlaceholder="Search year..."
                  className="h-10 rounded-md border-zinc-200 bg-white text-[13px] font-semibold text-zinc-900"
                />
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-md border border-zinc-200 bg-zinc-50/60 p-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Payroll scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRunPayrollScope("all");
                      setRunPayrollEmployeeId("");
                    }}
                    className={cn(
                      "rounded-md border px-3 py-2 text-[13px] font-bold transition-all",
                      runPayrollScope === "all"
                        ? "border-primary bg-primary text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                    )}
                  >
                    All employees
                  </button>
                  <button
                    type="button"
                    onClick={() => setRunPayrollScope("employee")}
                    className={cn(
                      "rounded-md border px-3 py-2 text-[13px] font-bold transition-all",
                      runPayrollScope === "employee"
                        ? "border-primary bg-primary text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                    )}
                  >
                    Specific employee
                  </button>
                </div>
              </div>

              {runPayrollScope === "employee" ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Employee
                  </label>
                  <SearchableSelect
                    value={runPayrollEmployeeId}
                    onValueChange={setRunPayrollEmployeeId}
                    options={payrollEmployeeOptions.map((employee) => ({
                      value: employee.id,
                      label: employee.label,
                      description: employee.detail,
                    }))}
                    placeholder="Select employee"
                    searchPlaceholder="Search employee..."
                    noOptionsText="No employees found."
                    className="w-full rounded-md border-zinc-200 bg-white text-[13px] font-semibold text-zinc-900 focus:border-zinc-300"
                  />
                </div>
              ) : null}

              <label className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                <input
                  type="checkbox"
                  checked={rerunExistingPayroll}
                  onChange={(e) => setRerunExistingPayroll(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-primary"
                />
                <span>
                  Run again and recalculate existing Draft/Finalized rows. Paid
                  rows are protected and will be skipped.
                </span>
              </label>
            </div>

            <div className="mt-8 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setRunPayrollModalOpen(false)}
                disabled={mutations.runPayroll.isPending}
                className="h-10 rounded-md shadow-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRunPayroll}
                disabled={
                  mutations.runPayroll.isPending ||
                  (runPayrollScope === "employee" && !runPayrollEmployeeId)
                }
                className="h-10 rounded-md shadow-none px-6"
              >
                {mutations.runPayroll.isPending
                  ? "Processing..."
                  : rerunExistingPayroll
                  ? "Run Payroll Again"
                  : "Run Payroll"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canUpdatePayroll && Boolean(processModalEntry)}
        onOpenChange={(open) => !open && setProcessModalEntry(null)}
      >
        <DialogContent className="!w-[calc(100vw-32px)] !max-w-[1180px] p-0 border-none bg-transparent shadow-none !rounded-none">
          <div className="flex max-h-[calc(100vh-32px)] overflow-hidden !rounded-md flex-col border border-primary/20 bg-white p-0">
            <div className="shrink-0 border-b border-primary/10 bg-[#FCF6F6] px-5 py-4 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-white text-primary shadow-sm">
                  <Calculator className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="font-headline text-xl font-semibold tracking-tight text-primary">
                    Process payroll entry
                  </DialogTitle>
                  <DialogDescription className="mt-1.5 text-[13px] font-medium leading-relaxed text-primary/70">
                    Amend the draft, preview the payslip, then finalize only
                    when the numbers are correct.
                  </DialogDescription>
                </div>
              </div>
            </div>

            {processModalEntry && (
              <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="flex items-center gap-4 rounded-md border border-zinc-100 bg-zinc-50/50 p-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    {(processModalEntry.employee?.avatarStorageKey ||
                      processModalEntry.employee?.image) && (
                      <AvatarImage
                        src={
                          processModalEntry.employee.avatarStorageKey ||
                          processModalEntry.employee.image
                        }
                        alt={processModalEntry.employee.fullName || ""}
                      />
                    )}
                    <AvatarFallback className="bg-slate-100 text-slate-400">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-zinc-900">
                      {processModalEntry.employee?.fullName}
                    </p>
                    <p className="truncate text-[12px] font-medium text-zinc-400 uppercase tracking-wider">
                      {getDisplayEmployeeId(processModalEntry.employeeId)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    {
                      label: "Present",
                      value: processModalEntry.presentDays,
                      color: "text-emerald-600",
                    },
                    {
                      label: "Absent",
                      value: processModalEntry.unpaidDays,
                      color: "text-rose-600",
                    },
                    {
                      label: "Holiday",
                      value: processModalEntry.holidayDays,
                      color: "text-blue-600",
                    },
                    {
                      label: "Leave",
                      value: processModalEntry.paidLeaveDays,
                      color: "text-amber-600",
                    },
                    {
                      label: "Payable",
                      value: processModalEntry.payableDays,
                      color: "text-primary",
                    },
                    {
                      label: "Divisor",
                      value:
                        processModalEntry.salaryDivisorDays ??
                        processModalEntry.payableDays,
                      color: "text-slate-600",
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="text-center rounded-md bg-zinc-50/50 p-2 border border-zinc-100"
                    >
                      <p className="text-[11px] font-semibold text-zinc-600">
                        {stat.label}
                      </p>
                      <p
                        className={cn("mt-1 text-sm font-semibold", stat.color)}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {processModalEntry.status === "Draft" ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-100 bg-zinc-50/70 p-1">
                    {[
                      { id: "edit", label: "1. Amend draft" },
                      { id: "preview", label: "2. Preview payslip" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          item.id === "preview"
                            ? handlePreviewDraft()
                            : setProcessModalMode("edit")
                        }
                        className={cn(
                          "h-9 rounded-md px-4 text-[12px] font-bold transition-colors",
                          processModalMode === item.id
                            ? "bg-white text-primary shadow-sm ring-1 ring-zinc-200"
                            : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900",
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                    <p className="ml-auto px-3 text-[12px] font-medium text-zinc-500">
                      Drafts can be saved without generating the payslip.
                    </p>
                  </div>
                ) : null}

                {processModalMode === "preview" &&
                processModalEntry.status === "Draft" ? (
                  <PayslipPdfPreview
                    employeeName={processModalEntry.employee?.fullName}
                    payPeriod={previewPayPeriod}
                    designation={previewDesignation}
                    teamName={previewTeamName}
                    payableDays={processModalEntry.payableDays}
                    salaryDivisorDays={
                      processModalEntry.salaryDivisorDays ??
                      processModalEntry.payableDays
                    }
                    baseSalary={previewBaseSalary}
                    deductions={previewDeductions}
                    pfAmount={previewPfAmount}
                    incentive={previewIncentive}
                    netPayable={previewNetPayable}
                    presentDays={processModalEntry.presentDays}
                    unpaidDays={processModalEntry.unpaidDays}
                    holidayDays={processModalEntry.holidayDays}
                    paidLeaveDays={processModalEntry.paidLeaveDays}
                    overrideReason={processOverrideReason}
                  />
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-md border border-zinc-100 bg-white p-3">
                          <p className="text-[12px] font-semibold text-zinc-600">
                            Incentive Amount
                          </p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={processIncentiveInput}
                            onChange={(e) =>
                              setProcessIncentiveInput(e.target.value)
                            }
                            placeholder="0.00"
                            disabled={
                              savingProcessNetSalary ||
                              processModalEntry.status === "Paid"
                            }
                            className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-amber-600 outline-none transition-colors focus:border-zinc-300 disabled:opacity-60"
                          />
                        </div>
                        <div className="rounded-md border border-zinc-100 bg-white p-3">
                          <p className="text-[12px] font-semibold text-zinc-600">
                            PF Amount
                          </p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={processPfInput}
                            onChange={(e) => setProcessPfInput(e.target.value)}
                            placeholder="0.00"
                            disabled={
                              savingProcessNetSalary ||
                              processModalEntry.status === "Paid"
                            }
                            className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-rose-600 outline-none transition-colors focus:border-zinc-300 disabled:opacity-60"
                          />
                        </div>
                        <div className="rounded-md border border-zinc-100 bg-white p-3">
                          <p className="text-[12px] font-semibold text-zinc-600">
                            Calculated Salary
                          </p>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={processCalculatedSalaryInput}
                            onChange={(e) =>
                              setProcessCalculatedSalaryInput(e.target.value)
                            }
                            disabled={
                              savingProcessNetSalary ||
                              processModalEntry.status === "Paid"
                            }
                            className="mt-2 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 outline-none transition-colors focus:border-zinc-300 disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-md border border-emerald-100 bg-emerald-50/40 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[12px] font-semibold text-emerald-800">
                                Included in this payslip
                              </p>
                              <p className="mt-1 text-[12px] font-medium text-emerald-700/80">
                                Approved and finalized booking incentives.
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-emerald-700">
                                {formatCurrency(
                                  Number(
                                    processIncentiveBreakdown.includedTotal ??
                                      0,
                                  ),
                                )}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-emerald-700/70">
                                {includedIncentives.length} item
                                {includedIncentives.length === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {includedIncentives.length ? (
                              includedIncentives.slice(0, 3).map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-md border border-emerald-100 bg-white px-3 py-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-[12px] font-semibold text-zinc-900">
                                        {item.title}
                                      </p>
                                      <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">
                                        {incentiveSourceLabel(item)}
                                      </p>
                                    </div>
                                    <p className="shrink-0 text-[12px] font-bold text-emerald-700">
                                      {formatCurrency(Number(item.amount || 0))}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="rounded-md border border-dashed border-emerald-100 bg-white px-3 py-3 text-[12px] font-medium text-emerald-700/80">
                                No approved incentives are included for this
                                payroll month.
                              </p>
                            )}
                            {includedIncentives.length > 3 ? (
                              <p className="text-[11px] font-semibold text-emerald-700">
                                +{includedIncentives.length - 3} more included
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-md border border-amber-100 bg-amber-50/50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[12px] font-semibold text-amber-900">
                                Promised, not paid yet
                              </p>
                              <p className="mt-1 text-[12px] font-medium text-amber-800/80">
                                Pending incentives stay out of payroll.
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-amber-800">
                                {formatCurrency(
                                  Number(
                                    processIncentiveBreakdown.pendingTotal ?? 0,
                                  ),
                                )}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-amber-800/70">
                                {pendingIncentives.length} item
                                {pendingIncentives.length === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {pendingIncentives.length ? (
                              pendingIncentives.slice(0, 3).map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-md border border-amber-100 bg-white px-3 py-2"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-[12px] font-semibold text-zinc-900">
                                        {item.title}
                                      </p>
                                      <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-500">
                                        {incentiveSourceLabel(item)}
                                      </p>
                                    </div>
                                    <p className="shrink-0 text-[12px] font-bold text-amber-800">
                                      {formatCurrency(Number(item.amount || 0))}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="rounded-md border border-dashed border-amber-100 bg-white px-3 py-3 text-[12px] font-medium text-amber-800/80">
                                No pending promised incentives for this payroll
                                month.
                              </p>
                            )}
                            {pendingIncentives.length > 3 ? (
                              <p className="text-[11px] font-semibold text-amber-800">
                                +{pendingIncentives.length - 3} more pending
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-zinc-100 bg-white p-3">
                        <label
                          htmlFor="payroll-override-reason"
                          className="text-[12px] font-semibold text-zinc-600"
                        >
                          Override reason
                        </label>
                        <Textarea
                          id="payroll-override-reason"
                          value={processOverrideReason}
                          onChange={(event) =>
                            setProcessOverrideReason(event.target.value)
                          }
                          placeholder="Required only if you change incentive, PF, or calculated salary."
                          disabled={
                            savingProcessNetSalary ||
                            processModalEntry.status === "Paid"
                          }
                          className="mt-2 min-h-[112px] rounded-md shadow-none"
                        />
                      </div>
                    </div>

                    <aside className="space-y-3">
                      <div className="rounded-md border-2 border-primary/10 bg-primary/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary/60">
                              Net Payable Amount
                            </p>
                            <p className="mt-1 text-2xl font-bold text-primary">
                              Rs.{" "}
                              {(
                              Number(processIncentiveInput || 0) +
                                Number(processCalculatedSalaryInput || 0) -
                                Number(processPfInput || 0)
                              ).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <CircleDollarSign className="h-5 w-5" />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-zinc-100 bg-zinc-50/50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">
                            Original Net Payable
                          </span>
                          <span className="text-[16px] font-bold text-zinc-900">
                            {formatCurrency(Number(processModalEntry.netPay))}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">
                            PF Amount
                          </span>
                          <span className="text-[13px] font-semibold text-rose-600">
                            -{formatCurrency(Number(processPfInput || 0))}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">
                            Current Status
                          </span>
                          <span className="text-[13px] font-semibold text-zinc-900">
                            {processModalEntry.status}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-4">
                          <span className="text-[12px] font-semibold uppercase tracking-wider text-zinc-400">
                            Salary divisor
                          </span>
                          <span className="text-[13px] font-semibold text-zinc-900">
                            {String(
                              processModalEntry.salaryDivisorDays ??
                                processModalEntry.payableDays ??
                                "-",
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                        <p className="font-semibold">Next action</p>
                        <p className="mt-0.5">
                          {processModalEntry.status === "Draft" &&
                            "This will finalize the payslip and lock the amounts. Manual edits will no longer be possible."}
                          {processModalEntry.status === "Finalized" &&
                            "This will mark the payroll as paid."}
                        </p>
                      </div>
                    </aside>
                  </div>
                )}

                <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-end gap-3 border-t border-zinc-100 bg-white px-5 py-4 sm:-mx-6 sm:px-6">
                  <Button
                    variant="outline"
                    onClick={() => setProcessModalEntry(null)}
                    disabled={savingProcessNetSalary}
                    className="h-10 rounded-md shadow-none"
                  >
                    Cancel
                  </Button>
                  {processModalEntry?.status === "Draft" &&
                  processModalMode === "edit" ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleSaveDraft}
                        disabled={savingProcessNetSalary}
                        className="h-10 rounded-md shadow-none px-5"
                      >
                        {savingProcessNetSalary ? "Saving..." : "Save draft"}
                      </Button>
                      <Button
                        onClick={handlePreviewDraft}
                        disabled={savingProcessNetSalary}
                        className="h-10 rounded-md shadow-none px-6"
                      >
                        Preview payslip
                      </Button>
                    </>
                  ) : (
                    <>
                      {processModalEntry?.status === "Draft" ? (
                        <Button
                          variant="outline"
                          onClick={() => setProcessModalMode("edit")}
                          disabled={savingProcessNetSalary}
                          className="h-10 rounded-md shadow-none px-5"
                        >
                          Edit values
                        </Button>
                      ) : null}
                      <Button
                        onClick={handleProcessEntry}
                        disabled={savingProcessNetSalary}
                        className="h-10 rounded-md shadow-none px-6"
                      >
                        {savingProcessNetSalary
                          ? "Processing..."
                          : processModalEntry?.status === "Draft"
                          ? "Finalize payslip"
                          : "Mark as paid"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PayrollSettingsModal
        isOpen={canUpdatePayroll && settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
};
