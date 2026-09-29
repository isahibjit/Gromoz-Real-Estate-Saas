import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

import type { AccessService } from './access.service';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard punch permissions', () => {
  const request = {
    method: 'POST',
    user: { sub: 'employee-1', role: 'SALES_AGENT' },
  };
  const context = {
    getHandler: jest.fn(() => 'handler'),
    getClass: jest.fn(() => 'controller'),
    switchToHttp: jest.fn(() => ({ getRequest: () => request })),
  } as unknown as ExecutionContext;

  function createGuard(allowed: boolean) {
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
      get: jest
        .fn()
        .mockReturnValueOnce({ moduleKey: 'attendance', action: 'punchIn' })
        .mockReturnValueOnce({ moduleKey: 'attendance', action: 'view' }),
    };
    const hasPermission = jest.fn().mockResolvedValue(allowed);
    const access = { hasPermission };
    return {
      guard: new PermissionGuard(
        reflector as unknown as Reflector,
        access as unknown as AccessService,
      ),
      hasPermission,
    };
  }

  it('authorizes the explicit punch-in action', async () => {
    const { guard, hasPermission } = createGuard(true);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(
      request.user,
      'attendance',
      'punchIn',
    );
  });

  it('rejects a direct punch-in request without permission', async () => {
    const { guard } = createGuard(false);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
