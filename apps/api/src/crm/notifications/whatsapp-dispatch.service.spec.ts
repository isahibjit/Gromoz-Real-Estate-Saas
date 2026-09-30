import { ConfigService } from '@nestjs/config';
import { WhatsAppDispatchStatus } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { PinbotWhatsAppService } from './pinbot-whatsapp.service';
import { TenantNotificationService } from './tenant-notification.service';
import { WhatsAppDispatchService } from './whatsapp-dispatch.service';

describe('WhatsAppDispatchService', () => {
  const baseDispatch = {
    id: 'dispatch-1',
    organizationId: 'tenant-a',
    notificationId: 'notification-1',
    recipientUserId: 'user-1',
    eventKey: 'announcement',
    templateName: 'trueroot_announcement',
    templateLanguage: 'en',
    templateParameters: ['Employee', 'Title', 'Message'],
    recipientMasked: null,
    status: WhatsAppDispatchStatus.QUEUED,
    attemptCount: 0,
    availableAt: new Date(0),
    leaseExpiresAt: null,
    lockedBy: null,
    providerMessageId: null,
    lastError: null,
    acceptedAt: null,
    failedAt: null,
    skippedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };

  let prisma: {
    whatsAppDispatch: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
    whatsAppDispatchAttempt: { create: jest.Mock };
    user: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let settings: {
    isChannelEnabled: jest.Mock;
    resolveProvider: jest.Mock;
    templateLanguageForOrganization: jest.Mock;
  };
  let pinbot: { send: jest.Mock };
  let service: WhatsAppDispatchService;

  beforeEach(() => {
    prisma = {
      whatsAppDispatch: {
        findMany: jest.fn().mockResolvedValue([baseDispatch]),
        findUnique: jest.fn().mockResolvedValue(baseDispatch),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn(),
      },
      whatsAppDispatchAttempt: { create: jest.fn().mockResolvedValue({}) },
      user: { findFirst: jest.fn() },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
    };
    settings = {
      isChannelEnabled: jest.fn().mockResolvedValue(true),
      resolveProvider: jest.fn().mockResolvedValue({
        mode: 'CUSTOM_PINBOT',
        apiUrl: 'https://partnersv1.pinbot.ai/v3/sender/messages',
        apiKey: 'custom-tenant-secret',
        senderNumber: '919876543210',
        templateLanguage: 'en',
      }),
      templateLanguageForOrganization: jest.fn().mockResolvedValue('en'),
    };
    pinbot = { send: jest.fn() };
    service = new WhatsAppDispatchService(
      prisma as unknown as PrismaService,
      { get: jest.fn().mockReturnValue('') } as unknown as ConfigService,
      settings as unknown as TenantNotificationService,
      pinbot as unknown as PinbotWhatsAppService,
    );
  });

  it('skips a recipient who is not an active exclusive tenant staff member', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.dispatchPending()).resolves.toBe(1);

    expect(pinbot.send).not.toHaveBeenCalled();
    expect(prisma.whatsAppDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: baseDispatch.id },
        data: expect.objectContaining({
          status: WhatsAppDispatchStatus.SKIPPED,
        }),
      }),
    );
  });

  it('normalizes an Indian staff number and retries a throttled request', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      employeeProfile: { phone: '98765 43210' },
    });
    pinbot.send.mockResolvedValue({
      accepted: false,
      retryable: true,
      httpStatus: 429,
      errorCode: '429',
      errorMessage: 'Retry later; token=custom-tenant-secret',
    });

    await service.dispatchPending();

    expect(pinbot.send).toHaveBeenCalledWith(
      expect.objectContaining({ recipientNumber: '919876543210' }),
    );
    expect(prisma.whatsAppDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WhatsAppDispatchStatus.RETRYING,
          attemptCount: 1,
          lastError: 'Retry later; token=[redacted]',
        }),
      }),
    );
  });

  it('stops after the fifth failed attempt', async () => {
    const lastAttempt = { ...baseDispatch, attemptCount: 4 };
    prisma.whatsAppDispatch.findMany.mockResolvedValue([lastAttempt]);
    prisma.whatsAppDispatch.findUnique.mockResolvedValue(lastAttempt);
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      employeeProfile: { phone: '919876543210' },
    });
    pinbot.send.mockResolvedValue({
      accepted: false,
      retryable: true,
      httpStatus: 503,
      errorMessage: 'Provider unavailable',
    });

    await service.dispatchPending();

    expect(prisma.whatsAppDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: WhatsAppDispatchStatus.FAILED,
          attemptCount: 5,
          failedAt: expect.any(Date),
        }),
      }),
    );
  });
});
