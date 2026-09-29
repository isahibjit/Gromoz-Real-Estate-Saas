import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Building2,
  ChevronRight,
  Shield,
  CreditCard,
  UserCheck,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  Edit2,
  Users,
  Layers,
  FileText,
  Lock,
  Plus,
  MessageSquare,
  Sparkles,
  HardDrive,
  BarChart3,
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  Database,
  Calendar,
  Check,
  Info,
  DollarSign,
  Activity,
  Heart,
  Crown,
  Headphones,
  User,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { tenantService } from "../../features/platform/tenants/services/tenant.service";
import {
  Tenant,
  TenantStatus,
} from "../../features/platform/tenants/types/platform.types";
import {
  PLATFORM_PLANS,
  PLATFORM_INDUSTRIES,
} from "../../features/platform/tenants/fixtures/platform.fixtures";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const userRoleChartData = [
  { name: "Tenant Owner", value: 1, color: "#2563EB" },
  { name: "Tenant Admin", value: 4, color: "#3B82F6" },
  { name: "Sales Manager", value: 8, color: "#F59E0B" },
  { name: "Team Leaders", value: 15, color: "#EC4899" },
  { name: "Field Executives", value: 78, color: "#6366F1" },
  { name: "Others", value: 20, color: "#10B981" },
];

