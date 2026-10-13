import {
  BadRequestException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { createHmac, randomBytes } from 'crypto';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { PrismaService } from '../persistence/prisma/prisma.service';

export const portalProviders = ['magicbricks', 'housing'] as const;
export type PortalProvider = (typeof portalProviders)[number];

export interface ConnectionRoutingInput {
  projectId?: string | null;
  teamId?: string | null;
  telecallerId?: string | null;
  fieldExecutiveId?: string | null;
  sourceId?: unknown;
}

export interface ConnectionUpdateInput {
  name?: string;
  externalAccountId?: string | null;
  isActive?: boolean;
  notes?: string | null;
  apiKey?: string | null;
}

const cleanOptional = (value: unknown) => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
};

export const ROUTING_OWNER_ROLES: Role[] = [
  Role.ADMIN,
  Role.SUPER_ADMIN,
  Role.SALES_MANAGER,
  Role.MANAGER,
  Role.TEAM_LEADER,
];

export async function assertValidRoutingAssignees(
  prisma: PrismaService,
  telecallerId?: string | null,
  fieldExecutiveId?: string | null,
  ownerId?: string | null,
) {
  if (telecallerId && fieldExecutiveId) {
    throw new BadRequestException(
      'Select either a Pre Sales user or a Sales user, not both',
    );
  }

  const requested = [
    ...(telecallerId
      ? [{ id: telecallerId, roles: [Role.TELECALLER], label: 'Pre Sales' }]
      : []),
    ...(fieldExecutiveId
      ? [{ id: fieldExecutiveId, roles: [Role.SALES_AGENT], label: 'Sales' }]
      : []),
    ...(ownerId
      ? [{ id: ownerId, roles: ROUTING_OWNER_ROLES, label: 'owner' }]
      : []),
  ];
  if (!requested.length) return;

  const users = await prisma.user.findMany({
    where: { id: { in: requested.map((item) => item.id) }, isActive: true },
    select: { id: true, role: true },
  });
  for (const assignee of requested) {
    const user = users.find((candidate) => candidate.id === assignee.id);
    if (!user || !assignee.roles.includes(user.role)) {
      throw new BadRequestException(`Select an active ${assignee.label} user`);
    }
  }
}

