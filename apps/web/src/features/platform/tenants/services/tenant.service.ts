import { api } from '../../../../common/api';
import {
  Tenant,
  TenantStatus,
  SubscriptionStatus,
  TenantCreateFormState,
} from '../types/platform.types';
import {
  transformTenantSummaryToUi,
  transformTenantDetailToUi,
  BackendTenantSummary,
  BackendTenantDetail,
} from '../utils/tenant-adapter';

export interface PaginatedTenantsResponse {
  data: Tenant[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProvisionTenantPayload {
  idempotencyKey: string;
  requestId?: string;
  industryCode: string;
  trial?: boolean;
  planVersionId: string;
  billingCycle: 'MONTHLY' | 'ANNUAL' | 'QUARTERLY';
  seatQuantity: number;
  tenant: {
    slug: string;
    displayName: string;
    legalName?: string;
    primaryDomain?: string;
    websiteUrl?: string;
    description?: string;
    settings?: {
      timezone?: string;
      currency?: string;
      locale?: string;
      language?: string;
      dateFormat?: string;
      weekStartDay?: string;
      financialYearStartMonth?: number;
    };
    branding?: {
      shortName?: string;
      primaryColor?: string;
      secondaryColor?: string;
      logoUrl?: string;
      showLogoOnLogin?: boolean;
    };
  };
  owner: {
    email: string;
    fullName: string;
  };
}

export interface ITenantService {
  getTenants(query?: { search?: string; status?: string; page?: number; limit?: number }): Promise<Tenant[]>;
  getPaginatedTenants(query?: { search?: string; status?: string; page?: number; limit?: number }): Promise<PaginatedTenantsResponse>;
  getTenantById(id: string): Promise<Tenant | null>;
  createTenant(formState: TenantCreateFormState): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant>;
  updateTenantStatus(id: string, status: TenantStatus): Promise<Tenant>;
  updateTenantModules(id: string, moduleCodes: string[]): Promise<Tenant>;
  provisionTenant(input: ProvisionTenantPayload): Promise<any>;
  getTenantSubscription(tenantId: string): Promise<any>;
  getTenantSubscriptionHistory(tenantId: string, page?: number, limit?: number): Promise<any>;
  getIndustryClassifications(): Promise<any[]>;
  getTenantMemberships(tenantId: string): Promise<any[]>;
  getTenantIndustryTemplate(tenantId: string): Promise<any>;
  migrateTenantIndustry(
    tenantId: string,
    body: { industryTemplateVersionId: string; reason: string; expectedRevision: number },
  ): Promise<any>;
}

function sanitizeIanaTimezone(tz?: string): string {
  if (!tz) return 'Asia/Kolkata';
  let cleaned = tz.replace(/^\([^)]+\)\s*/, '').trim();
  if (cleaned.includes(' ')) {
    const parts = cleaned.split(' ');
    if (parts[0].includes('/')) {
      cleaned = parts[0];
    }
  }
  return cleaned || 'Asia/Kolkata';
}

class ApiTenantService implements ITenantService {
  async getTenants(query: { search?: string; status?: string; page?: number; limit?: number } = {}): Promise<Tenant[]> {
    const res = await this.getPaginatedTenants(query);
    return res.data;
  }

  async getPaginatedTenants(
    query: { search?: string; status?: string; page?: number; limit?: number } = {},
  ): Promise<PaginatedTenantsResponse> {
    const params: Record<string, any> = {
      page: query.page || 1,
      limit: query.limit || 50,
    };
    if (query.search?.trim()) params.search = query.search.trim();
    if (query.status && query.status !== 'All') params.status = query.status.toUpperCase();

    const response = await api.get<{ data: BackendTenantSummary[]; meta: any }>('/platform/tenants', { params });
    const uiTenants = (response.data.data || []).map(transformTenantSummaryToUi);
    return {
      data: uiTenants,
      meta: response.data.meta || {
        page: 1,
        limit: uiTenants.length,
        total: uiTenants.length,
        totalPages: 1,
      },
    };
  }

