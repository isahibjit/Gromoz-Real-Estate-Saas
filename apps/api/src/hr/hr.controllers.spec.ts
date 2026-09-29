import 'reflect-metadata';

import {
  PERMISSION_METADATA_KEY,
  SKIP_PERMISSION_METADATA_KEY,
} from '../common/decorators/require-permission.decorator';
import { AttendanceController } from './hr.controllers';
import type { HrService } from './hr.service';

describe('AttendanceController permissions', () => {
  it('requires the punch-in permission for punch in', () => {
    expect(
      Reflect.getMetadata(
        PERMISSION_METADATA_KEY,
        AttendanceController.prototype.punchIn,
      ),
    ).toEqual({ moduleKey: 'attendance', action: 'punchIn' });
    expect(
      Reflect.getMetadata(
        SKIP_PERMISSION_METADATA_KEY,
        AttendanceController.prototype.punchIn,
      ),
    ).toBeUndefined();
  });

  it('requires the punch-out permission for punch out', () => {
    expect(
      Reflect.getMetadata(
        PERMISSION_METADATA_KEY,
        AttendanceController.prototype.punchOut,
      ),
    ).toEqual({ moduleKey: 'attendance', action: 'punchOut' });
    expect(
      Reflect.getMetadata(
        SKIP_PERMISSION_METADATA_KEY,
        AttendanceController.prototype.punchOut,
      ),
    ).toBeUndefined();
  });

  it('forwards the punch-out selfie payload to the service', () => {
    const punchOut = jest.fn();
    const controller = new AttendanceController({
      punchOut,
    } as unknown as HrService);
    const body = { checkOutImageUrl: 'https://example.test/punch-out.jpg' };

    controller.punchOut(body, {
      user: { sub: 'employee-1', role: 'SALES_AGENT' },
    });

    expect(punchOut).toHaveBeenCalledWith(body, {
      sub: 'employee-1',
      role: 'SALES_AGENT',
    });
  });
});
