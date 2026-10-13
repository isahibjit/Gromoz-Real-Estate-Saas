import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CrmService } from './crm.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';

describe('Site visit assignment', () => {
  const lead = {
    id: 'lead-1',
    fieldExecutiveId: 'exec-a',
    statusId: 'old-status',
  };
  const existingVisit = {
    id: 'visit-1',
    leadId: lead.id,
    assignedExecutiveId: 'exec-a',
    status: 'Scheduled',
  };
  const db = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    lead: {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({ name: 'Test client' }),
      update: jest.fn().mockResolvedValue(lead),
    },
    siteVisit: {
      findFirst: jest.fn(),
      create: jest.fn(
        async ({ data }: { data: Prisma.SiteVisitUncheckedCreateInput }) => ({
          id: 'visit-1',
          ...data,
        }),
      ),
      update: jest.fn(
        async ({ data }: { data: Prisma.SiteVisitUncheckedUpdateInput }) => ({
          ...existingVisit,
          ...data,
        }),
      ),
    },
    leadMasterValue: {
      findUnique: jest.fn().mockResolvedValue({ id: 'visit-status', name: 'Site Visit' }),
      findFirst: jest.fn().mockResolvedValue({
        id: 'visit-status', name: 'Site Visit Schedule', code: 'SITE_VISIT_SCHEDULE',
        triggerAction: 'CREATE_SITE_VISIT', allowFollowUp: true, manualScore: null,
      }),
    },
    followUp: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
    note: { create: jest.fn().mockResolvedValue({}) },
    activity: { create: jest.fn().mockResolvedValue({}) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const transaction = jest.fn(
    async (callback: (client: typeof db) => Promise<unknown>) => callback(db),
  );
  let service: CrmService;
  const request = {
    leadId: 'lead-1',
    projectId: 'project-1',
    scheduledAt: '2026-10-10T10:00:00+05:30',
    displayId: 'SV-TEST',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    db.lead.findFirst.mockResolvedValue(lead);
    db.siteVisit.findFirst.mockResolvedValue(existingVisit);
    db.user.findFirst.mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        where.id === 'actor' ? { role: 'ADMIN' } : { id: 'exec-a' },
    );
    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        {
          provide: PrismaService,
          useValue: { ...db, $transaction: transaction },
        },
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
    jest.spyOn(service, 'sendPushNotification').mockResolvedValue(undefined);
    jest.spyOn(service, 'getLead').mockResolvedValue(lead);
  });

  it.each([
    {},
    { assignedExecutiveId: 'exec-b' },
    { assigneeId: 'exec-b' },
    { assignedExecutiveId: null },
  ])(
    'uses the saved client assignment despite request override %j',
    async (override) => {
      const visit = await service.createSiteVisit(
        { ...request, ...override },
        'actor',
      );
      expect(visit.assignedExecutiveId).toBe('exec-a');
      expect(visit.createdById).toBe('actor');
      expect(service.sendPushNotification).toHaveBeenCalledWith(
        'exec-a',
        expect.objectContaining({ type: 'site-visit-scheduled' }),
        { organizationId: undefined },
      );
    },
  );

  it('resolves display IDs and the latest saved assignment', async () => {
    db.lead.findFirst.mockResolvedValue({
      ...lead,
      fieldExecutiveId: 'exec-new',
    });
    db.user.findFirst.mockResolvedValue({ id: 'exec-new', role: 'ADMIN' });
    const visit = await service.createSiteVisit(
      { ...request, leadId: 'TR001', assignedExecutiveId: 'exec-a' },
      'actor',
    );
    expect(visit.leadId).toBe('lead-1');
    expect(visit.assignedExecutiveId).toBe('exec-new');
  });

  it('stores the canonical scheduling status in the visit transaction', async () => {
    const visit = await service.createSiteVisit({ ...request, leadStatusId: 'SITE_VISIT_SCHEDULE' }, 'actor');
    expect(visit.leadId).toBe('lead-1');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' }, data: { statusId: 'visit-status' },
    });
  });

  it('does not write the lead status when visit creation fails', async () => {
    db.siteVisit.create.mockRejectedValueOnce(new Error('visit insert failed'));
    await expect(service.createSiteVisit(
      { ...request, leadStatusId: 'SITE_VISIT_SCHEDULE' }, 'actor',
    )).rejects.toThrow('visit insert failed');
    expect(db.lead.update).not.toHaveBeenCalled();
  });

  it.each([
    { id: 'visit-status', name: 'Site Visit Schedule', code: 'SITE_VISIT_SCHEDULE', triggerAction: 'CREATE_SITE_VISIT' },
    { id: 'done-status', name: 'Site Visit Done', code: 'SITE_VISIT_DONE', triggerAction: 'NONE' },
  ])('rejects generic lead updates to protected $code', async (status) => {
    db.leadMasterValue.findFirst.mockResolvedValueOnce({
      ...status, allowFollowUp: true, manualScore: null,
    });
    await expect(service.updateLead('lead-1', { statusId: status.code }, 'actor'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(db.lead.update).not.toHaveBeenCalled();
  });

  it('rejects an unassigned client without creating a visit', async () => {
    db.lead.findFirst.mockResolvedValue({ ...lead, fieldExecutiveId: null });
    await expect(service.createSiteVisit(request, 'actor')).rejects.toThrow(
      'Assign an active field executive',
    );
    expect(db.siteVisit.create).not.toHaveBeenCalled();
  });

  it('rejects an inactive or ineligible executive', async () => {
    db.user.findFirst
      .mockResolvedValueOnce({ role: 'ADMIN' })
      .mockResolvedValueOnce(null);
    await expect(
      service.createSiteVisit(request, 'actor'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(db.user.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          id: 'exec-a',
          isActive: true,
          role: { in: ['SALES_AGENT', 'SALES_MANAGER', 'ADMIN'] },
        },
      }),
    );
    expect(db.siteVisit.create).not.toHaveBeenCalled();
  });

  it('rejects a missing, deleted, or inaccessible lead', async () => {
    db.lead.findFirst.mockResolvedValue(null);
    await expect(
      service.createSiteVisit(request, 'actor'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      }),
    );
    expect(db.siteVisit.create).not.toHaveBeenCalled();
  });

  it.each(['TELECALLER', 'SALES_AGENT'])(
    'preserves %s lead access scope',
    async (role) => {
      db.user.findFirst
        .mockResolvedValueOnce({ role })
        .mockResolvedValueOnce({ id: 'exec-a' });
      await service.createSiteVisit(request, 'actor');
      const where = db.lead.findFirst.mock.calls[0][0].where;
      if (role === 'TELECALLER') expect(where.telecallerId).toBe('actor');
      else
        expect(where.AND).toEqual([
          expect.objectContaining({
            OR: expect.arrayContaining([{ fieldExecutiveId: 'actor' }]),
          }),
        ]);
    },
  );

  it('uses the same rule inside pipeline scheduling', async () => {
    await service.moveLeadInPipeline(
      'lead-1',
      { ...request, statusId: 'visit-status', assignedExecutiveId: 'exec-b' },
      'actor',
    );
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(db.siteVisit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedExecutiveId: 'exec-a',
          createdById: 'actor',
        }),
      }),
    );
  });

  it('propagates assignment failure out of the pipeline transaction', async () => {
    db.lead.findFirst.mockResolvedValue({ ...lead, fieldExecutiveId: null });
    await expect(
      service.moveLeadInPipeline(
        'lead-1',
        { ...request, statusId: 'visit-status' },
        'actor',
      ),
    ).rejects.toThrow('Assign an active field executive');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(db.siteVisit.create).not.toHaveBeenCalled();
    expect(db.auditLog.create).not.toHaveBeenCalled();
  });

  it.each([
    { assignedExecutiveId: 'exec-b' },
    { assignedExecutiveId: null },
    { assigneeId: 'exec-b' },
  ])('rejects reassignment on edit %j', async (override) => {
    await expect(
      service.updateSiteVisit('visit-1', override, 'actor'),
    ).rejects.toThrow('cannot be changed');
    expect(db.siteVisit.update).not.toHaveBeenCalled();
  });

  it.each([{}, { assignedExecutiveId: 'exec-a' }])(
    'preserves historical assignment on ordinary edit %j',
    async (override) => {
      const visit = await service.updateSiteVisit(
        'visit-1',
        { ...override, notes: 'New meeting instructions' },
        'actor',
      );
      expect(visit.assignedExecutiveId).toBe('exec-a');
      expect(db.siteVisit.update).toHaveBeenCalledWith({
        where: { id: 'visit-1' },
        data: { notes: 'New meeting instructions' },
      });
      expect(db.lead.findFirst).not.toHaveBeenCalled();
    },
  );

  it.each([{}, { assignedExecutiveId: 'exec-a' }])('preserves historical assignment on ordinary edit %j', async (override) => {
    const visit = await service.updateSiteVisit('visit-1', { ...override, notes: 'New meeting instructions' }, 'actor');
    expect(visit.assignedExecutiveId).toBe('exec-a');
    expect(db.siteVisit.update).toHaveBeenCalledWith({ where: { id: 'visit-1' }, data: { notes: 'New meeting instructions' } });
    expect(db.lead.findFirst).not.toHaveBeenCalled();
  });

  it('completes the visit and lead with the canonical status in one transaction', async () => {
    db.leadMasterValue.findFirst.mockResolvedValueOnce({
      id: 'done-status', name: 'Site Visit Done', code: 'SITE_VISIT_DONE',
      triggerAction: 'NONE', allowFollowUp: true, manualScore: null,
    });
    const visit = await service.updateSiteVisit('visit-1', {
      status: 'Completed', leadStatus: 'Site Visit Done',
      nextFollowUpAt: '2026-10-12T10:00:00+05:30', feedback: 'Call after the visit',
    }, 'actor');
    expect(visit.status).toBe('Completed');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' }, data: expect.objectContaining({ statusId: 'done-status' }),
    });
    expect(db.followUp.create).toHaveBeenCalledTimes(1);
    expect(db.note.create).toHaveBeenCalledTimes(1);
  });
});
