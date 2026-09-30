import { Test } from '@nestjs/testing';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Tenant-owned realtime lead recipients', () => {
  const prisma = {
    lead: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    team: { findMany: jest.fn() },
    employeeProfile: { findMany: jest.fn() },
  };
  const access = { hasPermission: jest.fn() };
  let service: LeadVisibilityService;

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        LeadVisibilityService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccessService, useValue: access },
      ],
    }).compile();
    service = module.get(LeadVisibilityService);
    access.hasPermission.mockResolvedValue(true);
    prisma.team.findMany.mockResolvedValue([]);
    prisma.employeeProfile.findMany.mockResolvedValue([]);
  });

  it('does not broadcast legacy unowned leads', async () => {
    prisma.lead.findFirst.mockResolvedValue({ organizationId: null });
    await expect(service.recipientIdsForLead('legacy-lead')).resolves.toEqual(
      [],
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('constrains both recipient queries and hierarchy teams to the lead tenant', async () => {
    prisma.lead.findFirst.mockResolvedValue({
      organizationId: 'tenant-a',
      ownerId: 'user-a',
    });
    prisma.user.findMany
      .mockResolvedValueOnce([{ id: 'admin-a' }])
      .mockResolvedValueOnce([
        { id: 'user-a', organizationMemberships: [{ role: 'TELECALLER' }] },
      ]);
    await expect(service.recipientIdsForLead('lead-a')).resolves.toEqual([
      'user-a',
    ]);
    for (const [query] of prisma.user.findMany.mock.calls) {
      expect(query.where.AND).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: { not: 'SUPER_ADMIN' },
            organizationMemberships: {
              some: { organizationId: 'tenant-a', isActive: true },
              none: { organizationId: { not: 'tenant-a' } },
            },
          }),
        ]),
      );
    }
    expect(prisma.team.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'tenant-a' }),
      }),
    );
    expect(access.hasPermission).toHaveBeenCalledWith(
      { sub: 'user-a', role: 'TELECALLER' },
      'leads',
      'view',
    );
  });
});
