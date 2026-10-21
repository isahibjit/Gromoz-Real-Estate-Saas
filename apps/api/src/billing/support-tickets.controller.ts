import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { TenantId } from '../common/tenant/tenant.decorator';
import {
  AllowSubscriptionAccess,
  SubscriptionAdminGuard,
} from '../common/tenant/subscription-admin.guard';
import { SupportTicketsService } from './support-tickets.service';
import {
  CreateTicketDto,
  TicketsQuery,
  UpdateTicketStatusDto,
} from './workspace.dto';
@Controller('support/tickets')
@AllowSubscriptionAccess()
@UseGuards(AuthGuard, TenantGuard, SubscriptionAdminGuard)
export class SupportTicketsController {
  constructor(private readonly tickets: SupportTicketsService) {}
  @Get() list(@TenantId() id: string, @Query() query: TicketsQuery) {
    return this.tickets.list(id, query);
  }
  @Post() create(
    @TenantId() id: string,
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateTicketDto,
  ) {
    return this.tickets.create(id, req.user.sub, dto);
  }
  @Get(':code') detail(@TenantId() id: string, @Param('code') code: string) {
    return this.tickets.detail(id, code);
  }
  @Post(':code/retry-email') retry(
    @TenantId() id: string,
    @Param('code') code: string,
  ) {
    return this.tickets.retryDelivery(id, code);
  }
  @Patch(':code/status') status(
    @TenantId() id: string,
    @Param('code') code: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.tickets.updateStatus(id, code, dto.status);
  }
}
