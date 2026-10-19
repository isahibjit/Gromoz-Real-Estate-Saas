import {
  BadgeIndianRupee,
  BellRing,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ContactRound,
  Flame,
  FolderKanban,
  LayoutDashboard,
  MapPinned,
  PhoneCall,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UserRoundCheck,
  UserRoundPlus,
  UsersRound,
  Database,
  type LucideIcon,
} from "lucide-react";

export interface SidebarItem {
  id?: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  moduleKey?: string;
  pageKey?: string;
  requiredAction?: "view" | "create" | "update" | "delete" | "punchIn" | "punchOut";
  matchPaths?: string[];
  roleScopes?: string[];
  expandable?: boolean;
  children?: SidebarChildItem[];
  badge?: string;
  badgeClassName?: string;
}

export interface SidebarChildItem {
  id?: string;
  label: string;
  to?: string;
  moduleKey?: string;
  pageKey?: string;
  requiredAction?: "view" | "create" | "update" | "delete" | "punchIn" | "punchOut";
  matchPaths?: string[];
  roleScopes?: string[];
  badge?: string;
  badgeClassName?: string;
}

export interface KpiItem {
  label: string;
  value: string;
  trend: string;
  trendDirection: "up" | "down" | "neutral";
  icon: LucideIcon;
  tone: string;
  trendClassName?: string;
}

export const sidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/dashboard",
    moduleKey: "dashboard",
    pageKey: "page.dashboard",
  },
  {
    label: "Lead Management",
    icon: UsersRound,
    children: [
      { label: "All Leads", to: "/leads/all", moduleKey: "leads", pageKey: "page.all_leads" },
      { label: "Contact Leads", to: "/leads/contact", moduleKey: "contact_leads", pageKey: "page.contact_leads" },
      {
        label: "Follow-Up Leads",
        to: "/leads/follow-up",
        moduleKey: "leads",
        pageKey: "page.follow_up_leads",
      },
      {
        label: "Inactive Leads",
        to: "/leads/inactive",
        moduleKey: "leads",
        pageKey: "page.inactive_leads",
      },
      {
        label: "Deleted Leads",
        to: "/leads/deleted",
        moduleKey: "leads",
        pageKey: "page.deleted_leads",
      },
      { label: "Lead Pipeline", to: "/leads/pipeline", moduleKey: "leads", pageKey: "page.lead_pipeline" },
      { label: "Lead Conversion Analytics", to: "/leads/conversion-analytics", moduleKey: "leads", pageKey: "page.lead_analytics" },
      { label: "Import Leads", to: "/leads/import", moduleKey: "leads", pageKey: "page.import_leads" },
    ],
  },
  {
    label: "Masters",
    icon: Database,
    children: [
      {
        label: "Leads",
        to: "/leads/masters",
        moduleKey: "lead_masters",
        pageKey: "page.lead_masters",
      },
      {
        label: "Auto Assignment Master",
        to: "/leads/auto-assignment",
        moduleKey: "auto_assignment_master",
        pageKey: "page.auto_assignment",
      },
      {
        label: "Projects",
        to: "/projects/masters",
        moduleKey: "property_masters",
        pageKey: "page.project_masters",
      },
    ],
  },
  {
    label: "Projects",
    icon: FolderKanban,
    to: "/projects",
    moduleKey: "projects",
    pageKey: "page.projects",
  },
  {
    label: "Site Visits",
    icon: CalendarCheck,
    to: "/leads/site-visits",
    moduleKey: "site_visits",
    pageKey: "page.site_visits",
  },
  {
    label: "Bookings",
    icon: BriefcaseBusiness,
    children: [
      { label: "Bookings Pipeline", to: "/bookings", moduleKey: "bookings", pageKey: "page.bookings_pipeline" },
      { label: "Brokerage & Incentives", to: "/bookings/finance", moduleKey: "bookings", pageKey: "page.booking_finance" },
    ],
  },
  {
    label: "Employees",
    icon: UsersRound,
    children: [
      { label: "Directory", to: "/admin/employees", moduleKey: "employees", pageKey: "page.employee_directory" },
      { label: "Teams", to: "/admin/teams", moduleKey: "teams", pageKey: "page.teams" },
      { label: "Attendance", to: "/admin/attendance", moduleKey: "attendance", pageKey: "page.attendance" },
      { label: "Leave Requests", to: "/admin/leaves", moduleKey: "leaves", pageKey: "page.leave_requests" },
      { label: "Holidays", to: "/admin/holidays", moduleKey: "holidays", pageKey: "page.holidays" },
      { label: "Payroll", to: "/admin/payroll", moduleKey: "payroll", pageKey: "page.payroll" },
      { label: "Payslips", to: "/admin/payslips", moduleKey: "payslips", pageKey: "page.payslips" },
      { label: "Tasks", to: "/admin/tasks", moduleKey: "tasks", pageKey: "page.tasks" },
      { label: "Performance", to: "/admin/performance", moduleKey: "performance", pageKey: "page.performance" },
      { label: "Lead Performance", to: "/admin/performance/leads", moduleKey: "performance", pageKey: "page.performance" },
      { label: "Access Control", to: "/admin/access-control", moduleKey: "access_control", pageKey: "page.access_control" },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    to: "/admin/settings",
    moduleKey: "hr_settings",
    pageKey: "page.general_settings",
  },
];

