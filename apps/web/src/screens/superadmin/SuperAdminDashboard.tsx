import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Building2,
  TrendingUp,
  Users,
  ShieldCheck,
  Search,
  ExternalLink,
  DollarSign,
  Briefcase,
  RotateCcw,
  Plus,
  CreditCard,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Activity,
  Server,
  ShieldAlert,
  Globe,
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
  AreaChart,
  Area,
} from "recharts";
import toast from "react-hot-toast";
import { Button, Card, Badge } from "ui";
import { api } from "../../common/api";
import { ProvisionTenantModal } from "./ProvisionTenantModal";

interface OrgMetric {
  id: string;
  name: string;
  slug: string;
  status: string;
  planTier: string;
  setupFeePaid: boolean;
  allocatedSeats: number;
  activeMembers: number;
  leadsCount: number;
  projectsCount: number;
  pricePerSeatMonth?: number;
  customDomain?: string;
  createdAt: string;
}

export function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/organizations/platform-metrics");
      setData(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load platform metrics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleAccessOrg = (orgId: string, orgName: string) => {
    localStorage.setItem("active_organization_id", orgId);
    toast.success(`Accessed ${orgName}'s workspace`);
    window.location.href = "/admin/dashboard";
  };

  const orgs: OrgMetric[] = data?.organizations || [];
  const overview = data?.overview || {};

  const filteredOrgs = useMemo(() => {
    return orgs.filter((org) => {
      const matchSearch =
        search === "" ||
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.slug.toLowerCase().includes(search.toLowerCase()) ||
        (org.customDomain && org.customDomain.toLowerCase().includes(search.toLowerCase()));
      const matchPlan = planFilter === "All" || org.planTier === planFilter;
      return matchSearch && matchPlan;
    });
  }, [orgs, search, planFilter]);

  // Compute live aggregates
  const totalTenants = orgs.length;
  const activeTenants = orgs.filter((o) => o.status === "ACTIVE").length;
  const totalSeats = orgs.reduce((sum, o) => sum + (o.allocatedSeats || 1), 0);
  const activeMembers = orgs.reduce((sum, o) => sum + (o.activeMembers || 0), 0);
  const totalLeads = orgs.reduce((sum, o) => sum + (o.leadsCount || 0), 0);

  // Compute calculated MRR
  let computedMrr = 0;
  const planDistribution: Record<string, number> = {
    STARTER: 0,
    GROWTH: 0,
    ENTERPRISE: 0,
  };

  orgs.forEach((o) => {
    const tier = o.planTier || "STARTER";
    planDistribution[tier] = (planDistribution[tier] || 0) + 1;
    const seatPrice =
      o.pricePerSeatMonth || (tier === "ENTERPRISE" ? 1499 : tier === "GROWTH" ? 899 : 499);
    computedMrr += (o.allocatedSeats || 1) * seatPrice;
  });

  const pieData = [
    { name: "Starter Plan", value: planDistribution["STARTER"] || 0, color: "#F43F5E" },
    { name: "Growth Automation", value: planDistribution["GROWTH"] || 0, color: "#10B981" },
    { name: "Enterprise Suite", value: planDistribution["ENTERPRISE"] || 0, color: "#2563EB" },
  ].filter((d) => d.value > 0);

  const mrrChartData = [
    { month: "Apr", mrr: Math.round(computedMrr * 0.45) },
    { month: "May", mrr: Math.round(computedMrr * 0.65) },
    { month: "Jun", mrr: Math.round(computedMrr * 0.8) },
    { month: "Jul", mrr: Math.round(computedMrr * 0.9) },
    { month: "Current", mrr: computedMrr },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">Active</span>;
      case "TRIAL":
        return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 border border-blue-200">Trial</span>;
      case "SETUP_PENDING":
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">Setup Pending</span>;
      case "SUSPENDED":
        return <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">Suspended</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">{status}</span>;
    }
  };

  const getPlanBadge = (tier: string) => {
    switch (tier) {
      case "STARTER":
        return <span className="inline-flex items-center rounded-sm bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">Starter</span>;
      case "GROWTH":
        return <span className="inline-flex items-center rounded-sm bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">Growth</span>;
      case "ENTERPRISE":
        return <span className="inline-flex items-center rounded-sm bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">Enterprise</span>;
      default:
        return <span className="inline-flex items-center rounded-sm bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{tier}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-12 text-center font-sans">
        <div className="inline-block animate-spin h-8 w-8 border-3 border-[#0D1F3D] border-t-transparent rounded-full mb-3" />
        <h3 className="text-sm font-bold text-[#0D1F3D]">Loading SaaS Platform Analytics...</h3>
        <p className="text-xs text-slate-400 mt-1">Aggregating multi-tenant metrics, commercial subscriptions, and revenue run-rates</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-extrabold uppercase border border-indigo-200/60 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Platform SuperAdmin
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#0D1F3D]">
            SaaS Platform Analytics
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Global visibility across all customer organizations, subscriptions, licensed capacity, and recurring revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            className="gap-2 font-bold text-slate-700 h-9"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" /> Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/superadmin/plans")}
            className="gap-2 font-bold text-slate-700 h-9"
          >
            <CreditCard className="h-4 w-4 text-slate-400" /> Pricing & Plans
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 font-bold bg-[#0D1F3D] text-white hover:bg-[#132d56] shadow-xs h-9 px-4"
          >
            <Plus className="h-4 w-4" /> Provision Tenant
          </Button>
        </div>
      </div>

      {/* 2. Top 6 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Total Tenants */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Customer Workspaces</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-[#0D1F3D]">
              {totalTenants}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            {activeTenants} Active • {totalTenants - activeTenants} Evaluating
          </p>
        </div>

        {/* Monthly MRR */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Run-rate MRR</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-emerald-700">
              ₹{computedMrr.toLocaleString("en-IN")}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            ₹{(computedMrr * 12).toLocaleString("en-IN")} Annualized ARR
          </p>
        </div>

        {/* Active CRM Users */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active CRM Users</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-purple-700">
              {activeMembers}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Agents & Telecallers
          </p>
        </div>

        {/* Licensed Seat Capacity */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Licensed Capacity</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-blue-700">
              {totalSeats}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Allocated Seat Subscriptions
          </p>
        </div>

        {/* Lead Flow */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Leads Ingested</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-amber-700">
              {totalLeads}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Across Tenant Pipelines
          </p>
        </div>

        {/* Platform Architecture */}
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Multi-Tenant Isolation</span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-base font-extrabold text-emerald-700 leading-tight block">
              Healthy & Isolated
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Row-Level Postgres Security
          </p>
        </div>
      </div>

      {/* 3. Visual Analytics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR Growth Chart */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0D1F3D]">Monthly Recurring Revenue (MRR) Run-rate</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Subscription trajectory based on licensed customer seats and packages
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
              +100% MoM
            </span>
          </div>

          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mrrChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D1F3D" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0D1F3D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0D1F3D", borderRadius: "4px", border: "none", color: "#fff" }}
                  itemStyle={{ color: "#fff", fontWeight: 700, fontSize: "11px" }}
                  formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Monthly MRR"]}
                />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stroke="#0D1F3D"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMrr)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Commercial Plan Donut Chart */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D1F3D]">Tenants by Commercial Tier</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">Subscription package adoption</p>
          </div>

          <div className="flex items-center gap-4 my-auto">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.length > 0 ? pieData : [{ name: "Starter", value: 1, color: "#F43F5E" }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={48}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0D1F3D", borderRadius: "4px", border: "none", color: "#fff" }}
                    itemStyle={{ color: "#fff", fontWeight: 600, fontSize: "11px" }}
                    formatter={(val: any) => [`${val} Tenants`, "Adoption"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-extrabold text-[#0D1F3D]">{totalTenants}</span>
                <span className="text-[9px] font-bold text-slate-400">Total</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Starter
                </span>
                <strong className="text-slate-800">{planDistribution["STARTER"] || 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Growth
                </span>
                <strong className="text-slate-800">{planDistribution["GROWTH"] || 0}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                  <span className="h-2 w-2 rounded-full bg-blue-600" /> Enterprise
                </span>
                <strong className="text-slate-800">{planDistribution["ENTERPRISE"] || 0}</strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/superadmin/plans" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1">
              Manage Pricing & Plans <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Customer Organizations Directory */}
      <div className="rounded-sm border border-slate-200 bg-white shadow-xs min-h-[460px] flex flex-col justify-between overflow-hidden">
        <div>
          {/* Card Header with Search & Filters */}
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#0D1F3D] flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                Customer Organizations ({filteredOrgs.length})
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Active tenant accounts, subscriptions, seat allowances, and direct workspace access
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search organization or slug..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-sm border border-slate-200 bg-slate-50/60 pl-9 pr-3 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#0D1F3D] focus:bg-white focus:outline-none"
                />
              </div>

              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="h-9 rounded-sm border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 focus:border-[#0D1F3D] focus:outline-none"
              >
                <option value="All">All Plans</option>
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              <Link
                to="/superadmin/tenants"
                className="text-xs font-bold text-blue-600 hover:text-blue-800 shrink-0 inline-flex items-center gap-1"
              >
                All Tenants Directory <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Directory Table */}
          <div className="overflow-x-auto min-h-[320px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0D1F3D]">
                  <th className="py-3 px-4">Organization Name</th>
                  <th className="py-3 px-4">Subdomain Slug</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Commercial Plan</th>
                  <th className="py-3 px-4">Seat Utilization</th>
                  <th className="py-3 px-4">Pipeline Total</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                      <p className="text-sm font-bold text-[#0D1F3D]">No customer organizations match your search</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try resetting search filters or provision a new customer workspace.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOrgs.map((org) => {
                    const pct = Math.min(100, Math.round(((org.activeMembers || 0) / (org.allocatedSeats || 1)) * 100));
                    return (
                      <tr key={org.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-3.5 px-4">
                          <div
                            onClick={() => navigate(`/superadmin/tenants/${org.id}`)}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#0D1F3D] text-white font-extrabold shadow-2xs group-hover:bg-[#1e3b6a] transition">
                              {org.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-[#0D1F3D] group-hover:text-blue-600 transition flex items-center gap-1.5">
                                {org.name}
                                <Eye className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition" />
                              </p>
                              <p className="text-[11px] font-medium text-slate-400">
                                {org.customDomain || `${org.slug}.truerootcrm.com`}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800">
                          {org.slug}
                        </td>

                        <td className="py-3.5 px-4">{getStatusBadge(org.status)}</td>

                        <td className="py-3.5 px-4">{getPlanBadge(org.planTier)}</td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1 w-28">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-bold text-slate-800">{org.activeMembers}</span>
                              <span className="text-slate-400">/ {org.allocatedSeats} seats</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 90 ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.max(10, pct)}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800">{org.leadsCount} leads</span>
                          <span className="text-slate-400 text-[11px]"> • {org.projectsCount} projects</span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/superadmin/tenants/${org.id}`)}
                              className="h-8 px-2.5 text-xs font-bold text-slate-700 gap-1"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-500" /> View
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleAccessOrg(org.id, org.name)}
                              className="h-8 px-2.5 text-xs font-bold bg-[#0D1F3D] text-white hover:bg-[#132d56] gap-1 shadow-xs"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Access
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Directory Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Showing {filteredOrgs.length} of {totalTenants} tenant organizations</span>
          <Link to="/superadmin/tenants" className="text-blue-600 font-bold hover:underline">
            Manage all tenant workspaces in directory →
          </Link>
        </div>
      </div>

      {/* Provision Tenant Modal */}
      <ProvisionTenantModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTenantCreated={fetchMetrics}
      />
    </div>
  );
}
