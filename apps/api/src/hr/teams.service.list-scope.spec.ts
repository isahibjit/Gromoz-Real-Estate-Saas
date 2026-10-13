import { referenceTenantProviders } from '../../test/reference-tenant-providers';
import { TeamsService } from './teams.service';

type TeamFindManyArgs = { where: Record<string, any> };

describe('TeamsService.listTeams scope', () => {
  const makeService = (teamFindMany: jest.Mock) => {
    const service = Object.create(TeamsService.prototype) as TeamsService;
    (
      service as unknown as { prisma: { team: { findMany: jest.Mock } } }
    ).prisma = { team: { findMany: teamFindMany } };
    Object.assign(service, { tenants: referenceTenantProviders()[0].useValue });
    return service;
  };

  it('returns all teams for an admin (empty where)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = makeService(findMany);

    await service.listTeams({ sub: 'admin-1', role: 'ADMIN' });

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].where).toEqual({
      AND: [{}, { organizationId: 'tenant-a' }],
    });
  });

  it('scopes a Manager to teams in their reporting hierarchy', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = makeService(findMany);

    await service.listTeams({ sub: 'mgr-1', role: 'MANAGER' });

    const where = (findMany.mock.calls[0][0] as TeamFindManyArgs).where.AND[0];
    expect(where.isActive).toBe(true);
    expect(where.OR).toEqual(
      expect.arrayContaining([
        {
          members: {
            some: {
              user: { employeeProfile: { reportingToId: 'mgr-1' } },
            },
          },
        },
        {
          leader: { employeeProfile: { reportingToId: 'mgr-1' } },
        },
        { leaderId: 'mgr-1' },
      ]),
    );
  });

  it('returns the manager team when the DB matches the hierarchy clause', async () => {
    const managedTeam = {
      id: 'team-1',
      name: 'Team A',
      leaderId: 'tl-1',
      members: [{ userId: 'rep-1' }],
    };
    const findMany = jest.fn().mockResolvedValue([managedTeam]);
    const service = makeService(findMany);

    const result = await service.listTeams({ sub: 'mgr-1', role: 'MANAGER' });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: 'team-1', name: 'Team A' });
  });
});
