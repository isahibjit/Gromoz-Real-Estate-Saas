import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Copy,
  Archive,
  Edit,
  AlertTriangle,
  Code2,
  Layers,
  Globe,
  Calendar,
  Clock,
  MoreVertical,
  Check,
  Send,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Plan } from '../types/plan.types';
import { planService } from '../services/plan.service';
import { getPlanStatusBadge } from '../utils/plan-pricing.utils';
import { Button } from '../../../../../components/ui/Button';
import { usePlatformPermissions } from '../../../tenants/hooks/usePlatformPermissions';
import { extractErrorMessage } from '../../../../../common/api';

export interface PlanDetailHeaderProps {
  plan: Plan;
  activeTab: string;
  onRefresh: () => void;
}

export function PlanDetailHeader({ plan, activeTab, onRefresh }: PlanDetailHeaderProps) {
  const navigate = useNavigate();
  const { canCreatePlan, canUpdatePlan, canArchivePlan } = usePlatformPermissions();

  const [archiving, setArchiving] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showBetaConfirm, setShowBetaConfirm] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const statusBadge = getPlanStatusBadge(plan.status);

  const editConfig = React.useMemo(() => {
    switch (activeTab) {
      case 'pricing':
        return { label: 'Edit Pricing', step: 'pricing' };
      case 'limits':
        return { label: 'Edit Limits', step: 'limits' };
      case 'modules':
        return { label: 'Edit Modules', step: 'modules' };
      default:
        return { label: 'Edit Plan', step: 'basic' };
    }
  }, [activeTab]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(plan.code);
    setCopiedCode(true);
    toast.success(`Plan code '${plan.code}' copied to clipboard`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDuplicate = async () => {
    if (!canCreatePlan) return;
    setDuplicating(true);
    try {
      const duplicated = await planService.duplicatePlan(plan.id);
      toast.success(`Plan '${plan.name}' duplicated as draft '${duplicated.name}'`);
      navigate(`/platform/plans/create?planId=${duplicated.id}&step=basic`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to duplicate plan'));
    } finally {
      setDuplicating(false);
    }
  };

  const handlePublish = async (allowBetaModules = false) => {
    if (!canUpdatePlan) return;
    setPublishing(true);
    try {
      await planService.publishPlan(plan.id, allowBetaModules);
      toast.success(`Commercial Plan '${plan.name}' published as Active!`);
      setShowBetaConfirm(false);
      onRefresh();
    } catch (err: any) {
      const isBetaReq = err?.response?.data?.errors?.some(
        (e: any) => e.code === 'PLAN_MODULE_BETA_ACKNOWLEDGEMENT_REQUIRED'
      );
      if (isBetaReq && !allowBetaModules) {
        setShowBetaConfirm(true);
      } else {
        toast.error(extractErrorMessage(err, 'Failed to publish plan'));
      }
    } finally {
      setPublishing(false);
    }
  };

  const handleConfirmArchive = async () => {
    if (!canArchivePlan) return;
    setArchiving(true);
    try {
      await planService.archivePlan(plan.id);
      toast.success(`Plan '${plan.name}' has been archived.`);
      setShowArchiveConfirm(false);
      onRefresh();
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to archive plan'));
    } finally {
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Main Header Container */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200/80 pb-4">
        {/* Left Side: Star Icon + Title + Metadata */}
        <div className="flex items-start gap-3.5">
          {/* Star Icon Container */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100/90 text-purple-600 border border-purple-200/80 shadow-xs">
            <Star className="h-6 w-6 fill-purple-200 stroke-purple-600 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-[#0D1F3D]">{plan.name}</h1>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
              <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200/80">
                v{plan.version || 1}
              </span>
              {plan.badge && plan.badge !== 'None' && (
                <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold text-amber-700 border border-amber-200">
                  {plan.badge}
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-slate-600 leading-snug">
              {plan.description || 'Complete field sales and operations management solution for growing teams.'}
            </p>

            {/* Crisp Sub-metadata Pills Row adhering to VISIBLO Typography Rules */}
            <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs">
              {/* Code Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Code2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Code: <strong className="font-mono text-slate-800 font-bold">{plan.code}</strong></span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="ml-1 text-slate-500 hover:text-indigo-600 cursor-pointer"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>

              {/* Tier Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                <span>Tier: <strong className="text-indigo-700 font-bold">{plan.tier}</strong></span>
              </div>

              {/* Visibility Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Globe className="h-3.5 w-3.5 text-slate-500" />
                <span>Visibility: <strong className="text-slate-800 font-bold">{plan.visibility}</strong></span>
              </div>

              {/* Created On Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Created on: <strong className="text-slate-800 font-bold">{plan.createdAt?.split('T')[0] || '10 Jan 2024'}</strong></span>
              </div>

              {/* Last Updated Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-sm bg-slate-100/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/60">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Last updated: <strong className="text-slate-800 font-bold">{plan.updatedAt?.split('T')[0] || '28 May 2024'}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          {canCreatePlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDuplicate}
              disabled={duplicating}
              className="gap-2 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
            >
              <Copy className="h-4 w-4 text-slate-500" />
              {duplicating ? 'Duplicating...' : 'Duplicate'}
            </Button>
          )}

          {canArchivePlan && plan.status !== 'Archived' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchiveConfirm(true)}
              className="gap-2 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
            >
              <Archive className="h-4 w-4 text-slate-500" />
              Archive
            </Button>
          )}

          {canUpdatePlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/platform/plans/create?planId=${plan.id}&step=${editConfig.step}`)}
              className="gap-2 font-bold text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
            >
              <Edit className="h-4 w-4 text-slate-500" />
              {editConfig.label}
            </Button>
          )}

          {canUpdatePlan && plan.status === 'Draft' && (
            <Button
              variant="accent"
              size="sm"
              onClick={() => handlePublish(false)}
              disabled={publishing}
              className="gap-2 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white border-none"
            >
              <Send className="h-4 w-4" />
              {publishing ? 'Publishing...' : 'Publish Plan'}
            </Button>
          )}

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Archive Modal Confirmation */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-center font-sans">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0D1F3D]">Archive Commercial Plan</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Archived plans will no longer be available for new tenant subscriptions. Existing tenant records subscribed to{' '}
                <strong>{plan.name}</strong> will not be deleted.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowArchiveConfirm(false)}
                disabled={archiving}
                className="flex-1 font-bold justify-center"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleConfirmArchive}
                disabled={archiving}
                className="flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white justify-center"
              >
                {archiving ? 'Archiving...' : 'Archive Plan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Beta Module Acknowledgment Confirmation Modal */}
      {showBetaConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-center font-sans">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0D1F3D]">Publish Plan with Beta Modules</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">
                This plan includes BETA stage modules (e.g. AI Copilot). Do you want to acknowledge beta module inclusion and publish <strong>{plan.name}</strong> as Active?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBetaConfirm(false)}
                disabled={publishing}
                className="flex-1 font-bold justify-center"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => handlePublish(true)}
                disabled={publishing}
                className="flex-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white justify-center"
              >
                {publishing ? 'Publishing...' : 'Acknowledge & Publish'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