export const kpis: KpiItem[] = [
  {
    label: "Total Leads",
    value: "25,680",
    trend: "12.5% vs Last Month",
    trendDirection: "up",
    icon: UsersRound,
    tone: "bg-secondary",
  },
  {
    label: "New Leads",
    value: "5,268",
    trend: "8.3% vs Last Month",
    trendDirection: "up",
    icon: UserRoundPlus,
    tone: "bg-[#68c84f]",
  },
  {
    label: "Assigned Leads",
    value: "18,245",
    trend: "10.6%",
    trendDirection: "up",
    icon: UserRoundCheck,
    tone: "bg-[#ff921e]",
  },
  {
    label: "Unassigned Leads",
    value: "1,245",
    trend: "4.8%",
    trendDirection: "down",
    icon: ContactRound,
    tone: "bg-[#f43f5e]",
  },
  {
    label: "Hot Leads",
    value: "2,568",
    trend: "15.2%",
    trendDirection: "up",
    icon: Flame,
    tone: "bg-[#f04438]",
  },
  {
    label: "Warm Leads",
    value: "6,325",
    trend: "7.1%",
    trendDirection: "up",
    icon: Sparkles,
    tone: "bg-[#ff991f]",
  },
  {
    label: "Follow-ups Due Today",
    value: "3,256",
    trend: "9.5%",
    trendDirection: "up",
    icon: CalendarClock,
    tone: "bg-[#6254d9]",
  },
  {
    label: "Missed Follow-ups",
    value: "1,028",
    trend: "3.2%",
    trendDirection: "down",
    icon: ClipboardList,
    tone: "bg-[#f04438]",
  },
  {
    label: "Site Visits Scheduled",
    value: "1,265",
    trend: "6.4%",
    trendDirection: "up",
    icon: MapPinned,
    tone: "bg-[#2788c7]",
  },
  {
    label: "Site Visits Completed",
    value: "985",
    trend: "11.3%",
    trendDirection: "up",
    icon: CheckCircle2,
    tone: "bg-[#26a329]",
  },
  {
    label: "Bookings Done",
    value: "256",
    trend: "18.6%",
    trendDirection: "up",
    icon: ShieldCheck,
    tone: "bg-secondary",
  },
  {
    label: "Revenue Pipeline",
    value: "₹ 25.68 Cr",
    trend: "16.4%",
    trendDirection: "up",
    icon: BadgeIndianRupee,
    tone: "bg-primary",
  },
];

export const sourceData = [
  { name: "MagicBricks", value: 5268, percent: "20.5%", color: "#082b55" },
  { name: "99acres", value: 4256, percent: "16.6%", color: "#ff6b00" },
  { name: "Meta Ads", value: 3568, percent: "13.9%", color: "#ff921e" },
  { name: "Google Ads", value: 3256, percent: "12.7%", color: "#397ab8" },
  { name: "Justdial", value: 2568, percent: "10.0%", color: "#75a4d6" },
  { name: "Walk-ins", value: 2125, percent: "8.3%", color: "#ff4b1f" },
  { name: "Referrals", value: 1852, percent: "7.2%", color: "#ff7a1a" },
  { name: "Website", value: 1245, percent: "4.8%", color: "#f7a63c" },
  { name: "WhatsApp", value: 985, percent: "3.8%", color: "#143d6a" },
];

export const funnelData = [
  {
    stage: "New Leads",
    value: "25,680",
    percent: "",
    width: "100%",
    color: "#082b55",
  },
  {
    stage: "Assigned",
    value: "18,245",
    percent: "71.0%",
    width: "88%",
    color: "#ff6b00",
  },
  {
    stage: "Contacted",
    value: "12,548",
    percent: "48.9%",
    width: "76%",
    color: "#2c83c5",
  },
  {
    stage: "Interested",
    value: "6,325",
    percent: "24.6%",
    width: "64%",
    color: "#48a6df",
  },
  {
    stage: "Site Visits",
    value: "2,568",
    percent: "10.0%",
    width: "52%",
    color: "#73c4ea",
  },
  {
    stage: "Negotiation",
    value: "1,025",
    percent: "4.0%",
    width: "40%",
    color: "#9bd8f0",
  },
  {
    stage: "Token Pending",
    value: "568",
    percent: "2.2%",
    width: "29%",
    color: "#ffd29d",
  },
  {
    stage: "Bookings",
    value: "256",
    percent: "1.0%",
    width: "18%",
    color: "#ffb66c",
  },
];

