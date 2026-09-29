import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Options,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../access/permission.guard';
import { CrmService } from './crm.service';

const userFrom = (req: any) => req.user ?? {};
const leadReadRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'TEAM_LEADER',
  'MANAGER',
  'SALES_AGENT',
  'TELECALLER',
  'MARKETING',
  'BACKEND',
] as const;
const leadWorkspaceRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'TEAM_LEADER',
  'MANAGER',
  'SALES_AGENT',
  'TELECALLER',
  'BACKEND',
] as const;
const notificationRoles = [
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

enum PropertyMasterCategory {
  PROPERTY_TYPE = 'property_type',
  PROJECT_LOCATION = 'project_location',
  PROJECT_CONFIGURATION = 'project_configuration',
  POSSESSION_TIMELINE = 'possession_timeline',
  PROJECT_ZONE = 'project_zone',
  LEAD_BUDGET_RANGE = 'lead_budget_range',
  CARPET_AREA_RANGE = 'carpet_area_range',
  PROJECT_AMENITY = 'project_amenity',
  PROJECT_STATUS = 'project_status',
  PROJECT_DEVELOPER = 'project_developer',
  PROJECT_WHATSAPP_TEMPLATE = 'project_whatsapp_template',
  UNIT_TOWER = 'unit_tower',
  UNIT_FACING = 'unit_facing',
  UNIT_AVAILABILITY = 'unit_availability',
  UNIT_BOOKING_STATUS = 'unit_booking_status',
}

@Controller('leads')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class LeadsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(...leadReadRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listLeads(query, userFrom(req));
  }

  @Get('team-workspace')
  @Roles(...leadWorkspaceRoles)
  teamWorkspace(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.getTeamLeadWorkspace(query, userFrom(req));
  }

  @Get('field-executive/follow-ups')
  @Roles('SALES_AGENT')
  listFieldExecutiveFollowUps(
    @Query() query: Record<string, string>,
    @Req() req: any,
  ) {
    return this.crm.listFieldExecutiveFollowUps(query, userFrom(req).sub);
  }

  @Get('my-follow-ups')
  @Roles('SALES_AGENT', 'TELECALLER')
  listMyFollowUps(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listMyFollowUps(query, userFrom(req));
  }

  @Get('follow-ups')
  @Roles(...leadWorkspaceRoles)
  listFollowUps(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listFollowUps(query, userFrom(req));
  }

  @Get('pipeline')
  @Roles(...leadReadRoles)
  pipeline(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.getLeadPipeline(query, userFrom(req));
  }

  @Post()
  @Roles(...leadReadRoles)
  create(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createLead(body, userFrom(req));
  }

  @Patch('bulk/source')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  bulkSource(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.bulkUpdateLeadSource(body, userFrom(req));
  }

  @Get('deleted')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  listDeleted(@Query() query: Record<string, string>) {
    return this.crm.listDeletedLeads(query);
  }

  @Get(':id')
  @Roles(...leadReadRoles)
  get(@Param('id') id: string, @Req() req: any) {
    return this.crm.getLead(id, userFrom(req));
  }

  @Patch(':id')
  @Roles(...leadReadRoles)
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateLead(id, body, userFrom(req));
  }

  @Patch(':id/restore')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  restore(@Param('id') id: string, @Req() req: any) {
    return this.crm.restoreLead(id, userFrom(req).sub);
  }

  @Delete(':id/permanent')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  permanentRemove(@Param('id') id: string, @Req() req: any) {
    return this.crm.permanentlyDeleteLead(id, userFrom(req).sub);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  remove(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.softDeleteLead(id, body, userFrom(req).sub);
  }

  @Post(':id/pipeline-move')
  @Roles(...leadReadRoles)
  moveInPipeline(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.moveLeadInPipeline(id, body, userFrom(req).sub);
  }

  @Post(':id/assign')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  assign(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.assignLead(id, body, userFrom(req).sub);
  }

  @Post('bulk-assign')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  bulkAssign(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.bulkAssign(body, userFrom(req));
  }

  @Post(':id/follow-ups')
  @Roles(...leadWorkspaceRoles)
  createFollowUp(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createFollowUp(id, body, userFrom(req));
  }

  @Patch(':leadId/follow-ups/:id')
  @Roles(...leadWorkspaceRoles)
  updateFollowUp(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateFollowUp(id, body, userFrom(req));
  }

  @Get(':id/bookings')
  @Roles(...leadWorkspaceRoles)
  listLeadBookings(@Param('id') id: string, @Req() req: any) {
    return this.crm.listLeadBookings(id, userFrom(req));
  }

  @Post(':id/bookings')
  @Roles(...leadWorkspaceRoles)
  createBooking(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createBooking(id, body, userFrom(req));
  }

  @Patch(':leadId/bookings/:bookingId')
  @Roles(...leadWorkspaceRoles)
  updateBooking(
    @Param('leadId') leadId: string,
    @Param('bookingId') bookingId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateBooking(leadId, bookingId, body, userFrom(req));
  }

  @Get(':id/timeline')
  @Roles(...leadWorkspaceRoles)
  timeline(@Param('id') id: string) {
    return this.crm.getTimeline(id);
  }

  @Post(':id/tasks')
  @Roles(...leadWorkspaceRoles)
  createTask(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createTask(id, body, userFrom(req));
  }

  @Patch(':leadId/tasks/:taskId')
  @Roles(...leadWorkspaceRoles)
  updateTask(
    @Param('leadId') leadId: string,
    @Param('taskId') taskId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateTask(leadId, taskId, body, userFrom(req));
  }

  @Post(':id/notes')
  @Roles(...leadWorkspaceRoles)
  createNote(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createNote(id, body, userFrom(req));
  }
}

