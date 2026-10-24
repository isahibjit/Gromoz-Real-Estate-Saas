import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactElement } from "react";
import { api } from "../../common/api";
import { TenantBillingPanel } from "./TenantBillingPanel";
import { TenantManagementDialog } from "./TenantManagementDialog";
import type { TenantBillingSummary } from "./platformTenantBilling";

jest.mock("../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
const tenant = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Zone Up Realty",
  slug: "zoneuprealty",
  planTier: "STARTER",
  allocatedSeats: 5,
  setupFeePaid: false,
  memberships: [
    {
      isOwner: true,
      isActive: true,
      role: "ADMIN",
      user: { fullName: "Owner", email: "owner@example.invalid" },
    },
  ],
};
const base: TenantBillingSummary = {
  automaticInvoicingEnabled: true,
  paymentMode: "TEST",
  workspaceStatus: "ACTIVE",
  counts: { total: 6, unpaid: 2, overdue: 1, paid: 3, void: 1 },
  balances: [
    { mode: "TEST", count: 1, amountMinor: 350000, currency: "INR" },
    { mode: "LIVE", count: 1, amountMinor: 250000, currency: "INR" },
  ],
  isTrial: true,
  trialEndsAt: "2026-11-02T08:30:00Z",
  trialDaysRemaining: 9,
  firstPaymentDueAt: "2026-11-02T08:30:00Z",
  nextRenewalAt: null,
  invoiceEligibleFrom: "2026-10-19T08:30:00Z",
  firstPayment: {
    completed: false,
    requiresReview: false,
    replacementRequired: false,
    canCreateLink: true,
    blockedReason: null,
    setupFeeStatus: "UNPAID",
    invoice: null,
    savedQuote: {
      seats: 5,
      unitAmountMinor: 50000,
      setupFeeMinor: 100000,
      seatAmountMinor: 250000,
      amountMinor: 350000,
      currency: "INR",
      items: [
        {
          description: "Workspace setup fee",
          quantity: 1,
          unitAmountMinor: 100000,
          amountMinor: 100000,
        },
        {
          description: "Workspace user seats - 30 days",
          quantity: 5,
          unitAmountMinor: 50000,
          amountMinor: 250000,
        },
      ],
    },
  },
};
const get = jest.mocked(api.get),
  post = jest.mocked(api.post);
