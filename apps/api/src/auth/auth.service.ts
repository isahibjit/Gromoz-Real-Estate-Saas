import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role, User } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomInt, randomUUID } from 'crypto';
import {
  decryptPassword,
  encryptPassword,
  isEncryptedPassword,
} from '../common/utils/cipher.util';

import {
  LoginOtpRequestSchema,
  LoginOtpVerifySchema,
  LoginSchema,
  workspaceIsAccessible,
  type AuthTokens,
  type LoginInput,
  type LoginOtpRequestInput,
  type LoginOtpRequestResponse,
  type LoginOtpVerifyInput,
  type LoginResponse,
} from '@truroot/shared';

import { PrismaService } from '../persistence/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AccessService } from '../access/access.service';
import { MailService } from '../hr/mail.service';
import { RealtimeService } from '../realtime/realtime.service';
import {
  AuthGuard,
  REDIS_KEY_DAILY_AUTO_LOGOUT_CUTOFF,
  REDIS_KEY_AUTH_DEACTIVATED_PREFIX,
} from './guards/auth.guard';
import { SmsService } from './sms.service';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_TOKEN_GRACE_SECONDS = 60;
const REFRESH_TOKEN_KEY_PREFIX = 'auth:refresh-token:';
const PREVIOUS_REFRESH_TOKEN_KEY_PREFIX = 'auth:previous-refresh-token:';
const LOGIN_OTP_TTL_SECONDS = 5 * 60;
const LOGIN_OTP_RESEND_SECONDS = 60;
const LOGIN_OTP_MAX_ATTEMPTS = 5;
const DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS = 3;
const REDIS_KEY_SECURITY_MAX_FAILED_ATTEMPTS =
  'security:max-failed-login-attempts';
const FAILED_LOGIN_ATTEMPTS_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const FAILED_LOGIN_KEY_PREFIX = 'auth:failed-attempts:';
const LOGIN_OTP_GENERIC_RESPONSE: LoginOtpRequestResponse = {
  success: true,
  message: 'If the account exists, an OTP has been sent.',
  expiresInSeconds: LOGIN_OTP_TTL_SECONDS,
  resendAfterSeconds: LOGIN_OTP_RESEND_SECONDS,
};

