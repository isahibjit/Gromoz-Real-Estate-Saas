import type { LucideIcon } from "lucide-react";

export interface UploadStep {
  id: number;
  title: string;
  helper: string;
}

export interface ColumnMappingRow {
  id: string;
  fileColumn: string;
  crmField: string;
  sampleData: string;
}

export interface FilePreviewRow {
  name: string;
  mobile: string;
  email: string;
}

export interface ValidationErrorRow {
  row: number;
  fieldName: string;
  issue: string;
  foundValue: string;
}

export interface DuplicateRecordRow {
  duplicateLead: string;
  existingLead: string;
  matchScore: string;
}

export interface DonutSegment {
  label: string;
  value: number;
  helper?: string;
  color: string;
}

export interface ImportTip {
  label: string;
}

export interface SidebarActionCard {
  title: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}
