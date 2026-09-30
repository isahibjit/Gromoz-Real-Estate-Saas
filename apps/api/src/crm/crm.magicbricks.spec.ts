import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';

describe('MagicBricks pause enforcement', () => {
  const payload = { FirstName: 'Test', LastName: 'Lead', Mobile: '9876543210' };
  let integration: {
    id: string;
    organizationId: string;
    provider: string;
    isActive: boolean;
    status: string;
    webhookKeyId: string;
    displayName: string;
    fieldMapping: { FirstName: string; Mobile: string };
  };
  let service: CrmService;
  let apiKey: string;
  const db = {
    portalIntegration: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    organizationMember: { findMany: jest.fn() },
    lead: { findFirst: jest.fn(), count: jest.fn() },
    project: { findFirst: jest.fn() },
    leadMasterCategory: { upsert: jest.fn() },
    leadMasterValue: { count: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    integration = {
      id: 'magicbricks-integration',
      organizationId: 'tenant-a',
      provider: 'magicbricks',
      isActive: true,
      status: 'Connected',
      webhookKeyId: 'test-key-id',
      displayName: 'MagicBricks',
      fieldMapping: { FirstName: 'leadName', Mobile: 'mobileNumber' },
    };
    db.portalIntegration.findUnique.mockImplementation(async () => ({
      ...integration,
    }));
    db.portalIntegration.findFirst.mockImplementation(async () => ({
      ...integration,
    }));
    db.user.findUnique.mockResolvedValue({ role: 'ADMIN', isActive: true });
    db.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a' },
    ]);
    db.portalIntegration.update.mockImplementation(async () => ({
      ...integration,
    }));
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
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
        { provide: TenantAccessService, useValue: {} },
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
    const secret =
      process.env.MAGICBRICKS_API_KEY_SECRET ??
      process.env.JWT_ACCESS_SECRET ??
      'truroot-magicbricks-secret';
    const signature = createHmac('sha256', secret)
      .update(`magicbricks:${integration.webhookKeyId}`)
      .digest('hex')
      .slice(0, 24);
    apiKey = `mb_${integration.webhookKeyId}.${signature}`;
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
    expect(db.portalIntegration.update).not.toHaveBeenCalled();
    expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain(apiKey);
  });

  it('validates authentication even while paused', async () => {
    integration.isActive = false;
    expect(await service.receiveMagicBricksLead(payload, 'invalid')).toEqual({
      success: false,
      message: 'Failure: Invalid API key format or signature',
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
    expect(db.portalIntegration.update).not.toHaveBeenCalled();
  });

  it('still creates active leads and records receipt', async () => {
    expect(await service.receiveMagicBricksLead(payload, apiKey)).toMatchObject(
      {
        success: true,
        leadId: 'lead-1',
      },
    );
    expect(service.createLead).toHaveBeenCalledTimes(1);
    expect(db.portalIntegration.update).toHaveBeenCalledWith({
      where: { id: integration.id },
      data: expect.objectContaining({ totalLeadsReceived: { increment: 1 } }),
    });
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
    await service.saveMagicBricksIntegration(
      { isActive: false },
      'user-a',
      'tenant-a',
    );
    expect(db.portalIntegration.update).toHaveBeenLastCalledWith({
      where: { id: integration.id },
      data: expect.objectContaining({ isActive: false, status: 'Paused' }),
    });
    integration.isActive = false;
    integration.status = 'Paused';
    await service.saveMagicBricksIntegration(
      { isActive: true },
      'user-a',
      'tenant-a',
    );
    expect(db.portalIntegration.update).toHaveBeenLastCalledWith({
      where: { id: integration.id },
      data: expect.objectContaining({ isActive: true, status: 'Configured' }),
    });
  });

  it('keeps pause when saving settings or field mapping', async () => {
    integration.isActive = false;
    integration.status = 'Paused';
    await service.saveMagicBricksIntegration(
      {
        notes: 'Keep paused',
        status: 'Configured',
      },
      'user-a',
      'tenant-a',
    );
    expect(db.portalIntegration.update).toHaveBeenLastCalledWith({
      where: { id: integration.id },
      data: expect.objectContaining({ status: 'Paused' }),
    });
    expect(db.portalIntegration.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ isActive: false, status: 'Paused' }),
    );
    await service.saveMagicBricksFieldMapping(
      {
        fieldMapping: integration.fieldMapping,
      },
      'user-a',
      'tenant-a',
    );
    expect(db.portalIntegration.update).toHaveBeenLastCalledWith({
      where: { id: integration.id },
      data: expect.objectContaining({ status: 'Paused' }),
    });
  });

  it('does not report a paused test payload as creatable', async () => {
    integration.isActive = false;
    const result = await service.testMagicBricksIntegration(
      {
        samplePayload: payload,
      },
      'user-a',
      undefined,
      undefined,
      'tenant-a',
    );
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
      expect(db.portalIntegration.update).not.toHaveBeenCalled();
    },
  );
});
