import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge, Button } from "ui";
import { Copy, ExternalLink } from "lucide-react";
import { api } from "../../common/api";
import { safeBillingUrl } from "../billing/billingLinks";
import { billingDateTime, moneyLabel } from "../billing/WorkspaceControls";
import { TenantBillingDates } from "./TenantBillingPanel";
import {
  refreshPlatformTenantBilling,
  usePlatformTenantBilling,
  type FirstPaymentLinkResult,
  type TenantBillingSummary,
} from "./platformTenantBilling";
import { getApiErrorMessage } from "../../common/apiError";

export function TenantBillingTab({
  tenantId,
  busy,
  profileDirty,
  run,
  onSaved,
}: {
  tenantId: string;
  busy: boolean;
  profileDirty: boolean;
  run: (operation: () => Promise<void>) => Promise<void>;
  onSaved: () => void;
}) {
  const client = useQueryClient(),
    query = usePlatformTenantBilling(tenantId);
  const summary: TenantBillingSummary | undefined = query.data;
  const [result, setResult] = useState<FirstPaymentLinkResult | null>(null),
    [copied, setCopied] = useState(false),
    [copyError, setCopyError] = useState("");
  if (query.isPending)
    return (
      <p role="status" className="py-6 text-sm text-muted-foreground">
        Loading payment terms...
      </p>
    );
  if (query.isError || !summary)
    return (
      <div role="alert" className="space-y-3">
        <p>
          {getApiErrorMessage(
            query.error,
            "Could not load saved payment terms.",
          )}
        </p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Retry payment terms
        </Button>
      </div>
    );
  const first = summary.firstPayment,
    invoice = first.invoice;
  const displayItems =
    invoice && !first.replacementRequired
      ? invoice.snapshot.items
      : first.savedQuote.items;
  const amountMinor =
    invoice && !first.replacementRequired
      ? invoice.amountMinor
      : first.savedQuote.amountMinor;
  const hasSetupFee = displayItems.some(
    (item) => item.description === "Workspace setup fee",
  );
  const currency = invoice?.currency ?? first.savedQuote.currency;
  const link = safeBillingUrl(result?.paymentLinkUrl);
  async function generate() {
    await run(async () => {
      setResult(null);
      setCopied(false);
      setCopyError("");
      try {
        const { data } = await api.post<FirstPaymentLinkResult>(
          `/organizations/tenants/${encodeURIComponent(
            tenantId,
          )}/setup-checkout`,
        );
        setResult(data);
        if (!safeBillingUrl(data.paymentLinkUrl))
          throw new Error(
            data.checkoutError ||
              "Razorpay did not return a secure payment link. Billing records have been refreshed; an invoice may already have been issued.",
          );
      } finally {
        await refreshPlatformTenantBilling(client, tenantId);
        onSaved();
      }
    });
  }
  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setCopyError("");
    } catch {
      setCopyError(
        "Could not copy the link. Open the payment link and copy its address.",
      );
    }
  }
  const notification =
    result?.notificationStatus === "QUEUED"
      ? "Invoice email queued for the tenant administrator."
      : result?.notificationStatus === "RETRYING"
      ? "Invoice email delivery will retry."
      : result?.notificationStatus === "ACCEPTED"
      ? "Invoice email accepted for delivery; inbox delivery is not confirmed."
      : result?.notificationStatus === "UNCERTAIN"
      ? "Invoice email outcome needs review before resending."
      : result?.notificationStatus === "PROVIDER_NOTIFICATION_REQUESTED"
      ? "Razorpay email notification requested; delivery is not confirmed."
      : result
      ? "No invoice email was queued."
      : null;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">First subscription payment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The first 30-day seat period
            {hasSetupFee ? " and the one-time setup fee" : ""}.{" "}
            {invoice && !first.replacementRequired
              ? "Uses the issued invoice terms."
              : "Uses saved workspace settings."}
          </p>
        </div>
        <Badge variant={summary.paymentMode === "TEST" ? "warning" : "neutral"}>
          {summary.paymentMode === "TEST"
            ? "Test payment"
            : summary.paymentMode === "LIVE"
            ? "Live payment"
            : "Payment environment not configured"}
        </Badge>
      </div>
      <TenantBillingDates summary={summary} />
      {first.requiresReview ? (
        <p role="alert" className="text-sm text-destructive">
          {first.blockedReason}
        </p>
      ) : first.completed ? (
        <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
          <p className="font-medium">First subscription payment completed</p>
          {invoice?.paidAt && (
            <p className="text-sm text-muted-foreground">
              Payment confirmed {billingDateTime(invoice.paidAt)}.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Review renewal invoices in the tenant detail page. No additional
            setup payment is needed.
          </p>
        </div>
      ) : (
        <>
          <dl className="space-y-3 rounded-lg border border-border p-4 text-sm">
            {displayItems.map((item, index) => (
              <div
                key={`${index}-${item.description}`}
                className="flex flex-wrap justify-between gap-2"
              >
                <dt>
                  {item.description === "Workspace setup fee"
                    ? "One-time setup fee"
                    : `${item.quantity} licensed seats x ${moneyLabel(
                        item.unitAmountMinor / 100,
                        currency,
                      )} / 30 days`}
                </dt>
                <dd className="font-medium">
                  {moneyLabel(item.amountMinor / 100, currency)}
                </dd>
              </div>
            ))}
            {!hasSetupFee && (
              <div className="flex justify-between gap-2">
                <dt>Setup fee</dt>
                <dd>No setup fee</dd>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 font-semibold">
              <dt>Total first payment</dt>
              <dd>{moneyLabel(amountMinor / 100, currency)}</dd>
            </div>
          </dl>
          {invoice && (
            <p className="text-sm text-muted-foreground">
              Related invoice:{" "}
              <span className="font-medium text-foreground">
                {invoice.number}
              </span>
            </p>
          )}
          {first.replacementRequired && (
            <p role="status" className="text-sm text-muted-foreground">
              Saved seats or prices have changed. Generating this link will void
              the unpaid invoice and issue a replacement with the charges shown
              above. Paid invoices remain unchanged.
            </p>
          )}
          <p className="text-sm leading-6 text-muted-foreground">
            Generating this link does not charge the tenant. Payment can be made
            now; the due date is shown above.
          </p>
          {!summary.firstPaymentDueAt && (
            <p className="text-sm text-muted-foreground">
              A payment deadline is not recorded. Link generation is not a
              scheduled automatic charge.
            </p>
          )}
          {!summary.automaticInvoicingEnabled && (
            <p className="text-sm text-muted-foreground">
              {invoice
                ? "Automatic invoicing is disabled. The existing invoice remains payable; no new invoice is created."
                : "Automatic invoicing is disabled. This action creates a payment link without creating an invoice."}
            </p>
          )}
          {profileDirty && (
            <p role="status" className="text-sm text-muted-foreground">
              Save workspace changes before generating a payment link.
            </p>
          )}
          {!first.canCreateLink && (
            <p className="text-sm text-muted-foreground">
              {first.blockedReason}
            </p>
          )}
          <Button
            variant="outline"
            disabled={busy || profileDirty || !first.canCreateLink}
            onClick={() => void generate()}
          >
            {invoice && !first.replacementRequired
              ? `Get payment link for ${invoice.number}`
              : first.replacementRequired
              ? "Replace invoice & create link"
              : "Create first-payment link"}
          </Button>
        </>
      )}
      {result && !profileDirty && !first.completed && (
        <div className="space-y-3 border-t border-border pt-4" role="status">
          <p className="text-sm font-medium">
            {link ? "Payment link ready" : "Payment link unavailable"}
            {result.invoiceNumber ? ` - ${result.invoiceNumber}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {moneyLabel(result.amount, result.currency)}; due{" "}
            {billingDateTime(result.dueAt ?? null)}.
          </p>
          {notification && (
            <p className="text-xs text-muted-foreground">{notification}</p>
          )}
          {link && (
            <>
              <p className="break-all text-sm text-muted-foreground">{link}</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" size="sm" onClick={() => void copy()}>
                  <Copy className="size-4" aria-hidden="true" />
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Open payment link
                  </a>
                </Button>
              </div>
            </>
          )}
          {copyError && (
            <p role="alert" className="text-sm text-destructive">
              {copyError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
