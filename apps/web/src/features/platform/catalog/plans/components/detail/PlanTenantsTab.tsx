import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Download,
  IndianRupee,
  Building2,
  Clock,
  MoreVertical,
  CheckCircle,
  Eye,
  Edit,
  Mail,
  ShieldCheck,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Plan } from '../../types/plan.types';
import { Tenant } from '../../../../tenants/types/platform.types';
import { PlanDetailMetrics } from '../../hooks/usePlanDetails';
import { KpiCard } from '../../../../../../components/dashboard/KpiCard';
import { formatCurrency } from '../../utils/plan-pricing.utils';
import { DataTable, ColumnDef } from '../../../../../../components/ui/DataTable';
import { Select } from '../../../../../../components/ui/Select';
import { Button } from '../../../../../../components/ui/Button';

export interface PlanTenantsTabProps {
  plan: Plan;
  planTenants: Tenant[];
  metrics: PlanDetailMetrics;
}

const DONUT_COLORS: Record<string, string> = {
  Active: '#3B82F6',
  Trial: '#F59E0B',
  Suspended: '#8B5CF6',
  'Past Due': '#F97316',
};

export function PlanTenantsTab({ plan, planTenants, metrics }: PlanTenantsTabProps) {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [billingFilter, setBillingFilter] = useState('All');
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  const filteredTenants = useMemo(() => {
    return planTenants.filter((t) => {
      const q = searchTerm.toLowerCase().trim();
      const contactName = t.adminUser?.fullName || '';
      const contactEmail = t.adminUser?.email || '';

      const matchSearch =
        q === '' ||
        t.companyName.toLowerCase().includes(q) ||
        (t.domain && t.domain.toLowerCase().includes(q)) ||
        contactName.toLowerCase().includes(q) ||
        contactEmail.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'All' || t.tenantStatus === statusFilter;
      const matchBilling =
        billingFilter === 'All' ||
        (billingFilter === 'Paid' ? (t.mrr || 0) > 0 : (t.mrr || 0) === 0);

      return matchSearch && matchStatus && matchBilling;
    });
  }, [planTenants, searchTerm, statusFilter, billingFilter]);

  // Average Seats per Tenant calculation
  const avgSeats = useMemo(() => {
    if (!planTenants || planTenants.length === 0) return 0;
    const totalUsers = planTenants.reduce(
      (acc, curr) => acc + (curr.usage?.usersUsed ?? curr.userLicensesCount ?? 0),
      0
    );
    return Math.round(totalUsers / planTenants.length);
  }, [planTenants]);

  // Donut chart data
  const donutData = useMemo(() => {
    return [
      { name: 'Active', value: metrics.activeTenants, color: DONUT_COLORS.Active },
      { name: 'Trial', value: metrics.trialTenants, color: DONUT_COLORS.Trial },
      { name: 'Suspended', value: metrics.suspendedTenants, color: DONUT_COLORS.Suspended },
      { name: 'Past Due', value: metrics.pastDueTenants, color: DONUT_COLORS['Past Due'] },
    ];
  }, [metrics]);

  // Top tenants by MRR from real data
  const topTenants = useMemo(() => {
    if (!planTenants || planTenants.length === 0) return [];
    return [...planTenants]
      .sort((a, b) => (b.mrr || 0) - (a.mrr || 0))
      .slice(0, 5);
  }, [planTenants]);

  // Table Columns
  const columns: ColumnDef<Tenant>[] = [
    {
      header: 'Tenant Name',
      accessorKey: 'companyName',
      cell: (t: Tenant) => (
        <div
          onClick={() => navigate(`/platform/tenants/${t.id}`)}
          className="flex items-center gap-3 min-w-[200px] cursor-pointer group select-none"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0D1F3D] text-white font-extrabold text-xs transition-colors group-hover:bg-[#E20613]">
            {t.companyName ? t.companyName[0] : 'T'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-[#0D1F3D] group-hover:text-[#E20613] group-hover:underline truncate transition-colors">
              {t.companyName}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              {t.domain || `${t.companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.visiblosfw.com`}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'tenantStatus',
      cell: (t: Tenant) => (
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
            t.tenantStatus === 'Active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : t.tenantStatus === 'Trial'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-purple-50 text-purple-700 border-purple-200'
          }`}
        >
          {t.tenantStatus}
        </span>
      ),
    },
    {
      header: 'Seats Usage',
      cell: (t: Tenant) => {
        const used = t.usage?.usersUsed ?? 0;
        const limit = Number(t.seatLimit) || t.userLicensesCount || plan.limits.defaultSeatLimit;
        const percent = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;

        return (
          <div className="min-w-[130px] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#0D1F3D]">
              <span>{used} / {limit}</span>
              <span className="text-slate-500 font-semibold">{percent}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  percent > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 font-semibold block">{percent}% used</span>
          </div>
        );
      },
    },
    {
      header: 'MRR',
      cell: (t: Tenant) => {
        const amount = t.mrr || 0;
        return (
          <div className="min-w-[100px]">
            <span className="font-extrabold text-[#0D1F3D] text-xs block">
              {amount > 0 ? formatCurrency(amount, plan.pricing.currency) : '₹0'}
            </span>
            <span className="text-[10px] text-slate-500 font-semibold block">{amount > 0 ? 'Monthly' : 'Trial'}</span>
          </div>
        );
      },
    },
    {
      header: 'Subscribed Date',
      cell: (t: Tenant) => {
        const dateStr = t.subscriptionStartDate || t.createdAt;
        return (
          <div className="min-w-[110px]">
            <span className="font-semibold text-slate-700 text-xs block">
              {dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Primary Contact',
      cell: (t: Tenant) => (
        <div className="min-w-[150px]">
          <p className="font-extrabold text-[#0D1F3D] text-xs truncate">{t.adminUser?.fullName || '—'}</p>
          <p className="text-[10px] text-slate-500 font-medium truncate">{t.adminUser?.email || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (t: Tenant) => (
        <div className="relative text-right">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveRowMenu(activeRowMenu === t.id ? null : t.id);
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {activeRowMenu === t.id && (
            <div className="absolute right-0 top-9 z-30 w-44 rounded-sm border border-slate-200 bg-white p-1 shadow-xl text-left font-sans animate-in fade-in">
              <button
                type="button"
                onClick={() => {
                  setActiveRowMenu(null);
                  navigate(`/platform/tenants/${t.id}`);
                }}
                className="flex w-full items-center gap-2 rounded-xs px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-blue-600" /> View Tenant
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRowMenu(null);
                  navigate(`/platform/tenants/${t.id}/edit`);
                }}
                className="flex w-full items-center gap-2 rounded-xs px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5 text-indigo-600" /> Edit Details
              </button>
              <button
                type="button"
                onClick={() => setActiveRowMenu(null)}
                className="flex w-full items-center gap-2 rounded-xs px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5 text-purple-600" /> Contact Admin
              </button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-sans w-full max-w-full overflow-hidden">
      {/* Top Banner Context */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold text-[#0D1F3D]">Plan Tenants</h3>
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              {metrics.totalTenants} Subscribed
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            All active, trial and legacy tenants subscribed to this plan.
          </p>
        </div>
      </div>

      {/* Top 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          title="Total Subscriptions"
          value={metrics.totalTenants.toString()}
          subValue="All time"
          icon={Building2}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-600"
        />
        <KpiCard
          title="Active Tenants"
          value={metrics.activeTenants.toString()}
          subValue="Paying active"
          icon={Users}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <KpiCard
          title="Trial Tenants"
          value={metrics.trialTenants.toString()}
          subValue="In trial period"
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <KpiCard
          title="Total MRR"
          value={formatCurrency(metrics.totalMrr, plan.pricing.currency)}
          subValue="Monthly revenue"
          icon={IndianRupee}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-600"
        />
        <KpiCard
          title="Avg Seats / Tenant"
          value={avgSeats > 0 ? avgSeats.toString() : '—'}
          subValue="Seat utilization"
          icon={Users}
          iconBgColor="bg-cyan-50"
          iconTextColor="text-cyan-600"
        />
      </div>

      {/* 100% FULL-WIDTH Main Data Table Section (Prevents Horizontal Squeezing & Bleeding) */}
      <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 w-full min-w-0">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants by name, domain, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-[#0D1F3D] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="w-full sm:w-36">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Trial', label: 'Trial' },
                { value: 'Suspended', label: 'Suspended' },
              ]}
            />
          </div>

          <div className="w-full sm:w-36">
            <Select
              value={billingFilter}
              onChange={(e) => setBillingFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Billing' },
                { value: 'Paid', label: 'Paid' },
                { value: 'Trial', label: 'Trial' },
              ]}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (filteredTenants.length === 0) return;
              const csvData =
                'data:text/csv;charset=utf-8,' +
                ['Company,Status,MRR,Contact'].concat(
                  filteredTenants.map((t) => `${t.companyName},${t.tenantStatus},${t.mrr || 0},${t.adminUser?.fullName || ''}`)
                ).join('\n');
              const encodedUri = encodeURI(csvData);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `plan-${plan.id}-tenants.csv`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
            className="gap-2 font-bold text-slate-700 h-10 border-slate-200 cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-500" /> Export
          </Button>
        </div>

        {/* 100% Full Width Scrollable DataTable */}
        {filteredTenants.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <DataTable
              data={filteredTenants}
              columns={columns}
              keyExtractor={(t: Tenant) => t.id}
              onRowClick={(t: Tenant) => navigate(`/platform/tenants/${t.id}`)}
            />
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500 font-medium space-y-2">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No tenants found</p>
            <p>No tenants are currently subscribed to this plan matching your filters.</p>
          </div>
        )}
      </div>

      {/* Analytics & Insights Widgets Row Below Data Table (Strictly adhering to Design System Rule 3.2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
        {/* Card 1: Plan Adoption Donut Chart */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 min-w-0">
          <h4 className="text-sm font-bold text-[#0D1F3D] border-b border-slate-100 pb-3">Plan Adoption Breakdown</h4>

          {metrics.totalTenants > 0 ? (
            <div className="flex items-center gap-4">
              <div className="relative h-32 w-32 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={52}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 100 }}
                      contentStyle={{ backgroundColor: '#0D1F3D', borderRadius: '4px', border: 'none', color: '#fff' }}
                      itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '11px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-base font-extrabold text-[#0D1F3D]">{metrics.totalTenants}</span>
                  <span className="text-[10px] font-semibold text-slate-500">Total</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 text-xs font-semibold min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-slate-600 truncate">Active</span>
                  </div>
                  <span className="text-[#0D1F3D] font-extrabold shrink-0">{metrics.activeTenants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-slate-600 truncate">Trial</span>
                  </div>
                  <span className="text-[#0D1F3D] font-extrabold shrink-0">{metrics.trialTenants}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                    <span className="text-slate-600 truncate">Suspended</span>
                  </div>
                  <span className="text-[#0D1F3D] font-extrabold shrink-0">{metrics.suspendedTenants}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 font-medium">
              No active or trial tenant subscriptions recorded yet.
            </div>
          )}
        </div>

        {/* Card 2: Top Tenants by MRR */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 min-w-0">
          <h4 className="text-sm font-extrabold text-[#0D1F3D] border-b border-slate-100 pb-3">Top Tenants by MRR</h4>
          {topTenants.length > 0 ? (
            <div className="space-y-3">
              {topTenants.map((t, idx) => {
                const mrrVal = t.mrr || 0;
                return (
                  <div key={t.id} className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 truncate">
                      <span className="text-xs font-bold text-slate-500 w-3 shrink-0">{idx + 1}</span>
                      <span className="font-extrabold text-[#0D1F3D] truncate">{t.companyName}</span>
                    </div>
                    <span className="font-mono font-extrabold text-indigo-700 shrink-0">
                      {mrrVal > 0 ? formatCurrency(mrrVal, plan.pricing.currency) : '₹0'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-500 font-medium">
              No tenants subscribed yet.
            </div>
          )}
        </div>

        {/* Card 3: Tenant Insights */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3 min-w-0">
          <h4 className="text-sm font-bold text-[#0D1F3D]">Tenant Insights</h4>
          <div className="space-y-2 text-xs text-slate-600 font-medium">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Supports multi-tenant isolation and per-tenant limits</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>Automated monthly and annual renewal management</span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <span>Zero security policy violations reported</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
