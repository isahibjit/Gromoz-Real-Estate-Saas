import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Search,
  RotateCcw,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Archive,
  Layers,
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

import { usePlans } from '../../features/platform/catalog/plans/hooks/usePlans';
import { Plan } from '../../features/platform/catalog/plans/types/plan.types';
import { planService } from '../../features/platform/catalog/plans/services/plan.service';
import { usePlatformPermissions } from '../../features/platform/tenants/hooks/usePlatformPermissions';
import {
  formatCurrency,
  formatPlanMonthlyPrice,
  formatPlanAnnualPrice,
  getPlanStatusBadge,
} from '../../features/platform/catalog/plans/utils/plan-pricing.utils';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { DataTable, ColumnDef } from '../../components/ui/DataTable';

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#3B82F6'];

export function PlansPricingPage() {
  const navigate = useNavigate();
  const { plans, metrics, loading, error, refreshPlans } = usePlans();
  const { canCreatePlan, canUpdatePlan, canArchivePlan } = usePlatformPermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [selectedBilling, setSelectedBilling] = useState<string>('All');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Action Menu state
  const [activeMenuPlanId, setActiveMenuPlanId] = useState<string | null>(null);

  // Archive Confirmation Modal
  const [archivingPlan, setArchivingPlan] = useState<Plan | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === 'All' ? true : plan.status === selectedStatus;

      const matchesModel =
        selectedModel === 'All' ? true : plan.pricing.model === selectedModel;

      const matchesBilling =
        selectedBilling === 'All'
          ? true
          : selectedBilling === 'Monthly'
          ? plan.pricing.allowMonthlyBilling
          : selectedBilling === 'Annual'
          ? plan.pricing.allowAnnualBilling
          : plan.pricing.allowMonthlyBilling && plan.pricing.allowAnnualBilling;

      return matchesSearch && matchesStatus && matchesModel && matchesBilling;
    });
  }, [plans, searchTerm, selectedStatus, selectedModel, selectedBilling]);

  const paginatedPlans = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPlans.slice(start, start + pageSize);
  }, [filteredPlans, currentPage, pageSize]);

  // Actions
  const handleDuplicate = async (plan: Plan) => {
    setActiveMenuPlanId(null);
    try {
      const duplicated = await planService.duplicatePlan(plan.id);
      toast.success(`Plan '${plan.name}' duplicated as draft '${duplicated.name}'`);
      await refreshPlans();
      navigate(`/platform/plans/create?planId=${duplicated.id}`);
    } catch {
      toast.error('Failed to duplicate plan');
    }
  };

  const handleConfirmArchive = async () => {
    if (!archivingPlan) return;
    setIsArchiving(true);
    try {
      await planService.archivePlan(archivingPlan.id);
      toast.success(`Plan '${archivingPlan.name}' has been archived.`);
      await refreshPlans();
      setArchivingPlan(null);
    } catch {
      toast.error('Failed to archive plan');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleExportCatalog = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plans, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `plan-catalog-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Plan catalog exported as JSON payload file.');
    } catch {
      toast.error('Failed to export catalog');
    }
  };

  // Chart data for Adoption & MRR
  const pieChartData = useMemo(() => {
    return plans
      .map((p) => ({
        name: p.name,
        value: metrics.tenantsByPlan[p.id] || 0,
      }))
      .filter((d) => d.value > 0);
  }, [plans, metrics]);

  const barChartData = useMemo(() => {
    return plans.map((p) => ({
      name: p.name.replace(' Field', '').replace(' Suite', ''),
      mrr: metrics.mrrByPlan[p.id] || 0,
    }));
  }, [plans, metrics]);

  // Columns definition using reusable DataTable
  const columns: ColumnDef<Plan>[] = useMemo(
    () => [
      {
        header: '#',
        width: '48px',
        align: 'center',
        cell: (_, index) => (
          <span className="text-slate-500 font-semibold">
            {(currentPage - 1) * pageSize + index + 1}
          </span>
        ),
      },
      {
        header: 'Plan Name',
        cell: (plan) => (
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate(`/platform/plans/${plan.id}`)}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-white font-extrabold text-xs shadow-2xs"
              style={{ backgroundColor: plan.color || '#6366F1' }}
            >
              {plan.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#0D1F3D] group-hover:text-indigo-600 group-hover:underline flex items-center gap-1.5 truncate">
                {plan.name}
                {plan.badge && plan.badge !== 'None' && (
                  <span className="inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[9px] font-extrabold text-indigo-700 border border-indigo-100 shrink-0">
                    {plan.badge}
                  </span>
                )}
              </p>
              <p className="text-[11px] font-medium text-slate-600 truncate max-w-[220px]">
                {plan.description}
              </p>
            </div>
          </div>
        ),
      },
      {
        header: 'Plan Code',
        cell: (plan) => (
          <span className="font-mono text-xs font-bold text-[#0D1F3D]">{plan.code}</span>
        ),
      },
      {
        header: 'Status',
        cell: (plan) => {
          const badge = getPlanStatusBadge(plan.status);
          return (
            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold border ${badge.className}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        header: 'Pricing Model',
        cell: (plan) => <span className="text-slate-700 font-semibold">{plan.pricing.model}</span>,
      },
      {
        header: 'Monthly Price',
        cell: (plan) => (
          <span className="font-bold text-[#0D1F3D]">{formatPlanMonthlyPrice(plan.pricing)}</span>
        ),
      },
      {
        header: 'Annual Price',
        cell: (plan) => (
          <span className="font-bold text-emerald-700">{formatPlanAnnualPrice(plan.pricing)}</span>
        ),
      },
      {
        header: 'Min Seats',
        cell: (plan) => <span className="font-mono text-slate-800 font-bold">{plan.limits.minimumSeats}</span>,
      },
      {
        header: 'Default Seats',
        cell: (plan) => <span className="font-mono text-slate-800 font-bold">{plan.limits.defaultSeatLimit}</span>,
      },
      {
        header: 'Storage',
        cell: (plan) => <span className="text-slate-700 font-semibold">{plan.limits.storageGb} GB</span>,
      },
      {
        header: 'Modules',
        cell: (plan) => (
          <span className="text-indigo-700 font-bold">{plan.includedModuleCodes.length} modules</span>
        ),
      },
      {
        header: 'Trial',
        cell: (plan) => (
          <span className="text-slate-700 font-medium">
            {plan.commercialRules.trialEnabled ? `${plan.commercialRules.trialDurationDays} days` : 'No Trial'}
          </span>
        ),
      },
      {
        header: 'Tenants',
        cell: (plan) => {
          const tenantCount = metrics.tenantsByPlan[plan.id] || 0;
          return (
            <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-700 border border-slate-200">
              {tenantCount}
            </span>
          );
        },
      },
      {
        header: 'MRR',
        cell: (plan) => {
          const planMrr = metrics.mrrByPlan[plan.id] || 0;
          return <span className="font-mono font-bold text-[#0D1F3D]">{formatCurrency(planMrr)}</span>;
        },
      },
      {
        header: 'Actions',
        align: 'right',
        cell: (plan) => (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setActiveMenuPlanId(activeMenuPlanId === plan.id ? null : plan.id)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {activeMenuPlanId === plan.id && (
              <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-sm border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 font-sans text-left">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMenuPlanId(null);
                    navigate(`/platform/plans/${plan.id}`);
                  }}
                  className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4 text-blue-600" /> View Plan
                </button>
                {canUpdatePlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuPlanId(null);
                      navigate(`/platform/plans/create?planId=${plan.id}&step=basic`);
                    }}
                    className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Edit className="h-4 w-4 text-indigo-600" /> Edit Plan
                  </button>
                )}
                {canCreatePlan && (
                  <button
                    type="button"
                    onClick={() => handleDuplicate(plan)}
                    className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Copy className="h-4 w-4 text-emerald-600" /> Duplicate Plan
                  </button>
                )}
                {canArchivePlan && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMenuPlanId(null);
                      setArchivingPlan(plan);
                    }}
                    className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border-t border-slate-100"
                  >
                    <Archive className="h-4 w-4 text-rose-600" /> Archive Plan
                  </button>
                )}
              </div>
            )}
          </div>
        ),
      },
    ],
    [currentPage, pageSize, metrics, activeMenuPlanId, navigate, canCreatePlan, canUpdatePlan, canArchivePlan]
  );

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Plans & Pricing</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <CreditCard className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Manage commercial plans, pricing, limits, modules and tenant adoption across the Smart Field Work SaaS platform
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCatalog}
            className="gap-2 font-bold text-slate-700"
          >
            <Download className="h-4 w-4 text-slate-400" /> Export Catalog
          </Button>
          {canCreatePlan && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => navigate('/platform/plans/create?step=basic')}
              className="gap-2 font-bold shadow-xs"
            >
              <Plus className="h-4 w-4" /> Create Plan
            </Button>
          )}
        </div>
      </div>

      {/* Top 6 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard
          title="Total Plans"
          value={metrics.totalPlans.toString()}
          icon={Layers}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
        <KpiCard
          title="Active Plans"
          value={metrics.activePlans.toString()}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <KpiCard
          title="Draft Plans"
          value={metrics.draftPlans.toString()}
          icon={Clock}
          iconBgColor="bg-slate-100"
          iconTextColor="text-slate-600"
        />
        <KpiCard
          title="Active Subs"
          value={metrics.activeSubscriptions.toString()}
          icon={Users}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <KpiCard
          title="Trial Tenants"
          value={metrics.trialTenants.toString()}
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <KpiCard
          title="Total MRR"
          value={formatCurrency(metrics.totalMrr)}
          icon={TrendingUp}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
        />
      </div>

      {/* Filters Bar */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search plans by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#0D1F3D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-100 transition"
            />
          </div>

          <div className="w-40">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              searchable={true}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Archived', label: 'Archived' },
              ]}
            />
          </div>

          <div className="w-48">
            <Select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              searchable={true}
              options={[
                { value: 'All', label: 'All Pricing Models' },
                { value: 'Per User', label: 'Per User' },
                { value: 'Base + Per User', label: 'Base + Per User' },
                { value: 'Flat Monthly', label: 'Flat Monthly' },
                { value: 'Custom Contract', label: 'Custom Contract' },
              ]}
            />
          </div>

          <div className="w-44">
            <Select
              value={selectedBilling}
              onChange={(e) => setSelectedBilling(e.target.value)}
              searchable={true}
              options={[
                { value: 'All', label: 'All Billing Cycles' },
                { value: 'Monthly', label: 'Monthly Billing' },
                { value: 'Annual', label: 'Annual Billing' },
                { value: 'Both', label: 'Both Enabled' },
              ]}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setSelectedStatus('All');
              setSelectedModel('All');
              setSelectedBilling('All');
              setCurrentPage(1);
            }}
            className="gap-2 font-bold text-slate-700 h-10"
          >
            <RotateCcw className="h-4 w-4 text-slate-400" /> Reset
          </Button>
        </div>
      </div>

      {/* 100% Full-Width DataTable (Unconstrained Width & Spacing) */}
      <DataTable
        columns={columns}
        data={paginatedPlans}
        keyExtractor={(p) => p.id}
        isLoading={loading}
        emptyMessage="No commercial plans found matching filters."
        pagination={{
          currentPage,
          totalPages: Math.ceil(filteredPlans.length / pageSize) || 1,
          totalEntries: filteredPlans.length,
          pageSize,
          onPageChange: (page) => setCurrentPage(page),
        }}
      />

      {/* Bottom Analytics Cards Section (Moved below table to next line) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 font-sans">
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">Tenants by Plan</h3>
          <div className="flex items-center gap-4">
            <div className="relative h-28 w-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={2} dataKey="value">
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    wrapperStyle={{ zIndex: 100 }}
                    contentStyle={{ backgroundColor: '#0D1F3D', borderRadius: '4px', border: 'none', color: '#fff' }}
                    itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }}
                    formatter={(val: any) => [`${val} Tenants`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-extrabold text-[#0D1F3D]">{metrics.activeSubscriptions}</span>
                <span className="text-[9px] font-bold text-slate-600">Total</span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {plans.map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between text-[11px] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="text-slate-600 truncate max-w-[140px]">{p.name}</span>
                  </div>
                  <span className="text-[#0D1F3D] font-bold">{metrics.tenantsByPlan[p.id] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">MRR Contribution by Plan</h3>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: any) => [formatCurrency(Number(val) || 0), 'MRR']} />
                <Bar dataKey="mrr" fill="#6366F1" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Archive Confirmation Modal */}
      {archivingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-center font-sans">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0D1F3D]">Archive Commercial Plan</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Archived plans will no longer be available for new tenant subscriptions. Existing tenant records subscribed to{' '}
                <strong>{archivingPlan.name}</strong> are not deleted.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setArchivingPlan(null)}
                disabled={isArchiving}
                className="flex-1 font-bold justify-center"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleConfirmArchive}
                disabled={isArchiving}
                className="flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white justify-center"
              >
                {isArchiving ? 'Archiving...' : 'Archive Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
