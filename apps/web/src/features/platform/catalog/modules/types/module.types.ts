export type PlatformModuleCategory = 'CORE' | 'SALES' | 'FIELD_OPS' | 'AUTOMATION' | 'ENTERPRISE';
export type ModuleCategory = PlatformModuleCategory | 'Core' | 'Sales' | 'Field Ops' | 'Automation' | 'Enterprise';
export type PlatformModuleStatus = 'DRAFT' | 'ACTIVE' | 'BETA' | 'DEPRECATED' | 'ARCHIVED';
export type ModuleFeatureStatus = 'ACTIVE' | 'BETA' | 'DEPRECATED';
export type FeatureImplementationMaturity = 'DECLARED' | 'UI_READY' | 'BACKEND_PARTIAL' | 'BACKEND_READY' | 'FULL_STACK_READY';

export interface ModuleFeature {
  id?: string;
  code: string;
  implementationKey?: string;
  name: string;
  description: string;
  status: ModuleFeatureStatus;
  supportsWeb?: boolean;
  supportsMobile?: boolean;
  supportsApi?: boolean;
  supportsOffline?: boolean;
  displayOrder?: number;
  maturity?: FeatureImplementationMaturity;
  internalNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  module?: Pick<PlatformModule, 'id' | 'code' | 'name'>;
}

export interface PlatformModule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: PlatformModuleCategory;
  status: PlatformModuleStatus;
  requiredBySystem: boolean;
  displayOrder: number;
  internalNotes?: string | null;
  dependencyCodes: string[];
  dependentCodes: string[];
  features: ModuleFeature[];
  createdAt: string;
  updatedAt: string;
}

export interface ModuleQueryFilter {
  search?: string;
  category?: ModuleCategory;
  status?: PlatformModuleStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface UpdateModuleInput {
  status?: PlatformModuleStatus;
  internalNotes?: string;
}

export interface UpdateFeatureInput {
  status?: ModuleFeatureStatus;
  internalNotes?: string;
}
