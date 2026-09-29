import type { LucideIcon } from "lucide-react";

export type ColdLeadBucket =
  | "all"
  | "7-days"
  | "15-days"
  | "30-days"
  | "60-days";
export type ColdLeadPotential = "High" | "Good" | "Medium" | "Low";
export type ColdLeadActionType = "whatsapp" | "call" | "email";

export interface ColdLeadStat {
  label: string;
  value: string;
  helper: string;
  change?: string;
  changeTone?: "up" | "down";
  icon: LucideIcon;
  tone: string;
}

export interface TrendPoint {
  date: string;
  leads: number;
}

export interface DistributionSegment {
  label: string;
  value: number;
  percent: string;
  color: string;
}

export interface ColdLeadRow {
  id: string;
  name: string;
  initials: string;
  avatarTone: string;
  requirement: string;
  source: string;
  lastContactDate: string;
  lastContactTime: string;
  lastContactIcon: LucideIcon;
  inactivityDays: number;
  bucket: Exclude<ColdLeadBucket, "all">;
  aiScore: number;
  potential: ColdLeadPotential;
  potentialValue: string;
  lastActivity: string;
  lastActivityDate: string;
  nextAction: string;
  nextActionType: ColdLeadActionType;
  owner: string;
  ownerName?: string;
  telecallerName?: string;
  fieldExecutiveName?: string;
  ownerAvatarUrl?: string;
}

export interface CampaignMetric {
  label: string;
  value: string;
  change: string;
}

export interface RecommendationItem {
  title: string;
  helper: string;
  actionLabel: string;
  icon: LucideIcon;
  tone: string;
}

export interface ReactivationTool {
  title: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}

export interface SummaryRow {
  label: string;
  value: string;
}
