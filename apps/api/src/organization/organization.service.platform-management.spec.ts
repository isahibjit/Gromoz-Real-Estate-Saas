import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { BillingService } from '../billing/billing.service';
import { passwordForDisplay } from '../common/utils/cipher.util';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { OrganizationService } from './organization.service';

describe('OrganizationService platform tenant management', () => {
  const admin = {
    id: 'tenant-admin',
    email: 'admin@cedar.example',
    fullName: 'Cedar Admin',
    passwordHash: '$argon2id$legacy-hash',
  };
  const organization = {
    id: 'tenant-cedar',
    name: 'Cedar Realty',
    slug: 'cedar',
    status: 'TRIAL',
    planTier: 'STARTER',
    allocatedSeats: 5,
    setupFeePaid: false,
    trialEndsAt: new Date('2026-11-01T00:00:00Z'),
  };
  const transaction = {
    user: { update: jest.fn() },
    organization: { update: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findFirst: jest.fn() },
    organizationMember: { findFirst: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  const email = { sendPlatformEmail: jest.fn() };
  let service: OrganizationService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    prisma.organization.findFirst.mockResolvedValue(organization);
    prisma.organizationMember.findFirst.mockResolvedValue({ user: admin });
    prisma.organizationMember.count.mockResolvedValue(1);
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
    email.sendPlatformEmail.mockResolvedValue({ success: true });

    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: BillingService,
          useValue: { createSetupCheckout: jest.fn() },
        },
        { provide: EmailConnectorsService, useValue: email },
      ],
    }).compile();
    service = module.get(OrganizationService);
  });

  it('limits password reset to an active platform super administrator', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true });

    await expect(
      service.resetTenantAdminPassword(
        organization.id,
        'TenantPassword123',
        true,
        'ordinary-admin',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.user.update).not.toHaveBeenCalled();
  });

  it('updates a tenant credential without persisting plaintext', async () => {
    const result = await service.resetTenantAdminPassword(
      organization.id,
      'TenantPassword123',
      true,
      'platform-admin',
    );

    expect(result).toEqual({
      success: true,
      message: 'Tenant administrator password has been updated successfully',
      adminEmail: admin.email,
      newPassword: 'TenantPassword123',
      emailSent: true,
    });
    const passwordHash = transaction.user.update.mock.calls[0][0].data
      .passwordHash as string;
    expect(passwordHash).not.toBe('TenantPassword123');
    expect(passwordForDisplay(passwordHash)).toBe('TenantPassword123');
    expect(email.sendPlatformEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: admin.email,
        entityType: 'TenantAdminPasswordReset',
      }),
    );
  });

  it('resends a legacy welcome kit without exposing a hash as a password', async () => {
    const result = await service.resendTenantWelcomeKit(
      organization.id,
      'platform-admin',
    );

    expect(result.credentialsIncluded).toBe(false);
    expect(email.sendPlatformEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Use your existing password'),
      }),
    );
    expect(email.sendPlatformEmail.mock.calls[0][0].text).not.toContain(
      admin.passwordHash,
    );
  });
});
