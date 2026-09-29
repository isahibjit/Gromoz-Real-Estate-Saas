import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ArrowRight,
  CheckCircle,
  Save,
  AlertTriangle,
  Crown,
  Search,
  Lock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  PlanCreationProvider,
  usePlanCreation,
} from '../../features/platform/catalog/plans/context/PlanCreationContext';
import {
  PricingModel,
  PlanVisibility,
  TaxMode,
  ProrationPolicy,
  ExpiryAccess,
} from '../../features/platform/catalog/plans/types/plan.types';
import { moduleService } from '../../features/platform/catalog/modules/services/module.service';
import { PlatformModule } from '../../features/platform/catalog/modules/types/module.types';
import {
  formatCurrency,
  formatPlanMonthlyPrice,
  formatPlanAnnualPrice,
  formatLimit,
} from '../../features/platform/catalog/plans/utils/plan-pricing.utils';
import {
  validateBasicInformation,
  validatePricing,
  validateLimits,
  validateModules,
  validateCommercialRules,
} from '../../features/platform/catalog/plans/utils/plan-validation.utils';
import { planService } from '../../features/platform/catalog/plans/services/plan.service';
import { extractErrorMessage } from '../../common/api';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { ModuleSelectionGrid } from '../../components/platform/ModuleSelectionGrid';

const STEP_NUM_MAP: Record<number, string> = {
  1: 'basic',
  2: 'pricing',
  3: 'limits',
  4: 'modules',
  5: 'rules',
  6: 'review',
};

const STEP_NAME_MAP: Record<string, number> = {
  basic: 1,
  pricing: 2,
  limits: 3,
  modules: 4,
  rules: 5,
  review: 6,
};

