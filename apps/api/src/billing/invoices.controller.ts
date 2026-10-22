import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Header,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { TenantGuard } from '../common/tenant/tenant.guard';
import {
  AllowSubscriptionAccess,
  SubscriptionAdminGuard,
} from '../common/tenant/subscription-admin.guard';
import { TenantId } from '../common/tenant/tenant.decorator';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { InvoicesService } from './invoices.service';
import { InvoicePaymentsService } from './invoice-payments.service';
import { InvoiceWorker } from './invoice-worker.service';
import {
  ConfirmBackfillDto,
  EnableInvoicesDto,
  InvoiceSettingsDto,
  InvoicesQuery,
} from './invoice.dto';
import { VerifyPaymentDto } from './billing.service';

function pdfFile(buffer: Buffer, filename: string) {
  return new StreamableFile(buffer, {
    type: 'application/pdf',
    disposition: `attachment; filename="${filename}.pdf"`,
    length: buffer.length,
  });
}

@Controller('billing/invoices')
@AllowSubscriptionAccess()
@UseGuards(AuthGuard, TenantGuard, SubscriptionAdminGuard)
export class InvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly payments: InvoicePaymentsService,
  ) {}
  @Get() list(
    @TenantId() organizationId: string,
    @Query() query: InvoicesQuery,
  ) {
    return this.invoices.list(organizationId, query);
  }
  @Get('outstanding') outstanding(@TenantId() organizationId: string) {
    return this.invoices.outstanding(organizationId);
  }
  @Get(':number') async detail(
    @TenantId() organizationId: string,
    @Param('number') number: string,
  ) {
    return this.invoices.present(
      await this.invoices.find(organizationId, number),
    );
  }
  @Get(':number/pdf')
  @Header('Cache-Control', 'private, no-store')
  async download(
    @TenantId() organizationId: string,
    @Param('number') number: string,
  ) {
    const invoice = await this.invoices.find(organizationId, number);
    return pdfFile(await this.invoices.render(invoice), invoice.number);
  }
  @Post(':number/checkout') checkout(
    @TenantId() organizationId: string,
    @Param('number') number: string,
  ) {
    return this.payments.checkout(organizationId, number);
  }
  @Post(':number/verify') async verify(
    @TenantId() organizationId: string,
    @Param('number') number: string,
    @Body() dto: VerifyPaymentDto,
  ) {
    const result = await this.payments.verify(organizationId, dto, number);
    if (!result) throw new NotFoundException('Invoice checkout not found');
    return result;
  }
}

@Injectable()
export class PlatformBillingGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const user = context
      .switchToHttp()
      .getRequest<{ user?: { sub: string; role: string } }>().user;
    if (!user || user.role !== 'SUPER_ADMIN')
      throw new ForbiddenException(
        'Platform super administrator access required',
      );
    const account = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true, isActive: true },
    });
    if (!account?.isActive || account.role !== 'SUPER_ADMIN')
      throw new ForbiddenException(
        'Active platform super administrator access required',
      );
    return true;
  }
}

@Controller('billing/platform/invoices')
@UseGuards(AuthGuard, PlatformBillingGuard)
export class PlatformInvoicesController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly worker: InvoiceWorker,
    private readonly prisma: PrismaService,
  ) {}
  @Get('settings') async settings() {
    const [settings, deliveryIssues, reconciliationCount] = await Promise.all([
      this.invoices.settings(),
      this.prisma.invoiceDelivery.count({
        where: { status: { in: ['FAILED', 'UNCERTAIN'] } },
      }),
      this.prisma.billingInvoice.count({
        where: { reconciliationNote: { not: null } },
      }),
    ]);
    return { ...settings, deliveryIssues, reconciliationCount };
  }
  @Patch('settings') save(@Body() dto: InvoiceSettingsDto) {
    return this.invoices.saveSettings(dto);
  }
  @Post('settings/preview')
  @Header('Cache-Control', 'private, no-store')
  async preview() {
    return pdfFile(await this.invoices.preview(), 'gromoze-invoice-preview');
  }
  @Post('settings/enable') enable(@Body() dto: EnableInvoicesDto) {
    return this.invoices.setEnabled(dto.enabled);
  }
  @Post('backfills/preview') backfillPreview() {
    return this.worker.previewBackfill();
  }
  @Post('backfills') backfill(@Body() dto: ConfirmBackfillDto) {
    return this.worker.confirmBackfill(dto.previewToken);
  }
  @Get('backfills/:code') progress(@Param('code') code: string) {
    return this.worker.backfillProgress(code);
  }
}
