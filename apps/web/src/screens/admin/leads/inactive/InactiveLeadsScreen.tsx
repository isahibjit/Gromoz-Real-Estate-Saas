import {
  ArrowDown,
  BarChart3,
  CalendarClock,
  ChevronRight,
  Download,
  Filter,
  RefreshCw,
  Search,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  MultiSelect,
  SearchableSelect,
  cn,
} from "ui";

import { getAdminLeadSla } from "../../../../common/sla/slaData";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { addLeadSidebarItems } from "../add/addLeadData";
import { LeadsTable } from "../all/AllLeadsScreen";
import type { LeadRow } from "../all/allLeadsTypes";
import {
  LEAD_TABLE_MAX_ROWS,
  useAllLeads,
  useLeadColumnPreferences,
  useLeadListFilterOptions,
  type LeadFilterOption,
  type LeadListFilterOptions,
  type LeadListFilters,
} from "../all/useAllLeads";
import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import { downloadLeadRowsCsv } from "../components/exportCsv";

const inactiveStatusLabels = new Set(["not interested", "lost lead", "lost"]);
type SlaFilter = "all" | "on-time" | "due-soon" | "breached";
type DateRangeFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

const initialLeadFilters: LeadListFilters = {
  sourceId: [],
  integrationConnectionId: [],
  statusId: [],
  stageId: [],
  temperatureId: [],
  propertyType: [],
  configuration: [],
  ownerId: [],
  telecallerId: [],
  teamId: [],
  area: [],
  projectId: [],
  from: "",
  to: "",
};

const emptyCompletedSiteVisitLeadIds = new Set<string>();

