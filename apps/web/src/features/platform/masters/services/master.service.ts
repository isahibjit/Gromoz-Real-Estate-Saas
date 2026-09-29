import { api } from '../../../../common/api';

export interface EffectiveMasterDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  moduleCode: string | null;
  valueType: string;
  metadataSchema: string;
  allowTenantCreate: boolean;
  allowTenantEdit: boolean;
  allowTenantDeactivate: boolean;
  allowIndustryDefaults: boolean;
  systemValuePolicy: 'OVERRIDABLE_LABEL' | 'LOCKED_IDENTITY';
  displayOrder: number;
  status: 'ACTIVE';
  revision: number;
}

export interface EffectiveMasterValue {
  id: string;
  code: string;
  label: string;
  displayOrder: number;
  isActive: boolean;
  provenance: 'SYSTEM' | 'INDUSTRY' | 'TENANT';
  isOverridden?: boolean;
  overrideLabel?: string | null;
  originId?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTenantValueDto {
  code: string;
  label: string;
  displayOrder?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateTenantValueDto {
  label?: string;
  displayOrder?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SetTenantOverrideDto {
  overrideLabel?: string | null;
  displayOrder?: number;
  isHidden?: boolean;
}

class ApiMasterService {
  async getEffectiveDefinitions(): Promise<EffectiveMasterDefinition[]> {
    const response = await api.get<any>('/tenant/masters');
    const raw = response.data;
    const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return items.map((d: any) => ({
      id: d.id || d.code,
      code: d.code,
      name: d.name || d.code,
      description: d.description || '',
      moduleCode: d.moduleCode ?? null,
      valueType: d.valueType ?? 'STRING',
      metadataSchema: d.metadataSchema ?? '{}',
      allowTenantCreate: d.allowTenantCreate ?? true,
      allowTenantEdit: d.allowTenantEdit ?? true,
      allowTenantDeactivate: d.allowTenantDeactivate ?? true,
      allowIndustryDefaults: d.allowIndustryDefaults ?? true,
      systemValuePolicy: d.systemValuePolicy ?? 'OVERRIDABLE_LABEL',
      displayOrder: d.displayOrder ?? 1,
      status: d.status ?? 'ACTIVE',
      revision: d.revision ?? 1,
    }));
  }

  async getEffectiveValues(code: string, query: { search?: string; isActive?: boolean } = {}): Promise<EffectiveMasterValue[]> {
    const params: Record<string, any> = {};
    if (query.search?.trim()) params.search = query.search.trim();
    if (query.isActive !== undefined) params.isActive = query.isActive;

    const response = await api.get<any>(`/tenant/masters/${code}/values`, { params });
    const raw = response.data;
    const items = Array.isArray(raw) ? raw : (raw?.items ?? []);
    return items.map((r: any) => ({
      id: r.id,
      code: r.code,
      label: r.name || r.label || r.code,
      displayOrder: r.sortOrder ?? r.displayOrder ?? 1,
      isActive: r.selectable ?? r.isActive ?? true,
      provenance: typeof r.provenance === 'string' ? r.provenance : (r.source || r.provenance?.source || 'TENANT'),
      isOverridden: Boolean(r.provenance?.overrides?.length),
      overrideLabel: r.name,
      originId: r.id,
      metadata: r.metadata,
    }));
  }

  async createTenantValue(code: string, input: CreateTenantValueDto): Promise<EffectiveMasterValue> {
    const response = await api.post<EffectiveMasterValue>(`/tenant/masters/${code}/values`, input);
    return response.data;
  }

  async updateTenantValue(id: string, input: UpdateTenantValueDto): Promise<EffectiveMasterValue> {
    const response = await api.patch<EffectiveMasterValue>(`/tenant/masters/values/${id}`, input);
    return response.data;
  }

  async setTenantOverride(id: string, input: SetTenantOverrideDto): Promise<any> {
    const response = await api.put(`/tenant/masters/overrides/${id}`, input);
    return response.data;
  }

  async removeTenantOverride(id: string): Promise<any> {
    const response = await api.delete(`/tenant/masters/overrides/${id}`);
    return response.data;
  }
}

export const masterService = new ApiMasterService();
