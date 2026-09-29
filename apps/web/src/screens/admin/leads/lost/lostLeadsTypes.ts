import type { ForwardRefExoticComponent, RefAttributes } from "react";
import type { LucideProps } from "lucide-react";

export type LostLeadBucket =
  | "all"
  | "7-days"
  | "15-days"
  | "30-days"
  | "60-days";

export type LostLeadReason =
  | "Budget issue"
  | "Location preference"
  | "Unresponsive"
  | "Chose competitor"
  | "Not ready"
  | "Not specified"
  | string;

export interface LostLeadStat {
  label: string;
  value: string;
  change?: string;
  changeTone?: "up" | "down";
  helper: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  tone: string;
}

export interface LostLeadRow {
  id: string;
  name: string;
  initials: string;
  avatarTone: string;
  requirement: string;
  source: string;
  lossReason: LostLeadReason;
  lossReasonColor: string;
  competitor: string | null;
  lostAt: string | null;
  lostAtValue: number | null;
  lostDate: string;
  lostTime: string;
  daysSinceLoss: number | null;
  stageAtLoss: string;
  potentialValue: string;
  potentialValueNumber: number;
  owner: string;
  ownerAvatarUrl?: string;
  bucket: Exclude<LostLeadBucket, "all">;
}

export interface LostLeadTrend {
  date: string;
  leads: number;
}

export interface DistributionSegment {
  label: string;
  value: number;
  percent: string;
  color: string;
}

export interface AIInsight {
  title: string;
  helper: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  tone: string;
  actionLabel: string;
}

export interface ReactivationTool {
  title: string;
  helper: string;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  tone: string;
}

export interface CampaignMetric {
  label: string;
  value: string;
  change: string;
}

export interface SummaryRow {
  label: string;
  value: string;
}
