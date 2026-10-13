import { LeadSourceConnectionsService } from "./lead-source-connections.service";
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
    lead: {
      findUnique: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    leadMasterValue: { findMany: jest.fn(), findFirst: jest.fn() },
    leadImport: { count: jest.fn() },
    autoAssignmentRule: { findFirst: jest.fn(), findUnique: jest.fn() },
    autoAssignmentEvent: { update: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
    organizationMember: { findMany: jest.fn() },
    portalIntegration: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    leadSourceConnection: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    housingIntegration: { upsert: jest.fn(), findUnique: jest.fn() },
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
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
        LeadSourceConnectionsService,
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
          useValue: { getTenantId: () => 'tenant-a', getTenant: () => ({ role: 'ADMIN', organizationId: 'tenant-a' }) },
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

  it('creates a separate Housing account without adopting an unowned account', async () => {
    prisma.leadSourceConnection.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ id: 'account-a', organizationId: 'tenant-a' });
    prisma.leadSourceConnection.create.mockResolvedValue({ id: 'account-a', organizationId: 'tenant-a' });
    await housing.ensureHousingIntegration('user-a', 'tenant-a');
    expect(prisma.leadSourceConnection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: 'tenant-a', createdById: 'user-a' }),
    });
    expect(prisma.leadSourceConnection.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'tenant-a', provider: 'housing' }),
    }));
    expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('returns read-only connector summaries scoped to the active tenant', async () => {
    prisma.leadMasterValue.findMany.mockResolvedValue([
      { id: 'source-magic', name: 'MagicBricks', code: 'magicbricks' },
      { id: 'source-website', name: 'Website', code: 'website' },
    ]);
    prisma.leadMasterValue.findFirst.mockResolvedValue(null);
    prisma.lead.groupBy.mockResolvedValue([
      { sourceId: 'source-magic', _count: { _all: 1 } },
      { sourceId: 'source-website', _count: { _all: 2 } },
    ]);
    prisma.lead.count.mockResolvedValue(3);
    prisma.leadImport.count.mockResolvedValue(2);
    prisma.portalIntegration.findMany.mockResolvedValue([
      {
        provider: 'magicbricks',
        status: 'Connected',
        isActive: false,
        lastTestStatus: 'Failed',
        lastLeadReceivedAt: new Date('2026-09-30T10:00:00.000Z'),
      },
      {
        provider: '99acres',
        status: 'Draft',
        isActive: true,
        lastTestStatus: 'Failed',
        lastLeadReceivedAt: null,
      },
      {
        provider: 'meta_lead_ads',
        status: 'Connected',
        isActive: true,
        lastTestStatus: 'Success',
        lastLeadReceivedAt: null,
      },
      {
        provider: 'website',
        status: 'Draft',
        isActive: true,
        lastTestStatus: null,
        lastLeadReceivedAt: null,
      },
    ]);
    prisma.leadSourceConnection.findMany.mockResolvedValue([
      { provider: 'magicbricks', isActive: false, status: 'Paused', lastTestStatus: null, lastLeadReceivedAt: null },
      { provider: 'housing', isActive: true, status: 'Configured', lastTestStatus: null, lastLeadReceivedAt: null },
    ]);

    const result = await service.getLeadImportStats();

    expect(prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'tenant-a', deletedAt: null },
      }),
    );
    expect(prisma.portalIntegration.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'tenant-a' }),
      }),
    );
    expect(prisma.leadSourceConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: 'tenant-a', archivedAt: null }) }),
    );
    expect(result.connectors).toEqual([
      expect.objectContaining({ id: 'magicbricks', state: 'PAUSED' }),
      expect.objectContaining({ id: '99acres', state: 'ERROR' }),
      expect.objectContaining({ id: 'housing', state: 'CONFIGURED' }),
      expect.objectContaining({ id: 'meta', state: 'ACTIVE' }),
      expect.objectContaining({
        id: 'website',
        state: 'ACTIVE',
        leadCount: 2,
      }),
    ]);
    expect(prisma.portalIntegration.create).not.toHaveBeenCalled();
    expect(prisma.housingIntegration.upsert).not.toHaveBeenCalled();
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
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    prisma.autoAssignmentEvent.findUnique.mockResolvedValue({ id: 'event-a', leadId: 'lead-a', ruleId: 'global-rule', status: 'ACTIVE', dueAt: new Date(0) });
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
