import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const request = {
    headers: { authorization: 'Bearer valid-token' },
    cookies: {},
  };
  const context = {
    getHandler: jest.fn(() => 'handler'),
    getClass: jest.fn(() => 'controller'),
    switchToHttp: jest.fn(() => ({ getRequest: () => request })),
  } as unknown as ExecutionContext;

  function createGuard(role: string, requiredRoles: string[]) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    };
    const jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', role }),
    };
    return new RolesGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
    );
  }

  it('allows a role included by the endpoint', async () => {
    const guard = createGuard('MANAGER', ['ADMIN', 'MANAGER']);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request).toHaveProperty('user.role', 'MANAGER');
  });

  it('enforces the endpoint role list even when another guard handles permissions', async () => {
    const guard = createGuard('MANAGER', ['SUPER_ADMIN', 'ADMIN']);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