@Injectable()
export class LeadSourceConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantAccessService,
    private readonly context: TenantContextService,
  ) {}

  private assertMutation() {
    if (this.context.getTenant()?.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Platform spectators have read-only workspace access',
      );
    }
    return this.tenants.organizationId;
  }

  private publicApiBaseUrl() {
    const configured =
      process.env.PUBLIC_API_BASE_URL ??
      process.env.MAGICBRICKS_PUBLIC_API_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');
    const frontendUrl = String(process.env.FRONTEND_URL ?? '').replace(
      /\/$/,
      '',
    );
    return frontendUrl.startsWith('http')
      ? `${frontendUrl}/api`
      : 'https://crmtrueroot.com/api';
  }

  buildMagicBricksApiKey(webhookKeyId: string) {
    const secret =
      process.env.MAGICBRICKS_API_KEY_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      'truroot-magicbricks-secret';
    const signature = createHmac('sha256', secret)
      .update(`magicbricks:${webhookKeyId}`)
      .digest('hex')
      .slice(0, 24);
    return `mb_${webhookKeyId}.${signature}`;
  }

  verifyMagicBricksApiKey(apiKey?: string | null) {
    if (!apiKey?.startsWith('mb_')) return null;
    const [webhookKeyId, signature] = apiKey.replace(/^mb_/, '').split('.');
    if (!webhookKeyId || !signature) return null;
    const expected = this.buildMagicBricksApiKey(webhookKeyId).split('.')[1];
    return signature === expected ? webhookKeyId : null;
  }

  webhookUrl(provider: PortalProvider, webhookKeyId: string) {
    return provider === 'magicbricks'
      ? `${this.publicApiBaseUrl()}/integrations/magicbricks/leads`
      : `${this.publicApiBaseUrl()}/public/webhooks/housing/${webhookKeyId}`;
  }

  private async audit(
    actorUserId: string | undefined,
    action: string,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: this.tenants.organizationId,
        actorUserId,
        action,
        entityType: 'LeadSourceConnection',
        entityId,
        metadata,
      },
    });
  }

  async ensurePrimary(
    provider: PortalProvider,
    defaultMapping: Prisma.InputJsonValue,
    actorUserId?: string,
  ) {
    const existing = await this.prisma.leadSourceConnection.findFirst({
      where: {
        organizationId: this.tenants.organizationId,
        provider,
        archivedAt: null,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    if (existing) return existing;

    try {
      return await this.prisma.leadSourceConnection.create({
        data: {
          organizationId: this.assertMutation(),
          provider,
          name: 'Primary account',
          isPrimary: true,
          webhookKeyId: randomBytes(12).toString('hex'),
          fieldMapping: defaultMapping,
          createdById: actorUserId,
          updatedById: actorUserId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.prisma.leadSourceConnection.findFirst({
          where: {
            organizationId: this.tenants.organizationId,
            provider,
            archivedAt: null,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        });
        if (concurrent) return concurrent;
        throw new BadRequestException(
          'Restore an archived account or create an account with a different name',
        );
      }
      throw error;
    }
  }

  async getAccount(provider: PortalProvider, accountId: string) {
    const account = await this.prisma.leadSourceConnection.findFirst({
      where: {
        id: accountId,
        provider,
        organizationId: this.tenants.organizationId,
      },
      include: {
        routingRule: true,
        _count: {
          select: {
            leads: { where: { organizationId: this.tenants.organizationId } },
          },
        },
      },
    });
    if (!account) throw new NotFoundException('Integration account not found');
    return account;
  }

  async getPrimaryAccount(
    provider: PortalProvider,
    defaultMapping: Prisma.InputJsonValue,
    actorUserId?: string,
    organizationId?: string,
  ) {
    if (organizationId && organizationId !== this.tenants.organizationId) {
      throw new ForbiddenException('Invalid tenant selection');
    }
    const ensured = await this.ensurePrimary(
      provider,
      defaultMapping,
      actorUserId,
    );
    return this.getAccount(provider, ensured.id);
  }

  async listAccounts(provider: PortalProvider, includeArchived = false) {
    const accounts = await this.prisma.leadSourceConnection.findMany({
      where: {
        organizationId: this.tenants.organizationId,
        provider,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      include: {
        routingRule: true,
        _count: {
          select: {
            leads: { where: { organizationId: this.tenants.organizationId } },
          },
        },
      },
    });
    const activeCount = accounts.filter(
      (account) => !account.archivedAt && account.isActive,
    ).length;
    const availableCount = accounts.filter(
      (account) => !account.archivedAt,
    ).length;
    const status =
      activeCount === 0
        ? 'Paused'
        : activeCount === availableCount
        ? 'Connected'
        : 'Mixed';
    return {
      accounts,
      summary: {
        activeCount,
        totalCount: availableCount,
        archivedCount: accounts.length - availableCount,
        totalLeadsReceived: accounts.reduce(
          (total, account) => total + account.totalLeadsReceived,
          0,
        ),
        lastLeadReceivedAt:
          accounts
            .map((account) => account.lastLeadReceivedAt)
            .filter((value): value is Date => Boolean(value))
            .sort((left, right) => right.getTime() - left.getTime())[0] ?? null,
        status,
      },
    };
  }

  async createAccount(
    provider: PortalProvider,
    body: {
      name: string;
      externalAccountId?: string | null;
      apiKey?: string | null;
    },
    defaultMapping: Prisma.InputJsonValue,
    actorUserId?: string,
  ) {
    const name = String(body.name ?? '').trim();
    if (!name) throw new BadRequestException('Account name is required');
    const externalAccountId = cleanOptional(body.externalAccountId);

    const duplicate = await this.prisma.leadSourceConnection.findFirst({
      where: {
        organizationId: this.tenants.organizationId,
        provider,
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          ...(externalAccountId ? [{ externalAccountId }] : []),
        ],
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new BadRequestException(
        'An account with this name or external account ID already exists',
      );
    }

    try {
      const account = await this.prisma.leadSourceConnection.create({
        data: {
          organizationId: this.assertMutation(),
          provider,
          name,
          externalAccountId,
          apiKey: provider === 'housing' ? cleanOptional(body.apiKey) : null,
          webhookKeyId: randomBytes(12).toString('hex'),
          fieldMapping: defaultMapping,
          status: 'Draft',
          createdById: actorUserId,
          updatedById: actorUserId,
        },
      });
      await this.audit(actorUserId, 'INTEGRATION_ACCOUNT_CREATED', account.id, {
        provider,
        name,
      });
      return this.getAccount(provider, account.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException(
          'An account with this name or external account ID already exists',
        );
      }
      throw error;
    }
  }

  async updateAccount(
    provider: PortalProvider,
    accountId: string,
    body: ConnectionUpdateInput,
    actorUserId?: string,
  ) {
    this.assertMutation();
    const current = await this.getAccount(provider, accountId);
    if (current.archivedAt) {
      throw new BadRequestException('Restore this account before editing it');
    }
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }
    const name = body.name === undefined ? undefined : body.name.trim();
    if (name !== undefined && !name) {
      throw new BadRequestException('Account name is required');
    }

    const account = await this.prisma.leadSourceConnection.update({
      where: { id: current.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(body.externalAccountId !== undefined
          ? { externalAccountId: cleanOptional(body.externalAccountId) }
          : {}),
        ...(body.apiKey !== undefined && provider === 'housing'
          ? { apiKey: cleanOptional(body.apiKey) }
          : {}),
        ...(body.notes !== undefined
          ? { notes: body.notes?.trim() || null }
          : {}),
        ...(body.isActive !== undefined
          ? {
              isActive: body.isActive,
              status: body.isActive
                ? current.status === 'Draft'
                  ? 'Configured'
                  : 'Connected'
                : 'Paused',
            }
          : {}),
        updatedById: actorUserId,
      },
    });
    await this.audit(actorUserId, 'INTEGRATION_ACCOUNT_UPDATED', account.id, {
      provider,
      isActive: account.isActive,
    });
    return this.getAccount(provider, account.id);
  }

  async setProviderStatus(
    provider: PortalProvider,
    isActive: boolean,
    actorUserId?: string,
  ) {
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }
    this.assertMutation();
    await this.prisma.leadSourceConnection.updateMany({
      where: {
        organizationId: this.tenants.organizationId,
        provider,
        archivedAt: null,
      },
      data: {
        isActive,
        status: isActive ? 'Connected' : 'Paused',
        updatedById: actorUserId,
      },
    });
    return this.listAccounts(provider);
  }

  async archiveAccount(
    provider: PortalProvider,
    accountId: string,
    actorUserId?: string,
  ) {
    this.assertMutation();
    const current = await this.getAccount(provider, accountId);
    if (current.archivedAt) return current;

    await this.prisma.$transaction(async (tx) => {
      await tx.leadSourceConnection.update({
        where: { id: current.id },
        data: {
          archivedAt: new Date(),
          isActive: false,
          isPrimary: false,
          status: 'Archived',
          updatedById: actorUserId,
        },
      });
      if (current.isPrimary) {
        const replacement = await tx.leadSourceConnection.findFirst({
          where: {
            organizationId: this.tenants.organizationId,
            provider,
            archivedAt: null,
            id: { not: current.id },
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (replacement) {
          await tx.leadSourceConnection.update({
            where: { id: replacement.id },
            data: { isPrimary: true, updatedById: actorUserId },
          });
        }
      }
    });
    await this.audit(actorUserId, 'INTEGRATION_ACCOUNT_ARCHIVED', current.id, {
      provider,
    });
    return this.getAccount(provider, current.id);
  }

  async restoreAccount(
    provider: PortalProvider,
    accountId: string,
    actorUserId?: string,
  ) {
    this.assertMutation();
    const current = await this.getAccount(provider, accountId);
    const existingPrimary = await this.prisma.leadSourceConnection.findFirst({
      where: {
        organizationId: this.tenants.organizationId,
        provider,
        archivedAt: null,
        isPrimary: true,
      },
      select: { id: true },
    });
    await this.prisma.leadSourceConnection.update({
      where: { id: current.id },
      data: {
        archivedAt: null,
        isActive: false,
        isPrimary: !existingPrimary,
        status: 'Paused',
        updatedById: actorUserId,
      },
    });
    await this.audit(actorUserId, 'INTEGRATION_ACCOUNT_RESTORED', current.id, {
      provider,
    });
    return this.getAccount(provider, current.id);
  }

  async regenerateCredential(
    provider: PortalProvider,
    accountId: string,
    actorUserId?: string,
  ) {
    this.assertMutation();
    const current = await this.getAccount(provider, accountId);
    if (current.archivedAt) {
      throw new BadRequestException(
        'Restore this account before rotating its key',
      );
    }
    const account = await this.prisma.leadSourceConnection.update({
      where: { id: current.id },
      data: {
        webhookKeyId: randomBytes(12).toString('hex'),
        status: current.isActive ? 'Configured' : 'Paused',
        updatedById: actorUserId,
      },
    });
    await this.audit(
      actorUserId,
      'INTEGRATION_ACCOUNT_KEY_REGENERATED',
      account.id,
      {
        provider,
      },
    );
    return this.getAccount(provider, account.id);
  }

  async saveFieldMapping(
    provider: PortalProvider,
    accountId: string,
    fieldMapping: Prisma.InputJsonValue,
    actorUserId?: string,
  ) {
    this.assertMutation();
    const current = await this.getAccount(provider, accountId);
    if (current.archivedAt) {
      throw new BadRequestException('Restore this account before editing it');
    }
    await this.prisma.leadSourceConnection.update({
      where: { id: current.id },
      data: {
        fieldMapping,
        status: current.isActive ? 'Mapped' : 'Paused',
        updatedById: actorUserId,
      },
    });
    await this.audit(
      actorUserId,
      'INTEGRATION_ACCOUNT_MAPPING_UPDATED',
      current.id,
      {
        provider,
      },
    );
    return this.getAccount(provider, current.id);
  }

  async saveRouting(
    provider: PortalProvider,
    accountId: string,
    body: ConnectionRoutingInput,
    actorUserId?: string,
  ) {
    this.assertMutation();
    const current = await this.getAccount(provider, accountId);
    if (current.archivedAt) {
      throw new BadRequestException('Restore this account before editing it');
    }
    if (body.sourceId !== undefined) {
      throw new BadRequestException(
        'MagicBricks and Housing.com leads must keep their canonical source',
      );
    }

    const projectId = cleanOptional(body.projectId);
    const teamId = cleanOptional(body.teamId);
    const telecallerId = cleanOptional(body.telecallerId);
    const fieldExecutiveId = cleanOptional(body.fieldExecutiveId);
    const [project, team] = await Promise.all([
      projectId
        ? this.prisma.project.findFirst({
            where: {
              id: projectId,
              organizationId: this.tenants.organizationId,
              status: { not: 'Archived' },
            },
            select: { id: true },
          })
        : null,
      teamId
        ? this.prisma.team.findFirst({
            where: {
              id: teamId,
              organizationId: this.tenants.organizationId,
              isActive: true,
            },
            select: { id: true },
          })
        : null,
      this.tenants.assertEmployees(
        [telecallerId, fieldExecutiveId].filter((id): id is string =>
          Boolean(id),
        ),
      ),
      assertValidRoutingAssignees(this.prisma, telecallerId, fieldExecutiveId),
    ]);
    if (projectId && !project) {
      throw new BadRequestException('Select an active CRM project');
    }
    if (teamId && !team) {
      throw new BadRequestException('Select an active CRM team');
    }

    const assignmentMode =
      telecallerId || fieldExecutiveId
        ? 'DIRECT'
        : teamId
        ? 'TEAM_AUTO'
        : 'AUTO_ASSIGN';
    const routing = await this.prisma.integrationRoutingRule.upsert({
      where: { connectionId: current.id },
      create: {
        provider,
        accountKey: current.id,
        accountLabel: current.name,
        connectionId: current.id,
        projectId,
        teamId,
        telecallerId,
        fieldExecutiveId,
        assignmentMode,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
      update: {
        accountLabel: current.name,
        projectId,
        teamId,
        telecallerId,
        fieldExecutiveId,
        assignmentMode,
        isActive: true,
        updatedById: actorUserId,
      },
    });
    await this.audit(
      actorUserId,
      'INTEGRATION_ACCOUNT_ROUTING_UPDATED',
      current.id,
      {
        provider,
        projectId,
        teamId,
        telecallerId,
        fieldExecutiveId,
        assignmentMode,
      },
    );
    return routing;
  }

  async findByWebhookKey(provider: PortalProvider, webhookKeyId: string) {
    return this.prisma.leadSourceConnection.findFirst({
      where: {
        provider,
        webhookKeyId,
        archivedAt: null,
        organizationId: { not: null },
      },
      include: { routingRule: true },
    });
  }

  async recordLeadReceived(accountId: string) {
    return this.prisma.leadSourceConnection.update({
      where: { id: accountId },
      data: {
        lastLeadReceivedAt: new Date(),
        totalLeadsReceived: { increment: 1 },
        status: 'Connected',
      },
    });
  }

  async recordTest(
    accountId: string,
    status: 'Success' | 'Failed',
    actorUserId?: string,
  ) {
    this.assertMutation();
    const account = await this.prisma.leadSourceConnection.findFirst({
      where: { id: accountId, organizationId: this.tenants.organizationId },
      select: { id: true },
    });
    if (!account) throw new NotFoundException('Integration account not found');
    return this.prisma.leadSourceConnection.update({
      where: { id: accountId },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: status,
        updatedById: actorUserId,
      },
    });
  }

  async listActivity(provider: PortalProvider, accountId: string) {
    await this.getAccount(provider, accountId);
    return this.prisma.auditLog.findMany({
      where: {
        organizationId: this.tenants.organizationId,
        entityType: 'LeadSourceConnection',
        entityId: accountId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actorUser: { select: { id: true, fullName: true, role: true } },
      },
    });
  }
}
