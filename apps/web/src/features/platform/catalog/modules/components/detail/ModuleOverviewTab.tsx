import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Info,
  Layers,
  GitBranch,
  History,
  Shield,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Package,
  Building2,
  BarChart3,
  Route,
  UserCheck,
  Calendar,
  Clock,
  Briefcase,
  Bot,
  Zap,
} from 'lucide-react';
import { PlatformModule } from '../../types/module.types';
import { ModuleCategoryBadge } from '../ModuleCategoryBadge';
import { ModuleStatusBadge } from '../ModuleStatusBadge';

export interface ModuleOverviewTabProps {
  module: PlatformModule;
}

export function ModuleOverviewTab({ module }: ModuleOverviewTabProps) {
  const navigate = useNavigate();

  const formattedCreated = module.createdAt ? new Date(module.createdAt).toLocaleDateString() : '—';
  const formattedUpdated = module.updatedAt ? new Date(module.updatedAt).toLocaleDateString() : '—';

  const features = module.features || [];
  const parents = module.dependencyCodes || [];
  const dependents = module.dependentCodes || [];

  // Helper for feature icons
  const getFeatureIcon = (index: number) => {
    const icons = [Building2, Briefcase, BarChart3, Route, UserCheck, Zap, Bot, Package];
    const IconComp = icons[index % icons.length];
    return <IconComp className="h-4 w-4 text-indigo-600 shrink-0" />;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans text-slate-800">
      {/* LEFT COLUMN (8 cols) */}
      <div className="lg:col-span-8 space-y-6">
        {/* 1. Module Information Card */}
        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Info className="h-4 w-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-extrabold text-[#0D1F3D]">Module Information</h3>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between sm:justify-start sm:gap-8">
                <span className="text-slate-500 w-32 font-semibold">Module Name</span>
                <span className="font-extrabold text-[#0D1F3D]">{module.name}</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-8">
                <span className="text-slate-500 w-32 font-semibold">Module Code</span>
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-sm border border-indigo-200">
                  {module.code}
                </span>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between sm:justify-start sm:gap-8">
                <span className="text-slate-500 w-32 font-semibold">Category</span>
                <ModuleCategoryBadge category={module.category} />
              </div>
              <div className="flex items-center justify-between sm:justify-start sm:gap-8">
                <span className="text-slate-500 w-32 font-semibold">Lifecycle Status</span>
                <ModuleStatusBadge status={module.status} />
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-between sm:justify-start sm:gap-8">
                <span className="text-slate-500 w-32 font-semibold">Display Order</span>
                <span className="font-bold text-slate-800">{module.displayOrder ?? 1}</span>
              </div>
            </div>

            {/* Row 4: Capability Scope */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <span className="text-slate-500 font-semibold block">Capability Scope / Description</span>
              <p className="text-xs font-medium text-slate-700 bg-slate-50/70 p-3.5 rounded-sm border border-slate-200/80 leading-relaxed">
                {module.description}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Capability Summary Card */}
        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-extrabold text-[#0D1F3D]">Capability Summary</h3>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {features.length} Features Registered
            </span>
          </div>

          {features.length > 0 ? (
            <div className="divide-y divide-slate-100 text-xs">
              {features.slice(0, 5).map((feat, idx) => (
                <div key={feat.id || feat.code || idx} className="py-3 flex items-start gap-3.5">
                  <div className="p-2 rounded-sm bg-indigo-50/80 border border-indigo-100 shrink-0 mt-0.5">
                    {getFeatureIcon(idx)}
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <span className="font-extrabold text-xs text-[#0D1F3D] block truncate">
                      {feat.name}
                    </span>
                    <p className="text-[11px] font-medium text-slate-500 leading-snug">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-sm bg-slate-50 text-center text-xs font-medium text-slate-400">
              No coded features registered under this module catalog entry.
            </div>
          )}

          {features.length > 0 && (
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => navigate(`/platform/modules/${module.id}/features`)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                <span>View All {features.length} Features</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </section>

        {/* 3. Dependency Summary Card */}
        <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-extrabold text-[#0D1F3D]">Dependency Summary</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Prerequisites */}
            <div className="space-y-2.5">
              <span className="text-slate-500 font-semibold block">Prerequisites</span>
              {parents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {parents.map((pCode) => (
                    <span
                      key={pCode}
                      className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-sm border border-indigo-200"
                    >
                      {pCode}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700 font-bold bg-emerald-50/80 px-3 py-2 rounded-sm border border-emerald-200/80">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>No Prerequisites</span>
                </div>
              )}
            </div>

            {/* Used By / Dependents */}
            <div className="space-y-2.5">
              <span className="text-slate-500 font-semibold block">Used By ({dependents.length})</span>
              {dependents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {dependents.map((dCode) => (
                    <span
                      key={dCode}
                      className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-sm border border-slate-200"
                    >
                      <Package className="h-3.5 w-3.5 text-slate-500" />
                      {dCode}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-2 rounded-sm border border-slate-100">
                  No downstream modules dependent on this capability.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => navigate(`/platform/modules/${module.id}/dependencies`)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
            >
              <span>Manage Dependencies</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      </div>

      {/* RIGHT COLUMN (4 cols) */}
      <div className="lg:col-span-4 space-y-6">
        {/* 1. Lifecycle Card */}
        <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <History className="h-4 w-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-extrabold text-[#0D1F3D]">Lifecycle</h3>
          </div>

          <div className="space-y-3.5 text-xs font-semibold">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <ModuleStatusBadge status={module.status} />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">System Requirement</span>
              <span
                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-sm border ${
                  module.requiredBySystem
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {module.requiredBySystem ? 'Required' : 'Optional'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-500">Created</span>
              <span className="font-bold text-slate-700">{formattedCreated}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Last Updated</span>
              <span className="font-bold text-slate-700">{formattedUpdated}</span>
            </div>
          </div>
        </section>

        {/* 2. Platform Relationships Card */}
        <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <GitBranch className="h-4 w-4 text-indigo-600 shrink-0" />
            <h3 className="text-sm font-extrabold text-[#0D1F3D]">Platform Relationships</h3>
          </div>

          <div className="space-y-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => navigate(`/platform/modules/${module.id}/features`)}
              className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer"
            >
              <span className="text-slate-600 font-semibold">Registered Features</span>
              <span className="flex items-center gap-1.5 font-bold text-indigo-700">
                {features.length}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/platform/modules/${module.id}/dependencies`)}
              className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer"
            >
              <span className="text-slate-600 font-semibold">Dependencies</span>
              <span className="flex items-center gap-1.5 font-bold text-indigo-700">
                {parents.length}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/platform/modules/dependencies')}
              className="w-full flex items-center justify-between p-2.5 rounded-sm hover:bg-slate-50 transition-colors text-slate-700 cursor-pointer"
            >
              <span className="text-slate-600 font-semibold">Dependent Modules</span>
              <span className="flex items-center gap-1.5 font-bold text-indigo-700">
                {dependents.length}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </span>
            </button>
          </div>
        </section>

        {/* 3. System Required Card */}
        {module.requiredBySystem && (
          <section className="rounded-sm border border-amber-200/90 bg-amber-50/60 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-900">
              <Shield className="h-4 w-4 text-amber-600 shrink-0" />
              <h3 className="text-sm font-extrabold">System Required</h3>
            </div>
            <p className="text-xs font-semibold text-amber-900/90 leading-snug">
              This module is required by the platform and cannot be archived or disabled.
            </p>
            <p className="text-[11px] font-medium text-amber-800/80 leading-relaxed">
              It underpins critical operations and dependencies across other modules.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
