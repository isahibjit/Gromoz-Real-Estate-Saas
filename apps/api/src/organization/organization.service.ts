import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { Role } from '@prisma/client';

export class RegisterOrgDto {
  orgName!: string;
  orgSlug!: string;
  adminFullName!: string;
  adminEmail!: string;
  adminPassword!: string;
  initialSeats?: number;
}

export class InviteMemberDto {
  email!: string;
  role?: Role;
  fullName?: string;
}

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  async registerOrganization(dto: RegisterOrgDto) {
    // 1. Validate slug uniqueness
    const cleanSlug = dto.orgSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: cleanSlug },
    });

    if (existingOrg) {
      throw new ConflictException('An organization with this slug already exists. Please choose another.');
    }

    // 2. Validate email uniqueness
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists. Please log in.');
    }

    // 3. Hash password using argon2
    const passwordHash = await argon2.hash(dto.adminPassword);
    const initialSeats = Math.max(1, dto.initialSeats || 1);

    // 4. Create User, Organization, and OrganizationMember in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.adminEmail.toLowerCase().trim(),
          fullName: dto.adminFullName,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: dto.orgName,
          slug: cleanSlug,
          status: 'SETUP_PENDING',
          allocatedSeats: initialSeats,
          setupFeePaid: false,
          setupFeeAmount: 9999.0,
          pricePerSeatMonth: 500.0,
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'ADMIN',
          isOwner: true,
          isActive: true,
        },
      });

      return { user, organization, member };
    });

    // 5. Generate setup fee checkout order automatically
    const checkoutOrder = await this.billingService.createSetupCheckout(
      result.organization.id,
      { initialSeats },
    );

    return {
      message: 'Organization created successfully. Complete setup payment to activate.',
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        status: result.organization.status,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
      checkoutOrder,
    };
  }

  async getUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId, isActive: true },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            setupFeePaid: true,
            planTier: true,
            allocatedSeats: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      organizationId: m.organizationId,
      name: m.organization.name,
      slug: m.organization.slug,
      status: m.organization.status,
      setupFeePaid: m.organization.setupFeePaid,
      planTier: m.organization.planTier,
      allocatedSeats: m.organization.allocatedSeats,
      role: m.role,
      isOwner: m.isOwner,
    }));
  }

  async getCurrentOrganization(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const activeMembersCount = org.memberships.length;

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      planTier: org.planTier,
      setupFeePaid: org.setupFeePaid,
      allocatedSeats: org.allocatedSeats,
      activeMembersCount,
      remainingSeats: Math.max(0, org.allocatedSeats - activeMembersCount),
      pricePerSeatMonth: org.pricePerSeatMonth,
      members: org.memberships.map((m) => ({
        memberId: m.id,
        userId: m.userId,
        fullName: m.user.fullName,
        email: m.user.email,
        role: m.role,
        isOwner: m.isOwner,
        isActive: m.isActive,
        joinedAt: m.createdAt,
      })),
    };
  }

  async inviteMember(orgId: string, currentUserId: string, dto: InviteMemberDto) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Enforce seat limit check
    const activeMembersCount = await this.prisma.organizationMember.count({
      where: { organizationId: orgId, isActive: true },
    });

    if (activeMembersCount >= org.allocatedSeats) {
      throw new BadRequestException({
        code: 'SEAT_LIMIT_REACHED',
        message: `Your organization has reached its limit of ${org.allocatedSeats} seat(s). Please purchase additional seats to invite more team members.`,
        allocatedSeats: org.allocatedSeats,
        activeMembersCount,
        pricePerSeatMonth: org.pricePerSeatMonth,
      });
    }

    const email = dto.email.toLowerCase().trim();
    const targetRole = dto.role || 'SALES_AGENT';

    // Check if already a member
    let user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      const existingMembership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: user.id,
          },
        },
      });

      if (existingMembership) {
        throw new ConflictException('This user is already a member of this organization.');
      }

      await this.prisma.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          role: targetRole,
          isActive: true,
        },
      });

      return {
        message: 'Member added to organization successfully',
        type: 'EXISTING_USER_ADDED',
        user: { id: user.id, email: user.email, fullName: user.fullName },
      };
    }

    // Create an invitation token for new user
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId: orgId,
        email,
        role: targetRole,
        token,
        invitedById: currentUserId,
        expiresAt,
      },
    });

    return {
      message: 'Invitation generated successfully',
      type: 'INVITATION_CREATED',
      invitationId: invitation.id,
      email: invitation.email,
      inviteLink: `/auth/accept-invite?token=${token}`,
      expiresAt: invitation.expiresAt,
    };
  }

  async getPlatformSuperAdminMetrics() {
    const totalOrganizations = await this.prisma.organization.count();
    const activeOrganizations = await this.prisma.organization.count({
      where: { status: 'ACTIVE' },
    });
    const pendingSetup = await this.prisma.organization.count({
      where: { status: 'SETUP_PENDING' },
    });

    const totalMembers = await this.prisma.organizationMember.count({
      where: { isActive: true },
    });

    const organizations = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        _count: {
          select: {
            memberships: true,
            leads: true,
            projects: true,
          },
        },
      },
    });

    const revenueRecords = await this.prisma.billingTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: 'captured',
      },
    });

    return {
      overview: {
        totalOrganizations,
        activeOrganizations,
        pendingSetup,
        totalMembers,
        totalRevenueINR: revenueRecords._sum.amount || 0,
      },
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        planTier: org.planTier,
        setupFeePaid: org.setupFeePaid,
        allocatedSeats: org.allocatedSeats,
        activeMembers: org._count.memberships,
        leadsCount: org._count.leads,
        projectsCount: org._count.projects,
        createdAt: org.createdAt,
      })),
    };
  }
}
