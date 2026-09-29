import {
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  Target,
  UsersRound,
} from "lucide-react";

import type {
  BenchmarkData,
  ForecastData,
  FunnelStage,
  KPICardData,
  ProjectConversion,
  ScoreConversionBucket,
  SourceConversion,
  TeamPerformanceRow,
  TimeAnalysisData,
  TrendDataPoint,
} from "./conversionAnalyticsTypes";

export const kpiStats: KPICardData[] = [
  {
    label: "Total Leads",
    value: "12,458",
    change: "14.3%",
    changeTone: "up",
    helper: "vs Apr 20 - Apr 26",
    icon: UsersRound,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Converted Leads",
    value: "1,276",
    change: "16.8%",
    changeTone: "up",
    helper: "vs Apr 20 - Apr 26",
    icon: CheckCircle2,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    label: "Conversion Rate",
    value: "10.24%",
    change: "2.1%",
    changeTone: "up",
    helper: "vs Apr 20 - Apr 26",
    icon: Target,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Booking Value",
    value: "₹ 6.42 Cr",
    change: "18.7%",
    changeTone: "up",
    helper: "vs Apr 20 - Apr 26",
    icon: Coins,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    label: "Revenue Generated",
    value: "₹ 3.21 Cr",
    change: "19.4%",
    changeTone: "up",
    helper: "vs Apr 20 - Apr 26",
    icon: Banknote,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    label: "Avg. Lead to Booking Time",
    value: "18.6 Days",
    change: "4.7%",
    changeTone: "down",
    helper: "vs Apr 20 - Apr 26",
    icon: Clock,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
];

export const funnelStages: FunnelStage[] = [
  {
    label: "Total Leads",
    count: "12,458",
    percentage: "(100%)",
    conversionPct: "",
    color: "#2563eb",
  },
  {
    label: "New Leads",
    count: "8,632",
    percentage: "(69.3%)",
    conversionPct: "69.3%",
    color: "#0284c7",
  },
  {
    label: "Interested",
    count: "3,487",
    percentage: "(28.0%)",
    conversionPct: "40.4%",
    color: "#f97316",
  },
  {
    label: "Site Visit Done",
    count: "1,812",
    percentage: "(14.6%)",
    conversionPct: "51.9%",
    color: "#ef4444",
  },
  {
    label: "Re-Visit Done",
    count: "1,420",
    percentage: "(11.4%)",
    conversionPct: "78.4%",
    color: "#8b5cf6",
  },
  {
    label: "Booking Done",
    count: "1,276",
    percentage: "(10.2%)",
    conversionPct: "89.8%",
    color: "#16a34a",
  },
];

export const trendData: TrendDataPoint[] = [
  { period: "Mar 31 - Apr 6", leads: 1300, converted: 500, conversionRate: 10 },
  { period: "Apr 7 - Apr 13", leads: 1100, converted: 400, conversionRate: 10 },
  {
    period: "Apr 14 - Apr 20",
    leads: 2000,
    converted: 900,
    conversionRate: 11,
  },
  {
    period: "Apr 21 - Apr 27",
    leads: 1400,
    converted: 700,
    conversionRate: 10.5,
  },
  { period: "Apr 28 - May 4", leads: 1800, converted: 800, conversionRate: 13 },
  { period: "May 5 - May 11", leads: 1600, converted: 750, conversionRate: 14 },
  {
    period: "May 12 - May 18",
    leads: 1550,
    converted: 700,
    conversionRate: 11,
  },
  {
    period: "May 19 - May 26",
    leads: 1950,
    converted: 950,
    conversionRate: 13,
  },
];

export const sourceConversions: SourceConversion[] = [
  {
    source: "MagicBricks",
    converted: 428,
    percentage: "33.5%",
    color: "#2563eb",
  },
  { source: "99Acres", converted: 312, percentage: "24.5%", color: "#10b981" },
  {
    source: "Google Ads",
    converted: 198,
    percentage: "15.5%",
    color: "#ef4444",
  },
  { source: "Website", converted: 136, percentage: "10.7%", color: "#8b5cf6" },
  { source: "Referral", converted: 92, percentage: "7.2%", color: "#0ea5e9" },
  { source: "Justdial", converted: 61, percentage: "4.8%", color: "#f59e0b" },
  { source: "Others", converted: 49, percentage: "3.8%", color: "#94a3b8" },
];

export const teamPerformanceRows: TeamPerformanceRow[] = [
  {
    id: "1",
    name: "Vikram Singh",
    role: "Team Leader",
    avatarSeed: "Vikram Singh",
    totalLeads: "1,256",
    contacted: "876",
    interested: "412",
    siteVisits: "235",
    bookings: "156",
    conversionRate: "12.42%",
    bookingValue: "₹ 78.45 L",
    revenue: "₹ 39.22 L",
    isHighConversion: true,
  },
  {
    id: "2",
    name: "Neha Kapoor",
    role: "Senior Executive",
    avatarSeed: "Neha Kapoor",
    totalLeads: "1,132",
    contacted: "798",
    interested: "354",
    siteVisits: "198",
    bookings: "124",
    conversionRate: "10.95%",
    bookingValue: "₹ 61.30 L",
    revenue: "₹ 30.65 L",
    isHighConversion: true,
  },
  {
    id: "3",
    name: "Rahul Sharma",
    role: "Executive",
    avatarSeed: "Rahul Sharma",
    totalLeads: "1,087",
    contacted: "754",
    interested: "312",
    siteVisits: "176",
    bookings: "108",
    conversionRate: "9.93%",
    bookingValue: "₹ 54.10 L",
    revenue: "₹ 27.05 L",
    isHighConversion: false,
  },
  {
    id: "4",
    name: "Priya Gupta",
    role: "Executive",
    avatarSeed: "Priya Gupta",
    totalLeads: "982",
    contacted: "692",
    interested: "286",
    siteVisits: "154",
    bookings: "96",
    conversionRate: "9.78%",
    bookingValue: "₹ 48.20 L",
    revenue: "₹ 24.10 L",
    isHighConversion: false,
  },
  {
    id: "5",
    name: "Amit Patel",
    role: "Executive",
    avatarSeed: "Amit Patel",
    totalLeads: "874",
    contacted: "608",
    interested: "228",
    siteVisits: "126",
    bookings: "82",
    conversionRate: "9.38%",
    bookingValue: "₹ 40.80 L",
    revenue: "₹ 20.40 L",
    isHighConversion: false,
  },
];

export const teamTotals = {
  totalLeads: "5,331",
  contacted: "3,728",
  interested: "1,592",
  siteVisits: "889",
  bookings: "566",
  conversionRate: "10.62%",
  bookingValue: "₹ 2.83 Cr",
  revenue: "₹ 1.41 Cr",
};

export const projectConversions: ProjectConversion[] = [
  {
    project: "Trueroot Heights",
    bookings: 326,
    percentage: "25.6%",
    color: "#6366f1",
  },
  {
    project: "Trueroot Residency",
    bookings: 258,
    percentage: "20.2%",
    color: "#6366f1",
  },
  {
    project: "Trueroot Metro",
    bookings: 198,
    percentage: "15.5%",
    color: "#6366f1",
  },
  {
    project: "Trueroot Premium",
    bookings: 176,
    percentage: "13.8%",
    color: "#6366f1",
  },
  {
    project: "Trueroot Downtown",
    bookings: 118,
    percentage: "9.2%",
    color: "#6366f1",
  },
  { project: "Others", bookings: 200, percentage: "15.7%", color: "#6366f1" },
];

export const timeAnalysis: TimeAnalysisData = {
  bestPerformer: { name: "Vikram Singh", time: "14.2 Days" },
  average: { name: "All Teams", time: "18.6 Days" },
  needsImprovement: { name: "Amit Patel", time: "24.8 Days" },
};

export const scoreConversionBuckets: ScoreConversionBucket[] = [
  {
    range: "81 - 100",
    percentage: "28.4%",
    leads: "364 Leads",
    toneClass: "text-emerald-500",
  },
  {
    range: "61 - 80",
    percentage: "19.7%",
    leads: "252 Leads",
    toneClass: "text-green-500",
  },
  {
    range: "41 - 60",
    percentage: "9.6%",
    leads: "123 Leads",
    toneClass: "text-lime-500",
  },
  {
    range: "0 - 40",
    percentage: "2.3%",
    leads: "29 Leads",
    toneClass: "text-yellow-500",
  },
];

export const forecastData: ForecastData = {
  expectedBookings: "620 - 680",
  expectedRevenue: "₹ 3.4 - 3.8 Cr",
  confidenceScore: "82%",
};

export const benchmarkData: BenchmarkData = {
  yourRate: "10.24%",
  industryAvg: "7.18%",
  topPerformers: "12.60%",
};
