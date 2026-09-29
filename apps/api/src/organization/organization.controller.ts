import {
  Body,
  Controller,
  Get,
  Post,
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
} from './organization.service';

@Controller('organizations')
export class OrganizationController {
  constructor(private readonly orgService: OrganizationService) {}

  @Post('register')
  async registerOrganization(@Body() dto: RegisterOrgDto) {
    return this.orgService.registerOrganization(dto);
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
