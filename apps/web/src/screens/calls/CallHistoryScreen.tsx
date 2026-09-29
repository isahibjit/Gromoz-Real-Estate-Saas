import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  FilterX,
  PhoneCall,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  cn,
  DataTable,
  type ColumnDef,
  DatePicker,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  TablePageSizeOptions,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

import { api } from "../../common/api";
import { LeadCell } from "../../common/components/DataTableCells";

type CallLog = {
  id: string;
  direction: string;
  startedAt: string;
  durationSeconds?: number | null;
  outcome?: string | null;
  notes?: string | null;
  lead?: {
    id: string;
    displayId: string;
    name: string;
    mobile: string;
  } | null;
  caller?: {
    fullName: string | null;
    role: string;
    employeeProfile?: { team?: { name: string } | null } | null;
  } | null;
};

type CallLogResponse = {
  data: CallLog[];
  meta: { page: number; limit: number; total: number };
};

type TeamOption = {
  id: string;
  name: string;
  isActive?: boolean;
};

type CallerOption = {
  id: string;
  name: string;
  role?: string;
};

type PipelineFiltersResponse = {
  filters?: { users?: CallerOption[] };
};

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


function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

function formatDuration(seconds?: number | null) {
  const value = Number(seconds ?? 0);
  if (!value) return "-";
  return `${Math.floor(value / 60)}m ${value % 60}s`;
}

