import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessService } from './access.service';

describe('Employee access-control tenant isolation', () => {
  const prisma = {
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    team: { count: jest.fn() },
    accessTemplate: { findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const context = new TenantContextService();
  const run = <T>(operation: () => T) =>
    context.run({ organizationId: 'tenant-a' }, operation);
  const actor = { sub: 'platform-admin', role: 'SUPER_ADMIN' };
  let service: AccessService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.user.findFirst.mockResolvedValue(null);
    const module = await Test.createTestingModule({
      providers: [
        AccessService,
        TenantAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: context },
      ],
    }).compile();
    service = module.get(AccessService);
  });

  it.each(['read', 'update', 'reset'] as const)(
    'rejects foreign employee permission %s',
    async (operation) => {
      const invoke = () =>
        operation === 'read'
          ? service.getUserAccess('foreign-user')
          : operation === 'update'
          ? service.updateUserAccess('foreign-user', { permissions: [] }, actor)
          : service.resetUserAccess('foreign-user', actor);
      await expect(run(invoke)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects cross-tenant visibility teams before replacing existing permissions', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'local-user' });
    prisma.team.count.mockResolvedValue(0);
    await expect(
      run(() =>
        service.updateUserAccess(
          'local-user',
          { permissions: [], monitorTeamIds: ['foreign-team'] },
          actor,
        ),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not let a tenant spectator edit platform-wide role templates', async () => {
    await expect(
      run(() => service.updateTemplate('ADMIN', { permissions: [] }, actor)),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.accessTemplate.findMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not offer platform app publishing in tenant permission editors', async () => {
    jest.spyOn(service, 'ensureDefaultTemplates').mockResolvedValue();
    const result = await run(() => service.listModules());
    expect(
      result.data.some(
        (module) =>
          module.key === 'mobile_app' || module.key === 'page.mobile_app',
      ),
    ).toBe(false);
    expect(result.data.some((module) => module.key === 'leads')).toBe(true);
  });
});
