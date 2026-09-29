import type { LucideIcon } from "lucide-react";

export type LeadSource =
  | "MagicBricks"
  | "99Acres"
  | "Google Ads"
  | "Referral"
  | "Walk-In"
  | "Meta Ads"
  | "Justdial";

export type AssigneeType = "telecaller" | "field-executive" | "admin" | "manager";
export type AssignmentTab = "unassigned" | "reassignments" | "ai";
export type AssignmentMode = "round-robin" | "capacity" | "location" | "ai";
export type DistributionStrategy =
  | "round-robin"
  | "location"
  | "capacity"
  | "project"
  | "ai";

export interface AssignmentStat {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}

export type LeadPriority = "High" | "Medium" | "Low";

export interface UnassignedLead {
  id: string;
  name: string;
  customerName: string;
  mobileNumber: string;
  source: LeadSource;
  priorityWeight: number;
  avatarUrl?: string;
  projectInterest: string;
  priority: LeadPriority;
  createdOn: string;
}

export interface AssigneeOption {
  id: string;
  name: string;
  type: AssigneeType;
  currentLoad: number;
  capacity: number;
  performance: number;
  avatarUrl?: string;
  locations: string[];
}

export interface AssignmentOption {
  id: AssignmentMode;
  title: string;
  description: string;
  recommended?: boolean;
}

export interface WorkloadSegment {
  label: string;
  users: number;
  color: string;
}

export interface AssignmentInsight {
  title: string;
  helper: string;
  value: string;
  icon: LucideIcon;
  tone: string;
}

export interface RecentAssignment {
  time: string;
  leadName: string;
  assigneeName: string;
}

export interface DistributionRule {
  id: DistributionStrategy;
  title: string;
  description: string;
  status: "Active" | "Paused";
  icon: LucideIcon;
  tone: string;
}

export interface DistributionStrategyUsage {
  label: string;
  value: number;
  percent: string;
  color: string;
}

export interface LeadAssignmentFunnelStage {
  label: string;
  value: string;
  helper: string;
  width: string;
  color: string;
}

export interface DistributionActivity {
  leadId: string;
  assigneeName: string;
  time: string;
  status: "assigned" | "failed";
  tone: string;
  icon: LucideIcon;
}

export interface ExecutiveWorkloadRow {
  id: string;
  name: string;
  role: string;
  activeLeads: number;
  capacity: number;
  utilization: number;
  status: "Optimal" | "High" | "Low";
  performanceScore: number;
  avatarUrl?: string;
}

export interface DistributionSetting {
  label: string;
  value: string;
  icon: LucideIcon;
  enabled?: boolean;
}

export interface DistributionRecommendation {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}

export interface TelecallerOption {
  id: string;
  name: string;
  assignedLeads: number;
}
