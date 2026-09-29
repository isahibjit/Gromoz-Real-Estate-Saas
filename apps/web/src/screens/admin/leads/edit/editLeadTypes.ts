import type { LucideIcon } from "lucide-react";

import type { AddLeadFormData } from "../add/addLeadTypes";

export interface EditLeadFormData extends AddLeadFormData {
  occupation: string;
  annualIncome: string;
  maritalStatus: string;
  floorPreference: string;
  amenities: string[];
}

export type EditLeadErrors = Partial<Record<keyof EditLeadFormData, string>>;

export interface EditLeadSelectOption {
  id: string;
  label: string;
}

export interface ChangeLogItem {
  id: string;
  timestamp: string;
  user: string;
  description: string;
  tone: "orange" | "green" | "gray";
}

export interface ActivityTrendPoint {
  date: string;
  score: number;
}

export interface WorkflowStep {
  id: string;
  label: string;
  status: string;
  icon: LucideIcon;
  tone: "success" | "neutral" | "warning";
}
