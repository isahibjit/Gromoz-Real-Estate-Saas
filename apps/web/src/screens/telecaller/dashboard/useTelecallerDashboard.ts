import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { api } from "../../../common/api";

export interface TelecallerDashboardData {
  kpi: {
    totalAssignedLeads: number;
    newLeads: { value: number; badge: string };
    todaysFollowUps: { value: number; badge: string };
    missedFollowUps: { value: number; badge: string };
    hotLeads: number;
    coldLeads: number;
    interestedLeads: number;
    notInterestedLeads: number;
    siteVisitScheduled: number;
    bookingsDone?: { value: number; badge: string };
    convertedLeads: { value: number; badge: string };
  };
  performance: {
    callsMade: number;
    callsConnected: number;
    callsNotAnswered: number;
    followUpsCreated: number;
    siteVisitsGenerated: number;
    conversionRate: string;
  };
  callingTrend: { time: string; count: number }[];
  leadDistribution: {
    name: string;
    value: number;
    percent: string;
    color: string;
  }[];
  conversionFunnel: {
    stage: string;
    value: number;
    width: string;
    color: string;
  }[];
  tasks: { label: string; count: number; icon: string }[];
  upcomingFollowUps: {
    id: string;
    leadId: string | null;
    name: string;
    time: string;
    project: string;
  }[];
  recentActivities: {
    title: string;
    subtext: string;
    time: string;
    icon: string;
  }[];
  activeReminders: {
    id: string;
    leadId: string | null;
    name: string;
    time: string;
    project: string;
  }[];
  recommendations: string[];
}

export const useTelecallerDashboard = (): UseQueryResult<TelecallerDashboardData, Error> => {
  return useQuery<TelecallerDashboardData>({
    queryKey: ["dashboard", "telecaller"],
    queryFn: async () => {
      const { data } = await api.get("/dashboard/telecaller");
      return data;
    },
  });
};