const dateRangeOptions: Array<{ label: string; value: DateRangeFilter }> = [
  { label: "All Date Range", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom Range", value: "custom" },
];

const isInactiveLead = (lead: LeadRow) =>
  inactiveStatusLabels.has(lead.stage.trim().toLowerCase()) ||
  inactiveStatusLabels.has(lead.status.trim().toLowerCase());

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const resolveDateRange = (range: DateRangeFilter) => {
  const end = new Date();
  const start = new Date(end);

  if (range === "all" || range === "custom") {
    return { from: "", to: "" };
  }

  if (range === "today") {
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "yesterday") {
    start.setDate(end.getDate() - 1);
    return { from: toDateInput(start), to: toDateInput(start) };
  }

  if (range === "last7") {
    start.setDate(end.getDate() - 6);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "last30") {
    start.setDate(end.getDate() - 29);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "lastMonth") {
    start.setMonth(end.getMonth() - 1, 1);
    end.setDate(0);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  start.setDate(1);
  return { from: toDateInput(start), to: toDateInput(end) };
};

function countByLabel(rows: LeadRow[], getLabel: (lead: LeadRow) => string) {
  const counts = new Map<string, number>();
  rows.forEach((lead) => {
    const label = getLabel(lead).trim() || "Not captured";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value }))
    .sort(
      (left, right) =>
        right.value - left.value || left.label.localeCompare(right.label),
    );
}

function InactiveFiltersCard({
  filters,
  dateRange,
  options,
  selectedSlaFilter,
  onApply,
  onDateRangeChange,
  onExport,
  onFilterChange,
  onReset,
  onSlaFilterChange,
}: {
  filters: LeadListFilters;
  dateRange: DateRangeFilter;
  options: LeadListFilterOptions;
  selectedSlaFilter: SlaFilter;
  onApply: () => void;
  onDateRangeChange: (value: DateRangeFilter) => void;
  onExport: () => void;
  onFilterChange: <K extends keyof LeadListFilters>(
    key: K,
    value: LeadListFilters[K],
  ) => void;
  onReset: () => void;
  onSlaFilterChange: (value: SlaFilter) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const columnsPreference = useLeadColumnPreferences();
  const visibleColumnIds = columnsPreference.query.data?.visibleColumns ?? [
    "addedDate",
    "lastUpdate",
    "source",
    "name",
    "number",
    "projectName",
    "executive",
    "leadStatus",
    "leadType",
    "followUpDate",
    "remark",
    "actions",
  ];
  const canViewSourceColumn = visibleColumnIds.includes("source");
  const multiSelectFields = [
    "sourceId",
    "statusId",
    "temperatureId",
    "propertyType",
    "configuration",
    "area",
    "ownerId",
    "teamId",
  ] as const;
  type MultiSelectFilterKey = (typeof multiSelectFields)[number];
  type FilterField = {
    key: MultiSelectFilterKey;
    label: string;
    placeholder: string;
    options: LeadFilterOption[];
  };
  const filterFields = (
    [
      {
        key: "sourceId",
        label: "Lead Source",
        placeholder: "All Source",
        options: options.sourceOptions,
      },
      {
        key: "statusId",
        label: "Lead Status",
        placeholder: "All Status",
        options: options.statusOptions,
      },
      {
        key: "temperatureId",
        label: "Lead Type",
        placeholder: "All Lead Types",
        options: options.leadTypeOptions,
      },
      {
        key: "propertyType",
        label: "Property Type",
        placeholder: "All Property Type",
        options: options.propertyTypeOptions,
      },
      {
        key: "configuration",
        label: "Configuration",
        placeholder: "All Configuration",
        options: options.configurationOptions,
      },
      {
        key: "ownerId",
        label: "Assigned To",
        placeholder: "All Assigned To",
        options: options.ownerOptions,
      },
      {
        key: "teamId",
        label: "Team-wise",
        placeholder: "All Teams",
        options: options.teamOptions,
      },
      {
        key: "area",
        label: "Area-wise",
        placeholder: "All Areas",
        options: options.areaOptions,
      },
    ] satisfies FilterField[]
  ).filter((filter) => canViewSourceColumn || filter.key !== "sourceId");
  const activeFilterCount =
    multiSelectFields.filter((key) => {
      if (!canViewSourceColumn && key === "sourceId") return false;
      return filters[key].length > 0;
    }).length +
    (dateRange !== "all" ? 1 : 0) +
    (selectedSlaFilter !== "all" ? 1 : 0);

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-secondary">
              Advanced filters
            </h3>
            <Badge
              variant="neutral"
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600"
            >
              {activeFilterCount} active
            </Badge>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            Refine inactive leads by source, status, ownership, property fit,
            SLA, and date.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md px-4 shadow-none sm:self-start"
          onClick={() => setIsCollapsed((current) => !current)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          {isCollapsed ? "Show filters" : "Hide filters"}
        </Button>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isCollapsed
            ? "max-h-0 opacity-0 pt-0"
            : "max-h-[1200px] opacity-100 pt-4",
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filterFields.map((filter) => (
            <div key={filter.key} className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                {filter.label}
              </span>
              <MultiSelect
                value={filters[filter.key]}
                onValueChange={(value) => onFilterChange(filter.key, value)}
                options={filter.options.map((option) => ({
                  label: option.label,
                  value: option.value,
                }))}
                placeholder={filter.placeholder}
                ariaLabel={filter.label}
                className="min-h-10 rounded-md"
                contentClassName="min-w-[280px]"
                searchPlaceholder={`Search ${filter.label.toLowerCase()}...`}
                selectedLabelText={filter.label.toLowerCase()}
                selectedLabelTextPlural={filter.label.toLowerCase()}
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>
          ))}
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Date Range
            </span>
            <div className="space-y-2">
              <SearchableSelect
                value={dateRange}
                onValueChange={(value) =>
                  onDateRangeChange(value as DateRangeFilter)
                }
                options={dateRangeOptions}
                placeholder="All Date Range"
                ariaLabel="Date Range"
                searchPlaceholder="Search date range..."
                contentClassName="min-w-[260px]"
                modal={false}
                portaled={false}
              />
              {dateRange === "custom" ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <DatePicker
                    aria-label="Custom range start date"
                    value={filters.from}
                    max={filters.to || undefined}
                    className="h-10 rounded-md text-xs font-bold shadow-none"
                    onChange={(event) =>
                      onFilterChange("from", event.target.value)
                    }
                  />
                  <DatePicker
                    aria-label="Custom range end date"
                    value={filters.to}
                    min={filters.from || undefined}
                    className="h-10 rounded-md text-xs font-bold shadow-none"
                    onChange={(event) =>
                      onFilterChange("to", event.target.value)
                    }
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              SLA Status
            </span>
            <SearchableSelect
              value={selectedSlaFilter}
              onValueChange={(value) => onSlaFilterChange(value as SlaFilter)}
              options={[
                { label: "All SLA Statuses", value: "all" },
                { label: "On Time", value: "on-time" },
                { label: "Due Soon", value: "due-soon" },
                { label: "Breached", value: "breached" },
              ]}
              placeholder="All SLA Statuses"
              ariaLabel="SLA Status"
              searchPlaceholder="Search SLA status..."
              contentClassName="min-w-[260px]"
              modal={false}
              portaled={false}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end xl:col-span-4">
            <Button
              type="button"
              className="h-10 rounded-md px-6"
              onClick={onApply}
            >
              <Filter className="h-4 w-4" />
              Apply Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-5 shadow-none"
              onClick={onReset}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-5 shadow-none"
              onClick={onExport}
            >
              <Download className="h-4 w-4" />
              Export Leads
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function InactiveDistributionCard({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: Array<{ label: string; value: number }>;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const topRows = rows.slice(0, 5);

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-secondary">
          <BarChart3 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-extrabold text-secondary">{title}</h2>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {topRows.length ? (
        <div className="space-y-3">
          {topRows.map((row) => {
            const percent =
              total > 0 ? Math.round((row.value / total) * 100) : 0;
            return (
              <div key={row.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs font-extrabold text-secondary">
                  <span className="truncate">{row.label}</span>
                  <span className="shrink-0">{row.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className="h-full rounded-md bg-primary"
                    style={{
                      width: `${Math.max(percent, row.value > 0 ? 6 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-200 p-4 text-sm font-semibold text-muted-foreground">
          No inactive lead data available for this filter.
        </p>
      )}
    </Card>
  );
}

export function InactiveLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draftFilters, setDraftFilters] =
    useState<LeadListFilters>(initialLeadFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<LeadListFilters>(initialLeadFilters);
  const [selectedDateRange, setSelectedDateRange] =
    useState<DateRangeFilter>("all");
  const [selectedSlaFilter, setSelectedSlaFilter] = useState<SlaFilter>("all");
  const navigate = useNavigate();
  const filterOptionsQuery = useLeadListFilterOptions();
  const columnsPreference = useLeadColumnPreferences();
  const visibleColumnIds = columnsPreference.query.data?.visibleColumns ?? [
    "addedDate",
    "lastUpdate",
    "source",
    "name",
    "number",
    "projectName",
    "executive",
    "leadStatus",
    "leadType",
    "followUpDate",
    "remark",
    "actions",
  ];
  const canViewSourceColumn = visibleColumnIds.includes("source");
  const inactiveStatusOptions = useMemo(
    () =>
      filterOptionsQuery.options.statusOptions.filter((option) =>
        inactiveStatusLabels.has(option.label.trim().toLowerCase()),
      ),
    [filterOptionsQuery.options.statusOptions],
  );
  const inactiveStatusIds = useMemo(
    () => inactiveStatusOptions.map((option) => option.value),
    [inactiveStatusOptions],
  );
  const inactiveFilterOptions = useMemo<LeadListFilterOptions>(
    () => ({
      ...filterOptionsQuery.options,
      statusOptions: inactiveStatusOptions,
    }),
    [filterOptionsQuery.options, inactiveStatusOptions],
  );
  const queryFilters = useMemo<LeadListFilters>(() => {
    const statusId =
      appliedFilters.statusId.length > 0
        ? appliedFilters.statusId
        : inactiveStatusIds;

    return {
      ...appliedFilters,
      sourceId: canViewSourceColumn ? appliedFilters.sourceId : [],
      statusId,
    };
  }, [appliedFilters, canViewSourceColumn, inactiveStatusIds]);
  const leadsQuery = useAllLeads(
    search,
    undefined,
    undefined,
    queryFilters,
    LEAD_TABLE_MAX_ROWS,
  );
  const rows = useMemo(
    () => (leadsQuery.data?.rows ?? []).filter(isInactiveLead),
    [leadsQuery.data?.rows],
  );
  const visibleRows = useMemo(
    () =>
      rows.filter(
        (lead) =>
          selectedSlaFilter === "all" ||
          getAdminLeadSla(lead.id).status === selectedSlaFilter,
      ),
    [rows, selectedSlaFilter],
  );
  const statusBreakdown = useMemo(
    () =>
      countByLabel(
        visibleRows,
        (lead) => lead.status || lead.stage || "Inactive",
      ),
    [visibleRows],
  );
  const sourceBreakdown = useMemo(
    () => countByLabel(visibleRows, (lead) => lead.source || "Unknown"),
    [visibleRows],
  );
  const lostCount = useMemo(
    () =>
      visibleRows.filter((lead) => {
        const status = `${lead.status} ${lead.stage}`.toLowerCase();
        return Boolean(lead.lostAt) || status.includes("lost");
      }).length,
    [visibleRows],
  );
  const notInterestedCount = useMemo(
    () =>
      visibleRows.filter((lead) => {
        const status = `${lead.status} ${lead.stage}`.toLowerCase();
        return status.includes("not interest");
      }).length,
    [visibleRows],
  );
  const followUpCount = useMemo(
    () =>
      visibleRows.filter(
        (lead) => lead.nextFollowUp && lead.nextFollowUp !== "Not Set",
      ).length,
    [visibleRows],
  );
  const statsRowItems = useMemo<LeadStatsRowItem[]>(
    () => [
      {
        label: "Inactive leads",
        value: String(visibleRows.length),
        change: "",
        helper: "Current filtered list",
        icon: UserX,
        tone: "bg-slate-100 text-secondary",
      },
      {
        label: "Not interested",
        value: String(notInterestedCount),
        change: "",
        helper: "Requires nurture decision",
        icon: UserX,
        tone: "bg-red-50 text-red-600",
      },
      {
        label: "Lost status",
        value: String(lostCount),
        change: "",
        helper: "Shown here, not on a separate page",
        icon: BarChart3,
        tone: "bg-orange-50 text-primary",
      },
      {
        label: "With follow-up",
        value: String(followUpCount),
        change: "",
        helper: "Still has a scheduled reminder",
        icon: CalendarClock,
        tone: "bg-blue-50 text-blue-700",
      },
    ],
    [followUpCount, lostCount, notInterestedCount, visibleRows.length],
  );
  const handleFilterChange = <K extends keyof LeadListFilters>(
    key: K,
    value: LeadListFilters[K],
  ) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const handleDateRangeChange = (value: DateRangeFilter) => {
    setSelectedDateRange(value);
    if (value === "custom") {
      setDraftFilters((current) => ({ ...current, from: "", to: "" }));
      return;
    }
    const { from, to } = resolveDateRange(value);
    setDraftFilters((current) => ({ ...current, from, to }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const handleResetFilters = () => {
    setDraftFilters(initialLeadFilters);
    setAppliedFilters(initialLeadFilters);
    setSelectedDateRange("all");
    setSelectedSlaFilter("all");
  };

  const handleExportLeads = () => {
    if (!visibleRows.length) {
      toast.error("No inactive leads available to export");
      return;
    }

    downloadLeadRowsCsv({
      rows: visibleRows,
      filePrefix: "inactive-leads-export",
      visibleColumns: visibleColumnIds,
    });
    toast.success(
      `Exported ${visibleRows.length} inactive lead${
        visibleRows.length === 1 ? "" : "s"
      }`,
    );
  };

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="Inactive Leads"
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
              <span>Lead Management</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Inactive Leads</span>
            </div>
          }
        >
          <div className="relative w-full max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search inactive leads"
              value={search}
              placeholder="Search inactive leads, mobile number, source..."
              className="h-10 rounded-md border-slate-200 pl-11 text-sm font-semibold shadow-none"
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
      </DashboardHeader>
      <WorkspacePage>
          <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-extrabold text-secondary">
                <UserX className="h-7 w-7 text-red-600" />
                Inactive Leads
              </h1>
              <p className="mt-2 text-sm font-semibold text-blue-800">
                Leads marked as Not Interested, Lost Lead, or Lost. These stay
                visible in All Leads but are removed from active follow-up
                queues.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md px-5 shadow-none"
              onClick={() => leadsQuery.refetch()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </section>

          <StatsRow stats={statsRowItems} />

          <div
            className={cn(
              "grid gap-5",
              canViewSourceColumn && "xl:grid-cols-2",
            )}
          >
            <InactiveDistributionCard
              title="Inactive status distribution"
              description="Understand whether inactivity is driven by rejection, loss, or another inactive status."
              rows={statusBreakdown}
            />
            {canViewSourceColumn ? (
              <InactiveDistributionCard
                title="Inactive source distribution"
                description="See which lead sources are producing the highest inactive volume."
                rows={sourceBreakdown}
              />
            ) : null}
          </div>

          <InactiveFiltersCard
            filters={draftFilters}
            dateRange={selectedDateRange}
            options={inactiveFilterOptions}
            selectedSlaFilter={selectedSlaFilter}
            onApply={handleApplyFilters}
            onDateRangeChange={handleDateRangeChange}
            onExport={handleExportLeads}
            onFilterChange={handleFilterChange}
            onReset={handleResetFilters}
            onSlaFilterChange={setSelectedSlaFilter}
          />

          <LeadsTable
            rows={visibleRows}
            total={visibleRows.length}
            isLoading={leadsQuery.isLoading}
            activeLeadBucketFilter="all"
            completedSiteVisitLeadIds={emptyCompletedSiteVisitLeadIds}
            selectedSlaFilter="all"
            sourceOptions={filterOptionsQuery.options.sourceOptions}
            statusOptions={filterOptionsQuery.options.statusOptions}
            leadTypeOptions={filterOptionsQuery.options.leadTypeOptions}
            budgetOptions={filterOptionsQuery.options.budgetOptions}
            configurationOptions={
              filterOptionsQuery.options.configurationOptions
            }
            areaOptions={filterOptionsQuery.options.areaOptions}
            assigneeOptions={filterOptionsQuery.options.ownerOptions}
          />
      </WorkspacePage>
    </>
  );
}
