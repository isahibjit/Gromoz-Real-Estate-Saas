import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { CurrentTenant, TenantId } from '../common/tenant/tenant.decorator';
import {
  InviteMemberDto,
  OrganizationService,
  RegisterOrgDto,
  UpdateWorkspaceSettingsDto,
} from './organization.service';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post('register')
  async registerOrganization(@Body() dto: RegisterOrgDto) {
    return this.orgService.registerOrganization(dto);
  }

  @Get('resolve-domain')
  async resolveDomain(@Query('host') host: string) {
    return this.orgService.resolveDomain(host || '');
  }

  @Get('my-orgs')
  @UseGuards(AuthGuard)
  async getUserOrganizations(@Req() req: any) {
    return this.orgService.getUserOrganizations(req.user.sub);
  }

  @Get('current')
  @UseGuards(AuthGuard, TenantGuard)
  async getCurrentOrganization(@TenantId() tenantId: string) {
    return this.orgService.getCurrentOrganization(tenantId);
  }

  @Get('workspace-settings')
  @UseGuards(AuthGuard, TenantGuard)
  async getWorkspaceSettings(@TenantId() tenantId: string) {
    return this.orgService.getWorkspaceSettings(tenantId);
  }

  @Patch('workspace-settings')
  @UseGuards(AuthGuard, TenantGuard)
  async updateWorkspaceSettings(
    @TenantId() tenantId: string,
    @Body() dto: UpdateWorkspaceSettingsDto,
  ) {
    return this.orgService.updateWorkspaceSettings(tenantId, dto);
  }

  @Post('custom-domain/verify')
  @UseGuards(AuthGuard, TenantGuard)
  async verifyCustomDomain(@TenantId() tenantId: string) {
    return this.orgService.verifyCustomDomain(tenantId);
  }

  @Post('invite')
  @UseGuards(AuthGuard, TenantGuard)
  async inviteMember(
    @TenantId() tenantId: string,
    @Req() req: any,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgService.inviteMember(tenantId, req.user.sub, dto);
  }

  @Get('platform-metrics')
  @UseGuards(AuthGuard)
  async getSuperAdminMetrics(@Req() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.getPlatformSuperAdminMetrics();
  }
}
