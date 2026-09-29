import { PlatformRole, PlatformPermission } from '../../tenants/types/platform.types';

export interface PlatformPrincipal {
  userId: string;
  email: string;
  fullName: string;
  role: PlatformRole;
  permissions: PlatformPermission[];
}
