import type { AuthTokens } from "@truroot/shared/auth";
import { Smartphone, type LucideIcon } from "lucide-react";
import { getNavigationForUser } from "../../../common/navigation/navigationRegistry";

export interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
  badge?: string;
}

export interface NavCategory {
  title: string;
  items: NavItem[];
}

// Presentation only: permissions and role scopes come from the navigation registry.
const presentation: Record<string, { category: string; label?: string; to?: string }> = {
  "admin.dashboard": { category: "Main" },
  "presales.dashboard": { category: "Main" },
  "field.dashboard": { category: "Main" },
  "leads.all": { category: "Sales & Pipeline", label: "All Leads Pipeline" },
  "leads.pipeline": { category: "Sales & Pipeline" },
  "leads.follow_up": { category: "Sales & Pipeline" },
  "leads.inactive": { category: "Sales & Pipeline" },
  "leads.deleted": { category: "Sales & Pipeline" },
  "leads.contact": { category: "Sales & Pipeline" },
  "leads.import": { category: "Lead Sources & Automation", label: "Portal Integrations" },
  "leads.conversion": { category: "Lead Sources & Automation", label: "Conversion Funnel" },
  "leads.audit": { category: "Reports & Performance" },
  "masters.leads": { category: "Masters", label: "Lead Masters" },
  "masters.auto_assignment": { category: "Masters", label: "Auto-Assignment Master" },
  "masters.projects": { category: "Masters", label: "Project Masters" },
  projects: { category: "Projects & Inventory", label: "Projects & Inventory" },
  site_visits: { category: "Site Visits & Field Force", label: "Site Visits Manager", to: "/site-visits" },
  "bookings.pipeline": { category: "Bookings & Revenue", label: "Bookings & Deals" },
  "bookings.finance": { category: "Bookings & Revenue", label: "Brokerage & Payouts" },
  "employees.directory": { category: "HR & Team Management", label: "Employee Workspace" },
  "employees.tasks": { category: "HR & Team Management", label: "Employee Tasks" },
  "employees.attendance": { category: "HR & Team Management", label: "Attendance & Shifts" },
  "employees.performance": { category: "Reports & Performance" },
  "employees.lead_performance": { category: "Reports & Performance" },
  "employees.access_control": { category: "Workspace & Settings" },
  "settings.general": { category: "Workspace & Settings", label: "Workspace Settings" },
};

const categoryOrder = [
  "Main", "Sales & Pipeline", "Masters", "Projects & Inventory",
  "Site Visits & Field Force", "Bookings & Revenue", "Lead Sources & Automation",
  "HR & Team Management", "My Employment", "Reports & Performance", "Workspace & Settings",
];

function defaultCategory(id: string): string {
  if (id.startsWith("employee.")) return "My Employment";
  if (id.startsWith("employees.")) return "HR & Team Management";
  if (id.startsWith("settings.") || id.endsWith("notifications")) return "Workspace & Settings";
  if (id.includes("performance") || id.includes("commissions")) return "Reports & Performance";
  if (id.includes("visits")) return "Site Visits & Field Force";
  return "Sales & Pipeline";
}

export function buildSidebarCategories(
  user: AuthTokens["user"] | null | undefined,
  pathname: string,
  workspaceAdmin?: boolean,
): NavCategory[] {
  if (!user) return [];
  const categories = new Map<string, NavItem[]>();
  const add = (category: string, item: NavItem) => {
    const existing = categories.get(category) ?? [];
    existing.push(item);
    categories.set(category, existing);
  };

  for (const item of getNavigationForUser(user, pathname, workspaceAdmin)) {
    if (user.role === "SUPER_ADMIN" && item.roleScopes && !item.roleScopes.includes("ADMIN")) continue;
    const entries = item.children?.length ? item.children : [item];
    for (const entry of entries) {
      if (!entry.to) continue;
      if (user.role === "SUPER_ADMIN" && entry.roleScopes && !entry.roleScopes.includes("ADMIN")) continue;
      const display = presentation[entry.id];
      const category = display?.category ?? defaultCategory(entry.id);
      const navItem = {
        label: display?.label ?? entry.label,
        to: display?.to ?? entry.to,
        icon: item.icon,
      };
      add(category, navItem);
      if (entry.id === "leads.import") {
        add(category, { ...navItem, label: "Import CSV Leads", to: "/leads/import?method=excel-csv" });
      }
      if (entry.id === "settings.general") {
        add(category, { ...navItem, label: "Login Page CMS", to: "/admin/settings?tab=login-cms" });
      }
      if (entry.id === "bookings.finance") {
        add(category, { ...navItem, label: "My Commissions" });
      }
    }
  }

  add("Workspace & Settings", { label: "Mobile App Download", icon: Smartphone, to: "/download-app" });
  return categoryOrder.flatMap((title) => {
    const items = categories.get(title);
    return items?.length ? [{ title, items }] : [];
  });
}
