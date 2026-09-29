import {
  CalendarDays,
  Clock,
  Cloud,
  BedDouble,
  Flag,
  MapPin,
  ShieldCheck,
  Star,
  Tags,
  Thermometer,
  TrendingUp,
  WalletCards,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type LeadMasterCategoryId =
  | "stage"
  | "status"
  | "source"
  | "priority"
  | "temperature"
  | "lead_budget_range"
  | "project_configuration"
  | "project_location"
  | "lost_reason"
  | "followup_type"
  | "followup_status"
  | "tag"
  | "rating";

export type LeadMasterStatusType = "System Default" | "Custom";

export type LeadMasterColumnKind =
  | "index"
  | "text"
  | "badge"
  | "color"
  | "toggle"
  | "actions";

export type LeadMasterFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "toggle"
  | "color";

export interface MasterCategoryDefinition {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
}

export interface MasterCategory extends MasterCategoryDefinition {
  count: number;
}

export interface LeadMasterBaseRow {
  id: string;
  sortOrder: number;
  name: string;
  code: string;
  description: string;
  category?: string;
  type?: string;
  status?: string;
  statusType: LeadMasterStatusType;
  isActive: boolean;
  isSystemDefault: boolean;
  defaultNextStage?: string;
  defaultNextStatus?: string;
  probability?: number;
  weight?: number;
  score?: number;
  pointsEnabled?: boolean;
  channel?: string;
  reasonCategory?: string;
  tagColor?: string;
  ratingValue?: number;
  displayColor?: string;
  expectedTime?: number;
  expectedTimeUnit?: string;
  icon?: string;
  triggerAction?: "NONE" | "CREATE_SITE_VISIT" | "CREATE_BOOKING" | string;
  allowFollowUp?: boolean;
  followUpNotificationEnabled?: boolean;
  followUpRenotifyMinutes?: number;
  autoAssignActive?: boolean;
  showInStatsCard?: boolean;
  showInFilterBar?: boolean;
}

export type LeadStageRow = LeadMasterBaseRow;
export type LeadStatusRow = LeadMasterBaseRow;

export interface LeadMasterColumn {
  key: string;
  label: string;
  kind: LeadMasterColumnKind;
  valueKey?: keyof LeadMasterBaseRow;
  badgeStyles?: Record<string, string>;
  emptyText?: string;
  align?: "left" | "right";
  suffix?: string;
}

export interface LeadMasterStat {
  key: "total" | "active" | "inactive" | "systemDefault";
  label: string;
}

export interface LeadMasterFormOption {
  label: string;
  value: string;
}

export interface LeadMasterFormField {
  key: keyof LeadMasterBaseRow;
  label: string;
  type: LeadMasterFieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  maxLength?: number;
  min?: number;
  max?: number;
  suffix?: string;
  options?: LeadMasterFormOption[];
}

export interface LeadMasterFilterState {
  search: string;
  activity: "all" | "active" | "inactive";
  statusType: "all" | "system_default" | "custom";
  categoryValue: string;
}

export interface LeadMasterConfig {
  category: MasterCategoryDefinition;
  totalLabel: string;
  addLabel: string;
  addTitle: string;
  editTitle: string;
  searchPlaceholder: string;
  helperText: string;
  columns: LeadMasterColumn[];
  stats: LeadMasterStat[];
  formFields: LeadMasterFormField[];
  filterLabel?: string;
  filterOptions?: LeadMasterFormOption[];
  supportsImport?: boolean;
}

const badgeStyles = {
  open: "bg-blue-50 text-blue-700",
  progress: "bg-amber-50 text-amber-700",
  closedWon: "bg-emerald-50 text-emerald-700",
  closedLost: "bg-rose-50 text-rose-700",
  system: "bg-violet-50 text-violet-700",
  custom: "bg-slate-100 text-slate-700",
  digital: "bg-cyan-50 text-cyan-700",
  offline: "bg-orange-50 text-orange-700",
  urgencyHigh: "bg-rose-50 text-rose-700",
  urgencyMedium: "bg-amber-50 text-amber-700",
  urgencyLow: "bg-emerald-50 text-emerald-700",
  hot: "bg-rose-50 text-rose-700",
  warm: "bg-amber-50 text-amber-700",
  cold: "bg-sky-50 text-sky-700",
  neutral: "bg-slate-100 text-slate-700",
  triggerNone: "bg-slate-100 text-slate-700",
  triggerVisit: "bg-violet-50 text-violet-700",
  triggerBooking: "bg-emerald-50 text-emerald-700",
  call: "bg-sky-50 text-sky-700",
  visit: "bg-emerald-50 text-emerald-700",
  meeting: "bg-violet-50 text-violet-700",
  message: "bg-cyan-50 text-cyan-700",
  positive: "bg-emerald-50 text-emerald-700",
  negative: "bg-rose-50 text-rose-700",
  pending: "bg-amber-50 text-amber-700",
  tag: "bg-indigo-50 text-indigo-700",
  rating: "bg-fuchsia-50 text-fuchsia-700",
};

const colorOptions: LeadMasterFormOption[] = [
  { label: "Blue", value: "#2563EB" },
  { label: "Green", value: "#059669" },
  { label: "Orange", value: "#EA580C" },
  { label: "Rose", value: "#E11D48" },
  { label: "Violet", value: "#7C3AED" },
  { label: "Slate", value: "#475569" },
];

export const masterCategoryDefinitions: MasterCategoryDefinition[] = [
  {
    id: "stage",
    name: "Lead Stage Master",
    icon: Flag,
    description: "Define and manage stages in your lead pipeline.",
  },
  {
    id: "status",
    name: "Lead Status Master",
    icon: ShieldCheck,
    description: "Define and manage statuses for leads.",
  },
  {
    id: "source",
    name: "Lead Source Master",
    icon: Cloud,
    description: "Manage the origin sources of your leads.",
  },
  {
    id: "priority",
    name: "Lead Priority Master",
    icon: TrendingUp,
    description: "Set priority levels for leads.",
  },
  {
    id: "temperature",
    name: "Lead Type Master",
    icon: Thermometer,
    description: "Manage lead types such as hot, warm, cold, and neutral.",
  },
  {
    id: "lead_budget_range",
    name: "Budget Range Master",
    icon: WalletCards,
    description: "Define requirement budget ranges.",
  },
  {
    id: "project_configuration",
    name: "Configuration Master",
    icon: BedDouble,
    description: "Define preferred configurations.",
  },
  {
    id: "project_location",
    name: "Location Master",
    icon: MapPin,
    description: "Define locations shared by lead requirements and projects.",
  },
  {
    id: "lost_reason",
    name: "Lost Reason Master",
    icon: XCircle,
    description: "Define reasons for losing a lead.",
  },
  {
    id: "followup_type",
    name: "Follow-up Type Master",
    icon: CalendarDays,
    description: "Define types of follow-ups.",
  },
  {
    id: "followup_status",
    name: "Follow-up Status Master",
    icon: Clock,
    description: "Track follow-up progress statuses.",
  },
  {
    id: "tag",
    name: "Lead Tag Master",
    icon: Tags,
    description: "Manage custom tags for leads.",
  },
  {
    id: "rating",
    name: "Lead Rating Master",
    icon: Star,
    description: "Define rating criteria for leads.",
  },
];

export const visibleMasterCategoryDefinitions =
  masterCategoryDefinitions.filter(
    (category) =>
      ![
        "stage",
        "lost_reason",
        "followup_type",
        "followup_status",
        "priority",
        "tag",
        "rating",
      ].includes(category.id),
  );

const baseStats = (totalLabel: string): LeadMasterStat[] => [
  { key: "total", label: totalLabel },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "systemDefault", label: "System Default" },
];

