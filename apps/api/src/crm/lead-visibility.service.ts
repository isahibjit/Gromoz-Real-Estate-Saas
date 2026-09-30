import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../persistence/prisma/prisma.service';

type LeadVisibilityActor = {
  sub?: string;
  role?: Role | string;
};

@Injectable()
export class LeadVisibilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  assignmentScope(
    userIds: readonly string[],
    options: { includeSiteVisits?: boolean } = {},
  ): Prisma.LeadWhereInput {
    if (!userIds.length) return { id: { in: [] } };
    const ids = [...userIds];
    return {
      OR: [
        { ownerId: { in: ids } },
        { managerId: { in: ids } },
        { telecallerId: { in: ids } },
        { fieldExecutiveId: { in: ids } },
        ...(options.includeSiteVisits === false
          ? []
          : [{ siteVisits: { some: { assignedExecutiveId: { in: ids } } } }]),
      ],
    };
  }

  isGlobalLeadViewer(role?: Role | string | null): boolean {
    return role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  async resolveAssignmentScopeUserIds(
    actor?: LeadVisibilityActor,
  ): Promise<string[] | null> {
    if (!actor?.sub) return null;
    if (this.isGlobalLeadViewer(actor.role)) return null;

    if (actor.role === 'MANAGER' || actor.role === 'SALES_MANAGER') {
      return this.applyLeadVisibilityOverrides(
        actor.sub,
        await this.resolveManagerScopeUserIds(actor.sub),
      );
    }

    if (actor.role === 'TEAM_LEADER') {
      return this.applyLeadVisibilityOverrides(
        actor.sub,
        await this.resolveTeamLeaderScopeUserIds(actor.sub),
      );
    }

    return this.applyLeadVisibilityOverrides(actor.sub, [actor.sub]);
  }

  async resolveAssignmentScope(
    actor?: LeadVisibilityActor,
    options: { includeSiteVisits?: boolean } = {},
  ): Promise<Prisma.LeadWhereInput | null> {
    const userIds = await this.resolveAssignmentScopeUserIds(actor);
    return userIds ? this.assignmentScope(userIds, options) : null;
  }

  private async resolveTeamLeaderScopeUserIds(leaderUserId: string) {
    const userIds = new Set<string>([leaderUserId]);
    const [leaderTeams, visibilityGrants, directReports] = await Promise.all([
      this.prisma.team.findMany({
        where: { isActive: true, leaderId: leaderUserId },
        select: {
          members: { select: { userId: true } },
        },
      }),
      this.prisma.teamLeaderVisibilityGrant.findMany({
        where: { leaderUserId },
        select: {
          userId: true,
          team: {
            select: {
              members: { select: { userId: true } },
            },
          },
        },
      }),
      this.prisma.employeeProfile.findMany({
        where: { reportingToId: leaderUserId, user: { isActive: true } },
        select: { userId: true },
      }),
    ]);

    leaderTeams.forEach((team) => {
      team.members.forEach((member) => userIds.add(member.userId));
    });
    visibilityGrants.forEach((grant) => {
      if (grant.userId) userIds.add(grant.userId);
      grant.team?.members.forEach((member) => userIds.add(member.userId));
    });
    directReports.forEach((profile) => userIds.add(profile.userId));

    return [...userIds];
  }

  private async resolveManagerScopeUserIds(managerUserId: string) {
    const userIds = new Set<string>([managerUserId]);
    const directReports = await this.prisma.employeeProfile.findMany({
      where: { reportingToId: managerUserId, user: { isActive: true } },
      select: {
        userId: true,
        user: { select: { role: true } },
      },
    });
    const teamLeaderIds = directReports
      .filter((profile) => profile.user.role === 'TEAM_LEADER')
      .map((profile) => profile.userId);

    directReports.forEach((profile) => userIds.add(profile.userId));

    const allLeaderIds = [...teamLeaderIds, managerUserId];
    const teams = await this.prisma.team.findMany({
      where: { isActive: true, leaderId: { in: allLeaderIds } },
      select: {
        members: { select: { userId: true } },
      },
    });
    teams.forEach((team) => {
      team.members.forEach((member) => userIds.add(member.userId));
    });

    return [...userIds];
  }

  private async applyLeadVisibilityOverrides(
    viewerUserId: string,
    hierarchyUserIds: string[],
  ) {
    const finalUserIds = new Set(hierarchyUserIds);
    const overrides = await this.prisma.leadVisibilityOverride.findMany({
      where: {
        viewerUserId,
        target: { isActive: true },
      },
      select: {
        targetUserId: true,
        accessType: true,
      },
    });

    overrides.forEach((override) => {
      if (override.accessType === 'BLOCK') {
        finalUserIds.delete(override.targetUserId);
      }
    });
    overrides.forEach((override) => {
      if (override.accessType === 'ALLOW') {
        finalUserIds.add(override.targetUserId);
      }
    });
    finalUserIds.add(viewerUserId);

    return [...finalUserIds];
  }

  async recipientIdsForLead(leadId: string): Promise<string[]> {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, deletedAt: null },
      select: {
        organizationId: true,
        ownerId: true,
        managerId: true,
        telecallerId: true,
        fieldExecutiveId: true,
      },
    });
    if (!lead?.organizationId) return [];

    // Realtime currently uses user rooms, so only exclusively tenant-owned
    // identities are safe until workspace-specific rooms are implemented.
    const tenantUserWhere: Prisma.UserWhereInput = {
      isActive: true,
      role: { not: 'SUPER_ADMIN' },
      organizationMemberships: {
        some: { organizationId: lead.organizationId, isActive: true },
        none: { organizationId: { not: lead.organizationId } },
      },
    };

    const globalViewerRoles: Role[] = [
      'SUPER_ADMIN',
      'ADMIN',
      'HR',
      'SALES_MANAGER',
      'MARKETING',
    ];
    const globalUsers = await this.prisma.user.findMany({
      where: {
        AND: [
          tenantUserWhere,
          {
            organizationMemberships: {
              some: {
                organizationId: lead.organizationId,
                isActive: true,
                role: { in: globalViewerRoles },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    const assignedUserIds = [
      lead.ownerId,
      lead.managerId,
      lead.telecallerId,
      lead.fieldExecutiveId,
    ].filter((id): id is string => Boolean(id));
    const [leaderTeams, managerReports] = await Promise.all([
      assignedUserIds.length
        ? this.prisma.team.findMany({
            where: {
              organizationId: lead.organizationId,
              isActive: true,
              leaderId: { not: null },
              members: { some: { userId: { in: assignedUserIds } } },
            },
            select: { leaderId: true },
          })
        : Promise.resolve([]),
      assignedUserIds.length
        ? this.prisma.employeeProfile.findMany({
            where: {
              userId: { in: assignedUserIds },
              reportingToId: { not: null },
            },
            select: { reportingToId: true },
          })
        : Promise.resolve([]),
    ]);
    const candidateIds = Array.from(
      new Set(
        [
          ...globalUsers.map((user) => user.id),
          ...assignedUserIds,
          ...leaderTeams.map((team) => team.leaderId),
          ...managerReports.map((profile) => profile.reportingToId),
        ].filter((id): id is string => Boolean(id)),
      ),
    );
    if (!candidateIds.length) return [];

    const candidates = await this.prisma.user.findMany({
      where: { AND: [tenantUserWhere, { id: { in: candidateIds } }] },
      select: {
        id: true,
        organizationMemberships: {
          where: { organizationId: lead.organizationId, isActive: true },
          select: { role: true },
        },
      },
    });
    const visible = await Promise.all(
      candidates.map(async (user) => ({
        id: user.id,
        canView:
          user.organizationMemberships.length === 1 &&
          (await this.access.hasPermission(
            { sub: user.id, role: user.organizationMemberships[0].role },
            'leads',
            'view',
          )),
      })),
    );
    return visible.filter((user) => user.canView).map((user) => user.id);
  }
}
