import { useMemo, useState, type ReactNode } from "react";
import { getUserRoleLabel } from "../../../common/roleLabels";
import { useQuery } from "@tanstack/react-query";
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
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Search,
  Timer,
  TrendingUp,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "ui";

import { api } from "../../../common/api";
import { currentOrganizationId } from "../../../common/tenantRequestScope";
import { useAppSelector } from "../../../store";
import { DashboardHeader } from "../dashboard/DashboardHeader";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import { sidebarItems } from "../dashboard/dashboardData";
import { fieldExecutiveSidebarItems } from "../../field-executive/fieldExecutiveData";
import { telecallerSidebarItems } from "../../telecaller/dashboard/telecallerDashboardData";

type CallingPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_month"
  | "last_month"
  | "custom";
type ReportScope = "user" | "team";

interface CallingMetrics {
  totalCalls: number;
  connectedCalls: number;
  notConnectedCalls: number;
  incomingCalls: number;
  outgoingCalls: number;
  totalDurationSeconds: number;
  totalDurationLabel: string;
  callsPerHour: number;
  missedCalls: number;
  answerRate: number;
  leadContextCount: number;
  latestCallAt?: string | null;
}
interface CallingUserRow extends CallingMetrics {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string | null;
  teamId?: string | null;
  teamName: string;
  image?: string | null;
}

interface CallingTeamRow extends CallingMetrics {
  id: string;
  name: string;
  leaderName: string;
  memberCount: number;
}

interface CallingPerformanceResponse {
  meta: {
    preset: CallingPreset;
    label: string;
    scope: ReportScope;
    dateFrom: string;
    dateTo: string;
    page: number;
    limit: number;
    totalRows: number;
    context?: {
      reportForLabel: string;
      reportForName: string;
      reportForMeta: string;
      generatedByName?: string | null;
    };
  };
  summary: CallingMetrics;
  users: CallingUserRow[];
  teams: CallingTeamRow[];
  charts: {
    dailyTrend: Array<{ date: string; label: string; total: number; connected: number; missed: number }>;
    hourlyTrend: Array<{ hour: number; label: string; calls: number; connected: number }>;
    outcomeDistribution: Array<{ name: string; value: number }>;
    directionSplit: Array<{ name: string; value: number }>;
    topCallers: Array<{
      id: string;
      name: string;
      teamName: string;
      totalCalls: number;
      connectedCalls: number;
    }>;
  };
  filters: {
    employees: Array<{ id: string; name: string; role: string; teamId?: string | null }>;
    teams: Array<{ id: string; name: string }>;
    roles: string[];
  };
}

const today = new Date();
const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);
const initialDateFrom = formatDateInput(new Date(today.getFullYear(), today.getMonth(), 1));
const initialDateTo = formatDateInput(today);
const chartColors = ["#083358", "#ff6600", "#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

const roleLabel = getUserRoleLabel;

function initials(value?: string | null) {
  return String(value ?? "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function numberLabel(value: number) {
  return Number(value ?? 0).toLocaleString("en-IN");
}

function dateTimeLabel(value?: string | null) {
  if (!value) return "No calls";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No calls";
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof PhoneCall;
  tone: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-none sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", tone)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-extrabold text-secondary sm:text-2xl">{value}</p>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">{helper}</p>
        </div>
      </div>
    </Card>
  );
}

function ChartCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
      <div className="mb-4">
        <h2 className="text-sm font-extrabold text-secondary">{title}</h2>
        <p className="text-xs font-semibold text-muted-foreground">{helper}</p>
      </div>
      <div className="h-[250px]">{children}</div>
    </Card>
  );
}

