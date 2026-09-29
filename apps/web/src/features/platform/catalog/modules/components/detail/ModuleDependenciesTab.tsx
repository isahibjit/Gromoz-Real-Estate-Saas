import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Settings,
  ChevronRight,
  Info,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { PlatformModule } from '../../types/module.types';
import { Button } from '../../../../../../components/ui/Button';
import { usePlatformPermissions } from '../../../../tenants/hooks/usePlatformPermissions';

export interface ModuleDependenciesTabProps {
  module: PlatformModule;
}

// Module descriptive dictionary for detailed downstream/prerequisite cards matching mockup
const moduleDetailsMap: Record<string, { name: string; description: string }> = {
  core_platform: {
    name: 'Core Platform Services',
    description: 'Core platform utilities, authentication, and tenant isolation.',
  },
  field_visit: {
    name: 'Field Visit Management',
    description: 'Field visit scheduling, execution and reporting.',
  },
  order_mgmt: {
    name: 'Order Management',
    description: 'Order creation, fulfillment and status tracking.',
  },
  collection_mgmt: {
    name: 'Collection Management',
    description: 'Payment collection, reconciliation and follow-ups.',
  },
  telecalling: {
    name: 'Telecalling & Outreach',
    description: 'Outbound calls, lead outreach and follow-up tracking.',
  },
  attendance: {
    name: 'Attendance & Shifts',
    description: 'Shift management and executive check-ins.',
  },
  payroll: {
    name: 'Payroll & Incentives',
    description: 'Executive incentives and payroll calculation.',
  },
};

export function ModuleDependenciesTab({ module }: ModuleDependenciesTabProps) {
  const navigate = useNavigate();
  const { canUpdateModule } = usePlatformPermissions();

  const parents = module.dependencyCodes || [];
  const dependents = module.dependentCodes || [];

  return (
    <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs font-sans space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#0D1F3D]">Module Dependencies</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Manage prerequisite modules required before this capability can operate and modules that depend on this module.
          </p>
        </div>

        {canUpdateModule && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/platform/modules/${module.id}/edit`)}
            className="gap-2 font-bold text-indigo-700 bg-white border-indigo-200/80 hover:bg-indigo-50/50 shrink-0 h-9"
          >
            <Settings className="h-4 w-4 text-indigo-600" />
            Manage Dependencies
          </Button>
        )}
      </div>

      {/* Inner 2-Column Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Prerequisite Parent Modules */}
        <div className="rounded-sm border border-slate-200/80 bg-slate-50/30 p-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-[#0D1F3D]">
              Prerequisite Parent Modules ({parents.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Modules required before {module.name} can operate.
            </p>
          </div>

          {parents.length > 0 ? (
            <div className="space-y-3">
              {parents.map((pCode) => {
                const info = moduleDetailsMap[pCode] || {
                  name: pCode.replace(/_/g, ' ').toUpperCase(),
                  description: 'Required prerequisite module dependency.',
                };

                return (
                  <div
                    key={pCode}
                    onClick={() => navigate('/platform/modules/dependencies')}
                    className="rounded-sm border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between gap-3 hover:border-indigo-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100/80 text-purple-600 border border-purple-200/60">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-[#0D1F3D] group-hover:text-indigo-600 transition-colors">
                            {info.name}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-200">
                            {pCode}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 truncate">
                          {info.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-sm bg-white border border-slate-200/80 text-center space-y-1">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
              <p className="text-xs font-extrabold text-[#0D1F3D]">Root Module (No Prerequisites)</p>
              <p className="text-[11px] font-medium text-slate-500">
                This module operates independently without requiring parent prerequisite modules.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Downstream Dependent Modules */}
        <div className="rounded-sm border border-slate-200/80 bg-slate-50/30 p-5 space-y-4">
          <div>
            <h3 className="font-extrabold text-sm text-[#0D1F3D]">
              Downstream Dependent Modules ({dependents.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Modules that rely on {module.name}.
            </p>
          </div>

          {dependents.length > 0 ? (
            <div className="space-y-3">
              {dependents.map((dCode) => {
                const info = moduleDetailsMap[dCode] || {
                  name: dCode.replace(/_/g, ' ').toUpperCase(),
                  description: 'Downstream module dependent on this capability.',
                };

                return (
                  <div
                    key={dCode}
                    onClick={() => navigate('/platform/modules/dependencies')}
                    className="rounded-sm border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between gap-3 hover:border-indigo-300 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100/80 text-purple-600 border border-purple-200/60">
                        <Package className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-xs text-[#0D1F3D] group-hover:text-indigo-600 transition-colors">
                            {info.name}
                          </span>
                          <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-sm border border-indigo-200">
                            {dCode}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 truncate">
                          {info.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 rounded-sm bg-white border border-slate-200/80 text-center space-y-1">
              <Package className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="text-xs font-extrabold text-[#0D1F3D]">No Downstream Dependents</p>
              <p className="text-[11px] font-medium text-slate-500">
                No active catalog modules currently depend on this capability.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Notice Banner */}
      <div className="rounded-sm border border-blue-200/80 bg-blue-50/50 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="font-semibold text-slate-700">
            Dependency cycles are automatically detected and prevented to maintain platform stability.
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/platform/modules/dependencies')}
          className="inline-flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors shrink-0 cursor-pointer"
        >
          <span>View Full Dependency Graph</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
