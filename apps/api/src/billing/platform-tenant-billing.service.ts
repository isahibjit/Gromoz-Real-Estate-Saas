import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { BILLING_DAY_MS, INVOICE_LEAD_DAYS } from './billing.constants';
import { invoiceOrganizationSelect, InvoicesService } from './invoices.service';
import { RazorpayService } from './razorpay.service';
import { readInvoiceSnapshot } from './invoice.types';
import { paymentModeFromKey, setupPaymentQuote } from './setup-payment-quote';
import { subscriptionState } from './subscription-state';

@Injectable()
export class PlatformTenantBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly razorpay: RazorpayService,
  ) {}

  async assertTenant(tenantId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: invoiceOrganizationSelect,
    });
    if (!org) throw new NotFoundException('Tenant workspace not found');
    return org;
  }

  async summary(tenantId: string, now = new Date()) {
    const org = await this.assertTenant(tenantId);
    const mode = paymentModeFromKey(this.razorpay.getPublicKey());
    const [settings, groups, overdue, outstanding, firstInvoice] =
      await Promise.all([
        this.invoices.settings(),
        this.prisma.billingInvoice.groupBy({
          by: ['status'],
          where: { organizationId: tenantId },
          _count: { _all: true },
        }),
        this.prisma.billingInvoice.count({
          where: {
            organizationId: tenantId,
            status: 'ISSUED',
            dueAt: { lt: now },
          },
        }),
        this.invoices.outstanding(tenantId, true),
        this.invoices.firstSetupInvoice(tenantId, mode),
      ]);
    const count = (status: string) =>
      groups.find((group) => group.status === status)?._count._all ?? 0;
    const savedQuote = setupPaymentQuote(org, org.allocatedSeats);
    const snapshot = firstInvoice
      ? readInvoiceSnapshot(firstInvoice.snapshot)
      : null;
    const replacementRequired = Boolean(
      settings.enabledAt &&
        firstInvoice?.status === 'ISSUED' &&
        (firstInvoice.seatQuantity !== org.allocatedSeats ||
          JSON.stringify(snapshot?.items) !== JSON.stringify(savedQuote.items)),
    );
    const requiresReview = Boolean(
      firstInvoice?.reconciliationNote ||
        (firstInvoice?.status === 'PAID' && !org.setupFeePaid),
    );
    const completed = org.setupFeePaid || firstInvoice?.status === 'PAID';
    const firstPaymentDueAt = completed
      ? null
      : firstInvoice?.dueAt ?? org.trialEndsAt;
    const state = subscriptionState(org, now);
    const payableAmount =
      firstInvoice?.status === 'ISSUED' && !replacementRequired
        ? Number(firstInvoice.amountMinor)
        : savedQuote.amountMinor;
    const blockedReason = ['SUSPENDED', 'CANCELLED'].includes(org.status)
      ? 'Payments are unavailable while this workspace is suspended or cancelled.'
      : requiresReview
      ? 'A payment needs Gromoze review. Do not request another payment.'
      : completed
      ? 'The first subscription payment is already completed.'
      : !mode
      ? 'Configure the platform payment environment before creating a link.'
      : payableAmount === 0
      ? 'No amount is due for the first subscription payment.'
      : null;
    return {
      automaticInvoicingEnabled: Boolean(settings.enabledAt),
      paymentMode: mode,
      counts: {
        total: groups.reduce((sum, group) => sum + group._count._all, 0),
        unpaid: count('ISSUED'),
        overdue,
        paid: count('PAID'),
        void: count('VOID'),
      },
      balances: outstanding.groups,
      workspaceStatus: org.status,
      isTrial: state.isTrial,
      trialEndsAt: org.trialEndsAt,
      trialDaysRemaining:
        org.trialEndsAt && !completed
          ? Math.max(
              0,
              Math.ceil(
                (org.trialEndsAt.getTime() - now.getTime()) / BILLING_DAY_MS,
              ),
            )
          : null,
      firstPaymentDueAt,
      nextRenewalAt: org.setupFeePaid ? org.currentPeriodEnd : null,
      invoiceEligibleFrom: firstPaymentDueAt
        ? new Date(
            firstPaymentDueAt.getTime() - INVOICE_LEAD_DAYS * BILLING_DAY_MS,
          )
        : null,
      firstPayment: {
        completed,
        requiresReview,
        savedQuote,
        invoice: firstInvoice ? this.invoices.present(firstInvoice) : null,
        replacementRequired,
        setupFeeStatus:
          org.setupFeeAmount === 0
            ? 'NO_FEE'
            : org.setupFeePaid
            ? 'PAID'
            : 'UNPAID',
        canCreateLink: blockedReason === null,
        blockedReason,
      },
    };
  }
}
