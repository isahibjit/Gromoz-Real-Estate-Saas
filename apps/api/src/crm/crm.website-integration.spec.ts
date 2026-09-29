import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Website integration pause enforcement', () => {
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
    portalIntegration: { findUnique: jest.fn(), update: jest.fn() },
    lead: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
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

    const result = await service.receiveWebsiteLead({
      name: 'Website User',
      mobile: '9876543210',
      websiteUrl: 'https://example.com',
    });

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

    const result = await service.testWebsiteIntegration({
      samplePayload: { name: 'Test User', mobile: '9876543210' },
    });

    expect(result.data.valid).toBe(false);
    expect(result.data.status).toBe('Paused');
    expect(result.data.wouldCreateLead).toBe(false);
    expect(result.data.errors).toContain('Website Integration is paused');
    expect(service.createLead).not.toHaveBeenCalled();
  });

  it('persists pause and activation from supported payload shapes', async () => {
    await service.saveWebsiteIntegration({ isPaused: true });
    expectIntegrationUpdate({ isActive: false, status: 'Paused' });

    integration.isActive = false;
    integration.status = 'Paused';
    await service.saveWebsiteIntegration({ isActive: true });
    expectIntegrationUpdate({ isActive: true, status: 'Configured' });
  });
});
