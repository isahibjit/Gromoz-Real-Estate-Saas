import { BadRequestException } from '@nestjs/common';

import { HrService } from './hr.service';

type TeamLeaderAssignmentHarness = {
  assertTeamLeaderAssignment: (role: string, teamId: string | null) => void;
};

const createHarness = () =>
  Object.create(HrService.prototype) as TeamLeaderAssignmentHarness;

describe('HrService Team Leader assignment', () => {
  it('requires a team for the Team Leader role', () => {
    const service = createHarness();

    expect(() =>
      service.assertTeamLeaderAssignment('TEAM_LEADER', null),
    ).toThrow(
      new BadRequestException('Team Leader must be assigned to an active team'),
    );
  });

  it('rejects a team leadership assignment for another role', () => {
    const service = createHarness();

    expect(() =>
      service.assertTeamLeaderAssignment('MANAGER', 'team-1'),
    ).toThrow(
      new BadRequestException(
        'Only an employee with the Team Leader role can lead a team',
      ),
    );
  });

  it('accepts a Team Leader with an assigned team', () => {
    const service = createHarness();

    expect(() =>
      service.assertTeamLeaderAssignment('TEAM_LEADER', 'team-1'),
    ).not.toThrow();
  });
});
