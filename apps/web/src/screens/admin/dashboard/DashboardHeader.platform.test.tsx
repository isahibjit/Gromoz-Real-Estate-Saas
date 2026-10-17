import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { DashboardHeader } from "./DashboardHeader";
import { api } from "../../../common/api";

jest.mock("../../../common/api", () => ({ api: { get: jest.fn() } }));
jest.mock("../../../store", () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      auth: {
        user: {
          id: "platform-admin",
          role: "SUPER_ADMIN",
          fullName: "Platform operator",
          email: "admin@example.test",
        },
      },
    }),
}));
jest.mock("../../../common/mutations/useAuthMutations", () => ({
  useLogoutMutation: () => ({ mutate: jest.fn() }),
}));
jest.mock("./DashboardSidebar", () => ({ MobileMenuButton: () => null }));
jest.mock("./DashboardLayoutContext", () => ({
  useDashboardLayoutContext: () => null,
}));

test("platform header never loads employee or tenant feeds and links to its own account", () => {
  localStorage.clear();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter
        initialEntries={["/superadmin/audit"]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <DashboardHeader
          onMobileMenuOpen={() => undefined}
          onDesktopSidebarToggle={() => undefined}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  expect(api.get).not.toHaveBeenCalled();
  expect(screen.queryByTitle("Notifications")).not.toBeInTheDocument();
  expect(screen.queryByText("Add Lead")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
  expect(screen.getByRole("link", { name: "My Profile" })).toHaveAttribute(
    "href",
    "/superadmin/account",
  );
  expect(screen.getByText("Platform Super Admin")).toBeInTheDocument();
});
