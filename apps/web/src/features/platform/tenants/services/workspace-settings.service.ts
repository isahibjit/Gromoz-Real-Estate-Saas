import { api } from '../../../../common/api';
import { runtimeService, RuntimeBootstrapDto } from '../../../runtime/services/runtime.service';

export interface WorkspaceProfileSettings {
  companyName: string;
  shortName: string;
  industry: string;
  tenantCode: string;
  website: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoInLogin: boolean | null;
  workspaceId: string;
  configVersion: string;
  createdOn: string;
  createdBy: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
}

export interface WorkspaceLocalizationSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string | null;
  language: string;
  weekStart: string;
  numberFormat: string | null;
}

export interface WorkspaceFinancialSettings {
  currency: string;
  fyStart: string;
  gstNumber: string | null;
  panNumber: string | null;
  billingAddress: string | null;
  autoInvoice: boolean | null;
}

export interface WorkspacePreferencesSettings {
  defaultLandingPage: string | null;
  sessionTimeout: string | null;
  emailNotifications: boolean | null;
  pushNotifications: boolean | null;
  dailyDigest: boolean | null;
  showMapView: boolean | null;
  compactTable: boolean | null;
}

export interface WorkspaceSecuritySettings {
  enforce2FA: boolean | null;
  passwordMinLength: string | null;
  passwordExpiry: string | null;
  maxLoginAttempts: string | null;
  ipWhitelist: boolean | null;
  geoFenceAttendance: boolean | null;
  forceLogoutOnInactivity: boolean | null;
}

export interface WorkspaceSettings {
  tenantId: string;
  profile: WorkspaceProfileSettings;
  localization: WorkspaceLocalizationSettings;
  financial: WorkspaceFinancialSettings;
  preferences: WorkspacePreferencesSettings;
  security: WorkspaceSecuritySettings;
}

class ApiWorkspaceSettingsService {
  getWorkspaceSettingsFromBootstrap(bootstrap: RuntimeBootstrapDto): WorkspaceSettings {
    if (!bootstrap || !bootstrap.tenant) {
      throw new Error('AUTHORITATIVE_BOOTSTRAP_UNAVAILABLE: Workspace bootstrap returned empty or missing tenant data.');
    }

    const rawId = bootstrap.tenant.id || '';
    const cleanCompanySlug = (bootstrap.tenant.displayName || 'WORKSPACE')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
    const shortCode = rawId.includes('-')
      ? rawId.split('-')[0].toUpperCase()
      : rawId.slice(0, 6).toUpperCase();
    const formattedTenantCode = `WS-${cleanCompanySlug}-${shortCode || '001'}`;

    const formattedConfigVersion = bootstrap.configVersion?.startsWith('cfg1_')
      ? `v2.4.0 (${bootstrap.configVersion.slice(0, 12)})`
      : bootstrap.configVersion || 'v2.4.0 (Active)';

    return {
      tenantId: bootstrap.tenant.id,
      profile: {
        companyName: bootstrap.tenant.displayName || '—',
        shortName: bootstrap.tenant.displayName || '—',
        industry: (bootstrap.tenant as any)?.industryCode || (bootstrap.industry?.templateId ? `Template #${bootstrap.industry.templateId}` : 'Unassigned'),
        tenantCode: formattedTenantCode,
        website: (bootstrap.tenant as any)?.websiteUrl || null,
        primaryEmail: null,
        primaryPhone: null,
        primaryColor: null,
        secondaryColor: null,
        logoInLogin: null, // Strictly null: unsupported by runtime response
        workspaceId: formattedTenantCode,
        configVersion: formattedConfigVersion,
        createdOn: bootstrap.generatedAt ? new Date(bootstrap.generatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
        createdBy: null, // Strictly null: unsupported by runtime response
        address1: null,
        address2: null,
        city: null,
        state: null,
        country: null,
        pincode: null,
      },
      localization: {
        timezone: bootstrap.settings?.timezone || 'Not Configured',
        dateFormat: bootstrap.settings?.dateFormat || 'Not Configured',
        timeFormat: null,
        language: bootstrap.settings?.language || 'Not Configured',
        weekStart: bootstrap.settings?.weekStartDay || 'Not Configured',
        numberFormat: null,
      },
      financial: {
        currency: bootstrap.settings?.currency || 'Not Configured',
        fyStart: bootstrap.settings?.financialYearStartMonth ? `Month ${bootstrap.settings.financialYearStartMonth}` : 'Not Configured',
        gstNumber: null,
        panNumber: null,
        billingAddress: null,
        autoInvoice: null, // Strictly null: unsupported by runtime response
      },
      preferences: {
        defaultLandingPage: null,
        sessionTimeout: null,
        emailNotifications: null,
        pushNotifications: null,
        dailyDigest: null,
        showMapView: null,
        compactTable: null,
      },
      security: {
        enforce2FA: null,
        passwordMinLength: null,
        passwordExpiry: null,
        maxLoginAttempts: null,
        ipWhitelist: null,
        geoFenceAttendance: null,
        forceLogoutOnInactivity: null,
      },
    };
  }

  async getWorkspaceSettings(_tenantId?: string): Promise<WorkspaceSettings> {
    const bootstrap = await runtimeService.getBootstrap();
    return this.getWorkspaceSettingsFromBootstrap(bootstrap);
  }

  async updateWorkspaceSettings(_tenantId?: string, _updates?: any): Promise<WorkspaceSettings> {
    throw new Error('MUTATION_UNSUPPORTED: Workspace settings update endpoint is not exposed by the current backend API contract.');
  }

  async resetWorkspaceSettings(_tenantId?: string): Promise<WorkspaceSettings> {
    return this.getWorkspaceSettings(_tenantId);
  }
}

export const workspaceSettingsService = new ApiWorkspaceSettingsService();
