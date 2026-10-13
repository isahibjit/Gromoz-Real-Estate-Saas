import type { AuthTokens, ModulePermission } from "@truroot/shared/auth";

import {
  sidebarItems,
  type SidebarChildItem,
  type SidebarItem,
} from "../../screens/admin/dashboard/dashboardData";
import { telecallerSidebarItems } from "../../screens/telecaller/dashboard/telecallerDashboardData";
import { fieldExecutiveSidebarItems } from "../../screens/field-executive/fieldExecutiveData";

export type PermissionAction =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "punchIn"
  | "punchOut";

type AuthUser = AuthTokens["user"] | null | undefined;

const EMPLOYEE_SELF_SERVICE_ROLES = new Set([
  "TELECALLER",
  "SALES_AGENT",
  "FIELD_EXECUTIVE",
  "TEAM_LEADER",
  "MANAGER",
]);
const EMPLOYEE_SELF_SERVICE_READ_MODULES = new Set([
  "payroll",
  "payslips",
  "performance",
  "employees",
  "teams",
  "page.employee_directory",
  "page.teams",
]);

const itemModuleMap: Record<string, string> = {
  Dashboard: "dashboard",
  "Lead Management": "leads",
  Leads: "lead_masters",
  "Auto Assignment Master": "auto_assignment_master",
  Masters: "lead_masters",
  Projects: "projects",
  "Site Visits": "site_visits",
  Bookings: "bookings",
  Employees: "employees",
  Directory: "employees",
  Teams: "teams",
  Attendance: "attendance",
  "Leave Requests": "leaves",
  Leave: "leaves",
  Holidays: "holidays",
  Payroll: "payroll",
  Payslips: "payslips",
  Tasks: "tasks",
  Performance: "performance",
  "My Performance": "performance",
  "My Commissions": "dashboard",
  "Lead Performance": "performance",
  "Calling Performance": "performance",
  "Top Performer Lists": "top_performers",
  "Access Control": "access_control",
  Settings: "hr_settings",
  "My Employment": "notifications",
  Notifications: "notifications",
  "My Profile": "notifications",
  "My Leads": "leads",
  "Follow-Ups": "leads",
  "Follow-ups": "leads",
  Communication: "leads",
  "Call History": "leads",
};

const itemPageMap: Record<string, string> = {
  Dashboard: "page.dashboard",
  "All Leads": "page.all_leads",
  "My Leads": "page.all_leads",
  "Contact Leads": "page.contact_leads",
  "Follow-Up Leads": "page.follow_up_leads",
  "Follow-Ups": "page.follow_up_leads",
  "Follow-ups": "page.follow_up_leads",
  "Inactive Leads": "page.inactive_leads",
  "Deleted Leads": "page.deleted_leads",
  "Lead Pipeline": "page.lead_pipeline",
  "Lead Conversion Analytics": "page.lead_analytics",
  "Import Leads": "page.import_leads",
  Leads: "page.lead_masters",
  "Auto Assignment Master": "page.auto_assignment",
  Projects: "page.projects",
  "Site Visits": "page.site_visits",
  "Bookings Pipeline": "page.bookings_pipeline",
  "Brokerage & Incentives": "page.booking_finance",
  Directory: "page.employee_directory",
  "My Profile": "page.employee_directory",
  Teams: "page.teams",
  Attendance: "page.attendance",
  "Leave Requests": "page.leave_requests",
  Leave: "page.leave_requests",
  Holidays: "page.holidays",
  Payroll: "page.payroll",
  Payslips: "page.payslips",
  Tasks: "page.tasks",
  Performance: "page.performance",
  "Lead Performance": "page.performance",
  "Calling Performance": "page.performance",
  "My Performance": "page.my_performance",
  "Access Control": "page.access_control",
  Settings: "page.general_settings",
  "Email Connectors": "page.email_settings",
  "General Settings": "page.general_settings",
  "Mobile app": "page.mobile_app",
  "Call History": "page.call_history",
  "My Commissions": "page.my_commissions",
  Notifications: "page.notifications",
};

function actionAllowed(permission: ModulePermission | undefined, action: PermissionAction) {
  if (!permission) return false;
  if (action === "view") return permission.canView;
  if (action === "create") return permission.canCreate;
  if (action === "update") return permission.canUpdate;
  if (action === "delete") return permission.canDelete;
  if (action === "punchIn") return permission.canPunchIn;
  return permission.canPunchOut;
}

export function canAccess(
  user: AuthUser,
  moduleKey: string,
  action: PermissionAction = "view",
) {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (
    EMPLOYEE_SELF_SERVICE_READ_MODULES.has(moduleKey) &&
    action === "view" &&
    EMPLOYEE_SELF_SERVICE_ROLES.has(user.role)
  ) {
    return true;
  }
  return actionAllowed(
    user.permissions?.find((permission) => permission.moduleKey === moduleKey),
    action,
  );
}

function moduleForItem(item: SidebarItem | SidebarChildItem) {
  return (
    item.moduleKey ??
    itemModuleMap[item.label] ??
    item.label.toLowerCase().replace(/\s+/g, "_")
  );
}

function pageForItem(item: SidebarItem | SidebarChildItem) {
  return item.pageKey ?? itemPageMap[item.label];
}

function itemAccessible(item: SidebarItem | SidebarChildItem, user: AuthUser) {
  const moduleKey = moduleForItem(item);
  const pageKey = pageForItem(item);
  return (
    canAccess(user, moduleKey, item.requiredAction ?? "view") &&
    (!pageKey || canAccess(user, pageKey))
  );
}

function filterChildren(
  children: SidebarChildItem[] | undefined,
  user: AuthUser,
) {
  return (children ?? []).filter((child) => itemAccessible(child, user));
}

export function filterSidebarItems(items: SidebarItem[], user: AuthUser) {
  return items
    .map((item) => {
      const children = filterChildren(item.children, user);
      if (item.children?.length) {
        return children.length ? { ...item, children } : null;
      }
      return itemAccessible(item, user) ? item : null;
    })
    .filter((item): item is SidebarItem => Boolean(item));
}

function mergeSidebarItems(base: SidebarItem[], additions: SidebarItem[]) {
  const byLabel = new Map<string, SidebarItem>();
  for (const item of [...base, ...additions]) {
    const existing = byLabel.get(item.label);
    if (!existing) {
      byLabel.set(item.label, item);
      continue;
    }
    if (existing.children || item.children) {
      const childByLabel = new Map<string, SidebarChildItem>();
      for (const child of [...(existing.children ?? []), ...(item.children ?? [])]) {
        childByLabel.set(child.label, child);
      }
      byLabel.set(item.label, {
        ...existing,
        ...item,
        children: Array.from(childByLabel.values()),
      });
    }
  }
  return Array.from(byLabel.values());
}

export function buildAccessibleSidebarItems(user: AuthUser) {
  if (!user) return [];
  const adminAccessibleItems = filterSidebarItems(sidebarItems, user);

  if (user.role === "TELECALLER") {
    return mergeSidebarItems(filterSidebarItems(telecallerSidebarItems, user), adminAccessibleItems);
  }

  if (user.role === "SALES_AGENT") {
    return mergeSidebarItems(filterSidebarItems(fieldExecutiveSidebarItems, user), adminAccessibleItems);
  }

  return adminAccessibleItems;
}
