import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import {
  TenantSlugSchema,
  tenantSlugFromHost,
  workspaceIsAccessible,
} from '@truroot/shared';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { EmailConnectorsService } from '../crm/email-connectors.service';

describe('Workspace subdomain boundaries', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findFirst: jest.fn(), findUnique: jest.fn() },
  };
  let service: OrganizationService;
  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillingService, useValue: {} },
        { provide: EmailConnectorsService, useValue: {} },
      ],
    }).compile();
    service = module.get(OrganizationService);
  });

  it.each([
    'crm',
    'www',
    'api',
    'admin',
    '-company',
    'company-',
    'company.other',
    'a'.repeat(64),
  ])('rejects invalid or reserved slug %s', (slug) => {
    expect(TenantSlugSchema.safeParse(slug).success).toBe(false);
  });
  it('accepts a normalized workspace slug and only our exact domain suffix', () => {
    expect(TenantSlugSchema.parse('  Prestige-Heights ')).toBe(
      'prestige-heights',
    );
    expect(tenantSlugFromHost('PRESTIGE.gromoze.com:443')).toBe('prestige');
    expect(tenantSlugFromHost('prestige.example.com')).toBeNull();
    expect(tenantSlugFromHost('prestige.gromoze.com.attacker.com')).toBeNull();
    expect(tenantSlugFromHost('nested.prestige.gromoze.com')).toBeNull();
  });
  it('never resolves the platform hostname as a workspace', async () => {
    await expect(service.resolveDomain('crm.gromoze.com')).resolves.toEqual({
      found: false,
    });
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.organization.findFirst).not.toHaveBeenCalled();
  });
  it('cannot resolve an unverified foreign custom domain via its first label', async () => {
    prisma.organization.findFirst.mockResolvedValue(null);
    await expect(
      service.resolveDomain('prestige.attacker.com'),
    ).resolves.toEqual({ found: false });
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    expect(prisma.organization.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customDomain: 'prestige.attacker.com',
          customDomainVerified: true,
        },
      }),
    );
  });
  it('resolves a registered gromoze subdomain', async () => {
    prisma.organization.findFirst.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue({
      id: 'tenant-a',
      slug: 'prestige',
      name: 'Prestige',
      workspaceSettingsJson: {},
    });
    await expect(
      service.resolveDomain('prestige.gromoze.com'),
    ).resolves.toMatchObject({ found: true, organization: { id: 'tenant-a' } });
    expect(prisma.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'prestige' } }),
    );
  });
  it('returns not found for an unregistered wildcard subdomain', async () => {
    prisma.organization.findFirst.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue(null);
    await expect(service.resolveDomain('xyz.gromoze.com')).resolves.toEqual({
      found: false,
    });
    expect(prisma.organization.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { slug: 'xyz' } }),
    );
  });
  it('preserves an existing verified custom domain without a slug fallback', async () => {
    prisma.organization.findFirst.mockResolvedValue({
      id: 'tenant-a',
      slug: 'prestige',
      name: 'Prestige',
      status: 'ACTIVE',
      workspaceSettingsJson: {},
    });
    await expect(
      service.resolveDomain('crm.prestige.example'),
    ).resolves.toMatchObject({
      found: true,
      organization: { name: 'Prestige', slug: 'prestige' },
    });
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });
  it('does not let an ordinary or deactivated account provision a trial', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true });
    await expect(
      service.provisionOrganization({}, 'actor'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user.findUnique.mockResolvedValue({
      role: 'SUPER_ADMIN',
      isActive: false,
    });
    await expect(
      service.provisionOrganization({}, 'actor'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates the requested trial and owner atomically without requesting payment first', async () => {
    const transaction = {
      user: {
        create: jest
          .fn()
          .mockResolvedValue({
            id: 'owner',
            email: 'owner@example.test',
            fullName: 'Owner',
          }),
      },
      organization: {
        create: jest
          .fn()
          .mockImplementation(async ({ data }: { data: { slug: string } }) => ({
            id: 'tenant-a',
            ...data,
          })),
      },
      organizationMember: {
        create: jest.fn().mockResolvedValue({ id: 'membership' }),
      },
    };
    prisma.user.findUnique
      .mockResolvedValueOnce({ role: 'SUPER_ADMIN', isActive: true })
      .mockResolvedValueOnce(null);
    const database = {
      ...prisma,
      $transaction: jest.fn(
        async (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    const billing = { createSetupCheckout: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: database },
        { provide: BillingService, useValue: billing },
        {
          provide: EmailConnectorsService,
          useValue: {
            sendPlatformEmail: jest.fn().mockResolvedValue({ success: true }),
          },
        },
      ],
    }).compile();
    const before = Date.now();
    const result = await module
      .get(OrganizationService)
      .provisionOrganization(
        {
          isTrial: true,
          organizationName: 'Prestige',
          subdomain: 'prestige',
          email: 'owner@example.test',
          password: 'UniqueTestPassword123',
        },
        'platform',
      );
    expect(result.organization).toMatchObject({
      status: 'TRIAL',
      workspaceUrl: 'https://prestige.gromoze.com',
    });
    expect(result.organization.trialEndsAt?.getTime()).toBeGreaterThanOrEqual(
      before + 14 * 86400000,
    );
    expect(transaction.organizationMember.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner',
        organizationId: 'tenant-a',
        isOwner: true,
        role: 'ADMIN',
      }),
    });
    expect(billing.createSetupCheckout).not.toHaveBeenCalled();
    expect(result.checkoutOrder).toBeNull();
  });
  it('allows a current trial but denies expired, undated, suspended and unpaid active workspaces', () => {
    expect(
      workspaceIsAccessible({
        status: 'TRIAL',
        setupFeePaid: false,
        trialEndsAt: new Date(Date.now() + 60000),
      }),
    ).toBe(true);
    for (const status of ['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']) {
      expect(
        workspaceIsAccessible({
          status,
          setupFeePaid: false,
          trialEndsAt: new Date(Date.now() - 1),
        }),
      ).toBe(false);
    }
    expect(
      workspaceIsAccessible({ status: 'TRIAL', setupFeePaid: false }),
    ).toBe(false);
    expect(
      workspaceIsAccessible({ status: 'ACTIVE', setupFeePaid: true }),
    ).toBe(true);
  });
});
