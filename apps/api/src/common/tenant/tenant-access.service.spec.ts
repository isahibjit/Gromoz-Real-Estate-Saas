import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';
import { TenantAccessService } from './tenant-access.service';

describe('TenantAccessService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), count: jest.fn() },
    team: { count: jest.fn() },
  };
  const context = new TenantContextService();
  let service: TenantAccessService;
  const inTenant = <T>(operation: () => T) =>
    context.run({ organizationId: 'tenant-a' }, operation);

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        TenantAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: context },
      ],
    }).compile();
    service = module.get(TenantAccessService);
  });

  it('fails closed without request context', () => {
    expect(() => service.employeeWhere()).toThrow(ForbiddenException);
  });

  it('excludes platform accounts, orphans, and shared legacy profiles', () => {
    expect(inTenant(() => service.employeeWhere())).toEqual({
      role: { not: 'SUPER_ADMIN' },
      organizationMemberships: {
        some: { organizationId: 'tenant-a' },
        none: { organizationId: { not: 'tenant-a' } },
      },
    });
  });

  it('does not grant direct-ID access to another tenant employee', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      inTenant(() => service.assertEmployee('tenant-b-user')),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        AND: [inTenant(() => service.employeeWhere()), { id: 'tenant-b-user' }],
      },
      select: { id: true },
    });
  });

  it('accepts an employee owned only by this workspace', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 'tenant-a-user' });
    await expect(
      inTenant(() => service.assertEmployee('tenant-a-user')),
    ).resolves.toBeUndefined();
  });

  it('rejects an assignment when even one team belongs elsewhere', async () => {
    prisma.team.count.mockResolvedValue(1);
    await expect(
      inTenant(() => service.assertTeams(['team-a', 'team-b'])),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.team.count).toHaveBeenCalledWith({
      where: { id: { in: ['team-a', 'team-b'] }, organizationId: 'tenant-a' },
    });
  });

  it('validates all employee reference fields, not just the reporting manager', async () => {
    prisma.team.count.mockResolvedValue(2);
    prisma.user.count.mockResolvedValue(4);
    await inTenant(() =>
      service.validateEmployeeReferences({
        teamId: 'team-a',
        managedTeamIds: ['team-a', 'team-b'],
        reportingToId: 'manager',
        monitorUserIds: ['monitor'],
        leadVisibilityAllowedUserIds: ['allowed'],
        leadVisibilityBlockedUserIds: ['blocked'],
      }),
    );
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: {
        AND: [
          inTenant(() => service.employeeWhere()),
          { id: { in: ['manager', 'monitor', 'allowed', 'blocked'] } },
        ],
      },
    });
  });

  it('rejects malformed references before any query', async () => {
    await expect(
      inTenant(() =>
        service.validateEmployeeReferences({ teamId: { id: 'team-b' } }),
      ),
    ).rejects.toThrow('Invalid teamId');
    expect(prisma.team.count).not.toHaveBeenCalled();
  });
});
