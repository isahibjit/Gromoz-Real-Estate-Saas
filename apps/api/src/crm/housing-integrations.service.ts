import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { CrmService } from './crm.service';
import { LeadSourceConnectionsService } from './lead-source-connections.service';

export const defaultHousingFieldMapping = {
  Name: 'name',
  Phone: 'phone',
  Email: 'email',
  ProjectName: 'projectName',
  Locality: 'locality',
  City: 'city',
  Budget: 'budget',
  CreatedDate: 'createdDate',
  Remarks: 'remarks',
};

export const defaultHousingSamplePayload = {
  lead_id: 'HSG-984210',
  name: 'Rajesh Kumar',
  phone: '9876543210',
  email: 'rajesh.kumar@example.com',
  project_name: 'Truroot Heights',
  locality: 'Mira Road',
  city: 'Mumbai',
  budget: '75 Lakhs - 1 Cr',
  created_at: '2026-08-29T12:00:00Z',
  remarks: 'Looking for 2 BHK ready to move unit',
};

type HousingPayload = Record<string, unknown>;
type HousingFieldMapping = typeof defaultHousingFieldMapping;

const payloadText = (
  payload: HousingPayload,
  ...keys: Array<string | undefined>
) => {
  for (const key of keys) {
    if (!key) continue;
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return undefined;
};

@Injectable()
export class HousingIntegrationsService {
  private readonly logger = new Logger(HousingIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmService,
    private readonly connections: LeadSourceConnectionsService,
  ) {}

  private mapping(value: Prisma.JsonValue | null): HousingFieldMapping {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ...defaultHousingFieldMapping };
    }
    const supplied = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(defaultHousingFieldMapping).map(([key, fallback]) => [
        key,
        typeof supplied[key] === 'string' && supplied[key]
          ? supplied[key]
          : fallback,
      ]),
    ) as HousingFieldMapping;
  }

  private async accountView(
    account: Awaited<ReturnType<LeadSourceConnectionsService['getAccount']>>,
  ) {
    return {
      ...account,
      webhookUrl: this.connections.webhookUrl('housing', account.webhookKeyId),
      fieldMapping: this.mapping(account.fieldMapping),
      leadCount: account._count.leads,
      samplePayload: defaultHousingSamplePayload,
      routing: account.routingRule,
    };
  }

  async ensureHousingIntegration(
    actorUserId?: string,
    organizationId?: string,
  ) {
    return this.connections.getPrimaryAccount(
      'housing',
      defaultHousingFieldMapping,
      actorUserId,
      organizationId,
    );
  }

  async getHousingIntegration(actorUserId?: string, organizationId?: string) {
    return this.accountView(
      await this.ensureHousingIntegration(actorUserId, organizationId),
    );
  }

  async listAccounts(includeArchived = false) {
    const result = await this.connections.listAccounts(
      'housing',
      includeArchived,
    );
    return {
      data: {
        summary: result.summary,
        accounts: await Promise.all(
          result.accounts.map((account) => this.accountView(account)),
        ),
      },
    };
  }

  async getAccount(accountId: string) {
    return {
      data: await this.accountView(
        await this.connections.getAccount('housing', accountId),
      ),
    };
  }

  async createAccount(
    body: { name: string; externalAccountId?: string; apiKey?: string },
    actorUserId?: string,
  ) {
    const account = await this.connections.createAccount(
      'housing',
      body,
      defaultHousingFieldMapping,
      actorUserId,
    );
    return { data: await this.accountView(account) };
  }

  async updateAccount(
    accountId: string,
    body: {
      name?: string;
      externalAccountId?: string;
      apiKey?: string;
      isActive?: boolean;
      notes?: string;
    },
    actorUserId?: string,
  ) {
    const account = await this.connections.updateAccount(
      'housing',
      accountId,
      body,
      actorUserId,
    );
    return { data: await this.accountView(account) };
  }

  async saveHousingIntegration(
    body: { isActive?: boolean; apiKey?: string },
    actorUserId?: string,
    organizationId?: string,
  ) {
    const account = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    await this.connections.updateAccount(
      'housing',
      account.id,
      body,
      actorUserId,
    );
    return this.getHousingIntegration(actorUserId);
  }

  async setAccountsStatus(isActive: boolean, actorUserId?: string) {
    await this.connections.setProviderStatus('housing', isActive, actorUserId);
    return this.listAccounts();
  }

  async archiveAccount(accountId: string, actorUserId?: string) {
    await this.connections.archiveAccount('housing', accountId, actorUserId);
    return this.listAccounts();
  }

  async restoreAccount(accountId: string, actorUserId?: string) {
    const account = await this.connections.restoreAccount(
      'housing',
      accountId,
      actorUserId,
    );
    return { data: await this.accountView(account) };
  }

  async regenerateWebhookKey(actorUserId?: string, organizationId?: string) {
    const account = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    await this.connections.regenerateCredential(
      'housing',
      account.id,
      actorUserId,
    );
    return this.getHousingIntegration(actorUserId);
  }

  async regenerateAccountWebhookKey(accountId: string, actorUserId?: string) {
    const account = await this.connections.regenerateCredential(
      'housing',
      accountId,
      actorUserId,
    );
    return { data: await this.accountView(account) };
  }

  async saveFieldMapping(
    fieldMapping: unknown,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const account = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    await this.connections.saveFieldMapping(
      'housing',
      account.id,
      this.mapping(fieldMapping as Prisma.JsonValue),
      actorUserId,
    );
    return this.getHousingIntegration(actorUserId);
  }

  async saveAccountFieldMapping(
    accountId: string,
    fieldMapping: unknown,
    actorUserId?: string,
  ) {
    const account = await this.connections.saveFieldMapping(
      'housing',
      accountId,
      this.mapping(fieldMapping as Prisma.JsonValue),
      actorUserId,
    );
    return { data: await this.accountView(account) };
  }

  async saveAccountRouting(
    accountId: string,
    body: {
      projectId?: string;
      teamId?: string;
      telecallerId?: string;
      fieldExecutiveId?: string;
      sourceId?: unknown;
    },
    actorUserId?: string,
  ) {
    await this.connections.saveRouting('housing', accountId, body, actorUserId);
    return this.getAccount(accountId);
  }

  async getAccountActivity(accountId: string) {
    return { data: await this.connections.listActivity('housing', accountId) };
  }

  private async resolveHousingSource() {
    let source = await this.prisma.leadMasterValue.findFirst({
      where: {
        name: { equals: 'Housing.com', mode: 'insensitive' },
        categoryRef: { code: 'source' },
      },
    });
    if (source) return source;

    const category = await this.prisma.leadMasterCategory.upsert({
      where: { code: 'source' },
      update: {},
      create: { code: 'source', name: 'Lead Source Master' },
    });
    source = await this.prisma.leadMasterValue.create({
      data: {
        categoryId: category.id,
        name: 'Housing.com',
        code: 'HOUSING',
        description: 'Marketplace portal leads from Housing.com',
        group: 'Portal',
        statusType: 'Custom',
        isActive: true,
        autoAssignActive: true,
      },
    });
    return source;
  }

  async ingestWebhook(keyId: string, body: HousingPayload) {
    const integration = await this.connections.findByWebhookKey(
      'housing',
      keyId,
    );
    if (!integration || !integration.organizationId) {
      throw new NotFoundException('Housing.com webhook endpoint not found');
    }
    if (!integration.isActive) {
      this.logger.log(
        `[HousingWebhook] skipped webhook for account=${integration.id}: integration is paused`,
      );
      return {
        success: true,
        message: 'Housing.com integration is currently paused',
        status: 'PAUSED',
      };
    }

    const payload = body || {};
    const routing = integration.routingRule?.isActive === false
      ? undefined
      : integration.routingRule;
    const mapping = this.mapping(integration.fieldMapping);
    const name =
      payloadText(payload, mapping.Name, 'name', 'full_name') ?? 'Housing Lead';
    const phone = payloadText(
      payload,
      mapping.Phone,
      'phone',
      'mobile',
      'contact_number',
    );
    const email = payloadText(payload, mapping.Email, 'email');
    if (!phone && !email) {
      throw new BadRequestException(
        'Phone or email is required in Housing.com payload',
      );
    }

    const projectName = payloadText(
      payload,
      mapping.ProjectName,
      'project_name',
      'property_name',
    );
    const matchedProject =
      !routing?.projectId && projectName
        ? await this.prisma.project.findFirst({
            where: {
              organizationId: integration.organizationId,
              status: { not: 'Archived' },
              OR: [
                { name: { equals: projectName, mode: 'insensitive' } },
                { name: { contains: projectName, mode: 'insensitive' } },
              ],
            },
            select: { id: true },
          })
        : null;
    const preferredProjectId =
      routing?.projectId ?? matchedProject?.id;
    const locality = payloadText(payload, mapping.Locality, 'locality');
    const city = payloadText(payload, mapping.City, 'city');
    const budget = payloadText(payload, mapping.Budget, 'budget');
    const remarks = payloadText(payload, mapping.Remarks, 'remarks', 'comment');
    const source = await this.resolveHousingSource();
    const directAssignment = Boolean(
      routing?.ownerId || routing?.telecallerId || routing?.fieldExecutiveId,
    );

    const lead = await this.crm.createLead({
      organizationId: integration.organizationId,
      name,
      mobile: phone,
      email,
      source: 'Housing.com',
      sourceId: source.id,
      preferredProjectId,
      preferredLocation:
        [locality, city].filter(Boolean).join(', ') || undefined,
      budgetRange: budget,
      remarks: [
        projectName && !preferredProjectId ? `Project: ${projectName}` : null,
        remarks ? `Remarks: ${remarks}` : null,
      ]
        .filter((value): value is string => Boolean(value))
        .join('\n'),
      ownerId: routing?.ownerId ?? undefined,
      telecallerId: routing?.telecallerId ?? undefined,
      fieldExecutiveId: routing?.fieldExecutiveId ?? undefined,
      autoAssignmentTeamId: directAssignment
        ? undefined
        : routing?.teamId ?? undefined,
      integrationConnectionId: integration.id,
    }, undefined, { fromIntegration: true });

    await this.connections.recordLeadReceived(integration.id);
    await this.prisma.auditLog.create({
      data: {
        organizationId: integration.organizationId,
        action: 'HOUSING_LEAD_RECEIVED',
        entityType: 'Lead',
        entityId: lead.id,
        metadata: {
          integrationConnectionId: integration.id,
          integrationAccountName: integration.name,
          displayId: lead.displayId,
        },
      },
    });
    return {
      success: true,
      message: 'Housing.com lead ingested successfully',
      leadId: lead.id,
    };
  }

  async testIntegration(
    sampleBody?: HousingPayload,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const account = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    return this.testAccount(account.id, sampleBody, actorUserId);
  }

  async testAccount(
    accountId: string,
    sampleBody?: HousingPayload,
    actorUserId?: string,
  ) {
    const account = await this.connections.getAccount('housing', accountId);
    try {
      const result = await this.ingestWebhook(
        account.webhookKeyId,
        sampleBody || defaultHousingSamplePayload,
      );
      await this.connections.recordTest(account.id, 'Success', actorUserId);
      return {
        ...result,
        message: 'Test Housing.com lead ingested successfully',
      };
    } catch (error) {
      await this.connections.recordTest(account.id, 'Failed', actorUserId);
      throw error;
    }
  }
}
