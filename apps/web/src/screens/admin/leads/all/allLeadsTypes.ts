import type { LucideIcon } from "lucide-react";

export interface LeadStat {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
  change?: string;
}

export interface LeadRow {
  id: string;
  backendId?: string;
  projectId?: string;
  ownerId?: string;
  telecallerId?: string;
  fieldExecutiveId?: string;
  lostReasonId?: string;
  lostReasonName?: string;
  lostCompetitor?: string | null;
  name: string;
  avatarSeed: string;
  mobile: string;
  email?: string | null;
  addedDate: string;
  lastUpdate: string;
  source: string;
  sourceId?: string | null;
  statusId?: string | null;
  temperatureId?: string | null;
  budgetRange?: string | null;
  configuration?: string | null;
  preferredLocation?: string | null;
  budget: string;
  propertyType: string;
  projectName: string;
  projectArea?: string | null;
  statusName: string;
  stage: string;
  stageTone: string;
  status: string;
  priority: string;
  leadType: string;
  ownerName?: string;
  telecallerName?: string;
  fieldExecutiveName?: string;
  assignedTo: string;
  assignedRole: string;
  lastFollowUp: string;
  nextFollowUp: string;
  nextFollowUpAt?: string | null;
  remark: string;
  lastContactedAt?: string | null;
  lostAt?: string | null;
  interestLevel?: string | null;
  leadScore: number;
  leadScoreLabel: string;
  leadScoreBreakdown?: Array<{
    category: string;
    label: string;
    score: number;
  }>;
}

export interface SourcePerformance {
  label: string;
  leads: number;
  conversion: number;
}

export interface ActivityItem {
  time: string;
  title: string;
  helper: string;
  tone: string;
  icon: LucideIcon;
}
