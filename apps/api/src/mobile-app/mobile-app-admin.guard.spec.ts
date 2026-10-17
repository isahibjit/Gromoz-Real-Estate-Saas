import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { MobileAppAdminGuard } from './mobile-app-admin.guard';
import {
  MobileAppController,
  PublicMobileAppController,
} from './mobile-app.controller';

describe('Platform-only app release management', () => {
  const findUnique = jest.fn();
  const hasPermission = jest.fn();
  const guard = new MobileAppAdminGuard(
    { hasPermission } as unknown as AccessService,
    { user: { findUnique } } as unknown as PrismaService,
  );
  const context = (role?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          user: role ? { sub: 'platform-user', role } : undefined,
        }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    findUnique.mockResolvedValue({ role: 'SUPER_ADMIN', isActive: true });
    hasPermission.mockResolvedValue(true);
  });

  it.each(['ADMIN', 'HR', 'SALES_MANAGER', 'TELECALLER', undefined])(
    'denies %s even if app permission was granted',
    async (role) => {
      await expect(guard.canActivate(context(role))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(findUnique).not.toHaveBeenCalled();
      expect(hasPermission).not.toHaveBeenCalled();
    },
  );

  it.each([
    { role: 'ADMIN', isActive: true },
    { role: 'SUPER_ADMIN', isActive: false },
    null,
  ])('rejects stale super admin credentials for %p', async (account) => {
    findUnique.mockResolvedValue(account);
    await expect(
      guard.canActivate(context('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an active platform super admin and keeps the page permission check', async () => {
    await expect(guard.canActivate(context('SUPER_ADMIN'))).resolves.toBe(true);
    expect(hasPermission).toHaveBeenCalledWith(
      { sub: 'platform-user', role: 'SUPER_ADMIN' },
      'page.mobile_app',
      'view',
    );
    hasPermission.mockResolvedValue(false);
    await expect(
      guard.canActivate(context('SUPER_ADMIN')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('protects all management methods at controller level and leaves downloads public', () => {
    expect(Reflect.getMetadata('roles', MobileAppController)).toEqual([
      'SUPER_ADMIN',
    ]);
    expect(
      Reflect.getMetadata('__guards__', PublicMobileAppController),
    ).toBeUndefined();
  });
});
