import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { HousingIntegrationsService } from './housing-integrations.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';

describe('Portal connection tenant isolation', () => {
  const prisma = {
    user: { findUnique: jest.fn(), count: jest.fn() },
    organization: { findUnique: jest.fn() },
    project: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    lead: { findUnique: jest.fn() },
    autoAssignmentRule: { findFirst: jest.fn(), findUnique: jest.fn() },
    autoAssignmentEvent: { update: jest.fn() },
    $transaction: jest.fn(),
    organizationMember: { findMany: jest.fn() },
    portalIntegration: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    housingIntegration: { upsert: jest.fn() },
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
  };
  let service: CrmService;
  let housing: HousingIntegrationsService;

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true });
    prisma.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a' },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        HousingIntegrationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
        {
          provide: TenantAccessService,
          useValue: {
            organizationId: 'tenant-a',
            assertEmployee: jest.fn(),
            employeeWhere: jest.fn(() => ({})),
          },
        },
        {
          provide: TenantContextService,
          useValue: { getTenantId: () => 'tenant-a' },
        },
        {
          provide: TenantNotificationService,
          useValue: { isChannelEnabled: jest.fn().mockResolvedValue(false) },
        },
        {
          provide: WhatsAppDispatchService,
          useValue: { enqueueWithClient: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(CrmService);
    housing = module.get(HousingIntegrationsService);
  });

  it('does not fall back to legacy or foreign credentials when this tenant has no connection', async () => {
    prisma.portalIntegration.findFirst.mockResolvedValue(null);
    prisma.portalIntegration.create.mockRejectedValue(
      new Error('stop before creating'),
    );
    // Test the real scoped read independently of provisioning or external providers.
    const lookup = service as unknown as {
      portalIntegrationFindByProvider(
        provider: string,
        organizationId: string,
      ): Promise<unknown>;
    };
    await expect(
      lookup.portalIntegrationFindByProvider('magicbricks', 'tenant-a'),
    ).resolves.toBeNull();
    expect(prisma.portalIntegration.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.portalIntegration.findFirst).toHaveBeenCalledWith({
      where: { provider: 'magicbricks', organizationId: 'tenant-a' },
    });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('resolves identical providers independently for two tenants', async () => {
    prisma.portalIntegration.findFirst.mockImplementation(
      async ({ where }: { where: { organizationId: string } }) => ({
        organizationId: where.organizationId,
      }),
    );
    const lookup = service as unknown as {
      portalIntegrationFindByProvider(
        provider: string,
        organizationId: string,
      ): Promise<unknown>;
    };
    await expect(
      lookup.portalIntegrationFindByProvider('magicbricks', 'tenant-a'),
    ).resolves.toEqual({ organizationId: 'tenant-a' });
    await expect(
      lookup.portalIntegrationFindByProvider('magicbricks', 'tenant-b'),
    ).resolves.toEqual({ organizationId: 'tenant-b' });
  });

  it('rejects forged organization IDs supplied by an ordinary user', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([]);
    await expect(
      service.resolveTenantOrganizationId('user-a', 'tenant-b'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a', isActive: true, organizationId: 'tenant-b' },
      }),
    );
  });

  it('does not choose an arbitrary membership when the tenant is unspecified', async () => {
    prisma.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a' },
      { organizationId: 'tenant-b' },
    ]);
    await expect(
      service.resolveTenantOrganizationId('user-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a current platform super admin to explicitly choose a real tenant', async () => {
    prisma.user.findUnique.mockResolvedValue({
      role: 'SUPER_ADMIN',
      isActive: true,
    });
    prisma.organization.findUnique.mockResolvedValue({ id: 'tenant-b' });
    await expect(
      service.resolveTenantOrganizationId('platform-admin', 'tenant-b'),
    ).resolves.toBe('tenant-b');
  });

  it('creates a separate Housing connection without adopting an unowned connection', async () => {
    prisma.housingIntegration.upsert.mockResolvedValue({
      organizationId: 'tenant-a',
    });
    await housing.ensureHousingIntegration('user-a', 'tenant-a');
    expect(prisma.housingIntegration.upsert).toHaveBeenCalledWith({
      where: { organizationId: 'tenant-a' },
      update: {},
      create: expect.objectContaining({
        organizationId: 'tenant-a',
        createdById: 'user-a',
        webhookKeyId: expect.any(String),
      }),
    });
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it.each(['ownerId', 'managerId', 'telecallerId', 'fieldExecutiveId'])(
    'rejects foreign %s when creating a tenant lead',
    async (key) => {
      prisma.user.count.mockResolvedValue(0);
      await expect(
        service.createLead({
          name: 'Test',
          mobile: '9876543210',
          organizationId: 'tenant-a',
          [key]: 'user-b',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationMemberships: {
              some: { organizationId: 'tenant-a', isActive: true },
              none: { organizationId: { not: 'tenant-a' } },
            },
          }),
        }),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('scopes project-name matching and rejects a foreign project before writing a lead', async () => {
    prisma.project.findFirst.mockResolvedValue(null);
    await expect(
      service.createLead({
        name: 'Test',
        mobile: '9876543210',
        organizationId: 'tenant-a',
        projectId: 'foreign-project',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    for (const [query] of prisma.project.findFirst.mock.calls) {
      expect(query.where.organizationId).toBe('tenant-a');
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not run unowned global assignment rules for tenant leads', async () => {
    const assignment = service as unknown as {
      findAutoAssignmentRuleForLead(lead: {
        organizationId: string;
      }): Promise<unknown>;
      processAutoAssignmentEvent(event: {
        id: string;
        leadId: string;
        ruleId: string;
      }): Promise<void>;
    };
    await expect(
      assignment.findAutoAssignmentRuleForLead({ organizationId: 'tenant-a' }),
    ).resolves.toBeNull();
    expect(prisma.autoAssignmentRule.findFirst).not.toHaveBeenCalled();
    prisma.lead.findUnique.mockResolvedValue({ organizationId: 'tenant-a' });
    prisma.autoAssignmentRule.findUnique.mockResolvedValue({ isEnabled: true });
    await assignment.processAutoAssignmentEvent({
      id: 'event-a',
      leadId: 'lead-a',
      ruleId: 'global-rule',
    });
    expect(prisma.autoAssignmentEvent.update).toHaveBeenCalledWith({
      where: { id: 'event-a' },
      data: { status: 'STOPPED', lastCheckedAt: expect.any(Date) },
    });
  });
});
