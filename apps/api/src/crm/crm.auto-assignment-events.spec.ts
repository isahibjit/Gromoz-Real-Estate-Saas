import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import { CrmService } from './crm.service';
import { AutoAssignmentController } from './crm.controllers';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';

describe('Auto-assignment activity display metadata', () => {
  const db = {
    autoAssignmentEvent: { findMany: jest.fn(), count: jest.fn() },
    lead: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };
  const visibility = { resolveAssignmentScope: jest.fn() };
  let service: CrmService;
  const event = {
    id: 'event',
    leadId: 'lead-id',
    currentUserId: 'user-id',
    status: 'EXHAUSTED',
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    db.autoAssignmentEvent.findMany.mockResolvedValue([
      event,
      { ...event, id: 'second-event' },
    ]);
    db.autoAssignmentEvent.count.mockResolvedValue(707);
    db.lead.findMany.mockResolvedValue([
      { id: 'lead-id', name: 'Customer name', displayId: 'TR000764' },
    ]);
    db.user.findMany.mockResolvedValue([{ id: 'user-id', fullName: 'Afreen' }]);
    visibility.resolveAssignmentScope.mockResolvedValue(null);
    const module = await Test.createTestingModule({
      providers: [
        ...referenceTenantProviders(),
        CrmService,
        { provide: PrismaService, useValue: db },
        { provide: RealtimeService, useValue: {} },
        { provide: LeadVisibilityService, useValue: visibility },
      ],
    }).compile();
    service = module.get(CrmService);
  });

  it('enriches a page in batches, retaining IDs, progress, and pagination for compatibility', async () => {
    const result = await service.listAutoAssignmentEvents({
      page: '2',
      limit: '8',
    });
    expect(result.meta).toEqual({ page: 2, limit: 8, total: 707 });
    expect(result.data[0]).toMatchObject({
      ...event,
      leadName: 'Customer name',
      leadDisplayId: 'TR000764',
      currentUserName: 'Afreen',
    });
    expect(db.autoAssignmentEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 8, take: 8 }),
    );
    expect(db.lead.findMany).toHaveBeenCalledTimes(1);
    expect(db.lead.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['lead-id'] }, deletedAt: null },
      select: { id: true, name: true, displayId: true },
    });
    expect(db.user.findMany).toHaveBeenCalledTimes(1);
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['user-id'] } },
      select: { id: true, fullName: true },
    });
  });

  it('does not expose names for deleted, missing, or outside-scope leads', async () => {
    const scope = { ownerId: { in: ['permitted-user'] } };
    const actor = { sub: 'manager', role: 'MANAGER' };
    visibility.resolveAssignmentScope.mockResolvedValue(scope);
    db.lead.findMany.mockResolvedValue([]);
    const result = await service.listAutoAssignmentEvents({}, actor);
    expect(visibility.resolveAssignmentScope).toHaveBeenCalledWith(actor);
    expect(db.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['lead-id'] }, deletedAt: null, AND: [scope] },
      }),
    );
    expect(result.data[0]).toMatchObject({
      leadName: null,
      leadDisplayId: null,
      currentUserName: null,
    });
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it('missing assignees keep a nullable name without changing event data', async () => {
    db.user.findMany.mockResolvedValue([]);
    const result = await service.listAutoAssignmentEvents({});
    expect(result.data[0]).toMatchObject({
      currentUserId: 'user-id',
      currentUserName: null,
      leadName: 'Customer name',
    });
  });

  it('does not issue reference queries for an empty page', async () => {
    db.autoAssignmentEvent.findMany.mockResolvedValue([]);
    const result = await service.listAutoAssignmentEvents({});
    expect(result.data).toEqual([]);
    expect(db.lead.findMany).not.toHaveBeenCalled();
    expect(db.user.findMany).not.toHaveBeenCalled();
  });

  it('the existing secured controller forwards its authenticated viewer', async () => {
    const spy = jest
      .spyOn(service, 'listAutoAssignmentEvents')
      .mockResolvedValue({ data: [], meta: { page: 1, limit: 10, total: 0 } });
    const user = { sub: 'manager', role: 'MANAGER' };
    await new AutoAssignmentController(service).listEvents(
      { limit: '8' },
      { user },
    );
    expect(spy).toHaveBeenCalledWith({ limit: '8' }, user);
  });
});