@Controller('tasks')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('tasks')
export class TasksController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(...leadWorkspaceRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listTasks(query, userFrom(req));
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  create(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createEmployeeTask(body, userFrom(req));
  }

  @Patch(':id')
  @Roles(...leadWorkspaceRoles)
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateEmployeeTask(id, body, userFrom(req));
  }
}

@Controller('contact-leads')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('contact_leads')
export class ContactLeadsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'SALES_MANAGER',
    'TEAM_LEADER',
    'MANAGER',
    'TELECALLER',
    'MARKETING',
  )
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listContactLeads(query, userFrom(req));
  }

  @Get('stats')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'SALES_MANAGER',
    'TEAM_LEADER',
    'MANAGER',
    'TELECALLER',
    'MARKETING',
  )
  stats(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.getContactLeadStats(query, userFrom(req));
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'TELECALLER', 'MARKETING')
  @RequirePermission('contact_leads', 'create')
  create(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createContactLead(body, userFrom(req).sub);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'TELECALLER', 'MARKETING')
  @RequirePermission('contact_leads', 'update')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateContactLead(id, body, userFrom(req).sub);
  }

  @Patch(':id/interest')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'TELECALLER', 'MARKETING')
  @RequirePermission('contact_leads', 'update')
  markInterested(@Param('id') id: string, @Req() req: any) {
    return this.crm.markContactLeadInterested(id, userFrom(req).sub);
  }

  @Patch(':id/not-interested')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'TELECALLER', 'MARKETING')
  @RequirePermission('contact_leads', 'update')
  markNotInterested(@Param('id') id: string, @Req() req: any) {
    return this.crm.markContactLeadNotInterested(id, userFrom(req).sub);
  }

  @Patch(':id/unarchive')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'TELECALLER', 'MARKETING')
  @RequirePermission('contact_leads', 'update')
  unarchive(@Param('id') id: string, @Req() req: any) {
    return this.crm.unarchiveContactLead(id, userFrom(req).sub);
  }

  @Post(':id/convert')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'TELECALLER', 'MARKETING')
  @RequirePermission('contact_leads', 'update')
  convert(@Param('id') id: string, @Req() req: any) {
    return this.crm.convertContactLead(id, userFrom(req).sub);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  @RequirePermission('contact_leads', 'delete')
  delete(@Param('id') id: string, @Req() req: any) {
    return this.crm.deleteContactLead(id, userFrom(req).sub);
  }
}

@Controller('lead-list-columns')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class LeadListColumnsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(...leadWorkspaceRoles)
  get(
    @Query() query: Record<string, string | string[] | undefined>,
    @Req() req: any,
  ) {
    return this.crm.getLeadListColumnPreference(query, userFrom(req));
  }

  @Patch()
  @Roles(...leadWorkspaceRoles)
  update(@Body() body: Record<string, any>, @Req() req: any) {
    const user = userFrom(req);
    return this.crm.updateLeadListColumnPreference(body, user.sub, user.role);
  }
}

@Controller('lead-field-permissions')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class LeadFieldPermissionsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(...leadWorkspaceRoles, 'HR')
  get(
    @Query() query: Record<string, string | string[] | undefined>,
    @Req() req: any,
  ) {
    return this.crm.getLeadUpdateFieldPreference(query, userFrom(req));
  }

  @Patch()
  @Roles('SUPER_ADMIN', 'ADMIN')
  update(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.updateLeadUpdateFieldPreference(body, userFrom(req).sub);
  }
}

@Controller('auto-assignment')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('auto_assignment_master')
export class AutoAssignmentController {
  constructor(private readonly crm: CrmService) {}

  @Get('rules')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  listRules() {
    return this.crm.listAutoAssignmentRules();
  }

  @Post('rules')
  @Roles('SUPER_ADMIN', 'ADMIN')
  createRule(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createAutoAssignmentRule(body, userFrom(req).sub);
  }

  @Patch('rules/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  updateRule(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateAutoAssignmentRule(id, body, userFrom(req).sub);
  }

  @Delete('rules/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  deleteRule(@Param('id') id: string) {
    return this.crm.deleteAutoAssignmentRule(id);
  }

  @Get('events')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  listEvents(@Query() query: Record<string, string>) {
    return this.crm.listAutoAssignmentEvents(query);
  }
}

@Controller('lead-masters')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
export class LeadMastersController {
  constructor(private readonly crm: CrmService) {}

