import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Users,
  TrendingUp,
  Search,
  Filter,
  RotateCcw,
  Download,
  Upload,
  Plus,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  ShieldAlert,
  Layers,
  PauseCircle,
  Archive,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { RowActionsMenu } from '../../components/ui/RowActionsMenu';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { tenantService } from '../../features/platform/tenants/services/tenant.service';
import { Tenant, TenantStatus } from '../../features/platform/tenants/types/platform.types';
import { toast } from 'sonner';

const INDUSTRY_COLORS: Record<string, string> = {
  'Pharma & Healthcare': '#2563EB',
  'FMCG & Consumer Goods': '#10B981',
  'Solar & Renewable Energy': '#F59E0B',
  'Construction & Real Estate': '#6366F1',
  'EdTech & Higher Education': '#14B8A6',
};

const PLAN_COLORS: Record<string, string> = {
  'Starter Field CRM': '#F43F5E',
  'Growth Field Automation': '#10B981',
  'Professional Field Suite': '#8B5CF6',
  'Enterprise Field Suite': '#2563EB',
};

const INDUSTRY_DOT_COLORS: Record<string, string> = {
  'Pharma & Healthcare': 'bg-blue-600',
  'FMCG & Consumer Goods': 'bg-emerald-500',
  'Solar & Renewable Energy': 'bg-amber-500',
  'Construction & Real Estate': 'bg-indigo-500',
  'EdTech & Higher Education': 'bg-teal-500',
};

const PLAN_DOT_COLORS: Record<string, string> = {
  'Starter Field CRM': 'bg-rose-500',
  'Growth Field Automation': 'bg-emerald-500',
  'Professional Field Suite': 'bg-purple-500',
  'Enterprise Field Suite': 'bg-blue-600',
};

const formatCurrency = (amount: number): string => {
  if (amount === 0) return '₹0';
  return '₹' + amount.toLocaleString('en-IN');
};

