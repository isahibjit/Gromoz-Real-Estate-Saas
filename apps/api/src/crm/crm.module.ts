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
  Acres99IntegrationsController,
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
  Public99AcresWebhookController,
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
import { PinbotWhatsAppService } from './notifications/pinbot-whatsapp.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppCredentialService } from './notifications/whatsapp-credential.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';
import { WhatsAppDispatchWorker } from './notifications/whatsapp-dispatch.worker';

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
    Acres99IntegrationsController,
    MetaIntegrationsController,
    WebsiteIntegrationsController,
    PublicMagicBricksWebhookController,
    Public99AcresWebhookController,
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
    WhatsAppCredentialService,
    PinbotWhatsAppService,
    TenantNotificationService,
    WhatsAppDispatchService,
    WhatsAppDispatchWorker,
  ],
  exports: [
    CrmService,
    EmailConnectorsService,
    HousingIntegrationsService,
    TenantNotificationService,
    WhatsAppDispatchService,
  ],
})
export class CrmModule {}
