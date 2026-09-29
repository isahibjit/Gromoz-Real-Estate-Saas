import type { LucideIcon } from "lucide-react";

export interface RecoveryStat {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  tone: string;
}

export interface RecoveryFunnelStage {
  label: string;
  value: string;
  width: string;
  color: string;
}

export interface RecoveryTrendPoint {
  label: string;
  replied: number;
  hot: number;
  converted: number;
}

export interface RecoveryActionPerformance {
  name: string;
  leadsWorked: number;
  reengaged: number;
  recovered: number;
  efficiency: string;
}

export interface RecoverableLead {
  id: string;
  name: string;
  initials: string;
  mobile: string;
  source: string;
  sourceTone: string;
  inactiveFor: string;
  lastContacted: string;
  reason: string;
  aiScore: number;
  suggestedAction: string;
}

export interface RecoveryChannel {
  label: string;
  replies: number;
  success: string;
  color: string;
  icon: LucideIcon;
}

export interface RecoveryOverviewMetric {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface RecoveryInsight {
  text: string;
  icon: LucideIcon;
  tone: string;
}
