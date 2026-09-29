import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  HelpCircle,
  Mail,
  UsersRound,
} from "lucide-react";

import type {
  ColumnMappingRow,
  DonutSegment,
  DuplicateRecordRow,
  FilePreviewRow,
  ImportTip,
  SidebarActionCard,
  UploadStep,
  ValidationErrorRow,
} from "./bulkUploadTypes";

export const uploadSteps: UploadStep[] = [
  { id: 1, title: "Upload File", helper: "Upload your Excel/CSV file" },
  { id: 2, title: "Map Fields", helper: "Map columns with CRM fields" },
  { id: 3, title: "Validate Data", helper: "Check for errors & duplicates" },
  { id: 4, title: "Preview & Confirm", helper: "Review and confirm data" },
  { id: 5, title: "Import Leads", helper: "Import leads to CRM" },
];

export const mappingRows: ColumnMappingRow[] = [
  {
    id: "added-date",
    fileColumn: "Added Date",
    crmField: "Added Date",
    sampleData: "14 Jul 2026",
  },
  {
    id: "last-update",
    fileColumn: "Last Update",
    crmField: "Last Update",
    sampleData: "16 Jul 2026",
  },
  {
    id: "full-name",
    fileColumn: "Full Name",
    crmField: "Lead Name",
    sampleData: "Rahul Sharma",
  },
  {
    id: "mobile",
    fileColumn: "Mobile Number",
    crmField: "Mobile Number",
    sampleData: "9876543210",
  },
  {
    id: "email",
    fileColumn: "Email Address",
    crmField: "Email Address",
    sampleData: "rahul.sharma@email.com",
  },
  {
    id: "property",
    fileColumn: "Property Type",
    crmField: "Property Type",
    sampleData: "2 BHK Apartment",
  },
  {
    id: "budget",
    fileColumn: "Budget",
    crmField: "Budget Range",
    sampleData: "1 - 1.5 Cr",
  },
  {
    id: "location",
    fileColumn: "Preferred Location",
    crmField: "Preferred Location",
    sampleData: "Andheri, Mumbai",
  },
  {
    id: "source",
    fileColumn: "Lead Source",
    crmField: "Lead Source",
    sampleData: "MagicBricks",
  },
  {
    id: "status",
    fileColumn: "Lead Status",
    crmField: "Lead Status",
    sampleData: "New Lead",
  },
  {
    id: "lead-type",
    fileColumn: "Lead Type",
    crmField: "Lead Type",
    sampleData: "Warm",
  },
  {
    id: "project",
    fileColumn: "Project Name",
    crmField: "Project",
    sampleData: "Sunset Residency",
  },
  {
    id: "remarks",
    fileColumn: "Remarks",
    crmField: "Remarks / Notes",
    sampleData: "Interested in premium project",
  },
  {
    id: "empty",
    fileColumn: "--Select Column--",
    crmField: "--Select Field--",
    sampleData: "--",
  },
];

export const filePreviewRows: FilePreviewRow[] = [
  {
    name: "Rahul Sharma",
    mobile: "9876543210",
    email: "rahul.sharma@email.com",
  },
  { name: "Neha Kapoor", mobile: "9812345678", email: "neha.kapoor@gmail.com" },
  {
    name: "Vikram Singh",
    mobile: "9823456789",
    email: "vikram.singh@email.com",
  },
  {
    name: "Anjali Mehta",
    mobile: "9834567890",
    email: "anjali.mehta@gmail.com",
  },
  {
    name: "Karan Patel",
    mobile: "9845678901",
    email: "karan.patel@hotmail.com",
  },
];

export const validationErrors: ValidationErrorRow[] = [
  {
    row: 8,
    fieldName: "Mobile Number",
    issue: "Invalid mobile number (less than 10 digits)",
    foundValue: "98765",
  },
  {
    row: 14,
    fieldName: "Email Address",
    issue: "Invalid email format",
    foundValue: "neha@.com",
  },
  {
    row: 23,
    fieldName: "Budget",
    issue: "Invalid budget format",
    foundValue: "One Crore",
  },
];

export const duplicateRecords: DuplicateRecordRow[] = [
  {
    duplicateLead: "Rahul Sharma",
    existingLead: "Rahul Sharma",
    matchScore: "95%",
  },
  { duplicateLead: "Neha Kapoor", existingLead: "Neha K.", matchScore: "92%" },
  {
    duplicateLead: "Vikram Singh",
    existingLead: "Vikram S.",
    matchScore: "90%",
  },
];

export const importSummarySegments: DonutSegment[] = [
  { label: "Valid Records", value: 85, color: "#0f9f5f" },
  { label: "Duplicates Found", value: 25, color: "#ff6b00" },
  { label: "Errors Found", value: 10, color: "#ef4444" },
  { label: "Empty Rows", value: 5, color: "#94a3b8" },
];

export const qualitySegments: DonutSegment[] = [
  { label: "Valid Data", value: 85, helper: "68%", color: "#22a447" },
  { label: "Needs Attention", value: 30, helper: "24%", color: "#ff9f0a" },
  { label: "Poor Data", value: 10, helper: "8%", color: "#ef4444" },
];

export const importTips: ImportTip[] = [
  { label: "Use the sample file for best results" },
  { label: "Mandatory fields: Name, Mobile Number" },
  { label: "Mobile number should be 10 digits" },
  { label: "Avoid special characters in the data" },
  { label: "Ensure proper date format (DD/MM/YYYY)" },
];

export const sidebarActionCards: SidebarActionCard[] = [
  {
    title: "Import Summary",
    helper: "125 total records",
    icon: FileSpreadsheet,
    tone: "bg-green-50 text-success",
  },
  {
    title: "Data Quality Score",
    helper: "72% good",
    icon: CheckCircle2,
    tone: "bg-blue-50 text-info",
  },
  {
    title: "Duplicate Check",
    helper: "25 duplicate records",
    icon: UsersRound,
    tone: "bg-orange-50 text-primary",
  },
  {
    title: "Validation Errors",
    helper: "10 errors found",
    icon: AlertCircle,
    tone: "bg-red-50 text-red-500",
  },
  {
    title: "Need Help?",
    helper: "Import guidelines",
    icon: HelpCircle,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    title: "Email Report",
    helper: "Send import report",
    icon: Mail,
    tone: "bg-blue-50 text-blue-600",
  },
];
