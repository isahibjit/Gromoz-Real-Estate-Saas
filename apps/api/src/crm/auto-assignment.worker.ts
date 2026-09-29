import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { CrmService } from './crm.service';

@Injectable()
export class AutoAssignmentWorker implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(private readonly crm: CrmService) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.tick();
    }, 30000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.crm.runAutoAssignmentTransfers();
    } finally {
      this.running = false;
    }
  }
}
