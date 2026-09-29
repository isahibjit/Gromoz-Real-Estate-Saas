import type { LucideIcon } from "lucide-react";

export type FollowUpStatus =
  | "Due Now"
  | "Due Soon"
  | "Upcoming"
  | "Overdue"
  | "Completed";

export interface FollowUpStat {
  label: string;
  value: string;
  change: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}

export interface FollowUpLead {
  id: string;
  leadId?: string;
  assignedToId?: string;
  sourceId?: string | null;
  leadStatusId?: string | null;
  leadTypeId?: string | null;
  preferredProjectId?: string | null;
  budgetRange?: string | null;
  configuration?: string | null;
  preferredLocation?: string | null;
  name: string;
  initials: string;
  property: string;
  source: string;
  mobile: string;
  projectName: string;
  executiveName: string;
  leadStatus: string;
  leadType: string;
  scheduledAt: string;
  dateGroup: string;
  time: string;
  lastContact: string;
  lastContactTime: string;
  owner: string;
  ownerAvatarUrl: string;
  status: FollowUpStatus;
  setReminder?: boolean;
  remark: string;
}

export interface OverdueFollowUp {
  name: string;
  property: string;
  type: "Call" | "WhatsApp";
  overdue: string;
  avatarUrl: string;
}

export interface FollowUpQuickAction {
  label: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}

export interface FollowUpPerformanceMetric {
  label: string;
  value: string;
  change: string;
  tone: string;
}

export interface BestFollowUpTime {
  time: string;
  label: string;
  value: string;
  highlighted?: boolean;
}
