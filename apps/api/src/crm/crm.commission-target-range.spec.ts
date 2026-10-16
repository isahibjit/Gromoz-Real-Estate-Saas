import { Test } from '@nestjs/testing';
import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('My Commissions justification target ranges', () => {
  const actor = { sub: 'employee', role: 'TELECALLER' };
  const db = {
    employeeProfile: { findUnique: jest.fn() },
    team: { findMany: jest.fn() },
    incentiveVisibilitySetting: { findUnique: jest.fn() },
    booking: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    lead: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const visibility = { resolveAssignmentScopeUserIds: jest.fn() };
  let service: CrmService;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 15, 12));
    jest.resetAllMocks();
    db.employeeProfile.findUnique.mockResolvedValue({ teamId: null });
    db.team.findMany.mockResolvedValue([]);
    db.incentiveVisibilitySetting.findUnique.mockResolvedValue(null);
    db.booking.findMany.mockResolvedValue([]);
    db.user.findMany.mockResolvedValue([]);
    db.lead.findMany.mockResolvedValue([]);
    db.$queryRaw.mockResolvedValue([
      {
        userId: actor.sub,
        monthlyBasic: 40000,
        justificationMultiplier: 2,
        justificationMode: 'MULTIPLIER',
        justificationAmount: 0,
      },
    ]);
    visibility.resolveAssignmentScopeUserIds.mockResolvedValue([actor.sub]);
    const module = await Test.createTestingModule({
      providers: [
        ...referenceTenantProviders(),
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: visibility },
      ],
    }).compile();
    service = module.get(CrmService);
  });

  afterEach(() => jest.useRealTimers());

  it.each([
    ['this_month', 80000],
    ['quarterly', 240000],
    ['half_yearly', 480000],
    ['yearly', 960000],
  ])(
    '%s uses the full named period for multiplier targets',
    async (preset, expected) => {
      const result = await service.getMyCommissions({ preset }, actor);
      expect(result.summary.justificationTarget).toBe(expected);
      expect(result.summary.commissionInJustification).toBe(expected);
      expect(result.target).toEqual({
        targetValue: expected,
        achievedTarget: 0,
        pendingTarget: expected,
      });
    },
  );

  it('scales manual monthly targets by the same period budget', async () => {
    db.$queryRaw.mockResolvedValue([
      {
        userId: actor.sub,
        monthlyBasic: 40000,
        justificationMultiplier: 2,
        justificationMode: 'MANUAL',
        justificationAmount: 25000,
      },
    ]);
    const result = await service.getMyCommissions(
      { preset: 'half_yearly' },
      actor,
    );
    expect(result.summary.justificationTarget).toBe(150000);
  });

  it.each([
    ['2026-10-10', '2026-10-15', 80000],
    ['2026-09-30', '2026-10-01', 160000],
    ['2025-12-15', '2026-02-10', 240000],
  ])(
    'preserves calendar-month custom ranges %s through %s',
    async (dateFrom, dateTo, expected) => {
      const result = await service.getMyCommissions(
        { preset: 'custom', dateFrom, dateTo },
        actor,
      );
      expect(result.summary.justificationTarget).toBe(expected);
    },
  );

  it('keeps a quarter target stable across the quarter rather than increasing every month', async () => {
    for (const month of [9, 10, 11]) {
      jest.setSystemTime(new Date(2026, month, 15, 12));
      const result = await service.getMyCommissions(
        { preset: 'quarterly' },
        actor,
      );
      expect(result.summary.justificationTarget).toBe(240000);
    }
  });

  it('updates dependent progress and commissionable brokerage without changing stored incentives', async () => {
    db.booking.findMany.mockResolvedValue([
      {
        id: 'booking',
        bookingDate: new Date(2026, 9, 10),
        netBrokerageAmount: 500000,
        lead: { telecallerId: actor.sub },
        incentives: [
          {
            id: 'incentive',
            recipientUserId: actor.sub,
            roleType: 'PRE_SALES',
            percentage: 1,
            amount: 1500,
            paymentStatus: 'Paid',
          },
        ],
      },
    ]);
    const result = await service.getMyCommissions(
      { preset: 'half_yearly' },
      actor,
    );
    expect(result.summary).toMatchObject({
      achievedBrokerage: 500000,
      justificationTarget: 480000,
      commissionableBrokerage: 20000,
      paidCommission: 1500,
    });
    expect(result.target.pendingTarget).toBe(0);
    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'Booked',
          bookingDate: {
            gte: new Date(2026, 6, 1),
            lte: new Date(2026, 9, 15, 23, 59, 59, 999),
          },
        }),
      }),
    );
  });

  it('uses the same period budget in team member rows and team totals', async () => {
    const manager = { sub: actor.sub, role: 'TEAM_LEADER' };
    visibility.resolveAssignmentScopeUserIds.mockResolvedValue([
      actor.sub,
      'member',
    ]);
    db.$queryRaw.mockResolvedValue([
      {
        userId: actor.sub,
        justificationMode: 'MANUAL',
        justificationAmount: 25000,
      },
      {
        userId: 'member',
        justificationMode: 'MULTIPLIER',
        monthlyBasic: 40000,
        justificationMultiplier: 2,
      },
    ]);
    db.user.findMany.mockResolvedValue([
      { id: actor.sub, fullName: 'Leader' },
      { id: 'member', fullName: 'Member' },
    ]);
    const result = await service.getMyCommissions(
      { preset: 'quarterly', scope: 'team' },
      manager,
    );
    expect(result.summary.justificationTarget).toBe(315000);
    expect(result.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: actor.sub,
          justificationTarget: 75000,
        }),
        expect.objectContaining({
          userId: 'member',
          justificationTarget: 240000,
        }),
      ]),
    );
  });
});
