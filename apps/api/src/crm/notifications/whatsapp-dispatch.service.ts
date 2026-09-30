import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WhatsAppDispatchStatus } from '@prisma/client';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { buildWhatsAppTemplate } from '../whatsapp-template';
import {
  SUPPORTED_WHATSAPP_EVENT_SET,
  type SupportedWhatsAppEvent,
} from './notification.constants';
import {
  PinbotWhatsAppService,
  type PinbotSendResult,
} from './pinbot-whatsapp.service';
import { TenantNotificationService } from './tenant-notification.service';

type DispatchClient = Pick<Prisma.TransactionClient, 'whatsAppDispatch'>;

export interface WhatsAppTemplateContextSnapshot {
  title: string;
  body: string;
  recipientName: string;
  leadName?: string;
  leadReference?: string;
  scheduledAt?: string | Date;
  projectName?: string;
  status?: string;
}

export interface EnqueueWhatsAppInput {
  organizationId: string;
  notificationId: string;
  recipientUserId: string;
  eventKey: SupportedWhatsAppEvent;
  context: WhatsAppTemplateContextSnapshot;
}

@Injectable()
export class WhatsAppDispatchService {
  private readonly logger = new Logger(WhatsAppDispatchService.name);
  private readonly workerId = `${process.pid}-${Math.random()
    .toString(36)
    .slice(2)}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly settings: TenantNotificationService,
    private readonly pinbot: PinbotWhatsAppService,
  ) {}

  async enqueue(input: EnqueueWhatsAppInput) {
    return this.enqueueWithClient(this.prisma, input);
  }

  async enqueueWithClient(client: DispatchClient, input: EnqueueWhatsAppInput) {
    if (!SUPPORTED_WHATSAPP_EVENT_SET.has(input.eventKey)) return null;
    const language = await this.settings.templateLanguageForOrganization(
      input.organizationId,
    );
    const template = buildWhatsAppTemplate(
      { type: input.eventKey, ...input.context },
      language,
    );
    if (!template) return null;
    const parameters = template.components[0]?.parameters.map(
      (parameter) => parameter.text,
    );
    if (!parameters?.length) return null;
    return client.whatsAppDispatch.upsert({
      where: { notificationId: input.notificationId },
      update: {},
      create: {
        organizationId: input.organizationId,
        notificationId: input.notificationId,
        recipientUserId: input.recipientUserId,
        eventKey: input.eventKey,
        templateName: template.name,
        templateLanguage: language,
        templateParameters: parameters,
      },
    });
  }

  async dispatchPending(): Promise<number> {
    const now = new Date();
    const candidates = await this.prisma.whatsAppDispatch.findMany({
      where: {
        status: {
          in: [
            WhatsAppDispatchStatus.QUEUED,
            WhatsAppDispatchStatus.RETRYING,
            WhatsAppDispatchStatus.PROCESSING,
          ],
        },
        availableAt: { lte: now },
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 25,
    });

    let processed = 0;
    for (const candidate of candidates) {
      const leaseExpiresAt = new Date(Date.now() + 30_000);
      const claim = await this.prisma.whatsAppDispatch.updateMany({
        where: {
          id: candidate.id,
          status: {
            in: [
              WhatsAppDispatchStatus.QUEUED,
              WhatsAppDispatchStatus.RETRYING,
              WhatsAppDispatchStatus.PROCESSING,
            ],
          },
          availableAt: { lte: now },
          OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
        },
        data: {
          status: WhatsAppDispatchStatus.PROCESSING,
          lockedBy: this.workerId,
          leaseExpiresAt,
        },
      });
      if (claim.count !== 1) continue;
      try {
        await this.process(candidate.id);
      } catch (error) {
        await this.finishWithoutSend(
          candidate,
          WhatsAppDispatchStatus.FAILED,
          error instanceof Error ? error.message : 'Dispatch processing failed',
        );
      }
      processed += 1;
    }
    return processed;
  }

  private async process(dispatchId: string): Promise<void> {
    const dispatch = await this.prisma.whatsAppDispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) return;

    const enabled = await this.settings.isChannelEnabled(
      dispatch.organizationId,
      'whatsapp',
      dispatch.eventKey,
    );
    if (!enabled) {
      await this.finishWithoutSend(
        dispatch,
        WhatsAppDispatchStatus.SKIPPED,
        'WhatsApp is disabled for this tenant or event',
      );
      return;
    }

    const recipient = await this.prisma.user.findFirst({
      where: {
        id: dispatch.recipientUserId,
        isActive: true,
        role: { not: 'SUPER_ADMIN' },
        organizationMemberships: {
          some: {
            organizationId: dispatch.organizationId,
            isActive: true,
          },
          none: { organizationId: { not: dispatch.organizationId } },
        },
      },
      select: {
        id: true,
        employeeProfile: { select: { phone: true } },
      },
    });
    const recipientNumber = this.normalizePhone(
      recipient?.employeeProfile?.phone ?? null,
    );
    if (!recipient || !recipientNumber) {
      await this.finishWithoutSend(
        dispatch,
        WhatsAppDispatchStatus.SKIPPED,
        'Recipient is not an active, exclusive tenant staff member with a valid phone number',
      );
      return;
    }

    const provider = await this.settings.resolveProvider(
      dispatch.organizationId,
    );
    if (!provider) {
      await this.finishWithoutSend(
        dispatch,
        WhatsAppDispatchStatus.SKIPPED,
        'Selected WhatsApp provider is not ready',
        recipientNumber,
      );
      return;
    }

    const parameters = this.stringArray(dispatch.templateParameters);
    if (!parameters.length) {
      await this.finishWithoutSend(
        dispatch,
        WhatsAppDispatchStatus.FAILED,
        'Stored template parameters are invalid',
        recipientNumber,
      );
      return;
    }

    const result = await this.pinbot.send({
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
      senderNumber: provider.senderNumber,
      recipientNumber,
      template: {
        name: dispatch.templateName,
        language: dispatch.templateLanguage,
        parameters,
      },
    });
    await this.recordResult(dispatch, result, recipientNumber);
  }

  private async recordResult(
    dispatch: {
      id: string;
      attemptCount: number;
    },
    result: PinbotSendResult,
    recipientNumber: string,
  ): Promise<void> {
    const attemptNumber = dispatch.attemptCount + 1;
    const now = new Date();
    if (result.accepted === true) {
      await this.prisma.$transaction([
        this.prisma.whatsAppDispatchAttempt.create({
          data: {
            dispatchId: dispatch.id,
            attemptNumber,
            status: WhatsAppDispatchStatus.ACCEPTED,
            httpStatus: result.httpStatus,
            providerMessageId: result.providerMessageId,
            completedAt: now,
          },
        }),
        this.prisma.whatsAppDispatch.update({
          where: { id: dispatch.id },
          data: {
            status: WhatsAppDispatchStatus.ACCEPTED,
            attemptCount: attemptNumber,
            recipientMasked: this.maskPhone(recipientNumber),
            providerMessageId: result.providerMessageId,
            acceptedAt: now,
            lastError: null,
            lockedBy: null,
            leaseExpiresAt: null,
          },
        }),
      ]);
      this.logger.log(`WhatsApp dispatch ${dispatch.id} accepted by provider`);
      return;
    }

    const failure = result as Extract<PinbotSendResult, { accepted: false }>;
    const error = this.sanitizeError(failure.errorMessage);
    const retrying = failure.retryable && attemptNumber < 5;
    const status = retrying
      ? WhatsAppDispatchStatus.RETRYING
      : WhatsAppDispatchStatus.FAILED;
    const availableAt = retrying
      ? new Date(Date.now() + this.retryDelayMs(attemptNumber))
      : now;
    await this.prisma.$transaction([
      this.prisma.whatsAppDispatchAttempt.create({
        data: {
          dispatchId: dispatch.id,
          attemptNumber,
          status,
          httpStatus: failure.httpStatus,
          errorCode: failure.errorCode,
          errorMessage: error,
          completedAt: now,
        },
      }),
      this.prisma.whatsAppDispatch.update({
        where: { id: dispatch.id },
        data: {
          status,
          attemptCount: attemptNumber,
          availableAt,
          recipientMasked: this.maskPhone(recipientNumber),
          lastError: error,
          failedAt: retrying ? null : now,
          lockedBy: null,
          leaseExpiresAt: null,
        },
      }),
    ]);
    this.logger.warn(
      `WhatsApp dispatch ${dispatch.id} ${
        retrying ? 'scheduled for retry' : 'failed'
      }`,
    );
  }

  private async finishWithoutSend(
    dispatch: { id: string; attemptCount: number },
    status:
      | typeof WhatsAppDispatchStatus.SKIPPED
      | typeof WhatsAppDispatchStatus.FAILED,
    reason: string,
    recipientNumber?: string,
  ): Promise<void> {
    const attemptNumber = dispatch.attemptCount + 1;
    const now = new Date();
    const error = this.sanitizeError(reason);
    await this.prisma.$transaction([
      this.prisma.whatsAppDispatchAttempt.create({
        data: {
          dispatchId: dispatch.id,
          attemptNumber,
          status,
          errorMessage: error,
          completedAt: now,
        },
      }),
      this.prisma.whatsAppDispatch.update({
        where: { id: dispatch.id },
        data: {
          status,
          attemptCount: attemptNumber,
          recipientMasked: recipientNumber
            ? this.maskPhone(recipientNumber)
            : null,
          lastError: error,
          skippedAt:
            status === WhatsAppDispatchStatus.SKIPPED ? now : undefined,
          failedAt: status === WhatsAppDispatchStatus.FAILED ? now : undefined,
          lockedBy: null,
          leaseExpiresAt: null,
        },
      }),
    ]);
  }

  private retryDelayMs(attempt: number): number {
    const base = Math.min(60_000, 1_000 * 2 ** Math.max(attempt - 1, 0));
    return base + Math.floor(Math.random() * 500);
  }

  private normalizePhone(value: string | null): string | null {
    let digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`;
    return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
  }

  private maskPhone(value: string): string {
    return `******${value.slice(-4)}`;
  }

  private stringArray(value: Prisma.JsonValue): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string');
  }

  private sanitizeError(value: string): string {
    const platformKey = String(
      this.config.get<string>('WHATSAPP_PLATFORM_API_KEY') ?? '',
    ).trim();
    let sanitized = value
      .replace(
        /(authorization|apikey|api[_ -]?key|token)\s*[:=]\s*[^\s,;]+/gi,
        '$1=[redacted]',
      )
      .replace(/\b\d{8,15}\b/g, '[phone-redacted]');
    if (platformKey)
      sanitized = sanitized.split(platformKey).join('[redacted]');
    return sanitized.slice(0, 1000);
  }
}