  @Post('bulk-reorder')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('lead_masters', 'update')
  bulkReorder(
    @Body()
    body: {
      items: Array<{
        id: string;
        sortOrder: number;
        showInStatsCard?: boolean;
        showInFilterBar?: boolean;
        displayColor?: string;
      }>;
    },
    @Req() req: any,
  ) {
    return this.crm.bulkReorderMasters(body?.items ?? [], userFrom(req).sub);
  }

  @Get(':category')
  @Roles(...leadReadRoles)
  list(
    @Param('category') category: string,
    @Query() query: Record<string, string>,
  ) {
    return this.crm.listMasters(category, query);
  }

  @Post(':category')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('lead_masters', 'create')
  create(
    @Param('category') category: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createMaster(category, body, userFrom(req).sub);
  }

  @Patch(':category/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('lead_masters', 'update')
  update(
    @Param('category') category: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateMaster(category, id, body, userFrom(req).sub);
  }

  @Delete(':category/:id')
  @Roles('SUPER_ADMIN', 'ADMIN')
  @RequirePermission('lead_masters', 'delete')
  remove(
    @Param('category') category: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.crm.deleteMaster(category, id, userFrom(req).sub);
  }
}

@Controller('property-masters')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@Roles(...leadReadRoles)
@RequirePermission('property_masters')
export class PropertyMastersController {
  constructor(private readonly crm: CrmService) {}

  @Get(':category')
  list(
    @Param('category', new ParseEnumPipe(PropertyMasterCategory))
    category: PropertyMasterCategory,
    @Query() query: Record<string, string>,
  ) {
    return this.crm.listMasters(category, query);
  }

  @Post(':category')
  create(
    @Param('category', new ParseEnumPipe(PropertyMasterCategory))
    category: PropertyMasterCategory,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createMaster(category, body, userFrom(req).sub);
  }

  @Patch(':category/:id')
  update(
    @Param('category', new ParseEnumPipe(PropertyMasterCategory))
    category: PropertyMasterCategory,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateMaster(category, id, body, userFrom(req).sub);
  }

  @Delete(':category/:id')
  remove(
    @Param('category', new ParseEnumPipe(PropertyMasterCategory))
    category: PropertyMasterCategory,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.crm.deleteMaster(category, id, userFrom(req).sub);
  }
}

@Controller('projects')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
export class ProjectsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(...leadReadRoles)
  list(@Query() query: Record<string, string>) {
    return this.crm.listProjects(query);
  }

  @Post()
  @Roles(...leadReadRoles)
  create(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createProject(body, userFrom(req).sub);
  }

  @Get(':id/brokerage-rule')
  @Roles(...leadReadRoles, 'HR')
  getBrokerageRule(@Param('id') id: string) {
    return this.crm.getProjectBrokerageRule(id);
  }

  @Patch(':id/brokerage-rule')
  @Roles(...leadReadRoles, 'HR')
  updateBrokerageRule(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.upsertProjectBrokerageRule(id, body, userFrom(req));
  }

  @Get(':id')
  @Roles(...leadReadRoles)
  get(@Param('id') id: string) {
    return this.crm.getProject(id);
  }

  @Patch(':id')
  @Roles(...leadReadRoles)
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateProject(id, body, userFrom(req).sub);
  }

  @Get(':id/units')
  @Roles(...leadReadRoles)
  units(@Param('id') id: string) {
    return this.crm.listUnits(id);
  }

  @Get(':id/units/:unitId')
  @Roles(...leadReadRoles)
  unit(@Param('id') id: string, @Param('unitId') unitId: string) {
    return this.crm.getUnit(id, unitId);
  }

  @Post(':id/units')
  @Roles(...leadReadRoles)
  createUnit(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createUnit(id, body, userFrom(req).sub);
  }

  @Patch(':id/units/:unitId')
  @Roles(...leadReadRoles)
  updateUnit(
    @Param('id') id: string,
    @Param('unitId') unitId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateUnit(id, unitId, body, userFrom(req).sub);
  }

  @Get(':id/leads')
  @Roles(...leadReadRoles)
  leads(@Param('id') id: string, @Query() query: Record<string, string>) {
    return this.crm.listProjectLeads(id, query);
  }

  @Post(':id/units/:unitId/link-lead')
  @Roles(...leadReadRoles)
  linkLead(
    @Param('id') id: string,
    @Param('unitId') unitId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.linkLeadToUnit(id, unitId, body, userFrom(req).sub);
  }
}

@Controller('public-projects')
export class PublicProjectsController {
  constructor(private readonly crm: CrmService) {}

  @Get(':id')
  get(@Param('id') id: string) {
    return this.crm.getProject(id);
  }

  @Post(':id/inquire')
  inquire(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.crm.inquirePublicProject(id, body);
  }
}

