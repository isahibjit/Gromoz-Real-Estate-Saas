import type { Role } from '@prisma/client';

import {
  ACCESS_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  PAGE_PARENT_MODULE_MAP,
  PAGE_VISIBILITY_MODULES,
} from './access.constants';

function visiblePageKeysFor(role: Role): Set<string> {
  return new Set(
    DEFAULT_ROLE_PERMISSIONS[role]
      .filter(
        (permission) =>
          permission.moduleKey.startsWith('page.') && permission.canView,
      )
      .map((permission) => permission.moduleKey),
  );
}

describe('default access role permissions', () => {
  const allPageKeys = PAGE_VISIBILITY_MODULES.map((page) => page.key);

  it('reserves app releases for platform super admins while keeping tenant admin pages', () => {
    expect(visiblePageKeysFor('ADMIN')).toEqual(
      new Set(allPageKeys.filter((key) => key !== 'page.mobile_app')),
    );
    expect(visiblePageKeysFor('SUPER_ADMIN')).toEqual(new Set(allPageKeys));
    expect(
      DEFAULT_ROLE_PERMISSIONS.ADMIN.some(
        (permission) =>
          permission.moduleKey === 'mobile_app' && permission.canCreate,
      ),
    ).toBe(false);
  });

  it('does not enable every page for employee-facing roles', () => {
    const restrictedRoles: Role[] = [
      'HR',
      'SALES_MANAGER',
      'TEAM_LEADER',
      'MANAGER',
      'SALES_AGENT',
      'TELECALLER',
      'MARKETING',
      'BACKEND',
    ];

    for (const role of restrictedRoles) {
      expect(visiblePageKeysFor(role).size).toBeLessThan(allPageKeys.length);
    }
  });

  it('hides admin-only pages from sales and presales users by default', () => {
    expect(visiblePageKeysFor('SALES_AGENT')).not.toContain(
      'page.access_control',
    );
    expect(visiblePageKeysFor('SALES_AGENT')).not.toContain(
      'page.booking_finance',
    );
    expect(visiblePageKeysFor('TELECALLER')).not.toContain(
      'page.access_control',
    );
    expect(visiblePageKeysFor('TELECALLER')).not.toContain(
      'page.booking_finance',
    );
  });

  it('uses attendance-specific actions instead of generic create and delete', () => {
    const attendance = ACCESS_MODULES.find(
      (module) => module.key === 'attendance',
    );

    expect(attendance?.actions).toEqual([
      'view',
      'punchIn',
      'punchOut',
      'update',
    ]);
    expect(attendance?.actionLabels).toMatchObject({
      punchIn: 'Punch in',
      punchOut: 'Punch out',
      update: 'Correct attendance',
    });
  });

  it('grants punch access without correction to employee-facing roles', () => {
    const employeeRoles: Role[] = [
      'TEAM_LEADER',
      'MANAGER',
      'SALES_AGENT',
      'TELECALLER',
      'BACKEND',
    ];

    for (const role of employeeRoles) {
      const attendance = DEFAULT_ROLE_PERMISSIONS[role].find(
        (permission) => permission.moduleKey === 'attendance',
      );
      expect(attendance).toMatchObject({
        canView: true,
        canCreate: false,
        canUpdate: false,
        canPunchIn: true,
        canPunchOut: true,
      });
    }
  });

  it('grants attendance correction to attendance administrators', () => {
    for (const role of ['ADMIN', 'HR', 'SALES_MANAGER'] as Role[]) {
      const attendance = DEFAULT_ROLE_PERMISSIONS[role].find(
        (permission) => permission.moduleKey === 'attendance',
      );
      expect(attendance).toMatchObject({
        canView: true,
        canUpdate: true,
        canPunchIn: true,
        canPunchOut: true,
      });
    }
  });

  it('defines parentModuleKey and navigationMode for all page definitions', () => {
    for (const page of PAGE_VISIBILITY_MODULES) {
      expect(page.kind).toBe('page');
      expect(page.parentModuleKey).toBeDefined();
      expect(['sidebar', 'route-only']).toContain(page.navigationMode);
    }
  });

  it('correctly maps pages to valid parent modules in PAGE_PARENT_MODULE_MAP', () => {
    expect(PAGE_VISIBILITY_MODULES.length).toBeGreaterThan(0);
    for (const [pageKey, parentKey] of Object.entries(PAGE_PARENT_MODULE_MAP)) {
      expect(pageKey.startsWith('page.')).toBe(true);
      const parent = ACCESS_MODULES.find((m) => m.key === parentKey);
      expect(parent).toBeDefined();
      expect(parent?.kind).not.toBe('page');
    }
  });
});
