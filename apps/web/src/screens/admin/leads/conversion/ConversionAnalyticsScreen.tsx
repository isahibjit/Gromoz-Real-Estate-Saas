import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Coins,
  Download,
  Filter,
  Info,
  Search,
  Target,
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

import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { addLeadSidebarItems } from "../add/addLeadData";
import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import {
  useConversionAnalytics,
  type ConversionAnalyticsRange,
  type ConversionAnalyticsResponse,
} from "./useConversionAnalytics";

const tabs = [
  "Overview",
  "By Source",
  "By Team",
  "By Project",
  "By Branch",
  "By Executive",
  "Funnel Analysis",
  "Time Trends",
] as const;

const rangeOptions: Array<{
  value: ConversionAnalyticsRange;
  label: string;
}> = [
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "quarter", label: "Last 90 days" },
  { value: "year", label: "Last 365 days" },
  { value: "8weeks", label: "Last 8 weeks" },
];

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) => `${value.toFixed(2)}%`;

const formatDays = (value: number) => `${value.toFixed(1)} Days`;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: value >= 10000000 ? 2 : 1,
  }).format(value);

function StatCard({
  label,
  value,
  helper,
  change,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  change: number;
  icon: typeof UsersRound;
  tone: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md sm:size-12",
            tone,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-extrabold text-secondary">{label}</p>
          <p className="mt-1 truncate text-xl font-extrabold text-secondary">{value}</p>
          <p
            className={cn(
              "mt-1 truncate text-[11px] font-extrabold",
              change >= 0 ? "text-success" : "text-red-500",
            )}
          >
            {change >= 0 ? "Up" : "Down"} {formatPercent(Math.abs(change))}
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 shadow-card",
        className,
      )}
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function AnalyticsTabs({
  activeTab,
  onChangeTab,
}: {
  activeTab: string;
  onChangeTab: (tab: string) => void;
}) {
  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-2 px-1 pb-1">
        {tabs.map((tab) => (
          <Button
            key={tab}
            type="button"
            variant="ghost"
            className={cn(
              "h-10 rounded-md px-3 text-sm font-extrabold shadow-none",
              activeTab === tab
                ? "bg-blue-50 text-blue-700"
                : "text-secondary hover:bg-slate-100",
            )}
            onClick={() => onChangeTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </div>
    </div>
  );
}

function AssigneeIdentity({
  name,
  role,
  image,
}: {
  name: string;
  role: string;
  image?: string | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9 border border-slate-200">
        <AvatarImage src={image ?? undefined} alt={name} />
        <AvatarFallback className="bg-slate-100 text-[11px] font-bold text-secondary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-xs font-extrabold text-secondary">{name}</p>
        <p className="truncate text-[10px] font-semibold text-muted-foreground">
          {role}
        </p>
      </div>
    </div>
  );
}

function ConversionFunnelCard({
  stages,
}: {
  stages: ConversionAnalyticsResponse["funnelStages"];
}) {
  return (
    <Panel title="Conversion Funnel">
      <div className="flex h-full items-center justify-center pt-6">
        <div className="relative mx-auto flex w-full max-w-[420px]">
          <div className="absolute -top-6 right-0 text-[10px] font-extrabold text-muted-foreground">
            Step Conversion
          </div>
          <div className="flex w-[150px] flex-col gap-[3px]">
            {stages.map((stage, index) => {
              const topInset = index * 8;
              const bottomInset = (index + 1) * 8;
              const clipPath = `polygon(${topInset}% 0, ${100 - topInset}% 0, ${
                100 - bottomInset
              }% 100%, ${bottomInset}% 100%)`;
              return (
                <div
                  key={stage.label}
                  className="h-12 w-full"
                  style={{ backgroundColor: stage.color, clipPath }}
                />
              );
            })}
          </div>
          <div className="flex flex-1 flex-col gap-[3px] pl-6">
            {stages.map((stage) => (
              <div
                key={stage.label}
                className="flex h-12 flex-col justify-center"
              >
                <span className="text-[13px] font-extrabold text-secondary">
                  {formatNumber(stage.count)}{" "}
                  <span className="font-semibold text-muted-foreground">
                    ({formatPercent(stage.percentage)})
                  </span>
                </span>
                <span className="text-[11px] font-bold text-secondary">
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex w-[80px] flex-col gap-[3px] text-right">
            {stages.map((stage) => (
              <div
                key={`${stage.label}-step`}
                className="flex h-12 items-center justify-end"
              >
                {stage.conversionPct !== null ? (
                  <span className="inline-flex rounded px-2 py-1.5 text-[11px] font-extrabold text-blue-700 bg-blue-50">
                    {formatPercent(stage.conversionPct)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ConversionTrendCard({
  trend,
}: {
  trend: ConversionAnalyticsResponse["trend"];
}) {
  return (
    <Panel title="Conversion Trend" className="xl:col-span-2">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={trend}
            margin={{ top: 16, right: 0, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#f1f5f9"
            />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
              dy={10}
            />
            <YAxis
              yAxisId="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip />
            <Bar
              yAxisId="left"
              dataKey="leads"
              name="Leads"
              fill="#2563eb"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              yAxisId="left"
              dataKey="converted"
              name="Converted Leads"
              fill="#10b981"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="conversionRate"
              name="Conversion Rate (%)"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function ConversionBySourceCard({
  sources,
}: {
  sources: ConversionAnalyticsResponse["sourceConversions"];
}) {
  const total = sources.reduce((sum, item) => sum + item.converted, 0);
  return (
    <Panel title="Conversion by Source">
      <div className="flex h-[280px] items-center gap-4">
        <div className="relative h-[160px] w-[160px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sources}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="converted"
                stroke="none"
              >
                {sources.map((entry) => (
                  <Cell key={entry.source} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-extrabold text-secondary">
              {formatNumber(total)}
            </span>
            <span className="text-[9px] font-bold text-muted-foreground">
              Converted Leads
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {sources.length ? (
            sources.map((source) => (
              <div
                key={source.source}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="flex min-w-0 items-center gap-2 font-bold text-muted-foreground">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: source.color }}
                  />
                  <span className="truncate">{source.source}</span>
                </span>
                <span className="shrink-0 whitespace-nowrap font-extrabold text-secondary">
                  {formatNumber(source.converted)}{" "}
                  <span className="text-muted-foreground">
                    ({formatPercent(source.percentage)})
                  </span>
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm font-semibold text-muted-foreground">
              No converted lead sources found for this range.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

function TeamPerformanceCard({
  title,
  rows,
  totals,
}: {
  title: string;
  rows: ConversionAnalyticsResponse["teamPerformanceRows"];
  totals: ConversionAnalyticsResponse["teamTotals"];
}) {
  return (
    <Panel title={title} className="xl:col-span-2 2xl:col-span-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100 hover:bg-transparent">
              {[
                "Executive",
                "Total Leads",
                "Contacted",
                "Interested",
                "Site Visits",
                "Bookings",
                "Conversion Rate",
                "Booking Value",
                "Revenue",
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
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="border-b border-slate-100 hover:bg-slate-50/50"
              >
                <TableCell className="px-4 py-3">
                  <AssigneeIdentity
                    name={row.name}
                    role={row.role}
                    image={row.image}
                  />
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {formatNumber(row.totalLeads)}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {formatNumber(row.contacted)}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {formatNumber(row.interested)}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {formatNumber(row.siteVisits)}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {formatNumber(row.bookings)}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-success">
                  {formatPercent(row.conversionRate)}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {formatCurrency(row.bookingValue)}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {formatCurrency(row.revenue)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                Total
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                {formatNumber(totals.totalLeads)}
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                {formatNumber(totals.contacted)}
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                {formatNumber(totals.interested)}
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                {formatNumber(totals.siteVisits)}
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                {formatNumber(totals.bookings)}
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-success">
                {formatPercent(totals.conversionRate)}
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                {formatCurrency(totals.bookingValue)}
              </TableCell>
              <TableCell className="px-4 py-4 text-xs font-extrabold text-secondary">
                {formatCurrency(totals.revenue)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

function ProjectConversionsCard({
  title,
  projects,
}: {
  title: string;
  projects: ConversionAnalyticsResponse["projectConversions"];
}) {
  return (
    <Panel title={title}>
      <div className="space-y-4">
        {projects.length ? (
          projects.map((project) => (
            <div
              key={project.project}
              className="flex items-center gap-4 text-xs"
            >
              <span className="w-36 truncate font-semibold text-secondary">
                {project.project}
              </span>
              <div className="h-2 flex-1 rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(project.percentage, 100)}%`,
                    backgroundColor: project.color,
                  }}
                />
              </div>
              <span className="w-24 text-right font-extrabold text-secondary">
                {formatNumber(project.bookings)}{" "}
                <span className="font-semibold text-muted-foreground">
                  ({formatPercent(project.percentage)})
                </span>
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">
            No project conversions found for this range.
          </p>
        )}
      </div>
    </Panel>
  );
}

function BranchPerformanceCard({
  branches,
}: {
  branches: ConversionAnalyticsResponse["branchPerformance"];
}) {
  return (
    <Panel title="Branch Conversion Performance">
      <div className="space-y-3">
        {branches.length ? (
          branches.map((branch) => (
            <div
              key={branch.branch}
              className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-secondary">
                    {branch.branch}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {formatNumber(branch.totalLeads)} leads •{" "}
                    {formatNumber(branch.bookings)} bookings
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-success">
                    {formatPercent(branch.conversionRate)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-secondary">
                    {formatCurrency(branch.bookingValue)}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">
            No branch-level conversion data available.
          </p>
        )}
      </div>
    </Panel>
  );
}

function TimeAnalysisCard({
  analysis,
}: {
  analysis: ConversionAnalyticsResponse["timeAnalysis"];
}) {
  return (
    <Panel title="Lead to Booking Time Analysis">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-green-100 bg-green-50 p-3 text-center">
          <p className="text-[10px] font-bold text-success">Best Performer</p>
          <p className="mt-1 truncate text-xs font-extrabold text-secondary">
            {analysis.bestPerformer.name}
          </p>
          <p className="mt-2 text-sm font-extrabold text-success">
            {formatDays(analysis.bestPerformer.time)}
          </p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-center">
          <p className="text-[10px] font-bold text-blue-700">Average Time</p>
          <p className="mt-1 truncate text-xs font-extrabold text-secondary">
            {analysis.average.name}
          </p>
          <p className="mt-2 text-sm font-extrabold text-blue-700">
            {formatDays(analysis.average.time)}
          </p>
        </div>
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-center">
          <p className="text-[10px] font-bold text-red-500">
            Needs Improvement
          </p>
          <p className="mt-1 truncate text-xs font-extrabold text-secondary">
            {analysis.needsImprovement.name}
          </p>
          <p className="mt-2 text-sm font-extrabold text-red-500">
            {formatDays(analysis.needsImprovement.time)}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function ScoreBucketCard({
  buckets,
}: {
  buckets: ConversionAnalyticsResponse["scoreConversionBuckets"];
}) {
  return (
    <Panel title="Conversion by Lead Score">
      <div className="grid grid-cols-4 gap-2">
        {buckets.map((bucket) => (
          <div
            key={bucket.range}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-center"
          >
            <p className="text-[10px] font-bold text-muted-foreground">
              {bucket.range}
            </p>
            <p className={cn("mt-2 text-sm font-extrabold", bucket.toneClass)}>
              {formatPercent(bucket.percentage)}
            </p>
            <p className="mt-1 text-[10px] font-semibold text-secondary">
              {formatNumber(bucket.leads)} Leads
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ForecastCard({
  forecast,
}: {
  forecast: ConversionAnalyticsResponse["forecast"];
}) {
  return (
    <Panel title="Forecast (Next 30 Days)">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">
            Expected Bookings
          </p>
          <p className="mt-2 text-sm font-extrabold text-secondary">
            {formatNumber(forecast.expectedBookingsMin)} -{" "}
            {formatNumber(forecast.expectedBookingsMax)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">
            Expected Revenue
          </p>
          <p className="mt-2 text-sm font-extrabold text-secondary">
            {formatCurrency(forecast.expectedRevenueMin)} -{" "}
            {formatCurrency(forecast.expectedRevenueMax)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">
            Confidence Score
          </p>
          <p className="mt-2 text-sm font-extrabold text-secondary">
            {forecast.confidenceScore}%
          </p>
        </div>
      </div>
    </Panel>
  );
}

function BenchmarkCard({
  benchmark,
}: {
  benchmark: ConversionAnalyticsResponse["benchmark"];
}) {
  return (
    <Panel title="Conversion Benchmark">
      <div className="grid grid-cols-3 gap-4 py-2 text-center">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">
            Your Conversion Rate
          </p>
          <p className="mt-2 text-lg font-extrabold text-secondary">
            {formatPercent(benchmark.yourRate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">
            Industry Average
          </p>
          <p className="mt-2 text-lg font-extrabold text-secondary">
            {formatPercent(benchmark.industryAvg)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">
            Top Performer
          </p>
          <p className="mt-2 text-lg font-extrabold text-success">
            {formatPercent(benchmark.topPerformers)}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function InsightsCard({
  data,
}: {
  data: ConversionAnalyticsResponse;
}) {
  const bestSource = data.sourceConversions[0];
  const bestExecutive = data.teamPerformanceRows[0];
  const bestBranch = data.branchPerformance[0];

  return (
    <Panel title="Operational Insights">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-extrabold text-secondary">
            Best Converting Source
          </p>
          <p className="mt-2 text-lg font-extrabold text-blue-700">
            {bestSource?.source ?? "No data"}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {bestSource
              ? `${formatNumber(bestSource.converted)} converted leads at ${formatPercent(
                  bestSource.percentage,
                )}`
              : "No converted source data in the selected range."}
          </p>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-extrabold text-secondary">
            Top Executive
          </p>
          <p className="mt-2 text-lg font-extrabold text-success">
            {bestExecutive?.name ?? "No data"}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {bestExecutive
              ? `${formatPercent(bestExecutive.conversionRate)} conversion with ${formatNumber(bestExecutive.bookings)} bookings`
              : "No executive performance data in the selected range."}
          </p>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-extrabold text-secondary">
            Strongest Branch
          </p>
          <p className="mt-2 text-lg font-extrabold text-secondary">
            {bestBranch?.branch ?? "No data"}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {bestBranch
              ? `${formatPercent(bestBranch.conversionRate)} conversion and ${formatCurrency(bestBranch.bookingValue)} booking value`
              : "No branch performance data in the selected range."}
          </p>
        </div>
      </div>
    </Panel>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card
            key={index}
            className="h-[108px] animate-pulse rounded-md border border-slate-200 bg-white shadow-card"
          />
        ))}
      </div>
      <Card className="h-[420px] rounded-md border border-slate-200 bg-white shadow-card" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="rounded-md border border-red-100 bg-red-50 p-6 text-sm font-semibold text-red-600 shadow-card">
      {message}
    </Card>
  );
}

function OverviewContent({ data }: { data: ConversionAnalyticsResponse }) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-4">
        <ConversionFunnelCard stages={data.funnelStages} />
        <ConversionTrendCard trend={data.trend} />
        <ConversionBySourceCard sources={data.sourceConversions} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3 2xl:grid-cols-4">
        <TeamPerformanceCard
          title="Conversion Performance by Team"
          rows={data.teamPerformanceRows}
          totals={data.teamTotals}
        />
        <div className="grid gap-6">
          <ProjectConversionsCard
            title="Conversion by Project"
            projects={data.projectConversions}
          />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <TimeAnalysisCard analysis={data.timeAnalysis} />
        <ScoreBucketCard buckets={data.scoreConversionBuckets} />
        <ForecastCard forecast={data.forecast} />
        <BenchmarkCard benchmark={data.benchmark} />
      </section>
    </>
  );
}

export function ConversionAnalyticsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<ConversionAnalyticsRange>("8weeks");

  const analyticsQuery = useConversionAnalytics({
    search,
    range,
  });

  const data = analyticsQuery.data;

  const stats = useMemo<LeadStatsRowItem[]>(() => {
    if (!data) return [];
    const formatChange = (change: number) =>
      `${change >= 0 ? "Up" : "Down"} ${formatPercent(Math.abs(change))}`;
    return [
      {
        label: "Total Leads",
        value: formatNumber(data.overview.totalLeads.value),
        helper: data.overview.totalLeads.helper,
        change: formatChange(data.overview.totalLeads.change),
        icon: UsersRound,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Converted Leads",
        value: formatNumber(data.overview.convertedLeads.value),
        helper: data.overview.convertedLeads.helper,
        change: formatChange(data.overview.convertedLeads.change),
        icon: CheckCircle2,
        tone: "bg-green-50 text-green-600",
      },
      {
        label: "Conversion Rate",
        value: formatPercent(data.overview.conversionRate.value),
        helper: data.overview.conversionRate.helper,
        change: formatChange(data.overview.conversionRate.change),
        icon: Target,
        tone: "bg-blue-50 text-blue-600",
      },
      {
        label: "Booking Value",
        value: formatCurrency(data.overview.bookingValue.value),
        helper: data.overview.bookingValue.helper,
        change: formatChange(data.overview.bookingValue.change),
        icon: Coins,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "Revenue Generated",
        value: formatCurrency(data.overview.revenueGenerated.value),
        helper: data.overview.revenueGenerated.helper,
        change: formatChange(data.overview.revenueGenerated.change),
        icon: Banknote,
        tone: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Avg. Lead to Booking Time",
        value: formatDays(data.overview.avgLeadToBookingDays.value),
        helper: data.overview.avgLeadToBookingDays.helper,
        change: formatChange(data.overview.avgLeadToBookingDays.change),
        icon: TrendingUp,
        tone: "bg-orange-50 text-orange-500",
      },
    ];
  }, [data]);

  const renderContent = () => {
    if (!data) return null;

    switch (activeTab) {
      case "By Source":
        return (
          <section className="grid gap-6 xl:grid-cols-3">
            <ConversionBySourceCard sources={data.sourceConversions} />
            <ConversionTrendCard trend={data.trend} />
            <InsightsCard data={data} />
          </section>
        );
      case "By Team":
      case "By Executive":
        return (
          <section className="grid gap-6 xl:grid-cols-3 2xl:grid-cols-4">
            <TeamPerformanceCard
              title={
                activeTab === "By Team"
                  ? "Conversion Performance by Team"
                  : "Conversion Performance by Executive"
              }
              rows={data.teamPerformanceRows}
              totals={data.teamTotals}
            />
            <div className="grid gap-6">
              <TimeAnalysisCard analysis={data.timeAnalysis} />
            </div>
          </section>
        );
      case "By Project":
        return (
          <section className="grid gap-6 xl:grid-cols-3">
            <ProjectConversionsCard
              title="Project Conversion Performance"
              projects={data.projectConversions}
            />
            <ConversionTrendCard trend={data.trend} />
            <ForecastCard forecast={data.forecast} />
          </section>
        );
      case "By Branch":
        return (
          <section className="grid gap-6 xl:grid-cols-3">
            <BranchPerformanceCard branches={data.branchPerformance} />
            <ConversionTrendCard trend={data.trend} />
            <BenchmarkCard benchmark={data.benchmark} />
          </section>
        );
      case "Funnel Analysis":
        return (
          <section className="grid gap-6 xl:grid-cols-4">
            <ConversionFunnelCard stages={data.funnelStages} />
            <ScoreBucketCard buckets={data.scoreConversionBuckets} />
            <BenchmarkCard benchmark={data.benchmark} />
            <ForecastCard forecast={data.forecast} />
          </section>
        );
      case "Time Trends":
        return (
          <section className="grid gap-6 xl:grid-cols-3">
            <ConversionTrendCard trend={data.trend} />
            <TimeAnalysisCard analysis={data.timeAnalysis} />
            <ForecastCard forecast={data.forecast} />
          </section>
        );
      default:
        return <OverviewContent data={data} />;
    }
  };

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="Lead Conversion Analytics"
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
              <span className="text-foreground">Lead Conversion Analytics</span>
            </div>
          }
        >
          <div className="flex w-full items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads"
                value={search}
                placeholder="Search leads, customers, projects..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-4 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select
              value={range}
              onValueChange={(value) =>
                setRange(value as ConversionAnalyticsRange)
              }
            >
              <SelectTrigger
                aria-label="Date range"
                className="h-10 w-[180px] rounded-md bg-white text-sm font-bold shadow-none"
              >
                <CalendarDays className="mr-2 h-4 w-4 text-info" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rangeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </DashboardHeader>

      <WorkspacePage className="space-y-6">
          <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-extrabold text-secondary">
                Lead Conversion Analytics
                <Info className="h-4 w-4 text-blue-700" />
              </h1>
              <p className="mt-1.5 text-sm font-semibold text-blue-800">
                Track live conversion performance across sources, executives,
                projects, branches, bookings, and time.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
                onClick={() => analyticsQuery.refetch()}
              >
                <Filter className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </section>

          {analyticsQuery.isPending ? (
            <LoadingState />
          ) : analyticsQuery.isError ? (
            <ErrorState
              message={
                analyticsQuery.error instanceof Error
                  ? analyticsQuery.error.message
                  : "Failed to load conversion analytics."
              }
            />
          ) : data ? (
            <>
              <StatsRow stats={stats} />
              <AnalyticsTabs
                activeTab={activeTab}
                onChangeTab={setActiveTab}
              />
              {renderContent()}
            </>
          ) : (
            <ErrorState message="No conversion analytics data available." />
          )}
      </WorkspacePage>
    </>
  );
}
