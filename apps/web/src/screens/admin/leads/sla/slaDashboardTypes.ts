import type { LucideIcon } from "lucide-react";

export interface SLAKPI {
  label: string;
  value: string | number;
  change: string;
  changeTone: "up" | "down";
  helper: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
}

export interface SLAComplianceTrend {
  period: string;
  withinSLA: number;
  breached: number;
  atRisk: number;
}

export interface SLABreachBucket {
  bucket: string;
  count: number;
  percentage: string;
  color: string;
}

export interface SLAComplianceSource {
  source: string;
  percentage: string;
  percentageValue: number;
  color: string;
}

export interface SLABreachedLead {
  id: string;
  name: string;
  details: string; // e.g. "2 BHK | Andheri West"
  source: {
    name: string;
    logo?: string;
  };
  owner: {
    name: string;
    role: string;
    avatarSeed: string;
  };
  breachTime: string; // e.g. "Today, 11:20 AM"
  breachDuration: string; // e.g. "1h 25m"
  leadStage: "Interested" | "New Lead" | "Contacted" | "Site Visit";
  lastActivity: string; // e.g. "No response yet"
}

export interface SLASummaryTeam {
  id: string;
  name: string;
  percentage: string;
  percentageValue: number;
  avatarSeed: string;
}

export interface SLAConfigItem {
  label: string;
  value: string;
}
