import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';

@Injectable()
export class RealtimeOutboxWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeOutboxWorker.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly realtime: RealtimeService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const interval = this.config.get<number>('REALTIME_OUTBOX_INTERVAL_MS') ?? 1000;
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
      await this.realtime.dispatchPendingEvents();
    } catch (error) {
      this.logger.error(
        `Realtime outbox dispatch failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      this.running = false;
    }
  }
}