const rows = {
  stage: [
    {
      id: "stage-1",
      sortOrder: 1,
      name: "New",
      code: "NEW",
      description: "New lead captured from a source.",
      probability: 10,
      type: "Open",
      defaultNextStage: "Contacted",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#2563EB",
    },
    {
      id: "stage-2",
      sortOrder: 2,
      name: "Contacted",
      code: "CONT",
      description: "Initial outreach completed.",
      probability: 20,
      type: "Open",
      defaultNextStage: "Interested",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#2563EB",
    },
    {
      id: "stage-3",
      sortOrder: 3,
      name: "Interested",
      code: "INT",
      description: "Lead expressed active interest.",
      probability: 40,
      type: "Open",
      defaultNextStage: "Site Visit",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#059669",
    },
    {
      id: "stage-4",
      sortOrder: 4,
      name: "Site Visit",
      code: "VISIT",
      description: "Lead visited the project or property.",
      probability: 60,
      type: "In Progress",
      defaultNextStage: "Negotiation",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#EA580C",
    },
    {
      id: "stage-5",
      sortOrder: 5,
      name: "Negotiation",
      code: "NEG",
      description: "Pricing and terms are under discussion.",
      probability: 80,
      type: "In Progress",
      defaultNextStage: "Booking",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#7C3AED",
    },
    {
      id: "stage-6",
      sortOrder: 6,
      name: "Booking",
      code: "BOOK",
      description: "Lead has booked the unit.",
      probability: 100,
      type: "Closed Won",
      defaultNextStage: "—",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#059669",
      triggerAction: "CREATE_BOOKING",
    },
    {
      id: "stage-7",
      sortOrder: 7,
      name: "Lost",
      code: "LOST",
      description: "Lead was not converted.",
      probability: 0,
      type: "Closed Lost",
      defaultNextStage: "—",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#E11D48",
    },
  ],
  status: [
    {
      id: "status-1",
      sortOrder: 1,
      name: "New",
      code: "NEW",
      description: "Fresh lead awaiting first action.",
      category: "Open",
      defaultNextStatus: "Contacted",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#2563EB",
    },
    {
      id: "status-2",
      sortOrder: 2,
      name: "Contacted",
      code: "CONT",
      description: "Initial call or message completed.",
      category: "Open",
      defaultNextStatus: "Interested",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#2563EB",
    },
    {
      id: "status-3",
      sortOrder: 3,
      name: "Interested",
      code: "INT",
      description: "Lead is engaged and exploring options.",
      category: "Open",
      defaultNextStatus: "Site Visit",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#059669",
    },
    {
      id: "status-4",
      sortOrder: 4,
      name: "Follow-up Scheduled",
      code: "FUP",
      description: "Follow-up has been planned.",
      category: "In Progress",
      defaultNextStatus: "Site Visit",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#7C3AED",
      followUpNotificationEnabled: true,
      followUpRenotifyMinutes: 3,
    },
    {
      id: "status-5",
      sortOrder: 5,
      name: "Booked",
      code: "BOOK",
      description: "Lead converted into a booking.",
      category: "Closed",
      defaultNextStatus: "—",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#059669",
    },
    {
      id: "status-6",
      sortOrder: 6,
      name: "Lost",
      code: "LOST",
      description: "Lead marked as closed lost.",
      category: "Closed",
      defaultNextStatus: "—",
      statusType: "System Default",
      isActive: false,
      isSystemDefault: true,
      displayColor: "#E11D48",
      allowFollowUp: false,
      followUpNotificationEnabled: false,
      followUpRenotifyMinutes: 0,
    },
  ],
  source: [
    {
      id: "source-1",
      sortOrder: 1,
      name: "Website",
      code: "WEB",
      description: "Inbound enquiries from the marketing website.",
      category: "Digital",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "source-2",
      sortOrder: 2,
      name: "Facebook Ads",
      code: "FBADS",
      description: "Paid social campaign leads.",
      category: "Digital",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "source-3",
      sortOrder: 3,
      name: "Google Ads",
      code: "GADS",
      description: "Search and display advertising leads.",
      category: "Digital",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "source-4",
      sortOrder: 4,
      name: "Instagram",
      code: "IG",
      description: "Direct enquiries from Instagram campaigns.",
      category: "Digital",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "source-5",
      sortOrder: 5,
      name: "Referral",
      code: "REF",
      description: "Referred by customer or partner.",
      category: "Offline",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "source-6",
      sortOrder: 6,
      name: "Walk-in",
      code: "WALK",
      description: "Walk-in visits to the sales office.",
      category: "Offline",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "source-7",
      sortOrder: 7,
      name: "WhatsApp",
      code: "WA",
      description: "Leads initiated through WhatsApp.",
      category: "Digital",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "source-8",
      sortOrder: 8,
      name: "MagicBricks",
      code: "MB",
      description: "Marketplace portal leads from MagicBricks.",
      category: "Portal",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
  ],
  priority: [
    {
      id: "priority-1",
      sortOrder: 1,
      name: "Urgent",
      code: "URG",
      description: "Highest priority leads requiring immediate attention.",
      category: "Urgent",
      weight: 100,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#E11D48",
    },
    {
      id: "priority-2",
      sortOrder: 2,
      name: "High",
      code: "HIGH",
      description: "High-intent leads with strong conversion potential.",
      category: "High",
      weight: 80,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#EA580C",
    },
    {
      id: "priority-3",
      sortOrder: 3,
      name: "Medium",
      code: "MED",
      description: "Moderately engaged leads.",
      category: "Medium",
      weight: 50,
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#CA8A04",
    },
    {
      id: "priority-4",
      sortOrder: 4,
      name: "Low",
      code: "LOW",
      description: "Low urgency or longer nurture timeline.",
      category: "Low",
      weight: 20,
      statusType: "Custom",
      isActive: false,
      isSystemDefault: false,
      displayColor: "#059669",
    },
  ],
  temperature: [
    {
      id: "temperature-1",
      sortOrder: 1,
      name: "Very Hot",
      code: "VHOT",
      description: "Ready to transact quickly.",
      category: "Hot",
      score: 95,
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#BE123C",
    },
    {
      id: "temperature-2",
      sortOrder: 2,
      name: "Hot",
      code: "HOT",
      description: "Strong interest and high follow-up priority.",
      category: "Hot",
      score: 80,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#E11D48",
    },
    {
      id: "temperature-3",
      sortOrder: 3,
      name: "Warm",
      code: "WARM",
      description: "Engaged but requires nurturing.",
      category: "Warm",
      score: 60,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#D97706",
    },
    {
      id: "temperature-4",
      sortOrder: 4,
      name: "Cold",
      code: "COLD",
      description: "Minimal engagement so far.",
      category: "Cold",
      score: 25,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#0284C7",
    },
    {
      id: "temperature-5",
      sortOrder: 5,
      name: "Neutral",
      code: "NEUT",
      description: "Balanced interest, pending more data.",
      category: "Neutral",
      score: 45,
      statusType: "Custom",
      isActive: false,
      isSystemDefault: false,
      displayColor: "#475569",
    },
  ],
  lead_budget_range: [
    {
      id: "budget-1",
      sortOrder: 1,
      name: "Under 50 Lakh",
      code: "U50L",
      description: "Entry budget requirement.",
      category: "Budget",
      score: 35,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "budget-2",
      sortOrder: 2,
      name: "50 Lakh - 1 Cr",
      code: "50L_1CR",
      description: "Mid-market budget requirement.",
      category: "Budget",
      score: 55,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "budget-3",
      sortOrder: 3,
      name: "1 Cr - 2 Cr",
      code: "1CR_2CR",
      description: "Premium buyer budget requirement.",
      category: "Budget",
      score: 75,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "budget-4",
      sortOrder: 4,
      name: "2 Cr+",
      code: "2CR_PLUS",
      description: "High-value buyer requirement.",
      category: "Budget",
      score: 90,
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
  ],
  project_configuration: [
    {
      id: "config-1",
      sortOrder: 1,
      name: "1 BHK",
      code: "1BHK",
      description: "One bedroom configuration.",
      category: "Configuration",
      score: 35,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "config-2",
      sortOrder: 2,
      name: "2 BHK",
      code: "2BHK",
      description: "Two bedroom configuration.",
      category: "Configuration",
      score: 55,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "config-3",
      sortOrder: 3,
      name: "3 BHK",
      code: "3BHK",
      description: "Three bedroom configuration.",
      category: "Configuration",
      score: 70,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "config-4",
      sortOrder: 4,
      name: "4 BHK",
      code: "4BHK",
      description: "Large premium configuration.",
      category: "Configuration",
      score: 85,
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
  ],
  project_location: [
    {
      id: "location-1",
      sortOrder: 1,
      name: "Andheri West",
      code: "AND_W",
      description: "Andheri West micro-market.",
      category: "Location",
      score: 70,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "location-2",
      sortOrder: 2,
      name: "Malad",
      code: "MALAD",
      description: "Malad micro-market.",
      category: "Location",
      score: 60,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "location-3",
      sortOrder: 3,
      name: "Powai",
      code: "POWAI",
      description: "Powai micro-market.",
      category: "Location",
      score: 75,
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
  ],
  lost_reason: [
    {
      id: "lost-1",
      sortOrder: 1,
      name: "Budget Issue",
      code: "BUDGET",
      description: "Budget did not align with available inventory.",
      reasonCategory: "Commercial",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "lost-2",
      sortOrder: 2,
      name: "Not Interested",
      code: "NOINT",
      description: "Lead opted out after initial discussion.",
      reasonCategory: "Disposition",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "lost-3",
      sortOrder: 3,
      name: "Already Purchased",
      code: "BOUGHT",
      description: "Lead purchased with another seller.",
      reasonCategory: "Competition",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "lost-4",
      sortOrder: 4,
      name: "Location Not Suitable",
      code: "LOC",
      description: "Property location did not meet the requirement.",
      reasonCategory: "Requirement",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "lost-5",
      sortOrder: 5,
      name: "No Response",
      code: "NRESP",
      description: "Lead became unreachable after repeated follow-up.",
      reasonCategory: "Disposition",
      statusType: "Custom",
      isActive: false,
      isSystemDefault: false,
    },
  ],
  followup_type: [
    {
      id: "fut-1",
      sortOrder: 1,
      name: "Call",
      code: "CALL",
      description: "Phone call follow-up.",
      channel: "Call",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "fut-2",
      sortOrder: 2,
      name: "WhatsApp",
      code: "WA",
      description: "WhatsApp message follow-up.",
      channel: "Message",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "fut-3",
      sortOrder: 3,
      name: "Email",
      code: "EMAIL",
      description: "Email communication.",
      channel: "Message",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "fut-4",
      sortOrder: 4,
      name: "Site Visit",
      code: "VISIT",
      description: "Project or site visit.",
      channel: "Visit",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "fut-5",
      sortOrder: 5,
      name: "Meeting",
      code: "MEET",
      description: "Formal in-person or virtual meeting.",
      channel: "Meeting",
      statusType: "Custom",
      isActive: false,
      isSystemDefault: false,
    },
  ],
  followup_status: [
    {
      id: "fus-1",
      sortOrder: 1,
      name: "Scheduled",
      code: "SCH",
      description: "Follow-up is scheduled for a future slot.",
      category: "Pending",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "fus-2",
      sortOrder: 2,
      name: "Completed",
      code: "DONE",
      description: "Follow-up was completed successfully.",
      category: "Positive",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
    },
    {
      id: "fus-3",
      sortOrder: 3,
      name: "Rescheduled",
      code: "RESCH",
      description: "Follow-up was moved to another date.",
      category: "Pending",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "fus-4",
      sortOrder: 4,
      name: "No Response",
      code: "NRESP",
      description: "No response received from the lead.",
      category: "Negative",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
    },
    {
      id: "fus-5",
      sortOrder: 5,
      name: "Cancelled",
      code: "CANCEL",
      description: "Follow-up was cancelled or dropped.",
      category: "Negative",
      statusType: "Custom",
      isActive: false,
      isSystemDefault: false,
    },
  ],
  tag: [
    {
      id: "tag-1",
      sortOrder: 1,
      name: "Investor",
      code: "INV",
      description: "Investor-focused enquiry.",
      category: "Segment",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      tagColor: "#7C3AED",
    },
    {
      id: "tag-2",
      sortOrder: 2,
      name: "First Time Buyer",
      code: "FTB",
      description: "First-time home buyer lead.",
      category: "Segment",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      tagColor: "#2563EB",
    },
    {
      id: "tag-3",
      sortOrder: 3,
      name: "NRI",
      code: "NRI",
      description: "Lead from the NRI segment.",
      category: "Segment",
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      tagColor: "#059669",
    },
    {
      id: "tag-4",
      sortOrder: 4,
      name: "High Intent",
      code: "HINT",
      description: "Requires immediate sales attention.",
      category: "Intent",
      statusType: "Custom",
      isActive: false,
      isSystemDefault: false,
      tagColor: "#E11D48",
    },
  ],
  rating: [
    {
      id: "rating-1",
      sortOrder: 1,
      name: "A+",
      code: "APLUS",
      description: "Ideal customer profile with strong readiness.",
      category: "Premium",
      ratingValue: 5,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#7C3AED",
    },
    {
      id: "rating-2",
      sortOrder: 2,
      name: "A",
      code: "A",
      description: "High-quality lead likely to convert.",
      category: "Premium",
      ratingValue: 4,
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#2563EB",
    },
    {
      id: "rating-3",
      sortOrder: 3,
      name: "B",
      code: "B",
      description: "Good lead that needs nurturing.",
      category: "Standard",
      ratingValue: 3,
      statusType: "Custom",
      isActive: true,
      isSystemDefault: false,
      displayColor: "#059669",
    },
    {
      id: "rating-4",
      sortOrder: 4,
      name: "C",
      code: "C",
      description: "Low-quality lead with a longer timeline.",
      category: "Standard",
      ratingValue: 2,
      statusType: "Custom",
      isActive: false,
      isSystemDefault: false,
      displayColor: "#EA580C",
    },
  ],
} satisfies Record<LeadMasterCategoryId, LeadMasterBaseRow[]>;

const statusTypeField: LeadMasterFormField = {
  key: "statusType",
  label: "Status Type",
  type: "select",
  required: true,
  options: [
    { label: "System Default", value: "System Default" },
    { label: "Custom", value: "Custom" },
  ],
};

const requirementMasterColumns = (nameLabel: string): LeadMasterColumn[] => [
  { key: "index", label: "#", kind: "index" },
  { key: "name", label: nameLabel, kind: "text", valueKey: "name" },
  { key: "code", label: "Code", kind: "text", valueKey: "code" },
  {
    key: "description",
    label: "Description",
    kind: "text",
    valueKey: "description",
  },
  {
    key: "statusType",
    label: "Status Type",
    kind: "badge",
    valueKey: "statusType",
    badgeStyles: {
      "System Default": badgeStyles.system,
      Custom: badgeStyles.custom,
    },
  },
  {
    key: "isActive",
    label: "Is Active",
    kind: "toggle",
    valueKey: "isActive",
  },
  { key: "actions", label: "Actions", kind: "actions", align: "right" },
];

const requirementMasterFormFields = (
  nameLabel: string,
  placeholder: string,
): LeadMasterFormField[] => [
  {
    key: "name",
    label: nameLabel,
    type: "text",
    required: true,
    placeholder,
    maxLength: 80,
  },
  {
    key: "code",
    label: "Code",
    type: "text",
    required: true,
    placeholder: "Enter code",
    maxLength: 18,
  },
  {
    key: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Add a short description",
    maxLength: 220,
  },
  statusTypeField,
  {
    key: "isActive",
    label: "Is Active",
    type: "toggle",
    helperText: "Inactive values stay hidden from future lead selections.",
  },
];

const rawLeadMasterConfigs: Record<LeadMasterCategoryId, LeadMasterConfig> = {
  stage: {
    category: masterCategoryDefinitions[0],
    totalLabel: "Total Stages",
    addLabel: "Add New Stage",
    addTitle: "Add Lead Stage",
    editTitle: "Edit Lead Stage",
    searchPlaceholder: "Search stages by name, code, or description",
    helperText:
      "System default stages remain protected from deletion and can only be deactivated.",
    supportsImport: true,
    stats: baseStats("Total Stages"),
    filterLabel: "Type",
    filterOptions: [
      { label: "Open", value: "Open" },
      { label: "In Progress", value: "In Progress" },
      { label: "Closed Won", value: "Closed Won" },
      { label: "Closed Lost", value: "Closed Lost" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Stage Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "probability",
        label: "Probability",
        kind: "text",
        valueKey: "probability",
        suffix: "%",
      },
      {
        key: "type",
        label: "Type",
        kind: "badge",
        valueKey: "type",
        badgeStyles: {
          Open: badgeStyles.open,
          "In Progress": badgeStyles.progress,
          "Closed Won": badgeStyles.closedWon,
          "Closed Lost": badgeStyles.closedLost,
        },
      },
      {
        key: "defaultNextStage",
        label: "Default Next Stage",
        kind: "text",
        valueKey: "defaultNextStage",
      },
      {
        key: "statusType",
        label: "Status Type",
        kind: "badge",
        valueKey: "statusType",
        badgeStyles: {
          "System Default": badgeStyles.system,
          Custom: badgeStyles.custom,
        },
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Stage Name",
        type: "text",
        required: true,
        placeholder: "Enter stage name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Code",
        type: "text",
        required: true,
        placeholder: "Enter stage code",
        maxLength: 20,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 250,
      },
      {
        key: "probability",
        label: "Probability",
        type: "number",
        required: true,
        min: 0,
        max: 100,
        suffix: "%",
        helperText: "Probability of conversion at this stage.",
      },
      {
        key: "type",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Open", value: "Open" },
          { label: "In Progress", value: "In Progress" },
          { label: "Closed Won", value: "Closed Won" },
          { label: "Closed Lost", value: "Closed Lost" },
        ],
      },
      {
        key: "defaultNextStage",
        label: "Default Next Stage",
        type: "select",
        options: [],
      },
      statusTypeField,
      {
        key: "displayColor",
        label: "Stage Color",
        type: "color",
        options: colorOptions,
      },
      {
        key: "isActive",
        label: "Is Active",
        type: "toggle",
        helperText: "Active stages remain available across lead workflows.",
      },
    ],
  },
  status: {
    category: masterCategoryDefinitions[1],
    totalLabel: "Total Statuses",
    addLabel: "Add New Status",
    addTitle: "Add Lead Status",
    editTitle: "Edit Lead Status",
    searchPlaceholder: "Search statuses by name, code, or description",
    helperText:
      "Statuses define operational checkpoints used across lead follow-up and reporting.",
    stats: baseStats("Total Statuses"),
    filterLabel: "Category",
    filterOptions: [
      { label: "Open", value: "Open" },
      { label: "In Progress", value: "In Progress" },
      { label: "Closed", value: "Closed" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Status Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "category",
        label: "Category",
        kind: "badge",
        valueKey: "category",
        badgeStyles: {
          Open: badgeStyles.open,
          "In Progress": badgeStyles.progress,
          Closed: badgeStyles.closedWon,
        },
      },
      {
        key: "defaultNextStatus",
        label: "Default Next Status",
        kind: "text",
        valueKey: "defaultNextStatus",
      },
      {
        key: "triggerAction",
        label: "Trigger Action",
        kind: "badge",
        valueKey: "triggerAction",
        emptyText: "None",
        badgeStyles: {
          NONE: badgeStyles.triggerNone,
          CREATE_SITE_VISIT: badgeStyles.triggerVisit,
          CREATE_BOOKING: badgeStyles.triggerBooking,
        },
      },
      {
        key: "allowFollowUp",
        label: "Follow-up",
        kind: "text",
        valueKey: "allowFollowUp",
      },
      {
        key: "followUpNotificationEnabled",
        label: "Notify",
        kind: "text",
        valueKey: "followUpNotificationEnabled",
      },
      {
        key: "followUpRenotifyMinutes",
        label: "Renotify",
        kind: "text",
        valueKey: "followUpRenotifyMinutes",
        suffix: " min",
        emptyText: "Once",
      },
      {
        key: "score",
        label: "Score / Weight",
        kind: "text",
        valueKey: "score",
      },
      {
        key: "statusType",
        label: "Status Type",
        kind: "badge",
        valueKey: "statusType",
        badgeStyles: {
          "System Default": badgeStyles.system,
          Custom: badgeStyles.custom,
        },
      },
      {
        key: "showInStatsCard",
        label: "Stat Card",
        kind: "toggle",
        valueKey: "showInStatsCard",
      },
      {
        key: "showInFilterBar",
        label: "Filter Pill",
        kind: "toggle",
        valueKey: "showInFilterBar",
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Status Name",
        type: "text",
        required: true,
        placeholder: "Enter status name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Code",
        type: "text",
        required: true,
        placeholder: "Enter short code",
        maxLength: 10,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [
          { label: "Open", value: "Open" },
          { label: "In Progress", value: "In Progress" },
          { label: "Closed", value: "Closed" },
        ],
      },
      {
        key: "sortOrder",
        label: "Display Order (Sort Order)",
        type: "number",
        min: 0,
        helperText:
          "Controls position order of this status in stats cards and filter pills.",
      },
      {
        key: "showInStatsCard",
        label: "Show in Interactive Stats Cards",
        type: "toggle",
        helperText:
          "When on, this status appears as an interactive card in top stats row.",
      },
      {
        key: "showInFilterBar",
        label: "Show in Quick Filter Bar",
        type: "toggle",
        helperText:
          "When on, this status appears as a quick filter pill button above lead tables.",
      },
      {
        key: "defaultNextStatus",
        label: "Default Next Status",
        type: "select",
        options: [],
      },
      {
        key: "triggerAction",
        label: "Trigger Action",
        type: "select",
        helperText:
          "Optional business flow to suggest after this status is selected.",
        options: [
          { label: "None", value: "NONE" },
          { label: "Create site visit", value: "CREATE_SITE_VISIT" },
          { label: "Create booking", value: "CREATE_BOOKING" },
        ],
      },
      {
        key: "allowFollowUp",
        label: "Allow follow-up creation",
        type: "toggle",
        helperText:
          "When off, this status cannot create follow-up reminders from lead update flows.",
      },
      {
        key: "followUpNotificationEnabled",
        label: "Follow-up notification",
        type: "toggle",
        helperText:
          "When on, due follow-ups in this status can notify the assigned user.",
      },
      {
        key: "followUpRenotifyMinutes",
        label: "Renotify every",
        type: "number",
        min: 0,
        helperText:
          "Optional. Set 2 or more minutes to repeat notifications until the lead is updated. Leave 0 for one-time notification.",
        suffix: "min",
      },
      {
        key: "score",
        label: "Score / Weight",
        type: "number",
        required: true,
        min: 0,
        max: 100,
        helperText:
          "This score is awarded when a lead is moved to this status.",
      },
      statusTypeField,
      {
        key: "displayColor",
        label: "Display Color",
        type: "color",
        options: colorOptions,
      },
      {
        key: "isActive",
        label: "Is Active",
        type: "toggle",
        helperText: "Inactive statuses stay hidden from future selections.",
      },
    ],
  },
  source: {
    category: masterCategoryDefinitions[2],
    totalLabel: "Total Sources",
    addLabel: "Add New Source",
    addTitle: "Add Lead Source",
    editTitle: "Edit Lead Source",
    searchPlaceholder: "Search sources by name, code, or description",
    helperText:
      "Use clear source naming so attribution and analytics stay consistent.",
    stats: baseStats("Total Sources"),
    filterLabel: "Category",
    filterOptions: [
      { label: "Digital", value: "Digital" },
      { label: "Offline", value: "Offline" },
      { label: "Portal", value: "Portal" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Source Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "category",
        label: "Category / Type",
        kind: "badge",
        valueKey: "category",
        badgeStyles: {
          Digital: badgeStyles.digital,
          Offline: badgeStyles.offline,
          Portal: badgeStyles.system,
        },
      },
      {
        key: "pointsEnabled",
        label: "Scorable source",
        kind: "text",
        valueKey: "pointsEnabled",
      },
      {
        key: "autoAssignActive",
        label: "Auto Assign Mode",
        kind: "badge",
        valueKey: "autoAssignActive",
        badgeStyles: {
          Allowed: badgeStyles.positive,
          Blocked: badgeStyles.pending,
        },
      },
      {
        key: "statusType",
        label: "Status Type",
        kind: "badge",
        valueKey: "statusType",
        badgeStyles: {
          "System Default": badgeStyles.system,
          Custom: badgeStyles.custom,
        },
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Source Name",
        type: "text",
        required: true,
        placeholder: "Enter source name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Source Code",
        type: "text",
        required: true,
        placeholder: "Enter source code",
        maxLength: 12,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "category",
        label: "Source Type",
        type: "select",
        required: true,
        options: [
          { label: "Digital", value: "Digital" },
          { label: "Offline", value: "Offline" },
          { label: "Portal", value: "Portal" },
        ],
      },
      {
        key: "autoAssignActive",
        label: "Auto Assignment Active",
        type: "toggle",
        helperText:
          "When active, new leads from this source will be automatically assigned to telecallers/sales agents according to auto-assignment rules. When inactive, leads from this source must be manually assigned.",
      },
      {
        key: "pointsEnabled",
        label: "Count points for leads from this source",
        type: "toggle",
        helperText:
          "When off, status changes for leads from this source update normally but do not add performance ranking points.",
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
  priority: {
    category: masterCategoryDefinitions[3],
    totalLabel: "Total Priorities",
    addLabel: "Add New Priority",
    addTitle: "Add Lead Priority",
    editTitle: "Edit Lead Priority",
    searchPlaceholder: "Search priorities by name, code, or description",
    helperText:
      "Priority helps teams sequence work without changing the underlying lead stage.",
    stats: baseStats("Total Priorities"),
    filterLabel: "Priority Type",
    filterOptions: [
      { label: "Urgent", value: "Urgent" },
      { label: "High", value: "High" },
      { label: "Medium", value: "Medium" },
      { label: "Low", value: "Low" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Priority Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "weight",
        label: "Priority Level",
        kind: "text",
        valueKey: "weight",
      },
      {
        key: "category",
        label: "Badge / Type",
        kind: "badge",
        valueKey: "category",
        badgeStyles: {
          Urgent: badgeStyles.urgencyHigh,
          High: badgeStyles.urgencyHigh,
          Medium: badgeStyles.urgencyMedium,
          Low: badgeStyles.urgencyLow,
        },
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Priority Name",
        type: "text",
        required: true,
        placeholder: "Enter priority name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Priority Code",
        type: "text",
        required: true,
        placeholder: "Enter priority code",
        maxLength: 10,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "weight",
        label: "Priority Level",
        type: "number",
        required: true,
        min: 0,
        max: 100,
        helperText: "Higher numbers represent higher urgency.",
      },
      {
        key: "category",
        label: "Badge / Type",
        type: "select",
        required: true,
        options: [
          { label: "Urgent", value: "Urgent" },
          { label: "High", value: "High" },
          { label: "Medium", value: "Medium" },
          { label: "Low", value: "Low" },
        ],
      },
      {
        key: "displayColor",
        label: "Display Color",
        type: "color",
        options: colorOptions,
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
  temperature: {
    category: masterCategoryDefinitions[4],
    totalLabel: "Total Lead Types",
    addLabel: "Add Lead Type",
    addTitle: "Add Lead Type",
    editTitle: "Edit Lead Type",
    searchPlaceholder: "Search lead types by name, code, or description",
    helperText: "Lead types help sales teams qualify intent more consistently.",
    stats: baseStats("Total Lead Types"),
    filterLabel: "Type",
    filterOptions: [
      { label: "Hot", value: "Hot" },
      { label: "Warm", value: "Warm" },
      { label: "Cold", value: "Cold" },
      { label: "Neutral", value: "Neutral" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      {
        key: "name",
        label: "Lead Type Name",
        kind: "text",
        valueKey: "name",
      },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "category",
        label: "Type",
        kind: "badge",
        valueKey: "category",
        badgeStyles: {
          Hot: badgeStyles.hot,
          Warm: badgeStyles.warm,
          Cold: badgeStyles.cold,
          Neutral: badgeStyles.neutral,
        },
      },
      {
        key: "showInStatsCard",
        label: "Stat Card",
        kind: "toggle",
        valueKey: "showInStatsCard",
      },
      {
        key: "showInFilterBar",
        label: "Filter Pill",
        kind: "toggle",
        valueKey: "showInFilterBar",
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Lead Type Name",
        type: "text",
        required: true,
        placeholder: "Enter lead type name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Lead Type Code",
        type: "text",
        required: true,
        placeholder: "Enter lead type code",
        maxLength: 10,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "category",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Hot", value: "Hot" },
          { label: "Warm", value: "Warm" },
          { label: "Cold", value: "Cold" },
          { label: "Neutral", value: "Neutral" },
        ],
      },
      {
        key: "sortOrder",
        label: "Display Order (Sort Order)",
        type: "number",
        min: 0,
        helperText:
          "Controls position order of this lead type in stats cards and filter pills.",
      },
      {
        key: "showInStatsCard",
        label: "Show in Interactive Stats Cards",
        type: "toggle",
        helperText:
          "When on, this lead type appears as an interactive card in the top stats row.",
      },
      {
        key: "showInFilterBar",
        label: "Show in Quick Filter Bar",
        type: "toggle",
        helperText:
          "When on, this lead type appears as a quick filter pill button above lead tables.",
      },
      {
        key: "displayColor",
        label: "Display Color",
        type: "color",
        options: colorOptions,
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
  lead_budget_range: {
    category: masterCategoryDefinitions[5],
    totalLabel: "Total Budget Ranges",
    addLabel: "Add Budget Range",
    addTitle: "Add Budget Range",
    editTitle: "Edit Budget Range",
    searchPlaceholder: "Search budget ranges by name, code, or description",
    helperText: "Budget ranges standardize buyer requirement capture.",
    stats: baseStats("Total Budget Ranges"),
    columns: requirementMasterColumns("Budget Range"),
    formFields: requirementMasterFormFields(
      "Budget Range",
      "Enter budget range",
    ),
  },
  project_configuration: {
    category: masterCategoryDefinitions[6],
    totalLabel: "Total Configurations",
    addLabel: "Add Configuration",
    addTitle: "Add Configuration",
    editTitle: "Edit Configuration",
    searchPlaceholder: "Search configurations by name, code, or description",
    helperText: "Configurations standardize buyer requirements.",
    stats: baseStats("Total Configurations"),
    columns: requirementMasterColumns("Configuration"),
    formFields: requirementMasterFormFields(
      "Configuration",
      "Enter configuration",
    ),
  },
  project_location: {
    category: masterCategoryDefinitions[7],
    totalLabel: "Total Locations",
    addLabel: "Add Location",
    addTitle: "Add Location",
    editTitle: "Edit Location",
    searchPlaceholder: "Search locations by name, code, or description",
    helperText:
      "Locations standardize buyer requirements and project matching.",
    stats: baseStats("Total Locations"),
    columns: requirementMasterColumns("Location"),
    formFields: requirementMasterFormFields("Location", "Enter location"),
  },
  lost_reason: {
    category: masterCategoryDefinitions[8],
    totalLabel: "Total Lost Reasons",
    addLabel: "Add New Lost Reason",
    addTitle: "Add Lost Reason",
    editTitle: "Edit Lost Reason",
    searchPlaceholder: "Search lost reasons by name, code, or description",
    helperText:
      "Consistent lost reasons improve reporting accuracy and recovery analysis.",
    stats: baseStats("Total Lost Reasons"),
    filterLabel: "Category",
    filterOptions: [
      { label: "Commercial", value: "Commercial" },
      { label: "Disposition", value: "Disposition" },
      { label: "Competition", value: "Competition" },
      { label: "Requirement", value: "Requirement" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Reason Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "reasonCategory",
        label: "Category",
        kind: "badge",
        valueKey: "reasonCategory",
        badgeStyles: {
          Commercial: badgeStyles.offline,
          Disposition: badgeStyles.custom,
          Competition: badgeStyles.system,
          Requirement: badgeStyles.digital,
        },
      },
      {
        key: "statusType",
        label: "Status Type",
        kind: "badge",
        valueKey: "statusType",
        badgeStyles: {
          "System Default": badgeStyles.system,
          Custom: badgeStyles.custom,
        },
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Reason Name",
        type: "text",
        required: true,
        placeholder: "Enter reason name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Reason Code",
        type: "text",
        required: true,
        placeholder: "Enter reason code",
        maxLength: 12,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "reasonCategory",
        label: "Reason Category",
        type: "select",
        required: true,
        options: [
          { label: "Commercial", value: "Commercial" },
          { label: "Disposition", value: "Disposition" },
          { label: "Competition", value: "Competition" },
          { label: "Requirement", value: "Requirement" },
        ],
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
  followup_type: {
    category: masterCategoryDefinitions[9],
    totalLabel: "Total Follow-up Types",
    addLabel: "Add New Follow-up Type",
    addTitle: "Add Follow-up Type",
    editTitle: "Edit Follow-up Type",
    searchPlaceholder: "Search follow-up types by name, code, or description",
    helperText:
      "Follow-up types keep activity capture structured across call, visit, and messaging workflows.",
    stats: baseStats("Total Follow-up Types"),
    filterLabel: "Channel",
    filterOptions: [
      { label: "Call", value: "Call" },
      { label: "Message", value: "Message" },
      { label: "Visit", value: "Visit" },
      { label: "Meeting", value: "Meeting" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      {
        key: "name",
        label: "Follow-up Type",
        kind: "text",
        valueKey: "name",
      },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "channel",
        label: "Channel",
        kind: "badge",
        valueKey: "channel",
        badgeStyles: {
          Call: badgeStyles.call,
          Message: badgeStyles.message,
          Visit: badgeStyles.visit,
          Meeting: badgeStyles.meeting,
        },
      },
      {
        key: "statusType",
        label: "Status Type",
        kind: "badge",
        valueKey: "statusType",
        badgeStyles: {
          "System Default": badgeStyles.system,
          Custom: badgeStyles.custom,
        },
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Follow-up Type Name",
        type: "text",
        required: true,
        placeholder: "Enter follow-up type",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Code",
        type: "text",
        required: true,
        placeholder: "Enter code",
        maxLength: 10,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "channel",
        label: "Channel / Type",
        type: "select",
        required: true,
        options: [
          { label: "Call", value: "Call" },
          { label: "Message", value: "Message" },
          { label: "Visit", value: "Visit" },
          { label: "Meeting", value: "Meeting" },
        ],
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
  followup_status: {
    category: masterCategoryDefinitions[10],
    totalLabel: "Total Follow-up Statuses",
    addLabel: "Add New Follow-up Status",
    addTitle: "Add Follow-up Status",
    editTitle: "Edit Follow-up Status",
    searchPlaceholder:
      "Search follow-up statuses by name, code, or description",
    helperText:
      "Use follow-up statuses to normalize activity outcomes for reporting and SLAs.",
    stats: baseStats("Total Follow-up Statuses"),
    filterLabel: "Type",
    filterOptions: [
      { label: "Pending", value: "Pending" },
      { label: "Positive", value: "Positive" },
      { label: "Negative", value: "Negative" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Status Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "category",
        label: "Type",
        kind: "badge",
        valueKey: "category",
        badgeStyles: {
          Pending: badgeStyles.pending,
          Positive: badgeStyles.positive,
          Negative: badgeStyles.negative,
        },
      },
      {
        key: "statusType",
        label: "Status Type",
        kind: "badge",
        valueKey: "statusType",
        badgeStyles: {
          "System Default": badgeStyles.system,
          Custom: badgeStyles.custom,
        },
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Status Name",
        type: "text",
        required: true,
        placeholder: "Enter follow-up status name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Code",
        type: "text",
        required: true,
        placeholder: "Enter code",
        maxLength: 10,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "category",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Pending", value: "Pending" },
          { label: "Positive", value: "Positive" },
          { label: "Negative", value: "Negative" },
        ],
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
  tag: {
    category: masterCategoryDefinitions[11],
    totalLabel: "Total Tags",
    addLabel: "Add New Tag",
    addTitle: "Add Lead Tag",
    editTitle: "Edit Lead Tag",
    searchPlaceholder: "Search tags by name, code, or description",
    helperText:
      "Tags add lightweight segmentation without changing lead status or priority.",
    stats: baseStats("Total Tags"),
    filterLabel: "Tag Type",
    filterOptions: [
      { label: "Segment", value: "Segment" },
      { label: "Intent", value: "Intent" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Tag Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "category",
        label: "Tag Type",
        kind: "badge",
        valueKey: "category",
        badgeStyles: { Segment: badgeStyles.tag, Intent: badgeStyles.hot },
      },
      {
        key: "tagColor",
        label: "Color",
        kind: "color",
        valueKey: "tagColor",
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Tag Name",
        type: "text",
        required: true,
        placeholder: "Enter tag name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Code",
        type: "text",
        required: true,
        placeholder: "Enter tag code",
        maxLength: 10,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "category",
        label: "Tag Type",
        type: "select",
        required: true,
        options: [
          { label: "Segment", value: "Segment" },
          { label: "Intent", value: "Intent" },
        ],
      },
      {
        key: "tagColor",
        label: "Tag Color",
        type: "color",
        options: colorOptions,
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
  rating: {
    category: masterCategoryDefinitions[12],
    totalLabel: "Total Ratings",
    addLabel: "Add New Rating",
    addTitle: "Add Lead Rating",
    editTitle: "Edit Lead Rating",
    searchPlaceholder: "Search ratings by name, code, or description",
    helperText:
      "Ratings make lead quality visible without replacing stage, status, or temperature.",
    stats: baseStats("Total Ratings"),
    filterLabel: "Rating Band",
    filterOptions: [
      { label: "Premium", value: "Premium" },
      { label: "Standard", value: "Standard" },
    ],
    columns: [
      { key: "index", label: "#", kind: "index" },
      { key: "name", label: "Rating Name", kind: "text", valueKey: "name" },
      { key: "code", label: "Code", kind: "text", valueKey: "code" },
      {
        key: "description",
        label: "Description",
        kind: "text",
        valueKey: "description",
      },
      {
        key: "ratingValue",
        label: "Rating Value",
        kind: "text",
        valueKey: "ratingValue",
      },
      {
        key: "category",
        label: "Type",
        kind: "badge",
        valueKey: "category",
        badgeStyles: {
          Premium: badgeStyles.rating,
          Standard: badgeStyles.custom,
        },
      },
      {
        key: "isActive",
        label: "Is Active",
        kind: "toggle",
        valueKey: "isActive",
      },
      { key: "actions", label: "Actions", kind: "actions", align: "right" },
    ],
    formFields: [
      {
        key: "name",
        label: "Rating Name",
        type: "text",
        required: true,
        placeholder: "Enter rating name",
        maxLength: 50,
      },
      {
        key: "code",
        label: "Code",
        type: "text",
        required: true,
        placeholder: "Enter code",
        maxLength: 10,
      },
      {
        key: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Add a short description",
        maxLength: 220,
      },
      {
        key: "ratingValue",
        label: "Rating Value",
        type: "number",
        required: true,
        min: 1,
        max: 5,
      },
      {
        key: "category",
        label: "Type",
        type: "select",
        required: true,
        options: [
          { label: "Premium", value: "Premium" },
          { label: "Standard", value: "Standard" },
        ],
      },
      {
        key: "displayColor",
        label: "Display Color",
        type: "color",
        options: colorOptions,
      },
      statusTypeField,
      { key: "isActive", label: "Is Active", type: "toggle" },
    ],
  },
};

const hiddenLeadMasterFieldKeys = new Set<string>([
  "code",
  "description",
  "category",
  "defaultNextStage",
  "defaultNextStatus",
]);

function isVisibleLeadMasterColumn(
  categoryId: LeadMasterCategoryId,
  column: LeadMasterColumn,
) {
  if (categoryId !== "status" && column.key === "score") return false;
  if (hiddenLeadMasterFieldKeys.has(column.key)) return false;
  if (
    column.valueKey &&
    hiddenLeadMasterFieldKeys.has(String(column.valueKey))
  ) {
    return false;
  }
  return !/category|default next status|default next stage/i.test(column.label);
}

function isVisibleLeadMasterFormField(
  categoryId: LeadMasterCategoryId,
  field: LeadMasterFormField,
) {
  if (categoryId !== "status" && field.key === "score") return false;
  if (hiddenLeadMasterFieldKeys.has(String(field.key))) return false;
  return !/category|default next status|default next stage/i.test(field.label);
}

function simplifySearchPlaceholder(placeholder: string) {
  return placeholder
    .replace(/,\s*code,\s*or\s*description/gi, "")
    .replace(/\s*by\s+name$/i, " by name");
}

export const leadMasterConfigs: Record<LeadMasterCategoryId, LeadMasterConfig> =
  Object.fromEntries(
    (
      Object.entries(rawLeadMasterConfigs) as Array<
        [LeadMasterCategoryId, LeadMasterConfig]
      >
    ).map(([categoryId, config]) => {
      const filterIsHiddenCategory =
        config.filterLabel !== undefined &&
        /category/i.test(config.filterLabel);

      return [
        categoryId,
        {
          ...config,
          searchPlaceholder: simplifySearchPlaceholder(
            config.searchPlaceholder,
          ),
          columns: config.columns.filter((column) =>
            isVisibleLeadMasterColumn(categoryId, column),
          ),
          formFields: config.formFields.filter((field) =>
            isVisibleLeadMasterFormField(categoryId, field),
          ),
          filterLabel: filterIsHiddenCategory ? undefined : config.filterLabel,
          filterOptions: filterIsHiddenCategory
            ? undefined
            : config.filterOptions,
        },
      ];
    }),
  ) as Record<LeadMasterCategoryId, LeadMasterConfig>;

export const masterCategories: MasterCategory[] =
  visibleMasterCategoryDefinitions.map((category) => ({
    ...category,
    count: rows[category.id as keyof typeof rows].length,
  }));

export const leadStageRows = rows.stage;
export const leadStatusRows = rows.status;

export function getInitialLeadMasterRows(): Record<
  LeadMasterCategoryId,
  LeadMasterBaseRow[]
> {
  return Object.fromEntries(
    (Object.keys(rows) as LeadMasterCategoryId[]).map((key) => [
      key,
      rows[key].map((row) => ({ ...row })),
    ]),
  ) as Record<LeadMasterCategoryId, LeadMasterBaseRow[]>;
}

export function getMasterCategories(
  data: Record<LeadMasterCategoryId, LeadMasterBaseRow[]>,
): MasterCategory[] {
  return visibleMasterCategoryDefinitions.map((category) => ({
    ...category,
    count: data[category.id as LeadMasterCategoryId].length,
  }));
}

export function createDefaultFilters(): LeadMasterFilterState {
  return {
    search: "",
    activity: "all",
    statusType: "all",
    categoryValue: "all",
  };
}

export function getInitialFormValues(
  categoryId: LeadMasterCategoryId,
): LeadMasterBaseRow {
  const sample = rows[categoryId][0] as Partial<LeadMasterBaseRow> | undefined;

  return {
    id: "",
    sortOrder: 0,
    name: "",
    code: "",
    description: "",
    category: sample?.category ?? "",
    type: sample?.type ?? "",
    status: sample?.status ?? "Active",
    statusType: "Custom",
    isActive: true,
    isSystemDefault: false,
    defaultNextStage: sample?.defaultNextStage ?? "",
    defaultNextStatus: sample?.defaultNextStatus ?? "",
    probability: sample?.probability ?? 0,
    weight: sample?.weight ?? 0,
    score: sample?.score ?? 0,
    pointsEnabled: sample?.pointsEnabled ?? true,
    channel: sample?.channel ?? "",
    reasonCategory: sample?.reasonCategory ?? "",
    tagColor: sample?.tagColor ?? colorOptions[0].value,
    ratingValue: sample?.ratingValue ?? 1,
    displayColor: sample?.displayColor ?? colorOptions[0].value,
    expectedTime: sample?.expectedTime ?? 0,
    expectedTimeUnit: sample?.expectedTimeUnit ?? "Days",
    icon: sample?.icon ?? "Flag",
    triggerAction: sample?.triggerAction ?? "NONE",
    allowFollowUp: sample?.allowFollowUp ?? true,
    followUpNotificationEnabled: sample?.followUpNotificationEnabled ?? true,
    followUpRenotifyMinutes: sample?.followUpRenotifyMinutes ?? 0,
    showInStatsCard: true,
    showInFilterBar: true,
  };
}
