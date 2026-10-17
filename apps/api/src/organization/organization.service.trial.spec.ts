import { Test } from '@nestjs/testing';
import { OrganizationService } from './organization.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

describe('Organization trial dates', () => {
  const prisma = { organization: { findUnique: jest.fn(), update: jest.fn() } };
  let service: OrganizationService;
  const now = new Date('2026-10-17T10:00:00Z');

  beforeEach(async () => {
    jest.resetAllMocks();
    jest.useFakeTimers().setSystemTime(now);
    prisma.organization.findUnique.mockResolvedValue({
      id: 'tenant-a',
      status: 'SETUP_PENDING',
      trialEndsAt: null,
      createdAt: new Date('2026-10-01T10:00:00Z'),
    });
    prisma.organization.update.mockResolvedValue({
      id: 'tenant-a',
      status: 'TRIAL',
    });
    const module = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: prisma },
        { provide: BillingService, useValue: {} },
      ],
    }).compile();
    service = module.get(OrganizationService);
  });
  afterEach(() => jest.useRealTimers());

  it('records a 14-day end date when an administrator grants a trial', async () => {
    await service.updateTenantStatus('tenant-a', 'TRIAL');
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'tenant-a' },
      data: { status: 'TRIAL', trialEndsAt: new Date('2026-10-31T10:00:00Z') },
    });
  });

  it('preserves an existing trial deadline rather than extending it on status edits', async () => {
    prisma.organization.findUnique.mockResolvedValue({ trialEndsAt: now });
    await service.updateTenantStatus('tenant-a', 'TRIAL');
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'tenant-a' },
      data: { status: 'TRIAL' },
    });
  });

  it('backfills legacy trials from their original creation date', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      status: 'TRIAL',
      trialEndsAt: null,
      createdAt: new Date('2026-10-01T10:00:00Z'),
    });
    await service.updateTenantStatus('tenant-a', 'TRIAL');
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'tenant-a' },
      data: { status: 'TRIAL', trialEndsAt: new Date('2026-10-15T10:00:00Z') },
    });
  });

  it('does not grant a trial merely by activating a paid workspace', async () => {
    await service.updateTenantStatus('tenant-a', 'ACTIVE');
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'tenant-a' },
      data: { status: 'ACTIVE' },
    });
  });
});
