import { useMemo, useState } from "react";
import { getUserRoleLabel } from "../../../common/roleLabels";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  MessageSquareText,
  PhoneCall,
  Search,
  Trophy,
  TrendingUp,
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

interface PerformanceUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  designation?: string | null;
  teamName: string;
  image?: string | null;
  isActive: boolean;
  leadsAssigned: number;
  leadsCreated: number;
  calls: number;
  connectedCalls: number;
  followUpsCreated: number;
  followUpsCompleted: number;
  overdueFollowUps: number;
  remarksAdded: number;
  scoreEarned: number;
  scoreRank?: number | null;
  scoreBreakdown?: Array<{
    statusId: string;
    statusName: string;
    points: number;
    count: number;
  }>;
  siteVisitsScheduled: number;
  siteVisitsCompleted: number;
  tasksCompleted: number;
  bookingsDone: number;
  latestActivityAt?: string | null;
}
interface PerformanceActivityRow {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actorImage?: string | null;
  type: string;
  title: string;
  description?: string | null;
  statusScoreEarned?: number;
  statusScoreName?: string | null;
  leadId?: string | null;
  leadName?: string | null;
  leadDisplayId?: string | null;
  occurredAt: string;
}

interface PerformanceResponse {
  meta: {
    dateFrom: string;
    dateTo: string;
    page: number;
    limit: number;
    totalActivity: number;
  };
  summary: {
    totalCalls: number;
    connectedCalls: number;
    followUpsCompleted: number;
    siteVisitsDone: number;
    remarksAdded: number;
    scoreEarned: number;
    tasksCompleted: number;
    bookingsDone: number;
  };
  users: PerformanceUserRow[];
  activity: PerformanceActivityRow[];
  filters: {
    employees: Array<{
      id: string;
      name: string;
      role: string;
      teamId?: string | null;
    }>;
    teams: Array<{ id: string; name: string }>;
    roles: string[];
    activityTypes: string[];
  };
}

const today = new Date();
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

const formatDateInput = (value: Date) => value.toISOString().slice(0, 10);

const formatNumber = (value: number) => value.toLocaleString("en-IN");

const formatDateTime = (value?: string | null) => {
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
};

const initials = (value?: string | null) =>
  String(value ?? "U")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const roleLabel = getUserRoleLabel;