function outcomeTone(outcome?: string | null) {
  switch (outcome?.toLowerCase()) {
    case "connected":
    case "interested":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "no answer":
    case "busy":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "not interested":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

const columns: ColumnDef<CallLog>[] = [
  {
    id: "when",
    header: "When",
    className: "w-[174px] whitespace-nowrap",
    headerClassName: "w-[174px]",
    cell: (log) => (
      <div className="flex items-start gap-2 text-xs font-bold text-secondary">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span>{formatDateTime(log.startedAt)}</span>
      </div>
    ),
  },
  {
    id: "caller",
    header: "Caller",
    className: "w-[190px]",
    headerClassName: "w-[190px]",
    cell: (log) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-secondary">
          {log.caller?.fullName ?? "Unknown caller"}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
          {log.caller?.employeeProfile?.team?.name ??
            log.caller?.role ??
            "No team"}
        </p>
      </div>
    ),
  },
  {
    id: "lead",
    header: "Lead / customer",
    className: "w-[240px]",
    headerClassName: "w-[240px]",
    cell: (log) =>
      log.lead ? (
        <LeadCell
          id={log.lead.id}
          displayId={log.lead.displayId}
          name={log.lead.name}
          phone={log.lead.mobile}
        />
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">
          Lead removed
        </span>
      ),
  },
  {
    id: "direction",
    header: "Direction",
    className: "w-[120px]",
    headerClassName: "w-[120px]",
    cell: (log) => (
      <span className="text-xs font-bold text-secondary">{log.direction}</span>
    ),
  },
  {
    id: "outcome",
    header: "Outcome",
    className: "w-[150px]",
    headerClassName: "w-[150px]",
    cell: (log) => (
      <Badge
        className={cn(
          "max-w-full whitespace-nowrap px-2 py-0.5 text-[10px] font-extrabold",
          outcomeTone(log.outcome),
        )}
      >
        {log.outcome ?? "Not captured"}
      </Badge>
    ),
  },
  {
    id: "duration",
    header: "Duration",
    className: "w-[100px] whitespace-nowrap text-xs font-bold text-secondary",
    headerClassName: "w-[100px]",
    cell: (log) => formatDuration(log.durationSeconds),
  },
  {
    id: "remarks",
    header: "Remarks",
    className: "min-w-[280px] max-w-[420px]",
    cell: (log) => (
      <p className="line-clamp-2 text-xs font-medium leading-relaxed text-muted-foreground">
        {log.notes?.trim() || "No remarks captured"}
      </p>
    ),
  },
];

export function CallHistoryScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState("all");
  const [direction, setDirection] = useState("all");
  const [teamId, setTeamId] = useState("all");
  const [executiveId, setExecutiveId] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const teamsQuery = useQuery({
    queryKey: ["teams", "call-history-filter-options"],
    queryFn: async () =>
      (await api.get<{ data: TeamOption[] }>("/teams")).data.data,
  });
  const callersQuery = useQuery({
    queryKey: ["call-history", "caller-filter-options"],
    queryFn: async () =>
      (
        await api.get<PipelineFiltersResponse>("/leads/pipeline", {
          params: { limitPerColumn: 1 },
        })
      ).data.filters?.users ?? [],
  });

  const queryParams = useMemo(
    () => ({
      page,
      limit,
      ...(search ? { search } : {}),
      ...(outcome !== "all" ? { outcome } : {}),
      ...(direction !== "all" ? { type: direction } : {}),
      ...(teamId !== "all" ? { teamId } : {}),
      ...(executiveId !== "all" ? { executive: executiveId } : {}),
    }),
    [direction, executiveId, limit, outcome, page, search, teamId],
  );
  const query = useQuery({
    queryKey: ["call-logs", queryParams],
    queryFn: async () =>
      (await api.get<CallLogResponse>("/call-logs", { params: queryParams }))
        .data,
  });

  const rawCallLogs = query.data?.data ?? [];
  const filteredCallLogs = useMemo(() => {
    return rawCallLogs.filter((log) =>
      matchesDateFilter(log.startedAt, dateFilter, customFrom, customTo),
    );
  }, [customFrom, customTo, dateFilter, rawCallLogs]);

  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const teams = (teamsQuery.data ?? []).filter((team: TeamOption) => team.isActive !== false);
  const callers = callersQuery.data ?? [];
  const filtersActive =
    Boolean(searchInput.trim()) ||
    outcome !== "all" ||
    direction !== "all" ||
    teamId !== "all" ||
    executiveId !== "all" ||
    dateFilter !== "all";
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);
  const paginationItems = buildPaginationItems(page, totalPages);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setOutcome("all");
    setDirection("all");
    setTeamId("all");
    setExecutiveId("all");
    setDateFilter("all");
    setCustomFrom("");
    setCustomTo("");
    setPage(1);
  };

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-sm font-extrabold text-primary">
            <PhoneCall className="h-4 w-4" />
            Communication
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-secondary sm:text-3xl">
            Call history
          </h1>
          <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
            Review every completed and attempted call across the teams you can
            access.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 self-start shadow-none lg:self-auto"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", query.isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </header>

      <section
        aria-label="Call history filters"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <label className="relative block min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-extrabold text-secondary">
              Search calls
            </span>
            <Search className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-slate-400" />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="h-10 pl-9 shadow-none"
              placeholder="Lead name, mobile, or lead ID"
            />
          </label>
          <label className="block w-full xl:w-[190px]">
            <span className="mb-1.5 block text-xs font-extrabold text-secondary">
              Team
            </span>
            <SearchableSelect
              value={teamId}
              onValueChange={(value) => {
                setTeamId(value);
                setPage(1);
              }}
              options={[
                { label: "All teams", value: "all" },
                ...teams.map((team: TeamOption) => ({
                  label: team.name,
                  value: team.id,
                })),
              ]}
              placeholder="All teams"
              searchPlaceholder="Search teams..."
              noOptionsText="No teams found"
              className="h-10 shadow-none"
            />
          </label>
          <label className="block w-full xl:w-[190px]">
            <span className="mb-1.5 block text-xs font-extrabold text-secondary">
              Caller
            </span>
            <SearchableSelect
              value={executiveId}
              onValueChange={(value) => {
                setExecutiveId(value);
                setPage(1);
              }}
              options={[
                { label: "All callers", value: "all" },
                ...callers.map((caller: CallerOption) => ({
                  label: `${caller.name}${caller.role ? ` (${caller.role})` : ""}`,
                  value: caller.id,
                })),
              ]}
              placeholder="All callers"
              searchPlaceholder="Search callers..."
              noOptionsText="No callers found"
              className="h-10 shadow-none"
            />
          </label>
          <label className="block w-full xl:w-[165px]">
            <span className="mb-1.5 block text-xs font-extrabold text-secondary">
              Outcome
            </span>
            <Select
              value={outcome}
              onValueChange={(value) => {
                setOutcome(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 shadow-none">
                <SelectValue placeholder="All outcomes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="Connected">Connected</SelectItem>
                <SelectItem value="No Answer">No answer</SelectItem>
                <SelectItem value="Busy">Busy</SelectItem>
                <SelectItem value="Interested">Interested</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="block w-full xl:w-[165px]">
            <span className="mb-1.5 block text-xs font-extrabold text-secondary">
              Direction
            </span>
            <Select
              value={direction}
              onValueChange={(value) => {
                setDirection(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 shadow-none">
                <SelectValue placeholder="All directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All directions</SelectItem>
                <SelectItem value="Outgoing">Outgoing</SelectItem>
                <SelectItem value="Incoming">Incoming</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="block w-full xl:w-[200px] space-y-1.5">
            <span className="block text-xs font-extrabold text-secondary">
              Date Range
            </span>
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
              className="h-10 bg-white shadow-none border-slate-200"
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
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <UsersRound className="h-4 w-4 text-primary" />
            Team and caller filters only show data within your access scope.
          </p>
          {filtersActive ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 self-start px-2 text-xs font-bold text-muted-foreground shadow-none hover:text-secondary sm:self-auto"
              onClick={resetFilters}
            >
              <FilterX className="mr-1.5 h-3.5 w-3.5" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-secondary">Call records</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {query.isFetching
                ? "Refreshing call history..."
                : `${filteredCallLogs.length.toLocaleString("en-IN")} matching calls`}
            </p>
          </div>
        </div>
        <DataTable
          className="rounded-none border-0 shadow-none"
          tableClassName="min-w-[1220px]"
          columns={columns}
          data={filteredCallLogs}
          isLoading={query.isLoading}
          minHeight="min-h-[480px]"
          emptyMessage="No calls match the current filters. Try changing or clearing a filter."
        />
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-semibold text-secondary">
            {query.isLoading
              ? "Loading calls..."
              : `Showing ${rangeStart} to ${rangeEnd} of ${total.toLocaleString("en-IN")} calls`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 w-8 rounded-md p-0 shadow-none"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-xs font-bold text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === page ? "navy" : "outline"}
                  className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
                  onClick={() => setPage(item)}
                >
                  {item}
                </Button>
              ),
            )}
            <Button
              type="button"
              variant="outline"
              className="h-8 w-8 rounded-md p-0 shadow-none"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Select
            value={String(limit)}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className="h-8 w-[100px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TablePageSizeOptions sizes={[20]} />
            </SelectContent>
          </Select>
        </div>
      </section>
    </main>
  );
}
