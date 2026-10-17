import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { TenantContextPayload } from './tenant-context.service';
import { workspaceIsAccessible } from '@truroot/shared';

interface TenantRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: { sub: string; role: string };
  tenant?: TenantContextPayload;
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    if (!request.user?.sub)
      throw new UnauthorizedException('Authentication required');
    // Recheck the account: a stale JWT must not retain platform privileges.
    const account = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { id: true, role: true, isActive: true },
    });
    if (!account?.isActive)
      throw new UnauthorizedException('Account is deactivated');

    const header = (key: string) => {
      const value = request.headers[key];
      if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
        throw new ForbiddenException('Invalid tenant selection');
      }
      return typeof value === 'string' ? value.trim() : undefined;
    };
    const organizationId = header('x-organization-id');
    const tenantId = header('x-tenant-id');
    if (organizationId && tenantId && organizationId !== tenantId) {
      throw new ForbiddenException('Conflicting tenant selection');
    }
    let targetId = organizationId ?? tenantId;
    const slug = header('x-tenant-slug');
    if (slug) {
      const organization = await this.prisma.organization.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!organization || (targetId && targetId !== organization.id)) {
        throw new ForbiddenException('Invalid tenant selection');
      }
      targetId = organization.id;
    }

    if (account.role === 'SUPER_ADMIN') {
      if (!targetId) {
        throw new ForbiddenException('Select a tenant workspace');
      }
      const organization = await this.prisma.organization.findUnique({
        where: { id: targetId },
      });
      if (!organization)
        throw new ForbiddenException('Invalid tenant selection');
      request.user.role = account.role;
      request.tenant = {
        organizationId: organization.id,
        organizationSlug: organization.slug,
        organizationName: organization.name,
        status: organization.status,
        setupFeePaid: organization.setupFeePaid,
        role: account.role,
        isOwner: false,
        userId: account.id,
      };
      return true;
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId: account.id,
        isActive: true,
        ...(targetId ? { organizationId: targetId } : {}),
      },
      include: { organization: true },
      take: 2,
    });
    if (memberships.length !== 1) {
      throw new ForbiddenException(
        targetId
          ? 'No active membership in this workspace'
          : 'Select an active tenant workspace',
      );
    }
    const membership = memberships[0];
    if (membership.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Platform privileges cannot be granted by tenant membership',
      );
    }
    if (!workspaceIsAccessible(membership.organization)) {
      if (
        membership.organization.status === 'SETUP_PENDING' ||
        !membership.organization.setupFeePaid
      ) {
        throw new ForbiddenException(
          'Your organization setup payment is pending. Please complete payment to activate your workspace.',
        );
      }
      throw new ForbiddenException(
        'Your organization workspace is not active.',
      );
    }
    request.user.role = membership.role;
    request.tenant = {
      organizationId: membership.organizationId,
      organizationSlug: membership.organization.slug,
      organizationName: membership.organization.name,
      status: membership.organization.status,
      setupFeePaid: membership.organization.setupFeePaid,
      role: membership.role,
      isOwner: membership.isOwner,
      userId: account.id,
    };
    return true;
  }
}
