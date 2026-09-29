import { Injectable } from '@nestjs/common';
import { PrismaService } from './persistence/prisma/prisma.service';
import { RedisService } from './redis/redis.service';

type HealthStatus = 'ok' | 'error';

export interface HealthCheckResult {
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export interface BaseHealthResponse {
  service: string;
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
}

export interface RootHealthResponse extends BaseHealthResponse {
  message: string;
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
  };
}

export interface ReadinessHealthResponse extends BaseHealthResponse {
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
  };
}

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getRootHealth(): Promise<RootHealthResponse> {
    const readiness = await this.getReadiness();

    return {
      message:
        readiness.status === 'ok'
          ? 'Truroot CRM API is healthy'
          : 'Truroot CRM API is running but not ready',
      ...readiness,
    };
  }

  async getLiveness(): Promise<BaseHealthResponse> {
    return {
      service: 'truroot-crm-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async getReadiness(): Promise<ReadinessHealthResponse> {
    const database = await this.checkDatabase();
    const redis = await this.checkRedis();
    const status: HealthStatus =
      database.status === 'up' && redis.status === 'up' ? 'ok' : 'error';

    return {
      service: 'truroot-crm-api',
      status,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      checks: {
        database,
        redis,
      },
    };
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startedAt = Date.now();

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Database health check timed out')),
            3000,
          ),
        ),
      ]);

      return {
        status: 'up',
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown database connectivity error',
      };
    }
  }

  private async checkRedis(): Promise<HealthCheckResult> {
    const startedAt = Date.now();

    try {
      const result = await Promise.race([
        this.redisService.ping(),
        new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error('Redis health check timed out')),
            3000,
          ),
        ),
      ]);

      return {
        status: result === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - startedAt,
        ...(result === 'PONG'
          ? {}
          : { error: `Unexpected Redis ping response: ${result}` }),
      };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - startedAt,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown Redis connectivity error',
      };
    }
  }
}
