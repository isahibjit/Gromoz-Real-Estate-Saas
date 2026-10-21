jest.mock('./commercial-plan-catalog', () => ({
  configuredWorkspacePlans: () => [
    { code: 'STARTER', name: 'Starter', description: '' },
    { code: 'GROWTH', name: 'Growth', description: '' },
  ],
}));
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { SubscriptionAdminGuard } from '../common/tenant/subscription-admin.guard';
import { withSeatCapacity } from '../common/tenant/seat-capacity';
import { BillingService } from './billing.service';
import { RazorpayService } from './razorpay.service';
import { SupportTicketsService } from './support-tickets.service';
import { subscriptionState } from './subscription-state';
import { WorkspaceListQuery } from './workspace.dto';

const prisma = {
  organization: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  organizationMember: { count: jest.fn() },
  organizationInvitation: { count: jest.fn(), create: jest.fn() },
  user: { findUnique: jest.fn() },
  billingTransaction: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  supportTicket: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(
    async (work: (tx: unknown) => Promise<unknown>): Promise<unknown> =>
      work(prisma),
  ),
};
const db = prisma as unknown as PrismaService;
const email = { sendTenantPlatformEmail: jest.fn() };
const razorpay = {
  verifyPaymentSignature: jest.fn(),
  createOrder: jest.fn(),
  getPublicKey: jest.fn(),
};
const billing = new BillingService(db, razorpay as unknown as RazorpayService);
const tickets = new SupportTicketsService(
  db,
  email as unknown as EmailConnectorsService,
  new ConfigService({
    PLATFORM_SUPPORT_EMAIL: 'help@gromoze.test',
    SMTP_USER: 'sender@gromoze.test',
  }),
);
const ticket = {
  id: 'internal-id',
  organizationId: 'tenant-a',
  number: 42,
  subject: 'Cannot view my lead',
  description: 'The lead details do not open.',
  category: 'TECHNICAL',
  priority: 'NORMAL',
  status: 'OPEN',
  requesterId: 'owner',
  requesterName: 'Owner',
  requesterEmail: 'owner@tenant.test',
  targetPlanCode: null,
  deliveryStatus: 'SENT',
  createdAt: new Date(),
  updatedAt: new Date(),
};
beforeEach(() => {
  jest.clearAllMocks();
  prisma.organization.findUnique.mockResolvedValue({
    allocatedSeats: 2,
    pricePerSeatMonth: 500,
    name: 'Tenant A',
    slug: 'tenant-a',
    planTier: 'STARTER',
  });
  prisma.organizationMember.count.mockResolvedValue(1);
  prisma.organizationInvitation.count.mockResolvedValue(0);
  prisma.supportTicket.create.mockResolvedValue(ticket);
  prisma.supportTicket.update.mockResolvedValue(ticket);
  prisma.user.findUnique.mockResolvedValue({
    fullName: 'Owner',
    email: 'owner@tenant.test',
  });
});
describe('Subscription access', () => {
  it.each([
    { role: 'ADMIN', isOwner: false },
    { role: 'SALES_AGENT', isOwner: true },
  ])('accepts tenant owners/admins', (tenant) => {
    expect(
      new SubscriptionAdminGuard().canActivate(
        new ExecutionContextHost([{ tenant }]),
      ),
    ).toBe(true);
  });
  it.each([
    { role: 'SUPER_ADMIN', isOwner: false },
    { role: 'HR', isOwner: false },
    undefined,
  ])('rejects other roles and unscoped access', (tenant) => {
    expect(() =>
      new SubscriptionAdminGuard().canActivate(
        new ExecutionContextHost([{ tenant }]),
      ),
    ).toThrow(ForbiddenException);
  });
});
describe('Seat capacity', () => {
  it('locks the organization before allowing a seat-consuming write', async () => {
    const write = jest.fn().mockResolvedValue('created');
    await expect(withSeatCapacity(db, 'tenant-a', write)).resolves.toBe(
      'created',
    );
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      write.mock.invocationCallOrder[0],
    );
  });
  it('reserves capacity for pending invitations and never writes over the allowance', async () => {
    prisma.organizationInvitation.count.mockResolvedValue(1);
    const write = jest.fn();
    await expect(
      withSeatCapacity(db, 'tenant-a', write),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(write).not.toHaveBeenCalled();
  });
});
describe('Payment history and verification', () => {
  it('applies tenant, dates and filters to both rows and count', async () => {
    prisma.billingTransaction.findMany.mockResolvedValue([]);
    prisma.billingTransaction.count.mockResolvedValue(0);
    await billing.listTransactions('tenant-a', {
      page: 2,
      pageSize: 10,
      status: 'captured',
      type: 'SEAT_UPGRADE',
      from: '2026-10-01',
      to: '2026-10-21',
    });
    const call = prisma.billingTransaction.findMany.mock.calls[0][0];
    expect(call).toMatchObject({
      skip: 10,
      take: 10,
      where: {
        organizationId: 'tenant-a',
        status: 'captured',
        type: 'SEAT_UPGRADE',
      },
    });
    expect(prisma.billingTransaction.count).toHaveBeenCalledWith({
      where: call.where,
    });
  });
  it('uses the saved seat quantity rather than the browser quantity', async () => {
    razorpay.verifyPaymentSignature.mockReturnValue(true);
    prisma.billingTransaction.findFirst.mockResolvedValue({
      id: 'order-row',
      status: 'created',
      metadata: { additionalSeats: 2 },
    });
    prisma.organization.update.mockResolvedValue({ allocatedSeats: 4 });
    await billing.verifyAndApplySeatUpgrade('tenant-a', {
      orderId: 'order-1',
      paymentId: 'payment-1',
      signature: 'signature',
      additionalSeats: 999,
    });
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'tenant-a' },
      data: { allocatedSeats: { increment: 2 } },
    });
  });
  it('does not grant seats again for a replayed payment', async () => {
    razorpay.verifyPaymentSignature.mockReturnValue(true);
    prisma.billingTransaction.findFirst.mockResolvedValue({
      status: 'captured',
      razorpayPaymentId: 'payment-1',
    });
    prisma.organization.findUniqueOrThrow.mockResolvedValue({
      allocatedSeats: 4,
    });
    await billing.verifyAndApplySeatUpgrade('tenant-a', {
      orderId: 'order-1',
      paymentId: 'payment-1',
      signature: 'signature',
    });
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
  it('rejects orders belonging to another tenant', async () => {
    razorpay.verifyPaymentSignature.mockReturnValue(true);
    prisma.billingTransaction.findFirst.mockResolvedValue(null);
    await expect(
      billing.verifyAndApplySeatUpgrade('tenant-b', {
        orderId: 'order-a',
        paymentId: 'payment-a',
        signature: 'signature',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organization.update).not.toHaveBeenCalled();
  });
});
describe('Support tickets', () => {
  it('saves a tenant request and sends support email using platform SMTP', async () => {
    const result = await tickets.create('tenant-a', 'owner', {
      subject: ticket.subject,
      description: ticket.description,
      category: 'TECHNICAL',
      priority: 'NORMAL',
    });
    expect(result).toMatchObject({ code: 'GR-000042' });
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('organizationId');
    expect(email.sendTenantPlatformEmail).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({
        to: 'help@gromoze.test',
        subject: '[GR-000042] Cannot view my lead',
      }),
    );
  });
  it('retains the ticket and records failed delivery when SMTP fails', async () => {
    email.sendTenantPlatformEmail.mockRejectedValueOnce(
      new Error('SMTP unavailable'),
    );
    await tickets.create('tenant-a', 'owner', {
      subject: ticket.subject,
      description: ticket.description,
      category: 'TECHNICAL',
      priority: 'NORMAL',
    });
    expect(prisma.supportTicket.update).toHaveBeenCalledWith({
      where: { id: ticket.id },
      data: { deliveryStatus: 'FAILED' },
    });
  });
  it('applies ticket filters and tenant isolation', async () => {
    prisma.supportTicket.findMany.mockResolvedValue([ticket]);
    prisma.supportTicket.count.mockResolvedValue(1);
    const result = await tickets.list('tenant-a', {
      ...new WorkspaceListQuery(),
      status: 'OPEN',
      priority: 'HIGH',
      category: 'TECHNICAL',
      search: 'GR-000042',
    });
    expect(prisma.supportTicket.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        organizationId: 'tenant-a',
        status: 'OPEN',
        priority: 'HIGH',
        category: 'TECHNICAL',
      },
    });
    expect(result.items[0].code).toBe('GR-000042');
  });
  it('does not resend an already delivered support notification', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue(ticket);
    await tickets.retryDelivery('tenant-a', 'GR-000042');
    expect(email.sendTenantPlatformEmail).not.toHaveBeenCalled();
  });
  it('cannot fetch or update another tenant ticket', async () => {
    prisma.supportTicket.findFirst.mockResolvedValue(null);
    await expect(
      tickets.detail('tenant-b', 'GR-000042'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      tickets.updateStatus('tenant-b', 'GR-000042', 'CLOSED'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.supportTicket.update).not.toHaveBeenCalled();
  });
  it('creates a reviewed plan change request and includes tenant context in the support email', async () => {
    await tickets.create('tenant-a', 'owner', {
      subject: 'Plan change request',
      description: 'We would like Growth for our team.',
      category: 'PLAN_CHANGE',
      targetPlanCode: 'GROWTH',
      priority: 'NORMAL',
    });
    expect(prisma.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'tenant-a',
          category: 'PLAN_CHANGE',
          targetPlanCode: 'GROWTH',
        }),
      }),
    );
    expect(razorpay.createOrder).not.toHaveBeenCalled();
  });
  it('rejects a plan change to a plan absent from the active catalog', async () => {
    await expect(
      tickets.create('tenant-a', 'owner', {
        subject: 'Plan change',
        description: 'Please change our plan',
        category: 'PLAN_CHANGE',
        targetPlanCode: 'DOES_NOT_EXIST',
        priority: 'NORMAL',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.supportTicket.create).not.toHaveBeenCalled();
  });
});
describe('Expiry presentation', () => {
  it('never labels a missing deadline as active', () =>
    expect(
      subscriptionState({
        status: 'ACTIVE',
        trialEndsAt: null,
        currentPeriodEnd: null,
      }).expiryState,
    ).toBe('NOT_CONFIGURED'));
  it('marks an expired trial as action-required without mutating its status', () =>
    expect(
      subscriptionState(
        {
          status: 'TRIAL',
          trialEndsAt: new Date('2026-10-20'),
          currentPeriodEnd: null,
        },
        new Date('2026-10-21'),
      ).expiryState,
    ).toBe('EXPIRED'));
});
