import { SetMetadata } from '@nestjs/common';

import type { PermissionAction } from '../../access/access.constants';

export const PERMISSION_METADATA_KEY = 'permission';
export const SKIP_PERMISSION_METADATA_KEY = 'skipPermission';

export interface RequiredPermission {
  moduleKey: string;
  action: PermissionAction;
}

export const RequirePermission = (
  moduleKey: string,
  action: PermissionAction = 'view',
) => SetMetadata(PERMISSION_METADATA_KEY, { moduleKey, action });

export const SkipPermission = () =>
  SetMetadata(SKIP_PERMISSION_METADATA_KEY, true);
