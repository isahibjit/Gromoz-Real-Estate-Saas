import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { defer, firstValueFrom } from 'rxjs';
import { TenantContextService } from './tenant-context.service';
import { TenantContextInterceptor } from './tenant-context.interceptor';

describe('TenantContextInterceptor', () => {
  it('keeps concurrent async handlers isolated and cleans up context', async () => {
    const tenants = new TenantContextService();
    const interceptor = new TenantContextInterceptor(tenants);
    const run = (organizationId: string) =>
      firstValueFrom(
        interceptor.intercept(
          new ExecutionContextHost([{ tenant: { organizationId } }]),
          {
            handle: () =>
              defer(async () => {
                await Promise.resolve();
                expect(tenants.getRequiredTenantId()).toBe(organizationId);
                await new Promise<void>((resolve) => setImmediate(resolve));
                return tenants.getRequiredTenantId();
              }),
          },
        ),
      );
    await expect(
      Promise.all([run('tenant-a'), run('tenant-b')]),
    ).resolves.toEqual(['tenant-a', 'tenant-b']);
    expect(tenants.getTenant()).toBeUndefined();
    expect(() => tenants.getRequiredTenantId()).toThrow(
      'Select a tenant workspace',
    );
  });

  it('does not invent a tenant for public or platform requests', async () => {
    const tenants = new TenantContextService();
    const interceptor = new TenantContextInterceptor(tenants);
    await expect(
      firstValueFrom(
        interceptor.intercept(new ExecutionContextHost([{}]), {
          handle: () => defer(async () => tenants.getTenant()),
        }),
      ),
    ).resolves.toBeUndefined();
  });
});
