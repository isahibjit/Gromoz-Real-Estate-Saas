import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Layers,
  GitBranch,
  History,
} from 'lucide-react';

export interface ModuleDetailTabsProps {
  moduleId: string;
  featureCount?: number;
  dependencyCount?: number;
}

export function ModuleDetailTabs({ moduleId, featureCount, dependencyCount }: ModuleDetailTabsProps) {
  const location = useLocation();

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      to: `/platform/modules/${moduleId}`,
      icon: LayoutGrid,
      exact: true,
    },
    {
      id: 'features',
      label: 'Features',
      to: `/platform/modules/${moduleId}/features`,
      icon: Layers,
      count: featureCount,
    },
    {
      id: 'dependencies',
      label: 'Dependencies',
      to: `/platform/modules/${moduleId}/dependencies`,
      icon: GitBranch,
      count: dependencyCount,
    },
    {
      id: 'history',
      label: 'Audit History',
      to: `/platform/modules/${moduleId}/history`,
      icon: History,
    },
  ];

  return (
    <div className="rounded-sm border border-slate-200 bg-white px-6 shadow-xs font-sans">
      <nav className="-mb-px flex space-x-8 overflow-x-auto custom-scrollbar" aria-label="Module Tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <NavLink
              key={tab.id}
              to={tab.to}
              className={`flex items-center gap-2 border-b-2 py-3.5 px-1 text-xs font-extrabold transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
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
