import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Lead conversion analytics', () => {
  let service: CrmService;

  const conversionStatus = {
    id: 'booking-status',
    name: 'Booking Done',
    code: 'BOOKING_DONE',
    triggerAction: 'CREATE_BOOKING',
    allowFollowUp: false,
    manualScore: 50,
  };

  const db = {
    lead: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    leadMasterValue: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: {} },
      ],
    }).compile();

    service = module.get(CrmService);
  });

  it('counts leads with booking conversion status in conversion analytics', async () => {
    db.lead.findMany
      .mockResolvedValueOnce([
        {
          id: 'lead-1',
          name: 'Converted Customer',
          displayId: 'TR000001',
          mobile: '9876543210',
          sourceId: null,
          statusId: conversionStatus.id,
          temperatureId: null,
          ownerId: null,
          managerId: null,
          telecallerId: null,
          fieldExecutiveId: null,
          interestLevel: null,
          lastContactedAt: null,
          createdAt: new Date('2026-09-10T10:00:00.000Z'),
          updatedAt: new Date('2026-09-10T10:00:00.000Z'),
          convertedAt: null,
          requirement: null,
          followUps: [],
          callLogs: [],
          siteVisits: [],
          bookings: [],
        },
      ])
      .mockResolvedValueOnce([]);
    db.leadMasterValue.findMany.mockImplementation(({ where }) => {
      if (where?.id?.in?.includes(conversionStatus.id)) {
        return Promise.resolve([conversionStatus]);
      }
      return Promise.resolve([]);
    });
    db.project.findMany.mockResolvedValue([]);
    db.user.findMany.mockResolvedValue([]);

    const result = await service.getConversionAnalytics({
      from: '2026-09-01',
      to: '2026-09-30',
    });

    expect(result.overview.convertedLeads.value).toBe(1);
    expect(
      result.funnelStages.find((stage) => stage.label === 'Booking Done')
        ?.count,
    ).toBe(1);
  });

  it('counts only leads explicitly marked interested', async () => {
    const interestedStatus = {
      id: 'interested-status',
      name: 'Interested',
      code: 'INTERESTED',
      triggerAction: 'NONE',
    };
    const notInterestedStatus = {
      id: 'not-interested-status',
      name: 'Not Interested',
      code: 'NOT_INTERESTED',
      triggerAction: 'NONE',
    };
    const lead = (
      id: string,
      statusId: string | null,
      interestLevel: string | null,
    ) => ({
      id,
      name: id,
      displayId: id,
      mobile: '9876543210',
      sourceId: null,
      statusId,
      stageId: null,
      temperatureId: null,
      ownerId: null,
      managerId: null,
      telecallerId: null,
      fieldExecutiveId: null,
      interestLevel,
      lastContactedAt: null,
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
      updatedAt: new Date('2026-09-10T10:00:00.000Z'),
      convertedAt: null,
      requirement: null,
      followUps: [],
      callLogs: [],
      siteVisits: [],
      bookings: [],
    });

    db.lead.findMany
      .mockResolvedValueOnce([
        lead('interested', interestedStatus.id, null),
        lead('warm', null, 'Warm'),
        lead('high', null, 'High'),
        lead('not-interested', notInterestedStatus.id, null),
      ])
      .mockResolvedValueOnce([]);
    db.leadMasterValue.findMany.mockImplementation(({ where }) => {
      if (where?.id?.in) {
        return Promise.resolve([interestedStatus, notInterestedStatus]);
      }
      return Promise.resolve([]);
    });
    db.project.findMany.mockResolvedValue([]);
    db.user.findMany.mockResolvedValue([]);

    const result = await service.getConversionAnalytics({
      from: '2026-09-01',
      to: '2026-09-30',
    });

    expect(
      result.funnelStages.find((stage) => stage.label === 'Interested')?.count,
    ).toBe(1);
    expect(result.teamTotals.interested).toBe(1);
  });

  it('marks a lead converted when the normal edit flow sets a conversion status', async () => {
    const currentLead = {
      id: 'lead-1',
      name: 'Customer',
      statusId: 'new-status',
      sourceId: null,
      convertedAt: null,
      remarks: null,
      nextFollowUpAt: null,
    };
    const updatedLead = {
      ...currentLead,
      statusId: conversionStatus.id,
      requirement: null,
    };

    jest
      .spyOn(service, 'getLead')
      .mockResolvedValueOnce(currentLead)
      .mockResolvedValueOnce(updatedLead);
    db.leadMasterValue.findFirst.mockResolvedValue(conversionStatus);
    db.lead.update.mockResolvedValue(updatedLead);
    db.auditLog.create.mockResolvedValue({});
    db.activity.create.mockResolvedValue({});

    await service.updateLead(
      currentLead.id,
      { statusId: conversionStatus.id },
      'admin-1',
    );

    expect(db.lead.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          convertedAt: expect.any(Date),
        }),
      }),
    );
  });
});
