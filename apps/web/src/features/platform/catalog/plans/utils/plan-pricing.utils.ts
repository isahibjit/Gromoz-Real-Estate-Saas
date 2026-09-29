import { Plan, PlanPricing, PlanStatus } from '../types/plan.types';

export function formatCurrency(amount: number | undefined | null, currency = 'INR'): string {
  if (amount === undefined || amount === null) return '—';

  if (currency === 'INR') {
    return `₹${amount.toLocaleString('en-IN')}`;
  } else if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  } else if (currency === 'GBP') {
    return `£${amount.toLocaleString('en-GB')}`;
  } else if (currency === 'EUR') {
    return `€${amount.toLocaleString('de-DE')}`;
  }
  return `${amount}`;
}

export function formatPlanMonthlyPrice(pricing: PlanPricing): string {
  if (pricing.model === 'Custom Contract') {
    return 'Contact Sales';
  }
  if (pricing.model === 'Per User') {
    return pricing.monthlyPerUser !== undefined ? `${formatCurrency(pricing.monthlyPerUser, pricing.currency)} / user` : '—';
  }
  if (pricing.model === 'Base + Per User') {
    const base = formatCurrency(pricing.monthlyBaseFee, pricing.currency);
    const perUser = formatCurrency(pricing.monthlyPerUser, pricing.currency);
    return `${base} + ${perUser}/user`;
  }
  if (pricing.model === 'Flat Monthly') {
    return pricing.monthlyFlatPrice !== undefined ? `${formatCurrency(pricing.monthlyFlatPrice, pricing.currency)}` : '—';
  }
  return '—';
}

export function formatPlanAnnualPrice(pricing: PlanPricing): string {
  if (pricing.model === 'Custom Contract') {
    return 'Contact Sales';
  }
  if (!pricing.allowAnnualBilling) {
    return 'Not Available';
  }
  if (pricing.model === 'Per User') {
    return pricing.annualPerUser !== undefined ? `${formatCurrency(pricing.annualPerUser, pricing.currency)} / user` : '—';
  }
  if (pricing.model === 'Base + Per User') {
    const base = formatCurrency(pricing.annualBaseFee, pricing.currency);
    const perUser = formatCurrency(pricing.annualPerUser, pricing.currency);
    return `${base} + ${perUser}/user`;
  }
  if (pricing.model === 'Flat Monthly') {
    return pricing.annualFlatPrice !== undefined ? `${formatCurrency(pricing.annualFlatPrice, pricing.currency)}` : '—';
  }
  return '—';
}

export function calculateMonthlyPlanCost(pricing: PlanPricing, seats: number): number | null {
  if (pricing.model === 'Custom Contract') return null;

  if (pricing.model === 'Per User') {
    if (pricing.monthlyPerUser === undefined) return null;
    return pricing.monthlyPerUser * seats;
  }
  if (pricing.model === 'Base + Per User') {
    const base = pricing.monthlyBaseFee || 0;
    const perUser = pricing.monthlyPerUser || 0;
    return base + perUser * seats;
  }
  if (pricing.model === 'Flat Monthly') {
    return pricing.monthlyFlatPrice !== undefined ? pricing.monthlyFlatPrice : null;
  }
  return null;
}

export function calculateAnnualPlanCost(pricing: PlanPricing, seats: number): number | null {
  if (pricing.model === 'Custom Contract' || !pricing.allowAnnualBilling) return null;

  if (pricing.model === 'Per User') {
    if (pricing.annualPerUser === undefined) return null;
    return pricing.annualPerUser * seats;
  }
  if (pricing.model === 'Base + Per User') {
    const base = pricing.annualBaseFee || 0;
    const perUser = pricing.annualPerUser || 0;
    return base + perUser * seats;
  }
  if (pricing.model === 'Flat Monthly') {
    return pricing.annualFlatPrice !== undefined ? pricing.annualFlatPrice : null;
  }
  return null;
}

export function getAnnualSavingsPercent(pricing: PlanPricing): number | null {
  if (pricing.annualDiscountPercent !== undefined && pricing.annualDiscountPercent > 0) {
    return pricing.annualDiscountPercent;
  }
  if (pricing.model === 'Per User' && pricing.monthlyPerUser && pricing.annualPerUser) {
    const monthlyAnnualized = pricing.monthlyPerUser * 12;
    const annualTotal = pricing.annualPerUser * 12;
    if (monthlyAnnualized > annualTotal) {
      return Math.round(((monthlyAnnualized - annualTotal) / monthlyAnnualized) * 100);
    }
  }
  return null;
}

export function getPlanStatusBadge(status: PlanStatus) {
  switch (status) {
    case 'Active':
      return {
        label: 'Active',
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      };
    case 'Draft':
      return {
        label: 'Draft',
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
    case 'Archived':
      return {
        label: 'Archived',
        className: 'bg-purple-50 text-purple-700 border-purple-200',
      };
    default:
      return {
        label: status,
        className: 'bg-slate-100 text-slate-700 border-slate-200',
      };
  }
}

export function formatLimit(val: number | undefined | null, suffix = ''): string {
  if (val === undefined || val === null) {
    return 'Unlimited';
  }
  return `${val.toLocaleString('en-IN')}${suffix ? ` ${suffix}` : ''}`;
}

export function formatDays(days: number | undefined | null): string {
  if (days === undefined || days === null) return '—';
  if (days === 365) return '1 Year';
  if (days === 730) return '2 Years';
  if (days === 30) return '30 Days';
  if (days === 90) return '90 Days';
  if (days === 180) return '180 Days';
  return `${days} Days`;
}
