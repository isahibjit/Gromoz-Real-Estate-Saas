import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';

export const REDIS_KEY_DAILY_AUTO_LOGOUT_CUTOFF =
  'auth:security:daily-auto-logout-cutoff';
export const REDIS_KEY_AUTH_DEACTIVATED_PREFIX = 'auth:deactivated:';

@Injectable()
export class AuthGuard implements CanActivate {
  private static cachedCutoff: number | null = null;
  private static cachedAt = 0;

  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  static setCutoff(cutoff: number) {
    AuthGuard.cachedCutoff = cutoff;
    AuthGuard.cachedAt = Date.now();
  }

  static getCutoff(): number | null {
    return AuthGuard.cachedCutoff;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub?: string;
        role?: string;
        iat?: number;
      }>(token);

      const cutoff = await this.getOrFetchCutoff();
      if (cutoff && payload.iat && payload.iat < cutoff) {
        throw new UnauthorizedException(
          'Daily session expired at 7:30 PM. Please log in again.',
        );
      }

      if (payload.sub) {
        const isDeactivated = await this.redisService.get(
          `${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}${payload.sub}`,
        );
        if (isDeactivated) {
          throw new UnauthorizedException(
            'Your account has been deactivated. Please contact an administrator.',
          );
        }
      }

      // We assign the payload to the request object here
      // so that we can access it in our route handlers
      request['user'] = payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException();
    }
    return true;
  }

  private async getOrFetchCutoff(): Promise<number | null> {
    const now = Date.now();
    if (now - AuthGuard.cachedAt < 15_000) {
      return AuthGuard.cachedCutoff;
    }

    try {
      const val = await this.redisService.get(
        REDIS_KEY_DAILY_AUTO_LOGOUT_CUTOFF,
      );
      AuthGuard.cachedCutoff = val ? Number(val) : null;
      AuthGuard.cachedAt = now;
    } catch {
      // Retain cached value if redis access errors
    }
    return AuthGuard.cachedCutoff;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    // Check Authorization header first
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer') return token;

    // Fallback to cookies (since we set HttpOnly cookies in verify2fa)
    return request.cookies?.accessToken;
  }
}
