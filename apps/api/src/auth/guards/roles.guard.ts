import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@truroot/shared';
import { Request } from 'express';
import { PERMISSION_METADATA_KEY } from '../../common/decorators/require-permission.decorator';
import { TenantContextPayload } from '../../common/tenant/tenant-context.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      'roles',
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        role: UserRole;
      }>(token);
      const tenant: TenantContextPayload | undefined = request.tenant;
      if (tenant && (tenant.userId !== payload.sub || !tenant.role)) {
        throw new UnauthorizedException('Invalid tenant authorization context');
      }
      // TenantGuard has resolved the current membership/account role from the
      // database. Re-verifying the JWT must not overwrite it with a global role.
      const role = tenant?.role ?? payload.role;
      request['user'] = { ...payload, role };

      const requiredPermission = this.reflector.getAllAndOverride(
        PERMISSION_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      );
      if (requiredPermission) {
        return true;
      }

      if (
        requiredRoles &&
        !requiredRoles.some((requiredRole) => requiredRole === role)
      ) {
        throw new ForbiddenException('Insufficient permissions');
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException();
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) return token;

    return request.cookies?.accessToken;
  }
}
