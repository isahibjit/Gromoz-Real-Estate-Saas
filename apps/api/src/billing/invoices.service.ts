import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BillingInvoice,
  Organization,
  PlatformInvoiceSettings,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { configuredWorkspacePlans } from './commercial-plan-catalog';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoiceSettingsDto, InvoicesQuery } from './invoice.dto';
import {
  BILLING_DAY_MS,
  invoiceStatus,
  minorAmount,
  readInvoiceSnapshot,
  type InvoiceKind,
  type InvoiceMode,
  type InvoiceSnapshot,
} from './invoice.types';
import { dateRange } from './workspace-date-range';
import { DEFAULT_TRIAL_DAYS, INVOICE_LEAD_DAYS } from './billing.constants';
import { setupPaymentQuote } from './setup-payment-quote';
import { readInvoiceTemplate } from './invoice-template';

type Tx = Prisma.TransactionClient;
export type InvoiceIssuer = Pick<
  PlatformInvoiceSettings,
  'businessName' | 'address' | 'email' | 'phone'
> & { template?: Prisma.JsonValue };
export const invoiceOrganizationSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  setupFeePaid: true,
  setupFeeAmount: true,
  pricePerSeatMonth: true,
  allocatedSeats: true,
  planTier: true,
  trialEndsAt: true,
  currentPeriodEnd: true,
  createdAt: true,
  addressLine1: true,
  city: true,
  state: true,
  country: true,
  pincode: true,
  primaryEmail: true,
  primaryPhone: true,
} as const;
export type InvoiceOrganization = Pick<
  Organization,
  keyof typeof invoiceOrganizationSelect
