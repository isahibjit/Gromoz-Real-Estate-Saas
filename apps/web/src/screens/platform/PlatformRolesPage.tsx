import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, Terminal, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export function PlatformRolesPage() {
  const navigate = useNavigate();

  const requiredApis = [
    { endpoint: 'GET /platform/roles', purpose: 'List platform operator roles, permission matrix, and assignment counts' },
    { endpoint: 'GET /platform/roles/:id', purpose: 'Retrieve platform role details and permission scopes' },
    { endpoint: 'POST /platform/roles', purpose: 'Create or update platform operator roles (if management enabled)' },
    { endpoint: 'GET /platform/users/roles', purpose: 'List platform operator user role assignments across SaaS administrators' },
  ];

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* Breadcrumb Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <button
              type="button"
              onClick={() => navigate('/platform/dashboard')}
              className="hover:text-[#0D1F3D]"
            >
              Dashboard
            </button>
            <span>›</span>
            <span>Platform RBAC</span>
            <span>›</span>
            <span className="font-extrabold text-[#0D1F3D]">Platform Roles & Security</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight mt-1.5">
            Platform Roles & RBAC Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            SaaS Platform Operator Role Definitions and Security Permissions Matrix.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/platform/dashboard')}
          className="gap-2 font-bold text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </div>

      {/* Main Explicit API Gap Notice Callout Container */}
      <div className="rounded-sm border border-amber-300 bg-amber-50/60 p-6 shadow-xs space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-amber-100 text-amber-800 border border-amber-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-extrabold text-amber-950 text-sm bg-amber-200/70 px-2 py-0.5 rounded-xs border border-amber-300">
                PLATFORM_RBAC_FRONTEND_BLOCKED_BY_API_EXPOSURE
              </span>
            </div>
            <h2 className="text-base font-extrabold text-amber-950">
              Platform RBAC Feature Blocked by Missing HTTP API Exposure
            </h2>
            <p className="text-xs text-amber-900 font-medium leading-relaxed max-w-3xl">
              Internal backend services (<code>PlatformRoleService</code>) exist in Phase 0.4, but no HTTP Controller endpoints are exposed in the backend API layer to read or manage platform roles. The frontend strictly refuses to invent client-side RBAC semantics or fabricate fake role persistence.
            </p>
          </div>
        </div>

        <div className="border-t border-amber-200/80 pt-4 space-y-3">
          <h3 className="text-xs font-extrabold text-amber-950 flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-amber-800" /> Smallest Required Backend Read/Manage API Exposure:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {requiredApis.map((apiItem) => (
              <div key={apiItem.endpoint} className="p-3 rounded-sm border border-amber-200 bg-white/80 space-y-1">
                <span className="font-mono font-extrabold text-xs text-[#0D1F3D] block">{apiItem.endpoint}</span>
                <span className="text-[11px] text-slate-600 font-medium block">{apiItem.purpose}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-amber-200/80 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-950 font-semibold">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-700" />
            <span>Frozen Phase 0.4 Architecture Rule: Zero mock persistence allowed.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/platform/tenants')}
            className="font-bold text-amber-900 border-amber-300 bg-amber-100/60 hover:bg-amber-100"
          >
            Go to Tenant Management
          </Button>
        </div>
      </div>
    </div>
  );
}
