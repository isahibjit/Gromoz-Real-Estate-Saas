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
  const email = { sendPlatformEmail: jest.fn() };
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
    expect(email.sendPlatformEmail).toHaveBeenCalledWith(
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
            where: { isActive: true, isOwner: true, user: { isActive: true } },
            select: { user: { select: { email: true, fullName: true } } },
          },
        }),
      }),
    );
  });

  it('queries unpaid expired trials, with a 14-day fallback only for legacy TRIAL records', async () => {
    prisma.organization.findMany.mockResolvedValue([]);
    await worker.dispatchDueReminders(now);
    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          setupFeePaid: false,
          OR: [
            {
              status: { in: ['TRIAL', 'SETUP_PENDING', 'PAST_DUE'] },
              trialEndsAt: { lte: now },
            },
            {
              status: 'TRIAL',
              trialEndsAt: null,
              createdAt: { lte: new Date('2026-10-03T12:00:00Z') },
            },
          ],
        },
      }),
    );
    expect(email.sendPlatformEmail).not.toHaveBeenCalled();
  });

  it('does not resend a successfully logged reminder after a worker restart', async () => {
    prisma.emailLog.findFirst.mockResolvedValue({ id: 'sent-log' });
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 0,
    });
    expect(redis.set).not.toHaveBeenCalled();
    expect(email.sendPlatformEmail).not.toHaveBeenCalled();
  });

  it('does not send while another worker holds the recipient lock', async () => {
    redis.set.mockResolvedValue(null);
    await worker.dispatchDueReminders(now);
    expect(email.sendPlatformEmail).not.toHaveBeenCalled();
  });

  it('checks for payment or cancellation again immediately before sending', async () => {
    prisma.organization.findFirst
      .mockResolvedValueOnce(organization)
      .mockResolvedValueOnce(null);
    await expect(worker.dispatchDueReminders(now)).resolves.toEqual({
      sent: 0,
    });
    expect(email.sendPlatformEmail).not.toHaveBeenCalled();
  });

  it('does not mark a failed SMTP attempt as successfully reminded and can retry later', async () => {
    email.sendPlatformEmail.mockRejectedValueOnce(
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
    expect(email.sendPlatformEmail).toHaveBeenCalledTimes(1);
  });

  it('does not mail a salesperson or guess a recipient for an ownerless workspace', async () => {
    prisma.organization.findFirst.mockResolvedValueOnce({
      ...organization,
      memberships: [],
    });
    await worker.dispatchDueReminders(now);
    expect(email.sendPlatformEmail).not.toHaveBeenCalled();
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
