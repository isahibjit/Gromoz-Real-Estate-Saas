import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import type { AuthTokens, ModulePermission } from "@truroot/shared/auth";

import { makeStore } from "../../../store";
import { setCredentials, updateSessionUser } from "../../../store/slices/authSlice";
import { DashboardSidebar } from "./DashboardSidebar";

jest.mock("../../../common/services/auth.api", () => ({
  logout: jest.fn(),
}));

function permission(moduleKey: string, canView = true): ModulePermission {
  return { moduleKey, canView, canCreate: canView, canUpdate: canView, canDelete: canView, canPunchIn: canView, canPunchOut: canView };
}

const adminPermissions = [
  "dashboard", "page.dashboard", "leads", "page.all_leads", "page.import_leads",
  "page.lead_analytics", "employees", "page.employee_directory", "tasks", "page.tasks",
  "attendance", "page.attendance",
].map((key) => permission(key));

function renderSidebar(initialPath = "/", collapsed = false, role: AuthTokens["user"]["role"] = "ADMIN", permissions = adminPermissions) {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "access-token",
      user: {
        id: "user-1",
        email: "admin@truroot.com",
        role,
        fullName: "Admin User",
        permissions,
      },
    }),
  );

  const result = render(
    <QueryClientProvider client={new QueryClient()}>
      <Provider store={store}>
        <MemoryRouter
          initialEntries={[initialPath]}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <DashboardSidebar
            collapsed={collapsed}
            mobileOpen={false}
            onCollapse={() => undefined}
            onMobileClose={() => undefined}
          />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
  return { ...result, store };
}

beforeEach(() => localStorage.clear());

test("uses the approved Gromoze lockup by default", () => {
  renderSidebar();
  expect(screen.getByRole("img", { name: "Gromoze — Real Estate Sales. Simplified." })).toBeInTheDocument();
  expect(screen.queryByAltText("Truroot CRM Logo")).not.toBeInTheDocument();
});

