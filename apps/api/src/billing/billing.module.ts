import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../common/tenant/tenant.module';
import { RazorpayService } from './razorpay.service';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
  imports: [ConfigModule, PersistenceModule, AuthModule, TenantModule],
  controllers: [BillingController],
  providers: [RazorpayService, BillingService],
  exports: [RazorpayService, BillingService],
})
export class BillingModule {}
