import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // populated by AuthGuard

    if (!user || !user.sub) {
      throw new UnauthorizedException('Authentication required for tenant operations');
    }

    // Platform Super Admins can pass x-organization-id to act on behalf of any tenant
    const headerOrgId = (request.headers['x-organization-id'] ||
      request.headers['x-tenant-id']) as string | undefined;
    const headerOrgSlug = request.headers['x-tenant-slug'] as string | undefined;

    let targetOrgId = headerOrgId;

    if (!targetOrgId && headerOrgSlug) {
      const org = await this.prisma.organization.findUnique({
        where: { slug: headerOrgSlug },
        select: { id: true },
      });
      if (org) {
        targetOrgId = org.id;
      }
    }

    // Check user's membership
    let membership = targetOrgId
      ? await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: targetOrgId,
              userId: user.sub,
            },
          },
          include: {
            organization: true,
          },
        })
      : await this.prisma.organizationMember.findFirst({
          where: {
            userId: user.sub,
            isActive: true,
          },
          include: {
            organization: true,
          },
          orderBy: { createdAt: 'asc' },
        });

    // If user is SUPER_ADMIN and specified a target org header, allow super-admin override
    if (!membership && user.role === 'SUPER_ADMIN' && targetOrgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: targetOrgId },
      });
      if (org) {
        const payload = {
          organizationId: org.id,
          organizationSlug: org.slug,
          organizationName: org.name,
          status: org.status,
          setupFeePaid: org.setupFeePaid,
          role: 'SUPER_ADMIN',
          isOwner: true,
          userId: user.sub,
        };
        request.tenant = payload;
        this.tenantContext.run(payload, () => {});
        return true;
      }
    }

    if (!membership || !membership.organization) {
      // User has no active organization membership
      throw new ForbiddenException('No active organization membership found. Please create or join an organization.');
    }

    if (!membership.isActive) {
      throw new ForbiddenException('Your membership in this organization is currently deactivated.');
    }

    const payload = {
      organizationId: membership.organizationId,
      organizationSlug: membership.organization.slug,
      organizationName: membership.organization.name,
      status: membership.organization.status,
      setupFeePaid: membership.organization.setupFeePaid,
      role: membership.role,
      isOwner: membership.isOwner,
      userId: user.sub,
    };

    request.tenant = payload;
    return true;
  }
}
