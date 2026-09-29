import type { LucideIcon } from "lucide-react";

export type ImportStatus = "Completed" | "Processing" | "Pending" | "Failed";

export interface ImportSource {
  id: string;
  name: string;
  leads: string;
  icon: LucideIcon;
  tone: string;
}

export interface ImportStat {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}

export interface ImportRow {
  id: number;
  fileName: string;
  source: string;
  totalRecords: string;
  newLeads: string;
  duplicates: string;
  errors: string;
  status: ImportStatus;
  progress: number;
  importedBy: string;
  importDate: string;
  icon: LucideIcon;
  iconTone: string;
}

export interface DonutSegment {
  label: string;
  value: number;
  helper: string;
  color: string;
}

export interface ErrorReason {
  label: string;
  count: number;
  icon: LucideIcon;
  tone: string;
}
