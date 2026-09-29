import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Tag,
  HardDrive,
  Layers,
  Users,
  History,
} from 'lucide-react';

export interface PlanDetailTabsProps {
  planId: string;
  tenantCount?: number;
  moduleCount?: number;
}

export function PlanDetailTabs({ planId, tenantCount, moduleCount }: PlanDetailTabsProps) {
  const location = useLocation();

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      to: `/platform/plans/${planId}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      id: 'pricing',
      label: 'Pricing',
      to: `/platform/plans/${planId}/pricing`,
      icon: Tag,
    },
    {
      id: 'limits',
      label: 'Limits',
      to: `/platform/plans/${planId}/limits`,
      icon: HardDrive,
    },
    {
      id: 'modules',
      label: 'Modules',
      to: `/platform/plans/${planId}/modules`,
      icon: Layers,
      count: moduleCount,
    },
    {
      id: 'tenants',
      label: 'Tenants',
      to: `/platform/plans/${planId}/tenants`,
      icon: Users,
      count: tenantCount,
    },
    {
      id: 'versions',
      label: 'Version History',
      to: `/platform/plans/${planId}/versions`,
      icon: History,
    },
  ];

  return (
    <div className="border-b border-slate-200 bg-white shadow-2xs font-sans">
      <nav className="-mb-px flex space-x-8 px-2 overflow-x-auto custom-scrollbar" aria-label="Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={`flex items-center gap-2 border-b-2 py-3.5 px-1 text-xs font-bold transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
