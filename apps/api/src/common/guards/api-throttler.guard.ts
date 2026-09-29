import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  @Inject(ConfigService)
  private readonly configService!: ConfigService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.configService.get<boolean>('THROTTLE_ENABLED')) {
      return true;
    }

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      return true;
    }

    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const forwardedFor = req.headers as
      | Record<string, string | string[] | undefined>
      | undefined;
    const xForwardedFor = forwardedFor?.['x-forwarded-for'];

    if (typeof xForwardedFor === 'string' && xForwardedFor.length > 0) {
      return xForwardedFor.split(',')[0].trim();
    }

    if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
      return xForwardedFor[0].split(',')[0].trim();
    }

    return String(req.ip ?? 'unknown');
  }
}
