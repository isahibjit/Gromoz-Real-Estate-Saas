import {
  BellRing,
  CalendarCheck,
  CalendarClock,
  LayoutDashboard,
  PhoneCall,
  Target,
  UserRoundCheck,
} from "lucide-react";

import type { SidebarItem } from "../admin/dashboard/dashboardData";
import { myEmploymentSidebarItem } from "../hr/hrSidebarData";

export const fieldExecutiveSidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/field-executive/dashboard",
    moduleKey: "dashboard",
    pageKey: "page.dashboard",
  },
  {
    label: "My Leads",
    icon: Target,
    to: "/field-executive/leads",
    moduleKey: "leads",
    pageKey: "page.all_leads",
  },
  {
    label: "Follow-Ups",
    icon: CalendarClock,
    to: "/field-executive/follow-ups",
    moduleKey: "leads",
    pageKey: "page.follow_up_leads",
  },
  {
    label: "Site Visits",
    icon: CalendarCheck,
    to: "/field-executive/site-visits",
    moduleKey: "site_visits",
    pageKey: "page.site_visits",
  },
  {
    label: "Call History",
    icon: PhoneCall,
    to: "/telecaller/communication/call-history",
    moduleKey: "leads",
    pageKey: "page.call_history",
  },
  {
    label: "Calling Performance",
    icon: PhoneCall,
    to: "/admin/performance/calling",
    moduleKey: "performance",
    pageKey: "page.performance",
  },
  {
    label: "My Performance",
    icon: UserRoundCheck,
    to: "/telecaller/performance",
    moduleKey: "performance",
    pageKey: "page.my_performance",
  },
  {
    label: "My Commissions",
    icon: Target,
    to: "/my-commissions",
    moduleKey: "dashboard",
    pageKey: "page.my_commissions",
  },
  {
    label: "Notifications",
    icon: BellRing,
    to: "/notifications",
    moduleKey: "notifications",
    pageKey: "page.notifications",
  },
  myEmploymentSidebarItem,
];
