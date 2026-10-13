import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { LeadSourceConnectionsService } from './lead-source-connections.service';

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
});
