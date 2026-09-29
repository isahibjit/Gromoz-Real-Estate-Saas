import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  Plus,
  Search,
  RotateCcw,
  MoreVertical,
  Edit,
  Copy,
  Archive,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  AlertTriangle,
  Tag,
  Check,
  Building2,
  Sparkles,
  Shield,
  Zap,
  Trash2,
  X,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-hot-toast";
import {
  Button,
  Card,
  Input,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "ui";
import { api } from "../../common/api";

interface CommercialPlan {
  id: string;
  name: string;
  code: string;
  status: "Active" | "Draft" | "Archived";
  badge?: string;
  color: string;
  description: string;
  pricing: {
    model: string;
    monthlyPricePerSeat: number;
    annualPricePerSeat: number;
    setupFee: number;
    currency: string;
    allowMonthlyBilling: boolean;
    allowAnnualBilling: boolean;
  };
  limits: {
    minimumSeats: number;
    defaultSeatLimit: number;
    storageGb: number;
    leadLimit: number;
    projectLimit: number;
  };
  features: string[];
  commercialRules: {
    trialEnabled: boolean;
    trialDurationDays: number;
  };
}

const DEFAULT_PLAN_FORM = {
  name: "",
  code: "",
  status: "Active" as "Active" | "Draft" | "Archived",
  badge: "",
  color: "#8B5CF6",
  description: "",
  monthlyPricePerSeat: 699,
  annualPricePerSeat: 549,
  setupFee: 0,
  minimumSeats: 5,
  defaultSeatLimit: 10,
  storageGb: 25,
  leadLimit: 25000,
  projectLimit: 20,
  trialEnabled: true,
  trialDurationDays: 14,
  featuresText: "Multi-pipeline Lead Management\nGPS Site Visit Verification\nCustom Role & RBAC\nWhatsApp Notification Integration\nAutomated Follow-up Sequences",
};

export function PlansPricingScreen() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Create / Edit modal state
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(DEFAULT_PLAN_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // Metrics from platform
  const [platformMetrics, setPlatformMetrics] = useState<{
    totalTenants: number;
    totalMrr: number;
    tenantsByPlan: Record<string, number>;
  }>({
    totalTenants: 0,
    totalMrr: 0,
    tenantsByPlan: {},
  });

  const fetchPlansAndMetrics = async () => {
    setLoading(true);
    try {
      const [plansRes, metricsRes] = await Promise.all([
        api.get("/organizations/platform-plans"),
        api.get("/organizations/platform-metrics"),
      ]);
      const fetchedPlans: CommercialPlan[] = plansRes.data || [];
      setPlans(fetchedPlans);

      const orgs = metricsRes.data.organizations || [];
      const planCountMap: Record<string, number> = {};
      let computedMrr = 0;

      orgs.forEach((org: any) => {
        const tier = org.planTier || "STARTER";
        planCountMap[tier] = (planCountMap[tier] || 0) + 1;
        const matchingPlan = fetchedPlans.find((p) => p.code === tier || p.id === tier);
        const seatPrice =
          org.pricePerSeatMonth ||
          (matchingPlan ? matchingPlan.pricing.monthlyPricePerSeat : 499);
        computedMrr += (org.allocatedSeats || 1) * seatPrice;
      });

      setPlatformMetrics({
        totalTenants: orgs.length,
        totalMrr: computedMrr,
        tenantsByPlan: planCountMap,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load commercial plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndMetrics();
  }, []);

  const openCreateModal = () => {
    setEditingPlanId(null);
    setPlanForm(DEFAULT_PLAN_FORM);
    setIsPlanModalOpen(true);
  };

  const openEditModal = (plan: CommercialPlan) => {
    setEditingPlanId(plan.id);
    setPlanForm({
      name: plan.name,
      code: plan.code,
      status: plan.status,
      badge: plan.badge || "",
      color: plan.color || "#0D1F3D",
      description: plan.description,
      monthlyPricePerSeat: plan.pricing.monthlyPricePerSeat,
      annualPricePerSeat: plan.pricing.annualPricePerSeat,
      setupFee: plan.pricing.setupFee,
      minimumSeats: plan.limits.minimumSeats,
      defaultSeatLimit: plan.limits.defaultSeatLimit,
      storageGb: plan.limits.storageGb,
      leadLimit: plan.limits.leadLimit,
      projectLimit: plan.limits.projectLimit,
      trialEnabled: plan.commercialRules.trialEnabled,
      trialDurationDays: plan.commercialRules.trialDurationDays,
      featuresText: (plan.features || []).join("\n"),
    });
    setIsPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name.trim()) {
      toast.error("Plan name is required.");
      return;
    }

    const payload = {
      name: planForm.name.trim(),
      code: planForm.code.trim() || planForm.name.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
      status: planForm.status,
      badge: planForm.badge.trim(),
      color: planForm.color,
      description: planForm.description.trim(),
      pricing: {
        model: "per_user_per_month",
        monthlyPricePerSeat: Number(planForm.monthlyPricePerSeat),
        annualPricePerSeat: Number(planForm.annualPricePerSeat),
        setupFee: Number(planForm.setupFee),
        currency: "INR",
        allowMonthlyBilling: true,
        allowAnnualBilling: true,
      },
      limits: {
        minimumSeats: Number(planForm.minimumSeats),
        defaultSeatLimit: Number(planForm.defaultSeatLimit),
        storageGb: Number(planForm.storageGb),
        leadLimit: Number(planForm.leadLimit),
        projectLimit: Number(planForm.projectLimit),
      },
      features: planForm.featuresText
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      commercialRules: {
        trialEnabled: planForm.trialEnabled,
        trialDurationDays: Number(planForm.trialDurationDays),
      },
    };

    setIsSaving(true);
    try {
      if (editingPlanId) {
        await api.patch(`/organizations/platform-plans/${editingPlanId}`, payload);
        toast.success(`Commercial Plan '${payload.name}' updated.`);
      } else {
        await api.post("/organizations/platform-plans", payload);
        toast.success(`Commercial Plan '${payload.name}' created and live for customer onboarding.`);
      }
      setIsPlanModalOpen(false);
      await fetchPlansAndMetrics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save commercial plan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicatePlan = async (plan: CommercialPlan) => {
    try {
      await api.post(`/organizations/platform-plans/${plan.id}/duplicate`);
      toast.success(`Plan '${plan.name}' duplicated as draft.`);
      await fetchPlansAndMetrics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to duplicate plan.");
    }
  };

  const handleArchivePlan = async (plan: CommercialPlan) => {
    try {
      await api.patch(`/organizations/platform-plans/${plan.id}/archive`);
      toast.success(`Plan '${plan.name}' archived.`);
      await fetchPlansAndMetrics();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to archive plan.");
    }
  };

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "All" || plan.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, selectedStatus]);

  const pieChartData = useMemo(() => {
    return plans
      .map((p) => ({
        name: p.name,
        value: platformMetrics.tenantsByPlan[p.code] || 0,
        color: p.color || "#0D1F3D",
      }))
      .filter((d) => d.value > 0);
  }, [plans, platformMetrics]);

  const barChartData = useMemo(() => {
    return plans.map((p) => {
      const count = platformMetrics.tenantsByPlan[p.code] || 0;
      return {
        name: p.name.split(" ")[0],
        mrr: count * p.pricing.monthlyPricePerSeat * p.limits.defaultSeatLimit,
      };
    });
  }, [plans, platformMetrics]);

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Pricing & Plans</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Configure dynamic commercial subscription packages, seat pricing, storage quotas, and customer onboarding tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlansAndMetrics}
            className="gap-2 font-bold text-slate-700"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={openCreateModal}
            className="gap-2 font-bold bg-[#E20613] text-white hover:bg-[#c00510] shadow-xs"
          >
            <Plus className="h-4 w-4" /> Create Commercial Plan
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Commercial Packages</p>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-[#0D1F3D] mt-2">{plans.length}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Live Subscription Tiers</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Subscribed Tenants</p>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{platformMetrics.totalTenants}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Active Tenant Organizations</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Total Run-rate MRR</p>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700 mt-2">
            ₹{platformMetrics.totalMrr.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Estimated Monthly Recurring</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Free Trials Active</p>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">
            {plans.filter((p) => p.commercialRules.trialEnabled).length} Tiers
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">14-day standard trials enabled</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-sm border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search plans by name, code, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full bg-transparent text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["All", "Active", "Draft", "Archived"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1 rounded-sm text-xs font-bold transition ${
                selectedStatus === st
                  ? "bg-[#0D1F3D] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-sm border border-slate-200 bg-white shadow-xs p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[#0D1F3D] transition-all"
          >
            <div
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: plan.color }}
            />

            <div>
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-1 rounded-sm text-xs font-extrabold text-white"
                  style={{ backgroundColor: plan.color }}
                >
                  {plan.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {plan.badge && (
                    <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {plan.badge}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                      plan.status === "Active"
                        ? "bg-emerald-100 text-emerald-800"
                        : plan.status === "Draft"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {plan.status}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-400">Code: {plan.code}</span>
              </div>

              <p className="text-xs text-slate-500 font-medium mt-3">
                {plan.description}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#0D1F3D]">
                    ₹{plan.pricing.monthlyPricePerSeat}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ user / month</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-bold mt-1">
                  ₹{plan.pricing.annualPricePerSeat}/mo billed annually • Setup fee ₹{plan.pricing.setupFee.toLocaleString("en-IN")}
                </p>
              </div>

              {/* Plan Limits */}
              <div className="mt-4 bg-slate-50 p-3 rounded-sm border border-slate-200/60 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Min License:</span>
                  <span className="font-bold text-slate-800">{plan.limits.minimumSeats} seats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Default Allocation:</span>
                  <span className="font-bold text-slate-800">{plan.limits.defaultSeatLimit} seats</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Storage Quota:</span>
                  <span className="font-bold text-slate-800">{plan.limits.storageGb} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Lead Capacity:</span>
                  <span className="font-bold text-slate-800">{plan.limits.leadLimit.toLocaleString("en-IN")} leads</span>
                </div>
              </div>

              {/* Features List */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-bold text-[#0D1F3D]">Included Commercial Capabilities:</p>
                {plan.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 text-xs font-medium text-slate-700">
                    <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Live Adoption:</span>
                <p className="text-xs font-bold text-[#0D1F3D]">
                  {platformMetrics.tenantsByPlan[plan.code] || 0} Tenants
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditModal(plan)}
                  className="h-8 px-2.5 text-xs font-bold text-slate-700 gap-1"
                >
                  <Edit className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDuplicatePlan(plan)}
                  title="Clone this commercial tier"
                  className="h-8 px-2 text-xs font-bold text-slate-600"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {plan.status !== "Archived" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleArchivePlan(plan)}
                    title="Archive this commercial tier"
                    className="h-8 px-2 text-xs font-bold text-rose-600 hover:text-rose-700"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Breakdown Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">Tenants by Commercial Plan</h3>
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData.length > 0 ? pieChartData : [{ name: "No data", value: 1, color: "#cbd5e1" }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={48}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0D1F3D", borderRadius: "4px", border: "none", color: "#fff" }}
                    itemStyle={{ color: "#FFFFFF", fontWeight: 600, fontSize: "11px" }}
                    formatter={(val: any) => [`${val} Tenants`, "Adoption"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-extrabold text-[#0D1F3D]">
                  {platformMetrics.totalTenants}
                </span>
                <span className="text-[9px] font-bold text-slate-400">Total</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {plans.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-600">{p.name}</span>
                  </div>
                  <span className="text-[#0D1F3D] font-bold">
                    {platformMetrics.tenantsByPlan[p.code] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">Revenue Contribution by Plan</h3>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "MRR"]} />
                <Bar dataKey="mrr" fill="#0D1F3D" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT COMMERCIAL PLAN MODAL */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 rounded-md shadow-2xl">
          <div className="bg-[#0D1F3D] text-white p-5">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-[#E20613] text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <DialogTitle className="text-base font-extrabold text-white">
                  {editingPlanId ? "Edit Commercial Subscription Tier" : "Create New Commercial Subscription Tier"}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-300 font-medium mt-1">
                Configure packaged SaaS pricing, seat rates, capacity quotas, and capabilities. These plans will be directly available when provisioning customer tenants.
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSavePlan} className="p-6 space-y-5 bg-white">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Plan Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scale Automation Suite"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#0D1F3D] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Internal Plan Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SCALE_AUTO"
                  value={planForm.code}
                  onChange={(e) =>
                    setPlanForm({
                      ...planForm,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                    })
                  }
                  className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700">Badge Label</label>
                <input
                  type="text"
                  placeholder="e.g. High Growth"
                  value={planForm.badge}
                  onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                  className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Brand Color</label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={planForm.color}
                    onChange={(e) => setPlanForm({ ...planForm, color: e.target.value })}
                    className="h-10 w-12 rounded-sm border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={planForm.color}
                    onChange={(e) => setPlanForm({ ...planForm, color: e.target.value })}
                    className="h-10 flex-1 rounded-sm border border-slate-200 bg-white px-2.5 text-xs font-mono font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Publish Status</label>
                <select
                  value={planForm.status}
                  onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as any })}
                  className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                >
                  <option value="Active">Active (Live in Wizard)</option>
                  <option value="Draft">Draft (Internal Only)</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Plan Summary Description</label>
              <input
                type="text"
                placeholder="Short tagline explaining target real estate team or segment"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className="mt-1 h-10 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#0D1F3D] focus:outline-none"
              />
            </div>

            {/* Pricing Section */}
            <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-[#0D1F3D] tracking-wider">
                Seat Pricing & Commercials (₹ INR)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Monthly / Seat (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.monthlyPricePerSeat}
                    onChange={(e) => setPlanForm({ ...planForm, monthlyPricePerSeat: Number(e.target.value) })}
                    className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Annual / Seat / Mo (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.annualPricePerSeat}
                    onChange={(e) => setPlanForm({ ...planForm, annualPricePerSeat: Number(e.target.value) })}
                    className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Setup & Onboarding Fee (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={planForm.setupFee}
                    onChange={(e) => setPlanForm({ ...planForm, setupFee: Number(e.target.value) })}
                    className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Capacity & Limits */}
            <div className="rounded-sm border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-[#0D1F3D] tracking-wider">
                Capacity Quotas & Limits
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600">Default Seats</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.defaultSeatLimit}
                    onChange={(e) => setPlanForm({ ...planForm, defaultSeatLimit: Number(e.target.value) })}
                    className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Lead Limit</label>
                  <input
                    type="number"
                    min={100}
                    value={planForm.leadLimit}
                    onChange={(e) => setPlanForm({ ...planForm, leadLimit: Number(e.target.value) })}
                    className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Storage (GB)</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.storageGb}
                    onChange={(e) => setPlanForm({ ...planForm, storageGb: Number(e.target.value) })}
                    className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600">Project Limit</label>
                  <input
                    type="number"
                    min={1}
                    value={planForm.projectLimit}
                    onChange={(e) => setPlanForm({ ...planForm, projectLimit: Number(e.target.value) })}
                    className="mt-1 h-9 w-full rounded-sm border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 focus:border-[#0D1F3D] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Features (One per line) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Commercial Capabilities (One per line)</label>
                <span className="text-[11px] text-slate-400 font-medium">Shown as checkmarks in plan card</span>
              </div>
              <textarea
                rows={4}
                value={planForm.featuresText}
                onChange={(e) => setPlanForm({ ...planForm, featuresText: e.target.value })}
                placeholder="Multi-pipeline Lead Management&#10;GPS Site Visit Verification&#10;Custom Role & RBAC..."
                className="mt-1 w-full rounded-sm border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#0D1F3D] focus:outline-none"
              />
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPlanModalOpen(false)}
                className="font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="font-bold bg-[#0D1F3D] text-white hover:bg-[#132d56]"
              >
                {isSaving ? "Saving..." : editingPlanId ? "Update Plan" : "Create & Publish Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
