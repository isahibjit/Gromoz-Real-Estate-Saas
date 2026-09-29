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

@Controller('housing-integrations')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
export class HousingIntegrationsController {
  constructor(
    private readonly housingService: HousingIntegrationsService,
  ) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getIntegration(@Req() req: any) {
    return this.housingService.getHousingIntegration(userFrom(req).sub);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  saveIntegration(
    @Body() body: { isActive?: boolean; apiKey?: string },
    @Req() req: any,
  ) {
    return this.housingService.saveHousingIntegration(body, userFrom(req).sub);
  }

  @Post('regenerate-key')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  regenerateKey(@Req() req: any) {
    return this.housingService.regenerateWebhookKey(userFrom(req).sub);
  }

  @Post('field-mapping')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  saveFieldMapping(@Body() body: { fieldMapping: any }, @Req() req: any) {
    return this.housingService.saveFieldMapping(
      body.fieldMapping,
      userFrom(req).sub,
    );
  }

  @Post('test')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('leads', 'update')
  testIntegration(@Body() body: any, @Req() req: any) {
    return this.housingService.testIntegration(body, userFrom(req).sub);
  }
}

@Controller('public/webhooks/housing')
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
}