@Controller('site-visits')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('site_visits')
export class SiteVisitsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(...leadWorkspaceRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listSiteVisits(query, userFrom(req));
  }

  @Get('options')
  @Roles(...leadWorkspaceRoles)
  options(@Query() query: Record<string, string>) {
    return this.crm.getSiteVisitOptions(query);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT', 'TELECALLER')
  create(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createSiteVisit(body, userFrom(req).sub);
  }

  @Post('tracking/ping')
  @Roles('SALES_AGENT')
  pingLocation(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.recordFieldExecutiveLocation(body, userFrom(req));
  }

  @Post('tracking/stop')
  @Roles('SALES_AGENT')
  stopLocation(@Req() req: any) {
    return this.crm.stopFieldExecutiveLocation(userFrom(req));
  }

  @Get('tracking/live')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER')
  liveLocations() {
    return this.crm.listLiveFieldExecutiveLocations();
  }

  @Get(':id')
  @Roles(...leadWorkspaceRoles)
  get(@Param('id') id: string, @Req() req: any) {
    return this.crm.getSiteVisit(id, userFrom(req));
  }

  @Patch(':id')
  @Roles(...leadWorkspaceRoles)
  update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateSiteVisit(id, body, userFrom(req).sub);
  }

  @Post(':id/check-in')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT')
  checkIn(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.checkInSiteVisit(id, body, userFrom(req));
  }

  @Post(':id/check-out')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT')
  checkOut(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.checkOutSiteVisit(id, body, userFrom(req));
  }
}

@Controller('bookings')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('bookings')
export class BookingsController {
  constructor(private readonly crm: CrmService) {}

  @Get('finance-report')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives')
  financeReport(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.getBookingFinanceReport(query, userFrom(req));
  }

  @Get('my-commissions')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'SALES_MANAGER',
    'TEAM_LEADER',
    'SALES_AGENT',
    'TELECALLER',
  )
  @RequirePermission('leads')
  myCommissions(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.getMyCommissions(query, userFrom(req));
  }

  @Get('finance-report/report.pdf')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives')
  async financeReportPdf(
    @Query() query: Record<string, string>,
    @Req() req: any,
    @Res() res: any,
  ) {
    const report = await this.crm.generateBookingFinanceReportPdf(
      query,
      userFrom(req),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.filename}"`,
      'Content-Length': report.pdfBuffer.length,
    });
    return res.send(report.pdfBuffer);
  }

  @Get('commission-targets')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives')
  commissionTargets(@Query() query: Record<string, string>) {
    return this.crm.listCommissionTargets(query);
  }

  @Patch('commission-targets')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  upsertCommissionTarget(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.upsertCommissionTarget(body, userFrom(req));
  }

  @Get('incentive-visibility')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives')
  incentiveVisibility() {
    return this.crm.listIncentiveVisibilitySettings();
  }

  @Patch('incentive-visibility')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  updateIncentiveVisibility(
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateIncentiveVisibilitySettings(body, userFrom(req));
  }

  @Get()
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'SALES_MANAGER',
    'SALES_AGENT',
    'TELECALLER',
  )
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listBookings(query, userFrom(req));
  }

  @Get(':id')
  @Roles(
    'SUPER_ADMIN',
    'ADMIN',
    'HR',
    'SALES_MANAGER',
    'SALES_AGENT',
    'TELECALLER',
  )
  get(@Param('id') id: string, @Req() req: any) {
    return this.crm.getBookingDetails(id, userFrom(req));
  }

  @Post(':id/payments')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  createPayment(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createBookingPayment(id, body, userFrom(req));
  }

  @Post(':bookingId/payments/:paymentId/reverse')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  reversePayment(
    @Param('bookingId') bookingId: string,
    @Param('paymentId') paymentId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.reverseBookingPayment(
      bookingId,
      paymentId,
      body,
      userFrom(req),
    );
  }

  @Post(':bookingId/incentives/:incentiveId/mark-paid')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  markIncentivePaid(
    @Param('bookingId') bookingId: string,
    @Param('incentiveId') incentiveId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.markBookingIncentivePaid(
      bookingId,
      incentiveId,
      body,
      userFrom(req),
    );
  }

  @Patch(':bookingId/incentives/:incentiveId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  updateBookingIncentive(
    @Param('bookingId') bookingId: string,
    @Param('incentiveId') incentiveId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateBookingIncentive(
      bookingId,
      incentiveId,
      body,
      userFrom(req),
    );
  }

  @Post(':bookingId/incentives/:incentiveId/reverse-payment')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  reverseIncentivePayment(
    @Param('bookingId') bookingId: string,
    @Param('incentiveId') incentiveId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.reverseBookingIncentivePayment(
      bookingId,
      incentiveId,
      body,
      userFrom(req),
    );
  }

  @Post(':bookingId/extra-incentives')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  createExtraIncentive(
    @Param('bookingId') bookingId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.createBookingExtraIncentive(bookingId, body, userFrom(req));
  }

  @Patch(':bookingId/extra-incentives/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  updateExtraIncentive(
    @Param('bookingId') bookingId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateBookingExtraIncentive(
      bookingId,
      id,
      body,
      userFrom(req),
    );
  }

  @Delete(':bookingId/extra-incentives/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  deleteExtraIncentive(
    @Param('bookingId') bookingId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.crm.deleteBookingExtraIncentive(bookingId, id, userFrom(req));
  }

  @Post(':bookingId/extra-incentives/:id/mark-paid')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  markExtraIncentivePaid(
    @Param('bookingId') bookingId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.markBookingExtraIncentivePaid(
      bookingId,
      id,
      body,
      userFrom(req),
    );
  }

  @Post(':bookingId/extra-incentives/:id/reverse-payment')
  @Roles('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER')
  @RequirePermission('incentives', 'update')
  reverseExtraIncentivePayment(
    @Param('bookingId') bookingId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.reverseBookingExtraIncentivePayment(
      bookingId,
      id,
      body,
      userFrom(req),
    );
  }
}

