import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import type { PrismaService } from '../persistence/prisma/prisma.service';
import type { RealtimeService } from '../realtime/realtime.service';
import { BookingsController } from './crm.controllers';
import { CrmService } from './crm.service';
import type { LeadVisibilityService } from './lead-visibility.service';

describe('Booking finance authorization', () => {
  const actor = { sub: 'team-leader', role: 'TEAM_LEADER' };
  const scopedUserIds = ['team-leader', 'team-member'];

  it('allows management roles to access the finance report and PDF routes', () => {
    const reportRoles = Reflect.getMetadata(
      'roles',
      BookingsController.prototype.financeReport,
    ) as string[];
    const pdfRoles = Reflect.getMetadata(
      'roles',
      BookingsController.prototype.financeReportPdf,
    ) as string[];

    expect(reportRoles).toEqual(
      expect.arrayContaining(['TEAM_LEADER', 'MANAGER']),
    );
    expect(pdfRoles).toEqual(
      expect.arrayContaining(['TEAM_LEADER', 'MANAGER']),
    );
  });

  it('limits Team Leader finance totals to permitted booking users and recipients', async () => {
    const booking = {
      id: 'booking-1',
      leadId: 'lead-1',
      projectId: 'project-1',
      status: 'Booked',
      bookingDate: new Date('2026-10-01T00:00:00.000Z'),
      closedById: 'team-member',
      agreementValue: 1_000_000,
      bookingAmount: 1_000_000,
      netBrokerageAmount: 250_000,
      customerNameSnapshot: 'Scoped customer',
      projectNameSnapshot: 'Scoped project',
      lead: {
        id: 'lead-1',
        name: 'Scoped customer',
        ownerId: 'team-member',
        managerId: null,
        telecallerId: null,
        fieldExecutiveId: 'team-member',
      },
      project: { id: 'project-1', name: 'Scoped project' },
      unit: null,
      incentives: [
        {
          id: 'sales-incentive',
          roleType: 'SALES',
          recipientUserId: 'team-member',
          amount: 100,
          extraAmount: 0,
          percentage: 1,
          recipient: { fullName: 'Team member' },
        },
        {
          id: 'leader-incentive',
          roleType: 'TEAM_LEADER',
          recipientUserId: 'team-leader',
          amount: 50,
          extraAmount: 0,
          percentage: 0.5,
          recipient: { fullName: 'Team leader' },
        },
        {
          id: 'outside-incentive',
          roleType: 'PRE_SALES',
          recipientUserId: 'outside-user',
          amount: 900,
          extraAmount: 0,
          percentage: 1,
          recipient: { fullName: 'Outside user' },
        },
      ],
      extraIncentives: [],
      payments: [
        {
          id: 'brokerage-payment',
          kind: 'BROKERAGE',
          amount: 200,
          status: 'Received',
        },
        {
          id: 'visible-incentive-payment',
          kind: 'INCENTIVE',
          recipientUserId: 'team-member',
          amount: 20,
          status: 'Paid',
        },
        {
          id: 'outside-incentive-payment',
          kind: 'INCENTIVE',
          recipientUserId: 'outside-user',
          amount: 800,
          status: 'Paid',
        },
      ],
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    };
    const db = {
      booking: { findMany: jest.fn().mockResolvedValue([booking]) },
      employeeProfile: {
        findUnique: jest.fn().mockResolvedValue({ teamId: 'team-1' }),
        findMany: jest.fn().mockResolvedValue([{ userId: 'team-member' }]),
      },
      incentiveVisibilitySetting: {
        findUnique: jest.fn().mockResolvedValue({
          visibilityScope: 'OWN_AND_TEAM',
          canEdit: false,
        }),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([{ id: 'team-1' }]),
      },
    };
    const visibility = {
      resolveAssignmentScopeUserIds: jest.fn().mockResolvedValue(scopedUserIds),
    };
    const service = new CrmService(
      db as unknown as PrismaService,
      {} as RealtimeService,
      visibility as unknown as LeadVisibilityService,
      referenceTenantProviders()[0].useValue as never,
      referenceTenantProviders()[1].useValue as never,
      referenceTenantProviders()[2].useValue as never,
      referenceTenantProviders()[3].useValue as never,
    );

    const report = await service.getBookingFinanceReport(
      { preset: 'yearly' },
      actor,
    );

    expect(db.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { closedById: { in: scopedUserIds } },
                {
                  lead: {
                    is: {
                      OR: [
                        { ownerId: { in: scopedUserIds } },
                        { managerId: { in: scopedUserIds } },
                        { telecallerId: { in: scopedUserIds } },
                        { fieldExecutiveId: { in: scopedUserIds } },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        }),
      }),
    );
    expect(report.summary).toEqual(
      expect.objectContaining({
        bookings: 1,
        totalBrokerage: 250_000,
        salesIncentive: 100,
        preSalesIncentive: 0,
        teamLeaderIncentive: 50,
        totalCommission: 150,
        paidCommission: 20,
      }),
    );
  });
});
