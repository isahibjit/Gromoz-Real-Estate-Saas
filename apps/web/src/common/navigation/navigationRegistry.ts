import {
  BadgeIndianRupee,
  BellRing,
  BriefcaseBusiness,
  Building,
  CalendarCheck,
  CalendarClock,
  Database,
  FolderKanban,
  LayoutDashboard,
  PhoneCall,
  Settings,
  ShieldCheck,
  Target,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { AuthTokens } from "@truroot/shared/auth";
import { isPlatformView } from "../tenantRequestScope";

import type {
  SidebarChildItem,
  SidebarItem,
} from "../../screens/admin/dashboard/dashboardData";
import { canAccess, type PermissionAction } from "../access/access";

type AuthUser = AuthTokens["user"] | null | undefined;

export type NavigationRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "HR"
  | "SALES_MANAGER"
  | "TEAM_LEADER"
  | "MANAGER"
  | "TELECALLER"
  | "SALES_AGENT"
  | "MARKETING"
  | "BACKEND";

export interface NavigationChildItem extends SidebarChildItem {
  id: string;
  moduleKey: string;
  pageKey?: string;
  requiredAction?: PermissionAction;
  matchPaths?: string[];
  roleScopes?: NavigationRole[];
}

export interface NavigationItem extends SidebarItem {
  id: string;
  icon: LucideIcon;
  moduleKey?: string;
  pageKey?: string;
  requiredAction?: PermissionAction;
  matchPaths?: string[];
  roleScopes?: NavigationRole[];
  children?: NavigationChildItem[];
}

export interface ActiveNavigation {
  activeItemId?: string;
  activeChildId?: string;
  activeItem?: string;
  activeChild?: string;
}

const adminRoles: NavigationRole[] = [
  "ADMIN",
  "HR",
  "SALES_MANAGER",
  "TEAM_LEADER",
  "MANAGER",
  "MARKETING",
  "BACKEND",
];

const preSalesRoles: NavigationRole[] = ["TELECALLER"];
const fieldExecutiveRoles: NavigationRole[] = ["SALES_AGENT"];
const employeeRoles: NavigationRole[] = [
  "ADMIN",
  "HR",
  "SALES_MANAGER",
  "TEAM_LEADER",
  "MANAGER",
  "TELECALLER",
  "SALES_AGENT",
  "MARKETING",
  "BACKEND",
];

const admin = (item: NavigationItem): NavigationItem => ({
  ...item,
  roleScopes: item.roleScopes ?? adminRoles,
});

const preSales = (item: NavigationItem): NavigationItem => ({
  ...item,
  roleScopes: item.roleScopes ?? preSalesRoles,
});

const fieldExecutive = (item: NavigationItem): NavigationItem => ({
  ...item,
  roleScopes: item.roleScopes ?? fieldExecutiveRoles,
});

const selfServiceChild = (
  item: Omit<NavigationChildItem, "moduleKey"> & { moduleKey?: string },
): NavigationChildItem => ({
  ...item,
  moduleKey: item.moduleKey ?? "notifications",
});

export const myEmploymentNavigationItem: NavigationItem = {
  id: "employee.self_service",
  label: "My Employment",
  icon: UsersRound,
  children: [
    selfServiceChild({
      id: "employee.profile",
      label: "My Profile",
      to: "/employee/me",
      moduleKey: "employees",
      pageKey: "page.employee_directory",
      matchPaths: ["/employee/me", "/admin/employees/"],
    }),
    selfServiceChild({
      id: "employee.attendance",
      label: "Attendance",
      to: "/employee/attendance",
      moduleKey: "attendance",
      pageKey: "page.attendance",
    }),
    selfServiceChild({
      id: "employee.leaves",
      label: "Leave",
      to: "/employee/leaves",
      moduleKey: "leaves",
      pageKey: "page.leave_requests",
    }),
    selfServiceChild({
      id: "employee.payslips",
      label: "Payslips",
      to: "/employee/payslips",
      moduleKey: "payslips",
      pageKey: "page.payslips",
    }),
    selfServiceChild({
      id: "employee.payroll",
      label: "Payroll",
      to: "/admin/payroll",
      moduleKey: "payroll",
      pageKey: "page.payroll",
      roleScopes: [...preSalesRoles, ...fieldExecutiveRoles],
    }),
    selfServiceChild({
      id: "employee.holidays",
      label: "Holidays",
      to: "/employee/holidays",
      moduleKey: "holidays",
      pageKey: "page.holidays",
    }),
    selfServiceChild({
      id: "employee.tasks",
      label: "Tasks",
      to: "/employee/tasks",
      moduleKey: "tasks",
      pageKey: "page.tasks",
    }),
    selfServiceChild({
      id: "employee.settings",
      label: "Settings",
      to: "/employee/settings",
      moduleKey: "hr_settings",
      pageKey: "page.general_settings",
    }),
  ],
  roleScopes: employeeRoles,
};

export const navigationRegistry: NavigationItem[] = [
  admin({
    id: "admin.dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/dashboard",
    moduleKey: "dashboard",
    pageKey: "page.dashboard",
  }),
  preSales({
    id: "presales.dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/telecaller/dashboard",
    moduleKey: "dashboard",
    pageKey: "page.dashboard",
  }),
  fieldExecutive({
    id: "field.dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: "/field-executive/dashboard",
    moduleKey: "dashboard",
    pageKey: "page.dashboard",
  }),
  admin({
    id: "leads",
    label: "Lead Management",
    icon: UsersRound,
    children: [
      {
        id: "leads.all",
        label: "All Leads",
        to: "/leads/all",
        moduleKey: "leads",
        pageKey: "page.all_leads",
        matchPaths: ["/leads/", "/field-executive/leads/", "/telecaller/leads/"],
      },
      {
        id: "leads.contact",
        label: "Contact Leads",
        to: "/leads/contact",
        moduleKey: "contact_leads",
        pageKey: "page.contact_leads",
      },
      {
        id: "leads.follow_up",
        label: "Follow-Up Leads",
        to: "/leads/follow-up",
        moduleKey: "leads",
        pageKey: "page.follow_up_leads",
      },
      {
        id: "leads.inactive",
        label: "Inactive Leads",
        to: "/leads/inactive",
        moduleKey: "leads",
        pageKey: "page.inactive_leads",
      },
      {
        id: "leads.deleted",
        label: "Deleted Leads",
        to: "/leads/deleted",
        moduleKey: "leads",
        pageKey: "page.deleted_leads",
      },
      {
        id: "leads.pipeline",
        label: "Lead Pipeline",
        to: "/leads/pipeline",
        moduleKey: "leads",
        pageKey: "page.lead_pipeline",
      },
      {
        id: "leads.conversion",
        label: "Lead Conversion Analytics",
        to: "/leads/conversion-analytics",
        moduleKey: "leads",
        pageKey: "page.lead_analytics",
      },
      {
        id: "leads.import",
        label: "Import Leads",
        to: "/leads/import",
        moduleKey: "leads",
        pageKey: "page.import_leads",
      },
    ],
  }),
  preSales({
    id: "presales.leads.mine",
    label: "My Leads",
    icon: Target,
    to: "/telecaller/leads/my?tab=all",
    moduleKey: "leads",
    pageKey: "page.all_leads",
    matchPaths: ["/telecaller/leads"],
  }),
  preSales({
    id: "presales.leads.contact",
    label: "Contact Leads",
    icon: UsersRound,
    to: "/leads/contact",
    moduleKey: "contact_leads",
    pageKey: "page.contact_leads",
    roleScopes: [...preSalesRoles, ...fieldExecutiveRoles],
  }),
  fieldExecutive({
    id: "field.leads",
    label: "My Leads",
    icon: Target,
    to: "/field-executive/leads",
    moduleKey: "leads",
    pageKey: "page.all_leads",
    matchPaths: ["/field-executive/leads"],
  }),
  admin({
    id: "masters",
    label: "Masters",
    icon: Database,
    children: [
      {
        id: "masters.leads",
        label: "Leads",
        to: "/leads/masters",
        moduleKey: "lead_masters",
        pageKey: "page.lead_masters",
      },
      {
        id: "masters.auto_assignment",
        label: "Auto Assignment Master",
        to: "/leads/auto-assignment",
        moduleKey: "auto_assignment_master",
        pageKey: "page.auto_assignment",
      },
      {
        id: "masters.projects",
        label: "Projects",
        to: "/projects/masters",
        moduleKey: "property_masters",
        pageKey: "page.project_masters",
      },
    ],
  }),
  admin({
    id: "projects",
    label: "Projects",
    icon: FolderKanban,
    to: "/projects",
    moduleKey: "projects",
    pageKey: "page.projects",
    matchPaths: ["/projects"],
  }),
  admin({
    id: "site_visits",
    label: "Site Visits",
    icon: CalendarCheck,
    to: "/leads/site-visits",
    moduleKey: "site_visits",
    pageKey: "page.site_visits",
    matchPaths: ["/leads/site-visits", "/site-visits"],
  }),
  preSales({
    id: "presales.follow_ups",
    label: "Follow-Ups",
    icon: CalendarClock,
    to: "/telecaller/follow-ups",
    moduleKey: "leads",
    pageKey: "page.follow_up_leads",
  }),
  fieldExecutive({
    id: "field.site_visits",
    label: "Site Visits",
    icon: CalendarCheck,
    to: "/field-executive/site-visits",
    moduleKey: "site_visits",
    pageKey: "page.site_visits",
    matchPaths: ["/field-executive/site-visits"],
  }),
  fieldExecutive({
    id: "field.follow_ups",
    label: "Follow-ups",
    icon: CalendarClock,
    to: "/field-executive/follow-ups",
    moduleKey: "leads",
    pageKey: "page.follow_up_leads",
  }),
  preSales({
    id: "presales.visits",
    label: "Site Visits",
    icon: CalendarCheck,
    to: "/telecaller/visits/history",
    moduleKey: "site_visits",
    pageKey: "page.site_visits",
  }),
  admin({
    id: "bookings",
    label: "Bookings",
    icon: BriefcaseBusiness,
    children: [
      {
        id: "bookings.pipeline",
        label: "Bookings Pipeline",
        to: "/bookings",
        moduleKey: "bookings",
        pageKey: "page.bookings_pipeline",
      },
      {
        id: "bookings.finance",
        label: "Brokerage & Incentives",
        to: "/bookings/finance",
        moduleKey: "bookings",
        pageKey: "page.booking_finance",
      },
    ],
  }),
  admin({
    id: "employees",
    label: "Employees",
    icon: UsersRound,
    children: [
      {
        id: "employees.directory",
        label: "Directory",
        to: "/admin/employees",
        moduleKey: "employees",
        pageKey: "page.employee_directory",
        matchPaths: ["/admin/employees"],
      },
      { id: "employees.teams", label: "Teams", to: "/admin/teams", moduleKey: "teams", pageKey: "page.teams", matchPaths: ["/admin/teams"] },
      { id: "employees.attendance", label: "Attendance", to: "/admin/attendance", moduleKey: "attendance", pageKey: "page.attendance", matchPaths: ["/admin/attendance"] },
      { id: "employees.leaves", label: "Leave Requests", to: "/admin/leaves", moduleKey: "leaves", pageKey: "page.leave_requests", matchPaths: ["/admin/leaves"] },
      { id: "employees.holidays", label: "Holidays", to: "/admin/holidays", moduleKey: "holidays", pageKey: "page.holidays", matchPaths: ["/admin/holidays"] },
      { id: "employees.payroll", label: "Payroll", to: "/admin/payroll", moduleKey: "payroll", pageKey: "page.payroll", matchPaths: ["/admin/payroll"] },
      { id: "employees.payslips", label: "Payslips", to: "/admin/payslips", moduleKey: "payslips", pageKey: "page.payslips", matchPaths: ["/admin/payslips"] },
      { id: "employees.tasks", label: "Tasks", to: "/admin/tasks", moduleKey: "tasks", pageKey: "page.tasks", matchPaths: ["/admin/tasks"] },
      { id: "employees.performance", label: "Performance", to: "/admin/performance", moduleKey: "performance", pageKey: "page.performance" },
      { id: "employees.lead_performance", label: "Lead Performance", to: "/admin/performance/leads", moduleKey: "performance", pageKey: "page.performance" },
      { id: "employees.access_control", label: "Access Control", to: "/admin/access-control", moduleKey: "access_control", pageKey: "page.access_control" },
    ],
  }),
  admin({
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      {
        id: "settings.notifications",
        label: "Notification Settings",
        to: "/settings/notifications",
        moduleKey: "notifications",
        pageKey: "page.notification_settings",
        roleScopes: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        id: "settings.email",
        label: "Email Connectors",
        to: "/settings/email",
        moduleKey: "hr_settings",
        pageKey: "page.email_settings",
      },
      {
        id: "settings.general",
        label: "General Settings",
        to: "/admin/settings",
        moduleKey: "hr_settings",
        pageKey: "page.general_settings",
      },
    ],
  }),
  preSales({
    id: "presales.communication.calls",
    label: "Call History",
    icon: PhoneCall,
    to: "/call-history",
    moduleKey: "leads",
    pageKey: "page.call_history",
  }),
  admin({
    id: "employees.call_history",
    label: "Call History",
    icon: PhoneCall,
    to: "/call-history",
    moduleKey: "leads",
    pageKey: "page.call_history",
    roleScopes: ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER", "TEAM_LEADER", "MANAGER"],
  }),
  preSales({
    id: "presales.performance.calling",
    label: "Calling Performance",
    icon: PhoneCall,
    to: "/admin/performance/calling",
    moduleKey: "performance",
    pageKey: "page.performance",
  }),
  preSales({
    id: "presales.performance.mine",
    label: "My Performance",
    icon: UserRoundCheck,
    to: "/telecaller/performance",
    moduleKey: "performance",
    pageKey: "page.my_performance",
  }),
  preSales({
    id: "presales.performance.commissions",
    label: "My Commissions",
    icon: BadgeIndianRupee,
    to: "/my-commissions",
    moduleKey: "dashboard",
    pageKey: "page.my_commissions",
  }),
  fieldExecutive({
    id: "field.performance.calling",
    label: "Calling Performance",
    icon: PhoneCall,
    to: "/admin/performance/calling",
    moduleKey: "performance",
    pageKey: "page.performance",
  }),
  fieldExecutive({
    id: "field.commissions",
    label: "My Commissions",
    icon: BadgeIndianRupee,
    to: "/my-commissions",
    moduleKey: "dashboard",
    pageKey: "page.my_commissions",
  }),
  preSales({
    id: "presales.notifications",
    label: "Notifications",
    icon: BellRing,
    to: "/notifications",
    moduleKey: "notifications",
    pageKey: "page.notifications",
  }),
  {
    ...myEmploymentNavigationItem,
    roleScopes: employeeRoles,
  },
  {
    id: "employee.notifications",
    label: "Notifications",
    icon: BellRing,
    to: "/notifications",
    moduleKey: "notifications",
    pageKey: "page.notifications",
    roleScopes: fieldExecutiveRoles,
  },
];

