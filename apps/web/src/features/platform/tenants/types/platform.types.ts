export type PlatformRole =
  | 'PLATFORM_SUPER_ADMIN'
  | 'PLATFORM_OPERATIONS_ADMIN'
  | 'PLATFORM_ONBOARDING'
  | 'PLATFORM_SUPPORT'
  | 'PLATFORM_BILLING'
  | 'PLATFORM_AUDITOR';

export type PlatformPermission =
  | 'platform.dashboard.view'
  | 'platform.tenants.view'
  | 'platform.tenants.create'
  | 'platform.tenants.update'
  | 'platform.tenants.provision'
  | 'platform.tenants.suspend'
  | 'platform.tenants.members.manage'
  | 'platform.plans.view'
  | 'platform.plans.create'
  | 'platform.plans.update'
  | 'platform.plans.publish'
  | 'platform.plans.archive'
  | 'platform.modules.view'
  | 'platform.modules.update'
  | 'platform.modules.archive'
  | 'platform.industries.view'
  | 'platform.users.view'
  | 'platform.roles.view'
  | 'platform.subscriptions.view'
  | 'platform.subscriptions.manage'
  | 'platform.billing.view'
  | 'platform.users.manage'
  | 'platform.audit.view'
  | 'platform.notifications.settings.view'
  | 'platform.notifications.settings.manage';

export type TenantStatus =
  | 'Draft'
  | 'Pending Payment'
  | 'Trial'
  | 'Active'
  | 'Past Due'
  | 'Suspended'
  | 'Cancelled'
  | 'Archived';

export type SubscriptionStatus =
  | 'Trialing'
  | 'Active'
  | 'Past Due'
  | 'Incomplete'
  | 'Cancelled'
  | 'Expired';

export type ProvisioningType =
  | 'Free Trial'
  | 'Payment Required'
  | 'Invoice / Offline Payment'
  | 'Enterprise Contract';

export type PaymentCollectionMethod =
  | 'Send Checkout Link to Customer'
  | 'Record Confirmed Offline Payment';

export interface IndustryConfig {
  id: string;
  code: string;
  label: string;
  category: string;
  description: string;
  defaultModules: string[];
}

export type { PlatformModule } from '../../catalog/modules/types/module.types';

export interface PlatformPlan {
  id: string;
  code: string;
  name: string;
  tier: 'Starter' | 'Growth' | 'Professional' | 'Enterprise';
  monthlyPricePerUser: number;
  annualPricePerUser: number;
  minUsers: number;
  includedModules: string[];
  features: string[];
}

export interface TenantAdminUser {
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  sendInviteEmail: boolean;
}

export interface TenantUsageInfo {
  usersUsed: number;
  storageUsedGb: number;
  apiRequestsUsed: number;
}

export interface Tenant {
  id: string;
  slug: string;
  companyName: string;
  legalEntityName: string;
  taxId?: string;
  domain: string;
  website?: string;
  logoUrl?: string;
  industryId: string;
  industryCode: string;
  industryLabel: string;
  companySize: string;
  country: string;
  timezone: string;
  currency: string;
  
  // Optional Extended Address & Workspace Preferences for 100% Roundtrip
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  dateFormat?: string;
  financialYearStart?: string;
  weekStartDay?: string;
  totalEmployees?: string;
  fieldUsers?: string;
  yearsInBusiness?: string;
  businessModel?: string;
  branchCount?: string;
  billingCycle?: string;
  seatLimit?: string;
  storageLimit?: string;
  subscriptionStartDate?: string;
  trialDurationDays?: number;
  draftTenantId?: string;
  
  tenantStatus: TenantStatus;
  subscriptionStatus: SubscriptionStatus;
  
  adminUser: TenantAdminUser;
  
  planId: string;
  planName: string;
  provisioningType: ProvisioningType;
  userLicensesCount: number;
  enabledModuleCodes: string[];
  
  trialStartDate?: string;
  trialEndDate?: string;
  trialConversionPolicy?: string;
  
  billingContactName?: string;
  billingContactEmail?: string;
  paymentCollectionMethod?: PaymentCollectionMethod;
  billingDetails?: {
    lastInvoiceDate?: string;
    nextBillingDate?: string;
    paymentMethod?: string;
    lastInvoiceId?: string;
  };
  preferences?: {
    autoRenewal?: boolean;
    theme?: string;
  };
  
  mrr: number;
  usage?: TenantUsageInfo;
  createdAt: string;
  updatedAt: string;
}

export interface TenantCreateFormState {
  // Step 1: Company Details
  companyName: string;
  legalEntityName: string;
  slug: string;
  domain: string;
  website: string;
  taxId: string;
  companySize: string;
  country: string;
  currency: string;
  state: string;
  city: string;
  addressLine1: string;
  addressLine2: string;
  pincode: string;
  dateFormat: string;
  financialYearStart: string;

  // Step 2: Industry & Profile
  industryId: string;
  timezone: string;
  totalEmployees: string;
  fieldUsers: string;
  yearsInBusiness: string;
  businessModel: string;
  branchCount: string;
  operatingCountries: string;
  preferredLanguage: string;
  description: string;
  weekStartDay: string;

  // Step 3: Administrator
  adminFullName: string;
  adminEmail: string;
  adminPhone: string;
  adminDesignation: string;
  adminDepartment: string;
  adminLanguage: string;
  adminTimezone: string;
  adminCommunicationEmail: string;
  adminUsername: string;
  adminPassword: string;
  adminConfirmPassword: string;
  sendInviteEmail: boolean;

  // Step 4: Plan & Subscription
  planId: string;
  provisioningType: ProvisioningType;
  userLicensesCount: number;
  trialDurationDays: number;
  trialConversionPolicy: string;
  paymentCollectionMethod: PaymentCollectionMethod;
  billingContactName: string;
  billingContactEmail: string;
  billingCycle: string;
  seatLimit: string;
  storageLimit: string;
  subscriptionStartDate: string;

  // Step 4: Plan & Subscription Module Inheritance
  inheritedModuleCodes: string[];

  // General Status & Edit/Draft tracking
  isDraft: boolean;
  draftTenantId?: string;
  editingTenantId?: string;
}

export interface PlatformAuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  action: string;
  targetTenantName?: string;
  ipAddress: string;
  details: string;
}
