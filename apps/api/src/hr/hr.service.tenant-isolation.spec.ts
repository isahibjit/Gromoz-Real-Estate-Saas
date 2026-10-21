import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
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
    organization: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ allocatedSeats: 10, pricePerSeatMonth: 500 }),
    },
    organizationMember: { count: jest.fn().mockResolvedValue(1) },
    organizationInvitation: { count: jest.fn().mockResolvedValue(0) },
    $queryRaw: jest.fn(),
    employeeProfile: {
      count: jest.fn(),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    team: { count: jest.fn() },
    payrollRecord: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bookingIncentive: { findMany: jest.fn() },
    bookingExtraIncentive: { findMany: jest.fn() },
    $transaction: jest.fn(
      (
        operations: Promise<unknown>[] | ((tx: unknown) => Promise<unknown>),
      ): Promise<unknown> =>
        typeof operations === 'function'
          ? operations(prisma)
          : Promise.all(operations),
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
    prisma.payrollRecord.findMany.mockResolvedValue([]);
    prisma.payrollRecord.findFirst.mockResolvedValue(null);
    prisma.bookingIncentive.findMany.mockResolvedValue([]);
    prisma.bookingExtraIncentive.findMany.mockResolvedValue([]);
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

  it.each(['SALES_AGENT', 'TELECALLER'])(
    '%s payroll is restricted to self and exclusively owned workspace employees',
    async (role) => {
      await run(() =>
        service.listPayroll(
          {
            year: '2026',
            month: '10',
            employeeId: 'foreign-user',
            teamId: 'foreign-team',
          },
          { sub: 'self', role },
        ),
      );
      expect(prisma.payrollRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              { year: 2026, month: 10, employeeId: 'self' },
              {
                organizationId: 'tenant-a',
                employee: run(() => tenants.employeeWhere()),
              },
            ],
          },
          include: expect.objectContaining({
            employee: expect.objectContaining({
              select: expect.objectContaining({
                ledTeams: {
                  where: { organizationId: 'tenant-a' },
                  select: { id: true, name: true },
                },
              }),
            }),
          }),
        }),
      );
    },
  );

  it('intersects administrator payroll filters with the selected tenant', async () => {
    await run(() => service.listPayroll({ employeeId: 'foreign-user' }, actor));
    expect(prisma.payrollRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { employeeId: 'foreign-user' },
            {
              organizationId: 'tenant-a',
              employee: run(() => tenants.employeeWhere()),
            },
          ],
        },
      }),
    );
  });

  it('cannot list payroll without a selected tenant', async () => {
    await expect(service.listPayroll({}, actor)).rejects.toThrow(
      'Select a tenant workspace',
    );
    expect(prisma.payrollRecord.findMany).not.toHaveBeenCalled();
  });

  it.each(['amend', 'finalize', 'pay'] as const)(
    'rejects foreign, shared or unowned payroll before %s writes',
    async (operation) => {
      await expect(
        run(() =>
          operation === 'amend'
            ? service.updatePayrollDraft('foreign-record', {}, actor)
            : operation === 'finalize'
            ? service.finalizePayroll('foreign-record', {}, actor)
            : service.markPayrollPaid('foreign-record', actor),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.payrollRecord.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'foreign-record',
            organizationId: 'tenant-a',
            employee: run(() => tenants.employeeWhere()),
          },
        }),
      );
      expect(prisma.payrollRecord.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('does not run payroll for an employee outside this workspace', async () => {
    await expect(
      run(() =>
        service.runPayroll(
          { year: 2026, month: 10, employeeId: 'foreign-user' },
          actor,
        ),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [run(() => tenants.employeeWhere())],
          id: 'foreign-user',
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it.each([null, 'tenant-b'])(
    'does not adopt an existing payroll owned by %s',
    async (organizationId) => {
      prisma.user.findMany.mockResolvedValue([{ id: 'self' }]);
      prisma.payrollRecord.findUnique.mockResolvedValue({ organizationId });
      prisma.$transaction.mockImplementationOnce(async (work: unknown) => {
        if (typeof work !== 'function')
          throw new Error('Expected transaction callback');
        return work(prisma);
      });
      await expect(
        run(() => service.runPayroll({ year: 2026, month: 10 }, actor)),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.payrollRecord.create).not.toHaveBeenCalled();
      expect(prisma.payrollRecord.update).not.toHaveBeenCalled();
    },
  );

  it('stamps a new payroll with its tenant and limits incentive calculations to that tenant', async () => {
    const stop = new Error('Stop before write');
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'self',
        employeeProfile: {
          monthlyBasic: new Prisma.Decimal(30000),
          monthlyAllowances: new Prisma.Decimal(0),
          monthlyDeductions: new Prisma.Decimal(0),
        },
      },
    ]);
    prisma.payrollRecord.findUnique.mockResolvedValue(null);
    prisma.payrollRecord.create.mockRejectedValueOnce(stop);
    prisma.$transaction.mockImplementationOnce(async (work: unknown) => {
      if (typeof work !== 'function')
        throw new Error('Expected transaction callback');
      return work(prisma);
    });
    const summary = {
      salaryDivisorDays: 30,
      earnedPayableDays: 30,
      presentDays: 30,
      paidLeaveDays: 0,
      unpaidDays: 0,
      holidayDays: 0,
    };
    const attendance = jest
      .spyOn(
        service as unknown as {
          attendanceSummary: () => Promise<typeof summary>;
        },
        'attendanceSummary',
      )
      .mockResolvedValue(summary);
    try {
      await expect(
        run(() => service.runPayroll({ year: 2026, month: 10 }, actor)),
      ).rejects.toBe(stop);
      expect(prisma.payrollRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'tenant-a',
            employeeId: 'self',
            year: 2026,
            month: 10,
          }),
        }),
      );
      for (const model of [
        prisma.bookingIncentive,
        prisma.bookingExtraIncentive,
      ]) {
        expect(model.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              booking: expect.objectContaining({
                lead: { organizationId: 'tenant-a' },
              }),
            }),
          }),
        );
      }
    } finally {
      attendance.mockRestore();
    }
  });
});