export const aiLeads = [
  ["Rohit Sharma", "Green Heights", 92, "Negotiation", "Priya Singh"],
  ["Anjali Mehta", "Skyline Residences", 88, "Site Visit Done", "Amit Kumar"],
  ["Vikram Patel", "Urban Nest", 85, "Negotiation", "Neha Verma"],
  ["Kavita Iyer", "Palm Springs", 82, "Site Visit Done", "Ravi Sharma"],
  ["Sandeep Jain", "Tru Sky Villas", 78, "Follow-up", "Priya Singh"],
] as const;

export const teamRows = [
  ["Priya Singh", "1,568", "2,458", "1,248", "248", "28", "1.79%"],
  ["Amit Kumar", "1,458", "2,125", "1,025", "218", "24", "1.64%"],
  ["Neha Verma", "1,256", "1,856", "856", "185", "18", "1.43%"],
  ["Ravi Sharma", "1,158", "1,652", "785", "156", "16", "1.38%"],
  ["Karan Patel", "985", "1,458", "625", "125", "12", "1.22%"],
] as const;

export const siteVisitData = [
  { date: "01 May", scheduled: 430, completed: 170 },
  { date: "05 May", scheduled: 760, completed: 350 },
  { date: "08 May", scheduled: 860, completed: 610 },
  { date: "12 May", scheduled: 690, completed: 450 },
  { date: "15 May", scheduled: 1010, completed: 550 },
  { date: "18 May", scheduled: 880, completed: 650 },
  { date: "22 May", scheduled: 1240, completed: 820 },
  { date: "26 May", scheduled: 980, completed: 680 },
  { date: "31 May", scheduled: 920, completed: 480 },
];

export const alerts = [
  {
    title: "1,028 Missed follow-ups",
    subtitle: "Need immediate action",
    time: "10 min ago",
    tone: "danger",
  },
  {
    title: "High value lead received",
    subtitle: "Source: MagicBricks",
    time: "20 min ago",
    tone: "warning",
  },
  {
    title: "Site visit delayed",
    subtitle: "Customer: Rohit Sharma",
    time: "30 min ago",
    tone: "warning",
  },
  {
    title: "Executive not reached site",
    subtitle: "Anjali Mehta - Skyline Residences",
    time: "45 min ago",
    tone: "danger",
  },
  {
    title: "API sync failed",
    subtitle: "MagicBricks integration",
    time: "1 hr ago",
    tone: "danger",
  },
] as const;

export const quickActions = [
  "Add New Lead",
  "Import Leads",
  "Assign Leads",
  "Create Task",
  "Schedule Visit",
  "Send Notification",
  "View Reports",
];

export const reportShortcuts = [
  "Daily Report",
  "Weekly Report",
  "Monthly Report",
  "Source Report",
  "Booking Report",
  "Revenue Report",
  "View All Reports",
];

export const mapExecutives = [
  {
    name: "Priya Singh",
    initials: "PS",
    area: "Andheri East",
    status: "Showing Green Heights",
    lastUpdated: "Updated 3 min ago",
    locationQuery: "Andheri East Mumbai",
    tone: "bg-secondary",
  },
  {
    name: "Amit Kumar",
    initials: "AK",
    area: "Bandra Kurla Complex",
    status: "Meeting a new lead",
    lastUpdated: "Updated 7 min ago",
    locationQuery: "Bandra Kurla Complex Mumbai",
    tone: "bg-primary",
  },
  {
    name: "Neha Verma",
    initials: "NV",
    area: "Chembur",
    status: "Heading to site visit",
    lastUpdated: "Updated 11 min ago",
    locationQuery: "Chembur Mumbai",
    tone: "bg-[#e85d75]",
  },
  {
    name: "Ravi Sharma",
    initials: "RS",
    area: "Ghatkopar",
    status: "Follow-up on location",
    lastUpdated: "Updated 14 min ago",
    locationQuery: "Ghatkopar Mumbai",
    tone: "bg-[#2788c7]",
  },
] as const;

export const dashboardIcons = {
  building: Building2,
  phone: PhoneCall,
  target: Target,
  bell: BellRing,
};
