import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { withSeatCapacity } from '../common/tenant/seat-capacity';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { BillingService } from './billing.service';
import { RazorpayService } from './razorpay.service';
const run =
  process.env.RUN_SUBSCRIPTION_DATABASE_TESTS === '1'
    ? describe
    : describe.skip;
run('Subscription database concurrency and migration', () => {
  let prisma: PrismaClient;
  beforeAll(async () => {
    const url = new URL(process.env.SUBSCRIPTION_DATABASE_URL || '');
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      (!url.pathname.endsWith('_subscription_test') &&
        !(process.env.CI === 'true' && url.pathname === '/gromoze_ci'))
    )
      throw new Error('Requires a disposable local subscription test database');
    prisma = new PrismaClient({ datasources: { db: { url: url.href } } });
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });
  async function fixture() {
    const id = randomUUID();
    const org = await prisma.organization.create({
      data: {
        name: 'Subscription test',
        slug: `test-${id}`,
        allocatedSeats: 1,
      },
    });
    const users = await Promise.all(
      [0, 1].map((number) =>
        prisma.user.create({
          data: {
            email: `${id}-${number}@example.invalid`,
            passwordHash: 'test-only',
            role: 'SALES_AGENT',
            fullName: `Test ${number}`,
          },
        }),
      ),
    );
    return { org, users };
  }
  async function clean(orgId: string, ids: string[]) {
    await prisma.organization.delete({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  it('allows only one of two concurrent employee memberships into the last seat', async () => {
    const { org, users } = await fixture();
    try {
      const results = await Promise.allSettled(
        users.map((user) =>
          withSeatCapacity(prisma as unknown as PrismaService, org.id, (tx) =>
            tx.organizationMember.create({
              data: { organizationId: org.id, userId: user.id },
            }),
          ),
        ),
      );
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        await prisma.organizationMember.count({
          where: { organizationId: org.id },
        }),
      ).toBe(1);
    } finally {
      await clean(
        org.id,
        users.map((user) => user.id),
      );
    }
  });
  it('serializes an invitation against employee creation for the same remaining seat', async () => {
    const { org, users } = await fixture();
    try {
      const results = await Promise.allSettled([
        withSeatCapacity(prisma as unknown as PrismaService, org.id, (tx) =>
          tx.organizationMember.create({
            data: { organizationId: org.id, userId: users[0].id },
          }),
        ),
        withSeatCapacity(prisma as unknown as PrismaService, org.id, (tx) =>
          tx.organizationInvitation.create({
            data: {
              organizationId: org.id,
              email: 'invite@example.invalid',
              token: randomUUID(),
              expiresAt: new Date(Date.now() + 86400000),
            },
          }),
        ),
      ]);
      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const members = await prisma.organizationMember.count({
        where: { organizationId: org.id },
      });
      const invites = await prisma.organizationInvitation.count({
        where: { organizationId: org.id },
      });
      expect(members + invites).toBe(1);
    } finally {
      await clean(
        org.id,
        users.map((user) => user.id),
      );
    }
  });
  it('adds paid seats only once when verification requests arrive concurrently', async () => {
    const { org, users } = await fixture();
    try {
      const orderId = randomUUID(),
        paymentId = randomUUID();
      await prisma.billingTransaction.create({
        data: {
          organizationId: org.id,
          amount: 1000,
          type: 'SEAT_UPGRADE',
          status: 'created',
          razorpayOrderId: orderId,
          metadata: { additionalSeats: 2 },
        },
      });
      const service = new BillingService(
        prisma as unknown as PrismaService,
        {
          verifyPaymentSignature: () => true,
          verifyWebhookSignature: () => true,
          fetchPayment: async () => ({
            id: paymentId,
            order_id: orderId,
            amount: 100000,
            currency: 'INR',
            status: 'captured',
            amount_refunded: 0,
          }),
        } as unknown as RazorpayService,
      );
      const dto = { orderId, paymentId, signature: 'test' };
      await Promise.all([
        service.verifyAndApplySeatUpgrade(org.id, dto),
        service.verifyAndApplySeatUpgrade(org.id, dto),
        service.processWebhook('', 'signed-test', {
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: paymentId,
                order_id: orderId,
                amount: 100000,
                currency: 'INR',
              },
            },
          },
        }),
      ]);
      expect(
        (await prisma.organization.findUniqueOrThrow({ where: { id: org.id } }))
          .allocatedSeats,
      ).toBe(3);
      expect(
        await prisma.billingTransaction.count({
          where: { organizationId: org.id, status: 'captured' },
        }),
      ).toBe(1);
    } finally {
      await clean(
        org.id,
        users.map((user) => user.id),
      );
    }
  });
  it('records a setup payment link in history once without resetting the renewal deadline on replay', async () => {
    const { org, users } = await fixture();
    try {
      const service = new BillingService(
        prisma as unknown as PrismaService,
        { verifyWebhookSignature: () => true } as unknown as RazorpayService,
      );
      const paymentId = randomUUID();
      const payload = {
        event: 'payment_link.paid',
        payload: {
          payment_link: {
            entity: {
              notes: {
                organizationId: org.id,
                type: 'SETUP_AND_INITIAL_SEATS',
                seats: '2',
              },
            },
          },
          payment: {
            entity: {
              id: paymentId,
              order_id: randomUUID(),
              amount: 100000,
              currency: 'INR',
            },
          },
        },
      };
      await service.processWebhook('', 'signed-test', payload);
      const before = await prisma.organization.findUniqueOrThrow({
        where: { id: org.id },
      });
      await service.processWebhook('', 'signed-test', payload);
      const after = await prisma.organization.findUniqueOrThrow({
        where: { id: org.id },
      });
      expect(after.currentPeriodEnd).toEqual(before.currentPeriodEnd);
      expect(after.setupFeePaid).toBe(true);
      expect(
        await prisma.billingTransaction.count({
          where: { organizationId: org.id, razorpayPaymentId: paymentId },
        }),
      ).toBe(1);
    } finally {
      await clean(
        org.id,
        users.map((user) => user.id),
      );
    }
  });
  it('keeps support history when an employee is removed', async () => {
    const { org, users } = await fixture();
    try {
      const ticket = await prisma.supportTicket.create({
        data: {
          organizationId: org.id,
          requesterId: users[0].id,
          requesterName: 'Test Owner',
          requesterEmail: users[0].email,
          subject: 'A support request',
          description: 'Test details',
          category: 'GENERAL',
        },
      });
      await prisma.user.delete({ where: { id: users[0].id } });
      const saved = await prisma.supportTicket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(saved.requesterId).toBeNull();
      expect(saved.requesterName).toBe('Test Owner');
      expect(saved.number).toBeGreaterThan(0);
    } finally {
      await clean(
        org.id,
        users.map((user) => user.id),
      );
    }
  });
});
