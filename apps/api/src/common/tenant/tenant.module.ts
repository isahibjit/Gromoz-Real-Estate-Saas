import { SubscriptionAdminGuard } from './subscription-admin.guard';
import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';
import { PersistenceModule } from '../../persistence/persistence.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantAccessService } from './tenant-access.service';

@Global()
@Module({
  imports: [PersistenceModule],
  providers: [
    TenantContextService,
    TenantGuard,
    SubscriptionAdminGuard,
    TenantAccessService,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [TenantContextService, TenantGuard, TenantAccessService, SubscriptionAdminGuard],
})
export class TenantModule {}
