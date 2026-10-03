import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  PhoneCall,
  PhoneMissed,
  Timer,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  DatePicker,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";

import { api } from "../../../common/api";
import { useAppSelector } from "../../../store";
import { WorkspacePage } from "../../../components/layout/PageHeader";
import { DashboardHeader } from "../../admin/dashboard/DashboardHeader";
import { DashboardSidebar } from "../../admin/dashboard/DashboardSidebar";
import { telecallerSidebarItems } from "../dashboard/telecallerDashboardData";
import { fieldExecutiveSidebarItems } from "../../field-executive/fieldExecutiveData";

type PerformanceDatePreset = "today" | "this-week" | "this-month" | "custom";
type ExportFormat = "excel" | "pdf";

interface LeadPerformanceMetrics {
  totalLeads: number;
  newLeads: number;
  interestedLeads: number;
  followUps: number;
  bookingDone: number;
  lostLeads: number;
  leadBookingDoneRate: number;
}

interface LeadPerformanceResponse {
  meta: { label: string };
  summary: LeadPerformanceMetrics;
  charts: {
    dailyTrend: Array<{
      label: string;
      totalLeads: number;
      interestedLeads: number;
      bookingDone: number;
    }>;
  };
}

interface CallingMetrics {
  totalCalls: number;
  connectedCalls: number;
  notConnectedCalls: number;
  totalDurationLabel: string;
  callsPerHour: number;
  missedCalls: number;
  answerRate: number;
  leadContextCount: number;
}

interface CallingPerformanceResponse {
  meta: { label: string };
  summary: CallingMetrics;
  charts: {
    dailyTrend: Array<{ label: string; total: number; connected: number; missed: number }>;
    outcomeDistribution: Array<{ name: string; value: number }>;
  };
}

const chartColors = ["#083358", "#ff6600", "#2563eb", "#16a34a", "#f59e0b", "#dc2626"];
const referenceDate = new Date();

