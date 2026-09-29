import { Plan, PlanCommercialRules, PlanDraftInput, PlanLimits, PlanPricing } from '../types/plan.types';
import { PlatformModule } from '../../modules/types/module.types';

export interface ValidationResult {
  valid: boolean;
  fieldErrors: Record<string, string>;
  message?: string;
}

export function validateBasicInformation(
  formState: PlanDraftInput,
  existingPlans: Plan[],
  currentPlanId?: string
): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!formState.name || !formState.name.trim()) {
    fieldErrors.name = 'Plan Name is required';
  }

  if (!formState.description || !formState.description.trim()) {
    fieldErrors.description = 'Customer-Facing Description is required';
  }

  const code = formState.code ? formState.code.trim().toUpperCase() : '';
  if (!code) {
    fieldErrors.code = 'Plan Code is required';
  } else if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
    fieldErrors.code = 'Code must start with a letter and contain only uppercase letters, numbers, and underscores (e.g. PROFESSIONAL)';
  } else {
    // Check uniqueness
    const duplicate = existingPlans.find(
      (p) => p.code === code && p.id !== currentPlanId
    );
    if (duplicate) {
      fieldErrors.code = `Plan Code '${code}' is already used by '${duplicate.name}'`;
    }
  }

  if (formState.displayOrder < 0) {
    fieldErrors.displayOrder = 'Display Order must be greater than or equal to 0';
  }

  const valid = Object.keys(fieldErrors).length === 0;
  return {
    valid,
    fieldErrors,
    message: valid ? undefined : 'Please correct the errors in Basic Information.',
  };
}

export function validatePricing(pricing: PlanPricing): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!pricing.allowMonthlyBilling && !pricing.allowAnnualBilling) {
    fieldErrors.allowMonthlyBilling = 'At least one billing cycle (Monthly or Annual) must be enabled.';
  }

  if (pricing.defaultBillingCycle === 'Monthly' && !pricing.allowMonthlyBilling) {
    fieldErrors.defaultBillingCycle = 'Default billing cycle cannot be Monthly when Monthly billing is disabled.';
  }

  if (pricing.defaultBillingCycle === 'Annual' && !pricing.allowAnnualBilling) {
    fieldErrors.defaultBillingCycle = 'Default billing cycle cannot be Annual when Annual billing is disabled.';
  }

  if (pricing.model === 'Per User') {
    if (pricing.allowMonthlyBilling && (pricing.monthlyPerUser === undefined || pricing.monthlyPerUser < 0)) {
      fieldErrors.monthlyPerUser = 'Monthly Price / User must be a valid non-negative number.';
    }
    if (pricing.allowAnnualBilling && pricing.annualPerUser !== undefined && pricing.annualPerUser < 0) {
      fieldErrors.annualPerUser = 'Annual Price / User cannot be negative.';
    }
  } else if (pricing.model === 'Base + Per User') {
    if (pricing.allowMonthlyBilling) {
      if (pricing.monthlyBaseFee === undefined || pricing.monthlyBaseFee < 0) {
        fieldErrors.monthlyBaseFee = 'Monthly Base Fee must be non-negative.';
      }
      if (pricing.monthlyPerUser === undefined || pricing.monthlyPerUser < 0) {
        fieldErrors.monthlyPerUser = 'Monthly Per User Fee must be non-negative.';
      }
    }
  } else if (pricing.model === 'Flat Monthly') {
    if (pricing.allowMonthlyBilling && (pricing.monthlyFlatPrice === undefined || pricing.monthlyFlatPrice < 0)) {
      fieldErrors.monthlyFlatPrice = 'Monthly Flat Price must be non-negative.';
    }
  }

  if (pricing.annualDiscountPercent !== undefined && (pricing.annualDiscountPercent < 0 || pricing.annualDiscountPercent > 100)) {
    fieldErrors.annualDiscountPercent = 'Annual discount must be between 0% and 100%.';
  }

  const valid = Object.keys(fieldErrors).length === 0;
  return {
    valid,
    fieldErrors,
    message: valid ? undefined : 'Please correct the pricing configuration errors.',
  };
}

