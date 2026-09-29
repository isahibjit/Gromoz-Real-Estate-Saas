import {
  CalendarDays,
  CheckCircle2,
  Flame,
  Gauge,
  MessageSquare,
  Phone,
  PiggyBank,
  Rocket,
  ShieldCheck,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";

import type {
  BudgetBar,
  DonutSegment,
  HotLeadBucket,
  HotLeadRow,
  HotLeadStat,
  HotLeadTabOption,
  InsightItem,
} from "./hotLeadsTypes";

const avatar = (name: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
    name,
  )}`;

export const hotLeadStats: HotLeadStat[] = [
  {
    label: "Total Hot Leads",
    value: "256",
    helper: "vs last 7 days",
    change: "18.6%",
    icon: Flame,
    tone: "bg-red-50 text-red-500",
  },
  {
    label: "High Conversion Leads",
    value: "184",
    helper: "71.9% of total",
    icon: CheckCircle2,
    tone: "bg-green-50 text-success",
  },
  {
    label: "Avg. Lead Score",
    value: "87/100",
    helper: "Excellent",
    icon: Target,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    label: "Potential Revenue",
    value: "₹18.62 Cr",
    helper: "vs last 7 days",
    change: "22.4%",
    icon: PiggyBank,
    tone: "bg-green-50 text-success",
  },
  {
    label: "Expected Closures",
    value: "32",
    helper: "vs last 7 days",
    change: "14.3%",
    icon: TrendingUp,
    tone: "bg-orange-50 text-primary",
  },
];

export const hotLeadRows: HotLeadRow[] = [
  {
    id: "hot-1",
    rank: 1,
    name: "Rahul Sharma",
    initials: "RS",
    requirement: "2 BHK | Andheri, Mumbai",
    source: "MagicBricks",
    aiScore: 95,
    scoreLabel: "Excellent",
    interestLevel: "Very High",
    stars: 5,
    budgetMatch: 92,
    projectName: "Rustomjee Elements",
    projectDetail: "2 BHK, ₹2.2 Cr",
    lastContact: "Today, 11:30 AM",
    contactType: "Call",
    nextAction: "Call Now",
    priority: "High Priority",
    owner: "Vikram Singh",
    ownerAvatarUrl: avatar("Vikram Singh"),
  },
  {
    id: "hot-2",
    rank: 2,
    name: "Neha Kapoor",
    initials: "NK",
    requirement: "3 BHK | Borivali, Mumbai",
    source: "MagicBricks",
    aiScore: 92,
    scoreLabel: "Excellent",
    interestLevel: "High",
    stars: 4,
    budgetMatch: 88,
    projectName: "Kalpataru Radiance",
    projectDetail: "3 BHK, ₹3.1 Cr",
    lastContact: "Today, 10:15 AM",
    contactType: "WhatsApp",
    nextAction: "Send Brochure",
    priority: "High Priority",
    owner: "Pooja Sharma",
    ownerAvatarUrl: avatar("Pooja Sharma"),
  },
  {
    id: "hot-3",
    rank: 3,
    name: "Amit Singh",
    initials: "AS",
    requirement: "2 BHK | Thane, Mumbai",
    source: "99acres",
    aiScore: 90,
    scoreLabel: "Excellent",
    interestLevel: "High",
    stars: 4,
    budgetMatch: 85,
    projectName: "Lodha Crown",
    projectDetail: "2 BHK, ₹1.95 Cr",
    lastContact: "Yesterday, 6:20 PM",
    contactType: "Call",
    nextAction: "Schedule Visit",
    priority: "Medium Priority",
    owner: "Rahul Sharma",
    ownerAvatarUrl: avatar("Rahul Sharma"),
  },
  {
    id: "hot-4",
    rank: 4,
    name: "Priya Gupta",
    initials: "PG",
    requirement: "3 BHK | Malad, Mumbai",
    source: "MagicBricks",
    aiScore: 88,
    scoreLabel: "Very Good",
    interestLevel: "High",
    stars: 4,
    budgetMatch: 80,
    projectName: "Runwal Bliss",
    projectDetail: "3 BHK, ₹2.8 Cr",
    lastContact: "Yesterday, 4:45 PM",
    contactType: "WhatsApp",
    nextAction: "Follow Up",
    priority: "High Priority",
    owner: "Neha Joshi",
    ownerAvatarUrl: avatar("Neha Joshi"),
  },
  {
    id: "hot-5",
    rank: 5,
    name: "Sandeep More",
    initials: "SM",
    requirement: "2 BHK | Andheri, Mumbai",
    source: "Justdial",
    aiScore: 87,
    scoreLabel: "Very Good",
    interestLevel: "High",
    stars: 4,
    budgetMatch: 78,
    projectName: "Godrej Nest",
    projectDetail: "2 BHK, ₹1.75 Cr",
    lastContact: "Yesterday, 2:10 PM",
    contactType: "Call",
    nextAction: "Call Back",
    priority: "Medium Priority",
    owner: "Aditya Patil",
    ownerAvatarUrl: avatar("Aditya Patil"),
  },
];

export const hotLeadTabs: HotLeadTabOption[] = [
  { id: "all", label: "All" },
  { id: "veryHot", label: "Very Hot" },
  { id: "hot", label: "Hot" },
  { id: "warm", label: "Warm" },
];

export function getHotLeadBucket(
  lead: HotLeadRow,
): Exclude<HotLeadBucket, "all"> {
  if (lead.aiScore >= 90) {
    return "veryHot";
  }

  if (lead.aiScore >= 80) {
    return "hot";
  }

  return "warm";
}

export const leadSourceSegments: DonutSegment[] = [
  { label: "MagicBricks", value: 124, percent: "48.4%", color: "#ef4444" },
  { label: "99acres", value: 62, percent: "24.2%", color: "#0ea5e9" },
  { label: "Justdial", value: 28, percent: "10.9%", color: "#a855f7" },
  { label: "Website", value: 22, percent: "8.6%", color: "#f59e0b" },
  { label: "Referral", value: 12, percent: "4.7%", color: "#fb923c" },
  { label: "Others", value: 8, percent: "3.1%", color: "#f97316" },
];

export const scoreSegments: DonutSegment[] = [
  {
    label: "90-100 (Excellent)",
    value: 87,
    percent: "34.0%",
    color: "#059669",
  },
  {
    label: "80-89 (Very Good)",
    value: 102,
    percent: "39.8%",
    color: "#14b8a6",
  },
  { label: "70-79 (Good)", value: 45, percent: "17.6%", color: "#f59e0b" },
  { label: "60-69 (Average)", value: 16, percent: "6.2%", color: "#f97316" },
  { label: "Below 60 (Low)", value: 6, percent: "2.3%", color: "#ef4444" },
];

export const budgetBars: BudgetBar[] = [
  { label: "< ₹50 L", value: 18 },
  { label: "₹50L - ₹1 Cr", value: 42 },
  { label: "₹1 Cr - ₹2 Cr", value: 86 },
  { label: "₹2 Cr - ₹3 Cr", value: 64 },
  { label: "₹3 Cr - ₹5 Cr", value: 32 },
  { label: "> ₹5 Cr", value: 14 },
];

export const aiInsightItems = [
  "High engagement in last 7 days",
  "Budget matches active projects",
  "Multiple interactions completed",
  "Showing interest in site visit",
];

export const quickActions: InsightItem[] = [
  {
    title: "Call High Priority Leads",
    helper: "Start calling top hot leads",
    icon: Phone,
    tone: "bg-blue-50 text-info",
  },
  {
    title: "Send WhatsApp",
    helper: "Send bulk WhatsApp messages",
    icon: MessageSquare,
    tone: "bg-green-50 text-success",
  },
  {
    title: "Schedule Site Visits",
    helper: "Book site visits for interested leads",
    icon: CalendarDays,
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Assign Leads",
    helper: "Distribute leads to team members",
    icon: UsersRound,
    tone: "bg-violet-50 text-violet-600",
  },
];

export const hotReasonItems: InsightItem[] = [
  {
    title: "High Engagement",
    helper: "Multiple interactions",
    icon: ShieldCheck,
    tone: "bg-blue-50 text-info",
  },
  {
    title: "Budget Match",
    helper: "Budget aligns well",
    icon: PiggyBank,
    tone: "bg-green-50 text-success",
  },
  {
    title: "Project Interest",
    helper: "Specific projects",
    icon: Target,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    title: "Site Visit Intent",
    helper: "Wants to visit",
    icon: Gauge,
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    title: "Quick Response",
    helper: "Responds quickly",
    icon: Rocket,
    tone: "bg-emerald-50 text-emerald-600",
  },
];