const managementChildForSelfService = new Map<string, string>([
  ["employee.attendance", "employees.attendance"],
  ["employee.leaves", "employees.leaves"],
  ["employee.payslips", "employees.payslips"],
  ["employee.holidays", "employees.holidays"],
  ["employee.tasks", "employees.tasks"],
]);
const accountMenuSelfServiceIds = new Set([
  "employee.profile",
  "employee.settings",
]);

function removeDuplicateSelfServiceNavigation(
  items: NavigationItem[],
): NavigationItem[] {
  const managementChildren = new Set(
    items
      .find((item) => item.id === "employees")
      ?.children?.map((child) => child.id) ?? [],
  );

  return items
    .map((item) => {
      if (item.id !== myEmploymentNavigationItem.id) return item;

      const children = (item.children ?? []).filter((child) => {
        if (
          managementChildren.size > 0 &&
          accountMenuSelfServiceIds.has(child.id)
        ) {
          return false;
        }
        const managementChildId = managementChildForSelfService.get(child.id);
        return !managementChildId || !managementChildren.has(managementChildId);
      });

      return children.length ? { ...item, children } : null;
    })
    .filter((item): item is NavigationItem => Boolean(item));
}

function roleMatches(item: { roleScopes?: NavigationRole[] }, user: AuthUser) {
  if (user?.role === "SUPER_ADMIN") return true;
  if (!item.roleScopes?.length) return true;
  return Boolean(user?.role && item.roleScopes.includes(user.role as NavigationRole));
}

