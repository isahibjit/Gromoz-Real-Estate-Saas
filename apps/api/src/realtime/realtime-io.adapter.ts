import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';

export class RealtimeIoAdapter extends IoAdapter {
  constructor(
    app: ConstructorParameters<typeof IoAdapter>[0],
    private readonly config: ConfigService,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: {
        origin: (origin, callback) => callback(null, this.isAllowedOrigin(origin)),
        credentials: true,
      },
    });
  }

  private isAllowedOrigin(origin?: string) {
    if (!origin) return true;
    const configured = this.config
      .get<string>('REALTIME_ALLOWED_ORIGINS')
      ?.split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const fallback = this.config.get<string>('FRONTEND_URL')?.trim();
    const allowedOrigins = configured?.length
      ? configured
      : fallback
        ? [fallback]
        : [];
    return allowedOrigins.includes(origin);
  }
}
