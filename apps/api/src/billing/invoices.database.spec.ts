import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { InvoicesService } from './invoices.service';
import { InvoicePaymentsService } from './invoice-payments.service';
import { InvoiceWorker } from './invoice-worker.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { RazorpayService, type RazorpayPayment } from './razorpay.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { InvoicesQuery } from './invoice.dto';
import { BILLING_DAY_MS, readInvoiceSnapshot } from './invoice.types';
import { PlatformTenantBillingService } from './platform-tenant-billing.service';
import { DEFAULT_INVOICE_TEMPLATE } from './invoice-template';

const run =
  process.env.RUN_SUBSCRIPTION_DATABASE_TESTS === '1'
    ? describe
    : describe.skip;
run('Invoice lifecycle against PostgreSQL', () => {
  let db: PrismaClient,
    invoices: InvoicesService,
    payments: InvoicePaymentsService,
    worker: InvoiceWorker;
  const remote = new Map<string, RazorpayPayment>();
  const email = {
    sendTenantPlatformEmail: jest.fn().mockResolvedValue({ success: true }),
  };
  const razorpay = {
    getMode: () => 'TEST',
    getPublicKey: () => 'rzp_test_fixture',
    verifyPaymentSignature: jest.fn(() => true),
    fetchPayment: jest.fn(async (id: string) => {
      const payment = remote.get(id);
      if (!payment) throw new Error('Unknown provider payment');
      return payment;
    }),
    createOrder: jest.fn(async () => ({
      id: `order_${randomUUID()}`,
      currency: 'INR',
    })),
    createPaymentLink: jest.fn(async () => ({
      id: `plink_${randomUUID()}`,
      short_url: 'https://example.invalid/payment',
      status: 'created',
      amount: 100000,
    })),
  };
  const organizations: string[] = [],
    users: string[] = [];
  beforeAll(async () => {
    const url = new URL(process.env.SUBSCRIPTION_DATABASE_URL || '');
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      (!url.pathname.endsWith('_subscription_test') &&
        !(process.env.CI === 'true' && url.pathname === '/gromoze_ci'))
    )
      throw new Error('Requires a disposable subscription test database');
    db = new PrismaClient({ datasources: { db: { url: url.href } } });
    await db.$connect();
    invoices = new InvoicesService(
      db as unknown as PrismaService,
      new InvoicePdfService(),
    );
    payments = new InvoicePaymentsService(
      db as unknown as PrismaService,
      invoices,
      razorpay as unknown as RazorpayService,
    );
    worker = new InvoiceWorker(
      db as unknown as PrismaService,
      invoices,
      razorpay as unknown as RazorpayService,
      email as unknown as EmailConnectorsService,
    );
    await invoices.saveSettings({
      businessName: 'Gromoze invoice test',
      address: 'Test billing address, Mumbai, India',
      email: 'billing@example.invalid',
      phone: '',
    });
    await invoices.preview();
    await invoices.setEnabled(true);
  });
  afterAll(async () => {
    if (!db) return;
    await db.invoiceDelivery.deleteMany({
      where: { invoice: { organizationId: { in: organizations } } },
    });
    await db.invoiceCheckoutAttempt.deleteMany({
      where: { invoice: { organizationId: { in: organizations } } },
    });
    await db.billingTransaction.deleteMany({
      where: { organizationId: { in: organizations } },
    });
    await db.billingInvoice.deleteMany({
      where: { organizationId: { in: organizations } },
    });
    await db.organization.deleteMany({ where: { id: { in: organizations } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.invoiceBackfillRun.deleteMany();
    await db.platformInvoiceSettings.deleteMany();
    await db.$disconnect();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    razorpay.verifyPaymentSignature.mockReturnValue(true);
    email.sendTenantPlatformEmail.mockResolvedValue({ success: true });
  });
  async function fixture() {
    const slug = `invoice-test-${randomUUID()}`;
    const org = await db.organization.create({
      data: {
        name: 'Invoice test workspace',
        slug,
        status: 'ACTIVE',
        setupFeePaid: true,
        pricePerSeatMonth: 500,
        setupFeeAmount: 1000,
        allocatedSeats: 2,
        currentPeriodEnd: new Date(Date.now() + 10 * BILLING_DAY_MS),
      },
    });
    organizations.push(org.id);
    const owner = await db.user.create({
      data: {
        email: `${slug}@example.invalid`,
        passwordHash: 'test-only',
        fullName: 'Test owner',
        role: 'ADMIN',
      },
    });
    users.push(owner.id);
    await db.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: owner.id,
        isOwner: true,
        role: 'ADMIN',
      },
    });
    return org;
  }
  async function renewal(organizationId: string) {
    return db.$transaction(async (tx) => {
      const org = await invoices.lockOrganization(tx, organizationId);
      const result = await invoices.ensureScheduled(
        tx,
        org,
        await invoices.settings(),
        'TEST',
      );
      if (!result) throw new Error('Expected renewal invoice');
      return result;
    });
  }
  async function captured(organizationId: string, number: string) {
    const checkout = await payments.checkout(organizationId, number);
    const paymentId = `pay_${randomUUID()}`;
    const payment: RazorpayPayment = {
      id: paymentId,
      order_id: checkout.orderId,
      amount: Math.round(checkout.amount * 100),
      currency: 'INR',
      status: 'captured',
      amount_refunded: 0,
      created_at: Math.floor(Date.now() / 1000),
    };
    remote.set(paymentId, payment);
    return {
      orderId: checkout.orderId ?? '',
      paymentId,
      signature: 'signed',
      payment,
    };
  }
  it('requires an explicit preview before activation and resets activation on identity edits', async () => {
    const original = await invoices.settings();
    await invoices.saveSettings({
      businessName: original.businessName,
      address: original.address,
      email: original.email,
      phone: original.phone,
    });
    await expect(invoices.setEnabled(true)).rejects.toThrow('Preview');
    await invoices.preview();
    await invoices.setEnabled(true);
    expect((await invoices.settings()).enabledAt).not.toBeNull();
  });
  it('issues one obligation under concurrent scans and unique numbers across tenants', async () => {
    const a = await fixture(),
      b = await fixture();
    const values = await Promise.all([
      renewal(a.id),
      renewal(a.id),
      renewal(b.id),
    ]);
    expect(values[0].number).toEqual(values[1].number);
    expect(values[2].number).not.toEqual(values[0].number);
    expect(values[0].number).toMatch(/^GZ-TEST-\d{4}-\d{6}$/);
    expect(
      await db.invoiceDelivery.count({
        where: { invoiceId: values[0].id, kind: 'ISSUED' },
      }),
    ).toBe(1);
  });
  it('isolates tenant lists, details and checkout attempts', async () => {
    const a = await fixture(),
      b = await fixture(),
      invoice = await renewal(a.id);
    expect((await invoices.list(b.id, new InvoicesQuery())).total).toBe(0);
    await expect(invoices.find(b.id, invoice.number)).rejects.toThrow(
      'not found',
    );
    await expect(payments.checkout(b.id, invoice.number)).rejects.toThrow(
      'not found',
    );
    const presented = invoices.present(invoice);
    expect(presented).not.toHaveProperty('id');
    expect(presented).not.toHaveProperty('organizationId');
  });
  it('settles an early renewal once across browser and webhook races', async () => {
    const org = await fixture(),
      invoice = await renewal(org.id),
      payment = await captured(org.id, invoice.number);
    await Promise.all([
      payments.verify(org.id, payment),
      payments.verify(org.id, payment),
      payments.handleWebhook({
        event: 'payment.captured',
        payload: { payment: { entity: payment.payment } },
      }),
    ]);
    const updated = await db.organization.findUniqueOrThrow({
      where: { id: org.id },
    });
    expect(updated.currentPeriodEnd?.getTime()).toBe(
      org.currentPeriodEnd!.getTime() + 30 * BILLING_DAY_MS,
    );
    expect(
      await db.billingTransaction.count({
        where: { invoiceId: invoice.id, status: 'captured' },
      }),
    ).toBe(1);
    expect(
      await db.invoiceDelivery.count({
        where: { invoiceId: invoice.id, kind: 'PAID' },
      }),
    ).toBe(1);
    expect((await invoices.find(org.id, invoice.number)).status).toBe('PAID');
  });
  it('starts an overdue renewal at confirmation rather than extending an expired past period', async () => {
    const org = await fixture();
    await db.organization.update({
      where: { id: org.id },
      data: { currentPeriodEnd: new Date(Date.now() - 60 * BILLING_DAY_MS) },
    });
    const invoice = await renewal(org.id),
      before = Date.now();
    await payments.verify(org.id, await captured(org.id, invoice.number));
    const updated = await db.organization.findUniqueOrThrow({
      where: { id: org.id },
    });
    expect(updated.currentPeriodStart!.getTime()).toBeGreaterThanOrEqual(
      before,
    );
    expect(
      updated.currentPeriodEnd!.getTime() -
        updated.currentPeriodStart!.getTime(),
    ).toBe(30 * BILLING_DAY_MS);
  });
  it('uses the saved setup quantity, not quantities supplied by the browser', async () => {
    const org = await fixture();
    await db.organization.update({
      where: { id: org.id },
      data: {
        setupFeePaid: false,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 12 * BILLING_DAY_MS),
        currentPeriodEnd: null,
      },
    });
    const invoice = await invoices.forCheckout(org.id, 'SETUP_FEE', 3, 'TEST');
    if (!invoice) throw new Error('Expected invoice');
    expect(Number(invoice.amountMinor)).toBe(250000);
    await payments.verify(org.id, {
      ...(await captured(org.id, invoice.number)),
      seats: 999,
    } as Parameters<InvoicePaymentsService['verify']>[1]);
    expect(
      (await db.organization.findUniqueOrThrow({ where: { id: org.id } }))
        .allocatedSeats,
    ).toBe(3);
  });
  it('reads platform billing without issuing documents and preserves an issued quote when issuance is disabled', async () => {
    const org = await fixture();
    const dueAt = new Date(Date.now() + 12 * BILLING_DAY_MS);
    await db.organization.update({
      where: { id: org.id },
      data: { setupFeePaid: false, trialEndsAt: dueAt, currentPeriodEnd: null },
    });
    const invoice = await invoices.forCheckout(org.id, 'SETUP_FEE', 2, 'TEST');
    if (!invoice) throw new Error('Expected first-payment invoice');
    const checkout = await payments.checkout(org.id, invoice.number, true);
    expect(checkout).toMatchObject({
      paymentPurpose: 'FIRST_SUBSCRIPTION_PAYMENT',
      invoiceNumber: invoice.number,
      invoiceIssuedAt: invoice.issuedAt,
      dueAt,
      mode: 'TEST',
      notificationStatus: 'QUEUED',
    });
    await invoices.setEnabled(false);
    try {
      await db.organization.update({
        where: { id: org.id },
        data: { pricePerSeatMonth: 900, allocatedSeats: 4 },
      });
      const before = await db.invoiceDelivery.count();
      const service = new PlatformTenantBillingService(
        db as unknown as PrismaService,
        invoices,
        razorpay as unknown as RazorpayService,
      );
      const summary = await service.summary(org.id);
      expect(summary.counts).toEqual({
        total: 1,
        unpaid: 1,
        overdue: 0,
        paid: 0,
        void: 0,
      });
      expect(summary.firstPayment.invoice?.number).toBe(invoice.number);
      expect(summary.firstPayment.replacementRequired).toBe(false);
      expect(summary.firstPaymentDueAt).toEqual(dueAt);
      const reused = await invoices.forCheckout(org.id, 'SETUP_FEE', 4, 'TEST');
      expect(reused?.number).toBe(invoice.number);
      expect(reused?.snapshot).toEqual(invoice.snapshot);
      expect(
        await db.billingInvoice.count({ where: { organizationId: org.id } }),
      ).toBe(1);
      expect(await db.invoiceDelivery.count()).toBe(before);
    } finally {
      await invoices.setEnabled(true);
    }
  });
  it('persists a new template only on future invoices and requires a fresh preview to reactivate issuance', async () => {
    const settings = await invoices.settings();
    const org = await fixture();
    const old = await renewal(org.id);
    const original = readInvoiceSnapshot(old.snapshot);
    expect(original.template?.logoDataUrl).toMatch(/^data:image\/png;base64,/);
    try {
      const updatedTemplate = {
        ...DEFAULT_INVOICE_TEMPLATE,
        layout: 'COMPACT' as const,
        logoMode: 'NONE' as const,
        footer: 'Custom billing footer',
        paymentNote: 'Contact the billing team for assistance.',
      };
      await invoices.saveSettings({ ...settings, template: updatedTemplate });
      expect(await invoices.enabled()).toBe(false);
      await expect(invoices.setEnabled(true)).rejects.toThrow('Preview');
      await invoices.preview();
      await invoices.setEnabled(true);
      const next = await renewal((await fixture()).id);
      expect(readInvoiceSnapshot(next.snapshot).template).toEqual(
        updatedTemplate,
      );
      expect(
        readInvoiceSnapshot((await invoices.find(org.id, old.number)).snapshot),
      ).toEqual(original);
      expect((await invoices.render(old)).subarray(0, 5).toString()).toBe(
        '%PDF-',
      );
    } finally {
      await invoices.saveSettings(settings);
      await invoices.preview();
      await invoices.setEnabled(true);
    }
  });
  it.each(['amount', 'currency', 'authorized', 'refunded', 'signature'])(
    'rejects invalid %s without changing the ledger or subscription',
    async (kind) => {
      const org = await fixture(),
        invoice = await renewal(org.id),
        payment = await captured(org.id, invoice.number);
      if (kind === 'amount') payment.payment.amount -= 1;
      if (kind === 'currency') payment.payment.currency = 'USD';
      if (kind === 'authorized') payment.payment.status = 'authorized';
      if (kind === 'refunded') payment.payment.amount_refunded = 1;
      if (kind === 'signature')
        razorpay.verifyPaymentSignature.mockReturnValue(false);
      await expect(payments.verify(org.id, payment)).rejects.toThrow();
      expect((await invoices.find(org.id, invoice.number)).status).toBe(
        'ISSUED',
      );
      expect(
        await db.billingTransaction.count({
          where: { invoiceId: invoice.id, status: 'captured' },
        }),
      ).toBe(0);
    },
  );
  it('replaces an unpaid renewal after a seat purchase, without rewriting the original', async () => {
    const org = await fixture(),
      old = await renewal(org.id),
      upgrade = await invoices.forCheckout(org.id, 'SEAT_UPGRADE', 1, 'TEST');
    if (!upgrade) throw new Error('Expected invoice');
    const payment = await captured(org.id, upgrade.number);
    await Promise.all([
      payments.verify(org.id, payment),
      payments.verify(org.id, payment),
    ]);
    expect(
      (await db.organization.findUniqueOrThrow({ where: { id: org.id } }))
        .allocatedSeats,
    ).toBe(3);
    expect((await invoices.find(org.id, old.number)).status).toBe('VOID');
    const replacement = await db.billingInvoice.findFirstOrThrow({
      where: { replacesNumber: old.number },
    });
    expect(Number(replacement.amountMinor)).toBe(150000);
    expect(readInvoiceSnapshot(old.snapshot).items[0].quantity).toBe(2);
    await expect(payments.checkout(org.id, old.number)).rejects.toThrow(
      'unpaid',
    );
  });
  it('records a late payment against a void invoice for reconciliation without granting access', async () => {
    const org = await fixture(),
      invoice = await renewal(org.id),
      payment = await captured(org.id, invoice.number);
    await db.$transaction((tx) =>
      invoices.voidInvoice(tx, invoice, 'Replaced'),
    );
    await expect(payments.verify(org.id, payment)).rejects.toThrow(
      'Do not pay again',
    );
    expect(
      (await invoices.find(org.id, invoice.number)).reconciliationNote,
    ).not.toBeNull();
    expect(
      (await db.organization.findUniqueOrThrow({ where: { id: org.id } }))
        .currentPeriodEnd,
    ).toEqual(org.currentPeriodEnd);
  });
  it('does not reactivate a cancelled workspace after a previously opened checkout pays', async () => {
    const org = await fixture(),
      invoice = await renewal(org.id),
      payment = await captured(org.id, invoice.number);
    await db.organization.update({
      where: { id: org.id },
      data: { status: 'CANCELLED' },
    });
    await expect(payments.verify(org.id, payment)).rejects.toThrow(
      'needs Gromoze review',
    );
    expect(
      (await db.organization.findUniqueOrThrow({ where: { id: org.id } }))
        .status,
    ).toBe('CANCELLED');
    expect((await invoices.find(org.id, invoice.number)).status).toBe('PAID');
  });
  it('filters overdue invoices and dates', async () => {
    const org = await fixture(),
      invoice = await renewal(org.id);
    await db.billingInvoice.update({
      where: { id: invoice.id },
      data: { dueAt: new Date(Date.now() - BILLING_DAY_MS) },
    });
    const query = Object.assign(new InvoicesQuery(), {
      status: 'OVERDUE',
      search: invoice.number,
    });
    expect((await invoices.list(org.id, query)).items[0].status).toBe(
      'OVERDUE',
    );
    expect(
      (
        await invoices.list(
          org.id,
          Object.assign(new InvoicesQuery(), {
            from: '2000-01-01',
            to: '2000-01-02',
          }),
        )
      ).total,
    ).toBe(0);
  });
  it('retries definite SMTP failures and deduplicates subsequent delivery', async () => {
    const org = await fixture(),
      invoice = await renewal(org.id);
    email.sendTenantPlatformEmail.mockRejectedValueOnce(
      new (await import('@nestjs/common')).BadRequestException('SMTP failed'),
    );
    await db.invoiceDelivery.updateMany({
      where: { invoiceId: { not: invoice.id } },
      data: { status: 'CANCELLED' },
    });
    await worker.deliver();
    expect(
      (
        await db.invoiceDelivery.findFirstOrThrow({
          where: { invoiceId: invoice.id },
        })
      ).status,
    ).toBe('FAILED');
    await worker.deliver(new Date(Date.now() + 120000));
    expect(email.sendTenantPlatformEmail).toHaveBeenLastCalledWith(
      org.id,
      expect.objectContaining({
        to: expect.stringContaining('@example.invalid'),
        attachments: [
          expect.objectContaining({
            contentType: 'application/pdf',
            content: expect.any(Buffer),
          }),
        ],
      }),
    );
    const calls = email.sendTenantPlatformEmail.mock.calls.length;
    await worker.deliver(new Date(Date.now() + 180000));
    expect(email.sendTenantPlatformEmail).toHaveBeenCalledTimes(calls);
  });
  it('creates one historical paid invoice and never queues historical emails', async () => {
    const org = await fixture(),
      paymentId = `pay_${randomUUID()}`;
    const row = await db.billingTransaction.create({
      data: {
        organizationId: org.id,
        type: 'RECURRING_SEATS',
        amount: 1000,
        status: 'captured',
        razorpayPaymentId: paymentId,
        createdAt: new Date('2025-01-01T00:00:00Z'),
      },
    });
    remote.set(paymentId, {
      id: paymentId,
      order_id: null,
      status: 'captured',
      amount: 100000,
      currency: 'INR',
      amount_refunded: 0,
      created_at: 1735689600,
    });
    await worker.attachRecordedPayment(row.id, true);
    await worker.attachRecordedPayment(row.id, true);
    const updated = await db.billingTransaction.findUniqueOrThrow({
      where: { id: row.id },
      include: { invoice: true },
    });
    expect(updated.invoice?.status).toBe('PAID');
    expect(updated.invoice?.issuedAt.getFullYear()).toBe(
      new Date().getFullYear(),
    );
    expect(updated.invoice?.paidAt).toEqual(row.createdAt);
    expect(
      await db.invoiceDelivery.count({
        where: { invoiceId: updated.invoiceId! },
      }),
    ).toBe(0);
  });
  it('matches signed payment-link events to their saved invoice even when the link uses a different order', async () => {
    const org = await fixture(),
      invoice = await renewal(org.id);
    const checkout = await payments.checkout(org.id, invoice.number, true);
    const paymentId = `pay_${randomUUID()}`;
    const payment: RazorpayPayment = {
      id: paymentId,
      order_id: 'order_created_by_link',
      amount: 100000,
      currency: 'INR',
      status: 'captured',
      amount_refunded: 0,
      created_at: Math.floor(Date.now() / 1000),
    };
    remote.set(paymentId, payment);
    await expect(
      payments.verify(org.id, {
        orderId: checkout.orderId ?? '',
        paymentId,
        signature: 'signed',
      }),
    ).rejects.toThrow('does not belong');
    await expect(
      payments.handleWebhook({
        event: 'payment_link.paid',
        payload: {
          payment: { entity: payment },
          payment_link: { entity: { id: checkout.paymentLinkId } },
        },
      }),
    ).resolves.toBe(true);
    expect((await invoices.find(org.id, invoice.number)).status).toBe('PAID');
  });
  it('requires backfill confirmation, reports skipped records and completes without historical emails', async () => {
    const org = await fixture();
    const good = `pay_good_${randomUUID()}`,
      bad = `pay_refunded_${randomUUID()}`;
    await db.billingTransaction.createMany({
      data: [good, bad].map((razorpayPaymentId) => ({
        organizationId: org.id,
        type: 'RECURRING_SEATS',
        amount: 500,
        status: 'captured',
        razorpayPaymentId,
        createdAt: new Date('2024-01-01T00:00:00Z'),
      })),
    });
    remote.set(good, {
      id: good,
      order_id: null,
      status: 'captured',
      amount: 50000,
      currency: 'INR',
      amount_refunded: 0,
      created_at: 1704067200,
    });
    remote.set(bad, {
      id: bad,
      order_id: null,
      status: 'captured',
      amount: 50000,
      currency: 'INR',
      amount_refunded: 50000,
      created_at: 1704067200,
    });
    const preview = await worker.previewBackfill();
    expect((await worker.backfillProgress(preview.previewToken)).status).toBe(
      'PREVIEW',
    );
    await worker.processBackfill();
    expect(
      await db.billingInvoice.count({ where: { organizationId: org.id } }),
    ).toBe(0);
    await worker.confirmBackfill(preview.previewToken);
    await worker.processBackfill();
    await worker.processBackfill();
    const result = await worker.backfillProgress(preview.previewToken);
    expect(result).toMatchObject({
      status: 'COMPLETED',
      created: 1,
      skipped: 1,
      processed: 2,
    });
    expect(email.sendTenantPlatformEmail).not.toHaveBeenCalled();
    expect(
      await db.invoiceDelivery.count({
        where: { invoice: { organizationId: org.id } },
      }),
    ).toBe(0);
  });
  it('does not rewrite an already paid renewal when seats are purchased later', async () => {
    const org = await fixture(),
      original = await renewal(org.id);
    await payments.verify(org.id, await captured(org.id, original.number));
    const paid = await invoices.find(org.id, original.number);
    const upgrade = await invoices.forCheckout(
      org.id,
      'SEAT_UPGRADE',
      1,
      'TEST',
    );
    if (!upgrade) throw new Error('Expected upgrade invoice');
    await payments.verify(org.id, await captured(org.id, upgrade.number));
    expect(await invoices.find(org.id, original.number)).toEqual(paid);
    expect(
      await db.billingInvoice.count({
        where: { replacesNumber: original.number },
      }),
    ).toBe(0);
  });
  it('separates test and live outstanding totals', async () => {
    const org = await fixture();
    await renewal(org.id);
    await invoices.forCheckout(org.id, 'SEAT_UPGRADE', 1, 'LIVE');
    const result = await invoices.outstanding(org.id);
    expect(result.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mode: 'TEST', amountMinor: 100000 }),
        expect.objectContaining({ mode: 'LIVE', amountMinor: 50000 }),
      ]),
    );
  });
});
