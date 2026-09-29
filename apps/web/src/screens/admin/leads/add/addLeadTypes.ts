import type { LucideIcon } from "lucide-react";

export interface SelectOption {
  id: string;
  label: string;
  avatarUrl?: string;
}

export interface AssigneeOption {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarUrl?: string;
}

export interface RecommendedProject {
  id: string;
  name: string;
  configuration: string;
  location: string;
  matchScore: number;
  imageTone: string;
}

export interface SummaryMetric {
  label: string;
  value: string;
  tone?: "default" | "hot" | "success";
}

export interface QuickActionItem {
  id: string;
  label: string;
  icon: LucideIcon;
  tone?: "default" | "whatsapp";
}

export interface AddLeadFormData {
  leadName: string;
  mobileNumber: string;
  mobileCountryCode: string;
  alternateNumber: string;
  alternateCountryCode: string;
  emailAddress: string;
  gender: string;
  propertyType: string;
  configuration: string;
  budgetRange: string;
  minBudget: string;
  minBudgetUnit: string;
  maxBudget: string;
  maxBudgetUnit: string;
  preferredLocation: string;
  preferredProject: string;
  possessionTimeline: string;
  carpetAreaRange: string;
  purpose: string;
  minArea: string;
  maxArea: string;
  zone: string;
  leadSource: string;
  campaign: string;
  leadStage: string;
  leadStatus: string;
  priority: string;
  interestLevel: string;
  heardAboutUs: string;
  remarks: string;
  managerId: string;
  telecallerId: string;
  fieldExecutiveId: string;
  referenceBy: string;
  assignDate: string;
  autoAssignFollowUp: boolean;
  followUpDate: string;
  followUpTime: string;
  followUpType: string;
}

export type AddLeadErrors = Partial<Record<keyof AddLeadFormData, string>>;

export interface LeadSource {
  id: string;
  name: string;
  icon: LucideIcon;
  tone: string;
}
