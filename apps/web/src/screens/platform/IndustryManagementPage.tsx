import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building,
  CheckCircle2,
  Clock,
  Archive,
  Layers,
  Sparkles,
  Search,
  Plus,
  ChevronRight,
  Shield,
  FileCode,
  Info,
  AlertTriangle,
  Send,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  industryService,
  IndustryTemplate,
  IndustryTemplateVersion,
} from '../../features/platform/industries/services/industry.service';

export function IndustryManagementPage() {
  const navigate = useNavigate();
  const [industries, setIndustries] = useState<IndustryTemplate[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryTemplate | null>(null);
  const [versions, setVersions] = useState<IndustryTemplateVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<IndustryTemplateVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Publish Modal State
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [versionToPublish, setVersionToPublish] = useState<IndustryTemplateVersion | null>(null);
  const [approvalReference, setApprovalReference] = useState('');
  const [publishReason, setPublishReason] = useState('');
  const [publishing, setPublishing] = useState(false);

  // New Draft Modal State
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftReason, setDraftReason] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);

  useEffect(() => {
    loadIndustries();
  }, []);

  const loadIndustries = async () => {
    setLoading(true);
    try {
      const data = await industryService.getIndustries();
      setIndustries(data);
      if (data.length > 0 && !selectedIndustry) {
        handleSelectIndustry(data[0]);
      }
    } catch {
      toast.error('Failed to load industries from authoritative API');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectIndustry = async (template: IndustryTemplate) => {
    setSelectedIndustry(template);
    setLoadingVersions(true);
    try {
      const vList = await industryService.getVersions(template.id);
      setVersions(vList);
      if (vList.length > 0) {
        setSelectedVersion(vList[0]);
      } else {
        setSelectedVersion(null);
      }
    } catch {
      toast.error('Failed to load industry template versions');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndustry || !versionToPublish) return;

    if (!approvalReference.trim()) {
      toast.error('Approval reference is required to publish an industry version');
      return;
    }
    if (!publishReason.trim()) {
      toast.error('Reason is required to publish an industry version');
      return;
    }

    setPublishing(true);
    try {
      await industryService.publishVersion(selectedIndustry.id, versionToPublish.id, {
        expectedRevision: versionToPublish.revision,
        approvalReference: approvalReference.trim(),
        reason: publishReason.trim(),
      });
      toast.success(`Industry version ${versionToPublish.version} published successfully`);
      setPublishModalOpen(false);
      setApprovalReference('');
      setPublishReason('');
      setVersionToPublish(null);
      await handleSelectIndustry(selectedIndustry);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to publish industry version');
    } finally {
      setPublishing(false);
    }
  };

  const handleCreateDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIndustry) return;

    if (!draftReason.trim()) {
      toast.error('Reason is required to create a new draft');
      return;
    }

    setCreatingDraft(true);
    try {
      await industryService.createDraft(selectedIndustry.id, {
        reason: draftReason.trim(),
      });
      toast.success('New draft version created successfully');
      setDraftModalOpen(false);
      setDraftReason('');
      await handleSelectIndustry(selectedIndustry);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create new draft version');
    } finally {
      setCreatingDraft(false);
    }
  };

  const filteredIndustries = industries.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 font-sans text-slate-800 pb-16">
      {/* 1. Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
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
            <span className="font-extrabold text-[#0D1F3D]">Industry Verticals</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D] tracking-tight">
              Industry Verticals & Templates
            </h1>
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-blue-100 text-blue-700">
              <Building className="h-4.5 w-4.5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage industry-specific configurations, version immutability, and advisory recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="accent"
            size="sm"
            onClick={() => setDraftModalOpen(true)}
            disabled={!selectedIndustry}
            className="gap-1.5 font-bold bg-[#0D1F3D] hover:bg-[#1A365D] text-white shadow-xs"
          >
            <Plus className="h-4 w-4" /> Create Next Draft
          </Button>
        </div>
      </div>

      {/* 2. Advisory Notice Banner */}
      <div className="rounded-sm border border-blue-200 bg-blue-50/70 p-4 space-y-1 text-xs">
        <div className="flex items-center gap-2 text-blue-950 font-extrabold">
          <Info className="h-4 w-4 text-blue-600 shrink-0" />
          <span>Industry Versioning & Commercial Authority Rules</span>
        </div>
        <p className="text-[11px] text-blue-900 font-medium leading-relaxed">
          Industry template versions are strictly immutable once PUBLISHED. Publishing a new version does not auto-migrate existing tenants.
          Recommended modules are strictly advisory and do not grant commercial entitlements.
        </p>
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Industry List */}
        <div className="lg:col-span-4 rounded-sm border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search industries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-500 font-medium">
                <div className="inline-block animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
                <p>Loading industries...</p>
              </div>
            ) : filteredIndustries.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 font-medium">
                No industry verticals found.
              </div>
            ) : (
              filteredIndustries.map((ind) => {
                const isSelected = selectedIndustry?.id === ind.id;
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => handleSelectIndustry(ind)}
                    className={`w-full text-left p-3 rounded-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-[#0D1F3D]">{ind.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-slate-100 font-bold text-slate-600">
                          {ind.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{ind.category}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Version History and Selected Version Details */}
        <div className="lg:col-span-8 space-y-6">
          {selectedIndustry ? (
            <div className="space-y-6">
              {/* Stable Template Header Card */}
              <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-extrabold text-[#0D1F3D]">
                        {selectedIndustry.name}
                      </h2>
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        {selectedIndustry.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {selectedIndustry.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="text-slate-400 block text-[10px]">Revision</span>
                    <span className="font-mono font-bold text-slate-700">rev.{selectedIndustry.revision}</span>
                  </div>
                </div>
              </div>

              {/* Version List & Version Detail Card */}
              <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-extrabold text-[#0D1F3D]">
                    Template Versions ({versions.length})
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Schema v1 • Immutable on Publish
                  </span>
                </div>

                {loadingVersions ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Loading version history...
                  </div>
                ) : versions.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No versions found for this template.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Versions Pill Selector */}
                    <div className="flex flex-wrap gap-2">
                      {versions.map((v) => {
                        const isSelected = selectedVersion?.id === v.id;
                        const isPublished = v.status === 'PUBLISHED';
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVersion(v)}
                            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all flex items-center gap-2 border ${
                              isSelected
                                ? 'bg-[#0D1F3D] text-white border-[#0D1F3D] shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <span>v{v.version}</span>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-xs font-extrabold ${
                                isPublished
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {v.status}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Version Detail Container */}
                    {selectedVersion && (
                      <div className="rounded-sm border border-slate-100 bg-slate-50/50 p-4 space-y-4 mt-3">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-extrabold text-[#0D1F3D]">
                                Version {selectedVersion.version}
                              </h4>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  selectedVersion.status === 'PUBLISHED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {selectedVersion.status}
                              </span>
                              {selectedVersion.status === 'PUBLISHED' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                  <Lock className="h-3 w-3 text-slate-400" /> Read-Only
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Schema Version: {selectedVersion.schemaVersion} • Created on{' '}
                              {new Date(selectedVersion.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {selectedVersion.status === 'DRAFT' && (
                            <Button
                              variant="accent"
                              size="sm"
                              onClick={() => {
                                setVersionToPublish(selectedVersion);
                                setPublishModalOpen(true);
                              }}
                              className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Send className="h-3.5 w-3.5" /> Publish Version
                            </Button>
                          )}
                        </div>

                        {/* Snapshot Detail Sections */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-sm border border-slate-200 bg-white p-3 space-y-2">
                            <span className="text-xs font-bold text-[#0D1F3D] block">
                              Recommended Modules (Advisory)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedVersion.recommendedModuleCodes || []).length === 0 ? (
                                <span className="text-xs text-slate-400 font-medium">None recommended</span>
                              ) : (
                                selectedVersion.recommendedModuleCodes?.map((code) => (
                                  <span
                                    key={code}
                                    className="px-2 py-0.5 rounded-xs bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-100"
                                  >
                                    {code}
                                  </span>
                                ))
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium">
                              Note: Advisory only. Module entitlement requires subscription grant.
                            </p>
                          </div>

                          <div className="rounded-sm border border-slate-200 bg-white p-3 space-y-2">
                            <span className="text-xs font-bold text-[#0D1F3D] block">
                              Approval Reference & Provenance
                            </span>
                            <p className="text-xs text-slate-600 font-medium">
                              {selectedVersion.approvalReference || 'Draft - Pending Approval'}
                            </p>
                            {selectedVersion.publishedAt && (
                              <p className="text-[10px] text-slate-400 font-medium">
                                Published at {new Date(selectedVersion.publishedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Terminology & Master Defaults (Schema v1 Empty Snapshot) */}
                        <div className="rounded-sm border border-slate-200 bg-white p-3 space-y-1">
                          <span className="text-xs font-bold text-[#0D1F3D] block">
                            Terminology & Master Defaults Snapshot
                          </span>
                          <p className="text-xs text-slate-500 font-medium">
                            Approved Schema v1 uses canonical system seed definitions. Full master values are governed by <code className="font-mono text-[11px] text-indigo-700">/tenant/masters</code>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 text-center border border-slate-200 bg-white rounded-sm">
              <Building className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-[#0D1F3D]">No Industry Vertical Selected</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Select an industry vertical from the left column to view its version history.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Publish Version Modal */}
      {publishModalOpen && versionToPublish && (
        <Modal
          isOpen={publishModalOpen}
          onClose={() => setPublishModalOpen(false)}
          title={`Publish Version ${versionToPublish.version} — ${selectedIndustry?.name}`}
        >
          <form onSubmit={handlePublishSubmit} className="space-y-4 font-sans text-xs">
            <div className="rounded-sm bg-amber-50 p-3 border border-amber-200 text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Irreversible Lifecycle Action
              </p>
              <p className="text-[11px] font-medium leading-relaxed">
                Publishing locks this version permanently as immutable. Existing tenants pinned to older versions will remain on their current version until explicitly migrated.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Approval Reference <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={approvalReference}
                onChange={(e) => setApprovalReference(e.target.value)}
                placeholder="e.g. APRV-2026-IND-PHARMA-01"
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Publication Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={publishReason}
                onChange={(e) => setPublishReason(e.target.value)}
                placeholder="Explain the changes and intent of this published version..."
                className="w-full h-20 p-2.5 text-xs bg-white border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                type="submit"
                disabled={publishing}
                className="font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {publishing ? 'Publishing...' : 'Confirm & Publish'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Next Draft Modal */}
      {draftModalOpen && selectedIndustry && (
        <Modal
          isOpen={draftModalOpen}
          onClose={() => setDraftModalOpen(false)}
          title={`Create Next Draft — ${selectedIndustry.name}`}
        >
          <form onSubmit={handleCreateDraftSubmit} className="space-y-4 font-sans text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 block">
                Reason for Next Draft <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={draftReason}
                onChange={(e) => setDraftReason(e.target.value)}
                placeholder="e.g. Updating recommended modules and baseline terminology for Q3 release..."
                className="w-full h-24 p-2.5 text-xs bg-white border border-slate-200 rounded-sm focus:outline-none focus:border-indigo-600"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setDraftModalOpen(false)}
                className="font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                size="sm"
                type="submit"
                disabled={creatingDraft}
                className="font-bold bg-[#0D1F3D] hover:bg-[#1A365D] text-white"
              >
                {creatingDraft ? 'Creating...' : 'Create Draft'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
