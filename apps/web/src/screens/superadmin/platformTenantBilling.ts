import { useQuery, type QueryClient } from "@tanstack/react-query";
import { api } from "../../common/api";
import type { WorkspaceInvoice } from "../billing/invoice.types";

export interface SetupPaymentQuote {
  seats: number;
  unitAmountMinor: number;
  setupFeeMinor: number;
  seatAmountMinor: number;
  amountMinor: number;
  currency: string;
  items: WorkspaceInvoice["snapshot"]["items"];
}
export interface TenantBillingSummary {
  automaticInvoicingEnabled: boolean;
  paymentMode: "TEST" | "LIVE" | null;
  workspaceStatus: string;
  counts: {
    total: number;
    unpaid: number;
    overdue: number;
    paid: number;
    void: number;
  };
  balances: Array<{
    mode: string;
    currency: string;
    count: number;
    amountMinor: number;
  }>;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  firstPaymentDueAt: string | null;
  nextRenewalAt: string | null;
  invoiceEligibleFrom: string | null;
  firstPayment: {
    completed: boolean;
    requiresReview: boolean;
    savedQuote: SetupPaymentQuote;
    invoice: WorkspaceInvoice | null;
    replacementRequired: boolean;
    setupFeeStatus: "NO_FEE" | "PAID" | "UNPAID";
    canCreateLink: boolean;
    blockedReason: string | null;
  };
}
export interface FirstPaymentLinkResult {
  paymentLinkUrl?: string | null;
  checkoutError?: string | null;
  amount: number;
  currency: string;
  invoiceNumber?: string | null;
  invoiceIssuedAt?: string | null;
  dueAt?: string | null;
  mode?: "TEST" | "LIVE" | null;
  notificationStatus?:
    | "QUEUED"
    | "RETRYING"
    | "ACCEPTED"
    | "UNCERTAIN"
    | "NOT_QUEUED"
    | "PROVIDER_NOTIFICATION_REQUESTED";
}
export const platformTenantBillingKey = (tenantId: string) =>
  ["platform-tenant-billing", tenantId] as const;
export function usePlatformTenantBilling(tenantId: string) {
  return useQuery({
    queryKey: platformTenantBillingKey(tenantId),
    queryFn: async () =>
      (
        await api.get<TenantBillingSummary>(
          `/billing/platform/tenants/${encodeURIComponent(tenantId)}/summary`,
        )
      ).data,
    retry: false,
    staleTime: 30000,
  });
}
export function refreshPlatformTenantBilling(
  client: QueryClient,
  tenantId: string,
) {
  return Promise.all([
    client.invalidateQueries({ queryKey: platformTenantBillingKey(tenantId) }),
    client.invalidateQueries({
      queryKey: ["billing-invoices", `platform:${tenantId}`],
    }),
    client.invalidateQueries({
      queryKey: ["billing-invoice", `platform:${tenantId}`],
    }),
  ]);
}
