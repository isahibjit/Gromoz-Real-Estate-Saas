import { Prisma } from '@prisma/client';
import { IsInt, IsString, Min, Max, IsOptional } from 'class-validator';
import { configuredWorkspacePlans } from './commercial-plan-catalog';
import { subscriptionState } from './subscription-state';
import { TransactionsQuery } from './workspace.dto';
import { dateRange } from './workspace-date-range';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { tenantWorkspaceUrl } from '@truroot/shared';

export const DEFAULT_TRIAL_DAYS = 14;

export class SetupCheckoutDto {
  @IsOptional() @IsInt() @Min(1) @Max(100000) initialSeats!: number;
}

export class VerifyPaymentDto {
  @IsString() orderId!: string;
  @IsString() paymentId!: string;
  @IsString() signature!: string;
  @IsOptional() @IsInt() @Min(1) seats?: number;
  @IsOptional() @IsInt() @Min(1) additionalSeats?: number;
}

export class UpgradeSeatsDto {
  @IsInt() @Min(1) @Max(1000) additionalSeats!: number;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
  ) {}

  async getOverview(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: {
          where: {
            isActive: true,
            isOwner: true,
            user: { isActive: true, role: { not: 'SUPER_ADMIN' } },
          },
          select: { user: { select: { fullName: true, email: true } } },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        billingTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const activeMembersCount = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    const pendingInvitations = await this.prisma.organizationInvitation.count({
      where: {
        organizationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    return {
      pendingInvitations,
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      planTier: org.planTier,
      planName:
        configuredWorkspacePlans().find((plan) => plan.code === org.planTier)
          ?.name ??
        org.planTier.charAt(0) + org.planTier.slice(1).toLowerCase(),
      availablePlans: configuredWorkspacePlans(),
      ...subscriptionState(org),
      trialEndsAt: org.trialEndsAt,
      contact: {
        ownerName: org.memberships[0]?.user.fullName ?? null,
        ownerEmail: org.memberships[0]?.user.email ?? null,
        email: org.primaryEmail,
        phone: org.primaryPhone,
      },
      setupFeePaid: org.setupFeePaid,
      setupFeeAmount: org.setupFeeAmount,
      pricePerSeatMonth: org.pricePerSeatMonth,
      allocatedSeats: org.allocatedSeats,
      activeMembersCount,
      remainingSeats: Math.max(
        0,
        org.allocatedSeats - activeMembersCount - pendingInvitations,
      ),
      currentPeriodStart: org.currentPeriodStart,
      currentPeriodEnd: org.currentPeriodEnd,
      recentTransactions: org.billingTransactions,
      razorpayKey: this.razorpay.getPublicKey(),
    };
  }

  async listTransactions(organizationId: string, query: TransactionsQuery) {
    const where: Prisma.BillingTransactionWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.from || query.to
        ? { createdAt: dateRange(query.from, query.to) }
        : {}),
    };
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 10;
    const [items, total] = await Promise.all([
      this.prisma.billingTransaction.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          createdAt: true,
          amount: true,
          currency: true,
          type: true,
          status: true,
          invoiceNumber: true,
          receiptUrl: true,
          razorpayPaymentId: true,
          razorpayOrderId: true,
        },
      }),
      this.prisma.billingTransaction.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async createSetupCheckout(organizationId: string, dto: SetupCheckoutDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: {
          include: { user: true },
          where: { isOwner: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const adminUser = org.memberships[0]?.user;
    const seats = Math.max(1, dto.initialSeats || 1);
    const seatsTotal = seats * org.pricePerSeatMonth;
    const totalAmount = org.setupFeeAmount + seatsTotal;

    const receipt = `setup_${org.slug.slice(0, 18)}_${Date.now()}`;
    const order = await this.razorpay.createOrder({
      amount: totalAmount,
      receipt,
      notes: {
        organizationId: org.id,
        organizationSlug: org.slug,
        type: 'SETUP_AND_INITIAL_SEATS',
        seats: String(seats),
      },
    });

    let paymentLink: any = null;
    try {
      paymentLink = await this.razorpay.createPaymentLink({
        amount: totalAmount,
        description: `Gromoze CRM Setup & ${seats} User Seats (${org.name})`,
        customer: {
          name: adminUser?.fullName || org.name,
          email: adminUser?.email || 'admin@trueroot.com',
        },
        callbackUrl: `${tenantWorkspaceUrl(org.slug)}/login`,
        notes: {
          organizationId: org.id,
          organizationSlug: org.slug,
          type: 'SETUP_AND_INITIAL_SEATS',
          seats: String(seats),
        },
      });
    } catch (err: any) {
      this.logger.warn(
        `Failed to generate Razorpay payment link: ${err?.message}`,
      );
    }

    return {
      orderId: order.id,
      paymentLinkId: paymentLink?.id,
      paymentLinkUrl: paymentLink?.short_url,
      shortUrl: paymentLink?.short_url,
      checkoutError: paymentLink?.short_url
        ? null
        : 'Razorpay could not create a shareable payment link. Retry from the tenant overview.',
      amount: totalAmount,
      currency: order.currency || 'INR',
      setupFeeAmount: org.setupFeeAmount,
      seatsCount: seats,
      seatsAmount: seatsTotal,
      razorpayKey: this.razorpay.getPublicKey(),
      organizationName: org.name,
    };
  }

  async verifyAndActivateSetup(organizationId: string, dto: VerifyPaymentDto) {
    const isValid = this.razorpay.verifyPaymentSignature({
      orderId: dto.orderId,
      paymentId: dto.paymentId,
      signature: dto.signature,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const seats = Math.max(1, dto.seats || org.allocatedSeats);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        setupFeePaid: true,
        status: 'ACTIVE',
        allocatedSeats: seats,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    const totalAmount = org.setupFeeAmount + seats * org.pricePerSeatMonth;

    await this.prisma.billingTransaction.create({
      data: {
        organizationId,
        amount: totalAmount,
        type: 'SETUP_FEE',
        razorpayPaymentId: dto.paymentId,
        razorpayOrderId: dto.orderId,
        status: 'captured',
        metadata: {
          seats,
          setupFee: org.setupFeeAmount,
          monthlySeatTotal: seats * org.pricePerSeatMonth,
        },
      },
    });

    return {
      success: true,
      status: updatedOrg.status,
      setupFeePaid: updatedOrg.setupFeePaid,
      allocatedSeats: updatedOrg.allocatedSeats,
      currentPeriodEnd: updatedOrg.currentPeriodEnd,
    };
  }

  async createSeatUpgradeCheckout(
    organizationId: string,
    dto: UpgradeSeatsDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    if (!Number.isInteger(dto.additionalSeats) || dto.additionalSeats < 1 || dto.additionalSeats > 1000) {
      throw new BadRequestException('Must purchase at least 1 seat');
    }

    const totalAmount = dto.additionalSeats * org.pricePerSeatMonth;
    const receipt = `seat_up_${org.slug.slice(0, 18)}_${Date.now()}`;

    const order = await this.razorpay.createOrder({
      amount: totalAmount,
      receipt,
      notes: {
        organizationId: org.id,
        type: 'SEAT_UPGRADE',
        additionalSeats: String(dto.additionalSeats),
      },
    });

    await this.prisma.billingTransaction.create({
      data: {
        organizationId,
        amount: totalAmount,
        currency: order.currency || 'INR',
        type: 'SEAT_UPGRADE',
        status: 'created',
        razorpayOrderId: order.id,
        metadata: { additionalSeats: dto.additionalSeats },
      },
    });
    return {
      orderId: order.id,
      amount: totalAmount,
      currency: order.currency,
      additionalSeats: dto.additionalSeats,
      pricePerSeatMonth: org.pricePerSeatMonth,
      razorpayKey: this.razorpay.getPublicKey(),
      organizationName: org.name,
    };
  }

  async verifyAndApplySeatUpgrade(
    organizationId: string,
    dto: VerifyPaymentDto,
  ) {
    const isValid = this.razorpay.verifyPaymentSignature({
      orderId: dto.orderId,
      paymentId: dto.paymentId,
      signature: dto.signature,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    return this.applySeatUpgrade(organizationId, dto.orderId, dto.paymentId);
  }

  private async applySeatUpgrade(
    organizationId: string,
    orderId: string,
    paymentId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
      const order = await tx.billingTransaction.findFirst({
        where: {
          organizationId,
          razorpayOrderId: orderId,
          type: 'SEAT_UPGRADE',
        },
      });
      if (!order)
        throw new BadRequestException(
          'Checkout order does not belong to this workspace',
        );
      if (order.status === 'captured') {
        if (order.razorpayPaymentId !== paymentId)
          throw new BadRequestException('Checkout order has already been paid');
        const org = await tx.organization.findUniqueOrThrow({
          where: { id: organizationId },
          select: { allocatedSeats: true },
        });
        return { success: true, allocatedSeats: org.allocatedSeats };
      }
      if (!['created', 'failed'].includes(order.status))
        throw new BadRequestException('Checkout order is not payable');
      const metadata = order.metadata;
      const additionalSeats =
        metadata && typeof metadata === 'object' && !Array.isArray(metadata)
          ? metadata.additionalSeats
          : null;
      if (
        typeof additionalSeats !== 'number' ||
        !Number.isInteger(additionalSeats) ||
        additionalSeats < 1
      )
        throw new BadRequestException('Invalid checkout seat quantity');
      const org = await tx.organization.update({
        where: { id: organizationId },
        data: { allocatedSeats: { increment: additionalSeats } },
      });
      await tx.billingTransaction.update({
        where: { id: order.id },
        data: { status: 'captured', razorpayPaymentId: paymentId },
      });
      return { success: true, allocatedSeats: org.allocatedSeats };
    });
  }

  async processWebhook(rawBody: string, signature: string, payload: any) {
    const isValid = this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    this.logger.log(`Received Razorpay webhook: ${event}`);

    const payment = payload.payload?.payment?.entity;
    if (
      typeof payment?.order_id === 'string' &&
      typeof payment?.id === 'string'
    ) {
      const order = await this.prisma.billingTransaction.findFirst({
        where: { razorpayOrderId: payment.order_id, type: 'SEAT_UPGRADE' },
      });
      if (order) {
        if (event === 'payment.captured') {
          if (
            Math.round(order.amount * 100) !== payment.amount ||
            order.currency !== payment.currency
          )
            throw new BadRequestException(
              'Payment amount does not match checkout',
            );
          await this.applySeatUpgrade(
            order.organizationId,
            payment.order_id,
            payment.id,
          );
        } else if (event === 'payment.failed') {
          await this.prisma.billingTransaction.updateMany({
            where: { id: order.id, status: 'created' },
            data: { status: 'failed' },
          });
        }
        return { status: 'ok' };
      }
    }

    if (event === 'payment.captured' || event === 'payment_link.paid') {
      const entity = payload.payload?.payment_link?.entity || payment;
      const notes = entity?.notes;
      if (
        typeof notes?.organizationId === 'string' &&
        notes.type === 'SETUP_AND_INITIAL_SEATS' &&
        typeof payment?.id === 'string' &&
        typeof payment?.amount === 'number'
      ) {
        const organizationId = notes.organizationId;
        const seats = Number(notes.seats);
        if (!Number.isInteger(seats) || seats < 1 || payment.amount <= 0)
          throw new BadRequestException('Invalid setup payment');
        await this.prisma.$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
          const recorded = await tx.billingTransaction.findUnique({
            where: { razorpayPaymentId: payment.id },
            select: { id: true },
          });
          if (recorded) return;
          const org = await tx.organization.findUniqueOrThrow({
            where: { id: organizationId },
            select: { setupFeePaid: true },
          });
          if (!org.setupFeePaid)
            await tx.organization.update({
              where: { id: organizationId },
              data: {
                setupFeePaid: true,
                status: 'ACTIVE',
                allocatedSeats: seats,
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
              },
            });
          await tx.billingTransaction.create({
            data: {
              organizationId,
              amount: payment.amount / 100,
              currency: payment.currency || 'INR',
              type: 'SETUP_FEE',
              status: 'captured',
              razorpayPaymentId: payment.id,
              razorpayOrderId: payment.order_id || null,
              metadata: { seats },
            },
          });
        });
      }
    }

    return { status: 'ok' };
  }
}
