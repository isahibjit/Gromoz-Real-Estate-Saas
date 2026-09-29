import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  HelpCircle,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";

import type {
  OwnerWorkload,
  ReassignFeature,
  RecentReassignment,
  RuleItem,
  WorkflowStep,
} from "./reassignLeadsTypes";
import { leadRows } from "../all/allLeadsData";

export const reassignFeatureCards: ReassignFeature[] = [
  {
    title: "Bulk Reassign",
    helper: "Reassign multiple leads at once",
    icon: UsersRound,
    tone: "bg-green-50 text-success",
  },
  {
    title: "AI Suggested Assignee",
    helper: "Get AI recommendations",
    icon: UserRoundPlus,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    title: "Approval Workflow",
    helper: "Reassignment requires approval",
    icon: ShieldCheck,
    tone: "bg-orange-50 text-primary",
    badge: "Active",
  },
  {
    title: "Smart Workload Balance",
    helper: "Auto balance team workload",
    icon: RefreshCw,
    tone: "bg-blue-50 text-blue-700",
  },
];

export const currentOwnerWorkload: OwnerWorkload = {
  name: "Rahul Sharma",
  role: "Current Owner",
  avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Rahul%20Sharma",
  totalLeads: 100,
  rows: [
    { label: "New", value: 20, percent: "20%", color: "#16a34a" },
    { label: "Follow-Up", value: 35, percent: "35%", color: "#f97316" },
    { label: "Site Visit", value: 20, percent: "20%", color: "#2563eb" },
    { label: "Negotiation", value: 15, percent: "15%", color: "#ef4444" },
    { label: "Other", value: 10, percent: "10%", color: "#8b5cf6" },
  ],
};

export const newOwnerWorkload: OwnerWorkload = {
  name: "Vikram Singh",
  role: "New Owner",
  avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Vikram%20Singh",
  totalLeads: 67,
  rows: [
    { label: "New", value: 18, percent: "27%", color: "#16a34a" },
    { label: "Follow-Up", value: 22, percent: "33%", color: "#f97316" },
    { label: "Site Visit", value: 15, percent: "22%", color: "#2563eb" },
    { label: "Negotiation", value: 7, percent: "10%", color: "#ef4444" },
    { label: "Other", value: 5, percent: "8%", color: "#8b5cf6" },
  ],
};

export const approvalSteps: WorkflowStep[] = [
  {
    id: 1,
    title: "Submitted",
    helper: "Amit Kumar - 20 May 2025, 10:30 AM",
    status: "done",
  },
  {
    id: 2,
    title: "Manager Approval (Pending)",
    helper: "Neeraj Mehta - Regional Manager",
    status: "active",
  },
  {
    id: 3,
    title: "Reassignment Execution",
    helper: "Will execute after approval",
    status: "pending",
  },
  {
    id: 4,
    title: "Notification",
    helper: "Both owners will be notified",
    status: "pending",
  },
];

export const suggestedReasons = [
  "Current workload: 42% (Low)",
  "High lead conversion rate: 28%",
  "Expert in 2 BHK & 3 BHK segments",
  "Located in same area (Andheri, Mumbai)",
  "Responds fast: Avg 4.2 min",
];

export const reassignmentRules: RuleItem[] = [
  {
    title: "Leads assigned within last 24 hours",
    helper: "Cannot be reassigned",
    icon: Clock3,
  },
  {
    title: "Ongoing site visits",
    helper: "Will not be moved",
    icon: ClipboardCheck,
  },
  {
    title: "Leads in negotiation",
    helper: "Require extra approval",
    icon: ShieldCheck,
  },
  {
    title: "Maximum leads per owner",
    helper: "500 leads limit",
    icon: UsersRound,
  },
];

export const recentReassignments: RecentReassignment[] = [
  {
    date: "19 May 2025, 04:25 PM",
    leads: "15 Leads",
    from: "Rahul Sharma",
    fromAvatarUrl:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Rahul%20Sharma",
    to: "Pooja Sharma",
    toAvatarUrl:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Pooja%20Sharma",
    reason: "Workload balancing",
    status: "Completed",
    approvedBy: "Neeraj Mehta",
    approvedByAvatarUrl:
      "https://api.dicebear.com/7.x/notionists/svg?seed=Neeraj%20Mehta",
  },
];

export const ownerOptions = [
  { id: "rahul-sharma", label: "Rahul Sharma" },
  { id: "vikram-singh", label: "Vikram Singh" },
  { id: "pooja-sharma", label: "Pooja Sharma" },
  { id: "sneha-iyer", label: "Sneha Iyer" },
];

export const reasonOptions = [
  { id: "workload", label: "Workload balancing" },
  { id: "location", label: "Location expertise" },
  { id: "availability", label: "Availability" },
  { id: "performance", label: "Performance match" },
];

const projectByLeadId: Record<string, string> = {
  TR001245: "Ocean Heights",
  TR001244: "Skyline Residency",
  TR001243: "Green Meadows",
  TR001242: "Park View",
  TR001241: "Urban Nest",
  TR001240: "Palm Springs",
  TR001239: "Lodha Crown",
  TR001238: "Runwal Bliss",
};

export const selectableLeads = leadRows.map((lead) => ({
  id: lead.id,
  name: lead.name,
  mobile: lead.mobile,
  project: projectByLeadId[lead.id] ?? lead.propertyType,
  stage: lead.stage,
  owner: lead.assignedTo,
}));

export const supportActions = [
  { label: "Live Chat", icon: HelpCircle },
  { label: "+91 22 4567 8900", icon: BadgeCheck },
];

export const successNotice = {
  icon: CheckCircle2,
  title: "Great! This reassignment will keep workloads balanced.",
  helper: "Vikram will have 92 leads (74% capacity) after reassignment.",
};
