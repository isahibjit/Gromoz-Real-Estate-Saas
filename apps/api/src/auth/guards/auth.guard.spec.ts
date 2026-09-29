import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, REDIS_KEY_AUTH_DEACTIVATED_PREFIX } from './auth.guard';
import { RedisService } from '../../redis/redis.service';

describe('AuthGuard - Account Deactivation', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let redisService: jest.Mocked<Partial<RedisService>>;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    redisService = {
      get: jest.fn().mockResolvedValue(null),
    };
    guard = new AuthGuard(
      jwtService as unknown as JwtService,
      redisService as unknown as RedisService,
    );
  });

  function createMockContext(token = 'valid-token'): ExecutionContext {
    const request = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('allows request when user is active and token is valid', async () => {
    jwtService.verifyAsync!.mockResolvedValue({
      sub: 'user-123',
      role: 'SALES_AGENT',
      iat: Math.floor(Date.now() / 1000),
    });
    redisService.get!.mockResolvedValue(null);

    const context = createMockContext();
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(redisService.get).toHaveBeenCalledWith(
      `${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}user-123`,
    );
  });

  it('rejects with 401 when user account is deactivated in Redis', async () => {
    jwtService.verifyAsync!.mockResolvedValue({
      sub: 'user-123',
      role: 'SALES_AGENT',
      iat: Math.floor(Date.now() / 1000),
    });
    redisService.get!.mockImplementation(async (key: string) => {
      if (key === `${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}user-123`) {
        return '1';
      }
      return null;
    });

    const context = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException(
        'Your account has been deactivated. Please contact an administrator.',
      ),
    );
  });
});
