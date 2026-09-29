import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest, Response } from 'express';
import {
  LoginOtpRequestSchema,
  LoginOtpVerifySchema,
  LoginSchema,
} from '@truroot/shared';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const authSettingsRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'SALES_MANAGER',
] as const;
type AuthenticatedRequest = ExpressRequest & { user?: { sub?: string } };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      ttl: 600000,
      limit: 5,
    },
  })
  async login(
    @Body() dto: unknown,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const credentials = LoginSchema.parse(dto);
    const result = await this.authService.login(credentials, {
      ip: req.ip,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });

    if ('accessToken' in result && 'refreshToken' in result) {
      this.setAuthCookies(response, result.accessToken, result.refreshToken);
    }

    return result;
  }

  @Get('session')
  @UseGuards(AuthGuard)
  async getSession(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.sub;
    if (!userId) throw new UnauthorizedException();

    return this.authService.getSessionUser(userId);
  }

  @Get('two-factor-settings')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...authSettingsRoles)
  async listTwoFactorRoleSettings() {
    return this.authService.listTwoFactorRoleSettings();
  }

  @Patch('two-factor-settings')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(...authSettingsRoles)
  async updateTwoFactorRoleSettings(
    @Body() dto: unknown,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.updateTwoFactorRoleSettings(dto, req.user?.sub);
  }

  @Get('security-settings')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async getSecuritySettings() {
    return this.authService.getSecuritySettings();
  }

  @Patch('security-settings')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async updateSecuritySettings(
    @Body() dto: { maxFailedLoginAttempts: number },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.authService.updateSecuritySettings(dto, req.user?.sub);
  }

  @Post('trigger-daily-auto-logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async triggerDailyAutoLogout(@Req() req: AuthenticatedRequest) {
    return this.authService.executeDailyAutoLogout(
      req.user?.sub,
      'Manual trigger by administrator via API',
    );
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      ttl: 600000,
      limit: 5,
    },
  })
  async requestLoginOtp(@Body() dto: unknown, @Req() req: ExpressRequest) {
    const payload = LoginOtpRequestSchema.parse(dto);
    return this.authService.requestLoginOtp(payload, {
      ip: req.ip,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      ttl: 600000,
      limit: 10,
    },
  })
  async verifyLoginOtp(
    @Body() dto: unknown,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const payload = LoginOtpVerifySchema.parse(dto);
    const result = await this.authService.verifyLoginOtp(payload, {
      ip: req.ip,
      headers: req.headers as Record<string, string | string[] | undefined>,
    });

    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      ttl: 60000,
      limit: 100,
    },
  })
  async refresh(
    @Body() body: unknown,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      req.cookies?.refreshToken ?? this.extractRefreshToken(body);
    if (!refreshToken) throw new UnauthorizedException();

    const result = await this.authService.refreshTokens(refreshToken);
    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      ttl: 60000,
      limit: 20,
    },
  })
  async logout(
    @Body() body: unknown,
    @Req() req: ExpressRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      req.cookies?.refreshToken ?? this.extractRefreshToken(body);
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    response.cookie('accessToken', '', {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    response.cookie('refreshToken', '', {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return { success: true };
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: this.isProduction(),
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private extractRefreshToken(body: unknown): string | undefined {
    if (!body || typeof body !== 'object' || !('refreshToken' in body)) {
      return undefined;
    }

    const refreshToken = (body as { refreshToken?: unknown }).refreshToken;
    return typeof refreshToken === 'string' && refreshToken.trim()
      ? refreshToken
      : undefined;
  }
}
