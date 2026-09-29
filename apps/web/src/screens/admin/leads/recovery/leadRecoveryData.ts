import {
  BadgeIndianRupee,
  Bot,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserRoundCheck,
  UsersRound,
  Workflow,
} from "lucide-react";

import type {
  RecoverableLead,
  RecoveryActionPerformance,
  RecoveryChannel,
  RecoveryFunnelStage,
  RecoveryInsight,
  RecoveryOverviewMetric,
  RecoveryStat,
  RecoveryTrendPoint,
} from "./leadRecoveryTypes";

export const recoveryStats: RecoveryStat[] = [
  {
    label: "Total Recoverable Leads",
    value: "2,843",
    change: "Up 18.6% vs last 7 days",
    icon: TrendingUp,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    label: "Recovery in Progress",
    value: "1,248",
    change: "Up 12.4% vs last 7 days",
    icon: ShieldCheck,
    tone: "bg-green-50 text-success",
  },
  {
    label: "Re-engaged Leads",
    value: "356",
    change: "Up 15.7% vs last 7 days",
    icon: Mail,
    tone: "bg-orange-50 text-primary",
  },
  {
    label: "Recovered Leads",
    value: "128",
    change: "Up 10.3% vs last 7 days",
    icon: UserRoundCheck,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    label: "Recovery Revenue",
    value: "Rs 48.75 Lakh",
    change: "Up 22.8% vs last 7 days",
    icon: UsersRound,
    tone: "bg-green-50 text-success",
  },
  {
    label: "Success Rate",
    value: "10.2%",
    change: "Down 2.1% vs last 7 days",
    icon: RefreshCw,
    tone: "bg-violet-50 text-violet-700",
  },
];

export const recoveryFunnelStages: RecoveryFunnelStage[] = [
  {
    label: "Recoverable Leads",
    value: "2,843 (100%)",
    width: "100%",
    color: "#0b63f6",
  },
  {
    label: "Contact Attempted",
    value: "1,962 (69.0%)",
    width: "86%",
    color: "#10b981",
  },
  { label: "Re-engaged", value: "356 (12.5%)", width: "68%", color: "#f59e0b" },
  { label: "Hot Leads", value: "198 (7.0%)", width: "48%", color: "#7c3aed" },
  { label: "Recovered", value: "128 (4.5%)", width: "30%", color: "#f43f5e" },
];

export const recoveryTrend: RecoveryTrendPoint[] = [
  { label: "May 20", replied: 135, hot: 72, converted: 15 },
  { label: "May 21", replied: 120, hot: 68, converted: 15 },
  { label: "May 22", replied: 150, hot: 90, converted: 32 },
  { label: "May 23", replied: 112, hot: 58, converted: 14 },
  { label: "May 24", replied: 148, hot: 82, converted: 35 },
  { label: "May 25", replied: 132, hot: 62, converted: 14 },
  { label: "May 26", replied: 150, hot: 96, converted: 26 },
];

export const recoveryActionPerformance: RecoveryActionPerformance[] = [
  {
    name: "Priority Call Recovery",
    leadsWorked: 520,
    reengaged: 98,
    recovered: 32,
    efficiency: "6.15%",
  },
  {
    name: "Weekend Reconnect Drive",
    leadsWorked: 410,
    reengaged: 76,
    recovered: 28,
    efficiency: "6.83%",
  },
  {
    name: "WhatsApp Re-engagement",
    leadsWorked: 360,
    reengaged: 64,
    recovered: 22,
    efficiency: "6.11%",
  },
  {
    name: "Price Update Follow-up",
    leadsWorked: 290,
    reengaged: 48,
    recovered: 18,
    efficiency: "6.21%",
  },
  {
    name: "Project Match Outreach",
    leadsWorked: 220,
    reengaged: 34,
    recovered: 12,
    efficiency: "5.45%",
  },
];

export const recoveryTabs = [
  "Recoverable Leads",
  "Recovery Actions",
  "Recovery Rules",
  "Recovered Leads",
  "Recovered Revenue",
];

