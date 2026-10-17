import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { DEFAULT_TRIAL_DAYS } from './billing.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_TYPE = 'TrialPaymentReminder';

export function buildTrialPaymentReminder(options: {
  workspaceName: string;
  ownerName: string;
  trialEndsAt: Date;
}) {
  const endedOn = options.trialEndsAt.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const subject = `Payment reminder: ${options.workspaceName} trial has ended`;
  const text = `Hello ${
    options.ownerName || 'there'
  },\n\nYour Gromoze trial for ${
    options.workspaceName
  } ended on ${endedOn}. Payment is now due to continue your workspace subscription.\n\nPlease reply to this email for payment assistance. If you have just paid, please allow time for your payment to be confirmed.\n\nThank you,\nGromoze`;
  const escapeHtml = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[character] || character,
    );
  return {
    subject,
    text,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6">
      <h2>Gromoze · Trial payment reminder</h2>
      <p>Hello ${escapeHtml(options.ownerName || 'there')},</p>
      <p>Your trial for <strong>${escapeHtml(
        options.workspaceName,
      )}</strong> ended on ${endedOn}.</p>
      <p>Payment is now due to continue your workspace subscription.</p>
      <p>Please reply to this email for payment assistance. If you have just paid, please allow time for your payment to be confirmed.</p>
      <p>Thank you,<br>Gromoze</p>
    </div>`,
  };
}

@Injectable()
export class TrialReminderWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrialReminderWorker.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailConnectorsService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    if (!this.config.get<boolean>('BILLING_REMINDERS_ENABLED')) return;
    const interval =
      this.config.get<number>('BILLING_REMINDER_INTERVAL_MS') ?? 3600000;
    this.timer = setInterval(() => void this.tick(), interval);
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.dispatchDueReminders();
    } catch {
      this.logger.error(
        'Trial reminder scan failed; check database, Redis and SMTP availability.',
      );
    } finally {
      this.running = false;
    }
  }

  async dispatchDueReminders(now = new Date()) {
    const due: Prisma.OrganizationWhereInput = {
      setupFeePaid: false,
      OR: [
        {
          status: { in: ['TRIAL', 'SETUP_PENDING', 'PAST_DUE'] },
          trialEndsAt: { lte: now },
        },
        // Older trial records predate trialEndsAt being populated.
        {
          status: 'TRIAL',
          trialEndsAt: null,
          createdAt: {
            lte: new Date(now.getTime() - DEFAULT_TRIAL_DAYS * DAY_MS),
          },
        },
      ],
    };
    let cursor: string | undefined;
    let sent = 0;
    do {
      const organizations = await this.prisma.organization.findMany({
        where: due,
        select: { id: true },
        orderBy: { id: 'asc' },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!organizations.length) break;
      for (const { id } of organizations) {
        const organization = await this.prisma.organization.findFirst({
          where: { ...due, id },
          select: {
            id: true,
            name: true,
            trialEndsAt: true,
            createdAt: true,
            memberships: {
              where: {
                isActive: true,
                isOwner: true,
                user: { isActive: true },
              },
              select: { user: { select: { email: true, fullName: true } } },
            },
          },
        });
        if (!organization) continue;
        const trialEndsAt =
          organization.trialEndsAt ??
          new Date(
            organization.createdAt.getTime() + DEFAULT_TRIAL_DAYS * DAY_MS,
          );
        const entityId = `${id}:${trialEndsAt.toISOString()}`;
        const recipients = new Map(
          organization.memberships.map(({ user }) => [
            user.email.trim().toLowerCase(),
            user.fullName,
          ]),
        );
        for (const [to, ownerName] of recipients) {
          try {
            const alreadySent = await this.prisma.emailLog.findFirst({
              where: {
                entityType: REMINDER_TYPE,
                entityId,
                recipient: to,
                status: 'Sent',
              },
              select: { id: true },
            });
            if (alreadySent) continue;
            const lock = createHash('sha256')
              .update(`${entityId}:${to}`)
              .digest('hex');
            // Bounded SMTP timeouts fit within this lock. Leave it to expire so
            // failed attempts also have a cooldown; successful sends use durable logs.
            const acquired = await this.redis
              .getClient()
              .set(
                `billing:trial-reminder:${lock}`,
                'sending',
                'EX',
                300,
                'NX',
              );
            if (!acquired) continue;
            // Payment or cancellation may have happened while this batch was queued.
            const stillDue = await this.prisma.organization.findFirst({
              where: { ...due, id },
              select: { id: true },
            });
            if (!stillDue) continue;
            await this.email.sendPlatformEmail({
              to,
              ...buildTrialPaymentReminder({
                workspaceName: organization.name,
                ownerName,
                trialEndsAt,
              }),
              entityType: REMINDER_TYPE,
              entityId,
            });
            sent++;
          } catch {
            this.logger.error(
              `Trial payment reminder failed for workspace ${id}; it will be retried on a later scan.`,
            );
          }
        }
      }
      cursor = organizations[organizations.length - 1].id;
      if (organizations.length < 100) break;
    } while (cursor);
    return { sent };
  }
}
