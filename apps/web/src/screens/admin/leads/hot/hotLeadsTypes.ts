import type { LucideIcon } from "lucide-react";

export interface HotLeadStat {
  label: string;
  value: string;
  helper: string;
  change?: string;
  icon: LucideIcon;
  tone: string;
}

export type HotLeadBucket = "all" | "veryHot" | "hot" | "warm";

export interface HotLeadRow {
  id: string;
  rank: number;
  name: string;
  initials: string;
  requirement: string;
  source: string;
  aiScore: number;
  scoreLabel: string;
  interestLevel: string;
  stars: number;
  budgetMatch: number;
  projectName: string;
  projectDetail: string;
  lastContact: string;
  contactType: string;
  nextAction: string;
  priority: "High Priority" | "Medium Priority";
  owner: string;
  ownerName?: string;
  telecallerName?: string;
  fieldExecutiveName?: string;
  ownerAvatarUrl?: string;
}

export interface DonutSegment {
  label: string;
  value: number;
  percent: string;
  color: string;
}

export interface BudgetBar {
  label: string;
  value: number;
}

export interface InsightItem {
  title: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}

export interface HotLeadTabOption {
  id: HotLeadBucket;
  label: string;
}