export function AllTenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Tenant | null>(null);

  useEffect(() => {
    setLoading(true);
    tenantService
      .getTenants()
      .then((data) => setTenants(data))
      .finally(() => setLoading(false));
  }, []);

  const filteredTenants = tenants.filter((t) => {
    const matchSearch =
      searchTerm === '' ||
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.adminUser.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchIndustry = selectedIndustry === 'All' || t.industryLabel === selectedIndustry || t.industryId === selectedIndustry;
    const matchPlan = selectedPlan === 'All' || t.planName === selectedPlan || t.planId === selectedPlan;
    const matchStatus = selectedStatus === 'All' || t.tenantStatus === selectedStatus;
    return matchSearch && matchIndustry && matchPlan && matchStatus;
  });

  // Compute KPIs from live data
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.tenantStatus === 'Active').length;
  const trialTenants = tenants.filter((t) => t.tenantStatus === 'Trial').length;
  const suspendedTenants = tenants.filter((t) => t.tenantStatus === 'Suspended').length;
  const totalUsers = tenants.reduce((sum, t) => sum + t.userLicensesCount, 0);
  const totalMrr = tenants.reduce((sum, t) => sum + t.mrr, 0);

  // Derive industry chart from tenants
  const industryMap = new Map<string, number>();
  tenants.forEach((t) => industryMap.set(t.industryLabel, (industryMap.get(t.industryLabel) || 0) + 1));
  const industryChartData = Array.from(industryMap.entries()).map(([name, value]) => ({
    name,
    value,
    color: INDUSTRY_COLORS[name] || '#94A3B8',
  }));
  const industries = Array.from(industryMap.entries()).map(([name, count]) => ({
    name,
    count,
    percentage: totalTenants > 0 ? ((count / totalTenants) * 100).toFixed(1) + '%' : '0%',
    color: INDUSTRY_DOT_COLORS[name] || 'bg-slate-400',
  }));

  // Derive plan chart from tenants
  const planMap = new Map<string, number>();
  tenants.forEach((t) => planMap.set(t.planName, (planMap.get(t.planName) || 0) + 1));
  const planChartData = Array.from(planMap.entries()).map(([name, value]) => ({
    name,
    value,
    color: PLAN_COLORS[name] || '#94A3B8',
  }));
  const plans = Array.from(planMap.entries()).map(([name, count]) => ({
    name,
    count,
    percentage: totalTenants > 0 ? ((count / totalTenants) * 100).toFixed(1) + '%' : '0%',
    color: PLAN_DOT_COLORS[name] || 'bg-slate-400',
  }));

  const handleUpdateStatus = async (id: string, status: TenantStatus) => {
    try {
      await tenantService.updateTenantStatus(id, status);
      const refreshed = await tenantService.getTenants();
      setTenants(refreshed);
      setActiveMenuId(null);
      setSuspendTarget(null);
      toast.success(`Tenant status updated to ${status}`);
    } catch {
      toast.error('Failed to update tenant status');
    }
  };

  const getIconBg = (t: Tenant): string => {
    if (t.tenantStatus === 'Suspended') return 'bg-rose-100 text-rose-800 font-extrabold';
    if (t.tenantStatus === 'Past Due') return 'bg-amber-100 text-amber-800 font-extrabold';
    if (t.tenantStatus === 'Trial') return 'bg-amber-100 text-amber-800 font-extrabold';
    return 'bg-[#0D1F3D] text-white font-extrabold';
  };

  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case 'Active':
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">Active</span>;
      case 'Trial':
        return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">Trial</span>;
      case 'Pending Payment':
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">Pending Payment</span>;
      case 'Past Due':
        return <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-700 border border-orange-200">Past Due</span>;
      case 'Suspended':
        return <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">Suspended</span>;
      case 'Draft':
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">Draft</span>;
      case 'Cancelled':
        return <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">Cancelled</span>;
      case 'Archived':
        return <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">Archived</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">All Tenants</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Building2 className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Manage and monitor all tenant workspaces across the Smart Field Work SaaS platform
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => toast.info('Exporting tenant data')} className="gap-2 font-bold text-slate-700">
            <Download className="h-4 w-4 text-slate-400" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.info('Import wizard available in next release')} className="gap-2 font-bold text-slate-700">
            <Upload className="h-4 w-4 text-slate-400" /> Import
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate('/platform/tenants/create')}
            className="gap-2 font-bold shadow-xs"
          >
            <Plus className="h-4 w-4" /> Create Tenant
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard
          title="Total Tenants"
          value={String(totalTenants)}
          icon={Building2}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-700"
        />
        <KpiCard
          title="Active Tenants"
          value={String(activeTenants)}
          subValue={totalTenants > 0 ? `${((activeTenants / totalTenants) * 100).toFixed(1)}% of total` : '0%'}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-700"
        />
        <KpiCard
          title="Trial Tenants"
          value={String(trialTenants)}
          subValue={totalTenants > 0 ? `${((trialTenants / totalTenants) * 100).toFixed(1)}% of total` : '0%'}
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-700"
        />
        <KpiCard
          title="Suspended Tenants"
          value={String(suspendedTenants)}
          subValue={totalTenants > 0 ? `${((suspendedTenants / totalTenants) * 100).toFixed(1)}% of total` : '0%'}
          icon={AlertOctagon}
          iconBgColor="bg-red-50"
          iconTextColor="text-[#E20613]"
        />
        <KpiCard
          title="Total SaaS Users"
          value={totalUsers.toLocaleString('en-IN')}
          icon={Users}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-700"
        />
        <KpiCard
          title="MRR"
          value={formatCurrency(totalMrr)}
          icon={TrendingUp}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-700"
        />
      </div>

      {/* Filters Bar */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search tenants by name, code, domain, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div className="w-44">
            <Select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              searchable={true}
              options={[
                { value: 'All', label: 'All Industries' },
                ...Array.from(new Set(tenants.map((t) => t.industryLabel))).map((label) => ({ value: label, label })),
              ]}
            />
          </div>

          <div className="w-44">
            <Select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              searchable={true}
              options={[
                { value: 'All', label: 'All Plans' },
                ...Array.from(new Set(tenants.map((t) => t.planName))).map((name) => ({ value: name, label: name })),
              ]}
            />
          </div>

          <div className="w-44">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              searchable={true}
              options={[
                { value: 'All', label: 'All Statuses' },
                { value: 'Active', label: 'Active' },
                { value: 'Trial', label: 'Trial' },
                { value: 'Pending Payment', label: 'Pending Payment' },
                { value: 'Past Due', label: 'Past Due' },
                { value: 'Suspended', label: 'Suspended' },
                { value: 'Draft', label: 'Draft' },
                { value: 'Archived', label: 'Archived' },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedIndustry('All');
                setSelectedPlan('All');
                setSelectedStatus('All');
              }}
              className="gap-2 font-bold text-slate-700 h-10"
            >
              <RotateCcw className="h-4 w-4 text-slate-400" /> Reset
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#0D1F3D]">All Tenants</h3>
              <span className="text-xs font-medium text-slate-500">
                Showing <span className="font-bold text-[#0D1F3D]">{filteredTenants.length}</span> of <span className="font-bold text-[#0D1F3D]">{totalTenants}</span> tenants
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-[#0D1F3D]">
                    <th className="pb-3 w-8">#</th>
                    <th className="pb-3">Tenant Name</th>
                    <th className="pb-3">Tenant Code</th>
                    <th className="pb-3">Industry</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Users</th>
                    <th className="pb-3">MRR</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Created On</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                        <div className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
                        <p className="text-xs font-semibold">Loading datatable records...</p>
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-500 font-sans">
                        <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                        <p className="text-sm font-bold text-[#0D1F3D]">No tenants found</p>
                        <p className="text-xs text-slate-400 font-medium">Try adjusting search query or filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t, idx) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition group">
                        <td className="py-3.5 text-slate-400 font-semibold">{idx + 1}</td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm font-bold ${getIconBg(t)}`}>
                              {t.companyName[0]}
                            </div>
                            <div>
                              <p
                                onClick={() => navigate(`/platform/tenants/${t.id}`)}
                                className="font-bold text-[#0D1F3D] hover:text-blue-600 hover:underline cursor-pointer"
                              >
                                {t.companyName}
                              </p>
                              <p className="text-[11px] font-medium text-slate-400">{t.domain}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 font-mono text-xs font-bold text-slate-800">{t.slug.toUpperCase()}</td>
                        <td className="py-3.5 text-slate-600 font-semibold">{t.industryLabel}</td>
                        <td className="py-3.5 text-slate-700 font-bold">{t.planName}</td>
                        <td className="py-3.5 text-slate-700 font-semibold">{t.userLicensesCount}</td>
                        <td className="py-3.5 font-bold text-[#0D1F3D]">{formatCurrency(t.mrr)}</td>
                        <td className="py-3.5">{getStatusBadge(t.tenantStatus)}</td>
                        <td className="py-3.5 text-slate-500 font-medium">{t.createdAt.split(' ·')[0]}</td>
                        <td className="py-3.5 text-right">
                          <RowActionsMenu
                            items={[
                              { label: 'View Details', icon: Eye, onClick: () => navigate(`/platform/tenants/${t.id}`) },
                              { label: 'Edit Tenant', icon: Edit, onClick: () => navigate(`/platform/tenants/create?tenantId=${t.id}`) },
                              { label: 'Manage Users', icon: Users, onClick: () => navigate(`/platform/tenants/${t.id}/users`) },
                              { label: 'Manage Modules', icon: Layers, onClick: () => navigate(`/platform/tenants/${t.id}/modules`) },
                              ...(t.tenantStatus === 'Active'
                                ? [{ label: 'Suspend Tenant', icon: PauseCircle, danger: true, divider: true, onClick: () => setSuspendTarget(t) }]
                                : [{ label: 'Activate Tenant', icon: CheckCircle2, divider: true, onClick: () => handleUpdateStatus(t.id, 'Active') }]),
                              { label: 'Archive Tenant', icon: Archive, danger: true, onClick: () => handleUpdateStatus(t.id, 'Archived') },
                            ]}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none">
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <span>1-{filteredTenants.length} of {totalTenants}</span>
                <button type="button" className="h-8 w-8 rounded-sm border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" className="h-8 w-8 rounded-sm bg-blue-600 text-white font-bold flex items-center justify-center">1</button>
                <button type="button" className="h-8 w-8 rounded-sm border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Analytics Widgets Column */}
        <div className="space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">Tenants by Industry</h3>
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={industryChartData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={2} dataKey="value">
                      {industryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <span className="text-base font-extrabold text-[#0D1F3D]">{totalTenants}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                {industries.map((ind, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${ind.color}`} />
                      <span className="text-slate-600">{ind.name}</span>
                    </div>
                    <span className="text-[#0D1F3D] font-bold">{ind.count} ({ind.percentage})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">Tenants by Plan</h3>
            <div className="flex items-center gap-4">
              <div className="relative h-28 w-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planChartData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} paddingAngle={2} dataKey="value">
                      {planChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
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
                  <span className="text-base font-extrabold text-[#0D1F3D]">{totalTenants}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Total</span>
                </div>
              </div>
              <div className="flex-1 space-y-1">
                {plans.map((pl, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${pl.color}`} />
                      <span className="text-slate-600">{pl.name}</span>
                    </div>
                    <span className="text-[#0D1F3D] font-bold">{pl.count} ({pl.percentage})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Suspend Action */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-center font-sans">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0D1F3D]">Suspend Tenant?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Suspending <strong>{suspendTarget.companyName}</strong> will temporarily restrict executive logins until reactivated.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSuspendTarget(null)}
                className="flex-1 font-bold justify-center"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => handleUpdateStatus(suspendTarget.id, 'Suspended')}
                className="flex-1 font-bold bg-amber-600 hover:bg-amber-700 text-white justify-center"
              >
                Suspend Workspace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