test("shows employee destinations and hides administrator pages for a pre-sales user", () => {
  renderSidebar("/telecaller/dashboard", false, "TELECALLER", [
    permission("dashboard"), permission("page.dashboard"),
    permission("leads"), permission("page.all_leads"),
    permission("access_control"), permission("page.access_control"),
    permission("hr_settings"), permission("page.general_settings"),
  ]);

  expect(screen.getByRole("link", { name: "My Leads" })).toHaveAttribute("href", "/telecaller/leads/my?tab=all");
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/telecaller/dashboard");
  expect(screen.queryByRole("link", { name: "Access Control" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Workspace Settings" })).not.toBeInTheDocument();
});

test("shows the field executive's own routes and respects page visibility", () => {
  renderSidebar("/field-executive/dashboard", false, "SALES_AGENT", [
    permission("dashboard"), permission("page.dashboard"),
    permission("leads"), permission("page.all_leads"),
    permission("site_visits"), permission("page.site_visits", false),
  ]);
  expect(screen.getByRole("link", { name: "My Leads" })).toHaveAttribute("href", "/field-executive/leads");
  expect(screen.queryByRole("link", { name: "Site Visits" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Access Control" })).not.toBeInTheDocument();
});

test("keeps the platform menu separate from tenant navigation", () => {
  renderSidebar("/superadmin", false, "SUPER_ADMIN", []);
  expect(screen.getByRole("link", { name: /Tenant Organizations/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Employee Workspace" })).not.toBeInTheDocument();
});

test("shows tenant management destinations when a platform administrator selects a workspace", () => {
  localStorage.setItem("active_organization_id", "workspace-a");
  renderSidebar("/dashboard", false, "SUPER_ADMIN", []);
  expect(screen.getByRole("link", { name: "Employee Workspace" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "My Leads" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Tenant Organizations/ })).not.toBeInTheDocument();
});

test("requires both module and page access for administrator sidebar links", () => {
  renderSidebar("/dashboard", false, "ADMIN", [
    permission("dashboard"), permission("page.dashboard"),
    permission("access_control"), permission("page.access_control", false),
    permission("hr_settings"), permission("page.general_settings", false),
  ]);

  expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Access Control" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Workspace Settings" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Login Page CMS" })).not.toBeInTheDocument();
});

test("uses permission-matched destinations for assignment and brokerage", () => {
  renderSidebar("/dashboard", false, "TEAM_LEADER", [
    permission("auto_assignment_master"), permission("page.auto_assignment"),
    permission("bookings"), permission("page.booking_finance"),
  ]);
  expect(screen.getByRole("link", { name: "Auto-Assignment Master" }))
    .toHaveAttribute("href", "/leads/auto-assignment");
  expect(screen.getByRole("link", { name: "Brokerage & Payouts" }))
    .toHaveAttribute("href", "/bookings/finance");
  expect(screen.queryByRole("link", { name: "Bookings & Deals" })).not.toBeInTheDocument();
});

test("updates visible links when the session permissions change", () => {
  const { store } = renderSidebar("/dashboard", false, "ADMIN", [
    permission("access_control"), permission("page.access_control"),
  ]);
  expect(screen.getByRole("link", { name: "Access Control" })).toBeInTheDocument();
  const user = store.getState().auth.user;
  if (!user) throw new Error("Expected a signed-in user");
  act(() => store.dispatch(updateSessionUser({
    ...user,
    permissions: [permission("access_control"), permission("page.access_control", false)],
  })));
  expect(screen.queryByRole("link", { name: "Access Control" })).not.toBeInTheDocument();
});

test("uses the symbol instead of shrinking the wordmark when collapsed", () => {
  renderSidebar("/", true);
  expect(screen.getByRole("img", { name: "Gromoze logo" })).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: "Gromoze — Real Estate Sales. Simplified." })).not.toBeInTheDocument();
});

test.each([false, true])("preserves custom tenant logos when collapsed is %s", (collapsed) => {
  localStorage.setItem("active_organization_id", "workspace-a");
  localStorage.setItem("visiblo_workspace_branding_workspace-a", JSON.stringify({
    logoUrl: "/custom-company-logo.png",
    collapsedLogoUrl: "/custom-company-symbol.png",
    showLogoInSidebar: true,
  }));
  renderSidebar("/", collapsed);
  expect(screen.getByAltText("Company Logo")).toHaveAttribute("src", collapsed ? "/custom-company-symbol.png" : "/custom-company-logo.png");
  expect(screen.queryByRole("img", { name: /Gromoze/ })).not.toBeInTheDocument();
});

test("uses canonical routes and omits source analytics", () => {
  renderSidebar();

  expect(screen.getByRole("link", { name: /Portal Integrations/ })).toHaveAttribute(
    "href",
    "/leads/import",
  );
  expect(screen.getByRole("link", { name: "Import CSV Leads" })).toHaveAttribute(
    "href",
    "/leads/import?method=excel-csv",
  );
  expect(screen.getByRole("link", { name: /Conversion Funnel/ })).toHaveAttribute(
    "href",
    "/leads/conversion-analytics",
  );
  expect(screen.getByRole("link", { name: "Employee Workspace" })).toHaveAttribute(
    "href",
    "/admin/employees",
  );
  expect(screen.getByRole("link", { name: "Employee Tasks" })).toHaveAttribute(
    "href",
    "/admin/tasks",
  );
  expect(screen.getByRole("link", { name: "Attendance & Shifts" })).toHaveAttribute(
    "href",
    "/admin/attendance",
  );
  expect(
    screen.queryByRole("link", { name: "Source Analytics" }),
  ).not.toBeInTheDocument();
});

test("highlights only the selected import method", () => {
  renderSidebar("/leads/import?method=excel-csv");

  expect(
    screen.getByRole("link", { name: /Portal Integrations/ }),
  ).not.toHaveClass("bg-primary");
  expect(screen.getByRole("link", { name: "Import CSV Leads" })).toHaveClass(
    "bg-primary",
  );
});
