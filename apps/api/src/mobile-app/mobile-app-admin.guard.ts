import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AccessService } from '../access/access.service';

@Injectable()
export class MobileAppAdminGuard implements CanActivate {
  constructor(private readonly access: AccessService) {}
  async canActivate(context: ExecutionContext) {
    const user = context.switchToHttp().getRequest<{ user?: { sub: string; role: string } }>().user;
    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) throw new ForbiddenException('Only administrators can manage app releases');
    if (!await this.access.hasPermission(user, 'page.mobile_app', 'view')) throw new ForbiddenException('Mobile app page access is disabled');
    return true;
  }
}
