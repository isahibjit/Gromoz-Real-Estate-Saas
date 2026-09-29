import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Boxes,
  Search,
  RefreshCw,
  Code,
  Smartphone,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { DataTable } from '../../../components/ui/DataTable';
import { ModuleSectionNavigation } from '../../../components/platform/ModuleSectionNavigation';
import { moduleService } from '../../../features/platform/catalog/modules/services/module.service';
import {
  PlatformModule,
  ModuleFeature,
  FeatureImplementationMaturity,
} from '../../../features/platform/catalog/modules/types/module.types';
import { toast } from 'react-hot-toast';

export function FeatureRegistryPage() {
  const [modules, setModules] = useState<PlatformModule[]>([]);
  const [features, setFeatures] = useState<ModuleFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const fetchFeatures = useCallback(async () => {
    setError(null);
    try {
      const [featRes, modRes] = await Promise.all([
        moduleService.getFeatures({
          search: search.trim() || undefined,
          moduleCode: selectedModule !== 'ALL' ? selectedModule : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          limit: 100,
        }),
        moduleService.getModules({ limit: 100 }),
      ]);
      setFeatures(featRes.data);
      setModules(modRes);
    } catch {
      setError('Unable to load feature registry. Service unreachable.');
      toast.error('Failed to fetch feature registry from platform service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedModule, selectedStatus]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchFeatures();
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [fetchFeatures]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchFeatures();
  };

  const moduleOptions = useMemo(() => {
    const opts = [{ value: 'ALL', label: 'All Parent Modules' }];
    for (const m of modules) {
      opts.push({ value: m.code, label: `${m.name} (${m.code})` });
    }
    return opts;
  }, [modules]);

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Feature Registry</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Boxes className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Code-backed software capabilities registered across Smart Field Work.
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
            Refresh Registry
          </Button>
        </div>
      </div>

      {/* Section Navigation */}
      <ModuleSectionNavigation />

      {/* Developer Registered Banner */}
      <div className="rounded-sm border border-indigo-100 bg-indigo-50/60 p-4 text-xs font-medium text-indigo-900 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Code className="h-4 w-4 text-indigo-600 shrink-0" />
          <span>
            <strong>Developer Registered Capabilities:</strong> Features represent implemented software logic and capabilities bundled inside platform modules.
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-indigo-100 text-indigo-800 shrink-0">
          Code-Backed Registry
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search feature name, code or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <Select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              options={moduleOptions}
            />
          </div>

          <div className="col-span-12 sm:col-span-2">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'ACTIVE' },
                { value: 'BETA', label: 'BETA' },
                { value: 'DEPRECATED', label: 'DEPRECATED' },
              ]}
            />
          </div>

          <div className="col-span-12 sm:col-span-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setSelectedModule('ALL');
                setSelectedStatus('ALL');
              }}
              className="w-full font-bold text-slate-600 justify-center"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* API Error State */}
      {error ? (
        <div className="rounded-sm border border-rose-200 bg-white p-8 text-center space-y-3 max-w-md mx-auto shadow-xs">
          <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-extrabold text-[#0D1F3D]">Unable to Load Feature Registry</h3>
          <p className="text-xs text-slate-500 font-medium">{error}</p>
          <Button variant="accent" size="sm" onClick={handleRefresh} className="font-extrabold bg-indigo-600 text-white">
            Retry Loading
          </Button>
        </div>
      ) : (
        <DataTable<ModuleFeature>
          data={features}
          isLoading={loading}
          keyExtractor={(item) => item.id || `${item.code}`}
          emptyMessage={
            search || selectedModule !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No registered features match your selected search or filters.'
              : 'No coded features are registered in the platform catalog yet.'
          }
          columns={[
            {
              header: 'Feature Name & Description',
              cell: (item) => (
                <div className="min-w-[200px]">
                  <p className="font-extrabold text-[#0D1F3D] text-xs">{item.name}</p>
                  <p className="text-[11px] font-medium text-slate-500 truncate max-w-xs">{item.description}</p>
                </div>
              ),
            },
            {
              header: 'Feature Code',
              cell: (item) => (
                <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">
                  {item.code}
                </span>
              ),
            },
            {
              header: 'Implementation Key',
              cell: (item) => (
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-sm border border-indigo-200">
                  {item.implementationKey || item.code}
                </span>
              ),
            },
            {
              header: 'Parent Module',
              cell: (item) => (
                <div>
                  <span className="font-extrabold text-xs text-[#0D1F3D] block">{item.module?.name || '—'}</span>
                  <span className="font-mono text-[10px] font-bold text-slate-500">{item.module?.code || ''}</span>
                </div>
              ),
            },
            {
              header: 'Implementation Maturity',
              cell: (item) => {
                const mat: FeatureImplementationMaturity = item.maturity || 'DECLARED';
                const colorMap: Record<FeatureImplementationMaturity, string> = {
                  FULL_STACK_READY: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  BACKEND_READY: 'bg-teal-50 text-teal-700 border-teal-200',
                  BACKEND_PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
                  UI_READY: 'bg-blue-50 text-blue-700 border-blue-200',
                  DECLARED: 'bg-slate-100 text-slate-600 border-slate-200',
                };
                return (
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-sm border ${colorMap[mat] || colorMap.DECLARED}`}>
                    {mat.replace('_', ' ')}
                  </span>
                );
              },
            },
            {
              header: 'Platform Support',
              cell: (item) => (
                <div className="flex items-center gap-1.5">
                  {(item.supportsWeb ?? true) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-slate-50 text-slate-700 border border-slate-200" title="Supports Web Application">
                      <Globe className="h-3 w-3" /> Web
                    </span>
                  )}
                  {(item.supportsMobile ?? true) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200" title="Supports Mobile App">
                      <Smartphone className="h-3 w-3" /> Mobile
                    </span>
                  )}
                </div>
              ),
            },
            {
              header: 'Status',
              cell: (item) => (
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-sm border ${
                    item.status === 'DEPRECATED'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : item.status === 'BETA'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {item.status}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
