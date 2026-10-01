import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../access/permission.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('admin')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('dashboard')
  async getAdminDashboard(@Query() query: Record<string, string>) {
    return this.dashboardService.getAdminDashboardData(query);
  }

  @Get('admin/performance')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('performance')
  async getAdminPerformance(@Query() query: Record<string, string>) {
    return this.dashboardService.getAdminPerformanceData(query);
  }

  @Get('admin/calling-performance')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'SALES_MANAGER',
    'TEAM_LEADER',
    'MANAGER',
    'TELECALLER',
    'SALES_AGENT',
  )
  @RequirePermission('performance')
  async getAdminCallingPerformance(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.dashboardService.getAdminCallingPerformanceData(
      query,
      req.user,
    );
  }

  @Get('admin/calling-performance/report.pdf')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'SALES_MANAGER',
    'TEAM_LEADER',
    'MANAGER',
    'TELECALLER',
    'SALES_AGENT',
  )
  @RequirePermission('performance')
  async getAdminCallingPerformancePdf(
    @Query() query: Record<string, string>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const report = await this.dashboardService.generateCallingPerformancePdf(
      query,
      req.user,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.filename}"`,
      'Content-Length': report.pdfBuffer.length,
    });
    return res.send(report.pdfBuffer);
  }

  @Get('admin/lead-performance')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('performance')
  async getAdminLeadPerformance(@Query() query: Record<string, string>) {
    return this.dashboardService.getAdminLeadPerformanceData(query);
  }

  @Get('admin/lead-performance/report.pdf')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('performance')
  async getAdminLeadPerformancePdf(
    @Query() query: Record<string, string>,
    @Res() res: any,
  ) {
    const report = await this.dashboardService.generateLeadPerformancePdf(
      query,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.filename}"`,
      'Content-Length': report.pdfBuffer.length,
    });
    return res.send(report.pdfBuffer);
  }

  @Get('my-performance')
  @Roles('TELECALLER', 'SALES_AGENT', 'TEAM_LEADER', 'MANAGER')
  @RequirePermission('performance')
  async getMyPerformance(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.dashboardService.getMyLeadPerformanceData(query, req.user);
  }

  @Get('my-performance/report.pdf')
  @Roles('TELECALLER', 'SALES_AGENT', 'TEAM_LEADER', 'MANAGER')
  @RequirePermission('performance')
  async getMyPerformancePdf(
    @Query() query: Record<string, string>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const report = await this.dashboardService.generateMyLeadPerformancePdf(
      query,
      req.user,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.filename}"`,
      'Content-Length': report.pdfBuffer.length,
    });
    return res.send(report.pdfBuffer);
  }

  @Get('rankings')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'SALES_MANAGER',
    'TELECALLER',
    'SALES_AGENT',
  )
  @RequirePermission('top_performers')
  async getRankings(@Query() query: Record<string, string>, @Req() req: any) {
    return this.dashboardService.getDashboardRankings(query, req.user);
  }

  @Get('telecaller')
  @Roles('TELECALLER', 'ADMIN', 'SUPER_ADMIN')
  @RequirePermission('dashboard')
  async getTelecallerDashboard(@Req() req: any) {
    const userId = req.user?.sub;
    return this.dashboardService.getTelecallerDashboardData(userId);
  }

  @Get('field-executive')
  @Roles('SALES_AGENT')
  @RequirePermission('dashboard')
  async getFieldExecutiveDashboard(@Req() req: any) {
    return this.dashboardService.getFieldExecutiveDashboardData(req.user?.sub);
  }
}
