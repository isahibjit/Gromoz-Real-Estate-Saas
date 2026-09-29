import { Plan, PlanStatus, PlanVisibility, PlanPricing, PlanLimits, PlanCommercialRules, PlanDraftInput } from '../types/plan.types';

export function mapBackendStatusToUi(status: string): PlanStatus {
  switch (status) {
    case 'ACTIVE':
      return 'Active';
    case 'ARCHIVED':
      return 'Archived';
    case 'DRAFT':
    default:
      return 'Draft';
  }
}

export function mapUiStatusToBackend(status: PlanStatus): string {
  switch (status) {
    case 'Active':
      return 'ACTIVE';
    case 'Archived':
      return 'ARCHIVED';
    case 'Draft':
    default:
      return 'DRAFT';
  }
}

export function mapBackendVisibilityToUi(visibility: string): PlanVisibility {
  switch (visibility) {
    case 'INTERNAL':
      return 'Internal';
    case 'INVITE_ONLY':
      return 'Invite Only';
    case 'PUBLIC':
    default:
      return 'Public';
  }
}

export function mapUiVisibilityToBackend(visibility: PlanVisibility): string {
  switch (visibility) {
    case 'Internal':
      return 'INTERNAL';
    case 'Invite Only':
      return 'INVITE_ONLY';
    case 'Public':
    default:
      return 'PUBLIC';
  }
}

