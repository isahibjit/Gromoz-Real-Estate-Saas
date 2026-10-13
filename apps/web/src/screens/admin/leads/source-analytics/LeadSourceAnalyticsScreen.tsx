import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Search,
} from "lucide-react";
import {
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
import {
  PageHeader,
  WorkspacePage,
} from "../../../../components/layout/PageHeader";
import { api } from "../../../../common/api";
import { addLeadSidebarItems } from "../add/addLeadData";
import {
  conversionBySource,
  costDistribution,
  costVsLeads,
  kpiStats,
  leadsBySource,
  revenueDistribution,
  sourceEfficiency,
  sourceRows,
  tabs,
  topRoiSources,
  totalRow,
} from "./sourceAnalyticsData";

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

function SourceIcon({
  source,
  color,
  short,
}: {
  source: string;
  color: string;
  short: string;
}) {
  return (
    <span
      aria-label={source}
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-extrabold text-white"
      style={{ backgroundColor: color }}
    >
      {short}
    </span>
  );
}

function KpiRow() {
  return (
    <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
      {kpiStats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card sm:p-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-md sm:size-12",
                  stat.tone,
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-extrabold text-secondary">
                  {stat.label}
                </p>
                <p className="mt-1 truncate text-xl font-extrabold text-secondary">
                  {stat.value}
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-[11px] font-extrabold",
                    stat.direction === "up" ? "text-success" : "text-red-500",
                  )}
                >
                  {stat.direction === "up" ? "Up" : "Down"} {stat.change}
                </p>
                <p className="mt-1 truncate text-[11px] font-semibold text-muted-foreground">
                  {stat.helper}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
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
      <div className="flex min-w-max gap-7 px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              "border-b-2 px-1 pb-3 text-sm font-extrabold transition-colors",
              activeTab === tab
                ? "border-blue-700 text-blue-700"
                : "border-transparent text-secondary hover:text-blue-700",
            )}
            onClick={() => onChangeTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateSelect() {
  return (
    <Select defaultValue="7">
      <SelectTrigger
        aria-label="Chart date range"
        className="h-8 w-[110px] rounded-md text-xs font-bold shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7">Last 7 Days</SelectItem>
      </SelectContent>
    </Select>
  );
}

function DonutCard({
  title,
  center,
  helper,
  data,
  legendValueSuffix = "",
}: {
  title: string;
  center: string;
  helper: string;
  data: readonly {
    name: string;
    value: number;
    color: string;
    label?: string;
  }[];
  legendValueSuffix?: string;
}) {
  return (
    <Panel title={title} action={<DateSelect />}>
      <div className="grid gap-4 lg:grid-cols-[190px_minmax(0,1fr)] lg:items-center">
        <div className="relative h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={58}
                outerRadius={86}
                paddingAngle={1}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xl font-extrabold text-secondary">{center}</p>
              <p className="text-[11px] font-bold text-muted-foreground">
                {helper}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {data.map((item) => (
            <div
              key={item.name}
              className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-2 text-xs font-bold"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-secondary">{item.name}</span>
              <span className="text-secondary">
                {item.label ?? `${item.value}${legendValueSuffix}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function CostVsLeadsCard() {
  return (
    <Panel title="Cost vs Leads" action={<DateSelect />}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={costVsLeads}
            margin={{ top: 12, right: 16, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="source"
              tick={{ fontSize: 10, fontWeight: 700 }}
              interval={0}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Bar
              yAxisId="left"
              dataKey="leads"
              fill="#2563eb"
              radius={[5, 5, 0, 0]}
              barSize={22}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cost"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function PerformanceTable() {
  return (
    <Panel title="Lead Source Performance" className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <Table className="min-w-[1080px]">
          <TableHeader>
            <TableRow className="bg-slate-50">
              {[
                "Source",
                "Leads",
                "% of Total",
                "Cost (Rs)",
                "CPL (Rs)",
                "Converted Leads",
                "Conversion Rate",
                "Revenue (Rs)",
                "ROI",
              ].map((head) => (
                <TableHead
                  key={head}
                  className="px-4 py-3 text-[11px] font-extrabold text-secondary"
                >
                  {head}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sourceRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-secondary">
                    <SourceIcon
                      source={row.source}
                      color={row.color}
                      short={row.short}
                    />
                    {row.source}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                  {row.leads}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                  {row.total}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                  {row.cost}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                  {row.cpl}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                  {row.converted}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-success">
                  {row.conversion}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                  {row.revenue}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge className="border-0 bg-green-50 text-success">
                    {row.roi}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-slate-50 font-extrabold">
              <TableCell className="px-4 py-3 text-xs text-secondary">
                {totalRow.source}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-secondary">
                {totalRow.leads}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-secondary">
                {totalRow.total}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-secondary">
                {totalRow.cost}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-secondary">
                {totalRow.cpl}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-secondary">
                {totalRow.converted}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-success">
                {totalRow.conversion}
              </TableCell>
              <TableCell className="px-4 py-3 text-xs text-secondary">
                {totalRow.revenue}
              </TableCell>
              <TableCell className="px-4 py-3">
                <Badge className="border-0 bg-green-100 text-success">
                  {totalRow.roi}
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          Showing 1 to 8 of 8 sources
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="navy"
            className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
          >
            1
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select defaultValue="10">
          <SelectTrigger
            aria-label="Rows per page"
            className="h-8 w-[110px] rounded-md text-xs font-bold shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Panel>
  );
}

function RightRail() {
  return (
    <aside className="space-y-4">
      <Panel
        title="Top Performing Sources by ROI"
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
        <div className="space-y-3">
          {topRoiSources.map((item, index) => (
            <div
              key={item.source}
              className="grid grid-cols-[24px_24px_minmax(0,1fr)_auto] items-center gap-2"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-50 text-[11px] font-extrabold text-blue-700">
                {index + 1}
              </span>
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs font-extrabold text-secondary">
                {item.source}
              </span>
              <span className="text-xs font-extrabold text-success">
                {item.roi}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </aside>
  );
}

function StackedBarCard({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: readonly { source: string; percent: number; color: string }[];
}) {
  return (
    <Panel title={title}>
      <p className="-mt-3 mb-4 text-xs font-semibold text-muted-foreground">
        {subtitle}
      </p>
      <div className="flex h-4 overflow-hidden rounded-md bg-slate-100">
        {data.map((item, index) => (
          <span
            key={`${item.source}-${index}`}
            style={{ width: `${item.percent}%`, backgroundColor: item.color }}
          />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {data.map((item, index) => (
          <div key={`${item.source}-label-${index}`}>
            <p className="text-xs font-extrabold text-secondary">
              {item.percent}%
            </p>
            <p className="mt-1 text-[10px] font-bold text-muted-foreground">
              {item.source}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function EfficiencyCard() {
  return (
    <Panel title="Source Efficiency (CPL)">
      <p className="-mt-3 mb-4 text-xs font-semibold text-muted-foreground">
        Lower CPL is better
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {sourceEfficiency.map((item) => (
          <div
            key={item.source}
            className="rounded-md border border-slate-100 bg-slate-50 p-3"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-xs font-extrabold text-success">
              {item.rank}
            </span>
            <p className="mt-2 text-xs font-extrabold text-secondary">
              {item.source}
            </p>
            <p className="mt-2 text-sm font-extrabold text-secondary">
              {item.cpl}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

type AccountAttribution = {
  integrationConnectionId: string;
  accountName: string;
  provider?: string | null;
  archived: boolean;
  leads: number;
};

function AccountAttributionCard({ accounts, isLoading }: { accounts: AccountAttribution[]; isLoading: boolean }) {
  return (
    <Panel title="Portal account attribution">
      <p className="-mt-3 mb-4 text-xs font-semibold text-muted-foreground">
        Leads remain grouped by their canonical source and retain their originating portal account.
      </p>
      {isLoading ? <p className="text-sm font-semibold text-muted-foreground">Loading account attribution…</p> : null}
      {!isLoading && accounts.length === 0 ? <p className="text-sm font-semibold text-muted-foreground">No account-attributed portal leads yet. Historical leads remain legacy/unattributed.</p> : null}
      <div className="space-y-2">
        {accounts.map((account) => (
          <div key={account.integrationConnectionId} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-secondary">{account.accountName}</p>
              <p className="text-xs font-semibold text-muted-foreground">{account.provider === "MAGICBRICKS" ? "MagicBricks" : account.provider === "HOUSING" ? "Housing.com" : "Portal account"}{account.archived ? " · Archived" : ""}</p>
            </div>
            <Badge className="shrink-0 border-0 bg-blue-50 text-blue-700">{account.leads} leads</Badge>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function LeadSourceAnalyticsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const accountAttributionQuery = useQuery({
    queryKey: ["lead-source-account-attribution"],
    queryFn: async () => {
      const response = await api.get<{ accounts?: AccountAttribution[] }>("/leads/source-analytics");
      return response.data.accounts ?? [];
    },
  });

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Reports"
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
              <span className="text-foreground">Lead Source Analytics</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads"
                value={search}
                placeholder="Search leads, customers, projects..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
            <Select defaultValue="week">
              <SelectTrigger
                aria-label="Date range"
                className="h-10 w-[200px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <CalendarDays className="h-4 w-4 text-info mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">May 20 - May 26, 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </DashboardHeader>
      <WorkspacePage>
          <PageHeader
            title="Lead source analytics"
            subtitle="Track performance across every lead source and optimize your marketing investments."
            actions={
              <>
                <Button type="button" variant="outline">
                  <Download className="h-4 w-4" />
                  Export report
                </Button>
                <Button type="button" variant="outline">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <Button type="button" variant="navy">
                  <CalendarDays className="h-4 w-4" />
                  Custom range
                </Button>
              </>
            }
          />
          <KpiRow />
          <AnalyticsTabs activeTab={activeTab} onChangeTab={setActiveTab} />
          <section className="grid gap-5 xl:grid-cols-[1fr_1.45fr_1fr]">
            <DonutCard
              title="Leads by Source"
              center="1,248"
              helper="Total Leads"
              data={leadsBySource}
            />
            <CostVsLeadsCard />
            <DonutCard
              title="Conversion Rate by Source"
              center="22.12%"
              helper="Avg. Conversion Rate"
              data={conversionBySource}
              legendValueSuffix="%"
            />
          </section>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <PerformanceTable />
            <RightRail />
          </section>
          <section className="grid gap-5 xl:grid-cols-[1fr_1.1fr_1.35fr]">
            <StackedBarCard
              title="Cost Distribution"
              subtitle="By lead sources"
              data={costDistribution}
            />
            <StackedBarCard
              title="Revenue by Source"
              subtitle="Total revenue: Rs 2.48 Cr"
              data={revenueDistribution}
            />
            <EfficiencyCard />
          </section>
          <AccountAttributionCard
            accounts={accountAttributionQuery.data ?? []}
            isLoading={accountAttributionQuery.isLoading}
          />
      </WorkspacePage>
    </>
  );
}
