import type { AuthTokens, ModulePermission } from "@truroot/shared/auth";

import {
  navigationRegistry,
  getNavigationForUser,
  moduleKeyForPath,
  pageKeyForPath,
} from "./navigationRegistry";

type AuthUser = AuthTokens["user"];

function createPermission(moduleKey: string, canView: boolean): ModulePermission {
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

function createAuthUser(
  role: AuthUser["role"],
  permissions: ModulePermission[],
): AuthUser {
  return {
    id: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@example.com`,
    fullName: `Test ${role}`,
    role,
    permissions,
  };
}

describe("navigationRegistry contract tests", () => {
  it("registers valid routes, modules, and page keys for all navigation items", () => {
    for (const item of navigationRegistry) {
      expect(item.id).toBeDefined();
      expect(item.label).toBeDefined();

      if (item.children?.length) {
        for (const child of item.children) {
          expect(child.id).toBeDefined();
          expect(child.label).toBeDefined();
          expect(child.to).toBeDefined();
          expect(child.to?.startsWith("/")).toBe(true);
          if (child.pageKey) {
            expect(child.pageKey.startsWith("page.")).toBe(true);
          }
        }
      } else {
        expect(item.to).toBeDefined();
        expect(item.to?.startsWith("/")).toBe(true);
        if (item.pageKey) {
          expect(item.pageKey.startsWith("page.")).toBe(true);
        }
      }
    }
  });

  it("contains Payroll, Attendance, Leaves, Holidays, Payslips, Tasks under admin employees", () => {
    const adminEmployees = navigationRegistry.find(
      (item) => item.id === "employees",
    );

    expect(adminEmployees).toBeDefined();
    const children = adminEmployees?.children ?? [];
    const childLabels = children.map((c) => c.label);

    expect(childLabels).toContain("Payroll");
    expect(childLabels).toContain("Attendance");
    expect(childLabels).toContain("Leave Requests");
    expect(childLabels).toContain("Holidays");
    expect(childLabels).toContain("Payslips");
    expect(childLabels).toContain("Tasks");

    const payrollChild = children.find((c) => c.label === "Payroll");
    expect(payrollChild).toMatchObject({
      to: "/admin/payroll",
      moduleKey: "payroll",
      pageKey: "page.payroll",
    });
  });

  it("resolves moduleKey and pageKey for /admin/payroll and /admin/attendance", () => {
    expect(moduleKeyForPath("/admin/payroll")).toBe("payroll");
    expect(pageKeyForPath("/admin/payroll")).toBe("page.payroll");

    expect(moduleKeyForPath("/admin/attendance")).toBe("attendance");
    expect(pageKeyForPath("/admin/attendance")).toBe("page.attendance");
  });

  it("shows Project Masters when property master access is enabled", () => {
    const backendUser = createAuthUser("BACKEND", [
      createPermission("property_masters", true),
      createPermission("page.project_masters", true),
    ]);

    const masters = getNavigationForUser(backendUser).find(
      (item) => item.id === "masters",
    );

    expect(masters?.children).toEqual([
      expect.objectContaining({
        id: "masters.projects",
        moduleKey: "property_masters",
        pageKey: "page.project_masters",
      }),
    ]);
    expect(moduleKeyForPath("/projects/masters")).toBe("property_masters");
    expect(pageKeyForPath("/projects/masters")).toBe("page.project_masters");
  });

  it("removes self-service duplicates when management pages are available", () => {
    const backendUser = createAuthUser("BACKEND", [
      createPermission("employees", true),
      createPermission("attendance", true),
      createPermission("leaves", true),
      createPermission("holidays", true),
      createPermission("payslips", true),
      createPermission("tasks", true),
      createPermission("hr_settings", true),
      createPermission("page.employee_directory", true),
      createPermission("page.attendance", true),
      createPermission("page.leave_requests", true),
      createPermission("page.holidays", true),
      createPermission("page.payslips", true),
      createPermission("page.tasks", true),
      createPermission("page.general_settings", true),
    ]);

    const navigation = getNavigationForUser(backendUser);
    const employees = navigation.find((item) => item.id === "employees");

    expect(employees?.children?.map((child) => child.id)).toEqual([
      "employees.directory",
      "employees.attendance",
      "employees.leaves",
      "employees.holidays",
      "employees.payslips",
      "employees.tasks",
    ]);
    expect(navigation.find((item) => item.id === "employee.self_service")).toBeUndefined();
    expect(navigation.find((item) => item.id === "employee.tasks")).toBeUndefined();
  });

  it("keeps self-service navigation when management pages are unavailable", () => {
    const employee = createAuthUser("TELECALLER", [
      createPermission("attendance", true),
      createPermission("page.attendance", true),
    ]);

    const employment = getNavigationForUser(employee).find(
      (item) => item.id === "employee.self_service",
    );

    expect(employment?.children?.map((child) => child.id)).toEqual([
      "employee.attendance",
    ]);
  });

  it("filters navigation dynamically based on user page permissions", () => {
    const userWithPayroll = createAuthUser("ADMIN", [
      createPermission("payroll", true),
      createPermission("page.payroll", true),
      createPermission("employees", true),
      createPermission("page.employee_directory", true),
    ]);

    const navWithPayroll = getNavigationForUser(userWithPayroll);
    const empSectionWith = navWithPayroll.find((item) => item.id === "employees");
    const withLabels = (empSectionWith?.children ?? []).map((c) => c.label);
    expect(withLabels).toContain("Payroll");

    const userWithoutPayroll = createAuthUser("ADMIN", [
      createPermission("payroll", true),
      createPermission("page.payroll", false), // page disabled
      createPermission("employees", true),
      createPermission("page.employee_directory", true),
    ]);

    const navWithoutPayroll = getNavigationForUser(userWithoutPayroll);
    const empSectionWithout = navWithoutPayroll.find((item) => item.id === "employees");
    const withoutLabels = (empSectionWithout?.children ?? []).map((c) => c.label);
    expect(withoutLabels).not.toContain("Payroll");
  });
});
