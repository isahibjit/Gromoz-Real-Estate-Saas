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

function renderSidebar(initialPath = "/") {
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
            collapsed={false}
            mobileOpen={false}
            onCollapse={() => undefined}
            onMobileClose={() => undefined}
          />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

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
