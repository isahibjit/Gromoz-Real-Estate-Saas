import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  LifeBuoy,
  Phone,
  Plus,
  Search,
  Snowflake,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import { useNavigate } from "react-router-dom";

import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { addLeadSidebarItems } from "../add/addLeadData";
import { downloadCsvFile } from "../components/exportCsv";
import { LeadActionsMenu } from "../components/LeadActionsMenu";
import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import { LEAD_TABLE_MAX_ROWS, useAllLeads } from "../all/useAllLeads";
import {
  campaignMetrics,
  coldLeadStats,
  coldSummaryRows,
  coldTrendData,
  inactivityDistribution,
  reactivationTools,
  recommendedActions,
} from "./coldLeadsData";
import type {
  ColdLeadActionType,
  ColdLeadBucket,
  ColdLeadPotential,
  ColdLeadRow,
  ColdLeadStat,
  DistributionSegment,
} from "./coldLeadsTypes";

const bucketTabs: { id: ColdLeadBucket; label: string }[] = [
  { id: "all", label: "Cold Leads" },
  { id: "7-days", label: "Inactive > 7 Days" },
  { id: "15-days", label: "Inactive > 15 Days" },
  { id: "30-days", label: "Inactive > 30 Days" },
  { id: "60-days", label: "Inactive > 60 Days" },
];

const scoreTone: Record<ColdLeadPotential, string> = {
  High: "border-success text-success",
  Good: "border-emerald-500 text-emerald-600",
  Medium: "border-orange-400 text-orange-500",
  Low: "border-red-400 text-red-500",
};

const actionTone: Record<ColdLeadActionType, string> = {
  whatsapp: "bg-green-50 text-success hover:bg-green-100",
  call: "bg-blue-50 text-info hover:bg-blue-100",
  email: "bg-violet-50 text-violet-600 hover:bg-violet-100",
};