function navigationItemAccessible(
  item: NavigationItem | NavigationChildItem,
  user: AuthUser,
) {
  return (
    (!item.moduleKey ||
      canAccess(user, item.moduleKey, item.requiredAction ?? "view")) &&
    (!item.pageKey || canAccess(user, item.pageKey))
  );
}

export function filterNavigationByPermissions(
  items: NavigationItem[],
  user: AuthUser,
): NavigationItem[] {
  return items
    .filter((item) => roleMatches(item, user))
    .map((item) => {
      const children = (item.children ?? [])
        .filter((child) => roleMatches(child, user))
        .filter((child) => navigationItemAccessible(child, user));
      if (item.children?.length) {
        return children.length ? { ...item, children } : null;
      }
      if (!item.moduleKey) return item;
      return navigationItemAccessible(item, user)
        ? item
        : null;
    })
    .filter((item): item is NavigationItem => Boolean(item));
}

export const platformSuperAdminNavigation: NavigationItem[] = [
  {
    id: "platform.dashboard",
    label: "SuperAdmin Dashboard",
    icon: ShieldCheck,
    to: "/superadmin",
    matchPaths: ["/superadmin"],
    roleScopes: ["SUPER_ADMIN"],
  },
  {
    id: "platform.tenants",
    label: "Tenant Organizations",
    icon: Building,
    to: "/superadmin/tenants",
    matchPaths: ["/superadmin/tenants"],
    roleScopes: ["SUPER_ADMIN"],
  },
  {
    id: "platform.plans",
    label: "Pricing & Plans",
    icon: BadgeIndianRupee,
    to: "/superadmin/plans",
    matchPaths: ["/superadmin/plans"],
    roleScopes: ["SUPER_ADMIN"],
  },
  {
    id: "platform.audit",
    label: "Platform Audit Logs",
    icon: Database,
    to: "/superadmin/audit",
    matchPaths: ["/superadmin/audit"],
    roleScopes: ["SUPER_ADMIN"],
  },
  {
    id: "platform.settings",
    label: "Platform Settings",
    icon: ShieldCheck,
    to: "/superadmin/settings",
    matchPaths: ["/superadmin/settings"],
    roleScopes: ["SUPER_ADMIN"],
  },
  {
    id: "platform.mobile-app",
    label: "Mobile app releases",
    icon: Settings,
    to: "/superadmin/mobile-app",
    matchPaths: ["/superadmin/mobile-app"],
    roleScopes: ["SUPER_ADMIN"],
  },
];

