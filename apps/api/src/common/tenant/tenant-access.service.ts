import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
  ) {}

  get organizationId(): string {
    return this.context.getRequiredTenantId();
  }

  get selectedOrganizationId(): string | undefined {
    return this.context.getTenantId();
  }

  // Legacy HR profiles and permissions are global singletons per user. Until
  // migrated, they must not be exposed or mutated through shared identities.
  employeeWhere(): Prisma.UserWhereInput {
    return {
      role: { not: 'SUPER_ADMIN' },
      organizationMemberships: {
        some: { organizationId: this.organizationId },
        none: { organizationId: { not: this.organizationId } },
      },
    };
  }

  visibilityGrantWhere(): Prisma.TeamLeaderVisibilityGrantWhereInput {
    return {
      AND: [
        {
          OR: [
            { teamId: null },
            { team: { organizationId: this.organizationId } },
          ],
        },
        { OR: [{ userId: null }, { user: this.employeeWhere() }] },
      ],
    };
  }

  async assertEmployee(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { AND: [this.employeeWhere(), { id: userId }] },
      select: { id: true },
    });
    if (!user)
      throw new NotFoundException('Employee not found in this workspace');
  }

  async assertTeams(teamIds: readonly string[]): Promise<void> {
    const ids = [...new Set(teamIds)];
    if (!ids.length) return;
    const count = await this.prisma.team.count({
      where: { id: { in: ids }, organizationId: this.organizationId },
    });
    if (count !== ids.length)
      throw new NotFoundException('Team not found in this workspace');
  }

  async assertEmployees(userIds: readonly string[]): Promise<void> {
    const ids = [...new Set(userIds)];
    if (!ids.length) return;
    const count = await this.prisma.user.count({
      where: { AND: [this.employeeWhere(), { id: { in: ids } }] },
    });
    if (count !== ids.length)
      throw new NotFoundException('Employee not found in this workspace');
  }

  async validateEmployeeReferences(
    body: Record<string, unknown>,
  ): Promise<void> {
    const ids = (keys: readonly string[]) =>
      keys.flatMap((key) => {
        const value = body[key];
        if (value === undefined || value === null || value === '') return [];
        const values: unknown[] = Array.isArray(value) ? value : [value];
        if (values.some((id) => typeof id !== 'string' || !id.trim())) {
          throw new BadRequestException(`Invalid ${key}`);
        }
        return values
          .filter((id): id is string => typeof id === 'string')
          .map((id) => id.trim());
      });
    await this.assertTeams(
      ids([
        'teamId',
        'leaderOfTeamId',
        'managedTeamIds',
        'rankingTeamIds',
        'monitorTeamIds',
      ]),
    );
    await this.assertEmployees(
      ids([
        'reportingToId',
        'monitorUserIds',
        'leadVisibilityAllowedUserIds',
        'leadVisibilityBlockedUserIds',
      ]),
    );
  }
}
