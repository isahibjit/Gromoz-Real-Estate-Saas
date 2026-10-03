import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Flame,
  LifeBuoy,
  RefreshCw,
  Search,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
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
  TablePageSizeOptions,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";

import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { addLeadSidebarItems } from "../add/addLeadData";
import { downloadCsvFile } from "../components/exportCsv";
import { LeadActionsMenu } from "../components/LeadActionsMenu";
import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import { LEAD_TABLE_MAX_ROWS, useAllLeads } from "../all/useAllLeads";
import {
  budgetBars,
  getHotLeadBucket,
  hotLeadStats,
  hotLeadTabs,
  hotReasonItems,
  leadSourceSegments,
  quickActions,
  scoreSegments,
} from "./hotLeadsData";
import type { DonutSegment, HotLeadBucket, HotLeadRow } from "./hotLeadsTypes";

function parseLeadCurrencyValue(value: string) {
  const normalized = value.replace(/[₹,\s]/g, "").toLowerCase();
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return 0;
  if (normalized.includes("cr")) return numeric * 10000000;
  if (normalized.includes("lakh")) return numeric * 100000;
  return numeric;
}

function formatLeadCurrencyValue(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function getHotLeadScoreLabel(score: number) {
  if (score >= 90) return "High";
  if (score >= 80) return "Qualified";
  return "Warm";
}

function getHotLeadStars(score: number) {
  if (score >= 90) return 5;
  if (score >= 80) return 4;
  return 3;
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

function exportHotLeadRows(rows: HotLeadRow[], filePrefix: string) {
  if (!rows.length) {
    toast.error("No hot leads available to export");
    return;
  }

  downloadCsvFile({
    headers: [
      "Lead Name",
      "Requirement",
      "Source",
      "Lead Score",
      "Score Label",
      "Interest Level",
      "Budget Match",
      "Project Interest",
      "Project Detail",
      "Last Contact",
      "Contact Type",
      "Next Action",
      "Priority",
      "Pre Sales Executive",
      "Sales Executive",
      "Owner",
    ],
    rows: rows.map((lead) => [
      lead.name,
      lead.requirement,
      lead.source,
      lead.aiScore,
      lead.scoreLabel,
      lead.interestLevel,
      `${lead.budgetMatch}%`,
      lead.projectName,
      lead.projectDetail,
      lead.lastContact,
      lead.contactType,
      lead.nextAction,
      lead.priority,
      lead.telecallerName || "Unassigned",
      lead.fieldExecutiveName || "Unassigned",
      lead.ownerName || lead.owner || "Unassigned",
    ]),
    filePrefix,
  });

  toast.success(
    `Exported ${rows.length} hot lead${rows.length === 1 ? "" : "s"}`,
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

function StatCard({ stat }: { stat: (typeof hotLeadStats)[number] }) {
  const Icon = stat.icon;
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
            stat.tone,
          )}
        >
          <Icon className="h-7 w-7" />
        </span>
        <div>
          <p className="text-xs font-extrabold text-secondary">{stat.label}</p>
          <p className="mt-2 text-2xl font-extrabold text-secondary">
            {stat.value}
          </p>
          {stat.change ? (
            <p className="mt-1 text-xs font-extrabold text-success">
              ↑ {stat.change}
            </p>
          ) : null}
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {stat.helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ScoreCircle({ score, label }: { score: number; label: string }) {
  return (
    <div className="text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border-4 border-success text-sm font-extrabold text-success">
        {score}
      </span>
      <p className="mt-1 text-[11px] font-semibold text-secondary">{label}</p>
    </div>
  );
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex text-amber-400">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={cn(
            "h-4 w-4 fill-current",
            index >= count && "fill-none text-amber-300",
          )}
        />
      ))}
    </div>
  );
}

