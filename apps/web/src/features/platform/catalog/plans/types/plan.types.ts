export type PlanStatus = 'Draft' | 'Active' | 'Archived';

export type PricingModel = 'Per User' | 'Base + Per User' | 'Flat Monthly' | 'Custom Contract';

export type PlanVisibility = 'Public' | 'Internal' | 'Invite Only';

export type TaxMode = 'Exclusive' | 'Inclusive';

export type ProrationPolicy = 'No Proration' | 'Prorate Immediately' | 'Next Billing Cycle';

export type ExpiryAccess = 'Read Only' | 'Blocked';

export interface PlanPricing {
  model: PricingModel;
  currency: 'INR' | 'USD' | 'GBP' | 'EUR';

  monthlyBaseFee?: number;
  monthlyPerUser?: number;
  monthlyFlatPrice?: number;

  annualBaseFee?: number;
  annualPerUser?: number;
  annualFlatPrice?: number;

  annualDiscountPercent?: number;

  minimumMonthlyCommitment?: number;
  setupFee?: number;

  allowMonthlyBilling: boolean;
  allowAnnualBilling: boolean;

  defaultBillingCycle: 'Monthly' | 'Annual';

  taxMode: TaxMode;
  prorationPolicy: ProrationPolicy;
}

export interface PlanLimits {
  minimumSeats: number;
  defaultSeatLimit: number;
  maximumSeats?: number;
  seatIncrement?: number;

  storageGb: number;
  storageIncrementGb?: number;
  dataRetentionDays?: number;

  apiRequestsPerMonth?: number;
  activeWorkflows?: number;
  customForms?: number;
  reportExportsPerMonth?: number;

  fileUploadMb?: number;
  aiCreditsPerMonth?: number;
  automationsPerMonth?: number;
  emailSendsPerMonth?: number;

  offlineDataGbPerDevice?: number;
  concurrentSessions?: number;

  fullDataExport?: boolean;
  auditRetentionDays?: number;
}

export interface PlanCommercialRules {
  trialEnabled: boolean;
  trialDurationDays?: number;
  trialSeatLimit?: number;

  trialModulePolicy: 'Use Plan Modules' | 'Restricted';

  autoConvertAfterTrial: boolean;
  autoRenew: boolean;

  allowUpgrade: boolean;
  allowDowngrade: boolean;

  changeEffectiveTiming: 'Immediately' | 'Next Billing Cycle';

  minimumCommitment: 'None' | '1 Month' | '3 Months' | '6 Months' | '12 Months';

  availableForNewTenants: boolean;
  availableForExistingTenants: boolean;

  cancellationAllowed: boolean;
  gracePeriodDays: number;

  accessAfterExpiry: ExpiryAccess;
}

export interface Plan {
  id: string;
  versionId?: string;
  code: string;
  name: string;

  description: string;
  internalDescription?: string;

  status: PlanStatus;
  visibility: PlanVisibility;

  tier?: string;
  badge?: string;
  recommendedFor?: string;
  displayOrder: number;
  color?: string;

  version: number;

  pricing: PlanPricing;
  limits: PlanLimits;

  includedModuleCodes: string[];

  commercialRules: PlanCommercialRules;

  createdAt: string;
  updatedAt: string;
}

export interface PlanDraftInput {
  code: string;
  name: string;
  description: string;
  internalDescription?: string;

  status?: PlanStatus;
  visibility: PlanVisibility;

  tier?: string;
  badge?: string;
  recommendedFor?: string;
  displayOrder: number;
  color?: string;

  pricing: PlanPricing;
  limits: PlanLimits;

  includedModuleCodes: string[];

  commercialRules: PlanCommercialRules;
}
