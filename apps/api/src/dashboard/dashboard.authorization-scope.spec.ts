import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import type { PrismaService } from '../persistence/prisma/prisma.service';
import type { LeadVisibilityService } from '../crm/lead-visibility.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('Dashboard authorization scope', () => {
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

  const emptyResult = jest.fn().mockResolvedValue([]);
  const zeroResult = jest.fn().mockResolvedValue(0);
  const db = {
    lead: {
      count: zeroResult,
      groupBy: emptyResult,
      findMany: emptyResult,
    },
    followUp: { count: zeroResult, findMany: emptyResult },
    siteVisit: { count: zeroResult, findMany: emptyResult },
    booking: { count: zeroResult, findMany: emptyResult },
    notification: { findMany: emptyResult },
    team: { findMany: emptyResult },
    user: { findMany: emptyResult },
    project: { findMany: emptyResult },
    leadMasterValue: { findMany: emptyResult },
    activity: { findMany: emptyResult },
  };
  const visibility = {
    resolveAssignmentScopeUserIds: jest.fn().mockResolvedValue(scopedUserIds),
    assignmentScope: jest.fn().mockReturnValue(assignmentScope),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    zeroResult.mockResolvedValue(0);
    emptyResult.mockResolvedValue([]);
    visibility.resolveAssignmentScopeUserIds.mockResolvedValue(scopedUserIds);
    visibility.assignmentScope.mockReturnValue(assignmentScope);
  });

  it('allows manager and team-leader roles on the permission-protected dashboard route', () => {
    const roles = Reflect.getMetadata(
      'roles',
      DashboardController.prototype.getAdminDashboard,
    ) as string[];
    const rankingRoles = Reflect.getMetadata(
      'roles',
      DashboardController.prototype.getRankings,
    ) as string[];
    const leadPerformanceRoles = Reflect.getMetadata(
      'roles',
      DashboardController.prototype.getAdminLeadPerformance,
    ) as string[];
    const employeePerformanceRoles = Reflect.getMetadata(
      'roles',
      DashboardController.prototype.getAdminPerformance,
    ) as string[];

    expect(roles).toEqual(
      expect.arrayContaining(['MANAGER', 'TEAM_LEADER', 'BACKEND']),
    );
    expect(rankingRoles).toEqual(
      expect.arrayContaining(['MANAGER', 'TEAM_LEADER', 'BACKEND']),
    );
    expect(leadPerformanceRoles).toEqual(
      expect.arrayContaining(['MANAGER', 'TEAM_LEADER']),
    );
    expect(employeePerformanceRoles).toEqual(
      expect.arrayContaining(['MANAGER', 'TEAM_LEADER']),
    );
  });

  it('scopes dashboard lead data and related records to configured users', async () => {
    const service = new DashboardService(
      db as unknown as PrismaService,
      referenceTenantProviders()[0].useValue as never,
      visibility as unknown as LeadVisibilityService,
    );

    await service.getAdminDashboardData({ range: 'today' }, actor);

    expect(visibility.resolveAssignmentScopeUserIds).toHaveBeenCalledWith(
      actor,
    );
    expect(db.lead.count).toHaveBeenCalledWith({
      where: {
        AND: [{ organizationId: 'tenant-a' }, { AND: [assignmentScope, {}] }],
      },
    });
    expect(db.followUp.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ lead: { is: assignmentScope } }]),
        }),
      }),
    );
    expect(db.siteVisit.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ lead: { is: assignmentScope } }]),
        }),
      }),
    );
    expect(db.booking.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ lead: { is: assignmentScope } }]),
        }),
      }),
    );
    expect(db.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([{ userId: actor.sub }]),
        }),
      }),
    );
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ id: { in: scopedUserIds } }),
          ]),
        }),
      }),
    );
  });

  it('scopes lead-performance data and its filters to the manager hierarchy', async () => {
    db.user.findMany.mockResolvedValueOnce([
      {
        id: 'manager',
        fullName: 'Manager',
        email: 'manager@example.com',
        role: 'MANAGER',
        avatarStorageKey: null,
        employeeProfile: null,
      },
      {
        id: 'assigned-user',
        fullName: 'Assigned user',
        email: 'assigned@example.com',
        role: 'TELECALLER',
        avatarStorageKey: null,
        employeeProfile: null,
      },
    ]);
    const service = new DashboardService(
      db as unknown as PrismaService,
      referenceTenantProviders()[0].useValue as never,
      visibility as unknown as LeadVisibilityService,
    );

    await service.getAdminLeadPerformanceData(
      { preset: 'this_month', scope: 'user' },
      actor,
    );

    expect(visibility.resolveAssignmentScopeUserIds).toHaveBeenCalledWith(
      actor,
    );
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ id: { in: scopedUserIds } }),
          ]),
        }),
      }),
    );
    expect(db.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            { organizationId: 'tenant-a' },
            expect.objectContaining({
              organizationId: 'tenant-a',
              AND: expect.arrayContaining([
                expect.objectContaining({
                  OR: expect.arrayContaining([
                    { ownerId: { in: scopedUserIds } },
                    { managerId: { in: scopedUserIds } },
                    { telecallerId: { in: scopedUserIds } },
                    { fieldExecutiveId: { in: scopedUserIds } },
                  ]),
                }),
              ]),
            }),
          ],
        },
      }),
    );
  });

  it('scopes employee-performance users and team filters to the manager hierarchy', async () => {
    db.user.findMany.mockResolvedValueOnce([
      {
        id: 'manager',
        fullName: 'Manager',
        email: 'manager@example.com',
        role: 'MANAGER',
        isActive: true,
        avatarStorageKey: null,
        employeeProfile: null,
      },
    ]);
    const performanceDb = {
      ...db,
      leadAssignment: { findMany: emptyResult },
      callLog: { findMany: emptyResult },
      note: { findMany: emptyResult },
      task: { findMany: emptyResult },
    };
    const service = new DashboardService(
      performanceDb as unknown as PrismaService,
      referenceTenantProviders()[0].useValue as never,
      visibility as unknown as LeadVisibilityService,
    );

    await service.getAdminPerformanceData({}, actor);

    expect(visibility.resolveAssignmentScopeUserIds).toHaveBeenCalledWith(
      actor,
    );
    expect(performanceDb.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ id: { in: scopedUserIds } }),
          ]),
        }),
      }),
    );
    expect(performanceDb.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: [
                { leaderId: { in: scopedUserIds } },
                { members: { some: { userId: { in: scopedUserIds } } } },
              ],
            }),
          ]),
        }),
      }),
    );
  });
});