let summary: TenantBillingSummary;
function mount(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  jest.resetAllMocks();
  summary = {
    ...base,
    firstPayment: { ...base.firstPayment },
    counts: { ...base.counts },
    balances: base.balances.map((item) => ({ ...item })),
  };
  localStorage.setItem("active_organization_id", "selected-workspace");
  get.mockImplementation(async (url) => ({
    data: String(url).endsWith("/summary")
      ? summary
      : { items: [], total: 0, page: 1, pageSize: 10 },
  }));
});
test("shows actual invoice counts and separate environment balances without changing the workspace", async () => {
  const { container } = mountPanel();
  expect(await screen.findByText("Total invoices")).toBeInTheDocument();
  expect(screen.getByText("Total invoices").parentElement).toHaveTextContent(
    "6",
  );
  expect(screen.getByText("Unpaid").parentElement).toHaveTextContent("2");
  expect(screen.getByText("Overdue").parentElement).toHaveTextContent("1");
  expect(screen.getByText("Test invoices")).toBeInTheDocument();
  expect(screen.getByText("Live invoices")).toBeInTheDocument();
  expect(
    screen.getByText(/Overdue invoices are included in Unpaid/),
  ).toBeInTheDocument();
  expect(localStorage.getItem("active_organization_id")).toBe(
    "selected-workspace",
  );
  expect(container.textContent).not.toContain(tenant.id);
});
function mountPanel() {
  mount(<TenantBillingPanel tenantId={tenant.id} />);
  return { container: document.body };
}
test("does not fabricate a trial date or treat empty history as payment completion", async () => {
  summary = {
    ...summary,
    automaticInvoicingEnabled: false,
    isTrial: false,
    trialEndsAt: null,
    firstPaymentDueAt: null,
    invoiceEligibleFrom: null,
    trialDaysRemaining: null,
    counts: { total: 0, unpaid: 0, overdue: 0, paid: 0, void: 0 },
  };
  mount(<TenantBillingPanel tenantId={tenant.id} />);
  expect(
    await screen.findByText("Automatic invoicing disabled"),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      /This does not mean the first subscription payment is completed/,
    ),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Not recorded").length).toBeGreaterThan(0);
  expect(screen.getByText("Not scheduled")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Configure invoice settings" }),
  ).toHaveAttribute("href", "/superadmin/settings");
});
test("shows a billing failure instead of making invoice counts zero", async () => {
  get.mockImplementation(async (url) => {
    if (String(url).endsWith("/summary")) throw new Error("Unavailable");
    return { data: { items: [], total: 0 } };
  });
  mount(<TenantBillingPanel tenantId={tenant.id} />);
  expect(
    await screen.findByRole("button", { name: "Retry billing" }),
  ).toBeInTheDocument();
  expect(screen.queryByText("Total invoices")).not.toBeInTheDocument();
});
test("explains the first-payment amount, trial deadline and absence of automatic charging", async () => {
  mount(
    <TenantManagementDialog
      tenant={tenant}
      onClose={jest.fn()}
      onSaved={jest.fn()}
    />,
  );
  await userEvent.click(screen.getByRole("tab", { name: "Billing" }));
  expect(
    await screen.findByText("First subscription payment"),
  ).toBeInTheDocument();
  expect(screen.getByText(/5 licensed seats x/)).toHaveTextContent("500");
  expect(
    screen.getByText("Total first payment").parentElement,
  ).toHaveTextContent("3,500.00");
  expect(screen.getByText("First payment due").parentElement).toHaveTextContent(
    /2 Nov 2026.*02:00\s*pm IST/i,
  );
  expect(
    screen.getByText(/Generating this link does not charge the tenant/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Create first-payment link" }),
  ).toBeEnabled();
  expect(screen.queryByText("Setup payment")).not.toBeInTheDocument();
});
test("refreshes records after a generated link and offers distinct copy/open actions", async () => {
  post.mockResolvedValue({
    data: {
      paymentLinkUrl: "https://example.invalid/pay",
      amount: 3500,
      currency: "INR",
      dueAt: summary.firstPaymentDueAt,
      invoiceNumber: "GZ-TEST-2026-000001",
      notificationStatus: "QUEUED",
    },
  });
  const onSaved = jest.fn();
  mount(
    <TenantManagementDialog
      tenant={tenant}
      onClose={jest.fn()}
      onSaved={onSaved}
    />,
  );
  await userEvent.click(screen.getByRole("tab", { name: "Billing" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Create first-payment link" }),
  );
  expect(
    await screen.findByRole("button", { name: "Copy link" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Open payment link" }),
  ).toHaveAttribute("href", "https://example.invalid/pay");
  expect(
    screen.getByText("Invoice email queued for the tenant administrator."),
  ).toBeInTheDocument();
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(
    get.mock.calls.filter(([url]) => String(url).endsWith("/summary")).length,
  ).toBeGreaterThanOrEqual(2);
});
test("refreshes even when the payment link fails after possible invoice creation", async () => {
  post.mockRejectedValue(new Error("Provider unavailable"));
  const onSaved = jest.fn();
  mount(
    <TenantManagementDialog
      tenant={tenant}
      onClose={jest.fn()}
      onSaved={onSaved}
    />,
  );
  await userEvent.click(screen.getByRole("tab", { name: "Billing" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Create first-payment link" }),
  );
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(
    screen.queryByRole("link", { name: "Open payment link" }),
  ).not.toBeInTheDocument();
  expect(
    get.mock.calls.filter(([url]) => String(url).endsWith("/summary")).length,
  ).toBeGreaterThanOrEqual(2);
});
test("keeps already paid first payments from requesting another setup payment", async () => {
  summary.firstPayment = {
    ...summary.firstPayment,
    completed: true,
    canCreateLink: false,
  };
  summary.nextRenewalAt = "2026-12-02T08:30:00Z";
  mount(
    <TenantManagementDialog
      tenant={{ ...tenant, setupFeePaid: true }}
      onClose={jest.fn()}
      onSaved={jest.fn()}
    />,
  );
  await userEvent.click(screen.getByRole("tab", { name: "Billing" }));
  expect(
    await screen.findByText("First subscription payment completed"),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /payment link/ }),
  ).not.toBeInTheDocument();
});
test("requires saved workspace changes before generating a link", async () => {
  mount(
    <TenantManagementDialog
      tenant={tenant}
      onClose={jest.fn()}
      onSaved={jest.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("Allocated seats"), {
    target: { value: "8" },
  });
  await userEvent.click(screen.getByRole("tab", { name: "Billing" }));
  expect(
    await screen.findByRole("button", { name: "Create first-payment link" }),
  ).toBeDisabled();
  expect(
    screen.getByText(
      "Save workspace changes before generating a payment link.",
    ),
  ).toBeInTheDocument();
});

test.each(["SUSPENDED", "CANCELLED"])(
  "blocks link generation for a %s workspace",
  async (status) => {
    summary.workspaceStatus = status;
    summary.firstPayment = {
      ...summary.firstPayment,
      canCreateLink: false,
      blockedReason:
        "Payments are unavailable while this workspace is suspended or cancelled.",
    };
    mount(
      <TenantManagementDialog
        tenant={tenant}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Billing" }));
    expect(
      await screen.findByRole("button", { name: "Create first-payment link" }),
    ).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  },
);
