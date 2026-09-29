import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  Percent,
  Users,
  Coins,
  ShieldCheck,
  FileCheck,
  RefreshCw,
  Edit,
  TrendingUp,
  Clock,
  Lock,
} from 'lucide-react';
import { Plan } from '../../types/plan.types';
import { PlanDetailMetrics } from '../../hooks/usePlanDetails';
import {
  formatCurrency,
  formatPlanMonthlyPrice,
  formatPlanAnnualPrice,
  calculateMonthlyPlanCost,
  calculateAnnualPlanCost,
  getAnnualSavingsPercent,
} from '../../utils/plan-pricing.utils';
import { Button } from '../../../../../../components/ui/Button';

export interface PlanPricingTabProps {
  plan: Plan;
  metrics: PlanDetailMetrics;
}

export function PlanPricingTab({ plan, metrics }: PlanPricingTabProps) {
  const navigate = useNavigate();

  const pricing = plan.pricing;
  const rules = plan.commercialRules;
  const limits = plan.limits;

  // Seat tiers for Cost Examples table
  const seatExamples = [20, 50, 100, 250];

  const savingsPercent = getAnnualSavingsPercent(pricing);
  const arrProjection = metrics.totalMrr * 12;

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner / Header Context Description */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold text-[#0D1F3D]">Commercial Pricing & Billing Inspection</h3>
            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
              {plan.code} • v{plan.version || 1}
            </span>
            <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
              {plan.status}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Review commercial pricing, billing options and revenue contribution for this plan.
          </p>
        </div>

        <Button
          variant="accent"
          size="sm"
          onClick={() => navigate(`/platform/plans/create?planId=${plan.id}&step=pricing`)}
          className="gap-2 font-bold shadow-xs shrink-0 bg-rose-600 hover:bg-rose-700 text-white border-none"
        >
          <Edit className="h-4 w-4" /> Edit Pricing
        </Button>
      </div>

      {/* Main Grid: Left Column (2 Cols) + Right Column (1 Col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Pricing Overview */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-[#0D1F3D]">Pricing Overview</h4>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Executive summary of pricing configuration for this plan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Item 1 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Pricing Model</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">{pricing.model}</span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Monthly Price</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">{formatPlanMonthlyPrice(pricing)}</span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Annual Price</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">{formatPlanAnnualPrice(pricing)}</span>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Percent className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Annual Discount</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {savingsPercent !== null ? `${savingsPercent}%` : 'None'}
                  </span>
                </div>
              </div>

              {/* Item 5 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Minimum Seats</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">{limits.minimumSeats}</span>
                </div>
              </div>

              {/* Item 6 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Currency</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">{pricing.currency}</span>
                </div>
              </div>

              {/* Item 7 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Setup Fee</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">
                    {pricing.setupFee ? formatCurrency(pricing.setupFee, pricing.currency) : '₹0'}
                  </span>
                </div>
              </div>

              {/* Item 8 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <FileCheck className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Tax Handling</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">{pricing.taxMode || 'Exclusive'}</span>
                </div>
              </div>

              {/* Item 9 */}
              <div className="flex items-center gap-3 p-3 rounded-sm border border-slate-100 bg-slate-50/50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Proration</span>
                  <span className="font-extrabold text-[#0D1F3D] text-sm">{pricing.prorationPolicy || 'Prorate Immediately'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Monthly Billing vs Annual Billing side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Billing Card */}
            <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-[#0D1F3D]">Monthly Billing</h4>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                  pricing.allowMonthlyBilling ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {pricing.allowMonthlyBilling ? 'Available' : 'Disabled'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-extrabold text-[#0D1F3D]">
                  {formatPlanMonthlyPrice(pricing)}
                </span>
                <span className={`text-[11px] font-semibold ${
                  pricing.defaultBillingCycle === 'Monthly' ? 'text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full' : 'text-slate-500'
                }`}>
                  {pricing.defaultBillingCycle === 'Monthly' ? 'Default On' : 'Default Off'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-2 border-t border-slate-100">
                Billed monthly. Ideal for short-term and flexible engagements.
              </p>
            </div>

            {/* Annual Billing Card */}
            <div className="rounded-sm border border-indigo-200 bg-indigo-50/20 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-[#0D1F3D]">Annual Billing</h4>
                <div className="flex items-center gap-1.5">
                  {savingsPercent !== null && (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                      Save {savingsPercent}%
                    </span>
                  )}
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold border ${
                    pricing.allowAnnualBilling ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {pricing.allowAnnualBilling ? 'Available' : 'Disabled'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xl font-extrabold text-[#0D1F3D]">
                  {formatPlanAnnualPrice(pricing)}
                </span>
                <span className={`text-[11px] font-semibold ${
                  pricing.defaultBillingCycle === 'Annual' ? 'text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full' : 'text-slate-500'
                }`}>
                  {pricing.defaultBillingCycle === 'Annual' ? 'Default On' : 'Default Off'}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed pt-2 border-t border-indigo-100">
                Billed annually. {savingsPercent !== null ? `Best value with ${savingsPercent}% savings compared to monthly.` : 'Longer-term commitment plan.'}
              </p>
            </div>
          </div>

          {/* Card 3: Commercial Settings */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-[#0D1F3D]">Commercial Settings</h4>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Default Billing Cycle</span>
                  <span className="font-extrabold text-[#0D1F3D]">{pricing.defaultBillingCycle}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Minimum Commitment</span>
                  <span className="font-extrabold text-[#0D1F3D]">{rules.minimumCommitment || 'None'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Auto Renewal</span>
                  <span className="font-extrabold text-[#0D1F3D]">{rules.autoRenew ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Upgrade Policy</span>
                  <span className="font-extrabold text-[#0D1F3D]">{rules.allowUpgrade ? 'Allowed' : 'Not Allowed'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Downgrade Policy</span>
                  <span className="font-extrabold text-[#0D1F3D]">{rules.allowDowngrade ? 'Allowed' : 'Manual Approval'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block">Change Effective Timing</span>
                  <span className="font-extrabold text-[#0D1F3D]">{rules.changeEffectiveTiming || 'Immediately'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Cost Examples Table */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-[#0D1F3D]">Cost Examples</h4>
            </div>

            {pricing.model === 'Custom Contract' ? (
              <p className="text-xs text-slate-600 font-medium py-3">
                Custom Contract pricing is negotiated per agreement based on total seats, enterprise SLA, and custom modules. Contact sales for custom pricing.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-[#0D1F3D] bg-slate-50/60">
                      <th className="py-2.5 px-3">Users</th>
                      <th className="py-2.5 px-3">Monthly Cost</th>
                      <th className="py-2.5 px-3">Annual Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {seatExamples.map((users) => {
                      const monthlyCost = calculateMonthlyPlanCost(pricing, users);
                      const annualCost = calculateAnnualPlanCost(pricing, users);

                      return (
                        <tr key={users} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-3 font-bold text-[#0D1F3D]">{users} seats</td>
                          <td className="py-3 px-3 font-extrabold text-[#0D1F3D]">
                            {monthlyCost !== null ? formatCurrency(monthlyCost, pricing.currency) : '—'}
                          </td>
                          <td className="py-3 px-3 font-extrabold text-[#0D1F3D]">
                            {annualCost !== null ? formatCurrency(annualCost, pricing.currency) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Card 1: Plan Adoption */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-[#0D1F3D] border-b border-slate-100 pb-3">Plan Adoption</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-sm bg-emerald-50/50 border border-emerald-100">
                <span className="text-[11px] font-semibold text-slate-500 block">Active Tenants</span>
                <span className="text-lg font-extrabold text-[#0D1F3D]">{metrics.activeTenants}</span>
              </div>
              <div className="p-3 rounded-sm bg-amber-50/50 border border-amber-100">
                <span className="text-[11px] font-semibold text-slate-500 block">Trial Tenants</span>
                <span className="text-lg font-extrabold text-[#0D1F3D]">{metrics.trialTenants}</span>
              </div>
              <div className="p-3 rounded-sm bg-purple-50/50 border border-purple-100">
                <span className="text-[11px] font-semibold text-slate-500 block">MRR Contribution</span>
                <span className="text-sm font-extrabold text-[#0D1F3D]">
                  {formatCurrency(metrics.totalMrr, pricing.currency)}
                </span>
              </div>
              <div className="p-3 rounded-sm bg-blue-50/50 border border-blue-100">
                <span className="text-[11px] font-semibold text-slate-500 block">ARR Projection</span>
                <span className="text-sm font-extrabold text-[#0D1F3D]">
                  {formatCurrency(arrProjection, pricing.currency)}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate(`/platform/plans/${plan.id}/tenants`)}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                View Tenants →
              </button>
            </div>
          </div>

          {/* Card 2: Pricing Notes */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-[#0D1F3D]">Pricing Notes</h4>
            <ul className="space-y-2 text-xs text-slate-600 font-medium leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                Model: {pricing.model} ({pricing.currency})
              </li>
              {pricing.allowAnnualBilling && (
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                  Annual billing discount: {savingsPercent !== null ? `${savingsPercent}%` : 'N/A'}
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                Minimum {limits.minimumSeats}-seat commitment
              </li>
              <li className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                Tax Mode: {pricing.taxMode || 'Exclusive'}
              </li>
            </ul>
          </div>

          {/* Card 3: Commercial Health */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-[#0D1F3D]">Commercial Health</h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Public Visibility</span>
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  {plan.visibility}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Status</span>
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                  {plan.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
