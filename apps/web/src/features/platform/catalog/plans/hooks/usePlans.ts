import { useState, useEffect, useCallback } from 'react';
import { Plan } from '../types/plan.types';
import { planService } from '../services/plan.service';

export interface PlanMetrics {
  totalPlans: number;
  activePlans: number;
  draftPlans: number;
  archivedPlans: number;
  activeSubscriptions: number;
  trialTenants: number;
  totalMrr: number;
  tenantsByPlan: Record<string, number>;
  mrrByPlan: Record<string, number>;
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [metrics, setMetrics] = useState<PlanMetrics>({
    totalPlans: 0,
    activePlans: 0,
    draftPlans: 0,
    archivedPlans: 0,
    activeSubscriptions: 0,
    trialTenants: 0,
    totalMrr: 0,
    tenantsByPlan: {},
    mrrByPlan: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlansAndMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allPlans = await planService.getPlans();

      const activePlans = allPlans.filter((p) => p.status === 'Active').length;
      const draftPlans = allPlans.filter((p) => p.status === 'Draft').length;
      const archivedPlans = allPlans.filter((p) => p.status === 'Archived').length;

      const tenantsByPlan: Record<string, number> = {};
      const mrrByPlan: Record<string, number> = {};

      allPlans.forEach((p) => {
        tenantsByPlan[p.id] = 0;
        mrrByPlan[p.id] = 0;
      });

      setPlans(allPlans);
      setMetrics({
        totalPlans: allPlans.length,
        activePlans,
        draftPlans,
        archivedPlans,
        activeSubscriptions: 0, // Subscription & MRR authority deferred to Phase 0.6
        trialTenants: 0,
        totalMrr: 0,
        tenantsByPlan,
        mrrByPlan,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlansAndMetrics();
  }, [fetchPlansAndMetrics]);

  return {
    plans,
    metrics,
    loading,
    error,
    refreshPlans: fetchPlansAndMetrics,
  };
}
