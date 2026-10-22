import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import type {
  BillingInvoice,
  InvoiceCheckoutAttempt,
  Prisma,
} from '@prisma/client';
import { tenantWorkspaceUrl } from '@truroot/shared';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { InvoicesService } from './invoices.service';
import { RazorpayService, type RazorpayPayment } from './razorpay.service';
import { BILLING_DAY_MS, readInvoiceSnapshot } from './invoice.types';
import { BILLING_PERIOD_DAYS } from './billing.constants';

export interface InvoicePaymentInput {
  orderId: string;
  paymentId: string;
  signature: string;
}
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly razorpay: RazorpayService,
  ) {}

  async checkout(organizationId: string, number: string, shareable = false) {
    const initial = await this.invoices.find(organizationId, number);
    const { attempt, invoice, organizationName, slug } =
      await this.prisma.$transaction(async (tx) => {
        const org = await this.invoices.lockOrganization(tx, organizationId);
        const invoice = await tx.billingInvoice.findUniqueOrThrow({
          where: { id: initial.id },
        });
        if (invoice.status !== 'ISSUED')
          throw new ConflictException('Only an unpaid invoice can be paid');
        if (invoice.reconciliationNote)
          throw new ConflictException(
            'A payment needs review. Contact Gromoze before paying again',
          );
        if (['CANCELLED', 'SUSPENDED'].includes(org.status))
          throw new BadRequestException(
            'Contact Gromoze before paying for this workspace',
          );
        if (invoice.mode !== this.razorpay.getMode())
          throw new BadRequestException(
            'This invoice belongs to a different payment environment',
          );
        const pending = await tx.invoiceCheckoutAttempt.findFirst({
          where: {
            invoiceId: invoice.id,
            status: { in: ['CREATING', 'READY', 'LINK_CREATING'] },
          },
          orderBy: { createdAt: 'desc' },
        });
        if (
          pending &&
          pending.status !== 'READY' &&
          pending.updatedAt.getTime() > Date.now() - 120000
        )
          throw new ConflictException(
            'Checkout is being prepared. Please try again shortly',
          );
        return {
          invoice,
          organizationName: org.name,
          slug: org.slug,
          attempt:
            pending?.status === 'READY'
              ? pending
              : await tx.invoiceCheckoutAttempt.create({
                  data: { invoiceId: invoice.id },
                }),
        };
      });
    let ready = attempt;
    if (!ready.orderId) {
      try {
        const order = await this.razorpay.createOrder({
          amount: Number(invoice.amountMinor) / 100,
          currency: invoice.currency,
          receipt: invoice.number,
          notes: { invoiceNumber: invoice.number, organizationId },
        });
        ready = await this.prisma.$transaction(async (tx) => {
          const latest = await tx.billingInvoice.findUniqueOrThrow({
            where: { id: invoice.id },
          });
          if (latest.status !== 'ISSUED')
            throw new ConflictException(
              'Invoice changed while checkout was preparing',
            );
          const attempt = await tx.invoiceCheckoutAttempt.update({
            where: { id: ready.id },
            data: { orderId: order.id, status: 'READY' },
          });
          await tx.billingTransaction.create({
            data: {
              organizationId,
              invoiceId: invoice.id,
              invoiceNumber: invoice.number,
              amount: Number(invoice.amountMinor) / 100,
              currency: invoice.currency,
              type: invoice.type,
              status: 'created',
              razorpayOrderId: order.id,
              metadata: {
                seats: invoice.seatQuantity,
                additionalSeats:
                  invoice.type === 'SEAT_UPGRADE' ? invoice.seatQuantity : 0,
                mode: invoice.mode,
              },
            },
          });
          return attempt;
        });
      } catch (error) {
        await this.prisma.invoiceCheckoutAttempt.update({
          where: { id: ready.id },
          data: {
            status: 'FAILED',
            error: 'Provider checkout preparation failed',
          },
        });
        throw error;
      }
    }
    if (shareable && !ready.paymentLinkUrl) {
      const snapshot = readInvoiceSnapshot(invoice.snapshot);
      if (snapshot.customer.email) {
        const claim = await this.prisma.invoiceCheckoutAttempt.updateMany({
          where: {
            id: ready.id,
            status: 'READY',
            paymentLinkId: null,
            invoice: { status: 'ISSUED' },
          },
          data: { status: 'LINK_CREATING' },
        });
        if (claim.count) {
          try {
            const link = await this.razorpay.createPaymentLink({
              amount: Number(invoice.amountMinor) / 100,
              currency: invoice.currency,
              description: `Gromoze invoice ${invoice.number}`,
              customer: {
                name: snapshot.customer.name,
                email: snapshot.customer.email,
              },
              notifyEmail: false,
              callbackUrl: `${tenantWorkspaceUrl(slug)}/billing`,
              notes: { invoiceNumber: invoice.number, organizationId },
            });
            ready = await this.prisma.invoiceCheckoutAttempt.update({
              where: { id: ready.id },
              data: { paymentLinkId: link.id, paymentLinkUrl: link.short_url },
            });
          } catch {
            /* The authenticated invoice checkout remains available. */
          } finally {
            await this.prisma.invoiceCheckoutAttempt.updateMany({
              where: { id: ready.id, status: 'LINK_CREATING' },
              data: { status: 'READY' },
            });
          }
        }
      }
    }
    const items = readInvoiceSnapshot(invoice.snapshot).items;
    return {
      orderId: ready.orderId,
      amount: Number(invoice.amountMinor) / 100,
      currency: invoice.currency,
      razorpayKey: this.razorpay.getPublicKey(),
      organizationName,
      invoiceNumber: invoice.number,
      additionalSeats:
        invoice.type === 'SEAT_UPGRADE' ? invoice.seatQuantity : 0,
      seatsCount: invoice.seatQuantity,
      pricePerSeatMonth:
        (items.find((item) => item.description !== 'Workspace setup fee')
          ?.unitAmountMinor ?? 0) / 100,
      setupFeeAmount:
        (items.find((item) => item.description === 'Workspace setup fee')
          ?.amountMinor ?? 0) / 100,
      seatsAmount:
        items
          .filter((item) => item.description !== 'Workspace setup fee')
          .reduce((sum, item) => sum + item.amountMinor, 0) / 100,
      paymentLinkId: ready.paymentLinkId,
      paymentLinkUrl: ready.paymentLinkUrl,
      shortUrl: ready.paymentLinkUrl,
      checkoutError:
        shareable && !ready.paymentLinkUrl
          ? 'A shareable payment link is unavailable. Pay from the invoice in Subscription & support.'
          : null,
    };
  }

  async verify(
    organizationId: string,
    input: InvoicePaymentInput,
    number?: string,
  ) {
    const attempt = await this.prisma.invoiceCheckoutAttempt.findFirst({
      where: {
        orderId: input.orderId,
        invoice: { organizationId, ...(number ? { number } : {}) },
      },
      include: { invoice: true },
    });
    if (!attempt) return null;
    if (!this.razorpay.verifyPaymentSignature(input))
      throw new BadRequestException('Invalid payment signature');
    const payment = await this.razorpay.fetchPayment(input.paymentId);
    if (payment.order_id !== attempt.orderId)
      throw new BadRequestException('Payment does not belong to this checkout');
    const result = await this.settle(attempt, payment);
    if (result.requiresReview)
      throw new ConflictException(
        'Payment was received and needs Gromoze review. Do not pay again; contact support',
      );
    return result;
  }
  private async recordPayment(
    tx: Prisma.TransactionClient,
    attempt: InvoiceCheckoutAttempt,
    invoice: BillingInvoice,
    payment: RazorpayPayment,
  ) {
    const duplicate = await tx.billingTransaction.findUnique({
      where: { razorpayPaymentId: payment.id },
    });
    if (duplicate && duplicate.invoiceId !== invoice.id)
      throw new BadRequestException(
        'Payment is already assigned to another invoice',
      );
    if (duplicate) return;
    const pending = await tx.billingTransaction.findFirst({
      where: {
        invoiceId: invoice.id,
        razorpayOrderId: attempt.orderId,
        razorpayPaymentId: null,
      },
    });
    const data = {
      organizationId: invoice.organizationId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      amount: payment.amount / 100,
      currency: payment.currency,
      type: invoice.type,
      status: 'captured',
      razorpayPaymentId: payment.id,
      razorpayOrderId: payment.order_id,
      metadata: { seats: invoice.seatQuantity, mode: invoice.mode },
    };
    if (pending)
      await tx.billingTransaction.update({ where: { id: pending.id }, data });
    else await tx.billingTransaction.create({ data });
  }
  async settle(
    attempt: InvoiceCheckoutAttempt & { invoice: BillingInvoice },
    payment: RazorpayPayment,
  ) {
    if (
      payment.status !== 'captured' ||
      payment.amount_refunded !== 0 ||
      payment.amount !== Number(attempt.invoice.amountMinor) ||
      payment.currency !== attempt.invoice.currency
    )
      throw new BadRequestException(
        'Payment must be captured in full and match the invoice amount and currency',
      );
    if (attempt.invoice.mode !== this.razorpay.getMode())
      throw new BadRequestException(
        'Payment environment does not match invoice',
      );
    return this.prisma.$transaction(async (tx) => {
      const org = await this.invoices.lockOrganization(
        tx,
        attempt.invoice.organizationId,
      );
      const invoice = await tx.billingInvoice.findUniqueOrThrow({
        where: { id: attempt.invoice.id },
      });
      if (invoice.status === 'PAID' && invoice.paymentReference === payment.id)
        return {
          success: true,
          requiresReview: Boolean(invoice.reconciliationNote),
          allocatedSeats: org.allocatedSeats,
          invoiceNumber: invoice.number,
          status: org.status,
          setupFeePaid: org.setupFeePaid,
          currentPeriodEnd: org.currentPeriodEnd,
        };
      await this.recordPayment(tx, attempt, invoice, payment);
      const requiresReview =
        invoice.status !== 'ISSUED' ||
        ['SUSPENDED', 'CANCELLED'].includes(org.status);
      await tx.invoiceCheckoutAttempt.update({
        where: { id: attempt.id },
        data: {
          paymentId: payment.id,
          status: requiresReview ? 'RECONCILIATION' : 'SETTLED',
        },
      });
      if (requiresReview) {
        const reviewed = await tx.billingInvoice.update({
          where: { id: invoice.id },
          data: {
            reconciliationNote:
              'A payment was received for an invoice or workspace that could not be automatically activated. Contact Gromoze; do not pay again.',
            ...(invoice.status === 'ISSUED'
              ? {
                  status: 'PAID',
                  paidAt: new Date(),
                  paymentReference: payment.id,
                }
              : {}),
          },
        });
        if (reviewed.status === 'PAID' && invoice.status === 'ISSUED')
          await this.invoices.queueDelivery(tx, reviewed, 'PAID');
        return {
          success: false,
          requiresReview: true,
          allocatedSeats: org.allocatedSeats,
          invoiceNumber: invoice.number,
        };
      }
      const now = new Date();
      const startsAt = new Date(
        Math.max(org.currentPeriodEnd?.getTime() ?? 0, now.getTime()),
      );
      const updated = await tx.organization.update({
        where: { id: org.id },
        data:
          invoice.type === 'SEAT_UPGRADE'
            ? { allocatedSeats: { increment: invoice.seatQuantity } }
            : {
                setupFeePaid: true,
                status: 'ACTIVE',
                ...(invoice.type === 'SETUP_FEE'
                  ? { allocatedSeats: invoice.seatQuantity }
                  : {}),
                currentPeriodStart: startsAt,
                currentPeriodEnd: new Date(
                  startsAt.getTime() + BILLING_PERIOD_DAYS * BILLING_DAY_MS,
                ),
              },
        select: {
          allocatedSeats: true,
          setupFeePaid: true,
          currentPeriodEnd: true,
          status: true,
        },
      });
      const paid = await tx.billingInvoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID', paidAt: now, paymentReference: payment.id },
      });
      await tx.invoiceDelivery.updateMany({
        where: {
          invoiceId: invoice.id,
          kind: 'ISSUED',
          status: { in: ['PENDING', 'FAILED'] },
        },
        data: { status: 'CANCELLED' },
      });
      await this.invoices.queueDelivery(tx, paid, 'PAID');
      if (invoice.type === 'SEAT_UPGRADE') {
        const settings = await tx.platformInvoiceSettings.findUnique({
          where: { id: 'platform' },
        });
        if (settings?.enabledAt)
          await this.invoices.ensureScheduled(
            tx,
            { ...org, allocatedSeats: updated.allocatedSeats },
            settings,
            this.razorpay.getMode(),
            now,
          );
      }
      return {
        success: true,
        requiresReview: false,
        ...updated,
        invoiceNumber: invoice.number,
      };
    });
  }
  async handleWebhook(payload: unknown): Promise<boolean> {
    const root = object(payload),
      details = object(root?.payload),
      paymentEntity = object(object(details?.payment)?.entity),
      link = object(object(details?.payment_link)?.entity);
    const event = root?.event;
    if (!paymentEntity || typeof paymentEntity.id !== 'string') return false;
    const attempt = await this.prisma.invoiceCheckoutAttempt.findFirst({
      where: {
        OR: [
          ...(typeof paymentEntity.order_id === 'string'
            ? [{ orderId: paymentEntity.order_id }]
            : []),
          ...(event === 'payment_link.paid' && typeof link?.id === 'string'
            ? [{ paymentLinkId: link.id }]
            : []),
        ],
      },
      include: { invoice: true },
    });
    if (!attempt) return false;
    if (event === 'payment.failed') {
      await this.prisma.billingTransaction.updateMany({
        where: {
          invoiceId: attempt.invoiceId,
          status: 'created',
          razorpayOrderId: attempt.orderId,
        },
        data: { status: 'failed' },
      });
      return true;
    }
    if (event === 'payment.captured' || event === 'payment_link.paid') {
      await this.settle(
        attempt,
        await this.razorpay.fetchPayment(paymentEntity.id),
      );
      return true;
    }
    return false;
  }
}
