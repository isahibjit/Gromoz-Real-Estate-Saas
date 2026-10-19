import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { EmailConnectorsService } from '../crm/email-connectors.service';
import { OrganizationService } from './organization.service';

describe('Organization invitations tenant isolation', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    organizationMember: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    organizationInvitation: { create: jest.fn() },
  };
  let service: OrganizationService;
  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      role: 'ADMIN',
      isActive: true,
    });
    prisma.organizationMember.findUnique.mockResolvedValue({
      isActive: true,
      isOwner: true,
      role: 'ADMIN',
    });
    prisma.organization.findUnique.mockResolvedValue({ allocatedSeats: 10 });
    prisma.organizationMember.count.mockResolvedValue(1);
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

  it('rejects a tenant member without administrator privileges', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue({
      isActive: true,
      isOwner: false,
      role: 'SALES_AGENT',
    });
    await expect(
      service.inviteMember('tenant-a', 'actor', { email: 'new@example.test' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it('rejects administrators from another tenant', async () => {
    prisma.organizationMember.findUnique.mockResolvedValue(null);
    await expect(
      service.inviteMember('tenant-b', 'actor', { email: 'new@example.test' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cannot assign platform super-admin via a tenant invitation', async () => {
    await expect(
      service.inviteMember('tenant-a', 'actor', {
        email: 'new@example.test',
        role: 'SUPER_ADMIN',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.organizationInvitation.create).not.toHaveBeenCalled();
  });

  it('never attaches an existing global identity based only on its email', async () => {
    prisma.organizationMember.findUnique
      .mockResolvedValueOnce({ isActive: true, isOwner: true, role: 'ADMIN' })
      .mockResolvedValueOnce(null);
    await expect(
      service.inviteMember('tenant-a', 'actor', {
        email: 'existing@example.test',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.organizationMember.create).not.toHaveBeenCalled();
  });
});
