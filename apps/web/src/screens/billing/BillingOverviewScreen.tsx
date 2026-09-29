import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Shield,
  Receipt,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "ui";
import { api } from "../../common/api";
import { openRazorpayCheckout } from "../../common/services/razorpayClient";

export function BillingOverviewScreen() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [additionalSeats, setAdditionalSeats] = useState(1);
  const [isProcessingUpgrade, setIsProcessingUpgrade] = useState(false);

  const fetchBillingOverview = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/billing/overview");
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load billing details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingOverview();
  }, []);

  const handleSeatUpgrade = async () => {
    if (additionalSeats <= 0) {
      toast.error("Please select at least 1 seat");
      return;
    }

    setIsProcessingUpgrade(true);
    try {
      const res = await api.post("/billing/upgrade-seats", {
        additionalSeats,
      });

      const checkoutData = res.data;

      await openRazorpayCheckout({
        key: checkoutData.razorpayKey,
        amount: checkoutData.amount * 100, // paise
        currency: checkoutData.currency || "INR",
        name: "TrueRoot CRM Seat Upgrade",
        description: `Add ${additionalSeats} active user seat(s)`,
        order_id: checkoutData.orderId,
        theme: {
          color: "#1e293b",
        },
        handler: async (paymentResponse) => {
          try {
            await api.post("/billing/verify-upgrade", {
              orderId: paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              additionalSeats,
            });

            toast.success(`Successfully added ${additionalSeats} seat(s)!`);
            setIsUpgradeModalOpen(false);
            fetchBillingOverview();
          } catch (err: any) {
            toast.error(err?.response?.data?.message || "Upgrade verification failed.");
          }
        },
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to initiate seat upgrade.");
    } finally {
      setIsProcessingUpgrade(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="space-y-2">
            <div className="h-7 w-60 bg-muted/80 rounded-md" />
            <div className="h-3.5 w-80 bg-muted/50 rounded" />
          </div>
          <div className="h-9 w-36 bg-muted/70 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-card border border-border rounded-xl p-5 space-y-3 shadow-xs">
              <div className="h-4 w-28 bg-muted/60 rounded" />
              <div className="h-8 w-32 bg-muted/80 rounded-md" />
              <div className="h-3 w-40 bg-muted/40 rounded" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-card border border-border rounded-xl p-6 shadow-xs" />
      </div>
    );
  }

  const upgradeCost = additionalSeats * (data?.pricePerSeatMonth || 500);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Subscription & Billing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your company licenses, seats allocation, and payment history.
          </p>
        </div>

        <Button
          variant="primary"
          className="flex items-center gap-2"
          onClick={() => setIsUpgradeModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Add User Seats
        </Button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Seats Allocation Card */}
        <Card className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Seat Utilization
            </span>
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {data?.activeMembersCount || 0}
            </span>
            <span className="text-sm text-muted-foreground font-medium">
              / {data?.allocatedSeats || 1} Seats Active
            </span>
          </div>
          <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{
                width: `${Math.min(
                  100,
                  ((data?.activeMembersCount || 0) / (data?.allocatedSeats || 1)) * 100
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {data?.remainingSeats || 0} seat(s) remaining for new team members.
          </p>
        </Card>

        {/* Plan & Pricing Model */}
        <Card className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Current Plan
            </span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground capitalize">
              {data?.planTier || "Starter"}
            </span>
            <Badge variant="neutral" className="text-xs font-normal">
              ₹{data?.pricePerSeatMonth}/user/mo
            </Badge>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {data?.setupFeePaid ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Platform Setup Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Setup Fee Pending
              </span>
            )}
          </p>
        </Card>

        {/* Subscription Renewal */}
        <Card className="border border-border bg-card shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">
              Renewal Date
            </span>
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-xl font-bold text-foreground">
              {data?.currentPeriodEnd
                ? new Date(data.currentPeriodEnd).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "Active"}
            </span>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Recurring per-seat subscription via Razorpay.
          </p>
        </Card>
      </div>

      {/* Transaction History Table */}
      <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="border-b border-border/50 px-6 py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Billing & Invoices History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase border-b border-border/50">
                <tr>
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-6 py-3 font-semibold">Type</th>
                  <th className="px-6 py-3 font-semibold">Amount</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Payment Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-foreground">
                {data?.recentTransactions?.length ? (
                  data.recentTransactions.map((tx: any) => (
                    <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 font-medium text-xs">
                        {tx.type === "SETUP_FEE" ? "Setup Fee + Initial Seats" : "Seat Expansion"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-xs">
                        ₹{Number(tx.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="success"
                          className="text-xs"
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs text-muted-foreground">
                        {tx.razorpayPaymentId || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-xs text-muted-foreground">
                      No past transactions found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Seat Upgrade Dialog */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="w-5 h-5 text-primary" />
              Add User Seats
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <p className="text-xs text-muted-foreground">
              Each user seat gives an agent, telecaller, or manager full access to your CRM workspace.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                How many seats would you like to add?
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={additionalSeats}
                  onChange={(e) => setAdditionalSeats(Math.max(1, Number(e.target.value)))}
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">
                  × ₹{data?.pricePerSeatMonth || 500}/user/mo
                </span>
              </div>
            </div>

            <div className="bg-muted/40 p-4 rounded-lg border border-border space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Additional Seats:</span>
                <span className="font-semibold">{additionalSeats}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">New Total Seat Limit:</span>
                <span className="font-semibold">
                  {(data?.allocatedSeats || 1) + additionalSeats} seats
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-2 border-t border-border">
                <span>Amount Due:</span>
                <span className="text-primary">₹{upgradeCost.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full flex items-center justify-center gap-2 mt-2"
              onClick={handleSeatUpgrade}
              disabled={isProcessingUpgrade}
            >
              {isProcessingUpgrade ? "Processing..." : `Pay ₹${upgradeCost.toLocaleString("en-IN")} via Razorpay`}
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
