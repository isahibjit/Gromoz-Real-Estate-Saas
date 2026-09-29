import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock,
  Users,
  Layers,
  ChevronRight,
  Edit,
  Copy,
  History,
  FileText,
  IndianRupee,
  Check,
  Download,
  CheckCircle,
  HardDrive,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Plan } from '../../types/plan.types';
import { PlatformModule } from '../../../modules/types/module.types';
import { Tenant } from '../../../../tenants/types/platform.types';
import { PlanDetailMetrics } from '../../hooks/usePlanDetails';
import { KpiCard } from '../../../../../../components/dashboard/KpiCard';
import {
  formatCurrency,
  formatPlanMonthlyPrice,
  formatPlanAnnualPrice,
  formatLimit,
  formatDays,
} from '../../utils/plan-pricing.utils';

export interface PlanOverviewTabProps {
  plan: Plan;
  includedModules: PlatformModule[];
  planTenants: Tenant[];
  metrics: PlanDetailMetrics;
}

const DONUT_COLORS: Record<string, string> = {
  Active: '#3B82F6',
  Trial: '#F59E0B',
  Suspended: '#8B5CF6',
  'Past Due': '#F97316',
};

export function PlanOverviewTab({
  plan,
  includedModules,
  planTenants,
  metrics,
}: PlanOverviewTabProps) {
  const navigate = useNavigate();

  // Donut chart data derived from actual metrics
  const donutData = React.useMemo(() => {
    return [
      { name: 'Active', value: metrics.activeTenants, color: DONUT_COLORS.Active },
      { name: 'Trial', value: metrics.trialTenants, color: DONUT_COLORS.Trial },
      { name: 'Suspended', value: metrics.suspendedTenants, color: DONUT_COLORS.Suspended },
      { name: 'Past Due', value: metrics.pastDueTenants, color: DONUT_COLORS['Past Due'] },
    ];
  }, [metrics]);

  // Recent 3 tenants derived ONLY from planTenants (no fake company names)
  const recentTenants = React.useMemo(() => {
    if (!planTenants || planTenants.length === 0) return [];
    return [...planTenants]
      .sort(
        (a, b) =>
          new Date(b.subscriptionStartDate || b.createdAt || 0).getTime() -
          new Date(a.subscriptionStartDate || a.createdAt || 0).getTime()
      )
      .slice(0, 3);
  }, [planTenants]);

  const billingModesText = React.useMemo(() => {
    const { allowMonthlyBilling, allowAnnualBilling } = plan.pricing;
    if (allowMonthlyBilling && allowAnnualBilling) return 'Monthly & Annual';
    if (allowAnnualBilling) return 'Annual Only';
    if (allowMonthlyBilling) return 'Monthly Only';
    return 'Custom Contract';
  }, [plan.pricing]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Active Tenants"
          value={metrics.activeTenants.toString()}
          subValue="Current active paying tenants"
          icon={Users}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <KpiCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(metrics.totalMrr, plan.pricing.currency)}
          subValue="Total current MRR"
          icon={IndianRupee}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <KpiCard
          title="Total Subscriptions"
          value={metrics.totalTenants.toString()}
          subValue="All active subscriptions"
          icon={Building2}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <KpiCard
          title="Trial Tenants"
          value={metrics.trialTenants.toString()}
          subValue="In active trial period"
          icon={Clock}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
        />
      </div>

      {/* Main Grid: Left Main (2 Cols) + Right Rail (1 Col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column Container */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Grid: Plan Information + Commercial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Card 1: Plan Information */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-blue-50 text-blue-600">
                  <FileText className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-extrabold text-[#0D1F3D]">Plan Information</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Plan Name</span>
                  <span className="font-extrabold text-[#0D1F3D]">{plan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Plan Code</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-sm">
                    {plan.code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Plan Tier</span>
                  <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                    {plan.tier || 'Standard'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Visibility</span>
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {plan.visibility}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Recommended For</span>
                  <span className="font-medium text-slate-700">{plan.recommendedFor || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Display Order</span>
                  <span className="font-medium text-slate-700">{plan.displayOrder}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Status</span>
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {plan.status}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">Version</span>
                  <span className="font-mono font-bold text-slate-800">v{plan.version || 1}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Created On</span>
                  <span className="font-medium text-slate-600">
                    {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Last Updated</span>
                  <span className="font-medium text-slate-600">
                    {plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Allow New Tenants</span>
                  <span className={`flex items-center gap-1 font-bold ${plan.commercialRules.availableForNewTenants ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {plan.commercialRules.availableForNewTenants ? <CheckCircle className="h-4 w-4 fill-emerald-100 stroke-emerald-600" /> : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Allow Existing Tenants</span>
                  <span className={`flex items-center gap-1 font-bold ${plan.commercialRules.availableForExistingTenants ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {plan.commercialRules.availableForExistingTenants ? <CheckCircle className="h-4 w-4 fill-emerald-100 stroke-emerald-600" /> : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Commercial Summary */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-blue-50 text-blue-600">
                    <IndianRupee className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-[#0D1F3D]">Commercial Summary</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Pricing Model</span>
                    <span className="font-extrabold text-[#0D1F3D]">{plan.pricing.model}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Default Billing</span>
                    <span className="font-bold text-indigo-700">{billingModesText}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Monthly Price</span>
                    <span className="font-extrabold text-[#0D1F3D]">{formatPlanMonthlyPrice(plan.pricing)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Annual Price</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-emerald-700">{formatPlanAnnualPrice(plan.pricing)}</span>
                      {plan.pricing.annualDiscountPercent && plan.pricing.annualDiscountPercent > 0 ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 border border-emerald-200">
                          Save {plan.pricing.annualDiscountPercent}%
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Minimum Seats</span>
                    <span className="font-mono font-bold text-slate-800">{plan.limits.minimumSeats} seats</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Trial Duration</span>
                    <span className="font-medium text-slate-700">
                      {plan.commercialRules.trialEnabled ? `${plan.commercialRules.trialDurationDays || 14} Days` : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Auto Renewal</span>
                    <span className={`flex items-center gap-1 font-bold ${plan.commercialRules.autoRenew ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {plan.commercialRules.autoRenew ? (
                        <>
                          <CheckCircle className="h-4 w-4 fill-emerald-100 stroke-emerald-600" /> Enabled
                        </>
                      ) : (
                        'Disabled'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Change Effective</span>
                    <span className="font-medium text-slate-700">{plan.commercialRules.changeEffectiveTiming || 'Immediately'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate(`/platform/plans/${plan.id}/pricing`)}
                  className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline py-1.5 flex items-center justify-center gap-1 cursor-pointer"
                >
                  View Pricing Details →
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Grid: Included Modules + Key Limits Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Card 3: Included Modules */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#0D1F3D]">
                    Included Modules ({includedModules.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => navigate(`/platform/plans/${plan.id}/modules`)}
                    className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                  >
                    View All Modules →
                  </button>
                </div>

                {includedModules.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {includedModules.slice(0, 6).map((mod) => (
                      <div
                        key={mod.id}
                        className="p-2.5 rounded-sm border border-slate-200 bg-slate-50/60 flex items-center gap-2.5"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-emerald-50 text-emerald-600">
                          <Layers className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#0D1F3D] truncate">{mod.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{mod.category || 'Standard'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center">
                    No modules included in this plan.
                  </p>
                )}
              </div>

              <div className="p-2.5 rounded-sm bg-emerald-50/60 border border-emerald-100 flex items-center gap-2 text-xs text-emerald-700 font-bold">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{includedModules.length} modules included in this plan</span>
              </div>
            </div>

            {/* Card 4: Key Limits Overview */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-[#0D1F3D]">Key Limits Overview</h3>
                <button
                  type="button"
                  onClick={() => navigate(`/platform/plans/${plan.id}/limits`)}
                  className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  View All Limits →
                </button>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Maximum Users</span>
                    <span className="font-extrabold text-[#0D1F3D]">{formatLimit(plan.limits.maximumSeats)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Custom Forms</span>
                    <span className="font-extrabold text-[#0D1F3D]">{formatLimit(plan.limits.customForms)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Storage</span>
                    <span className="font-extrabold text-[#0D1F3D]">
                      {plan.limits.storageGb !== undefined ? `${plan.limits.storageGb} GB` : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">AI Credits / Month</span>
                    <span className="font-extrabold text-[#0D1F3D]">
                      {plan.limits.aiCreditsPerMonth !== undefined
                        ? plan.limits.aiCreditsPerMonth === 0
                          ? '0'
                          : formatLimit(plan.limits.aiCreditsPerMonth)
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">API Requests / Month</span>
                    <span className="font-extrabold text-[#0D1F3D]">{formatLimit(plan.limits.apiRequestsPerMonth)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Report Exports / Month</span>
                    <span className="font-extrabold text-[#0D1F3D]">{formatLimit(plan.limits.reportExportsPerMonth)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Active Workflows</span>
                    <span className="font-extrabold text-[#0D1F3D]">{formatLimit(plan.limits.activeWorkflows)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[10px] font-semibold block">Data Retention</span>
                    <span className="font-extrabold text-[#0D1F3D]">{formatDays(plan.limits.dataRetentionDays)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail Container */}
        <div className="space-y-6">
          {/* Card 1: Plan Performance Donut Chart */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-[#0D1F3D]">Plan Performance Breakdown</h3>
            </div>

            {metrics.totalTenants > 0 ? (
              <div className="flex items-center gap-4">
                <div className="relative h-32 w-32 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={52}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 100 }}
                        contentStyle={{ backgroundColor: '#0D1F3D', borderRadius: '4px', border: 'none', color: '#fff' }}
                        itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }}
                        formatter={(val: any) => [`${val} Tenants`, 'Status']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-extrabold text-[#0D1F3D]">{metrics.activeTenants}</span>
                    <span className="text-[10px] font-semibold text-slate-500">Active</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="text-slate-600">Active</span>
                    </div>
                    <span className="text-[#0D1F3D] font-extrabold">{metrics.activeTenants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-600">Trial</span>
                    </div>
                    <span className="text-[#0D1F3D] font-extrabold">{metrics.trialTenants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                      <span className="text-slate-600">Suspended</span>
                    </div>
                    <span className="text-[#0D1F3D] font-extrabold">{metrics.suspendedTenants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                      <span className="text-slate-600">Past Due</span>
                    </div>
                    <span className="text-[#0D1F3D] font-extrabold">{metrics.pastDueTenants}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 font-medium">
                No active or trial tenant subscriptions recorded yet.
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate(`/platform/plans/${plan.id}/tenants`)}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                View All Tenants →
              </button>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-extrabold text-[#0D1F3D]">Quick Actions</h3>
            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => navigate(`/platform/plans/create?planId=${plan.id}&step=basic`)}
                className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Edit className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#0D1F3D] group-hover:text-indigo-600">Edit Plan</p>
                    <p className="text-[10px] text-slate-500 font-medium">Update plan details, pricing, limits or modules</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={() => navigate(`/platform/plans/create?planId=${plan.id}&step=basic`)}
                className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Copy className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#0D1F3D] group-hover:text-indigo-600">Duplicate Plan</p>
                    <p className="text-[10px] text-slate-500 font-medium">Create a copy of this plan</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={() => navigate(`/platform/plans/${plan.id}/tenants`)}
                className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#0D1F3D] group-hover:text-indigo-600">View Plan Tenants</p>
                    <p className="text-[10px] text-slate-500 font-medium">See tenants subscribed to this plan</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={() => navigate(`/platform/plans/${plan.id}/versions`)}
                className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <History className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#0D1F3D] group-hover:text-indigo-600">View Version History</p>
                    <p className="text-[10px] text-slate-500 font-medium">Track changes and versions</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plan, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute('href', dataStr);
                  downloadAnchor.setAttribute('download', `plan-${plan.id}-summary.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#0D1F3D] group-hover:text-indigo-600">Export Plan Summary</p>
                    <p className="text-[10px] text-slate-500 font-medium">Download plan details as JSON</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
              </button>
            </div>
          </div>

          {/* Card 3: Recent Tenants Added */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-[#0D1F3D]">Recent Tenants Subscribed</h3>
              <button
                type="button"
                onClick={() => navigate(`/platform/plans/${plan.id}/tenants`)}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                View All →
              </button>
            </div>

            {recentTenants.length > 0 ? (
              <div className="space-y-3">
                {recentTenants.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/platform/tenants/${t.id}`)}
                    className="flex items-center justify-between p-2.5 rounded-sm border border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#0D1F3D] text-white font-bold text-xs">
                        {t.companyName[0]}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-[#0D1F3D] truncate">{t.companyName}</p>
                        <p className="text-[10px] text-slate-500 truncate font-medium">
                          {t.subscriptionStartDate || t.createdAt || '—'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        t.tenantStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {t.tenantStatus}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-500 font-medium">
                No tenants are currently subscribed to this plan.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
