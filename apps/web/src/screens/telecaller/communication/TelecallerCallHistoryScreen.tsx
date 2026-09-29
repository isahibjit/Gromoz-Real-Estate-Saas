import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Phone,
  PhoneCall,
  PhoneMissed,
  RefreshCw,
  Search,
  UserCheck,
} from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  DatePicker,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  TablePageSizeOptions,
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

import { DashboardHeader } from "../../admin/dashboard/DashboardHeader";
import { DashboardSidebar } from "../../admin/dashboard/DashboardSidebar";
import {
  useFollowUpsList,
  type FollowUpWorkspaceApiRecord,
} from "../../admin/leads/follow-up/useFollowUpsWorkspace";
import { telecallerSidebarItems } from "../dashboard/telecallerDashboardData";
import { fieldExecutiveSidebarItems } from "../../field-executive/fieldExecutiveData";
import { useAppSelector } from "../../../store";

type OutcomeFilter = "all" | "connected" | "callback requested" | "interested" | "not interested" | "no answer";
type ExecutiveFilter = "all" | "mine" | "unassigned";
type DateFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

const dateRangeOptions: Array<{ label: string; value: DateFilter }> = [
  { label: "All Date Range", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom Range", value: "custom" },
];

interface CompletedCallRow {
  id: string;
  leadId: string;
  leadName: string;
  mobile: string;
  initials: string;
  propertyLabel: string;
  locationLabel: string;
  completedAt: string;
  scheduledAt: string;
  completedDateLabel: string;
  completedTimeLabel: string;
  scheduledLabel: string;
  outcome: string;
  remarks: string;
  nextAction: string;
  followUpStatus: string;
  createdBy: string;
  createdByRole: string;
  createdByAvatarUrl?: string;
}

function toInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatar(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
    seed,
  )}`;
}

function formatDateLabel(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTimeLabel(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatScheduledLabel(value?: string | null) {
  if (!value) return "No schedule captured";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No schedule captured";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function isWithinCurrentWeek(value: Date) {
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return value >= start && value < end;
}

function isWithinCurrentMonth(value: Date) {
  const today = new Date();
  return (
    value.getFullYear() === today.getFullYear() &&
    value.getMonth() === today.getMonth()
  );
}

function parseCompletionNotes(notes?: string | null) {
  const raw = String(notes ?? "").trim();
  if (!raw) {
    return {
      outcome: "Completed",
      remarks: "No completion remarks were captured for this call.",
    };
  }

  const outcomeMatch = raw.match(/Call Outcome:\s*(.+)/i);
  const remarksMatch = raw.match(/Remarks:\s*([\s\S]+)/i);

  return {
    outcome: outcomeMatch?.[1]?.trim() || "Completed",
    remarks: remarksMatch?.[1]?.trim() || raw,
  };
}

function mapFollowUpToCompletedCallRow(
  item: FollowUpWorkspaceApiRecord,
): CompletedCallRow | null {
  if (!item.completedAt) return null;

  const typeName = String(item.typeName ?? item.typeId ?? "")
    .trim()
    .toLowerCase();
  if (!typeName.includes("call")) return null;

  const requirement = item.lead?.requirement;
  const parsedNotes = parseCompletionNotes(item.notes);
  const leadName = item.lead?.name?.trim() || "Lead";
  const propertyLabel =
    requirement?.configuration?.trim() ||
    requirement?.propertyType?.trim() ||
    "Requirement pending";
  const locationLabel =
    requirement?.preferredLocation?.trim() || "Location pending";

  return {
    id: item.id,
    leadId: item.leadId,
    leadName,
    mobile: (item.lead as any)?.mobile?.trim() || (item.lead as any)?.phone?.trim() || "Not Available",
    initials: toInitials(leadName),
    propertyLabel,
    locationLabel,
    completedAt: item.completedAt,
    scheduledAt: item.scheduledAt,
    completedDateLabel: formatDateLabel(item.completedAt),
    completedTimeLabel: formatTimeLabel(item.completedAt),
    scheduledLabel: formatScheduledLabel(item.scheduledAt),
    outcome: parsedNotes.outcome,
    remarks: parsedNotes.remarks,
    nextAction: item.nextAction?.trim() || "No next action captured",
    followUpStatus: item.statusName?.trim() || "Completed",
    createdBy: item.assignedToName?.trim() || "Assigned user",
    createdByRole: item.assignedToRole?.trim() || "Pre Sales Executive",
    createdByAvatarUrl: avatar(item.assignedToName?.trim() || "Assigned user"),
  };
}

function getOutcomeBadgeVariant(outcome: string) {
  switch (outcome.toLowerCase()) {
    case "connected":
    case "interested":
      return "success";
    case "callback requested":
      return "info";
    case "not interested":
      return "destructive";
    case "no answer":
      return "warning";
    default:
      return "secondary";
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case "completed":
      return "success";
    case "rescheduled":
      return "info";
    default:
      return "secondary";
  }
}

function matchesDateFilter(
  value: string,
  filter: DateFilter,
  customFrom?: string,
  customTo?: string,
) {
  if (filter === "all" || !value) return true;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );

  if (filter === "today") {
    return date >= todayStart && date <= todayEnd;
  }

  if (filter === "yesterday") {
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    return date >= yesterdayStart && date <= yesterdayEnd;
  }

  if (filter === "last7") {
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    return date >= sevenDaysAgo && date <= todayEnd;
  }

  if (filter === "last30") {
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    return date >= thirtyDaysAgo && date <= todayEnd;
  }

  if (filter === "thisMonth") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= startOfMonth && date <= todayEnd;
  }

  if (filter === "lastMonth") {
    const startOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );
    return date >= startOfLastMonth && date <= endOfLastMonth;
  }

  if (filter === "custom") {
    if (customFrom) {
      const fromDate = new Date(customFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (date < fromDate) return false;
    }
    if (customTo) {
      const toDate = new Date(customTo);
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }
    return true;
  }

  return true;
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: typeof PhoneCall;
  label: string;
  value: string;
  helper: string;
  tone: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-md border border-border bg-white shadow-sm">
      <CardContent className="flex min-w-0 items-start gap-3 p-3 sm:p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md sm:size-11",
            tone,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold leading-tight text-secondary/80">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-extrabold leading-none text-secondary sm:text-[22px]">
            {value}
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TelecallerCallHistoryScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [executiveFilter, setExecutiveFilter] =
    useState<ExecutiveFilter>("mine");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const callHistoryQuery = useFollowUpsList({
    type: "Call",
    status: "completed",
    limit: 500,
  });

  const allRows = useMemo<CompletedCallRow[]>(() => {
    const records = callHistoryQuery.data?.data ?? [];
    return records
      .map(mapFollowUpToCompletedCallRow)
      .filter((row: CompletedCallRow | null): row is CompletedCallRow => Boolean(row))
      .sort(
        (left: CompletedCallRow, right: CompletedCallRow) =>
          new Date(right.completedAt).getTime() -
          new Date(left.completedAt).getTime(),
      );
  }, [callHistoryQuery.data?.data]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return allRows.filter((row) => {
      if (normalizedSearch) {
        const haystack = [
          row.leadName,
          row.mobile,
          row.propertyLabel,
          row.locationLabel,
          row.outcome,
          row.createdBy,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedSearch)) return false;
      }

      if (
        outcomeFilter !== "all" &&
        row.outcome.toLowerCase() !== outcomeFilter
      ) {
        return false;
      }

      if (executiveFilter === "unassigned" && row.createdBy !== "Assigned user") {
        return false;
      }

      if (executiveFilter === "mine" && row.createdBy !== (user?.fullName || "")) {
        return false;
      }

      if (!matchesDateFilter(row.completedAt, dateFilter, customFrom, customTo)) return false;

      return true;
    });
  }, [allRows, customFrom, customTo, dateFilter, executiveFilter, outcomeFilter, search, user?.fullName]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [currentPage, filteredRows, pageSize]);

  const summary = useMemo(() => {
    const completedToday = filteredRows.filter((row) =>
      isSameDay(new Date(row.completedAt), new Date()),
    ).length;
    const connected = filteredRows.filter(
      (row) => row.outcome.toLowerCase() === "connected",
    ).length;
    const interested = filteredRows.filter(
      (row) => row.outcome.toLowerCase() === "interested",
    ).length;
    const callbackRequested = filteredRows.filter(
      (row) => row.outcome.toLowerCase() === "callback requested",
    ).length;
    const needsRetry = filteredRows.filter((row) =>
      ["no answer", "not interested"].includes(row.outcome.toLowerCase()),
    ).length;

    return { completedToday, connected, interested, callbackRequested, needsRetry };
  }, [filteredRows]);

  const selectedOnPage = paginatedRows.filter((row) =>
    selectedRows.includes(row.id),
  ).length;

  const toggleRow = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
    );
  };

  const toggleAll = () => {
    const pageIds = paginatedRows.map((row) => row.id);
    const allSelected = pageIds.every((id) => selectedRows.includes(id));

    if (allSelected) {
      setSelectedRows((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedRows((prev) => Array.from(new Set([...prev, ...pageIds])));
  };

  const previousCallsByLead = useMemo(() => {
    const grouped = new Map<string, CompletedCallRow[]>();
    allRows.forEach((row) => {
      const list = grouped.get(row.leadId) ?? [];
      list.push(row);
      grouped.set(row.leadId, list);
    });
    return grouped;
  }, [allRows]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onCollapse={() => setSidebarCollapsed((value) => !value)}
        onMobileClose={() => setMobileMenuOpen(false)}
        items={
          user?.role === "SALES_AGENT"
            ? fieldExecutiveSidebarItems
            : telecallerSidebarItems
        }
        activeItem="Call History"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardHeader
          search="Search leads, customers, projects..."
          onSearchChange={() => {}}
          onMobileMenuOpen={() => setMobileMenuOpen(true)}
          onDesktopSidebarToggle={() => setSidebarCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-2">
              <span className="cursor-pointer text-primary hover:underline">
                Communication
              </span>
              <span className="text-sm font-semibold text-muted-foreground">
                &gt;
              </span>
              <span className="text-sm font-semibold text-foreground">
                Call History
              </span>
            </div>
          }
        />

        <div className="flex-1 overflow-auto">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-secondary">
                  Call History
                </h1>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Completed call follow-ups for {user?.fullName ?? "your queue"}.
                  This screen now reflects the outcome and remarks captured at
                  completion time.
                </p>
              </div>
              <Button
                variant="outline"
                className="h-10 border-slate-200 bg-white font-semibold text-secondary shadow-sm hover:bg-slate-50"
                onClick={() => void callHistoryQuery.refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" />
                Refresh
              </Button>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
              <SummaryCard
                icon={PhoneCall}
                label="Completed calls"
                value={String(filteredRows.length)}
                helper="Closed call follow-ups in the current view"
                tone="bg-blue-50 text-blue-600"
              />
              <SummaryCard
                icon={CheckCircle2}
                label="Connected"
                value={String(summary.connected)}
                helper="Calls marked successfully connected"
                tone="bg-emerald-50 text-emerald-600"
              />
              <SummaryCard
                icon={UserCheck}
                label="Interested leads"
                value={String(summary.interested)}
                helper="Leads that showed buying intent"
                tone="bg-violet-50 text-violet-600"
              />
              <SummaryCard
                icon={Calendar}
                label="Callback requested"
                value={String(summary.callbackRequested)}
                helper="Calls that need a deliberate callback"
                tone="bg-amber-50 text-amber-600"
              />
              <SummaryCard
                icon={PhoneMissed}
                label="Needs re-engagement"
                value={String(summary.needsRetry || summary.completedToday)}
                helper="No answer or not interested outcomes today"
                tone="bg-rose-50 text-rose-600"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,0.8fr))]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by lead, mobile, location, outcome..."
                    className="h-10 border-slate-200 pl-9"
                  />
                </div>

                <Select
                  value={outcomeFilter}
                  onValueChange={(value) => {
                    setOutcomeFilter(value as OutcomeFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All outcomes</SelectItem>
                    <SelectItem value="connected">Connected</SelectItem>
                    <SelectItem value="callback requested">
                      Callback requested
                    </SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="not interested">Not interested</SelectItem>
                    <SelectItem value="no answer">No answer</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={executiveFilter}
                  onValueChange={(value) => {
                    setExecutiveFilter(value as ExecutiveFilter);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Executive" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mine">My completed calls</SelectItem>
                    <SelectItem value="all">All visible records</SelectItem>
                    <SelectItem value="unassigned">Unassigned records</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <SearchableSelect
                    value={dateFilter}
                    onValueChange={(value) => {
                      setDateFilter(value as DateFilter);
                      setPage(1);
                    }}
                    options={dateRangeOptions}
                    placeholder="All Date Range"
                    ariaLabel="Date Range"
                    searchPlaceholder="Search date range..."
                    className="h-10 border-slate-200 bg-white"
                    contentClassName="min-w-[260px]"
                    modal={false}
                    portaled={false}
                  />
                  {dateFilter === "custom" ? (
                    <div className="grid gap-2 sm:grid-cols-2 pt-1">
                      <DatePicker
                        aria-label="Start date"
                        value={customFrom}
                        max={customTo || undefined}
                        className="h-9 text-xs font-bold shadow-none bg-white"
                        onChange={(e) => {
                          setCustomFrom(e.target.value);
                          setPage(1);
                        }}
                      />
                      <DatePicker
                        aria-label="End date"
                        value={customTo}
                        min={customFrom || undefined}
                        className="h-9 text-xs font-bold shadow-none bg-white"
                        onChange={(e) => {
                          setCustomTo(e.target.value);
                          setPage(1);
                        }}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedRows.length > 0 ? (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary px-3 py-1 font-bold text-primary-foreground">
                    {selectedRows.length} selected
                  </Badge>
                  <p className="text-xs font-semibold text-secondary">
                    Selection is available for quick review. Recording and
                    telephony-only actions have been removed from this screen.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 font-semibold text-muted-foreground hover:text-secondary"
                  onClick={() => setSelectedRows([])}
                >
                  Clear selection
                </Button>
              </div>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-slate-200 bg-slate-50/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-12 px-4 text-center">
                        <Checkbox
                          checked={
                            paginatedRows.length > 0 &&
                            selectedOnPage === paginatedRows.length
                          }
                          onChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Lead details
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Requirement
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Completed on
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Outcome
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Next action
                      </TableHead>
                      <TableHead className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Completed by
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {callHistoryQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-4 py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <p className="text-sm font-semibold text-muted-foreground">
                              Loading completed call history...
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : callHistoryQuery.isError ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-4 py-16 text-center">
                          <p className="text-sm font-semibold text-destructive">
                            Unable to load call history right now.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : paginatedRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="px-4 py-16 text-center">
                          <div className="mx-auto max-w-md">
                            <h3 className="text-base font-extrabold text-secondary">
                              No completed call history found
                            </h3>
                            <p className="mt-2 text-sm font-semibold text-muted-foreground">
                              Completed call follow-ups will appear here once the
                              outcome and remarks are captured during completion.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRows.map((row) => {
                        const isExpanded = expandedRow === row.id;
                        const leadHistory =
                          previousCallsByLead.get(row.leadId)?.filter(
                            (entry) => entry.id !== row.id,
                          ) ?? [];

                        return (
                          <Fragment key={row.id}>
                            <TableRow
                              className={cn(
                                "cursor-pointer transition-colors hover:bg-slate-50/80",
                                selectedRows.includes(row.id)
                                  ? "bg-primary/5 hover:bg-primary/5"
                                  : "",
                                isExpanded ? "border-b-0 bg-slate-50/70" : "",
                              )}
                              onClick={(event) => {
                                if (
                                  (event.target as HTMLElement).closest(
                                    ".checkbox-cell",
                                  ) ||
                                  (event.target as HTMLElement).closest(
                                    ".action-cell",
                                  )
                                ) {
                                  return;
                                }
                                setExpandedRow((prev) =>
                                  prev === row.id ? null : row.id,
                                );
                              }}
                            >
                              <TableCell className="checkbox-cell px-4 py-3 text-center">
                                <Checkbox
                                  checked={selectedRows.includes(row.id)}
                                  onChange={() => toggleRow(row.id)}
                                />
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orange-100 bg-orange-50 text-[11px] font-black tracking-wider text-orange-600">
                                    {row.initials}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-extrabold text-secondary">
                                      {row.leadName}
                                    </p>
                                    <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                                      {row.mobile}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-bold text-secondary">
                                    {row.propertyLabel}
                                  </p>
                                  <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
                                    {row.locationLabel}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap">
                                <p className="text-xs font-bold text-secondary">
                                  {row.completedDateLabel}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                                  {row.completedTimeLabel}
                                </p>
                              </TableCell>
                              <TableCell className="px-4 py-3 whitespace-nowrap">
                                <Badge
                                  variant={getOutcomeBadgeVariant(row.outcome) as never}
                                  className="rounded-md px-2 py-0.5 text-[10px] font-extrabold"
                                >
                                  {row.outcome}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <p className="truncate text-xs font-bold text-secondary">
                                  {row.nextAction}
                                </p>
                                <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                                  Status: {row.followUpStatus}
                                </p>
                              </TableCell>
                              <TableCell className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-7 w-7 border border-slate-200">
                                    <AvatarImage src={row.createdByAvatarUrl} />
                                    <AvatarFallback className="bg-slate-100 text-[10px] font-bold text-secondary">
                                      {toInitials(row.createdBy)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-secondary">
                                      {row.createdBy}
                                    </p>
                                    <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">
                                      {row.createdByRole}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="action-cell px-4 py-3 text-center">
                                <Link to={`/telecaller/leads/${row.leadId}`}>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-md border-slate-200 bg-white text-secondary shadow-none hover:bg-slate-50"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>

                            {isExpanded ? (
                            <TableRow className="bg-slate-50/50">
                                <TableCell colSpan={8} className="border-b border-slate-200 p-0">
                                  <div className="mx-4 my-3 grid gap-6 rounded-xl border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-secondary">
                                          Completion summary
                                        </h4>
                                        <div className="mt-3 grid gap-2 text-xs">
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Scheduled
                                            </span>
                                            <span className="text-right font-bold text-secondary">
                                              {row.scheduledLabel}
                                            </span>
                                          </div>
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Completed
                                            </span>
                                            <span className="text-right font-bold text-secondary">
                                              {row.completedDateLabel} at{" "}
                                              {row.completedTimeLabel}
                                            </span>
                                          </div>
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Outcome
                                            </span>
                                            <span className="text-right font-bold text-secondary">
                                              {row.outcome}
                                            </span>
                                          </div>
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Follow-up status
                                            </span>
                                            <Badge
                                              variant={
                                                getStatusBadgeVariant(
                                                  row.followUpStatus,
                                                ) as never
                                              }
                                              className="rounded-md px-2 py-0.5 text-[10px] font-extrabold"
                                            >
                                              {row.followUpStatus}
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-secondary">
                                          Completion remarks
                                        </h4>
                                        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-medium leading-relaxed text-secondary/85">
                                          {row.remarks}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-secondary">
                                          Next action
                                        </h4>
                                        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-secondary">
                                          {row.nextAction}
                                        </p>
                                      </div>

                                      <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-secondary">
                                          Lead context
                                        </h4>
                                        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Lead
                                            </span>
                                            <span className="text-right font-bold text-secondary">
                                              {row.leadName}
                                            </span>
                                          </div>
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Mobile
                                            </span>
                                            <span className="text-right font-bold text-secondary">
                                              {row.mobile}
                                            </span>
                                          </div>
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Requirement
                                            </span>
                                            <span className="text-right font-bold text-secondary">
                                              {row.propertyLabel}
                                            </span>
                                          </div>
                                          <div className="flex items-start justify-between gap-3">
                                            <span className="font-semibold text-muted-foreground">
                                              Location
                                            </span>
                                            <span className="text-right font-bold text-secondary">
                                              {row.locationLabel}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-4">
                                      <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-secondary">
                                          Previous completed calls
                                        </h4>
                                        <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                                          {leadHistory.length > 0 ? (
                                            leadHistory.slice(0, 4).map((entry) => (
                                              <div
                                                key={entry.id}
                                                className="flex items-start justify-between gap-3 text-xs"
                                              >
                                                <div className="min-w-0">
                                                  <p className="font-bold text-secondary">
                                                    {entry.completedDateLabel}
                                                  </p>
                                                  <p className="mt-1 truncate font-semibold text-muted-foreground">
                                                    {entry.outcome}
                                                  </p>
                                                </div>
                                                <span className="shrink-0 font-bold text-secondary">
                                                  {entry.completedTimeLabel}
                                                </span>
                                              </div>
                                            ))
                                          ) : (
                                            <p className="text-xs font-semibold text-muted-foreground">
                                              No earlier completed calls for this lead.
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <div className="flex items-center gap-2 text-xs font-bold text-secondary">
                                          <Clock3 className="h-4 w-4 text-primary" />
                                          This history is sourced from completed
                                          call follow-ups
                                        </div>
                                        <p className="mt-2 text-xs font-semibold leading-relaxed text-muted-foreground">
                                          Whatever was captured in the
                                          completion modal as call outcome and
                                          remarks is what appears here.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-semibold text-muted-foreground">
                  Showing{" "}
                  <span className="font-bold text-secondary">
                    {filteredRows.length === 0
                      ? 0
                      : (currentPage - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-bold text-secondary">
                    {Math.min(currentPage * pageSize, filteredRows.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-secondary">
                    {filteredRows.length}
                  </span>{" "}
                  completed call records
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Rows per page:
                    </span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(Number(value));
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[74px] border-slate-200 bg-white text-xs font-bold text-secondary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <TablePageSizeOptions sizes={[10, 20]} labelPrefix="" />
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md border-slate-200 bg-white"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>

                    <span className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-secondary">
                      {currentPage} / {pageCount}
                    </span>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-md border-slate-200 bg-white"
                      disabled={currentPage >= pageCount}
                      onClick={() =>
                        setPage((value) => Math.min(pageCount, value + 1))
                      }
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
