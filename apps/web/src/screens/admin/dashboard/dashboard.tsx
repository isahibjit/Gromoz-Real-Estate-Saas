import { useState } from "react";
import { AlertCircle, ChevronRight, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";
import { Navigate } from "react-router-dom";

import {
  AlertsPanel,
  ConversionTrendPanel,
  DashboardMetricCards,
  DashboardQuickActions,
  LeadFunnelChart,
  LeadsBySourceChart,
  LiveExecutiveTrackingPanel,
  PendingFollowUpsPanel,
  RecentActivityPanel,
  RemindersPanel,
  TeamPerformancePanel,
  TodayAgendaPanel,
  UpcomingSiteVisitsPanel,
} from "./DashboardSections";
import { useDashboardLayout } from "./DashboardLayoutContext";
import {
  type AdminDashboardRange,
  useAdminDashboard,
} from "./useAdminDashboard";
import { useAppSelector } from "../../../store";
import { useLiveFieldExecutiveLocations } from "../../field-executive/useFieldExecutive";
import { PerformanceRankingCard } from "../../../common/dashboard/PerformanceRankingCard";
import { WorkspacePage } from "../../../components/layout/PageHeader";

const rangeOptions: Array<{ value: AdminDashboardRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

export function DashboardScreen() {
  const user = useAppSelector((state) => state.auth.user);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<AdminDashboardRange>("today");
  const { data, isLoading, error } = useAdminDashboard(range);
  const { data: liveTrackingData } = useLiveFieldExecutiveLocations(
    user?.role === "ADMIN" ||
      user?.role === "SUPER_ADMIN" ||
      user?.role === "SALES_MANAGER",
  );

  useDashboardLayout(
    {
      sidebar: {
        activeItem: "Dashboard",
        activeChild: undefined,
      },
      header: {
        search,
        onSearchChange: setSearch,
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="cursor-pointer text-secondary hover:underline">
              Home
            </span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Dashboard</span>
          </div>
        ),
      },
    },
    [search],
  );

  if (user?.role === "TELECALLER") {
    return <Navigate to="/telecaller/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="size-5" />
          <span className="font-semibold">Failed to load dashboard data</span>
        </div>
      </div>
    );
  }

  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (...values: Array<string | undefined | null>) =>
    !normalizedSearch ||
    values.some((value) => value?.toLowerCase().includes(normalizedSearch));

  const filteredTeamPerformance = data.teamPerformance.filter((row: any) =>
    matchesSearch(row.name, row.leaderName, row.health),
  );
  const filteredPendingFollowUps = data.pendingFollowUps.filter((row: any) =>
    matchesSearch(
      row.leadName,
      row.leadDisplayId,
      row.assignedToName,
      row.assignedToRole,
      row.nextAction,
    ),
  );
  const filteredAgenda = data.todayAgenda.filter((row: any) =>
    matchesSearch(
      row.title,
      row.subtitle,
      row.assigneeName,
      row.type,
      row.statusLabel,
    ),
  );
  const filteredUpcomingSiteVisits = data.upcomingSiteVisits.filter(
    (row: any) =>
      matchesSearch(
        row.projectName,
        row.leadName,
        row.assigneeName,
        row.status,
      ),
  );
  const filteredReminders = data.reminders.filter((row: any) =>
    matchesSearch(row.title, row.leadName, row.assigneeName),
  );
  const filteredRecentActivity = data.recentActivity.filter((row: any) =>
    matchesSearch(row.title, row.subtitle, row.type),
  );
  const filteredAlerts = data.alerts.filter((row: any) =>
    matchesSearch(row.title, row.subtitle, row.time),
  );
  const filteredLiveTrackingRows = (liveTrackingData?.rows ?? []).filter(
    (row) =>
      matchesSearch(
        row.name,
        row.role,
        row.activeVisit?.leadName,
        row.activeVisit?.projectName,
        row.nextVisit?.leadName,
        row.nextVisit?.projectName,
      ),
  );

  return (
    <>
      <WorkspacePage className="admin-dashboard min-w-0 pb-24 sm:pb-24">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_180px] xl:items-end">
          <DashboardQuickActions />
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-500">Timeframe</span>
            <Select
              value={range}
              onValueChange={(value) => setRange(value as AdminDashboardRange)}
            >
              <SelectTrigger
                aria-label="Timeframe"
                className="h-10 rounded-xl border-slate-200 bg-white text-sm font-semibold shadow-none"
              >
                <SelectValue placeholder="Select timeframe" />
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
        </section>

        <section aria-label="Operational key performance indicators">
          <DashboardMetricCards rows={data.metricCards} />
        </section>

        <section aria-label="Performance rankings">
          <PerformanceRankingCard />
        </section>

        <section
          aria-label="Live field execution and urgent queues"
          className="dashboard-execution-grid grid min-w-0 items-start gap-5"
        >
          <LiveExecutiveTrackingPanel rows={filteredLiveTrackingRows} />
          <PendingFollowUpsPanel rows={filteredPendingFollowUps} />
        </section>

        <section
          aria-label="Today agenda and conversion outlook"
          className="dashboard-detail-grid grid min-w-0 items-start gap-5"
        >
          <TodayAgendaPanel rows={filteredAgenda} />
          <ConversionTrendPanel data={data.conversionTrend} />
          <UpcomingSiteVisitsPanel rows={filteredUpcomingSiteVisits} />
        </section>

        <section
          aria-label="Team operations and reminders"
          className="dashboard-detail-grid grid min-w-0 items-start gap-5"
        >
          <TeamPerformancePanel rows={filteredTeamPerformance} />
          <AlertsPanel rows={filteredAlerts} />
          <RemindersPanel rows={filteredReminders} />
        </section>

        <section
          aria-label="Operational analytics and activity"
          className="dashboard-detail-grid grid min-w-0 items-start gap-5"
        >
          <LeadsBySourceChart data={data.sourceDistribution} />
          <LeadFunnelChart data={data.conversionFunnel} />
          <RecentActivityPanel rows={filteredRecentActivity} />
        </section>
      </WorkspacePage>

      <footer className="flex flex-col gap-1 border-t bg-white px-6 py-3 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>© 2025 Trueroot Realty CRM. All rights reserved.</span>
        <span>Version 2.0.0</span>
      </footer>
    </>
  );
}
