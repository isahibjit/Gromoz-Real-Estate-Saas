import { api } from '../../../../common/api';

export interface IndustryTemplate {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
  revision: number;
  currentPublishedVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  versions?: IndustryTemplateVersion[];
}

export interface IndustryTemplateVersion {
  id: string;
  industryTemplateId: string;
  version: number;
  revision: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  schemaVersion: number;
  terminology: Record<string, unknown>;
  masterDefaults: unknown[];
  recommendedModuleCodes?: string[];
  sourceFixtureId?: string | null;
  sourceHash?: string | null;
  approvalReference?: string | null;
  publishedAt?: string | null;
  publishedByUserId?: string | null;
  createdAt: string;
}

export interface IndustryPageResponse {
  data: IndustryTemplate[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PublishIndustryDto {
  expectedRevision: number;
  reason: string;
  approvalReference: string;
}

export interface CreateIndustryDraftDto {
  reason: string;
}

class ApiIndustryService {
  async getIndustries(query: { page?: number; limit?: number; search?: string } = {}): Promise<IndustryTemplate[]> {
    const params: Record<string, any> = {
      page: query.page || 1,
      limit: query.limit || 50,
    };
    if (query.search?.trim()) params.search = query.search.trim();
    const response = await api.get<{ data: IndustryTemplate[]; meta: any }>('/platform/industries', { params });
    return response.data.data || [];
  }

  async getIndustryById(id: string): Promise<IndustryTemplate | null> {
    try {
      const response = await api.get<IndustryTemplate>(`/platform/industries/${id}`);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async getVersions(id: string): Promise<IndustryTemplateVersion[]> {
    const response = await api.get<{ data: IndustryTemplateVersion[] } | IndustryTemplateVersion[]>(
      `/platform/industries/${id}/versions`,
    );
    if (Array.isArray(response.data)) return response.data;
    return (response.data as any).data || [];
  }

  async getVersionDetail(id: string, versionId: string): Promise<IndustryTemplateVersion | null> {
    try {
      const response = await api.get<IndustryTemplateVersion>(
        `/platform/industries/${id}/versions/${versionId}`,
      );
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  }

  async createDraft(id: string, body: CreateIndustryDraftDto): Promise<IndustryTemplateVersion> {
    const response = await api.post<IndustryTemplateVersion>(`/platform/industries/${id}/versions/draft`, body);
    return response.data;
  }

  async publishVersion(id: string, versionId: string, body: PublishIndustryDto): Promise<IndustryTemplateVersion> {
    const response = await api.post<IndustryTemplateVersion>(
      `/platform/industries/${id}/versions/${versionId}/publish`,
      body,
    );
    return response.data;
  }

  async archiveIndustry(id: string, body: { expectedRevision: number; reason: string }): Promise<IndustryTemplate> {
    const response = await api.post<IndustryTemplate>(`/platform/industries/${id}/archive`, body);
    return response.data;
  }
}

export const industryService = new ApiIndustryService();