export function getNavigationForUser(user: AuthUser) {
  if (isPlatformView(user?.role)) {
    return platformSuperAdminNavigation;
  }

  return removeDuplicateSelfServiceNavigation(
    filterNavigationByPermissions(navigationRegistry, user),
  );
}

export function getFirstAccessibleNavigationPath(user: AuthUser) {
  if (isPlatformView(user?.role)) {
    return "/superadmin";
  }
  const [firstItem] = getNavigationForUser(user);
  if (!firstItem) return null;
  return firstItem.to ?? firstItem.children?.[0]?.to ?? null;
}

function pathMatches(pathname: string, target: string) {
  const cleanPath = pathname.split("?")[0];
  const cleanTarget = target.split("?")[0];
  return cleanPath === cleanTarget || cleanPath.startsWith(`${cleanTarget}/`);
}

function itemMatchesPath(
  item: NavigationItem | NavigationChildItem,
  pathname: string,
) {
  const candidates = [item.to, ...(item.matchPaths ?? [])].filter(
    (value): value is string => Boolean(value),
  );
  return candidates.some((candidate) => pathMatches(pathname, candidate));
}

export function getActiveNavigation(
  pathname: string,
  items?: NavigationItem[],
): ActiveNavigation {
  const effectiveItems =
    items ??
    (pathname.startsWith("/superadmin")
      ? platformSuperAdminNavigation
      : navigationRegistry);
  const matches: Array<{
    item: NavigationItem;
    child?: NavigationChildItem;
    score: number;
  }> = [];

  for (const item of effectiveItems) {
    if (itemMatchesPath(item, pathname)) {
      matches.push({ item, score: item.to?.length ?? 0 });
    }
    for (const child of item.children ?? []) {
      if (itemMatchesPath(child, pathname)) {
        matches.push({
          item,
          child,
          score: Math.max(
            child.to?.split("?")[0].length ?? 0,
            ...(child.matchPaths ?? []).map((path) => path.length),
          ),
        });
      }
    }
  }

  const best = matches.sort((a, b) => b.score - a.score)[0];
  return {
    activeItemId: best?.item.id,
    activeChildId: best?.child?.id,
    activeItem: best?.item.label,
    activeChild: best?.child?.label,
  };
}

