import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../persistence/prisma/prisma.service';
import type { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import type { LeadVisibilityService } from './lead-visibility.service';

describe('CRM assignment-scope authorization', () => {
  const actor = { sub: 'manager', role: 'MANAGER' };
  const scopedUserIds = ['manager', 'assigned-user'];
  const assignmentScope = {
    OR: [
      { ownerId: { in: scopedUserIds } },
      { managerId: { in: scopedUserIds } },
      { telecallerId: { in: scopedUserIds } },
      { fieldExecutiveId: { in: scopedUserIds } },
    ],
  };
  const db = {
    booking: { findUnique: jest.fn() },
    contactLead: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    followUp: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
    },
    lead: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    leadMasterValue: { findMany: jest.fn().mockResolvedValue([]) },
    project: { findMany: jest.fn().mockResolvedValue([]) },
    siteVisit: { findFirst: jest.fn() },
    user: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const visibility = {
    resolveAssignmentScopeUserIds: jest.fn().mockResolvedValue(scopedUserIds),
    assignmentScope: jest.fn().mockReturnValue(assignmentScope),
  };
  let service: CrmService;

  beforeEach(() => {
    jest.clearAllMocks();
    db.lead.findMany.mockResolvedValue([]);
    db.project.findMany.mockResolvedValue([]);
    db.user.findMany.mockResolvedValue([]);
    visibility.resolveAssignmentScopeUserIds.mockResolvedValue(scopedUserIds);
    visibility.assignmentScope.mockReturnValue(assignmentScope);
    service = new CrmService(
      db as unknown as PrismaService,
      {} as RealtimeService,
      visibility as unknown as LeadVisibilityService,
      referenceTenantProviders()[0].useValue as never,
      referenceTenantProviders()[1].useValue as never,
      referenceTenantProviders()[2].useValue as never,
      referenceTenantProviders()[3].useValue as never,
    );
  });

  it('hides a direct site-visit lookup outside the manager scope', async () => {
    db.siteVisit.findFirst.mockResolvedValue(null);

    await expect(
      service.getSiteVisit('outside-visit', actor),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(db.siteVisit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { assignedExecutiveId: { in: scopedUserIds } },
                { lead: { is: assignmentScope } },
              ],
            },
          ],
        }),
      }),
    );
  });

  it('returns no booking detail when none of its users are in scope', async () => {
    db.booking.findUnique.mockResolvedValue({
      id: 'outside-booking',
      closedById: 'outside-user',
      lead: {
        ownerId: 'outside-user',
        managerId: null,
        telecallerId: null,
        fieldExecutiveId: null,
      },
    });

    await expect(
      service.getBookingDetails('outside-booking', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks a contact-lead mutation outside the manager scope', async () => {
    db.contactLead.findFirst.mockResolvedValue(null);

    await expect(
      service.updateContactLead('outside-contact', { note: 'Changed' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.contactLead.update).not.toHaveBeenCalled();
  });

  it('blocks assigning a newly created lead to an out-of-scope user', async () => {
    await expect(
      service.createLead(
        {
          name: 'Scoped client',
          mobile: '9000000000',
          telecallerId: 'outside-user',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.lead.create).not.toHaveBeenCalled();
  });

  it('scopes site-visit lead and executive options', async () => {
    await service.getSiteVisitOptions({}, actor);

    expect(db.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          AND: [assignmentScope],
        },
      }),
    );
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: scopedUserIds } }),
      }),
    );
  });

  it('widens the executive role set to the manager hierarchy for scoped viewers', async () => {
    await service.getSiteVisitOptions({}, actor);

    const executiveCall = db.user.findMany.mock.calls.find(
      ([args]) => args?.where?.id?.in && Array.isArray(args.where.role?.in),
    );
    expect(executiveCall).toBeDefined();
    expect(executiveCall?.[0].where.role.in).toEqual(
      expect.arrayContaining([
        'SALES_AGENT',
        'SALES_MANAGER',
        'TELECALLER',
        'TEAM_LEADER',
        'MANAGER',
      ]),
    );
  });

  it('scopes the manager follow-up queue to assigned users and their leads', async () => {
    await service.listFollowUps({}, actor);

    expect(db.followUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          assignedToId: { in: scopedUserIds },
          lead: expect.objectContaining({ AND: [assignmentScope] }),
        }),
      }),
    );
  });
});