const toDateInputValue = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatRangeDate = (value: string) =>
  parseDateInput(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const getPresetRange = (preset: Exclude<PerformanceDatePreset, "custom">) => {
  const start = new Date(referenceDate);
  const end = new Date(referenceDate);
  if (preset === "this-week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  }
  if (preset === "this-month") start.setDate(1);
  return { from: toDateInputValue(start), to: toDateInputValue(end) };
};

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof PhoneCall;
  tone: string;
}) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-card)] border-border bg-white shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)]", tone)}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-extrabold text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-extrabold leading-none text-secondary">{value}</p>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TelecallerMyPerformanceScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<PerformanceDatePreset>("this-week");
  const [customDateFrom, setCustomDateFrom] = useState(() => getPresetRange("this-week").from);
  const [customDateTo, setCustomDateTo] = useState(() => getPresetRange("this-week").to);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  const activeRange = useMemo(
    () => datePreset === "custom" ? { from: customDateFrom, to: customDateTo } : getPresetRange(datePreset),
    [customDateFrom, customDateTo, datePreset],
  );
  const hasInvalidCustomRange = datePreset === "custom" && activeRange.from > activeRange.to;
  const dateRangeLabel = hasInvalidCustomRange
    ? "Choose a valid date range"
    : `${formatRangeDate(activeRange.from)} - ${formatRangeDate(activeRange.to)}`;

  const leadParams = useMemo(() => ({
    dateFrom: activeRange.from,
    dateTo: activeRange.to,
    preset: "custom",
  }), [activeRange.from, activeRange.to]);
  const callParams = useMemo(() => ({
    preset: "custom",
    dateFrom: activeRange.from,
    dateTo: activeRange.to,
    scope: "user",
    page: 1,
    limit: 1,
  }), [activeRange.from, activeRange.to]);

  const leadQuery = useQuery({
    queryKey: ["my-lead-performance", leadParams],
    enabled: !hasInvalidCustomRange,
    queryFn: async () => (await api.get<LeadPerformanceResponse>("/dashboard/my-performance", { params: leadParams })).data,
  });
  const callQuery = useQuery({
    queryKey: ["my-calling-performance", callParams],
    enabled: !hasInvalidCustomRange,
    queryFn: async () => (await api.get<CallingPerformanceResponse>("/dashboard/admin/calling-performance", { params: callParams })).data,
  });

  const isLoading = leadQuery.isLoading || callQuery.isLoading;
  const hasError = leadQuery.isError || callQuery.isError;
  const leads = leadQuery.data?.summary;
  const calls = callQuery.data?.summary;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    if (hasInvalidCustomRange || !leads || !calls) {
      toast.error("Wait for a valid performance range before exporting.");
      return;
    }
    try {
      setExportingFormat("excel");
      const workbook = XLSX.utils.book_new();
      const overview = XLSX.utils.aoa_to_sheet([
        ["My Performance Report"],
        ["Date range", leadQuery.data?.meta.label ?? dateRangeLabel],
        [],
        ["Lead performance"],
        ["Total leads", leads.totalLeads],
        ["New leads", leads.newLeads],
        ["Interested leads", leads.interestedLeads],
        ["Follow-ups", leads.followUps],
        ["Bookings done", leads.bookingDone],
        ["Lost leads", leads.lostLeads],
        ["Booking done rate", `${leads.leadBookingDoneRate}%`],
        [],
        ["Call performance"],
        ["Total calls", calls.totalCalls],
        ["Connected calls", calls.connectedCalls],
        ["Not connected", calls.notConnectedCalls],
        ["Missed calls", calls.missedCalls],
        ["Answer rate", `${calls.answerRate}%`],
        ["Calls per hour", calls.callsPerHour],
        ["Total duration", calls.totalDurationLabel],
      ]);
      XLSX.utils.book_append_sheet(workbook, overview, "Overview");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(leadQuery.data?.charts.dailyTrend ?? []), "Lead trend");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(callQuery.data?.charts.dailyTrend ?? []), "Call trend");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(callQuery.data?.charts.outcomeDistribution ?? []), "Call outcomes");
      XLSX.writeFile(workbook, `my-performance-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Lead and call performance Excel report downloaded.");
    } catch {
      toast.error("Could not download the performance Excel report.");
    } finally {
      setExportingFormat(null);
    }
  };

  const exportPdf = async () => {
    if (hasInvalidCustomRange) {
      toast.error("Choose a valid date range before exporting.");
      return;
    }
    try {
      setExportingFormat("pdf");
      const response = await api.get<Blob>("/dashboard/my-performance/report.pdf", {
        params: leadParams,
        responseType: "blob",
      });
      downloadBlob(new Blob([response.data], { type: "application/pdf" }), `my-lead-performance-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Lead performance PDF report downloaded.");
    } catch {
      toast.error("Could not download the lead performance PDF report.");
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <>
      <DashboardSidebar
        items={
          user?.role === "SALES_AGENT"
            ? fieldExecutiveSidebarItems
            : telecallerSidebarItems
        }
        collapsed={collapsed}
        onCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        activeItem="My Performance"
      />
      <DashboardHeader
          search="Search leads, customers, projects..."
          onSearchChange={() => {}}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={<span className="text-sm font-semibold text-foreground">My Performance</span>}
      />
      <WorkspacePage className="crm-main-scrollbar overflow-x-hidden">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-secondary">My Performance</h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Your live lead outcomes and calling activity for the selected range.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3 text-sm font-bold text-secondary">
                <CalendarIcon className="size-4 text-muted-foreground" />
                <span>{dateRangeLabel}</span>
              </div>
              <Select value={datePreset} onValueChange={(value) => setDatePreset(value as PerformanceDatePreset)}>
                <SelectTrigger className="h-10 w-[145px] rounded-[var(--radius-control)] font-bold shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this-week">This week</SelectItem>
                  <SelectItem value="this-month">This month</SelectItem>
                  <SelectItem value="custom">Custom date</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 rounded-[var(--radius-control)] shadow-none" disabled={exportingFormat !== null}>
                    <Download className="size-4" />
                    {exportingFormat ? "Preparing..." : "Export"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={exportExcel} disabled={exportingFormat !== null}>
                    <FileSpreadsheet className="size-4 text-emerald-700" />
                    Lead and call Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={exportPdf} disabled={exportingFormat !== null}>
                    <FileText className="size-4 text-primary" />
                    Lead performance PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </section>

          {datePreset === "custom" ? (
            <Card className="rounded-[var(--radius-card)] border-border bg-white p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2 xl:max-w-2xl">
                <DatePicker aria-label="Performance date from" value={customDateFrom} max={customDateTo} className="h-10" onChange={(event) => setCustomDateFrom(event.target.value)} />
                <DatePicker aria-label="Performance date to" value={customDateTo} min={customDateFrom} className="h-10" onChange={(event) => setCustomDateTo(event.target.value)} />
              </div>
              {hasInvalidCustomRange ? <p className="mt-2 text-xs font-bold text-destructive">The end date must be on or after the start date.</p> : null}
            </Card>
          ) : null}

          {isLoading ? <Card className="p-10 text-center text-sm font-semibold text-muted-foreground">Loading live performance...</Card> : null}
          {hasError ? <Card className="border-red-200 bg-red-50 p-10 text-center text-sm font-bold text-red-700">Could not load your performance data.</Card> : null}
          {!isLoading && !hasError && leads && calls ? (
            <>
              <section className="grid gap-4 xl:grid-cols-2">
                <Card className="rounded-[var(--radius-card)] border-border bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div><h2 className="text-base font-extrabold text-secondary">Lead Performance</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">Live lead movement and outcomes.</p></div>
                      <UsersRound className="size-5 text-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <MetricCard label="Total leads" value={leads.totalLeads} helper="In this range" icon={UsersRound} tone="bg-blue-50 text-blue-700" />
                      <MetricCard label="Interested" value={leads.interestedLeads} helper="Qualified interest" icon={TrendingUp} tone="bg-emerald-50 text-emerald-700" />
                      <MetricCard label="Follow-ups" value={leads.followUps} helper="Scheduled activity" icon={CalendarIcon} tone="bg-amber-50 text-amber-700" />
                      <MetricCard label="Bookings done" value={leads.bookingDone} helper={`${leads.leadBookingDoneRate}% conversion`} icon={CheckCircle2} tone="bg-orange-50 text-primary" />
                      <MetricCard label="New leads" value={leads.newLeads} helper="Added in range" icon={UsersRound} tone="bg-slate-100 text-slate-700" />
                      <MetricCard label="Lost leads" value={leads.lostLeads} helper="Closed lost" icon={PhoneMissed} tone="bg-red-50 text-red-700" />
                    </div>
                    <div className="mt-5 h-56">
                      <ResponsiveContainer width="100%" height="100%"><BarChart data={leadQuery.data.charts.dailyTrend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="totalLeads" name="Leads" fill="#083358" radius={[4, 4, 0, 0]} /><Bar dataKey="bookingDone" name="Bookings" fill="#ff6600" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[var(--radius-card)] border-border bg-white shadow-sm">
                  <CardContent className="p-5">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div><h2 className="text-base font-extrabold text-secondary">Call Performance</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">Live CallLog activity and captured outcomes.</p></div>
                      <PhoneCall className="size-5 text-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <MetricCard label="Total calls" value={calls.totalCalls} helper={`${calls.leadContextCount} leads touched`} icon={PhoneCall} tone="bg-blue-50 text-blue-700" />
                      <MetricCard label="Connected" value={calls.connectedCalls} helper={`${calls.answerRate}% answer rate`} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
                      <MetricCard label="Not connected" value={calls.notConnectedCalls} helper="Unanswered or failed" icon={PhoneMissed} tone="bg-red-50 text-red-700" />
                      <MetricCard label="Missed calls" value={calls.missedCalls} helper="Missed or no-answer" icon={PhoneMissed} tone="bg-amber-50 text-amber-700" />
                      <MetricCard label="Calls / hour" value={calls.callsPerHour} helper="Average in range" icon={TrendingUp} tone="bg-violet-50 text-violet-700" />
                      <MetricCard label="Talk time" value={calls.totalDurationLabel} helper="Logged duration" icon={Timer} tone="bg-slate-100 text-slate-700" />
                    </div>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={callQuery.data.charts.dailyTrend}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="total" name="Calls" stroke="#083358" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="connected" name="Connected" stroke="#16a34a" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>
                      <div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={callQuery.data.charts.outcomeDistribution} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78}>{callQuery.data.charts.outcomeDistribution.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            </>
          ) : null}
      </WorkspacePage>
    </>
  );
}
