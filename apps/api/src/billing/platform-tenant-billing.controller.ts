import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PlatformBillingGuard } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesQuery } from './invoice.dto';
import { PlatformTenantBillingService } from './platform-tenant-billing.service';

@Controller('billing/platform/tenants')
@UseGuards(AuthGuard, PlatformBillingGuard)
export class PlatformTenantBillingController {
  constructor(
    private readonly billing: PlatformTenantBillingService,
    private readonly invoices: InvoicesService,
  ) {}
  @Get(':tenantId/summary') summary(@Param('tenantId') tenantId: string) {
    return this.billing.summary(tenantId);
  }
  @Get(':tenantId/invoices') async list(
    @Param('tenantId') tenantId: string,
    @Query() query: InvoicesQuery,
  ) {
    await this.billing.assertTenant(tenantId);
    return this.invoices.list(tenantId, query);
  }
  @Get(':tenantId/invoices/:number') async detail(
    @Param('tenantId') tenantId: string,
    @Param('number') number: string,
  ) {
    return this.invoices.present(await this.invoices.find(tenantId, number));
  }
  @Get(':tenantId/invoices/:number/pdf')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @Param('tenantId') tenantId: string,
    @Param('number') number: string,
  ) {
    const invoice = await this.invoices.find(tenantId, number);
    return new StreamableFile(await this.invoices.render(invoice), {
      type: 'application/pdf',
      disposition: `attachment; filename="${invoice.number}.pdf"`,
    });
  }
}
