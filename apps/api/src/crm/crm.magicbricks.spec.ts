import { referenceTenantProviders } from "../../test/reference-tenant-providers";
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { LeadSourceConnectionsService } from './lead-source-connections.service';

describe('MagicBricks pause enforcement', () => {
  const payload = { FirstName: 'Test', LastName: 'Lead', Mobile: '9876543210' };
  let integration: {
    organizationId: string;
    id: string;
    isActive: boolean;
    status: string;
    webhookKeyId: string;
    displayName: string;
    fieldMapping: { FirstName: string; Mobile: string };
    routingRule?: {
      ownerId?: string;
      telecallerId?: string;
      teamId?: string;
      isActive?: boolean;
    };
  };
  let service: CrmService;
  let apiKey: string;
  const db = {
    lead: { findFirst: jest.fn(), count: jest.fn() },
    project: { findFirst: jest.fn() },
    leadMasterCategory: { upsert: jest.fn() },
    leadMasterValue: { count: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  const connections = {
    verifyMagicBricksApiKey: jest.fn(),
    findByWebhookKey: jest.fn(),
    recordLeadReceived: jest.fn(),
    getPrimaryAccount: jest.fn(),
    getAccount: jest.fn(),
    updateAccount: jest.fn(),
    saveFieldMapping: jest.fn(),
    recordTest: jest.fn(),
    buildMagicBricksApiKey: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    integration = {
      organizationId: 'tenant-a',
      id: 'magicbricks-integration',
      isActive: true,
      status: 'Connected',
      webhookKeyId: 'test-key-id',
      displayName: 'MagicBricks',
      fieldMapping: { FirstName: 'leadName', Mobile: 'mobileNumber' },
    };
    connections.verifyMagicBricksApiKey.mockImplementation((key: string) =>
      key === apiKey ? integration.webhookKeyId : null,
    );
    connections.findByWebhookKey.mockImplementation(async () => ({
      ...integration,
      routingRule: integration.routingRule ?? null,
    }));
    connections.getPrimaryAccount.mockImplementation(async () => ({
      ...integration,
      _count: { leads: 0 },
      routingRule: null,
    }));
    connections.getAccount.mockImplementation(async () => ({
      ...integration,
      _count: { leads: 0 },
      routingRule: null,
    }));
    connections.updateAccount.mockImplementation(
      async (_provider: string, _id: string, changes: object) => ({
        ...integration,
        ...changes,
        _count: { leads: 0 },
        routingRule: null,
      }),
    );
    connections.saveFieldMapping.mockImplementation(
      async (_provider: string, _id: string, fieldMapping: object) => ({
        ...integration,
        fieldMapping,
        _count: { leads: 0 },
        routingRule: null,
      }),
    );
    connections.recordLeadReceived.mockResolvedValue({});
    connections.recordTest.mockResolvedValue({});
    connections.buildMagicBricksApiKey.mockReturnValue(
      'mb_test-key-id.signature',
    );
    db.lead.findFirst.mockResolvedValue(null);
    db.lead.count.mockResolvedValue(0);
    db.project.findFirst.mockResolvedValue(null);
    db.leadMasterCategory.upsert.mockResolvedValue({ id: 'category' });
    db.leadMasterValue.count.mockResolvedValue(2);
    db.leadMasterValue.findMany.mockResolvedValue([
      { id: 'source', name: 'MagicBricks', code: 'MAGICBRICKS' },
      { id: 'status', name: 'New', code: 'NEW' },
    ]);
    db.auditLog.create.mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        ...referenceTenantProviders(),
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
        { provide: LeadSourceConnectionsService, useValue: connections },
      ],
    }).compile();
    service = module.get(CrmService);
    jest
      .spyOn(service, 'createLead')
      .mockResolvedValue({ id: 'lead-1', displayId: 'TR001' });
    apiKey = 'mb_test-key-id.signature';
  });

  it.each([
    { isActive: false, status: 'Paused' },
    { isActive: false, status: 'Configured' },
    { isActive: true, status: 'Paused' },
  ])('rejects paused state %j without lead writes', async (state) => {
    Object.assign(integration, state);
    const result = await service.receiveMagicBricksLead({
      ...payload,
      ApiKey: apiKey,
    });
    expect(result).toEqual({
      success: false,
      status: 'PAUSED',
      message: 'Failure: MagicBricks Push API is paused. Lead was not created.',
    });
    expect(service.createLead).not.toHaveBeenCalled();
    expect(db.lead.findFirst).not.toHaveBeenCalled();
    expect(connections.recordLeadReceived).not.toHaveBeenCalled();
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(apiKey);
  });

  it('validates authentication even while paused', async () => {
    integration.isActive = false;
    expect(await service.receiveMagicBricksLead(payload, 'invalid')).toEqual({
      success: false,
      message: 'Failure: Invalid API key',
    });
    expect(service.createLead).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects a request paused during duplicate lookup', async () => {
    db.lead.findFirst.mockImplementationOnce(async () => {
      integration.isActive = false;
      integration.status = 'Paused';
      return null;
    });
    expect(await service.receiveMagicBricksLead(payload, apiKey)).toMatchObject(
      {
        success: false,
        status: 'PAUSED',
      },
    );
    expect(service.createLead).not.toHaveBeenCalled();
    expect(connections.recordLeadReceived).not.toHaveBeenCalled();
  });

  it('still creates active leads and records receipt', async () => {
    expect(await service.receiveMagicBricksLead(payload, apiKey)).toMatchObject(
      {
        success: true,
        leadId: 'lead-1',
      },
    );
    expect(service.createLead).toHaveBeenCalledTimes(1);
    expect(connections.recordLeadReceived).toHaveBeenCalledWith(integration.id);
    expect(service.createLead).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: undefined, telecallerId: undefined, autoAssignmentTeamId: undefined,
    }), undefined, { fromIntegration: true });
  });

  it('uses Rajesh as owner and suppresses the account team route for a direct override', async () => {
    integration.routingRule = { ownerId: 'rajesh', teamId: 'team' };
    await service.receiveMagicBricksLead(payload, apiKey);
    expect(service.createLead).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 'rajesh', telecallerId: undefined, fieldExecutiveId: undefined, autoAssignmentTeamId: undefined,
    }), undefined, { fromIntegration: true });
  });
  it('uses the current route when an override changes during normalization', async () => {
    connections.findByWebhookKey.mockResolvedValueOnce({ ...integration, routingRule: { telecallerId: 'presales' } })
      .mockResolvedValueOnce({ ...integration, routingRule: { ownerId: 'rajesh' } });
    await service.receiveMagicBricksLead(payload, apiKey);
    expect(service.createLead).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'rajesh', telecallerId: undefined }), undefined, { fromIntegration: true });
  });
  it('does not apply a disabled account assignment route', async () => {
    integration.routingRule = { ownerId: 'rajesh', teamId: 'team', isActive: false };
    await service.receiveMagicBricksLead(payload, apiKey);
    expect(service.createLead).toHaveBeenCalledWith(expect.objectContaining({ ownerId: undefined, autoAssignmentTeamId: undefined }), undefined, { fromIntegration: true });
  });

  it('keeps duplicate prevention', async () => {
    db.lead.findFirst.mockResolvedValueOnce({
      id: 'existing-lead',
      displayId: 'TR002',
    });
    expect(await service.receiveMagicBricksLead(payload, apiKey)).toMatchObject(
      {
        success: false,
        message: 'Failure: Lead already exists',
      },
    );
    expect(service.createLead).not.toHaveBeenCalled();
  });

  it('persists pause and permits explicit activation', async () => {
    await service.saveMagicBricksIntegration({ isActive: false });
    expect(connections.updateAccount).toHaveBeenLastCalledWith(
      'magicbricks',
      integration.id,
      expect.objectContaining({ isActive: false }),
      undefined,
    );
    integration.isActive = false;
    integration.status = 'Paused';
    await service.saveMagicBricksIntegration({ isActive: true });
    expect(connections.updateAccount).toHaveBeenLastCalledWith(
      'magicbricks',
      integration.id,
      expect.objectContaining({ isActive: true }),
      undefined,
    );
  });

  it('keeps pause when saving settings or field mapping', async () => {
    integration.isActive = false;
    integration.status = 'Paused';
    await service.saveMagicBricksIntegration({
      notes: 'Keep paused',
      status: 'Configured',
    });
    expect(connections.updateAccount).toHaveBeenLastCalledWith(
      'magicbricks',
      integration.id,
      expect.objectContaining({ isActive: false }),
      undefined,
    );
    await service.saveMagicBricksFieldMapping({
      fieldMapping: integration.fieldMapping,
    });
    expect(connections.saveFieldMapping).toHaveBeenCalledWith(
      'magicbricks',
      integration.id,
      expect.any(Object),
      undefined,
    );
  });

  it('does not report a paused test payload as creatable', async () => {
    integration.isActive = false;
    const result = await service.testMagicBricksIntegration({
      samplePayload: payload,
    });
    expect(result.data.wouldCreateLead).toBe(false);
    expect(result.data.errors).toContain('MagicBricks Push API is paused');
    expect(service.createLead).not.toHaveBeenCalled();
  });

  it.each(['false', 'true', 0, null])(
    'rejects non-boolean activation %j',
    async (isActive) => {
      await expect(
        service.saveMagicBricksIntegration({ isActive }),
      ).rejects.toThrow(BadRequestException);
      expect(connections.updateAccount).not.toHaveBeenCalled();
    },
  );
});