export function AdminCallingPerformanceScreen() {
  const organizationId = currentOrganizationId() ?? "unscoped";
  const currentUser = useAppSelector((state) => state.auth.user);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preset, setPreset] = useState<CallingPreset>("this_month");
  const [scope, setScope] = useState<ReportScope>("user");
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [role, setRole] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const isSelfScopedCallingReport =
    currentUser?.role === "TELECALLER" || currentUser?.role === "SALES_AGENT";

  const queryParams = useMemo(
    () => ({
      preset,
      scope,
      dateFrom: preset === "custom" ? dateFrom : undefined,
      dateTo: preset === "custom" ? dateTo : undefined,
      role: isSelfScopedCallingReport ? currentUser?.role : role,
      teamId: isSelfScopedCallingReport ? "all" : teamId,
      userId: isSelfScopedCallingReport ? currentUser?.id : userId,
      search,
      page,
      limit,
    }),
    [
      currentUser?.id,
      currentUser?.role,
      dateFrom,
      dateTo,
      isSelfScopedCallingReport,
      limit,
      page,
      preset,
      role,
      scope,
      search,
      teamId,
      userId,
    ],
  );

  const reportQuery = useQuery({
    queryKey: ["admin-calling-performance", organizationId, queryParams],
    queryFn: async () =>
      (
        await api.get<CallingPerformanceResponse>(
          "/dashboard/admin/calling-performance",
          { params: queryParams },
        )
      ).data,
  });

  const data = reportQuery.data;
  const rows = scope === "team" ? data?.teams ?? [] : data?.users ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.meta.totalRows / data.meta.limit)) : 1;
  const rangeLabel = data?.meta.label ?? "Selected range";

  const stats = data
    ? [
        ["Total calls", numberLabel(data.summary.totalCalls), `${numberLabel(data.summary.leadContextCount)} leads touched`, PhoneCall, "bg-blue-50 text-blue-700"],
        ["Connected calls", numberLabel(data.summary.connectedCalls), `${data.summary.answerRate}% answer rate`, CheckCircle2, "bg-emerald-50 text-emerald-700"],
        ["Not connected", numberLabel(data.summary.notConnectedCalls), "Failed or unanswered attempts", PhoneMissed, "bg-red-50 text-red-700"],
        ["Incoming calls", numberLabel(data.summary.incomingCalls), "Client initiated calls", PhoneIncoming, "bg-cyan-50 text-cyan-700"],
        ["Outgoing calls", numberLabel(data.summary.outgoingCalls), "Team initiated calls", PhoneOutgoing, "bg-orange-50 text-primary"],
        ["Total duration", data.summary.totalDurationLabel, "Logged talk time", Timer, "bg-slate-100 text-slate-700"],
        ["Calls / hour", String(data.summary.callsPerHour), "Average over range", TrendingUp, "bg-violet-50 text-violet-700"],
        ["Missed calls", numberLabel(data.summary.missedCalls), "Missed or no-answer outcomes", PhoneMissed, "bg-amber-50 text-amber-700"],
      ] as const
    : [];

  const resetPage = () => setPage(1);

  const exportExcel = () => {
    if (!data) return;
    const exportRows =
      scope === "team"
        ? data.teams.map((row) => ({
            Team: row.name,
            Leader: row.leaderName,
            Members: row.memberCount,
            "Total Calls": row.totalCalls,
            Connected: row.connectedCalls,
            "Not Connected": row.notConnectedCalls,
            Incoming: row.incomingCalls,
            Outgoing: row.outgoingCalls,
            Missed: row.missedCalls,
            "Total Duration": row.totalDurationLabel,
            "Calls Per Hour": row.callsPerHour,
            "Answer Rate": `${row.answerRate}%`,
            "Leads Touched": row.leadContextCount,
            "Latest Call": dateTimeLabel(row.latestCallAt),
          }))
        : data.users.map((row) => ({
            Employee: row.name,
            Email: row.email,
            Role: roleLabel(row.role),
            Team: row.teamName,
            "Total Calls": row.totalCalls,
            Connected: row.connectedCalls,
            "Not Connected": row.notConnectedCalls,
            Incoming: row.incomingCalls,
            Outgoing: row.outgoingCalls,
            Missed: row.missedCalls,
            "Total Duration": row.totalDurationLabel,
            "Calls Per Hour": row.callsPerHour,
            "Answer Rate": `${row.answerRate}%`,
            "Leads Touched": row.leadContextCount,
            "Latest Call": dateTimeLabel(row.latestCallAt),
          }));
    const workbook = XLSX.utils.book_new();
    const contextRows = [
      ["Calling Performance Report"],
      [
        `${data.meta.context?.reportForLabel ?? (scope === "team" ? "Teams" : "Employees")}: ${
          data.meta.context?.reportForName ?? (scope === "team" ? "All visible teams" : "All visible employees")
        }`,
      ],
      data.meta.context?.reportForMeta ? [data.meta.context.reportForMeta] : [],
      [`Date range: ${rangeLabel}`],
      [`Generated by: ${data.meta.context?.generatedByName ?? "CRM user"}`],
      [],
    ].filter((row) => row.length > 0);
    const worksheet = XLSX.utils.aoa_to_sheet(contextRows);
    XLSX.utils.sheet_add_json(worksheet, exportRows, {
      origin: `A${contextRows.length + 1}`,
    });
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      scope === "team" ? "Team Report" : "User Report",
    );
    XLSX.writeFile(workbook, `calling-performance-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = async () => {
    try {
      setPdfDownloading(true);
      const response = await api.get<Blob>(
        "/dashboard/admin/calling-performance/report.pdf",
        {
          params: queryParams,
          responseType: "blob",
        },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `calling-performance-${scope}-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Calling performance PDF downloaded");
    } catch {
      toast.error("Could not download calling performance PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  const activeSidebarItems =
    currentUser?.role === "SALES_AGENT"
      ? fieldExecutiveSidebarItems
      : currentUser?.role === "TELECALLER"
        ? telecallerSidebarItems
        : sidebarItems;

  const activeSidebarItem =
    currentUser?.role === "SALES_AGENT" || currentUser?.role === "TELECALLER"
      ? "Calling Performance"
      : "Employees";

  const activeSidebarChild =
    currentUser?.role === "SALES_AGENT" || currentUser?.role === "TELECALLER"
      ? undefined
      : "Calling Performance";

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={activeSidebarItems}
        activeItem={activeSidebarItem}
        activeChild={activeSidebarChild}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span>Dashboard</span>
              <ChevronRight className="size-3.5" />
              <span>Employees</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Calling Performance</span>
            </div>
          }
        >
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              aria-label="Search calling performance"
              placeholder="Search employee, team, lead, outcome..."
              className="h-10 rounded-md border-slate-200 pl-11 text-sm font-semibold shadow-none"
              onChange={(event) => {
                setSearch(event.target.value);
                resetPage();
              }}
            />
          </div>
        </DashboardHeader>

        <main className="space-y-5 p-4 sm:p-6">
          <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <Badge className="mb-2 w-fit border-0 bg-blue-50 text-blue-700">
                Admin report
              </Badge>
              <h1 className="text-3xl font-extrabold text-secondary">
                Calling Performance
              </h1>
              <p className="mt-2 text-sm font-semibold text-blue-900">
                User-wise and team-wise calling outcomes, answer rate, duration,
                and hourly productivity for {rangeLabel}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md shadow-none"
                disabled={!data}
                onClick={exportExcel}
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
              <Button
                type="button"
                variant="navy"
                className="h-10 rounded-md shadow-none"
                disabled={!data || pdfDownloading}
                onClick={exportPdf}
              >
                <FileText className="h-4 w-4" />
                {pdfDownloading ? "Preparing..." : "PDF"}
              </Button>
            </div>
          </section>

          <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
            <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
              <SearchableSelect
                value={preset}
                onValueChange={(value) => { setPreset(value as CallingPreset); resetPage(); }}
                options={[
                  { value: "today", label: "Today" },
                  { value: "yesterday", label: "Yesterday" },
                  { value: "last_7_days", label: "Last 7 days" },
                  { value: "this_month", label: "This month" },
                  { value: "last_month", label: "Last month" },
                  { value: "custom", label: "Custom date" },
                ]}
                placeholder="Date range"
                searchPlaceholder="Search date range..."
                ariaLabel="Calling performance date range"
              />
              <SearchableSelect
                value={scope}
                onValueChange={(value) => { setScope(value as ReportScope); resetPage(); }}
                options={[
                  { value: "user", label: "User-wise report" },
                  { value: "team", label: "Team-wise report" },
                ]}
                placeholder="Report type"
                searchPlaceholder="Search report type..."
                ariaLabel="Calling performance report type"
              />
              {!isSelfScopedCallingReport ? (
                <>
                  <SearchableSelect
                    value={role}
                    onValueChange={(value) => { setRole(value); resetPage(); }}
                    options={[
                      { value: "all", label: "All roles" },
                      ...(data?.filters.roles ?? []).map((item) => ({
                        value: item,
                        label: roleLabel(item),
                      })),
                    ]}
                    placeholder="All roles"
                    searchPlaceholder="Search roles..."
                    ariaLabel="Calling performance role filter"
                  />
                  <SearchableSelect
                    value={teamId}
                    onValueChange={(value) => { setTeamId(value); resetPage(); }}
                    options={[
                      { value: "all", label: "All teams" },
                      ...(data?.filters.teams ?? []).map((team) => ({
                        value: team.id,
                        label: team.name,
                      })),
                    ]}
                    placeholder="All teams"
                    searchPlaceholder="Search teams..."
                    ariaLabel="Calling performance team filter"
                  />
                  <SearchableSelect
                    value={userId}
                    onValueChange={(value) => { setUserId(value); resetPage(); }}
                    options={[
                      { value: "all", label: "All employees" },
                      ...(data?.filters.employees ?? []).map((employee) => ({
                        value: employee.id,
                        label: employee.name,
                      })),
                    ]}
                    placeholder="All employees"
                    searchPlaceholder="Search employees..."
                    ariaLabel="Calling performance employee filter"
                  />
                </>
              ) : null}
              <DatePicker
                aria-label="Date from"
                value={dateFrom}
                disabled={preset !== "custom"}
                className="h-10 rounded-md"
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  resetPage();
                }}
              />
              <DatePicker
                aria-label="Date to"
                value={dateTo}
                disabled={preset !== "custom"}
                className="h-10 rounded-md"
                onChange={(event) => {
                  setDateTo(event.target.value);
                  resetPage();
                }}
              />
            </div>
          </Card>

          {reportQuery.isLoading ? (
            <Card className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-muted-foreground shadow-none">
              Loading calling performance...
            </Card>
          ) : reportQuery.isError ? (
            <Card className="rounded-md border border-red-200 bg-red-50 p-10 text-center text-sm font-extrabold text-red-700 shadow-none">
              Could not load calling performance.
            </Card>
          ) : data ? (
            <>
              <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
                {stats.map(([label, value, helper, icon, tone]) => (
                  <StatCard
                    key={label}
                    label={label}
                    value={value}
                    helper={helper}
                    icon={icon}
                    tone={tone}
                  />
                ))}
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <ChartCard title="Call trend" helper="Total, connected, and missed calls by day.">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.charts.dailyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#083358" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="connected" stroke="#16a34a" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="missed" stroke="#dc2626" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Calls per hour" helper="Hourly call volume and connected conversations.">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.charts.hourlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" interval={2} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#083358" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="connected" fill="#ff6600" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Outcome distribution" helper="Call outcomes captured by the team.">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.charts.outcomeDistribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                        {data.charts.outcomeDistribution.map((entry, index) => (
                          <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Top callers" helper="Highest call volume in the selected range.">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.charts.topCallers} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="totalCalls" fill="#083358" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </section>

              <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
                <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-secondary">
                      {scope === "team" ? "Team-wise report" : "User-wise report"}
                    </h2>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Showing {numberLabel(data.meta.totalRows)} {scope === "team" ? "teams" : "users"} for {rangeLabel}.
                    </p>
                  </div>
                  <Badge className="w-fit border-0 bg-slate-100 text-slate-700">
                    Rows {limit}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        {(scope === "team"
                          ? ["Team", "Members", "Total", "Connected", "Not Connected", "Incoming", "Outgoing", "Duration", "Calls/hour", "Missed", "Answer Rate", "Latest"]
                          : ["Employee", "Total", "Connected", "Not Connected", "Incoming", "Outgoing", "Duration", "Calls/hour", "Missed", "Answer Rate", "Leads", "Latest"]
                        ).map((head) => (
                          <TableHead key={head} className="h-11 whitespace-nowrap border-r border-slate-200 px-4 text-xs font-extrabold text-secondary last:border-r-0">
                            {head}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          {scope === "team" ? (
                            <>
                              <TableCell className="min-w-[220px] border-r border-slate-100 px-4 py-3">
                                <p className="text-xs font-extrabold text-secondary">{(row as CallingTeamRow).name}</p>
                                <p className="text-xs font-semibold text-muted-foreground">Lead: {(row as CallingTeamRow).leaderName}</p>
                              </TableCell>
                              <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold">{(row as CallingTeamRow).memberCount}</TableCell>
                            </>
                          ) : (
                            <TableCell className="min-w-[250px] border-r border-slate-100 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={(row as CallingUserRow).image ?? undefined} alt={(row as CallingUserRow).name} />
                                  <AvatarFallback>{initials((row as CallingUserRow).name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-extrabold text-secondary">{(row as CallingUserRow).name}</p>
                                  <p className="truncate text-xs font-semibold text-muted-foreground">
                                    {roleLabel((row as CallingUserRow).role)} · {(row as CallingUserRow).teamName}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-extrabold">{numberLabel(row.totalCalls)}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold text-emerald-700">{numberLabel(row.connectedCalls)}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold text-red-700">{numberLabel(row.notConnectedCalls)}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold">{numberLabel(row.incomingCalls)}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold">{numberLabel(row.outgoingCalls)}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold">{row.totalDurationLabel}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold">{row.callsPerHour}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold">{numberLabel(row.missedCalls)}</TableCell>
                          <TableCell className="border-r border-slate-100 px-4 py-3">
                            <Badge className="border-0 bg-blue-50 text-blue-700">{row.answerRate}%</Badge>
                          </TableCell>
                          {scope === "user" ? (
                            <TableCell className="border-r border-slate-100 px-4 py-3 text-xs font-bold">{numberLabel((row as CallingUserRow).leadContextCount)}</TableCell>
                          ) : null}
                          <TableCell className="px-4 py-3 text-xs font-semibold text-muted-foreground">{dateTimeLabel(row.latestCallAt)}</TableCell>
                        </TableRow>
                      ))}
                      {!rows.length ? (
                        <TableRow>
                          <TableCell
                            colSpan={scope === "team" ? 12 : 12}
                            className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                          >
                            No calling performance found for this filter.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 w-8 rounded-md p-0 shadow-none"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 w-8 rounded-md p-0 shadow-none"
                      disabled={page >= totalPages}
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Select value={String(limit)} onValueChange={(value) => { setLimit(Number(value)); setPage(1); }}>
                      <SelectTrigger className="h-8 w-[110px] rounded-md text-xs shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Rows 10</SelectItem>
                        <SelectItem value="20">Rows 20</SelectItem>
                        <SelectItem value="50">Rows 50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
