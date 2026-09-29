import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';

const REDIS_KEY_DAILY_AUTO_LOGOUT_LAST_RUN =
  'auth:security:daily-auto-logout:last-run-date';

@Injectable()
export class DailyAutoLogoutWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyAutoLogoutWorker.name);
  private timer: NodeJS.Timeout | undefined;
  private running = false;
  private lastRunDate: string | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    try {
      this.lastRunDate = await this.redisService.get(
        REDIS_KEY_DAILY_AUTO_LOGOUT_LAST_RUN,
      );
    } catch {
      this.lastRunDate = null;
    }

    // Check every 10 seconds
    const intervalMs = 10_000;
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);

    this.logger.log(
      'DailyAutoLogoutWorker initialized. Scheduled to auto-logout all users daily at 7:30 PM IST (Asia/Kolkata).',
    );
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;

    try {
      const now = new Date();

      // Extract current date and time in Asia/Kolkata (IST)
      const istDateString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(now); // E.g., "2026-09-16"

      const istTimeFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = istTimeFormatter.formatToParts(now);
      const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? -1);
      const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? -1);

      // 19:30 is 7:30 PM in 24-hour clock
      const isPast730Pm = hour > 19 || (hour === 19 && minute >= 30);

      if (isPast730Pm && this.lastRunDate !== istDateString) {
        this.logger.log(
          `Triggering 7:30 PM IST daily auto-logout for ${istDateString} (Current IST time: ${hour}:${minute})`,
        );

        this.lastRunDate = istDateString;
        await this.redisService
          .set(REDIS_KEY_DAILY_AUTO_LOGOUT_LAST_RUN, istDateString)
          .catch(() => undefined);

        await this.authService.executeDailyAutoLogout(
          'SYSTEM_CRON',
          `Scheduled 7:30 PM IST daily auto-logout for ${istDateString}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Error during daily auto-logout tick: ${
          err instanceof Error ? err.message : err
        }`,
      );
    } finally {
      this.running = false;
    }
  }
}
