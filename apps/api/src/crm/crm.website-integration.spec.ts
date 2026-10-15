import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';

describe('Website integration pause enforcement', () => {
  let integration: {
    id: string;
    organizationId: string | null;
    provider: string;
    isActive: boolean;
    status: string;
    webhookKeyId: string;
    displayName: string;
    fieldMapping: Record<string, unknown>;
  };
  let service: CrmService;

  const db = {
    user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    organizationMember: { findMany: jest.fn() },
    portalIntegration: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    lead: { findFirst: jest.fn() },
    leadMasterValue: { findFirst: jest.fn() },
    project: { findFirst: jest.fn(), findMany: jest.fn() },
    team: { findFirst: jest.fn() },
    auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };

  const expectIntegrationUpdate = (data: Record<string, unknown>) => {
    expect(db.portalIntegration.update.mock.calls).toEqual(
      expect.arrayContaining([
        [
          {
            where: { id: integration.id },
            data: expect.objectContaining(data),
          },
        ],
      ]),
    );
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    integration = {
      id: 'website-integration',
      organizationId: 'tenant-a',
      provider: 'website',
      isActive: true,
      status: 'Configured',
      webhookKeyId: 'website-key-id',
      displayName: 'Website Leads',
      fieldMapping: {
        connectedWebsites: [],
      },
    };
    db.portalIntegration.findUnique.mockImplementation(async () => ({
      ...integration,
    }));
    db.portalIntegration.upsert.mockImplementation(async () => ({
      ...integration,
    }));
    db.user.findUnique.mockResolvedValue({ isActive: true, role: 'ADMIN' });
    db.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a' },
    ]);
    db.leadMasterValue.findFirst.mockResolvedValue({ id: 'website-source' });
    db.auditLog.findMany.mockResolvedValue([]);
    db.auditLog.count.mockResolvedValue(0);
    db.portalIntegration.update.mockImplementation(async ({ data }) => ({
      ...integration,
      ...data,
    }));
    db.lead.findFirst.mockResolvedValue(null);
    db.auditLog.create.mockResolvedValue({});
    db.user.count.mockResolvedValue(1);
    if ('upsert' in db.portalIntegration)
      db.portalIntegration.upsert.mockImplementation(async () => integration);
    db.user.findMany.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        ...referenceTenantProviders(),
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
        {
          provide: TenantAccessService,
          useValue: {
            employeeWhere: () => ({
              organizationMemberships: { some: { organizationId: 'tenant-a' } },
            }),
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
    jest
      .spyOn(service, 'createLead')
      .mockResolvedValue({ id: 'lead-1', displayId: 'TR001' });
  });

  it.each([
    { isActive: false, status: 'Paused' },
    { isActive: false, status: 'Configured' },
    { isActive: true, status: 'paused' },
  ])('rejects paused webhook state %j without lead writes', async (state) => {
    Object.assign(integration, state);

    const result = await service.receiveWebsiteLead(
      {
        name: 'Website User',
        mobile: '9876543210',
        websiteUrl: 'https://example.com',
      },
      'truroot_web_website-key-id',
    );

    expect(result).toEqual({
      success: false,
      status: 'PAUSED',
      message: 'Failure: Website Integration is paused. Lead was not created.',
    });
    expect(service.createLead).not.toHaveBeenCalled();
    expect(db.lead.findFirst).not.toHaveBeenCalled();
  });

  it('does not create a sample lead while paused test is run', async () => {
    integration.isActive = false;
    integration.status = 'Paused';

    const result = await service.testWebsiteIntegration(
      {
        samplePayload: { name: 'Test User', mobile: '9876543210' },
      },
      'user-a',
      undefined,
      undefined,
      'tenant-a',
    );

    expect(result.data.valid).toBe(false);
    expect(result.data.status).toBe('Paused');
    expect(result.data.wouldCreateLead).toBe(false);
    expect(result.data.errors).toContain('Website Integration is paused');
    expect(service.createLead).not.toHaveBeenCalled();
  });

  it('persists pause and activation from supported payload shapes', async () => {
    await service.saveWebsiteIntegration(
      { isPaused: true },
      'user-a',
      'tenant-a',
    );
    expectIntegrationUpdate({ isActive: false, status: 'Paused' });

    integration.isActive = false;
    integration.status = 'Paused';
    await service.saveWebsiteIntegration(
      { isActive: true },
      'user-a',
      'tenant-a',
    );
    expectIntegrationUpdate({ isActive: true, status: 'Configured' });
  });

  it('requires an API key before reading or creating leads', async () => {
    await expect(
      service.receiveWebsiteLead({ name: 'Test', mobile: '9876543210' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.portalIntegration.findUnique).not.toHaveBeenCalled();
    expect(db.lead.findFirst).not.toHaveBeenCalled();
    expect(service.createLead).not.toHaveBeenCalled();
  });

  it.each(['missing', 'unowned', 'wrong-provider'])(
    'rejects %s connections',
    async (state) => {
      if (state === 'missing')
        db.portalIntegration.findUnique.mockResolvedValue(null);
      if (state === 'unowned') integration.organizationId = null;
      if (state === 'wrong-provider') integration.provider = 'meta';
      await expect(
        service.receiveWebsiteLead(
          { name: 'Test', mobile: '9876543210' },
          'invalid',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(service.createLead).not.toHaveBeenCalled();
      expect(db.lead.findFirst).not.toHaveBeenCalled();
    },
  );

  it('uses the connection owner for duplicate checks and lead creation, ignoring payload ownership', async () => {
    await service.receiveWebsiteLead(
      {
        name: 'Tenant lead',
        mobile: '9876543291',
        organizationId: 'tenant-b',
      },
      'truroot_web_website-key-id',
    );
    expect(db.portalIntegration.findUnique).toHaveBeenCalledWith({
      where: { webhookKeyId: 'website-key-id' },
    });
    expect(db.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'tenant-a' }),
      }),
    );
    expect(service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'tenant-a',
        name: 'Tenant lead',
      }),
      undefined,
      { fromIntegration: true },
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'tenant-a',
          action: 'WEBSITE_LEAD_RECEIVED',
        }),
      }),
    );
  });

  it('filters delivery log rows and counts by tenant', async () => {
    await service.listWebsiteDeliveryLogs({}, 'user-a', 'tenant-a');
    for (const query of [db.auditLog.findMany, db.auditLog.count]) {
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'tenant-a' }),
        }),
      );
    }
  });

  it('creates website configuration per tenant without importing legacy sample websites', async () => {
    await service.getWebsiteIntegration('user-a', 'tenant-a');
    expect(db.portalIntegration.upsert).toHaveBeenCalledWith({
      where: {
        organizationId_provider: {
          organizationId: 'tenant-a',
          provider: 'website',
        },
      },
      update: {},
      create: expect.objectContaining({
        organizationId: 'tenant-a',
        fieldMapping: expect.objectContaining({ connectedWebsites: [] }),
      }),
    });
  });

  it.each(['projectId', 'teamId', 'telecallerId', 'fieldExecutiveId'])(
    'rejects foreign routing %s before saving settings',
    async (key) => {
      db.project.findFirst.mockResolvedValue(null);
      db.team.findFirst.mockResolvedValue(null);
      db.user.count.mockResolvedValue(0);
      await expect(
        service.saveWebsiteRouting(
          'site-1',
          { [key]: 'foreign-id' },
          'user-a',
          'tenant-a',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.portalIntegration.update).not.toHaveBeenCalled();
    },
  );

  it.each([
    { websiteUrl: 'https://example.com', ownerId: 'rajesh' },
    { websiteUrl: 'https://unknown.com', ownerId: undefined },
  ])(
    'does not borrow another website route: %j',
    async ({ websiteUrl, ownerId }) => {
      integration.fieldMapping = {
        connectedWebsites: [
          {
            id: 'site',
            url: 'https://example.com',
            name: 'Example',
            ownerId: 'rajesh',
          },
        ],
      };
      Object.defineProperty(service, 'getWebsiteSourceMaster', {
        value: jest.fn().mockResolvedValue({ id: 'website-source' }),
      });
      Object.defineProperty(service, 'sendWebsiteLeadEmailNotification', {
        value: jest.fn().mockResolvedValue(undefined),
      });
      await service.receiveWebsiteLead(
        { name: 'Fixture', mobile: '0000000000', websiteUrl },
        'truroot_web_website-key-id',
      );
      expect(service.createLead).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId }),
        undefined,
        { fromIntegration: true },
      );
    },
  );

  it('tests through real website routing and increments receipt metrics only once', async () => {
    integration.fieldMapping = {
      connectedWebsites: [
        {
          id: 'site',
          url: 'https://example.com',
          name: 'Example',
          ownerId: 'rajesh',
        },
      ],
    };
    Object.defineProperty(service, 'getWebsiteSourceMaster', {
      value: jest.fn().mockResolvedValue({ id: 'website-source' }),
    });
    Object.defineProperty(service, 'sendWebsiteLeadEmailNotification', {
      value: jest.fn().mockResolvedValue(undefined),
    });
    const result = await service.testWebsiteIntegration({
      samplePayload: {
        name: 'Fixture',
        mobile: '0000000000',
        websiteUrl: 'https://example.com',
      },
    });
    expect(result.data.valid).toBe(true);
    expect(service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rajesh' }),
      undefined,
      { fromIntegration: true },
    );
    const receipts = db.portalIntegration.update.mock.calls.filter(
      ([args]) => args.data.totalLeadsReceived,
    );
    expect(receipts).toHaveLength(1);
  });

  it('routes a legacy management override to owner rather than Pre Sales', async () => {
    integration.fieldMapping = {
      mapping: { name: 'leadName' },
      connectedWebsites: [
        {
          id: 'site',
          url: 'https://example.com',
          name: 'Example',
          telecallerId: 'rajesh',
          projectId: 'project',
          sourceId: 'source',
          leadsCount: 4,
        },
      ],
    };
    db.user.findMany.mockResolvedValue([{ id: 'rajesh', role: 'ADMIN' }]);
    Object.defineProperty(service, 'sendWebsiteLeadEmailNotification', {
      value: jest.fn().mockResolvedValue(undefined),
    });

    await service.receiveWebsiteLead(
      {
        name: 'Fixture',
        mobile: '0000000000',
        websiteUrl: 'https://example.com',
      },
      'truroot_web_website-key-id',
    );

    expect(service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: 'rajesh',
        telecallerId: undefined,
        fieldExecutiveId: undefined,
        sourceId: 'source',
        preferredProjectId: 'project',
      }),
      undefined,
      { fromIntegration: true },
    );
    // Receipt updates preserve stored configuration; only the approved repair changes it.
    expectIntegrationUpdate({
      fieldMapping: expect.objectContaining({
        connectedWebsites: [
          expect.objectContaining({ telecallerId: 'rajesh', leadsCount: 5 }),
        ],
      }),
    });
  });

  it('returns canonical legacy routing to the editor without rewriting saved settings', async () => {
    const site = {
      id: 'site',
      url: 'https://example.com',
      telecallerId: 'rajesh',
      leadsCount: 4,
    };
    integration.fieldMapping = {
      connectedWebsites: [site],
      mapping: { name: 'leadName' },
    };
    db.user.findMany.mockResolvedValue([{ id: 'rajesh', role: 'ADMIN' }]);
    const result = await service.getWebsiteIntegration();
    expect(result.data.connectedWebsites).toEqual([
      expect.objectContaining({
        ownerId: 'rajesh',
        telecallerId: undefined,
        fieldExecutiveId: undefined,
        leadsCount: 4,
      }),
    ]);
    expect(site.telecallerId).toBe('rajesh');
    expect(
      db.portalIntegration.update.mock.calls.every(
        ([args]) => !args.data.fieldMapping,
      ),
    ).toBe(true);
  });
});

