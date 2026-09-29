import { Plan, PlanDraftInput } from '../types/plan.types';
import { api } from '../../../../../common/api';
import { transformBackendPlanToUi, transformUiDraftToBackend } from '../utils/plan-adapter';

class ApiPlanService {
  async getPlans(): Promise<Plan[]> {
    const response = await api.get('/platform/plans');
    const backendPlans: any[] = response.data;
    return backendPlans.map(transformBackendPlanToUi);
  }

  async getPlanById(planId: string): Promise<Plan | null> {
    try {
      const response = await api.get(`/platform/plans/${planId}`);
      return transformBackendPlanToUi(response.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async createDraft(input: PlanDraftInput): Promise<Plan> {
    const payload = transformUiDraftToBackend(input);
    const response = await api.post('/platform/plans', payload);
    return transformBackendPlanToUi(response.data);
  }

  async updateDraft(planId: string, input: PlanDraftInput): Promise<Plan> {
    const rawPlanRes = await api.get(`/platform/plans/${planId}`);
    const rawPlan = rawPlanRes.data;

    const draftVersionId = rawPlan.currentDraftVersion?.id;
    const payload = transformUiDraftToBackend(input);

    // 1. Update metadata
    await api.patch(`/platform/plans/${planId}`, {
      name: payload.name,
      description: payload.description,
      internalDescription: payload.internalDescription,
      visibility: payload.visibility,
      tier: payload.tier,
      badge: payload.badge,
      recommendedFor: payload.recommendedFor,
      displayOrder: payload.displayOrder,
      color: payload.color,
    });

    // 2. Update draft version children if draft version exists
    if (draftVersionId) {
      await api.patch(`/platform/plans/${planId}/versions/${draftVersionId}`, {
        pricing: payload.pricing,
        limits: payload.limits,
        includedModuleCodes: payload.includedModuleCodes,
        commercialRules: payload.commercialRules,
      });
    }

    const updatedRes = await api.get(`/platform/plans/${planId}`);
    return transformBackendPlanToUi(updatedRes.data);
  }

  async publishPlan(planId: string, allowBetaModules = false): Promise<Plan> {
    const rawPlanRes = await api.get(`/platform/plans/${planId}`);
    const rawPlan = rawPlanRes.data;

    const draftVersionId = rawPlan.currentDraftVersion?.id;
    if (!draftVersionId) {
      throw new Error(`Plan '${planId}' does not have an active DRAFT version to publish.`);
    }

    const response = await api.post(`/platform/plans/${planId}/versions/${draftVersionId}/publish`, {
      allowBetaModules,
    });
    return transformBackendPlanToUi(response.data);
  }

  async duplicatePlan(planId: string): Promise<Plan> {
    const target = await this.getPlanById(planId);
    if (!target) {
      throw new Error(`Plan '${planId}' not found for duplication.`);
    }

    const duplicateCode = `${target.code}_COPY_${Math.floor(Math.random() * 1000)}`;

    return this.createDraft({
      code: duplicateCode,
      name: `${target.name} (Copy)`,
      description: target.description,
      internalDescription: target.internalDescription,
      visibility: target.visibility,
      tier: target.tier,
      badge: target.badge,
      recommendedFor: target.recommendedFor,
      displayOrder: target.displayOrder + 1,
      color: target.color,
      pricing: target.pricing,
      limits: target.limits,
      includedModuleCodes: target.includedModuleCodes,
      commercialRules: target.commercialRules,
    });
  }

  async archivePlan(planId: string): Promise<Plan> {
    const response = await api.post(`/platform/plans/${planId}/archive`);
    return transformBackendPlanToUi(response.data);
  }
}

export const planService = new ApiPlanService();
