import { useState } from "react";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { Button, cn } from "ui";

import { useDashboardLayout } from "../../admin/dashboard/DashboardLayoutContext";
import { useAppSelector } from "../../../store";
import { DashboardAttendanceCard } from "../../hr/components/DashboardAttendanceCard";
import { PerformanceRankingCard } from "../../../common/dashboard/PerformanceRankingCard";
import { telecallerSidebarItems } from "./telecallerDashboardData";
import {
  TelecallerCallingTrendChart,
  TelecallerConversionFunnel,
  TelecallerKpiGrid,
  TelecallerLeadDistribution,
  TelecallerPerformance,
  TelecallerQuickActions,
  TelecallerRightPanel,
  TelecallerSlaActionCards,
} from "./TelecallerDashboardSections";
import { useTelecallerDashboard } from "./useTelecallerDashboard";

export function TelecallerDashboardScreen() {
  const user = useAppSelector((state) => state.auth.user);

  const { data, isLoading, error } = useTelecallerDashboard();
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "long",
  });

  useDashboardLayout({
    sidebar: {
      sidebarItems: telecallerSidebarItems,
      activeItem: "Dashboard",
    },
    header: {
      breadcrumbs: (
        <div className="flex items-center gap-2">
          <span className="text-primary cursor-pointer hover:underline">
            Dashboard
          </span>
          <span className="text-muted-foreground">&gt;</span>
          <span className="text-foreground">Pre Sales Executive Dashboard</span>
        </div>
      ),
    },
  }, []);

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

  return (
    <>
        <main className="crm-main-scrollbar flex-1 overflow-x-hidden p-4">
          <div className="w-full">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              {/* Left Column - Main Content */}
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h1 className="flex items-center gap-2 text-2xl font-extrabold text-secondary">
                      Pre Sales Executive Dashboard
                    </h1>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      Welcome back, {user?.fullName ?? "Pre Sales Executive"}. Here&apos;s
                      your today&apos;s overview.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 items-center gap-2 rounded-md border bg-white px-3 text-sm font-semibold text-muted-foreground shadow-sm">
                      <span>{todayLabel}</span>
                      <CalendarIcon className="size-4" />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-10 bg-white shadow-sm"
                    >
                      <RefreshCcw className="size-4" />
                    </Button>
                  </div>
                </div>

                <DashboardAttendanceCard />
                <TelecallerKpiGrid kpi={data.kpi} />
                <TelecallerPerformance data={data.performance} />
                <PerformanceRankingCard />
                <TelecallerSlaActionCards />

                <div className="grid gap-6 lg:grid-cols-3">
                  <TelecallerCallingTrendChart data={data.callingTrend} />
                  <TelecallerLeadDistribution data={data.leadDistribution} />
                  <TelecallerConversionFunnel data={data.conversionFunnel} />
                </div>

              </div>

              {/* Right Column - Side Panels */}
              <aside className="space-y-6">
                <TelecallerRightPanel data={data} />
              </aside>
            </div>
          </div>
        </main>
    </>
  );
}
