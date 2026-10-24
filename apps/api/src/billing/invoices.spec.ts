import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { PlatformBillingGuard } from './invoices.controller';
import { SubscriptionAdminGuard } from '../common/tenant/subscription-admin.guard';
import { PrismaService } from '../persistence/prisma/prisma.service';
import {
  invoiceMoney,
  invoiceStatus,
  minorAmount,
  readInvoiceSnapshot,
} from './invoice.types';
import { InvoicePdfService, type InvoicePdfData } from './invoice-pdf.service';
import { InvoicesService } from './invoices.service';
import { RazorpayService } from './razorpay.service';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_INVOICE_TEMPLATE,
  readInvoiceTemplate,
  invoiceLogoBuffer,
} from './invoice-template';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Invoice authorization', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new PlatformBillingGuard(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());
  it.each([
    undefined,
    { sub: 'tenant-admin', role: 'ADMIN' },
    { sub: 'employee', role: 'SALES_AGENT' },
  ])('rejects non-platform accounts: %p', async (user) => {
    await expect(
      guard.canActivate(new ExecutionContextHost([{ user }])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it.each([
    { role: 'ADMIN', isActive: true },
    { role: 'SUPER_ADMIN', isActive: false },
  ])('rechecks current platform privileges', async (account) => {
    prisma.user.findUnique.mockResolvedValue(account);
    await expect(
      guard.canActivate(
        new ExecutionContextHost([
          { user: { sub: 'platform', role: 'SUPER_ADMIN' } },
        ]),
      ),
    ).rejects.toThrow();
  });
  it('allows an active platform administrator without selecting a tenant', async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    await expect(
      guard.canActivate(
        new ExecutionContextHost([
          { user: { sub: 'platform', role: 'SUPER_ADMIN' } },
        ]),
      ),
    ).resolves.toBe(true);
  });
  it.each([
    { role: 'ADMIN', isOwner: false },
    { role: 'SALES_AGENT', isOwner: true },
  ])('allows only a tenant owner/admin to use tenant invoices', (tenant) => {
    expect(
      new SubscriptionAdminGuard().canActivate(
        new ExecutionContextHost([{ tenant }]),
      ),
    ).toBe(true);
  });
  it.each([
    { role: 'SUPER_ADMIN' },
    { role: 'SALES_AGENT', isOwner: false },
    undefined,
  ])('denies employee/unscoped access to tenant invoices', (tenant) => {
    expect(() =>
      new SubscriptionAdminGuard().canActivate(
        new ExecutionContextHost([{ tenant }]),
      ),
    ).toThrow();
  });
});

describe('Invoice data and settings', () => {
  it('keeps currency calculations in minor units and rejects invalid totals', () => {
    expect(minorAmount(500.25)).toBe(50025);
    expect(invoiceMoney(50025)).toBe('INR 500.25');
    for (const value of [-1, Infinity, Number.MAX_SAFE_INTEGER])
      expect(() => minorAmount(value)).toThrow(BadRequestException);
  });
  it('derives overdue only for unpaid invoices', () => {
    const yesterday = new Date(Date.now() - 86400000);
    expect(invoiceStatus('ISSUED', yesterday)).toBe('OVERDUE');
    expect(invoiceStatus('PAID', yesterday)).toBe('PAID');
    expect(invoiceStatus('VOID', yesterday)).toBe('VOID');
  });
  it('rejects malformed stored invoice snapshots', () => {
    expect(() => readInvoiceSnapshot({ items: [] })).toThrow('snapshot');
  });
  it('leaves invoice issuance disabled until a complete identity is saved and previewed', async () => {
    const db = {
      platformInvoiceSettings: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
      },
    };
    const service = new InvoicesService(
      db as unknown as PrismaService,
      new InvoicePdfService(),
    );
    expect(await service.enabled()).toBe(false);
    await expect(service.preview()).rejects.toThrow('Complete');
    await expect(
      service.saveSettings({
        businessName: '  ',
        address: 'Valid address',
        email: 'billing@example.invalid',
        phone: '',
      }),
    ).rejects.toThrow('Complete');
    expect(db.platformInvoiceSettings.upsert).not.toHaveBeenCalled();
  });
});

