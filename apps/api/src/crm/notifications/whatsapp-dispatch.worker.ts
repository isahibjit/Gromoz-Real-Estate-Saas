import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppDispatchService } from './whatsapp-dispatch.service';

@Injectable()
export class WhatsAppDispatchWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppDispatchWorker.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(
    private readonly dispatches: WhatsAppDispatchService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const interval =
      this.config.get<number>('WHATSAPP_DISPATCH_INTERVAL_MS') ?? 1000;
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
      await this.dispatches.dispatchPending();
    } catch (error) {
      this.logger.error(
        `WhatsApp outbox dispatch failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      this.running = false;
    }
  }
}
