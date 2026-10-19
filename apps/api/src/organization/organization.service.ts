import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as dns from 'dns';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { BillingService, DEFAULT_TRIAL_DAYS } from '../billing/billing.service';
import { Role, OrganizationStatus, Prisma } from '@prisma/client';

import {
  IsBoolean,
  IsObject,
  IsNumber,
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  isPlatformHost,
  normalizeTenantHost,
  TenantSlugSchema,
  tenantSlugFromHost,
  tenantWorkspaceUrl,
  PLATFORM_HOST,
} from '@truroot/shared';
import {
  encryptPassword,
  passwordForDisplay,
} from '../common/utils/cipher.util';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { buildTenantAdminEmail } from './tenant-admin-email';

const resolveCnameAsync = promisify(dns.resolveCname);

export class RegisterOrgDto {
  @IsString()
  @IsOptional()
  orgName?: string;

  @IsString()
  @IsOptional()
  organizationName?: string;

  @IsString()
  @IsOptional()
  orgSlug?: string;

  @IsString()
  @IsOptional()
  subdomain?: string;

  @IsString()
  @IsOptional()
  adminFullName?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  adminEmail?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  adminPassword?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsNumber()
  @IsOptional()
  initialSeats?: number;

  @IsNumber()
  @IsOptional()
  seats?: number;

  @IsString()
  @IsOptional()
  planTier?: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;
}

export class ProvisionOrgDto extends RegisterOrgDto {
  @IsBoolean()
  @IsOptional()
  isTrial?: boolean;
}

export class InviteMemberDto {
  email!: string;
  role?: Role;
  fullName?: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(160) name?: string;
  @IsOptional()
  @IsEnum({ STARTER: 'STARTER', GROWTH: 'GROWTH', ENTERPRISE: 'ENTERPRISE' })
  planTier?: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  @IsOptional() @IsInt() @Min(1) @Max(100000) allocatedSeats?: number;
  @IsOptional() @IsEnum(OrganizationStatus) status?: OrganizationStatus;
  @IsOptional() @IsString() @MaxLength(253) customDomain?: string;
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  adminFullName?: string;
  @IsOptional() @IsEmail() @MaxLength(254) adminEmail?: string;
}

export class ResetTenantAdminPasswordDto {
  @IsOptional() @IsString() @MinLength(8) @MaxLength(128) newPassword?: string;
  @IsOptional() @IsBoolean() notifyEmail?: boolean;
}

