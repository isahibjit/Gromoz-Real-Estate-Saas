import React, { useCallback, useEffect, useState } from 'react';
import {
  Archive,
  Boxes,
  CheckCircle2,
  GitBranch,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  Puzzle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { DataTable } from '../../../components/ui/DataTable';
import { Input } from '../../../components/ui/Input';
import { KpiCard } from '../../../components/dashboard/KpiCard';
import { RowActionsMenu } from '../../../components/ui/RowActionsMenu';
import { Select } from '../../../components/ui/Select';
import { ModuleSectionNavigation } from '../../../components/platform/ModuleSectionNavigation';
import {
  moduleService,
  PaginatedModulesResponse,
} from '../../../features/platform/catalog/modules/services/module.service';
import {
  PlatformModule,
  PlatformModuleCategory,
  PlatformModuleStatus,
} from '../../../features/platform/catalog/modules/types/module.types';
import { ModuleCategoryBadge } from '../../../features/platform/catalog/modules/components/ModuleCategoryBadge';
import { ModuleStatusBadge } from '../../../features/platform/catalog/modules/components/ModuleStatusBadge';
import { usePlatformPermissions } from '../../../features/platform/tenants/hooks/usePlatformPermissions';

const categoryLabel: Record<PlatformModuleCategory, string> = {
  CORE: 'Core Infrastructure',
  SALES: 'Sales Engine',
  FIELD_OPS: 'Field Operations',
  AUTOMATION: 'Automation & AI',
  ENTERPRISE: 'Enterprise Suite',
};

const categoryBadgeColor: Record<PlatformModuleCategory, string> = {
  CORE: 'bg-blue-50 text-blue-700 border-blue-200',
  SALES: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  FIELD_OPS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  AUTOMATION: 'bg-purple-50 text-purple-700 border-purple-200',
  ENTERPRISE: 'bg-amber-50 text-amber-800 border-amber-200',
};

export function ModulesFeaturesPage() {
  const navigate = useNavigate();
  const { canUpdateModule, canArchiveModule } =
    usePlatformPermissions();

  const [result, setResult] = useState<PaginatedModulesResponse>({
    data: [],
    meta: { total: 0, page: 1, limit: 20, totalPages: 1 },
  });

  const [summary, setSummary] = useState({
    totalModules: 0,
    activeModules: 0,
    registeredFeatures: 0,
    dependencyLinks: 0,
  });

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PlatformModuleCategory | ''>('');
  const [status, setStatus] = useState<PlatformModuleStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (page = result.meta.page) => {
      setLoading(true);
      setError(null);
      try {
        const [modules, counts] = await Promise.all([
          moduleService.getModulesPaginated({
            page,
            limit: 20,
            search: search || undefined,
            category: category || undefined,
            status: status || undefined,
          }),
          moduleService.getSummary(),
        ]);
        setResult(modules);
        setSummary(counts);
      } catch {
        setError('Unable to reach Platform Modules service.');
        toast.error('Unable to load the platform modules catalog.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, result.meta.page, search, status],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const changeStatus = async (module: PlatformModule, archived: boolean) => {
    try {
      if (archived) await moduleService.archiveModule(module.id);
      else await moduleService.restoreModule(module.id);
      toast.success(archived ? 'Module archived.' : 'Module restored.');
      await load();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error(message ?? 'The module lifecycle change was not saved.');
    }
  };

  const columns = [
    {
      header: 'Module Details',
      cell: (module: PlatformModule) => (
        <button
          type="button"
          onClick={() => navigate(`/platform/modules/${module.id}`)}
          className="flex items-center gap-3 text-left group"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-slate-200 bg-slate-50 text-[#0D1F3D] group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
            <Package className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-extrabold text-[#0D1F3D] text-xs group-hover:text-indigo-600 transition-colors">
              {module.name}
            </span>
            <span className="block max-w-xs truncate text-[11px] font-medium text-slate-500">
              {module.description}
            </span>
          </span>
        </button>
      ),
    },
    {
      header: 'Code',
      cell: (module: PlatformModule) => (
        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">
          {module.code}
        </span>
      ),
    },
    {
      header: 'Category',
      cell: (module: PlatformModule) => (
        <ModuleCategoryBadge category={module.category} />
      ),
    },
    {
      header: 'Features',
      cell: (module: PlatformModule) => (
        <span className="text-xs font-bold text-slate-700">
          {module.features ? module.features.length : 0} Features
        </span>
      ),
    },
    {
      header: 'Dependencies',
      cell: (module: PlatformModule) => {
        const deps = module.dependencyCodes || [];
        if (deps.length === 0) {
          return <span className="text-xs text-slate-400 font-medium italic">None</span>;
        }
        if (deps.length === 1) {
          return (
            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-100">
              {deps[0]}
            </span>
          );
        }
        return (
          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-100">
            {deps[0]} +{deps.length - 1}
          </span>
        );
      },
    },
    {
      header: 'Status',
      cell: (module: PlatformModule) => (
        <ModuleStatusBadge status={module.status} />
      ),
    },
    {
      header: 'Updated',
      cell: (module: PlatformModule) => (
        <span className="text-xs text-slate-600 font-medium">
          {new Date(module.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (module: PlatformModule) => (
        <RowActionsMenu
          items={[
            {
              label: 'View Details',
              onClick: () => navigate(`/platform/modules/${module.id}`),
            },
            {
              label: 'Edit Metadata',
              onClick: () => navigate(`/platform/modules/${module.id}/edit`),
            },
            {
              label: 'View Audit History',
              onClick: () => navigate(`/platform/modules/${module.id}/history`),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Modules & Features</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Puzzle className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Browse predefined Smart Field Work platform capability modules and registered software features.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 font-bold text-slate-700 bg-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Section Navigation */}
      <ModuleSectionNavigation />

      {/* Filter Toolbar */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-12 gap-3 items-center">
          <div className="col-span-12 sm:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by module name, code or capability..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="col-span-12 sm:col-span-3">
            <Select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as PlatformModuleCategory | '')
              }
              options={[
                { value: '', label: 'All Categories' },
                ...Object.entries(categoryLabel).map(([val, lbl]) => ({
                  value: val,
                  label: lbl,
                })),
              ]}
            />
          </div>

          <div className="col-span-12 sm:col-span-2">
            <Select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as PlatformModuleStatus | '')
              }
              options={[
                { value: '', label: 'All Statuses' },
                ...([
                  'DRAFT',
                  'ACTIVE',
                  'BETA',
                  'DEPRECATED',
                  'ARCHIVED',
                ] as PlatformModuleStatus[]).map((val) => ({
                  value: val,
                  label: val,
                })),
              ]}
            />
          </div>

          <div className="col-span-12 sm:col-span-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch('');
                setCategory('');
                setStatus('');
              }}
              className="w-full font-bold text-slate-600 justify-center"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* API Error State vs Data Table */}
      {error ? (
        <div className="rounded-sm border border-rose-200 bg-white p-8 text-center space-y-3 max-w-md mx-auto shadow-xs">
          <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
          <h3 className="text-base font-extrabold text-[#0D1F3D]">
            Unable to Load Modules Catalog
          </h3>
          <p className="text-xs text-slate-500 font-medium">{error}</p>
          <Button
            variant="accent"
            size="sm"
            onClick={handleRefresh}
            className="font-extrabold bg-indigo-600 text-white"
          >
            Retry Connecting
          </Button>
        </div>
      ) : (
        <div className="rounded-sm border border-slate-200 bg-white shadow-xs">
          <DataTable
            data={result.data}
            columns={columns}
            isLoading={loading}
            emptyMessage={
              search || category || status
                ? 'No modules match your selected filters. Try clearing or adjusting search parameters.'
                : 'Module Catalog Is Empty — The predefined Smart Field Work capability catalog has not been synchronized.'
            }
            pagination={{
              currentPage: result.meta.page,
              totalPages: result.meta.totalPages,
              onPageChange: (page) => void load(page),
            }}
          />
        </div>
      )}

      {/* Analytics KPI Cards Row (Positioned strictly below main table) */}
      <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Total Modules"
          value={summary.totalModules}
          icon={Layers}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <KpiCard
          title="Active Modules"
          value={summary.activeModules}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <KpiCard
          title="Registered Features"
          value={summary.registeredFeatures}
          icon={Boxes}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
        />
        <KpiCard
          title="Dependency Links"
          value={summary.dependencyLinks}
          icon={GitBranch}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
      </div>
    </div>
  );
}
