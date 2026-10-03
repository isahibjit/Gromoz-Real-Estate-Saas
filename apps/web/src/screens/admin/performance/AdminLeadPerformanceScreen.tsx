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
  BriefcaseBusiness,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Heart,
  HeartOff,
  Search,
  Target,
  UserPlus,
  UsersRound,
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
import {
  PageHeader,
  WorkspacePage,
} from "../../../components/layout/PageHeader";
import { DashboardHeader } from "../dashboard/DashboardHeader";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import { sidebarItems } from "../dashboard/dashboardData";

type LeadPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "this_month"
  | "last_month"
  | "custom";
type ReportScope = "user" | "team" | "project" | "source";

interface LeadPerformanceMetrics {
  totalLeads: number;
  newLeads: number;
  interestedLeads: number;
  notInterestedLeads: number;
  followUps: number;
  siteVisitScheduled: number;
  siteVisitDone: number;
  reVisitDone: number;
  bookingDone: number;
  cp: number;
  obmDone: number;
  eoi: number;
  outStationLead: number;
  lostLeads: number;
  leadBookingDoneRate: number;
  latestActivityAt?: string | null;
}
interface LeadUserRow extends LeadPerformanceMetrics {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string | null;
  teamId?: string | null;
  teamName: string;
  image?: string | null;
}

interface LeadTeamRow extends LeadPerformanceMetrics {
  id: string;
  name: string;
  leaderName: string;
  memberCount: number;
}

interface LeadProjectRow extends LeadPerformanceMetrics {
  id: string;
  name: string;
  location?: string | null;
  status?: string | null;
}

interface LeadSourceRow extends LeadPerformanceMetrics {
  id: string;
  name: string;
  code?: string | null;
}

type LeadReportRow = LeadUserRow | LeadTeamRow | LeadProjectRow | LeadSourceRow;

interface LeadPerformanceResponse {
  meta: {
    preset: LeadPreset;
    label: string;
    scope: ReportScope;
    dateFrom: string;
    dateTo: string;
    page: number;
    limit: number;
    totalRows: number;
  };
  summary: LeadPerformanceMetrics;
  users: LeadUserRow[];
  teams: LeadTeamRow[];
  projects: LeadProjectRow[];
  sources: LeadSourceRow[];
  charts: {
    dailyTrend: Array<{
      date: string;
      label: string;
      totalLeads: number;
      interestedLeads: number;
      bookingDone: number;
    }>;
    statusDistribution: Array<{ name: string; value: number }>;
    sourceSplit: Array<{ id: string; name: string; value: number }>;
    projectPerformance: Array<{
      id: string;
      name: string;
      totalLeads: number;
      bookingDone: number;
    }>;
  };
  filters: {
    employees: Array<{
      id: string;
      name: string;
      role: string;
      teamId?: string | null;
    }>;
    teams: Array<{ id: string; name: string }>;
    projects: Array<{ id: string; name: string; location?: string | null }>;
    sources: Array<{ id: string; name: string }>;
    roles: string[];
  };
}

