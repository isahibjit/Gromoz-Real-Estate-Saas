import {
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Namespace, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { AccessService } from '../access/access.service';
import { RedisService } from '../redis/redis.service';
import {
  LEAD_CREATED_EVENT,
  type LeadCreatedRealtimeEvent,
  type RealtimeSocketUser,
} from './realtime.types';

@Injectable()
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleDestroy
{
  private readonly logger = new Logger(RealtimeGateway.name);
  private pubClient: Redis | undefined;
  private subClient: Redis | undefined;

  @WebSocketServer()
  private server!: Namespace;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly access: AccessService,
    private readonly redisService: RedisService,
  ) {}

  afterInit(namespace: Namespace) {
    const redisOptions = {
      host: this.config.getOrThrow<string>('REDIS_HOST'),
      port: this.config.getOrThrow<number>('REDIS_PORT'),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.getOrThrow<number>('REDIS_DB'),
      enableReadyCheck: true,
      maxRetriesPerRequest: 1,
    };
    this.pubClient = new Redis(redisOptions);
    this.subClient = new Redis(redisOptions);
    this.pubClient.on('error', (error) =>
      this.logger.error(`Realtime Redis publisher error: ${error.message}`),
    );
    this.subClient.on('error', (error) =>
      this.logger.error(`Realtime Redis subscriber error: ${error.message}`),
    );
    namespace.server.adapter(createAdapter(this.pubClient, this.subClient));
  }

  async handleConnection(socket: Socket) {
    try {
      if (!this.isAllowedOrigin(socket.handshake.headers.origin)) {
        throw new Error('Origin is not allowed');
      }
      const token = this.extractToken(socket);
      if (!token) throw new Error('Missing access token');
      const payload = await this.jwt.verifyAsync<{ sub?: string; role?: string }>(
        token,
        { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET') },
      );
      if (!payload.sub || !payload.role) throw new Error('Invalid token payload');

      const isDeactivated = await this.redisService.get(
        `auth:deactivated:${payload.sub}`,
      );
      if (isDeactivated) throw new Error('Account is deactivated');

      const user: RealtimeSocketUser = { id: payload.sub, role: payload.role };
      socket.data.user = user;
      await socket.join(this.userRoom(user.id));
    } catch (error) {
      this.logger.warn(
        `Rejected realtime socket ${socket.id}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    socket.data.user = undefined;
  }

  async onModuleDestroy() {
    await Promise.all([
      this.pubClient?.quit().catch(() => undefined),
      this.subClient?.quit().catch(() => undefined),
    ]);
  }

  emitLeadCreated(
    userIds: readonly string[],
    event: LeadCreatedRealtimeEvent,
  ) {
    if (!userIds.length) return;
    if (this.pubClient?.status !== 'ready' || this.subClient?.status !== 'ready') {
      throw new Error('Realtime Redis adapter is not ready');
    }
    for (const userId of new Set(userIds)) {
      this.server.to(this.userRoom(userId)).emit(LEAD_CREATED_EVENT, event);
    }
  }

  broadcastSessionExpired(
    reason = 'Daily session expired at 7:30 PM. Please log in again.',
  ) {
    try {
      this.server.emit('auth:logout', {
        reason,
        timestamp: new Date().toISOString(),
      });
      this.server.emit('session_expired', {
        reason,
        timestamp: new Date().toISOString(),
      });
      this.server.disconnectSockets(true);
      this.logger.log(`Broadcasted session expiration event to all connected sockets: ${reason}`);
    } catch (error) {
      this.logger.warn(
        `Failed to broadcast session expiration: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  emitUserSessionExpired(
    userId: string,
    reason = 'Your account has been deactivated. Please contact an administrator.',
  ) {
    try {
      const room = this.userRoom(userId);
      const payload = {
        reason,
        timestamp: new Date().toISOString(),
      };
      this.server.to(room).emit('auth:logout', payload);
      this.server.to(room).emit('session_expired', payload);
      this.server.in(room).disconnectSockets(true);
      this.logger.log(`Emitted session expiration and disconnected sockets for user: ${userId}`);
    } catch (error) {
      this.logger.warn(
        `Failed to emit user session expiration for ${userId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private extractToken(socket: Socket) {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();
    const authorization = socket.handshake.headers.authorization;
    if (typeof authorization !== 'string') return undefined;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' && token ? token : undefined;
  }

  private isAllowedOrigin(origin?: string) {
    if (!origin) return true;
    const configured = this.config
      .get<string>('REALTIME_ALLOWED_ORIGINS')
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const fallback = this.config.get<string>('FRONTEND_URL')?.trim();
    const allowedOrigins = configured?.length
      ? configured
      : fallback
        ? [fallback]
        : [];
    return allowedOrigins.includes(origin);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
