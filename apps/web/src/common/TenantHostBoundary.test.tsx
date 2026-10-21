import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TenantHostBoundary } from "./TenantHostBoundary";
import {
  resolveTenantFromHostname,
  TenantNotFoundError,
  type ResolvedTenant,
} from "./tenantResolver";

jest.mock("./api", () => ({ api: { get: jest.fn() } }));
jest.mock("./tenantResolver", () => ({
  ...jest.requireActual("./tenantResolver"),
  resolveTenantFromHostname: jest.fn(),
}));

const resolveTenant = jest.mocked(resolveTenantFromHostname);
const tenant: ResolvedTenant = {
  id: "tenant-a",
  name: "Cedar",
  slug: "cedar",
  status: "ACTIVE",
};

function renderBoundary() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const mountApp = jest.fn();
  function ProtectedApp() {
    mountApp();
    return <h1>Tenant application</h1>;
  }
  render(
    <QueryClientProvider client={client}>
      <TenantHostBoundary>
        <ProtectedApp />
      </TenantHostBoundary>
    </QueryClientProvider>,
  );
  return { mountApp };
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("does not mount app routes while the workspace is being verified", async () => {
  let completeLookup!: (value: ResolvedTenant) => void;
  resolveTenant.mockReturnValue(
    new Promise((resolve) => {
      completeLookup = resolve;
    }),
  );
  const { mountApp } = renderBoundary();
  expect(
    screen.getByRole("heading", { name: "Finding your workspace" }),
  ).toBeInTheDocument();
  expect(mountApp).not.toHaveBeenCalled();
  completeLookup(tenant);
  expect(
    await screen.findByRole("heading", { name: "Tenant application" }),
  ).toBeInTheDocument();
});

test("replaces app routes with an enquiry page for a confirmed unknown tenant", async () => {
  resolveTenant.mockRejectedValue(
    new TenantNotFoundError(window.location.hostname),
  );
  const { mountApp } = renderBoundary();
  expect(await screen.findByText("Workspace not found")).toBeInTheDocument();
  expect(mountApp).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  const salesLink = screen.getByRole("link", { name: "Contact sales" });
  const destination = new URL(salesLink.getAttribute("href") || "");
  expect(destination.pathname).toBe("support@gromoze.com");
  expect(destination.searchParams.get("subject")).toBe(
    `Workspace enquiry: ${window.location.hostname}`,
  );
  expect(
    screen.getByRole("link", { name: "Platform sign in" }),
  ).toHaveAttribute("href", "https://crm.gromoze.com/login");
  expect(screen.getByRole("link", { name: "Explore Gromoze" })).toHaveAttribute(
    "href",
    "https://gromoze.com",
  );
});

test("shows a retryable connection failure rather than claiming the tenant does not exist", async () => {
  resolveTenant
    .mockRejectedValueOnce(new Error("Network error"))
    .mockResolvedValueOnce(tenant);
  const { mountApp } = renderBoundary();
  expect(
    await screen.findByRole("heading", {
      name: "We couldn't check this workspace.",
    }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Workspace not found")).not.toBeInTheDocument();
  expect(mountApp).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(
    await screen.findByRole("heading", { name: "Tenant application" }),
  ).toBeInTheDocument();
  expect(resolveTenant).toHaveBeenCalledTimes(2);
});

test("allows a valid workspace to reach the existing app", async () => {
  resolveTenant.mockResolvedValue(tenant);
  renderBoundary();
  expect(
    await screen.findByRole("heading", { name: "Tenant application" }),
  ).toBeInTheDocument();
});
