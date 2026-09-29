import {
  BriefcaseBusiness,
  CalendarPlus2,
  ClipboardCheck,
  Database,
  FolderKanban,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Settings,
  UsersRound,
} from "lucide-react";

import { sidebarItems } from "../../dashboard/dashboardData";
import { getProjectOptions } from "../../projects/projectsData";
import type {
  AddLeadFormData,
  AssigneeOption,
  QuickActionItem,
  RecommendedProject,
  SelectOption,
  SummaryMetric,
} from "./addLeadTypes";

export const addLeadSidebarItems = sidebarItems;

export const countryCodeOptions: SelectOption[] = [
  { id: "+91", label: "+91" },
  { id: "+1", label: "+1" },
  { id: "+971", label: "+971" },
];

export const genderOptions: SelectOption[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
];

export const propertyTypeOptions: SelectOption[] = [
  { id: "apartment", label: "Apartment" },
  { id: "villa", label: "Villa" },
  { id: "plot", label: "Plot" },
  { id: "commercial", label: "Commercial" },
];

export const configurationOptions: SelectOption[] = [
  { id: "1 BHK", label: "1 BHK" },
  { id: "2 BHK", label: "2 BHK" },
  { id: "3 BHK", label: "3 BHK" },
  { id: "4 BHK", label: "4 BHK" },
  { id: "5 BHK", label: "5 BHK" },
  { id: "Studio", label: "Studio" },
  { id: "Penthouse", label: "Penthouse" },
];

export const locationOptions: SelectOption[] = [
  { id: "andheri-east", label: "Andheri East, Mumbai" },
  { id: "thane-west", label: "Thane West, Mumbai" },
  { id: "kalyan-west", label: "Kalyan West, Thane" },
  { id: "powai", label: "Powai, Mumbai" },
];

export const zoneOptions: SelectOption[] = [
  { id: "Harbour Line", label: "Harbour Line" },
  { id: "Eastern", label: "Eastern" },
  { id: "Western", label: "Western" },
  { id: "East", label: "East" },
  { id: "West", label: "West" },
  { id: "Navi Mumbai", label: "Navi Mumbai" },
];

export const budgetUnitOptions: SelectOption[] = [
  { id: "lakh", label: "Lakh" },
  { id: "crore", label: "CR" },
  { id: "thousand", label: "Thousand" },
];

export const budgetRangeOptions: SelectOption[] = [
  { id: "50 Lakh - 75 Lakh", label: "50 Lakh - 75 Lakh" },
  { id: "75 Lakh - 1 Cr", label: "75 Lakh - 1 Cr" },
  { id: "1 Cr - 1.5 Cr", label: "1 Cr - 1.5 Cr" },
  { id: "1.5 Cr - 2 Cr", label: "1.5 Cr - 2 Cr" },
  { id: "2 Cr - 3 Cr", label: "2 Cr - 3 Cr" },
  { id: "3 Cr+", label: "3 Cr+" },
];

export const projectOptions: SelectOption[] = getProjectOptions();

export const possessionTimelineOptions: SelectOption[] = [
  { id: "immediate", label: "Immediate" },
  { id: "3months", label: "Within 3 Months" },
  { id: "6months", label: "Within 6 Months" },
  { id: "12months", label: "Within 12 Months" },
];

export const carpetAreaRangeOptions: SelectOption[] = [
  { id: "400 - 600 sq ft", label: "400 - 600 sq ft" },
  { id: "600 - 800 sq ft", label: "600 - 800 sq ft" },
  { id: "800 - 1000 sq ft", label: "800 - 1000 sq ft" },
  { id: "1000 - 1500 sq ft", label: "1000 - 1500 sq ft" },
  { id: "1500 - 2000 sq ft", label: "1500 - 2000 sq ft" },
  { id: "2000+ sq ft", label: "2000+ sq ft" },
];

export const purposeOptions: SelectOption[] = [
  { id: "self-use", label: "Self Use" },
  { id: "investment", label: "Investment" },
  { id: "rental", label: "Rental Income" },
];

export const leadSourceOptions: SelectOption[] = [
  { id: "magicbricks", label: "MagicBricks" },
  { id: "99acres", label: "99acres" },
  { id: "google-ads", label: "Google Ads" },
  { id: "referral", label: "Referral" },
  { id: "walk-in", label: "Walk-in" },
];

export const campaignOptions: SelectOption[] = [
  { id: "may-digital", label: "May Digital Campaign" },
  { id: "premium-launch", label: "Premium Launch Campaign" },
  { id: "summer-drive", label: "Summer Walk-in Drive" },
];

export const stageOptions: SelectOption[] = [
  { id: "new-lead", label: "New Lead" },
  { id: "qualified", label: "Qualified" },
  { id: "site-visit", label: "Site Visit" },
];

export const statusOptions: SelectOption[] = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "hot", label: "Hot" },
];

export const priorityOptions: SelectOption[] = [
  { id: "high", label: "High" },
  { id: "medium", label: "Medium" },
  { id: "low", label: "Low" },
];

