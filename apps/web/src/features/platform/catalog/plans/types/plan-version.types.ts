import { PlanPricing, PlanLimits, PlanCommercialRules } from './plan.types';

export type PlanVersionStatus = 'Current' | 'Replaced' | 'Archived' | 'Draft';

export interface PlanVersionRecord {
  id: string;
  planId: string;
  version: number;
  status: PlanVersionStatus;
  publishedAt?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  actorName?: string;
  changeSummary: string[];
  snapshot?: {
    pricing: PlanPricing;
    limits: PlanLimits;
    includedModuleCodes: string[];
    commercialRules: PlanCommercialRules;
  };
}
