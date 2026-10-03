import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Download,
  Eye,
  Filter,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  Badge,
  Button,
  Card,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TablePageSizeOptions,
  Tabs,
  TabsList,
  TabsTrigger,
  cn,
} from "ui";

import { api } from "../../../../common/api";
import { currentOrganizationId } from "../../../../common/tenantRequestScope";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../assignment/leadAssignmentData";
import { BulkUploadLeadsWorkspace } from "../bulk-upload/BulkUploadLeadsScreen";
import {
  errorReasons,
  importInsightSegments,
  importSources,
  importStats,
  importTips,
} from "./importLeadsData";
import type { DonutSegment, ImportStatus } from "./importLeadsTypes";
import {
  CONNECTOR_STATE_LABEL,
  LEAD_SOURCE_CONNECTORS,
  LeadSourceConnectorMark,
  type ConnectorState,
  type ConnectorSummary,
} from "./leadSourceRegistry";
import { useLeadImportStats } from "./useLeadImportStats";

type ImportMethod = "connectors" | "excel-csv" | "history";
type ImportTarget = "lead" | "contact";

type LeadImportListItem = {
  id: string;
  source: string;
  targetType: "LEAD" | "CONTACT_LEAD";
  fileName?: string | null;
  totalRecords: number;
  newLeads: number;
  updatedLeads?: number;
  duplicates: number;
  errors: number;
  status: ImportStatus;
  progress: number;
  importedByName?: string | null;
  createdAt: string;
};

type LeadImportListResponse = {
  data: LeadImportListItem[];
  meta: {
    total: number;
  };
};

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

const connectorStatusTone: Record<ConnectorState, string> = {
  NOT_CONFIGURED: "border-slate-200 bg-slate-50 text-slate-600",
  CONFIGURED: "border-blue-200 bg-blue-50 text-blue-700",
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PAUSED: "border-amber-200 bg-amber-50 text-amber-700",
  ERROR: "border-red-200 bg-red-50 text-red-700",
};

