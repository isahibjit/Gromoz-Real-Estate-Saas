import React, { useEffect, useState } from 'react';
import {
  FileText,
  Shield,
  Search,
  RotateCcw,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Eye,
  Calendar,
  Layers,
  Lock,
  X,
  Info,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  auditService,
  AuditEventSummary,
  AuditEventDetail,
  AuditQueryFilters,
} from '../../features/platform/audit/services/audit.service';
import { toast } from 'sonner';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');
  const [eventCodeSearch, setEventCodeSearch] = useState('');
  const [tenantIdFilter, setTenantIdFilter] = useState('');

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<AuditEventDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [categoryFilter, outcomeFilter]);

  const loadLogs = async (cursor?: string) => {
    setLoading(true);
    try {
      const filters: AuditQueryFilters = {
        limit: 25,
        cursor,
      };
      if (categoryFilter !== 'ALL') {
        filters.category = categoryFilter as any;
      }
      if (outcomeFilter !== 'ALL') {
        filters.outcome = outcomeFilter as any;
      }
      if (eventCodeSearch.trim()) {
        filters.eventCode = eventCodeSearch.trim();
      }
      if (tenantIdFilter.trim()) {
        filters.tenantId = tenantIdFilter.trim();
      }

      const res = await auditService.getAuditLogs(filters);
      if (cursor) {
        setLogs((prev) => [...prev, ...res.items]);
      } else {
        setLogs(res.items);
      }
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id: string) => {
    setDetailModalOpen(true);
    setLoadingDetail(true);
    try {
      const detail = await auditService.getAuditDetail(id);
      setSelectedDetail(detail);
    } catch {
      toast.error('Failed to load audit event details');
      setDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Success
          </span>
        );
      case 'DENIED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200">
            <Lock className="h-3 w-3 text-amber-600" /> Denied
          </span>
        );
      case 'FAILURE':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 border border-rose-200">
            <AlertOctagon className="h-3 w-3 text-rose-600" /> Failure
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight">
              Platform Operational Audit Logs
            </h1>
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-indigo-100 text-indigo-700">
              <Shield className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            Immutable, cryptographically verified audit records with automated privacy redaction.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadLogs()}
            className="gap-1.5 font-bold text-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Controls Card */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="font-semibold text-slate-600 block mb-1">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">All Categories</option>
            <option value="AUTH">Authentication</option>
            <option value="RBAC">RBAC & Roles</option>
            <option value="CATALOG">Catalog & Modules</option>
            <option value="PLAN">Plans & Pricing</option>
            <option value="SUBSCRIPTION">Subscriptions</option>
            <option value="PROVISIONING">Provisioning</option>
            <option value="INDUSTRY">Industry Templates</option>
            <option value="MASTER">Master Engine</option>
            <option value="MEDIA">Private Media</option>
            <option value="JOB">Job Workers</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-slate-600 block mb-1">Outcome</label>
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:border-indigo-600"
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Denied Only</option>
            <option value="FAILURE">Failure Only</option>
          </select>
        </div>

        <div>
          <label className="font-semibold text-slate-600 block mb-1">Event Code / Action</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. subscription.created"
              value={eventCodeSearch}
              onChange={(e) => setEventCodeSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLogs()}
              className="w-full h-8 pl-8 pr-2.5 bg-slate-50 border border-slate-200 rounded-sm font-medium focus:outline-none focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="flex items-end">
          <Button
            variant="accent"
            size="sm"
            onClick={() => loadLogs()}
            className="w-full h-8 font-bold bg-[#0D1F3D] hover:bg-[#1A365D] text-white justify-center"
          >
            Apply Filters
          </Button>
        </div>
      </div>

      {/* Datatable */}
      <div className="rounded-sm border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-[#F8FAFC] text-slate-700 font-extrabold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action / Event</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <div className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
                    <p className="text-xs font-semibold">Loading audit events from backend...</p>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <Shield className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-bold text-[#0D1F3D]">No audit records found</p>
                    <p className="text-xs text-slate-400 font-medium">No events match the selected criteria.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-[#0D1F3D]">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded-xs bg-slate-100 text-slate-700 font-mono text-[10px] font-bold border border-slate-200">
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[11px] text-slate-600">
                      {log.scope} {log.tenantId ? `(${log.tenantId.substring(0, 8)}...)` : ''}
                    </td>
                    <td className="py-3 px-4">{getOutcomeBadge(log.outcome)}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.actorType} · {log.actorUserId ? log.actorUserId.substring(0, 8) + '...' : 'system'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {log.entityType ? `${log.entityType} (${log.entityId?.substring(0, 8)}...)` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDetail(log.id)}
                        className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="p-3 border-t border-slate-100 text-center bg-slate-50/50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => nextCursor && loadLogs(nextCursor)}
              disabled={loading}
              className="text-xs font-bold"
            >
              {loading ? 'Loading...' : 'Load Older Events'}
            </Button>
          </div>
        )}
      </div>

      {/* Inspect Detail Modal */}
      {detailModalOpen && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Audit Event Details & Metadata"
        >
          {loadingDetail || !selectedDetail ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading details...</div>
          ) : (
            <div className="space-y-4 font-sans text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-sm border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Action</span>
                  <span className="font-mono font-bold text-[#0D1F3D]">{selectedDetail.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Category & Outcome</span>
                  <span className="font-bold text-slate-700">
                    {selectedDetail.category} · {selectedDetail.outcome}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Correlation ID</span>
                  <span className="font-mono text-slate-600">{selectedDetail.correlationId || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Request ID</span>
                  <span className="font-mono text-slate-600">{selectedDetail.requestId || '—'}</span>
                </div>
              </div>

              {/* Redacted Metadata Payload */}
              <div className="space-y-1.5">
                <span className="font-extrabold text-slate-700 block">
                  Structured Payload Metadata (Auto-Redacted)
                </span>
                <pre className="p-3 rounded-sm bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60">
                  {JSON.stringify(
                    {
                      metadata: selectedDetail.metadata,
                      beforeJson: selectedDetail.beforeJson,
                      afterJson: selectedDetail.afterJson,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailModalOpen(false)}
                  className="font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
