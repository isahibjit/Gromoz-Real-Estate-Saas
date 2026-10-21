import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';

import { AuthService } from './auth.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AccessService } from '../access/access.service';
import { SmsService } from './sms.service';
import { MailService } from '../hr/mail.service';
import { RealtimeService } from '../realtime/realtime.service';

describe('AuthService - Brute Force Protection & Account Lockout', () => {
  let service: AuthService;
  let prisma: jest.Mocked<any>;
  let redis: jest.Mocked<any>;
  let mailService: jest.Mocked<any>;

  const mockUser = {
    id: 'user-123',
    email: 'agent@truroot.in',
    passwordHash: '',
    fullName: 'Test Agent',
    role: Role.SALES_AGENT,
    isActive: true,
    twoFactorEnabled: false,
    employeeProfile: {
      phone: '9876543210',
      employeeCode: 'EMP-00101',
      designation: 'Sales Agent',
    },
  };

  beforeAll(async () => {
    mockUser.passwordHash = await argon2.hash('CorrectPassword123!');
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      loginOtpChallenge: { findFirst: jest.fn(), update: jest.fn() },
      organizationMember: {
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      notification: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      roleTwoFactorSetting: {
        findUnique: jest.fn().mockResolvedValue({ enabled: false }),
      },
      mobileDeviceToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    redis = {
      incr: jest.fn(),
      expire: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      getClient: jest.fn(),
    };

    mailService = {
      sendLoginNotification: jest.fn().mockResolvedValue(undefined),
      sendAccountLockedAlert: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key) => {
              if (key === 'JWT_ACCESS_SECRET') return 'secret';
              if (key === 'JWT_REFRESH_SECRET') return 'refresh_secret';
              return 'test';
            }),
            get: jest.fn(() => null),
          },
        },
        { provide: RedisService, useValue: redis },
        {
          provide: AccessService,
          useValue: {
            getEffectivePermissions: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: SmsService,
          useValue: { sendLoginOtp: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: MailService, useValue: mailService },
        {
          provide: RealtimeService,
          useValue: {
            broadcastSessionExpired: jest.fn(),
            emitUserSessionExpired: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('warns user with 2 remaining attempts on first failed password attempt', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    redis.incr.mockResolvedValue(1);

    await expect(
      service.login({ email: mockUser.email, password: 'WrongPassword!' }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Incorrect password. You have 2 attempts remaining before your account is deactivated.',
      ),
    );

    expect(redis.incr).toHaveBeenCalledWith(
      `auth:failed-attempts:${mockUser.id}`,
    );
    expect(redis.expire).toHaveBeenCalledWith(
      `auth:failed-attempts:${mockUser.id}`,
      86400,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(mailService.sendAccountLockedAlert).not.toHaveBeenCalled();
  });

  it('never deactivates or locks out admin accounts on failed password attempts', async () => {
    const adminUser = { ...mockUser, role: Role.SUPER_ADMIN };
    prisma.user.findUnique.mockResolvedValue(adminUser);

    await expect(
      service.login({ email: adminUser.email, password: 'WrongPassword!' }),
    ).rejects.toThrow(new UnauthorizedException('Incorrect password.'));

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it('warns user with 1 remaining attempt on second failed password attempt', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    redis.incr.mockResolvedValue(2);

    await expect(
      service.login({ email: mockUser.email, password: 'WrongPassword!' }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Incorrect password. Warning: 1 attempt remaining. Your account will be deactivated on the next failed attempt.',
      ),
    );

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(mailService.sendAccountLockedAlert).not.toHaveBeenCalled();
  });

  it('automatically deactivates account and alerts admins on 3rd failed password attempt', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });
    prisma.organizationMember.findMany
      .mockResolvedValueOnce([{ organizationId: 'organization-1' }])
      .mockResolvedValueOnce([{ userId: 'admin-1' }]);
    redis.incr.mockResolvedValue(3);

    await expect(
      service.login({
        email: mockUser.email,
        password: 'WrongPassword!',
        location: { latitude: 19.076, longitude: 72.8777, accuracy: 10 },
      }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Your account has been deactivated due to 3 consecutive failed login attempts. An administrator has been notified. Please contact an administrator to reactivate your ID.',
      ),
    );

    // 1. User updated to inactive in database
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUser.id },
      data: { isActive: false },
    });

    // 2. Refresh token revoked and failed counter reset
    expect(redis.del).toHaveBeenCalledWith(`auth:refresh-token:${mockUser.id}`);
    expect(redis.del).toHaveBeenCalledWith(
      `auth:failed-attempts:${mockUser.id}`,
    );

    // 3. In-app notification created for Admins
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          organizationId: 'organization-1',
          userId: 'admin-1',
          type: 'SECURITY_ALERT',
          title: 'Security Alert: User Account Deactivated',
          badge: 'Security',
        }),
      ]),
    });

    // 4. Email alert dispatched to Admins
    expect(mailService.sendAccountLockedAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: mockUser.fullName,
        email: mockUser.email,
        role: mockUser.role,
        employeeCode: mockUser.employeeProfile.employeeCode,
        failedAttempts: 3,
      }),
    );
  });

  it('blocks login immediately when account is already deactivated', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...mockUser,
      isActive: false,
    });

    await expect(
      service.login({ email: mockUser.email, password: 'CorrectPassword123!' }),
    ).rejects.toThrow(
      new UnauthorizedException(
        'Your account is deactivated. Please contact an administrator to reactivate your ID.',
      ),
    );

    expect(redis.incr).not.toHaveBeenCalled();
  });

  it('resets failed attempt counter upon successful login', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.login({
      email: mockUser.email,
      password: 'CorrectPassword123!',
    });

    expect(result).toHaveProperty('accessToken');
    expect(redis.del).toHaveBeenCalledWith(
      `auth:failed-attempts:${mockUser.id}`,
    );
  });

  describe('Tenant login alerts', () => {
    const headers = { 'x-organization-id': 'tenant-a' };
    const ownerWorkspace = { id: 'tenant-a', workspaceSettingsJson: {}, memberships: [{ user: { email: 'owner-a@example.test' } }] };
    async function signIn(requestHeaders: Record<string, string> = headers) {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(mockUser);
      await service.login({ email: mockUser.email, password: 'CorrectPassword123!' }, { ip: '127.0.0.1', headers: requestHeaders });
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    it('routes a successful login to the selected tenant owner', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([{ organization: ownerWorkspace }]);
      await signIn();
      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'tenant-a', userId: mockUser.id, isActive: true }) }));
      expect(mailService.sendLoginNotification).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner-a@example.test', organizationId: 'tenant-a' }));
    });
    it('resolves a slug and checks active membership before sending', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([{ organization: ownerWorkspace }]);
      await signIn({ 'x-tenant-slug': 'tenant-a' });
      expect(prisma.organizationMember.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organization: { slug: 'tenant-a' } }) }));
      expect(mailService.sendLoginNotification).toHaveBeenCalledTimes(1);
    });
    it('sends once after successful OTP verification', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser); prisma.user.update.mockResolvedValue(mockUser);
      prisma.organizationMember.findMany.mockResolvedValue([{ organization: ownerWorkspace }]);
      prisma.loginOtpChallenge.findFirst.mockResolvedValue({ id: 'challenge', otpHash: await argon2.hash('123456'), expiresAt: new Date(Date.now() + 60000), attemptCount: 0 });
      await service.verifyLoginOtp({ identifier: mockUser.email, otp: '123456' }, { ip: '127.0.0.1', headers });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(mailService.sendLoginNotification).toHaveBeenCalledTimes(1);
      expect(mailService.sendLoginNotification).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner-a@example.test', organizationId: 'tenant-a' }));
    });
    it('honors the tenant toggle', async () => {
      prisma.organizationMember.findMany.mockResolvedValue([{ organization: { ...ownerWorkspace, workspaceSettingsJson: { preferences: { loginAlertsEnabled: false } } } }]);
      await signIn();
      expect(mailService.sendLoginNotification).not.toHaveBeenCalled();
    });
    it.each([{ memberships: [] }, { memberships: [{ organization: ownerWorkspace }, { organization: ownerWorkspace }] }])('skips missing or ambiguous membership', async ({ memberships }) => {
      prisma.organizationMember.findMany.mockResolvedValue(memberships);
      await signIn();
      expect(mailService.sendLoginNotification).not.toHaveBeenCalled();
    });
    it('does not guess a recipient for platform login with no tenant', async () => {
      await signIn({});
      expect(mailService.sendLoginNotification).not.toHaveBeenCalled();
      expect(prisma.organizationMember.findMany).not.toHaveBeenCalled();
    });
    it('does not notify for conflicting tenant headers', async () => {
      await signIn({ ...headers, 'x-tenant-id': 'tenant-b' });
      expect(mailService.sendLoginNotification).not.toHaveBeenCalled();
    });
  });

  describe('Configurable Lockout Threshold', () => {
    it('uses dynamic threshold from Redis (e.g., 5 attempts)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      redis.get.mockResolvedValue('5');
      redis.incr.mockResolvedValue(1);

      await expect(
        service.login({ email: mockUser.email, password: 'WrongPassword!' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Incorrect password. You have 4 attempts remaining before your account is deactivated.',
        ),
      );

      expect(redis.get).toHaveBeenCalledWith(
        'security:max-failed-login-attempts',
      );
    });

    it('locks account at configured threshold (5 attempts)', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, isActive: false });
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-1', role: Role.ADMIN, email: 'admin@truroot.in' },
      ]);
      redis.get.mockResolvedValue('5');
      redis.incr.mockResolvedValue(5);

      await expect(
        service.login({ email: mockUser.email, password: 'WrongPassword!' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Your account has been deactivated due to 5 consecutive failed login attempts. An administrator has been notified. Please contact an administrator to reactivate your ID.',
        ),
      );

      expect(mailService.sendAccountLockedAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          failedAttempts: 5,
        }),
      );
    });

    it('getSecuritySettings returns maxFailedLoginAttempts from Redis or default 3', async () => {
      redis.get.mockResolvedValueOnce(null);
      const defaultSettings = await service.getSecuritySettings();
      expect(defaultSettings.maxFailedLoginAttempts).toBe(3);

      redis.get.mockResolvedValueOnce('7');
      const updatedSettings = await service.getSecuritySettings();
      expect(updatedSettings.maxFailedLoginAttempts).toBe(7);
    });

    it('updateSecuritySettings saves valid threshold and emits audit event', async () => {
      const res = await service.updateSecuritySettings(
        { maxFailedLoginAttempts: 6 },
        'admin-user-id',
      );

      expect(res.success).toBe(true);
      expect(res.maxFailedLoginAttempts).toBe(6);
      expect(redis.set).toHaveBeenCalledWith(
        'security:max-failed-login-attempts',
        '6',
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'SECURITY_SETTINGS_UPDATED',
            actorUserId: 'admin-user-id',
            entityType: 'SYSTEM_SETTINGS',
          }),
        }),
      );
    });

    it('updateSecuritySettings throws BadRequestException for out-of-bounds values', async () => {
      await expect(
        service.updateSecuritySettings({ maxFailedLoginAttempts: 2 }),
      ).rejects.toThrow(
        'Maximum failed login attempts must be an integer between 3 and 10.',
      );

      await expect(
        service.updateSecuritySettings({ maxFailedLoginAttempts: 11 }),
      ).rejects.toThrow(
        'Maximum failed login attempts must be an integer between 3 and 10.',
      );
    });
  });

  describe('Daily 7:30 PM Auto-Logout', () => {
    it('executes auto-logout, sets cutoff in redis, clears refresh tokens, and broadcasts socket event', async () => {
      const mockClient = {
        keys: jest
          .fn()
          .mockResolvedValue([
            'auth:refresh-token:user-1',
            'auth:refresh-token:user-2',
          ]),
        del: jest.fn().mockResolvedValue(2),
      };
      redis.getClient.mockReturnValue(mockClient);

      const result = await service.executeDailyAutoLogout(
        'SYSTEM_CRON',
        'Scheduled test',
      );

      expect(result.success).toBe(true);
      expect(result.clearedTokensCount).toBe(2);
      expect(redis.set).toHaveBeenCalledWith(
        'auth:security:daily-auto-logout-cutoff',
        expect.any(String),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DAILY_AUTO_LOGOUT_EXECUTED',
            actorUserId: 'SYSTEM_CRON',
          }),
        }),
      );
    });

    it('rejects refresh token issued before global logout cutoff', async () => {
      const pastIat = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const currentCutoff = Math.floor(Date.now() / 1000) - 1800; // 30 min ago
      redis.get.mockResolvedValueOnce(currentCutoff.toString());

      const jwtService = (service as any).jwtService;
      jwtService.verifyAsync = jest.fn().mockResolvedValue({
        sub: 'user-123',
        iat: pastIat,
      });

      await expect(service.refreshTokens('old-token')).rejects.toThrow(
        new UnauthorizedException(
          'Daily session expired at 7:30 PM. Please log in again.',
        ),
      );
    });
  });
});
