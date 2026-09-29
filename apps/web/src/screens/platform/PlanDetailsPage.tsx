import React from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Layers, AlertTriangle } from 'lucide-react';
import { usePlanDetails } from '../../features/platform/catalog/plans/hooks/usePlanDetails';
import { PlanDetailHeader } from '../../features/platform/catalog/plans/components/PlanDetailHeader';
import { PlanDetailTabs } from '../../features/platform/catalog/plans/components/PlanDetailTabs';
import { PlanOverviewTab } from '../../features/platform/catalog/plans/components/detail/PlanOverviewTab';
import { PlanPricingTab } from '../../features/platform/catalog/plans/components/detail/PlanPricingTab';
import { PlanLimitsTab } from '../../features/platform/catalog/plans/components/detail/PlanLimitsTab';
import { PlanModulesTab } from '../../features/platform/catalog/plans/components/detail/PlanModulesTab';
import { PlanTenantsTab } from '../../features/platform/catalog/plans/components/detail/PlanTenantsTab';
import { PlanVersionHistoryTab } from '../../features/platform/catalog/plans/components/detail/PlanVersionHistoryTab';
import { Button } from '../../components/ui/Button';

export function PlanDetailsPage() {
  const { planId } = useParams<{ planId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const { plan, allModules, includedModules, planTenants, metrics, loading, error, refresh } =
    usePlanDetails(planId);

  // Determine active tab from URL path
  const activeTab = React.useMemo(() => {
    const p = location.pathname;
    if (p.endsWith('/pricing')) return 'pricing';
    if (p.endsWith('/limits')) return 'limits';
    if (p.endsWith('/modules')) return 'modules';
    if (p.endsWith('/tenants')) return 'tenants';
    if (p.endsWith('/versions')) return 'versions';
    return 'overview';
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0D1F3D]" />
          <span className="text-xs font-semibold text-slate-500">Loading plan configuration...</span>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-4 font-sans">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#0D1F3D]">Plan Not Found</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {error || `The requested commercial plan '${planId}' does not exist or has been removed.`}
          </p>
        </div>
        <Button
          variant="accent"
          size="sm"
          onClick={() => navigate('/platform/plans')}
          className="font-bold shadow-xs mx-auto"
        >
          Back to Plans Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Shared Header Shell */}
      <PlanDetailHeader plan={plan} activeTab={activeTab} onRefresh={refresh} />

      {/* Shared Tab Navigation Bar */}
      <PlanDetailTabs
        planId={plan.id}
        tenantCount={planTenants.length}
        moduleCount={includedModules.length}
      />

      {/* Sub-tab Page Renders */}
      <div className="pt-2">
        {activeTab === 'overview' && (
          <PlanOverviewTab
            plan={plan}
            includedModules={includedModules}
            planTenants={planTenants}
            metrics={metrics}
          />
        )}

        {activeTab === 'pricing' && <PlanPricingTab plan={plan} metrics={metrics} />}

        {activeTab === 'limits' && <PlanLimitsTab plan={plan} />}

        {activeTab === 'modules' && (
          <PlanModulesTab
            plan={plan}
            allModules={allModules}
            includedModules={includedModules}
          />
        )}

        {activeTab === 'tenants' && (
          <PlanTenantsTab plan={plan} planTenants={planTenants} metrics={metrics} />
        )}

        {activeTab === 'versions' && <PlanVersionHistoryTab plan={plan} />}
      </div>
    </div>
  );
}
