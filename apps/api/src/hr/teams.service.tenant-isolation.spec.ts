import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { TeamsService } from './teams.service';

describe('Teams tenant isolation', () => {
  const prisma = {
    team: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    employeeProfile: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  const context = new TenantContextService();
  const run = <T>(operation: () => T) =>
    context.run({ organizationId: 'tenant-a' }, operation);
  let service: TeamsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.team.findMany.mockResolvedValue([]);
    prisma.team.findFirst.mockResolvedValue(null);
    prisma.team.findUnique.mockResolvedValue(null);
    prisma.team.count.mockResolvedValue(0);
    prisma.user.findFirst.mockResolvedValue(null);
    const module = await Test.createTestingModule({
      providers: [
        TeamsService,
        TenantAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: context },
      ],
    }).compile();
    service = module.get(TeamsService);
  });

  it('keeps admin lists tenant-scoped, including related members and leader', async () => {
    await run(() => service.listTeams({ sub: 'admin', role: 'SUPER_ADMIN' }));
    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{}, { organizationId: 'tenant-a' }] },
        include: expect.objectContaining({
          leader: expect.objectContaining({
            where: expect.objectContaining({
              organizationMemberships: expect.any(Object),
            }),
          }),
          members: expect.objectContaining({
            where: {
              user: expect.objectContaining({
                organizationMemberships: expect.any(Object),
              }),
            },
          }),
        }),
      }),
    );
  });

  it('does not expose a foreign team by ID', async () => {
    await expect(
      run(() =>
        service.getTeam('team-b', { sub: 'admin', role: 'SUPER_ADMIN' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.team.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'team-b', organizationId: 'tenant-a' },
      }),
    );
  });

  it('rejects a foreign leader before creating a team', async () => {
    await expect(
      run(() =>
        service.createTeam({
          name: 'New',
          code: 'NEW',
          leaderId: 'foreign-user',
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each(['add', 'remove', 'update'] as const)(
    'rejects foreign team %s before writing',
    async (operation) => {
      const invoke = () =>
        operation === 'add'
          ? service.addMember('team-b', 'employee')
          : operation === 'remove'
          ? service.removeMember('team-b', 'employee')
          : service.updateTeam('team-b', { name: 'Changed' });
      await expect(run(invoke)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.employeeProfile.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects adding another tenant employee to a valid local team', async () => {
    prisma.team.count.mockResolvedValue(1);
    await expect(
      run(() => service.addMember('team-a', 'foreign-user')),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.employeeProfile.findUnique).not.toHaveBeenCalled();
  });
});
