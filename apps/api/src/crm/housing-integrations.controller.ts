import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionGuard } from '../access/permission.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { HousingIntegrationsService } from './housing-integrations.service';

const userFrom = (req: any) => req.user ?? {};
const orgIdFrom = (req: { tenant?: { organizationId: string } }) => req.tenant?.organizationId;

@Controller('housing-integrations')
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionGuard)
export class HousingIntegrationsController {
  constructor(private readonly housingService: HousingIntegrationsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getIntegration(@Req() req: any) {
    return this.housingService.getHousingIntegration(
      userFrom(req).sub,
      orgIdFrom(req),
    );
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  saveIntegration(
    @Body() body: { isActive?: boolean; apiKey?: string },
    @Req() req: any,
  ) {
    return this.housingService.saveHousingIntegration(
      body,
      userFrom(req).sub,
      orgIdFrom(req),
    );
  }

  @Post('regenerate-key')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  regenerateKey(@Req() req: any) {
    return this.housingService.regenerateWebhookKey(
      userFrom(req).sub,
      orgIdFrom(req),
    );
  }

  @Post('field-mapping')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  saveFieldMapping(@Body() body: { fieldMapping: any }, @Req() req: any) {
    return this.housingService.saveFieldMapping(
      body.fieldMapping,
      userFrom(req).sub,
      orgIdFrom(req),
    );
  }

  @Post('test')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  testIntegration(@Body() body: any, @Req() req: any) {
    return this.housingService.testIntegration(
      body,
      userFrom(req).sub,
      orgIdFrom(req),
    );
  }

  @Get('accounts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  listAccounts(@Query('includeArchived') includeArchived?: string) {
    return this.housingService.listAccounts(includeArchived === 'true');
  }

  @Post('accounts')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  createAccount(
    @Body()
    body: { name: string; externalAccountId?: string; apiKey?: string },
    @Req() req: any,
  ) {
    return this.housingService.createAccount(body, userFrom(req).sub);
  }

  @Patch('accounts/bulk-status')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  setAccountsStatus(@Body() body: { isActive: boolean }, @Req() req: any) {
    return this.housingService.setAccountsStatus(
      body.isActive,
      userFrom(req).sub,
    );
  }

  @Get('accounts/:accountId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getAccount(@Param('accountId') accountId: string) {
    return this.housingService.getAccount(accountId);
  }

  @Patch('accounts/:accountId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  updateAccount(
    @Param('accountId') accountId: string,
    @Body()
    body: {
      name?: string;
      externalAccountId?: string;
      apiKey?: string;
      isActive?: boolean;
      notes?: string;
    },
    @Req() req: any,
  ) {
    return this.housingService.updateAccount(
      accountId,
      body,
      userFrom(req).sub,
    );
  }

  @Delete('accounts/:accountId')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  archiveAccount(@Param('accountId') accountId: string, @Req() req: any) {
    return this.housingService.archiveAccount(accountId, userFrom(req).sub);
  }

  @Post('accounts/:accountId/restore')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  restoreAccount(@Param('accountId') accountId: string, @Req() req: any) {
    return this.housingService.restoreAccount(accountId, userFrom(req).sub);
  }

  @Post('accounts/:accountId/regenerate-key')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  regenerateAccountKey(@Param('accountId') accountId: string, @Req() req: any) {
    return this.housingService.regenerateAccountWebhookKey(
      accountId,
      userFrom(req).sub,
    );
  }

  @Patch('accounts/:accountId/field-mapping')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  saveAccountFieldMapping(
    @Param('accountId') accountId: string,
    @Body() body: { fieldMapping: unknown },
    @Req() req: any,
  ) {
    return this.housingService.saveAccountFieldMapping(
      accountId,
      body.fieldMapping,
      userFrom(req).sub,
    );
  }

  @Patch('accounts/:accountId/routing')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  saveAccountRouting(
    @Param('accountId') accountId: string,
    @Body()
    body: {
      projectId?: string;
      teamId?: string;
      telecallerId?: string;
      fieldExecutiveId?: string;
      sourceId?: unknown;
    },
    @Req() req: any,
  ) {
    return this.housingService.saveAccountRouting(
      accountId,
      body,
      userFrom(req).sub,
    );
  }

  @Post('accounts/:accountId/test')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  testAccount(
    @Param('accountId') accountId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.housingService.testAccount(accountId, body, userFrom(req).sub);
  }

  @Get('accounts/:accountId/activity')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getAccountActivity(@Param('accountId') accountId: string) {
    return this.housingService.getAccountActivity(accountId);
  }
}

@Controller(['public/webhooks/housing', 'integrations/housing'])
export class PublicHousingWebhookController {
  constructor(private readonly housingService: HousingIntegrationsService) {}

  @Post(':keyId')
  ingestPost(@Param('keyId') keyId: string, @Body() body: any) {
    return this.housingService.ingestWebhook(keyId, body);
  }

  @Get(':keyId')
  ingestGet(@Param('keyId') keyId: string, @Req() req: any) {
    return this.housingService.ingestWebhook(keyId, req.query);
  }

  @Post('leads')
  ingestLeadsPost(@Req() req: any, @Body() body: any) {
    const keyId =
      req.headers['x-api-key'] ||
      req.query?.keyId ||
      req.query?.ApiKey ||
      req.query?.api_key ||
      body?.keyId ||
      body?.api_key ||
      body?.ApiKey;
    return this.housingService.ingestWebhook(String(keyId || ''), body);
  }

  @Get('leads')
  ingestLeadsGet(@Req() req: any) {
    const keyId =
      req.headers['x-api-key'] ||
      req.query?.keyId ||
      req.query?.ApiKey ||
      req.query?.api_key;
    return this.housingService.ingestWebhook(String(keyId || ''), req.query);
  }
}
