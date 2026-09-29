import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Plan, PlanDraftInput } from '../types/plan.types';
import { planService } from '../services/plan.service';
import { moduleService } from '../../modules/services/module.service';
import { validateCompletePlan } from '../utils/plan-validation.utils';

export const INITIAL_PLAN_FORM_STATE: PlanDraftInput = {
  code: '',
  name: '',
  description: '',
  internalDescription: '',
  status: 'Draft',
  visibility: 'Public',
  tier: 'Growth',
  badge: 'None',
  recommendedFor: '',
  displayOrder: 1,
  color: '#6366F1',
  pricing: {
    model: 'Per User',
    currency: 'INR',
    monthlyPerUser: 899,
    annualPerUser: 749,
    annualDiscountPercent: 17,
    allowMonthlyBilling: true,
    allowAnnualBilling: true,
    defaultBillingCycle: 'Annual',
    taxMode: 'Exclusive',
    prorationPolicy: 'Prorate Immediately',
  },
  limits: {
    minimumSeats: 5,
    defaultSeatLimit: 20,
    maximumSeats: 50,
    seatIncrement: 1,
    storageGb: 25,
    dataRetentionDays: 180,
    apiRequestsPerMonth: 50000,
    activeWorkflows: 10,
    customForms: 20,
    reportExportsPerMonth: 200,
    fileUploadMb: 25,
    aiCreditsPerMonth: 100,
    automationsPerMonth: 1000,
    emailSendsPerMonth: 5000,
    offlineDataGbPerDevice: 5,
    concurrentSessions: 5,
    fullDataExport: true,
    auditRetentionDays: 90,
  },
  includedModuleCodes: ['core_crm', 'field_visits'],
  commercialRules: {
    trialEnabled: true,
    trialDurationDays: 14,
    trialSeatLimit: 5,
    trialModulePolicy: 'Use Plan Modules',
    autoConvertAfterTrial: false,
    autoRenew: true,
    allowUpgrade: true,
    allowDowngrade: true,
    changeEffectiveTiming: 'Next Billing Cycle',
    minimumCommitment: 'None',
    availableForNewTenants: true,
    availableForExistingTenants: true,
    cancellationAllowed: true,
    gracePeriodDays: 14,
    accessAfterExpiry: 'Read Only',
  },
};

interface PlanCreationContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  formState: PlanDraftInput;
  updateFormState: (updates: Partial<PlanDraftInput>) => void;
  isDirty: boolean;
  isSaving: boolean;
  isPublishing: boolean;
  isEditMode: boolean;
  editingPlanId?: string;
  loadingPlan: boolean;
  planNotFound: boolean;
  loadPlanForEdit: (planId: string) => Promise<void>;
  saveDraft: () => Promise<Plan>;
  publishPlan: (allowBetaModules?: boolean) => Promise<Plan>;
  resetForm: () => void;
}

const PlanCreationContext = createContext<PlanCreationContextType | undefined>(undefined);

export function PlanCreationProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<PlanDraftInput>(INITIAL_PLAN_FORM_STATE);
  const [savedBaselineState, setSavedBaselineState] = useState<PlanDraftInput>(INITIAL_PLAN_FORM_STATE);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | undefined>(undefined);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [planNotFound, setPlanNotFound] = useState(false);

  // Check dirty state
  useEffect(() => {
    const isChanged = JSON.stringify(formState) !== JSON.stringify(savedBaselineState);
    setIsDirty(isChanged);
  }, [formState, savedBaselineState]);

  const updateFormState = useCallback((updates: Partial<PlanDraftInput>) => {
    setFormState((prev) => ({
      ...prev,
      ...updates,
      pricing: updates.pricing ? { ...prev.pricing, ...updates.pricing } : prev.pricing,
      limits: updates.limits ? { ...prev.limits, ...updates.limits } : prev.limits,
      commercialRules: updates.commercialRules ? { ...prev.commercialRules, ...updates.commercialRules } : prev.commercialRules,
    }));
  }, []);

  const loadPlanForEdit = useCallback(async (planId: string) => {
    setLoadingPlan(true);
    setPlanNotFound(false);
    try {
      const plan = await planService.getPlanById(planId);
      if (!plan) {
        setPlanNotFound(true);
        setIsEditMode(false);
      } else {
        const draftInput: PlanDraftInput = {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          internalDescription: plan.internalDescription || '',
          status: plan.status,
          visibility: plan.visibility,
          tier: plan.tier || 'Growth',
          badge: plan.badge || 'None',
          recommendedFor: plan.recommendedFor || '',
          displayOrder: plan.displayOrder || 1,
          color: plan.color || '#6366F1',
          pricing: { ...plan.pricing },
          limits: { ...plan.limits },
          includedModuleCodes: [...plan.includedModuleCodes],
          commercialRules: { ...plan.commercialRules },
        };
        setFormState(draftInput);
        setSavedBaselineState(draftInput);
        setIsEditMode(true);
        setEditingPlanId(plan.id);
      }
    } catch {
      setPlanNotFound(true);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  const saveDraft = useCallback(async (): Promise<Plan> => {
    setIsSaving(true);
    try {
      let saved: Plan;
      if (isEditMode && editingPlanId) {
        saved = await planService.updateDraft(editingPlanId, formState);
      } else {
        saved = await planService.createDraft(formState);
        setIsEditMode(true);
        setEditingPlanId(saved.id);
      }
      setSavedBaselineState({ ...formState });
      setIsDirty(false);
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [formState, isEditMode, editingPlanId]);

  const publishPlan = useCallback(async (allowBetaModules = false): Promise<Plan> => {
    setIsPublishing(true);
    try {
      const allPlans = await planService.getPlans();
      const allModules = await moduleService.getModules();
      const validationRes = validateCompletePlan(formState, allPlans, allModules, editingPlanId);

      if (!validationRes.valid) {
        throw new Error(validationRes.message || 'Validation failed before publishing.');
      }

      let saved: Plan;
      if (isEditMode && editingPlanId) {
        await planService.updateDraft(editingPlanId, formState);
        saved = await planService.publishPlan(editingPlanId, allowBetaModules);
      } else {
        const draft = await planService.createDraft({ ...formState, status: 'Draft' });
        saved = await planService.publishPlan(draft.id, allowBetaModules);
        setIsEditMode(true);
        setEditingPlanId(saved.id);
      }
      setSavedBaselineState({ ...formState, status: 'Active' });
      setIsDirty(false);
      return saved;
    } finally {
      setIsPublishing(false);
    }
  }, [formState, isEditMode, editingPlanId]);

  const resetForm = useCallback(() => {
    setFormState(INITIAL_PLAN_FORM_STATE);
    setSavedBaselineState(INITIAL_PLAN_FORM_STATE);
    setCurrentStep(1);
    setIsDirty(false);
    setIsEditMode(false);
    setEditingPlanId(undefined);
    setPlanNotFound(false);
  }, []);

  return (
    <PlanCreationContext.Provider
      value={{
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
      }}
    >
      {children}
    </PlanCreationContext.Provider>
  );
}

export function usePlanCreation() {
  const context = useContext(PlanCreationContext);
  if (!context) {
    throw new Error('usePlanCreation must be used within a PlanCreationProvider');
  }
  return context;
}