export function transformBackendPlanToUi(backendPlan: any): Plan {
  const activeVersion = backendPlan.currentPublishedVersion || backendPlan.currentDraftVersion || {};
  const pricingList: any[] = activeVersion.pricing || [];
  const limitsList: any[] = activeVersion.limits || [];
  const rules = activeVersion.commercialRule || {};

  const monthlyPrice = pricingList.find((p) => p.billingCycle === 'MONTHLY');
  const annualPrice = pricingList.find((p) => p.billingCycle === 'ANNUAL');
  const activePricingObj = monthlyPrice || annualPrice || {};

  const modelMap: Record<string, any> = {
    PER_USER: 'Per User',
    BASE_PLUS_PER_USER: 'Base + Per User',
    FLAT: 'Flat Monthly',
    CUSTOM_CONTRACT: 'Custom Contract',
  };

  const pricing: PlanPricing = {
    model: modelMap[activePricingObj.model] || 'Per User',
    currency: (activePricingObj.currency as any) || 'INR',
    monthlyBaseFee: monthlyPrice?.baseFee !== undefined && monthlyPrice?.baseFee !== null ? Number(monthlyPrice.baseFee) : undefined,
    monthlyPerUser: monthlyPrice?.perSeatFee !== undefined && monthlyPrice?.perSeatFee !== null ? Number(monthlyPrice.perSeatFee) : undefined,
    monthlyFlatPrice: monthlyPrice?.flatFee !== undefined && monthlyPrice?.flatFee !== null ? Number(monthlyPrice.flatFee) : undefined,
    annualBaseFee: annualPrice?.baseFee !== undefined && annualPrice?.baseFee !== null ? Number(annualPrice.baseFee) : undefined,
    annualPerUser: annualPrice?.perSeatFee !== undefined && annualPrice?.perSeatFee !== null ? Number(annualPrice.perSeatFee) : undefined,
    annualFlatPrice: annualPrice?.flatFee !== undefined && annualPrice?.flatFee !== null ? Number(annualPrice.flatFee) : undefined,
    annualDiscountPercent: annualPrice?.discountPercent !== undefined && annualPrice?.discountPercent !== null ? Number(annualPrice.discountPercent) : undefined,
    minimumMonthlyCommitment: activePricingObj.minimumCommitmentAmount !== undefined && activePricingObj.minimumCommitmentAmount !== null ? Number(activePricingObj.minimumCommitmentAmount) : undefined,
    setupFee: activePricingObj.setupFee !== undefined && activePricingObj.setupFee !== null ? Number(activePricingObj.setupFee) : undefined,
    allowMonthlyBilling: Boolean(monthlyPrice),
    allowAnnualBilling: Boolean(annualPrice),
    defaultBillingCycle: annualPrice && !monthlyPrice ? 'Annual' : 'Monthly',
    taxMode: activePricingObj.taxMode === 'INCLUSIVE' ? 'Inclusive' : 'Exclusive',
    prorationPolicy: activePricingObj.prorationPolicy === 'NEXT_BILLING_CYCLE' ? 'Next Billing Cycle' : activePricingObj.prorationPolicy === 'IMMEDIATE' ? 'Prorate Immediately' : 'No Proration',
  };

  const limitsMap: Record<string, any> = {};
  for (const l of limitsList) {
    limitsMap[l.limitCode] = l;
  }

  const limits: PlanLimits = {
    minimumSeats: limitsMap.minimum_seats?.integerValue ?? 1,
    defaultSeatLimit: limitsMap.default_seat_limit?.integerValue ?? 5,
    maximumSeats: limitsMap.maximum_seats?.isUnlimited ? undefined : limitsMap.maximum_seats?.integerValue,
    seatIncrement: limitsMap.seat_increment?.integerValue ?? 1,
    storageGb: limitsMap.storage_gb?.decimalValue ? Number(limitsMap.storage_gb.decimalValue) : 10,
    storageIncrementGb: limitsMap.storage_increment_gb?.decimalValue ? Number(limitsMap.storage_increment_gb.decimalValue) : undefined,
    dataRetentionDays: limitsMap.data_retention_days?.integerValue ?? 90,
    apiRequestsPerMonth: limitsMap.api_requests_per_month?.integerValue,
    activeWorkflows: limitsMap.active_workflows?.integerValue,
    customForms: limitsMap.custom_forms?.integerValue,
    reportExportsPerMonth: limitsMap.report_exports_per_month?.integerValue,
    fileUploadMb: limitsMap.file_upload_mb?.integerValue,
    aiCreditsPerMonth: limitsMap.ai_credits_per_month?.integerValue,
    automationsPerMonth: limitsMap.automations_per_month?.integerValue,
    emailSendsPerMonth: limitsMap.email_sends_per_month?.integerValue,
    offlineDataGbPerDevice: limitsMap.offline_data_gb_per_device?.decimalValue ? Number(limitsMap.offline_data_gb_per_device.decimalValue) : undefined,
    concurrentSessions: limitsMap.concurrent_sessions?.integerValue,
    fullDataExport: limitsMap.full_data_export?.booleanValue,
    auditRetentionDays: limitsMap.audit_retention_days?.integerValue,
  };

  const commercialRules: PlanCommercialRules = {
    trialEnabled: Boolean(rules.trialEnabled),
    trialDurationDays: rules.trialDurationDays ?? 14,
    trialSeatLimit: rules.trialSeatLimit ?? 5,
    trialModulePolicy: rules.trialModulePolicy === 'RESTRICTED' ? 'Restricted' : 'Use Plan Modules',
    autoConvertAfterTrial: Boolean(rules.autoConvertAfterTrial),
    autoRenew: rules.autoRenew !== false,
    allowUpgrade: rules.allowUpgrade !== false,
    allowDowngrade: Boolean(rules.allowDowngrade),
    changeEffectiveTiming: rules.changeEffectiveTiming === 'NEXT_BILLING_CYCLE' ? 'Next Billing Cycle' : 'Immediately',
    minimumCommitment: rules.minimumCommitmentMonths === '12' ? '12 Months' : rules.minimumCommitmentMonths === '6' ? '6 Months' : rules.minimumCommitmentMonths === '3' ? '3 Months' : rules.minimumCommitmentMonths === '1' ? '1 Month' : 'None',
    availableForNewTenants: rules.availableForNewTenants !== false,
    availableForExistingTenants: rules.availableForExistingTenants !== false,
    cancellationAllowed: rules.cancellationAllowed !== false,
    gracePeriodDays: rules.gracePeriodDays ?? 7,
    accessAfterExpiry: rules.accessAfterExpiry === 'BLOCKED' ? 'Blocked' : 'Read Only',
  };

  return {
    id: backendPlan.id,
    versionId: activeVersion.id || backendPlan.currentPublishedVersion?.id || backendPlan.currentDraftVersion?.id,
    code: backendPlan.code,
    name: backendPlan.name,
    description: backendPlan.description,
    internalDescription: backendPlan.internalDescription || undefined,
    status: mapBackendStatusToUi(backendPlan.status),
    visibility: mapBackendVisibilityToUi(backendPlan.visibility),
    tier: backendPlan.tier || undefined,
    badge: backendPlan.badge || undefined,
    recommendedFor: backendPlan.recommendedFor || undefined,
    displayOrder: backendPlan.displayOrder || 0,
    color: backendPlan.color || undefined,
    version: activeVersion.version || 1,
    pricing,
    limits,
    includedModuleCodes: activeVersion.includedModuleCodes || [],
    commercialRules,
    createdAt: backendPlan.createdAt,
    updatedAt: backendPlan.updatedAt,
  };
}

