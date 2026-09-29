import { useMemo } from 'react';
import { PlatformPermission } from '../types/platform.types';
import { useAppSelector } from '../../../../store';

export function usePlatformPermissions() {
  const platformAuth = useAppSelector((state) => state.authorization.platform);
  const loaded = useAppSelector((state) => state.authorization.loaded);

  const permissions = useMemo(() => {
    return platformAuth?.permissions || [];
  }, [platformAuth?.permissions]);

  const roleCodes = useMemo(() => {
    return platformAuth?.roleCodes || [];
  }, [platformAuth?.roleCodes]);

  const hasPlatformPermission = (permission: PlatformPermission): boolean => {
    if (!loaded) return false;
    return permissions.includes(permission);
  };

  const canCreateTenant = hasPlatformPermission('platform.tenants.create');
  const canManageSubscriptions = hasPlatformPermission('platform.subscriptions.manage');
  const canSuspendTenant = hasPlatformPermission('platform.tenants.suspend');
  const canViewAuditLogs = hasPlatformPermission('platform.audit.view');

  const canCreatePlan = hasPlatformPermission('platform.plans.create');
  const canUpdatePlan = hasPlatformPermission('platform.plans.update');
  const canArchivePlan = hasPlatformPermission('platform.plans.archive');
  const canPublishPlan = hasPlatformPermission('platform.plans.publish');

  const canViewModules = hasPlatformPermission('platform.modules.view');
  const canUpdateModule = hasPlatformPermission('platform.modules.update');
  const canArchiveModule = hasPlatformPermission('platform.modules.archive');

  return {
    roleCodes,
    permissions,
    hasPlatformPermission,
    canCreateTenant,
    canManageSubscriptions,
    canSuspendTenant,
    canViewAuditLogs,
    canCreatePlan,
    canUpdatePlan,
    canArchivePlan,
    canPublishPlan,
    canViewModules,
    canUpdateModule,
    canArchiveModule,
  };
}