function HotLeadsTable({ rows }: { rows: HotLeadRow[] }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HotLeadBucket>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const filteredRows = rows.filter(
    (lead) => activeTab === "all" || getHotLeadBucket(lead) === activeTab,
  );
  const activeTabOption = hotLeadTabs.find((tab) => tab.id === activeTab);
  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const pageStartIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = filteredRows.slice(
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
  }, [activeTab, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleExport = () => {
    exportHotLeadRows(filteredRows, `hot-leads-${activeTab}`);
  };

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 sm:flex-row sm:items-center sm:justify-between p-2">
        <div className="flex gap-6 overflow-x-auto">
          {hotLeadTabs.map((tab) => {
            const selected = activeTab === tab.id;
            const count =
              tab.id === "all"
                ? rows.length
                : rows.filter((lead) => getHotLeadBucket(lead) === tab.id)
                    .length;

            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                className={cn(
                  "h-12 shrink-0 rounded-none border-b-2 border-transparent px-1 text-sm font-extrabold text-secondary hover:bg-transparent",
                  selected && "border-blue-600 text-blue-700",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label} ({count})
              </Button>
            );
          })}
        </div>
        <div className="flex gap-3 pb-3 sm:pb-0">
          <Select defaultValue="table">
            <SelectTrigger
              aria-label="View hot leads"
              className="h-9 w-[150px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">View: Table</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md px-4 text-xs shadow-none"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left">
          <thead className="bg-slate-50/70 text-[11px] font-extrabold text-secondary">
            <tr>
              {[
                "Lead Details",
                "Lead Score",
                "Interest Level",
                "Budget Match",
                "Project Interest",
                "Last Contact",
                "Next Action",
                "Owner",
                "",
              ].map((head) => (
                <th
                  key={head}
                  className={cn(
                    "px-4 py-3",
                    head === "Lead Details" && "min-w-[320px] w-[320px]",
                  )}
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                >
                  No leads found in {activeTabOption?.label ?? "this"} bucket.
                </td>
              </tr>
            ) : (
              paginatedRows.map((lead) => (
                <tr
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
                  <td className="min-w-[320px] w-[320px] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold",
                          lead.rank <= 3
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-secondary",
                        )}
                      >
                        {lead.rank}
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-secondary">
                        {lead.initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-secondary">
                          {lead.name}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-muted-foreground">
                          {lead.requirement}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-muted-foreground">
                          {lead.source}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ScoreCircle score={lead.aiScore} label={lead.scoreLabel} />
                  </td>
                  <td className="px-4 py-3">
                    <StarRating count={lead.stars} />
                    <p className="mt-1 text-xs font-semibold text-secondary">
                      {lead.interestLevel}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="border-0 bg-green-100 px-3 py-1 text-sm font-extrabold text-success">
                      {lead.budgetMatch}%
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-extrabold text-secondary">
                      {lead.projectName}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {lead.projectDetail}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-secondary">
                      {lead.lastContact}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {lead.contactType}
                    </p>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-auto rounded-md px-3 py-2 text-left text-xs font-extrabold",
                        lead.priority === "High Priority"
                          ? "bg-green-50 text-success hover:bg-green-100"
                          : "bg-orange-50 text-primary hover:bg-orange-100",
                      )}
                    >
                      <span>{lead.nextAction}</span>
                      <span className="block text-[11px] font-semibold">
                        {lead.priority}
                      </span>
                    </Button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={lead.ownerAvatarUrl}
                          alt={lead.owner}
                        />
                        <AvatarFallback>
                          {lead.owner.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-extrabold text-secondary">
                        {lead.owner}
                      </span>
                    </div>
                  </td>
                  <td
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
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          {totalRows === 0
            ? "Showing 0 of 0 leads"
            : `Showing ${rangeStart} to ${rangeEnd} of ${totalRows} leads`}
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
            className="h-8 w-[140px] rounded-md text-xs font-bold shadow-none"
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

function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <div className="relative h-40 w-40 justify-self-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              innerRadius="58%"
              outerRadius="84%"
              startAngle={90}
              endAngle={-270}
              stroke="#fff"
              strokeWidth={2}
            >
              {segments.map((segment) => (
                <Cell key={segment.label} fill={segment.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <strong className="text-2xl font-extrabold text-secondary">
            {centerValue}
          </strong>
          <span className="text-xs font-bold text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="grid grid-cols-[10px_1fr_auto] items-center gap-3 text-xs"
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
  );
}

function LeadSourceBreakdownCard() {
  return (
    <Panel title="Lead Source Breakdown">
      <div className="grid items-center gap-4 py-2 md:grid-cols-[135px_minmax(0,1fr)]">
        <div className="relative h-[132px] w-[132px] justify-self-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={leadSourceSegments}
                dataKey="value"
                innerRadius="58%"
                outerRadius="86%"
                startAngle={90}
                endAngle={-270}
                stroke="#fff"
                strokeWidth={2}
              >
                {leadSourceSegments.map((segment) => (
                  <Cell key={segment.label} fill={segment.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <strong className="text-xl font-extrabold leading-none text-secondary">
              256
            </strong>
            <span className="mt-1 text-[11px] font-bold text-muted-foreground">
              Total Leads
            </span>
          </div>
        </div>

        <div className="min-w-0 space-y-2.5">
          {leadSourceSegments.map((segment) => (
            <div
              key={segment.label}
              className="grid grid-cols-[9px_minmax(62px,1fr)_auto] items-center gap-2.5 text-[11px]"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate font-extrabold text-secondary">
                {segment.label}
              </span>
              <span className="whitespace-nowrap text-right font-extrabold text-secondary">
                {segment.value} ({segment.percent})
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function BudgetRangeChart() {
  const max = 90;
  const yTicks = [40, 30, 20, 0];

  return (
    <div className="pt-1">
      <p className="mb-2 text-[11px] font-extrabold text-secondary">Leads</p>
      <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
        <div className="relative h-[155px] text-[10px] font-bold text-muted-foreground">
          {yTicks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${100 - (tick / 45) * 100}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
        <div className="relative h-[155px] border-b border-l border-slate-100">
          {[0, 20, 30, 40].map((tick) => (
            <span
              key={tick}
              className="absolute left-0 h-px w-full bg-slate-100"
              style={{ bottom: `${(tick / 45) * 100}%` }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 grid h-full grid-cols-6 items-end gap-5 px-3">
            {budgetBars.map((bar) => (
              <div
                key={bar.label}
                className="flex h-full flex-col items-center justify-end"
              >
                <span className="mb-2 text-xs font-extrabold text-secondary">
                  {bar.value}
                </span>
                <div
                  className="w-full max-w-[46px] rounded-t-md bg-gradient-to-b from-blue-600 to-blue-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                  style={{
                    height: `${Math.max(18, (bar.value / max) * 118)}px`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-[36px] mt-3 grid grid-cols-6 gap-5 px-3 text-center text-[9px] font-extrabold text-muted-foreground">
        {budgetBars.map((bar) => (
          <span key={bar.label}>{bar.label}</span>
        ))}
      </div>
    </div>
  );
}

function ConversionGauge() {
  return (
    <div className="mx-auto max-w-[300px] text-center">
      <svg viewBox="0 0 220 120" className="h-36 w-full">
        <path
          d="M30 100a80 80 0 0 1 160 0"
          fill="none"
          stroke="#e2e8f0"
          strokeLinecap="round"
          strokeWidth="14"
        />
        <path
          d="M30 100a80 80 0 0 1 160 0"
          fill="none"
          stroke="#059669"
          strokeLinecap="round"
          strokeWidth="14"
          strokeDasharray="196 252"
        />
      </svg>
      <p className="-mt-12 text-3xl font-extrabold text-secondary">78%</p>
      <p className="text-sm font-extrabold text-secondary">High Probability</p>
      <p className="mt-4 text-xs font-semibold text-blue-700">
        These hot leads have the strongest conversion signals this week.
      </p>
    </div>
  );
}

function WhyHotCard() {
  return (
    <Panel
      title="Why These Leads are Hot?"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-md text-xs shadow-none"
        >
          View Details
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {hotReasonItems.map((item, index) => {
          const Icon = item.icon;
          const values = ["92%", "88%", "76%", "68%", "81%"];
          return (
            <div
              key={item.title}
              className="flex items-center gap-3 rounded-md border border-slate-100 bg-slate-50/70 p-3"
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
                <p className="text-[11px] font-semibold text-muted-foreground">
                  {item.helper}
                </p>
              </div>
              <span className="text-sm font-extrabold text-secondary">
                {values[index]}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

void StatCard;

export function HotLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const hotLeadsQuery = useAllLeads(
    search,
    "hot",
    undefined,
    undefined,
    LEAD_TABLE_MAX_ROWS,
  );
  const rows = useMemo<HotLeadRow[]>(
    () =>
      (hotLeadsQuery.data?.rows ?? []).map((lead, index) => {
        const score = lead.leadScore;
        return {
          id: lead.backendId ?? lead.id,
          rank: index + 1,
          name: lead.name,
          initials: lead.name
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2),
          requirement: lead.propertyType,
          source: lead.source,
          aiScore: score,
          scoreLabel: lead.leadScoreLabel || getHotLeadScoreLabel(score),
          interestLevel: lead.interestLevel ?? lead.priority,
          stars: getHotLeadStars(score),
          budgetMatch: score,
          projectName: "Preferred project",
          projectDetail: lead.budget,
          lastContact: lead.lastFollowUp.replace("\n", ", "),
          contactType: "CRM activity",
          nextAction:
            lead.nextFollowUp === "Not Set"
              ? "Schedule Follow-Up"
              : "Follow-Up Scheduled",
          priority: score >= 90 ? "High Priority" : "Medium Priority",
          owner: lead.assignedTo,
          ownerName: lead.ownerName,
          telecallerName: lead.telecallerName,
          fieldExecutiveName: lead.fieldExecutiveName,
        };
      }),
    [hotLeadsQuery.data?.rows],
  );
  const stats = useMemo<LeadStatsRowItem[]>(() => {
    const totalHotLeads = hotLeadsQuery.data?.total ?? rows.length;
    const highConversionLeads = rows.filter(
      (lead) => lead.aiScore >= 90,
    ).length;
    const averageLeadScore = rows.length
      ? Math.round(
          rows.reduce((sum, lead) => sum + lead.aiScore, 0) / rows.length,
        )
      : 0;
    const potentialRevenue = rows.reduce(
      (sum, lead) => sum + parseLeadCurrencyValue(lead.projectDetail),
      0,
    );
    const expectedClosures = rows.filter(
      (lead) => lead.aiScore >= 84 && lead.nextAction !== "Schedule Follow-Up",
    ).length;

    return hotLeadStats.map((stat) => {
      if (stat.label === "Total Hot Leads") {
        return {
          label: stat.label,
          value: String(totalHotLeads),
          change: "",
          helper: "Live CRM hot queue",
          icon: stat.icon,
          tone: stat.tone,
        };
      }

      if (stat.label === "High Conversion Leads") {
        return {
          label: stat.label,
          value: String(highConversionLeads),
          change: "",
          helper: totalHotLeads
            ? `${((highConversionLeads / totalHotLeads) * 100).toFixed(
                1,
              )}% of total`
            : "No hot leads yet",
          icon: stat.icon,
          tone: stat.tone,
        };
      }

      if (stat.label === "Avg. Lead Score") {
        return {
          label: stat.label,
          value: rows.length ? `${averageLeadScore}/100` : "0/100",
          change: "",
          helper: rows.length ? "Based on live scoring" : "No scored leads",
          icon: stat.icon,
          tone: stat.tone,
        };
      }

      if (stat.label === "Potential Revenue") {
        return {
          label: stat.label,
          value: formatLeadCurrencyValue(potentialRevenue),
          change: "",
          helper: "Budget across hot leads",
          icon: stat.icon,
          tone: stat.tone,
        };
      }

      if (stat.label === "Expected Closures") {
        return {
          label: stat.label,
          value: String(expectedClosures),
          change: "",
          helper: "Qualified with next steps",
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
  }, [hotLeadsQuery.data?.total, rows]);
  const showEmptyState =
    !hotLeadsQuery.isLoading && !hotLeadsQuery.isFetching && rows.length === 0;

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="Hot Leads"
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
              <span className="text-foreground">Hot Leads</span>
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
          <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-extrabold text-secondary">
                <Flame className="h-7 w-7 fill-primary text-primary" />
                Hot Leads Dashboard
              </h1>
              <p className="mt-2 text-sm font-semibold text-blue-800">
                High intent leads with maximum conversion potential. Focus on
                these leads to close more deals.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md px-5 shadow-none"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md px-5 shadow-none"
                onClick={() => exportHotLeadRows(rows, "hot-leads")}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </section>
          <StatsRow stats={stats} />
          {showEmptyState ? (
            <Card className="rounded-md border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-card">
              <div className="mx-auto flex max-w-lg flex-col items-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-orange-50 text-primary">
                  <Flame className="size-5" />
                </span>
                <h2 className="mt-4 text-lg font-extrabold text-secondary">
                  No hot leads found
                </h2>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  {search.trim()
                    ? `No hot leads matched "${search.trim()}". Try a broader search or clear the filters.`
                    : "There are no hot leads in the CRM yet. Once high-intent leads are available, they will appear here."}
                </p>
              </div>
            </Card>
          ) : (
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <HotLeadsTable rows={rows} />
                <div className="grid gap-5 xl:grid-cols-3">
                  <Panel title="Hot Leads by Score">
                    <DonutChart
                      segments={scoreSegments}
                      centerValue="256"
                      centerLabel="Total"
                    />
                  </Panel>
                  <Panel title="Hot Leads by Budget Range">
                    <BudgetRangeChart />
                  </Panel>
                  <Panel title="Conversion Probability">
                    <ConversionGauge />
                  </Panel>
                </div>
                <WhyHotCard />
              </div>
              <aside className="space-y-5">
                <LeadSourceBreakdownCard />
              </aside>
            </section>
          )}
      </WorkspacePage>
    </>
  );
}
