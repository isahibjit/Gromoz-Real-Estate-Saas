import { Bell, Check, LockKeyhole } from "lucide-react";

import type {
  ActivityTrendPoint,
  ChangeLogItem,
  EditLeadFormData,
  EditLeadSelectOption,
  WorkflowStep,
} from "./editLeadTypes";

export const editLeadInitialData: EditLeadFormData = {
  leadName: "Rahul Sharma",
  mobileNumber: "98765 43210",
  mobileCountryCode: "+91",
  alternateNumber: "91234 56789",
  alternateCountryCode: "+91",
  emailAddress: "rahul.sharma@gmail.com",
  gender: "male",
  occupation: "business-owner",
  annualIncome: "25-30-lakh",
  maritalStatus: "married",
  propertyType: "2-bhk-apartment",
  configuration: "2 BHK",
  minBudget: "1",
  minBudgetUnit: "crore",
  maxBudget: "1.5",
  maxBudgetUnit: "crore",
  preferredLocation: "andheri-goregaon-malad",
  preferredProject: "ocean-heights",
  possessionTimeline: "within-6-months",
  purpose: "",
  minArea: "800",
  maxArea: "1000",
  floorPreference: "any-floor",
  amenities: ["Parking", "Gym", "Swimming Pool"],
  leadSource: "magicbricks",
  campaign: "mb-summer-offer",
  leadStage: "interested",
  leadStatus: "active",
  priority: "high",
  interestLevel: "high",
  heardAboutUs: "digital-ad-campaign",
  remarks: "Interested in premium residential projects near metro.",
  managerId: "rahul-mehta",
  telecallerId: "sneha-iyer",
  fieldExecutiveId: "amit-joshi",
  referenceBy: "",
  assignDate: "2025-05-20",
  autoAssignFollowUp: true,
  followUpDate: "2025-05-21",
  followUpTime: "11:00 AM",
  followUpType: "call",
};

export const editLeadOptions: Record<string, EditLeadSelectOption[]> = {
  gender: [
    { id: "male", label: "Male" },
    { id: "female", label: "Female" },
    { id: "other", label: "Other" },
  ],
  occupation: [
    { id: "business-owner", label: "Business Owner" },
    { id: "salaried", label: "Salaried" },
    { id: "self-employed", label: "Self Employed" },
  ],
  annualIncome: [
    { id: "25-30-lakh", label: "₹25 - ₹30 Lakh" },
    { id: "30-50-lakh", label: "₹30 - ₹50 Lakh" },
  ],
  maritalStatus: [
    { id: "married", label: "Married" },
    { id: "single", label: "Single" },
  ],
  propertyType: [
    { id: "2-bhk-apartment", label: "2 BHK Apartment" },
    { id: "3-bhk-apartment", label: "3 BHK Apartment" },
    { id: "villa", label: "Villa" },
  ],
  preferredLocation: [
    { id: "andheri-goregaon-malad", label: "Andheri, Goregaon, Malad" },
    { id: "powai", label: "Powai, Mumbai" },
  ],
  preferredProject: [],
  possessionTimeline: [
    { id: "within-6-months", label: "Within 6 Months" },
    { id: "within-12-months", label: "Within 12 Months" },
  ],
  floorPreference: [
    { id: "any-floor", label: "Any Floor" },
    { id: "higher-floor", label: "Higher Floor" },
  ],
  leadSource: [
    { id: "magicbricks", label: "MagicBricks" },
    { id: "99acres", label: "99Acres" },
  ],
  campaign: [
    { id: "mb-summer-offer", label: "MB Summer Offer" },
    { id: "digital-campaign", label: "Digital Campaign" },
  ],
  leadStage: [
    { id: "interested", label: "Interested" },
    { id: "new-lead", label: "New Lead" },
  ],
  leadStatus: [
    { id: "active", label: "Active" },
    { id: "new", label: "New" },
  ],
  priority: [
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
  ],
  interestLevel: [
    { id: "high", label: "High" },
    { id: "medium", label: "Medium" },
  ],
  heardAboutUs: [
    { id: "digital-ad-campaign", label: "Digital Ad Campaign" },
    { id: "referral", label: "Referral" },
  ],
  followUpType: [
    { id: "call", label: "Call" },
    { id: "whatsapp", label: "WhatsApp" },
  ],
};

export const changeLogItems: ChangeLogItem[] = [
  {
    id: "1",
    timestamp: "20 May 2025, 10:25 AM",
    user: "Amit Kumar",
    description: "Budget updated from ₹80 Lakh - ₹1.2 Cr to ₹1 Cr - ₹1.5 Cr",
    tone: "orange",
  },
  {
    id: "2",
    timestamp: "20 May 2025, 10:20 AM",
    user: "Sneha Iyer",
    description: "Lead status changed from New to Active",
    tone: "green",
  },
  {
    id: "3",
    timestamp: "19 May 2025, 04:15 PM",
    user: "Rahul Mehta",
    description: "Lead assigned to Sneha Iyer",
    tone: "orange",
  },
  {
    id: "4",
    timestamp: "19 May 2025, 03:40 PM",
    user: "System",
    description: "Lead created via MagicBricks",
    tone: "gray",
  },
];

export const activityTrendData: ActivityTrendPoint[] = [
  { date: "15 May", score: 65 },
  { date: "16 May", score: 78 },
  { date: "17 May", score: 60 },
  { date: "18 May", score: 85 },
  { date: "19 May", score: 92 },
  { date: "20 May", score: 70 },
  { date: "Today", score: 96 },
];

export const workflowSteps: WorkflowStep[] = [
  {
    id: "edit",
    label: "Edit",
    status: "Completed",
    icon: Check,
    tone: "success",
  },
  {
    id: "review",
    label: "Review",
    status: "Not Required",
    icon: LockKeyhole,
    tone: "neutral",
  },
  {
    id: "approve",
    label: "Approve",
    status: "Not Required",
    icon: LockKeyhole,
    tone: "neutral",
  },
  {
    id: "notify",
    label: "Notify",
    status: "Pending",
    icon: Bell,
    tone: "warning",
  },
];
