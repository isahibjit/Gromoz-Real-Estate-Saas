import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import {
  PERMISSION_METADATA_KEY,
  SKIP_PERMISSION_METADATA_KEY,
  type RequiredPermission,
} from '../common/decorators/require-permission.decorator';
import { AccessService } from './access.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const skipPermission = this.reflector.getAllAndOverride<boolean>(
      SKIP_PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipPermission) return true;

    const handlerRequired = this.reflector.get<RequiredPermission>(
      PERMISSION_METADATA_KEY,
      context.getHandler(),
    );
    const classRequired = this.reflector.get<RequiredPermission>(
      PERMISSION_METADATA_KEY,
      context.getClass(),
    );
    const required = handlerRequired ?? classRequired;
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub: string; role: string } | undefined;
    if (!user) throw new ForbiddenException('Missing authenticated user');

    const action =
      handlerRequired?.action ??
      (request.method === 'POST'
        ? 'create'
        : request.method === 'PATCH'
        ? 'update'
        : request.method === 'DELETE'
        ? 'delete'
        : required.action);

    const allowed = await this.access.hasPermission(
      user,
      required.moduleKey,
      action,
    );
    if (!allowed) throw new ForbiddenException('Insufficient module access');
    return true;
  }
}
