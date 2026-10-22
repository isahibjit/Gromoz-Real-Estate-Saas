import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { InvoicesService, type InvoiceIssuer } from './invoices.service';
import { RazorpayService } from './razorpay.service';
import { invoiceMoney, minorAmount, type InvoiceKind } from './invoice.types';
import { tenantWorkspaceUrl } from '@truroot/shared';
import { BILLING_DAY_MS, INVOICE_LEAD_DAYS } from './billing.constants';

function fingerprint(settings: InvoiceIssuer) {
  return createHash('sha256')
    .update(
      JSON.stringify([
        settings.businessName,
        settings.address,
        settings.email,
        settings.phone,
      ]),
    )
    .digest('hex');
}

@Injectable()
export class InvoiceWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoiceWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private legacyCursor?: string;
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly razorpay: RazorpayService,
    private readonly email: EmailConnectorsService,
  ) {}
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), 60000);
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      if (await this.invoices.enabled()) {
        await this.issueDue();
        await this.attachRecentLegacyPayments();
      }
      await this.processBackfill();
      await this.deliver();
    } catch (error: unknown) {
      this.logger.error(
        error instanceof Error ? error.message : 'Invoice worker failed',
      );
    } finally {
      this.running = false;
    }
  }
  async issueDue(now = new Date()) {
    const settings = await this.invoices.settings();
    if (!settings.enabledAt) return;
    const mode = this.razorpay.getMode();
    let cursor: string | undefined;
    do {
      const rows = await this.prisma.organization.findMany({
        where: {
          status: { notIn: ['CANCELLED', 'SUSPENDED'] },
          ...(cursor ? { id: { gt: cursor } } : {}),
          OR: [
            {
              setupFeePaid: false,
              trialEndsAt: {
                lte: new Date(
                  now.getTime() + INVOICE_LEAD_DAYS * BILLING_DAY_MS,
                ),
              },
            },
            { setupFeePaid: false, trialEndsAt: null, createdAt: { lte: now } },
            {
              setupFeePaid: true,
              currentPeriodEnd: {
                lte: new Date(
                  now.getTime() + INVOICE_LEAD_DAYS * BILLING_DAY_MS,
                ),
              },
            },
          ],
        },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: 100,
      });
      if (!rows.length) break;
      for (const row of rows) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const org = await this.invoices.lockOrganization(tx, row.id);
            await this.invoices.ensureScheduled(tx, org, settings, mode, now);
          });
        } catch (error: unknown) {
          this.logger.warn(
            `Could not issue scheduled invoice: ${
              error instanceof Error ? error.message : 'unknown failure'
            }`,
          );
        }
      }
      cursor = rows[rows.length - 1].id;
    } while (cursor);
    await this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.billingInvoice.findMany({
        where: {
          status: 'ISSUED',
          organization: { status: { in: ['CANCELLED', 'SUSPENDED'] } },
        },
        take: 100,
      });
      for (const invoice of cancelled)
        await this.invoices.voidInvoice(
          tx,
          invoice,
          'Workspace is suspended or cancelled',
        );
    });
  }
  async deliver(now = new Date()) {
    const jobs = await this.prisma.invoiceDelivery.findMany({
      where: {
        nextAttemptAt: { lte: now },
        OR: [
          { status: { in: ['PENDING', 'FAILED'] } },
          { status: 'PROCESSING', leaseUntil: { lt: now } },
        ],
      },
      orderBy: { nextAttemptAt: 'asc' },
      take: 30,
    });
    for (const job of jobs) {
      const claim = await this.prisma.invoiceDelivery.updateMany({
        where: { id: job.id, status: job.status, leaseUntil: job.leaseUntil },
        data: {
          status: 'PROCESSING',
          leaseUntil: new Date(Date.now() + 300000),
          attempts: { increment: 1 },
        },
      });
      if (!claim.count) continue;
      let smtpStarted = false;
      try {
        const invoice = await this.prisma.billingInvoice.findUniqueOrThrow({
          where: { id: job.invoiceId },
          include: { organization: { select: { slug: true, status: true } } },
        });
        const activeOwner = await this.prisma.organizationMember.findFirst({
          where: {
            organizationId: invoice.organizationId,
            isOwner: true,
            isActive: true,
            user: {
              email: { equals: job.recipient, mode: 'insensitive' },
              isActive: true,
              role: { not: 'SUPER_ADMIN' },
            },
          },
          select: { id: true },
        });
        if (
          !activeOwner ||
          (job.kind === 'ISSUED' &&
            (invoice.status !== 'ISSUED' ||
              ['SUSPENDED', 'CANCELLED'].includes(
                invoice.organization.status,
              ))) ||
          (job.kind === 'PAID' && invoice.status !== 'PAID')
        ) {
          await this.prisma.invoiceDelivery.update({
            where: { id: job.id },
            data: { status: 'CANCELLED', leaseUntil: null },
          });
          continue;
        }
        const entityType = `BillingInvoice:${job.kind}`;
        const sent = await this.prisma.emailLog.findFirst({
          where: {
            organizationId: invoice.organizationId,
            entityId: invoice.id,
            entityType,
            recipient: job.recipient,
            status: 'Sent',
          },
          select: { id: true },
        });
        if (!sent) {
          if (job.status === 'PROCESSING') {
            await this.prisma.invoiceDelivery.update({
              where: { id: job.id },
              data: {
                status: 'UNCERTAIN',
                leaseUntil: null,
                error:
                  'Worker interrupted a previous send. Check SMTP logs before resending.',
              },
            });
            continue;
          }
          const buffer = await this.invoices.render(invoice);
          // A second status check suppresses messages made obsolete during PDF rendering.
          const latest = await this.prisma.billingInvoice.findUniqueOrThrow({
            where: { id: invoice.id },
            select: { status: true },
          });
          if (
            (job.kind === 'ISSUED' && latest.status !== 'ISSUED') ||
            (job.kind === 'PAID' && latest.status !== 'PAID')
          ) {
            await this.prisma.invoiceDelivery.update({
              where: { id: job.id },
              data: { status: 'CANCELLED', leaseUntil: null },
            });
            continue;
          }
          smtpStarted = true;
          await this.email.sendTenantPlatformEmail(invoice.organizationId, {
            to: job.recipient,
            subject: `${
              invoice.mode === 'TEST' ? '[Test] ' : ''
            }Gromoze invoice ${invoice.number} - ${
              job.kind === 'PAID' ? 'payment confirmed' : 'payment due'
            }`,
            text: `Hello,\n\n${
              job.kind === 'PAID'
                ? 'Your payment is confirmed.'
                : 'Your workspace invoice is ready.'
            }\nInvoice: ${invoice.number}\nTotal: ${invoiceMoney(
              Number(invoice.amountMinor),
              invoice.currency,
            )}\nDue: ${invoice.dueAt.toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
            })}\n\n${tenantWorkspaceUrl(
              invoice.organization.slug,
            )}/billing?invoice=${encodeURIComponent(
              invoice.number,
            )}\n\nThe invoice PDF is attached. ${
              invoice.mode === 'TEST'
                ? 'This is a test invoice, not a live payment.'
                : ''
            }\n\nGromoze`,
            attachments: [
              {
                filename: `${invoice.number}.pdf`,
                content: buffer,
                contentType: 'application/pdf',
              },
            ],
            entityId: invoice.id,
            entityType,
          });
        }
        await this.prisma.invoiceDelivery.update({
          where: { id: job.id },
          data: { status: 'SENT', leaseUntil: null, error: null },
        });
      } catch (error: unknown) {
        const uncertain =
          smtpStarted &&
          !(error instanceof BadRequestException) &&
          !(error instanceof ServiceUnavailableException);
        await this.prisma.invoiceDelivery.update({
          where: { id: job.id },
          data: {
            status: uncertain ? 'UNCERTAIN' : 'FAILED',
            leaseUntil: null,
            error: uncertain
              ? 'Delivery outcome could not be recorded. Review SMTP and email logs before resending.'
              : 'Invoice email could not be sent; delivery will retry.',
            nextAttemptAt: new Date(
              now.getTime() +
                Math.min(86400000, 60000 * 2 ** Math.min(job.attempts, 10)),
            ),
          },
        });
      }
    }
  }
  async previewBackfill() {
    const settings = await this.invoices.settings();
    if (!settings.enabledAt)
      throw new BadRequestException(
        'Configure, preview and enable invoicing first',
      );
    const cutoffAt = new Date(),
      mode = this.razorpay.getMode();
    const candidates = await this.prisma.billingTransaction.count({
      where: {
        status: 'captured',
        invoiceId: null,
        razorpayPaymentId: { not: null },
        createdAt: { lte: cutoffAt },
      },
    });
    const code = `BF-${cutoffAt
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
    await this.prisma.invoiceBackfillRun.create({
      data: {
        code,
        status: 'PREVIEW',
        cutoffAt,
        mode,
        settingsFingerprint: fingerprint(settings),
      },
    });
    return {
      previewToken: code,
      candidates,
      mode,
      cutoffAt,
      message:
        'Candidates will be checked against Razorpay. Unverified, refunded, mismatched and unsupported-currency payments are skipped. No historical emails will be sent.',
    };
  }
  async confirmBackfill(code: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "PlatformInvoiceSettings" WHERE id = 'platform' FOR UPDATE`;
      const run = await tx.invoiceBackfillRun.findUnique({ where: { code } });
      if (
        !run ||
        run.status !== 'PREVIEW' ||
        run.createdAt.getTime() < Date.now() - 3600000
      )
        throw new BadRequestException('Create a fresh backfill preview');
      const settings = await tx.platformInvoiceSettings.findUnique({
        where: { id: 'platform' },
      });
      if (
        !settings?.enabledAt ||
        fingerprint(settings) !== run.settingsFingerprint ||
        this.razorpay.getMode() !== run.mode
      )
        throw new ConflictException(
          'Settings changed. Preview the backfill again',
        );
      const active = await tx.invoiceBackfillRun.findFirst({
        where: { status: { in: ['PENDING', 'RUNNING'] } },
        select: { code: true },
      });
      if (active)
        throw new ConflictException(
          `Backfill ${active.code} is already in progress. Wait for it to finish`,
        );
      await tx.invoiceBackfillRun.update({
        where: { code },
        data: { status: 'PENDING' },
      });
    });
    return this.backfillProgress(code);
  }
  async backfillProgress(code: string) {
    const row = await this.prisma.invoiceBackfillRun.findUnique({
      where: { code },
    });
    if (!row) throw new NotFoundException('Backfill run not found');
    return {
      code: row.code,
      mode: row.mode,
      status: row.status,
      processed: row.processed,
      created: row.created,
      skipped: row.skipped,
      errors: row.errors,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  }
  async processBackfill() {
    const now = new Date();
    const run = await this.prisma.invoiceBackfillRun.findFirst({
      where: {
        status: { in: ['PENDING', 'RUNNING'] },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!run) return;
    const settings = await this.invoices.settings();
    if (
      !settings.enabledAt ||
      run.mode !== this.razorpay.getMode() ||
      run.settingsFingerprint !== fingerprint(settings)
    ) {
      await this.prisma.invoiceBackfillRun.update({
        where: { code: run.code },
        data: {
          status: 'STOPPED',
          errors: [
            {
              reason:
                'Issuer settings or payment mode changed; create a new preview.',
            },
          ],
        },
      });
      return;
    }
    const claim = await this.prisma.invoiceBackfillRun.updateMany({
      where: { code: run.code, leaseUntil: run.leaseUntil, status: run.status },
      data: { status: 'RUNNING', leaseUntil: new Date(Date.now() + 300000) },
    });
    if (!claim.count) return;
    const payments = await this.prisma.billingTransaction.findMany({
      where: {
        status: 'captured',
        invoiceId: null,
        razorpayPaymentId: { not: null },
        createdAt: { lte: run.cutoffAt },
        ...(run.cursor ? { id: { gt: run.cursor } } : {}),
      },
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 10,
    });
    if (!payments.length) {
      await this.prisma.invoiceBackfillRun.update({
        where: { code: run.code },
        data: { status: 'COMPLETED', completedAt: now, leaseUntil: null },
      });
      return;
    }
    for (const payment of payments) {
      let reason = '';
      try {
        await this.attachRecordedPayment(payment.id, true);
      } catch (error: unknown) {
        reason =
          error instanceof BadRequestException
            ? error.message
            : 'Payment could not be verified or invoiced. Check platform logs for details.';
        this.logger.warn(error instanceof Error ? error.message : reason);
      }
      const current = await this.prisma.invoiceBackfillRun.findUniqueOrThrow({
        where: { code: run.code },
      });
      const previous = Array.isArray(current.errors) ? current.errors : [];
      await this.prisma.invoiceBackfillRun.update({
        where: { code: run.code },
        data: {
          cursor: payment.id,
          processed: { increment: 1 },
          ...(reason
            ? {
                skipped: { increment: 1 },
                errors: [...previous, { reason }].slice(-50),
              }
            : { created: { increment: 1 } }),
          leaseUntil: new Date(Date.now() + 300000),
        },
      });
    }
    await this.prisma.invoiceBackfillRun.update({
      where: { code: run.code },
      data: { leaseUntil: null },
    });
  }
  async attachRecentLegacyPayments() {
    const settings = await this.invoices.settings();
    if (!settings.enabledAt) return;
    const rows = await this.prisma.billingTransaction.findMany({
      where: {
        status: 'captured',
        invoiceId: null,
        razorpayPaymentId: { not: null },
        createdAt: { gte: settings.enabledAt },
        ...(this.legacyCursor ? { id: { gt: this.legacyCursor } } : {}),
      },
      select: { id: true },
      take: 10,
      orderBy: { id: 'asc' },
    });
    this.legacyCursor = rows.length ? rows[rows.length - 1].id : undefined;
    for (const row of rows) {
      try {
        await this.attachRecordedPayment(row.id, false);
      } catch {
        this.logger.warn(
          'A legacy payment needs invoice reconciliation; use the historical backfill preview for skipped details.',
        );
      }
    }
  }
  async attachRecordedPayment(transactionId: string, historical: boolean) {
    const row = await this.prisma.billingTransaction.findUniqueOrThrow({
      where: { id: transactionId },
    });
    if (row.invoiceId) return;
    if (
      !row.razorpayPaymentId ||
      row.status !== 'captured' ||
      row.currency !== 'INR'
    )
      throw new BadRequestException(
        'Only confirmed INR payments can be backfilled',
      );
    if (!['SETUP_FEE', 'RECURRING_SEATS', 'SEAT_UPGRADE'].includes(row.type))
      throw new BadRequestException('Unsupported payment type');
    const metadata = row.metadata;
    if (
      metadata &&
      typeof metadata === 'object' &&
      !Array.isArray(metadata) &&
      metadata.requiresReview === true
    )
      throw new BadRequestException(
        'Payment is awaiting platform reconciliation',
      );
    const payment = await this.razorpay.fetchPayment(row.razorpayPaymentId);
    if (
      payment.status !== 'captured' ||
      payment.amount_refunded !== 0 ||
      payment.amount !== minorAmount(row.amount) ||
      payment.currency !== row.currency ||
      (row.razorpayOrderId && payment.order_id !== row.razorpayOrderId)
    )
      throw new BadRequestException(
        `Provider payment ${row.razorpayPaymentId} could not be matched to an unrefunded captured payment`,
      );
    const settings = await this.invoices.settings();
    if (!settings.enabledAt)
      throw new BadRequestException('Invoicing is disabled');
    const mode = this.razorpay.getMode();
    return this.prisma.$transaction(async (tx) => {
      const org = await this.invoices.lockOrganization(tx, row.organizationId);
      const current = await tx.billingTransaction.findUniqueOrThrow({
        where: { id: row.id },
      });
      if (current.invoiceId) return;
      const type: InvoiceKind =
        row.type === 'SETUP_FEE'
          ? 'SETUP_FEE'
          : row.type === 'SEAT_UPGRADE'
          ? 'SEAT_UPGRADE'
          : 'RECURRING_SEATS';
      const snapshot = await this.invoices.snapshot(tx, org, settings, type, 1);
      snapshot.planName = 'Recorded workspace payment';
      snapshot.items = [
        {
          description: `${
            historical ? 'Historical' : 'Confirmed'
          } workspace payment`,
          quantity: 1,
          unitAmountMinor: payment.amount,
          amountMinor: payment.amount,
        },
      ];
      snapshot.note =
        'Seller and customer details reflect information available at invoice issuance. Historical itemization has not been reconstructed.';
      const invoice = await this.invoices.create(tx, {
        org,
        issuer: settings,
        mode,
        kind: type,
        seats: 0,
        obligationKey: `${mode}:recorded:${row.id}`,
        dueAt: row.createdAt,
        snapshot,
        historical,
        paidAt: row.createdAt,
        paymentReference: payment.id,
        queueEmail: !historical,
      });
      await tx.billingTransaction.update({
        where: { id: row.id },
        data: { invoiceId: invoice.id, invoiceNumber: invoice.number },
      });
      return invoice;
    });
  }
}
