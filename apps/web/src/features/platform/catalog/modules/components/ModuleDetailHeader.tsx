import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Edit,
  Archive,
  RotateCcw,
  Code2,
  Copy,
  Check,
  Calendar,
  Clock,
  ChevronDown,
  Layers,
  GitBranch,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { PlatformModule } from '../types/module.types';
import { moduleService } from '../services/module.service';
import { ModuleStatusBadge } from './ModuleStatusBadge';
import { ModuleCategoryBadge } from './ModuleCategoryBadge';
import { Button } from '../../../../../components/ui/Button';
import { usePlatformPermissions } from '../../../tenants/hooks/usePlatformPermissions';

export interface ModuleDetailHeaderProps {
  module: PlatformModule;
  onRefresh: () => void;
}

export function ModuleDetailHeader({ module, onRefresh }: ModuleDetailHeaderProps) {
  const navigate = useNavigate();
  const { canUpdateModule, canArchiveModule } = usePlatformPermissions();

  const [showMoreActions, setShowMoreActions] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(module.code);
    setCopiedCode(true);
    toast.success(`Module code '${module.code}' copied to clipboard`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleArchiveRestore = async () => {
    setArchiving(true);
    setShowMoreActions(false);
    try {
      if (module.status === 'ARCHIVED') {
        await moduleService.restoreModule(module.id);
        toast.success(`Module '${module.name}' restored successfully.`);
      } else {
        await moduleService.archiveModule(module.id);
        toast.success(`Module '${module.name}' archived successfully.`);
      }
      onRefresh();
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error(message ?? 'Lifecycle action failed.');
    } finally {
      setArchiving(false);
    }
  };

  const formattedCreated = module.createdAt ? new Date(module.createdAt).toLocaleDateString() : '—';
  const formattedUpdated = module.updatedAt ? new Date(module.updatedAt).toLocaleDateString() : '—';

  return (
    <div className="space-y-4 font-sans">
      {/* Main Header Container */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/80 pb-4">
        {/* Left Side: Package Icon + Title + Metadata */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100/90 text-purple-600 border border-purple-200/80 shadow-xs">
            <Package className="h-6 w-6 stroke-purple-600 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-[#0D1F3D]">{module.name}</h1>
              <ModuleStatusBadge status={module.status} />
              <ModuleCategoryBadge category={module.category} />
              {module.requiredBySystem && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-800 border border-amber-200">
                  Protected System Module
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-slate-600 leading-snug max-w-3xl">
              {module.description}
            </p>

            {/* Crisp Sub-metadata Pills Row */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs">
              {/* Code Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Code2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Code: <strong className="font-mono text-slate-800 font-bold">{module.code}</strong></span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="ml-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              {/* Created On Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Created: <strong className="text-slate-800 font-bold">{formattedCreated}</strong></span>
              </div>

              {/* Last Updated Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Updated: <strong className="text-slate-800 font-bold">{formattedUpdated}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/platform/modules')}
            className="gap-1.5 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 h-9"
          >
            ← Back to Modules
          </Button>

          {/* More Actions Dropdown */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMoreActions(!showMoreActions)}
              className="gap-1.5 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50 h-9"
            >
              More Actions <ChevronDown className="h-3.5 w-3.5" />
            </Button>

            {showMoreActions && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-sm border border-slate-200 bg-white p-1.5 shadow-xl text-xs font-semibold space-y-1 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate(`/platform/modules/${module.id}/dependencies`);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xs flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <GitBranch className="h-3.5 w-3.5 text-slate-400" />
                  Manage Dependencies
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate('/platform/modules/features');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xs flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  View Feature Registry
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreActions(false);
                    navigate(`/platform/modules/${module.id}/history`);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xs flex items-center gap-2 text-slate-700 cursor-pointer"
                >
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  View Audit History
                </button>

                {/* Show Archive only if module is NOT requiredBySystem */}
                {canArchiveModule && !module.requiredBySystem && (
                  <>
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      type="button"
                      onClick={() => void handleArchiveRestore()}
                      disabled={archiving}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 rounded-xs flex items-center gap-2 font-bold cursor-pointer ${
                        module.status === 'ARCHIVED' ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {module.status === 'ARCHIVED' ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 text-emerald-600" />
                          Restore Module
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5 text-rose-600" />
                          Archive Module
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Primary Action: Edit Module */}
          {canUpdateModule && module.status !== 'ARCHIVED' && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => navigate(`/platform/modules/${module.id}/edit`)}
              className="gap-2 font-bold shadow-xs bg-[#E20613] hover:bg-red-700 text-white border-none h-9"
            >
              <Edit className="h-4 w-4" />
              Edit Module
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
