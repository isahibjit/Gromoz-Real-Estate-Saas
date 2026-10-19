import { buildTenantAdminEmail } from './tenant-admin-email';

describe('buildTenantAdminEmail', () => {
  const base = {
    organizationName: 'Cedar Realty',
    adminFullName: 'Cedar Admin',
    adminEmail: 'admin@cedar.example',
    workspaceUrl: 'https://cedar.gromoze.com',
  };

  it('creates a welcome kit with the tenant login address and credentials', () => {
    const email = buildTenantAdminEmail({
      ...base,
      kind: 'welcome',
      isTrial: true,
      adminPassword: 'TenantPassword123',
    });

    expect(email.subject).toContain('Welcome to Gromoze');
    expect(email.text).toContain('https://cedar.gromoze.com/login');
    expect(email.text).toContain('admin@cedar.example');
    expect(email.text).toContain('TenantPassword123');
  });

  it('does not fabricate a credential when resending access details', () => {
    const email = buildTenantAdminEmail({ ...base, kind: 'welcome' });

    expect(email.text).toContain('Use your existing password');
    expect(email.text).not.toContain('Password: undefined');
  });
});
