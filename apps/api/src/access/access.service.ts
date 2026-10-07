import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, type Role } from '@prisma/client';

import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import {
  ACCESS_MODULE_KEYS,
  ACCESS_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  PAGE_PARENT_MODULE_MAP,
  PERMISSION_ACTIONS,
  type ModulePermission,
  type PermissionAction,
} from './access.constants';

type Actor = { sub: string; role: Role | string };

const EMPLOYEE_SELF_SERVICE_ROLES = new Set<string>([
  'TEAM_LEADER',
  'MANAGER',
  'TELECALLER',
  'SALES_AGENT',
  'FIELD_EXECUTIVE',
  'BACKEND',
]);
const EMPLOYEE_SELF_SERVICE_READ_MODULES = new Set<string>([
  'payroll',
  'payslips',
  'performance',
  'employees',
  'leads',
  'projects',
  'lead_masters',
  'property_masters',
  'teams',
]);

function normalizeRole(role: unknown): Role {
  if (role === 'FIELD_EXECUTIVE') return 'SALES_AGENT';
  if (
    role === 'BACKEND' ||
    role === 'BACKOFFICE' ||
    role === 'BACK_END_EXECUTIVE' ||
    role === 'BACKEND_EXECUTIVE'
  ) {
    return 'BACKEND';
  }
  if (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    role === 'HR' ||
    role === 'SALES_MANAGER' ||
    role === 'TEAM_LEADER' ||
    role === 'MANAGER' ||
    role === 'SALES_AGENT' ||
    role === 'TELECALLER' ||
    role === 'MARKETING' ||
    role === 'BACKEND'
  ) {
    return role;
  }
  throw new BadRequestException('Unsupported role');
}

function emptyPermission(moduleKey: string): ModulePermission {
  return {
    moduleKey,
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canPunchIn: false,
    canPunchOut: false,
  };
}

function permissionFromRow(row: {
  moduleKey: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPunchIn: boolean;
  canPunchOut: boolean;
}): ModulePermission {
  return {
    moduleKey: row.moduleKey,
    canView: row.canView,
    canCreate: row.canCreate,
    canUpdate: row.canUpdate,
    canDelete: row.canDelete,
    canPunchIn: row.canPunchIn,
    canPunchOut: row.canPunchOut,
  };
}

function normalizePermission(value: unknown): ModulePermission {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('Invalid permission payload');
  }
  const input = value as Record<string, unknown>;
  const moduleKey =
    typeof input.moduleKey === 'string' ? input.moduleKey.trim() : '';
  if (!ACCESS_MODULE_KEYS.has(moduleKey)) {
    throw new BadRequestException(`Unknown module permission: ${moduleKey}`);
  }
  return {
    moduleKey,
    canView: Boolean(input.canView),
    canCreate: Boolean(input.canCreate),
    canUpdate: Boolean(input.canUpdate),
    canDelete: Boolean(input.canDelete),
    canPunchIn: Boolean(input.canPunchIn),
    canPunchOut: Boolean(input.canPunchOut),
  };
}

function normalizeTeamIds(input: unknown): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new BadRequestException('rankingTeamIds must be an array');
  }
  const seen = new Set<string>();
  return input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function normalizeIdList(input: unknown, label: string): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) {
    throw new BadRequestException(`${label} must be an array`);
  }
  const seen = new Set<string>();
  return input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function hasAction(
  permission: ModulePermission | undefined,
  action: PermissionAction,
) {
  if (!permission) return false;
  if (action === 'view') return permission.canView;
  if (action === 'create') return permission.canCreate;
  if (action === 'update') return permission.canUpdate;
  if (action === 'delete') return permission.canDelete;
  if (action === 'punchIn') return permission.canPunchIn;
  return permission.canPunchOut;
}

function setAction(
  permission: ModulePermission,
  action: PermissionAction,
  allowed: boolean,
) {
  if (action === 'view') permission.canView = allowed;
  else if (action === 'create') permission.canCreate = allowed;
  else if (action === 'update') permission.canUpdate = allowed;
  else if (action === 'delete') permission.canDelete = allowed;
  else if (action === 'punchIn') permission.canPunchIn = allowed;
  else permission.canPunchOut = allowed;
}

