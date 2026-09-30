import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WhatsAppProviderMode } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import type { TenantContextPayload } from '../../common/tenant/tenant-context.service';
import {
  DEFAULT_NOTIFICATION_EVENT_SETTINGS,
  DEFAULT_WHATSAPP_CUSTOM_HOST,
  SUPPORTED_WHATSAPP_EVENT_SET,
  type NotificationEventSetting,
} from './notification.constants';
import {
  UpdateNotificationSettingsDto,
  UpdateWhatsAppConfigDto,
  WhatsAppDeliveriesQueryDto,
} from './notification.dto';
import { WhatsAppCredentialService } from './whatsapp-credential.service';

export interface ResolvedWhatsAppProvider {
  mode: WhatsAppProviderMode;
  apiUrl: string;
  apiKey: string;
  senderNumber: string;
  templateLanguage: string;
}

@Injectable()
export class TenantNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly credentials: WhatsAppCredentialService,
  ) {}

  async getSettings(tenant: TenantContextPayload) {
    this.assertCanView(tenant);
    const settings = await this.getOrCreateSettings(tenant.organizationId);
    return {
      id: settings.id,
      organizationId: tenant.organizationId,
      globalFcmEnabled: settings.globalFcmEnabled,
      globalWhatsAppEnabled: settings.globalWhatsAppEnabled,
      eventSettings: this.normalizeEventSettings(settings.eventSettings),
      updatedAt: settings.updatedAt,
      updatedById: settings.updatedById,
      canManage: this.canManage(tenant),
    };
  }

  async updateSettings(
    tenant: TenantContextPayload,
    dto: UpdateNotificationSettingsDto,
  ) {
    this.assertCanManage(tenant);
    const current = await this.getOrCreateSettings(tenant.organizationId);
    const eventSettings = this.normalizeEventSettings(current.eventSettings);

    if (dto.eventSettings) {
      for (const [key, value] of Object.entries(dto.eventSettings)) {
        if (!(key in DEFAULT_NOTIFICATION_EVENT_SETTINGS)) {
          throw new BadRequestException(
            `Unsupported notification event: ${key}`,
          );
        }
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          throw new BadRequestException(`Invalid notification event: ${key}`);
        }
        const unsupportedFields = Object.keys(value).filter(
          (field) => field !== 'fcmEnabled' && field !== 'whatsappEnabled',
        );
        if (
          unsupportedFields.length > 0 ||
          (value.fcmEnabled !== undefined &&
            typeof value.fcmEnabled !== 'boolean') ||
          (value.whatsappEnabled !== undefined &&
            typeof value.whatsappEnabled !== 'boolean')
        ) {
          throw new BadRequestException(`Invalid notification event: ${key}`);
        }
        const currentValue = eventSettings[key];
        eventSettings[key] = {
          fcmEnabled:
            typeof value.fcmEnabled === 'boolean'
              ? value.fcmEnabled
              : currentValue.fcmEnabled,
          whatsappEnabled: SUPPORTED_WHATSAPP_EVENT_SET.has(key)
            ? typeof value.whatsappEnabled === 'boolean'
              ? value.whatsappEnabled
              : currentValue.whatsappEnabled
            : false,
        };
      }
    }

    const whatsappWillBeEnabled =
      dto.globalWhatsAppEnabled ?? current.globalWhatsAppEnabled;
    if (
      whatsappWillBeEnabled &&
      !(await this.resolveProvider(tenant.organizationId))
    ) {
      throw new BadRequestException(
        'Configure a ready WhatsApp provider before enabling the channel',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.notificationSetting.update({
        where: { organizationId: tenant.organizationId },
        data: {
          globalFcmEnabled: dto.globalFcmEnabled ?? current.globalFcmEnabled,
          globalWhatsAppEnabled:
            dto.globalWhatsAppEnabled ?? current.globalWhatsAppEnabled,
          eventSettings: eventSettings as unknown as Prisma.InputJsonValue,
          updatedById: tenant.userId ?? null,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId: tenant.userId ?? null,
          action: 'NOTIFICATION_SETTINGS_UPDATED',
          entityType: 'NotificationSetting',
          entityId: row.id,
          metadata: {
            globalFcmEnabled: row.globalFcmEnabled,
            globalWhatsAppEnabled: row.globalWhatsAppEnabled,
          },
        },
      });
      return row;
    });

    return {
      id: updated.id,
      organizationId: tenant.organizationId,
      globalFcmEnabled: updated.globalFcmEnabled,
      globalWhatsAppEnabled: updated.globalWhatsAppEnabled,
      eventSettings,
      updatedAt: updated.updatedAt,
      updatedById: updated.updatedById,
      canManage: true,
    };
  }

  async isChannelEnabled(
    organizationId: string,
    channel: 'fcm' | 'whatsapp',
    eventKey?: string,
  ): Promise<boolean> {
    const settings = await this.getOrCreateSettings(organizationId);
    if (
      channel === 'fcm'
        ? !settings.globalFcmEnabled
        : !settings.globalWhatsAppEnabled
    ) {
      return false;
    }
    if (!eventKey) return true;
    if (channel === 'whatsapp' && !SUPPORTED_WHATSAPP_EVENT_SET.has(eventKey)) {
      return false;
    }
    const events = this.normalizeEventSettings(settings.eventSettings);
    const event = events[eventKey];
    if (!event) return channel === 'fcm';
    return channel === 'fcm' ? event.fcmEnabled : event.whatsappEnabled;
  }

  async getWhatsAppConfig(tenant: TenantContextPayload) {
    this.assertCanView(tenant);
    const row = await this.prisma.organizationWhatsAppConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    const mode = row?.providerMode ?? WhatsAppProviderMode.PLATFORM;
    const hasCustomApiKey = Boolean(row?.encryptedCustomApiKey);
    const readiness = this.readiness(mode, row ?? undefined);
    const spectator = tenant.role === 'SUPER_ADMIN';
    return {
      organizationId: tenant.organizationId,
      providerMode: mode,
      ready: readiness.ready,
      readinessMessage: readiness.message,
      customApiUrl: spectator
        ? this.maskUrl(row?.customApiUrl)
        : row?.customApiUrl ?? '',
      customSenderNumber: spectator
        ? this.maskPhone(row?.customSenderNumber)
        : row?.customSenderNumber ?? '',
      customTemplateLanguage: row?.customTemplateLanguage ?? 'en',
      hasCustomApiKey,
      canManage: this.canManage(tenant),
      updatedAt: row?.updatedAt ?? null,
    };
  }

  async updateWhatsAppConfig(
    tenant: TenantContextPayload,
    dto: UpdateWhatsAppConfigDto,
  ) {
    this.assertCanManage(tenant);
    if (dto.customApiKey && dto.removeCustomApiKey) {
      throw new BadRequestException(
        'Provide a replacement token or remove the existing token, not both',
      );
    }
    const existing = await this.prisma.organizationWhatsAppConfig.findUnique({
      where: { organizationId: tenant.organizationId },
    });
    const customApiUrl =
      dto.customApiUrl === undefined
        ? existing?.customApiUrl ?? null
        : this.validateCustomApiUrl(dto.customApiUrl);
    const encryptedCustomApiKey = dto.customApiKey
      ? this.credentials.encrypt(dto.customApiKey.trim())
      : dto.removeCustomApiKey
      ? null
      : existing?.encryptedCustomApiKey ?? null;

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.organizationWhatsAppConfig.upsert({
        where: { organizationId: tenant.organizationId },
        create: {
          organizationId: tenant.organizationId,
          providerMode: dto.providerMode ?? WhatsAppProviderMode.PLATFORM,
          encryptedCustomApiKey,
          customApiUrl,
          customSenderNumber: dto.customSenderNumber ?? null,
          customTemplateLanguage: dto.customTemplateLanguage ?? 'en',
          createdById: tenant.userId ?? null,
          updatedById: tenant.userId ?? null,
        },
        update: {
          providerMode: dto.providerMode,
          encryptedCustomApiKey,
          customApiUrl,
          customSenderNumber: dto.customSenderNumber,
          customTemplateLanguage: dto.customTemplateLanguage,
          updatedById: tenant.userId ?? null,
        },
      });
      const readiness = this.readiness(updated.providerMode, updated);
      if (!readiness.ready) {
        await tx.notificationSetting.updateMany({
          where: { organizationId: tenant.organizationId },
          data: { globalWhatsAppEnabled: false },
        });
      }
      await tx.auditLog.create({
        data: {
          organizationId: tenant.organizationId,
          actorUserId: tenant.userId ?? null,
          action: 'WHATSAPP_CONFIG_UPDATED',
          entityType: 'OrganizationWhatsAppConfig',
          entityId: updated.id,
          metadata: {
            providerMode: updated.providerMode,
            customApiUrlChanged: dto.customApiUrl !== undefined,
            customSenderChanged: dto.customSenderNumber !== undefined,
            customApiKeyChanged:
              dto.customApiKey !== undefined || dto.removeCustomApiKey === true,
          },
        },
      });
      return updated;
    });

    return this.getWhatsAppConfig({ ...tenant, role: tenant.role });
  }

  async resolveProvider(
    organizationId: string,
  ): Promise<ResolvedWhatsAppProvider | null> {
    const row = await this.prisma.organizationWhatsAppConfig.findUnique({
      where: { organizationId },
    });
    const mode = row?.providerMode ?? WhatsAppProviderMode.PLATFORM;
    if (mode === WhatsAppProviderMode.CUSTOM_PINBOT) {
      if (
        !row?.encryptedCustomApiKey ||
        !row.customApiUrl ||
        !row.customSenderNumber
      ) {
        return null;
      }
      return {
        mode,
        apiUrl: this.validateCustomApiUrl(row.customApiUrl),
        apiKey: this.credentials.decrypt(row.encryptedCustomApiKey),
        senderNumber: row.customSenderNumber,
        templateLanguage: row.customTemplateLanguage || 'en',
      };
    }

    const apiUrl = String(
      this.config.get<string>('WHATSAPP_PLATFORM_API_URL') ??
        this.config.get<string>('WHATSAPP_API_URL') ??
        '',
    ).trim();
    const apiKey = String(
      this.config.get<string>('WHATSAPP_PLATFORM_API_KEY') ??
        this.config.get<string>('WHATSAPP_API_KEY') ??
        '',
    ).trim();
    const senderNumber = String(
      this.config.get<string>('WHATSAPP_PLATFORM_WABA_NUMBER') ??
        this.config.get<string>('WHATSAPP_WABA_NUMBER') ??
        '',
    ).trim();
    if (!apiUrl || !apiKey || !senderNumber) return null;
    return {
      mode,
      apiUrl,
      apiKey,
      senderNumber,
      templateLanguage:
        String(
          this.config.get<string>('WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE') ??
            this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ??
            'en',
        ).trim() || 'en',
    };
  }

  async templateLanguageForOrganization(
    organizationId: string,
  ): Promise<string> {
    const row = await this.prisma.organizationWhatsAppConfig.findUnique({
      where: { organizationId },
      select: { providerMode: true, customTemplateLanguage: true },
    });
    if (row?.providerMode === WhatsAppProviderMode.CUSTOM_PINBOT) {
      return row.customTemplateLanguage || 'en';
    }
    return (
      String(
        this.config.get<string>('WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE') ??
          this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE') ??
          'en',
      ).trim() || 'en'
    );
  }

  async listWhatsAppDeliveries(
    tenant: TenantContextPayload,
    query: WhatsAppDeliveriesQueryDto,
  ) {
    this.assertCanView(tenant);
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: Prisma.WhatsAppDispatchWhereInput = {
      organizationId: tenant.organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.event ? { eventKey: query.event } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.whatsAppDispatch.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          eventKey: true,
          templateName: true,
          recipientMasked: true,
          status: true,
          attemptCount: true,
          lastError: true,
          acceptedAt: true,
          failedAt: true,
          skippedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.whatsAppDispatch.count({ where }),
    ]);
    return { data: items, meta: { page, limit, total } };
  }

  canManage(tenant: TenantContextPayload): boolean {
    return (
      tenant.role !== 'SUPER_ADMIN' &&
      (tenant.isOwner === true || tenant.role === 'ADMIN')
    );
  }

  private assertCanManage(tenant: TenantContextPayload): void {
    if (!this.canManage(tenant)) {
      throw new ForbiddenException(
        'Tenant owners and administrators control notification settings',
      );
    }
  }

  private assertCanView(tenant: TenantContextPayload): void {
    if (tenant.role !== 'SUPER_ADMIN' && !this.canManage(tenant)) {
      throw new ForbiddenException(
        'Tenant owners and administrators can view notification settings',
      );
    }
  }

  private async getOrCreateSettings(organizationId: string) {
    return this.prisma.notificationSetting.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        globalFcmEnabled: true,
        globalWhatsAppEnabled: false,
        eventSettings:
          DEFAULT_NOTIFICATION_EVENT_SETTINGS as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private normalizeEventSettings(value: Prisma.JsonValue | null) {
    const stored =
      value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const normalized: Record<string, NotificationEventSetting> = {};
    for (const [key, defaults] of Object.entries(
      DEFAULT_NOTIFICATION_EVENT_SETTINGS,
    )) {
      const raw = stored[key];
      const item =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      normalized[key] = {
        fcmEnabled:
          typeof item.fcmEnabled === 'boolean'
            ? item.fcmEnabled
            : defaults.fcmEnabled,
        whatsappEnabled: SUPPORTED_WHATSAPP_EVENT_SET.has(key)
          ? typeof item.whatsappEnabled === 'boolean'
            ? item.whatsappEnabled
            : defaults.whatsappEnabled
          : false,
      };
    }
    return normalized;
  }

  private validateCustomApiUrl(value: string): string {
    let url: URL;
    try {
      url = new URL(value.trim());
    } catch {
      throw new BadRequestException(
        'Custom Pinbot endpoint must be a valid URL',
      );
    }
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new BadRequestException(
        'Custom Pinbot endpoint must use HTTPS without embedded credentials',
      );
    }
    const allowedHosts = String(
      this.config.get<string>('WHATSAPP_CUSTOM_API_HOST_ALLOWLIST') ??
        DEFAULT_WHATSAPP_CUSTOM_HOST,
    )
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (!allowedHosts.includes(url.hostname.toLowerCase())) {
      throw new BadRequestException(
        'Custom Pinbot endpoint host is not allowlisted',
      );
    }
    return url.toString();
  }

  private readiness(
    mode: WhatsAppProviderMode,
    row?: {
      encryptedCustomApiKey: string | null;
      customApiUrl: string | null;
      customSenderNumber: string | null;
    },
  ) {
    if (mode === WhatsAppProviderMode.CUSTOM_PINBOT) {
      const ready = Boolean(
        row?.encryptedCustomApiKey &&
          row.customApiUrl &&
          row.customSenderNumber &&
          this.credentials.isConfigured(),
      );
      return {
        ready,
        message: ready
          ? 'Custom Pinbot sender is ready'
          : 'Add a valid endpoint, sender number, token, and encryption key',
      };
    }
    const ready = Boolean(
      String(
        this.config.get<string>('WHATSAPP_PLATFORM_API_URL') ??
          this.config.get<string>('WHATSAPP_API_URL') ??
          '',
      ).trim() &&
        String(
          this.config.get<string>('WHATSAPP_PLATFORM_API_KEY') ??
            this.config.get<string>('WHATSAPP_API_KEY') ??
            '',
        ).trim() &&
        String(
          this.config.get<string>('WHATSAPP_PLATFORM_WABA_NUMBER') ??
            this.config.get<string>('WHATSAPP_WABA_NUMBER') ??
            '',
        ).trim(),
    );
    return {
      ready,
      message: ready
        ? 'Platform sender is ready'
        : 'Platform sender credentials are not configured',
    };
  }

  private maskUrl(value?: string | null): string {
    if (!value) return '';
    try {
      const url = new URL(value);
      return `${url.protocol}//${url.hostname}/****`;
    } catch {
      return '****';
    }
  }

  private maskPhone(value?: string | null): string {
    if (!value) return '';
    return `******${value.slice(-4)}`;
  }
}
