import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { PersistenceModule } from '../persistence/persistence.module';
import { UploadsModule } from '../uploads/uploads.module';
import { AccessModule } from '../access/access.module';
import {
  AttendanceController,
  EmployeesController,
  HolidaysController,
  LeavesController,
  MailController,
  PayrollController,
  PayslipsController,
  ShiftsController,
} from './hr.controllers';
import { HrService } from './hr.service';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';
import { MailService } from './mail.service';
import { HrDocumentsService } from './documents.service';
import { CrmModule } from '../crm/crm.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PersistenceModule,
    ConfigModule,
    UploadsModule,
    AccessModule,
    CrmModule,
    RealtimeModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
    }),
  ],
  controllers: [
    EmployeesController,
    AttendanceController,
    HolidaysController,
    LeavesController,
    PayrollController,
    PayslipsController,
    MailController,
    ShiftsController,
    TeamsController,
  ],
  providers: [HrService, TeamsService, MailService, HrDocumentsService],
  exports: [HrService, TeamsService, MailService, HrDocumentsService],
})
export class HrModule {}
