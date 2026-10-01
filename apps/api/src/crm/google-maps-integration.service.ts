import { ForbiddenException, Injectable } from '@nestjs/common';
import type { OrganizationGoogleMapsConfig } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { GoogleMapsCredentialService } from './google-maps-credential.service';

@Injectable()
export class GoogleMapsIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantAccessService,
    private readonly tenantContext: TenantContextService,
    private readonly credentials: GoogleMapsCredentialService,
  ) {}

  async getMetadata() {
    this.assertCanManage();
    const row = await this.findCurrentTenantConfig();
    return this.toMetadata(row);
  }

  async getRuntimeConfig() {
    const row = await this.findCurrentTenantConfig();
    if (!row) return { configured: false, apiKey: null };
    return {
      configured: true,
      apiKey: this.credentials.decrypt(row.encryptedApiKey),
    };
  }

  async save(apiKey: string, actorUserId: string) {
    this.assertCanManage();
    const organizationId = this.tenants.organizationId;
    const encryptedApiKey = this.credentials.encrypt(apiKey);
    const keyLastFour = apiKey.slice(-4);

    const row = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.organizationGoogleMapsConfig.findUnique({
        where: { organizationId },
        select: { id: true },
      });
      const config = await tx.organizationGoogleMapsConfig.upsert({
        where: { organizationId },
        update: { encryptedApiKey, keyLastFour, updatedById: actorUserId },
        create: {
          organizationId,
          encryptedApiKey,
          keyLastFour,
          updatedById: actorUserId,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          action: existing
            ? 'GOOGLE_MAPS_CONFIG_REPLACED'
            : 'GOOGLE_MAPS_CONFIG_CREATED',
          entityType: 'OrganizationGoogleMapsConfig',
          entityId: config.id,
          metadata: { keyLastFour },
        },
      });
      return config;
    });

    return this.toMetadata(row);
  }

  async remove(actorUserId: string) {
    this.assertCanManage();
    const organizationId = this.tenants.organizationId;
    const existing = await this.findCurrentTenantConfig();
    if (!existing) return this.toMetadata(null);

    await this.prisma.$transaction(async (tx) => {
      await tx.organizationGoogleMapsConfig.delete({
        where: { organizationId },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          action: 'GOOGLE_MAPS_REMOVED',
          entityType: 'OrganizationGoogleMapsConfig',
          entityId: existing.id,
          metadata: { keyLastFour: existing.keyLastFour },
        },
      });
    });

    return this.toMetadata(null);
  }

  private findCurrentTenantConfig() {
    // Exact tenant ownership is required; legacy rows never participate here.
    return this.prisma.organizationGoogleMapsConfig.findUnique({
      where: { organizationId: this.tenants.organizationId },
      select: {
        id: true,
        organizationId: true,
        encryptedApiKey: true,
        keyLastFour: true,
        updatedById: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private assertCanManage() {
    const role = this.tenantContext.getTenant()?.role;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only workspace administrators can manage Google Maps',
      );
    }
  }

  private toMetadata(row: OrganizationGoogleMapsConfig | null) {
    return {
      configured: Boolean(row),
      keyHint: row ? `****${row.keyLastFour}` : null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
    };
  }
}
