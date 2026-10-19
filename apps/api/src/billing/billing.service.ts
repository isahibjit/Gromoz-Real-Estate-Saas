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
  initialSeats!: number;
}

export class VerifyPaymentDto {
  orderId!: string;
  paymentId!: string;
  signature!: string;
  seats?: number;
}

export class UpgradeSeatsDto {
  additionalSeats!: number;
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

    return {
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      planTier: org.planTier,
      setupFeePaid: org.setupFeePaid,
      setupFeeAmount: org.setupFeeAmount,
      pricePerSeatMonth: org.pricePerSeatMonth,
      allocatedSeats: org.allocatedSeats,
      activeMembersCount,
      remainingSeats: Math.max(0, org.allocatedSeats - activeMembersCount),
      currentPeriodStart: org.currentPeriodStart,
      currentPeriodEnd: org.currentPeriodEnd,
      recentTransactions: org.billingTransactions,
      razorpayKey: this.razorpay.getPublicKey(),
    };
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

    if (dto.additionalSeats <= 0) {
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
    dto: VerifyPaymentDto & { additionalSeats: number },
  ) {
    const isValid = this.razorpay.verifyPaymentSignature({
      orderId: dto.orderId,
      paymentId: dto.paymentId,
      signature: dto.signature,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    const org = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        allocatedSeats: {
          increment: dto.additionalSeats,
        },
      },
    });

    const amount = dto.additionalSeats * org.pricePerSeatMonth;

    await this.prisma.billingTransaction.create({
      data: {
        organizationId,
        amount,
        type: 'SEAT_UPGRADE',
        razorpayPaymentId: dto.paymentId,
        razorpayOrderId: dto.orderId,
        status: 'captured',
        metadata: {
          additionalSeats: dto.additionalSeats,
          newTotalSeats: org.allocatedSeats,
        },
      },
    });

    return {
      success: true,
      allocatedSeats: org.allocatedSeats,
    };
  }

  async processWebhook(rawBody: string, signature: string, payload: any) {
    const isValid = this.razorpay.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    this.logger.log(`Received Razorpay webhook: ${event}`);

    if (event === 'payment.captured' || event === 'payment_link.paid') {
      const entity =
        payload.payload?.payment_link?.entity ||
        payload.payload?.payment?.entity;
      const notes = entity?.notes;
      if (notes?.organizationId && notes?.type === 'SETUP_AND_INITIAL_SEATS') {
        const seats = Number(notes.seats || 1);
        await this.prisma.organization.update({
          where: { id: notes.organizationId },
          data: {
            setupFeePaid: true,
            status: 'ACTIVE',
            allocatedSeats: seats,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        this.logger.log(
          `Organization ${notes.organizationId} activated via Razorpay webhook (${event})`,
        );
      }
    }

    return { status: 'ok' };
  }
}
