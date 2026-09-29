import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContextPayload } from './tenant-context.service';

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantContextPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.tenant as TenantContextPayload | undefined;
    if (!tenant) return undefined;
    return data ? tenant[data] : tenant;
  },
);

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.organizationId;
  },
);
