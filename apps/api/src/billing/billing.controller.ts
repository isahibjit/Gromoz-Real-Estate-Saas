import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import { CurrentTenant, TenantId } from '../common/tenant/tenant.decorator';
import {
  BillingService,
  SetupCheckoutDto,
  UpgradeSeatsDto,
  VerifyPaymentDto,
} from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('overview')
  @UseGuards(AuthGuard, TenantGuard)
  async getOverview(@TenantId() tenantId: string) {
    return this.billingService.getOverview(tenantId);
  }

  @Post('setup-checkout')
  @UseGuards(AuthGuard, TenantGuard)
  async createSetupCheckout(
    @TenantId() tenantId: string,
    @Body() dto: SetupCheckoutDto,
  ) {
    return this.billingService.createSetupCheckout(tenantId, dto);
  }

  @Post('verify-setup')
  @UseGuards(AuthGuard, TenantGuard)
  async verifyAndActivateSetup(
    @TenantId() tenantId: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.billingService.verifyAndActivateSetup(tenantId, dto);
  }

  @Post('upgrade-seats')
  @UseGuards(AuthGuard, TenantGuard)
  async upgradeSeatsCheckout(
    @TenantId() tenantId: string,
    @Body() dto: UpgradeSeatsDto,
  ) {
    return this.billingService.createSeatUpgradeCheckout(tenantId, dto);
  }

  @Post('verify-upgrade')
  @UseGuards(AuthGuard, TenantGuard)
  async verifyAndApplySeatUpgrade(
    @TenantId() tenantId: string,
    @Body() dto: VerifyPaymentDto & { additionalSeats: number },
  ) {
    return this.billingService.verifyAndApplySeatUpgrade(tenantId, dto);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() payload: any,
    @Req() req: any,
  ) {
    const rawBody = Buffer.isBuffer(req.rawBody)
      ? req.rawBody.toString('utf8')
      : typeof req.rawBody === 'string'
      ? req.rawBody
      : JSON.stringify(payload);
    return this.billingService.processWebhook(
      rawBody,
      signature || '',
      payload,
    );
  }
}