function WizardContent() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    currentStep,
    setCurrentStep,
    formState,
    updateFormState,
    isDirty,
    isSaving,
    isPublishing,
    isEditMode,
    editingPlanId,
    loadingPlan,
    planNotFound,
    loadPlanForEdit,
    saveDraft,
    publishPlan,
    resetForm,
  } = usePlanCreation();

  const planIdParam = searchParams.get('planId');
  const stepParam = searchParams.get('step');

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [allModules, setAllModules] = useState<PlatformModule[]>([]);

  // Sync step from URL
  useEffect(() => {
    if (stepParam && STEP_NAME_MAP[stepParam]) {
      setCurrentStep(STEP_NAME_MAP[stepParam]);
    }
  }, [stepParam, setCurrentStep]);

  // Sync edit mode plan
  useEffect(() => {
    if (planIdParam) {
      loadPlanForEdit(planIdParam);
    }
  }, [planIdParam, loadPlanForEdit]);

  // Load module catalog for Step 4
  useEffect(() => {
    moduleService.getModules().then((mods) => setAllModules(mods));
  }, []);

  // Sync step to URL
  const updateStepInUrl = (stepNum: number) => {
    setCurrentStep(stepNum);
    const stepName = STEP_NUM_MAP[stepNum] || 'basic';
    const newParams: Record<string, string> = { step: stepName };
    if (planIdParam) newParams.planId = planIdParam;
    setSearchParams(newParams);
  };

  // Navigation Protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Step Validation before Next
  const handleNext = async () => {
    const existingPlans = await planService.getPlans();

    if (currentStep === 1) {
      const res = validateBasicInformation(formState, existingPlans, editingPlanId);
      if (!res.valid) {
        toast.error(res.message || 'Please fill in required basic information.');
        return;
      }
    }

    if (currentStep === 2) {
      const res = validatePricing(formState.pricing);
      if (!res.valid) {
        toast.error(res.message || 'Please configure valid pricing.');
        return;
      }
    }

    if (currentStep === 3) {
      const res = validateLimits(formState.limits);
      if (!res.valid) {
        toast.error(res.message || 'Please specify valid seat and usage limits.');
        return;
      }
    }

    if (currentStep === 4) {
      const res = validateModules(formState.includedModuleCodes, allModules);
      if (!res.valid) {
        toast.error(res.message || 'Please select valid modules.');
        return;
      }
    }

    if (currentStep === 5) {
      const res = validateCommercialRules(formState.commercialRules);
      if (!res.valid) {
        toast.error(res.message || 'Please configure valid commercial rules.');
        return;
      }
    }

    updateStepInUrl(Math.min(6, currentStep + 1));
  };

  const handleSaveDraftAction = async () => {
    try {
      const draft = await saveDraft();
      toast.success(`Plan draft '${draft.name || draft.code}' saved successfully!`);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to save draft'));
    }
  };

  const handlePublishAction = async () => {
    try {
      const published = await publishPlan();
      toast.success(`Commercial Plan '${published.name}' published as Active!`);
      resetForm();
      navigate('/platform/plans');
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to publish plan'));
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      resetForm();
      navigate('/platform/plans');
    }
  };

  if (loadingPlan) {
    return (
      <div className="p-12 text-center text-slate-500 font-sans">
        <div className="inline-block animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mb-2" />
        <p className="text-xs font-semibold">Loading plan configuration...</p>
      </div>
    );
  }

  if (planNotFound) {
    return (
      <div className="p-12 text-center text-slate-700 font-sans max-w-md mx-auto space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-extrabold text-[#0D1F3D]">Plan Not Found</h2>
        <p className="text-xs text-slate-500 font-medium">
          The requested commercial plan configuration does not exist or may no longer be available for editing.
        </p>
        <Button variant="accent" size="sm" onClick={() => navigate('/platform/plans')} className="w-full font-bold justify-center">
          Back to All Plans
        </Button>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: 'Basic Information', desc: 'Plan details & code' },
    { num: 2, label: 'Pricing', desc: 'Prices & billing model' },
    { num: 3, label: 'Limits', desc: 'Seats & usage limits' },
    { num: 4, label: 'Modules', desc: 'Included modules' },
    { num: 5, label: 'Trial & Rules', desc: 'Trial & commercial rules' },
    { num: 6, label: 'Review & Publish', desc: 'Review & submit' },
  ];

  return (
    <div className="space-y-6 font-sans pb-16">
      {/* Header Bar (100% Identical to CreateTenantWizardPage.tsx) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-[#0D1F3D]">
              {isEditMode ? `Edit Plan — ${formState.name || 'Loading...'}` : 'Create Commercial Plan'}
            </h1>
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Layers className="h-4 w-4" />
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-0.5">
            {isEditMode
              ? 'Update commercial plan configuration, pricing model, seats limits, and included modules'
              : 'Configure a new commercial subscription plan for the Smart Field Work SaaS platform'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleCancel} className="font-bold text-slate-700">
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSaveDraftAction}
            disabled={isSaving}
            className="gap-2 font-bold shadow-xs"
          >
            <Save className="h-4 w-4" /> {isSaving ? 'Saving...' : 'Save as Draft'}
          </Button>
        </div>
      </div>

      {/* 6 Step Stepper Bar (100% Identical to CreateTenantWizardPage.tsx) */}
      <div className="rounded-sm border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
          {stepsList.map((step) => {
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;

            return (
              <div
                key={step.num}
                onClick={() => updateStepInUrl(step.num)}
                className={`flex items-center gap-2.5 p-2.5 rounded-sm cursor-pointer transition-all ${
                  isActive
                    ? 'bg-slate-50 border border-slate-300 shadow-2xs'
                    : isDone
                    ? 'hover:bg-slate-50/80'
                    : 'hover:bg-slate-50/60 opacity-80'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-all ${
                    isDone
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : isActive
                      ? 'bg-[#0D1F3D] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                >
                  {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.num}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs truncate transition-colors ${
                      isActive
                        ? 'font-extrabold text-[#0D1F3D]'
                        : isDone
                        ? 'font-bold text-slate-800'
                        : 'font-semibold text-slate-500'
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium truncate">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid Layout (100% Identical to CreateTenantWizardPage.tsx) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-xs space-y-6">
            {/* STEP 1: BASIC INFORMATION */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-extrabold text-[#0D1F3D]">Step 1: Basic Information</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Define the commercial identity, code and catalog presentation of this plan.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Plan Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Professional Field Suite"
                      value={formState.name}
                      onChange={(e) => updateFormState({ name: e.target.value })}
                      className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Plan Code (Uppercase Machine ID) <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PROFESSIONAL"
                      value={formState.code}
                      onChange={(e) => updateFormState({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '') })}
                      className="w-full h-10 px-3 text-xs font-mono font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                    />
                    <span className="text-[10px] text-slate-400 font-medium block">
                      Stable uppercase identifier (regex: ^[A-Z][A-Z0-9_]*$). Cannot be changed after publishing.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">
                      Customer-Facing Description <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Public tagline displayed on tenant billing page..."
                      value={formState.description}
                      onChange={(e) => updateFormState({ description: e.target.value })}
                      className="w-full p-3 text-xs font-medium rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Internal Admin Description</label>
                    <textarea
                      rows={3}
                      placeholder="Internal operational guidance for sales & support admins..."
                      value={formState.internalDescription || ''}
                      onChange={(e) => updateFormState({ internalDescription: e.target.value })}
                      className="w-full p-3 text-xs font-medium rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Plan Tier</label>
                    <select
                      value={formState.tier || 'Growth'}
                      onChange={(e) => updateFormState({ tier: e.target.value })}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    >
                      <option value="Starter">Starter</option>
                      <option value="Growth">Growth</option>
                      <option value="Professional">Professional</option>
                      <option value="Enterprise">Enterprise</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Visibility</label>
                    <select
                      value={formState.visibility}
                      onChange={(e) => updateFormState({ visibility: e.target.value as PlanVisibility })}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    >
                      <option value="Public">Public (Self-Serve Tenant Catalog)</option>
                      <option value="Internal">Internal (Admin Provisioned Only)</option>
                      <option value="Invite Only">Invite Only (Enterprise Negotiated)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Display Order</label>
                    <input
                      type="number"
                      min={0}
                      value={formState.displayOrder}
                      onChange={(e) => updateFormState({ displayOrder: parseInt(e.target.value, 10) || 0 })}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Recommended For</label>
                    <input
                      type="text"
                      placeholder="e.g. Mid-Market Businesses (50-150 Reps)"
                      value={formState.recommendedFor || ''}
                      onChange={(e) => updateFormState({ recommendedFor: e.target.value })}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Marketing Badge / Label</label>
                    <select
                      value={formState.badge || 'None'}
                      onChange={(e) => updateFormState({ badge: e.target.value })}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    >
                      <option value="None">None</option>
                      <option value="Popular">Popular</option>
                      <option value="Most Popular">Most Popular</option>
                      <option value="Recommended">Recommended</option>
                      <option value="Best Value">Best Value</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Plan Theme Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formState.color || '#6366F1'}
                        onChange={(e) => updateFormState({ color: e.target.value })}
                        className="h-10 w-12 rounded-sm border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={formState.color || '#6366F1'}
                        onChange={(e) => updateFormState({ color: e.target.value })}
                        className="w-full h-10 px-3 text-xs font-mono font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PRICING */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-extrabold text-[#0D1F3D]">Step 2: Pricing Configuration</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Select the pricing model and configure monthly, annual, and commercial billing rules.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#0D1F3D] block">Pricing Model</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {(
                      [
                        { model: 'Per User', title: 'Per User', desc: 'Fixed rate per active seat license / month' },
                        { model: 'Base + Per User', title: 'Base + Per User', desc: 'Base platform fee plus seat rate' },
                        { model: 'Flat Monthly', title: 'Flat Monthly', desc: 'Fixed flat rate regardless of seat count' },
                        { model: 'Custom Contract', title: 'Custom Contract', desc: 'Contact Sales / Custom offline contract' },
                      ] as const
                    ).map((item) => {
                      const isSelected = formState.pricing.model === item.model;
                      return (
                        <button
                          key={item.model}
                          type="button"
                          onClick={() =>
                            updateFormState({
                              pricing: { ...formState.pricing, model: item.model as PricingModel },
                            })
                          }
                          className={`p-3.5 rounded-sm border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xs font-extrabold text-[#0D1F3D]">{item.title}</div>
                          <div className="text-[11px] text-slate-500 font-medium mt-1 leading-snug">
                            {item.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Currency</label>
                    <select
                      value={formState.pricing.currency}
                      onChange={(e) =>
                        updateFormState({
                          pricing: { ...formState.pricing, currency: e.target.value as any },
                        })
                      }
                      className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    >
                      <option value="INR">INR (₹ - Indian Rupee)</option>
                      <option value="USD">USD ($ - US Dollar)</option>
                      <option value="EUR">EUR (€ - Euro)</option>
                      <option value="GBP">GBP (£ - British Pound)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Tax Handling</label>
                    <select
                      value={formState.pricing.taxMode}
                      onChange={(e) =>
                        updateFormState({
                          pricing: { ...formState.pricing, taxMode: e.target.value as TaxMode },
                        })
                      }
                      className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    >
                      <option value="Exclusive">Exclusive (+ Tax / GST extra)</option>
                      <option value="Inclusive">Inclusive (Taxes included in price)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 block">Proration Policy</label>
                    <select
                      value={formState.pricing.prorationPolicy}
                      onChange={(e) =>
                        updateFormState({
                          pricing: { ...formState.pricing, prorationPolicy: e.target.value as ProrationPolicy },
                        })
                      }
                      className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                    >
                      <option value="Prorate Immediately">Prorate Immediately on seat add</option>
                      <option value="No Proration">No Proration</option>
                      <option value="Next Billing Cycle">Apply next billing cycle</option>
                    </select>
                  </div>
                </div>

                {formState.pricing.model === 'Custom Contract' ? (
                  <div className="p-4 rounded-sm bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                    Custom Contract pricing does not display mandatory public price amounts. Rates are negotiated and finalized per tenant contract.
                  </div>
                ) : (
                  <div className="space-y-4 border-t border-slate-100 pt-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {formState.pricing.model === 'Per User' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 block">
                              Monthly Price / User <span className="text-rose-600">*</span>
                            </label>
                            <input
                              type="number"
                              min={0}
                              placeholder="e.g. 899"
                              value={formState.pricing.monthlyPerUser ?? ''}
                              onChange={(e) =>
                                updateFormState({
                                  pricing: {
                                    ...formState.pricing,
                                    monthlyPerUser: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full h-10 px-3 text-xs font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 block">Annual Price / User</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="e.g. 749"
                              value={formState.pricing.annualPerUser ?? ''}
                              onChange={(e) =>
                                updateFormState({
                                  pricing: {
                                    ...formState.pricing,
                                    annualPerUser: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full h-10 px-3 text-xs font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                            />
                          </div>
                        </>
                      )}

                      {formState.pricing.model === 'Base + Per User' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 block">Monthly Base Fee</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="e.g. 2499"
                              value={formState.pricing.monthlyBaseFee ?? ''}
                              onChange={(e) =>
                                updateFormState({
                                  pricing: {
                                    ...formState.pricing,
                                    monthlyBaseFee: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 block">Monthly Price / User</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="e.g. 499"
                              value={formState.pricing.monthlyPerUser ?? ''}
                              onChange={(e) =>
                                updateFormState({
                                  pricing: {
                                    ...formState.pricing,
                                    monthlyPerUser: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                            />
                          </div>
                        </>
                      )}

                      {formState.pricing.model === 'Flat Monthly' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 block">Monthly Flat Price</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="e.g. 24999"
                              value={formState.pricing.monthlyFlatPrice ?? ''}
                              onChange={(e) =>
                                updateFormState({
                                  pricing: {
                                    ...formState.pricing,
                                    monthlyFlatPrice: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full h-10 px-3 text-xs font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-600 block">Annual Flat Price</label>
                            <input
                              type="number"
                              min={0}
                              placeholder="e.g. 249990"
                              value={formState.pricing.annualFlatPrice ?? ''}
                              onChange={(e) =>
                                updateFormState({
                                  pricing: {
                                    ...formState.pricing,
                                    annualFlatPrice: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-full h-10 px-3 text-xs font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 block">Annual Discount %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="e.g. 17"
                          value={formState.pricing.annualDiscountPercent ?? ''}
                          onChange={(e) =>
                            updateFormState({
                              pricing: {
                                ...formState.pricing,
                                annualDiscountPercent: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <Checkbox
                    checked={formState.pricing.allowMonthlyBilling}
                    onChange={(checked) =>
                      updateFormState({
                        pricing: { ...formState.pricing, allowMonthlyBilling: checked },
                      })
                    }
                    label={<span className="text-xs font-extrabold text-[#0D1F3D]">Allow Monthly Billing Cycle</span>}
                  />

                  <Checkbox
                    checked={formState.pricing.allowAnnualBilling}
                    onChange={(checked) =>
                      updateFormState({
                        pricing: { ...formState.pricing, allowAnnualBilling: checked },
                      })
                    }
                    label={<span className="text-xs font-extrabold text-[#0D1F3D]">Allow Annual Billing Cycle</span>}
                  />
                </div>
              </div>
            )}

            {/* STEP 3: LIMITS */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-extrabold text-[#0D1F3D]">Step 3: Seats & Usage Limits</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure capacity bounds, storage allowances, API quotas, and platform retention rules.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                    Section A — Users & Organization
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">
                        Minimum Seats <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formState.limits.minimumSeats}
                        onChange={(e) =>
                          updateFormState({
                            limits: { ...formState.limits, minimumSeats: parseInt(e.target.value, 10) || 1 },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">
                        Default Seat Limit <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={formState.limits.defaultSeatLimit}
                        onChange={(e) =>
                          updateFormState({
                            limits: { ...formState.limits, defaultSeatLimit: parseInt(e.target.value, 10) || 1 },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Maximum Seats (Blank = Unlimited)</label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={formState.limits.maximumSeats ?? ''}
                        onChange={(e) =>
                          updateFormState({
                            limits: {
                              ...formState.limits,
                              maximumSeats: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Seat Increment Step</label>
                      <input
                        type="number"
                        min={1}
                        value={formState.limits.seatIncrement || 1}
                        onChange={(e) =>
                          updateFormState({
                            limits: { ...formState.limits, seatIncrement: parseInt(e.target.value, 10) || 1 },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                    Section B — Storage & Data Retention
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Storage Included (GB)</label>
                      <input
                        type="number"
                        min={0}
                        value={formState.limits.storageGb}
                        onChange={(e) =>
                          updateFormState({
                            limits: { ...formState.limits, storageGb: parseFloat(e.target.value) || 0 },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-extrabold rounded-sm border border-slate-200 bg-[#F8FAFC] text-[#0D1F3D] focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Data Retention (Days)</label>
                      <select
                        value={formState.limits.dataRetentionDays || 180}
                        onChange={(e) =>
                          updateFormState({
                            limits: { ...formState.limits, dataRetentionDays: parseInt(e.target.value, 10) },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      >
                        <option value={90}>90 Days</option>
                        <option value={180}>180 Days (6 Months)</option>
                        <option value={365}>365 Days (1 Year)</option>
                        <option value={730}>730 Days (2 Years)</option>
                        <option value={1095}>1095 Days (3 Years)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Max File Attachment (MB)</label>
                      <input
                        type="number"
                        value={formState.limits.fileUploadMb || 25}
                        onChange={(e) =>
                          updateFormState({
                            limits: { ...formState.limits, fileUploadMb: parseInt(e.target.value, 10) || 10 },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                    Section C — Usage Quotas & Feature Toggles
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">API Requests / Month</label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={formState.limits.apiRequestsPerMonth ?? ''}
                        onChange={(e) =>
                          updateFormState({
                            limits: {
                              ...formState.limits,
                              apiRequestsPerMonth: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Active Workflows</label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={formState.limits.activeWorkflows ?? ''}
                        onChange={(e) =>
                          updateFormState({
                            limits: {
                              ...formState.limits,
                              activeWorkflows: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Custom Forms Limit</label>
                      <input
                        type="number"
                        placeholder="Unlimited"
                        value={formState.limits.customForms ?? ''}
                        onChange={(e) =>
                          updateFormState({
                            limits: {
                              ...formState.limits,
                              customForms: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">AI Copilot Credits / Month</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={formState.limits.aiCreditsPerMonth ?? ''}
                        onChange={(e) =>
                          updateFormState({
                            limits: {
                              ...formState.limits,
                              aiCreditsPerMonth: e.target.value ? parseInt(e.target.value, 10) : 0,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Checkbox
                      checked={formState.limits.fullDataExport ?? true}
                      onChange={(checked) =>
                        updateFormState({
                          limits: { ...formState.limits, fullDataExport: checked },
                        })
                      }
                      label={
                        <span className="text-xs font-extrabold text-[#0D1F3D]">
                          Allow Full Data Backup Export (CSV & Database Dump)
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: MODULES */}
            {currentStep === 4 && (
              <ModuleSelectionGrid
                modules={allModules}
                selectedCodes={formState.includedModuleCodes}
                infoBannerText="Selected commercial modules will be inherited by all tenants subscribing to this plan."
                onChange={(updatedCodes) => updateFormState({ includedModuleCodes: updatedCodes })}
              />
            )}

            {/* STEP 5: TRIAL & RULES */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3">
                  <h2 className="text-base font-extrabold text-[#0D1F3D]">Step 5: Trial & Commercial Rules</h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Configure trial policy, subscription auto-renewal, lifecycle rules, and cancellation policies.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                    Section A — Trial Settings
                  </h3>

                  <Checkbox
                    checked={formState.commercialRules.trialEnabled}
                    onChange={(checked) =>
                      updateFormState({
                        commercialRules: { ...formState.commercialRules, trialEnabled: checked },
                      })
                    }
                    label={
                      <span className="text-xs font-extrabold text-[#0D1F3D]">
                        Enable Free Trial for New Tenants on This Plan
                      </span>
                    }
                  />

                  {formState.commercialRules.trialEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 block">Trial Duration (Days)</label>
                        <select
                          value={formState.commercialRules.trialDurationDays || 14}
                          onChange={(e) =>
                            updateFormState({
                              commercialRules: {
                                ...formState.commercialRules,
                                trialDurationDays: parseInt(e.target.value, 10),
                              },
                            })
                          }
                          className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                        >
                          <option value={7}>7 Days</option>
                          <option value={14}>14 Days (Recommended)</option>
                          <option value={30}>30 Days</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 block">Trial Seat License Limit</label>
                        <input
                          type="number"
                          min={1}
                          value={formState.commercialRules.trialSeatLimit || 5}
                          onChange={(e) =>
                            updateFormState({
                              commercialRules: {
                                ...formState.commercialRules,
                                trialSeatLimit: parseInt(e.target.value, 10) || 5,
                              },
                            })
                          }
                          className="w-full h-10 px-3 text-xs font-bold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-600 block">Trial Module Access Policy</label>
                        <select
                          value={formState.commercialRules.trialModulePolicy}
                          onChange={(e) =>
                            updateFormState({
                              commercialRules: {
                                ...formState.commercialRules,
                                trialModulePolicy: e.target.value as any,
                              },
                            })
                          }
                          className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                        >
                          <option value="Use Plan Modules">Use All Plan Modules</option>
                          <option value="Restricted">Restricted (Core CRM Only)</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-3">
                  <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                    Section B — Subscription Rules & Commitments
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Minimum Contract Commitment</label>
                      <select
                        value={formState.commercialRules.minimumCommitment}
                        onChange={(e) =>
                          updateFormState({
                            commercialRules: {
                              ...formState.commercialRules,
                              minimumCommitment: e.target.value as any,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      >
                        <option value="None">None (Cancel Anytime)</option>
                        <option value="1 Month">1 Month</option>
                        <option value="3 Months">3 Months</option>
                        <option value="6 Months">6 Months</option>
                        <option value="12 Months">12 Months (1 Year)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Change Takes Effect</label>
                      <select
                        value={formState.commercialRules.changeEffectiveTiming}
                        onChange={(e) =>
                          updateFormState({
                            commercialRules: {
                              ...formState.commercialRules,
                              changeEffectiveTiming: e.target.value as any,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      >
                        <option value="Next Billing Cycle">Next Billing Cycle (Recommended)</option>
                        <option value="Immediately">Immediately</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 block">Access After Expiry</label>
                      <select
                        value={formState.commercialRules.accessAfterExpiry}
                        onChange={(e) =>
                          updateFormState({
                            commercialRules: {
                              ...formState.commercialRules,
                              accessAfterExpiry: e.target.value as ExpiryAccess,
                            },
                          })
                        }
                        className="w-full h-10 px-3 text-xs font-semibold rounded-sm border border-slate-200 bg-[#F8FAFC] text-slate-800 focus:outline-none focus:border-[#0D1F3D]"
                      >
                        <option value="Read Only">Read Only (Export allowed)</option>
                        <option value="Blocked">Blocked (Complete lock out)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <Checkbox
                      checked={formState.commercialRules.autoRenew}
                      onChange={(checked) =>
                        updateFormState({
                          commercialRules: { ...formState.commercialRules, autoRenew: checked },
                        })
                      }
                      label={
                        <span className="text-xs font-extrabold text-[#0D1F3D]">
                          Auto-Renew Subscriptions by Default
                        </span>
                      }
                    />

                    <Checkbox
                      checked={formState.commercialRules.allowUpgrade}
                      onChange={(checked) =>
                        updateFormState({
                          commercialRules: { ...formState.commercialRules, allowUpgrade: checked },
                        })
                      }
                      label={
                        <span className="text-xs font-extrabold text-[#0D1F3D]">
                          Allow Self-Serve Upgrades
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: REVIEW & PUBLISH */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-extrabold text-[#0D1F3D]">Step 6: Review & Publish Plan</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Review all commercial plan parameters before publishing to the platform catalog.
                    </p>
                  </div>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700">
                    Status: DRAFT
                  </span>
                </div>

                <div className="rounded-sm border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                      1. Basic Information
                    </h3>
                    <button
                      type="button"
                      onClick={() => updateStepInUrl(1)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Plan Name</span>
                      <span className="font-extrabold text-[#0D1F3D]">{formState.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Code</span>
                      <span className="font-mono font-bold text-slate-800">{formState.code}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Tier</span>
                      <span className="font-bold text-slate-800">{formState.tier}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Visibility</span>
                      <span className="font-bold text-slate-800">{formState.visibility}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                      2. Pricing Configuration
                    </h3>
                    <button
                      type="button"
                      onClick={() => updateStepInUrl(2)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Model</span>
                      <span className="font-bold text-slate-800">{formState.pricing.model}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Monthly Price</span>
                      <span className="font-extrabold text-[#0D1F3D]">
                        {formatPlanMonthlyPrice(formState.pricing)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Annual Price</span>
                      <span className="font-extrabold text-emerald-700">
                        {formatPlanAnnualPrice(formState.pricing)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Currency & Tax</span>
                      <span className="font-bold text-slate-800">
                        {formState.pricing.currency} ({formState.pricing.taxMode})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                      3. Seats & Limits
                    </h3>
                    <button
                      type="button"
                      onClick={() => updateStepInUrl(3)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Min / Default Seats</span>
                      <span className="font-mono font-bold text-[#0D1F3D]">
                        {formState.limits.minimumSeats} / {formState.limits.defaultSeatLimit}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Max Seats</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatLimit(formState.limits.maximumSeats)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Storage</span>
                      <span className="font-bold text-slate-800">{formState.limits.storageGb} GB</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Data Retention</span>
                      <span className="font-bold text-slate-800">{formState.limits.dataRetentionDays} Days</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                      4. Included Modules ({formState.includedModuleCodes.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => updateStepInUrl(4)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {formState.includedModuleCodes.map((code) => {
                      const mod = allModules.find((m) => m.code === code);
                      return (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-[#0D1F3D] shadow-2xs"
                        >
                          <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" />
                          {mod ? mod.name : code}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-[#F8FAFC] p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                    <h3 className="text-xs font-extrabold text-[#0D1F3D] uppercase tracking-wider">
                      5. Trial & Commercial Rules
                    </h3>
                    <button
                      type="button"
                      onClick={() => updateStepInUrl(5)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Trial Status</span>
                      <span className="font-bold text-slate-800">
                        {formState.commercialRules.trialEnabled
                          ? `${formState.commercialRules.trialDurationDays} Days Trial`
                          : 'Trial Disabled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Commitment</span>
                      <span className="font-bold text-slate-800">
                        {formState.commercialRules.minimumCommitment}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Auto-Renew</span>
                      <span className="font-bold text-slate-800">
                        {formState.commercialRules.autoRenew ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">After Expiry</span>
                      <span className="font-bold text-slate-800">
                        {formState.commercialRules.accessAfterExpiry}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Actions Footer (100% Identical to CreateTenantWizardPage.tsx) */}
            <div className="flex items-center justify-between rounded-sm border border-slate-200 bg-white p-4 shadow-xs">
              <Button variant="outline" size="sm" onClick={handleCancel} className="font-bold text-slate-700">
                Cancel
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentStep === 1}
                  onClick={() => updateStepInUrl(Math.max(1, currentStep - 1))}
                  className="gap-2 font-bold text-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>

                {currentStep < 6 ? (
                  <Button variant="accent" size="sm" onClick={handleNext} className="gap-2 font-extrabold shadow-xs px-6">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={handlePublishAction}
                    disabled={isPublishing}
                    className="gap-2 font-extrabold shadow-xs px-6 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4" /> {isPublishing ? 'Publishing...' : isEditMode ? 'Update Plan' : 'Publish Plan'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Live Plan Summary Panel (100% Identical to CreateTenantWizardPage.tsx) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="text-base font-extrabold text-[#0D1F3D] border-b border-slate-100 pb-3">
              Plan Summary
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block">Plan Identity</span>
                <div className="font-extrabold text-[#0D1F3D] text-sm flex items-center gap-2">
                  {formState.name || 'Unnamed Plan'}
                  {formState.code && (
                    <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-xs border border-indigo-100">
                      {formState.code}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Pricing Model</span>
                  <span className="font-extrabold text-[#0D1F3D]">{formState.pricing.model}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Monthly Price</span>
                  <span className="font-extrabold text-[#0D1F3D]">
                    {formatPlanMonthlyPrice(formState.pricing)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Annual Price</span>
                  <span className="font-extrabold text-emerald-700">
                    {formatPlanAnnualPrice(formState.pricing)}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-semibold block">Min Seats</span>
                  <span className="font-mono font-bold text-slate-800">{formState.limits.minimumSeats}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Included Modules</span>
                  <span className="font-extrabold text-indigo-700 font-mono">
                    {formState.includedModuleCodes.length} modules
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Free Trial</span>
                  <span className="font-bold text-slate-800">
                    {formState.commercialRules.trialEnabled
                      ? `${formState.commercialRules.trialDurationDays} Days`
                      : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold">Visibility</span>
                  <span className="font-bold text-slate-800">{formState.visibility}</span>
                </div>
              </div>

              <div className="rounded-sm bg-indigo-50/60 p-3.5 border border-indigo-100 text-indigo-900 text-xs font-medium space-y-1 mt-2">
                <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-600" /> Next Step Action
                </div>
                <p className="text-[11px] text-indigo-700 leading-snug">
                  {currentStep === 1 && 'Complete basic plan name, code & tier parameters.'}
                  {currentStep === 2 && 'Configure monthly & annual pricing model fees.'}
                  {currentStep === 3 && 'Specify user capacity limits & platform storage.'}
                  {currentStep === 4 && 'Select commercial modules included in this plan.'}
                  {currentStep === 5 && 'Define trial behavior & auto-renewal policies.'}
                  {currentStep === 6 && 'Click Publish Plan to activate in platform catalog.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning Modal (100% Identical to CreateTenantWizardPage.tsx) */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-sm border border-slate-200 bg-white p-6 shadow-2xl space-y-4 text-center font-sans">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0D1F3D]">Unsaved Changes</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                You have unsaved changes in the wizard. Are you sure you want to discard them and leave?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 font-bold justify-center"
              >
                Keep Editing
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={() => {
                  setShowCancelConfirm(false);
                  resetForm();
                  navigate('/platform/plans');
                }}
                className="flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white justify-center"
              >
                Discard Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CreatePlanWizardPage() {
  return (
    <PlanCreationProvider>
      <WizardContent />
    </PlanCreationProvider>
  );
}
