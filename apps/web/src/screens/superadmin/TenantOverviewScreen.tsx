import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  Shield,
  CreditCard,
  UserCheck,
  Globe,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Database,
  Calendar,
  Check,
  Users,
  Layers,
  Copy,
  TrendingUp,
  ArrowLeft,
  RotateCcw,
  PauseCircle,
  MapPin,
  Mail,
  User,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Button, Card, Badge } from "ui";
import { api } from "../../common/api";

interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "TRIAL" | "SETUP_PENDING" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  planTier: "STARTER" | "GROWTH" | "ENTERPRISE" | string;
  setupFeePaid: boolean;
  allocatedSeats: number;
  pricePerSeatMonth?: number;
  customDomain?: string;
  customDomainVerified?: boolean;
  createdAt: string;
  memberships?: Array<{
    id: string;
    role: string;
    isOwner: boolean;
    isActive: boolean;
    createdAt: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      isActive: boolean;
    };
  }>;
  _count?: {
    leads: number;
    projects: number;
    teams: number;
    attendanceRecords: number;
  };
}

export function TenantOverviewScreen() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchTenant = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await api.get(`/organizations/tenant-details/${tenantId}`);
      setTenant(res.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load tenant workspace details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const handleAccessTenant = () => {
    if (!tenant) return;
    localStorage.setItem("active_organization_id", tenant.id);
    toast.success(`Accessed ${tenant.name}'s workspace`);
    window.location.href = "/admin/dashboard";
  };

  const handleToggleStatus = async () => {
    if (!tenant) return;
    const newStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setUpdatingStatus(true);
    try {
      await api.patch(`/organizations/tenant-status/${tenant.id}`, {
        id: tenant.id,
        status: newStatus,
      });
      toast.success(`Tenant status updated to ${newStatus}`);
      await fetchTenant();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update tenant status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-12 text-center font-sans">
        <div className="inline-block animate-spin h-8 w-8 border-3 border-[#0D1F3D] border-t-transparent rounded-full mb-3" />
        <h3 className="text-sm font-bold text-[#0D1F3D]">Loading Workspace Overview...</h3>
        <p className="text-xs text-slate-400 mt-1">Retrieving tenant organization profile, subscription, and capacity</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-[480px] flex flex-col items-center justify-center p-8 text-center font-sans space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#0D1F3D]">Tenant Workspace Not Found</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Could not locate tenant organization with identifier: <span className="font-mono font-bold text-slate-800">{tenantId}</span>
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/superadmin/tenants")}
          className="font-bold bg-[#0D1F3D] text-white hover:bg-[#132d56]"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Tenant Organizations
        </Button>
      </div>
    );
  }

  const activeMembers = (tenant.memberships || []).filter((m) => m.isActive).length;
  const unitPrice =
    tenant.pricePerSeatMonth ||
    (tenant.planTier === "ENTERPRISE" ? 1499 : tenant.planTier === "GROWTH" ? 899 : 499);
  const totalMrr = (tenant.allocatedSeats || 1) * unitPrice;
  const leadsCount = tenant._count?.leads || 0;
  const projectsCount = tenant._count?.projects || 0;

  return (
    <div className="space-y-6 pb-16 font-sans text-slate-800">
      {/* 1. Breadcrumbs & Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Link to="/superadmin/dashboard" className="hover:text-[#0D1F3D] transition">
              Super Admin
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Link to="/superadmin/tenants" className="hover:text-[#0D1F3D] transition">
              Tenant Organizations
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="font-bold text-[#0D1F3D]">{tenant.name}</span>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0D1F3D] text-white font-extrabold text-base shadow-xs">
              {tenant.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight">{tenant.name}</h1>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    tenant.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : tenant.status === "TRIAL"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : tenant.status === "SETUP_PENDING"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {tenant.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-0.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                <span>{tenant.customDomain || `${tenant.slug}.truerootcrm.com`}</span>
                <span className="text-slate-300">•</span>
                <span className="font-mono text-slate-400">Slug: {tenant.slug}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/superadmin/tenants")}
            className="gap-1.5 font-bold text-slate-700 h-9"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Tenants
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleStatus}
            disabled={updatingStatus}
            className={`gap-1.5 font-bold h-9 ${
              tenant.status === "ACTIVE"
                ? "text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50"
                : "text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            {tenant.status === "ACTIVE" ? (
              <>
                <PauseCircle className="h-3.5 w-3.5" /> Suspend
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Activate
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleAccessTenant}
            className="gap-2 font-bold bg-[#0D1F3D] text-white hover:bg-[#132d56] shadow-xs h-9 px-4 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4" /> Access Workspace
          </Button>
        </div>
      </div>

      {/* 2. Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-emerald-50 text-emerald-600 font-bold shrink-0 border border-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">Workspace Status</span>
            <span className="text-base font-extrabold text-emerald-700 block leading-tight">
              {tenant.status}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Live Tenant</span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-indigo-50 text-indigo-600 font-bold shrink-0 border border-indigo-100">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">Commercial Tier</span>
            <span className="text-base font-extrabold text-indigo-700 block leading-tight">
              {tenant.planTier}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">₹{unitPrice}/seat/mo</span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-purple-50 text-purple-600 font-bold shrink-0 border border-purple-100">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">Monthly MRR</span>
            <span className="text-base font-extrabold text-purple-700 block leading-tight">
              ₹{totalMrr.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">₹{(totalMrr * 12).toLocaleString("en-IN")}/yr</span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-50 text-blue-600 font-bold shrink-0 border border-blue-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">Active Users</span>
            <span className="text-base font-extrabold text-[#0D1F3D] block leading-tight">
              {activeMembers}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">of {tenant.allocatedSeats} licensed</span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-amber-50 text-amber-600 font-bold shrink-0 border border-amber-100">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">Leads Pipeline</span>
            <span className="text-base font-extrabold text-[#0D1F3D] block leading-tight">
              {leadsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Customer Inquiries</span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-rose-50 text-rose-600 font-bold shrink-0 border border-rose-100">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">Real Estate Projects</span>
            <span className="text-base font-extrabold text-[#0D1F3D] block leading-tight">
              {projectsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">Active Inventories</span>
          </div>
        </div>
      </div>

      {/* 3. Detailed Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Identity Card */}
        <div className="rounded-sm border border-slate-200 bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0D1F3D]">Workspace & Identity Profile</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Core organizational metadata and routing configuration</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-slate-100 text-slate-600">
              <Building2 className="h-4 w-4" />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Legal Entity Name:</span>
              <p className="font-bold text-slate-800 mt-0.5">{tenant.name}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Tenant Slug:</span>
              <p className="font-mono font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                {tenant.slug}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tenant.slug);
                    toast.success("Copied slug");
                  }}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Subdomain URL:</span>
              <p className="font-mono font-semibold text-blue-600 mt-0.5">
                https://{tenant.slug}.truerootcrm.com
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Custom Domain:</span>
              <p className="font-semibold text-slate-700 mt-0.5">
                {tenant.customDomain ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> {tenant.customDomain}
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Not configured</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Onboarded On:</span>
              <p className="font-bold text-slate-800 mt-0.5">
                {new Date(tenant.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Tenant UUID:</span>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5 truncate" title={tenant.id}>
                {tenant.id}
              </p>
            </div>
          </div>
        </div>

        {/* Commercial Subscription Card */}
        <div className="rounded-sm border border-slate-200 bg-white shadow-xs p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#0D1F3D]">Commercial Plan & Capacity</h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Subscription tier, licensing quotas, and commercial terms</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-indigo-50 text-indigo-700">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Subscribed Tier:</span>
              <p className="font-bold text-[#0D1F3D] mt-0.5 text-sm">{tenant.planTier} Plan</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Licensed Seat Capacity:</span>
              <p className="font-bold text-slate-800 mt-0.5">
                {activeMembers} / {tenant.allocatedSeats} Seats Utilized
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Price Per Seat / Mo:</span>
              <p className="font-extrabold text-emerald-700 mt-0.5 text-sm">₹{unitPrice}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Setup & Onboarding Fee:</span>
              <p className="font-bold text-slate-700 mt-0.5">
                {tenant.setupFeePaid ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Paid & Settled
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">Waived / Pending</span>
                )}
              </p>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-slate-500 font-medium">Estimated Annual Subscription Value:</span>
              <span className="font-extrabold text-base text-[#0D1F3D]">
                ₹{(totalMrr * 12).toLocaleString("en-IN")} / Year
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Team Members & Administrator Table */}
      <div className="rounded-sm border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D1F3D]">Tenant Team Members & Administrators</h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Users provisioned inside this customer organization
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded">
            {(tenant.memberships || []).length} Members
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0D1F3D]">
                <th className="py-3 px-4 w-8">#</th>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Organization Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {(tenant.memberships || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    <User className="mx-auto h-6 w-6 text-slate-400 mb-1" />
                    <p className="text-xs font-semibold">No active team members registered yet.</p>
                  </td>
                </tr>
              ) : (
                (tenant.memberships || []).map((m, idx) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-[#0D1F3D]">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-bold text-xs">
                          {m.user.fullName?.charAt(0) || "U"}
                        </div>
                        <span>{m.user.fullName}</span>
                        {m.isOwner && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded">
                            Owner
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">{m.user.email}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex rounded-sm bg-slate-100 px-2 py-0.5 font-bold text-slate-700 border border-slate-200 text-[11px]">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {m.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {new Date(m.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