function getDaysSince(value?: string | null) {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;
  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getColdLeadPotential(score: number): ColdLeadPotential {
  if (score >= 75) return "High";
  if (score >= 60) return "Good";
  if (score >= 45) return "Medium";
  return "Low";
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

function exportColdLeadRows(rows: ColdLeadRow[], filePrefix: string) {
  if (!rows.length) {
    toast.error("No cold leads available to export");
    return;
  }

  downloadCsvFile({
    headers: [
      "Lead Name",
      "Requirement",
      "Source",
      "Last Contact Date",
      "Last Contact Time",
      "Inactivity Days",
      "Lead Score",
      "Potential",
      "Potential Value",
      "Last Activity",
      "Last Activity Date",
      "Next Action",
      "Pre Sales Executive",
      "Sales Executive",
      "Owner",
    ],
    rows: rows.map((lead) => [
      lead.name,
      lead.requirement,
      lead.source,
      lead.lastContactDate,
      lead.lastContactTime,
      lead.inactivityDays,
      lead.aiScore,
      lead.potential,
      lead.potentialValue,
      lead.lastActivity,
      lead.lastActivityDate,
      lead.nextAction,
      lead.telecallerName || "Unassigned",
      lead.fieldExecutiveName || "Unassigned",
      lead.ownerName || lead.owner || "Unassigned",
    ]),
    filePrefix,
  });

  toast.success(
    `Exported ${rows.length} cold lead${rows.length === 1 ? "" : "s"}`,
  );
}

function SidebarFooter() {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold">Need Help?</p>
            <p className="text-xs font-semibold text-white/75">
              Contact Support
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <p className="text-sm font-extrabold">Trueroot Realty CRM</p>
        <p className="mt-1 text-sm font-bold text-[#ffc78f]">Premium Plan</p>
        <p className="mt-3 text-xs font-semibold text-white/75">
          Valid till 31 Dec 2025
        </p>
        <Button
          type="button"
          className="mt-4 h-10 w-full rounded-md bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-bold text-white hover:from-blue-700 hover:to-violet-700"
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}

function StatsCard({ stat }: { stat: ColdLeadStat }) {
  const Icon = stat.icon;
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,37,68,0.04)]">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            stat.tone,
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-secondary">{stat.label}</p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-2xl font-extrabold leading-none text-secondary">
              {stat.value}
            </p>
            {stat.change ? (
              <span
                className={cn(
                  "text-xs font-extrabold",
                  stat.changeTone === "up" ? "text-success" : "text-red-500",
                )}
              >
                {stat.changeTone === "up" ? "↑" : "↓"} {stat.change}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {stat.helper}
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

function ColdLeadsTrendCard() {
  return (
    <Panel
      title="Cold Leads Trend"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-md text-xs shadow-none"
        >
          Last 30 Days <ChevronDown className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="h-[210px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={coldTrendData}
            margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="coldTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#52647d", fontWeight: 700 }}
            />
            <YAxis
              domain={[0, 500]}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "#52647d", fontWeight: 700 }}
            />
            <Tooltip
              formatter={(value) => [`${value}`, "Cold Leads"]}
              labelFormatter={() => "May 10, 2025"}
            />
            <Area
              type="monotone"
              dataKey="leads"
              stroke="#7c3aed"
              strokeWidth={3}
              fill="url(#coldTrendFill)"
              dot={{ r: 3, fill: "#7c3aed" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
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

function LeadInactivityDistributionCard() {
  return (
    <Panel title="Lead Inactivity Distribution">
      <div className="grid items-center gap-4 md:grid-cols-[minmax(180px,0.9fr)_minmax(220px,1fr)]">
        <DistributionDonut
          data={inactivityDistribution}
          centerValue="342"
          centerLabel="Total"
        />
        <div className="space-y-3">
          {inactivityDistribution.map((segment) => (
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
    </Panel>
  );
}

function LeadSourceBadge({ source }: { source: string }) {
  return (
    <Badge className="border-0 bg-blue-50 px-2 py-1 text-[11px] font-extrabold text-blue-700">
      {source}
    </Badge>
  );
}

function ScoreBadge({ lead }: { lead: ColdLeadRow }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-extrabold",
          scoreTone[lead.potential],
        )}
      >
        {lead.aiScore}
      </span>
      <span className="text-xs font-semibold text-secondary">
        {lead.potential}
      </span>
    </div>
  );
}

function ActionPillButton({ lead }: { lead: ColdLeadRow }) {
  const Icon = lead.lastContactIcon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 rounded-md px-3 text-[11px] font-extrabold",
        actionTone[lead.nextActionType],
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {lead.nextAction}
    </Button>
  );
}

function ColdLeadsTable({
  rows,
  activeBucket,
  bucketCounts,
  onBucketChange,
}: {
  rows: ColdLeadRow[];
  activeBucket: ColdLeadBucket;
  bucketCounts: Record<ColdLeadBucket, number>;
  onBucketChange: (bucket: ColdLeadBucket) => void;
}) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const pageStartIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = rows.slice(
    pageStartIndex,
    pageStartIndex + rowsPerPage,
  );
  const rangeStart = totalRows === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd =
    totalRows === 0
      ? 0
      : Math.min(pageStartIndex + paginatedRows.length, totalRows);
  const paginationItems = buildPaginationItems(currentPage, totalPages);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeBucket, rowsPerPage]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleExport = () => {
    exportColdLeadRows(rows, `cold-leads-${activeBucket}`);
  };

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 sm:flex-row sm:items-center sm:justify-between p-2">
        <div className="flex gap-6 overflow-x-auto">
          {bucketTabs.map((tab) => (
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
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Select defaultValue="last-contact">
            <SelectTrigger
              aria-label="Sort cold leads"
              className="h-9 w-[190px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-contact">
                Sort By: Last Contact
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/70">
            <TableRow>
              {[
                "Lead Details",
                "Last Contact",
                "Inactivity Days",
                "Lead Source",
                "Lead Score",
                "Potential Value",
                "Last Activity",
                "Next Best Action",
                "Owner",
                "Action",
              ].map((heading) => (
                <TableHead
                  key={heading}
                  className={cn(
                    "h-10 whitespace-nowrap px-4 text-[11px] font-extrabold text-secondary",
                    heading === "Lead Details" && "min-w-[320px] w-[320px]",
                  )}
                >
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                >
                  No cold leads are available for this view.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((lead) => {
                const ContactIcon = lead.lastContactIcon;
                return (
                  <TableRow
                    key={lead.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer transition-colors hover:bg-slate-50/80 focus-visible:bg-slate-50/80 focus-visible:outline-none"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/leads/${lead.id}`);
                      }
                    }}
                  >
                    <TableCell className="min-w-[320px] w-[320px] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-extrabold",
                            lead.avatarTone,
                          )}
                        >
                          {lead.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-secondary">
                            {lead.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">
                            {lead.requirement}
                          </p>
                          <p className="truncate text-[11px] font-semibold text-muted-foreground">
                            {lead.source}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold text-secondary">
                      <div className="flex items-center gap-2">
                        <span>
                          {lead.lastContactDate}
                          <br />
                          {lead.lastContactTime}
                        </span>
                        <ContactIcon className="h-3.5 w-3.5 text-info" />
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-[11px] font-extrabold text-red-500">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {lead.inactivityDays} Days
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <LeadSourceBadge source={lead.source} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <ScoreBadge lead={lead} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-extrabold text-secondary">
                      {lead.potentialValue}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-[11px]">
                      <p className="font-extrabold text-secondary">
                        {lead.lastActivity}
                      </p>
                      <p className="font-semibold text-muted-foreground">
                        {lead.lastActivityDate}
                      </p>
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ActionPillButton lead={lead} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage
                            src={lead.ownerAvatarUrl}
                            alt={lead.owner}
                          />
                          <AvatarFallback>
                            {lead.owner.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-[11px] font-extrabold text-secondary">
                          {lead.owner}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="px-4 py-3"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <LeadActionsMenu
                        lead={{
                          id: lead.id,
                          name: lead.name,
                          requirement: lead.requirement,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          {totalRows === 0
            ? "Showing 0 of 0 cold leads"
            : `Showing ${rangeStart} to ${rangeEnd} of ${totalRows} cold leads`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <Button
                key={`ellipsis-${index}`}
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
                disabled
              >
                ...
              </Button>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === currentPage ? "navy" : "outline"}
                className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
                onClick={() => setCurrentPage(item)}
              >
                {item}
              </Button>
            ),
          )}
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={String(rowsPerPage)}
          onValueChange={(value) => setRowsPerPage(Number(value))}
        >
          <SelectTrigger
            aria-label="Rows per page"
            className="h-8 w-[150px] rounded-md text-xs font-bold shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TablePageSizeOptions sizes={[8, 10, 20]} labelPrefix="Rows per page" />
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

function ReactivationCampaignPerformanceCard() {
  return (
    <Panel
      title="Reactivation Campaign Performance"
      action={
        <span className="text-xs font-bold text-muted-foreground">
          (Last 30 Days)
        </span>
      }
    >
      <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-100 md:grid-cols-5">
        {campaignMetrics.map((metric) => (
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
            <p className="mt-1 text-xs font-extrabold text-success">
              ↑ {metric.change}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span>Overall Reactivation Success Rate</span>
          <span>
            32.6%{" "}
            <span className="ml-8 text-muted-foreground">
              vs last 30 days 26.4%
            </span>
          </span>
        </div>
        <Progress
          value={32.6}
          className="h-2 bg-slate-100"
          indicatorClassName="bg-violet-600"
        />
      </div>
    </Panel>
  );
}

// function ReactivationToolsCard() {
//   return (
//     <Panel title="Reactivation Tools">
//       <div className="space-y-3">
//         {reactivationTools.map((tool) => {
//           const Icon = tool.icon;
//           return (
//             <Button
//               key={tool.title}
//               type="button"
//               variant="ghost"
//               className="h-auto w-full justify-start rounded-md border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
//             >
//               <span
//                 className={cn(
//                   "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
//                   tool.tone,
//                 )}
//               >
//                 <Icon className="h-4 w-4" />
//               </span>
//               <span>
//                 <span className="block text-xs font-extrabold text-secondary">
//                   {tool.title}
//                 </span>
//                 <span className="block text-xs font-semibold text-muted-foreground">
//                   {tool.helper}
//                 </span>
//               </span>
//             </Button>
//           );
//         })}
//       </div>
//       <Button
//         type="button"
//         variant="outline"
//         className="mt-4 h-10 w-full rounded-md text-xs font-extrabold text-blue-700 shadow-none"
//       >
//         Create New Campaign <Plus className="ml-auto h-4 w-4" />
//       </Button>
//     </Panel>
//   );
// }

function ColdLeadsSummaryCard() {
  return (
    <Panel title="Cold Leads Summary">
      <div className="space-y-4">
        {coldSummaryRows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 text-xs">
            <span className="font-semibold text-muted-foreground">
              {row.label}
            </span>
            <span className="font-extrabold text-secondary">{row.value}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

void SidebarFooter;
void StatsCard;

export function ColdLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeBucket, setActiveBucket] = useState<ColdLeadBucket>("all");
  const allColdLeadsQuery = useAllLeads(search, "cold");
  const cold7DayQuery = useAllLeads(search, "cold", 7);
  const cold15DayQuery = useAllLeads(search, "cold", 15);
  const cold30DayQuery = useAllLeads(search, "cold", 30);
  const cold60DayQuery = useAllLeads(search, "cold", 60);
  const inactivityDays =
    activeBucket === "all"
      ? undefined
      : Number(activeBucket.replace("-days", ""));
  const coldLeadsQuery = useAllLeads(
    search,
    "cold",
    inactivityDays,
    undefined,
    LEAD_TABLE_MAX_ROWS,
  );
  const filteredRows = useMemo<ColdLeadRow[]>(
    () =>
      (coldLeadsQuery.data?.rows ?? []).map((lead) => {
        const leadInactivityDays =
          getDaysSince(lead.lastContactedAt) || inactivityDays || 0;
        const score = lead.leadScore;
        return {
          id: lead.backendId ?? lead.id,
          name: lead.name,
          initials: lead.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2),
          avatarTone: "bg-blue-50 text-blue-700",
          requirement: lead.propertyType,
          source: lead.source,
          lastContactDate: lead.lastContactedAt
            ? new Date(lead.lastContactedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Not Set",
          lastContactTime: lead.lastContactedAt
            ? new Date(lead.lastContactedAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          lastContactIcon: Phone,
          inactivityDays: leadInactivityDays,
          bucket:
            leadInactivityDays >= 60
              ? "60-days"
              : leadInactivityDays >= 30
              ? "30-days"
              : leadInactivityDays >= 15
              ? "15-days"
              : "7-days",
          aiScore: score,
          potential: getColdLeadPotential(score),
          potentialValue: lead.budget,
          lastActivity: "No recent activity",
          lastActivityDate: lead.lastContactedAt
            ? new Date(lead.lastContactedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Not Set",
          nextAction:
            lead.nextFollowUp === "Not Set"
              ? "Schedule Follow-Up"
              : "Review Follow-Up",
          nextActionType: "call",
          owner: lead.assignedTo,
          ownerName: lead.ownerName,
          telecallerName: lead.telecallerName,
          fieldExecutiveName: lead.fieldExecutiveName,
        };
      }),
    [coldLeadsQuery.data?.rows, inactivityDays],
  );
  const bucketCounts = useMemo<Record<ColdLeadBucket, number>>(
    () => ({
      all: allColdLeadsQuery.data?.total ?? 0,
      "7-days": cold7DayQuery.data?.total ?? 0,
      "15-days": cold15DayQuery.data?.total ?? 0,
      "30-days": cold30DayQuery.data?.total ?? 0,
      "60-days": cold60DayQuery.data?.total ?? 0,
    }),
    [
      allColdLeadsQuery.data?.total,
      cold7DayQuery.data?.total,
      cold15DayQuery.data?.total,
      cold30DayQuery.data?.total,
      cold60DayQuery.data?.total,
    ],
  );
  const stats = useMemo<LeadStatsRowItem[]>(() => {
    const totalColdLeads = bucketCounts.all;
    const reactivatedLeadCount = (allColdLeadsQuery.data?.rows ?? []).filter(
      (lead) => lead.nextFollowUp !== "Not Set",
    ).length;
    return coldLeadStats
      .filter((stat) => stat.label !== "Potential Revenue")
      .map((stat) => {
        if (stat.label === "Total Cold Leads") {
          return {
            label: stat.label,
            value: String(totalColdLeads),
            change: "",
            helper: "Live cold inventory",
            icon: stat.icon,
            tone: stat.tone,
          };
        }

        if (stat.label === "Inactive > 7 Days") {
          return {
            label: stat.label,
            value: String(bucketCounts["7-days"]),
            change: "",
            helper: totalColdLeads
              ? `${((bucketCounts["7-days"] / totalColdLeads) * 100).toFixed(
                  1,
                )}% of queue`
              : "No cold leads yet",
            icon: stat.icon,
            tone: stat.tone,
          };
        }

        if (stat.label === "Inactive > 15 Days") {
          return {
            label: stat.label,
            value: String(bucketCounts["15-days"]),
            change: "",
            helper: "Needs stronger reactivation",
            icon: stat.icon,
            tone: stat.tone,
          };
        }

        if (stat.label === "Inactive > 30 Days") {
          return {
            label: stat.label,
            value: String(bucketCounts["30-days"]),
            change: "",
            helper: "Long-stalled opportunities",
            icon: stat.icon,
            tone: stat.tone,
          };
        }

        if (stat.label === "Reactivated (30 Days)") {
          return {
            label: stat.label,
            value: String(reactivatedLeadCount),
            change: "",
            helper: "Follow-up already scheduled",
            icon: stat.icon,
            tone: stat.tone,
          };
        }

        return {
          label: stat.label,
          value: String(stat.value),
          change: stat.change ?? "",
          helper: stat.helper ?? "",
          icon: stat.icon,
          tone: stat.tone,
        };
      });
  }, [allColdLeadsQuery.data?.rows, bucketCounts]);
  const showEmptyState =
    !coldLeadsQuery.isLoading &&
    !coldLeadsQuery.isFetching &&
    filteredRows.length === 0;
  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="Cold Leads"
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
              <span className="text-foreground">Cold Leads</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads, customers, projects, mobile number"
                value={search}
                placeholder="Search leads, customers, projects, mobile number..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
          </div>
      </DashboardHeader>

      <WorkspacePage>
          <section>
            <div className="flex items-center gap-2">
              <h1 className="flex items-center gap-2 text-3xl font-extrabold text-secondary">
                <Snowflake className="h-7 w-7 fill-blue-100 text-blue-500" />
                Cold Leads Dashboard
              </h1>
              <Info className="h-4 w-4 text-blue-700" />
            </div>
            <p className="mt-2 text-sm font-semibold text-blue-700">
              Identify inactive leads and re-engage them to convert into
              opportunities.
            </p>
          </section>

          <StatsRow stats={stats} />

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              {showEmptyState ? (
                <Card className="rounded-md border border-dashed border-slate-200 bg-white p-4 text-center shadow-card">
                  <div className="mx-auto flex h-[210px] max-w-lg flex-col items-center justify-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Snowflake className="size-5" />
                    </span>
                    <h2 className="mt-4 text-lg font-extrabold text-secondary">
                      No cold leads found
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      {search.trim()
                        ? `No cold leads matched "${search.trim()}". Try a broader search.`
                        : "There are no cold leads in the CRM for this bucket right now."}
                    </p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
                  <ColdLeadsTrendCard />
                  <LeadInactivityDistributionCard />
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <ColdLeadsSummaryCard />
            </aside>
          </section>
          <ColdLeadsTable
            rows={filteredRows}
            activeBucket={activeBucket}
            bucketCounts={bucketCounts}
            onBucketChange={setActiveBucket}
          />
          <div className="">
            <ReactivationCampaignPerformanceCard />
          </div>
      </WorkspacePage>
    </>
  );
}
