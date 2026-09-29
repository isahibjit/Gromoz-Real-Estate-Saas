import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  LifeBuoy,
  Mail,
  MoreVertical,
  Phone,
  Search,
  Settings,
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
  StatsRow as SharedStatsRow,
  type LeadStatsRowItem,
} from "../components/StatsRow";
import {
  recoverableLeads,
  recoveryActionPerformance,
  recoveryActions,
  recoveryChannels,
  recoveryFunnelStages,
  recoveryInsights,
  recoveryOverviewMetrics,
  recoveryStats,
  recoveryTabs,
  recoveryTrend,
} from "./leadRecoveryData";

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
          className="mt-4 h-10 w-full rounded-md bg-primary text-sm font-bold text-white hover:bg-primary/90"
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
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

function RecoveryFunnelCard() {
  return (
    <Panel title="Recovery Funnel">
      <div className="grid gap-5 md:grid-cols-[1.2fr_0.9fr] md:items-center">
        <div className="space-y-3">
          {recoveryFunnelStages.map((stage) => (
            <div
              key={stage.label}
              className="mx-auto h-12 rounded-md shadow-sm"
              style={{ width: stage.width, backgroundColor: stage.color }}
            />
          ))}
        </div>
        <div className="space-y-5">
          {recoveryFunnelStages.map((stage) => (
            <div key={stage.label} className="border-l border-slate-200 pl-4">
              <p className="text-xs font-extrabold text-secondary">
                {stage.label}
              </p>
              <p className="text-sm font-extrabold text-blue-900">
                {stage.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function TrendLine({ values, color }: { values: number[]; color: string }) {
  const points = values
    .map((value, index) => `${52 + index * 58},${210 - value}`)
    .join(" ");
  return (
    <polyline
      points={points}
      fill="none"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

function RecoveryTrendCard() {
  return (
    <Panel
      title="Recovery Trend"
      action={
        <Select defaultValue="7">
          <SelectTrigger className="h-8 w-[105px] rounded-md text-xs font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 Days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="mb-3 flex flex-wrap justify-center gap-5 text-xs font-semibold text-secondary">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
          Re-engaged Leads
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-success" />
          Hot Leads
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-700" />
          Recovered
        </span>
      </div>
      <svg viewBox="0 0 440 260" className="h-[260px] w-full">
        {[40, 90, 140, 190].map((y) => (
          <line
            key={y}
            x1="40"
            x2="415"
            y1={220 - y}
            y2={220 - y}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        ))}
        <TrendLine
          values={recoveryTrend.map((point) => point.replied)}
          color="#2563eb"
        />
        <TrendLine
          values={recoveryTrend.map((point) => point.hot)}
          color="#16a34a"
        />
        <TrendLine
          values={recoveryTrend.map((point) => point.converted)}
          color="#7c3aed"
        />
        {recoveryTrend.map((point, index) => (
          <g key={point.label}>
            <circle
              cx={52 + index * 58}
              cy={210 - point.replied}
              r="5"
              fill="#2563eb"
            />
            <circle
              cx={52 + index * 58}
              cy={210 - point.hot}
              r="5"
              fill="#16a34a"
            />
            <circle
              cx={52 + index * 58}
              cy={210 - point.converted}
              r="5"
              fill="#7c3aed"
            />
            <text
              x={52 + index * 58}
              y="246"
              textAnchor="middle"
              className="fill-secondary text-[11px] font-bold"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </Panel>
  );
}

function RecoveryActionsCard() {
  return (
    <Panel
      title="Top Recovery Opportunities"
      action={
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-md px-3 text-xs font-extrabold shadow-none"
        >
          {recoveryActions.actionCta}
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Action Name",
                "Leads Worked",
                "Re-engaged",
                "Recovered",
                "Efficiency",
              ].map((head) => (
                <TableHead
                  key={head}
                  className="h-10 whitespace-nowrap text-xs font-extrabold text-secondary"
                >
                  {head}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {recoveryActionPerformance.map((action) => (
              <TableRow key={action.name}>
                <TableCell className="min-w-[220px] py-3 text-xs font-extrabold text-secondary">
                  {action.name}
                </TableCell>
                <TableCell className="py-3 text-xs font-semibold text-secondary">
                  {action.leadsWorked}
                </TableCell>
                <TableCell className="py-3 text-xs font-semibold text-secondary">
                  {action.reengaged}
                </TableCell>
                <TableCell className="py-3 text-xs font-semibold text-secondary">
                  {action.recovered}
                </TableCell>
                <TableCell className="py-3 text-xs font-extrabold text-success">
                  {action.efficiency}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Panel>
  );
}

function RecoverableLeadsCard({
  activeTab,
  onTabChange,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const rows = activeTab === "Recoverable Leads" ? recoverableLeads : [];

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 p-4">
        <div className="flex gap-6 overflow-x-auto pb-1">
          {recoveryTabs.map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                className={cn(
                  "whitespace-nowrap border-b-2 pb-3 text-sm font-extrabold",
                  selected
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-secondary hover:text-blue-700",
                )}
                onClick={() => onTabChange(tab)}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(180px,1fr)_repeat(5,140px)_44px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-xs font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
              placeholder="Search leads..."
            />
          </div>
          {[
            "Inactive For",
            "Lead Source",
            "Stage",
            "Owner",
            "Newest First",
          ].map((item) => (
            <Select key={item} defaultValue={item}>
              <SelectTrigger className="h-10 rounded-md text-xs font-bold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={item}>{item}</SelectItem>
              </SelectContent>
            </Select>
          ))}
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-md shadow-none"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {[
                "Lead",
                "Source",
                "Inactive For",
                "Last Contacted",
                "Reason",
                "Lead Score",
                "Suggested Action",
                "Action",
              ].map((head) => (
                <TableHead
                  key={head}
                  className="h-10 whitespace-nowrap px-4 text-xs font-extrabold text-secondary"
                >
                  {head}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="min-w-[210px] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">
                      {lead.initials}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-secondary">
                        {lead.name}
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        {lead.mobile}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge
                    className={cn(
                      "border-0 text-[10px] font-extrabold",
                      lead.sourceTone,
                    )}
                  >
                    {lead.source}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {lead.inactiveFor}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-semibold text-secondary">
                  {lead.lastContacted}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-semibold text-secondary">
                  {lead.reason}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full border text-xs font-extrabold",
                      lead.aiScore >= 80
                        ? "border-success text-success"
                        : "border-primary text-primary",
                    )}
                  >
                    {lead.aiScore}
                  </span>
                </TableCell>
                <TableCell className="min-w-[170px] px-4 py-3 text-xs font-semibold text-secondary">
                  {lead.suggestedAction}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md bg-green-50 text-success"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md bg-blue-50 text-blue-700"
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md bg-violet-50 text-violet-700"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md text-blue-700"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground"
                >
                  No records available for {activeTab} yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          Showing 1 to {rows.length || 0} of 2,843 leads
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {["1", "2", "3", "4"].map((page) => (
            <Button
              key={page}
              type="button"
              variant={page === "1" ? "navy" : "outline"}
              className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
            >
              {page}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
          >
            ...
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-12 rounded-md p-0 text-xs shadow-none"
          >
            475
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
          <SelectTrigger className="h-8 w-[120px] rounded-md text-xs font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Rows 10</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

function RightRail() {
  return (
    <aside className="space-y-5">
      <Panel
        title="Recovery Action Performance"
        action={
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-md px-3 text-xs font-extrabold shadow-none"
          >
            This Week
          </Button>
        }
      >
        <div className="space-y-4">
          {recoveryChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.label}
                className="grid grid-cols-[95px_minmax(0,1fr)_42px_42px] items-center gap-3 text-xs"
              >
                <span className="flex items-center gap-2 font-extrabold text-secondary">
                  <Icon className="h-4 w-4" style={{ color: channel.color }} />
                  {channel.label}
                </span>
                <span className="h-2 rounded-full bg-slate-100">
                  <span
                    className="block h-2 rounded-full"
                    style={{
                      width: `${Math.min(channel.replies / 2, 100)}%`,
                      backgroundColor: channel.color,
                    }}
                  />
                </span>
                <span className="font-semibold text-secondary">
                  {channel.replies}
                </span>
                <span className="font-semibold text-secondary">
                  {channel.success}
                </span>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="Recovery Overview"
        action={
          <Button
            type="button"
            variant="outline"
            className="h-8 rounded-md px-3 text-xs font-extrabold shadow-none"
          >
            {recoveryActions.overviewCta}
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          {recoveryOverviewMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className="rounded-md border border-slate-100 p-3"
              >
                <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Icon className="h-4 w-4 text-blue-700" />
                  {metric.label}
                </p>
                <p className="mt-2 text-sm font-extrabold text-secondary">
                  {metric.value}
                </p>
              </div>
            );
          })}
        </div>
      </Panel>
    </aside>
  );
}

export function LeadRecoveryScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(recoveryTabs[0]);
  const stats = useMemo<LeadStatsRowItem[]>(
    () =>
      recoveryStats.map((stat) => ({
        label: stat.label,
        value: String(stat.value),
        change: stat.change ?? "",
        helper: stat.helper ?? "",
        icon: stat.icon,
        tone: stat.tone,
      })),
    [],
  );

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        activeItem="Lead Management"
        activeChild="Lead Recovery"
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
              <span className="text-foreground">Lead Recovery Center</span>
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
            <Select defaultValue="date">
              <SelectTrigger
                aria-label="Date range"
                className="h-10 w-[200px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <CalendarDays className="h-4 w-4 text-info mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">May 20 - May 26, 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DashboardHeader>
        <main className="space-y-5 p-4 sm:p-6">
          <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold text-secondary">
                  Lead Recovery Center
                </h1>
                <Info className="h-4 w-4 text-blue-700" />
              </div>
              <p className="mt-2 text-sm font-semibold text-blue-900">
                Identify recoverable leads, prioritize next actions, and
                re-engage inactive opportunities.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-5 text-xs font-extrabold shadow-none"
              >
                <Settings className="h-4 w-4" />
                {recoveryActions.settings}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-5 text-xs font-extrabold shadow-none"
              >
                <Filter className="h-4 w-4" />
                {recoveryActions.filters}
              </Button>
              <Button
                type="button"
                className="h-10 rounded-md bg-violet-700 px-6 text-xs font-extrabold text-white hover:bg-violet-800"
              >
                {recoveryActions.startRecovery}
              </Button>
            </div>
          </section>
          <SharedStatsRow stats={stats} />
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.32fr_1.4fr]">
            <RecoveryFunnelCard />
            <RecoveryTrendCard />
            <RecoveryActionsCard />
          </section>
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <RecoverableLeadsCard
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            <RightRail />
          </section>
        </main>
      </div>
    </div>
  );
}
