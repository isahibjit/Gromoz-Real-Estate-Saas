import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "ui";
import { api } from "../../../common/api";
import { openRazorpayCheckout } from "../../../common/services/razorpayClient";

export function RegisterOrganizationScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [initialSeats, setInitialSeats] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pricing constants
  const SETUP_FEE = 9999;
  const PRICE_PER_SEAT = 500;
  const monthlySeatsCost = initialSeats * PRICE_PER_SEAT;
  const totalDueToday = SETUP_FEE + monthlySeatsCost;

  const handleOrgNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOrgName(val);
    if (!orgSlug || orgSlug === orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setOrgSlug(val.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgSlug || !adminFullName || !adminEmail || !adminPassword) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post("/organizations/register", {
        orgName,
        orgSlug,
        adminFullName,
        adminEmail,
        adminPassword,
        initialSeats,
      });

      const { organization, checkoutOrder } = response.data;
      if (!checkoutOrder) {
        toast.success(`Workspace ${organization.slug}.gromoze.com created. Contact support to complete the pending setup payment.`);
        navigate("/login");
        return;
      }
      localStorage.setItem("active_organization_id", organization.id);
      toast.success("Organization initialized! Launching secure payment gateway...");

      // Open Razorpay Checkout for Setup Fee & Initial Seats
      await openRazorpayCheckout({
        key: checkoutOrder.razorpayKey,
        amount: checkoutOrder.amount * 100, // in paise
        currency: checkoutOrder.currency || "INR",
        name: "TrueRoot CRM SaaS",
        description: `Setup Fee + ${initialSeats} User Seats`,
        order_id: checkoutOrder.orderId,
        prefill: {
          name: adminFullName,
          email: adminEmail,
        },
        theme: {
          color: "#1e293b",
        },
        handler: async (paymentResponse) => {
          try {
            await api.post("/billing/verify-setup", {
              orderId: paymentResponse.razorpay_order_id,
              paymentId: paymentResponse.razorpay_payment_id,
              signature: paymentResponse.razorpay_signature,
              seats: initialSeats,
            });

            toast.success("Payment verified! Welcome to your new CRM workspace.");
            navigate("/auth/login");
          } catch (err: any) {
            toast.error(err?.response?.data?.message || "Payment verification failed.");
          }
        },
        modal: {
          ondismiss: () => {
            toast("Payment was cancelled. You can complete setup later from your dashboard.", {
              icon: "ℹ️",
            });
            navigate("/auth/login");
          },
        },
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create organization.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Multi-Tenant SaaS Onboarding
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Get Started with TrueRoot Real Estate CRM
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dedicated company workspace, automated lead management, and team pipeline tracking.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-3xl grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Form Card */}
        <Card className="md:col-span-7 border border-border bg-card shadow-sm rounded-xl">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {step === 1 ? "Company & Account Details" : "Select Team Capacity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleRegister} className="space-y-4">
              {step === 1 ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Company / Brokerage Name *
                    </label>
                    <Input
                      placeholder="e.g. Skyline Realty Group"
                      value={orgName}
                      onChange={handleOrgNameChange}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Workspace Identifier (Slug) *
                    </label>
                    <div className="flex rounded-md border border-border bg-muted/40">
                      <span className="inline-flex items-center px-3 text-xs text-muted-foreground select-none border-r border-border">
                        app.crm.com/
                      </span>
                      <input
                        type="text"
                        className="flex-1 min-w-0 bg-transparent px-3 py-2 text-sm focus:outline-none"
                        value={orgSlug}
                        onChange={(e) => setLogSlugState(e.target.value)}
                        placeholder="skyline-realty"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Admin Full Name *
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="John Doe"
                        value={adminFullName}
                        onChange={(e) => setAdminFullName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Admin Email *
                      </label>
                      <Input
                        type="email"
                        placeholder="admin@company.com"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">
                        Password *
                      </label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full flex items-center justify-center gap-2"
                      onClick={() => {
                        if (!orgName || !orgSlug || !adminFullName || !adminEmail || !adminPassword) {
                          toast.error("Please fill all required fields before proceeding.");
                          return;
                        }
                        setStep(2);
                      }}
                    >
                      Next: Team Size & Plan
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-foreground block">
                      Number of Initial User Seats
                    </label>
                    <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-lg border border-border">
                      <Users className="w-8 h-8 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{initialSeats} Active Team Seats</span>
                          <span className="text-xs font-medium text-muted-foreground">
                            ₹{PRICE_PER_SEAT}/user/mo
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          value={initialSeats}
                          onChange={(e) => setInitialSeats(Number(e.target.value))}
                          className="w-full mt-2 accent-primary cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can add or remove agent seats anytime from your billing settings.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-1/3"
                      onClick={() => setStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-2/3 flex items-center justify-center gap-2"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Processing..." : `Pay ₹${totalDueToday.toLocaleString("en-IN")} via Razorpay`}
                      <ShieldCheck className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Pricing Summary Side Card */}
        <Card className="md:col-span-5 border border-border bg-card/60 shadow-sm rounded-xl flex flex-col justify-between p-6">
          <div>
            <h2 className="text-base font-semibold text-foreground mb-4">Pricing Breakdown</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">One-time Platform Setup:</span>
                <span className="font-semibold text-foreground">₹{SETUP_FEE.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">User Seats ({initialSeats} × ₹{PRICE_PER_SEAT}):</span>
                <span className="font-semibold text-foreground">₹{monthlySeatsCost.toLocaleString("en-IN")}/mo</span>
              </div>
              <div className="flex justify-between pt-2 text-base font-bold text-foreground">
                <span>Total Due Today:</span>
                <span className="text-primary">₹{totalDueToday.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Isolated tenant database scoping</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Full CRM, Lead Pipelines & Site Visits</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Attendance, HR & Payroll Management</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Razorpay UPI, Cards & NetBanking</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <span className="text-xs text-muted-foreground">Already have an organization? </span>
            <Link to="/auth/login" className="text-xs font-semibold text-primary hover:underline">
              Log in here
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );

  function setLogSlugState(val: string) {
    setOrgSlug(val.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }
}
