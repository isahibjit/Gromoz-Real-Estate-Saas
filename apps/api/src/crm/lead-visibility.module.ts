import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { LeadVisibilityService } from './lead-visibility.service';

@Module({
  imports: [PersistenceModule, AccessModule],
  providers: [LeadVisibilityService],
  exports: [LeadVisibilityService],
})
export class LeadVisibilityModule {}
