import { PlatformPlan } from '../types/platform.types';

export interface PlanPriceCalculationInput {
  plan: PlatformPlan;
  billingCycle?: string;
  userLicensesCount: number;
}

export interface PlanPriceCalculationResult {
  pricePerUser: number;
  monthlyTotal: number;
  annualTotal: number;
  estimatedTax: number;
  finalGrandTotal: number;
}

export function calculatePlanPrice({
  plan,
  billingCycle = 'Yearly',
  userLicensesCount,
}: PlanPriceCalculationInput): PlanPriceCalculationResult {
  const isYearly = billingCycle === 'Yearly' || billingCycle === 'Annual';
  const effectiveLicenses = Math.max(userLicensesCount || 0, plan.minUsers || 1);
  const pricePerUser = isYearly ? plan.annualPricePerUser : plan.monthlyPricePerUser;

  const monthlyTotal = effectiveLicenses * pricePerUser;
  const annualTotal = isYearly ? monthlyTotal * 12 : monthlyTotal;
  const estimatedTax = Math.round(annualTotal * 0.18); // 18% GST estimate
  const finalGrandTotal = annualTotal + estimatedTax;

  return {
    pricePerUser,
    monthlyTotal,
    annualTotal,
    estimatedTax,
    finalGrandTotal,
  };
}
