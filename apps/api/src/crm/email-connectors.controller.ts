import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../access/permission.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import {
  EmailConnectorsService,
  type CreateEmailConnectorDto,
  type SendEmailOptions,
  type UpdateEmailConnectorDto,
} from './email-connectors.service';

const userFrom = (req: any) => req.user ?? {};

@Controller('email-connectors')
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionGuard)
export class EmailConnectorsController {
  constructor(
    private readonly emailConnectorsService: EmailConnectorsService,
  ) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('hr_settings', 'view')
  listConnectors() {
    return this.emailConnectorsService.listConnectors();
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('hr_settings', 'update')
  createConnector(@Body() body: CreateEmailConnectorDto, @Req() req: any) {
    return this.emailConnectorsService.createConnector(body, userFrom(req).sub);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('hr_settings', 'update')
  updateConnector(
    @Param('id') id: string,
    @Body() body: UpdateEmailConnectorDto,
  ) {
    return this.emailConnectorsService.updateConnector(id, body);
  }

  @Post(':id/test')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('hr_settings', 'update')
  testConnection(
    @Param('id') id: string,
    @Body() body: { recipientEmail?: string },
  ) {
    return this.emailConnectorsService.testConnection(id, body.recipientEmail);
  }

  @Post(':id/set-default')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('hr_settings', 'update')
  setDefaultConnector(@Param('id') id: string) {
    return this.emailConnectorsService.setDefaultConnector(id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('hr_settings', 'update')
  deleteConnector(@Param('id') id: string) {
    return this.emailConnectorsService.deleteConnector(id);
  }

  @Get('logs')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('hr_settings', 'view')
  listLogs() {
    return this.emailConnectorsService.listEmailLogs();
  }

  @Post('send')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'SALES_MANAGER',
    'SALES_AGENT',
    'TELECALLER',
  )
  sendEmail(@Body() body: SendEmailOptions) {
    return this.emailConnectorsService.sendEmail(body);
  }
}
