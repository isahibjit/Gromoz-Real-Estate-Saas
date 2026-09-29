import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  RefreshCcw,
  Search,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from "recharts";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Input,
  Progress,
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

import { api } from "../../../../common/api";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { addLeadSidebarItems } from "../add/addLeadData";
import type { LeadRow } from "../all/allLeadsTypes";
import { LEAD_TABLE_MAX_ROWS, useAllLeads } from "../all/useAllLeads";
import { LeadActionsMenu } from "../components/LeadActionsMenu";
import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import type {
  AIInsight,
  CampaignMetric,
  DistributionSegment,
  LostLeadBucket,
  LostLeadRow,
  SummaryRow,
} from "./lostLeadsTypes";

type SortOption = "lost-date" | "value-high" | "value-low" | "name" | "owner";

type LostReasonMaster = {
  id: string;
  name: string;
};

const bucketThresholds: Array<{
  id: LostLeadBucket;
  label: string;
  threshold?: number;
}> = [
  { id: "all", label: "All lost leads" },
  { id: "7-days", label: "Lost > 7 days", threshold: 7 },
  { id: "15-days", label: "Lost > 15 days", threshold: 15 },
  { id: "30-days", label: "Lost > 30 days", threshold: 30 },
  { id: "60-days", label: "Lost > 60 days", threshold: 60 },
];

const lossReasonPalette = [
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#0f766e",
];

const sortOptions: Array<{ label: string; value: SortOption }> = [
  { label: "Sort by: Lost date", value: "lost-date" },
  { label: "Sort by: Highest value", value: "value-high" },
  { label: "Sort by: Lowest value", value: "value-low" },
  { label: "Sort by: Lead name", value: "name" },
  { label: "Sort by: Owner", value: "owner" },
];


const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRawIdentifier = (value?: string | null) =>
  Boolean(value && uuidPattern.test(value));

const parseLeadCurrencyValue = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, "").trim();
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return 0;

  const lowerValue = value.toLowerCase();
  if (lowerValue.includes("cr")) return numeric * 10000000;
  if (lowerValue.includes("lakh")) return numeric * 100000;
  return numeric;
};

