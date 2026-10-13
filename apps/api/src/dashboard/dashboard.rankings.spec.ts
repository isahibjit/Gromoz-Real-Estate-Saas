import { DashboardService } from './dashboard.service';

describe('Dashboard rankings', () => {
  const tenantEmployeeScope = {
    role: { not: 'SUPER_ADMIN' },
    organizationMemberships: {
      some: { organizationId: 'tenant-a' },
      none: { organizationId: { not: 'tenant-a' } },
    },
  };
  const tenantAccess = {
    organizationId: 'tenant-a',
    employeeWhere: jest.fn(() => tenantEmployeeScope),
    assertEmployee: jest.fn(),
  };
  const misbah = {
    id: 'misbah-user',
    fullName: 'Misbah Test',
    email: 'misbah@example.com',
    role: 'SALES_AGENT',
    isActive: true,
    avatarStorageKey: null,
    employeeProfile: {
      designation: 'Sales Executive',
      teamId: 'team-c',
      team: {
        id: 'team-c',
        name: 'Mira Road Team C',
        leaderId: null,
        leader: null,
      },
    },
  };

  const interestedStatus = {
    id: 'interested-status',
    name: 'Interested',
    code: 'INTERESTED',
    manualScore: 1,
  };

  it('keeps a spectating platform admin inside the selected tenant ranking', async () => {
    const trackedActivity = {
      id: 'tracked-status-change',
      leadId: 'lead-1',
      actorId: 'admin-user',
      type: 'LEAD_CREATED',
      title: 'Lead created',
      description: 'Lead was created with Interested status',
      occurredAt: new Date('2026-09-05T08:00:00.000Z'),
      metadata: {
        fields: ['status'],
        statusId: interestedStatus.id,
        statusName: interestedStatus.name,
        statusScoreEarned: 1,
        sourcePointsEnabled: true,
        statusScoreRecipients: [
          { userId: misbah.id, roleType: 'SALES', points: 1 },
        ],
      },
      lead: {
        id: 'lead-1',
        statusId: interestedStatus.id,
        telecallerId: null,
        fieldExecutiveId: misbah.id,
        ownerId: misbah.id,
      },
    };
    const leadCandidates = Array.from({ length: 4 }, (_, index) => ({
      id: `lead-${index + 1}`,
      statusId: interestedStatus.id,
      sourceId: 'source-enabled',
      ownerId: misbah.id,
      telecallerId: null,
      fieldExecutiveId: misbah.id,
      createdById: 'admin-user',
      createdAt: new Date(`2026-09-0${index + 2}T08:00:00.000Z`),
      activities:
        index === 0
          ? [{ type: 'LEAD_CREATED', metadata: trackedActivity.metadata }]
          : [{ type: 'LEAD_CREATED', metadata: null }],
    }));
    const db = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([misbah]),
      },
      leadMasterValue: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          where.categoryRef.code === 'status'
            ? Promise.resolve([interestedStatus])
            : Promise.resolve([
                {
                  id: 'source-enabled',
                  name: 'Website',
                  code: 'WEBSITE',
                  pointsEnabled: true,
                },
              ]),
        ),
      },
      activity: {
        findMany: jest.fn().mockResolvedValue([trackedActivity]),
      },
      lead: {
        findMany: jest.fn().mockResolvedValue(leadCandidates),
      },
      team: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'team-c', name: 'Mira Road Team C', leaderId: null },
          ]),
      },
    };
    const service = new DashboardService(db as never, tenantAccess as never, { resolveAssignmentScopeUserIds: async () => null } as never);

    const result = await service.getDashboardRankings(
      {
        range: 'custom',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        mode: 'users',
      },
      { sub: 'platform-admin', role: 'SUPER_ADMIN' },
    );

    expect(result.userRankings).toHaveLength(1);
    expect(result.userRankings[0]).toMatchObject({
      userId: misbah.id,
      points: 4,
      statusBreakdown: [
        {
          statusId: interestedStatus.id,
          statusName: interestedStatus.name,
          points: 4,
          count: 4,
        },
      ],
    });
    expect(result.userRankings).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: 'SUPER_ADMIN' }),
      ]),
    );
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([tenantEmployeeScope]),
        }),
      }),
    );
    expect(db.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { lead: { organizationId: 'tenant-a' } },
          ]),
        }),
      }),
    );
    expect(db.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ organizationId: 'tenant-a' }]),
        }),
      }),
    );
  });

  it('recovers interested points when unrelated or zero-point history exists', async () => {
    const newLeadStatus = {
      id: 'new-lead-status',
      name: 'New Lead',
      code: 'NEW_LEAD',
      manualScore: 0,
    };
    const trackedInterestedActivity = {
      id: 'tracked-interested',
      leadId: 'lead-1',
      actorId: 'admin-user',
      type: 'LEAD_UPDATED',
      title: 'Lead details updated',
      description: 'Updated status.',
      occurredAt: new Date('2026-09-05T08:00:00.000Z'),
      metadata: {
        fields: ['status'],
        statusId: interestedStatus.id,
        statusName: interestedStatus.name,
        statusScoreEarned: 1,
        sourcePointsEnabled: true,
        statusScoreRecipients: [
          { userId: misbah.id, roleType: 'SALES', points: 1 },
        ],
      },
      lead: {
        id: 'lead-1',
        statusId: interestedStatus.id,
        telecallerId: null,
        fieldExecutiveId: misbah.id,
        ownerId: misbah.id,
      },
    };
    const zeroPointInterestedActivity = {
      id: 'zero-point-interested',
      leadId: 'lead-4',
      actorId: 'admin-user',
      type: 'LEAD_UPDATED',
      title: 'Lead details updated',
      description: 'Updated status.',
      occurredAt: new Date('2026-09-08T08:00:00.000Z'),
      metadata: {
        fields: ['status'],
        statusId: interestedStatus.id,
        statusName: interestedStatus.name,
        statusScoreEarned: 0,
        sourcePointsEnabled: true,
        statusScoreRecipients: [],
      },
      lead: {
        id: 'lead-4',
        statusId: interestedStatus.id,
        telecallerId: null,
        fieldExecutiveId: misbah.id,
        ownerId: misbah.id,
      },
    };
    const leadCandidates = [
      {
        id: 'lead-1',
        activities: [
          {
            type: trackedInterestedActivity.type,
            metadata: trackedInterestedActivity.metadata,
          },
        ],
      },
      { id: 'lead-2', activities: [] },
      {
        id: 'lead-3',
        activities: [
          {
            type: 'LEAD_CREATED',
            metadata: {
              fields: ['status'],
              statusId: newLeadStatus.id,
              statusName: newLeadStatus.name,
              statusScoreEarned: 0,
              sourcePointsEnabled: true,
            },
          },
        ],
      },
      {
        id: 'lead-4',
        activities: [
          {
            type: zeroPointInterestedActivity.type,
            metadata: zeroPointInterestedActivity.metadata,
          },
        ],
      },
    ].map((lead, index) => ({
      ...lead,
      statusId: interestedStatus.id,
      sourceId: 'source-enabled',
      ownerId: misbah.id,
      telecallerId: null,
      fieldExecutiveId: misbah.id,
      createdById: 'admin-user',
      createdAt: new Date(`2026-09-0${index + 2}T08:00:00.000Z`),
    }));
    const db = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'admin-user',
          role: 'ADMIN',
          employeeProfile: null,
          rankingTeamAccesses: [],
        }),
        findMany: jest.fn().mockResolvedValue([misbah]),
      },
      leadMasterValue: {
        findMany: jest.fn().mockImplementation(({ where }) =>
          where.categoryRef.code === 'status'
            ? Promise.resolve([interestedStatus, newLeadStatus])
            : Promise.resolve([
                {
                  id: 'source-enabled',
                  name: 'Website',
                  code: 'WEBSITE',
                  pointsEnabled: true,
                },
              ]),
        ),
      },
      activity: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            trackedInterestedActivity,
            zeroPointInterestedActivity,
          ]),
      },
      lead: {
        findMany: jest.fn().mockResolvedValue(leadCandidates),
      },
      team: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'team-c', name: 'Mira Road Team C', leaderId: null },
          ]),
      },
    };
    const service = new DashboardService(db as never, tenantAccess as never, { resolveAssignmentScopeUserIds: async () => null } as never);

    const result = await service.getDashboardRankings(
      {
        range: 'custom',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
        mode: 'users',
      },
      { sub: 'admin-user', role: 'ADMIN' },
    );

    expect(result.userRankings[0]).toMatchObject({
      userId: misbah.id,
      points: 4,
      statusBreakdown: [
        {
          statusId: interestedStatus.id,
          statusName: interestedStatus.name,
          points: 4,
          count: 4,
        },
      ],
    });
  });
});
