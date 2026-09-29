import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';
import { PersistenceModule } from '../../persistence/persistence.module';

@Global()
@Module({
  imports: [PersistenceModule],
  providers: [TenantContextService, TenantGuard],
  exports: [TenantContextService, TenantGuard],
})
export class TenantModule {}
