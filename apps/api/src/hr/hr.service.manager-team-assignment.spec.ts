import { BadRequestException } from '@nestjs/common';

import { HrService } from './hr.service';

type TransactionClient = {
  user: { findUnique: jest.Mock };
  employeeProfile: {
    findMany: jest.Mock;
    updateMany: jest.Mock;
  };
  team: { findMany: jest.Mock };
};

type ManagerTeamAssignmentHarness = {
  tenants: { organizationId: string; employeeWhere: () => { organizationMemberships: { some: { organizationId: string } } } };
  prisma: {
    $transaction: (
      operation: (transaction: TransactionClient) => Promise<void>,
    ) => Promise<void>;
  };
  applyManagerTeamAssignments: (
    managerUserId: string,
    teamIds: unknown,
  ) => Promise<void>;
};

function createHarness(transaction: TransactionClient) {
  const service = Object.create(
    HrService.prototype,
  ) as ManagerTeamAssignmentHarness;
  service.prisma = {
    $transaction: async (operation) => operation(transaction),
  };
  service.tenants = {
    organizationId: 'tenant-a',
    employeeWhere: () => ({ organizationMemberships: { some: { organizationId: 'tenant-a' } } }),
  };
  return service;
}

describe('HrService manager team assignment', () => {
  it('assigns selected Team Leaders and removes deselected team relationships', async () => {
    const transaction: TransactionClient = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'manager-1',
          role: 'MANAGER',
        }),
      },
      employeeProfile: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: 'leader-old',
            user: { ledTeams: [{ id: 'team-old' }] },
          },
          {
            userId: 'leader-kept',
            user: { ledTeams: [{ id: 'team-kept' }] },
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'team-kept',
            name: 'Kept Team',
            isActive: true,
            leaderId: 'leader-kept',
            leader: {
              id: 'leader-kept',
              role: 'TEAM_LEADER',
              isActive: true,
              employeeProfile: { userId: 'leader-kept' },
            },
          },
          {
            id: 'team-new',
            name: 'New Team',
            isActive: true,
            leaderId: 'leader-new',
            leader: {
              id: 'leader-new',
              role: 'TEAM_LEADER',
              isActive: true,
              employeeProfile: { userId: 'leader-new' },
            },
          },
        ]),
      },
    };
    const service = createHarness(transaction);

    await service.applyManagerTeamAssignments('manager-1', [
      'team-kept',
      'team-new',
    ]);
    expect(transaction.team.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['team-kept', 'team-new'] }, organizationId: 'tenant-a' },
    }));

    expect(transaction.employeeProfile.updateMany).toHaveBeenNthCalledWith(1, {
      where: { userId: { in: ['leader-old'] } },
      data: { reportingToId: null },
    });
    expect(transaction.employeeProfile.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: { in: ['leader-kept', 'leader-new'] } },
      data: { reportingToId: 'manager-1' },
    });
  });

  it('rejects a team that does not have an active Team Leader', async () => {
    const transaction: TransactionClient = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'manager-1',
          role: 'MANAGER',
        }),
      },
      employeeProfile: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
      team: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'team-without-leader',
            name: 'Unassigned Team',
            isActive: true,
            leaderId: null,
            leader: null,
          },
        ]),
      },
    };
    const service = createHarness(transaction);

    await expect(
      service.applyManagerTeamAssignments('manager-1', ['team-without-leader']),
    ).rejects.toEqual(
      new BadRequestException(
        'Unassigned Team must have an active Team Leader before it can be assigned to a Manager',
      ),
    );
    expect(transaction.employeeProfile.updateMany).not.toHaveBeenCalled();
  });
});
