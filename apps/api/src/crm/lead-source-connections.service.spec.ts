import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  assertValidRoutingAssignees,
  LeadSourceConnectionsService,
} from './lead-source-connections.service';

describe('LeadSourceConnectionsService routing', () => {
  const account = {
    id: 'account-1',
    name: 'Primary account',
    provider: 'magicbricks',
    archivedAt: null,
    isPrimary: true,
  };
  const db = {
    leadSourceConnection: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    project: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    user: { findMany: jest.fn() },
    integrationRoutingRule: { upsert: jest.fn() },
    auditLog: { create: jest.fn() },
  };
  let service: LeadSourceConnectionsService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.leadSourceConnection.findFirst.mockResolvedValue(account);
    db.project.findFirst.mockResolvedValue({ id: 'project-1' });
    db.team.findFirst.mockResolvedValue({ id: 'team-1' });
    db.auditLog.create.mockResolvedValue({});
    db.integrationRoutingRule.upsert.mockResolvedValue({ id: 'routing-1' });
    service = new LeadSourceConnectionsService(
      db as never,
      referenceTenantProviders()[0].useValue as never,
      referenceTenantProviders()[1].useValue as never,
    );
  });

  it('stores one active Pre Sales override as a direct account route', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'telecaller-1', role: Role.TELECALLER },
    ]);

    await service.saveRouting(
      'magicbricks',
      account.id,
      {
        projectId: 'project-1',
        teamId: 'team-1',
        telecallerId: 'telecaller-1',
      },
      'admin-1',
    );

    expect(db.integrationRoutingRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { connectionId: account.id },
        create: expect.objectContaining({
          connectionId: account.id,
          projectId: 'project-1',
          teamId: 'team-1',
          telecallerId: 'telecaller-1',
          fieldExecutiveId: null,
          assignmentMode: 'DIRECT',
        }),
      }),
    );
  });

  it.each(['magicbricks', 'housing'] as const)(
    'persists Rajesh as owner, not an executive, for %s',
    async (provider) => {
      db.user.findMany.mockResolvedValue([
        { id: 'rajesh', role: Role.SUPER_ADMIN },
      ]);
      await service.saveRouting(provider, account.id, { ownerId: 'rajesh' });
      expect(db.integrationRoutingRule.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            ownerId: 'rajesh',
            telecallerId: null,
            fieldExecutiveId: null,
            assignmentMode: 'DIRECT',
          }),
          update: expect.objectContaining({
            ownerId: 'rajesh',
            assignmentMode: 'DIRECT',
          }),
        }),
      );
    },
  );
  it('stores cleared assignment routes as unassigned and clears every person slot', async () => {
    await service.saveRouting('magicbricks', account.id, {
      projectId: 'project-1',
    });
    expect(db.integrationRoutingRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          ownerId: null,
          telecallerId: null,
          fieldExecutiveId: null,
          teamId: null,
          assignmentMode: 'UNASSIGNED',
        }),
      }),
    );
  });
  it('preserves an explicitly selected team route', async () => {
    await service.saveRouting('housing', account.id, { teamId: 'team-1' });
    expect(db.integrationRoutingRule.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          teamId: 'team-1',
          assignmentMode: 'TEAM_AUTO',
        }),
      }),
    );
  });
  it.each([
    { ownerId: 'rajesh', telecallerId: 'tc' },
    { ownerId: 'rajesh', fieldExecutiveId: 'sales' },
  ])(
    'rejects mixed owner/executive overrides without writes: %j',
    async (body) => {
      await expect(
        service.saveRouting('magicbricks', account.id, body),
      ).rejects.toThrow('Select exactly one person');
      expect(db.integrationRoutingRule.upsert).not.toHaveBeenCalled();
    },
  );
  it.each([
    { users: [] },
    { users: [{ id: 'rajesh', role: Role.SALES_AGENT }] },
  ])('rejects missing/inactive or wrong-role owners', async ({ users }) => {
    db.user.findMany.mockResolvedValue(users);
    await expect(
      service.saveRouting('magicbricks', account.id, { ownerId: 'rajesh' }),
    ).rejects.toThrow('Select an active owner user');
    expect(db.integrationRoutingRule.upsert).not.toHaveBeenCalled();
  });

  it('rejects management users and leaves the saved route unchanged', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'manager-1', role: Role.MANAGER },
    ]);

    await expect(
      service.saveRouting('housing', account.id, {
        telecallerId: 'manager-1',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        message: 'Select an active Pre Sales user',
      }),
    });

    expect(db.integrationRoutingRule.upsert).not.toHaveBeenCalled();
  });

  it('rejects two direct users before changing routing', async () => {
    await expect(
      service.saveRouting('magicbricks', account.id, {
        telecallerId: 'telecaller-1',
        fieldExecutiveId: 'sales-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(db.integrationRoutingRule.upsert).not.toHaveBeenCalled();
  });

  it('allows both canonical executive fields for a lead without relaxing portal routing', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'telecaller-1', role: Role.TELECALLER },
      { id: 'sales-1', role: Role.SALES_AGENT },
    ]);
    await expect(
      assertValidRoutingAssignees(
        db as never,
        'telecaller-1',
        'sales-1',
        undefined,
        { allowBothExecutives: true },
      ),
    ).resolves.toBeUndefined();
    expect(db.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['telecaller-1', 'sales-1'] }, isActive: true },
      select: { id: true, role: true },
    });
  });
});