describe('Website routing override validation', () => {
  let integration: {
    id: string;
    isActive: boolean;
    status: string;
    webhookKeyId: string;
    displayName: string;
    fieldMapping: Record<string, unknown>;
  };
  let service: CrmService;

  const db = {
    user: { findMany: jest.fn(), count: jest.fn() },
    portalIntegration: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    lead: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const savedConnectedWebsites = () => {
    const call = db.portalIntegration.update.mock.calls.find(
      ([args]: [any]) =>
        args?.data?.fieldMapping?.connectedWebsites !== undefined,
    );
    return call?.[0]?.data?.fieldMapping?.connectedWebsites;
  };

  const routingWasPersisted = () =>
    db.portalIntegration.update.mock.calls.some(
      ([args]: [any]) =>
        args?.data?.fieldMapping?.connectedWebsites !== undefined,
    );

  beforeEach(async () => {
    jest.resetAllMocks();
    integration = {
      id: 'website-integration',
      isActive: true,
      status: 'Configured',
      webhookKeyId: 'website-key-id',
      displayName: 'Website Leads',
      fieldMapping: {
        mapping: { name: 'leadName' },
        connectedWebsites: [
          { id: 'site-1', url: 'https://example.com', name: 'Example' },
        ],
      },
    };
    db.portalIntegration.findUnique.mockImplementation(async () => ({
      ...integration,
    }));
    db.portalIntegration.update.mockImplementation(async ({ data }) => ({
      ...integration,
      ...data,
    }));
    db.auditLog.create.mockResolvedValue({});
    db.user.count.mockResolvedValue(1);
    if ('upsert' in db.portalIntegration)
      db.portalIntegration.upsert.mockImplementation(async () => integration);

    const module = await Test.createTestingModule({
      providers: [
        ...referenceTenantProviders(),
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
      ],
    }).compile();

    service = module.get(CrmService);
  });

  it('persists a valid active owner override', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'mgr-1', role: 'MANAGER' }]);

    await service.saveWebsiteRouting('site-1', { ownerId: 'mgr-1' });

    const sites = savedConnectedWebsites();
    expect(sites).toEqual([
      expect.objectContaining({ id: 'site-1', ownerId: 'mgr-1' }),
    ]);
  });

  it('persists a valid Pre Sales override exclusively on telecallerId', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'tc-1', role: 'TELECALLER' }]);

    await service.saveWebsiteRouting('site-1', { telecallerId: 'tc-1' });

    expect(savedConnectedWebsites()).toEqual([
      expect.objectContaining({
        id: 'site-1',
        telecallerId: 'tc-1',
        ownerId: undefined,
        fieldExecutiveId: undefined,
      }),
    ]);
  });

  it('rejects a wrong-role owner override with a 400', async () => {
    db.user.findMany.mockResolvedValue([{ id: 'tc-1', role: 'TELECALLER' }]);

    await expect(
      service.saveWebsiteRouting('site-1', { ownerId: 'tc-1' }),
    ).rejects.toMatchObject({ status: 400 });
    expect(routingWasPersisted()).toBe(false);
  });

  it('rejects an inactive/missing owner override with a 400', async () => {
    db.user.findMany.mockResolvedValue([]);

    await expect(
      service.saveWebsiteRouting('site-1', { ownerId: 'ghost' }),
    ).rejects.toMatchObject({ status: 400 });
    expect(routingWasPersisted()).toBe(false);
  });
});
