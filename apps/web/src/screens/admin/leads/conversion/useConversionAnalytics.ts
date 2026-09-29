import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../common/api";

export type ConversionAnalyticsRange =
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "8weeks";

export type ConversionAnalyticsFilters = {
  search: string;
  range: ConversionAnalyticsRange;
  from?: string;
  to?: string;
};

export type ConversionAnalyticsResponse = {
  filters: {
    branches: string[];
  };
  overview: {
    totalLeads: { value: number; change: number; helper: string };
    convertedLeads: { value: number; change: number; helper: string };
    conversionRate: { value: number; change: number; helper: string };
    bookingValue: { value: number; change: number; helper: string };
    revenueGenerated: { value: number; change: number; helper: string };
    avgLeadToBookingDays: { value: number; change: number; helper: string };
  };
  funnelStages: Array<{
    label: string;
    count: number;
    percentage: number;
    conversionPct: number | null;
    color: string;
  }>;
  trend: Array<{
    period: string;
    leads: number;
    converted: number;
    conversionRate: number;
  }>;
  sourceConversions: Array<{
    source: string;
    converted: number;
    percentage: number;
    color: string;
  }>;
  teamPerformanceRows: Array<{
    id: string;
    name: string;
    role: string;
    image?: string | null;
    totalLeads: number;
    contacted: number;
    interested: number;
    siteVisits: number;
    bookings: number;
    conversionRate: number;
    bookingValue: number;
    revenue: number;
    avgLeadToBookingDays: number;
  }>;
  teamTotals: {
    totalLeads: number;
    contacted: number;
    interested: number;
    siteVisits: number;
    bookings: number;
    bookingValue: number;
    revenue: number;
    conversionRate: number;
  };
  branchPerformance: Array<{
    branch: string;
    totalLeads: number;
    bookings: number;
    bookingValue: number;
    conversionRate: number;
  }>;
  projectConversions: Array<{
    project: string;
    bookings: number;
    percentage: number;
    color: string;
  }>;
  timeAnalysis: {
    bestPerformer: { name: string; time: number };
    average: { name: string; time: number };
    needsImprovement: { name: string; time: number };
  };
  scoreConversionBuckets: Array<{
    range: string;
    percentage: number;
    leads: number;
    toneClass: string;
  }>;
  forecast: {
    expectedBookingsMin: number;
    expectedBookingsMax: number;
    expectedRevenueMin: number;
    expectedRevenueMax: number;
    confidenceScore: number;
  };
  benchmark: {
    yourRate: number;
    industryAvg: number;
    topPerformers: number;
  };
  range: {
    from: string;
    to: string;
    range: ConversionAnalyticsRange;
  };
};

const compactFilters = (filters: ConversionAnalyticsFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value && value !== "all"),
  );

export function useConversionAnalytics(filters: ConversionAnalyticsFilters) {
  return useQuery<ConversionAnalyticsResponse>({
    queryKey: ["reports", "conversion-analytics", filters],
    queryFn: async () => {
      const { data } = await api.get("/reports/conversion-analytics", {
        params: compactFilters(filters),
      });
      return data;
    },
  });
}
