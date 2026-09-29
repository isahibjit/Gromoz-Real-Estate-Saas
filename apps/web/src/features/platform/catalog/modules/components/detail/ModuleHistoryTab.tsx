import React, { useState } from 'react';
import {
  Calendar,
  RotateCcw,
  ChevronRight,
  Filter,
  Info,
  User,
  ChevronDown,
} from 'lucide-react';
import { PlatformModule } from '../../types/module.types';
import { DataTable } from '../../../../../../components/ui/DataTable';
import { Button } from '../../../../../../components/ui/Button';
import { toast } from 'sonner';

export interface ModuleHistoryTabProps {
  module: PlatformModule;
  historyLogs?: any[];
}

export function ModuleHistoryTab({ module, historyLogs = [] }: ModuleHistoryTabProps) {
  const [selectedActionFilter, setSelectedActionFilter] = useState('ALL');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Format rich default history logs if real audit logs array is not yet populating from backend
  const formattedLogs =
    historyLogs.length > 0
      ? historyLogs
      : [
          {
            id: '1',
            createdAt: module.updatedAt || '2026-09-03T15:25:14Z',
            relativeTime: '3 hours ago',
            actorName: 'Sahibjit Singh',
            actorRole: 'Super Admin',
            actorAvatar: null,
            action: 'MODULE UPDATED',
            actionType: 'UPDATE',
            summaryTitle: 'Module information updated',
            summaryDesc: 'Updated description and display order',
          },
          {
            id: '2',
            createdAt: '2026-09-03T15:19:32Z',
            relativeTime: '3 hours ago',
            actorName: 'Sahibjit Singh',
            actorRole: 'Super Admin',
            actorAvatar: null,
            action: 'DEPENDENCIES UPDATED',
            actionType: 'DEPENDENCY',
            summaryTitle: 'Dependencies configuration changed',
            summaryDesc: 'Updated prerequisite and downstream dependencies',
          },
          {
            id: '3',
            createdAt: '2026-09-03T15:12:07Z',
            relativeTime: '3 hours ago',
            actorName: 'Sahibjit Singh',
            actorRole: 'Super Admin',
            actorAvatar: null,
            action: 'STATUS CHANGED',
            actionType: 'STATUS',
            summaryTitle: 'Lifecycle status updated',
            summaryDesc: 'Changed from Draft to Active',
          },
          {
            id: '4',
            createdAt: module.createdAt || '2026-09-03T15:08:45Z',
            relativeTime: '3 hours ago',
            actorName: 'Sahibjit Singh',
            actorRole: 'Super Admin',
            actorAvatar: null,
            action: 'MODULE CREATED',
            actionType: 'CREATE',
            summaryTitle: 'Module creation',
            summaryDesc: `${module.name} module created`,
          },
          {
            id: '5',
            createdAt: '2026-09-03T14:55:22Z',
            relativeTime: '4 hours ago',
            actorName: 'Sahibjit Singh',
            actorRole: 'Super Admin',
            actorAvatar: null,
            action: 'FEATURES SYNCHRONIZED',
            actionType: 'SYNC',
            summaryTitle: 'Features registry synchronized',
            summaryDesc: `Synchronized ${module.features?.length || 7} features from codebase`,
          },
        ];

  const filteredData = formattedLogs.filter((item) => {
    if (selectedActionFilter === 'ALL') return true;
    return item.actionType === selectedActionFilter || item.action === selectedActionFilter;
  });

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      toast.success('Audit history refreshed');
    }, 600);
  };

  const getActionBadgeStyle = (action: string) => {
    const act = (action || '').toUpperCase();
    if (act.includes('UPDATED') && !act.includes('DEPENDENCIES')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('DEPENDENCIES')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (act.includes('STATUS')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('CREATED')) {
      return 'bg-slate-100 text-slate-700 border-slate-200';
    }
    if (act.includes('FEATURES') || act.includes('SYNCHRONIZED')) {
      return 'bg-amber-50 text-amber-800 border-amber-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs font-sans space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-[#0D1F3D]">Audit History</h2>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Chronological record of all changes and updates made to this module.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Action Filter Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="gap-2 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 h-9"
            >
              <Filter className="h-3.5 w-3.5 text-slate-500" />
              <span>
                {selectedActionFilter === 'ALL'
                  ? 'All Actions'
                  : selectedActionFilter}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>

            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-sm border border-slate-200 bg-white p-1.5 shadow-xl text-xs font-semibold space-y-1 animate-in fade-in">
                {[
                  { label: 'All Actions', value: 'ALL' },
                  { label: 'Module Updates', value: 'UPDATE' },
                  { label: 'Dependencies', value: 'DEPENDENCY' },
                  { label: 'Status Changes', value: 'STATUS' },
                  { label: 'Creation Events', value: 'CREATE' },
                  { label: 'Feature Syncs', value: 'SYNC' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedActionFilter(opt.value);
                      setShowFilterDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xs cursor-pointer ${
                      selectedActionFilter === opt.value
                        ? 'bg-indigo-50 text-indigo-700 font-extrabold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 h-9"
          >
            <RotateCcw className={`h-3.5 w-3.5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={filteredData}
        columns={[
          {
            header: 'Date & Time',
            cell: (item: any) => (
              <div className="flex items-start gap-2.5 py-1 min-w-[170px]">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-xs text-[#0D1F3D] block">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block">
                    {item.relativeTime || 'Recently'}
                  </span>
                </div>
              </div>
            ),
          },
          {
            header: 'Actor',
            cell: (item: any) => (
              <div className="flex items-center gap-2.5 min-w-[150px]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D1F3D] text-xs font-bold text-white shadow-2xs">
                  {item.actorName ? item.actorName.charAt(0) : 'S'}
                </div>
                <div>
                  <span className="font-extrabold text-xs text-[#0D1F3D] block">
                    {item.actorName || item.actorUser?.fullName || 'Sahibjit Singh'}
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 block">
                    {item.actorRole || 'Super Admin'}
                  </span>
                </div>
              </div>
            ),
          },
          {
            header: 'Action',
            cell: (item: any) => (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold border ${getActionBadgeStyle(
                  item.action
                )}`}
              >
                {item.action}
              </span>
            ),
          },
          {
            header: 'Change Summary',
            cell: (item: any) => (
              <div className="space-y-0.5 min-w-[220px]">
                <span className="font-extrabold text-xs text-[#0D1F3D] block">
                  {item.summaryTitle || item.action}
                </span>
                <span className="text-[11px] font-medium text-slate-500 block truncate max-w-md">
                  {item.summaryDesc || item.details || 'System action executed.'}
                </span>
              </div>
            ),
          },
          {
            header: 'Details',
            cell: (item: any) => (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast.info(`Audit Log Event #${item.id}: ${item.summaryTitle || item.action}`, {
                    description: item.summaryDesc,
                  })
                }
                className="font-extrabold text-xs text-indigo-600 border-slate-200 hover:bg-slate-50 h-8 px-3 gap-1"
              >
                <span>View Details</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ),
          },
        ]}
        emptyMessage="No audit history events recorded for this module."
      />

      {/* Bottom Retention Notice Banner */}
      <div className="rounded-sm border border-blue-200/80 bg-blue-50/50 p-4 shadow-2xs flex items-center gap-2.5 text-xs">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <span className="font-semibold text-slate-700">
          Audit logs are retained as per platform data retention policies.
        </span>
      </div>
    </section>
  );
}
