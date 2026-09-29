import React, { useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useModuleDetails } from '../../../features/platform/catalog/modules/hooks/useModuleDetails';
import { ModuleDetailHeader } from '../../../features/platform/catalog/modules/components/ModuleDetailHeader';
import { ModuleDetailTabs } from '../../../features/platform/catalog/modules/components/ModuleDetailTabs';
import { ModuleOverviewTab } from '../../../features/platform/catalog/modules/components/detail/ModuleOverviewTab';
import { ModuleFeaturesTab } from '../../../features/platform/catalog/modules/components/detail/ModuleFeaturesTab';
import { ModuleDependenciesTab } from '../../../features/platform/catalog/modules/components/detail/ModuleDependenciesTab';
import { ModuleHistoryTab } from '../../../features/platform/catalog/modules/components/detail/ModuleHistoryTab';

export function ModuleDetailPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const location = useLocation();
  const { module, historyLogs, loading, refresh } = useModuleDetails(moduleId);

  const activeTab = useMemo(() => {
    const p = location.pathname;
    if (p.endsWith('/features')) return 'features';
    if (p.endsWith('/dependencies')) return 'dependencies';
    if (p.endsWith('/history')) return 'history';
    return 'overview';
  }, [location.pathname]);

  if (loading || !module) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center font-sans space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0D1F3D]" />
        <p className="text-xs font-semibold text-slate-500">
          Loading module details...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* 1. Module Header (Internal Breadcrumbs Removed) */}
      <ModuleDetailHeader module={module} onRefresh={refresh} />

      {/* 2. Active-Underline Tabs (Matching PlanDetailTabs UX) */}
      <ModuleDetailTabs
        moduleId={module.id}
        featureCount={module.features?.length || 0}
        dependencyCount={module.dependencyCodes?.length || 0}
      />

      {/* 3. Tab Content Composition */}
      {activeTab === 'overview' && <ModuleOverviewTab module={module} />}
      {activeTab === 'features' && <ModuleFeaturesTab module={module} />}
      {activeTab === 'dependencies' && <ModuleDependenciesTab module={module} />}
      {activeTab === 'history' && (
        <ModuleHistoryTab module={module} historyLogs={historyLogs} />
      )}
    </div>
  );
}
