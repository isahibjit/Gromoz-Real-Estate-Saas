import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionGuard } from '../access/permission.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { HousingIntegrationsService } from './housing-integrations.service';

const userFrom = (req: any) => req.user ?? {};
const orgIdFrom = (req: any) =>
  req.tenant?.organizationId ||
  req.user?.organizationId ||
  req.headers['x-organization-id'] ||
  req.headers['x-tenant-id'];

@Controller('housing-integrations')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
export class HousingIntegrationsController {
  constructor(
    private readonly housingService: HousingIntegrationsService,
  ) {}

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
}

@Controller(['public/webhooks/housing', 'integrations/housing'])
export class PublicHousingWebhookController {
  constructor(
    private readonly housingService: HousingIntegrationsService,
  ) {}

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
