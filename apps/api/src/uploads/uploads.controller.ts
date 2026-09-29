import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UploadsService } from './uploads.service';
import type {
  UploadedImageFile,
  UploadedProjectBrochureFile,
} from './uploads.service';

const uploadRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'SALES_MANAGER',
  'TEAM_LEADER',
  'MANAGER',
  'SALES_AGENT',
  'TELECALLER',
  'MARKETING',
  'BACKEND',
] as const;

@Controller('uploads')
@UseGuards(AuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('images')
  @Roles(...uploadRoles)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  uploadImage(@UploadedFile() file: UploadedImageFile, @Req() req: any) {
    return this.uploads.uploadImage(file, req.user?.sub);
  }

  @Post('project-videos')
  @Roles(...uploadRoles)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }),
  )
  uploadProjectVideo(
    @UploadedFile() file: UploadedImageFile,
    @Req() req: any,
  ) {
    return this.uploads.uploadProjectVideo(file, req.user?.sub);
  }

  @Post('project-brochures')
  @Roles(...uploadRoles)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }),
  )
  uploadProjectBrochure(
    @UploadedFile() file: UploadedProjectBrochureFile,
    @Req() req: any,
  ) {
    return this.uploads.uploadProjectBrochure(file, req.user?.sub);
  }
}
