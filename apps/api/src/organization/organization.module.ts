import { Module } from '@nestjs/common';
import { PersistenceModule } from '../persistence/persistence.module';
import { AuthModule } from '../auth/auth.module';
import { TenantModule } from '../common/tenant/tenant.module';
import { BillingModule } from '../billing/billing.module';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    PersistenceModule,
    AuthModule,
    TenantModule,
    BillingModule,
    CrmModule,
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
