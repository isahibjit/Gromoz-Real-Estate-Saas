import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessModule } from '../access/access.module';
import { LeadVisibilityModule } from '../crm/lead-visibility.module';
import { PersistenceModule } from '../persistence/persistence.module';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeOutboxWorker } from './realtime-outbox.worker';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [PersistenceModule, AccessModule, LeadVisibilityModule, JwtModule.register({})],
  providers: [RealtimeGateway, RealtimeService, RealtimeOutboxWorker],
  exports: [RealtimeService],
})
export class RealtimeModule {}
