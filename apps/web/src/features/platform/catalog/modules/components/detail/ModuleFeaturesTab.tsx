import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  Smartphone,
  BookOpen,
  UserCheck,
  Building2,
  GitCommit,
  Route,
  Users,
  FileText,
  Package,
  Layers,
  MoreVertical,
} from 'lucide-react';
import { PlatformModule, ModuleFeature } from '../../types/module.types';
import { DataTable } from '../../../../../../components/ui/DataTable';
import { Button } from '../../../../../../components/ui/Button';
import { RowActionsMenu } from '../../../../../../components/ui/RowActionsMenu';
import { toast } from 'sonner';

export interface ModuleFeaturesTabProps {
  module: PlatformModule;
}

export function ModuleFeaturesTab({ module }: ModuleFeaturesTabProps) {
  const navigate = useNavigate();
  const features = module.features || [];

  const getFeatureIcon = (index: number) => {
    const icons = [UserCheck, Building2, GitCommit, Route, Globe, Users, FileText, Layers, Package];
    const IconComp = icons[index % icons.length];
    return <IconComp className="h-4 w-4 text-indigo-600 shrink-0" />;
  };

  return (
    <section className="rounded-sm border border-slate-200 bg-white shadow-xs font-sans">
      {/* Header Bar */}
      <div className="border-b border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold text-[#0D1F3D]">
            Registered Code-Backed Features ({features.length})
          </h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Software capabilities implemented in Smart Field Work and bundled under {module.name}.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/platform/modules/features')}
          className="gap-2 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 shrink-0 h-9"
        >
          <BookOpen className="h-4 w-4 text-slate-500" />
          View Global Feature Registry
        </Button>
      </div>

      {/* Features Data Table */}
      <DataTable
        data={features}
        columns={[
          {
            header: 'Feature Name & Description',
            cell: (feat: ModuleFeature, idx: number) => (
              <div className="flex items-center gap-3 py-1 min-w-[260px]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50/80 text-indigo-600 border border-indigo-100/80 shadow-2xs">
                  {getFeatureIcon(idx)}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-[#0D1F3D] block truncate">
                    {feat.name}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block truncate max-w-md">
                    {feat.description}
                  </span>
                </div>
              </div>
            ),
          },
          {
            header: 'Implementation Key',
            cell: (feat: ModuleFeature) => (
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-sm border border-indigo-200">
                {feat.code}
              </span>
            ),
          },
          {
            header: 'Platform Support',
            cell: (feat: ModuleFeature) => (
              <div className="flex items-center gap-1.5">
                {(feat.supportsWeb ?? true) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-200">
                    <Globe className="h-3 w-3" /> Web
                  </span>
                )}
                {(feat.supportsMobile ?? true) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200">
                    <Smartphone className="h-3 w-3" /> Mobile
                  </span>
                )}
              </div>
            ),
          },
          {
            header: 'Status',
            cell: (feat: ModuleFeature) => (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                {feat.status || 'Active'}
              </span>
            ),
          },
          {
            header: 'Actions',
            cell: (feat: ModuleFeature) => (
              <RowActionsMenu
                items={[
                  {
                    label: 'View Details',
                    onClick: () => toast.info(`Viewing details for feature '${feat.name}'`),
                  },
                  {
                    label: 'View Implementation Key',
                    onClick: () => {
                      navigator.clipboard.writeText(feat.code);
                      toast.success(`Feature key '${feat.code}' copied to clipboard.`);
                    },
                  },
                ]}
              />
            ),
          },
        ]}
        emptyMessage="No coded features registered for this module yet."
      />
    </section>
  );
}
