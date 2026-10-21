import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';

describe('Contact lead conversion', () => {
  let service: CrmService;

  const contactLead = {
    id: 'contact-1',
    customerName: 'Same Customer',
    email: 'same@example.com',
    mobileCountryCode: '+91',
    mobile: '9876543210',
    alternateCountryCode: null,
    alternateMobile: null,
    sourceId: 'source-1',
    preferredProjectId: 'project-1',
    note: 'Interested from contact list',
    assignedToId: 'user-1',
    status: 'COLD',
    convertedLeadId: null,
  };

  const db = {
    contactLead: { findFirst: jest.fn(), update: jest.fn() },
    user: { findMany: jest.fn(), findFirst: jest.fn() },
    lead: { findFirst: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    db.contactLead.findFirst.mockResolvedValue({ ...contactLead });
    db.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
    db.user.findFirst.mockResolvedValue({ role: 'TELECALLER' });
    db.contactLead.update.mockImplementation(async ({ data }) => ({
      ...contactLead,
      ...data,
    }));
    db.lead.findFirst.mockResolvedValue({
      id: 'existing-lead',
      displayId: 'TR000123',
      name: 'Existing Customer',
      mobile: contactLead.mobile,
    });
    db.auditLog.create.mockResolvedValue({});

    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
        {
          provide: TenantAccessService,
          useValue: { employeeWhere: () => ({}) },
        },
        {
          provide: TenantContextService,
          useValue: { getTenantId: () => undefined },
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
      .spyOn(service as any, 'getDefaultInterestedLeadStatusMaster')
      .mockResolvedValue({ id: 'interested-status', name: 'Interested' });
    jest
      .spyOn(service, 'createLead')
      .mockResolvedValue({ id: 'created-lead', displayId: 'TR000124' });
  });

  it('converts even when a normal lead already has the same mobile', async () => {
    const result = await service.convertContactLead(contactLead.id, 'admin-1');

    expect(db.lead.findFirst).not.toHaveBeenCalled();
    expect(service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        name: contactLead.customerName,
        mobile: contactLead.mobile,
        statusId: 'interested-status',
      }),
      'admin-1',
    );
    expect(db.contactLead.update).toHaveBeenCalledWith({
      where: { id: contactLead.id },
      data: expect.objectContaining({
        status: 'CONVERTED',
        convertedLeadId: 'created-lead',
      }),
    });
    expect(result.lead).toMatchObject({ id: 'created-lead' });
  });

  it('returns the existing converted lead id when already converted', async () => {
    db.contactLead.findFirst.mockResolvedValueOnce({
      ...contactLead,
      status: 'CONVERTED',
      convertedLeadId: 'already-converted',
    });

    await expect(
      service.convertContactLead(contactLead.id, 'admin-1'),
    ).resolves.toEqual({
      leadId: 'already-converted',
      contact: expect.objectContaining({
        convertedLeadId: 'already-converted',
      }),
    });
    expect(service.createLead).not.toHaveBeenCalled();
  });

  it('assigns a converted contact lead to the Sales field for a sales employee', async () => {
    db.user.findFirst.mockResolvedValue({ role: 'SALES_AGENT' });

    await service.convertContactLead(contactLead.id, 'admin-1');

    expect(service.createLead).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: contactLead.assignedToId,
        telecallerId: undefined,
        fieldExecutiveId: contactLead.assignedToId,
      }),
      'admin-1',
    );
  });

  it('rejects a converted contact lead when its assignee is inactive or outside the workspace', async () => {
    db.user.findFirst.mockResolvedValue(null);

    await expect(
      service.convertContactLead(contactLead.id, 'admin-1'),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Select an active contact lead assignee',
    });
    expect(service.createLead).not.toHaveBeenCalled();
  });
});
