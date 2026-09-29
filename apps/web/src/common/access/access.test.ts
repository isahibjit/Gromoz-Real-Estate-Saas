import type { AuthTokens, ModulePermission } from "@truroot/shared/auth";

import { filterSidebarItems } from "./access";
import { sidebarItems } from "../../screens/admin/dashboard/dashboardData";
import { telecallerSidebarItems } from "../../screens/telecaller/dashboard/telecallerDashboardData";
import { myEmploymentSidebarItem } from "../../screens/hr/hrSidebarData";
import {
  getNavigationForUser,
  moduleKeyForPath,
  pageKeyForPath,
} from "../navigation/navigationRegistry";

type AuthUser = AuthTokens["user"];

function permission(moduleKey: string, canView: boolean): ModulePermission {
  return {
    moduleKey,
    canView,
    canCreate: canView,
    canUpdate: canView,
    canDelete: canView,
    canPunchIn: canView,
    canPunchOut: canView,
  };
}

function userWithPermissions(
  role: AuthUser["role"],
  permissions: ModulePermission[],
): AuthUser {
  return {
    id: `${role.toLowerCase()}-user`,
    email: `${role.toLowerCase()}@truroot.test`,
    role,
    fullName: role,
    permissions,
  };
}

test("hides role sidebar pages when page visibility is disabled", () => {
  const user = userWithPermissions("TELECALLER", [
    permission("dashboard", true),
    permission("leads", true),
    permission("site_visits", true),
    permission("performance", true),
    permission("notifications", true),
    permission("employees", true),
    permission("attendance", true),
    permission("leaves", true),
    permission("payslips", true),
    permission("holidays", true),
    permission("tasks", true),
    permission("hr_settings", true),
    permission("page.dashboard", true),
    permission("page.all_leads", true),
    permission("page.follow_up_leads", true),
    permission("page.site_visits", false),
    permission("page.call_history", true),
    permission("page.my_performance", true),
    permission("page.my_commissions", true),
    permission("page.notifications", true),
    permission("page.employee_directory", true),
    permission("page.attendance", true),
    permission("page.leave_requests", true),
    permission("page.payslips", true),
    permission("page.holidays", true),
    permission("page.tasks", true),
    permission("page.general_settings", true),
  ]);

  const filtered = filterSidebarItems(telecallerSidebarItems, user);

  expect(filtered.map((item) => item.label)).not.toContain("Site Visits");
});

test("page visibility wins over employee self-service module access", () => {
  const user = userWithPermissions("SALES_AGENT", [
    permission("employees", true),
    permission("payslips", true),
    permission("page.employee_directory", true),
    permission("page.payslips", false),
  ]);

  const [employment] = filterSidebarItems([myEmploymentSidebarItem], user);

  expect(employment.children?.map((child) => child.label)).toEqual([
    "My Profile",
  ]);
});

test("main navigation registry applies page visibility to self-service pages", () => {
  const user = userWithPermissions("SALES_AGENT", [
    permission("dashboard", true),
    permission("leads", true),
    permission("employees", true),
    permission("payslips", true),
    permission("page.dashboard", true),
    permission("page.all_leads", true),
    permission("page.employee_directory", true),
    permission("page.payslips", false),
  ]);

  const employment = getNavigationForUser(user).find(
    (item) => item.label === "My Employment",
  );

  expect(employment?.children?.map((child) => child.label)).toEqual([
    "My Profile",
  ]);
});

test("filters child pages independently from their parent module", () => {
  const user = userWithPermissions("ADMIN", [
    permission("bookings", true),
    permission("page.bookings_pipeline", true),
    permission("page.booking_finance", false),
  ]);
  const bookings = sidebarItems.filter((item) => item.label === "Bookings");

  const [filteredBookings] = filterSidebarItems(bookings, user);

  expect(filteredBookings.children?.map((child) => child.label)).toEqual([
    "Bookings Pipeline",
  ]);
});

test("shows Import Leads and hides Masters from fresh manager permissions", () => {
  const user = userWithPermissions("MANAGER", [
    permission("leads", true),
    permission("lead_masters", true),
    permission("auto_assignment_master", true),
    permission("project_masters", true),
    permission("page.import_leads", true),
    permission("page.lead_masters", false),
    permission("page.auto_assignment", false),
    permission("page.project_masters", false),
  ]);

  const navigation = getNavigationForUser(user);
  const leadManagement = navigation.find(
    (item) => item.label === "Lead Management",
  );

  expect(leadManagement?.children?.map((child) => child.label)).toContain(
    "Import Leads",
  );
  expect(navigation.map((item) => item.label)).not.toContain("Masters");
});

test("maps both attendance routes to module and page permissions", () => {
  for (const path of ["/admin/attendance", "/employee/attendance"]) {
    expect(moduleKeyForPath(path)).toBe("attendance");
    expect(pageKeyForPath(path)).toBe("page.attendance");
  }
});

test("shows Contact Leads to Pre Sales with its dedicated module and page access", () => {
  const user = userWithPermissions("TELECALLER", [
    permission("contact_leads", true),
    permission("page.contact_leads", true),
  ]);

  expect(getNavigationForUser(user).map((item) => item.label)).toContain(
    "Contact Leads",
  );
  expect(moduleKeyForPath("/leads/contact")).toBe("contact_leads");
  expect(pageKeyForPath("/leads/contact")).toBe("page.contact_leads");
});
