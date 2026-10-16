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
  Res,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../access/permission.guard';
import { HrService } from './hr.service';
import { TenantGuard } from '../common/tenant/tenant.guard';

const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER'] as const;
const employeeRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'SALES_MANAGER',
  'TEAM_LEADER',
  'MANAGER',
  'TELECALLER',
  'SALES_AGENT',
  'MARKETING',
  'BACKEND',
] as const;
const actor = (req: any) => req.user as { sub: string; role: string };

@Controller('employees')
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionGuard)
export class EmployeesController {
  constructor(private readonly hr: HrService) {}

  @Get()
  @Roles(...employeeRoles)
  @RequirePermission('employees')
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.hr.listEmployees(query, actor(req));
  }

  @Get('me')
  @Roles(...employeeRoles)
  me(@Req() req: any) {
    return this.hr.getEmployee(actor(req).sub, actor(req));
  }

  @Get(':id')
  @Roles(...employeeRoles)
  get(@Param('id') id: string, @Req() req: any) {
    return this.hr.getEmployee(id, actor(req));
  }

  @Post()
  @Roles(...adminRoles)
  @RequirePermission('employees', 'create')
  create(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.createEmployee(body, actor(req));
  }

  @Patch(':id')
  @Roles(...employeeRoles)
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.hr.updateEmployee(id, body, actor(req));
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('employees', 'delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hr.deleteEmployee(id, actor(req));
  }
}

@Controller('attendance')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('attendance')
export class AttendanceController {
  constructor(private readonly hr: HrService) {}

  @Get()
  @Roles(...employeeRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.hr.listAttendance(query, actor(req));
  }

  @Get('today')
  @Roles(...employeeRoles)
  today(@Req() req: any) {
    return this.hr.getTodayAttendance(actor(req));
  }

  @Get('report.pdf')
  @Roles(...employeeRoles)
  async reportPdf(
    @Query() query: Record<string, string>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const report = await this.hr.getAttendanceReportPdf(query, actor(req));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.fileName}"`,
    );
    return res.send(report.pdfBuffer);
  }

  @Post('punch-in')
  @Roles(...employeeRoles)
  @RequirePermission('attendance', 'punchIn')
  punchIn(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.punchIn(body, actor(req));
  }

  @Post('punch-out')
  @Roles(...employeeRoles)
  @RequirePermission('attendance', 'punchOut')
  punchOut(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.punchOut(body, actor(req));
  }

  @Patch(':id/correct')
  @Roles(...adminRoles)
  @RequirePermission('attendance', 'update')
  correct(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.hr.correctAttendance(id, body, actor(req));
  }
}

@Controller('shifts')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('shifts')
export class ShiftsController {
  constructor(private readonly hr: HrService) {}

  @Get()
  @Roles(...employeeRoles)
  list(@Query() query: Record<string, string>) {
    return this.hr.listShifts(query);
  }

  @Post()
  @Roles(...adminRoles)
  @RequirePermission('shifts', 'create')
  create(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.createShift(body, actor(req));
  }

  @Patch(':id')
  @Roles(...adminRoles)
  @RequirePermission('shifts', 'update')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.hr.updateShift(id, body, actor(req));
  }
}

@Controller('holidays')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('holidays')
export class HolidaysController {
  constructor(private readonly hr: HrService) {}

  @Get()
  @Roles(...employeeRoles)
  list(@Query() query: Record<string, string>) {
    return this.hr.listHolidays(query);
  }

  @Post()
  @Roles(...adminRoles)
  @RequirePermission('holidays', 'create')
  create(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.createHoliday(body, actor(req));
  }

  @Patch(':id')
  @Roles(...adminRoles)
  @RequirePermission('holidays', 'update')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.hr.updateHoliday(id, body, actor(req));
  }

  @Delete(':id')
  @Roles(...adminRoles)
  @RequirePermission('holidays', 'delete')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.hr.removeHoliday(id, actor(req));
  }
}

@Controller('leaves')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leaves')
export class LeavesController {
  constructor(private readonly hr: HrService) {}

  @Get()
  @Roles(...employeeRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.hr.listLeaves(query, actor(req));
  }

  @Post()
  @Roles(...employeeRoles)
  @RequirePermission('leaves', 'create')
  create(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.createLeave(body, actor(req));
  }

  @Patch(':id/cancel')
  @Roles(...employeeRoles)
  @RequirePermission('leaves', 'update')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.hr.cancelLeave(id, actor(req));
  }

  @Patch(':id/decision')
  @Roles(...adminRoles)
  @RequirePermission('leaves', 'update')
  decide(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.hr.decideLeave(id, body, actor(req));
  }
}

@Controller('payroll')
@UseGuards(AuthGuard, TenantGuard, RolesGuard, PermissionGuard)
@RequirePermission('payroll')
export class PayrollController {
  constructor(private readonly hr: HrService) {}

  @Get('settings')
  @Roles(...adminRoles)
  getSettings() {
    return this.hr.getPayrollSettings();
  }

  @Patch('settings')
  @Roles(...adminRoles)
  @RequirePermission('payroll', 'update')
  updateSettings(@Body() body: Record<string, any>) {
    return this.hr.updatePayrollSettings(body);
  }

  @Get()
  @Roles(...employeeRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.hr.listPayroll(query, actor(req));
  }

  @Post('run')
  @Roles(...adminRoles)
  @RequirePermission('payroll', 'create')
  run(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.runPayroll(body, actor(req));
  }

  @Patch(':id/draft')
  @Roles(...adminRoles)
  @RequirePermission('payroll', 'update')
  updateDraft(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.hr.updatePayrollDraft(id, body, actor(req));
  }

  @Patch(':id/finalize')
  @Roles(...adminRoles)
  @RequirePermission('payroll', 'update')
  finalize(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.hr.finalizePayroll(id, body, actor(req));
  }

  @Patch(':id/pay')
  @Roles(...adminRoles)
  @RequirePermission('payroll', 'update')
  pay(@Param('id') id: string, @Req() req: any) {
    return this.hr.markPayrollPaid(id, actor(req));
  }
}

@Controller('payslips')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('payslips')
export class PayslipsController {
  constructor(private readonly hr: HrService) {}

  @Get()
  @Roles(...employeeRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.hr.listPayslips(query, actor(req));
  }

  @Get(':id')
  @Roles(...employeeRoles)
  get(@Param('id') id: string, @Req() req: any) {
    return this.hr.getPayslip(id, actor(req));
  }
}

@Controller('mail')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('hr_settings')
export class MailController {
  constructor(private readonly hr: HrService) {}

  @Post('test-send')
  @Roles(...adminRoles)
  testSend(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.hr.sendMailTemplateTest(body, actor(req));
  }
}
