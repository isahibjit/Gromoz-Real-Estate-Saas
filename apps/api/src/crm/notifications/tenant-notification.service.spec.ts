import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppProviderMode } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { TenantNotificationService } from './tenant-notification.service';
import { WhatsAppCredentialService } from './whatsapp-credential.service';

describe('TenantNotificationService', () => {
  let prisma: {
    notificationSetting: { upsert: jest.Mock };
    organizationWhatsAppConfig: { findUnique: jest.Mock };
  };
  let config: { get: jest.Mock };
  let credentials: { decrypt: jest.Mock; isConfigured: jest.Mock };
  let service: TenantNotificationService;

  beforeEach(() => {
    prisma = {
      notificationSetting: {
        upsert: jest.fn().mockResolvedValue({
          id: 'settings-1',
          organizationId: 'tenant-1',
          globalFcmEnabled: true,
          globalWhatsAppEnabled: false,
          eventSettings: {},
        }),
      },
      organizationWhatsAppConfig: { findUnique: jest.fn() },
    };
    config = { get: jest.fn().mockReturnValue('') };
    credentials = {
      decrypt: jest.fn().mockReturnValue('custom-secret'),
      isConfigured: jest.fn().mockReturnValue(true),
    };
    service = new TenantNotificationService(
      prisma as unknown as PrismaService,
      config as unknown as ConfigService,
      credentials as unknown as WhatsAppCredentialService,
    );
  });

  it('never falls back to platform credentials for incomplete custom mode', async () => {
    prisma.organizationWhatsAppConfig.findUnique.mockResolvedValue({
      providerMode: WhatsAppProviderMode.CUSTOM_PINBOT,
      encryptedCustomApiKey: null,
      customApiUrl: 'https://partnersv1.pinbot.ai/v3/sender/messages',
      customSenderNumber: '919876543210',
      customTemplateLanguage: 'en',
    });
    config.get.mockImplementation((key: string) =>
      key.startsWith('WHATSAPP_PLATFORM_') ? 'platform-value' : '',
    );

    await expect(service.resolveProvider('tenant-1')).resolves.toBeNull();
    expect(credentials.decrypt).not.toHaveBeenCalled();
  });

  it('rejects enabling WhatsApp until the selected tenant provider is ready', async () => {
    prisma.organizationWhatsAppConfig.findUnique.mockResolvedValue(null);

    await expect(
      service.updateSettings(
        {
          organizationId: 'tenant-1',
          userId: 'admin-1',
          role: 'ADMIN',
        },
        { globalWhatsAppEnabled: true },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
