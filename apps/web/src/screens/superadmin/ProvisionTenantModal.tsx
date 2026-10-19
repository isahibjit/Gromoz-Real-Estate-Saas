import React, { useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Key,
  Layers,
  Lock,
  Mail,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "ui";
import { api } from "../../common/api";

interface ProvisionTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: () => void;
}

const DEFAULT_PLANS = [
  {
    id: "STARTER",
    name: "Starter Plan",
    price: 499,
    annualPrice: 399,
    seatsIncluded: 5,
    storage: "10 GB",
    leads: "5,000",
    color: "#F43F5E",
    badge: "Emerging Brokerages",
    description: "Core CRM, lead capture & follow-up pipelines.",
  },
  {
    id: "GROWTH",
    name: "Growth Automation",
    price: 899,
    annualPrice: 749,
    seatsIncluded: 15,
    storage: "50 GB",
    leads: "50,000",
    color: "#10B981",
    badge: "Most Popular",
    description: "Live GPS tracking, portal integrations & incentives.",
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise Suite",
    price: 1499,
    annualPrice: 1199,
    seatsIncluded: 50,
    storage: "500 GB",
    leads: "500,000",
    color: "#2563EB",
    badge: "Enterprise Grade",
    description:
      "White-labeling, custom domain, SLA & dedicated account manager.",
  },
];