describe('Invoice PDF', () => {
  const source: InvoicePdfData = {
    number: 'GZ-TEST-2026-000001',
    status: 'ISSUED',
    mode: 'TEST',
    issuedAt: new Date('2026-10-22T00:00:00Z'),
    dueAt: new Date('2026-11-01T00:00:00Z'),
    paidAt: null,
    paymentReference: null,
    amountMinor: 100000,
    currency: 'INR',
    historical: false,
    snapshot: {
      seller: {
        name: 'Gromoze',
        address: 'Example billing address, Mumbai, India',
        email: 'billing@example.invalid',
        phone: '',
      },
      customer: {
        name: 'Example tenant',
        address: 'Example tenant address',
        email: 'owner@example.invalid',
        phone: '',
      },
      planName: 'Growth',
      items: [
        {
          description: 'User seats - 30 days',
          quantity: 2,
          unitAmountMinor: 50000,
          amountMinor: 100000,
        },
      ],
      note: 'Payment activates 30 days of service.',
    },
  };
  it('renders issued and paid copies and handles long business/address text', async () => {
    const renderer = new InvoicePdfService();
    const issued = await renderer.render(source);
    const paid = await renderer.render({
      ...source,
      status: 'PAID',
      paidAt: new Date(),
      paymentReference: 'pay_example',
      snapshot: {
        ...source.snapshot,
        seller: {
          ...source.snapshot.seller,
          name: 'Long business name '.repeat(8),
          address: 'Long billing address, '.repeat(40),
        },
      },
    });
    expect(issued.subarray(0, 5).toString()).toBe('%PDF-');
    expect(paid.subarray(0, 5).toString()).toBe('%PDF-');
    expect(issued.length).toBeGreaterThan(1000);
    expect(paid.equals(issued)).toBe(false);
  });
  it.each(['CLASSIC', 'COMPACT'] as const)(
    'renders a %s template with frozen Solverix branding and added information',
    async (layout) => {
      const renderer = new InvoicePdfService();
      const template = renderer.snapshotTemplate({
        ...DEFAULT_INVOICE_TEMPLATE,
        layout,
        footer: 'Thank you for your business.',
        paymentNote: 'For billing assistance contact accounts@example.invalid.',
      });
      expect(template.logoMode).toBe('CUSTOM');
      expect(invoiceLogoBuffer(template.logoDataUrl)).toEqual(
        readFileSync(join(__dirname, 'assets', 'solverix-logo.png')),
      );
      const data = { ...source, snapshot: { ...source.snapshot, template } };
      const result = await renderer.render(data);
      expect(result.subarray(0, 5).toString()).toBe('%PDF-');
      expect(
        readInvoiceSnapshot(JSON.parse(JSON.stringify(data.snapshot))).template,
      ).toEqual(template);
      expect(source.snapshot.template).toBeUndefined();
    },
  );
});

describe('Invoice template validation', () => {
  it.each([
    { layout: 'HTML' },
    { accentColor: '#ffffff' },
    { heading: '' },
    { heading: 'Invoice\nInvalid' },
    { paymentNote: 'a'.repeat(601) },
    { footer: 'a'.repeat(241) },
    { script: 'alert(1)' },
    { logoMode: 'CUSTOM', logoDataUrl: 'https://example.invalid/logo.png' },
    { logoMode: 'CUSTOM', logoDataUrl: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { logoMode: 'CUSTOM', logoDataUrl: 'data:image/jpeg;base64,YQ==' },
  ])('rejects invalid template configuration %p', (input) => {
    expect(() =>
      readInvoiceTemplate({ ...DEFAULT_INVOICE_TEMPLATE, ...input }),
    ).toThrow(BadRequestException);
  });
  it('rejects unbounded logo dimensions and a malformed PNG before activation', async () => {
    const bad = Buffer.alloc(33);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(bad);
    bad.write('IHDR', 12);
    bad.writeUInt32BE(3000, 16);
    bad.writeUInt32BE(1, 20);
    expect(() =>
      invoiceLogoBuffer(`data:image/png;base64,${bad.toString('base64')}`),
    ).toThrow('2048');
    bad.writeUInt32BE(10, 16);
    await expect(
      new InvoicePdfService().validateTemplate({
        ...DEFAULT_INVOICE_TEMPLATE,
        logoMode: 'CUSTOM',
        logoDataUrl: `data:image/png;base64,${bad.toString('base64')}`,
      }),
    ).rejects.toThrow('decoded');
  });
});

describe('Razorpay payment proof', () => {
  const config = () =>
    new ConfigService({
      RAZORPAY_KEY_ID: 'rzp_test_fixture',
      RAZORPAY_KEY_SECRET: 'fixture-secret',
    });
  afterEach(() => jest.restoreAllMocks());
  it('fetches the provider payment and exposes its verified capture fields', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'pay_example',
          order_id: 'order_example',
          amount: 12300,
          currency: 'INR',
          status: 'captured',
          amount_refunded: 0,
          created_at: 1780000000,
        }),
      ),
    );
    const service = new RazorpayService(config());
    expect(service.getMode()).toBe('TEST');
    await expect(service.fetchPayment('pay_example')).resolves.toMatchObject({
      amount: 12300,
      order_id: 'order_example',
      status: 'captured',
    });
  });
  it('rejects malformed provider responses and unsupported key modes', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'another-payment' })),
      );
    await expect(
      new RazorpayService(config()).fetchPayment('pay_example'),
    ).rejects.toThrow('invalid payment');
    expect(() =>
      new RazorpayService(
        new ConfigService({ RAZORPAY_KEY_ID: 'unknown' }),
      ).getMode(),
    ).toThrow();
  });
});
