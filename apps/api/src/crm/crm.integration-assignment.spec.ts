import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { Test } from '@nestjs/testing';
import { CrmService } from './crm.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';

interface AutomationMethods {
  createAutoAssignmentEventForLead: (
    lead: object,
    teamId?: string,
  ) => Promise<unknown>;
  syncAutoAssignmentEventForAssignee: (
    lead: object,
    userId: string,
  ) => Promise<unknown>;
}
describe('Integration lead assignment policy', () => {
  let service: CrmService;
  const db = {
    $transaction: jest.fn(),
    lead: { create: jest.fn() },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
    },
    organizationMember: { findMany: jest.fn() },
    activity: { create: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  let automatic: jest.SpyInstance;
  let explicitEnrollment: jest.SpyInstance;
  const payload = {
    displayId: 'TRFIXTURE',
    name: 'Fixture lead',
    mobile: '0000000000',
  };
  beforeEach(async () => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(
      async (work: (tx: typeof db) => Promise<unknown>) => work(db),
    );
    db.lead.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'lead',
        ...data,
      }),
    );
    db.user.findUnique.mockResolvedValue({
      id: 'operator',
      isActive: true,
      role: 'ADMIN',
    });
    db.user.findMany.mockResolvedValue([
      { id: 'presales', role: 'TELECALLER' },
      { id: 'sales', role: 'SALES_AGENT' },
    ]);
    db.user.count.mockResolvedValue(1);
    db.organizationMember.findMany.mockResolvedValue([
      { organizationId: 'tenant-a' },
    ]);
    db.auditLog.create.mockResolvedValue({});
    db.activity.create.mockResolvedValue({});
    const module = await Test.createTestingModule({
      providers: [
        ...referenceTenantProviders(),
        CrmService,
        { provide: PrismaService, useValue: db },
        {
          provide: RealtimeService,
          useValue: { enqueueLeadCreated: async () => undefined },
        },
        {
          provide: LeadVisibilityService,
          useValue: { resolveAssignmentScopeUserIds: async () => null },
        },
      ],
    }).compile();
    service = module.get(CrmService);
    const automation = service as unknown as AutomationMethods;
    automatic = jest
      .spyOn(automation, 'createAutoAssignmentEventForLead')
      .mockResolvedValue(null);
    explicitEnrollment = jest
      .spyOn(automation, 'syncAutoAssignmentEventForAssignee')
      .mockResolvedValue(null);
  });
  it.each([
    'MagicBricks',
    'Housing.com',
    '99Acres',
    'Meta Ads',
    'Website',
    'Other platform',
  ])(
    'keeps %s integration leads unassigned with no route',
    async (sourceId) => {
      const lead = await service.createLead(
        { ...payload, sourceId },
        undefined,
        { fromIntegration: true },
      );
      expect(lead.ownerId).toBeUndefined();
      expect(lead.telecallerId).toBeUndefined();
      expect(lead.fieldExecutiveId).toBeUndefined();
      expect(automatic).not.toHaveBeenCalled();
      expect(explicitEnrollment).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['2026-10-01T09:15:00+05:30', '2026-10-01T03:45:00.000Z'],
    ['2026-10-01T09:15', '2026-10-01T03:45:00.000Z'],
    ['2026-10-01', '2026-09-30T18:30:00.000Z'],
  ])(
    'persists the chosen added date %s separately from assignment dates',
    async (createdAt, expected) => {
      const lead = await service.createLead(
        { ...payload, createdAt },
        { role: 'ADMIN' },
      );
      expect(lead.createdAt).toEqual(new Date(expected));
      expect(lead.assignedAt).toBeUndefined();
      expect(lead.nextFollowUpAt).toBeUndefined();
    },
  );

  it('keeps the database current-time default when no added date is supplied', async () => {
    await service.createLead(payload, { role: 'ADMIN' });
    expect(db.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ createdAt: undefined }),
      }),
    );
  });

  it('preserves provider-supplied Date timestamps', async () => {
    const createdAt = new Date('2026-10-01T03:45:00.000Z');
    const lead = await service.createLead(
      { ...payload, createdAt },
      undefined,
      { fromIntegration: true },
    );
    expect(lead.createdAt).toEqual(createdAt);
  });

  it.each([null, '', 'invalid-date', '2026-02-30T09:15', 123, new Date(NaN)])(
    'rejects an invalid added date before writes: %s',
    async (createdAt) => {
      await expect(
        service.createLead({ ...payload, createdAt }),
      ).rejects.toMatchObject({
        status: 400,
        message: 'Valid lead added date and time is required',
      });
      expect(db.$transaction).not.toHaveBeenCalled();
      expect(db.lead.create).not.toHaveBeenCalled();
    },
  );
  it.each(['SUPER_ADMIN', 'TELECALLER', 'SALES_AGENT'])(
    'does not assign an imported lead to the %s operator implicitly',
    async (role) => {
      const lead = await service.createLead(
        payload,
        { sub: 'operator', role },
        { fromIntegration: true },
      );
      expect(lead.ownerId).toBeUndefined();
      expect(lead.telecallerId).toBeUndefined();
      expect(lead.fieldExecutiveId).toBeUndefined();
      expect(automatic).not.toHaveBeenCalled();
    },
  );
  it.each([
    { ownerId: 'rajesh' },
    { telecallerId: 'presales' },
    { fieldExecutiveId: 'sales' },
  ])(
    'preserves direct overrides without starting rotation: %j',
    async (assignment) => {
      const lead = await service.createLead(
        { ...payload, ...assignment, autoAssignmentTeamId: 'team' },
        undefined,
        { fromIntegration: true },
      );
      expect(lead).toMatchObject(assignment);
      expect(automatic).not.toHaveBeenCalled();
      expect(explicitEnrollment).not.toHaveBeenCalled();
    },
  );
  it('uses automation only when an integration has a configured team', async () => {
    await service.createLead(
      { ...payload, autoAssignmentTeamId: 'team' },
      undefined,
      { fromIntegration: true },
    );
    expect(automatic).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead' }),
      'team',
    );
    expect(explicitEnrollment).not.toHaveBeenCalled();
  });
  it('preserves explicitly configured Meta form automatic assignment', async () => {
    await service.createLead(payload, undefined, {
      fromIntegration: true,
      useConfiguredAutomation: true,
    });
    expect(automatic).toHaveBeenCalledTimes(1);
  });
  it('preserves ordinary manual-create automatic assignment', async () => {
    await service.createLead(payload);
    expect(automatic).toHaveBeenCalledTimes(1);
  });
  it('preserves ordinary manual explicit-assignment enrollment', async () => {
    await service.createLead({ ...payload, ownerId: 'rajesh' });
    expect(explicitEnrollment).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: 'rajesh' }),
      'rajesh',
    );
  });
});
