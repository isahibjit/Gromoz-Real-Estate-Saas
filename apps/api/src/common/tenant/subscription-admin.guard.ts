import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { TenantContextPayload } from './tenant-context.service';
export const AllowSubscriptionAccess = () =>
  SetMetadata('allowSubscriptionAccess', true);
@Injectable()
export class SubscriptionAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { tenant } = context
      .switchToHttp()
      .getRequest<{ tenant?: TenantContextPayload }>();
    if (
      !tenant ||
      tenant.role === 'SUPER_ADMIN' ||
      (!tenant.isOwner && tenant.role !== 'ADMIN')
    ) {
      throw new ForbiddenException(
        'Only workspace owners and administrators can manage subscriptions and support',
      );
    }
    return true;
  }
}
