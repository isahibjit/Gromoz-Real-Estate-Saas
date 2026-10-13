import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';

describe('Lead assignment filters and follow-up timestamps', () => {
  let service: CrmService;
  let visibility: LeadVisibilityService;
  const db = {
    lead: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
      findUnique: jest.fn().mockResolvedValue({ statusId: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    leadListColumnPreference: { findUnique: jest.fn().mockResolvedValue(null) },
    leadMasterValue: { findMany: jest.fn().mockResolvedValue([]) },
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    project: { findMany: jest.fn().mockResolvedValue([]) },
    employeeProfile: { findMany: jest.fn().mockResolvedValue([]) },
    team: { findMany: jest.fn().mockResolvedValue([]) },
    teamLeaderVisibilityGrant: { findMany: jest.fn().mockResolvedValue([]) },
    leadVisibilityOverride: { findMany: jest.fn().mockResolvedValue([]) },
    followUp: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'follow-up',
        ...data,
      })),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn(
        async ({ data }: { data: Prisma.FollowUpUncheckedCreateInput }) => ({
          id: 'follow-up',
          ...data,
        }),
      ),
    },
    note: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    activity: { create: jest.fn().mockResolvedValue({}) },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    db.leadVisibilityOverride.findMany.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        LeadVisibilityService,
        { provide: PrismaService, useValue: db },
        { provide: AccessService, useValue: {} },
        { provide: RealtimeService, useValue: {} },
        { provide: TenantAccessService, useValue: {} },
        {
          provide: TenantContextService,
          useValue: { getTenantId: () => undefined },
        },
        {
          provide: TenantNotificationService,
          useValue: { isChannelEnabled: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: WhatsAppDispatchService,
          useValue: { enqueueWithClient: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(CrmService);
    visibility = module.get(LeadVisibilityService);
  });

  it('matches the selected employee in any current assignment, including shared leads', async () => {
    await service.listLeads(
      { ownerId: 'sales-exec', search: 'client' },
      { role: 'ADMIN', sub: 'admin' },
    );
    const assignment = {
      OR: [
        { ownerId: { in: ['sales-exec'] } },
        { managerId: { in: ['sales-exec'] } },
        { telecallerId: { in: ['sales-exec'] } },
        { fieldExecutiveId: { in: ['sales-exec'] } },
      ],
    };
    expect(db.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([assignment]),
          deletedAt: null,
        }),
      }),
    );
    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('ownerId');
    expect(db.lead.count).toHaveBeenCalledWith({ where });
    expect(
      visibility.assignmentScope(['sales-exec'], { includeSiteVisits: false }),
    ).toEqual(assignment);
  });

  it('supports multiple selected employees without removing other filters', async () => {
    await service.listLeads(
      {
        ownerId: ['presales', 'sales-exec'],
        statusId: 'hot',
        projectId: 'project',
      },
      { role: 'ADMIN' },
    );
    expect(db.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          statusId: { in: ['hot'] },
          AND: expect.arrayContaining([
            visibility.assignmentScope(['presales', 'sales-exec'], {
              includeSiteVisits: false,
            }),
            {
              OR: expect.arrayContaining([
                {
                  requirement: {
                    is: { preferredProjectId: { in: ['project'] } },
                  },
                },
              ]),
            },
          ]),
        }),
      }),
    );
  });

  it('does not apply assignment scoping for admins', async () => {
    await service.listLeads({}, { role: 'ADMIN', sub: 'admin' });
    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where).toEqual({ deletedAt: null });
  });

  it.each([
    ['site-visit', [
      { code: { equals: 'SITE_VISIT_SCHEDULE', mode: 'insensitive' } },
      { name: { equals: 'Site Visit Schedule', mode: 'insensitive' } },
      { name: { equals: 'Site Visit Scheduled', mode: 'insensitive' } },
    ]],
    ['site-visit-completed', [
      { code: { equals: 'SITE_VISIT_DONE', mode: 'insensitive' } },
      { code: { equals: 'SITE_VISIT_COMPLETED', mode: 'insensitive' } },
      { name: { equals: 'Site Visit Done', mode: 'insensitive' } },
      { name: { equals: 'Site Visit Completed', mode: 'insensitive' } },
    ]],
    ['revisit-completed', [
      { code: { equals: 'RE_VISIT_DONE', mode: 'insensitive' } },
      { code: { equals: 'REVISIT_DONE', mode: 'insensitive' } },
      { name: { equals: 'Re-Visit Done', mode: 'insensitive' } },
      { name: { equals: 'Revisit Done', mode: 'insensitive' } },
    ]],
  ])('uses only exact master statuses for the %s segment', async (segment, expectedOr) => {
    db.leadMasterValue.findMany.mockResolvedValueOnce([{ id: `${segment}-id` }]);
    await service.listLeads({ segment }, { role: 'ADMIN' });
    expect(db.leadMasterValue.findMany).toHaveBeenCalledWith({
      where: {
        categoryRef: { code: { equals: 'status', mode: 'insensitive' } },
        isActive: true,
        OR: expectedOr,
      },
      select: { id: true },
    });
    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where.AND).toContainEqual({ statusId: { in: [`${segment}-id`] } });
    expect(JSON.stringify(where.AND)).not.toContain('siteVisits');
    expect(JSON.stringify(where.AND)).not.toContain('stageId');
  });

  it.each(['TELECALLER', 'SALES_AGENT', 'MARKETING'])(
    'preserves %s visibility when filtering another employee',
    async (role) => {
      await service.listLeads(
        { ownerId: 'other-employee' },
        { role, sub: 'viewer' },
      );
      const where = db.lead.findMany.mock.calls[0][0].where;
      expect(where.AND).toHaveLength(2);
      expect(where.AND[1]).toEqual(visibility.assignmentScope(['viewer']));
    },
  );

  it('allows a staff user to see another employee through lead visibility overrides', async () => {
    db.leadVisibilityOverride.findMany.mockResolvedValueOnce([
      { targetUserId: 'peer-presales', accessType: 'ALLOW' },
    ]);

    await service.listLeads({}, { role: 'TELECALLER', sub: 'viewer' });

    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      visibility.assignmentScope(['viewer', 'peer-presales']),
    ]);
  });

  it('expands manager visibility through direct reportees and their team members', async () => {
    db.employeeProfile.findMany.mockResolvedValueOnce([
      { userId: 'team-leader', user: { role: 'TEAM_LEADER' } },
      { userId: 'direct-report', user: { role: 'TELECALLER' } },
    ]);
    db.team.findMany.mockResolvedValueOnce([
      {
        members: [{ userId: 'employee-1' }, { userId: 'employee-2' }],
      },
    ]);

    await service.listLeads({}, { role: 'MANAGER', sub: 'manager' });

    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      visibility.assignmentScope([
        'manager',
        'team-leader',
        'direct-report',
        'employee-1',
        'employee-2',
      ]),
    ]);
  });

  it('removes blocked employees from manager hierarchy visibility', async () => {
    db.employeeProfile.findMany.mockResolvedValueOnce([
      { userId: 'team-leader', user: { role: 'TEAM_LEADER' } },
      { userId: 'restricted-presales', user: { role: 'TELECALLER' } },
    ]);
    db.team.findMany.mockResolvedValueOnce([
      {
        members: [{ userId: 'employee-1' }, { userId: 'employee-2' }],
      },
    ]);
    db.leadVisibilityOverride.findMany.mockResolvedValueOnce([
      { targetUserId: 'restricted-presales', accessType: 'BLOCK' },
    ]);

    await service.listLeads({}, { role: 'MANAGER', sub: 'manager' });

    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      visibility.assignmentScope([
        'manager',
        'team-leader',
        'employee-1',
        'employee-2',
      ]),
    ]);
  });

  it('applies manager visibility to direct lead lookups', async () => {
    db.employeeProfile.findMany.mockResolvedValueOnce([
      { userId: 'assigned-user', user: { role: 'TELECALLER' } },
    ]);

    await expect(
      service.getLead('outside-lead', {
        role: 'MANAGER',
        sub: 'manager',
      }),
    ).rejects.toThrow('Lead not found');

    expect(db.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ id: 'outside-lead' }, { displayId: 'outside-lead' }],
          AND: [visibility.assignmentScope(['manager', 'assigned-user'])],
        }),
      }),
    );
  });

  it('expands team leader visibility through led teams and monitor grants', async () => {
    db.team.findMany.mockResolvedValueOnce([
      { members: [{ userId: 'employee-1' }] },
    ]);
    db.teamLeaderVisibilityGrant.findMany.mockResolvedValueOnce([
      {
        userId: 'monitored-user',
        team: { members: [{ userId: 'monitored-team-user' }] },
      },
    ]);

    await service.listLeads({}, { role: 'TEAM_LEADER', sub: 'leader' });

    const where = db.lead.findMany.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      visibility.assignmentScope([
        'leader',
        'employee-1',
        'monitored-user',
        'monitored-team-user',
      ]),
    ]);
  });

  it('keeps existing visit-based visibility scopes by default', () => {
    expect(visibility.assignmentScope(['viewer']).OR).toContainEqual({
      siteVisits: { some: { assignedExecutiveId: { in: ['viewer'] } } },
    });
    expect(visibility.assignmentScope([])).toEqual({ id: { in: [] } });
  });

  it.each([
    ['2026-09-10T09:15:00+05:30', '2026-09-10T03:45:00.000Z'],
    ['2026-09-10T11:35:00+05:30', '2026-09-10T06:05:00.000Z'],
    ['2026-09-10T00:00:00+05:30', '2026-09-09T18:30:00.000Z'],
    ['2026-09-10T15:17:00.000Z', '2026-09-10T15:17:00.000Z'],
  ])(
    'stores the same instant for the follow-up and table field: %s',
    async (scheduledAt, expected) => {
      jest
        .spyOn(service, 'getLead')
        .mockResolvedValue({ id: 'lead', name: 'Client' });
      const result = await service.createFollowUp('lead', { scheduledAt });
      expect(result.scheduledAt.toISOString()).toBe(expected);
      expect(db.followUp.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ scheduledAt: new Date(expected) }),
      });
      expect(db.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead' },
        data: { nextFollowUpAt: new Date(expected) },
      });
    },
  );

  it('overwrites an existing active follow-up instead of creating a duplicate row', async () => {
    jest
      .spyOn(service, 'getLead')
      .mockResolvedValue({ id: 'lead', name: 'Client' });
    db.followUp.findMany.mockResolvedValueOnce([
      {
        id: 'existing-fu-1',
        notes: 'Old note',
        slaDueAt: null,
        setReminder: true,
      },
    ]);

    await service.createFollowUp('lead', {
      scheduledAt: '2026-09-15T10:00:00+05:30',
      notes: 'Updated remark',
    });

    expect(db.followUp.update).toHaveBeenCalledWith({
      where: { id: 'existing-fu-1' },
      data: expect.objectContaining({
        scheduledAt: new Date('2026-09-15T04:30:00.000Z'),
        notes: 'Updated remark',
      }),
    });
    expect(db.followUp.create).not.toHaveBeenCalled();
  });
});
