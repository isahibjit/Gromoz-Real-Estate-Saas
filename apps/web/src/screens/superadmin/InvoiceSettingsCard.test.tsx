import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InvoiceSettingsCard } from "./InvoiceSettingsCard";
import { api } from "../../common/api";
import { downloadBillingPdf } from "../billing/invoiceDownload";

jest.mock("../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock("../billing/invoiceDownload", () => ({
  downloadBillingPdf: jest.fn(),
}));
const get = jest.mocked(api.get),
  post = jest.mocked(api.post),
  patch = jest.mocked(api.patch);
const settings = {
  businessName: "Gromoze",
  address: "Example seller address",
  email: "billing@example.invalid",
  phone: "",
  enabledAt: null,
  previewedAt: null,
};
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  render(
    <QueryClientProvider client={client}>
      <InvoiceSettingsCard />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  jest.resetAllMocks();
  sessionStorage.clear();
  get.mockResolvedValue({ data: settings });
  patch.mockResolvedValue({ data: settings });
});
test("requires a saved preview before enabling issuance", async () => {
  mount();
  expect(
    await screen.findByRole("button", { name: "Enable invoicing" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Download preview" }));
  await waitFor(() =>
    expect(downloadBillingPdf).toHaveBeenCalledWith(
      "/billing/platform/invoices/settings/preview",
      "gromoze-invoice-preview",
      true,
    ),
  );
  expect(post).not.toHaveBeenCalled();
});
test("saves only invoice identity and does not automatically enable it", async () => {
  mount();
  fireEvent.change(await screen.findByLabelText("Business name"), {
    target: { value: "Gromoze Technologies" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save invoice details" }));
  await waitFor(() =>
    expect(patch).toHaveBeenCalledWith("/billing/platform/invoices/settings", {
      businessName: "Gromoze Technologies",
      address: settings.address,
      email: settings.email,
      phone: settings.phone,
    }),
  );
  expect(post).not.toHaveBeenCalled();
});
test("requires separate backfill confirmation and communicates no historical emails", async () => {
  get.mockResolvedValue({
    data: {
      ...settings,
      enabledAt: "2026-10-22T00:00:00Z",
      previewedAt: "2026-10-22T00:00:00Z",
    },
  });
  post.mockResolvedValue({
    data: {
      previewToken: "BF-20261022-EXAMPLE",
      candidates: 3,
      mode: "TEST",
      cutoffAt: "2026-10-22T00:00:00Z",
      message: "No historical emails will be sent.",
    },
  });
  mount();
  fireEvent.click(
    await screen.findByRole("button", { name: "Preview historical backfill" }),
  );
  expect(
    await screen.findByRole("button", { name: "Confirm historical backfill" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("No historical emails will be sent."),
  ).toBeInTheDocument();
  expect(post).toHaveBeenCalledTimes(1);
  expect(post).toHaveBeenCalledWith(
    "/billing/platform/invoices/backfills/preview",
  );
});
