import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { api } from "../../common/api";
import {
  openRazorpayCheckout,
  type RazorpayOptions,
} from "../../common/services/razorpayClient";
import { AddSeatsDialog } from "./AddSeatsDialog";
import { PaymentHistory, safeReceiptUrl } from "./PaymentHistory";
import { CreateTicketDialog } from "./SupportTickets";
import { BillingOverviewScreen } from "./BillingOverviewScreen";
import type { BillingOverview } from "./workspace.types";
jest.mock("../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock("../../common/services/razorpayClient", () => ({
  openRazorpayCheckout: jest.fn(),
}));
const mockedApi = jest.mocked(api),
  checkout = jest.mocked(openRazorpayCheckout);
const overview: BillingOverview = {
  name: "Tenant A",
  slug: "tenant-a",
  status: "TRIAL",
  planTier: "STARTER",
  planName: "Starter workspace",
  pricePerSeatMonth: 500,
  allocatedSeats: 5,
  activeMembersCount: 5,
  remainingSeats: 0,
  pendingInvitations: 0,
  isTrial: true,
  expiresAt: "2026-11-01T00:00:00Z",
  daysRemaining: 7,
  expiryState: "DUE_SOON",
  contact: {
    ownerName: "Owner A",
    ownerEmail: "owner@tenant.test",
    email: null,
    phone: null,
  },
  availablePlans: [],
};
function mount(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {children}
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = jest.fn();
});
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.setItem("active_organization_id", "tenant-a");
  mockedApi.get.mockResolvedValue({ data: overview });
});
test("shows tenant plan, trial deadline and owner contact without internal identifiers", async () => {
  mount(<BillingOverviewScreen />);
  expect(await screen.findByText("Starter workspace")).toBeInTheDocument();
  expect(screen.getByText("Trial ends in 7 days")).toBeInTheDocument();
  expect(screen.getByText("owner@tenant.test")).toBeInTheDocument();
  expect(screen.queryByText("tenant-a")).not.toBeInTheDocument();
});
test("uses checkout amount from the API and verifies without a browser-supplied seat quantity", async () => {
  let paymentOptions: RazorpayOptions | undefined;
  checkout.mockImplementation(async (options) => {
    paymentOptions = options;
  });
  mockedApi.post
    .mockResolvedValueOnce({
      data: {
        orderId: "order-1",
        amount: 1000,
        additionalSeats: 2,
        currency: "INR",
        razorpayKey: "public-key",
        organizationName: "Tenant A",
      },
    })
    .mockResolvedValue({ data: { success: true } });
  const purchased = jest.fn();
  mount(
    <AddSeatsDialog open onOpenChange={jest.fn()} onPurchased={purchased} />,
  );
  const input = await screen.findByLabelText("Additional seats");
  fireEvent.change(input, { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
  await waitFor(() => expect(checkout).toHaveBeenCalled());
  expect(paymentOptions?.amount).toBe(100000);
  await act(async () => {
    await paymentOptions?.handler({
      razorpay_order_id: "order-1",
      razorpay_payment_id: "payment-1",
      razorpay_signature: "signature",
    });
  });
  await waitFor(() => expect(purchased).toHaveBeenCalled());
  expect(mockedApi.post).toHaveBeenLastCalledWith("/billing/verify-upgrade", {
    orderId: "order-1",
    paymentId: "payment-1",
    signature: "signature",
  });
});
test("retries verification without starting another payment", async () => {
  let paymentOptions: RazorpayOptions | undefined;
  checkout.mockImplementation(async (options) => {
    paymentOptions = options;
  });
  mockedApi.post
    .mockResolvedValueOnce({
      data: {
        orderId: "order-1",
        amount: 500,
        additionalSeats: 1,
        currency: "INR",
        razorpayKey: "key",
      },
    })
    .mockRejectedValueOnce(new Error("Temporary verification failure"))
    .mockResolvedValueOnce({ data: { success: true } });
  const purchased = jest.fn();
  mount(
    <AddSeatsDialog open onOpenChange={jest.fn()} onPurchased={purchased} />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Continue to payment" }),
  );
  await waitFor(() => expect(checkout).toHaveBeenCalled());
  await act(async () => {
    await paymentOptions?.handler({
      razorpay_order_id: "order-1",
      razorpay_payment_id: "payment-1",
      razorpay_signature: "signature",
    });
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry payment verification" }),
  );
  await waitFor(() => expect(purchased).toHaveBeenCalled());
  expect(
    mockedApi.post.mock.calls.filter(
      ([url]) => url === "/billing/upgrade-seats",
    ),
  ).toHaveLength(1);
  expect(
    mockedApi.post.mock.calls.filter(
      ([url]) => url === "/billing/verify-upgrade",
    ),
  ).toHaveLength(2);
});

test("keeps payment pending until verification and allows checkout dismissal without a purchase", async () => {
  let paymentOptions: RazorpayOptions | undefined;
  checkout.mockImplementation(async (options) => {
    paymentOptions = options;
  });
  mockedApi.post.mockResolvedValue({
    data: {
      orderId: "order-1",
      amount: 500,
      additionalSeats: 1,
      currency: "INR",
      razorpayKey: "key",
    },
  });
  const purchased = jest.fn();
  mount(
    <AddSeatsDialog open onOpenChange={jest.fn()} onPurchased={purchased} />,
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Continue to payment" }),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Waiting for payment..." }),
    ).toBeDisabled(),
  );
  act(() => paymentOptions?.modal?.ondismiss?.());
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Continue to payment" }),
    ).toBeEnabled(),
  );
  expect(purchased).not.toHaveBeenCalled();
});
test("shows receipts only when a safe provider URL exists and passes date filters to the API", async () => {
  mockedApi.get.mockResolvedValue({
    data: {
      items: [
        {
          id: "6ce50531-ccbb-4ccf-bcd0-3a0730ee444a",
          type: "SEAT_UPGRADE",
          status: "captured",
          currency: "INR",
          amount: 500,
          createdAt: "2026-10-21",
          invoiceNumber: "INV-42",
          receiptUrl: "https://pay.razorpay.com/receipt",
          razorpayPaymentId: "pay_42",
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    },
  });
  mount(<PaymentHistory />);
  expect(
    await screen.findByRole("link", { name: "Download receipt" }),
  ).toHaveAttribute("href", "https://pay.razorpay.com/receipt");
  expect(
    screen.queryByText("6ce50531-ccbb-4ccf-bcd0-3a0730ee444a"),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("From"), {
    target: { value: "2026-10-01" },
  });
  await waitFor(() =>
    expect(mockedApi.get).toHaveBeenLastCalledWith(
      "/billing/transactions",
      expect.objectContaining({
        params: expect.objectContaining({ from: "2026-10-01", page: 1 }),
      }),
    ),
  );
  expect(safeReceiptUrl("javascript:alert(1)")).toBeNull();
  expect(safeReceiptUrl(null)).toBeNull();
});
test("saves a plan request through support without initiating payment", async () => {
  mockedApi.post.mockResolvedValue({ data: { code: "GR-000042" } });
  const created = jest.fn();
  mount(
    <CreateTicketDialog
      kind="plan"
      plans={[{ code: "GROWTH", name: "Growth", description: "" }]}
      onClose={jest.fn()}
      onCreated={created}
    />,
  );
  expect(screen.getByText(/Gromoze will review/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Send request" })).toBeDisabled();
  expect(checkout).not.toHaveBeenCalled();
});
test("creates a help ticket with useful details", async () => {
  mockedApi.post.mockResolvedValue({ data: { code: "GR-000042" } });
  const created = jest.fn();
  mount(
    <CreateTicketDialog
      kind="support"
      plans={[]}
      onClose={jest.fn()}
      onCreated={created}
    />,
  );
  fireEvent.change(screen.getByLabelText("Subject"), {
    target: { value: "Need help with billing" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Please help confirm our next renewal date." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send request" }));
  await waitFor(() => expect(created).toHaveBeenCalled());
  expect(mockedApi.post).toHaveBeenCalledWith(
    "/support/tickets",
    expect.objectContaining({
      subject: "Need help with billing",
      category: "GENERAL",
    }),
  );
});
