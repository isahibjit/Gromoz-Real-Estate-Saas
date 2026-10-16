import 'reflect-metadata';

import {
  PERMISSION_METADATA_KEY,
  SKIP_PERMISSION_METADATA_KEY,
} from '../common/decorators/require-permission.decorator';
import { AttendanceController, PayrollController } from './hr.controllers';
import { TenantGuard } from '../common/tenant/tenant.guard';
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

describe('PayrollController access', () => {
  it('resolves the tenant before role and permission checks', () => {
    const guards = Reflect.getMetadata('__guards__', PayrollController);
    expect(guards.map((guard: { name: string }) => guard.name)).toEqual([
      'AuthGuard',
      TenantGuard.name,
      'RolesGuard',
      'PermissionGuard',
    ]);
  });

  it('permits employee reads but retains administrator roles for processing', () => {
    expect(
      Reflect.getMetadata('roles', PayrollController.prototype.list),
    ).toEqual(expect.arrayContaining(['SALES_AGENT', 'TELECALLER']));
    for (const method of [
      'run',
      'updateDraft',
      'finalize',
      'pay',
      'updateSettings',
    ] as const) {
      const roles = Reflect.getMetadata(
        'roles',
        PayrollController.prototype[method],
      );
      expect(roles).not.toEqual(expect.arrayContaining(['SALES_AGENT']));
      expect(roles).not.toEqual(expect.arrayContaining(['TELECALLER']));
      expect(
        Reflect.getMetadata(
          PERMISSION_METADATA_KEY,
          PayrollController.prototype[method],
        ),
      ).toEqual({
        moduleKey: 'payroll',
        action: method === 'run' ? 'create' : 'update',
      });
    }
  });
});
