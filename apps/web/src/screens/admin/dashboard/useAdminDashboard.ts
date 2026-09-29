import { useQuery } from "@tanstack/react-query";

import { api } from "../../../common/api";

export type AdminDashboardRange = "today" | "week" | "month";

export interface AdminDashboardData {
  meta: {
    range: AdminDashboardRange;
    label: string;
    dateFrom: string;
    dateTo: string;
  };
  kpi: {
    totalLeads: number;
    followUpsDueToday: number;
    overdueFollowUps: number;
    siteVisitsPendingToday: number;
    siteVisitsCompletedToday: number;
    bookingsDoneToday: number;
    teamsNeedingAttention: number;
  };
  metricCards: Array<{
    id: string;
    label: string;
    value: number;
    helper: string;
    change: string;
    direction: "up" | "down" | "neutral";
  }>;
  sourceDistribution: Array<{
    name: string;
    value: number;
    percent: string;
    color: string;
  }>;
  conversionFunnel: Array<{
    stage: string;
    value: string;
    percent: string;
    width: string;
    color: string;
  }>;
  teamPerformance: Array<{
    id: string;
    name: string;
    leaderName: string;
    telecallerCount: number;
    fieldExecutiveCount: number;
    assignedLeads: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
    todaySiteVisitsScheduled: number;
    todaySiteVisitsCompleted: number;
    followUpsDone: number;
    conversionRate: string;
    health: "On Track" | "Attention" | "Critical";
    completionRate: string;
  }>;
  pendingFollowUps: Array<{
    id: string;
    leadId: string;
    leadName: string;
    leadDisplayId: string;
    assignedToId: string | null;
    assignedToName: string;
    assignedToImage?: string;
    assignedToRole: string;
    scheduledAt: string;
    dueLabel: string;
    nextAction: string;
    isOverdue: boolean;
  }>;
  todaySiteVisits: Array<{
    id: string;
    displayId?: string | null;
    leadId: string;
    leadName: string;
    leadDisplayId: string;
    projectName: string;
    scheduledAt: string;
    scheduledLabel: string;
    status: string;
    checkedInAt?: string | null;
    checkedOutAt?: string | null;
    assignedExecutiveId: string | null;
    assignedExecutiveName: string;
    assignedExecutiveImage?: string | null;
  }>;
  todayAgenda: Array<{
    id: string;
    time: string;
    title: string;
    subtitle: string;
    type: "Site visit" | "Follow-up";
    statusLabel: string;
    statusTone: "success" | "info" | "warning" | "danger";
    assigneeName: string;
    assigneeImage?: string;
  }>;
  upcomingSiteVisits: Array<{
    id: string;
    displayId: string;
    projectName: string;
    projectImage: string | null;
    leadName: string;
    scheduledAt: string;
    scheduledLabel: string;
    status: string;
    assigneeName: string;
    assigneeImage?: string;
  }>;
  reminders: Array<{
    id: string;
    title: string;
    leadName: string;
    scheduledAt: string;
    scheduledLabel: string;
    assigneeName: string;
    assigneeImage?: string;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    subtitle: string;
    occurredAt: string;
    occurredLabel: string;
    type: string;
  }>;
  conversionTrend: {
    summaryRate: string;
    summaryChange: string;
    currentWeek: Array<{
      label: string;
      rate: number;
    }>;
    previousWeek: Array<{
      label: string;
      rate: number;
    }>;
  };
  visitExecutionSummary: {
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  teamHealthSummary: {
    topTeamName: string;
    topTeamRate: string;
    attentionTeamName: string;
    totalTeams: number;
  };
  alerts: Array<{
    title: string;
    subtitle: string;
    time: string;
    tone: string;
  }>;
}

export const useAdminDashboard = (range: AdminDashboardRange) => {
  return useQuery<AdminDashboardData>({
    queryKey: ["dashboard", "admin", range],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/admin", {
        params: { range },
      });
      return data;
    },
  });
};
