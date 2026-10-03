import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../../store";
import { setCredentials } from "../../../store/slices/authSlice";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardWorkspaceFrame } from "./DashboardWorkspaceLayout";

jest.mock("../../../common/services/auth.api", () => ({
  logout: jest.fn(),
}));

jest.mock("../../../common/api", () => ({
  api: {
    get: jest.fn(),
  },
}));

function LegacyPage() {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={false}
        mobileOpen={false}
        activeItem="Projects"
        onCollapse={() => undefined}
        onMobileClose={() => undefined}
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          search="ocean"
          onSearchChange={() => undefined}
          breadcrumbs={<span>Layout Breadcrumb</span>}
          onMobileMenuOpen={() => undefined}
          onDesktopSidebarToggle={() => undefined}
        />
        <main>
          <h1>Legacy Project Page</h1>
        </main>
      </div>
    </div>
  );
}

function renderFrame() {
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
          <DashboardWorkspaceFrame>
            <LegacyPage />
          </DashboardWorkspaceFrame>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

test("workspace frame renders one chrome instance and consumes legacy header/sidebar config", async () => {
  renderFrame();

  await waitFor(() => {
    expect(screen.getByText("Layout Breadcrumb")).toBeInTheDocument();
  });

  expect(screen.getAllByRole("banner")).toHaveLength(1);
  expect(screen.getAllByRole("complementary", { name: "Main navigation" })).toHaveLength(1);
  expect(
    screen.getByRole("heading", { name: "Legacy Project Page" }),
  ).toBeInTheDocument();
});