const today = new Date();
const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);
const initialDateFrom = formatDateInput(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const initialDateTo = formatDateInput(today);
const chartColors = [
  "#083358",
  "#ff6600",
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
];

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
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })} · ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function rowSubLabel(row: LeadReportRow, scope: ReportScope) {
  if (scope === "user") {
    const user = row as LeadUserRow;
    return `${roleLabel(user.role)} · ${user.teamName}`;
  }
  if (scope === "team") {
    const team = row as LeadTeamRow;
    return `${team.memberCount} members · Lead: ${team.leaderName}`;
  }
  if (scope === "project") {
    const project = row as LeadProjectRow;
    return (
      [project.location, project.status].filter(Boolean).join(" · ") ||
      "Project report"
    );
  }
  const source = row as LeadSourceRow;
  return source.code ? `Code: ${source.code}` : "Source report";
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
  icon: typeof UsersRound;
  tone: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-none sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md",
            tone,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-extrabold text-secondary sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {helper}
          </p>
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

export function AdminLeadPerformanceScreen() {
  const organizationId = currentOrganizationId() ?? "unscoped";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preset, setPreset] = useState<LeadPreset>("this_month");
  const [scope, setScope] = useState<ReportScope>("user");
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);
  const [role, setRole] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [userId, setUserId] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [sourceId, setSourceId] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const queryParams = useMemo(
    () => ({
      preset,
      scope,
      dateFrom: preset === "custom" ? dateFrom : undefined,
      dateTo: preset === "custom" ? dateTo : undefined,
      role,
      teamId,
      userId,
      projectId,
      sourceId,
      search,
      page,
      limit,
    }),
    [
      dateFrom,
      dateTo,
      limit,
      page,
      preset,
      projectId,
      role,
      scope,
      search,
      sourceId,
      teamId,
      userId,
    ],
  );

  const reportQuery = useQuery({
    queryKey: ["admin-lead-performance", organizationId, queryParams],
    queryFn: async () =>
      (
        await api.get<LeadPerformanceResponse>(
          "/dashboard/admin/lead-performance",
          { params: queryParams },
        )
      ).data,
  });

  const data = reportQuery.data;
  const rows: LeadReportRow[] =
    scope === "team"
      ? data?.teams ?? []
      : scope === "project"
      ? data?.projects ?? []
      : scope === "source"
      ? data?.sources ?? []
      : data?.users ?? [];
  const totalPages = data
    ? Math.max(1, Math.ceil(data.meta.totalRows / data.meta.limit))
    : 1;
  const rangeLabel = data?.meta.label ?? "Selected range";
  const resetPage = () => setPage(1);

  const stats = data
    ? ([
        [
          "Total leads",
          numberLabel(data.summary.totalLeads),
          "Created in range",
          UsersRound,
          "bg-blue-50 text-blue-700",
        ],
        [
          "New leads",
          numberLabel(data.summary.newLeads),
          "Status matched as new",
          UserPlus,
          "bg-cyan-50 text-cyan-700",
        ],
        [
          "Interested",
          numberLabel(data.summary.interestedLeads),
          "Interested lead status",
          Heart,
          "bg-emerald-50 text-emerald-700",
        ],
        [
          "Not interested",
          numberLabel(data.summary.notInterestedLeads),
          "Rejected interest status",
          HeartOff,
          "bg-red-50 text-red-700",
        ],
        [
          "Follow-ups",
          numberLabel(data.summary.followUps),
          "Scheduled in range",
          CalendarCheck,
          "bg-orange-50 text-primary",
        ],
        [
          "Site visit done",
          numberLabel(data.summary.siteVisitDone),
          "Completed visits",
          CheckCircle2,
          "bg-violet-50 text-violet-700",
        ],
        [
          "Booking done",
          numberLabel(data.summary.bookingDone),
          `${data.summary.leadBookingDoneRate}% booking rate`,
          BriefcaseBusiness,
          "bg-amber-50 text-amber-700",
        ],
        [
          "Lost leads",
          numberLabel(data.summary.lostLeads),
          "Lost status or lost date",
          Target,
          "bg-slate-100 text-slate-700",
        ],
      ] as const)
    : [];

  const exportExcel = () => {
    if (!data) return;
    const exportRows = rows.map((row) => ({
      Name: row.name,
      Scope: scope,
      Detail: rowSubLabel(row, scope),
      "Total Leads": row.totalLeads,
      "New Leads": row.newLeads,
      "Interested Leads": row.interestedLeads,
      "Not Interested Leads": row.notInterestedLeads,
      "Follow-up": row.followUps,
      "Site Visit Scheduled": row.siteVisitScheduled,
      "Site Visit Done": row.siteVisitDone,
      "Re-Visit Done": row.reVisitDone,
      "Booking Done": row.bookingDone,
      CP: row.cp,
      "OBM Done": row.obmDone,
      EOI: row.eoi,
      "Out Station Lead": row.outStationLead,
      "Lost Leads": row.lostLeads,
      "Lead Booking Done Rate": `${row.leadBookingDoneRate}%`,
      "Latest Activity": dateTimeLabel(row.latestActivityAt),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(exportRows),
      `${scope} report`,
    );
    XLSX.writeFile(
      workbook,
      `lead-performance-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const exportPdf = async () => {
    try {
      setPdfDownloading(true);
      const response = await api.get<Blob>(
        "/dashboard/admin/lead-performance/report.pdf",
        {
          params: queryParams,
          responseType: "blob",
        },
      );
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lead-performance-${scope}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Lead performance PDF downloaded");
    } catch {
      toast.error("Could not download lead performance PDF");
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={sidebarItems}
        activeItem="Employees"
        activeChild="Lead Performance"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <DashboardHeader
        onMobileMenuOpen={() => setMobileOpen(true)}
        onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
        breadcrumbs={
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span>Employees</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Lead Performance</span>
          </div>
        }
      >
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            aria-label="Search lead performance"
            placeholder="Search employee, team, project, source, lead..."
            className="h-10 rounded-md border-slate-200 pl-11 text-sm font-semibold shadow-none"
            onChange={(event) => {
              setSearch(event.target.value);
              resetPage();
            }}
          />
        </div>
      </DashboardHeader>

      <WorkspacePage>
        <PageHeader
          title="Lead performance"
          subtitle={`User, team, project, and source performance across lead movement, follow-ups, visits, bookings, and lost outcomes for ${rangeLabel}.`}
          actions={
            <>
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
            </>
          }
        />

        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <SearchableSelect
              value={preset}
              onValueChange={(value) => {
                setPreset(value as LeadPreset);
                resetPage();
              }}
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
              ariaLabel="Lead performance date range"
            />
            <SearchableSelect
              value={scope}
              onValueChange={(value) => {
                setScope(value as ReportScope);
                resetPage();
              }}
              options={[
                { value: "user", label: "User-wise report" },
                { value: "team", label: "Team-wise report" },
                { value: "project", label: "Project-wise report" },
                { value: "source", label: "Source-wise report" },
              ]}
              placeholder="Report type"
              searchPlaceholder="Search report type..."
              ariaLabel="Lead performance report type"
            />
            <SearchableSelect
              value={role}
              onValueChange={(value) => {
                setRole(value);
                resetPage();
              }}
              options={[
                { value: "all", label: "All roles" },
                ...(data?.filters.roles ?? []).map((item) => ({
                  value: item,
                  label: roleLabel(item),
                })),
              ]}
              placeholder="All roles"
              searchPlaceholder="Search roles..."
              ariaLabel="Lead performance role filter"
            />
            <SearchableSelect
              value={teamId}
              onValueChange={(value) => {
                setTeamId(value);
                resetPage();
              }}
              options={[
                { value: "all", label: "All teams" },
                ...(data?.filters.teams ?? []).map((team) => ({
                  value: team.id,
                  label: team.name,
                })),
              ]}
              placeholder="All teams"
              searchPlaceholder="Search teams..."
              ariaLabel="Lead performance team filter"
            />
            <SearchableSelect
              value={userId}
              onValueChange={(value) => {
                setUserId(value);
                resetPage();
              }}
              options={[
                { value: "all", label: "All employees" },
                ...(data?.filters.employees ?? []).map((employee) => ({
                  value: employee.id,
                  label: employee.name,
                })),
              ]}
              placeholder="All employees"
              searchPlaceholder="Search employees..."
              ariaLabel="Lead performance employee filter"
            />
            <SearchableSelect
              value={projectId}
              onValueChange={(value) => {
                setProjectId(value);
                resetPage();
              }}
              options={[
                { value: "all", label: "All projects" },
                ...(data?.filters.projects ?? []).map((project) => ({
                  value: project.id,
                  label: project.name,
                })),
              ]}
              placeholder="All projects"
              searchPlaceholder="Search projects..."
              ariaLabel="Lead performance project filter"
            />
            <SearchableSelect
              value={sourceId}
              onValueChange={(value) => {
                setSourceId(value);
                resetPage();
              }}
              options={[
                { value: "all", label: "All sources" },
                ...(data?.filters.sources ?? []).map((source) => ({
                  value: source.id,
                  label: source.name,
                })),
              ]}
              placeholder="All sources"
              searchPlaceholder="Search sources..."
              ariaLabel="Lead performance source filter"
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:col-span-1 xl:grid-cols-1">
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
          </div>
        </Card>

        {reportQuery.isLoading ? (
          <Card className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-muted-foreground shadow-none">
            Loading lead performance...
          </Card>
        ) : reportQuery.isError ? (
          <Card className="rounded-md border border-red-200 bg-red-50 p-10 text-center text-sm font-extrabold text-red-700 shadow-none">
            Could not load lead performance.
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
              <ChartCard
                title="Lead trend"
                helper="Created, interested, and booking done counts by day."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.charts.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="totalLeads"
                      stroke="#083358"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="interestedLeads"
                      stroke="#16a34a"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="bookingDone"
                      stroke="#ff6600"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Status distribution"
                helper="Key lead outcomes in the selected range."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.charts.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={92}
                    >
                      {data.charts.statusDistribution.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={chartColors[index % chartColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Project performance"
                helper="Top projects by lead volume and bookings."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.charts.projectPerformance}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="totalLeads"
                      fill="#083358"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="bookingDone"
                      fill="#ff6600"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard
                title="Source split"
                helper="Lead volume by source master."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.sourceSplit}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#083358" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>

            <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-secondary">
                    {scope === "team"
                      ? "Team-wise report"
                      : scope === "project"
                      ? "Project-wise report"
                      : scope === "source"
                      ? "Source-wise report"
                      : "User-wise report"}
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Showing {numberLabel(data.meta.totalRows)} rows for{" "}
                    {rangeLabel}.
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
                      {[
                        scope === "user"
                          ? "Employee"
                          : scope === "team"
                          ? "Team"
                          : scope === "project"
                          ? "Project"
                          : "Source",
                        "Total",
                        "New",
                        "Interested",
                        "Not Interested",
                        "Follow-up",
                        "Visit Scheduled",
                        "Visit Done",
                        "Re-Visit Done",
                        "Booking Done",
                        "CP",
                        "OBM Done",
                        "EOI",
                        "Out Station",
                        "Lost",
                        "Booking Rate",
                        "Latest",
                      ].map((head) => (
                        <TableHead
                          key={head}
                          className="h-11 whitespace-nowrap border-r border-slate-200 px-4 text-xs font-extrabold text-secondary last:border-r-0"
                        >
                          {head}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="min-w-[250px] border-r border-slate-100 px-4 py-3">
                          {scope === "user" ? (
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage
                                  src={(row as LeadUserRow).image ?? undefined}
                                  alt={row.name}
                                />
                                <AvatarFallback>
                                  {initials(row.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-extrabold text-secondary">
                                  {row.name}
                                </p>
                                <p className="truncate text-xs font-semibold text-muted-foreground">
                                  {rowSubLabel(row, scope)}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-secondary">
                                {row.name}
                              </p>
                              <p className="truncate text-xs font-semibold text-muted-foreground">
                                {rowSubLabel(row, scope)}
                              </p>
                            </div>
                          )}
                        </TableCell>
                        {[
                          row.totalLeads,
                          row.newLeads,
                          row.interestedLeads,
                          row.notInterestedLeads,
                          row.followUps,
                          row.siteVisitScheduled,
                          row.siteVisitDone,
                          row.reVisitDone,
                          row.bookingDone,
                          row.cp,
                          row.obmDone,
                          row.eoi,
                          row.outStationLead,
                          row.lostLeads,
                        ].map((value, index) => (
                          <TableCell
                            key={index}
                            className="border-r border-slate-100 px-4 py-3 text-xs font-bold"
                          >
                            {numberLabel(value)}
                          </TableCell>
                        ))}
                        <TableCell className="border-r border-slate-100 px-4 py-3">
                          <Badge className="border-0 bg-blue-50 text-blue-700">
                            {row.leadBookingDoneRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {dateTimeLabel(row.latestActivityAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!rows.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={17}
                          className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                        >
                          No lead performance found for this filter.
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
                    onClick={() =>
                      setPage((value) => Math.min(totalPages, value + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Select
                    value={String(limit)}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
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
      </WorkspacePage>
    </>
  );
}
