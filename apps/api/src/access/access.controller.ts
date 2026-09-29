import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from './permission.guard';
import { AccessService } from './access.service';

const accessRoles = ['SUPER_ADMIN', 'ADMIN', 'HR'] as const;
const actor = (req: any) => req.user as { sub: string; role: string };

@Controller('access')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('access_control')
export class AccessController {
  constructor(private readonly access: AccessService) {}

  @Get('modules')
  @Roles(...accessRoles)
  listModules() {
    return this.access.listModules();
  }

  @Get('templates')
  @Roles(...accessRoles)
  listTemplates() {
    return this.access.listTemplates();
  }

  @Patch('templates/:role')
  @Roles(...accessRoles)
  updateTemplate(
    @Param('role') role: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.access.updateTemplate(role, body, actor(req));
  }

  @Get('users/:id')
  @Roles(...accessRoles)
  getUserAccess(@Param('id') id: string) {
    return this.access.getUserAccess(id);
  }

  @Patch('users/:id')
  @Roles(...accessRoles)
  updateUserAccess(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.access.updateUserAccess(id, body, actor(req));
  }

  @Delete('users/:id')
  @Roles(...accessRoles)
  @RequirePermission('access_control', 'update')
  resetUserAccess(@Param('id') id: string, @Req() req: any) {
    return this.access.resetUserAccess(id, actor(req));
  }
}
