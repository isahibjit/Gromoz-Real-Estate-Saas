import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../access/permission.guard';
import { ApkUploadInterceptor } from './apk-upload.interceptor';
import type { ApkRequest } from './apk-upload.interceptor';
import { MobileAppService } from './mobile-app.service';
import { MobileAppAdminGuard } from './mobile-app-admin.guard';

@Controller('mobile-app')
@UseGuards(AuthGuard, RolesGuard, MobileAppAdminGuard, PermissionGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@RequirePermission('mobile_app')
export class MobileAppController {
  constructor(private readonly releases: MobileAppService) {}
  @Get('releases')
  @Header('Cache-Control', 'no-store')
  history(@Query('page') page?: string, @Query('limit') limit?: string) { return this.releases.history(page, limit); }

  @Post('releases')
  @RequirePermission('mobile_app', 'create')
  @UseInterceptors(ApkUploadInterceptor)
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() body: Record<string, unknown>, @Req() req: ApkRequest) {
    return this.releases.upload(file, body, req.user.sub, req.uploadSignal);
  }
  @Post('releases/:id/publish')
  @RequirePermission('mobile_app', 'update')
  publish(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: ApkRequest) { return this.releases.publish(id, req.user.sub); }

  @Post('unpublish')
  @RequirePermission('mobile_app', 'update')
  unpublish(@Req() req: ApkRequest) { return this.releases.unpublish(req.user.sub); }
}

@Controller('public/mobile-app')
export class PublicMobileAppController {
  constructor(private readonly releases: MobileAppService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  current() { return this.releases.current(); }

  @Get('download')
  async download(@Res() res: Response) {
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.redirect(302, await this.releases.download());
  }
}