export function transformUiDraftToBackend(input: PlanDraftInput): any {
  const modelReverseMap: Record<string, string> = {
    'Per User': 'PER_USER',
    'Base + Per User': 'BASE_PLUS_PER_USER',
    'Flat Monthly': 'FLAT',
    'Custom Contract': 'CUSTOM_CONTRACT',
  };

  const toDecimalString = (val?: number): string | undefined => {
    if (val === undefined || val === null || isNaN(val)) return undefined;
    return Number(val).toFixed(2);
  };

  const pricing: any[] = [];
  if (input.pricing.allowMonthlyBilling) {
    pricing.push({
      model: modelReverseMap[input.pricing.model] || 'PER_USER',
      billingCycle: 'MONTHLY',
      currency: input.pricing.currency || 'INR',
      baseFee: toDecimalString(input.pricing.monthlyBaseFee),
      perSeatFee: toDecimalString(input.pricing.monthlyPerUser),
      flatFee: toDecimalString(input.pricing.monthlyFlatPrice),
      setupFee: toDecimalString(input.pricing.setupFee),
      minimumCommitmentAmount: toDecimalString(input.pricing.minimumMonthlyCommitment),
      taxMode: input.pricing.taxMode === 'Inclusive' ? 'INCLUSIVE' : 'EXCLUSIVE',
      prorationPolicy: input.pricing.prorationPolicy === 'Next Billing Cycle' ? 'NEXT_BILLING_CYCLE' : input.pricing.prorationPolicy === 'Prorate Immediately' ? 'IMMEDIATE' : 'NONE',
    });
  }

  if (input.pricing.allowAnnualBilling) {
    pricing.push({
      model: modelReverseMap[input.pricing.model] || 'PER_USER',
      billingCycle: 'ANNUAL',
      currency: input.pricing.currency || 'INR',
      baseFee: toDecimalString(input.pricing.annualBaseFee),
      perSeatFee: toDecimalString(input.pricing.annualPerUser),
      flatFee: toDecimalString(input.pricing.annualFlatPrice),
      setupFee: toDecimalString(input.pricing.setupFee),
      minimumCommitmentAmount: toDecimalString(input.pricing.minimumMonthlyCommitment),
      discountPercent: toDecimalString(input.pricing.annualDiscountPercent),
      taxMode: input.pricing.taxMode === 'Inclusive' ? 'INCLUSIVE' : 'EXCLUSIVE',
      prorationPolicy: input.pricing.prorationPolicy === 'Next Billing Cycle' ? 'NEXT_BILLING_CYCLE' : input.pricing.prorationPolicy === 'Prorate Immediately' ? 'IMMEDIATE' : 'NONE',
    });
  }

  const limits: any[] = [
    { limitCode: 'minimum_seats', valueType: 'INTEGER', integerValue: input.limits.minimumSeats, isUnlimited: false },
    { limitCode: 'default_seat_limit', valueType: 'INTEGER', integerValue: input.limits.defaultSeatLimit, isUnlimited: false },
    { limitCode: 'maximum_seats', valueType: 'INTEGER', integerValue: input.limits.maximumSeats ?? null, isUnlimited: !input.limits.maximumSeats },
    { limitCode: 'seat_increment', valueType: 'INTEGER', integerValue: input.limits.seatIncrement ?? 1, isUnlimited: false },
    { limitCode: 'storage_gb', valueType: 'DECIMAL', decimalValue: toDecimalString(input.limits.storageGb), isUnlimited: false, unit: 'GB' },
    { limitCode: 'data_retention_days', valueType: 'INTEGER', integerValue: input.limits.dataRetentionDays ?? 90, isUnlimited: false, unit: 'days' },
  ];

  const commercialRules = {
    trialEnabled: input.commercialRules.trialEnabled,
    trialDurationDays: input.commercialRules.trialDurationDays,
    trialSeatLimit: input.commercialRules.trialSeatLimit,
    trialModulePolicy: input.commercialRules.trialModulePolicy === 'Restricted' ? 'RESTRICTED' : 'USE_PLAN_MODULES',
    autoConvertAfterTrial: input.commercialRules.autoConvertAfterTrial,
    autoRenew: input.commercialRules.autoRenew,
    allowUpgrade: input.commercialRules.allowUpgrade,
    allowDowngrade: input.commercialRules.allowDowngrade,
    changeEffectiveTiming: input.commercialRules.changeEffectiveTiming === 'Next Billing Cycle' ? 'NEXT_BILLING_CYCLE' : 'IMMEDIATE',
    minimumCommitmentMonths: input.commercialRules.minimumCommitment === '12 Months' ? '12' : input.commercialRules.minimumCommitment === '6 Months' ? '6' : input.commercialRules.minimumCommitment === '3 Months' ? '3' : input.commercialRules.minimumCommitment === '1 Month' ? '1' : '0',
    availableForNewTenants: input.commercialRules.availableForNewTenants,
    availableForExistingTenants: input.commercialRules.availableForExistingTenants,
    cancellationAllowed: input.commercialRules.cancellationAllowed,
    gracePeriodDays: input.commercialRules.gracePeriodDays,
    accessAfterExpiry: input.commercialRules.accessAfterExpiry === 'Blocked' ? 'BLOCKED' : 'READ_ONLY',
  };

  return {
    code: input.code.trim().toUpperCase(),
    name: input.name,
    description: input.description?.trim() || input.name || 'Commercial plan subscription',
    internalDescription: input.internalDescription,
    visibility: mapUiVisibilityToBackend(input.visibility),
    tier: input.tier,
    badge: input.badge,
    recommendedFor: input.recommendedFor,
    displayOrder: input.displayOrder || 0,
    color: input.color,
    pricing,
    limits,
    includedModuleCodes: input.includedModuleCodes,
    commercialRules,
  };
}
