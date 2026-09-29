import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Archive,
  ArrowRight,
  GitCompare,
  Eye,
  Info,
  Check,
  X,
} from 'lucide-react';
import { Plan } from '../../types/plan.types';
import { planVersionService } from '../../services/plan-version.service';
import { PlanVersionRecord as ServiceVersionRecord } from '../../types/plan-version.types';
import { Button } from '../../../../../../components/ui/Button';

export interface PlanVersionHistoryTabProps {
  plan: Plan;
}

export function PlanVersionHistoryTab({ plan }: PlanVersionHistoryTabProps) {
  const [versionRecords, setVersionRecords] = useState<ServiceVersionRecord[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ServiceVersionRecord | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    planVersionService.getVersions(plan.id).then((list) => {
      if (isMounted) {
        setVersionRecords(list);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [plan.id]);

  const activeRecord = useMemo(() => {
    return versionRecords.find((v) => v.status === 'Current') || versionRecords[0];
  }, [versionRecords]);

  const previousRecord = useMemo(() => {
    return versionRecords.find((v) => v.status === 'Replaced') || versionRecords[1] || null;
  }, [versionRecords]);

  const replacedCount = useMemo(() => {
    return versionRecords.filter((v) => v.status === 'Replaced').length;
  }, [versionRecords]);

  const archivedCount = useMemo(() => {
    return versionRecords.filter((v) => v.status === 'Archived').length;
  }, [versionRecords]);

  return (
    <div className="space-y-6 font-sans w-full max-w-full overflow-hidden">
      {/* Top Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-sm border border-slate-200 bg-white p-5 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="text-base font-extrabold text-[#0D1F3D]">Version History</h3>
            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              {versionRecords.length > 0 ? versionRecords.length : 1} Versions Logged
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-0.5 leading-relaxed">
            Track all version revisions, commercial pricing updates, and limit changes made to this plan over time.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCompareModal(true)}
          className="gap-2 font-bold shadow-xs shrink-0 text-slate-700 bg-white border-slate-200 hover:bg-slate-50 cursor-pointer"
        >
          <GitCompare className="h-4 w-4 text-indigo-600" /> Compare Versions
        </Button>
      </div>

      {/* Main Grid: Left Column (2 Cols Timeline) + Right Column (1 Col Widgets) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column Timeline */}
        <div className="lg:col-span-2 space-y-4 min-w-0">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-6 min-w-0 overflow-hidden">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-[#0D1F3D]">Version Revision Timeline</h4>
              <span className="text-xs font-semibold text-slate-500">Ordered by most recent</span>
            </div>

            {/* Timeline List */}
            <div className="relative pl-8 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 min-w-0">
              {versionRecords.map((ver) => {
                const isActive = ver.status === 'Current';
                const isArchived = ver.status === 'Archived';
                const versionLabel = `v${ver.version.toFixed(1)}`;

                return (
                  <div key={ver.id} className="relative group min-w-0">
                    <div
                      className={`absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-white transition ${
                        isActive
                          ? 'border-emerald-600 text-emerald-600'
                          : isArchived
                          ? 'border-slate-300 text-slate-400'
                          : 'border-blue-600 text-blue-600'
                      }`}
                    >
                      {isActive ? (
                        <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-100 stroke-emerald-600" />
                      ) : isArchived ? (
                        <Archive className="h-3 w-3 text-slate-400" />
                      ) : (
                        <Clock className="h-3 w-3 text-blue-600" />
                      )}
                    </div>

                    {/* Version Card */}
                    <div className="rounded-sm border border-slate-200 bg-slate-50/50 p-4 hover:bg-white hover:border-slate-300 transition space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-extrabold text-[#0D1F3D]">{versionLabel}</span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${
                              isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : isArchived
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {ver.status}
                          </span>
                          {isActive && (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                              Current Active Version
                            </span>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSnapshot(ver)}
                          className="gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 cursor-pointer shrink-0"
                        >
                          <Eye className="h-3.5 w-3.5 text-indigo-600" /> View Details
                        </Button>
                      </div>

                      <div className="space-y-1 text-xs text-slate-700 font-medium">
                        {ver.changeSummary.map((summaryItem, idx) => (
                          <p key={idx} className="leading-relaxed break-words">• {summaryItem}</p>
                        ))}
                      </div>

                      {/* Meta Information Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/60 text-xs font-medium text-slate-600 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-5 w-5 rounded-full bg-[#0D1F3D] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                            {ver.actorName ? ver.actorName[0] : 'S'}
                          </span>
                          <span className="truncate">Published by <strong className="text-slate-800 font-bold">{ver.actorName}</strong></span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                          <span>Published: <strong className="text-slate-800">{ver.publishedAt}</strong></span>
                          <span>Effective: <strong className="text-slate-800">{ver.effectiveFrom}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-sm bg-blue-50/60 border border-blue-100 flex items-center gap-2 text-xs text-blue-700 font-medium">
              <Info className="h-4 w-4 shrink-0 text-blue-600" />
              <span>Only the current version (v{plan.version || 1.0}) is active and available for new subscriptions.</span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6 min-w-0">
          {/* Card 1: Version Summary */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 min-w-0">
            <h4 className="text-sm font-extrabold text-[#0D1F3D] border-b border-slate-100 pb-3">Version Summary</h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Total Logged Revisions</span>
                <span className="font-extrabold text-[#0D1F3D]">{versionRecords.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Active Version</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  v{plan.version || 1.0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Replaced Versions</span>
                <span className="font-extrabold text-[#0D1F3D]">{replacedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Archived Versions</span>
                <span className="font-extrabold text-[#0D1F3D]">{archivedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Created On</span>
                <span className="font-semibold text-slate-700">
                  {plan.createdAt ? new Date(plan.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '10 Jan 2024'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Last Revised</span>
                <span className="font-semibold text-slate-700">
                  {plan.updatedAt ? new Date(plan.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '28 May 2024'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: About Versioning */}
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3 min-w-0">
            <h4 className="text-sm font-bold text-[#0D1F3D]">About Versioning</h4>
            <div className="space-y-2.5 text-xs text-slate-600 font-medium">
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="break-words">Plan versioning tracks commercial revisions and limit updates over time.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="break-words">Active subscriptions inherit updated plan definitions upon renewal.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="break-words">Complete audit trails preserve historic commercial structures.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#0D1F3D]">Version Snapshot: v{selectedSnapshot.version.toFixed(1)}</h3>
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                  {selectedSnapshot.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1 text-slate-700 font-medium">
                {selectedSnapshot.changeSummary.map((s, i) => (
                  <p key={i}>• {s}</p>
                ))}
              </div>

              <div className="rounded-sm border border-slate-200 bg-slate-50 p-3 space-y-2">
                <h5 className="font-extrabold text-[#0D1F3D]">Snapshot Specs:</h5>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block">Monthly Price</span>
                    <span className="font-extrabold text-[#0D1F3D]">₹{selectedSnapshot.snapshot?.pricing?.monthlyPerUser ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Annual Price</span>
                    <span className="font-extrabold text-[#0D1F3D]">₹{selectedSnapshot.snapshot?.pricing?.annualPerUser ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Storage Limit</span>
                    <span className="font-extrabold text-[#0D1F3D]">{selectedSnapshot.snapshot?.limits?.storageGb ?? 0} GB</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">API Requests</span>
                    <span className="font-extrabold text-[#0D1F3D]">{(selectedSnapshot.snapshot?.limits?.apiRequestsPerMonth ?? 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSnapshot(null)}
                className="font-bold text-slate-700 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-4 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-[#0D1F3D]">
                Compare Versions (v{plan.version || 1.0} vs {previousRecord ? `v${previousRecord.version.toFixed(1)}` : 'v0.9'})
              </h3>
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-100 rounded-sm font-extrabold text-[#0D1F3D]">
                <span>Parameter</span>
                <span>{previousRecord ? `v${previousRecord.version.toFixed(1)}` : 'v0.9 (Previous)'}</span>
                <span>v{plan.version || 1.0} (Current)</span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Monthly Price</span>
                <span className="text-slate-600">
                  {previousRecord?.snapshot?.pricing?.monthlyPerUser ? `₹${previousRecord.snapshot.pricing.monthlyPerUser}` : '₹1,099'}
                </span>
                <span className="font-extrabold text-emerald-700">
                  {plan.pricing.monthlyPerUser ? `₹${plan.pricing.monthlyPerUser}` : '₹1,199'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Annual Price</span>
                <span className="text-slate-600">
                  {previousRecord?.snapshot?.pricing?.annualPerUser ? `₹${previousRecord.snapshot.pricing.annualPerUser}` : '₹899'}
                </span>
                <span className="font-extrabold text-emerald-700">
                  {plan.pricing.annualPerUser ? `₹${plan.pricing.annualPerUser}` : '₹999'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Storage Included</span>
                <span className="text-slate-600">
                  {previousRecord?.snapshot?.limits?.storageGb ? `${previousRecord.snapshot.limits.storageGb} GB` : '80 GB'}
                </span>
                <span className="font-extrabold text-emerald-700">
                  {plan.limits.storageGb ? `${plan.limits.storageGb} GB` : '100 GB'}
                </span>
              </div>
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompareModal(false)}
                className="font-bold text-slate-700 cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

