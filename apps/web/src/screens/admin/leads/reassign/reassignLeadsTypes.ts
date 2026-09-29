import type { LucideIcon } from "lucide-react";

export interface ReassignFeature {
  title: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
  badge?: string;
}

export interface OwnerWorkload {
  name: string;
  role: string;
  avatarUrl: string;
  totalLeads: number;
  rows: Array<{ label: string; value: number; percent: string; color: string }>;
}

export interface WorkflowStep {
  id: number;
  title: string;
  helper: string;
  status: "done" | "active" | "pending";
}

export interface RecentReassignment {
  date: string;
  leads: string;
  from: string;
  fromAvatarUrl: string;
  to: string;
  toAvatarUrl: string;
  reason: string;
  status: string;
  approvedBy: string;
  approvedByAvatarUrl: string;
}

export interface RuleItem {
  title: string;
  helper: string;
  icon: LucideIcon;
}
