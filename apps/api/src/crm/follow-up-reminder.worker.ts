import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CrmService } from './crm.service';

@Injectable()
export class FollowUpReminderWorker implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(private readonly crm: CrmService) {}

  onModuleInit() {
    const intervalMs = Math.max(
      Number(process.env.FOLLOW_UP_REMINDER_INTERVAL_MS ?? 30000),
      5000,
    );
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.crm.runFollowUpReminderDispatches();
    } finally {
      this.running = false;
    }
  }
}
