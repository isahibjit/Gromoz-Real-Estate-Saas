import { BadRequestException } from '@nestjs/common';

import { HrService } from './hr.service';

describe('HrService punch out', () => {
  it('rejects punch out before reading attendance when the selfie is missing', async () => {
    const service = Object.create(HrService.prototype) as HrService;

    await expect(
      service.punchOut({}, { sub: 'employee-1', role: 'SALES_AGENT' }),
    ).rejects.toEqual(
      new BadRequestException(
        'Capture and confirm your selfie before punching out',
      ),
    );
  });
});
