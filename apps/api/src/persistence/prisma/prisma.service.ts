import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private reconnectPromise: Promise<void> | undefined;

  constructor() {
    super();
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error) {
        if (!this.isRecoverablePlanCacheError(error)) {
          throw error;
        }

        this.logger.warn(
          `Recovering stale PostgreSQL query plan for ${params.model ?? 'raw'}.${
            params.action
          }`,
        );
        await this.reconnect();
        return next(params);
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private async reconnect() {
    if (!this.reconnectPromise) {
      this.reconnectPromise = this.$disconnect()
        .catch((error: unknown) => {
          this.logger.warn(
            `Prisma disconnect during recovery failed: ${this.errorMessage(
              error,
            )}`,
          );
        })
        .then(() => this.$connect())
        .finally(() => {
          this.reconnectPromise = undefined;
        });
    }

    await this.reconnectPromise;
  }

  private isRecoverablePlanCacheError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P1017'
    ) {
      return true;
    }

    const message = this.errorMessage(error).toLowerCase();
    return (
      message.includes('cached plan must not change result type') ||
      message.includes('cache lookup failed for type') ||
      message.includes('prepared statement') ||
      message.includes('revalidatecachedquery')
    );
  }

  private errorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
}
