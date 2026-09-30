import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../access/permission.guard';
import { TeamsService } from './teams.service';
import { TenantGuard } from '../common/tenant/tenant.guard';

const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER'] as const;
const employeeRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER', 'TEAM_LEADER', 'MANAGER', 'TELECALLER', 'SALES_AGENT', 'MARKETING', 'BACKEND'] as const;
const actor = (req: any) => req.user as { sub: string; role: string };

@Controller('teams')
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionGuard)
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @Roles(...employeeRoles)
  list(@Req() req: any) {
    return this.teams.listTeams(actor(req));
  }

  @Get(':id')
  @Roles(...employeeRoles)
  get(@Param('id') id: string, @Req() req: any) {
    return this.teams.getTeam(id, actor(req));
  }

  @Post()
  @Roles(...adminRoles)
  @RequirePermission('teams', 'create')
  create(@Body() body: Record<string, any>) {
    return this.teams.createTeam(body);
  }

  @Patch(':id')
  @Roles(...adminRoles)
  @RequirePermission('teams', 'update')
  update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.teams.updateTeam(id, body);
  }

  @Post(':id/members')
  @Roles(...adminRoles)
  @RequirePermission('teams', 'update')
  addMember(@Param('id') id: string, @Body('memberUserId') memberUserId: string) {
    return this.teams.addMember(id, memberUserId);
  }

  @Delete(':id/members/:memberId')
  @Roles(...adminRoles)
  @RequirePermission('teams', 'delete')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.teams.removeMember(id, memberId);
  }
}
