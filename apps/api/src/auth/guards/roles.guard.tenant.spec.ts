import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { PERMISSION_METADATA_KEY } from '../../common/decorators/require-permission.decorator';

describe('RolesGuard tenant role preservation', () => {
  const jwt = { verifyAsync: jest.fn() };
  const reflector = { getAllAndOverride: jest.fn() };
  let guard: RolesGuard;

  beforeEach(async () => {
    jest.resetAllMocks();
    jwt.verifyAsync.mockResolvedValue({ sub: 'user-1', role: 'SUPER_ADMIN' });
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === 'roles' ? ['ADMIN', 'SUPER_ADMIN'] : undefined,
    );
    const module = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: JwtService, useValue: jwt },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();
    guard = module.get(RolesGuard);
  });

  const request = () => ({
    headers: { authorization: 'Bearer test-token' },
    user: { sub: 'user-1', role: 'SALES_AGENT' },
    tenant: {
      organizationId: 'tenant-a',
      userId: 'user-1',
      role: 'SALES_AGENT',
    },
  });

  it('cannot restore global admin rights after tenant resolution', async () => {
    const req = request();
    await expect(
      guard.canActivate(new ExecutionContextHost([req])),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(req.user.role).toBe('SALES_AGENT');
  });

  it('passes the tenant role to the following permission guard', async () => {
    const req = request();
    reflector.getAllAndOverride.mockImplementation((key: string) =>
      key === PERMISSION_METADATA_KEY ? { moduleKey: 'employees' } : undefined,
    );
    await expect(
      guard.canActivate(new ExecutionContextHost([req])),
    ).resolves.toBe(true);
    expect(req.user.role).toBe('SALES_AGENT');
  });

  it('rejects a tenant context belonging to a different identity', async () => {
    const req = request();
    req.tenant.userId = 'other-user';
    await expect(
      guard.canActivate(new ExecutionContextHost([req])),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
