import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api } from "../../common/api";
import { Invoices, OutstandingInvoices } from "./Invoices";
import {
  openRazorpayCheckout,
  type RazorpayOptions,
} from "../../common/services/razorpayClient";
import type { WorkspaceInvoice } from "./invoice.types";
import { downloadBillingPdf } from "./invoiceDownload";

jest.mock("../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("../../common/services/razorpayClient", () => ({
  openRazorpayCheckout: jest.fn(),
}));
jest.mock("./invoiceDownload", () => ({ downloadBillingPdf: jest.fn() }));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
const invoice: WorkspaceInvoice = {
  number: "GZ-TEST-2026-000001",
  type: "RECURRING_SEATS",
  mode: "TEST",
  status: "ISSUED",
  amountMinor: 100000,
  balanceMinor: 100000,
  currency: "INR",
  issuedAt: "2026-10-22T00:00:00Z",
  dueAt: "2026-11-01T00:00:00Z",
  paidAt: null,
  paymentReference: null,
  historical: false,
  replacesNumber: null,
  voidReason: null,
  reconciliationNote: null,
  snapshot: {
    seller: {
      name: "Gromoze",
      address: "Example seller address",
      email: "billing@example.invalid",
      phone: "",
    },
    customer: {
      name: "Example workspace",
      address: "Example customer address",
      email: "owner@example.invalid",
      phone: "",
    },
    planName: "Growth",
    items: [
      {
        description: "User seats - 30 days",
        quantity: 2,
        unitAmountMinor: 50000,
        amountMinor: 100000,
      },
    ],
    note: "Thirty days of service after payment.",
  },
};
const get = jest.mocked(api.get),
  post = jest.mocked(api.post),
  checkout = jest.mocked(openRazorpayCheckout);
function mount(element = <Invoices />) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
  return client;
}
beforeEach(() => {
  jest.resetAllMocks();
  localStorage.setItem("active_organization_id", "tenant-a");
  get.mockImplementation(async (url) => ({
    data:
      url === "/billing/invoices"
        ? { items: [invoice], total: 1, page: 1, pageSize: 10 }
        : { ...invoice },
  }));
  post.mockResolvedValue({ data: {} });
});
test("shows invoice references, authenticated downloads, and date filters", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: invoice.number }));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(await screen.findByText("Test invoice")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Download invoice" }));
  await waitFor(() =>
    expect(downloadBillingPdf).toHaveBeenCalledWith(
      `/billing/invoices/${invoice.number}/pdf`,
      invoice.number,
    ),
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.change(screen.getByLabelText("Issued from"), {
    target: { value: "2026-10-01" },
  });
  await waitFor(() =>
    expect(get).toHaveBeenCalledWith(
      "/billing/invoices",
      expect.objectContaining({
        params: expect.objectContaining({ from: "2026-10-01" }),
      }),
    ),
  );
  expect(screen.queryByText("tenant-a")).not.toBeInTheDocument();
});
test("opens an emailed invoice link and retries verification without a second checkout", async () => {
  let options: RazorpayOptions | undefined;
  checkout.mockImplementation(async (value) => {
    options = value;
  });
  post.mockImplementation(async (url) => {
    if (String(url).endsWith("/checkout"))
      return {
        data: {
          orderId: "order_example",
          amount: 1000,
          currency: "INR",
          razorpayKey: "rzp_test_fixture",
        },
      };
    throw new Error("Verification temporarily unavailable");
  });
  mount(<Invoices initialNumber={invoice.number} />);
  fireEvent.click(await screen.findByRole("button", { name: /Pay.*1,000/ }));
  await waitFor(() => expect(options).toBeDefined());
  await options?.handler({
    razorpay_order_id: "order_example",
    razorpay_payment_id: "pay_example",
    razorpay_signature: "signed",
  });
  fireEvent.click(
    await screen.findByRole("button", { name: "Retry payment verification" }),
  );
  await waitFor(() =>
    expect(
      post.mock.calls.filter(([url]) => String(url).endsWith("/verify")),
    ).toHaveLength(2),
  );
  expect(checkout).toHaveBeenCalledTimes(1);
});
test.each(["PAID", "VOID"] as const)(
  "does not offer payment for a %s invoice",
  async (status) => {
    get.mockResolvedValue({ data: { ...invoice, status, balanceMinor: 0 } });
    mount(<Invoices initialNumber={invoice.number} />);
    expect(
      await screen.findByRole("button", { name: "Download invoice" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Pay / }),
    ).not.toBeInTheDocument();
  },
);
test("hides payment while reconciliation is required", async () => {
  get.mockResolvedValue({
    data: {
      ...invoice,
      reconciliationNote:
        "Payment received; contact support before paying again.",
    },
  });
  mount(<Invoices initialNumber={invoice.number} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("contact support");
  expect(
    screen.queryByRole("button", { name: /^Pay / }),
  ).not.toBeInTheDocument();
});
test("shows outstanding balances and does not silently hide an API failure", async () => {
  const onView = jest.fn();
  get.mockResolvedValue({
    data: { count: 2, amountMinor: 150000, currency: "INR" },
  });
  mount(<OutstandingInvoices onView={onView} />);
  fireEvent.click(await screen.findByRole("button", { name: "View invoices" }));
  expect(onView).toHaveBeenCalled();
});
