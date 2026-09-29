import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { CrmService } from './crm.service';

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

@Injectable()
export class HousingIntegrationsService {
  private readonly logger = new Logger(HousingIntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmService,
  ) {}

  private db() {
    return this.prisma as any;
  }

  private async ensureHousingIntegrationTable() {
    await this.db().$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "HousingIntegration" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT,
        "webhookKeyId" TEXT NOT NULL UNIQUE,
        "apiKey" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "fieldMapping" JSONB,
        "lastWebhookReceivedAt" TIMESTAMP(3),
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.db().$executeRawUnsafe(`
      ALTER TABLE "HousingIntegration"
      ADD COLUMN IF NOT EXISTS "organizationId" TEXT
    `);
    await this.db().$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "HousingIntegration_org_idx"
      ON "HousingIntegration" ("organizationId")
    `);
  }

  async ensureHousingIntegration(actorUserId?: string, organizationId?: string) {
    await this.ensureHousingIntegrationTable();
    const orgId =
      organizationId ||
      (await this.crm.resolveTenantOrganizationId(actorUserId));

    let integration = orgId
      ? await this.db().housingIntegration.findFirst({
          where: { organizationId: orgId },
        })
      : await this.db().housingIntegration.findFirst();

    if (!integration) {
      integration = await this.db().housingIntegration.create({
        data: {
          organizationId: orgId ?? null,
          webhookKeyId: randomBytes(12).toString('hex'),
          isActive: true,
          fieldMapping: defaultHousingFieldMapping,
          createdById: actorUserId,
        },
      });
    } else if (orgId && !integration.organizationId) {
      integration = await this.db().housingIntegration.update({
        where: { id: integration.id },
        data: { organizationId: orgId },
      });
    }
    return integration;
  }

  async getHousingIntegration(actorUserId?: string, organizationId?: string) {
    const integration = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    const webhookUrl = `https://crmtrueroot.com/api/v1/public/webhooks/housing/${integration.webhookKeyId}`;

    const housingSourceMaster = await this.db().leadMasterValue.findFirst({
      where: {
        name: { equals: 'Housing.com', mode: 'insensitive' },
        categoryRef: { code: 'source' },
      },
    });

    const sourceFilters = [
      housingSourceMaster?.id,
      housingSourceMaster?.code,
      housingSourceMaster?.name,
      'Housing.com',
      'HOUSING',
      'housing',
    ].filter(Boolean);

    const whereClause: any = {
      deletedAt: null,
      sourceId: { in: sourceFilters },
    };
    if (integration.organizationId) {
      whereClause.organizationId = integration.organizationId;
    }

    const leadCount = await this.db().lead.count({
      where: whereClause,
    });

    return {
      ...integration,
      webhookUrl,
      fieldMapping: integration.fieldMapping || defaultHousingFieldMapping,
      leadCount,
      samplePayload: defaultHousingSamplePayload,
    };
  }

  async saveHousingIntegration(
    body: { isActive?: boolean; apiKey?: string },
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    return this.db().housingIntegration.update({
      where: { id: integration.id },
      data: {
        isActive: body.isActive ?? integration.isActive,
        apiKey:
          body.apiKey !== undefined ? body.apiKey.trim() : integration.apiKey,
      },
    });
  }

  async regenerateWebhookKey(actorUserId?: string, organizationId?: string) {
    const integration = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    return this.db().housingIntegration.update({
      where: { id: integration.id },
      data: {
        webhookKeyId: randomBytes(12).toString('hex'),
      },
    });
  }

  async saveFieldMapping(
    fieldMapping: any,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    return this.db().housingIntegration.update({
      where: { id: integration.id },
      data: {
        fieldMapping: fieldMapping || defaultHousingFieldMapping,
      },
    });
  }

  async ingestWebhook(keyId: string, body: any) {
    await this.ensureHousingIntegrationTable();
    const integration = await this.db().housingIntegration.findUnique({
      where: { webhookKeyId: keyId },
    });

    if (!integration) {
      throw new NotFoundException('Housing.com webhook endpoint not found');
    }

    if (!integration.isActive) {
      this.logger.log(
        `[HousingWebhook] skipped webhook for keyId=${keyId}: integration is paused`,
      );
      return {
        success: true,
        message: 'Housing.com integration is currently paused',
        status: 'PAUSED',
      };
    }

    const payload = body || {};
    const mapping =
      (integration.fieldMapping as any) || defaultHousingFieldMapping;

    const name =
      payload[mapping.Name] ||
      payload.name ||
      payload.full_name ||
      'Housing Lead';
    const phone =
      payload[mapping.Phone] ||
      payload.phone ||
      payload.mobile ||
      payload.contact_number;
    const email = payload[mapping.Email] || payload.email;

    if (!phone && !email) {
      throw new BadRequestException(
        'Phone or email is required in Housing.com payload',
      );
    }

    const projectName =
      payload[mapping.ProjectName] ||
      payload.project_name ||
      payload.property_name;
    const locality = payload[mapping.Locality] || payload.locality;
    const city = payload[mapping.City] || payload.city;
    const budget = payload[mapping.Budget] || payload.budget;
    const remarks =
      payload[mapping.Remarks] || payload.remarks || payload.comment;

    let housingSourceMaster = await this.db().leadMasterValue.findFirst({
      where: {
        name: { equals: 'Housing.com', mode: 'insensitive' },
        categoryRef: { code: 'source' },
      },
    });

    if (!housingSourceMaster) {
      const sourceCat = await this.db().leadMasterCategory.upsert({
        where: { code: 'source' },
        update: {},
        create: { code: 'source', name: 'Lead Source Master' },
      });
      housingSourceMaster = await this.db().leadMasterValue.create({
        data: {
          categoryId: sourceCat.id,
          name: 'Housing.com',
          code: 'HOUSING',
          description: 'Marketplace portal leads from Housing.com',
          group: 'Portal',
          statusType: 'Custom',
          isActive: true,
          autoAssignActive: true,
        },
      });
    }

    const createdLead = await this.crm.createLead({
      organizationId: integration.organizationId ?? undefined,
      name: String(name).trim(),
      phone: phone ? String(phone).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      source: 'Housing.com',
      sourceId: housingSourceMaster.id,
      requirement: {
        preferredLocation:
          [locality, city].filter(Boolean).join(', ') || undefined,
        budget: budget ? String(budget) : undefined,
        notes: [
          projectName ? `Project: ${projectName}` : null,
          remarks ? `Remarks: ${remarks}` : null,
        ]
          .filter(Boolean)
          .join('\n'),
      },
    });

    await this.db().housingIntegration.update({
      where: { id: integration.id },
      data: { lastWebhookReceivedAt: new Date() },
    });

    return {
      success: true,
      message: 'Housing.com lead ingested successfully',
      leadId: createdLead.id,
      organizationId: integration.organizationId,
    };
  }

  async testIntegration(
    sampleBody?: any,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureHousingIntegration(
      actorUserId,
      organizationId,
    );
    const result = await this.ingestWebhook(
      integration.webhookKeyId,
      sampleBody || defaultHousingSamplePayload,
    );
    return {
      ...result,
      message: 'Test Housing.com lead ingested successfully',
    };
  }
}