function restrictPermissionToRole(
  permission: ModulePermission,
  role: Role,
): ModulePermission {
  const module = ACCESS_MODULES.find(
    (item) => item.key === permission.moduleKey,
  );
  const restricted = emptyPermission(permission.moduleKey);
  if (!module) return restricted;

  for (const action of module.actions) {
    const eligibleRoles = module.actionRoles?.[action];
    if (eligibleRoles && !eligibleRoles.includes(role)) continue;
    setAction(restricted, action, hasAction(permission, action));
  }
  if (
    restricted.canCreate ||
    restricted.canUpdate ||
    restricted.canDelete ||
    restricted.canPunchIn ||
    restricted.canPunchOut
  ) {
    restricted.canView = true;
  }
  return restricted;
}

function fullAccessPermission(moduleKey: string): ModulePermission {
  return {
    moduleKey,
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canPunchIn: true,
    canPunchOut: true,
  };
}

export function normalizeHierarchicalPermissions(
  permissions: ModulePermission[],
): ModulePermission[] {
  const permMap = new Map(
    permissions.map((perm) => [perm.moduleKey, { ...perm }]),
  );

  // 1. Any action enabled => View must be enabled on that module
  for (const perm of permMap.values()) {
    if (
      perm.canCreate ||
      perm.canUpdate ||
      perm.canDelete ||
      perm.canPunchIn ||
      perm.canPunchOut
    ) {
      perm.canView = true;
    }
  }

  // 2. Visible page => Parent module View must be enabled
  for (const perm of permMap.values()) {
    if (perm.canView && perm.moduleKey.startsWith('page.')) {
      const parentKey = PAGE_PARENT_MODULE_MAP[perm.moduleKey];
      if (parentKey && ACCESS_MODULE_KEYS.has(parentKey)) {
        const parentPerm = permMap.get(parentKey);
        if (parentPerm) {
          parentPerm.canView = true;
        } else {
          permMap.set(parentKey, {
            ...emptyPermission(parentKey),
            canView: true,
          });
        }
      }
    }
  }

  return Array.from(permMap.values());
}

