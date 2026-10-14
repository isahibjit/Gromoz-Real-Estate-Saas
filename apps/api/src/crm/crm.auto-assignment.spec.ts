import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import { CrmService } from './crm.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Role-flexible auto assignment', () => {
  const misbahId = 'misbah-sales-agent';
  const afreenId = 'afreen-telecaller';
  const actorId = 'admin-user';
  const assignedAt = new Date(Date.now() - 120_000);
  const rule = {
    id: 'rule-1',
    name: 'Team C Auto',
    isEnabled: true,
    initialUserId: misbahId,
    transferSequence: [misbahId, afreenId],
    transferTimeMinutes: 1,
  };
  const baseLead = {
    id: 'lead-1',
    displayId: 'TR000764',
    name: 'Test lead',
    sourceId: null,
    ownerId: null,
    telecallerId: null,
    fieldExecutiveId: null,
    requirement: null,
    updatedAt: new Date(assignedAt.getTime() - 1_000),
  };

  const users = new Map([
    [
      misbahId,
      {
        id: misbahId,
        fullName: 'Misbah Test',
        email: 'misbah@example.com',
        role: 'SALES_AGENT',
        isActive: true,
      },
    ],
    [
      afreenId,
      {
        id: afreenId,
        fullName: 'Afreen',
        email: 'afreen@example.com',
        role: 'TELECALLER',
        isActive: true,
      },
    ],
    [
      actorId,
      {
        id: actorId,
        fullName: 'Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        isActive: true,
      },
    ],
  ]);

  const db = {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    organizationMember: { findMany: jest.fn() },
    lead: { findUnique: jest.fn(), update: jest.fn() },
    leadAssignment: { updateMany: jest.fn(), create: jest.fn() },
    autoAssignmentRule: { findFirst: jest.fn(), findUnique: jest.fn() },
    autoAssignmentEvent: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activity: { count: jest.fn(), create: jest.fn() },
    followUp: { count: jest.fn() },
    note: { count: jest.fn() },
    callLog: { count: jest.fn() },
    siteVisit: { count: jest.fn() },
    booking: { count: jest.fn() },
    notification: { create: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  let service: CrmService;

  beforeEach(async () => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(
      async (work: (client: typeof db) => Promise<unknown>) => work(db),
    );
    db.$queryRaw.mockResolvedValue([]);
    db.user.count.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.length,
    );
    db.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a' },
    ]);
    db.user.findUnique.mockImplementation(
      async ({ where }: { where: { id: string } }) =>
        users.get(where.id) ?? null,
    );
    db.user.findMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.flatMap((id) => {
          const user = users.get(id);
          return user?.isActive ? [user] : [];
        }),
    );
    db.lead.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseLead,
        ...data,
      }),
    );
    db.leadAssignment.updateMany.mockResolvedValue({ count: 1 });
    db.leadAssignment.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'assignment-1',
        ...data,
      }),
    );
    db.autoAssignmentRule.findFirst.mockResolvedValue(rule);
    db.autoAssignmentRule.findUnique.mockResolvedValue(rule);
    db.autoAssignmentEvent.findFirst.mockResolvedValue(null);
    db.autoAssignmentEvent.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'event-1',
        ...data,
      }),
    );
    db.autoAssignmentEvent.update.mockResolvedValue({});
    db.autoAssignmentEvent.findUnique.mockImplementation(
      async () => (await db.autoAssignmentEvent.findMany())[0],
    );
    db.activity.count.mockResolvedValue(0);
    db.activity.create.mockResolvedValue({});
    db.followUp.count.mockResolvedValue(0);
    db.note.count.mockResolvedValue(0);
    db.callLog.count.mockResolvedValue(0);
    db.siteVisit.count.mockResolvedValue(0);
    db.booking.count.mockResolvedValue(0);
    db.notification.create.mockResolvedValue({ id: 'notification-1' });
    db.notification.update.mockResolvedValue({});
    db.auditLog.create.mockResolvedValue({});

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
    jest.spyOn(service, 'sendPushNotification').mockResolvedValue(undefined);
  });

  it('enrolls a manual field-executive assignment when it becomes primary ownership', async () => {
    jest.spyOn(service, 'getLead').mockResolvedValue(baseLead);

    await service.assignLead(
      baseLead.id,
      {
        toUserId: misbahId,
        assigneeType: 'field-executive',
        strategy: 'manual',
      },
      actorId,
    );

    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: baseLead.id },
      data: expect.objectContaining({
        ownerId: misbahId,
        fieldExecutiveId: misbahId,
      }),
    });
    expect(db.autoAssignmentEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ruleId: rule.id,
        leadId: baseLead.id,
        currentUserId: misbahId,
        currentStep: 0,
      }),
    });
  });

  it('does not enroll a secondary field executive as the primary route owner', async () => {
    const leadWithOwner = {
      ...baseLead,
      ownerId: afreenId,
      telecallerId: afreenId,
    };
    jest.spyOn(service, 'getLead').mockResolvedValue(leadWithOwner);
    db.lead.update.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...leadWithOwner,
        ...data,
      }),
    );

    await service.assignLead(
      baseLead.id,
      {
        toUserId: misbahId,
        assigneeType: 'field-executive',
        strategy: 'manual',
      },
      actorId,
    );

    expect(db.autoAssignmentEvent.create).not.toHaveBeenCalled();
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: baseLead.id },
      data: expect.objectContaining({
        ownerId: afreenId,
        telecallerId: afreenId,
        fieldExecutiveId: misbahId,
      }),
    });
  });

  it('rejects assigning a Sales Agent into the Pre Sales field before any writes', async () => {
    jest.spyOn(service, 'getLead').mockResolvedValue(baseLead);
    await expect(
      service.assignLead(
        baseLead.id,
        {
          toUserId: misbahId,
          assigneeType: 'telecaller',
          strategy: 'manual',
        },
        actorId,
      ),
    ).rejects.toThrow('Select an active Pre Sales user');
    expect(db.lead.update).not.toHaveBeenCalled();
    expect(db.leadAssignment.create).not.toHaveBeenCalled();
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit'])(
    'rejects a Sales Agent in Pre Sales on lead %s before any write',
    async (operation) => {
      jest.spyOn(service, 'getLead').mockResolvedValue(baseLead);
      const payload = {
        name: 'Customer',
        mobile: '9999999999',
        telecallerId: misbahId,
        fieldExecutiveId: misbahId,
      };
      const request =
        operation === 'create'
          ? service.createLead(payload, actorId)
          : service.updateLead(baseLead.id, payload, actorId);
      await expect(request).rejects.toThrow('Select an active Pre Sales user');
      expect(db.lead.update).not.toHaveBeenCalled();
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it('rejects a Telecaller in the Sales field', async () => {
    jest.spyOn(service, 'getLead').mockResolvedValue(baseLead);
    await expect(
      service.assignLead(
        baseLead.id,
        {
          toUserId: afreenId,
          assigneeType: 'field-executive',
          strategy: 'manual',
        },
        actorId,
      ),
    ).rejects.toThrow('Select an active Sales user');
    expect(db.lead.update).not.toHaveBeenCalled();
    expect(db.leadAssignment.create).not.toHaveBeenCalled();
  });

  it('allows assigning the owner to Pre Sales when that role was not yet assigned', async () => {
    jest
      .spyOn(service, 'getLead')
      .mockResolvedValue({ ...baseLead, ownerId: afreenId });
    await service.assignLead(
      baseLead.id,
      {
        toUserId: afreenId,
        assigneeType: 'telecaller',
        strategy: 'manual',
      },
      actorId,
    );
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: baseLead.id },
      data: expect.objectContaining({
        ownerId: afreenId,
        telecallerId: afreenId,
      }),
    });
  });

  it('still permits management ownership in a flexible automatic route', async () => {
    jest.spyOn(service, 'getLead').mockResolvedValue(baseLead);
    await service.assignLead(baseLead.id, {
      toUserId: actorId,
      assigneeType: 'telecaller',
      strategy: 'auto-assignment',
    });
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: baseLead.id },
      data: expect.objectContaining({
        ownerId: actorId,
        telecallerId: actorId,
      }),
    });
  });

  it('records the first Pre Sales assignment independently of the sales owner', async () => {
    const salesOwnedLead = {
      ...baseLead,
      ownerId: misbahId,
      fieldExecutiveId: misbahId,
    };
    jest.spyOn(service, 'getLead').mockResolvedValue(salesOwnedLead);

    await service.assignLead(
      baseLead.id,
      {
        toUserId: afreenId,
        assigneeType: 'telecaller',
        strategy: 'manual',
      },
      actorId,
    );

    expect(db.leadAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromUserId: null,
        toUserId: afreenId,
        assigneeType: 'telecaller',
      }),
    });
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: baseLead.id },
      data: expect.objectContaining({
        telecallerId: afreenId,
        fieldExecutiveId: misbahId,
      }),
    });
  });

  it('can explicitly assign the owner to an empty Pre Sales slot', async () => {
    jest.spyOn(service, 'getLead').mockResolvedValue({
      ...baseLead,
      ownerId: afreenId,
      fieldExecutiveId: misbahId,
    });

    await service.assignLead(
      baseLead.id,
      {
        toUserId: afreenId,
        assigneeType: 'telecaller',
        strategy: 'duplicate-assign',
      },
      actorId,
    );

    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: baseLead.id },
      data: expect.objectContaining({
        telecallerId: afreenId,
        fieldExecutiveId: misbahId,
      }),
    });
  });

  it('hands primary ownership from a sales agent to a telecaller', async () => {
    const assignedLead = {
      ...baseLead,
      ownerId: misbahId,
      fieldExecutiveId: misbahId,
    };
    jest.spyOn(service, 'getLead').mockResolvedValue(assignedLead);
    db.lead.findUnique.mockImplementation(
      async ({ select }: { select?: { updatedAt?: boolean } }) =>
        select?.updatedAt
          ? { updatedAt: assignedLead.updatedAt }
          : assignedLead,
    );
    db.autoAssignmentEvent.findMany.mockResolvedValue([
      {
        id: 'event-1',
        ruleId: rule.id,
        leadId: baseLead.id,
        currentUserId: misbahId,
        currentStep: 0,
        assignedAt,
        dueAt: new Date(assignedAt.getTime() + 60_000),
        status: 'ACTIVE',
        history: [{ userId: misbahId, assignedAt: assignedAt.toISOString() }],
      },
    ]);
    db.lead.update.mockImplementationOnce(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...assignedLead,
        ...data,
      }),
    );

    const result = await service.runAutoAssignmentTransfers();

    expect(result).toEqual({ processed: 1 });
    expect(db.lead.update).toHaveBeenCalledWith({
      where: { id: baseLead.id },
      data: expect.objectContaining({
        ownerId: afreenId,
        telecallerId: afreenId,
        fieldExecutiveId: null,
      }),
    });
    expect(db.leadAssignment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fromUserId: misbahId,
        toUserId: afreenId,
        assigneeType: 'telecaller',
        strategy: 'auto-transfer',
      }),
    });
    expect(db.autoAssignmentEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'event-1' },
        data: expect.objectContaining({
          currentUserId: afreenId,
          currentStep: 1,
        }),
      }),
    );
  });
});
