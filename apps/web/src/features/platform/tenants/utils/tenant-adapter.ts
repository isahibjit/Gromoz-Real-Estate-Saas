import {
  Tenant,
  TenantStatus,
  SubscriptionStatus,
  ProvisioningType,
  PaymentCollectionMethod,
} from '../types/platform.types';

export interface BackendTenantSummary {
  id: string;
  slug: string;
  displayName: string;
  legalName?: string | null;
  primaryDomain?: string | null;
  websiteUrl?: string | null;
  status: string;
  companySizeCode?: string | null;
  membershipCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BackendTenantDetail extends BackendTenantSummary {
  description?: string | null;
  activatedAt?: string | null;
  suspendedAt?: string | null;
  cancelledAt?: string | null;
  archivedAt?: string | null;
  addresses?: Array<{
    id: string;
    type: string;
    label?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    stateOrRegion?: string | null;
    postalCode?: string | null;
    countryCode: string;
    isPrimary: boolean;
  }>;
  settings?: {
    timezone: string;
    currency: string;
    locale: string;
    language: string;
    dateFormat: string;
    weekStartDay: string;
    financialYearStartMonth: number;
    configVersion: number;
  } | null;
  branding?: {
    shortName?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    logoUrl?: string | null;
    showLogoOnLogin: boolean;
  } | null;
}

export function mapBackendStatusToUi(status: string): TenantStatus {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'Active';
    case 'TRIAL':
    case 'TRIALING':
      return 'Trial';
    case 'SUSPENDED':
      return 'Suspended';
    case 'DRAFT':
      return 'Draft';
    case 'PENDING_PAYMENT':
      return 'Pending Payment';
    case 'PAST_DUE':
      return 'Past Due';
    case 'CANCELLED':
      return 'Cancelled';
    case 'ARCHIVED':
      return 'Archived';
    default:
      return 'Active';
  }
}

export function mapBackendSubStatusToUi(status?: string): SubscriptionStatus {
  switch (status?.toUpperCase()) {
    case 'TRIALING':
      return 'Trialing';
    case 'ACTIVE':
      return 'Active';
    case 'PAST_DUE':
      return 'Past Due';
    case 'CANCELLED':
      return 'Cancelled';
    case 'EXPIRED':
      return 'Expired';
    default:
      return 'Active';
  }
}

export function transformTenantSummaryToUi(dto: BackendTenantSummary): Tenant {
  const status = mapBackendStatusToUi(dto.status);
  return {
    id: dto.id,
    slug: dto.slug,
    companyName: dto.displayName,
    legalEntityName: dto.legalName || dto.displayName,
    domain: dto.primaryDomain || `${dto.slug}.smartfieldwork.com`,
    website: dto.websiteUrl || undefined,
    industryId: 'ind_general',
    industryCode: 'GENERAL',
    industryLabel: 'General Industry',
    companySize: dto.companySizeCode || 'Medium (51 - 250 employees)',
    country: 'India',
    timezone: 'Asia/Kolkata',
    currency: 'INR - Indian Rupee (₹)',
    tenantStatus: status,
    subscriptionStatus: status === 'Trial' ? 'Trialing' : 'Active',
    adminUser: {
      fullName: 'Tenant Administrator',
      email: `admin@${dto.slug}.com`,
      phone: '+91 98000 00000',
      designation: 'Administrator',
      sendInviteEmail: false,
    },
    planId: 'plan_standard',
    planName: 'Enterprise Field Suite',
    provisioningType: (status === 'Trial' ? 'Free Trial' : 'Payment Required') as ProvisioningType,
    userLicensesCount: dto.membershipCount || 1,
    enabledModuleCodes: ['core_crm', 'field_visits'],
    mrr: 0,
    createdAt: dto.createdAt ? new Date(dto.createdAt).toLocaleDateString('en-IN') : 'Just now',
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt).toLocaleDateString('en-IN') : 'Just now',
  };
}

export function transformTenantDetailToUi(
  detail: BackendTenantDetail,
  subscription?: any,
  industryTemplate?: any,
): Tenant {
  const base = transformTenantSummaryToUi(detail);
  const primaryAddress = detail.addresses?.find((a) => a.isPrimary) || detail.addresses?.[0];

  const planName = subscription?.planVersion?.name || subscription?.planName || base.planName;
  const planId = subscription?.planVersionId || subscription?.planId || base.planId;
  const userLicensesCount = subscription?.seatQuantity ?? base.userLicensesCount;
  const enabledModuleCodes = subscription?.moduleCodes ?? base.enabledModuleCodes;
  const subStatus = mapBackendSubStatusToUi(subscription?.status);

  const industryLabel = industryTemplate?.name || industryTemplate?.template?.name || base.industryLabel;
  const industryCode = industryTemplate?.code || industryTemplate?.template?.code || base.industryCode;
  const industryId = industryTemplate?.id || industryTemplate?.templateId || base.industryId;

  return {
    ...base,
    addressLine1: primaryAddress?.line1,
    addressLine2: primaryAddress?.line2 || undefined,
    city: primaryAddress?.city,
    state: primaryAddress?.stateOrRegion || undefined,
    pincode: primaryAddress?.postalCode || undefined,
    country: primaryAddress?.countryCode || base.country,
    timezone: detail.settings?.timezone || base.timezone,
    currency: detail.settings?.currency || base.currency,
    dateFormat: detail.settings?.dateFormat,
    financialYearStart: detail.settings?.financialYearStartMonth ? `Month ${detail.settings.financialYearStartMonth}` : undefined,
    weekStartDay: detail.settings?.weekStartDay,
    logoUrl: detail.branding?.logoUrl || undefined,
    industryLabel,
    industryCode,
    industryId,
    planName,
    planId,
    subscriptionStatus: subStatus,
    userLicensesCount,
    enabledModuleCodes,
    billingCycle: subscription?.billingCycle,
    subscriptionStartDate: subscription?.startedAt,
    trialEndDate: subscription?.trialEndsAt,
  };
}