export const recoverableLeads: RecoverableLead[] = [
  {
    id: "TR001245",
    name: "Rahul Sharma",
    initials: "RS",
    mobile: "+91 98765 43210",
    source: "MagicBricks",
    sourceTone: "bg-red-100 text-red-600",
    inactiveFor: "45 Days",
    lastContacted: "11 Apr 2025",
    reason: "No Response",
    aiScore: 85,
    suggestedAction: "Send WhatsApp + Call",
  },
  {
    id: "TR001244",
    name: "Neha Kapoor",
    initials: "NK",
    mobile: "+91 91254 56789",
    source: "99Acres",
    sourceTone: "bg-blue-100 text-blue-700",
    inactiveFor: "38 Days",
    lastContacted: "18 Apr 2025",
    reason: "Not Interested",
    aiScore: 68,
    suggestedAction: "Send Offer WhatsApp",
  },
  {
    id: "TR001243",
    name: "Amit Singh",
    initials: "AS",
    mobile: "+91 99887 76655",
    source: "Google Ads",
    sourceTone: "bg-green-100 text-green-700",
    inactiveFor: "60 Days",
    lastContacted: "28 Mar 2025",
    reason: "Budget Issue",
    aiScore: 82,
    suggestedAction: "Call + Price Update",
  },
  {
    id: "TR001242",
    name: "Priya Gupta",
    initials: "PG",
    mobile: "+91 87654 32109",
    source: "Website",
    sourceTone: "bg-blue-100 text-blue-700",
    inactiveFor: "32 Days",
    lastContacted: "20 Apr 2025",
    reason: "No Response",
    aiScore: 72,
    suggestedAction: "Send Project Updates",
  },
  {
    id: "TR001241",
    name: "Dinesh Kumar",
    initials: "DK",
    mobile: "+91 95432 19876",
    source: "Justdial",
    sourceTone: "bg-orange-100 text-primary",
    inactiveFor: "55 Days",
    lastContacted: "05 Apr 2025",
    reason: "Location Issue",
    aiScore: 65,
    suggestedAction: "Send Location Options",
  },
  {
    id: "TR001240",
    name: "Sandeep More",
    initials: "SM",
    mobile: "+91 76543 21098",
    source: "Referral",
    sourceTone: "bg-green-100 text-success",
    inactiveFor: "41 Days",
    lastContacted: "15 Apr 2025",
    reason: "No Response",
    aiScore: 78,
    suggestedAction: "WhatsApp + Follow-up",
  },
];

export const recoveryChannels: RecoveryChannel[] = [
  {
    label: "WhatsApp",
    replies: 182,
    success: "11.2%",
    color: "#16a34a",
    icon: MessageCircle,
  },
  {
    label: "Calls",
    replies: 96,
    success: "9.8%",
    color: "#2563eb",
    icon: Phone,
  },
  {
    label: "Email",
    replies: 54,
    success: "8.4%",
    color: "#7c3aed",
    icon: Mail,
  },
  { label: "SMS", replies: 24, success: "6.7%", color: "#f97316", icon: Bot },
];

export const recoveryOverviewMetrics: RecoveryOverviewMetric[] = [
  { label: "Open Recovery Queues", value: "8", icon: Workflow },
  { label: "Completed Recoveries", value: "15", icon: CheckCircle2 },
  { label: "Leads Under Review", value: "1,248", icon: UsersRound },
  { label: "Avg. Response Time", value: "2h 15m", icon: Clock },
];

export const recoveryInsights: RecoveryInsight[] = [
  {
    text: "Leads inactive for 30-60 days have 28% higher chance of response.",
    icon: UsersRound,
    tone: "bg-green-50 text-success",
  },
  {
    text: "Weekend WhatsApp recovery touches get 32% more replies.",
    icon: MessageCircle,
    tone: "bg-green-50 text-success",
  },
  {
    text: "Price update follow-ups have 18% better recovery conversion.",
    icon: BadgeIndianRupee,
    tone: "bg-orange-50 text-primary",
  },
];

export const recoveryActions = {
  startRecovery: "Start Recovery",
  settings: "Recovery Settings",
  filters: "Filters",
  insightCta: "View All Insights",
  actionCta: "View All",
  overviewCta: "View All",
};
