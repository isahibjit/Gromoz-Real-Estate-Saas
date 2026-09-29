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

  @Get('platform-plans')
  @UseGuards(AuthGuard)
  async getCommercialPlans() {
    return this.orgService.getCommercialPlans();
  }

  @Post('platform-plans')
  @UseGuards(AuthGuard)
  async createCommercialPlan(@Req() req: any, @Body() dto: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.createCommercialPlan(dto);
  }

  @Patch('platform-plans/:id')
  @UseGuards(AuthGuard)
  async updateCommercialPlan(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.updateCommercialPlan(id, dto);
  }

  @Post('platform-plans/:id/duplicate')
  @UseGuards(AuthGuard)
  async duplicateCommercialPlan(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.duplicateCommercialPlan(id);
  }

  @Patch('platform-plans/:id/archive')
  @UseGuards(AuthGuard)
  async archiveCommercialPlan(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.archiveCommercialPlan(id);
  }

  @Delete('platform-plans/:id')
  @UseGuards(AuthGuard)
  async deleteCommercialPlan(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.archiveCommercialPlan(id);
  }

  @Get('platform-audit-logs')
  @UseGuards(AuthGuard)
  async getPlatformAuditLogs(@Req() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.getPlatformAuditLogs();
  }

  @Get('tenant-details/:id')
  @UseGuards(AuthGuard)
  async getTenantDetails(@Req() req: any, @Query('id') id: string) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.getTenantDetails(id);
  }

  @Patch('tenant-status/:id')
  @UseGuards(AuthGuard)
  async updateTenantStatus(
    @Req() req: any,
    @Body('id') id: string,
    @Body('status') status: any,
  ) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Platform SuperAdmin access required');
    }
    return this.orgService.updateTenantStatus(id, status);
  }
}