function formatConnectorActivity(value: string | null | undefined) {
  if (!value) return "No leads received yet";
  return `Last lead ${new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function SourceCards({
  onUploadClick,
  contactMode,
  connectors,
  isLoading,
  isError,
  onRetry,
}: {
  onUploadClick: () => void;
  contactMode: boolean;
  connectors?: ConnectorSummary[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  const navigate = useNavigate();

  if (contactMode) {
    return (
      <Card className="rounded-md border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-secondary">
              Import cold contacts from Excel or CSV
            </h2>
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Portal connectors remain lead-import oriented. Contact imports use
              the shared file-upload workflow.
            </p>
          </div>
          <Button
            type="button"
            className="h-11 rounded-md px-6"
            onClick={onUploadClick}
          >
            <CloudUpload className="mr-2 h-4 w-4" />
            Upload contact file
          </Button>
        </div>
      </Card>
    );
  }

  const connectorById = new Map(
    (connectors ?? []).map((connector) => [connector.id, connector]),
  );

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-3 shadow-card">
      {isError ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-sm font-semibold text-destructive">
            Connector status could not be loaded.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {LEAD_SOURCE_CONNECTORS.map((connector) => {
          const summary = connectorById.get(connector.id);
          const state = summary?.state ?? "NOT_CONFIGURED";
          return (
            <button
              key={connector.id}
              type="button"
              onClick={() => navigate(connector.route)}
              disabled={isLoading}
              className="group flex min-h-44 flex-col rounded-xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-blue-400 hover:bg-blue-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <LeadSourceConnectorMark connector={connector} />
                <span
                  className={cn(
                    "rounded-full border px-2 py-1 text-[10px] font-extrabold",
                    connectorStatusTone[state],
                  )}
                >
                  {isLoading ? "Loading" : CONNECTOR_STATE_LABEL[state]}
                </span>
              </div>
              <span className="mt-3 text-sm font-extrabold text-secondary">
                {connector.name}
              </span>
              <span className="mt-1 text-xs leading-5 text-muted-foreground">
                {isLoading
                  ? "Reading workspace status..."
                  : formatConnectorActivity(summary?.lastLeadReceivedAt)}
              </span>
              <span className="mt-auto border-t border-slate-100 pt-3 text-lg font-black tabular-nums text-secondary">
                {(summary?.leadCount ?? 0).toLocaleString("en-IN")}
                <span className="ml-1 text-[10px] font-bold text-muted-foreground">
                  leads
                </span>
              </span>
            </button>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          onClick={onUploadClick}
          className="h-full min-h-[148px] flex-col items-center justify-between gap-1.5 rounded-xl border border-dashed border-blue-400 bg-blue-50/40 p-2.5 text-center hover:bg-blue-50 cursor-pointer"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-primary shrink-0">
            <CloudUpload className="h-5 w-5" />
          </span>
          <span className="text-xs font-extrabold text-secondary leading-tight">
            Upload File
          </span>
          <span className="text-xs font-black text-primary">Excel / CSV</span>
          <span className="text-[10px] font-bold text-blue-700">
            Bulk Import
          </span>
        </Button>
        </div>
      )}
    </Card>
  );
}

function StatRow({
  stats,
}: {
  stats?: {
    totalLeads: number;
    newLeads: number;
    duplicates: number;
    totalImports: number;
  };
}) {
  const dynamicStats = [
    {
      label: "Total Leads Found",
      value: (stats?.totalLeads ?? 0).toLocaleString(),
      helper: "Across all sources",
      icon: importStats[0].icon,
      tone: importStats[0].tone,
    },
    {
      label: "New Leads",
      value: (stats?.newLeads ?? 0).toLocaleString(),
      helper: stats?.totalLeads
        ? `${Math.round(((stats.newLeads ?? 0) / stats.totalLeads) * 100)}%`
        : "0%",
      icon: importStats[1].icon,
      tone: importStats[1].tone,
    },
    {
      label: "Duplicates Found",
      value: (stats?.duplicates ?? 0).toLocaleString(),
      helper: stats?.totalLeads
        ? `${Math.round(((stats.duplicates ?? 0) / stats.totalLeads) * 100)}%`
        : "0%",
      icon: importStats[2].icon,
      tone: importStats[2].tone,
    },
    {
      label: "Invalid / Error",
      value: "0",
      helper: "0%",
      icon: importStats[3].icon,
      tone: importStats[3].tone,
    },
    {
      label: "Ready to Import",
      value: (stats?.totalLeads ?? 0).toLocaleString(),
      helper: "Active in CRM",
      icon: importStats[4].icon,
      tone: importStats[4].tone,
    },
  ];

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_120px]">
        {dynamicStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-4 rounded-md border border-slate-100 p-3"
            >
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                  stat.tone,
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-extrabold text-secondary">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-secondary">
                  {stat.value}
                </p>
                <p className="text-xs font-semibold text-muted-foreground">
                  {stat.helper}
                </p>
              </div>
            </div>
          );
        })}
        <div className="flex flex-col items-center justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-full border-[10px] border-success text-center">
            <strong className="text-lg text-secondary">98%</strong>
          </div>
          <p className="mt-2 text-xs font-extrabold text-secondary">
            Live Health
          </p>
        </div>
      </div>
    </Card>
  );
}

const statusTone: Record<ImportStatus, string> = {
  Completed: "bg-green-100 text-success",
  Processing: "bg-blue-100 text-blue-700",
  Pending: "bg-orange-100 text-primary",
  Failed: "bg-red-100 text-red-600",
};

function ActionButtons({ row }: { row: { status: ImportStatus } }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
        <Eye className="h-4 w-4 text-secondary" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
        {row.status === "Processing" ? (
          <Pause className="h-4 w-4 text-blue-700" />
        ) : row.status === "Pending" ? (
          <Play className="h-4 w-4 text-blue-700" />
        ) : row.status === "Failed" ? (
          <RefreshCw className="h-4 w-4 text-blue-700" />
        ) : (
          <Download className="h-4 w-4 text-blue-700" />
        )}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
}

function ImportsTable({ target }: { target: ImportTarget }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const organizationId = currentOrganizationId() ?? "unscoped";
  const importsQuery = useQuery({
    queryKey: ["lead-imports", organizationId, target, page, pageSize],
    queryFn: async () =>
      (
        await api.get<LeadImportListResponse>("/lead-imports", {
          params: {
            page,
            limit: pageSize,
            targetType: target === "contact" ? "CONTACT_LEAD" : "LEAD",
          },
        })
      ).data,
  });
  const importRows = importsQuery.data?.data ?? [];
  const totalRows = importsQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  useEffect(() => {
    setPage(1);
  }, [target]);
  useEffect(() => {
    if (importsQuery.isSuccess && page > totalPages) setPage(totalPages);
  }, [importsQuery.isSuccess, page, totalPages]);

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 sm:flex-row sm:items-center sm:justify-between p-2">
        <div className="flex gap-7 overflow-x-auto">
          {[
            target === "contact" ? "Recent Contact Imports" : "Recent Imports",
            "All Imports",
          ].map((tab, index) => (
            <Button
              key={tab}
              type="button"
              variant="ghost"
              className={cn(
                "h-12 shrink-0 rounded-none border-b-2 border-transparent px-1 text-sm font-extrabold text-secondary hover:bg-transparent",
                index === 0 && "border-primary text-primary",
              )}
            >
              {tab}
            </Button>
          ))}
        </div>
        <div className="flex gap-3 pb-3 sm:pb-0">
          <Select defaultValue="all">
            <SelectTrigger
              aria-label="Source filter"
              className="h-9 w-[190px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search imports"
              placeholder="Search imports..."
              className="h-9 w-[220px] rounded-md pl-9 text-xs font-semibold shadow-none"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left">
          <thead className="bg-slate-50/70 text-[11px] font-extrabold text-secondary">
            <tr>
              {[
                "#",
                "File / Source",
                "Total Records",
                "Added Leads",
                "Updated Leads",
                "Duplicates",
                "Errors",
                "Status",
                "Progress",
                "Imported By",
                "Import Date",
                "Actions",
              ].map((head) => (
                <th key={head} className="px-4 py-3">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {importRows.map((row, index) => {
              const matchedSource = importSources.find(
                (source) =>
                  source.name.toLowerCase() === row.source.toLowerCase(),
              );
              const Icon = matchedSource?.icon ?? CloudUpload;
              const progressColor =
                row.status === "Completed"
                  ? "bg-success"
                  : row.status === "Processing"
                  ? "bg-blue-600"
                  : "bg-slate-300";
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md border border-slate-100",
                          matchedSource?.tone ?? "bg-blue-50 text-blue-700",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs font-extrabold text-secondary">
                          {row.fileName || "Excel/CSV import"}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {row.source}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {row.totalRecords}
                  </td>
                  <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {row.newLeads}
                  </td>
                  <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {row.updatedLeads ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {row.duplicates}
                  </td>
                  <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {row.errors}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "border-0 px-3 py-1 text-xs font-extrabold",
                        statusTone[row.status],
                      )}
                    >
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Progress
                        value={row.progress}
                        className="h-2 w-28 bg-slate-100"
                        indicatorClassName={progressColor}
                      />
                      <span className="text-xs font-extrabold text-secondary">
                        {row.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-extrabold text-secondary">
                    {row.importedByName || "System"}
                  </td>
                  <td className="whitespace-pre-line px-4 py-3 text-xs font-extrabold text-secondary">
                    {new Date(row.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <ActionButtons row={row} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          {importsQuery.isLoading
            ? "Loading imports..."
            : `Showing ${
                importRows.length ? (page - 1) * pageSize + 1 : 0
              } to ${
                importRows.length
                  ? (page - 1) * pageSize + importRows.length
                  : 0
              } of ${totalRows} imports`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            aria-label="Previous imports page"
            disabled={page <= 1 || importsQuery.isFetching}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-xs font-semibold">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            aria-label="Next imports page"
            disabled={page >= totalPages || importsQuery.isFetching}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            setPageSize(Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger
            aria-label="Rows per page"
            className="h-8 w-[140px] rounded-md text-xs font-bold shadow-none"
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

function Donut({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  return (
    <div className="grid items-center gap-4 md:grid-cols-[150px_minmax(0,1fr)]">
      <div className="relative h-40 w-40 justify-self-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              innerRadius="68%"
              outerRadius="96%"
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
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
            className="grid grid-cols-[10px_minmax(60px,1fr)_auto] gap-2 text-[11px]"
          >
            <span
              className="mt-1 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="font-semibold text-secondary">
              {segment.label}
            </span>
            <span className="font-extrabold text-secondary">
              {segment.helper}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RightRail() {
  return (
    <aside className="grid gap-5 lg:grid-cols-3">
      <Panel
        title="Import Insights"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1 text-xs text-blue-700"
          >
            View Report
          </Button>
        }
      >
        <Donut
          segments={importInsightSegments}
          centerValue="3,217"
          centerLabel="Ready to Import"
        />
      </Panel>
      <Panel
        title="Top Error Reasons"
        action={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1 text-xs text-blue-700"
          >
            View All
          </Button>
        }
      >
        <div className="space-y-4">
          {errorReasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <div key={reason.label} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    reason.tone,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-xs font-extrabold text-secondary">
                  {reason.label}
                </span>
                <span className="text-sm font-extrabold text-secondary">
                  {reason.count}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Import Tips">
        <div className="space-y-3">
          {importTips.map((tip) => (
            <div
              key={tip}
              className="flex items-center gap-2 text-xs font-semibold text-secondary"
            >
              <Check className="h-4 w-4 rounded-full border border-success p-0.5 text-success" />
              {tip}
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}

export function ImportLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const methodParam = searchParams.get("method");
  const targetParam = searchParams.get("target");
  const target: ImportTarget = targetParam === "contact" ? "contact" : "lead";
  const isContactMode = target === "contact";
  const activeMethod: ImportMethod =
    methodParam === "excel-csv" || methodParam === "history"
      ? methodParam
      : "connectors";
  const setImportMethod = (method: ImportMethod) => {
    const next = new URLSearchParams();
    if (method !== "connectors") next.set("method", method);
    if (target === "contact") next.set("target", "contact");
    setSearchParams(next);
  };

  const statsQuery = useLeadImportStats();

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Import Leads"
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
              <span className="text-foreground">
                {isContactMode ? "Import Contact Leads" : "Import Leads"}
              </span>
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
              <h1 className="text-3xl font-extrabold text-secondary">
                {isContactMode ? "Import Contact Leads" : "Import Leads"}
              </h1>
              <p className="mt-2 text-sm font-semibold text-blue-800">
                {isContactMode
                  ? "Import cold contacts into the Contact Leads workspace before they become active leads."
                  : "Import leads from multiple sources and channels into your CRM"}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setImportMethod("excel-csv")}
                className="h-11 rounded-md px-5 shadow-none"
              >
                <Filter className="h-4 w-4" />
                View Mapping
              </Button>
              <Button
                type="button"
                className="h-11 rounded-md px-7"
                onClick={() => setImportMethod("excel-csv")}
              >
                <Plus className="h-4 w-4" />
                New Import
              </Button>
            </div>
          </section>
          <Tabs
            value={activeMethod}
            onValueChange={(value) => setImportMethod(value as ImportMethod)}
            className="space-y-5"
          >
            <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none border-b border-slate-200 bg-transparent p-0">
              <TabsTrigger
                value="connectors"
                className="h-12 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-extrabold text-secondary hover:bg-transparent hover:text-primary data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Portal Connectors
              </TabsTrigger>
              <TabsTrigger
                value="excel-csv"
                className="h-12 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-extrabold text-secondary hover:bg-transparent hover:text-primary data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Excel / CSV Upload
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="h-12 shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-4 text-sm font-extrabold text-secondary hover:bg-transparent hover:text-primary data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                Import History
              </TabsTrigger>
            </TabsList>
            {activeMethod === "connectors" ? (
              <div className="space-y-5">
                <SourceCards
                  contactMode={isContactMode}
                  connectors={statsQuery.data?.connectors}
                  isLoading={statsQuery.isLoading}
                  isError={statsQuery.isError}
                  onRetry={() => void statsQuery.refetch()}
                  onUploadClick={() => setImportMethod("excel-csv")}
                />
                {isContactMode ? null : <StatRow stats={statsQuery.data} />}
              </div>
            ) : null}
            {activeMethod === "excel-csv" ? (
              <BulkUploadLeadsWorkspace
                embedded
                targetType={isContactMode ? "CONTACT_LEAD" : "LEAD"}
              />
            ) : null}
            {activeMethod === "history" ? (
              <section className="space-y-5">
                <ImportsTable target={target} />
                <RightRail />
              </section>
            ) : null}
          </Tabs>
      </WorkspacePage>
    </>
  );
}
