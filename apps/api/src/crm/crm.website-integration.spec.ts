import { Test } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

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
    user: { findUnique: jest.fn(), count: jest.fn() },
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

    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
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
});
