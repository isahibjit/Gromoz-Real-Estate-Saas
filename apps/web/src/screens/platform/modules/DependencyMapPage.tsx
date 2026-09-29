import React, { useState, useEffect, useMemo } from 'react';
import {
  GitBranch,
  Search,
  RefreshCw,
  Package,
  Layers,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  LayoutGrid,
  Table,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { KpiCard } from '../../../components/dashboard/KpiCard';
import { ModuleSectionNavigation } from '../../../components/platform/ModuleSectionNavigation';
import { moduleService } from '../../../features/platform/catalog/modules/services/module.service';
import { PlatformModule, PlatformModuleCategory } from '../../../features/platform/catalog/modules/types/module.types';
import { toast } from 'react-hot-toast';

const categoryLabel: Record<PlatformModuleCategory, string> = {
  CORE: 'Core Infrastructure',
  SALES: 'Sales Engine',
  FIELD_OPS: 'Field Operations',
  AUTOMATION: 'Automation & AI',
  ENTERPRISE: 'Enterprise Suite',
};

import { ModuleCategoryBadge } from '../../../features/platform/catalog/modules/components/ModuleCategoryBadge';

export function DependencyMapPage() {
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'matrix'>('grid');

  const fetchCatalog = async () => {
    setError(null);
    try {
      const data = await moduleService.getModules({ limit: 100 });
      setModules(data);
    } catch {
      setError('Unable to load dependency graph. Service unreachable.');
      toast.error('Failed to fetch module dependency map from platform service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCatalog();
  };

  // Metrics
  const metrics = useMemo(() => {
    let totalLinks = 0;
    let rootCount = 0;
    let dependentCount = 0;

    for (const m of modules) {
      const parentDeps = m.dependencyCodes || [];
      const childDeps = m.dependentCodes || [];
      totalLinks += parentDeps.length;
      if (parentDeps.length === 0) rootCount++;
      if (childDeps.length > 0) dependentCount++;
    }

    return {
      totalModules: modules.length,
      totalLinks,
      rootCount,
      dependentCount,
    };
  }, [modules]);

  const filteredModules = useMemo(() => {
    return modules.filter((m) => {
      const matchesSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        m.code.toLowerCase().includes(search.toLowerCase().trim());

      const matchesCat =
        selectedCategory === 'ALL' || m.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [modules, search, selectedCategory]);

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Modules & Features</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <GitBranch className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Prerequisite dependency graph and downstream module relationship explorer.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 font-bold text-slate-700 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh Dependency Map
          </Button>
        </div>
      </div>

      {/* Section Navigation */}
      <ModuleSectionNavigation />

      {/* Filter Toolbar & View Mode Switcher */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search module name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="col-span-12 sm:col-span-4">
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'CORE', label: 'Core Infrastructure' },
                { value: 'SALES', label: 'Sales Engine' },
                { value: 'FIELD_OPS', label: 'Field Operations' },
                { value: 'AUTOMATION', label: 'Automation & AI' },
                { value: 'ENTERPRISE', label: 'Enterprise Suite' },
              ]}
            />
          </div>

          <div className="col-span-12 sm:col-span-3 flex items-center justify-end gap-2">
            <div className="flex items-center rounded-sm border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xs transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#0D1F3D] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xs transition-colors ${
                  viewMode === 'matrix'
                    ? 'bg-white text-[#0D1F3D] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Table className="h-3.5 w-3.5" />
                Matrix
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('ALL');
              }}
              className="font-bold text-slate-600 justify-center"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Dependency Graph View */}
      {error ? (
        <div className="rounded-sm border border-rose-200 bg-white p-8 text-center space-y-3 max-w-md mx-auto shadow-xs">
          <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-extrabold text-[#0D1F3D]">Unable to Load Dependency Map</h3>
          <p className="text-xs text-slate-500 font-medium">{error}</p>
          <Button variant="accent" size="sm" onClick={handleRefresh} className="font-extrabold bg-indigo-600 text-white">
            Retry Loading
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredModules.map((mod) => {
            const parents = mod.dependencyCodes || [];
            const dependents = mod.dependentCodes || [];

            return (
              <div
                key={mod.code}
                className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 font-sans"
              >
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-[#0D1F3D]">{mod.name}</h4>
                        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-sm border border-indigo-200 inline-block mt-0.5">
                          {mod.code}
                        </span>
                      </div>
                    </div>
                    <ModuleCategoryBadge category={mod.category} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
                    {/* Prerequisite Parent Requirements */}
                    <div className="space-y-2">
                      <span className="text-xs font-extrabold text-[#0D1F3D] flex items-center gap-1.5">
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-600" />
                        Required Parents ({parents.length}):
                      </span>
                      {parents.length > 0 ? (
                        <div className="space-y-1">
                          {parents.map((pCode) => (
                            <div
                              key={pCode}
                              className="px-2.5 py-1.5 rounded-sm bg-indigo-50/70 border border-indigo-200 text-xs font-mono font-bold text-indigo-800 flex items-center justify-between shadow-2xs"
                            >
                              <span>{pCode}</span>
                              <ArrowRight className="h-3 w-3 text-indigo-600" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-semibold italic bg-slate-50 p-2 rounded-sm border border-slate-100">
                          Root Module (No Prerequisite Parents)
                        </p>
                      )}
                    </div>

                    {/* Downstream Dependents */}
                    <div className="space-y-2">
                      <span className="text-xs font-extrabold text-[#0D1F3D] flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-purple-600" />
                        Downstream Dependents ({dependents.length}):
                      </span>
                      {dependents.length > 0 ? (
                        <div className="space-y-1">
                          {dependents.map((dCode) => (
                            <div
                              key={dCode}
                              className="px-2.5 py-1.5 rounded-sm bg-purple-50/70 border border-purple-200 text-xs font-mono font-bold text-purple-800 flex items-center justify-between shadow-2xs"
                            >
                              <span>{dCode}</span>
                              <CheckCircle className="h-3 w-3 text-purple-600" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 font-semibold italic bg-slate-50 p-2 rounded-sm border border-slate-100">
                          No Downstream Dependents
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Matrix View Table */
        <div className="rounded-sm border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-[#0D1F3D] uppercase tracking-normal">
                  <th className="p-3.5">Module Name & Code</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Prerequisite Parents</th>
                  <th className="p-3.5">Downstream Dependents</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredModules.map((mod) => {
                  const parents = mod.dependencyCodes || [];
                  const dependents = mod.dependentCodes || [];

                  return (
                    <tr key={mod.code} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5">
                        <p className="font-extrabold text-[#0D1F3D]">{mod.name}</p>
                        <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-200 inline-block mt-0.5">
                          {mod.code}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <ModuleCategoryBadge category={mod.category} />
                      </td>
                      <td className="p-3.5">
                        {parents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {parents.map((pCode) => (
                              <span key={pCode} className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-200">
                                {pCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold italic text-[11px]">None (Root)</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {dependents.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {dependents.map((dCode) => (
                              <span key={dCode} className="font-mono text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-sm border border-purple-200">
                                {dCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold italic text-[11px]">None</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics KPI Row at Bottom */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <KpiCard
          title="Total Catalog Modules"
          value={metrics.totalModules}
          icon={Package}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <KpiCard
          title="Dependency Links"
          value={metrics.totalLinks}
          icon={GitBranch}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
        <KpiCard
          title="Root Parent Modules"
          value={metrics.rootCount}
          icon={ShieldCheck}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <KpiCard
          title="Dependent Modules"
          value={metrics.dependentCount}
          icon={Layers}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
        />
      </div>
    </div>
  );
}