export const interestLevelOptions: SelectOption[] = [
  { id: "high", label: "High Interest" },
  { id: "medium", label: "Medium Interest" },
  { id: "low", label: "Low Interest" },
];

export const heardAboutUsOptions: SelectOption[] = [
  { id: "friend", label: "Friend / Family" },
  { id: "social", label: "Social Media" },
  { id: "broker", label: "Broker" },
  { id: "search", label: "Search Engine" },
];

export const followUpTypeOptions: SelectOption[] = [
  { id: "call", label: "Phone Call" },
  { id: "site-visit", label: "Site Visit" },
  { id: "meeting", label: "Meeting" },
  { id: "whatsapp", label: "WhatsApp" },
];

export const referrerOptions: SelectOption[] = [
  { id: "none", label: "No Referrer" },
  { id: "priya-shah", label: "Priya Shah" },
  { id: "amit-kumar", label: "Amit Kumar" },
];

export const assigneeOptions: AssigneeOption[] = [
  {
    id: "rahul-mehta",
    name: "Rahul Mehta",
    role: "Manager",
    initials: "RM",
    avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Rahul%20Mehta",
  },
  {
    id: "sneha-iyer",
    name: "Sneha Iyer",
    role: "Pre Sales Executive",
    initials: "SI",
    avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Sneha%20Iyer",
  },
  {
    id: "amit-joshi",
    name: "Amit Joshi",
    role: "Sales Executive",
    initials: "AJ",
    avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Amit%20Joshi",
  },
  {
    id: "priya-shah",
    name: "Priya Shah",
    role: "Manager",
    initials: "PS",
    avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Priya%20Shah",
  },
  {
    id: "neha-verma",
    name: "Neha Verma",
    role: "Pre Sales Executive",
    initials: "NV",
    avatarUrl: "https://api.dicebear.com/7.x/notionists/svg?seed=Neha%20Verma",
  },
];

export const defaultAddLeadFormData: AddLeadFormData = {
  leadName: "",
  mobileNumber: "",
  mobileCountryCode: "+91",
  alternateNumber: "",
  alternateCountryCode: "+91",
  emailAddress: "",
  gender: "",
  propertyType: "",
  configuration: "",
  budgetRange: "",
  minBudget: "",
  minBudgetUnit: "crore",
  maxBudget: "",
  maxBudgetUnit: "crore",
  preferredLocation: "",
  preferredProject: "",
  possessionTimeline: "",
  carpetAreaRange: "",
  purpose: "",
  minArea: "",
  maxArea: "",
  zone: "",
  leadSource: "",
  campaign: "",
  leadStage: "",
  leadStatus: "",
  priority: "",
  interestLevel: "",
  heardAboutUs: "",
  remarks: "",
  managerId: "",
  telecallerId: "",
  fieldExecutiveId: "",
  referenceBy: "",
  assignDate: "",
  autoAssignFollowUp: false,
  followUpDate: "",
  followUpTime: "",
  followUpType: "",
};

export const recommendedProjects: RecommendedProject[] = [
  {
    id: "ocean-heights",
    name: "Ocean Heights",
    configuration: "2, 3 & 4 BHK Apartments",
    location: "Andheri East, Mumbai",
    matchScore: 92,
    imageTone: "from-slate-300 via-slate-100 to-slate-400",
  },
  {
    id: "skyline-enclave",
    name: "Skyline Enclave",
    configuration: "2 & 3 BHK Apartments",
    location: "Goregaon (E), Mumbai",
    matchScore: 85,
    imageTone: "from-[#cbd6e6] via-slate-100 to-[#9fb6d1]",
  },
  {
    id: "lakeview-residency",
    name: "Lakeview Residency",
    configuration: "1, 2 & 3 BHK Apartments",
    location: "Powai, Mumbai",
    matchScore: 78,
    imageTone: "from-[#c4d7ce] via-slate-50 to-[#8eb39c]",
  },
];

export const leadSummaryMetrics: SummaryMetric[] = [
  { label: "Expected Conversion Probability", value: "72%" },
  { label: "Estimated Revenue Potential", value: "INR 1.25 Cr" },
  { label: "Lead Temperature", value: "Hot", tone: "hot" },
  { label: "Last Contact", value: "Not Applicable" },
  { label: "Engagement Score", value: "65%" },
];

export const quickActionItems: QuickActionItem[] = [
  { id: "follow-up", label: "Schedule Follow-up", icon: CalendarPlus2 },
  { id: "site-visit", label: "Schedule Site Visit", icon: MapPin },
  { id: "add-task", label: "Add Task", icon: ClipboardCheck },
  {
    id: "whatsapp",
    label: "Send WhatsApp",
    icon: MessageCircle,
    tone: "whatsapp",
  },
  { id: "email", label: "Send Email", icon: Mail },
];

export const aiLeadSuggestion = {
  title: "Lead Quality Score",
  score: 88,
  status: "High Quality Lead",
  description:
    "Lead score is calculated from active Lead Master score weights.",
};