  async getTenantById(id: string): Promise<Tenant | null> {
    if (!id) return null;
    try {
      const tenantRes = await api.get<BackendTenantDetail>(`/platform/tenants/${id}`);
      let subscriptionData: any = null;
      let industryData: any = null;

      try {
        const subRes = await api.get(`/platform/tenants/${id}/subscription`);
        subscriptionData = subRes.data;
      } catch {
        // Subscription may not exist or not subscribed yet
      }

      try {
        const indRes = await api.get(`/platform/tenants/${id}/industry-template`);
        industryData = indRes.data;
      } catch {
        // Industry assignment may not exist yet
      }

      return transformTenantDetailToUi(tenantRes.data, subscriptionData, industryData);
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async provisionTenant(input: ProvisionTenantPayload): Promise<any> {
    const response = await api.post('/platform/tenants/provision', input);
    return response.data;
  }

  async createTenant(formState: TenantCreateFormState): Promise<Tenant> {
    // Generate or read persistent idempotency key for this draft attempt
    const idempotencyKey =
      formState.draftTenantId ||
      `prov_${formState.slug || 'tenant'}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Build authoritative payload conforming strictly to backend ProvisioningSchema
    const payload: ProvisionTenantPayload = {
      idempotencyKey,
      industryCode: formState.industryId?.toUpperCase().replace(/^IND_/, '') || 'GENERAL',
      trial: formState.provisioningType === 'Free Trial',
      planVersionId: formState.planId,
      billingCycle: formState.billingCycle?.toUpperCase().includes('YEAR') ? 'ANNUAL' : 'MONTHLY',
      seatQuantity: Number(formState.userLicensesCount) || 10,
      tenant: {
        slug: formState.slug,
        displayName: formState.companyName,
        legalName: formState.legalEntityName || formState.companyName,
        primaryDomain: formState.domain,
        websiteUrl: formState.website,
        description: formState.description,
        settings: {
          timezone: sanitizeIanaTimezone(formState.timezone),
          currency: formState.currency?.substring(0, 3) || 'INR',
          dateFormat: formState.dateFormat || 'DD MMM YYYY',
          weekStartDay: formState.weekStartDay || 'Monday',
        },
      },
      owner: {
        email: formState.adminEmail,
        fullName: formState.adminFullName || 'Tenant Admin',
      },
    };

    const receipt = await this.provisionTenant(payload);
    const createdTenantId = receipt?.tenantId || receipt?.id;
    if (createdTenantId) {
      const fetched = await this.getTenantById(createdTenantId);
      if (fetched) return fetched;
    }

    // Do NOT manufacture a Tenant object from local form state.
    // Return authoritative provisioning receipt/state or throw reload error so UI displays pending/retry state.
    throw new Error(
      `TENANT_PROVISIONING_RELOAD_FAILED: Provisioning request accepted (Tenant ID: ${createdTenantId || 'Pending'}), but authoritative tenant details reload failed. Please retry loading tenant record.`
    );
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    // Prohibited: Local simulation of tenant updates.
    throw new Error('MUTATION_UNSUPPORTED: Direct tenant metadata mutation endpoint is not exposed by current platform API contract.');
  }

  async updateTenantStatus(id: string, status: TenantStatus): Promise<Tenant> {
    // Prohibited: Local simulation of status mutation.
    throw new Error('MUTATION_UNSUPPORTED: Direct tenant status update endpoint is not exposed by current platform API contract.');
  }

  async updateTenantModules(id: string, moduleCodes: string[]): Promise<Tenant> {
    // Prohibited: Client-side mutation of enabledModuleCodes.
    // Module entitlements are strictly derived from server PlanVersion / Subscription.
    throw new Error('MUTATION_UNSUPPORTED: Tenant module entitlements are read-only and strictly issued by server PlanVersion Subscription.');
  }

  async getTenantSubscription(tenantId: string): Promise<any> {
    try {
      const response = await api.get(`/platform/tenants/${tenantId}/subscription`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async getTenantSubscriptionHistory(tenantId: string, page = 1, limit = 25): Promise<any> {
    const response = await api.get(`/platform/tenants/${tenantId}/subscription/history`, {
      params: { page, limit },
    });
    return response.data;
  }

  async getIndustryClassifications(): Promise<any[]> {
    const response = await api.get<any[]>('/platform/industry-classifications');
    return response.data;
  }

  async getTenantMemberships(tenantId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/platform/tenants/${tenantId}/memberships`);
    return response.data;
  }

  async getTenantIndustryTemplate(tenantId: string): Promise<any> {
    try {
      const response = await api.get(`/platform/tenants/${tenantId}/industry-template`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async migrateTenantIndustry(
    tenantId: string,
    body: { industryTemplateVersionId: string; reason: string; expectedRevision: number },
  ): Promise<any> {
    const response = await api.post(`/platform/tenants/${tenantId}/industry-template/migrate`, body);
    return response.data;
  }
}

export const tenantService: ITenantService = new ApiTenantService();
