import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { LeadVisibilityService } from '../crm/lead-visibility.service';
import { RealtimeGateway } from './realtime.gateway';
import {
  LEAD_CREATED_EVENT,
  type LeadCreatedRealtimeEvent,
} from './realtime.types';

type OutboxClient = Pick<Prisma.TransactionClient, 'realtimeOutboxEvent'>;

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly workerId = `${process.pid}-${Math.random().toString(36).slice(2)}`;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: RealtimeGateway,
    private readonly leadVisibility: LeadVisibilityService,
  ) {}

  async enqueueLeadCreated(client: OutboxClient, leadId: string) {
    const occurredAt = new Date().toISOString();
    await client.realtimeOutboxEvent.create({
      data: {
        type: LEAD_CREATED_EVENT,
        aggregateType: 'Lead',
        aggregateId: leadId,
        payload: { version: 1, type: LEAD_CREATED_EVENT, leadId, occurredAt },
      },
    });
  }

  async dispatchPendingEvents() {
    const now = new Date();
    const candidates = await this.prisma.realtimeOutboxEvent.findMany({
      where: {
        publishedAt: null,
        availableAt: { lte: now },
        OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    for (const candidate of candidates) {
      const leaseExpiresAt = new Date(Date.now() + 30_000);
      const claim = await this.prisma.realtimeOutboxEvent.updateMany({
        where: {
          id: candidate.id,
          publishedAt: null,
          availableAt: { lte: now },
          OR: [
            { leaseExpiresAt: null },
            { leaseExpiresAt: { lte: now } },
          ],
        },
        data: { lockedBy: this.workerId, leaseExpiresAt },
      });
      if (claim.count !== 1) continue;

      try {
        await this.dispatchEvent(candidate);
        await this.prisma.realtimeOutboxEvent.update({
          where: { id: candidate.id },
          data: {
            attempts: { increment: 1 },
            publishedAt: new Date(),
            lockedBy: null,
            leaseExpiresAt: null,
            lastError: null,
          },
        });
      } catch (error) {
        const attempts = candidate.attempts + 1;
        const retryDelayMs = Math.min(60_000, 1_000 * 2 ** Math.min(attempts, 6));
        await this.prisma.realtimeOutboxEvent.update({
          where: { id: candidate.id },
          data: {
            attempts,
            availableAt: new Date(Date.now() + retryDelayMs),
            lockedBy: null,
            leaseExpiresAt: null,
            lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error',
          },
        });
        this.logger.error(
          `Realtime outbox event ${candidate.id} failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }

  private async dispatchEvent(event: {
    id: string;
    type: string;
    aggregateId: string;
    payload: unknown;
  }) {
    if (event.type !== LEAD_CREATED_EVENT) return;
    const payload = event.payload as Partial<LeadCreatedRealtimeEvent>;
    const recipientIds = await this.leadVisibility.recipientIdsForLead(
      event.aggregateId,
    );
    const realtimeEvent: LeadCreatedRealtimeEvent = {
      version: 1,
      eventId: event.id,
      type: LEAD_CREATED_EVENT,
      leadId: event.aggregateId,
      occurredAt:
        typeof payload.occurredAt === 'string'
          ? payload.occurredAt
          : new Date().toISOString(),
    };
    this.gateway.emitLeadCreated(recipientIds, realtimeEvent);
  }

  broadcastSessionExpired(reason?: string) {
    this.gateway.broadcastSessionExpired(reason);
  }

  emitUserSessionExpired(userId: string, reason?: string) {
    this.gateway.emitUserSessionExpired(userId, reason);
  }
}