export class UpdateWorkspaceSettingsDto {
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsString() primaryEmail?: string;
  @IsOptional() @IsString() primaryPhone?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() secondaryColor?: string;
  @IsOptional() @IsString() address1?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() pincode?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() collapsedLogoUrl?: string;
  @IsOptional() @IsBoolean() showLogoInSidebar?: boolean;
  @IsOptional() @IsBoolean() showLogoInLogin?: boolean;
  @IsOptional() @IsInt() sidebarLogoHeight?: number;
  @IsOptional() @IsEnum({ contain: 'contain', cover: 'cover' })
  sidebarLogoObjectFit?: 'contain' | 'cover';
  @IsOptional() @IsString() sidebarLogoBg?: string;
  @IsOptional() @IsInt() sidebarLogoRadius?: number;
  @IsOptional() @IsEnum({ left: 'left', center: 'center', right: 'right' })
  sidebarLogoAlign?: 'left' | 'center' | 'right';
  @IsOptional() @IsString() sidebarHeaderBg?: string;
  @IsOptional() @IsString() subdomain?: string;
  @IsOptional() @IsString() customDomain?: string;
  @IsOptional() @IsObject() localization?: Record<string, unknown>;
  @IsOptional() @IsObject() financial?: Record<string, unknown>;
  @IsOptional() @IsObject() preferences?: Record<string, unknown>;
  @IsOptional() @IsObject() security?: Record<string, unknown>;
  @IsOptional() @IsObject() loginCms?: Record<string, unknown>;
}

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly email: EmailConnectorsService,
  ) {}

  async provisionOrganization(dto: ProvisionOrgDto, actorId: string) {
    await this.requirePlatformAdmin(actorId);
    return this.registerOrganization(dto, dto.isTrial === true);
  }

  async registerOrganization(dto: RegisterOrgDto, trial = false) {
    const rawOrgName = (dto.organizationName || dto.orgName || '').trim();
    const rawSlug = (dto.subdomain || dto.orgSlug || '').trim();
    const rawAdminFullName = (dto.fullName || dto.adminFullName || '').trim();
    const rawAdminEmail = (dto.email || dto.adminEmail || '').trim();
    const rawAdminPassword = dto.password || dto.adminPassword || '';
    const initialSeats = Math.max(
      1,
      Number(dto.seats || dto.initialSeats) || 1,
    );

    if (!rawOrgName) {
      throw new BadRequestException('Organization name is required');
    }
    if (!rawSlug) {
      throw new BadRequestException('Subdomain / Slug is required');
    }
    if (!rawAdminEmail) {
      throw new BadRequestException('Admin email is required');
    }
    if (!rawAdminPassword || rawAdminPassword.length < 8) {
      throw new BadRequestException(
        'Admin password must be at least 8 characters long',
      );
    }

    const slugResult = TenantSlugSchema.safeParse(rawSlug);
    if (!slugResult.success) {
      throw new BadRequestException(slugResult.error.issues[0].message);
    }
    const cleanSlug = slugResult.data;
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: cleanSlug },
    });

    if (existingOrg) {
      throw new ConflictException(
        'An organization with this slug already exists. Please choose another.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: rawAdminEmail.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists. Please log in.',
      );
    }

    // Customer tenant accounts store reversible AES encrypted passwords so admins can manage/view them
    const passwordHash = encryptPassword(rawAdminPassword);
    const planTier = (
      ['STARTER', 'GROWTH', 'ENTERPRISE'].includes(
        (dto.planTier || '').toUpperCase(),
      )
        ? dto.planTier!.toUpperCase()
        : 'STARTER'
    ) as any;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: rawAdminEmail.toLowerCase(),
          fullName: rawAdminFullName || 'Organization Admin',
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: rawOrgName,
          slug: cleanSlug,
          status: trial ? 'TRIAL' : 'SETUP_PENDING',
          trialEndsAt: trial
            ? new Date(Date.now() + DEFAULT_TRIAL_DAYS * 86400000)
            : null,
          planTier,
          industry: dto.industry || 'Real Estate',
          city: dto.city || null,
          allocatedSeats: initialSeats,
          setupFeePaid: false,
          setupFeeAmount: 9999.0,
          pricePerSeatMonth: 500.0,
          brandingPrimaryColor: '#0D1F3D',
          brandingSecondaryColor: '#E20613',
          sidebarLogoHeight: 42,
          showLogoInSidebar: true,
          showLogoInLogin: true,
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

    // Provisioning must not fail after the account transaction has committed
    // merely because an external checkout provider is unavailable.
    let checkoutError: string | null = null;
    const checkoutOrder = trial
      ? null
      : await this.billingService
          .createSetupCheckout(result.organization.id, { initialSeats })
          .catch(() => {
            checkoutError =
              'Setup payment link is unavailable. Check the platform Razorpay configuration and retry from the tenant overview.';
            return null;
          });

    const paymentLinkUrl =
      checkoutOrder?.paymentLinkUrl || checkoutOrder?.shortUrl || null;

    // Dispatch automated Welcome Kit Email to tenant administrator
    let welcomeEmailSent = false;
    try {
      welcomeEmailSent = await this.sendTenantWelcomeKit({
        adminEmail: rawAdminEmail.toLowerCase(),
        adminFullName: rawAdminFullName || 'Organization Admin',
        adminPassword: rawAdminPassword,
        organizationName: rawOrgName,
        subdomain: cleanSlug,
        workspaceUrl: tenantWorkspaceUrl(cleanSlug),
        isTrial: trial,
        planTier,
        seats: initialSeats,
        paymentLinkUrl,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[OrganizationService] Welcome email failed for ${rawAdminEmail}:`,
        message,
      );
    }

    return {
      message: trial
        ? 'Organization created with a 14-day trial.'
        : 'Organization created successfully. Setup payment is pending.',
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
        workspaceUrl: tenantWorkspaceUrl(result.organization.slug),
        trialEndsAt: result.organization.trialEndsAt,
        status: result.organization.status,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
      },
      checkoutOrder,
      checkoutError: checkoutError || checkoutOrder?.checkoutError || null,
      welcomeEmailSent,
    };
  }

  async getWorkspaceSettings(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const customSettings = (org.workspaceSettingsJson as any) || {};

    return {
      profile: {
        companyName: org.name,
        tenantCode: org.slug.toUpperCase(),
        configVersion: 'v2.4.0',
        createdOn: org.createdAt.toISOString().split('T')[0],
        createdBy: 'Administrator',
        industry: org.industry || '',
        website: org.website || '',
        primaryEmail: org.primaryEmail || '',
        primaryPhone: org.primaryPhone || '',
        primaryColor: org.brandingPrimaryColor || '#0D1F3D',
        secondaryColor: org.brandingSecondaryColor || '#E20613',
        address1: org.addressLine1 || '',
        city: org.city || '',
        state: org.state || 'Maharashtra',
        country: org.country || 'India',
        pincode: org.pincode || '',
        logoUrl: org.logoUrl || '',
        collapsedLogoUrl: org.collapsedLogoUrl || '',
        showLogoInSidebar: org.showLogoInSidebar,
        showLogoInLogin: org.showLogoInLogin,
        sidebarLogoHeight: org.sidebarLogoHeight,
        sidebarLogoObjectFit:
          customSettings.sidebarBranding?.sidebarLogoObjectFit ?? 'contain',
        sidebarLogoBg:
          customSettings.sidebarBranding?.sidebarLogoBg ?? 'transparent',
        sidebarLogoRadius: customSettings.sidebarBranding?.sidebarLogoRadius ?? 6,
        sidebarLogoAlign: customSettings.sidebarBranding?.sidebarLogoAlign ?? 'left',
        sidebarHeaderBg:
          customSettings.sidebarBranding?.sidebarHeaderBg ?? 'transparent',
        subdomain: org.slug,
        customDomain: org.customDomain || '',
        customDomainVerified: org.customDomainVerified,
        customDomainSslStatus: org.customDomainSslStatus,
      },
      domain: {
        slug: org.slug,
        subdomain: `${org.slug}.gromoze.com`,
        customDomain: org.customDomain || null,
        customDomainVerified: org.customDomainVerified,
        customDomainSslStatus: org.customDomainSslStatus,
        cnameTarget: 'cname.yourcrm.com',
      },
      localization: customSettings.localization || {
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12-Hour',
        language: 'en-US',
        weekStart: 'Monday',
        numberFormat: 'lakhs',
      },
      financial: customSettings.financial || {
        currency: 'INR',
        fyStart: 'April',
        gstNumber: '27AAAAA0000A1Z5',
        panNumber: 'ABCDE1234F',
        billingAddress: org.addressLine1 || '',
        autoInvoice: true,
      },
      preferences: customSettings.preferences || {
        defaultLandingPage: '/admin/dashboard',
        sessionTimeout: '60',
        emailNotifications: true,
        dailyDigest: true,
        showMapView: true,
        compactTable: false,
      },
      security: customSettings.security || {
        enforce2FA: false,
        passwordMinLength: '8',
        passwordExpiry: 'never',
        maxLoginAttempts: '5',
        ipWhitelist: false,
        geoFenceAttendance: true,
        forceLogoutOnInactivity: false,
      },
      loginCms: customSettings.loginCms || {
        heroHeadlinePrefix: 'Welcome to',
        heroHeadlineHighlight: org.name || 'Trueroot Realty CRM',
        heroTagline:
          'Streamline your leads, follow-ups, site visits and sales - all in one place.',
        heroLogoUrl: org.logoUrl || '',
        heroBgImageUrl: '',
        features: [
          { title: 'Manage Leads' },
          { title: 'Track Activities' },
          { title: 'Close More Deals' },
          { title: 'Boost Productivity' },
        ],
        trustBadgeTitle: 'Secure. Reliable. Always with You.',
        trustBadgeDescription:
          'Your data is protected with enterprise grade security.',
        cardTitle: 'Login to Your Account',
        cardSubtitle: 'Welcome back! Please login to continue.',
        passwordHint: '',
        downloadAppLabel: 'Download Android app',
        downloadAppUrl: '/download-app',
        showDownloadApp: true,
        supportTitle: 'Need help?',
        supportSubtitle: 'Contact our support team',
        supportPhone: org.primaryPhone || '+91 98700 66177',
        supportEmail: org.primaryEmail || 'support@gromoze.com',
        termsUrl: '/terms',
        privacyUrl: '/privacy-policy',
      },
    };
  }

  async updateWorkspaceSettings(
    orgId: string,
    dto: UpdateWorkspaceSettingsDto,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // If updating subdomain/slug, check uniqueness
    let newSlug = org.slug;
    if (dto.subdomain && dto.subdomain !== org.slug) {
      const parsedSlug = TenantSlugSchema.safeParse(dto.subdomain);
      if (!parsedSlug.success)
        throw new BadRequestException(parsedSlug.error.issues[0].message);
      const cleanSubdomain = parsedSlug.data;
      const conflict = await this.prisma.organization.findUnique({
        where: { slug: cleanSubdomain },
      });
      if (conflict && conflict.id !== orgId) {
        throw new ConflictException(
          'This subdomain is already taken by another organization.',
        );
      }
      newSlug = cleanSubdomain;
    }

    // If updating custom domain, check uniqueness
    let newCustomDomain = org.customDomain;
    let customDomainVerified = org.customDomainVerified;
    if (dto.customDomain !== undefined) {
      const cleanDomain = dto.customDomain
        ? dto.customDomain.toLowerCase().trim()
        : null;
      if (cleanDomain && cleanDomain !== org.customDomain) {
        const domainConflict = await this.prisma.organization.findUnique({
          where: { customDomain: cleanDomain },
        });
        if (domainConflict && domainConflict.id !== orgId) {
          throw new ConflictException(
            'This custom domain is already linked to another workspace.',
          );
        }
        newCustomDomain = cleanDomain;
        customDomainVerified = false; // reset verification on domain change
      } else if (!cleanDomain) {
        newCustomDomain = null;
        customDomainVerified = false;
      }
    }

    const existingSettings = (org.workspaceSettingsJson as any) || {};
    const updatedSettingsJson = {
      ...existingSettings,
      ...(dto.localization && { localization: dto.localization }),
      ...(dto.financial && { financial: dto.financial }),
      ...(dto.preferences && { preferences: dto.preferences }),
      ...(dto.security && { security: dto.security }),
      ...(dto.loginCms && { loginCms: dto.loginCms }),
      ...((dto.sidebarLogoObjectFit !== undefined ||
        dto.sidebarLogoBg !== undefined ||
        dto.sidebarLogoRadius !== undefined ||
        dto.sidebarLogoAlign !== undefined ||
        dto.sidebarHeaderBg !== undefined) && {
        sidebarBranding: {
          ...existingSettings.sidebarBranding,
          ...(dto.sidebarLogoObjectFit !== undefined && {
            sidebarLogoObjectFit: dto.sidebarLogoObjectFit,
          }),
          ...(dto.sidebarLogoBg !== undefined && {
            sidebarLogoBg: dto.sidebarLogoBg,
          }),
          ...(dto.sidebarLogoRadius !== undefined && {
            sidebarLogoRadius: dto.sidebarLogoRadius,
          }),
          ...(dto.sidebarLogoAlign !== undefined && {
            sidebarLogoAlign: dto.sidebarLogoAlign,
          }),
          ...(dto.sidebarHeaderBg !== undefined && {
            sidebarHeaderBg: dto.sidebarHeaderBg,
          }),
        },
      }),
    };

    const updatedOrg = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.companyName || org.name,
        slug: newSlug,
        customDomain: newCustomDomain,
        customDomainVerified,
        industry: dto.industry ?? org.industry,
        website: dto.website ?? org.website,
        primaryEmail: dto.primaryEmail ?? org.primaryEmail,
        primaryPhone: dto.primaryPhone ?? org.primaryPhone,
        brandingPrimaryColor: dto.primaryColor ?? org.brandingPrimaryColor,
        brandingSecondaryColor:
          dto.secondaryColor ?? org.brandingSecondaryColor,
        logoUrl: dto.logoUrl ?? org.logoUrl,
        collapsedLogoUrl: dto.collapsedLogoUrl ?? org.collapsedLogoUrl,
        showLogoInSidebar: dto.showLogoInSidebar ?? org.showLogoInSidebar,
        showLogoInLogin: dto.showLogoInLogin ?? org.showLogoInLogin,
        sidebarLogoHeight: dto.sidebarLogoHeight ?? org.sidebarLogoHeight,
        addressLine1: dto.address1 ?? org.addressLine1,
        city: dto.city ?? org.city,
        state: dto.state ?? org.state,
        country: dto.country ?? org.country,
        pincode: dto.pincode ?? org.pincode,
        workspaceSettingsJson: updatedSettingsJson,
      },
    });

    return {
      message: 'Workspace settings updated successfully',
      organization: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        slug: updatedOrg.slug,
        customDomain: updatedOrg.customDomain,
        customDomainVerified: updatedOrg.customDomainVerified,
      },
    };
  }

  async verifyCustomDomain(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org || !org.customDomain) {
      throw new BadRequestException('No custom domain configured to verify.');
    }

    const domain = org.customDomain;
    let isVerified = false;

    try {
      // Check CNAME record
      const records = await resolveCnameAsync(domain);
      isVerified = records.some(
        (r) => normalizeTenantHost(r) === PLATFORM_HOST,
      );
    } catch {
      isVerified = false;
    }

    if (isVerified) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          customDomainVerified: true,
          customDomainSslStatus: 'PENDING',
        },
      });

      return {
        success: true,
        domain,
        verified: true,
        sslStatus: 'PENDING',
        message: `Custom domain ${domain} DNS verified. HTTPS certificate setup is still required.`,
      };
    } else {
      return {
        success: false,
        domain,
        verified: false,
        sslStatus: 'PENDING',
        message: `DNS CNAME record for ${domain} was not found pointing to ${PLATFORM_HOST}. Please allow a few minutes for DNS propagation.`,
      };
    }
  }

  async resolveDomain(host: string) {
    const cleanHost = normalizeTenantHost(host);
    if (!cleanHost || isPlatformHost(cleanHost)) return { found: false };

    // 1. Check custom domain
    const select = {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      brandingPrimaryColor: true,
      brandingSecondaryColor: true,
      status: true,
      showLogoInLogin: true,
      workspaceSettingsJson: true,
    } as const;
    let org = await this.prisma.organization.findFirst({
      where: { customDomain: cleanHost, customDomainVerified: true },
      select,
    });
    const slug = tenantSlugFromHost(cleanHost);
    if (!org && slug) {
      org = await this.prisma.organization.findUnique({
        where: { slug },
        select,
      });
    }
    if (!org) {
      return { found: false };
    }

    const orgSettings = (org.workspaceSettingsJson as any) || {};

    return {
      found: true,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logoUrl: org.logoUrl,
        brandingPrimaryColor: org.brandingPrimaryColor,
        brandingSecondaryColor: org.brandingSecondaryColor,
        status: org.status,
        showLogoInLogin: org.showLogoInLogin,
        loginCms: orgSettings.loginCms || null,
      },
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
            customDomain: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      organizationId: m.organizationId,
      name: m.organization.name,
      slug: m.organization.slug,
      customDomain: m.organization.customDomain,
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
      customDomain: org.customDomain,
      customDomainVerified: org.customDomainVerified,
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

  async inviteMember(
    orgId: string,
    currentUserId: string,
    dto: InviteMemberDto,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true, isActive: true },
    });
    if (!actor?.isActive)
      throw new ForbiddenException('Active administrator required');
    if (actor.role !== 'SUPER_ADMIN') {
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: currentUserId,
          },
        },
        select: { isActive: true, isOwner: true, role: true },
      });
      if (
        !membership?.isActive ||
        (!membership.isOwner && membership.role !== 'ADMIN')
      ) {
        throw new ForbiddenException(
          'Only workspace administrators can invite members',
        );
      }
    }
    if (
      typeof dto.email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email.trim())
    ) {
      throw new BadRequestException('A valid email address is required');
    }
    const targetRole = dto.role ?? 'SALES_AGENT';
    if (
      !Object.values(Role).includes(targetRole) ||
      targetRole === 'SUPER_ADMIN'
    ) {
      throw new BadRequestException('Invalid workspace role');
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

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
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      const existingMembership =
        await this.prisma.organizationMember.findUnique({
          where: {
            organizationId_userId: {
              organizationId: orgId,
              userId: user.id,
            },
          },
        });

      if (existingMembership) {
        throw new ConflictException(
          'This user is already a member of this organization.',
        );
      }

      // A tenant must not acquire access to a global account's HR profile just
      // by knowing its email. Re-enable only with verified acceptance and
      // membership-owned HR/permission records.
      throw new ConflictException(
        'Existing accounts cannot be added directly. Verified invitation acceptance is required.',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
        pricePerSeatMonth: org.pricePerSeatMonth,
        customDomain: org.customDomain,
        activeMembers: org._count.memberships,
        leadsCount: org._count.leads,
        projectsCount: org._count.projects,
        createdAt: org.createdAt,
      })),
    };
  }

  async updateTenantStatus(orgId: string, status: OrganizationStatus) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    const updated = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        status,
        // Status edits must not silently renew an existing trial.
        ...(status === 'TRIAL' && !org.trialEndsAt
          ? {
              trialEndsAt: new Date(
                (org.status === 'TRIAL'
                  ? org.createdAt.getTime()
                  : Date.now()) +
                  DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000,
              ),
            }
          : {}),
      },
    });
    return {
      success: true,
      message: `Tenant status updated to ${status}`,
      organization: updated,
    };
  }

  private async requirePlatformAdmin(actorId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { role: true, isActive: true },
    });
    if (actor?.role !== 'SUPER_ADMIN' || !actor.isActive)
      throw new ForbiddenException('Platform SuperAdmin access required');
  }

  async sendTenantWelcomeKit(params: {
    adminEmail: string;
    adminFullName: string;
    adminPassword?: string;
    organizationName: string;
    subdomain: string;
    workspaceUrl: string;
    isTrial: boolean;
    planTier: string;
    seats: number;
    paymentLinkUrl?: string | null;
  }): Promise<boolean> {
    await this.email.sendPlatformEmail({
      to: params.adminEmail,
      ...buildTenantAdminEmail({ ...params, kind: 'welcome' }),
      entityType: 'TenantWelcomeKit',
    });
    return true;
  }

  async sendPasswordResetEmail(params: {
    adminEmail: string;
    adminFullName: string;
    newPassword: string;
    organizationName: string;
    workspaceUrl: string;
  }): Promise<boolean> {
    await this.email.sendPlatformEmail({
      to: params.adminEmail,
      ...buildTenantAdminEmail({
        ...params,
        adminPassword: params.newPassword,
        kind: 'reset',
      }),
      entityType: 'TenantAdminPasswordReset',
    });
    return true;
  }

  private async tenantAdministrator(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: orgId }, { slug: orgId }] },
    });
    if (!org) throw new NotFoundException('Tenant organization not found');
    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        role: 'ADMIN',
        user: { role: { not: 'SUPER_ADMIN' }, isActive: true },
      },
      orderBy: [{ isOwner: 'desc' }, { createdAt: 'asc' }],
      select: {
        user: {
          select: { id: true, email: true, fullName: true, passwordHash: true },
        },
      },
    });
    if (!membership)
      throw new NotFoundException(
        'No active administrator account found for this tenant workspace',
      );
    return { org, admin: membership.user };
  }

  async updateTenantDetails(
    orgId: string,
    dto: UpdateTenantDto,
    actorId: string,
  ) {
    await this.requirePlatformAdmin(actorId);
    const { org, admin } = await this.tenantAdministrator(orgId);
    if (dto.name !== undefined && !dto.name.trim())
      throw new BadRequestException('Workspace name is required');
    if (dto.adminFullName !== undefined && !dto.adminFullName.trim())
      throw new BadRequestException('Administrator name is required');
    if (dto.allocatedSeats !== undefined) {
      const members = await this.prisma.organizationMember.count({
        where: { organizationId: org.id, isActive: true },
      });
      if (
        !Number.isInteger(dto.allocatedSeats) ||
        dto.allocatedSeats < Math.max(1, members)
      )
        throw new BadRequestException(
          'Allocated seats cannot be lower than active workspace membership',
        );
    }
    const data: Prisma.OrganizationUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.planTier !== undefined ? { planTier: dto.planTier } : {}),
      ...(dto.allocatedSeats !== undefined
        ? { allocatedSeats: dto.allocatedSeats }
        : {}),
      ...(dto.status !== undefined
        ? {
            status: dto.status,
            ...(dto.status === 'TRIAL' && !org.trialEndsAt
              ? {
                  trialEndsAt: new Date(
                    Date.now() + DEFAULT_TRIAL_DAYS * 86400000,
                  ),
                }
              : {}),
          }
        : {}),
    };
    if (dto.customDomain !== undefined) {
      const domain = dto.customDomain.trim().toLowerCase();
      if (
        domain &&
        (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(domain) ||
          isPlatformHost(domain))
      )
        throw new BadRequestException('Enter a valid custom hostname');
      data.customDomain = domain || null;
      if (domain !== (org.customDomain || '')) {
        data.customDomainVerified = false;
        data.customDomainSslStatus = 'PENDING';
      }
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        if (dto.adminEmail !== undefined || dto.adminFullName !== undefined)
          await tx.user.update({
            where: { id: admin.id },
            data: {
              ...(dto.adminEmail !== undefined
                ? { email: dto.adminEmail.trim().toLowerCase() }
                : {}),
              ...(dto.adminFullName !== undefined
                ? { fullName: dto.adminFullName.trim() }
                : {}),
            },
          });
        await tx.organization.update({ where: { id: org.id }, data });
        await tx.auditLog.create({
          data: {
            actorUserId: actorId,
            organizationId: org.id,
            action: 'TENANT_PROFILE_UPDATED',
            entityType: 'ORGANIZATION',
            entityId: org.id,
            metadata: { fields: Object.keys(dto) },
          },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'This email or custom domain is already in use',
        );
      throw error;
    }
    return {
      success: true,
      message: 'Tenant workspace profile updated successfully',
    };
  }

  async resetTenantAdminPassword(
    orgId: string,
    newPassword: string | undefined,
    notifyEmail: boolean,
    actorId: string,
  ) {
    await this.requirePlatformAdmin(actorId);
    const { org, admin } = await this.tenantAdministrator(orgId);
    if (
      newPassword !== undefined &&
      (newPassword.length < 8 ||
        newPassword.length > 128 ||
        /^(?:\$argon2|enc:)/.test(newPassword))
    )
      throw new BadRequestException(
        'Enter a new password between 8 and 128 characters',
      );
    const nextPassword =
      newPassword ?? crypto.randomBytes(18).toString('base64url');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: admin.id },
        data: {
          passwordHash: encryptPassword(nextPassword),
          lastPasswordChange: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserId: actorId,
          organizationId: org.id,
          action: 'TENANT_ADMIN_PASSWORD_RESET',
          entityType: 'USER',
          entityId: admin.id,
        },
      });
    });
    let emailSent = false;
    if (notifyEmail) {
      try {
        emailSent = await this.sendPasswordResetEmail({
          adminEmail: admin.email,
          adminFullName: admin.fullName || 'Administrator',
          newPassword: nextPassword,
          organizationName: org.name,
          workspaceUrl: tenantWorkspaceUrl(org.slug),
        });
      } catch {
        /* The password change succeeded; return delivery failure explicitly. */
      }
    }
    return {
      success: true,
      message: 'Tenant administrator password has been updated successfully',
      adminEmail: admin.email,
      newPassword: nextPassword,
      emailSent,
    };
  }

  async resendTenantWelcomeKit(orgId: string, actorId: string) {
    await this.requirePlatformAdmin(actorId);
    const { org, admin } = await this.tenantAdministrator(orgId);
    const password = passwordForDisplay(admin.passwordHash);
    const emailSent = await this.sendTenantWelcomeKit({
      adminEmail: admin.email,
      adminFullName: admin.fullName || 'Administrator',
      adminPassword: password || undefined,
      organizationName: org.name,
      subdomain: org.slug,
      workspaceUrl: tenantWorkspaceUrl(org.slug),
      isTrial: org.status === 'TRIAL',
      planTier: org.planTier,
      seats: org.allocatedSeats,
    });
    return {
      emailSent,
      adminEmail: admin.email,
      credentialsIncluded: Boolean(password),
    };
  }

  async retryTenantSetupCheckout(orgId: string, actorId: string) {
    await this.requirePlatformAdmin(actorId);
    const { org } = await this.tenantAdministrator(orgId);
    if (org.setupFeePaid)
      throw new BadRequestException(
        'Workspace setup payment has already been completed',
      );
    return this.billingService.createSetupCheckout(org.id, {
      initialSeats: org.allocatedSeats,
    });
  }

  async getTenantDetails(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: orgId }, { slug: orgId }],
      },
      include: {
        memberships: {
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
        billingTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            leads: true,
            projects: true,
            teams: true,
            attendanceRecords: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Tenant organization not found');
    }

    return org;
  }

  private getPlansFilePath(): string {
    const dir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'commercial_plans.json');
  }

  async getCommercialPlans(): Promise<any[]> {
    const filePath = this.getPlansFilePath();
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch {
        /* fallback to defaults */
      }
    }

    const defaultPlans = [
      {
        id: 'starter',
        name: 'Starter Plan',
        code: 'STARTER',
        status: 'Active',
        badge: 'Emerging Brokerages',
        color: '#F43F5E',
        description:
          'Ideal for independent brokers and emerging realty agencies.',
        pricing: {
          model: 'Per User',
          monthlyPricePerSeat: 499,
          annualPricePerSeat: 399,
          setupFee: 4999,
          currency: 'INR',
          allowMonthlyBilling: true,
          allowAnnualBilling: true,
        },
        limits: {
          minimumSeats: 1,
          defaultSeatLimit: 5,
          storageGb: 10,
          leadLimit: 5000,
          projectLimit: 10,
        },
        features: [
          'Full Real Estate CRM & Pipeline',
          'Lead Capture & Auto-Assignment',
          'Site Visit Tracking & GPS Check-ins',
          'MagicBricks & 99Acres Integrations',
          'WhatsApp & Email Notifications',
          'Standard Calling Performance Reports',
        ],
        commercialRules: {
          trialEnabled: true,
          trialDurationDays: 14,
        },
      },
      {
        id: 'growth',
        name: 'Growth Automation',
        code: 'GROWTH',
        status: 'Active',
        badge: 'Most Popular',
        color: '#10B981',
        description:
          'Designed for scaling real estate sales teams and dynamic brokerages.',
        pricing: {
          model: 'Per User',
          monthlyPricePerSeat: 899,
          annualPricePerSeat: 749,
          setupFee: 9999,
          currency: 'INR',
          allowMonthlyBilling: true,
          allowAnnualBilling: true,
        },
        limits: {
          minimumSeats: 5,
          defaultSeatLimit: 15,
          storageGb: 50,
          leadLimit: 50000,
          projectLimit: 50,
        },
        features: [
          'Everything in Starter',
          'Live Executive GPS Field Force Tracking',
          'Multi-Channel Lead Portal Automation',
          'Brokerage & Commission Incentive Engine',
          'HR, Attendance & Shifts Management',
          'Custom Roles & Granular Field Access Control',
          'Priority WhatsApp & Call Support',
        ],
        commercialRules: {
          trialEnabled: true,
          trialDurationDays: 14,
        },
      },
      {
        id: 'enterprise',
        name: 'Enterprise Commercial Suite',
        code: 'ENTERPRISE',
        status: 'Active',
        badge: 'Enterprise Grade',
        color: '#2563EB',
        description:
          'For premier real estate developers, builders, and large enterprise brokerages.',
        pricing: {
          model: 'Custom Contract',
          monthlyPricePerSeat: 1499,
          annualPricePerSeat: 1199,
          setupFee: 19999,
          currency: 'INR',
          allowMonthlyBilling: true,
          allowAnnualBilling: true,
        },
        limits: {
          minimumSeats: 25,
          defaultSeatLimit: 50,
          storageGb: 500,
          leadLimit: 500000,
          projectLimit: 500,
        },
        features: [
          'Everything in Growth',
          'Custom Domain & Complete White-Labeling',
          'Dedicated Database Instance & SLA Guarantee',
          'Custom API & Webhook Integrations',
          'Payroll & Advanced Incentive Calculator',
          'Custom Login Page Visual CMS Customizer',
          'Dedicated Key Account Manager & 24/7 Phone SLA',
        ],
        commercialRules: {
          trialEnabled: false,
          trialDurationDays: 0,
        },
      },
    ];

    fs.writeFileSync(filePath, JSON.stringify(defaultPlans, null, 2), 'utf-8');
    return defaultPlans;
  }

  async saveCommercialPlans(plans: any[]): Promise<void> {
    const filePath = this.getPlansFilePath();
    fs.writeFileSync(filePath, JSON.stringify(plans, null, 2), 'utf-8');
  }

  async createCommercialPlan(dto: any) {
    const plans = await this.getCommercialPlans();
    const cleanCode = (dto.code || dto.name || 'CUSTOM')
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');
    const id = cleanCode.toLowerCase().replace(/_/g, '-');

    const newPlan = {
      id: `${id}-${Date.now().toString().slice(-4)}`,
      name: dto.name || 'Custom Commercial Plan',
      code: cleanCode,
      status: dto.status || 'Active',
      badge: dto.badge || 'Custom Tier',
      color: dto.color || '#8B5CF6',
      description:
        dto.description ||
        'Custom tailored subscription plan for real estate business.',
      pricing: {
        model: dto.pricing?.model || 'Per User',
        monthlyPricePerSeat: Number(dto.pricing?.monthlyPricePerSeat) || 999,
        annualPricePerSeat: Number(dto.pricing?.annualPricePerSeat) || 799,
        setupFee: Number(dto.pricing?.setupFee) || 0,
        currency: dto.pricing?.currency || 'INR',
        allowMonthlyBilling: dto.pricing?.allowMonthlyBilling ?? true,
        allowAnnualBilling: dto.pricing?.allowAnnualBilling ?? true,
      },
      limits: {
        minimumSeats: Number(dto.limits?.minimumSeats) || 1,
        defaultSeatLimit: Number(dto.limits?.defaultSeatLimit) || 10,
        storageGb: Number(dto.limits?.storageGb) || 25,
        leadLimit: Number(dto.limits?.leadLimit) || 10000,
        projectLimit: Number(dto.limits?.projectLimit) || 20,
      },
      features:
        Array.isArray(dto.features) && dto.features.length > 0
          ? dto.features
          : [
              'Full Real Estate CRM & Pipelines',
              'Lead Capture & Auto-Assignment',
              'Site Visit GPS Check-ins',
              'WhatsApp & Email Notifications',
            ],
      commercialRules: {
        trialEnabled: dto.commercialRules?.trialEnabled ?? true,
        trialDurationDays: Number(dto.commercialRules?.trialDurationDays) || 14,
      },
    };

    plans.push(newPlan);
    await this.saveCommercialPlans(plans);
    return newPlan;
  }

  async updateCommercialPlan(planId: string, dto: any) {
    const plans = await this.getCommercialPlans();
    const index = plans.findIndex((p) => p.id === planId || p.code === planId);
    if (index === -1) {
      throw new NotFoundException(
        `Commercial plan with id '${planId}' not found.`,
      );
    }

    const current = plans[index];
    plans[index] = {
      ...current,
      ...dto,
      pricing: {
        ...current.pricing,
        ...(dto.pricing || {}),
      },
      limits: {
        ...current.limits,
        ...(dto.limits || {}),
      },
      commercialRules: {
        ...current.commercialRules,
        ...(dto.commercialRules || {}),
      },
    };

    await this.saveCommercialPlans(plans);
    return plans[index];
  }

  async duplicateCommercialPlan(planId: string) {
    const plans = await this.getCommercialPlans();
    const source = plans.find((p) => p.id === planId || p.code === planId);
    if (!source) {
      throw new NotFoundException(
        `Commercial plan with id '${planId}' not found.`,
      );
    }

    const duplicatedPlan = {
      ...source,
      id: `${source.id}-copy-${Date.now().toString().slice(-4)}`,
      name: `${source.name} (Copy)`,
      code: `${source.code}_COPY`,
      status: 'Draft',
      badge: 'Draft Clone',
    };

    plans.push(duplicatedPlan);
    await this.saveCommercialPlans(plans);
    return duplicatedPlan;
  }

  async archiveCommercialPlan(planId: string) {
    const plans = await this.getCommercialPlans();
    const index = plans.findIndex((p) => p.id === planId || p.code === planId);
    if (index === -1) {
      throw new NotFoundException(
        `Commercial plan with id '${planId}' not found.`,
      );
    }

    plans[index].status = 'Archived';
    await this.saveCommercialPlans(plans);
    return {
      success: true,
      message: `Plan '${plans[index].name}' has been archived.`,
    };
  }

  async getPlatformAuditLogs() {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        actorUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      targetType: log.entityType,
      targetId: log.entityId,
      metadata: log.metadata,
      ip: log.ip,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
      user: log.actorUser,
      organization: log.organization,
    }));
  }
}
