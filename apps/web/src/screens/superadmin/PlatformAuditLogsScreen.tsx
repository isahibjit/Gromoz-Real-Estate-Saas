import React, { useState, useEffect } from "react";
import { ShieldAlert, Search, RotateCcw, Building2, User, Clock, FileText } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button } from "ui";
import { api } from "../../common/api";

export function PlatformAuditLogsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/organizations/platform-audit-logs");
      setLogs(res.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const s = searchTerm.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(s)) ||
      (log.user?.email && log.user.email.toLowerCase().includes(s)) ||
      (log.organization?.name && log.organization.name.toLowerCase().includes(s))
    );
  });

  return (
    <div className="space-y-6 pb-12 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Platform Audit Logs</h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
              <ShieldAlert className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Immutable security and administrative audit trail across all tenants
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="gap-2 font-bold text-slate-700"
        >
          <RotateCcw className="h-4 w-4 text-slate-400" /> Refresh Logs
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit trail by user, action, tenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-sm border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-[#0D1F3D] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0D1F3D] transition"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-sm border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-bold text-[#0D1F3D]">
                <th className="py-3 px-4 w-8">#</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Operator / User</th>
                <th className="py-3 px-4">Tenant Organization</th>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Resource Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-block animate-spin h-5 w-5 border-2 border-[#0D1F3D] border-t-transparent rounded-full mb-2" />
                    <p className="text-xs font-semibold">Loading security audit records...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm font-bold text-[#0D1F3D]">No audit log entries found</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.user?.fullName || log.user?.email || "System"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0D1F3D]">
                      {log.organization?.name || "Global Platform"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {log.targetType || "ORGANIZATION"} {log.targetId ? `(${log.targetId.slice(0, 8)}...)` : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