export function buildBreadcrumbsFromNavigation(pathname: string) {
  const active = getActiveNavigation(pathname);
  return [active.activeItem, active.activeChild].filter(Boolean) as string[];
}

export function moduleKeyForPath(pathname: string) {
  if (pathname.startsWith("/reports")) return "dashboard";
  if (["/admin/attendance", "/employee/attendance"].includes(pathname)) {
    return "attendance";
  }
  const active = getActiveNavigation(pathname);
  const item = navigationRegistry.find((entry) => entry.id === active.activeItemId);
  const child = item?.children?.find((entry) => entry.id === active.activeChildId);
  if (child?.moduleKey ?? item?.moduleKey) {
    return child?.moduleKey ?? item?.moduleKey ?? null;
  }
  if (pathname.startsWith("/leads")) return "leads";
  if (pathname.startsWith("/site-visits")) return "site_visits";
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/bookings")) return "bookings";
  return null;
}

export function pageKeyForPath(pathname: string) {
  if (["/admin/attendance", "/employee/attendance"].includes(pathname)) {
    return "page.attendance";
  }
  const active = getActiveNavigation(pathname);
  const item = navigationRegistry.find((entry) => entry.id === active.activeItemId);
  const child = item?.children?.find((entry) => entry.id === active.activeChildId);
  return child?.pageKey ?? item?.pageKey ?? null;
}