export function TenantDetailsPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showEditNotes, setShowEditNotes] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Edit Tenant Form State
  const [editForm, setEditForm] = useState({
    companyName: "",
    tenantCode: "",
    industryId: "",
    planId: "",
    fullName: "",
    email: "",
    phone: "",
    address: "",
    autoRenewal: true,
  });

  // Internal Notes State
  const [noteContent, setNoteContent] = useState("");

  useEffect(() => {
    if (tenantId) {
      tenantService.getTenantById(tenantId).then((t) => {
        if (t) {
          setTenant(t);
          setNoteContent(
            `Account notes for ${t.companyName} (${t.industryLabel}). Operating on ${t.planName} plan (${t.provisioningType}).`,
          );
          setEditForm({
            companyName: t.companyName,
            tenantCode: t.slug.toUpperCase(),
            industryId: t.industryId || "ind_pharma",
            planId: t.planId || "plan_growth",
            fullName: t.adminUser.fullName,
            email: t.adminUser.email,
            phone: t.adminUser.phone,
            address: `${t.country} · ${t.timezone}`,
            autoRenewal: true,
          });
        }
      });
    }
  }, [tenantId]);

  const handleSaveTenantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    try {
      const matchedPlan = PLATFORM_PLANS.find((p) => p.id === editForm.planId);
      const matchedIndustry = PLATFORM_INDUSTRIES.find(
        (i) => i.id === editForm.industryId,
      );

      const updated = await tenantService.updateTenant(tenant.id, {
        companyName: editForm.companyName,
        planId: editForm.planId,
        planName: matchedPlan ? matchedPlan.name : tenant.planName,
        industryId: editForm.industryId,
        industryLabel: matchedIndustry
          ? matchedIndustry.label
          : tenant.industryLabel,
        adminUser: {
          ...tenant.adminUser,
          fullName: editForm.fullName,
          email: editForm.email,
          phone: editForm.phone,
        },
      });
      setTenant(updated);
      setShowEditModal(false);
      toast.success("Tenant details updated successfully!");
    } catch {
      toast.error("Failed to update tenant");
    }
  };

  if (!tenant) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center font-sans space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#0D1F3D]">
            Tenant Not Found
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            This tenant could not be found or may no longer be available.
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => navigate("/platform/tenants")}
          className="font-bold px-6 shadow-xs"
        >
          Back to All Tenants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* 1. Top Header Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => navigate("/platform/dashboard")}
              className="hover:text-[#0D1F3D]"
            >
              Dashboard
            </button>
            <span>›</span>
            <button
              type="button"
              onClick={() => navigate("/platform/tenants")}
              className="hover:text-[#0D1F3D]"
            >
              Tenants
            </button>
            <span>›</span>
            <button
              type="button"
              onClick={() => navigate("/platform/tenants")}
              className="hover:text-[#0D1F3D]"
            >
              All Tenants
            </button>
            <span>›</span>
            <span className="font-extrabold text-[#0D1F3D]">
              {tenant.companyName}
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-1.5">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight">
              Tenant Overview
            </h1>
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-purple-100 text-purple-700">
              <Building2 className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Complete overview and management of tenant workspace, subscription,
            users, modules and activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/platform/tenants")}
            className="gap-1.5 font-bold text-slate-700 h-9"
          >
            ← Back to Tenants
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="gap-1.5 font-bold text-slate-700 h-9"
            >
              More Actions <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {showMoreActions && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-sm border border-slate-200 bg-white p-1.5 shadow-xl text-xs font-semibold space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate(
                      `/platform/tenants/create?edit=true&tenantId=${tenant.id}`,
                    );
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xs text-indigo-600 font-bold"
                >
                  Edit Tenant Details
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate(`/platform/tenants/${tenant.id}/users`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xs"
                >
                  Manage Users
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate(`/platform/tenants/${tenant.id}/modules`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xs"
                >
                  Manage Modules
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate("/platform/audit");
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xs"
                >
                  Audit Logs
                </button>
              </div>
            )}
          </div>

          <Button
            variant="accent"
            size="sm"
            onClick={() =>
              navigate(
                `/platform/tenants/create?edit=true&tenantId=${tenant.id}`,
              )
            }
            className="gap-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs h-9 px-4 cursor-pointer"
          >
            <Edit2 className="h-4 w-4" /> Edit Tenant
          </Button>
        </div>
      </div>

      {/* 2. Top 6 KPI Summary Cards (Icon ON THE LEFT matching image mockup) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-emerald-50 text-emerald-600 font-bold shrink-0 border border-emerald-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              Tenant Status
            </span>
            <span className="text-base font-extrabold text-emerald-600 block leading-tight">
              {tenant.tenantStatus}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Since {tenant.createdAt.split(" ·")[0]}
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-purple-50 text-purple-600 font-bold shrink-0 border border-purple-100">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              Subscription Status
            </span>
            <span className="text-base font-extrabold text-indigo-600 block leading-tight">
              {tenant.subscriptionStatus}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              {tenant.planName}
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-amber-50 text-amber-600 font-bold shrink-0 border border-amber-100">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              Plan & Billing
            </span>
            <span
              className="text-base font-extrabold text-[#0D1F3D] block leading-tight truncate max-w-[110px]"
              title={tenant.planName}
            >
              {tenant.planName}
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-bold block mt-0.5">
              ₹{(tenant.mrr * 12).toLocaleString("en-IN")} / Year
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-50 text-blue-600 font-bold shrink-0 border border-blue-100">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              Active Users
            </span>
            <span className="text-base font-extrabold text-[#0D1F3D] block leading-tight">
              {tenant.userLicensesCount} Licenses
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Provisioned
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-emerald-50 text-emerald-600 font-bold shrink-0 border border-emerald-100">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              Storage Used
            </span>
            <span className="text-base font-extrabold text-[#0D1F3D] block leading-tight">
              {tenant.usage?.storageUsedGb ?? 45} GB /{" "}
              {tenant.storageLimit ?? "200 GB"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Storage quota limit
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-blue-50 text-blue-600 font-bold shrink-0 border border-blue-100">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block">
              MRR (Monthly)
            </span>
            <span className="text-base font-extrabold text-blue-600 block leading-tight">
              ₹{tenant.mrr.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
              Provisioning: {tenant.provisioningType}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Row (3 Equal Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Tenant Information */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-[#0D1F3D] border-b border-slate-100 pb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600 shrink-0" /> Tenant
              Information
            </h3>

            <div className="flex items-start gap-4 pt-1">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 p-2 text-center shadow-xs">
                {tenant.logoUrl ? (
                  <img
                    src={tenant.logoUrl}
                    alt={tenant.companyName}
                    className="h-16 w-16 object-contain rounded-sm"
                  />
                ) : (
                  <span className="text-2xl font-extrabold text-[#0D1F3D]">
                    {tenant.companyName[0]}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Tenant Name
                    </span>
                    <span className="font-extrabold text-[#0D1F3D]">
                      {tenant.companyName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Domain
                    </span>
                    <a
                      href={`https://${tenant.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-indigo-600 hover:underline truncate block"
                    >
                      {tenant.domain}
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Tenant Code / Slug
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {tenant.slug.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Primary Contact
                    </span>
                    <span className="font-extrabold text-[#0D1F3D] block">
                      {tenant.adminUser.fullName} (
                      {tenant.adminUser.designation})
                    </span>
                    <span className="font-mono text-slate-600 block text-[11px]">
                      {tenant.adminUser.phone}
                    </span>
                    <span className="text-slate-500 block text-[11px] truncate">
                      {tenant.adminUser.email}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Industry
                    </span>
                    <span className="font-bold text-indigo-700 inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-indigo-500" />{" "}
                      {tenant.industryLabel}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 font-semibold block">
                      Company Size
                    </span>
                    <span className="font-semibold text-slate-700">
                      {tenant.companySize}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Region & Timezone
                </span>
                <span className="text-slate-600 font-medium block text-[11px] leading-relaxed">
                  {tenant.country} · {tenant.timezone} ({tenant.currency})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">
                    Created On
                  </span>
                  <span className="text-slate-700 font-bold text-[11px]">
                    {tenant.createdAt}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">
                    Legal Entity Name
                  </span>
                  <span className="text-slate-700 font-bold text-[11px]">
                    {tenant.legalEntityName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Viewing full tenant details")}
            className="w-full text-xs font-bold text-indigo-600 border-indigo-200 bg-indigo-50/40 hover:bg-indigo-100/40 h-8"
          >
            View Full Details
          </Button>
        </div>

        {/* Card 2: Subscription & Plan */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#0D1F3D] flex items-center gap-2">
                <Crown className="h-4 w-4 text-indigo-600 shrink-0" />{" "}
                Subscription & Plan
              </h3>
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                {tenant.preferences?.autoRenewal !== false ? 'Auto Renewal: Enabled' : 'Auto Renewal: Disabled'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Plan
                </span>
                <span className="font-extrabold text-[#0D1F3D] text-sm">
                  {tenant.planName}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Billing Cycle
                </span>
                <span className="font-extrabold text-[#0D1F3D] text-sm">
                  {tenant.billingCycle || 'Yearly'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Users / Seats
                </span>
                <span className="font-extrabold text-[#0D1F3D] text-sm">
                  {tenant.userLicensesCount}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Subscription Start
                </span>
                <span className="font-bold text-[#0D1F3D] text-xs">
                  {tenant.billingDetails?.lastInvoiceDate || tenant.createdAt.split(' ·')[0] || '—'}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
              <span className="text-[11px] text-slate-500 font-semibold block">
                Current Period
              </span>
              <span className="font-extrabold text-[#0D1F3D] text-xs block">
                {tenant.billingDetails?.nextBillingDate
                  ? `${tenant.billingDetails.lastInvoiceDate || tenant.createdAt.split(' ·')[0]} – ${tenant.billingDetails.nextBillingDate}`
                  : (tenant.subscriptionStatus === 'Trialing' ? 'Active 14-Day Free Trial' : 'Current Active Cycle')}
              </span>

              {/* Progress Bar UI/UX for Subscription Period */}
              <div className="space-y-1 pt-1">
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{ width: tenant.subscriptionStatus === 'Trialing' ? '50%' : '15%' }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>{tenant.subscriptionStatus === 'Trialing' ? 'Trial Active' : 'Subscription Active'}</span>
                  <span>{tenant.subscriptionStatus === 'Trialing' ? '7 days remaining' : '300+ days remaining'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">
                  Payment Method
                </span>
                <span className="inline-flex rounded-sm bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                  {tenant.billingDetails?.paymentMethod || (tenant.subscriptionStatus === 'Trialing' ? 'Free Trial' : tenant.provisioningType)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">
                  Last Invoice
                </span>
                <span className="font-mono font-bold text-slate-800">
                  {tenant.billingDetails?.lastInvoiceId || (tenant.subscriptionStatus === 'Trialing' ? '—' : `INV-${tenant.slug.toUpperCase()}-001`)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Amount</span>
                <span className="font-mono font-extrabold text-[#0D1F3D]">
                  {tenant.mrr ? `₹${(tenant.mrr * (tenant.billingCycle === 'Monthly' ? 1 : 12)).toLocaleString('en-IN')}` : '₹0'}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/platform/invoices")}
            className="w-full text-xs font-bold text-indigo-600 border-indigo-200 bg-indigo-50/40 hover:bg-indigo-100/40 h-8"
          >
            View Billing & Invoices
          </Button>
        </div>

        {/* Card 3: Tenant Status & Activity */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#0D1F3D] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />{" "}
                Tenant Status & Activity
              </h3>
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Healthy ∨
              </span>
            </div>

            <div className="space-y-2 text-xs font-semibold">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{" "}
                  Account Health
                </span>
                <span className="font-extrabold text-emerald-700">Healthy</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" /> Last Activity
                </span>
                <span className="font-extrabold text-slate-800">
                  2 minutes ago
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-slate-400" /> Login Users
                  (Today)
                </span>
                <span className="font-extrabold text-slate-800">18</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" /> Data Isolation
                </span>
                <span className="font-extrabold text-slate-800">Enabled</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5 text-slate-400" /> Backup
                  Status
                </span>
                <span className="font-bold text-slate-700 text-[11px]">
                  Daily (Last: Today, 2:00 AM)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Headphones className="h-3.5 w-3.5 text-slate-400" /> Support
                  Tier
                </span>
                <span className="font-extrabold text-slate-800">Standard</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" /> Grace
                  Period
                </span>
                <span className="font-bold text-slate-500 text-[11px]">
                  Not Applicable
                </span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-100 pt-2">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-400" /> Risk Level
                </span>
                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  ⚖ Low
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/platform/audit")}
            className="w-full text-xs font-bold text-indigo-600 border-indigo-200 bg-indigo-50/40 hover:bg-indigo-100/40 h-8"
          >
            View Activity Logs
          </Button>
        </div>
      </div>

      {/* 4. Bottom Row (3 Equal Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Module & Feature Usage */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#0D1F3D] flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600 shrink-0" /> Module &
                Feature Usage
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/platform/tenants/${tenant.id}/modules`)
                }
                className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 border-slate-200 hover:bg-slate-50"
              >
                Manage Modules
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-extrabold text-[#0D1F3D] block mb-1 text-[11px]">
                  Core Modules{" "}
                  <span className="text-slate-400 font-semibold">
                    (6 / 6 Enabled)
                  </span>
                </span>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-slate-700">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    CRM & Leads
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Field Workforce
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Attendance & Time
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Forms & Surveys
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Tasks & Activities
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Reports & Analytics
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <span className="font-extrabold text-[#0D1F3D] block mb-1 text-[11px]">
                  Advanced Modules{" "}
                  <span className="text-slate-400 font-semibold">
                    (8 / 10 Enabled)
                  </span>
                </span>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-slate-700">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    GPS & Location
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Media & Attachments
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Chat & Messaging
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Notifications
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Knowledge Base
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Advanced Reports
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    API Access
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Custom Integrations
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2">
                <span className="font-extrabold text-[#0D1F3D] block mb-1 text-[11px]">
                  Integrations{" "}
                  <span className="text-slate-400 font-semibold">
                    (3 / 4 Connected)
                  </span>
                </span>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-slate-700">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Email Service
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    SMS Gateway
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Payment Gateway
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />{" "}
                    Accounting System
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-semibold">
            <div>
              <span className="text-slate-500">Total Enabled:</span>{" "}
              <strong className="text-[#0D1F3D] font-extrabold text-sm ml-1">
                17 / 20
              </strong>
            </div>
            <div className="flex items-center gap-2 w-44">
              <span className="text-[10px] text-slate-400">Utilization</span>
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{ width: "85%" }}
                />
              </div>
              <span className="text-[11px] font-bold text-indigo-700">85%</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Users & Roles */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#0D1F3D] flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600 shrink-0" /> Active
                Users & Roles
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/platform/tenants/${tenant.id}/users`)}
                className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 border-slate-200 hover:bg-slate-50"
              >
                View All Users
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={userRoleChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={48}
                      paddingAngle={2}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {userRoleChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-base font-extrabold text-[#0D1F3D] leading-none">
                    126
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                    Total Users
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-1 text-[11px] font-semibold">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-blue-600" /> Tenant
                    Owner
                  </span>
                  <span className="font-extrabold text-[#0D1F3D]">
                    1 (0.8%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Tenant
                    Admin
                  </span>
                  <span className="font-extrabold text-[#0D1F3D]">
                    4 (3.2%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Sales
                    Manager
                  </span>
                  <span className="font-extrabold text-[#0D1F3D]">
                    8 (6.3%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-pink-500" /> Team
                    Leaders
                  </span>
                  <span className="font-extrabold text-[#0D1F3D]">
                    15 (11.9%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-indigo-600" />{" "}
                    Field Executives
                  </span>
                  <span className="font-extrabold text-[#0D1F3D]">
                    78 (61.9%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                    Others
                  </span>
                  <span className="font-extrabold text-[#0D1F3D]">
                    20 (15.9%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">User Utilization</span>
            <div className="flex items-center gap-2 w-48">
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-1.5 rounded-full"
                  style={{ width: "84%" }}
                />
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                126 / 150 (84%)
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Recent Activity */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#0D1F3D] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-600 shrink-0" /> Recent
                Activity
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/platform/audit")}
                className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 border-slate-200 hover:bg-slate-50"
              >
                View All Activity
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div className="flex-1 flex justify-between items-start">
                  <p className="font-semibold text-slate-800">
                    <strong className="font-extrabold text-[#0D1F3D]">
                      Rahul Sharma (Admin)
                    </strong>{" "}
                    updated subscription plan
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                    2 minutes ago
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1 flex justify-between items-start">
                  <p className="font-semibold text-slate-800">
                    New user{" "}
                    <strong className="font-extrabold text-[#0D1F3D]">
                      Priya Mehta
                    </strong>{" "}
                    added to tenant
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                    15 minutes ago
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div className="flex-1 flex justify-between items-start">
                  <p className="font-semibold text-slate-800">
                    Modules updated:{" "}
                    <strong className="font-extrabold text-[#0D1F3D]">
                      Advanced Reports enabled
                    </strong>
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                    1 hour ago
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1 flex justify-between items-start">
                  <p className="font-semibold text-slate-800">
                    Invoice{" "}
                    <strong className="font-mono font-bold text-slate-800">
                      INV-2026-00048
                    </strong>{" "}
                    generated
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                    3 hours ago
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                <div className="flex-1 flex justify-between items-start">
                  <p className="font-semibold text-slate-800">
                    Backup completed successfully
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                    Today, 2:00 AM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Footer Card: Internal Notes */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold text-[#0D1F3D] flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600 shrink-0" /> Internal
            Notes
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEditNotes(!showEditNotes)}
            className="h-7 text-xs font-bold text-indigo-600 border-slate-200 hover:bg-slate-50"
          >
            {showEditNotes ? "Done" : "Edit Notes"}
          </Button>
        </div>

        {showEditNotes ? (
          <div className="space-y-2">
            <textarea
              rows={3}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full p-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
            />
            <Button
              variant="accent"
              size="sm"
              onClick={() => {
                setShowEditNotes(false);
                toast.success("Internal notes updated");
              }}
            >
              Save Note
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50/60 p-3 rounded-sm border border-slate-100">
            {noteContent}
          </p>
        )}

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium border-t border-slate-100 pt-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
              AS
            </div>
            <span>
              Created By:{" "}
              <strong className="text-slate-700 font-bold">Amit Sharma</strong>{" "}
              (24 May 2026, 10:30 AM)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[10px]">
              PM
            </div>
            <span>
              Last Updated By:{" "}
              <strong className="text-slate-700 font-bold">Priya Mehta</strong>{" "}
              (24 May 2026, 11:15 AM)
            </span>
          </div>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-indigo-100 text-indigo-700 font-bold">
                  <Edit2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#0D1F3D]">
                    Edit Tenant Details
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Update organization settings, subscription plan, and primary
                    administrator contact.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 rounded-sm hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTenantEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.companyName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, companyName: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tenant Code
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={editForm.tenantCode}
                    className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-100 border border-slate-200 rounded-sm text-slate-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Industry Sector
                  </label>
                  <select
                    value={editForm.industryId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, industryId: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                  >
                    {PLATFORM_INDUSTRIES.map((ind) => (
                      <option key={ind.id} value={ind.id}>
                        {ind.label} ({ind.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Subscription Plan
                  </label>
                  <select
                    value={editForm.planId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, planId: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                  >
                    {PLATFORM_PLANS.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.tier}) — ₹{plan.annualPricePerUser}
                        /user/yr
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Primary Administrator Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fullName: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Administrator Email
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Administrator Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="w-full h-9 px-3 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="autoRenewalCheck"
                    checked={editForm.autoRenewal}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        autoRenewal: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="autoRenewalCheck"
                    className="text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Enable Automatic Subscription Renewal
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Registered Address
                </label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  className="w-full p-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="accent"
                  size="sm"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
