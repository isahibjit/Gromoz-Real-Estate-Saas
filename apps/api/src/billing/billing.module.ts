import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../common/tenant/tenant.module';
import { RazorpayService } from './razorpay.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { CrmModule } from '../crm/crm.module';
import { TrialReminderWorker } from './trial-reminder.worker';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    AuthModule,
    TenantModule,
    CrmModule,
  ],
  controllers: [BillingController],
  providers: [RazorpayService, BillingService, TrialReminderWorker],
  exports: [RazorpayService, BillingService],
})
export class BillingModule {}
