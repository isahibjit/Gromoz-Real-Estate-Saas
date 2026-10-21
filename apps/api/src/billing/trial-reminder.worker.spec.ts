import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import {
  buildTrialPaymentReminder,
  TrialReminderWorker,
} from './trial-reminder.worker';

describe('Trial payment reminders', () => {
  const now = new Date('2026-10-17T12:00:00Z');
  const trialEndsAt = new Date('2026-10-17T11:00:00Z');
  const prisma = {
    organization: { findMany: jest.fn(), findFirst: jest.fn() },
    emailLog: { findFirst: jest.fn() },
  };
  const email = { sendTenantPlatformEmail: jest.fn() };
  const redis = { set: jest.fn() };
  let worker: TrialReminderWorker;
  const organization = {
    id: 'tenant-a',
    name: 'Tenant A',
    trialEndsAt,
    createdAt: new Date('2026-10-03T11:00:00Z'),
    memberships: [
      { user: { email: 'owner-a@example.test', fullName: 'Owner A' } },
    ],
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    prisma.organization.findMany.mockResolvedValue([{ id: organization.id }]);
    prisma.organization.findFirst.mockImplementation(
      async (query: { select: { name?: boolean } }) =>
        query.select.name ? organization : { id: organization.id },
    );
    redis.set.mockResolvedValue('OK');
    const module = await Test.createTestingModule({
      providers: [
        TrialReminderWorker,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailConnectorsService, useValue: email },
        { provide: RedisService, useValue: { getClient: () => redis } },
        {
          provide: ConfigService,
          useValue: new ConfigService({ BILLING_REMINDERS_ENABLED: false }),
        },
      ],
    }).compile();
    worker = module.get(TrialReminderWorker);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sends a workspace-specific reminder to its active owner through platform SMTP', async () => {
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 1,
    });
    expect(email.sendTenantPlatformEmail).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({
        to: 'owner-a@example.test',
        entityType: 'TrialPaymentReminder',
        entityId: `tenant-a:${trialEndsAt.toISOString()}`,
        subject: 'Payment reminder: Tenant A trial has ended',
      }),
    );
    expect(prisma.organization.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          memberships: {
            where: {
              isActive: true,
              isOwner: true,
              user: { isActive: true, role: { not: 'SUPER_ADMIN' } },
            },
            select: { user: { select: { email: true, fullName: true } } },
          },
        }),
      }),
    );
  });

  it('queries only eligible workspaces with trial or paid-plan deadlines', async () => {
    prisma.organization.findMany.mockResolvedValue([]);
    await worker.dispatchDueReminders(now);
    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            expect.objectContaining({
              setupFeePaid: false,
              trialEndsAt: { lte: new Date('2026-10-31T12:00:00Z') },
            }),
            expect.objectContaining({
              setupFeePaid: true,
              status: { in: ['ACTIVE', 'PAST_DUE'] },
              currentPeriodEnd: { lte: new Date('2026-10-31T12:00:00Z') },
            }),
          ]),
        },
      }),
    );
  });

  it.each([14, 7, 3, 1])(
    'sends a paid-plan reminder %i days before renewal',
    async (days) => {
      const deadline = new Date(now.getTime() + days * 86400000);
      prisma.organization.findFirst.mockResolvedValueOnce({
        ...organization,
        setupFeePaid: true,
        currentPeriodEnd: deadline,
        status: 'ACTIVE',
      });
      await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
        sent: 1,
      });
      expect(email.sendTenantPlatformEmail).toHaveBeenCalledWith(
        'tenant-a',
        expect.objectContaining({
          entityType: 'SubscriptionRenewalReminder',
          entityId: `tenant-a:${deadline.toISOString()}:${days}`,
        }),
      );
    },
  );

  it('does not email between reminder milestones', async () => {
    prisma.organization.findFirst.mockResolvedValueOnce({
      ...organization,
      trialEndsAt: new Date(now.getTime() + 6 * 86400000),
    });
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 0,
    });
    expect(email.sendTenantPlatformEmail).not.toHaveBeenCalled();
  });

  it('does not resend a successfully logged reminder after a worker restart', async () => {
    prisma.emailLog.findFirst.mockResolvedValue({ id: 'sent-log' });
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 0,
    });
    expect(redis.set).not.toHaveBeenCalled();
    expect(email.sendTenantPlatformEmail).not.toHaveBeenCalled();
  });

  it('does not send while another worker holds the recipient lock', async () => {
    redis.set.mockResolvedValue(null);
    await worker.dispatchDueReminders(now);
    expect(email.sendTenantPlatformEmail).not.toHaveBeenCalled();
  });

  it('checks for payment or cancellation again immediately before sending', async () => {
    prisma.organization.findFirst
      .mockResolvedValueOnce(organization)
      .mockResolvedValueOnce(null);
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 0,
    });
    expect(email.sendTenantPlatformEmail).not.toHaveBeenCalled();
  });

  it('does not mark a failed SMTP attempt as successfully reminded and can retry later', async () => {
    email.sendTenantPlatformEmail.mockRejectedValueOnce(
      new Error('SMTP unavailable'),
    );
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 0,
    });
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 1,
    });
    expect(prisma.emailLog.findFirst).toHaveBeenCalledTimes(2);
  });

  it('normalizes and deduplicates owner email addresses', async () => {
    prisma.organization.findFirst.mockResolvedValueOnce({
      ...organization,
      memberships: [
        { user: { email: 'owner-a@example.test', fullName: 'Owner A' } },
        { user: { email: 'OWNER-A@example.test ', fullName: 'Owner A' } },
      ],
    });
    await worker.dispatchDueReminders(now);
    expect(email.sendTenantPlatformEmail).toHaveBeenCalledTimes(1);
  });

  it('does not mail a salesperson or guess a recipient for an ownerless workspace', async () => {
    prisma.organization.findFirst.mockResolvedValueOnce({
      ...organization,
      memberships: [],
    });
    await worker.dispatchDueReminders(now);
    expect(email.sendTenantPlatformEmail).not.toHaveBeenCalled();
  });

  it('does not start background sends unless explicitly enabled', () => {
    worker.onModuleInit();
    expect(prisma.organization.findMany).not.toHaveBeenCalled();
    worker.onModuleDestroy();
  });

  it('escapes untrusted owner and workspace names in the HTML template', () => {
    const message = buildTrialPaymentReminder({
      workspaceName: '<img src=x onerror=alert(1)>',
      ownerName: 'Owner <script>',
      trialEndsAt,
    });
    expect(message.html).not.toContain('<script>');
    expect(message.html).not.toContain('<img');
    expect(message.html).toContain('&lt;img');
    expect(message.text).toContain(
      'Please reply to this email for payment assistance',
    );
  });
});
