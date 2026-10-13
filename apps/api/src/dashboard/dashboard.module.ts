import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PersistenceModule } from '../persistence/persistence.module';
import { AccessModule } from '../access/access.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { LeadVisibilityModule } from '../crm/lead-visibility.module';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    AccessModule,
    LeadVisibilityModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
