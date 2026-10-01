import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { GoogleMapsIntegrationService } from './google-maps-integration.service';

type AuthenticatedRequest = Request & { user: { sub: string } };

export class SaveGoogleMapsConfigDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(20)
  @MaxLength(256)
  @Matches(/^\S+$/, { message: 'Google Maps API key cannot contain spaces' })
  apiKey!: string;
}

@Controller('integrations/google-maps')
@UseGuards(AuthGuard, TenantGuard)
export class GoogleMapsIntegrationController {
  constructor(private readonly googleMaps: GoogleMapsIntegrationService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  getMetadata() {
    return this.googleMaps.getMetadata();
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  save(
    @Body() body: SaveGoogleMapsConfigDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.googleMaps.save(body.apiKey, req.user.sub);
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  remove(@Req() req: AuthenticatedRequest) {
    return this.googleMaps.remove(req.user.sub);
  }

  @Get('runtime')
  getRuntimeConfig() {
    return this.googleMaps.getRuntimeConfig();
  }
}
