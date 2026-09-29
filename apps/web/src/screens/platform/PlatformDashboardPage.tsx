import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertOctagon,
  Users,
  TrendingUp,
  ArrowUpRight,
  Plus,
  ArrowRight,
  Calendar,
  Download,
  Info,
  ChevronDown,
  Layers,
  Tag,
  Shield,
  FileText,
  UserPlus,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { KpiCard } from '../../components/dashboard/KpiCard';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const mrrTrendData = [
  { date: 'May 20', mrr: 2420000 },
  { date: 'May 27', mrr: 2510000 },
  { date: 'Jun 03', mrr: 2640000 },
  { date: 'Jun 10', mrr: 2750000 },
  { date: 'Jun 18', mrr: 2874320 },
];

const industryChartData = [
  { name: 'Pharma', value: 24, color: '#2563EB' },
  { name: 'FMCG', value: 20, color: '#10B981' },
  { name: 'Distributors', value: 18, color: '#6366F1' },
  { name: 'Manufacturing', value: 16, color: '#14B8A6' },
  { name: 'Solar', value: 12, color: '#F59E0B' },
  { name: 'Services', value: 10, color: '#F43F5E' },
  { name: 'Other', value: 28, color: '#94A3B8' },
];

const planChartData = [
  { name: 'Enterprise', value: 32, color: '#2563EB' },
  { name: 'Growth', value: 46, color: '#10B981' },
  { name: 'Professional', value: 34, color: '#F59E0B' },
  { name: 'Starter', value: 16, color: '#F43F5E' },
];

