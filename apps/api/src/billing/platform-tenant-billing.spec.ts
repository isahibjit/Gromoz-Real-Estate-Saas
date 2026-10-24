import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Prisma, type BillingInvoice } from '@prisma/client';
import { PlatformTenantBillingService } from './platform-tenant-billing.service';
import { PlatformTenantBillingController } from './platform-tenant-billing.controller';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { PlatformBillingGuard } from './invoices.controller';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { paymentModeFromKey, setupPaymentQuote } from './setup-payment-quote';
import { InvoicesQuery } from './invoice.dto';

describe('Platform tenant billing visibility', () => {
  const org = {
    id: 'tenant-a',
    name: 'Zone Up Realty',
    slug: 'zoneuprealty',
    status: 'ACTIVE',
    setupFeePaid: false,
    setupFeeAmount: 1000,
    allocatedSeats: 5,
    pricePerSeatMonth: 500,
    planTier: 'STARTER',
    createdAt: new Date('2026-10-19T08:30:00Z'),
    trialEndsAt: new Date('2026-11-02T08:30:00Z'),
    currentPeriodEnd: null,
  };
  const db = {
    organization: { findUnique: jest.fn() },
    billingInvoice: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    platformInvoiceSettings: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    user: { findUnique: jest.fn() },
  };
  const invoices = {
    settings: jest.fn(),
    outstanding: jest.fn(),
    firstSetupInvoice: jest.fn(),
    present: jest.fn(),
  };
  const razorpay = { getPublicKey: jest.fn() };
  const service = new PlatformTenantBillingService(
    db as unknown as PrismaService,
    invoices as unknown as InvoicesService,
    razorpay as unknown as RazorpayService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
    db.organization.findUnique.mockResolvedValue(org);
    db.billingInvoice.groupBy.mockResolvedValue([
      { status: 'ISSUED', _count: { _all: 2 } },
      { status: 'PAID', _count: { _all: 3 } },
      { status: 'VOID', _count: { _all: 1 } },
    ]);
    db.billingInvoice.count.mockResolvedValue(1);
    invoices.settings.mockResolvedValue({ enabledAt: null });
    invoices.outstanding.mockResolvedValue({
      count: 2,
      groups: [
        { mode: 'TEST', currency: 'INR', amountMinor: 100000, count: 1 },
        { mode: 'LIVE', currency: 'INR', amountMinor: 200000, count: 1 },
      ],
    });
    invoices.firstSetupInvoice.mockResolvedValue(null);
    invoices.present.mockImplementation((invoice: BillingInvoice) => invoice);
    razorpay.getPublicKey.mockReturnValue('rzp_test_public');
  });
  it('reports actual counts with overdue as a subset and separates test/live balances', async () => {
    const summary = await service.summary(
      org.id,
      new Date('2026-10-24T08:30:00Z'),
    );
    expect(summary.counts).toEqual({
      total: 6,
      unpaid: 2,
      overdue: 1,
      paid: 3,
      void: 1,
    });
    expect(summary.balances).toHaveLength(2);
    expect(invoices.outstanding).toHaveBeenCalledWith(org.id, true);
    expect(summary.firstPaymentDueAt).toEqual(org.trialEndsAt);
    expect(summary.trialDaysRemaining).toBe(9);
    expect(summary.isTrial).toBe(true); // ACTIVE is access, not proof of payment.
    expect(summary.automaticInvoicingEnabled).toBe(false);
    expect(summary.firstPayment.savedQuote).toMatchObject({
      seats: 5,
      unitAmountMinor: 50000,
      setupFeeMinor: 100000,
      seatAmountMinor: 250000,
      amountMinor: 350000,
    });
    expect(db.billingInvoice.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: org.id } }),
    );
    expect(db.billingInvoice.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('does not invent deadlines or assume zero invoices means paid', async () => {
    db.organization.findUnique.mockResolvedValue({
      ...org,
      trialEndsAt: null,
      currentPeriodEnd: null,
    });
    db.billingInvoice.groupBy.mockResolvedValue([]);
    db.billingInvoice.count.mockResolvedValue(0);
    const summary = await service.summary(org.id);
    expect(summary.counts.total).toBe(0);
    expect(summary.firstPayment.completed).toBe(false);
    expect(summary.firstPaymentDueAt).toBeNull();
    expect(summary.invoiceEligibleFrom).toBeNull();
    expect(summary.nextRenewalAt).toBeNull();
  });
  it.each(['SUSPENDED', 'CANCELLED'])(
    'disables first-payment links for %s workspaces',
    async (status) => {
      db.organization.findUnique.mockResolvedValue({ ...org, status });
      expect((await service.summary(org.id)).firstPayment.canCreateLink).toBe(
        false,
      );
    },
  );
  it('shows completion and the recorded renewal rather than offering another setup payment', async () => {
    const expiry = new Date('2026-12-02T08:30:00Z');
    db.organization.findUnique.mockResolvedValue({
      ...org,
      setupFeePaid: true,
      currentPeriodEnd: expiry,
    });
    const summary = await service.summary(org.id);
    expect(summary.firstPayment.completed).toBe(true);
    expect(summary.firstPayment.canCreateLink).toBe(false);
    expect(summary.nextRenewalAt).toEqual(expiry);
    expect(summary.firstPaymentDueAt).toBeNull();
  });
  it('retains issued snapshot charges when new issuance is disabled', async () => {
    const original = setupPaymentQuote({ ...org, pricePerSeatMonth: 100 }, 2);
    const invoice = {
      number: 'GZ-TEST-2026-000001',
      status: 'ISSUED',
      amountMinor: new Prisma.Decimal(original.amountMinor),
      seatQuantity: 2,
      dueAt: org.trialEndsAt,
      snapshot: {
        seller: { name: '', address: '', email: '', phone: '' },
        customer: { name: '', address: '', email: '', phone: '' },
        planName: 'Starter',
        note: '',
        items: original.items,
      },
    };
    invoices.firstSetupInvoice.mockResolvedValue(invoice);
    const summary = await service.summary(org.id);
    expect(summary.firstPayment.invoice).toBe(invoice);
    expect(summary.firstPayment.replacementRequired).toBe(false);
    invoices.settings.mockResolvedValue({ enabledAt: new Date() });
    expect(
      (await service.summary(org.id)).firstPayment.replacementRequired,
    ).toBe(true);
    expect(invoice.snapshot.items).toEqual(original.items);
  });
  it('rejects missing tenants before exposing invoice data', async () => {
    db.organization.findUnique.mockResolvedValue(null);
    await expect(service.summary('missing')).rejects.toThrow('not found');
    expect(db.billingInvoice.groupBy).not.toHaveBeenCalled();
  });
  it('keeps invoice list filters bound to the explicitly requested tenant', async () => {
    db.billingInvoice.findMany.mockResolvedValue([]);
    db.billingInvoice.count.mockResolvedValue(0);
    const actual = new InvoicesService(
      db as unknown as PrismaService,
      new InvoicePdfService(),
    );
    await actual.list(
      'tenant-b',
      Object.assign(new InvoicesQuery(), { mode: 'LIVE', status: 'PAID' }),
    );
    expect(db.billingInvoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'tenant-b', mode: 'LIVE', status: 'PAID' },
      }),
    );
  });
  it('protects all platform read endpoints with current-account platform authorization', async () => {
    expect(
      Reflect.getMetadata('__guards__', PlatformTenantBillingController),
    ).toEqual([AuthGuard, PlatformBillingGuard]);
    const guard = new PlatformBillingGuard(db as unknown as PrismaService);
    await expect(
      guard.canActivate(
        new ExecutionContextHost([
          { user: { sub: 'tenant-admin', role: 'ADMIN' } },
        ]),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    db.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true });
    await expect(
      guard.canActivate(
        new ExecutionContextHost([
          { user: { sub: 'demoted', role: 'SUPER_ADMIN' } },
        ]),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Shared first-payment quote', () => {
  it('uses saved prices and a zero setup fee without inventing tier prices', () => {
    expect(
      setupPaymentQuote(
        { setupFeePaid: false, setupFeeAmount: 0, pricePerSeatMonth: 0 },
        5,
      ),
    ).toMatchObject({ amountMinor: 0, setupFeeMinor: 0, seatAmountMinor: 0 });
    expect(
      setupPaymentQuote(
        { setupFeePaid: false, setupFeeAmount: 0, pricePerSeatMonth: 500 },
        5,
      ).amountMinor,
    ).toBe(250000);
    expect(() =>
      setupPaymentQuote(
        { setupFeePaid: false, setupFeeAmount: 0, pricePerSeatMonth: -1 },
        5,
      ),
    ).toThrow(BadRequestException);
    expect(paymentModeFromKey('rzp_live_example')).toBe('LIVE');
    expect(paymentModeFromKey()).toBeNull();
  });
});
