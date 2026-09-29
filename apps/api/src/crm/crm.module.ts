import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PersistenceModule } from '../persistence/persistence.module';
import { AccessModule } from '../access/access.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { LeadVisibilityModule } from './lead-visibility.module';
import { AutoAssignmentWorker } from './auto-assignment.worker';
import { CrmService } from './crm.service';
import { FollowUpReminderWorker } from './follow-up-reminder.worker';
import {
  AutoAssignmentController,
  BookingsController,
  CallLogsController,
  ContactLeadsController,
  DuplicatesController,
  LeadImportsController,
  LeadFieldPermissionsController,
  LeadListColumnsController,
  LeadMastersController,
  LeadsController,
  MagicBricksIntegrationsController,
  MetaIntegrationsController,
  NotificationsController,
  PropertyMastersController,
  PublicMagicBricksWebhookController,
  PublicMetaWebhookController,
  PublicWebsiteWebhookController,
  PublicIncomingLeadsWebhookController,
  PublicProjectsController,
  WebsiteIntegrationsController,
  ProjectsController,
  ReportsController,
  SiteVisitsController,
  TasksController,
} from './crm.controllers';

import { EmailConnectorsController } from './email-connectors.controller';
import { EmailConnectorsService } from './email-connectors.service';
import {
  HousingIntegrationsController,
  PublicHousingWebhookController,
} from './housing-integrations.controller';
import { HousingIntegrationsService } from './housing-integrations.service';
import { MobileLeadsController } from './mobile-leads.controller';

@Module({
  imports: [
    PersistenceModule,
    AccessModule,
    LeadVisibilityModule,
    RealtimeModule,
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [
    MobileLeadsController,
    LeadsController,
    ContactLeadsController,
    LeadListColumnsController,
    LeadFieldPermissionsController,
    AutoAssignmentController,
    LeadMastersController,
    PropertyMastersController,
    ProjectsController,
    SiteVisitsController,
    BookingsController,
    CallLogsController,
    LeadImportsController,
    MagicBricksIntegrationsController,
    MetaIntegrationsController,
    WebsiteIntegrationsController,
    PublicMagicBricksWebhookController,
    PublicMetaWebhookController,
    PublicWebsiteWebhookController,
    PublicIncomingLeadsWebhookController,
    PublicProjectsController,
    EmailConnectorsController,
    HousingIntegrationsController,
    PublicHousingWebhookController,
    DuplicatesController,
    ReportsController,
    NotificationsController,
    TasksController,
  ],
  providers: [
    CrmService,
    EmailConnectorsService,
    HousingIntegrationsService,
    AutoAssignmentWorker,
    FollowUpReminderWorker,
  ],
  exports: [CrmService, EmailConnectorsService, HousingIntegrationsService],
})
export class CrmModule {}
