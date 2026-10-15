import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../../store";
import { setCredentials } from "../../../store/slices/authSlice";
import { DashboardSidebar } from "./DashboardSidebar";

jest.mock("../../../common/services/auth.api", () => ({
  logout: jest.fn(),
}));

function renderSidebar(initialPath = "/", collapsed = false) {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "access-token",
      user: {
        id: "user-1",
        email: "admin@truroot.com",
        role: "ADMIN",
        fullName: "Admin User",
      },
    }),
  );

  return render(
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
}

beforeEach(() => localStorage.clear());

test("uses the approved Gromoze lockup by default", () => {
  renderSidebar();
  expect(screen.getByRole("img", { name: "Gromoze — Real Estate Sales. Simplified." })).toBeInTheDocument();
  expect(screen.queryByAltText("Truroot CRM Logo")).not.toBeInTheDocument();
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