@Injectable()
export class AccessService implements OnModuleInit {
  private defaultTemplatesInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService, private readonly tenants: TenantAccessService) {}

  async onModuleInit() {
    try {
      await this.ensureDefaultTemplates(true);
    } catch (error) {
      console.error(
        'Failed to initialize default access templates on startup:',
        error,
      );
    }
  }

  async ensureDefaultTemplates(force = false) {
    if (this.defaultTemplatesInitialized && !force) {
      return;
    }

    if (this.initializationPromise && !force) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      const rows = Object.entries(DEFAULT_ROLE_PERMISSIONS).flatMap(
        ([role, permissions]) =>
          permissions.map((permission) => ({
            role: role as Role,
            ...permission,
          })),
      );
      const defaultModuleKeysByRole = new Map(
        Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([role, permissions]) => [
          role as Role,
          permissions.map((permission) => permission.moduleKey),
        ]),
      );

      await this.prisma.$transaction(
        async (tx) => {
          for (const [role, moduleKeys] of defaultModuleKeysByRole) {
            await tx.accessTemplate.deleteMany({
              where: {
                role,
                isSystemDefault: true,
                moduleKey: { notIn: moduleKeys },
              },
            });
          }

          for (const row of rows) {
            const existing = await tx.accessTemplate.findUnique({
              where: {
                role_moduleKey: {
                  role: row.role,
                  moduleKey: row.moduleKey,
                },
              },
              select: {
                id: true,
                isSystemDefault: true,
              },
            });

            if (!existing) {
              await tx.accessTemplate.create({
                data: {
                  ...row,
                  isSystemDefault: true,
                },
              });
              continue;
            }

            if (existing.isSystemDefault) {
              await tx.accessTemplate.update({
                where: { id: existing.id },
                data: {
                  canView: row.canView,
                  canCreate: row.canCreate,
                  canUpdate: row.canUpdate,
                  canDelete: row.canDelete,
                  canPunchIn: row.canPunchIn,
                  canPunchOut: row.canPunchOut,
                },
              });
            }
          }
        },
        { maxWait: 10000, timeout: 20000 },
      );

      this.defaultTemplatesInitialized = true;
    })().finally(() => {
      this.initializationPromise = null;
    });

    return this.initializationPromise;
  }

  async listModules() {
    await this.ensureDefaultTemplates();
    return { data: ACCESS_MODULES };
  }

  async listTemplates() {
    await this.ensureDefaultTemplates();
    const rows = await this.prisma.accessTemplate.findMany({
      orderBy: [{ role: 'asc' }, { moduleKey: 'asc' }],
    });
    const templates = Object.entries(
      rows.reduce<Record<string, ModulePermission[]>>((acc, row) => {
        acc[row.role] ??= [];
        acc[row.role].push(permissionFromRow(row));
        return acc;
      }, {}),
    ).map(([role, permissions]) => ({
      role,
      permissions,
      isEditable: !this.tenants.selectedOrganizationId && role !== 'SUPER_ADMIN',
      isSystemLocked: Boolean(this.tenants.selectedOrganizationId) || role === 'SUPER_ADMIN',
      systemDefaultPermissions:
        role in DEFAULT_ROLE_PERMISSIONS
          ? DEFAULT_ROLE_PERMISSIONS[role as Role]
          : [],
    }));
    return {
      data: templates,
    };
  }

  async updateTemplate(
    roleInput: string,
    body: Record<string, unknown>,
    actor: Actor,
  ) {
    // These templates still apply platform-wide; tenant edits would alter every
    // customer's permissions. Use employee overrides until templates are migrated.
    if (this.tenants.selectedOrganizationId) {
      throw new ForbiddenException('Role templates are platform-wide. Use employee-specific permissions in this workspace.');
    }
    if (!['SUPER_ADMIN', 'ADMIN'].includes(actor.role)) {
      throw new ForbiddenException('Only admins can update role templates');
    }
    const role = normalizeRole(roleInput);
    if (role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin access is locked');
    }
    const resetToSystemDefault = body.resetToSystemDefault === true;
    const permissions = resetToSystemDefault
      ? this.normalizeSystemDefaultPermissions(role)
      : this.normalizeCompletePermissions(body.permissions, role);
    const before = await this.prisma.accessTemplate.findMany({
      where: { role },
      orderBy: { moduleKey: 'asc' },
    });
    await this.replaceTemplatePermissions(
      role,
      permissions,
      resetToSystemDefault,
    );
    await this.audit(actor.sub, 'ACCESS_TEMPLATE_UPDATED', role, {
      before: before.map(permissionFromRow),
      permissions,
      resetToSystemDefault,
    });
    return {
      role,
      permissions,
      isEditable: true,
      isSystemLocked: false,
      systemDefaultPermissions: DEFAULT_ROLE_PERMISSIONS[role] ?? [],
    };
  }

  async getUserAccess(userId: string) {
    await this.tenants.assertEmployee(userId);
    await this.ensureDefaultTemplates();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        modulePermissions: true,
        rankingTeamAccesses: {
          where: { team: { organizationId: this.tenants.organizationId } },
          select: {
            teamId: true,
            team: { select: { id: true, name: true } },
          },
          orderBy: { teamId: 'asc' },
        },
        teamLeaderVisibilityGrants: {
          where: this.tenants.visibilityGrantWhere(),
          select: {
            teamId: true,
            userId: true,
            team: { select: { id: true, name: true } },
            user: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: [{ teamId: 'asc' }, { userId: 'asc' }],
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const permissions = await this.getEffectivePermissions({
      id: user.id,
      role: user.role,
    });
    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      isCustomized:
        user.modulePermissions.length > 0 ||
        user.rankingTeamAccesses.length > 0,
      permissions,
      rankingTeamIds: user.rankingTeamAccesses.map((access) => access.teamId),
      rankingTeams: user.rankingTeamAccesses.map((access) => ({
        id: access.team.id,
        name: access.team.name,
      })),
      monitorTeamIds: user.teamLeaderVisibilityGrants
        .map((grant) => grant.teamId)
        .filter((teamId): teamId is string => Boolean(teamId)),
      monitorTeams: user.teamLeaderVisibilityGrants
        .filter((grant) => grant.teamId && grant.team)
        .map((grant) => ({
          id: grant.team!.id,
          name: grant.team!.name,
        })),
      monitorUserIds: user.teamLeaderVisibilityGrants
        .map((grant) => grant.userId)
        .filter((userId): userId is string => Boolean(userId)),
      monitorUsers: user.teamLeaderVisibilityGrants
        .filter((grant) => grant.userId && grant.user)
        .map((grant) => ({
          id: grant.user!.id,
          name: grant.user!.fullName ?? grant.user!.email,
          email: grant.user!.email,
        })),
    };
  }

  async updateUserAccess(
    userId: string,
    body: Record<string, unknown>,
    actor: Actor,
  ) {
    await this.tenants.assertEmployee(userId);
    await this.tenants.validateEmployeeReferences(body);
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        modulePermissions: true,
        rankingTeamAccesses: { select: { teamId: true } },
        teamLeaderVisibilityGrants: {
          select: { teamId: true, userId: true },
        },
      },
    });
    if (!target) throw new NotFoundException('User not found');

    const hasPermissionsPayload = body.permissions !== undefined;
    const hasRankingTeamsPayload = body.rankingTeamIds !== undefined;
    const hasMonitorTeamsPayload = body.monitorTeamIds !== undefined;
    const hasMonitorUsersPayload = body.monitorUserIds !== undefined;
    if (
      !hasPermissionsPayload &&
      !hasRankingTeamsPayload &&
      !hasMonitorTeamsPayload &&
      !hasMonitorUsersPayload
    ) {
      throw new BadRequestException(
        'permissions, rankingTeamIds, monitorTeamIds, or monitorUserIds must be provided',
      );
    }

    const permissions = hasPermissionsPayload
      ? this.normalizePermissions(body.permissions, target.role)
      : undefined;
    if (permissions) {
      await this.assertCanGrant(actor, permissions);
    } else {
      await this.assertCanManageAccess(actor);
    }
    const rankingTeamIds = hasRankingTeamsPayload
      ? normalizeTeamIds(body.rankingTeamIds)
      : undefined;
    const monitorTeamIds = hasMonitorTeamsPayload
      ? normalizeIdList(body.monitorTeamIds, 'monitorTeamIds')
      : undefined;
    const monitorUserIds = hasMonitorUsersPayload
      ? normalizeIdList(body.monitorUserIds, 'monitorUserIds')
      : undefined;

    const before = target.modulePermissions.map(permissionFromRow);
    const beforeRankingTeamIds = target.rankingTeamAccesses.map(
      (access) => access.teamId,
    );
    const beforeMonitorTeamIds = target.teamLeaderVisibilityGrants
      .map((grant) => grant.teamId)
      .filter((teamId): teamId is string => Boolean(teamId));
    const beforeMonitorUserIds = target.teamLeaderVisibilityGrants
      .map((grant) => grant.userId)
      .filter((userId): userId is string => Boolean(userId));
    if (permissions) {
      await this.replaceUserPermissions(userId, permissions, actor.sub);
    }
    if (rankingTeamIds) {
      await this.replaceUserRankingTeamAccess(
        userId,
        rankingTeamIds,
        actor.sub,
      );
    }
    if (monitorTeamIds || monitorUserIds) {
      await this.replaceTeamLeaderVisibilityGrants(
        userId,
        monitorTeamIds ?? beforeMonitorTeamIds,
        monitorUserIds ?? beforeMonitorUserIds,
        actor.sub,
      );
    }
    await this.audit(actor.sub, 'USER_ACCESS_UPDATED', userId, {
      before,
      after: permissions ?? before,
      beforeRankingTeamIds,
      afterRankingTeamIds: rankingTeamIds ?? beforeRankingTeamIds,
      beforeMonitorTeamIds,
      afterMonitorTeamIds: monitorTeamIds ?? beforeMonitorTeamIds,
      beforeMonitorUserIds,
      afterMonitorUserIds: monitorUserIds ?? beforeMonitorUserIds,
    });
    return this.getUserAccess(userId);
  }

  async resetUserAccess(userId: string, actor: Actor) {
    await this.tenants.assertEmployee(userId);
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!target) throw new NotFoundException('User not found');
    await this.assertCanManageAccess(actor);
    await this.prisma.$transaction([
      this.prisma.userModulePermission.deleteMany({ where: { userId } }),
      this.prisma.userRankingTeamAccess.deleteMany({ where: { userId } }),
      this.prisma.teamLeaderVisibilityGrant.deleteMany({
        where: { leaderUserId: userId },
      }),
    ]);
    await this.audit(actor.sub, 'USER_ACCESS_RESET', userId, {});
    return this.getUserAccess(userId);
  }

  async applyEmployeePermissions(
    userId: string,
    permissionsInput: unknown,
    targetRole: Role | string,
    actor: Actor,
  ) {
    if (permissionsInput === undefined) return;
    await this.tenants.assertEmployee(userId);
    const permissions = this.normalizePermissions(
      permissionsInput,
      normalizeRole(targetRole),
    );
    await this.assertCanGrant(actor, permissions);
    await this.replaceUserPermissions(userId, permissions, actor.sub);
  }

  async applyEmployeeRankingTeamAccess(
    userId: string,
    rankingTeamIdsInput: unknown,
    actor: Actor,
  ) {
    if (rankingTeamIdsInput === undefined) return;
    await this.tenants.assertEmployee(userId);
    await this.assertCanManageAccess(actor);
    const rankingTeamIds = normalizeTeamIds(rankingTeamIdsInput);
    await this.replaceUserRankingTeamAccess(userId, rankingTeamIds, actor.sub);
  }

  async applyTeamLeaderVisibilityAccess(
    userId: string,
    monitorTeamIdsInput: unknown,
    monitorUserIdsInput: unknown,
    actor: Actor,
  ) {
    if (
      monitorTeamIdsInput === undefined &&
      monitorUserIdsInput === undefined
    ) {
      return;
    }
    await this.assertCanManageAccess(actor);
    const monitorTeamIds = normalizeIdList(
      monitorTeamIdsInput,
      'monitorTeamIds',
    );
    const monitorUserIds = normalizeIdList(
      monitorUserIdsInput,
      'monitorUserIds',
    ).filter((monitorUserId) => monitorUserId !== userId);
    await this.replaceTeamLeaderVisibilityGrants(
      userId,
      monitorTeamIds,
      monitorUserIds,
      actor.sub,
    );
  }

  async applyLeadVisibilityOverrides(
    userId: string,
    allowedUserIdsInput: unknown,
    blockedUserIdsInput: unknown,
    actor: Actor,
  ) {
    if (
      allowedUserIdsInput === undefined &&
      blockedUserIdsInput === undefined
    ) {
      return;
    }
    await this.assertCanManageAccess(actor);
    const allowedUserIds = normalizeIdList(
      allowedUserIdsInput,
      'leadVisibilityAllowedUserIds',
    ).filter((targetUserId) => targetUserId !== userId);
    const blockedUserIds = normalizeIdList(
      blockedUserIdsInput,
      'leadVisibilityBlockedUserIds',
    ).filter(
      (targetUserId) =>
        targetUserId !== userId && !allowedUserIds.includes(targetUserId),
    );
    await this.replaceLeadVisibilityOverrides(
      userId,
      allowedUserIds,
      blockedUserIds,
      actor.sub,
    );
  }

  async getEffectivePermissions(user: { id: string; role: Role | string }) {
    await this.ensureDefaultTemplates();
    if (user.role === 'SUPER_ADMIN') {
      return ACCESS_MODULES.map((module) => fullAccessPermission(module.key));
    }

    const role = normalizeRole(user.role);
    const [templates, overrides] = await Promise.all([
      this.prisma.accessTemplate.findMany({ where: { role } }),
      this.prisma.userModulePermission.findMany({ where: { userId: user.id } }),
    ]);
    const byModule = new Map<string, ModulePermission>();
    for (const module of ACCESS_MODULES) {
      byModule.set(module.key, emptyPermission(module.key));
    }
    for (const template of templates) {
      byModule.set(template.moduleKey, permissionFromRow(template));
    }
    for (const override of overrides) {
      byModule.set(override.moduleKey, permissionFromRow(override));
    }
    return ACCESS_MODULES.map(
      (module) => byModule.get(module.key) ?? emptyPermission(module.key),
    );
  }

  async hasPermission(
    user: { sub: string; role: string },
    moduleKey: string,
    action: PermissionAction,
  ) {
    if (user.role === 'SUPER_ADMIN') return true;
    if (!ACCESS_MODULE_KEYS.has(moduleKey)) return false;
    if (
      EMPLOYEE_SELF_SERVICE_READ_MODULES.has(moduleKey) &&
      action === 'view' &&
      EMPLOYEE_SELF_SERVICE_ROLES.has(user.role)
    ) {
      return true;
    }
    const permissions = await this.getEffectivePermissions({
      id: user.sub,
      role: user.role,
    });
    return hasAction(
      permissions.find((permission) => permission.moduleKey === moduleKey),
      action,
    );
  }

  private normalizePermissions(
    input: unknown,
    role?: Role,
  ): ModulePermission[] {
    if (!Array.isArray(input)) {
      throw new BadRequestException('permissions must be an array');
    }
    const seen = new Set<string>();
    const normalized = input
      .map(normalizePermission)
      .map((permission) =>
        role ? restrictPermissionToRole(permission, role) : permission,
      )
      .filter((permission) => {
        if (seen.has(permission.moduleKey)) return false;
        seen.add(permission.moduleKey);
        return true;
      });
    return normalizeHierarchicalPermissions(normalized);
  }

  private normalizeCompletePermissions(
    input: unknown,
    role: Role,
  ): ModulePermission[] {
    const provided = new Map(
      this.normalizePermissions(input, role).map((permission) => [
        permission.moduleKey,
        permission,
      ]),
    );
    const complete = ACCESS_MODULES.map(
      (module) => provided.get(module.key) ?? emptyPermission(module.key),
    );
    return normalizeHierarchicalPermissions(complete);
  }

  private normalizeSystemDefaultPermissions(role: Role): ModulePermission[] {
    const defaults = DEFAULT_ROLE_PERMISSIONS[role];
    if (!defaults) {
      throw new BadRequestException('No system default exists for this role');
    }
    const byModule = new Map(
      defaults.map((permission) => [permission.moduleKey, permission]),
    );
    return ACCESS_MODULES.map(
      (module) => byModule.get(module.key) ?? emptyPermission(module.key),
    );
  }

  private async replaceTemplatePermissions(
    role: Role,
    permissions: ModulePermission[],
    isSystemDefault: boolean,
  ) {
    await this.prisma.$transaction([
      this.prisma.accessTemplate.deleteMany({ where: { role } }),
      ...permissions.map((permission) =>
        this.prisma.accessTemplate.create({
          data: {
            role,
            ...permission,
            isSystemDefault,
          },
        }),
      ),
    ]);
  }

  private async replaceUserPermissions(
    userId: string,
    permissions: ModulePermission[],
    updatedById: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.userModulePermission.deleteMany({ where: { userId } }),
      ...permissions.map((permission) =>
        this.prisma.userModulePermission.create({
          data: {
            userId,
            updatedById,
            ...permission,
          },
        }),
      ),
    ]);
  }

  private async replaceUserRankingTeamAccess(
    userId: string,
    rankingTeamIds: string[],
    updatedById: string,
  ) {
    await this.tenants.assertTeams(rankingTeamIds);
    if (rankingTeamIds.length) {
      const existingCount = await this.prisma.team.count({
        where: { id: { in: rankingTeamIds }, isActive: true },
      });
      if (existingCount !== rankingTeamIds.length) {
        throw new BadRequestException(
          'One or more ranking teams are invalid or inactive',
        );
      }
    }
    await this.prisma.$transaction([
      this.prisma.userRankingTeamAccess.deleteMany({ where: { userId } }),
      ...rankingTeamIds.map((teamId) =>
        this.prisma.userRankingTeamAccess.create({
          data: {
            userId,
            teamId,
            updatedById,
          },
        }),
      ),
    ]);
  }

  private async replaceTeamLeaderVisibilityGrants(
    leaderUserId: string,
    monitorTeamIds: string[],
    monitorUserIds: string[],
    updatedById: string,
  ) {
    await this.tenants.assertEmployee(leaderUserId);
    await this.tenants.assertTeams(monitorTeamIds);
    await this.tenants.assertEmployees(monitorUserIds);
    const normalizedTeamIds = normalizeIdList(monitorTeamIds, 'monitorTeamIds');
    const normalizedUserIds = normalizeIdList(
      monitorUserIds,
      'monitorUserIds',
    ).filter((userId) => userId !== leaderUserId);

    if (normalizedTeamIds.length) {
      const existingCount = await this.prisma.team.count({
        where: { id: { in: normalizedTeamIds }, isActive: true },
      });
      if (existingCount !== normalizedTeamIds.length) {
        throw new BadRequestException(
          'One or more monitor teams are invalid or inactive',
        );
      }
    }

    if (normalizedUserIds.length) {
      const existingCount = await this.prisma.user.count({
        where: {
          id: { in: normalizedUserIds },
          isActive: true,
          employeeProfile: { isNot: null },
        },
      });
      if (existingCount !== normalizedUserIds.length) {
        throw new BadRequestException(
          'One or more monitor users are invalid or inactive',
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.teamLeaderVisibilityGrant.deleteMany({
        where: { leaderUserId },
      }),
      ...normalizedTeamIds.map((teamId) =>
        this.prisma.teamLeaderVisibilityGrant.create({
          data: {
            leaderUserId,
            teamId,
            updatedById,
          },
        }),
      ),
      ...normalizedUserIds.map((userId) =>
        this.prisma.teamLeaderVisibilityGrant.create({
          data: {
            leaderUserId,
            userId,
            updatedById,
          },
        }),
      ),
    ]);
  }

  private async replaceLeadVisibilityOverrides(
    viewerUserId: string,
    allowedUserIds: string[],
    blockedUserIds: string[],
    updatedById: string,
  ) {
    await this.tenants.assertEmployee(viewerUserId);
    await this.tenants.assertEmployees([...allowedUserIds, ...blockedUserIds]);
    const targetUserIds = [...allowedUserIds, ...blockedUserIds];
    if (targetUserIds.length) {
      const validUsers = await this.prisma.user.findMany({
        where: {
          id: { in: targetUserIds },
          isActive: true,
          employeeProfile: { isNot: null },
        },
        select: { id: true },
      });
      const validIdSet = new Set(validUsers.map((u) => u.id));
      allowedUserIds = allowedUserIds.filter((id) => validIdSet.has(id));
      blockedUserIds = blockedUserIds.filter((id) => validIdSet.has(id));
    }

    await this.prisma.$transaction([
      this.prisma.leadVisibilityOverride.deleteMany({
        where: { viewerUserId },
      }),
      ...allowedUserIds.map((targetUserId) =>
        this.prisma.leadVisibilityOverride.create({
          data: {
            viewerUserId,
            targetUserId,
            accessType: 'ALLOW',
            updatedById,
          },
        }),
      ),
      ...blockedUserIds.map((targetUserId) =>
        this.prisma.leadVisibilityOverride.create({
          data: {
            viewerUserId,
            targetUserId,
            accessType: 'BLOCK',
            updatedById,
          },
        }),
      ),
    ]);
  }

  private async assertCanManageAccess(actor: Actor) {
    if (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN') return;
    const canManage = await this.hasPermission(
      { sub: actor.sub, role: String(actor.role) },
      'access_control',
      'update',
    );
    if (!canManage) {
      throw new ForbiddenException('You cannot manage access permissions');
    }
  }

  private async assertCanGrant(actor: Actor, permissions: ModulePermission[]) {
    if (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN') return;
    await this.assertCanManageAccess(actor);
    const ownPermissions = await this.getEffectivePermissions({
      id: actor.sub,
      role: actor.role,
    });
    const ownByModule = new Map(
      ownPermissions.map((permission) => [permission.moduleKey, permission]),
    );
    for (const permission of permissions) {
      const own = ownByModule.get(permission.moduleKey);
      for (const action of PERMISSION_ACTIONS) {
        const requested = hasAction(permission, action);
        if (requested && !hasAction(own, action)) {
          throw new ForbiddenException(
            'You cannot grant permissions outside your own access',
          );
        }
      }
    }
  }

  private async audit(
    actorUserId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: this.tenants.selectedOrganizationId,
        actorUserId,
        action,
        entityType: 'AccessControl',
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
