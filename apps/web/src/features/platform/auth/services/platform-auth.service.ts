import { PlatformPermission } from '../../tenants/types/platform.types';

class PlatformAuthService {
  /**
   * Check platform permission against server-issued authorization permissions array.
   */
  hasPermission(permission: PlatformPermission, serverPermissions?: string[]): boolean {
    if (!serverPermissions || !Array.isArray(serverPermissions)) return false;
    return serverPermissions.includes(permission);
  }
}

export const platformAuthService = new PlatformAuthService();
