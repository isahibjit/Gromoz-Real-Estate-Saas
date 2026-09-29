import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedisModule } from './redis/redis.module';
import { validationSchemaForEnv } from './config/environment-variables';
import { PersistenceModule } from './persistence/persistence.module';
import { AuthModule } from './auth/auth.module';
import { ApiThrottlerGuard } from './common/guards/api-throttler.guard';
import { RedisThrottlerStorage } from './common/throttling/redis-throttler.storage';
import { ThrottlingModule } from './common/throttling/throttling.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CrmModule } from './crm/crm.module';
import { UploadsModule } from './uploads/uploads.module';
import { HrModule } from './hr/hr.module';
import { AccessModule } from './access/access.module';
import { MobileAppModule } from './mobile-app/mobile-app.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: validationSchemaForEnv,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ThrottlingModule],
      inject: [ConfigService, RedisThrottlerStorage],
      useFactory: (
        configService: ConfigService,
        redisThrottlerStorage: RedisThrottlerStorage,
      ) => ({
        storage: redisThrottlerStorage,
        throttlers: [
          {
            name: 'default',
            ttl: configService.getOrThrow<number>('RATE_LIMIT_TTL_MS'),
            limit: configService.getOrThrow<number>('RATE_LIMIT_LIMIT'),
          },
        ],
      }),
    }),
    RedisModule,
    ThrottlingModule,
    PersistenceModule,
    AuthModule,
    DashboardModule,
    CrmModule,
    UploadsModule,
    HrModule,
    AccessModule,
    MobileAppModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ApiThrottlerGuard,
    },
  ],
})
export class AppModule {}
