import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plan } from '../types/plan.types';
import { planService } from '../services/plan.service';
import { moduleService } from '../../modules/services/module.service';
import { PlatformModule } from '../../modules/types/module.types';
import { Tenant } from '../../../tenants/types/platform.types';

export interface PlanDetailMetrics {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  pastDueTenants: number;
  suspendedTenants: number;
  totalMrr: number;
  arrProjection: number;
}

export function usePlanDetails(planId: string | undefined) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [allModules, setAllModules] = useState<PlatformModule[]>([]);
  const [tenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!planId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const [fetchedPlan, fetchedModules] = await Promise.all([
        planService.getPlanById(planId),
        moduleService.getModules(),
      ]);

      if (!fetchedPlan) {
        setError(`Plan with ID '${planId}' was not found.`);
        setPlan(null);
      } else {
        setPlan(fetchedPlan);
      }
      setAllModules(fetchedModules);
    } catch (err: any) {
      setError(err?.message || 'Failed to load plan details');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Derived included modules
  const includedModules = useMemo(() => {
    if (!plan) return [];
    return allModules.filter((m) => plan.includedModuleCodes.includes(m.code));
  }, [plan, allModules]);

  const planTenants = useMemo<Tenant[]>(() => [], []);

  // Derived metrics (Tenant Subscription metrics deferred to Phase 0.6)
  const metrics = useMemo<PlanDetailMetrics>(() => {
    return {
      totalTenants: 0,
      activeTenants: 0,
      trialTenants: 0,
      pastDueTenants: 0,
      suspendedTenants: 0,
      totalMrr: 0,
      arrProjection: 0,
    };
  }, []);

  return {
    plan,
    allModules,
    includedModules,
    planTenants,
    metrics,
    loading,
    error,
    refresh: fetchDetails,
  };
}
