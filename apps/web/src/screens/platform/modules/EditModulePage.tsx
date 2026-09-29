import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Info, ShieldAlert, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { moduleService } from '../../../features/platform/catalog/modules/services/module.service';
import {
  PlatformModule,
  PlatformModuleStatus,
} from '../../../features/platform/catalog/modules/types/module.types';

const statusOptions = [
  { value: 'DRAFT', label: 'DRAFT' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'BETA', label: 'BETA' },
  { value: 'DEPRECATED', label: 'DEPRECATED' },
];

export function EditModulePage() {
  const params = useParams<{ moduleId?: string; id?: string }>();
  const moduleId = params.moduleId || params.id;
  const navigate = useNavigate();

  const [module, setModule] = useState<PlatformModule | null>(null);
  const [status, setStatus] = useState<PlatformModuleStatus>('ACTIVE');
  const [internalNotes, setInternalNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!moduleId) return;
    moduleService
      .getModuleById(moduleId)
      .then((data) => {
        if (data) {
          setModule(data);
          setStatus(data.status);
          setInternalNotes(data.internalNotes || '');
        } else {
          toast.error('Module not found.');
          navigate('/platform/modules');
        }
      })
      .catch(() => {
        toast.error('Failed to load module.');
        navigate('/platform/modules');
      });
  }, [moduleId, navigate]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!module) return;

    setSaving(true);
    try {
      await moduleService.updateModule(module.id, {
        status,
        internalNotes: internalNotes.trim() || undefined,
      });

      toast.success(`Module '${module.name}' operational metadata updated.`);
      navigate(`/platform/modules/${module.id}`);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      toast.error(message ?? 'Failed to update module metadata.');
    } finally {
      setSaving(false);
    }
  };

  if (!module) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0D1F3D] mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading module editor...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-20 font-sans">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">Edit Module Operational Metadata: {module.name}</h1>
            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-sm border border-indigo-200">
              {module.code}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            Module identity and canonical capability declarations are developer-owned in code.
          </p>
        </div>

        <div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => navigate(`/platform/modules/${module.id}`)}
            className="gap-2 font-bold text-slate-700 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel & Back
          </Button>
        </div>
      </div>

      {/* Registry Info Notice Banner */}
      <div className="rounded-sm border border-blue-200/80 bg-blue-50/60 p-3.5 text-xs font-medium text-slate-700 flex items-center gap-2.5 shadow-2xs">
        <Info className="h-4 w-4 text-blue-600 shrink-0" />
        <span>
          Canonical name, description, category, display order, and dependency edges are owned by the developer code registry. Operational lifecycle status and internal admin notes can be edited below.
        </span>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Read-Only Code Registry Metadata */}
          <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-[#0D1F3D]">Developer-Owned Code Registry</h2>
              <p className="text-xs font-medium text-slate-500">
                Canonical capability fields synchronized from developer registry.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Module Name (Developer-Owned)" value={module.name} disabled />
              <Input label="Module Code (Developer-Owned)" value={module.code} disabled />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">Description (Developer-Owned)</label>
              <textarea
                rows={2}
                value={module.description}
                disabled
                className="w-full rounded-sm border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-700"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Category (Developer-Owned)" value={module.category} disabled />
              <Input label="Required By System" value={module.requiredBySystem ? 'Yes' : 'No'} disabled />
            </div>
          </section>

          {/* Card 2: Editable Operational Metadata */}
          <section className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-[#0D1F3D]">Editable Operational Metadata</h2>
              <p className="text-xs font-medium text-slate-500">
                Admin lifecycle status and internal operational notes.
              </p>
            </div>

            <div className="space-y-4">
              <Select
                label="Operational Status *"
                value={status}
                onChange={(e) => setStatus(e.target.value as PlatformModuleStatus)}
                options={statusOptions}
              />

              {module.requiredBySystem && status === 'ARCHIVED' && (
                <div className="rounded-sm border border-amber-200 bg-amber-50/70 p-3 text-xs font-medium text-amber-900 flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>System-required modules cannot be archived.</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Internal Operational Notes</label>
                <textarea
                  rows={4}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Enter internal release, compliance, or operational notes..."
                  className="w-full rounded-sm border border-slate-200 bg-white p-3 text-xs font-medium text-[#0D1F3D] placeholder-slate-400 focus:border-[#0D1F3D] focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* Action Footer */}
          <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate(`/platform/modules/${module.id}`)}
              className="font-bold text-slate-700"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              isLoading={saving}
              className="font-extrabold bg-[#0D1F3D] text-white hover:bg-[#162e57] px-6 gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Operational Metadata'}
            </Button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-6 sticky top-24">
          <section className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 font-sans">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="h-4 w-4 text-indigo-600 shrink-0" />
              <h3 className="text-sm font-extrabold text-[#0D1F3D]">Module Operational State</h3>
            </div>

            <div className="rounded-sm border border-slate-200 bg-slate-50/80 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Status</span>
                <span className="font-extrabold text-emerald-700">{status}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500 font-medium">Dependencies</span>
                <span className="font-mono font-bold text-slate-800">
                  {module.dependencyCodes.length > 0 ? module.dependencyCodes.join(', ') : 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Features</span>
                <span className="font-bold text-slate-800">{module.features.length} Features</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}