export function PlatformDashboardPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState('May 20 - Jun 18, 2025');
  const [mrrTimeframe, setMrrTimeframe] = useState('Last 30 Days');

  // Industry breakdown donut data
  const industries = [
    { name: 'Pharma', count: 24, percentage: '18.8%', color: 'bg-blue-600' },
    { name: 'FMCG', count: 20, percentage: '15.6%', color: 'bg-emerald-500' },
    { name: 'Distributors', count: 18, percentage: '14.1%', color: 'bg-indigo-500' },
    { name: 'Manufacturing', count: 16, percentage: '12.5%', color: 'bg-teal-500' },
    { name: 'Solar', count: 12, percentage: '9.4%', color: 'bg-amber-500' },
    { name: 'Services', count: 10, percentage: '7.8%', color: 'bg-rose-500' },
    { name: 'Other', count: 28, percentage: '21.9%', color: 'bg-slate-400' },
  ];

  // Plan breakdown donut data
  const plans = [
    { name: 'Enterprise', count: 32, percentage: '25.0%', color: 'bg-blue-600' },
    { name: 'Growth', count: 46, percentage: '35.9%', color: 'bg-emerald-500' },
    { name: 'Professional', count: 34, percentage: '26.6%', color: 'bg-amber-500' },
    { name: 'Starter', count: 16, percentage: '12.5%', color: 'bg-rose-500' },
  ];

  // Recent signups table
  const recentSignups = [
    { tenant: 'Genix Pharma Pvt Ltd', industry: 'Pharma', plan: 'Growth', users: 12, signedUp: '18 Jun, 2025' },
    { tenant: 'Sunrise Solar Solutions', industry: 'Solar', plan: 'Professional', users: 8, signedUp: '17 Jun, 2025' },
    { tenant: 'Metro Distributors', industry: 'Distributors', plan: 'Growth', users: 15, signedUp: '16 Jun, 2025' },
    { tenant: 'Krishna FMCG Pvt Ltd', industry: 'FMCG', plan: 'Enterprise', users: 28, signedUp: '15 Jun, 2025' },
    { tenant: 'Vertex Manufacturing', industry: 'Manufacturing', plan: 'Professional', users: 6, signedUp: '15 Jun, 2025' },
  ];

  // Upcoming renewals table
  const upcomingRenewals = [
    { tenant: 'Blue Star Distributors', plan: 'Enterprise', date: '22 Jun, 2025', amount: '₹1,49,999' },
    { tenant: 'Sagar Pharma', plan: 'Growth', date: '25 Jun, 2025', amount: '₹49,999' },
    { tenant: 'Apex Solar Pvt Ltd', plan: 'Professional', date: '27 Jun, 2025', amount: '₹29,999' },
    { tenant: 'Om Sai FMCG', plan: 'Growth', date: '30 Jun, 2025', amount: '₹49,999' },
    { tenant: 'Bright Services', plan: 'Professional', date: '01 Jul, 2025', amount: '₹29,999' },
  ];

  // Top active tenants (user count)
  const topTenants = [
    { name: 'Krishna FMCG Pvt Ltd', users: 120, percentage: 95 },
    { name: 'Genix Pharma Pvt Ltd', users: 98, percentage: 78 },
    { name: 'Metro Distributors', users: 85, percentage: 68 },
    { name: 'Blue Star Distributors', users: 72, percentage: 58 },
    { name: 'Sagar Pharma', users: 65, percentage: 52 },
  ];

  // Platform recent activity feed
  const recentActivities = [
    { title: 'New tenant registered - Genix Pharma Pvt Ltd', time: '18 Jun, 2025 10:24 AM', icon: Building2, color: 'bg-blue-100 text-blue-600' },
    { title: 'Payment received from Metro Distributors', time: '18 Jun, 2025 09:16 AM', amount: '₹49,999', icon: CreditCard, color: 'bg-emerald-100 text-emerald-600' },
    { title: 'Tenant suspended - Old Age Home Services', time: '18 Jun, 2025 08:42 AM', icon: AlertTriangle, color: 'bg-rose-100 text-rose-600' },
    { title: 'Plan upgraded - Apex Solar Pvt Ltd (Professional → Growth)', time: '17 Jun, 2025 06:15 PM', icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
    { title: 'New user added - Rajesh Kumar (Sagar Pharma)', time: '17 Jun, 2025 04:33 PM', icon: UserPlus, color: 'bg-amber-100 text-amber-600' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Platform Dashboard</h1>
          <p className="text-xs font-medium text-slate-500">
            Overview of your Smart Field Work SaaS Platform
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition"
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            <span>{dateRange}</span>
          </button>

          <Button
            variant="accent"
            size="sm"
            onClick={() => navigate('/platform/reports')}
            className="gap-2 font-bold shadow-xs"
          >
            <Download className="h-4 w-4" /> Export Report
          </Button>
        </div>
      </div>

      {/* Top 6 KPI Summary Cards (Reusing KpiCard Component 100%) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard
          title="Total Tenants"
          value="128"
          change="12 this month"
          changeType="positive"
          icon={Building2}
          iconBgColor="bg-blue-50"
          iconTextColor="text-blue-700"
        />
        <KpiCard
          title="Active Tenants"
          value="102"
          subValue="79.7% of total"
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-700"
        />
        <KpiCard
          title="Trial Tenants"
          value="18"
          subValue="14.1% of total"
          icon={Clock}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-700"
        />
        <KpiCard
          title="Suspended Tenants"
          value="6"
          subValue="4.7% of total"
          icon={AlertOctagon}
          iconBgColor="bg-red-50"
          iconTextColor="text-[#E20613]"
        />
        <KpiCard
          title="Total SaaS Users"
          value="2,845"
          change="156 this month"
          changeType="positive"
          icon={Users}
          iconBgColor="bg-purple-50"
          iconTextColor="text-purple-700"
        />
        <KpiCard
          title="MRR"
          value="₹28,74,320"
          change="18.6%"
          changeType="positive"
          timeframe="vs last month"
          icon={TrendingUp}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-700"
        />
      </div>

      {/* Middle Row 1: Charts (MRR Trend, Tenants by Industry, Tenants by Plan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* MRR Trend Card */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-[#0D1F3D]">MRR Trend</h3>
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div className="relative">
                <select
                  value={mrrTimeframe}
                  onChange={(e) => setMrrTimeframe(e.target.value)}
                  className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                  <option>This Year</option>
                </select>
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-2xl font-extrabold text-[#0D1F3D]">₹28,74,320</span>
              <span className="text-xs font-bold text-emerald-600">▲ 18.6% vs last month</span>
            </div>

            {/* Interactive Recharts Area Chart */}
            <div className="h-48 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mrrTrendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v / 100000}L`} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 100 }}
                    contentStyle={{ backgroundColor: '#0D1F3D', borderRadius: '4px', border: 'none', color: '#fff' }}
                    labelStyle={{ color: '#E20613', fontWeight: 700, fontSize: '12px' }}
                    itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12px' }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'MRR']}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#mrrGrad)" dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Tenants by Industry Donut Chart Card */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">Tenants by Industry</h3>

            <div className="flex items-center gap-4">
              <div className="relative h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={industryChartData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">
                      {industryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 100 }}
                      contentStyle={{ backgroundColor: '#0D1F3D', borderRadius: '4px', border: 'none', color: '#fff' }}
                      itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12px' }}
                      formatter={(val: any) => [`${val} Tenants`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-extrabold text-[#0D1F3D]">128</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                </div>
              </div>

              <div className="flex-1 space-y-1.5">
                {industries.slice(0, 5).map((ind, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${ind.color}`} />
                      <span className="text-slate-600">{ind.name}</span>
                    </div>
                    <span className="text-[#0D1F3D] font-bold">
                      {ind.count} ({ind.percentage})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/platform/industries')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View all industries <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tenants by Plan Donut Chart Card */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D1F3D] mb-4">Tenants by Plan</h3>

            <div className="flex items-center gap-4">
              <div className="relative h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planChartData} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value">
                      {planChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      wrapperStyle={{ zIndex: 100 }}
                      contentStyle={{ backgroundColor: '#0D1F3D', borderRadius: '4px', border: 'none', color: '#fff' }}
                      itemStyle={{ color: '#FFFFFF', fontWeight: 600, fontSize: '12px' }}
                      formatter={(val: any) => [`${val} Tenants`, 'Count']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-extrabold text-[#0D1F3D]">128</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
                </div>
              </div>

              <div className="flex-1 space-y-2">
                {plans.map((pl, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${pl.color}`} />
                      <span className="text-slate-600">{pl.name}</span>
                    </div>
                    <span className="text-[#0D1F3D] font-bold">
                      {pl.count} ({pl.percentage})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-center">
            <button
              type="button"
              onClick={() => navigate('/platform/plans')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View all plans <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Row 2: Recent Signups, Renewals, Status Overview + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Tenant Signups Table */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D1F3D] mb-3">Recent Tenant Signups</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="pb-2">Tenant</th>
                    <th className="pb-2">Industry</th>
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">Users</th>
                    <th className="pb-2 text-right">Signed Up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {recentSignups.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 font-bold text-blue-600 hover:underline cursor-pointer">
                        {s.tenant}
                      </td>
                      <td className="py-2.5 text-slate-600">{s.industry}</td>
                      <td className="py-2.5 text-slate-700 font-semibold">{s.plan}</td>
                      <td className="py-2.5 text-slate-700">{s.users}</td>
                      <td className="py-2.5 text-slate-500 text-right">{s.signedUp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 text-center">
            <button
              type="button"
              onClick={() => navigate('/platform/tenants')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View all tenants <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Upcoming Renewals Table */}
        <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0D1F3D] mb-3">Upcoming Renewals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="pb-2">Tenant</th>
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">Renewal Date</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {upcomingRenewals.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 font-bold text-slate-800">{r.tenant}</td>
                      <td className="py-2.5 text-slate-600">{r.plan}</td>
                      <td className="py-2.5 text-slate-500">{r.date}</td>
                      <td className="py-2.5 text-right font-bold text-[#0D1F3D]">{r.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 mt-3 text-center">
            <button
              type="button"
              onClick={() => navigate('/platform/subscriptions')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition"
            >
              View all renewals <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tenant Status Overview + Quick Actions */}
        <div className="flex flex-col gap-6">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-[#0D1F3D]">Tenant Status Overview</h3>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Active</span>
                  <span>102 (79.7%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '79.7%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Trial</span>
                  <span>18 (14.1%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '14.1%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Suspended</span>
                  <span>6 (4.7%)</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '4.7%' }} />
                </div>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => navigate('/platform/tenants')}
                className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
              >
                View all tenants <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs space-y-2">
            <h4 className="text-xs font-extrabold text-[#0D1F3D] px-2 mb-1 uppercase tracking-wider">
              Quick Actions
            </h4>
            <Button
              variant="accent"
              size="sm"
              onClick={() => navigate('/platform/tenants/create')}
              className="w-full justify-start gap-2 font-bold shadow-xs py-2"
            >
              <Plus className="h-4 w-4" /> Create Tenant
            </Button>
            <button
              type="button"
              onClick={() => navigate('/platform/tenants')}
              className="w-full flex items-center justify-between rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              <span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-slate-500" /> All Tenants</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 -rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
