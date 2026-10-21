import { BillingController } from '../../billing/billing.controller';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../persistence/prisma/prisma.service';
import { TenantContextPayload } from './tenant-context.service';
import { TenantGuard } from './tenant.guard';

describe('TenantGuard', () => {
  const organization = {
    id: 'tenant-a',
    slug: 'tenant-a',
    name: 'Tenant A',
    status: 'ACTIVE',
    setupFeePaid: true,
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    organizationMember: { findMany: jest.fn() },
  };
  let guard: TenantGuard;
  let request: {
    headers: Record<string, string | string[]>;
    user?: { sub: string; role: string };
    tenant?: TenantContextPayload;
  };
  const activate = () => guard.canActivate(new ExecutionContextHost([request]));

  beforeEach(async () => {
    jest.resetAllMocks();
    request = {
      headers: { 'x-organization-id': 'tenant-a' },
      user: { sub: 'user-1', role: 'SUPER_ADMIN' },
    };
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    prisma.organization.findUnique.mockResolvedValue(organization);
    prisma.organizationMember.findMany.mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [TenantGuard, { provide: PrismaService, useValue: prisma }],
    }).compile();
    guard = module.get(TenantGuard);
  });

  it('requires authentication', async () => {
    delete request.user;
    await expect(activate()).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('binds a platform spectator to the explicitly selected tenant without making them its owner', async () => {
    await expect(activate()).resolves.toBe(true);
    expect(request.tenant).toMatchObject({
      organizationId: 'tenant-a',
      userId: 'user-1',
      isOwner: false,
    });
  });

  it('does not give a platform admin an unscoped workspace', async () => {
    request.headers = {};
    await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not trust stale platform privileges in a JWT', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'ADMIN',
      isActive: true,
    });
    await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', isActive: true, organizationId: 'tenant-a' },
      }),
    );
  });

  it('rejects an inactive account even with a valid platform JWT', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'SUPER_ADMIN',
      isActive: false,
    });
    await expect(activate()).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    { 'x-organization-id': 'tenant-a', 'x-tenant-id': 'tenant-b' },
    { 'x-organization-id': ['tenant-a', 'tenant-b'] },
    { 'x-organization-id': ' ' },
  ])('rejects ambiguous tenant headers: %j', async (headers) => {
    request.headers = headers;
    await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not silently fall back after an unknown slug', async () => {
    request.headers = { 'x-tenant-slug': 'missing' };
    prisma.organization.findUnique.mockResolvedValue(null);
    await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizationMember.findMany).not.toHaveBeenCalled();
  });

  it('uses the selected membership role, not the global user role', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'ADMIN',
      isActive: true,
    });
    prisma.organizationMember.findMany.mockResolvedValue([
      {
        organizationId: 'tenant-a',
        organization,
        role: 'SALES_AGENT',
        isOwner: false,
      },
    ]);
    await expect(activate()).resolves.toBe(true);
    expect(request.user?.role).toBe('SALES_AGENT');
  });

  it('requires a choice when an ordinary user has several memberships', async () => {
    request.headers = {};
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'ADMIN',
      isActive: true,
    });
    prisma.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a', organization },
      { organizationId: 'tenant-b', organization },
    ]);
    await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('never promotes a tenant member to platform super admin', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      role: 'ADMIN',
      isActive: true,
    });
    prisma.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a', organization, role: 'SUPER_ADMIN' },
    ]);
    await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('lets an expired trial admin open billing while retaining CRM restrictions', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'owner', role: 'ADMIN', isActive: true });
    request.user = { sub: 'owner', role: 'ADMIN' };
    prisma.organizationMember.findMany.mockResolvedValue([{ organizationId: 'tenant-a', role: 'ADMIN', isOwner: true, organization: { ...organization, status: 'TRIAL', setupFeePaid: false, trialEndsAt: new Date('2000-01-01') } }]);
    await expect(activate()).rejects.toBeInstanceOf(ForbiddenException);
    const billingContext = new ExecutionContextHost([request], BillingController, BillingController.prototype.getOverview);
    await expect(guard.canActivate(billingContext)).resolves.toBe(true);
  });

});
