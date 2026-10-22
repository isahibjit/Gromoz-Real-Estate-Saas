import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "ui";
import { Download, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../common/api";
import { currentOrganizationId } from "../../common/tenantRequestScope";
import { getApiErrorMessage } from "../../common/apiError";
import { displayReference } from "../../common/displayReference";
import { openRazorpayCheckout } from "../../common/services/razorpayClient";
import { dateLabel, humanLabel, moneyLabel } from "./WorkspaceControls";
import { downloadBillingPdf } from "./invoiceDownload";
import type { InvoiceCheckout, WorkspaceInvoice } from "./invoice.types";

function InvoicePayment({ invoice }: { invoice: WorkspaceInvoice }) {
  const client = useQueryClient();
  const organizationId = currentOrganizationId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [pending, setPending] = useState<{
    orderId: string;
    paymentId: string;
    signature: string;
  } | null>(null);
  async function verify(payment: NonNullable<typeof pending>) {
    setBusy(true);
    setError("");
    try {
      await api.post(
        `/billing/invoices/${encodeURIComponent(invoice.number)}/verify`,
        payment,
      );
      setPending(null);
      await Promise.all(
        [
          "billing-invoices",
          "billing-invoice",
          "billing-outstanding",
          "billing-overview",
          "billing-transactions",
        ].map((key) =>
          client.invalidateQueries({ queryKey: [key, organizationId] }),
        ),
      );
      toast.success("Payment confirmed. Your paid invoice is ready.");
    } catch (failure: unknown) {
      setError(
        getApiErrorMessage(
          failure,
          "Could not confirm payment. Retry verification without paying again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function pay() {
    if (busy) return;
    if (pending) {
      await verify(pending);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<InvoiceCheckout>(
        `/billing/invoices/${encodeURIComponent(invoice.number)}/checkout`,
      );
      await openRazorpayCheckout({
        key: data.razorpayKey,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        name: "Gromoze",
        description: `Invoice ${invoice.number}`,
        order_id: data.orderId,
        modal: { ondismiss: () => setBusy(false) },
        handler: async (result) => {
          const payment = {
            orderId: result.razorpay_order_id,
            paymentId: result.razorpay_payment_id,
            signature: result.razorpay_signature,
          };
          setPending(payment);
          await verify(payment);
        },
      });
    } catch (failure: unknown) {
      setBusy(false);
      setError(
        getApiErrorMessage(
          failure,
          "Could not start checkout. Please try again.",
        ),
      );
    }
  }
  return (
    <div className="space-y-3">
      <Button disabled={busy} onClick={() => void pay()}>
        <CreditCard className="size-4" aria-hidden="true" />
        {busy
          ? "Waiting for payment..."
          : pending
          ? "Retry payment verification"
          : `Pay ${moneyLabel(invoice.balanceMinor / 100, invoice.currency)}`}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function InvoiceDetailsDialog({
  number,
  onClose,
}: {
  number: string | null;
  onClose: () => void;
}) {
  const organizationId = currentOrganizationId();
  const query = useQuery({
    queryKey: ["billing-invoice", organizationId, number],
    queryFn: async () =>
      (
        await api.get<WorkspaceInvoice>(
          `/billing/invoices/${encodeURIComponent(number ?? "")}`,
        )
      ).data,
    enabled: Boolean(number),
    retry: false,
  });
  const [downloading, setDownloading] = useState(false),
    [downloadError, setDownloadError] = useState("");
  const invoice: WorkspaceInvoice | undefined = query.data;
  async function download() {
    if (!invoice) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadBillingPdf(
        `/billing/invoices/${encodeURIComponent(invoice.number)}/pdf`,
        invoice.number,
      );
    } catch (failure: unknown) {
      setDownloadError(
        getApiErrorMessage(
          failure,
          "Could not download the invoice. Please try again.",
        ),
      );
    } finally {
      setDownloading(false);
    }
  }
  return (
    <Dialog
      open={Boolean(number)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invoice {number}</DialogTitle>
          <DialogDescription>
            Review your workspace charges and payment status.
          </DialogDescription>
        </DialogHeader>
        {query.isPending ? (
          <p role="status" className="py-8 text-sm text-muted-foreground">
            Loading invoice...
          </p>
        ) : query.isError || !invoice ? (
          <div role="alert" className="space-y-3">
            <p>
              {getApiErrorMessage(query.error, "Could not load this invoice.")}
            </p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={
                  invoice.status === "PAID"
                    ? "success"
                    : invoice.status === "OVERDUE"
                    ? "warning"
                    : "neutral"
                }
              >
                {humanLabel(invoice.status)}
              </Badge>
              {invoice.mode === "TEST" && (
                <Badge variant="warning">Test invoice</Badge>
              )}
              {invoice.historical && (
                <span className="text-xs text-muted-foreground">
                  Historical payment
                </span>
              )}
            </div>
            {invoice.reconciliationNote && (
              <p
                role="alert"
                className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm"
              >
                {invoice.reconciliationNote}
              </p>
            )}
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">From</dt>
                <dd className="mt-1 font-medium">
                  {invoice.snapshot.seller.name}
                </dd>
                <dd className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {invoice.snapshot.seller.address}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bill to</dt>
                <dd className="mt-1 font-medium">
                  {invoice.snapshot.customer.name}
                </dd>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {invoice.snapshot.customer.address}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Issued</dt>
                <dd className="mt-1 text-sm">{dateLabel(invoice.issuedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Due</dt>
                <dd className="mt-1 text-sm">{dateLabel(invoice.dueAt)}</dd>
              </div>
            </dl>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="w-full text-left text-sm">
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="p-3 font-medium">
                      Description
                    </TableHead>
                    <TableHead className="p-3 font-medium">Quantity</TableHead>
                    <TableHead className="p-3 text-right font-medium">
                      Amount
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.snapshot.items.map((item, index) => (
                    <TableRow
                      key={`${index}-${item.description}`}
                      className="border-t border-border"
                    >
                      <TableCell className="p-3">{item.description}</TableCell>
                      <TableCell className="p-3">{item.quantity}</TableCell>
                      <TableCell className="p-3 text-right">
                        {moneyLabel(item.amountMinor / 100, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-2 text-right">
              <p className="text-sm">
                Total:{" "}
                <strong>
                  {moneyLabel(invoice.amountMinor / 100, invoice.currency)}
                </strong>
              </p>
              <p className="text-lg font-semibold">
                Balance due:{" "}
                {moneyLabel(invoice.balanceMinor / 100, invoice.currency)}
              </p>
            </div>
            {invoice.paidAt && (
              <p className="text-sm text-muted-foreground">
                Payment confirmed {dateLabel(invoice.paidAt)}
                {invoice.paymentReference
                  ? ` - ${displayReference(
                      invoice.paymentReference,
                      "Payment reference unavailable",
                    )}`
                  : ""}
              </p>
            )}
            {invoice.replacesNumber && (
              <p className="text-sm text-muted-foreground">
                Replaces invoice {invoice.replacesNumber}.
              </p>
            )}
            {invoice.voidReason && (
              <p className="text-sm text-muted-foreground">
                {invoice.voidReason}
              </p>
            )}
            <p className="text-xs leading-5 text-muted-foreground">
              {invoice.snapshot.note} Standard invoice. No GST calculation is
              included.
            </p>
            {invoice.mode === "TEST" && (
              <p className="text-sm text-warning">
                This document represents test-mode activity, not a live payment.
              </p>
            )}
            <div className="flex flex-wrap items-start gap-3 border-t border-border pt-5">
              <Button
                variant="outline"
                disabled={downloading}
                onClick={() => void download()}
              >
                <Download className="size-4" aria-hidden="true" />
                {downloading ? "Downloading..." : "Download invoice"}
              </Button>
              {(invoice.status === "ISSUED" || invoice.status === "OVERDUE") &&
                !invoice.reconciliationNote && (
                  <InvoicePayment key={invoice.number} invoice={invoice} />
                )}
            </div>
            {downloadError && (
              <p role="alert" className="text-sm text-destructive">
                {downloadError}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