>;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: InvoicePdfService,
  ) {}

  async settings() {
    const saved = await this.prisma.platformInvoiceSettings.findUnique({
      where: { id: 'platform' },
    });
    return saved
      ? { ...saved, template: readInvoiceTemplate(saved.template) }
      : {
          businessName: '',
          address: '',
          email: '',
          phone: '',
          enabledAt: null,
          previewedAt: null,
          updatedAt: null,
          template: readInvoiceTemplate(null),
        };
  }
  async saveSettings(dto: InvoiceSettingsDto) {
    const data = {
      businessName: dto.businessName.trim(),
      address: dto.address.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone.trim(),
      template: {
        ...readInvoiceTemplate(
          dto.template ?? (await this.settings()).template,
        ),
      },
    };
    this.validateIssuer(data);
    await this.pdf.validateTemplate(data.template);
    // An identity change requires a new preview and explicit activation.
    return this.prisma.platformInvoiceSettings.upsert({
      where: { id: 'platform' },
      create: { id: 'platform', ...data },
      update: { ...data, previewedAt: null, enabledAt: null },
    });
  }
  private validateIssuer(settings: InvoiceIssuer) {
    if (
      settings.businessName.length < 2 ||
      settings.address.length < 5 ||
      !settings.email.includes('@')
    )
      throw new BadRequestException(
        'Complete the invoice business name, billing address and contact email first',
      );
  }
  async preview() {
    const settings = await this.settings();
    this.validateIssuer(settings);
    const buffer = await this.pdf.render({
      number: 'PREVIEW-NOT-ISSUED',
      mode: 'TEST',
      status: 'PREVIEW',
      issuedAt: new Date(),
      dueAt: new Date(),
      paidAt: null,
      paymentReference: null,
      amountMinor: 50000,
      currency: 'INR',
      historical: false,
      snapshot: {
        template: settings.template,
        seller: {
          name: settings.businessName,
          address: settings.address,
          email: settings.email,
          phone: settings.phone,
        },
        customer: {
          name: 'Example workspace',
          address: 'Example billing address',
          email: 'example@example.invalid',
          phone: '',
        },
        planName: 'Example plan',
        items: [
          {
            description: 'Example user seat - 30 days',
            quantity: 1,
            unitAmountMinor: 50000,
            amountMinor: 50000,
          },
        ],
        note: 'Preview only. No invoice number or charge has been created.',
      },
    });
    // Do not certify a concurrently edited identity as previewed.
    await this.prisma.platformInvoiceSettings.updateMany({
      where: {
        id: 'platform',
        businessName: settings.businessName,
        address: settings.address,
        email: settings.email,
        phone: settings.phone,
        ...(settings.updatedAt ? { updatedAt: settings.updatedAt } : {}),
      },
      data: { previewedAt: new Date() },
    });
    return buffer;
  }
  async setEnabled(enabled: boolean) {
    if (!enabled)
      return this.prisma.platformInvoiceSettings.updateMany({
        where: { id: 'platform' },
        data: { enabledAt: null },
      });
    const settings = await this.settings();
    this.validateIssuer(settings);
    if (!settings.previewedAt)
      throw new BadRequestException(
        'Preview the saved invoice settings before enabling issuance',
      );
    const changed = await this.prisma.platformInvoiceSettings.updateMany({
      where: {
        id: 'platform',
        previewedAt: settings.previewedAt,
        businessName: settings.businessName,
        address: settings.address,
        email: settings.email,
        phone: settings.phone,
        ...(settings.updatedAt ? { updatedAt: settings.updatedAt } : {}),
      },
      data: { enabledAt: settings.enabledAt ?? new Date() },
    });
    if (!changed.count)
      throw new ConflictException(
        'Invoice identity changed. Preview the current settings again',
      );
    return this.settings();
  }
  async enabled() {
    return Boolean((await this.settings()).enabledAt);
  }

  async lockOrganization(tx: Tx, organizationId: string) {
    await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: invoiceOrganizationSelect,
    });
    if (!org) throw new NotFoundException('Workspace not found');
    return org;
  }
  async snapshot(
    tx: Tx,
    org: InvoiceOrganization,
    issuer: InvoiceIssuer,
    kind: InvoiceKind,
    seats: number,
  ): Promise<InvoiceSnapshot> {
    const owner = await tx.organizationMember.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        isOwner: true,
        user: { isActive: true, role: { not: 'SUPER_ADMIN' } },
      },
      orderBy: { createdAt: 'asc' },
      select: { user: { select: { email: true } } },
    });
    const price = minorAmount(org.pricePerSeatMonth);
    const items = [
      {
        description:
          kind === 'SEAT_UPGRADE'
            ? 'Additional user seats - 30 days'
            : 'Workspace user seats - 30 days',
        quantity: seats,
        unitAmountMinor: price,
        amountMinor: price * seats,
      },
    ];
    return {
      template: this.pdf.snapshotTemplate(issuer.template),
      seller: {
        name: issuer.businessName,
        address: issuer.address,
        email: issuer.email,
        phone: issuer.phone,
      },
      customer: {
        name: org.name,
        address: [
          org.addressLine1,
          org.city,
          org.state,
          org.pincode,
          org.country,
        ]
          .filter(Boolean)
          .join(', '),
        email: org.primaryEmail || owner?.user.email || '',
        phone: org.primaryPhone || '',
      },
      planName:
        configuredWorkspacePlans().find((plan) => plan.code === org.planTier)
          ?.name ||
        org.planTier.charAt(0) + org.planTier.slice(1).toLowerCase(),
      items: kind === 'SETUP_FEE' ? setupPaymentQuote(org, seats).items : items,
      note:
        kind === 'SEAT_UPGRADE'
          ? 'Seat access is added after payment confirmation.'
          : 'Service is extended by 30 days from the later of the previous expiry or payment confirmation. No automatic debit is authorized by this invoice.',
    };
  }
  async create(
    tx: Tx,
    input: {
      org: InvoiceOrganization;
      issuer: InvoiceIssuer;
      mode: InvoiceMode;
      kind: InvoiceKind;
      seats: number;
      obligationKey: string;
      dueAt: Date;
      now?: Date;
      replacesNumber?: string;
      snapshot?: InvoiceSnapshot;
      historical?: boolean;
      paidAt?: Date;
      paymentReference?: string;
      queueEmail?: boolean;
    },
  ) {
    const existing = await tx.billingInvoice.findUnique({
      where: { obligationKey: input.obligationKey },
    });
    if (existing) return existing;
    const snapshot =
      input.snapshot ??
      (await this.snapshot(
        tx,
        input.org,
        input.issuer,
        input.kind,
        input.seats,
      ));
    const amountMinor = snapshot.items.reduce(
      (sum, item) => sum + item.amountMinor,
      0,
    );
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)
      throw new BadRequestException(
        'Invoice total must be a positive supported amount',
      );
    const now = input.now ?? new Date();
    const year = now.toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
    });
    const sequence = await tx.invoiceSequence.upsert({
      where: { key: `${input.mode}-${year}` },
      create: { key: `${input.mode}-${year}`, value: 1 },
      update: { value: { increment: 1 } },
    });
    const number = `GZ-${input.mode === 'TEST' ? 'TEST-' : ''}${year}-${String(
      sequence.value,
    ).padStart(6, '0')}`;
    const invoice = await tx.billingInvoice.create({
      data: {
        number,
        organizationId: input.org.id,
        obligationKey: input.obligationKey,
        type: input.kind,
        mode: input.mode,
        seatQuantity: input.seats,
        snapshot,
        amountMinor,
        dueAt: input.dueAt,
        issuedAt: now,
        replacesNumber: input.replacesNumber,
        historical: input.historical ?? false,
        status: input.paidAt ? 'PAID' : 'ISSUED',
        paidAt: input.paidAt,
        paymentReference: input.paymentReference,
      },
    });
    if (input.queueEmail !== false)
      await this.queueDelivery(tx, invoice, input.paidAt ? 'PAID' : 'ISSUED');
    return invoice;
  }
  async queueDelivery(
    tx: Tx,
    invoice: BillingInvoice,
    kind: 'ISSUED' | 'PAID',
  ) {
    const owners = await tx.organizationMember.findMany({
      where: {
        organizationId: invoice.organizationId,
        isOwner: true,
        isActive: true,
        user: { isActive: true, role: { not: 'SUPER_ADMIN' } },
      },
      select: { user: { select: { email: true } } },
    });
    for (const email of new Set(
      owners.map(({ user }) => user.email.trim().toLowerCase()),
    )) {
      await tx.invoiceDelivery.upsert({
        where: {
          invoiceId_kind_recipient: {
            invoiceId: invoice.id,
            kind,
            recipient: email,
          },
        },
        create: { invoiceId: invoice.id, kind, recipient: email },
        update: {},
      });
    }
  }
  async voidInvoice(tx: Tx, invoice: BillingInvoice, reason: string) {
    await tx.billingInvoice.update({
      where: { id: invoice.id },
      data: { status: 'VOID', voidReason: reason },
    });
    await tx.invoiceDelivery.updateMany({
      where: {
        invoiceId: invoice.id,
        kind: 'ISSUED',
        status: { in: ['PENDING', 'FAILED'] },
      },
      data: { status: 'CANCELLED' },
    });
  }
  async ensureScheduled(
    tx: Tx,
    org: InvoiceOrganization,
    issuer: InvoiceIssuer,
    mode: InvoiceMode,
    now = new Date(),
    requestedSeats?: number,
  ) {
    if (['CANCELLED', 'SUSPENDED'].includes(org.status)) return null;
    const dueAt = org.setupFeePaid
      ? org.currentPeriodEnd
      : org.trialEndsAt ??
        new Date(org.createdAt.getTime() + DEFAULT_TRIAL_DAYS * BILLING_DAY_MS);
    if (
      !dueAt ||
      dueAt.getTime() > now.getTime() + INVOICE_LEAD_DAYS * BILLING_DAY_MS
    )
      return null;
    const kind = org.setupFeePaid ? 'RECURRING_SEATS' : 'SETUP_FEE';
    const baseKey = `${mode}:${org.id}:${kind}:${dueAt.toISOString()}`;
    const prior = await tx.billingInvoice.findFirst({
      where: {
        ...(kind === 'SETUP_FEE'
          ? { organizationId: org.id, type: kind, mode }
          : { obligationKey: { startsWith: baseKey } }),
        status: { in: ['ISSUED', 'PAID'] },
      },
      orderBy: { issuedAt: 'desc' },
    });
    const seats = requestedSeats ?? org.allocatedSeats;
    if (prior?.status === 'PAID') return prior;
    const snapshot = await this.snapshot(tx, org, issuer, kind, seats);
    if (
      prior &&
      prior.seatQuantity === seats &&
      JSON.stringify(readInvoiceSnapshot(prior.snapshot).items) ===
        JSON.stringify(snapshot.items)
    )
      return prior;
    if (prior)
      await this.voidInvoice(
        tx,
        prior,
        'Seat allowance or saved pricing changed before payment',
      );
    return this.create(tx, {
      org,
      issuer,
      mode,
      kind,
      seats,
      dueAt,
      obligationKey: prior ? `${baseKey}:replacement:${prior.number}` : baseKey,
      replacesNumber: prior?.number,
      snapshot,
    });
  }
  async forCheckout(
    organizationId: string,
    kind: 'SETUP_FEE' | 'SEAT_UPGRADE',
    seats: number,
    mode: InvoiceMode,
  ) {
    const settings = await this.settings();
    if (!settings.enabledAt)
      return kind === 'SETUP_FEE'
        ? this.firstSetupInvoice(organizationId, mode)
        : null;
    return this.prisma.$transaction(async (tx) => {
      const org = await this.lockOrganization(tx, organizationId);
      if (['CANCELLED', 'SUSPENDED'].includes(org.status))
        throw new BadRequestException(
          'This workspace cannot start a new payment',
        );
      if (kind === 'SETUP_FEE') {
        if (org.setupFeePaid)
          throw new ConflictException('Workspace setup has already been paid');
        const scheduled = await this.ensureScheduled(
          tx,
          org,
          settings,
          mode,
          new Date(),
          seats,
        );
        if (scheduled) return scheduled;
        return this.create(tx, {
          org,
          issuer: settings,
          mode,
          kind,
          seats,
          obligationKey: `${mode}:${org.id}:setup`,
          dueAt: org.trialEndsAt ?? new Date(),
        });
      }
      // Reuse an abandoned identical checkout, but never reuse an already paid purchase.
      const pending = await tx.billingInvoice.findFirst({
        where: {
          organizationId,
          type: kind,
          status: 'ISSUED',
          mode,
          seatQuantity: seats,
        },
        orderBy: { issuedAt: 'desc' },
      });
      if (
        pending &&
        Number(pending.amountMinor) ===
          minorAmount(org.pricePerSeatMonth) * seats
      )
        return pending;
      return this.create(tx, {
        org,
        issuer: settings,
        mode,
        kind,
        seats,
        obligationKey: `${mode}:${org.id}:seats:${randomUUID()}`,
        dueAt: new Date(),
      });
    });
  }
  async find(organizationId: string, number: string) {
    const invoice = await this.prisma.billingInvoice.findFirst({
      where: { organizationId, number },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }
  firstSetupInvoice(organizationId: string, mode?: InvoiceMode | null) {
    return this.prisma.billingInvoice.findFirst({
      where: {
        organizationId,
        type: 'SETUP_FEE',
        status: { in: ['ISSUED', 'PAID'] },
        ...(mode ? { mode } : {}),
      },
      orderBy: { issuedAt: 'desc' },
    });
  }
  present(invoice: BillingInvoice) {
    return {
      number: invoice.number,
      type: invoice.type,
      mode: invoice.mode,
      status: invoiceStatus(invoice.status, invoice.dueAt),
      amountMinor: Number(invoice.amountMinor),
      balanceMinor:
        invoice.status === 'ISSUED' ? Number(invoice.amountMinor) : 0,
      currency: invoice.currency,
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      paidAt: invoice.paidAt,
      paymentReference: invoice.paymentReference,
      replacesNumber: invoice.replacesNumber,
      voidReason: invoice.voidReason,
      historical: invoice.historical,
      reconciliationNote: invoice.reconciliationNote,
      snapshot: readInvoiceSnapshot(invoice.snapshot),
    };
  }
  async list(organizationId: string, query: InvoicesQuery) {
    const now = new Date();
    const where: Prisma.BillingInvoiceWhereInput = {
      organizationId,
      ...(query.mode ? { mode: query.mode } : {}),
      ...(query.status === 'OVERDUE'
        ? { status: 'ISSUED', dueAt: { lt: now } }
        : query.status === 'ISSUED'
        ? { status: 'ISSUED', dueAt: { gte: now } }
        : query.status
        ? { status: query.status }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { number: { contains: query.search.trim(), mode: 'insensitive' } }
        : {}),
      ...(query.from || query.to
        ? { issuedAt: dateRange(query.from, query.to) }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.billingInvoice.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ issuedAt: 'desc' }, { number: 'desc' }],
      }),
      this.prisma.billingInvoice.count({ where }),
    ]);
    return {
      items: items.map((invoice) => this.present(invoice)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async outstanding(organizationId: string, includeUnderReview = false) {
    const groups = await this.prisma.billingInvoice.groupBy({
      by: ['mode', 'currency'],
      where: {
        organizationId,
        status: 'ISSUED',
        ...(includeUnderReview ? {} : { reconciliationNote: null }),
      },
      _sum: { amountMinor: true },
      _count: { _all: true },
    });
    return {
      count: groups.reduce((sum, group) => sum + group._count._all, 0),
      groups: groups.map((group) => ({
        mode: group.mode,
        currency: group.currency,
        count: group._count._all,
        amountMinor: Number(group._sum.amountMinor ?? 0),
      })),
    };
  }
  render(invoice: BillingInvoice, statusOverride?: string) {
    return this.pdf.render({
      ...invoice,
      amountMinor: Number(invoice.amountMinor),
      status: statusOverride ?? invoiceStatus(invoice.status, invoice.dueAt),
      snapshot: readInvoiceSnapshot(invoice.snapshot),
    });
  }
}