export function validateLimits(limits: PlanLimits): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!limits.minimumSeats || limits.minimumSeats < 1) {
    fieldErrors.minimumSeats = 'Minimum Seats must be at least 1.';
  }

  if (!limits.defaultSeatLimit || limits.defaultSeatLimit < limits.minimumSeats) {
    fieldErrors.defaultSeatLimit = `Default Seats (${limits.defaultSeatLimit || 0}) cannot be less than Minimum Seats (${limits.minimumSeats || 1}).`;
  }

  if (limits.maximumSeats !== undefined && limits.maximumSeats !== null) {
    if (limits.maximumSeats < limits.defaultSeatLimit) {
      fieldErrors.maximumSeats = `Maximum Seats (${limits.maximumSeats}) cannot be less than Default Seats (${limits.defaultSeatLimit}).`;
    }
  }

  if (limits.storageGb === undefined || limits.storageGb < 0) {
    fieldErrors.storageGb = 'Storage Included (GB) must be non-negative.';
  }

  const valid = Object.keys(fieldErrors).length === 0;
  return {
    valid,
    fieldErrors,
    message: valid ? undefined : 'Please correct the seats and usage limit errors.',
  };
}

/**
 * Automatically resolves and returns all required parent module dependencies
 * for a set of selected module codes.
 * E.g., if 'order_management' is selected and depends on 'core_crm', 'core_crm' is auto-added.
 */
export function resolveModuleDependencies(
  selectedModuleCodes: string[],
  allModules: PlatformModule[]
): string[] {
  const resolved = new Set<string>(selectedModuleCodes);
  let addedNew = true;

  while (addedNew) {
    addedNew = false;
    for (const code of Array.from(resolved)) {
      const mod = allModules.find((m) => m.code === code);
      for (const dependencyCode of mod?.dependencyCodes ?? []) {
        if (!resolved.has(dependencyCode)) {
          resolved.add(dependencyCode);
          addedNew = true;
        }
      }
    }
  }

  return Array.from(resolved);
}

export function validateModules(
  selectedModuleCodes: string[],
  allModules: PlatformModule[]
): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (!selectedModuleCodes || selectedModuleCodes.length === 0) {
    fieldErrors.selectedModuleCodes = 'Please select at least one module for this plan.';
  } else {
    // 1. Check if required system modules are present
    const requiredModules = allModules.filter((m) => m.requiredBySystem);
    const missingRequired = requiredModules.filter((m) => !selectedModuleCodes.includes(m.code));

    if (missingRequired.length > 0) {
      fieldErrors.selectedModuleCodes = `Plan must include system-required modules: ${missingRequired.map((m) => m.name).join(', ')}`;
    } else {
      // 2. Validate dependsOnModuleCode for selected modules
      const dependencyErrors: string[] = [];

      for (const code of selectedModuleCodes) {
        const mod = allModules.find((m) => m.code === code);
        for (const dependencyCode of mod?.dependencyCodes ?? []) {
          const parentMod = allModules.find((m) => m.code === dependencyCode);
          if (!selectedModuleCodes.includes(dependencyCode)) {
            dependencyErrors.push(
              `'${mod?.name || code}' requires parent module '${parentMod?.name || dependencyCode}'`
            );
          }
        }
      }

      if (dependencyErrors.length > 0) {
        fieldErrors.selectedModuleCodes = `Module Dependency Error: ${dependencyErrors.join('; ')}`;
      }
    }
  }

  const valid = Object.keys(fieldErrors).length === 0;
  return {
    valid,
    fieldErrors,
    message: valid ? undefined : (fieldErrors.selectedModuleCodes || 'Please select valid modules for this plan.'),
  };
}

export function validateCommercialRules(rules: PlanCommercialRules): ValidationResult {
  const fieldErrors: Record<string, string> = {};

  if (rules.trialEnabled) {
    if (!rules.trialDurationDays || rules.trialDurationDays < 1) {
      fieldErrors.trialDurationDays = 'Trial Duration must be at least 1 day.';
    }
  }

  const valid = Object.keys(fieldErrors).length === 0;
  return {
    valid,
    fieldErrors,
    message: valid ? undefined : 'Please correct the trial & commercial rules.',
  };
}

export function validateCompletePlan(
  formState: PlanDraftInput,
  existingPlans: Plan[],
  allModules: PlatformModule[],
  currentPlanId?: string
): ValidationResult {
  const basicRes = validateBasicInformation(formState, existingPlans, currentPlanId);
  if (!basicRes.valid) return basicRes;

  const pricingRes = validatePricing(formState.pricing);
  if (!pricingRes.valid) return pricingRes;

  const limitsRes = validateLimits(formState.limits);
  if (!limitsRes.valid) return limitsRes;

  const modulesRes = validateModules(formState.includedModuleCodes, allModules);
  if (!modulesRes.valid) return modulesRes;

  const rulesRes = validateCommercialRules(formState.commercialRules);
  if (!rulesRes.valid) return rulesRes;

  return { valid: true, fieldErrors: {} };
}
