import { Link } from "react-router-dom";
import { Badge, Button, Card } from "ui";
import { FileText } from "lucide-react";
import { getApiErrorMessage } from "../../common/apiError";
import { Invoices } from "../billing/Invoices";
import { billingDateTime, moneyLabel } from "../billing/WorkspaceControls";
import {
  usePlatformTenantBilling,
  type TenantBillingSummary,
} from "./platformTenantBilling";

export function TenantBillingDates({
  summary,
}: {
  summary: TenantBillingSummary;
}) {
  const first = summary.firstPayment;
  const dates = [
    {
      label: "Recorded trial end",
      value: billingDateTime(summary.trialEndsAt),
    },
    {
      label: "First payment due",
      value: first.completed
        ? "Completed"
        : billingDateTime(summary.firstPaymentDueAt),
    },
    {
      label: first.invoice ? "Invoice issued" : "Invoice eligible from",
      value: first.invoice
        ? billingDateTime(first.invoice.issuedAt)
        : summary.automaticInvoicingEnabled && summary.invoiceEligibleFrom
        ? billingDateTime(summary.invoiceEligibleFrom)
        : "Not scheduled",
    },
    { label: "Next renewal", value: billingDateTime(summary.nextRenewalAt) },
  ];
  return (
    <div className="space-y-3">
      <dl className="grid gap-5 sm:grid-cols-2">
        {dates.map((item) => (
          <div key={item.label}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-sm font-medium">{item.value}</dd>
          </div>
        ))}
      </dl>
      {summary.isTrial &&
        !first.completed &&
        summary.trialDaysRemaining !== null && (
          <p className="text-sm text-primary">
            {summary.trialDaysRemaining === 0
              ? "The recorded trial deadline has been reached."
              : `Trial ends in ${summary.trialDaysRemaining} day${
                  summary.trialDaysRemaining === 1 ? "" : "s"
                }.`}
          </p>
        )}
      <p className="text-xs leading-5 text-muted-foreground">
        Invoice issuance and payment due dates are separate. An invoice can be
        issued during the trial; no automatic charge is scheduled.
      </p>
    </div>
  );
}

export function TenantBillingPanel({ tenantId }: { tenantId: string }) {
  const query = usePlatformTenantBilling(tenantId);
  const summary: TenantBillingSummary | undefined = query.data;
  return (
    <section
      id="tenant-billing"
      className="space-y-5"
      aria-labelledby="tenant-billing-title"
    >
      <Card className="space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileText className="mt-1 size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 id="tenant-billing-title" className="text-lg font-semibold">
                Billing & invoices
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Invoice history, payment deadlines and saved commercial terms.
              </p>
            </div>
          </div>
          <Badge
            variant={summary?.automaticInvoicingEnabled ? "success" : "neutral"}
          >
            {summary
              ? `Automatic invoicing ${
                  summary.automaticInvoicingEnabled ? "enabled" : "disabled"
                }`
              : query.isError
              ? "Billing unavailable"
              : "Checking billing"}
          </Badge>
        </header>
        {query.isPending ? (
          <p role="status" className="py-5 text-sm text-muted-foreground">
            Loading tenant billing...
          </p>
        ) : query.isError || !summary ? (
          <div role="alert" className="space-y-3">
            <p>
              {getApiErrorMessage(
                query.error,
                "Could not load tenant billing. Invoice counts are unavailable.",
              )}
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry billing
            </Button>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[
                { label: "Total invoices", count: summary.counts.total },
                { label: "Unpaid", count: summary.counts.unpaid },
                { label: "Overdue", count: summary.counts.overdue },
                { label: "Paid", count: summary.counts.paid },
                { label: "Void", count: summary.counts.void },
              ].map((item) => (
                <Card key={item.label} className="p-4 shadow-none">
                  <dt className="text-xs text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-2 text-2xl font-semibold">{item.count}</dd>
                </Card>
              ))}
            </dl>
            <p className="text-xs text-muted-foreground">
              Counts cover all environments. Overdue invoices are included in
              Unpaid.
            </p>
            <div className="grid gap-6 border-t border-border pt-5 lg:grid-cols-2">
              <TenantBillingDates summary={summary} />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">
                  Outstanding invoice balances
                </h3>
                {summary.balances.length ? (
                  summary.balances.map((balance) => (
                    <div
                      key={`${balance.mode}-${balance.currency}`}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <span className="text-sm text-muted-foreground">
                        {balance.mode === "TEST"
                          ? "Test invoices"
                          : "Live invoices"}
                      </span>
                      <span className="font-semibold">
                        {moneyLabel(
                          balance.amountMinor / 100,
                          balance.currency,
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No outstanding invoice balance recorded.
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Balances include unpaid invoices under review. Check invoice
                  details before requesting payment.
                </p>
                <p className="text-xs text-muted-foreground">
                  Workspace access is{" "}
                  {summary.workspaceStatus.toLowerCase().replace(/_/g, " ")}.
                  Access status does not confirm payment.
                </p>
              </div>
            </div>
            {!summary.automaticInvoicingEnabled && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm">
                  Automatic invoice issuance is disabled. A payment link can
                  still be created when eligible, but that alone does not create
                  an invoice.
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/superadmin/settings">
                    Configure invoice settings
                  </Link>
                </Button>
              </div>
            )}
            {summary.counts.total === 0 && (
              <p className="text-sm text-muted-foreground">
                No invoices have been issued for this tenant. This does not mean
                the first subscription payment is completed.
              </p>
            )}
          </>
        )}
      </Card>
      <Invoices key={tenantId} source={{ kind: "platform", tenantId }} />
    </section>
  );
}