export function ProvisionTenantModal({
  isOpen,
  onClose,
  onTenantCreated,
}: ProvisionTenantModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [dynamicPlans, setDynamicPlans] = useState<any[]>([]);

  // Form State
  const [form, setForm] = useState({
    // Step 1: Workspace Profile
    companyName: "",
    slug: "",
    industry: "Real Estate & Property Development",
    city: "Mumbai",
    state: "Maharashtra",

    // Step 2: Commercial Plan & Seats
    planTier: "GROWTH",
    seats: 15,
    billingCycle: "monthly" as "monthly" | "annual",
    isTrial: true,

    // Step 3: Admin Credentials
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    sendWelcomeInvite: true,
  });

  // Fetch dynamic plans when modal opens
  React.useEffect(() => {
    if (isOpen) {
      api
        .get("/organizations/platform-plans")
        .then((res) => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            const formatted = res.data
              .filter((p: any) => p.status !== "Archived")
              .map((p: any) => ({
                id: p.code || p.id,
                name: p.name,
                price: p.pricing?.monthlyPricePerSeat || 499,
                annualPrice: p.pricing?.annualPricePerSeat || 399,
                seatsIncluded: p.limits?.defaultSeatLimit || 5,
                storage: `${p.limits?.storageGb || 10} GB`,
                leads: Number(p.limits?.leadLimit || 5000).toLocaleString(
                  "en-IN",
                ),
                color: p.color || "#0D1F3D",
                badge: p.badge || "",
                description: p.description || "Commercial SaaS Subscription",
              }));
            setDynamicPlans(formatted);
          }
        })
        .catch(() => {
          // fallback to defaults silently
        });
    }
  }, [isOpen]);

  const availablePlans = dynamicPlans.length > 0 ? dynamicPlans : DEFAULT_PLANS;

  // Auto-generate slug from company name
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    setForm((prev) => ({
      ...prev,
      companyName: val,
      slug:
        prev.slug === "" || prev.slug === generatedSlug.slice(0, -1)
          ? generatedSlug
          : prev.slug,
    }));
  };

  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    const random = crypto.getRandomValues(new Uint32Array(12));
    const pwd = Array.from(random, (value) => chars[value % chars.length]).join("");
    setForm((prev) => ({ ...prev, adminPassword: pwd }));
    setShowPassword(true);
    toast.success("Generated secure temporary password");
  };

  const selectedPlan =
    availablePlans.find((p) => p.id === form.planTier) ||
    availablePlans[0] ||
    DEFAULT_PLANS[0];
  const unitPrice =
    form.billingCycle === "annual"
      ? selectedPlan.annualPrice
      : selectedPlan.price;
  const estimatedMonthly = unitPrice * form.seats;

  const validateStep1 = () => {
    if (!form.companyName.trim()) {
      toast.error("Company name is required.");
      return false;
    }
    if (!form.slug.trim()) {
      toast.error("Subdomain slug is required.");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (form.seats < 1) {
      toast.error("At least 1 seat must be allocated.");
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!form.adminFullName.trim()) {
      toast.error("Admin full name is required.");
      return false;
    }
    if (!form.adminEmail.trim() || !form.adminEmail.includes("@")) {
      toast.error("A valid admin email is required.");
      return false;
    }
    if (!form.adminPassword || form.adminPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return false;
    }
    return true;
  };

  const [createdTenantResult, setCreatedTenantResult] = useState<{
    companyName: string;
    subdomain: string;
    adminEmail: string;
    adminPassword?: string;
    paymentLinkUrl: string;
    totalAmount: number;
    seats: number;
    status: string;
    workspaceUrl: string;
    welcomeEmailSent?: boolean;
    checkoutError?: string | null;
    isTrial?: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep3()) return;

    setIsSubmitting(true);
    try {
      const res = await api.post("/organizations/provision", {
        isTrial: form.isTrial,
        organizationName: form.companyName.trim(),
        subdomain: form.slug.trim().toLowerCase(),
        fullName: form.adminFullName.trim(),
        email: form.adminEmail.trim().toLowerCase(),
        password: form.adminPassword,
        planTier: form.planTier,
        seats: Number(form.seats) || 5,
        industry: form.industry,
        city: form.city,
        state: form.state,
      });

      const checkoutData = res.data?.checkoutOrder;
      const linkUrl =
        checkoutData?.paymentLinkUrl || checkoutData?.shortUrl || "";

      setCreatedTenantResult({
        companyName: form.companyName.trim(),
        subdomain: form.slug.trim().toLowerCase(),
        adminEmail: form.adminEmail.trim().toLowerCase(),
        adminPassword: form.adminPassword,
        paymentLinkUrl: linkUrl,
        totalAmount: checkoutData?.amount || 0,
        seats: checkoutData?.seatsCount || Number(form.seats) || 5,
        status:
          res.data?.organization?.status ||
          (form.isTrial ? "TRIAL" : "SETUP_PENDING"),
        workspaceUrl:
          res.data?.organization?.workspaceUrl ||
          `https://${form.slug.trim().toLowerCase()}.gromoze.com`,
        welcomeEmailSent: res.data?.welcomeEmailSent,
        checkoutError: res.data?.checkoutError,
        isTrial: form.isTrial,
      });

      toast.success(
        `Tenant organization "${form.companyName}" successfully provisioned!`,
      );
      onTenantCreated();
      setStep(4);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to provision tenant workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[92vh] overflow-y-auto p-0 border border-slate-200 bg-white shadow-2xl rounded-lg font-sans">
        {/* Modal Header */}
        <div className="bg-primary !text-white p-6 rounded-t-lg relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 !text-white/80 hover:!text-white p-1 rounded-md transition hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 !text-white border border-white/20 shadow-xs">
              <Building2 className="h-5 w-5 !text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold !text-white tracking-tight">
                Provision Customer Tenant Workspace
              </h2>
              <p className="text-xs !text-slate-200 font-medium mt-0.5">
                Onboard a new real estate company with customized commercial
                subscription and admin setup.
              </p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-white/20">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 p-2 rounded text-left transition ${
                step === 1
                  ? "bg-white/20 !text-white font-bold border border-white/40 shadow-xs"
                  : step > 1
                  ? "!text-emerald-300 font-semibold hover:bg-white/10"
                  : "!text-slate-300 hover:!text-white hover:bg-white/10"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 1
                    ? "bg-tertiary !text-white"
                    : step > 1
                    ? "bg-emerald-500 !text-white"
                    : "bg-slate-700 !text-slate-200"
                }`}
              >
                {step > 1 ? <Check className="h-3 w-3 !text-white" /> : "1"}
              </span>
              <span
                className={`text-xs truncate font-medium ${
                  step === 1
                    ? "!text-white font-bold"
                    : step > 1
                    ? "!text-emerald-300 font-semibold"
                    : "!text-slate-200"
                }`}
              >
                1. Workspace Identity
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className={`flex items-center gap-2 p-2 rounded text-left transition ${
                step === 2
                  ? "bg-white/20 !text-white font-bold border border-white/40 shadow-xs"
                  : step > 2
                  ? "!text-emerald-300 font-semibold hover:bg-white/10"
                  : "!text-slate-300 hover:!text-white hover:bg-white/10"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 2
                    ? "bg-tertiary !text-white"
                    : step > 2
                    ? "bg-emerald-500 !text-white"
                    : "bg-slate-700 !text-slate-200"
                }`}
              >
                {step > 2 ? <Check className="h-3 w-3 !text-white" /> : "2"}
              </span>
              <span
                className={`text-xs truncate font-medium ${
                  step === 2
                    ? "!text-white font-bold"
                    : step > 2
                    ? "!text-emerald-300 font-semibold"
                    : "!text-slate-200"
                }`}
              >
                2. Commercial Plan
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (validateStep1() && validateStep2()) setStep(3);
              }}
              className={`flex items-center gap-2 p-2 rounded text-left transition ${
                step === 3
                  ? "bg-white/20 !text-white font-bold border border-white/40 shadow-xs"
                  : "!text-slate-300 hover:!text-white hover:bg-white/10"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === 3
                    ? "bg-tertiary !text-white"
                    : "bg-slate-700 !text-slate-200"
                }`}
              >
                3
              </span>
              <span
                className={`text-xs truncate font-medium ${
                  step === 3 ? "!text-white font-bold" : "!text-slate-200"
                }`}
              >
                3. Tenant Admin
              </span>
            </button>
          </div>
        </div>

        {/* Modal Form Body */}
        <div className="p-6 space-y-6">
          {/* STEP 1: Workspace Profile */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-primary">
                  Organization & Workspace Profile
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Set the legal company name and choose their unique SaaS
                  workspace URL.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Company / Organization Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prestige Heights Realtors Pvt Ltd"
                  value={form.companyName}
                  onChange={handleCompanyNameChange}
                  className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Workspace Subdomain Slug *
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3.5 transition-all focus-within:border-primary focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/10">
                  <Globe className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="prestige-heights"
                    value={form.slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                    style={{
                      outline: "none",
                      border: "none",
                      boxShadow: "none",
                    }}
                    className="h-11 flex-1 bg-transparent border-none outline-none ring-0 shadow-none text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none focus:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none focus-visible:shadow-none invalid:outline-none invalid:shadow-none px-0"
                  />
                  <span className="text-xs font-semibold text-slate-400 shrink-0 pl-1">
                    .gromoze.com
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Tenant workspace will be accessible at:{" "}
                  <span className="font-mono font-bold text-primary">
                    https://{form.slug || "slug"}.gromoze.com
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Primary Real Estate Segment
                  </label>
                  <select
                    value={form.industry}
                    onChange={(e) =>
                      setForm({ ...form, industry: e.target.value })
                    }
                    className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                  >
                    <option value="Real Estate & Property Development">
                      Real Estate & Property Development
                    </option>
                    <option value="Brokerage Agency & Channel Partner">
                      Brokerage Agency & Channel Partner
                    </option>
                    <option value="Commercial Leasing & High-Rise Towers">
                      Commercial Leasing & High-Rise Towers
                    </option>
                    <option value="Plotting & Land Development">
                      Plotting & Land Development
                    </option>
                    <option value="Luxury Villas & Farmhouses">
                      Luxury Villas & Farmhouses
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">
                    Headquarters City / State
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <input
                      type="text"
                      placeholder="City (e.g. Mumbai)"
                      value={form.city}
                      onChange={(e) =>
                        setForm({ ...form, city: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                    <input
                      type="text"
                      placeholder="State (e.g. Maharashtra)"
                      value={form.state}
                      onChange={(e) =>
                        setForm({ ...form, state: e.target.value })
                      }
                      className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Commercial Plan & Capacity */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-primary">
                    Commercial Plan & Licensed Capacity
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Select commercial tier and assign initial seat licenses.
                  </p>
                </div>

                {/* Billing Frequency Toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-sm border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, billingCycle: "monthly" })
                    }
                    className={`px-3 py-1 rounded-sm text-xs font-bold transition ${
                      form.billingCycle === "monthly"
                        ? "bg-white text-primary shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, billingCycle: "annual" })}
                    className={`px-3 py-1 rounded-sm text-xs font-bold transition flex items-center gap-1 ${
                      form.billingCycle === "annual"
                        ? "bg-primary text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Annual
                    <span className="bg-emerald-500 text-white text-[9px] px-1 rounded-xs uppercase font-extrabold">
                      -20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plan Tier Selection Cards */}
              {availablePlans.length === 0 ? (
                <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <CreditCard className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-primary">
                    No commercial plans configured
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Please create or activate commercial subscription tiers in
                    Platform Settings &gt; Pricing &amp; Plans.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {availablePlans.map((plan) => {
                    const isSelected = form.planTier === plan.id;
                    const price =
                      form.billingCycle === "annual"
                        ? plan.annualPrice
                        : plan.price;

                    return (
                      <div
                        key={plan.id}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            planTier: plan.id,
                            seats: Math.max(prev.seats, plan.seatsIncluded),
                          }))
                        }
                        className={`rounded-sm border p-4 cursor-pointer transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-slate-50/70 ring-1 ring-primary shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        )}

                        <div>
                          <span
                            className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded text-white inline-block"
                            style={{ backgroundColor: plan.color }}
                          >
                            {plan.name}
                          </span>

                          <div className="mt-3">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xl font-extrabold text-primary">
                                ₹{price}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">
                                / user / mo
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-1">
                              {plan.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-200/60 text-[11px] text-slate-600 font-medium space-y-1">
                          <div className="flex justify-between">
                            <span>Capacity:</span>
                            <strong className="text-slate-800">
                              {plan.leads} leads
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span>Storage:</span>
                            <strong className="text-slate-800">
                              {plan.storage}
                            </strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Seat Allocation & Activation Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="rounded-sm border border-slate-200 bg-slate-50/50 p-4">
                  <label className="text-xs font-bold text-slate-700">
                    Allocated Seat Licenses
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium mb-3">
                    Total number of agents, telecallers, and managers who can
                    access this CRM.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          seats: Math.max(1, prev.seats - 5),
                        }))
                      }
                      className="h-10 w-10 flex items-center justify-center rounded-sm border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={form.seats}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          seats: Math.max(1, Number(e.target.value)),
                        })
                      }
                      className="h-10 flex-1 rounded-sm border border-slate-200 bg-white px-3 text-center text-sm font-bold text-slate-800 focus:border-primary focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, seats: prev.seats + 5 }))
                      }
                      className="h-10 w-10 flex items-center justify-center rounded-sm border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-100 transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-slate-50/50 p-4 flex flex-col justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Initial Activation State
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium mb-2">
                      Start as evaluating trial or mark as live paying customer.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isTrial: true })}
                      className={`p-2 rounded-sm text-xs font-bold border transition text-center ${
                        form.isTrial
                          ? "bg-blue-50 border-blue-600 text-blue-700 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      14-Day Free Trial
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, isTrial: false })}
                      className={`p-2 rounded-sm text-xs font-bold border transition text-center ${
                        !form.isTrial
                          ? "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-600"
                      }`}
                    >
                      Active Commercial
                    </button>
                  </div>
                </div>
              </div>

              {/* Cost Summary Box */}
              <div className="rounded-sm bg-primary text-white p-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">
                    Commercial Tier: {selectedPlan.name}
                  </p>
                  <p className="text-[11px] text-slate-300 font-medium">
                    {form.seats} seats @ ₹{unitPrice}/seat/mo (
                    {form.billingCycle})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-white">
                    ₹{estimatedMonthly.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium block">
                    / month
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Tenant Super-Admin Account */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-sm font-bold text-primary">
                  Primary Tenant Administrator Account
                </h4>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Set the credentials for the organization's owner/director to
                  log in and manage their CRM.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Administrator Full Name *
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-3.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <User className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikramaditya Singhania"
                    value={form.adminFullName}
                    onChange={(e) =>
                      setForm({ ...form, adminFullName: e.target.value })
                    }
                    style={{
                      outline: "none",
                      border: "none",
                      boxShadow: "none",
                    }}
                    className="h-11 flex-1 bg-transparent border-none outline-none ring-0 shadow-none text-xs font-semibold text-slate-800 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none focus:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none focus-visible:shadow-none invalid:outline-none invalid:shadow-none px-0"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">
                  Administrator Email Address *
                </label>
                <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-3.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Mail className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="email"
                    required
                    placeholder="admin@prestigeheights.com"
                    value={form.adminEmail}
                    onChange={(e) =>
                      setForm({ ...form, adminEmail: e.target.value })
                    }
                    style={{
                      outline: "none",
                      border: "none",
                      boxShadow: "none",
                    }}
                    className="h-11 flex-1 bg-transparent border-none outline-none ring-0 shadow-none text-xs font-semibold text-slate-800 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none focus:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none focus-visible:shadow-none invalid:outline-none invalid:shadow-none px-0"
                  />
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-1">
                  Login instructions and tenant credentials will be tied to this
                  primary address.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Temporary Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" /> Generate Password
                  </button>
                </div>
                <div className="mt-1 flex items-center rounded-lg border border-slate-200 bg-white px-3.5 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10">
                  <Key className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={form.adminPassword}
                    onChange={(e) =>
                      setForm({ ...form, adminPassword: e.target.value })
                    }
                    style={{
                      outline: "none",
                      border: "none",
                      boxShadow: "none",
                    }}
                    className="h-11 flex-1 bg-transparent border-none outline-none ring-0 shadow-none text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none focus:bg-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:border-none focus-visible:shadow-none invalid:outline-none invalid:shadow-none px-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirmation Overview Box */}
              <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <p className="font-bold text-primary flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />{" "}
                  Provisioning Summary:
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Organization:
                    </span>
                    <strong className="text-slate-800">
                      {form.companyName || "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      URL:
                    </span>
                    <strong className="text-slate-800">
                      {form.slug || "slug"}.gromoze.com
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Commercial Plan:
                    </span>
                    <strong className="text-slate-800">
                      {selectedPlan.name} ({form.seats} seats)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Status:
                    </span>
                    <strong
                      className={
                        form.isTrial ? "text-blue-600" : "text-emerald-600"
                      }
                    >
                      {form.isTrial ? "14-Day Trial" : "Payment pending"}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 4 && createdTenantResult && (
            <div className="space-y-5 animate-in fade-in duration-300 py-2">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Workspace Provisioned Successfully!
                </h3>
                <p className="text-xs text-slate-500">
                  Tenant{" "}
                  <strong className="text-slate-800">
                    {createdTenantResult.companyName}
                  </strong>{" "}
                  has been created.{" "}
                  {createdTenantResult.status === "TRIAL"
                    ? "Your 14-day trial is ready."
                    : "Activation payment is pending."}
                </p>
              </div>

              {/* Status & Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Workspace Status:
                  </span>
                  <span
                    className={`font-semibold px-2.5 py-0.5 rounded-full ${
                      createdTenantResult.status === "TRIAL"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {createdTenantResult.status === "TRIAL"
                      ? "14-Day Free Trial"
                      : createdTenantResult.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Admin Email:
                  </span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {createdTenantResult.adminEmail}
                  </span>
                </div>
                {createdTenantResult.adminPassword && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      Initial Password:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-800">
                        {createdTenantResult.adminPassword}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            createdTenantResult.adminPassword || "",
                          );
                          toast.success("Password copied!");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Allocated Seats:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {createdTenantResult.seats} Seats
                  </span>
                </div>
                <div className="text-xs">
                  <span className="text-slate-500">Workspace Login URL: </span>
                  <a
                    className="text-primary font-bold underline"
                    href={`${createdTenantResult.workspaceUrl}/login`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {createdTenantResult.workspaceUrl}/login
                  </a>
                </div>
              </div>

              {/* Email Delivery Notice */}
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 font-medium">
                  <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {createdTenantResult.welcomeEmailSent === true
                      ? `Welcome kit email with credentials dispatched to ${createdTenantResult.adminEmail}`
                      : `Credentials ready for administrator (${createdTenantResult.adminEmail})`}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  {createdTenantResult.welcomeEmailSent === true
                    ? "Email accepted"
                    : "Email not sent"}
                </span>
              </div>

              {/* Payment Link OR Trial Information */}
              {createdTenantResult.status === "TRIAL" ||
              createdTenantResult.isTrial ? (
                <div className="space-y-3 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      14-Day Free Trial Active:
                    </label>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      No Payment Required
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    This customer workspace is fully activated in 14-day trial
                    mode. The tenant administrator can sign in immediately at
                    their subdomain portal using the credentials above.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 text-xs bg-white text-slate-700 hover:bg-slate-50 border-slate-300"
                      onClick={() => {
                        const credentialsText = `Gromoze CRM Workspace Credentials:\n\nCompany: ${
                          createdTenantResult.companyName
                        }\nLogin URL: ${
                          createdTenantResult.workspaceUrl
                        }/login\nEmail: ${
                          createdTenantResult.adminEmail
                        }\nPassword: ${
                          createdTenantResult.adminPassword ||
                          "Set during creation"
                        }\nPlan: 14-Day Free Trial`;
                        navigator.clipboard.writeText(credentialsText);
                        toast.success("Full workspace credentials copied!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      Copy Credentials
                    </Button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Hello! Welcome to Gromoze CRM. Here are your official workspace access details:\n\nWorkspace: ${
                          createdTenantResult.companyName
                        }\nPortal: ${
                          createdTenantResult.workspaceUrl
                        }/login\nAdmin Email: ${
                          createdTenantResult.adminEmail
                        }\nTemporary Password: ${
                          createdTenantResult.adminPassword || ""
                        }\n\nPlease log in and get started!`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      Share via WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-blue-50/60 border border-blue-200/80 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      Shareable Razorpay Payment Link:
                    </label>
                    <span className="text-[11px] text-blue-700 font-medium">
                      Activation Payment
                    </span>
                  </div>

                  {createdTenantResult.paymentLinkUrl ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={createdTenantResult.paymentLinkUrl}
                          className="font-mono text-xs bg-white border-blue-200 text-slate-800 select-all"
                        />
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-1.5 whitespace-nowrap bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              createdTenantResult.paymentLinkUrl,
                            );
                            toast.success("Payment link copied to clipboard!");
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copy Link
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Hello! Here is your official setup & activation payment link for ${createdTenantResult.companyName} CRM: ${createdTenantResult.paymentLinkUrl}`,
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" />
                          Share via WhatsApp
                        </a>
                        <a
                          href={createdTenantResult.paymentLinkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Open Link <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-2">
                      <p className="text-slate-600 font-medium">
                        {createdTenantResult.checkoutError ||
                          "A payment link is not available. Open Manage tenant → Onboarding to generate a new link after configuring Razorpay."}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const credentialsText = `Gromoze CRM Workspace Credentials:\n\nCompany: ${
                            createdTenantResult.companyName
                          }\nLogin URL: ${
                            createdTenantResult.workspaceUrl
                          }/login\nEmail: ${
                            createdTenantResult.adminEmail
                          }\nPassword: ${
                            createdTenantResult.adminPassword ||
                            "Set during creation"
                          }`;
                          navigator.clipboard.writeText(credentialsText);
                          toast.success("Credentials copied!");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy Workspace
                        Credentials
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 rounded-b-lg flex items-center justify-between">
          {step === 4 ? (
            <div className="w-full flex justify-end">
              <Button
                type="button"
                size="sm"
                className="font-bold bg-primary text-white hover:bg-[#132d56]"
                onClick={() => {
                  onClose();
                  setStep(1);
                  setCreatedTenantResult(null);
                }}
              >
                Close & View Workspaces
              </Button>
            </div>
          ) : (
            <>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((prev) => (prev - 1) as any)}
                  className="font-bold text-slate-700"
                >
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="font-bold text-slate-700"
                >
                  Cancel
                </Button>
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (step === 1 && validateStep1()) setStep(2);
                    else if (step === 2 && validateStep2()) setStep(3);
                  }}
                  className="font-bold bg-primary text-white hover:bg-[#132d56] shadow-xs gap-1.5"
                >
                  Continue to Step {step + 1}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isSubmitting
                    ? "Provisioning Tenant..."
                    : "Complete & Provision Workspace"}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
