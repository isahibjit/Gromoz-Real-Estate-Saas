import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantAccessService) {}

  async listTeams(actor: { sub: string; role: string }) {
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER'].includes(
      actor.role,
    );
    const where = isAdmin
      ? {}
      : {
          isActive: true,
          OR: [
            { leaderId: actor.sub },
            { visibilityGrants: { some: { leaderUserId: actor.sub } } },
            {
              members: {
                some: {
                  user: {
                    teamLeaderUserGrants: {
                      some: { leaderUserId: actor.sub },
                    },
                  },
                },
              },
            },
          ],
        };

    const teams = await this.prisma.team.findMany({
      where: { AND: [where, { organizationId: this.tenants.organizationId }] },
      include: {
        leader: {
          where: this.tenants.employeeWhere(),
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            avatarStorageKey: true,
          },
        },
        members: {
          where: { user: this.tenants.employeeWhere() },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                avatarStorageKey: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { data: teams.map((team) => this.normalizeTeam(team)) };
  }

  async getTeam(id: string, actor: { sub: string; role: string }) {
    const team = await this.prisma.team.findFirst({
      where: { id, organizationId: this.tenants.organizationId },
      include: {
        leader: {
          where: this.tenants.employeeWhere(),
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            avatarStorageKey: true,
          },
        },
        members: {
          where: { user: this.tenants.employeeWhere() },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                avatarStorageKey: true,
              },
            },
          },
        },
      },
    });

    if (!team) throw new NotFoundException('Team not found');

    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER'].includes(
      actor.role,
    );
    if (!isAdmin && team.leaderId !== actor.sub) {
      const monitorGrantCount =
        await this.prisma.teamLeaderVisibilityGrant.count({
          where: {
            leaderUserId: actor.sub,
            OR: [
              { teamId: id },
              { user: { employeeProfile: { is: { teamId: id } } } },
            ],
          },
        });

      if (monitorGrantCount === 0) {
        throw new BadRequestException('You do not have access to this team');
      }
    }

    return this.normalizeTeam(team);
  }

  async createTeam(body: Record<string, any>) {
    const organizationId = this.tenants.organizationId;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const code =
      typeof body.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!name || !code)
      throw new BadRequestException('Team name and code are required');

    const existing = await this.prisma.team.findUnique({ where: { code } });
    if (existing)
      throw new ConflictException('A team with this code already exists');

    const leaderId = body.leaderId || null;
    if (leaderId) {
      await this.tenants.assertEmployee(leaderId);
      const leaderExists = await this.prisma.user.findUnique({
        where: { id: leaderId },
      });
      if (!leaderExists)
        throw new BadRequestException('Selected leader does not exist');

      const alreadyLeading = await this.prisma.team.findFirst({
        where: { leaderId, isActive: true },
      });
      if (alreadyLeading)
        throw new ConflictException(
          'This employee is already leading another active team',
        );
    }

    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          organizationId,
          name,
          code,
          description: body.description || null,
          leaderId,
          isActive: body.isActive ?? true,
        },
      });

      if (leaderId) {
        await tx.employeeProfile.updateMany({
          where: { userId: leaderId, teamId: team.id },
          data: { teamId: null },
        });
      }

      return team;
    });
  }

  async updateTeam(id: string, body: Record<string, any>) {
    await this.tenants.assertTeams([id]);
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Team not found');

    let leaderId = body.leaderId;
    if (leaderId !== undefined) {
      if (leaderId) {
        await this.tenants.assertEmployee(leaderId);
        const leaderExists = await this.prisma.user.findUnique({
          where: { id: leaderId },
        });
        if (!leaderExists)
          throw new BadRequestException('Selected leader does not exist');

        const alreadyLeading = await this.prisma.team.findFirst({
          where: { leaderId, id: { not: id }, isActive: true },
        });
        if (alreadyLeading)
          throw new ConflictException(
            'This employee is already leading another active team',
          );
      } else {
        leaderId = null;
      }
    }

    const data: any = {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.code ? { code: body.code.trim().toUpperCase() } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
      ...(leaderId !== undefined ? { leaderId } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    };

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.team.update({
        where: { id },
        data,
      });

      if (leaderId) {
        await tx.employeeProfile.updateMany({
          where: { userId: leaderId, teamId: id },
          data: { teamId: null },
        });
      }

      return updated;
    });
  }

  async addMember(teamId: string, memberUserId: string) {
    await this.tenants.assertTeams([teamId]);
    await this.tenants.assertEmployee(memberUserId);
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');
    if (team.leaderId === memberUserId) {
      throw new BadRequestException(
        'Team leader cannot also be added as a team member',
      );
    }

    const memberProfile = await this.prisma.employeeProfile.findUnique({
      where: { userId: memberUserId },
    });
    if (!memberProfile)
      throw new NotFoundException('Employee profile not found');

    return this.prisma.employeeProfile.update({
      where: { userId: memberUserId },
      data: { teamId },
    });
  }

  async removeMember(teamId: string, memberUserId: string) {
    await this.tenants.assertTeams([teamId]);
    await this.tenants.assertEmployee(memberUserId);
    const memberProfile = await this.prisma.employeeProfile.findUnique({
      where: { userId: memberUserId },
    });
    if (!memberProfile || memberProfile.teamId !== teamId) {
      throw new BadRequestException('Employee is not a member of this team');
    }

    return this.prisma.employeeProfile.update({
      where: { userId: memberUserId },
      data: { teamId: null },
    });
  }

  private normalizeTeam<T extends { leaderId?: string | null; members?: any[] }>(
    team: T,
  ) {
    return {
      ...team,
      members: team.members?.filter(
        (member) => member.userId !== team.leaderId,
      ),
    };
  }
}
