import type { LucideIcon } from "lucide-react";

export interface DuplicateStat {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}

export interface DuplicateLeadInfo {
  name: string;
  id: string;
  mobile: string;
  email: string;
  addedOn: string;
  avatarUrl: string;
}

export interface DuplicateGroup {
  id: string;
  detectedOn: string;
  source: string;
  criteria: Array<{
    label: string;
    value: string;
    match: "Exact Match" | "Partial Match";
  }>;
  score: number;
  scoreLabel: "High Match" | "Medium Match" | "Low Match";
  existing: DuplicateLeadInfo;
  duplicate: DuplicateLeadInfo;
  tone: string;
}

export interface DuplicateSource {
  source: string;
  duplicates: number;
}

export interface DuplicateTip {
  text: string;
}
