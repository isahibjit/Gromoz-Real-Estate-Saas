import {
  BadgeCheck,
  BriefcaseBusiness,
  CalendarCheck,
  ClipboardCheck,
  ContactRound,
  Clock3,
  FileWarning,
  Headphones,
  ListChecks,
  LocateFixed,
  MapPinned,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  WalletCards,
  UsersRound,
  Gauge,
} from "lucide-react";

import { sidebarItems } from "../../dashboard/dashboardData";
import type {
  AssigneeOption,
  DistributionActivity,
  DistributionRecommendation,
  DistributionRule,
  DistributionSetting,
  DistributionStrategyUsage,
  ExecutiveWorkloadRow,
  AssignmentInsight,
  AssignmentOption,
  AssignmentStat,
  AssignmentTab,
  LeadAssignmentFunnelStage,
  RecentAssignment,
  UnassignedLead,
  WorkloadSegment,
} from "./leadAssignmentTypes";

export const assignLeadsSidebarItems = sidebarItems;

export const assignmentStats: AssignmentStat[] = [
  {
    label: "Unassigned Leads",
    value: "156",
    helper: "Requires Assignment",
    icon: ClipboardCheck,
    tone: "bg-blue-50 text-info",
  },
  {
    label: "Available Pre Sales Executives",
    value: "24",
    helper: "Active Users",
    icon: UsersRound,
    tone: "bg-green-50 text-success",
  },
  {
    label: "Available Executives",
    value: "18",
    helper: "Active Users",
    icon: Headphones,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    label: "Today's Assignments",
    value: "84",
    helper: "Leads Assigned",
    icon: BriefcaseBusiness,
    tone: "bg-orange-50 text-primary",
  },
  {
    label: "Overdue Leads",
    value: "12",
    helper: "Reassign Needed",
    icon: ShieldCheck,
    tone: "bg-cyan-50 text-cyan-600",
  },
];

export const assignmentTabs: { id: AssignmentTab; label: string }[] = [
  { id: "unassigned", label: "Unassigned" },
  { id: "reassignments", label: "Reassignments" },
];

