import { api } from '../../../../../common/api';
import {
  ModuleFeature,
  ModuleQueryFilter,
  PlatformModule,
  UpdateFeatureInput,
  UpdateModuleInput,
} from '../types/module.types';

export interface PaginatedModulesResponse {
  data: PlatformModule[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class ModuleService {
  async getModules(filter: ModuleQueryFilter = {}): Promise<PlatformModule[]> {
    return (await this.getModulesPaginated(filter)).data;
  }

  async getModulesPaginated(filter: ModuleQueryFilter = {}): Promise<PaginatedModulesResponse> {
    return (await api.get<PaginatedModulesResponse>('/platform/modules', { params: filter })).data;
  }

  async getModuleById(id: string): Promise<PlatformModule | null> {
    try {
      return (await api.get<PlatformModule>(`/platform/modules/${id}`)).data;
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 404
      )
        return null;
      throw error;
    }
  }

  async updateModule(id: string, input: UpdateModuleInput): Promise<PlatformModule> {
    return (await api.patch<PlatformModule>(`/platform/modules/${id}`, input)).data;
  }

  async archiveModule(id: string): Promise<PlatformModule> {
    return (await api.post<PlatformModule>(`/platform/modules/${id}/archive`)).data;
  }

  async restoreModule(id: string): Promise<PlatformModule> {
    return (await api.post<PlatformModule>(`/platform/modules/${id}/restore`)).data;
  }

  async getSummary(): Promise<{
    totalModules: number;
    activeModules: number;
    registeredFeatures: number;
    dependencyLinks: number;
    catalogHealth?: any;
    registryHash?: string;
  }> {
    return (await api.get('/platform/modules/summary')).data;
  }

  async getFeatures(
    filter: {
      search?: string;
      moduleCode?: string;
      status?: string;
      platform?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ data: ModuleFeature[]; meta: PaginatedModulesResponse['meta'] }> {
    return (await api.get('/platform/modules/features', { params: filter })).data;
  }

  async getFeature(id: string): Promise<ModuleFeature> {
    return (await api.get<ModuleFeature>(`/platform/modules/features/${id}`)).data;
  }

  async updateFeature(id: string, input: UpdateFeatureInput): Promise<ModuleFeature> {
    return (await api.patch<ModuleFeature>(`/platform/modules/features/${id}`, input)).data;
  }

  async getDependencyGraph(): Promise<
    Array<
      Pick<PlatformModule, 'id' | 'code' | 'name' | 'status'> & {
        dependencies: Array<{
          dependsOnModule: Pick<PlatformModule, 'id' | 'code' | 'name' | 'status'>;
        }>;
      }
    >
  > {
    return (await api.get('/platform/modules/dependency-graph')).data;
  }

  async getHistory(id: string): Promise<unknown[]> {
    return (await api.get(`/platform/modules/${id}/history`)).data;
  }
}

export const moduleService = new ModuleService();