@Controller('call-logs')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class CallLogsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles(...leadWorkspaceRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listCallLogs(query, userFrom(req));
  }

  @Post()
  @Roles(...leadWorkspaceRoles)
  create(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createCallLog(body, userFrom(req).sub);
  }
}

@ApiTags('Lead Imports')
@ApiBearerAuth('bearer')
@Controller('lead-imports')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class LeadImportsController {
  constructor(private readonly crm: CrmService) {}

  @Get('stats')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getStats() {
    return this.crm.getLeadImportStats();
  }

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  list(@Query() query: Record<string, string>) {
    return this.crm.listLeadImports(query);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  create(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.createLeadImport(body, userFrom(req).sub);
  }
}

@Controller('integrations/magicbricks')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class MagicBricksIntegrationsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getConfig() {
    return this.crm.getMagicBricksIntegration();
  }

  @Patch()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  saveConfig(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.saveMagicBricksIntegration(body, userFrom(req).sub);
  }

  @Post('generate-api-key')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  regenerateApiKey(@Req() req: any) {
    return this.crm.regenerateMagicBricksApiKey(userFrom(req).sub);
  }

  @Patch('field-mapping')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  saveFieldMapping(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.saveMagicBricksFieldMapping(body, userFrom(req).sub);
  }

  @Post('test')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  test(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.testMagicBricksIntegration(
      body,
      userFrom(req).sub,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

@Controller('integrations/website')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class WebsiteIntegrationsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getConfig() {
    return this.crm.getWebsiteIntegration();
  }

  @Patch()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  saveConfig(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.saveWebsiteIntegration(body, userFrom(req).sub);
  }

  @Post('websites')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  addWebsite(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.addWebsiteUrl(body, userFrom(req).sub);
  }

  @Delete('websites/:websiteId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  deleteWebsite(@Param('websiteId') websiteId: string, @Req() req: any) {
    return this.crm.deleteWebsiteUrl(websiteId, userFrom(req).sub);
  }

  @Patch('websites/:websiteId/routing')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  saveRouting(
    @Param('websiteId') websiteId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.saveWebsiteRouting(websiteId, body, userFrom(req).sub);
  }

  @Post('generate-api-key')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  regenerateApiKey(@Req() req: any) {
    return this.crm.regenerateWebsiteApiKey(userFrom(req).sub);
  }

  @Patch('field-mapping')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  saveFieldMapping(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.saveWebsiteFieldMapping(body, userFrom(req).sub);
  }

  @Post('test')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  test(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.testWebsiteIntegration(
      body,
      userFrom(req).sub,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('delivery-logs')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  deliveryLogs(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listWebsiteDeliveryLogs(query, userFrom(req).sub);
  }
}

@Controller(['integrations/website', 'api/integrations/website'])
export class PublicWebsiteWebhookController {
  constructor(private readonly crm: CrmService) {}

  private setCorsHeaders(req: any, res: any) {
    let origin = req.headers['origin'];
    if (!origin) {
      try {
        if (req.headers['referer']) {
          origin = new URL(req.headers['referer']).origin;
        }
      } catch (e) {
        origin = '*';
      }
    }
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-API-Key, x-api-key, Accept, X-Requested-With, Origin',
    );
  }

  @Options('leads')
  @Options('webhook')
  @Options('tracker.js')
  optionsPreflight(@Req() req: any, @Res() res: any) {
    this.setCorsHeaders(req, res);
    return res.status(204).send();
  }

  @Get('tracker.js')
  @Header('Content-Type', 'application/javascript')
  getTrackerScript(@Req() req: any, @Res() res: any) {
    this.setCorsHeaders(req, res);
    const scriptContent = `
(function() {
  try {
    console.log('[Truroot CRM] Website Lead Tracker active.');
    
    function sendLeadPayload(targetForm) {
      try {
        var form = targetForm || (document.forms && document.forms[0]) || document.querySelector('form');
        var now = Date.now();
        if (form && form._lastTrurootSent && (now - form._lastTrurootSent < 2000)) return;
        if (form) form._lastTrurootSent = now;

        var payload = {};
        if (form && typeof FormData !== 'undefined') {
          try {
            var formData = new FormData(form);
            formData.forEach(function(val, key) { if (key) payload[key] = val; });
          } catch(fdErr) {}
        }
        
        // Fallback DOM extraction for input elements across form or document
        var scope = (form && form.querySelectorAll) ? form : document;
        if (scope && scope.querySelectorAll) {
          scope.querySelectorAll('input, select, textarea').forEach(function(inp) {
            if (inp && inp.name && inp.value && !payload[inp.name]) {
              payload[inp.name] = inp.value;
            }
          });
        }
        payload.websiteUrl = window.location.href;
        
        var mobileVal = payload.mobile || payload.fullMobileNo || payload.phone || payload.tel || payload.Mobile || payload.contact;
        var nameVal = payload.name || payload.full_name || payload.fullName || payload.FirstName;
        
        if (mobileVal || nameVal) {
          var jsonString = JSON.stringify(payload);
          var targetUrl = 'https://crmtrueroot.com/api/integrations/website/leads';
          
          var sent = false;
          if (navigator.sendBeacon) {
            try {
              var blob = new Blob([jsonString], { type: 'text/plain' });
              sent = navigator.sendBeacon(targetUrl, blob);
            } catch(bErr) {}
          }
          
          if (!sent) {
            try {
              fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: jsonString,
                keepalive: true,
                mode: 'cors'
              }).catch(function(err) {});
            } catch(fErr) {}
          }
        }
      } catch(ex) {}
    }

    function captureForm(form) {
      if (!form || typeof form !== 'object' || !form.getAttribute || form.getAttribute('data-truroot-bound')) return;
      form.setAttribute('data-truroot-bound', 'true');
      
      form.addEventListener('submit', function(e) {
        sendLeadPayload(form);
      }, true);

      var buttons = form.querySelectorAll('button, input[type="submit"]');
      if (buttons && buttons.forEach) {
        buttons.forEach(function(btn) {
          btn.addEventListener('click', function() {
            setTimeout(function() { sendLeadPayload(form); }, 30);
          });
        });
      }
    }

    function initTracker() {
      var forms = document.querySelectorAll('form');
      if (forms && forms.forEach) {
        forms.forEach(captureForm);
      }
      
      try {
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(m) {
            if (m.addedNodes && m.addedNodes.forEach) {
              m.addedNodes.forEach(function(node) {
                if (node && node.nodeType === 1) {
                  if (node.tagName === 'FORM') captureForm(node);
                  else if (node.querySelectorAll) {
                    var innerForms = node.querySelectorAll('form');
                    if (innerForms && innerForms.forEach) innerForms.forEach(captureForm);
                  }
                }
              });
            }
          });
        });
        if (document.body) {
          observer.observe(document.body, { childList: true, subtree: true });
        }
      } catch(e) {}
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTracker);
    } else {
      initTracker();
    }
  } catch(topErr) {}
})();
`;
    return res.type('application/javascript').send(scriptContent);
  }

  @Get('leads')
  @Get('webhook')
  @Get('leads/:keyId')
  @Get('webhook/:keyId')
  async ingestGet(
    @Query() query: Record<string, any>,
    @Param('keyId') keyId: string | undefined,
    @Req() req: any,
    @Res() res: any,
  ) {
    this.setCorsHeaders(req, res);
    const result = await this.crm.receiveWebsiteLead(
      query,
      query.ApiKey ?? query.api_key ?? query.apikey ?? keyId,
      req.ip,
      req.headers['user-agent'],
    );
    return this.handleWebhookResponse(req, res, query, result);
  }

  @Post('leads')
  @Post('webhook')
  @Post('leads/:keyId')
  @Post('webhook/:keyId')
  async ingest(
    @Body() body: any,
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('keyId') keyId: string | undefined,
    @Req() req: any,
    @Res() res: any,
  ) {
    this.setCorsHeaders(req, res);
    let payload = body || req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (e) {
        try {
          const params = new URLSearchParams(payload as string);
          const parsed: Record<string, any> = {};
          params.forEach((v, k) => {
            if (k) parsed[k] = v;
          });
          payload = Object.keys(parsed).length > 0 ? parsed : body;
        } catch {
          payload = body;
        }
      }
    }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      payload = typeof body === 'object' ? body : {};
    }
    // Merge query parameters if body didn't contain name/mobile
    if (req.query && typeof req.query === 'object') {
      payload = { ...req.query, ...payload };
    }
    const result = await this.crm.receiveWebsiteLead(
      payload,
      apiKey ?? payload?.apiKey ?? payload?.api_key ?? keyId,
      req.ip,
      req.headers['user-agent'],
    );
    return this.handleWebhookResponse(req, res, payload, result);
  }

  private handleWebhookResponse(req: any, res: any, payload: any, result: any) {
    const acceptHeader = String(req.headers['accept'] ?? '').toLowerCase();
    const isHtmlSubmit =
      acceptHeader.includes('text/html') ||
      !acceptHeader.includes('application/json');
    const redirectUrl =
      payload?.redirectUrl ||
      payload?.redirect_url ||
      payload?.redirect ||
      payload?.next;

    if (
      isHtmlSubmit &&
      redirectUrl &&
      typeof redirectUrl === 'string' &&
      redirectUrl.startsWith('http')
    ) {
      return res.redirect(302, redirectUrl);
    }

    if (isHtmlSubmit) {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Inquiry Received | Truroot Realty</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
            .card { background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 440px; width: 90%; }
            .icon { width: 64px; height: 64px; background: #f0fdf4; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; font-weight: bold; }
            h2 { margin: 0 0 10px; color: #0f172a; font-size: 24px; font-weight: 800; }
            p { margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.5; }
            .btn { display: inline-block; background: #780037; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Thank You!</h2>
            <p>Your inquiry has been received successfully. Our sales executive will get back to you shortly.</p>
            <a href="javascript:history.back()" class="btn">← Back to Website</a>
          </div>
        </body>
        </html>
      `;
      return res.type('text/html').send(html);
    }

    return res.status(200).json(result);
  }
}

@Controller(['v1/incoming-leads', 'api/v1/incoming-leads'])
export class PublicIncomingLeadsWebhookController {
  constructor(private readonly crm: CrmService) {}

  @Options()
  @Options(':keyId')
  @Options(':keyId/:subKey')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  @Header('Access-Control-Allow-Headers', '*')
  optionsPreflight(@Res() res: any) {
    return res.status(200).send();
  }

  @Get()
  @Get(':keyId')
  @Get(':keyId/:subKey')
  @Header('Access-Control-Allow-Origin', '*')
  async ingestGet(
    @Query() query: Record<string, any>,
    @Param('keyId') keyId: string | undefined,
    @Req() req: any,
    @Res() res: any,
  ) {
    const result = await this.crm.receiveWebsiteLead(
      query,
      query.ApiKey ?? query.api_key ?? query.apikey ?? keyId,
      req.ip,
      req.headers['user-agent'],
    );
    return this.handleWebhookResponse(req, res, query, result);
  }

  @Post()
  @Post(':keyId')
  @Post(':keyId/:subKey')
  @Header('Access-Control-Allow-Origin', '*')
  async ingest(
    @Body() body: Record<string, any>,
    @Headers('x-api-key') apiKey: string | undefined,
    @Param('keyId') keyId: string | undefined,
    @Req() req: any,
    @Res() res: any,
  ) {
    const result = await this.crm.receiveWebsiteLead(
      body,
      apiKey ?? body?.apiKey ?? body?.api_key ?? keyId,
      req.ip,
      req.headers['user-agent'],
    );
    return this.handleWebhookResponse(req, res, body, result);
  }

  private handleWebhookResponse(req: any, res: any, payload: any, result: any) {
    const acceptHeader = String(req.headers['accept'] ?? '').toLowerCase();
    const isHtmlSubmit =
      acceptHeader.includes('text/html') ||
      !acceptHeader.includes('application/json');
    const redirectUrl =
      payload?.redirectUrl ||
      payload?.redirect_url ||
      payload?.redirect ||
      payload?.next;

    if (
      isHtmlSubmit &&
      redirectUrl &&
      typeof redirectUrl === 'string' &&
      redirectUrl.startsWith('http')
    ) {
      return res.redirect(302, redirectUrl);
    }

    if (isHtmlSubmit) {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Inquiry Received | Truroot Realty</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
            .card { background: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 440px; width: 90%; }
            .icon { width: 64px; height: 64px; background: #f0fdf4; color: #16a34a; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 32px; font-weight: bold; }
            h2 { margin: 0 0 10px; color: #0f172a; font-size: 24px; font-weight: 800; }
            p { margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.5; }
            .btn { display: inline-block; background: #780037; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✓</div>
            <h2>Thank You!</h2>
            <p>Your inquiry has been received successfully. Our sales executive will get back to you shortly.</p>
            <a href="javascript:history.back()" class="btn">← Back to Website</a>
          </div>
        </body>
        </html>
      `;
      return res.type('text/html').send(html);
    }

    return res.status(200).json(result);
  }
}

@Controller('integrations/meta')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class MetaIntegrationsController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  getConfig(@Req() req: any) {
    return this.crm.getMetaIntegration(userFrom(req).sub);
  }

  @Patch()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  saveConfig(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.saveMetaIntegration(body, userFrom(req).sub);
  }

  @Post('regenerate-verify-token')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  regenerateVerifyToken(@Req() req: any) {
    return this.crm.regenerateMetaVerifyToken(userFrom(req).sub);
  }

  @Patch('field-mapping')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  saveFieldMapping(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.saveMetaFieldMapping(body, userFrom(req).sub);
  }

  @Get('oauth/start')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  startOAuth(
    @Query('reconnectAccountId') reconnectAccountId: string | undefined,
    @Req() req: any,
  ) {
    return this.crm.startMetaOAuth(userFrom(req).sub, reconnectAccountId);
  }

  @Get('forms')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  listForms(@Query('pageId') pageId: string, @Req() req: any) {
    return this.crm.listMetaLeadForms(pageId, userFrom(req).sub);
  }

  @Get('delivery-logs')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  deliveryLogs(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listMetaDeliveryLogs(query, userFrom(req).sub);
  }

  @Post('pages/manual')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  addManualPage(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.addManualMetaPage(body, userFrom(req).sub);
  }

  @Patch('accounts/:accountId/pause')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  toggleAccountPause(
    @Param('accountId') accountId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.toggleMetaAccountPause(
      accountId,
      Boolean(body.isPaused),
      userFrom(req).sub,
    );
  }

  @Patch('pages/:pageId/pause')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  togglePagePause(
    @Param('pageId') pageId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.toggleMetaPagePause(
      pageId,
      Boolean(body.isPaused),
      userFrom(req).sub,
    );
  }

  @Patch('forms/:formId/pause')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  toggleFormPause(
    @Param('formId') formId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.toggleMetaFormPause(
      formId,
      Boolean(body.isPaused),
      userFrom(req).sub,
    );
  }

  @Patch('pages/:pageId/forms')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  savePageForms(
    @Param('pageId') pageId: string,
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.saveMetaPageForms(pageId, body, userFrom(req).sub);
  }

  @Delete('accounts/:accountId')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  disconnectAccount(@Param('accountId') accountId: string, @Req() req: any) {
    return this.crm.disconnectMetaAccount(accountId, userFrom(req).sub);
  }
}

@Controller('integrations/magicbricks')
export class PublicMagicBricksWebhookController {
  constructor(private readonly crm: CrmService) {}

  @Get('leads')
  ingestGet(@Query() query: Record<string, any>, @Req() req: any) {
    return this.crm.receiveMagicBricksLead(
      query,
      query.ApiKey ?? query.api_key ?? query.apikey,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('leads')
  ingest(
    @Body() body: Record<string, any>,
    @Headers('x-api-key') apiKey: string | undefined,
    @Req() req: any,
  ) {
    return this.crm.receiveMagicBricksLead(
      body,
      apiKey,
      req.ip,
      req.headers['user-agent'],
    );
  }
}

@Controller('integrations/meta')
export class PublicMetaWebhookController {
  constructor(private readonly crm: CrmService) {}

  @Get('oauth/callback')
  async oauthCallback(@Query() query: Record<string, any>, @Res() res: any) {
    const redirectUrl = await this.crm.completeMetaOAuth(query);
    return res.redirect(redirectUrl);
  }

  @Get('webhook')
  async verify(@Query() query: Record<string, any>, @Res() res: any) {
    const challenge = await this.crm.verifyMetaWebhook(query);
    return res.status(200).send(challenge);
  }

  @Post('webhook')
  ingest(@Body() body: Record<string, any>, @Req() req: any) {
    return this.crm.receiveMetaWebhook(body, req.ip, req.headers['user-agent']);
  }
}

@Controller('duplicates')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class DuplicatesController {
  constructor(private readonly crm: CrmService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  list() {
    return this.crm.listDuplicates();
  }
}

@Controller('reports')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('dashboard')
export class ReportsController {
  constructor(private readonly crm: CrmService) {}

  @Get('source-analytics')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  sourceAnalytics() {
    return this.crm.getSourceAnalytics();
  }

  @Get('conversion-analytics')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MARKETING')
  conversionAnalytics(@Query() query: Record<string, string>) {
    return this.crm.getConversionAnalytics(query);
  }
}

@Controller('notifications')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('notifications')
export class NotificationsController {
  constructor(private readonly crm: CrmService) {}

  @Get('settings')
  @Roles('SUPER_ADMIN', 'ADMIN')
  getNotificationSettings() {
    return this.crm.getNotificationSettings();
  }

  @Patch('settings')
  @Roles('SUPER_ADMIN', 'ADMIN')
  updateNotificationSettings(
    @Body() body: Record<string, any>,
    @Req() req: any,
  ) {
    return this.crm.updateNotificationSettings(body, userFrom(req));
  }

  @Get()
  @Roles(...notificationRoles)
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listNotifications(query, userFrom(req));
  }

  @Patch(':id/read')
  @Roles(...notificationRoles)
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.crm.markNotificationRead(id, userFrom(req));
  }

  @Patch('mark-all-read')
  @Roles(...notificationRoles)
  markAllRead(@Req() req: any) {
    return this.crm.markAllNotificationsRead(userFrom(req));
  }

  @Post('device-tokens')
  @Roles(...notificationRoles)
  registerDeviceToken(@Body() body: Record<string, unknown>, @Req() req: any) {
    return this.crm.registerNotificationDeviceToken(body, userFrom(req));
  }

  @Delete('device-tokens')
  @Roles(...notificationRoles)
  unregisterDeviceToken(
    @Body() body: Record<string, unknown>,
    @Req() req: any,
  ) {
    return this.crm.unregisterNotificationDeviceToken(body, userFrom(req));
  }

  @Post('test-push')
  @Roles('SUPER_ADMIN', 'ADMIN')
  testPushNotification(@Body() body: any, @Req() req: any) {
    const targetUserId = body?.userId || userFrom(req).sub;
    return this.crm.sendTestPushNotification(
      targetUserId,
      body?.title,
      body?.description,
    );
  }

  @Post('send')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MANAGER')
  sendBroadcastNotification(@Body() body: any, @Req() req: any) {
    return this.crm.sendBroadcastNotification(body, userFrom(req));
  }

  @Get('recipients')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MANAGER', 'TEAM_LEADER')
  listRecipients(@Query() query: Record<string, string>) {
    return this.crm.listNotificationRecipients(query);
  }

  @Get('broadcasts')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MANAGER')
  listBroadcasts(@Query() query: Record<string, string>) {
    return this.crm.listBroadcastNotifications(query);
  }

  @Post('resend/:id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MANAGER')
  resendBroadcast(@Param('id') id: string, @Req() req: any) {
    return this.crm.resendBroadcastNotification(id, userFrom(req));
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'MANAGER')
  removeNotification(@Param('id') id: string, @Req() req: any) {
    return this.crm.deleteNotification(id, userFrom(req));
  }
}
