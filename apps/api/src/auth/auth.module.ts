import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SmsService } from './sms.service';
import { DailyAutoLogoutWorker } from './daily-auto-logout.worker';
import { PersistenceModule } from '../persistence/persistence.module';
import { HrModule } from '../hr/hr.module';
import { AccessModule } from '../access/access.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PersistenceModule,
    HrModule,
    AccessModule,
    RealtimeModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SmsService, DailyAutoLogoutWorker],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

