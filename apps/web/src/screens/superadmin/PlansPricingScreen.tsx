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
import { Button, Card, Input } from "ui";
import { api } from "../../common/api";

const PIE_COLORS = ["#F43F5E", "#10B981", "#2563EB", "#8B5CF6", "#F59E0B"];

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

export function PlansPricingScreen() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<CommercialPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");

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

  // Archive modal
  const [archivingPlan, setArchivingPlan] = useState<CommercialPlan | null>(null);

  const fetchPlansAndMetrics = async () => {
    setLoading(true);
    try {
      const [plansRes, metricsRes] = await Promise.all([
        api.get("/organizations/platform-plans"),
        api.get("/organizations/platform-metrics"),
      ]);
      setPlans(plansRes.data || []);
      const orgs = metricsRes.data.organizations || [];
      const planCountMap: Record<string, number> = {
        STARTER: 0,
        GROWTH: 0,
        ENTERPRISE: 0,
      };
      let computedMrr = 0;
      orgs.forEach((org: any) => {
        const tier = org.planTier || "STARTER";
        planCountMap[tier] = (planCountMap[tier] || 0) + 1;
        const seatPrice = org.pricePerSeatMonth || (tier === "ENTERPRISE" ? 1499 : tier === "GROWTH" ? 899 : 499);
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
    return [
      { name: "Starter Plan", value: platformMetrics.tenantsByPlan["STARTER"] || 0, color: "#F43F5E" },
      { name: "Growth Automation", value: platformMetrics.tenantsByPlan["GROWTH"] || 0, color: "#10B981" },
      { name: "Enterprise Suite", value: platformMetrics.tenantsByPlan["ENTERPRISE"] || 0, color: "#2563EB" },
    ].filter((d) => d.value > 0);
  }, [platformMetrics]);

  const barChartData = useMemo(() => {
    return [
      {
        name: "Starter",
        mrr: (platformMetrics.tenantsByPlan["STARTER"] || 0) * 499 * 5,
      },
      {
        name: "Growth",
        mrr: (platformMetrics.tenantsByPlan["GROWTH"] || 0) * 899 * 15,
      },
      {
        name: "Enterprise",
        mrr: (platformMetrics.tenantsByPlan["ENTERPRISE"] || 0) * 1499 * 50,
      },
    ];
  }, [platformMetrics]);

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
            Manage commercial subscription packages, seat pricing, storage allowances, and limits
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
            onClick={() => toast.success("Commercial plans are active and available for customer onboarding.")}
            className="gap-2 font-bold bg-[#0D1F3D] text-white hover:bg-[#132d56] shadow-xs"
          >
            <Sparkles className="h-4 w-4" /> Active Tiers
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Commercial Plans</p>
            <Layers className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-[#0D1F3D] mt-2">{plans.length}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Active Tiers</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Subscribed Tenants</p>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{platformMetrics.totalTenants}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Live Workspaces</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Estimated MRR</p>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700 mt-2">
            ₹{platformMetrics.totalMrr.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">Recurring Monthly</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Starter Tier</p>
            <Tag className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-extrabold text-rose-700 mt-2">
            {platformMetrics.tenantsByPlan["STARTER"] || 0}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">₹499/seat/mo</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Growth Tier</p>
            <Zap className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">
            {platformMetrics.tenantsByPlan["GROWTH"] || 0}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">₹899/seat/mo</p>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">Enterprise Tier</p>
            <Shield className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold text-blue-700 mt-2">
            {platformMetrics.tenantsByPlan["ENTERPRISE"] || 0}
          </p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">₹1,499/seat/mo</p>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
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
                {plan.badge && (
                  <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {plan.badge}
                  </span>
                )}
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
                  <span className="text-slate-500 font-medium">Min Seats:</span>
                  <span className="font-bold text-slate-800">{plan.limits.minimumSeats}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Default Capacity:</span>
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
                <p className="text-xs font-bold text-[#0D1F3D]">Included Capabilities:</p>
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
                <span className="text-[11px] text-slate-400 font-medium">Adoption:</span>
                <p className="text-xs font-bold text-[#0D1F3D]">
                  {platformMetrics.tenantsByPlan[plan.code] || 0} Tenants
                </p>
              </div>
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                {plan.status}
              </span>
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
                  <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={2} dataKey="value">
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
    </div>
  );
}
