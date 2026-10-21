import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
} from "ui";
import { Users } from "lucide-react";
import { api } from "../../common/api";
import { currentOrganizationId } from "../../common/tenantRequestScope";
import { getApiErrorMessage } from "../../common/apiError";
import { openRazorpayCheckout } from "../../common/services/razorpayClient";
import type { BillingOverview } from "./workspace.types";
import { moneyLabel } from "./WorkspaceControls";
interface SeatCheckout {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKey: string;
  organizationName: string;
  additionalSeats: number;
}
export function AddSeatsDialog({
  open,
  onOpenChange,
  onPurchased,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurchased?: () => void;
}) {
  const organizationId = currentOrganizationId();
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ["billing-overview", organizationId],
    queryFn: async () =>
      (await api.get<BillingOverview>("/billing/overview")).data,
    enabled: open,
    retry: false,
  });
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<{
    orderId: string;
    paymentId: string;
    signature: string;
  } | null>(null);
  const count = Number(quantity),
    valid = Number.isInteger(count) && count >= 1 && count <= 1000;
  async function verify(payment: {
    orderId: string;
    paymentId: string;
    signature: string;
  }) {
    setBusy(true);
    setError("");
    try {
      await api.post("/billing/verify-upgrade", payment);
      await queryClient.invalidateQueries({
        queryKey: ["billing-overview", organizationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["billing-transactions", organizationId],
      });
      setVerification(null);
      onOpenChange(false);
      onPurchased?.();
    } catch (failure: unknown) {
      setError(
        getApiErrorMessage(
          failure,
          "Payment verification failed. Retry verification below without paying again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  async function purchase() {
    if (!valid || !overview.data || busy) return;
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post<SeatCheckout>("/billing/upgrade-seats", {
        additionalSeats: count,
      });
      await openRazorpayCheckout({
        key: data.razorpayKey,
        amount: Math.round(data.amount * 100),
        currency: data.currency,
        name: "Gromoze",
        description: `Add ${data.additionalSeats} user seats`,
        order_id: data.orderId,
        modal: { ondismiss: () => setBusy(false) },
        handler: async (payment) => {
          const pending = {
            orderId: payment.razorpay_order_id,
            paymentId: payment.razorpay_payment_id,
            signature: payment.razorpay_signature,
          };
          setVerification(pending);
          await verify(pending);
        },
      });
    } catch (failure: unknown) {
      setError(
        getApiErrorMessage(
          failure,
          "Could not start payment. Please try again.",
        ),
      );
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Add user seats
          </DialogTitle>
          <DialogDescription>
            Review the additional charge before continuing to secure checkout.
          </DialogDescription>
        </DialogHeader>
        {overview.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(
              overview.error,
              "Billing is unavailable. Ask your workspace administrator to add seats.",
            )}
          </p>
        ) : overview.data ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {overview.data.activeMembersCount} of{" "}
              {overview.data.allocatedSeats} seats in use. You can add team
              members after payment is verified.
            </p>
            <div className="space-y-2">
              <label
                htmlFor="additional-seat-quantity"
                className="text-sm font-medium"
              >
                Additional seats
              </label>
              <Input
                id="additional-seat-quantity"
                type="number"
                min={1}
                max={1000}
                step={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                disabled={busy || Boolean(verification)}
              />
            </div>
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span>Price per seat / month</span>
                <span>{moneyLabel(overview.data.pricePerSeatMonth)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>New seat allowance</span>
                <span>
                  {overview.data.allocatedSeats + (valid ? count : 0)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold">
                <span>Amount due now</span>
                <span>
                  {moneyLabel(
                    valid ? count * overview.data.pricePerSeatMonth : 0,
                  )}
                </span>
              </div>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              className="w-full"
              onClick={() => {
                if (verification) void verify(verification);
                else void purchase();
              }}
              disabled={!valid || busy}
            >
              {busy
                ? "Waiting for payment..."
                : verification
                ? "Retry payment verification"
                : "Continue to payment"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Seats are added after payment verification. Closing checkout keeps
              your existing allowance.
            </p>
          </div>
        ) : (
          <p role="status" className="py-6 text-sm text-muted-foreground">
            Loading seat pricing...
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