function normalizeLoginMobile(value: string): string {
  return value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly accessService: AccessService,
    private readonly smsService: SmsService,
    private readonly mailService: MailService,
    private readonly realtimeService: RealtimeService,
  ) {}

  async getSessionUser(userId: string): Promise<AuthTokens['user']> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        avatarStorageKey: true,
        isActive: true,
      },
    });

    if (!user?.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    const permissions = await this.accessService.getEffectivePermissions({
      id: user.id,
      role: user.role,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      image: user.avatarStorageKey,
      permissions,
    };
  }

  async login(
    dto: LoginInput,
    request?: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ): Promise<LoginResponse> {
    const credentials = LoginSchema.parse(dto);
    const email = credentials.email?.trim().toLowerCase();
    const mobile = credentials.mobile?.trim();
    const normalizedMobile = mobile ? normalizeLoginMobile(mobile) : null;
    const password = credentials.password;

    const user = email
      ? await this.prisma.user.findUnique({
          where: { email },
          include: {
            employeeProfile: {
              select: { phone: true, employeeCode: true, designation: true },
            },
            organizationMemberships: {
              where: { isActive: true },
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    setupFeePaid: true,
                    trialEndsAt: true,
                  },
                },
              },
            },
          },
        })
      : await this.findUserByLoginMobile(normalizedMobile);

    if (!user) {
      await this.createAuditEvent({
        action: 'LOGIN_FAILURE',
        entityType: 'USER',
        metadata: {
          email,
          mobile: normalizedMobile,
          reason: 'INVALID_CREDENTIALS',
        },
        request,
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await Promise.all([
        this.redisService
          .set(
            `${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}${user.id}`,
            '1',
            REFRESH_TOKEN_TTL_SECONDS,
          )
          .catch(() => undefined),
        this.clearRefreshToken(user.id).catch(() => undefined),
      ]);

      await this.createAuditEvent({
        action: 'LOGIN_FAILURE',
        actorUserId: user.id,
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          email: user.email,
          mobile: normalizedMobile,
          reason: 'ACCOUNT_DISABLED',
        },
        request,
      });

      throw new UnauthorizedException(
        'Your account is deactivated. Please contact an administrator to reactivate your ID.',
      );
    }

    if (user.role !== 'SUPER_ADMIN' && user.organizationMemberships?.length) {
      const hasActiveOrg = user.organizationMemberships.some((m) =>
        workspaceIsAccessible(m.organization),
      );

      if (!hasActiveOrg) {
        const pendingOrg = user.organizationMemberships[0]?.organization;
        if (
          pendingOrg?.status === 'SETUP_PENDING' ||
          !pendingOrg?.setupFeePaid
        ) {
          throw new UnauthorizedException(
            'Your organization setup payment is pending. Please complete payment to activate your workspace before logging in.',
          );
        }
        if (
          pendingOrg?.status === 'SUSPENDED' ||
          pendingOrg?.status === 'CANCELLED'
        ) {
          throw new UnauthorizedException(
            'Your organization workspace has been suspended or disabled. Please contact support.',
          );
        }
      }
    }

    let isPasswordValid = false;
    if (isEncryptedPassword(user.passwordHash)) {
      isPasswordValid = decryptPassword(user.passwordHash) === password;
    } else if (user.passwordHash?.startsWith('$argon2')) {
      isPasswordValid = await argon2.verify(user.passwordHash, password);
      if (isPasswordValid && user.role !== 'SUPER_ADMIN') {
        await this.prisma.user
          .update({
            where: { id: user.id },
            data: { passwordHash: encryptPassword(password) },
          })
          .catch(() => undefined);
      }
    } else {
      isPasswordValid = user.passwordHash === password;
    }

    if (!isPasswordValid) {
      const isAdminRole =
        user.role === Role.SUPER_ADMIN ||
        user.role === Role.ADMIN ||
        user.role === Role.BACKEND;

      if (isAdminRole) {
        await this.createAuditEvent({
          action: 'LOGIN_FAILURE',
          actorUserId: user.id,
          entityType: 'USER',
          entityId: user.id,
          metadata: {
            email: user.email,
            mobile: normalizedMobile,
            reason: 'INVALID_PASSWORD',
          },
          request,
        });

        throw new UnauthorizedException('Incorrect password.');
      }

      const maxAttempts = await this.getMaxFailedLoginAttempts();
      const failedCount = await this.recordFailedLoginAttempt(user.id);

      if (failedCount >= maxAttempts) {
        await this.handleAccountLockout(
          user,
          request,
          credentials.location,
          maxAttempts,
        );
        throw new UnauthorizedException(
          `Your account has been deactivated due to ${maxAttempts} consecutive failed login attempts. An administrator has been notified. Please contact an administrator to reactivate your ID.`,
        );
      }

      const remainingAttempts = maxAttempts - failedCount;

      await this.createAuditEvent({
        action: 'LOGIN_FAILURE',
        actorUserId: user.id,
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          email: user.email,
          mobile: normalizedMobile,
          reason: 'INVALID_PASSWORD',
          failedAttempts: failedCount,
          remainingAttempts,
          maxAttempts,
        },
        request,
      });

      if (remainingAttempts === 1) {
        throw new UnauthorizedException(
          'Incorrect password. Warning: 1 attempt remaining. Your account will be deactivated on the next failed attempt.',
        );
      }

      throw new UnauthorizedException(
        `Incorrect password. You have ${remainingAttempts} attempts remaining before your account is deactivated.`,
      );
    }

    // Password is valid - clear failed login attempts counter and remove deactivation flag
    await Promise.all([
      this.clearFailedLoginAttempts(user.id),
      this.redisService
        .del(`${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}${user.id}`)
        .catch(() => undefined),
    ]);

    await this.createAuditEvent({
      action: 'LOGIN_SUCCESS',
      actorUserId: user.id,
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        email: user.email,
        mobile: normalizedMobile,
        stage: 'PASSWORD_ACCEPTED',
      },
      request,
    });

    if (await this.isTwoFactorRequired(user)) {
      if (!user.employeeProfile?.phone?.trim()) {
        await this.createAuditEvent({
          action: 'LOGIN_OTP_REQUEST_IGNORED',
          actorUserId: user.id,
          entityType: 'USER',
          entityId: user.id,
          metadata: {
            email: user.email,
            reason: 'PHONE_NOT_FOUND_AFTER_PASSWORD',
          },
          request,
        });
        throw new BadRequestException(
          'OTP verification requires a registered employee phone number',
        );
      }

      const identifier = user.email;
      const timing = await this.createAndSendLoginOtp(
        user,
        { type: 'email', normalized: identifier },
        request,
        { passwordVerified: true },
      );

      await this.createAuditEvent({
        action: 'LOGIN_OTP_REQUIRED',
        actorUserId: user.id,
        entityType: 'USER',
        entityId: user.id,
        metadata: { email: user.email, role: user.role },
        request,
      });

      return {
        ...timing,
        requiresOtp: true,
        identifier,
        deliveryTarget: this.maskMobile(user.employeeProfile.phone),
      };
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    await this.markUserLoginSuccess(user.id);
    void this.sendLoginNotification(user, request, credentials.location).catch(
      (error) => {
        this.logger.warn(
          `Failed background login notification for user=${user.id}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      },
    );
    return tokens;
  }

  async requestLoginOtp(
    dto: LoginOtpRequestInput,
    request?: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ): Promise<LoginOtpRequestResponse> {
    const input = LoginOtpRequestSchema.parse(dto);
    const resolvedIdentifier = this.resolveLoginIdentifier(input.identifier);
    const user = await this.findUserByOtpIdentifier(resolvedIdentifier);

    if (!user || !user.isActive || !user.employeeProfile?.phone?.trim()) {
      await this.createAuditEvent({
        action: 'LOGIN_OTP_REQUEST_IGNORED',
        entityType: 'USER',
        metadata: {
          identifierType: resolvedIdentifier.type,
          reason: !user
            ? 'USER_NOT_FOUND'
            : !user.isActive
            ? 'ACCOUNT_DISABLED'
            : 'PHONE_NOT_FOUND',
        },
        request,
      });
      return LOGIN_OTP_GENERIC_RESPONSE;
    }

    const identifierHash = this.hashIdentifier(resolvedIdentifier.normalized);
    const existingPasswordChallenge =
      await this.prisma.loginOtpChallenge.findFirst({
        where: {
          userId: user.id,
          identifierHash,
          passwordVerified: true,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

    if (!existingPasswordChallenge) {
      await this.createAuditEvent({
        action: 'LOGIN_OTP_REQUEST_IGNORED',
        actorUserId: user.id,
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          identifierType: resolvedIdentifier.type,
          reason: 'PASSWORD_VERIFICATION_REQUIRED',
        },
        request,
      });
      return LOGIN_OTP_GENERIC_RESPONSE;
    }

    return this.createAndSendLoginOtp(user, resolvedIdentifier, request, {
      passwordVerified: true,
    });
  }

  async listTwoFactorRoleSettings() {
    const settings = await this.prisma.roleTwoFactorSetting.findMany();
    const enabledByRole = new Map(
      settings.map((setting) => [setting.role, setting.enabled]),
    );
    const roles = Object.values(Role).map((role) => ({
      role,
      enabled: enabledByRole.get(role) ?? false,
    }));

    return { data: roles };
  }

  async updateTwoFactorRoleSettings(body: unknown, actorUserId?: string) {
    const records = Array.isArray((body as { roles?: unknown })?.roles)
      ? (body as { roles: Array<{ role?: unknown; enabled?: unknown }> }).roles
      : [];

    const roles = records
      .map((record) => ({
        role: typeof record.role === 'string' ? record.role : '',
        enabled: record.enabled === true,
      }))
      .filter((record): record is { role: Role; enabled: boolean } =>
        Object.values(Role).includes(record.role as Role),
      );

    await this.prisma.$transaction(
      roles.map((record) =>
        this.prisma.roleTwoFactorSetting.upsert({
          where: { role: record.role },
          create: {
            role: record.role,
            enabled: record.enabled,
            updatedById: actorUserId ?? null,
          },
          update: {
            enabled: record.enabled,
            updatedById: actorUserId ?? null,
          },
        }),
      ),
    );

    await this.createAuditEvent({
      action: 'TWO_FACTOR_ROLE_SETTINGS_UPDATED',
      actorUserId: actorUserId ?? null,
      entityType: 'AUTH_SETTINGS',
      metadata: { roles },
    });

    return this.listTwoFactorRoleSettings();
  }

  async verifyLoginOtp(
    dto: LoginOtpVerifyInput,
    request?: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ): Promise<AuthTokens> {
    const input = LoginOtpVerifySchema.parse(dto);
    const resolvedIdentifier = this.resolveLoginIdentifier(input.identifier);
    const user = await this.findUserByOtpIdentifier(resolvedIdentifier);

    if (!user || !user.isActive) {
      await this.createAuditEvent({
        action: 'LOGIN_OTP_FAILURE',
        entityType: 'USER',
        metadata: {
          identifierType: resolvedIdentifier.type,
          reason: !user ? 'USER_NOT_FOUND' : 'ACCOUNT_DISABLED',
        },
        request,
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const identifierHash = this.hashIdentifier(resolvedIdentifier.normalized);
    const challenge = await this.prisma.loginOtpChallenge.findFirst({
      where: {
        userId: user.id,
        identifierHash,
        passwordVerified: true,
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      await this.createAuditEvent({
        action: 'LOGIN_OTP_FAILURE',
        actorUserId: user.id,
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          identifierType: resolvedIdentifier.type,
          reason: 'OTP_EXPIRED_OR_MISSING',
        },
        request,
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (challenge.attemptCount >= LOGIN_OTP_MAX_ATTEMPTS) {
      await this.createAuditEvent({
        action: 'LOGIN_OTP_FAILURE',
        actorUserId: user.id,
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          identifierType: resolvedIdentifier.type,
          reason: 'MAX_ATTEMPTS_EXCEEDED',
        },
        request,
      });
      throw new UnauthorizedException('Too many invalid OTP attempts');
    }

    const isValidOtp = await argon2.verify(challenge.otpHash, input.otp);
    if (!isValidOtp) {
      await this.prisma.loginOtpChallenge.update({
        where: { id: challenge.id },
        data: { attemptCount: { increment: 1 } },
      });
      await this.createAuditEvent({
        action: 'LOGIN_OTP_FAILURE',
        actorUserId: user.id,
        entityType: 'USER',
        entityId: user.id,
        metadata: {
          identifierType: resolvedIdentifier.type,
          reason: 'INVALID_OTP',
        },
        request,
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.prisma.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    });
    await this.createAuditEvent({
      action: 'LOGIN_SUCCESS',
      actorUserId: user.id,
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        email: user.email,
        identifierType: resolvedIdentifier.type,
        stage: 'OTP_ACCEPTED',
      },
      request,
    });

    if (user.role !== 'SUPER_ADMIN' && user.organizationMemberships?.length) {
      const hasActiveOrg = user.organizationMemberships.some((m) =>
        workspaceIsAccessible(m.organization),
      );

      if (!hasActiveOrg) {
        const pendingOrg = user.organizationMemberships[0]?.organization;
        if (
          pendingOrg?.status === 'SETUP_PENDING' ||
          !pendingOrg?.setupFeePaid
        ) {
          throw new UnauthorizedException(
            'Your organization setup payment is pending. Please complete payment to activate your workspace before logging in.',
          );
        }
        if (
          pendingOrg?.status === 'SUSPENDED' ||
          pendingOrg?.status === 'CANCELLED'
        ) {
          throw new UnauthorizedException(
            'Your organization workspace has been suspended or disabled. Please contact support.',
          );
        }
      }
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    await this.markUserLoginSuccess(user.id);
    void this.sendLoginNotification(user, request, input.location).catch(
      (error) => {
        this.logger.warn(
          `Failed background login notification for user=${user.id}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      },
    );
    return tokens;
  }

  private async findUserByLoginMobile(normalizedMobile: string | null) {
    if (!normalizedMobile) return null;
    const candidates = await this.prisma.user.findMany({
      where: { employeeProfile: { isNot: null } },
      include: {
        employeeProfile: {
          select: { phone: true, employeeCode: true, designation: true },
        },
        organizationMemberships: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                status: true,
                setupFeePaid: true,
                trialEndsAt: true,
              },
            },
          },
        },
      },
    });
    const matchedUsers = candidates.filter((candidate) => {
      const phone = candidate.employeeProfile?.phone;
      return typeof phone === 'string'
        ? normalizeLoginMobile(phone) === normalizedMobile
        : false;
    });
    return matchedUsers.length === 1 ? matchedUsers[0] : null;
  }

  private resolveLoginIdentifier(identifier: string): {
    type: 'email' | 'mobile';
    normalized: string;
  } {
    const trimmed = identifier.trim();
    if (trimmed.includes('@')) {
      return { type: 'email', normalized: trimmed.toLowerCase() };
    }

    return {
      type: 'mobile',
      normalized: normalizeLoginMobile(trimmed),
    };
  }

  private async findUserByOtpIdentifier(identifier: {
    type: 'email' | 'mobile';
    normalized: string;
  }) {
    if (identifier.type === 'email') {
      return this.prisma.user.findUnique({
        where: { email: identifier.normalized },
        include: {
          employeeProfile: { select: { phone: true } },
          organizationMemberships: {
            where: { isActive: true },
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  setupFeePaid: true,
                  trialEndsAt: true,
                },
              },
            },
          },
        },
      });
    }

    if (!identifier.normalized) return null;
    const candidates = await this.prisma.user.findMany({
      where: { employeeProfile: { isNot: null } },
      include: {
        employeeProfile: { select: { phone: true } },
        organizationMemberships: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                status: true,
                setupFeePaid: true,
                trialEndsAt: true,
              },
            },
          },
        },
      },
    });
    const matchedUsers = candidates.filter((candidate) => {
      const phone = candidate.employeeProfile?.phone;
      return typeof phone === 'string'
        ? normalizeLoginMobile(phone) === identifier.normalized
        : false;
    });
    return matchedUsers.length === 1 ? matchedUsers[0] : null;
  }

  private hashIdentifier(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private generateOtp(): string {
    return String(randomInt(0, 1000000)).padStart(6, '0');
  }

  private async isTwoFactorRequired(
    user: User & { employeeProfile?: { phone: string | null } | null },
  ): Promise<boolean> {
    if (user.twoFactorEnabled) return true;

    const roleSetting = await this.prisma.roleTwoFactorSetting.findUnique({
      where: { role: user.role },
      select: { enabled: true },
    });

    return roleSetting?.enabled === true;
  }

  private async createAndSendLoginOtp(
    user: User & { employeeProfile?: { phone: string | null } | null },
    resolvedIdentifier: { type: 'email' | 'mobile'; normalized: string },
    request?: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
    options: { passwordVerified?: boolean } = {},
  ): Promise<LoginOtpRequestResponse> {
    const identifierHash = this.hashIdentifier(resolvedIdentifier.normalized);
    const recentChallenge = await this.prisma.loginOtpChallenge.findFirst({
      where: {
        userId: user.id,
        identifierHash,
        passwordVerified: options.passwordVerified === true,
        usedAt: null,
        createdAt: {
          gt: new Date(Date.now() - LOGIN_OTP_RESEND_SECONDS * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentChallenge) {
      return LOGIN_OTP_GENERIC_RESPONSE;
    }

    const otp = this.generateOtp();
    const otpHash = await argon2.hash(otp);
    const { ip, userAgent } = this.getRequestMetadata(request);

    await this.prisma.$transaction([
      this.prisma.loginOtpChallenge.updateMany({
        where: {
          userId: user.id,
          identifierHash,
          passwordVerified: options.passwordVerified === true,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      }),
      this.prisma.loginOtpChallenge.create({
        data: {
          userId: user.id,
          identifierHash,
          otpHash,
          passwordVerified: options.passwordVerified === true,
          expiresAt: new Date(Date.now() + LOGIN_OTP_TTL_SECONDS * 1000),
          requestIp: ip,
          userAgent,
        },
      }),
    ]);

    await this.createAuditEvent({
      action: 'LOGIN_OTP_REQUESTED',
      actorUserId: user.id,
      entityType: 'USER',
      entityId: user.id,
      metadata: { identifierType: resolvedIdentifier.type },
      request,
    });

    try {
      await this.smsService.sendLoginOtp({
        mobile: user.employeeProfile?.phone ?? '',
        otp,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to send login OTP SMS for user=${user.id}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }

    return LOGIN_OTP_GENERIC_RESPONSE;
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        iat?: number;
      }>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const cutoff = await this.getGlobalLogoutCutoff();
      if (cutoff && payload.iat && payload.iat < cutoff) {
        throw new UnauthorizedException(
          'Daily session expired at 7:30 PM. Please log in again.',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException();
      }

      const [storedRefreshTokenHash, previousRefreshTokenHash] =
        await Promise.all([
          this.redisService
            .get(this.getRefreshTokenKey(user.id))
            .catch(() => null),
          this.redisService
            .get(this.getPreviousRefreshTokenKey(user.id))
            .catch(() => null),
        ]);

      if (storedRefreshTokenHash || previousRefreshTokenHash) {
        const isValidCurrentRefreshToken = storedRefreshTokenHash
          ? await argon2.verify(storedRefreshTokenHash, refreshToken)
          : false;
        const isValidPreviousRefreshToken =
          !isValidCurrentRefreshToken && previousRefreshTokenHash
            ? await argon2.verify(previousRefreshTokenHash, refreshToken)
            : false;

        if (!isValidCurrentRefreshToken && !isValidPreviousRefreshToken) {
          this.logger.warn(
            `[AuthService] Refresh token hash mismatch for user ${user.id}, issuing new pair`,
          );
        }
      }

      const tokens = await this.generateTokens(user);
      await this.storeRefreshToken(
        user.id,
        tokens.refreshToken,
        storedRefreshTokenHash ?? undefined,
      ).catch(() => undefined);

      return tokens;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      await this.clearRefreshToken(payload.sub);
    } catch {
      return;
    }
  }

  private async createAuditEvent(input: {
    action: string;
    actorUserId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    metadata?: Prisma.JsonValue;
    request?: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    };
  }): Promise<void> {
    const { ip, userAgent } = this.getRequestMetadata(input.request);

    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          action: input.action,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          metadata: input.metadata,
          ip,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write auth audit log for action=${input.action}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private getRequestMetadata(request?: {
    ip?: string;
    headers?: Record<string, string | string[] | undefined>;
  }) {
    const userAgent = request?.headers?.['user-agent'];

    return {
      ip: request?.ip ?? null,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent ?? null,
    };
  }

  private maskMobile(value: string | null | undefined): string {
    const digits = (value ?? '').replace(/\D/g, '');
    if (digits.length <= 4) return 'registered phone';

    return `registered phone ending ${digits.slice(-4)}`;
  }

  private async markUserLoginSuccess(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  private async sendLoginNotification(
    user: Pick<User, 'fullName' | 'email'>,
    request?: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
    deviceLocation?: LoginInput['location'],
  ): Promise<void> {
    const { ip } = this.getRequestMetadata(request);
    const location =
      deviceLocation &&
      typeof deviceLocation.latitude === 'number' &&
      typeof deviceLocation.longitude === 'number' &&
      typeof deviceLocation.accuracy === 'number'
        ? `Device-reported location: ${deviceLocation.latitude.toFixed(
            6,
          )}, ${deviceLocation.longitude.toFixed(
            6,
          )} (estimated accuracy: ${Math.ceil(
            deviceLocation.accuracy,
          )} metres). Map: https://www.google.com/maps?q=${
            deviceLocation.latitude
          },${deviceLocation.longitude}`
        : `Approximate location based on IP: ${await this.resolveLoginLocation(
            ip,
          )} (device location unavailable)`;

    await this.mailService.sendLoginNotification({
      name: user.fullName,
      email: user.email,
      ip,
      location,
      loggedInAt: new Date(),
    });
  }

  private async resolveLoginLocation(ip: string | null): Promise<string> {
    const normalizedIp = this.normalizeIpAddress(ip);
    if (!normalizedIp || !this.isPublicIpAddress(normalizedIp)) {
      return 'Unavailable (private or proxy address)';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch(`https://ipwho.is/${normalizedIp}`, {
        signal: controller.signal,
      });
      if (!response.ok) return 'Unavailable';

      const data: unknown = await response.json();
      if (!this.isIpLocationResponse(data) || data.success !== true) {
        return 'Unavailable';
      }

      const location = [data.city, data.region, data.country].filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      );
      return location.length > 0 ? location.join(', ') : 'Unavailable';
    } catch (error) {
      this.logger.warn(
        `Failed to resolve login location for IP ${normalizedIp}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return 'Unavailable';
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeIpAddress(ip: string | null): string | null {
    if (!ip) return null;
    const normalized = ip.trim().replace(/^::ffff:/i, '');
    return normalized || null;
  }

  private isPublicIpAddress(ip: string): boolean {
    if (ip.includes(':')) {
      const normalized = ip.toLowerCase();
      return !(
        normalized === '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd') ||
        normalized.startsWith('fe80:')
      );
    }

    const octets = ip.split('.').map(Number);
    if (
      octets.length !== 4 ||
      octets.some(
        (octet) => !Number.isInteger(octet) || octet < 0 || octet > 255,
      )
    ) {
      return false;
    }

    return !(
      octets[0] === 10 ||
      octets[0] === 127 ||
      octets[0] === 0 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168)
    );
  }

  private isIpLocationResponse(value: unknown): value is {
    success: boolean;
    city?: unknown;
    region?: unknown;
    country?: unknown;
  } {
    return typeof value === 'object' && value !== null && 'success' in value;
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
    previousRefreshTokenHash?: string,
  ): Promise<void> {
    const refreshTokenHash = await argon2.hash(refreshToken);
    await Promise.all([
      this.redisService.set(
        this.getRefreshTokenKey(userId),
        refreshTokenHash,
        REFRESH_TOKEN_TTL_SECONDS,
      ),
      previousRefreshTokenHash
        ? this.redisService.set(
            this.getPreviousRefreshTokenKey(userId),
            previousRefreshTokenHash,
            REFRESH_TOKEN_GRACE_SECONDS,
          )
        : this.redisService.del(this.getPreviousRefreshTokenKey(userId)),
    ]);
  }

  private async clearRefreshToken(userId: string): Promise<void> {
    await Promise.all([
      this.redisService.del(this.getRefreshTokenKey(userId)),
      this.redisService.del(this.getPreviousRefreshTokenKey(userId)),
    ]);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload = {
      ...payload,
      tokenUse: 'refresh',
      jti: randomUUID(),
    };
    const permissions = await this.accessService.getEffectivePermissions({
      id: user.id,
      role: user.role,
    });

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '8h',
    });
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        image: user.avatarStorageKey,
        permissions,
      },
    };
  }

  private getRefreshTokenKey(userId: string): string {
    return `${REFRESH_TOKEN_KEY_PREFIX}${userId}`;
  }

  private getPreviousRefreshTokenKey(userId: string): string {
    return `${PREVIOUS_REFRESH_TOKEN_KEY_PREFIX}${userId}`;
  }

  private getFailedAttemptsKey(userId: string): string {
    return `${FAILED_LOGIN_KEY_PREFIX}${userId}`;
  }

  private async recordFailedLoginAttempt(userId: string): Promise<number> {
    const key = this.getFailedAttemptsKey(userId);
    try {
      const attempts = await this.redisService.incr(key);
      if (attempts === 1) {
        await this.redisService.expire(key, FAILED_LOGIN_ATTEMPTS_TTL_SECONDS);
      }
      return attempts;
    } catch (error) {
      this.logger.warn(
        `Failed to record failed login attempt in Redis for user=${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return 1;
    }
  }

  async clearFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.redisService.del(this.getFailedAttemptsKey(userId));
    } catch (error) {
      this.logger.warn(
        `Failed to clear failed login attempts in Redis for user=${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async getMaxFailedLoginAttempts(): Promise<number> {
    try {
      const raw = await this.redisService.get(
        REDIS_KEY_SECURITY_MAX_FAILED_ATTEMPTS,
      );
      if (!raw) return DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS;
      const parsed = parseInt(raw, 10);
      if (Number.isInteger(parsed) && parsed >= 3 && parsed <= 10) {
        return parsed;
      }
      return DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS;
    } catch (error) {
      this.logger.warn(
        `Failed to retrieve max failed login attempts from Redis: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS;
    }
  }

  async getGlobalLogoutCutoff(): Promise<number | null> {
    const cached = AuthGuard.getCutoff();
    if (cached !== null) return cached;
    try {
      const val = await this.redisService.get(
        REDIS_KEY_DAILY_AUTO_LOGOUT_CUTOFF,
      );
      const parsed = val ? Number(val) : null;
      if (parsed) AuthGuard.setCutoff(parsed);
      return parsed;
    } catch {
      return null;
    }
  }

  async executeDailyAutoLogout(
    actorUserId?: string,
    reason = 'Daily 7:30 PM scheduled auto-logout',
  ): Promise<{
    success: boolean;
    cutoffTimestamp: number;
    clearedTokensCount: number;
  }> {
    const cutoffTimestamp = Math.floor(Date.now() / 1000);

    // 1. Set global cutoff in Redis and in-memory guard
    await this.redisService.set(
      REDIS_KEY_DAILY_AUTO_LOGOUT_CUTOFF,
      cutoffTimestamp.toString(),
    );
    AuthGuard.setCutoff(cutoffTimestamp);

    // 2. Invalidate all active refresh tokens in Redis
    let clearedTokensCount = 0;
    try {
      const client = this.redisService.getClient();
      const keys = await client.keys(`${REFRESH_TOKEN_KEY_PREFIX}*`);
      const prevKeys = await client.keys(
        `${PREVIOUS_REFRESH_TOKEN_KEY_PREFIX}*`,
      );
      const allKeys = [...keys, ...prevKeys];
      if (allKeys.length > 0) {
        clearedTokensCount = await client.del(...allKeys);
      }
    } catch (err) {
      this.logger.error(
        `Error clearing refresh tokens during auto-logout: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    // 3. Broadcast realtime logout event to all connected Web and Mobile WebSocket clients
    try {
      this.realtimeService.broadcastSessionExpired(
        'Daily session expired at 7:30 PM. Please log in again.',
      );
    } catch (err) {
      this.logger.warn(
        `Failed to broadcast realtime session expiration: ${
          err instanceof Error ? err.message : err
        }`,
      );
    }

    // 4. Audit Log
    await this.createAuditEvent({
      action: 'DAILY_AUTO_LOGOUT_EXECUTED',
      actorUserId: actorUserId || null,
      entityType: 'SYSTEM_SETTINGS',
      metadata: {
        reason,
        cutoffTimestamp,
        clearedTokensCount,
        executedAt: new Date().toISOString(),
      },
    });

    this.logger.log(
      `Daily auto-logout executed successfully at cutoff ${cutoffTimestamp}. Cleared ${clearedTokensCount} active refresh tokens.`,
    );

    return {
      success: true,
      cutoffTimestamp,
      clearedTokensCount,
    };
  }

  async getSecuritySettings(): Promise<{
    maxFailedLoginAttempts: number;
    dailyAutoLogout: {
      enabled: boolean;
      scheduledTime: string;
      timezone: string;
      lastCutoff: number | null;
    };
    data: {
      maxFailedLoginAttempts: number;
      dailyAutoLogout: {
        enabled: boolean;
        scheduledTime: string;
        timezone: string;
        lastCutoff: number | null;
      };
    };
  }> {
    const maxFailedLoginAttempts = await this.getMaxFailedLoginAttempts();
    const lastCutoff = await this.getGlobalLogoutCutoff();
    const dailyAutoLogout = {
      enabled: true,
      scheduledTime: '19:30',
      timezone: 'Asia/Kolkata',
      lastCutoff,
    };
    return {
      maxFailedLoginAttempts,
      dailyAutoLogout,
      data: { maxFailedLoginAttempts, dailyAutoLogout },
    };
  }

  async updateSecuritySettings(
    dto: { maxFailedLoginAttempts: number },
    actorUserId?: string,
  ): Promise<{
    success: boolean;
    maxFailedLoginAttempts: number;
    data: { maxFailedLoginAttempts: number };
  }> {
    const value = Number(dto.maxFailedLoginAttempts);
    if (!Number.isInteger(value) || value < 3 || value > 10) {
      throw new BadRequestException(
        'Maximum failed login attempts must be an integer between 3 and 10.',
      );
    }

    await this.redisService.set(
      REDIS_KEY_SECURITY_MAX_FAILED_ATTEMPTS,
      value.toString(),
    );

    await this.createAuditEvent({
      action: 'SECURITY_SETTINGS_UPDATED',
      actorUserId,
      entityType: 'SYSTEM_SETTINGS',
      metadata: {
        maxFailedLoginAttempts: value,
      },
    });

    return {
      success: true,
      maxFailedLoginAttempts: value,
      data: { maxFailedLoginAttempts: value },
    };
  }

  private async handleAccountLockout(
    user: User & {
      employeeProfile?: {
        phone?: string | null;
        employeeCode?: string | null;
        designation?: string | null;
      } | null;
    },
    request?: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
    deviceLocation?: LoginInput['location'],
    maxAttempts: number = DEFAULT_MAX_FAILED_LOGIN_ATTEMPTS,
  ): Promise<void> {
    if (
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.ADMIN ||
      user.role === Role.BACKEND
    ) {
      return;
    }

    const { ip } = this.getRequestMetadata(request);
    const location =
      deviceLocation &&
      typeof deviceLocation.latitude === 'number' &&
      typeof deviceLocation.longitude === 'number'
        ? `Device-reported location: ${deviceLocation.latitude.toFixed(
            6,
          )}, ${deviceLocation.longitude.toFixed(6)}`
        : `Approximate location based on IP: ${await this.resolveLoginLocation(
            ip,
          )}`;

    // 1. Deactivate user account, clear refresh tokens, mark deactivated in Redis, and deactivate mobile tokens
    await Promise.all([
      this.prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      }),
      this.clearRefreshToken(user.id),
      this.clearFailedLoginAttempts(user.id),
      this.redisService
        .set(
          `${REDIS_KEY_AUTH_DEACTIVATED_PREFIX}${user.id}`,
          '1',
          REFRESH_TOKEN_TTL_SECONDS,
        )
        .catch(() => undefined),
      this.prisma.mobileDeviceToken
        ?.updateMany?.({
          where: { userId: user.id },
          data: { isActive: false },
        })
        ?.catch(() => undefined),
    ]);

    this.realtimeService.emitUserSessionExpired(
      user.id,
      `Your account has been deactivated due to ${maxAttempts} consecutive failed login attempts. Please contact an administrator.`,
    );

    // 2. Write Audit Log
    await this.createAuditEvent({
      action: 'ACCOUNT_DEACTIVATED_FAILED_ATTEMPTS',
      actorUserId: user.id,
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        email: user.email,
        role: user.role,
        employeeCode: user.employeeProfile?.employeeCode ?? null,
        failedAttempts: maxAttempts,
        location,
      },
      request,
    });

    // 3. Create tenant-owned in-app notifications for the user's workspace admins.
    try {
      const memberships = await this.prisma.organizationMember.findMany({
        where: { userId: user.id, isActive: true },
        select: { organizationId: true },
      });
      const organizationIds = [
        ...new Set(memberships.map(({ organizationId }) => organizationId)),
      ];
      const userName = user.fullName || user.email;

      // Shared identities are quarantined from tenant workspaces until their
      // legacy global HR profile is split into tenant-owned records.
      for (const organizationId of organizationIds.length === 1
        ? organizationIds
        : []) {
        const admins = await this.prisma.organizationMember.findMany({
          where: {
            organizationId,
            isActive: true,
            OR: [{ isOwner: true }, { role: Role.ADMIN }],
            user: {
              isActive: true,
              role: { not: Role.SUPER_ADMIN },
              organizationMemberships: {
                none: { organizationId: { not: organizationId } },
              },
            },
          },
          select: { userId: true },
        });

        if (admins.length > 0) {
          await this.prisma.notification.createMany({
            data: admins.map((admin) => ({
              organizationId,
              userId: admin.userId,
              type: 'SECURITY_ALERT',
              title: 'Security Alert: User Account Deactivated',
              badge: 'Security',
              message: `Account for ${userName} (${user.email}) was automatically deactivated after ${maxAttempts} failed login attempts.`,
              details: {
                userId: user.id,
                email: user.email,
                role: user.role,
                employeeCode: user.employeeProfile?.employeeCode ?? null,
                ip,
                location,
                reason: 'EXCESSIVE_FAILED_LOGINS',
                maxAttempts,
                lockedAt: new Date().toISOString(),
              },
            })),
          });
        }
      }
    } catch (notifError) {
      this.logger.warn(
        `Failed to create in-app lockout notification: ${
          notifError instanceof Error ? notifError.message : 'unknown error'
        }`,
      );
    }

    // 4. Send Email Alert via MailService (background)
    void this.mailService
      .sendAccountLockedAlert({
        name: user.fullName || user.email,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeProfile?.employeeCode ?? null,
        ip,
        location,
        lockedAt: new Date(),
        failedAttempts: maxAttempts,
      })
      .catch((emailError) => {
        this.logger.warn(
          `Failed background account locked email alert: ${
            emailError instanceof Error ? emailError.message : 'unknown error'
          }`,
        );
      });
  }
}
