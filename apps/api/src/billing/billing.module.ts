import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsController } from './support-tickets.controller';
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
import {
  InvoicesController,
  PlatformInvoicesController,
  PlatformBillingGuard,
} from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePaymentsService } from './invoice-payments.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceWorker } from './invoice-worker.service';
import { PlatformTenantBillingService } from './platform-tenant-billing.service';
import { PlatformTenantBillingController } from './platform-tenant-billing.controller';

@Module({
  imports: [
    ConfigModule,
    PersistenceModule,
    AuthModule,
    TenantModule,
    CrmModule,
  ],
  controllers: [
    BillingController,
    SupportTicketsController,
    InvoicesController,
    PlatformInvoicesController,
    PlatformTenantBillingController,
  ],
  providers: [
    RazorpayService,
    BillingService,
    TrialReminderWorker,
    SupportTicketsService,
    InvoicesService,
    InvoicePaymentsService,
    InvoicePdfService,
    InvoiceWorker,
    PlatformBillingGuard,
    PlatformTenantBillingService,
  ],
  exports: [RazorpayService, BillingService],
})
export class BillingModule {}