const activityLabel = (value: string) =>
  value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const scoreBreakdownLabel = (user: PerformanceUserRow) => {
  const [first, second] = user.scoreBreakdown ?? [];
  if (!first) return "No scored status changes";
  return `${first.statusName}: ${formatNumber(first.points)}${
    second ? ` / ${second.statusName}: ${formatNumber(second.points)}` : ""
  }`;
};

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof PhoneCall;
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
            {formatNumber(value)}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function AdminPerformanceScreen() {
  const organizationId = currentOrganizationId() ?? "unscoped";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState(formatDateInput(monthStart));
  const [dateTo, setDateTo] = useState(formatDateInput(today));
  const [role, setRole] = useState("all");
  const [userId, setUserId] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [activityType, setActivityType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      role,
      userId,
      teamId,
      activityType,
      search,
      page,
      limit: 20,
    }),
    [activityType, dateFrom, dateTo, page, role, search, teamId, userId],
  );

  const performanceQuery = useQuery({
    queryKey: ["admin-performance", organizationId, queryParams],
    queryFn: async () =>
      (
        await api.get<PerformanceResponse>("/dashboard/admin/performance", {
          params: queryParams,
        })
      ).data,
  });

  const data = performanceQuery.data;
  const totalPages = data
    ? Math.max(1, Math.ceil(data.meta.totalActivity / data.meta.limit))
    : 1;

  const stats = data
    ? [
        {
          label: "Total calls",
          value: data.summary.totalCalls,
          helper: "Call logs in range",
          icon: PhoneCall,
          tone: "bg-blue-50 text-blue-700",
        },
        {
          label: "Connected calls",
          value: data.summary.connectedCalls,
          helper: "Successful conversations",
          icon: CheckCircle2,
          tone: "bg-emerald-50 text-emerald-700",
        },
        {
          label: "Follow-ups done",
          value: data.summary.followUpsCompleted,
          helper: "Completed follow-ups",
          icon: CalendarDays,
          tone: "bg-orange-50 text-primary",
        },
        {
          label: "Site visits done",
          value: data.summary.siteVisitsDone,
          helper: "Completed visits",
          icon: UsersRound,
          tone: "bg-teal-50 text-teal-700",
        },
        {
          label: "Remarks added",
          value: data.summary.remarksAdded,
          helper: "Lead remarks captured",
          icon: MessageSquareText,
          tone: "bg-violet-50 text-violet-700",
        },
        {
          label: "Score earned",
          value: data.summary.scoreEarned,
          helper: "From lead status changes",
          icon: TrendingUp,
          tone: "bg-green-50 text-green-700",
        },
        {
          label: "Tasks completed",
          value: data.summary.tasksCompleted,
          helper: "Employee tasks closed",
          icon: ClipboardCheck,
          tone: "bg-slate-100 text-slate-700",
        },
        {
          label: "Bookings done",
          value: data.summary.bookingsDone,
          helper: "Closed bookings",
          icon: Trophy,
          tone: "bg-amber-50 text-amber-700",
        },
      ]
    : [];

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={sidebarItems}
        activeItem="Employees"
        activeChild="Performance"
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
            <span className="text-foreground">Performance</span>
          </div>
        }
      >
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            aria-label="Search performance"
            placeholder="Search employee, activity, or lead..."
            className="h-10 rounded-md border-slate-200 pl-11 text-sm font-semibold shadow-none"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
      </DashboardHeader>

      <WorkspacePage>
        <PageHeader
          title="Employee performance"
          subtitle="See who did what and when across calls, follow-ups, site visits, remarks, tasks, and bookings."
        />

        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <DatePicker
              aria-label="Date from"
              value={dateFrom}
              className="h-10 rounded-md"
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
            <DatePicker
              aria-label="Date to"
              value={dateTo}
              className="h-10 rounded-md"
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-md shadow-none">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {(data?.filters.roles ?? []).map((item) => (
                  <SelectItem key={item} value={item}>
                    {roleLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={teamId}
              onValueChange={(value) => {
                setTeamId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-md shadow-none">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {(data?.filters.teams ?? []).map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={userId}
              onValueChange={(value) => {
                setUserId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-md shadow-none">
                <SelectValue placeholder="All employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All employees</SelectItem>
                {(data?.filters.employees ?? []).map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={activityType}
              onValueChange={(value) => {
                setActivityType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-md shadow-none">
                <SelectValue placeholder="All activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                {(data?.filters.activityTypes ?? []).map((type) => (
                  <SelectItem key={type} value={type}>
                    {activityLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {performanceQuery.isLoading ? (
          <Card className="rounded-md border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-muted-foreground shadow-none">
            Loading performance data...
          </Card>
        ) : performanceQuery.isError ? (
          <Card className="rounded-md border border-red-200 bg-red-50 p-10 text-center text-sm font-extrabold text-red-700 shadow-none">
            Could not load employee performance.
          </Card>
        ) : data ? (
          <>
            <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
              {stats.map((stat) => (
                <StatCard key={stat.label} {...stat} />
              ))}
            </section>

            <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
              <div className="border-b border-slate-100 px-4 py-3">
                <h2 className="text-base font-extrabold text-secondary">
                  User performance
                </h2>
                <p className="text-xs font-semibold text-muted-foreground">
                  Activity totals for each employee in the selected range.
                </p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      {[
                        "Rank",
                        "Employee",
                        "Leads",
                        "Score earned",
                        "Calls",
                        "Follow-ups",
                        "Visits",
                        "Remarks",
                        "Tasks",
                        "Bookings",
                        "Latest activity",
                      ].map((head) => (
                        <TableHead
                          key={head}
                          className="h-11 whitespace-nowrap px-4 text-xs font-extrabold text-secondary"
                        >
                          {head}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                          {user.scoreRank ? `#${user.scoreRank}` : "-"}
                        </TableCell>
                        <TableCell className="min-w-[240px] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage
                                src={user.image ?? undefined}
                                alt={user.name}
                              />
                              <AvatarFallback>
                                {initials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-extrabold text-secondary">
                                {user.name}
                              </p>
                              <p className="text-xs font-semibold text-muted-foreground">
                                {roleLabel(user.role)} · {user.teamName}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          {user.leadsAssigned} assigned · {user.leadsCreated}{" "}
                          created
                        </TableCell>
                        <TableCell className="min-w-[190px] px-4 py-3">
                          <p className="text-xs font-extrabold text-green-700">
                            {formatNumber(user.scoreEarned)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[11px] font-semibold text-muted-foreground">
                            {scoreBreakdownLabel(user)}
                          </p>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          {user.calls} total · {user.connectedCalls} connected
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          {user.followUpsCompleted} done ·{" "}
                          {user.overdueFollowUps} overdue
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          {user.siteVisitsCompleted} done ·{" "}
                          {user.siteVisitsScheduled} scheduled
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          {user.remarksAdded}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          {user.tasksCompleted}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold">
                          {user.bookingsDone}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {formatDateTime(user.latestActivityAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!data.users.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={11}
                          className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground"
                        >
                          No employee performance found for this filter.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
              <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-secondary">
                    Who did what and when
                  </h2>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Unified activity timeline across CRM operations.
                  </p>
                </div>
                <Badge className="w-fit border-0 bg-blue-50 text-blue-700">
                  {formatNumber(data.meta.totalActivity)} activities
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      {["Actor", "Action", "Lead", "When"].map((head) => (
                        <TableHead
                          key={head}
                          className="h-11 whitespace-nowrap px-4 text-xs font-extrabold text-secondary"
                        >
                          {head}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.activity.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="min-w-[220px] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage
                                src={activity.actorImage ?? undefined}
                                alt={activity.actorName}
                              />
                              <AvatarFallback>
                                {initials(activity.actorName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-extrabold text-secondary">
                                {activity.actorName}
                              </p>
                              <p className="text-xs font-semibold text-muted-foreground">
                                {roleLabel(activity.actorRole)}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="min-w-[320px] px-4 py-3">
                          <Badge className="mb-2 border-0 bg-slate-100 text-slate-700">
                            {activityLabel(activity.type)}
                          </Badge>
                          <p className="text-xs font-extrabold text-secondary">
                            {activity.title}
                          </p>
                          {Number(activity.statusScoreEarned ?? 0) > 0 ? (
                            <Badge className="mt-1 w-fit border-0 bg-green-50 text-green-700">
                              {formatNumber(activity.statusScoreEarned ?? 0)}{" "}
                              total score
                              {activity.statusScoreName
                                ? ` · ${activity.statusScoreName}`
                                : ""}
                            </Badge>
                          ) : null}
                          <p className="line-clamp-2 text-xs font-semibold text-muted-foreground">
                            {activity.description || "-"}
                          </p>
                        </TableCell>
                        <TableCell className="min-w-[180px] px-4 py-3 text-xs font-semibold text-secondary">
                          {activity.leadName ? (
                            <>
                              <p className="font-extrabold">
                                {activity.leadName}
                              </p>
                              <p className="text-muted-foreground">
                                {activity.leadDisplayId ?? activity.leadId}
                              </p>
                            </>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="min-w-[170px] px-4 py-3 text-xs font-semibold text-muted-foreground">
                          {formatDateTime(activity.occurredAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!data.activity.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground"
                        >
                          No activities found for this filter.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
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
                </div>
              </div>
            </Card>
          </>
        ) : null}
      </WorkspacePage>
    </>
  );
}
