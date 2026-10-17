import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../persistence/prisma/prisma.service';

@Injectable()
export class MobileAppAdminGuard implements CanActivate {
  constructor(
    private readonly access: AccessService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const user = context
      .switchToHttp()
      .getRequest<{ user?: { sub: string; role: string } }>().user;
    if (!user || user.role !== 'SUPER_ADMIN')
      throw new ForbiddenException(
        'Only platform super administrators can manage app releases',
      );
    const account = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, isActive: true },
    });
    if (!account?.isActive || account.role !== 'SUPER_ADMIN')
      throw new ForbiddenException(
        'Only active platform super administrators can manage app releases',
      );
    if (!(await this.access.hasPermission(user, 'page.mobile_app', 'view')))
      throw new ForbiddenException('Mobile app page access is disabled');
    return true;
  }
}
