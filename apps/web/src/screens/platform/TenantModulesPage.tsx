import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  ChevronDown,
  Search,
  CheckCircle2,
  Users,
  Puzzle,
  ShieldCheck,
  Lock,
  MapPin,
  Clock,
  FileText,
  BarChart3,
  CreditCard,
  MessageSquare,
  Zap,
  Layers,
  Building2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "../../components/ui/Button";
import { tenantService } from "../../features/platform/tenants/services/tenant.service";
import { moduleService } from "../../features/platform/catalog/modules/services/module.service";
import { Tenant } from "../../features/platform/tenants/types/platform.types";
import { PlatformModule } from "../../features/platform/catalog/modules/types/module.types";

export interface TenantModuleItem {
  id: string;
  name: string;
  code: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  isEffectiveRuntimeModule: null; // Explicitly null: effective runtime modules require GET /platform/tenants/:id/effective-modules
  isInSubscribedPlan: boolean; // True/false based strictly on subscribed Plan version module codes
  isIndustryRecommended: boolean; // True/false advisory indicator
  provenance: "SUBSCRIBED_PLAN_CODE" | "INDUSTRY_ADVISORY" | "UNAVAILABLE";
  category: "core" | "advanced" | "integrations";
}

const MODULE_ICONS: Record<string, { icon: React.ElementType; iconBg: string; iconColor: string }> = {
  core_crm: { icon: Users, iconBg: "bg-indigo-100", iconColor: "text-indigo-600" },
  field_visits: { icon: MapPin, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  demo_scheduler: { icon: BarChart3, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
  order_management: { icon: FileText, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
  attendance: { icon: Clock, iconBg: "bg-teal-100", iconColor: "text-teal-600" },
  payroll: { icon: CreditCard, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  whatsapp_automation: { icon: MessageSquare, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
  ai_copilot: { icon: Zap, iconBg: "bg-pink-100", iconColor: "text-pink-600" },
};

export function TenantModulesPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as "core" | "advanced" | "integrations") || "core";
  const [searchQuery, setSearchQuery] = useState("");
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [modules, setModules] = useState<TenantModuleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);

    Promise.all([
      tenantService.getTenantById(tenantId),
      tenantService.getTenantSubscription(tenantId),
      tenantService.getTenantIndustryTemplate(tenantId),
      moduleService.getModules(),
    ])
      .then(([t, sub, ind, catalogModules]) => {
        setTenant(t);
        setSubscription(sub);

        // Authoritative Platform cross-Tenant inspection:
        // Do NOT use runtimeService.getCurrentBootstrap(). TenantModulesPage is a Platform operator
        // inspection screen mounted under PlatformShell, never the active Tenant application context.
        // Raw plan module codes are strictly Plan membership; Industry recommendations are advisory only.
        const subCodes = new Set<string>(sub?.moduleCodes || []);
        const recommendedCodes = new Set<string>(
          ind?.recommendedModuleCodes || ind?.version?.recommendedModuleCodes || [],
        );

        const mapped: TenantModuleItem[] = (catalogModules || []).map((pm: PlatformModule) => {
          const iconMeta = MODULE_ICONS[pm.code] || {
            icon: Layers,
            iconBg: "bg-slate-100",
            iconColor: "text-slate-600",
          };
          const category: "core" | "advanced" | "integrations" =
            pm.category === "CORE"
              ? "core"
              : pm.category === "AUTOMATION"
              ? "integrations"
              : "advanced";

          const isInSubscribedPlan = subCodes.has(pm.code);
          const isIndustryRecommended = recommendedCodes.has(pm.code);

          let provenance: "SUBSCRIBED_PLAN_CODE" | "INDUSTRY_ADVISORY" | "UNAVAILABLE" = "UNAVAILABLE";
          if (isInSubscribedPlan) {
            provenance = "SUBSCRIBED_PLAN_CODE";
          } else if (isIndustryRecommended) {
            provenance = "INDUSTRY_ADVISORY";
          }

          return {
            id: pm.id,
            name: pm.name,
            code: pm.code,
            description: pm.description || "Platform capability",
            icon: iconMeta.icon,
            iconBg: iconMeta.iconBg,
            iconColor: iconMeta.iconColor,
            isEffectiveRuntimeModule: null, // Strictly null: effective runtime module requires backend endpoint
            isInSubscribedPlan,
            isIndustryRecommended,
            provenance,
            category,
          };
        });

        setModules(mapped);
      })
      .catch((_err) => {
        toast.error("Failed to load tenant modules");
      })
      .finally(() => setLoading(false));
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="inline-block animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-3" />
        <p className="text-xs font-semibold text-slate-600">Loading tenant module details...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center font-sans space-y-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#0D1F3D]">Tenant Not Found</h2>
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

  const filteredModules = modules.filter(
    (m) =>
      m.category === activeTab &&
      (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.code.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const totalSubscribedInPlan = modules.filter((m) => m.isInSubscribedPlan).length;
  const totalRecommended = modules.filter((m) => m.isIndustryRecommended).length;

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16" data-testid="tenant-modules-page">
      {/* 1. Header Breadcrumb & Title */}
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
              onClick={() => navigate(`/platform/tenants/${tenantId}`)}
              className="hover:text-[#0D1F3D]"
            >
              {tenant?.companyName}
            </button>
            <span>›</span>
            <span className="font-extrabold text-[#0D1F3D]">Modules & Plan Membership</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight">
              Tenant Modules & Plan Membership
            </h1>
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-purple-100 text-purple-700">
              <Puzzle className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Subscribed Plan modules and Industry recommendations for {tenant?.companyName}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/platform/tenants/${tenantId}`)}
            className="gap-1.5 font-bold text-slate-700"
          >
            ← Back to Tenant
          </Button>

          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="gap-1.5 font-bold text-slate-700"
            >
              More Actions <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            {showMoreActions && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-sm border border-slate-200 bg-white p-1.5 shadow-xl text-xs font-semibold space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate(`/platform/tenants/${tenantId}/users`);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 rounded-xs"
                >
                  Manage Users
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
            onClick={() => navigate(`/platform/tenants/${tenantId}`)}
            className="gap-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            <ShieldCheck className="h-4 w-4" /> Manage Subscription
          </Button>
        </div>
      </div>

      {/* 2. Explicit Notice: Cross-Tenant Effective Modules Read Blocked By API Exposure */}
      <div
        className="rounded-sm border border-amber-200 bg-amber-50/70 p-4 space-y-2"
        data-testid="cross-tenant-notice"
      >
        <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
          <Lock className="h-4 w-4 text-amber-600 shrink-0" />
          <span>PLATFORM_TENANT_EFFECTIVE_MODULES_READ_BLOCKED_BY_API_EXPOSURE</span>
        </div>
        <p className="text-xs text-amber-900 font-medium leading-relaxed">
          Effective runtime modules are server-composed during tenant session bootstrap (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">GET /tenant/runtime/bootstrap</code>).
          A platform HTTP endpoint for inspecting cross-tenant effective modules (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded">GET /platform/tenants/:id/effective-modules</code>) is currently an API gap.
          Client-side effective module calculation is disabled. Subscription plan module codes are presented separately below as Plan Membership only.
        </p>
      </div>

      {/* 3. Top Tenant Commercial Authority Banner */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-amber-200 bg-amber-50 text-amber-700 font-extrabold text-lg">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.companyName} className="h-10 w-10 object-contain rounded-sm" />
            ) : (
              <Building2 className="h-7 w-7 text-amber-600" />
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#0D1F3D]">{tenant.companyName}</h2>
              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                {tenant.tenantStatus}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Industry: <strong className="text-slate-800">{tenant.industryLabel}</strong> ({tenant.industryCode})
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Plan Version: <strong className="text-slate-800">{tenant.planName}</strong> •
              Licenses: <strong className="text-slate-800">{tenant.userLicensesCount} Seats</strong>
            </p>
          </div>
        </div>

        {/* Commercial Access: Real Authoritative State (Never defaulted to FULL) */}
        <div className="lg:col-span-4 border-l border-slate-100 pl-6 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Effective Runtime Access</span>
            <span
              className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200"
              data-testid="effective-runtime-access-state"
            >
              Not Available / API Exposure Required
            </span>
          </div>
          <p className="text-xs font-extrabold text-[#0D1F3D]" data-testid="subscription-status">
            Subscription Status: {subscription?.status || tenant.subscriptionStatus}
          </p>
        </div>

        <div className="lg:col-span-3 border-l border-slate-100 pl-6 space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Entitlement Engine</span>
          <span className="inline-flex rounded-sm bg-purple-50 px-2.5 py-1 text-[11px] font-bold text-purple-700 border border-purple-200">
            Server Runtime Engine
          </span>
        </div>
      </div>

      {/* 4. Main Two Column Section: Modules Table & Right Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-4">
          {/* Sub Navigation Tabs */}
          <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("core")}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xs transition-colors ${
                    activeTab === "core"
                      ? "bg-[#0D1F3D] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Core Modules ({modules.filter((m) => m.category === "core").length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("advanced")}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xs transition-colors ${
                    activeTab === "advanced"
                      ? "bg-[#0D1F3D] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Advanced Capabilities ({modules.filter((m) => m.category === "advanced").length})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("integrations")}
                  className={`px-3 py-1.5 text-xs font-extrabold rounded-xs transition-colors ${
                    activeTab === "integrations"
                      ? "bg-[#0D1F3D] text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Integrations & Automation ({modules.filter((m) => m.category === "integrations").length})
                </button>
              </div>

              <div className="relative w-52">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-9 pr-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            {/* Modules Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#F8FAFC] text-slate-700 font-extrabold">
                    <th className="py-3 px-4">Module Details</th>
                    <th className="py-3 px-4">Module Code</th>
                    <th className="py-3 px-4">Plan Membership</th>
                    <th className="py-3 px-4">Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredModules.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                        No modules found in this category matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredModules.map((m) => {
                      const Icon = m.icon;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors" data-testid={`module-row-${m.code}`}>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-sm ${m.iconBg} ${m.iconColor} font-bold shrink-0`}
                              >
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-extrabold text-[#0D1F3D] block">{m.name}</span>
                                <span className="text-[11px] text-slate-500 font-medium max-w-sm truncate block">
                                  {m.description}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 font-bold">
                            {m.code}
                          </td>
                          <td className="py-3.5 px-4">
                            {m.isInSubscribedPlan ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold text-emerald-700 border border-emerald-200"
                                data-testid={`plan-membership-status-${m.code}`}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                Subscribed in Plan
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200"
                                data-testid={`plan-membership-status-${m.code}`}
                              >
                                <Lock className="h-3.5 w-3.5 text-slate-400" />
                                Not in Subscribed Plan
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {m.provenance === "SUBSCRIBED_PLAN_CODE" && (
                              <span
                                className="inline-flex rounded-xs bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200"
                                data-testid={`provenance-${m.code}`}
                              >
                                Plan Membership: {tenant.planName}
                              </span>
                            )}
                            {m.provenance === "INDUSTRY_ADVISORY" && (
                              <span
                                className="inline-flex rounded-xs bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200"
                                title="Recommended by Industry Template but not included in current subscription"
                                data-testid={`provenance-${m.code}`}
                              >
                                Industry Advisory
                              </span>
                            )}
                            {m.provenance === "UNAVAILABLE" && (
                              <span className="text-[10px] text-slate-400 font-medium" data-testid={`provenance-${m.code}`}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Summary Cards */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-[#0D1F3D] border-b border-slate-100 pb-3">
              Module Summary
            </h3>

            <div className="space-y-3">
              <div className="p-3.5 rounded-sm border border-indigo-100 bg-indigo-50/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Subscribed Plan Modules
                  </span>
                  <span className="text-lg font-extrabold text-[#0D1F3D]" data-testid="total-subscribed-count">
                    {totalSubscribedInPlan} / {modules.length} Modules
                  </span>
                  <span className="text-[10px] text-indigo-700 block font-bold mt-0.5">
                    Plan Inclusion Only ({tenant.planName})
                  </span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white font-bold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-sm border border-amber-100 bg-amber-50/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Industry Recommendations
                  </span>
                  <span className="text-lg font-extrabold text-[#0D1F3D]" data-testid="total-recommended-count">
                    {totalRecommended} Modules
                  </span>
                  <span className="text-[10px] text-amber-700 block font-bold mt-0.5">
                    Advisory Snapshot ({tenant.industryLabel})
                  </span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white font-bold">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-sm border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Effective Runtime Modules
                  </span>
                  <span className="text-sm font-extrabold text-slate-700" data-testid="effective-runtime-modules-state">
                    Not Available
                  </span>
                  <span className="text-[10px] text-slate-500 block font-medium mt-0.5">
                    API Exposure Required
                  </span>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold">
                  <Lock className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
