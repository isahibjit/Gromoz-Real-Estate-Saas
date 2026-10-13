import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { AccessService } from '../access/access.service';
import { UploadsService } from '../uploads/uploads.service';
import { RedisService } from '../redis/redis.service';
import { RealtimeService } from '../realtime/realtime.service';
import { HrService } from './hr.service';
import { MailService } from './mail.service';
import { HrDocumentsService } from './documents.service';

describe('HR tenant isolation', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    employeeProfile: { count: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
    team: { count: jest.fn() },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
    $executeRaw: jest.fn(),
  };
  const context = new TenantContextService();
  const actor = { sub: 'platform-admin', role: 'SUPER_ADMIN' };
  let service: HrService;
  let tenants: TenantAccessService;
  const run = <T>(operation: () => T) =>
    context.run({ organizationId: 'tenant-a' }, operation);

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.count.mockResolvedValue(0);
    prisma.employeeProfile.count.mockResolvedValue(0);
    const module = await Test.createTestingModule({
      providers: [
        HrService,
        TenantAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: context },
        ...[
          UploadsService,
          MailService,
          HrDocumentsService,
          AccessService,
          RedisService,
          RealtimeService,
        ].map((provide) => ({ provide, useValue: {} })),
      ],
    }).compile();
    service = module.get(HrService);
    tenants = module.get(TenantAccessService);
  });

  it('scopes both list rows and pagination count for a platform spectator', async () => {
    await expect(
      run(() =>
        service.listEmployees({ search: 'example', role: 'ADMIN' }, actor),
      ),
    ).resolves.toEqual({
      data: [],
      meta: { page: 1, limit: 25, total: 0 },
    });
    const scope = run(() => tenants.employeeWhere());
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: [scope], role: 'ADMIN' }),
        select: expect.objectContaining({
          ledTeams: expect.objectContaining({
            where: { organizationId: 'tenant-a' },
          }),
          leadVisibilityOverrides: expect.objectContaining({
            where: { target: scope },
          }),
          attendanceRecords: expect.objectContaining({
            where: expect.objectContaining({ organizationId: 'tenant-a' }),
          }),
        }),
      }),
    );
    expect(prisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ AND: [scope] }),
      }),
    );
  });

  it.each(['read', 'update', 'delete'] as const)(
    'rejects cross-tenant employee %s before accessing the global identity',
    async (operation) => {
      const invoke = () =>
        operation === 'read'
          ? service.getEmployee('tenant-b-user', actor)
          : operation === 'update'
          ? service.updateEmployee(
              'tenant-b-user',
              { fullName: 'Changed' },
              actor,
            )
          : service.deleteEmployee('tenant-b-user', actor);
      await expect(run(invoke)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
      expect(prisma.user.delete).not.toHaveBeenCalled();
      expect(prisma.$executeRaw).not.toHaveBeenCalled();
    },
  );

  it('creates the user and selected organization membership in one nested write', async () => {
    const stop = new Error('stop before database mutation');
    prisma.user.create.mockRejectedValueOnce(stop);
    await expect(
      run(() =>
        service.createEmployee(
          {
            email: 'new@example.test',
            fullName: 'New Employee',
            role: 'SALES_AGENT',
            joiningDate: '2026-09-30',
            organizationId: 'forged-tenant-b',
          },
          actor,
        ),
      ),
    ).rejects.toBe(stop);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationMemberships: {
            create: { organizationId: 'tenant-a', role: 'SALES_AGENT' },
          },
        }),
      }),
    );
  });

  it('cannot run the list unscoped', async () => {
    await expect(service.listEmployees({}, actor)).rejects.toThrow(
      'Select a tenant workspace',
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
