import {
  AlertTriangle,
  Clock,
  Hourglass,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import type {
  SLABreachBucket,
  SLABreachedLead,
  SLAComplianceSource,
  SLAComplianceTrend,
  SLAConfigItem,
  SLAKPI,
  SLASummaryTeam,
} from "./slaDashboardTypes";

export const slaKPIs: SLAKPI[] = [
  {
    label: "Total Leads",
    value: "12,458",
    change: "14.3%",
    changeTone: "up",
    helper: "vs last 7 days",
    icon: UsersRound,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
  {
    label: "Within SLA",
    value: "8,247 (66.2%)",
    change: "8.6%",
    changeTone: "up",
    helper: "vs last 7 days",
    icon: ShieldCheck,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    label: "SLA Breached",
    value: "3,421 (27.4%)",
    change: "5.3%",
    changeTone: "down",
    helper: "vs last 7 days",
    icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
  },
  {
    label: "At Risk (Approaching SLA)",
    value: "790 (6.3%)",
    change: "2.1%",
    changeTone: "down",
    helper: "vs last 7 days",
    icon: Search,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
  },
  {
    label: "Avg. First Response Time",
    value: "18m 42s",
    change: "6m 15s",
    changeTone: "down",
    helper: "vs last 7 days",
    icon: Clock,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    label: "Avg. Resolution Time",
    value: "2h 18m",
    change: "18m",
    changeTone: "down",
    helper: "vs last 7 days",
    icon: Hourglass,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-600",
  },
];

export const slaTrendData: SLAComplianceTrend[] = [
  { period: "May 20", withinSLA: 65, breached: 25, atRisk: 10 },
  { period: "May 21", withinSLA: 62, breached: 24, atRisk: 14 },
  { period: "May 22", withinSLA: 68, breached: 22, atRisk: 10 },
  { period: "May 23", withinSLA: 66, breached: 28, atRisk: 6 },
  { period: "May 24", withinSLA: 67, breached: 29, atRisk: 4 },
  { period: "May 25", withinSLA: 63, breached: 27, atRisk: 10 },
  { period: "May 26", withinSLA: 66.2, breached: 27.4, atRisk: 6.3 },
];

export const slaBreachBuckets: SLABreachBucket[] = [
  { bucket: "0 - 5 min", count: 512, percentage: "15.0%", color: "#10b981" },
  { bucket: "5 - 15 min", count: 876, percentage: "25.6%", color: "#f59e0b" },
  { bucket: "15 - 30 min", count: 1024, percentage: "29.9%", color: "#f97316" },
  { bucket: "30 - 60 min", count: 658, percentage: "19.2%", color: "#8b5cf6" },
  { bucket: "> 60 min", count: 351, percentage: "10.3%", color: "#ef4444" },
];

export const slaComplianceSources: SLAComplianceSource[] = [
  {
    source: "MagicBricks",
    percentage: "68.4%",
    percentageValue: 68.4,
    color: "#2563eb",
  },
  {
    source: "99Acres",
    percentage: "58.7%",
    percentageValue: 58.7,
    color: "#10b981",
  },
  {
    source: "Google Ads",
    percentage: "63.1%",
    percentageValue: 63.1,
    color: "#ef4444",
  },
  {
    source: "Website",
    percentage: "54.2%",
    percentageValue: 54.2,
    color: "#8b5cf6",
  },
  {
    source: "Referral",
    percentage: "71.6%",
    percentageValue: 71.6,
    color: "#0ea5e9",
  },
  {
    source: "Justdial",
    percentage: "47.8%",
    percentageValue: 47.8,
    color: "#f59e0b",
  },
  {
    source: "Others",
    percentage: "52.3%",
    percentageValue: 52.3,
    color: "#94a3b8",
  },
];

export const slaBreachedLeads: SLABreachedLead[] = [
  {
    id: "1",
    name: "Rahul Sharma",
    details: "2 BHK | Andheri West",
    source: { name: "MagicBricks" },
    owner: {
      name: "Vikram Singh",
      role: "Pre Sales Executive",
      avatarSeed: "Vikram Singh",
    },
    breachTime: "Today, 11:20 AM",
    breachDuration: "1h 25m",
    leadStage: "Interested",
    lastActivity: "No response yet",
  },
  {
    id: "2",
    name: "Neha Kapoor",
    details: "3 BHK | Powai",
    source: { name: "99Acres" },
    owner: { name: "Neha Joshi", role: "Pre Sales Executive", avatarSeed: "Neha Joshi" },
    breachTime: "Today, 10:15 AM",
    breachDuration: "45m",
    leadStage: "New Lead",
    lastActivity: "No response yet",
  },
  {
    id: "3",
    name: "Amit Singh",
    details: "2 BHK | Thane West",
    source: { name: "Google Ads" },
    owner: {
      name: "Rahul Sharma",
      role: "Pre Sales Executive",
      avatarSeed: "Rahul Sharma",
    },
    breachTime: "Today, 09:40 AM",
    breachDuration: "1h 10m",
    leadStage: "Contacted",
    lastActivity: "No response yet",
  },
  {
    id: "4",
    name: "Priya Gupta",
    details: "3 BHK | Malad West",
    source: { name: "Website" },
    owner: {
      name: "Pooja Sharma",
      role: "Pre Sales Executive",
      avatarSeed: "Pooja Sharma",
    },
    breachTime: "Today, 09:15 AM",
    breachDuration: "55m",
    leadStage: "Interested",
    lastActivity: "No response yet",
  },
  {
    id: "5",
    name: "Dinesh Kumar",
    details: "1 BHK | Kandivali East",
    source: { name: "Justdial" },
    owner: { name: "Amit Kumar", role: "Pre Sales Executive", avatarSeed: "Amit Kumar" },
    breachTime: "Yesterday, 06:30 PM",
    breachDuration: "2h 05m",
    leadStage: "Site Visit",
    lastActivity: "No response yet",
  },
];

export const slaTeamSummary: SLASummaryTeam[] = [
  {
    id: "1",
    name: "Team Alpha",
    percentage: "72.6%",
    percentageValue: 72.6,
    avatarSeed: "Team Alpha",
  },
  {
    id: "2",
    name: "Team Beta",
    percentage: "65.4%",
    percentageValue: 65.4,
    avatarSeed: "Team Beta",
  },
  {
    id: "3",
    name: "Team Gamma",
    percentage: "58.1%",
    percentageValue: 58.1,
    avatarSeed: "Team Gamma",
  },
  {
    id: "4",
    name: "Team Delta",
    percentage: "47.3%",
    percentageValue: 47.3,
    avatarSeed: "Team Delta",
  },
  {
    id: "5",
    name: "Team Epsilon",
    percentage: "44.8%",
    percentageValue: 44.8,
    avatarSeed: "Team Epsilon",
  },
];

export const slaConfigSnapshot: SLAConfigItem[] = [
  { label: "First Response Time SLA", value: "15 Minutes" },
  { label: "Follow-up SLA", value: "24 Hours" },
  { label: "Site Visit SLA", value: "48 Hours" },
  { label: "Resolution Time SLA", value: "72 Hours" },
];