const formatLeadCurrencyValue = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "INR 0";
  if (value >= 10000000) return `INR ${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `INR ${(value / 100000).toFixed(2)} Lakh`;
  return `INR ${Math.round(value).toLocaleString("en-IN")}`;
};

const formatCompactDate = (value?: string | null) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCompactTime = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const getDaysSinceLoss = (lostAt?: string | null) => {
  if (!lostAt) return null;
  const lostAtDate = new Date(lostAt);
  if (Number.isNaN(lostAtDate.getTime())) return null;
  const diffMs = Date.now() - lostAtDate.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
};

const getLossReasonTone = (reason: string) => {
  const normalized = reason.toLowerCase();
  if (normalized.includes("budget")) return "bg-red-50 text-red-600";
  if (normalized.includes("competitor")) return "bg-violet-50 text-violet-700";
  if (normalized.includes("location")) return "bg-orange-50 text-orange-600";
  if (normalized.includes("not ready")) return "bg-emerald-50 text-emerald-600";
  if (normalized.includes("unresponsive")) return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-secondary";
};

const getAvatarTone = (reason: string) => {
  const normalized = reason.toLowerCase();
  if (normalized.includes("budget")) return "bg-red-50 text-red-600";
  if (normalized.includes("competitor")) return "bg-violet-50 text-violet-700";
  if (normalized.includes("location")) return "bg-orange-50 text-orange-600";
  if (normalized.includes("not ready")) return "bg-emerald-50 text-emerald-600";
  return "bg-blue-50 text-blue-700";
};

const getBucketThresholdMatch = (
  daysSinceLoss: number | null,
  bucket: LostLeadBucket,
) => {
  if (bucket === "all") return true;
  const threshold = Number(bucket.replace("-days", ""));
  return daysSinceLoss !== null && daysSinceLoss >= threshold;
};

const getBucketLabel = (
  daysSinceLoss: number | null,
): Exclude<LostLeadBucket, "all"> => {
  if (daysSinceLoss === null) return "7-days";
  if (daysSinceLoss >= 60) return "60-days";
  if (daysSinceLoss >= 30) return "30-days";
  if (daysSinceLoss >= 15) return "15-days";
  return "7-days";
};

const EmptyPanelState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex min-h-[210px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
    <p className="text-sm font-extrabold text-secondary">{title}</p>
    <p className="mt-2 max-w-sm text-xs font-semibold text-muted-foreground">
      {description}
    </p>
  </div>
);

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 shadow-card",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function DistributionDonut({
  data,
  centerValue,
  centerLabel,
}: {
  data: DistributionSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  return (
    <div className="relative h-[210px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="56%"
            outerRadius="82%"
            startAngle={90}
            endAngle={-270}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((segment) => (
              <Cell key={segment.label} fill={segment.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <strong className="text-2xl font-extrabold leading-none text-secondary">
          {centerValue}
        </strong>
        <span className="mt-1 text-xs font-bold text-muted-foreground">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

function LostLeadsTrendCard({
  data,
  total,
}: {
  data: Array<{ date: string; leads: number }>;
  total: number;
}) {
  return (
    <Panel
      title="Lost leads trend"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-md text-xs shadow-none"
        >
          Last 7 days <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {data.length === 0 || total === 0 ? (
        <EmptyPanelState
          title="No loss activity yet"
          description="Once leads are marked lost, this chart will show the daily trend for the last 7 days."
        />
      ) : (
        <div className="h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="lostTrendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#52647d", fontWeight: 700 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#52647d", fontWeight: 700 }}
              />
              <Tooltip formatter={(value) => [`${value}`, "Lost leads"]} />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#ef4444"
                strokeWidth={3}
                fill="url(#lostTrendFill)"
                dot={{ r: 3, fill: "#ef4444" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Panel>
  );
}

function LossReasonDistributionCard({
  data,
  total,
}: {
  data: DistributionSegment[];
  total: number;
}) {
  return (
    <Panel title="Loss reason distribution">
      {data.length === 0 || total === 0 ? (
        <EmptyPanelState
          title="No loss reasons available"
          description="Lost reason master selections will appear here once leads are marked lost."
        />
      ) : (
        <div className="grid items-center gap-4 md:grid-cols-[minmax(180px,0.9fr)_minmax(220px,1fr)]">
          <DistributionDonut
            data={data}
            centerValue={String(total)}
            centerLabel="Total lost leads"
          />
          <div className="space-y-3">
            {data.map((segment) => (
              <div
                key={segment.label}
                className="grid grid-cols-[10px_minmax(90px,1fr)_auto] items-center gap-3 text-xs"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="font-semibold text-secondary">
                  {segment.label}
                </span>
                <span className="font-extrabold text-secondary">
                  {segment.value} ({segment.percent})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}

function RecoveryOverviewCard({
  metrics,
  progressValue,
  progressLabel,
}: {
  metrics: CampaignMetric[];
  progressValue: number;
  progressLabel: string;
}) {
  return (
    <Panel
      title="Recovery opportunity overview"
      action={
        <span className="text-xs font-bold text-muted-foreground">
          Based on live lost leads
        </span>
      }
    >
      {metrics.length === 0 ? (
        <EmptyPanelState
          title="No recovery cohorts yet"
          description="Recovery metrics will populate automatically when lost leads are available."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-100 md:grid-cols-5">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="border-b border-r border-slate-100 p-3 last:border-r-0 md:border-b-0"
              >
                <p className="text-[10px] font-extrabold text-muted-foreground">
                  {metric.label}
                </p>
                <p className="mt-4 text-xl font-extrabold text-secondary">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs font-extrabold text-blue-700">
                  {metric.change}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between gap-4 text-xs font-bold">
              <span>Priority recovery focus</span>
              <span className="text-right text-secondary">{progressLabel}</span>
            </div>
            <Progress
              value={progressValue}
              className="h-2 bg-slate-100"
              indicatorClassName="bg-emerald-500"
            />
          </div>
        </>
      )}
    </Panel>
  );
}

function RecommendationsCard({
  title,
  items,
  footerLabel,
}: {
  title: string;
  items: AIInsight[];
  footerLabel: string;
}) {
  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <EmptyPanelState
          title="No recommendations yet"
          description="Actionable recovery prompts will appear here once there is enough loss activity."
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      item.tone,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-extrabold text-secondary">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {item.helper}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-md px-3 text-xs shadow-none"
                  >
                    {item.actionLabel}
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-10 w-full rounded-md text-xs font-extrabold shadow-none"
          >
            {footerLabel}
          </Button>
        </>
      )}
    </Panel>
  );
}

function LostLeadsSummaryCard({ rows }: { rows: SummaryRow[] }) {
  return (
    <Panel title="Lost leads summary">
      {rows.length === 0 ? (
        <EmptyPanelState
          title="No summary available"
          description="Summary signals will appear here when live lost lead data is available."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-4 text-xs">
              <span className="font-semibold text-muted-foreground">
                {row.label}
              </span>
              <span className="text-right font-extrabold text-secondary">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function LostLeadsTable({
  rows,
  totalRows,
  activeBucket,
  bucketCounts,
  sortBy,
  page,
  pageCount,
  pageSize,
  onBucketChange,
  onSortByChange,
  onPageChange,
  onPageSizeChange,
  onOpenLead,
}: {
  rows: LostLeadRow[];
  totalRows: number;
  activeBucket: LostLeadBucket;
  bucketCounts: Record<LostLeadBucket, number>;
  sortBy: SortOption;
  page: number;
  pageCount: number;
  pageSize: number;
  onBucketChange: (bucket: LostLeadBucket) => void;
  onSortByChange: (value: SortOption) => void;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
  onOpenLead: (leadId: string) => void;
}) {
  const visiblePageNumbers = useMemo(() => {
    if (pageCount <= 5)
      return Array.from({ length: pageCount }, (_, index) => index + 1);
    const start = Math.max(1, page - 2);
    const end = Math.min(pageCount, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, pageCount]);

  const rangeStart = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalRows === 0 ? 0 : Math.min(page * pageSize, totalRows);

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 sm:flex-row sm:items-center sm:justify-between p-2">
        <div className="flex gap-6 overflow-x-auto">
          {bucketThresholds.map((tab) => (
            <Button
              key={tab.id}
              type="button"
              variant="ghost"
              className={cn(
                "h-12 shrink-0 rounded-none border-b-2 border-transparent px-1 text-sm font-extrabold text-secondary hover:bg-transparent",
                activeBucket === tab.id && "border-blue-600 text-blue-700",
              )}
              onClick={() => onBucketChange(tab.id)}
            >
              {tab.label} ({bucketCounts[tab.id] ?? 0})
            </Button>
          ))}
        </div>
        <div className="flex gap-3 pb-3 sm:pb-0">
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md px-4 text-xs shadow-none"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Select
            value={sortBy}
            onValueChange={(value) => onSortByChange(value as SortOption)}
          >
            <SelectTrigger
              aria-label="Sort lost leads"
              className="h-9 w-[210px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              {[
                "Lead details",
                "Lost date",
                "Loss reason",
                "Competitor",
                "Lead source",
                "Value",
                "Stage at loss",
                "Owner",
                "Action",
              ].map((heading) => (
                <TableHead
                  key={heading}
                  className="h-10 whitespace-nowrap px-4 text-[11px] font-extrabold text-secondary"
                >
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                >
                  No lost leads match the current search or bucket.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((lead) => (
                <TableRow
                  key={lead.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50/80 focus-visible:outline-none"
                  onClick={() => onOpenLead(lead.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenLead(lead.id);
                    }
                  }}
                >
                  <TableCell className="min-w-[280px] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-extrabold",
                          lead.avatarTone,
                        )}
                      >
                        {lead.initials}
                      </span>
                      <div>
                        <p className="text-xs font-extrabold text-secondary">
                          {lead.name}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                          {lead.requirement}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-secondary">
                    <div className="flex flex-col gap-0.5">
                      <span>{lead.lostDate}</span>
                      <span className="text-muted-foreground">
                        {lead.lostTime || "Time unavailable"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 text-[10px] font-extrabold",
                        lead.lossReasonColor,
                      )}
                    >
                      {lead.lossReason}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-[11px] font-extrabold text-secondary">
                    {lead.competitor || (
                      <span className="font-semibold text-muted-foreground">
                        None
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3">
                    <Badge className="border-0 bg-blue-50 px-2 py-1 text-[11px] font-extrabold text-blue-700">
                      {lead.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-extrabold text-secondary">
                    {lead.potentialValue}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-[11px]">
                    <p className="font-extrabold text-secondary">
                      {lead.stageAtLoss}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        {lead.ownerAvatarUrl ? (
                          <AvatarImage
                            src={lead.ownerAvatarUrl}
                            alt={lead.owner}
                          />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(lead.owner)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] font-extrabold text-secondary">
                        {lead.owner}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div onClick={(event) => event.stopPropagation()}>
                      <LeadActionsMenu
                        lead={{
                          id: lead.id,
                          name: lead.name,
                          requirement: lead.requirement,
                        }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          Showing {rangeStart} to {rangeEnd} of {totalRows} lost leads
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {visiblePageNumbers.map((pageNumber) => (
            <Button
              key={pageNumber}
              type="button"
              variant={pageNumber === page ? "navy" : "outline"}
              className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => onPageSizeChange(Number(value))}
        >
          <SelectTrigger
            aria-label="Rows per page"
            className="h-8 w-[150px] rounded-md text-xs font-bold shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TablePageSizeOptions labelPrefix="Rows per page" />
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

const buildTrendData = (rows: LostLeadRow[]) => {
  const labels = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      }),
    };
  });

  const counts = new Map<string, number>();
  rows.forEach((row) => {
    if (!row.lostAtValue) return;
    const key = new Date(row.lostAtValue).toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return labels.map((item) => ({
    date: item.label,
    leads: counts.get(item.key) ?? 0,
  }));
};

const buildLossReasonDistribution = (
  rows: LostLeadRow[],
): DistributionSegment[] => {
  if (rows.length === 0) return [];

  const counts = new Map<string, number>();
  rows.forEach((row) => {
    counts.set(row.lossReason, (counts.get(row.lossReason) ?? 0) + 1);
  });

  const sorted = Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  return sorted.map(([label, value], index) => ({
    label,
    value,
    percent: `${((value / rows.length) * 100).toFixed(1)}%`,
    color: lossReasonPalette[index % lossReasonPalette.length],
  }));
};

const buildRecoveryMetrics = (
  rows: LostLeadRow[],
): {
  metrics: CampaignMetric[];
  progressValue: number;
  progressLabel: string;
} => {
  if (rows.length === 0) {
    return {
      metrics: [],
      progressValue: 0,
      progressLabel: "0% ready for recovery",
    };
  }

  const lostLast7Days = rows.filter(
    (row) => row.daysSinceLoss !== null && row.daysSinceLoss < 7,
  ).length;
  const lost8To30Days = rows.filter(
    (row) =>
      row.daysSinceLoss !== null &&
      row.daysSinceLoss >= 7 &&
      row.daysSinceLoss < 30,
  ).length;
  const budgetLosses = rows.filter((row) =>
    row.lossReason.toLowerCase().includes("budget"),
  ).length;
  const competitorLosses = rows.filter(
    (row) =>
      Boolean(row.competitor) ||
      row.lossReason.toLowerCase().includes("competitor"),
  ).length;
  const recoverableNow = rows.filter(
    (row) =>
      row.daysSinceLoss !== null &&
      row.daysSinceLoss <= 30 &&
      !row.lossReason.toLowerCase().includes("not ready"),
  ).length;

  return {
    metrics: [
      {
        label: "Lost last 7 days",
        value: String(lostLast7Days),
        change: "Fresh recovery window",
      },
      {
        label: "Lost 8-30 days",
        value: String(lost8To30Days),
        change: "Needs structured follow-up",
      },
      {
        label: "Budget losses",
        value: String(budgetLosses),
        change: "Best for offer-based recovery",
      },
      {
        label: "Competitor losses",
        value: String(competitorLosses),
        change: "Repositioning required",
      },
      {
        label: "Recoverable now",
        value: String(recoverableNow),
        change: "Prioritize this cohort",
      },
    ],
    progressValue: rows.length ? (recoverableNow / rows.length) * 100 : 0,
    progressLabel: `${recoverableNow} of ${rows.length} leads can be targeted immediately`,
  };
};

const buildSummaryRows = (rows: LostLeadRow[]): SummaryRow[] => {
  if (rows.length === 0) return [];

  const avgDays =
    rows.reduce((sum, row) => sum + (row.daysSinceLoss ?? 0), 0) / rows.length;

  const topStage = Array.from(
    rows.reduce((map, row) => {
      map.set(row.stageAtLoss, (map.get(row.stageAtLoss) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];

  const topCompetitor = Array.from(
    rows.reduce((map, row) => {
      if (!row.competitor) return map;
      map.set(row.competitor, (map.get(row.competitor) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];

  const topSource = Array.from(
    rows.reduce((map, row) => {
      map.set(row.source, (map.get(row.source) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];

  return [
    { label: "Average days since loss", value: `${Math.round(avgDays)} days` },
    { label: "Highest loss stage", value: topStage?.[0] ?? "Not set" },
    { label: "Top competitor", value: topCompetitor?.[0] ?? "None recorded" },
    { label: "Most vulnerable source", value: topSource?.[0] ?? "Unknown" },
  ];
};

const buildRecommendations = (rows: LostLeadRow[]): AIInsight[] => {
  if (rows.length === 0) return [];

  const reasonDistribution = buildLossReasonDistribution(rows);
  const topReason = reasonDistribution[0];
  const topSource = Array.from(
    rows.reduce((map, row) => {
      map.set(row.source, (map.get(row.source) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1])[0];
  const competitorCount = rows.filter((row) => row.competitor).length;

  return [
    {
      title: topReason
        ? `${topReason.label} is the biggest loss driver`
        : "Review lost reason capture",
      helper: topReason
        ? `${topReason.value} lost leads fall into this reason. Prioritize messaging and objection handling around it.`
        : "Capture structured loss reasons to improve recovery targeting.",
      icon: AlertTriangle,
      tone: "bg-red-50 text-red-600",
      actionLabel: "Review",
    },
    {
      title: topSource
        ? `${topSource[0]} needs attention`
        : "Review source quality",
      helper: topSource
        ? `${topSource[1]} lost leads came from this source. Audit quality and routing before new spend.`
        : "Track source-wise losses to spot underperforming channels.",
      icon: Building2,
      tone: "bg-blue-50 text-blue-700",
      actionLabel: "Inspect",
    },
    {
      title:
        competitorCount > 0
          ? `${competitorCount} leads were lost to competitors`
          : "Run a quick win recovery pass",
      helper:
        competitorCount > 0
          ? "Reposition pricing, configuration, and project advantages for competitor-sensitive deals."
          : "Start with recent lost leads that still have no explicit competitor or hard rejection reason.",
      icon: RefreshCcw,
      tone: "bg-emerald-50 text-emerald-600",
      actionLabel: "Plan",
    },
  ];
};

function resolveLossReason(row: LeadRow, lostReasonMap: Map<string, string>) {
  if (row.lostReasonName && !isRawIdentifier(row.lostReasonName)) {
    return row.lostReasonName;
  }
  if (row.lostReasonId && lostReasonMap.has(row.lostReasonId)) {
    return lostReasonMap.get(row.lostReasonId) ?? "Not specified";
  }
  if (row.lostCompetitor) {
    return "Chose competitor";
  }
  return "Not specified";
}

export function LostLeadsScreen() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeBucket, setActiveBucket] = useState<LostLeadBucket>("all");
  const [sortBy, setSortBy] = useState<SortOption>("lost-date");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const deferredSearch = useDeferredValue(search);

  const lostLeadsQuery = useAllLeads(
    deferredSearch,
    "lost",
    undefined,
    undefined,
    LEAD_TABLE_MAX_ROWS,
  );
  const lostReasonMastersQuery = useQuery({
    queryKey: ["lead-masters", "lost_reason", "lost-leads"],
    queryFn: async () =>
      (
        await api.get<{ data: LostReasonMaster[] }>(
          "/lead-masters/lost_reason",
          {
            params: { limit: 100 },
          },
        )
      ).data.data ?? [],
  });

  const lostReasonMap = useMemo(
    () =>
      new Map(
        (lostReasonMastersQuery.data ?? []).map((item) => [item.id, item.name]),
      ),
    [lostReasonMastersQuery.data],
  );

  const allRows = useMemo<LostLeadRow[]>(() => {
    return (lostLeadsQuery.data?.rows ?? []).map((lead) => {
      const lossReason = resolveLossReason(lead, lostReasonMap);
      const daysSinceLoss = getDaysSinceLoss(lead.lostAt);
      const potentialValueNumber = parseLeadCurrencyValue(lead.budget);

      return {
        id: lead.id,
        name: lead.name,
        initials: getInitials(lead.name),
        avatarTone: getAvatarTone(lossReason),
        requirement: lead.propertyType,
        source: lead.source,
        lossReason,
        lossReasonColor: getLossReasonTone(lossReason),
        competitor: lead.lostCompetitor ?? null,
        lostAt: lead.lostAt ?? null,
        lostAtValue: lead.lostAt ? new Date(lead.lostAt).getTime() : null,
        lostDate: formatCompactDate(lead.lostAt),
        lostTime: formatCompactTime(lead.lostAt),
        daysSinceLoss,
        stageAtLoss: lead.stage,
        potentialValue: lead.budget,
        potentialValueNumber,
        owner: lead.assignedTo,
        ownerAvatarUrl: undefined,
        bucket: getBucketLabel(daysSinceLoss),
      };
    });
  }, [lostLeadsQuery.data?.rows, lostReasonMap]);

  const bucketCounts = useMemo<Record<LostLeadBucket, number>>(
    () => ({
      all: allRows.length,
      "7-days": allRows.filter((row) =>
        getBucketThresholdMatch(row.daysSinceLoss, "7-days"),
      ).length,
      "15-days": allRows.filter((row) =>
        getBucketThresholdMatch(row.daysSinceLoss, "15-days"),
      ).length,
      "30-days": allRows.filter((row) =>
        getBucketThresholdMatch(row.daysSinceLoss, "30-days"),
      ).length,
      "60-days": allRows.filter((row) =>
        getBucketThresholdMatch(row.daysSinceLoss, "60-days"),
      ).length,
    }),
    [allRows],
  );

  const filteredRows = useMemo(
    () =>
      allRows.filter((row) =>
        getBucketThresholdMatch(row.daysSinceLoss, activeBucket),
      ),
    [activeBucket, allRows],
  );

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((left, right) => {
      if (sortBy === "value-high") {
        return right.potentialValueNumber - left.potentialValueNumber;
      }
      if (sortBy === "value-low") {
        return left.potentialValueNumber - right.potentialValueNumber;
      }
      if (sortBy === "name") {
        return left.name.localeCompare(right.name);
      }
      if (sortBy === "owner") {
        return left.owner.localeCompare(right.owner);
      }
      return (right.lostAtValue ?? 0) - (left.lostAtValue ?? 0);
    });
    return rows;
  }, [filteredRows, sortBy]);

  const totalFilteredRows = sortedRows.length;
  const pageCount = Math.max(1, Math.ceil(totalFilteredRows / pageSize));

  useEffect(() => {
    setPage(1);
  }, [activeBucket, deferredSearch, pageSize, sortBy]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const paginatedRows = useMemo(
    () => sortedRows.slice((page - 1) * pageSize, page * pageSize),
    [page, pageSize, sortedRows],
  );

  const totalLostValue = useMemo(
    () => allRows.reduce((sum, row) => sum + row.potentialValueNumber, 0),
    [allRows],
  );
  const lostInLast7Days = useMemo(
    () =>
      allRows.filter(
        (row) => row.daysSinceLoss !== null && row.daysSinceLoss < 7,
      ).length,
    [allRows],
  );
  const previous7DayLosses = useMemo(
    () =>
      allRows.filter(
        (row) =>
          row.daysSinceLoss !== null &&
          row.daysSinceLoss >= 7 &&
          row.daysSinceLoss < 14,
      ).length,
    [allRows],
  );
  const competitiveLosses = useMemo(
    () =>
      allRows.filter(
        (row) =>
          Boolean(row.competitor) ||
          row.lossReason.toLowerCase().includes("competitor"),
      ).length,
    [allRows],
  );
  const recoverableNow = useMemo(
    () =>
      allRows.filter(
        (row) =>
          row.daysSinceLoss !== null &&
          row.daysSinceLoss <= 30 &&
          !row.lossReason.toLowerCase().includes("not ready"),
      ).length,
    [allRows],
  );

  const stats = useMemo<LeadStatsRowItem[]>(
    () => [
      {
        label: "Total lost leads",
        value: String(lostLeadsQuery.data?.total ?? allRows.length),
        change: `${lostInLast7Days} in last 7 days`,
        helper: "Currently marked as lost",
        icon: TrendingDown,
        tone: "bg-red-50 text-red-500",
      },
      {
        label: "Lost value",
        value: formatLeadCurrencyValue(totalLostValue),
        change: `${formatLeadCurrencyValue(
          allRows
            .filter(
              (row) => row.daysSinceLoss !== null && row.daysSinceLoss < 30,
            )
            .reduce((sum, row) => sum + row.potentialValueNumber, 0),
        )} in last 30 days`,
        helper: "Budget represented by lost leads",
        icon: Banknote,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "Lost this week",
        value: String(lostInLast7Days),
        change: `${Math.abs(lostInLast7Days - previous7DayLosses)} ${
          lostInLast7Days >= previous7DayLosses ? "more" : "fewer"
        } than prior week`,
        helper: "Fresh losses needing review",
        icon: AlertTriangle,
        tone: "bg-orange-50 text-orange-600",
      },
      {
        label: "Competitive losses",
        value: String(competitiveLosses),
        change: allRows.length
          ? `${((competitiveLosses / allRows.length) * 100).toFixed(
              1,
            )}% of lost pipeline`
          : "",
        helper: "Explicit competitor pressure",
        icon: Building2,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        label: "Recoverable now",
        value: String(recoverableNow),
        change: allRows.length
          ? `${((recoverableNow / allRows.length) * 100).toFixed(
              1,
            )}% ready for reactivation`
          : "",
        helper: "Lost within 30 days and still actionable",
        icon: Sparkles,
        tone: "bg-emerald-50 text-emerald-600",
      },
    ],
    [
      allRows,
      competitiveLosses,
      lostInLast7Days,
      lostLeadsQuery.data?.total,
      previous7DayLosses,
      recoverableNow,
      totalLostValue,
    ],
  );

  const trendData = useMemo(() => buildTrendData(allRows), [allRows]);
  const reasonDistribution = useMemo(
    () => buildLossReasonDistribution(allRows),
    [allRows],
  );
  const recoveryOverview = useMemo(
    () => buildRecoveryMetrics(allRows),
    [allRows],
  );
  const summaryRows = useMemo(() => buildSummaryRows(allRows), [allRows]);
  const recommendations = useMemo(
    () => buildRecommendations(allRows),
    [allRows],
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="Lost Leads"
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
              <span>Lead Management</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Lost Leads</span>
            </div>
          }
        >
          <div className="flex w-full items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search lost leads"
                value={search}
                placeholder="Search lost leads by lead, mobile, email, or display ID..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-4 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </DashboardHeader>

        <main className="space-y-5 p-4 sm:p-6">
          <section>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-secondary">
                Lost leads dashboard
              </h1>
              <Info className="h-4 w-4 text-blue-700" />
            </div>
            <p className="mt-2 text-sm font-semibold text-blue-700">
              Monitor live lost opportunities, understand why they were lost,
              and prioritize recovery based on real lead activity.
            </p>
          </section>

          <StatsRow stats={stats} />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-5">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                <LostLeadsTrendCard
                  data={trendData}
                  total={lostLeadsQuery.data?.total ?? allRows.length}
                />
                <LossReasonDistributionCard
                  data={reasonDistribution}
                  total={allRows.length}
                />
              </div>

              <LostLeadsTable
                rows={paginatedRows}
                totalRows={totalFilteredRows}
                activeBucket={activeBucket}
                bucketCounts={bucketCounts}
                sortBy={sortBy}
                page={page}
                pageCount={pageCount}
                pageSize={pageSize}
                onBucketChange={setActiveBucket}
                onSortByChange={setSortBy}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                onOpenLead={(leadId) => navigate(`/leads/${leadId}`)}
              />

              <RecoveryOverviewCard
                metrics={recoveryOverview.metrics}
                progressValue={recoveryOverview.progressValue}
                progressLabel={recoveryOverview.progressLabel}
              />
            </div>

            <aside className="space-y-5">
              <RecommendationsCard
                title="Recovery recommendations"
                items={recommendations}
                footerLabel="Plan recovery campaign"
              />
              <LostLeadsSummaryCard rows={summaryRows} />
            </aside>
          </section>
        </main>
      </div>
    </div>
  );
}
