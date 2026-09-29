import { Test } from '@nestjs/testing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { CrmService } from './crm.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Follow-up reminder dispatch', () => {
  let service: CrmService;

  const dueAt = new Date(Date.now() - 60_000);
  const followUp = {
    id: 'follow-up-1',
    assignedToId: 'user-1',
    completedAt: null,
    reminderSentAt: null,
    scheduledAt: dueAt,
    typeId: 'Call',
    lead: {
      id: 'lead-1',
      displayId: 'TR000001',
      name: 'Anand',
      statusId: 'status-1',
      updatedAt: new Date(Date.now() - 120_000),
      deletedAt: null,
    },
  };

  const db = {
    $transaction: jest.fn(async (handler: (tx: unknown) => unknown) =>
      handler(db),
    ),
    followUp: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    leadMasterValue: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(
      async (handler: (tx: unknown) => unknown) => handler(db),
    );
    db.followUp.findMany.mockResolvedValue([{ ...followUp, setReminder: false }]);
    db.followUp.findUnique.mockResolvedValue(followUp);
    db.followUp.update.mockResolvedValue({});
    db.leadMasterValue.findUnique.mockResolvedValue({
      followUpNotificationEnabled: true,
      followUpRenotifyMinutes: null,
    });
    db.user.findUnique.mockResolvedValue({ id: 'user-1', role: 'TELECALLER' });
    db.notification.create.mockResolvedValue({});

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

  it('sends FCM for every due pending follow-up without requiring setReminder', async () => {
    jest.spyOn(service as any, 'sendFollowUpReminderPush').mockResolvedValue({
      attempted: true,
      delivered: true,
      tokenCount: 1,
      deliveredCount: 1,
      invalidTokenCount: 0,
    });

    const result = await service.runFollowUpReminderDispatches();

    expect(db.followUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ setReminder: true }),
      }),
    );
    expect((service as any).sendFollowUpReminderPush).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        leadId: 'lead-1',
        followUpId: 'follow-up-1',
      }),
    );
    expect(db.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'follow-up-reminder',
        }),
      }),
    );
    expect(db.followUp.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'follow-up-1' },
        data: expect.objectContaining({ reminderSentAt: expect.any(Date) }),
      }),
    );
    expect(result.processed).toBe(1);
  });

  it('does not mark reminderSentAt when FCM is not delivered', async () => {
    jest.spyOn(service as any, 'sendFollowUpReminderPush').mockResolvedValue({
      attempted: false,
      delivered: false,
      tokenCount: 0,
      deliveredCount: 0,
      invalidTokenCount: 0,
    });

    const result = await service.runFollowUpReminderDispatches();

    expect((service as any).sendFollowUpReminderPush).toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
    expect(db.followUp.update).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });

  it('notifies only once when followUpRenotifyMinutes is 0', async () => {
    jest.spyOn(service as any, 'sendFollowUpReminderPush').mockResolvedValue({
      attempted: true,
      delivered: true,
      tokenCount: 1,
      deliveredCount: 1,
      invalidTokenCount: 0,
    });

    db.followUp.findUnique.mockResolvedValue({
      ...followUp,
      reminderSentAt: new Date(Date.now() - 300_000), // sent 5 min ago
    });
    db.leadMasterValue.findUnique.mockResolvedValue({
      followUpRenotifyMinutes: 0,
    });

    const result = await service.runFollowUpReminderDispatches();

    expect((service as any).sendFollowUpReminderPush).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });

  it('renotifies every x minutes when followUpRenotifyMinutes > 0', async () => {
    jest.spyOn(service as any, 'sendFollowUpReminderPush').mockResolvedValue({
      attempted: true,
      delivered: true,
      tokenCount: 1,
      deliveredCount: 1,
      invalidTokenCount: 0,
    });

    const tenMinAgo = new Date(Date.now() - 600_000);
    db.followUp.findUnique.mockResolvedValue({
      ...followUp,
      reminderSentAt: tenMinAgo,
      lead: {
        ...followUp.lead,
        updatedAt: tenMinAgo, // not updated after last reminder
      },
    });
    db.leadMasterValue.findUnique.mockResolvedValue({
      followUpRenotifyMinutes: 5, // renotify every 5 min
    });

    const result = await service.runFollowUpReminderDispatches();

    expect((service as any).sendFollowUpReminderPush).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        leadId: 'lead-1',
        followUpId: 'follow-up-1',
      }),
    );
    expect(result.processed).toBe(1);
  });

  it('skips notifications when followUpNotificationEnabled is false on status', async () => {
    jest.spyOn(service as any, 'sendFollowUpReminderPush').mockResolvedValue({
      attempted: true,
      delivered: true,
      tokenCount: 1,
      deliveredCount: 1,
      invalidTokenCount: 0,
    });

    db.leadMasterValue.findUnique.mockResolvedValue({
      followUpNotificationEnabled: false,
      followUpRenotifyMinutes: 5,
    });

    const result = await service.runFollowUpReminderDispatches();

    expect((service as any).sendFollowUpReminderPush).not.toHaveBeenCalled();
    expect(result.processed).toBe(0);
  });
});