const avatar = (name: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
    name,
  )}`;

export const unassignedLeads: UnassignedLead[] = [
  {
    id: "lead-1",
    name: "Rahul Sharma",
    customerName: "Rahul Sharma",
    mobileNumber: "+91 98765 43210",
    source: "MagicBricks",
    priorityWeight: 92,
    avatarUrl: avatar("Rahul Sharma"),
    projectInterest: "Ocean Heights",
    priority: "High",
    createdOn: "20 May 2025",
  },
  {
    id: "lead-2",
    name: "Neha Kapoor",
    customerName: "Neha Kapoor",
    mobileNumber: "+91 98123 45678",
    source: "99Acres",
    priorityWeight: 89,
    avatarUrl: avatar("Neha Kapoor"),
    projectInterest: "Lakeview Residency",
    priority: "Medium",
    createdOn: "20 May 2025",
  },
  {
    id: "lead-3",
    name: "Vikram Singh",
    customerName: "Vikram Singh",
    mobileNumber: "+91 98234 56789",
    source: "Google Ads",
    priorityWeight: 86,
    avatarUrl: avatar("Vikram Singh"),
    projectInterest: "Skyline Enclave",
    priority: "Low",
    createdOn: "19 May 2025",
  },
  {
    id: "lead-4",
    name: "Anjali Mehta",
    customerName: "Anjali Mehta",
    mobileNumber: "+91 98345 67890",
    source: "Referral",
    priorityWeight: 83,
    avatarUrl: avatar("Anjali Mehta"),
    projectInterest: "Ocean Heights",
    priority: "High",
    createdOn: "18 May 2025",
  },
  {
    id: "lead-5",
    name: "Karan Patel",
    customerName: "Karan Patel",
    mobileNumber: "+91 98712 34567",
    source: "Walk-In",
    priorityWeight: 78,
    avatarUrl: avatar("Karan Patel"),
    projectInterest: "Sunset Residency",
    priority: "Medium",
    createdOn: "18 May 2025",
  },
  {
    id: "lead-6",
    name: "Pooja Verma",
    customerName: "Pooja Verma",
    mobileNumber: "+91 97654 32109",
    source: "Meta Ads",
    priorityWeight: 76,
    avatarUrl: avatar("Pooja Verma"),
    projectInterest: "Palm Springs",
    priority: "Low",
    createdOn: "17 May 2025",
  },
  {
    id: "lead-7",
    name: "Rohit Gupta",
    customerName: "Rohit Gupta",
    mobileNumber: "+91 93560 24680",
    source: "Justdial",
    priorityWeight: 72,
    avatarUrl: avatar("Rohit Gupta"),
    projectInterest: "Skyline Enclave",
    priority: "Medium",
    createdOn: "16 May 2025",
  },
];

export const assignees: AssigneeOption[] = [
  {
    id: "sneha-iyer",
    name: "Sneha Iyer",
    type: "telecaller",
    currentLoad: 18,
    capacity: 30,
    performance: 92,
    avatarUrl: avatar("Sneha Iyer"),
    locations: ["Mumbai", "Navi Mumbai"],
  },
  {
    id: "aditya-patil",
    name: "Aditya Patil",
    type: "telecaller",
    currentLoad: 22,
    capacity: 30,
    performance: 88,
    avatarUrl: avatar("Aditya Patil"),
    locations: ["Mumbai", "Navi Mumbai"],
  },
  {
    id: "pooja-sharma",
    name: "Pooja Sharma",
    type: "telecaller",
    currentLoad: 25,
    capacity: 30,
    performance: 85,
    avatarUrl: avatar("Pooja Sharma"),
    locations: ["Thane"],
  },
  {
    id: "rohit-verma",
    name: "Rohit Verma",
    type: "telecaller",
    currentLoad: 28,
    capacity: 30,
    performance: 82,
    avatarUrl: avatar("Rohit Verma"),
    locations: ["Mumbai"],
  },
  {
    id: "neha-joshi",
    name: "Neha Joshi",
    type: "telecaller",
    currentLoad: 15,
    capacity: 30,
    performance: 90,
    avatarUrl: avatar("Neha Joshi"),
    locations: ["Kalyan"],
  },
  {
    id: "amit-tiwari",
    name: "Amit Tiwari",
    type: "telecaller",
    currentLoad: 20,
    capacity: 30,
    performance: 87,
    avatarUrl: avatar("Amit Tiwari"),
    locations: ["Mumbai"],
  },
  {
    id: "kritika-shah",
    name: "Kritika Shah",
    type: "telecaller",
    currentLoad: 12,
    capacity: 30,
    performance: 91,
    avatarUrl: avatar("Kritika Shah"),
    locations: ["Navi Mumbai"],
  },
  {
    id: "amit-joshi",
    name: "Amit Joshi",
    type: "field-executive",
    currentLoad: 12,
    capacity: 24,
    performance: 89,
    avatarUrl: avatar("Amit Joshi"),
    locations: ["Andheri", "Powai"],
  },
  {
    id: "ravi-nair",
    name: "Ravi Nair",
    type: "field-executive",
    currentLoad: 16,
    capacity: 24,
    performance: 84,
    avatarUrl: avatar("Ravi Nair"),
    locations: ["Thane"],
  },
  {
    id: "rahul-mehta",
    name: "Rahul Mehta",
    type: "manager",
    currentLoad: 8,
    capacity: 18,
    performance: 94,
    avatarUrl: avatar("Rahul Mehta"),
    locations: ["Mumbai"],
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    type: "manager",
    currentLoad: 10,
    capacity: 18,
    performance: 91,
    avatarUrl: avatar("Priya Shah"),
    locations: ["Navi Mumbai"],
  },
];

export const assignmentOptions: AssignmentOption[] = [
  {
    id: "round-robin",
    title: "Round Robin",
    description: "Distribute leads equally among selected users",
  },
  {
    id: "capacity",
    title: "Based on Capacity",
    description: "Assign based on user capacity and workload",
  },
  {
    id: "location",
    title: "Based on Location",
    description: "Assign leads based on preferred locations",
  },
  {
    id: "capacity",
    title: "Capacity Assignment",
    description: "Assign based on current workload and capacity",
    recommended: true,
  },
];

export const distributionRules: DistributionRule[] = [
  {
    id: "round-robin",
    title: "Round Robin",
    description: "Distribute leads equally in rotation",
    status: "Active",
    icon: RotateCcw,
    tone: "bg-blue-50 text-info",
  },
  {
    id: "location",
    title: "Location Based",
    description: "Assign based on lead location",
    status: "Active",
    icon: MapPinned,
    tone: "bg-green-50 text-success",
  },
  {
    id: "capacity",
    title: "Budget Based",
    description: "Match lead budget with executive expertise",
    status: "Active",
    icon: WalletCards,
    tone: "bg-emerald-50 text-success",
  },
  {
    id: "project",
    title: "Project Based",
    description: "Assign based on project specialization",
    status: "Active",
    icon: BriefcaseBusiness,
    tone: "bg-sky-50 text-info",
  },
  {
    id: "capacity",
    title: "Capacity Distribution",
    description: "Use team capacity and workload to assign",
    status: "Active",
    icon: Sparkles,
    tone: "bg-violet-50 text-violet-600",
  },
];

export const distributionStrategyUsage: DistributionStrategyUsage[] = [
  { label: "Round Robin", value: 482, percent: "38.6%", color: "#2563eb" },
  { label: "Location Based", value: 349, percent: "28.0%", color: "#10b981" },
  { label: "Capacity", value: 228, percent: "18.3%", color: "#8b5cf6" },
  { label: "Budget Based", value: 112, percent: "9.0%", color: "#f97316" },
  { label: "Project Based", value: 77, percent: "6.1%", color: "#ef4444" },
];

export const leadAssignmentFunnel: LeadAssignmentFunnelStage[] = [
  {
    label: "Incoming Leads",
    value: "1,367",
    helper: "100%",
    width: "100%",
    color: "#0f6bff",
  },
  {
    label: "Eligible Leads",
    value: "1,310",
    helper: "95.8%",
    width: "86%",
    color: "#10b981",
  },
  {
    label: "Rule Matched",
    value: "1,280",
    helper: "93.6%",
    width: "72%",
    color: "#f59e0b",
  },
  {
    label: "Distributed",
    value: "1,248",
    helper: "91.2%",
    width: "58%",
    color: "#7c3aed",
  },
  {
    label: "Failed / Pending",
    value: "62",
    helper: "4.5%",
    width: "34%",
    color: "#fb7185",
  },
];

export const realTimeDistributionActivity: DistributionActivity[] = [
  {
    leadId: "L-12568",
    assigneeName: "Vikram Singh",
    time: "10:30:45 AM",
    status: "assigned",
    icon: Sparkles,
    tone: "bg-green-50 text-success",
  },
  {
    leadId: "L-12567",
    assigneeName: "Neha Joshi",
    time: "10:30:32 AM",
    status: "assigned",
    icon: MapPinned,
    tone: "bg-green-50 text-success",
  },
  {
    leadId: "L-12566",
    assigneeName: "Rahul Sharma",
    time: "10:30:18 AM",
    status: "assigned",
    icon: Target,
    tone: "bg-blue-50 text-info",
  },
  {
    leadId: "L-12565",
    assigneeName: "Priya Gupta",
    time: "10:30:05 AM",
    status: "assigned",
    icon: UserRoundCheck,
    tone: "bg-red-50 text-red-500",
  },
  {
    leadId: "L-12564",
    assigneeName: "No eligible executive",
    time: "10:29:50 AM",
    status: "failed",
    icon: FileWarning,
    tone: "bg-red-50 text-red-500",
  },
];

export const executiveWorkloadRows: ExecutiveWorkloadRow[] = [
  {
    id: "vikram-singh",
    name: "Vikram Singh",
    role: "Pre Sales Executive",
    activeLeads: 85,
    capacity: 100,
    utilization: 85,
    status: "Optimal",
    performanceScore: 92,
    avatarUrl: avatar("Vikram Singh"),
  },
  {
    id: "neha-joshi",
    name: "Neha Joshi",
    role: "Pre Sales Executive",
    activeLeads: 78,
    capacity: 100,
    utilization: 78,
    status: "Optimal",
    performanceScore: 89,
    avatarUrl: avatar("Neha Joshi"),
  },
  {
    id: "rahul-sharma",
    name: "Rahul Sharma",
    role: "Pre Sales Executive",
    activeLeads: 92,
    capacity: 100,
    utilization: 92,
    status: "High",
    performanceScore: 94,
    avatarUrl: avatar("Rahul Sharma"),
  },
  {
    id: "priya-gupta",
    name: "Priya Gupta",
    role: "Pre Sales Executive",
    activeLeads: 66,
    capacity: 100,
    utilization: 66,
    status: "Optimal",
    performanceScore: 87,
    avatarUrl: avatar("Priya Gupta"),
  },
  {
    id: "amit-kumar",
    name: "Amit Kumar",
    role: "Pre Sales Executive",
    activeLeads: 96,
    capacity: 100,
    utilization: 96,
    status: "High",
    performanceScore: 91,
    avatarUrl: avatar("Amit Kumar"),
  },
  {
    id: "pooja-sharma",
    name: "Pooja Sharma",
    role: "Pre Sales Executive",
    activeLeads: 45,
    capacity: 100,
    utilization: 45,
    status: "Low",
    performanceScore: 83,
    avatarUrl: avatar("Pooja Sharma"),
  },
];

export const distributionSettingsSnapshot: DistributionSetting[] = [
  { label: "Default Strategy", value: "Round Robin", icon: RotateCcw },
  { label: "Failover Strategy", value: "Workload Based", icon: ShieldCheck },
  { label: "Reassignment Time", value: "30 Minutes", icon: Clock3 },
  {
    label: "Max Leads per Executive",
    value: "100 Leads",
    icon: BriefcaseBusiness,
  },
  { label: "Working Hours", value: "09:00 AM - 07:00 PM", icon: CalendarCheck },
  {
    label: "Exclude on Leave",
    value: "Enabled",
    icon: UserRoundCheck,
    enabled: true,
  },
];

export const distributionRecommendations: DistributionRecommendation[] = [
  {
    title: "Suggestion",
    description:
      "Neha Joshi has 22% lower workload. Consider routing more leads to balance distribution.",
    icon: Sparkles,
    tone: "bg-green-50 text-success",
  },
  {
    title: "High Demand Area",
    description:
      "Leads from Andheri West are 32% more this week. Increase allocation for this location.",
    icon: UsersRound,
    tone: "bg-blue-50 text-info",
  },
  {
    title: "Best Performing Strategy",
    description:
      "Capacity distribution has 18% higher conversion rate than other strategies.",
    icon: Target,
    tone: "bg-orange-50 text-primary",
  },
  {
    title: "Rule Optimization",
    description:
      "Consider enabling Budget Based rule during high-value lead hours.",
    icon: LocateFixed,
    tone: "bg-violet-50 text-violet-600",
  },
];

export const workloadSegments: WorkloadSegment[] = [
  { label: "Low (0-10)", users: 5, color: "#16a34a" },
  { label: "Medium (11-20)", users: 8, color: "#f97316" },
  { label: "High (21-30)", users: 7, color: "#2563eb" },
  { label: "Overload (31+)", users: 4, color: "#e11d48" },
];

export const aiInsights: AssignmentInsight[] = [
  {
    title: "High Success Prediction",
    helper: "Leads likely to convert",
    value: "78%",
    icon: Gauge,
    tone: "bg-green-50 text-success",
  },
  {
    title: "Better Response Time",
    helper: "Faster follow-up expected",
    value: "65%",
    icon: CalendarCheck,
    tone: "bg-orange-50 text-primary",
  },
  {
    title: "Optimized Workload",
    helper: "Balanced assignment",
    value: "92%",
    icon: ShieldCheck,
    tone: "bg-blue-50 text-info",
  },
  {
    title: "Higher Productivity",
    helper: "Expected productivity boost",
    value: "87%",
    icon: Target,
    tone: "bg-amber-50 text-amber-600",
  },
];

export const recentAssignments: RecentAssignment[] = [
  { time: "10:25 AM", leadName: "Rahul Sharma", assigneeName: "Sneha Iyer" },
  { time: "10:18 AM", leadName: "Neha Kapoor", assigneeName: "Aditya Patil" },
  { time: "10:12 AM", leadName: "Vikram Singh", assigneeName: "Pooja Sharma" },
  { time: "09:55 AM", leadName: "Anjali Mehta", assigneeName: "Rohit Verma" },
];

export const recommendationChecklist = [
  "High performance Pre Sales Executive user",
  "Expert in Mumbai & Navi Mumbai",
  "Good conversion rate (88%)",
  "Available capacity (8 Leads)",
];

export const assignmentIcons = {
  sparkles: Sparkles,
  wallet: WalletCards,
  badgeCheck: BadgeCheck,
};
