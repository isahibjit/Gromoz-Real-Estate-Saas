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

function renderSidebar() {
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
    "/leads/import/connect/magicbricks",
  );
  expect(screen.getByRole("link", { name: "Import CSV Leads" })).toHaveAttribute(
    "href",
    "/leads/import",
  );
  expect(screen.getByRole("link", { name: /Conversion Funnel/ })).toHaveAttribute(
    "href",
    "/leads/conversion-analytics",
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
