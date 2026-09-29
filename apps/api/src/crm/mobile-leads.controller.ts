import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { PermissionGuard } from '../access/permission.guard';
import { CrmService } from './crm.service';

const userFrom = (req: any) => req.user ?? {};
const leadWorkspaceRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'TEAM_LEADER',
  'MANAGER',
  'SALES_AGENT',
  'TELECALLER',
  'MARKETING',
] as const;

@ApiTags('Mobile CRM')
@ApiBearerAuth('bearer')
@Controller('mobile/leads')
@UseGuards(AuthGuard, RolesGuard, PermissionGuard)
@RequirePermission('leads')
export class MobileLeadsController {
  constructor(private readonly crm: CrmService) {}

  @Get('summary')
  @Roles(...leadWorkspaceRoles)
  @ApiOperation({
    summary: 'Get database-calculated mobile dashboard stats cards, SLA, and filter pills',
    description:
      'Returns single-source-of-truth counts for all master statuses, temperatures, and follow-up metrics. Eliminates client-side counting.',
  })
  getSummary(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.getMobileLeadSummary(query, userFrom(req));
  }

  @Get('masters')
  @Roles(...leadWorkspaceRoles)
  @ApiOperation({
    summary: 'Get all master dropdown options for mobile filters and lead update modals',
    description:
      'Provides active statuses, temperatures, sources, projects, configurations, and assignees in a single payload.',
  })
  getMasters(@Req() req: any) {
    return this.crm.getMobileLeadMasters(userFrom(req));
  }

  @Get('follow-ups')
  @Roles(...leadWorkspaceRoles)
  @ApiOperation({
    summary: 'Get mobile follow-up queue with server-computed queue SLA summary',
    description:
      'Returns enriched follow-up records plus server-aggregated counts for today, overdue, upcoming, and breached SLAs.',
  })
  getFollowUps(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listMobileFollowUps(query, userFrom(req));
  }

  @Get()
  @Roles(...leadWorkspaceRoles)
  @ApiOperation({
    summary: 'List leads with mobile-optimized cards and relations pre-resolved',
    description:
      'Returns paginated leads with resolved master names, display colors, project details, latest follow-up, and formatted labels.',
  })
  list(@Query() query: Record<string, string>, @Req() req: any) {
    return this.crm.listMobileLeads(query, userFrom(req));
  }
}
