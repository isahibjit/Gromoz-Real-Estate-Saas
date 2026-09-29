import { LucideIcon } from "lucide-react";

export interface KPICardData {
  label: string;
  value: string;
  change: string;
  changeTone: "up" | "down";
  helper: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export interface FunnelStage {
  label: string;
  count: string;
  percentage: string;
  conversionPct: string;
  color: string;
}

export interface TrendDataPoint {
  period: string;
  leads: number;
  converted: number;
  conversionRate: number;
}

export interface SourceConversion {
  source: string;
  converted: number;
  percentage: string;
  color: string;
}

export interface TeamPerformanceRow {
  id: string;
  name: string;
  role: string;
  avatarSeed: string;
  totalLeads: string;
  contacted: string;
  interested: string;
  siteVisits: string;
  bookings: string;
  conversionRate: string;
  bookingValue: string;
  revenue: string;
  isHighConversion?: boolean;
}

export interface ProjectConversion {
  project: string;
  bookings: number;
  percentage: string;
  color: string;
}

export interface TimeAnalysisData {
  bestPerformer: { name: string; time: string };
  average: { name: string; time: string };
  needsImprovement: { name: string; time: string };
}

export interface ScoreConversionBucket {
  range: string;
  percentage: string;
  leads: string;
  toneClass: string;
}

export interface ForecastData {
  expectedBookings: string;
  expectedRevenue: string;
  confidenceScore: string;
}

export interface BenchmarkData {
  yourRate: string;
  industryAvg: string;
  topPerformers: string;
}
