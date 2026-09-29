import {
  BellRing,
  CalendarClock,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Flame,
  LayoutDashboard,
  MapPinned,
  PhoneCall,
  Target,
  UserRoundCheck,
} from "lucide-react";

import type { SidebarItem } from "../../admin/dashboard/dashboardData";
import { myEmploymentSidebarItem } from "../../hr/hrSidebarData";

import {
  buildTelecallerMyLeadsPath,
  TELECALLER_LEAD_TAB_VALUES,
} from "../leads/telecallerLeadFilters";

export const telecallerSidebarItems: SidebarItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/telecaller/dashboard",
    moduleKey: "dashboard",
    pageKey: "page.dashboard",
  },
  {
    label: "My Leads",
    icon: Target,
    to: buildTelecallerMyLeadsPath({ tab: TELECALLER_LEAD_TAB_VALUES.ALL }),
    moduleKey: "leads",
    pageKey: "page.all_leads",
  },
  {
    label: "Follow-Ups",
    icon: CalendarClock,
    to: "/telecaller/follow-ups",
    moduleKey: "leads",
    pageKey: "page.follow_up_leads",
  },
  {
    label: "Site Visits",
    icon: CalendarCheck,
    to: "/telecaller/visits/history",
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

export const iconMap: Record<string, React.ElementType> = {
  phone: PhoneCall,
  calendar: CalendarCheck,
  mapPin: MapPinned,
  fileText: FileText,
  checkCircle: CheckCircle2,
  bell: BellRing,
  flame: Flame,
};
