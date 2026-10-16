import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { Prisma, Role, type AutoAssignmentEvent } from '@prisma/client';
import {
  MetaFormRoutingSchema,
  resolveMetaRouting,
  type MetaFormRoutingOverrides,
} from '@truroot/shared';
import PDFDocument from 'pdfkit';
import { createHmac, createSign, randomBytes, randomUUID } from 'crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  normalizeAutoAssignmentRoute,
  validateRotationCount,
  readAutoAssignmentSnapshot,
  nextAutoAssignmentPosition,
  type AutoAssignmentSnapshot,
} from './auto-assignment-routing';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { getUserRoleLabel } from '../common/role-labels';
import { RealtimeService } from '../realtime/realtime.service';
import { LeadVisibilityService } from './lead-visibility.service';
import { TenantAccessService } from '../common/tenant/tenant-access.service';
import { TenantContextService } from '../common/tenant/tenant-context.service';
import { TenantNotificationService } from './notifications/tenant-notification.service';
import { WhatsAppDispatchService } from './notifications/whatsapp-dispatch.service';
import {
  SUPPORTED_WHATSAPP_EVENT_SET,
  type SupportedWhatsAppEvent,
} from './notifications/notification.constants';
import {
  HIDDEN_LEAD_SOURCE,
  leadSourceVisibilityFields,
  leadActivitySourceVisibility,
} from './lead-source-visibility';
import {
  assertValidRoutingAssignees,
  normalizeLegacyRoutingOwners,
  LeadSourceConnectionsService,
  ROUTING_OWNER_ROLES,
} from './lead-source-connections.service';

type Query = Record<string, string | string[] | undefined>;
type Body = Record<string, any>;
type LeadStatusMaster = {
  id: string;
  name: string;
  code: string;
  triggerAction: string;
  allowFollowUp: boolean;
  manualScore: number | null;
};
type SiteVisitRecord = Prisma.SiteVisitGetPayload<Record<string, never>>;
type SiteVisitCompletion = {
  leadStatusId: string;
  scheduledFollowUp: Date | null;
  remarkText: string;
};
type LeadAssigneeType = 'telecaller' | 'field-executive';
type BookingFinanceViewer = {
  visibilityScope: 'OWN' | 'OWN_AND_TEAM' | 'ALL';
  teamUserIds: Set<string>;
  bookingUserIds: Set<string> | null;
  canEdit: boolean;
};
type MetaCredentials = {
  pageAccessToken: string;
  userAccessToken: string;
  accounts: Body[];
  pages: Body[];
};
type PipelineColumnRecord = {
  id: string;
  name: string;
  code: string;
  color: string;
  count: number;
  value: number;
  hiddenCount: number;
  leads: Body[];
};
type MobileNotificationDestination =
  | 'all-leads'
  | 'follow-ups'
  | 'site-visits'
  | 'notifications';

type NotificationNavigationPayload = {
  destination: MobileNotificationDestination;
  notificationId?: string;
  leadId?: string;
  leadDisplayId?: string;
  visitId?: string;
  webPath: string;
  mobilePath: string;
};

type FollowUpReminderPayload = NotificationNavigationPayload & {
  leadId: string;
  leadDisplayId?: string;
  leadName: string;
  followUpId?: string;
  followUpType?: string;
  scheduledAt: string;
  followUpWebPath?: string;
  title?: string;
  description?: string;
};

const activeLeadLocks = new Map<string, number>();

const leadScoreCategories = ['status'] as const;
const PAYROLL_SETTING_FIELDS = new Set(
  (
    Prisma.dmmf.datamodel.models.find(
      (model) => model.name === 'PayrollSetting',
    )?.fields ?? []
  ).map((field) => field.name),
);
const PAYROLL_INCENTIVE_FIELDS_SUPPORTED = [
  'minimumDealsToQualify',
  'salesIncentivePct',
  'preSalesIncentivePct',
  'teamLeaderIncentivePct',
].every((field) => PAYROLL_SETTING_FIELDS.has(field));

const leadScoreCategoryLabels: Record<string, string> = {
  status: 'Lead Status',
};

const leadScoreLabelFor = (score: number) => {
  if (score <= 0) return 'Not scored';
  if (score >= 85) return 'Excellent';
  if (score >= 65) return 'Strong';
  if (score >= 45) return 'Moderate';
  return 'Developing';
};

const buildLeadScore = (
  lead: Body,
  scoreMasters: Body[],
  masterNameById = new Map<string, string>(),
) => {
  const byId = new Map<string, Body>();
  const byCategoryAndName = new Map<string, Body>();
  scoreMasters.forEach((master) => {
    const category = String(master.categoryRef?.code ?? '');
    const name = String(master.name ?? '')
      .trim()
      .toLowerCase();
    if (master.id) byId.set(master.id, master);
    if (category && name) byCategoryAndName.set(`${category}:${name}`, master);
  });

  const breakdown: Array<{ category: string; label: string; score: number }> =
    [];
  const pushMasterScore = (
    categoryCode: string,
    value: unknown,
    mode: 'id' | 'name',
  ) => {
    const rawValue = String(value ?? '').trim();
    if (!rawValue) return;
    const master =
      mode === 'id'
        ? byId.get(rawValue) ??
          byCategoryAndName.get(`${categoryCode}:${rawValue.toLowerCase()}`)
        : byCategoryAndName.get(`${categoryCode}:${rawValue.toLowerCase()}`);
    const label =
      master?.name ??
      (mode === 'id' ? masterNameById.get(rawValue) : rawValue) ??
      rawValue;
    breakdown.push({
      category: leadScoreCategoryLabels[categoryCode] ?? categoryCode,
      label,
      score: Number(master?.manualScore ?? 0) || 0,
    });
  };

  pushMasterScore('status', lead.statusId, 'id');

  const leadScore = Math.max(
    0,
    Math.min(
      100,
      breakdown.reduce((sum, item) => sum + item.score, 0),
    ),
  );

  return {
    leadScore,
    leadScoreLabel: leadScoreLabelFor(leadScore),
    leadScoreBreakdown: breakdown,
  };
};

const pageMeta = (query: Query) => {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 10), 1), 5000);
  return { page, limit, skip: (page - 1) * limit };
};

const parseMultiQueryValues = (value: unknown) => {
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .flatMap((item) => String(item ?? '').split(','))
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeMoney = (value: unknown) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const numeric = Number(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
};

const normalizeCalculationMode = (value: unknown) =>
  String(value ?? '').toUpperCase() === 'FIXED' ? 'FIXED' : 'PERCENTAGE';

const normalizeIncentiveDecisionStatus = (value: unknown) => {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (raw === 'approved') return 'Approved';
  if (raw === 'rejected') return 'Rejected';
  if (raw === 'pending') return 'Pending';
  if (raw === 'finalized') return 'Finalized';
  return undefined;
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const normalizeDate = (value: unknown) => {
  if (!value) return undefined;
  const str = String(value).trim();
  const dateMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    return new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0) - IST_OFFSET_MS,
    );
  }
  const wallClockMatch = str.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (wallClockMatch) {
    const [, y, m, d, h, min, s = '0'] = wallClockMatch;
    return new Date(
      Date.UTC(
        Number(y),
        Number(m) - 1,
        Number(d),
        Number(h),
        Number(min),
        Number(s),
      ) - IST_OFFSET_MS,
    );
  }
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const normalizeMagicBricksDate = (value: unknown) => {
  const raw = optionalString(value);
  if (!raw) return undefined;
  const slashMatch = raw.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (slashMatch) {
    const [, day, month, year, hour = '0', minute = '0', second = '0'] =
      slashMatch;
    const date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
      ) - IST_OFFSET_MS,
    );
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return normalizeDate(raw);
};

const optionalString = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
};

const isPausedStatus = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toLowerCase() === 'paused';

const isIntegrationPaused = (integration: {
  isActive?: boolean | null;
  status?: unknown;
}) => integration.isActive === false || isPausedStatus(integration.status);

const requestedIntegrationPauseState = (
  body: Body,
  current: { isActive?: boolean | null; status?: unknown },
) => {
  if (body.isPaused === true) return true;
  if (body.isPaused === false) return false;
  if (body.isActive === false) return true;
  if (body.isActive === true) return false;
  if (isPausedStatus(body.status)) return true;
  return isIntegrationPaused(current);
};

const normalizeTaskStatus = (value: unknown) => {
  const raw = String(value ?? 'Pending')
    .trim()
    .toLowerCase();
  if (raw === 'done' || raw === 'completed') return 'Completed';
  if (raw === 'in-progress' || raw === 'in progress') return 'In Progress';
  if (raw === 'open' || raw === 'pending') return 'Pending';
  return 'Pending';
};

const startOfDay = (value: Date) => {
  const istDate = new Date(value.getTime() + IST_OFFSET_MS);
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth();
  const d = istDate.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - IST_OFFSET_MS);
};

const endOfDay = (value: Date) => {
  const istDate = new Date(value.getTime() + IST_OFFSET_MS);
  const y = istDate.getUTCFullYear();
  const m = istDate.getUTCMonth();
  const d = istDate.getUTCDate();
  return new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - IST_OFFSET_MS);
};

const addDays = (value: Date, amount: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

const diffDays = (start: Date, end: Date) => {
  const ms = end.getTime() - start.getTime();
  return ms > 0 ? ms / (1000 * 60 * 60 * 24) : 0;
};

const compactCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: value >= 10000000 ? 2 : 1,
  }).format(value);

const isMissingProjectGeofenceFieldError = (error: unknown) =>
  error instanceof Error &&
  error.message.includes(
    'Unknown field `latitude` for select statement on model `Project`',
  );

const isConversionStatus = (status: Body) => {
  const code = String(status.code ?? '').toLowerCase();
  const name = String(status.name ?? '').toLowerCase();
  const triggerAction = String(status.triggerAction ?? '').toUpperCase();
  return (
    triggerAction === 'CREATE_BOOKING' ||
    code.includes('booking') ||
    code.includes('booked') ||
    code.includes('converted') ||
    code.includes('won') ||
    name.includes('booking') ||
    name.includes('booked') ||
    name.includes('converted') ||
    name.includes('won')
  );
};

const siteVisitExecutiveRoles: Role[] = [
  'SALES_AGENT',
  'SALES_MANAGER',
  'ADMIN',
];

const coordinate = (
  value: unknown,
  min: number,
  max: number,
  label: string,
) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    throw new BadRequestException(`Valid ${label} is required`);
  }
  return numeric;
};

const optionalCoordinate = (
  value: unknown,
  min: number,
  max: number,
  label: string,
) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return coordinate(value, min, max, label);
};

const optionalPositiveInteger = (
  value: unknown,
  fallback: number | undefined = undefined,
) => {
  if (value === '' || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new BadRequestException('Valid geofence radius is required');
  }
  return numeric;
};

const haversineDistanceMeters = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) => {
  const earthRadiusM = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(toLatitude - fromLatitude);
  const dLng = toRad(toLongitude - fromLongitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLatitude)) *
      Math.cos(toRad(toLatitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const defaultPipelineStatuses = [
  {
    name: 'New Lead',
    code: 'NEW_LEAD',
    sortOrder: 1,
    displayColor: '#2563EB',
    statusType: 'System Default',
    score: 0,
  },
  {
    name: 'Contacted',
    code: 'CONTACTED',
    sortOrder: 2,
    displayColor: '#0284C7',
    statusType: 'System Default',
    score: 0,
  },
  {
    name: 'Interested',
    code: 'INTERESTED',
    sortOrder: 3,
    displayColor: '#059669',
    statusType: 'System Default',
    score: 1,
  },
  {
    name: 'Follow-Up',
    code: 'FOLLOW_UP',
    sortOrder: 4,
    displayColor: '#7C3AED',
    statusType: 'Custom',
    followUpNotificationEnabled: true,
    followUpRenotifyMinutes: 3,
    score: 0,
  },
  {
    name: 'Site Visit',
    code: 'SITE_VISIT',
    sortOrder: 5,
    displayColor: '#EA580C',
    statusType: 'System Default',
    triggerAction: 'CREATE_SITE_VISIT',
    score: 5,
  },
  {
    name: 'Proposal',
    code: 'PROPOSAL',
    sortOrder: 6,
    displayColor: '#F97316',
    statusType: 'Custom',
    score: 0,
  },
  {
    name: 'Negotiation',
    code: 'NEGOTIATION',
    sortOrder: 7,
    displayColor: '#7C3AED',
    statusType: 'System Default',
    score: 0,
  },
  {
    name: 'Booked',
    code: 'BOOKED',
    sortOrder: 8,
    displayColor: '#16A34A',
    statusType: 'System Default',
    triggerAction: 'CREATE_BOOKING',
    score: 50,
  },
  {
    name: 'Lost',
    code: 'LOST',
    sortOrder: 9,
    displayColor: '#E11D48',
    statusType: 'System Default',
    allowFollowUp: false,
    followUpNotificationEnabled: false,
    score: 0,
  },
];

const defaultLeadSources = [
  {
    name: 'Website',
    code: 'WEBSITE',
    sortOrder: 0,
    group: 'Digital',
    score: 20,
  },
  {
    name: 'MagicBricks',
    code: 'MAGICBRICKS',
    sortOrder: 1,
    group: 'Portal',
    score: 12,
  },
  {
    name: '99Acres',
    code: '99ACRES',
    sortOrder: 2,
    group: 'Portal',
    score: 12,
  },
  {
    name: 'Google Ads',
    code: 'GOOGLE_ADS',
    sortOrder: 3,
    group: 'Digital',
    score: 18,
  },
  {
    name: 'Meta Ads',
    code: 'META_ADS',
    sortOrder: 4,
    group: 'Digital',
    score: 18,
  },
  {
    name: 'Referral',
    code: 'REFERRAL',
    sortOrder: 5,
    group: 'Offline',
    score: 25,
  },
  {
    name: 'Walk-in',
    code: 'WALK_IN',
    sortOrder: 6,
    group: 'Offline',
    score: 30,
  },
];

const magicBricksProvider = 'magicbricks';
const magicBricksDisplayName = 'MagicBricks';

const acres99Provider = '99acres';
const acres99DisplayName = '99Acres';

const default99AcresFieldMapping = {
  Name: 'leadName',
  Mobile: 'mobileNumber',
  Email: 'emailAddress',
  Budget: 'budgetRange',
  PropertyType: 'propertyType',
  Location: 'preferredLocation',
  Source: 'leadSourceName',
  Remarks: 'remarks',
  CreatedDate: 'addedDate',
};
const metaProvider = 'meta_lead_ads';
const metaDisplayName = 'Meta Lead Ads';
const defaultMagicBricksFieldMapping = {
  FirstName: 'leadName',
  Mobile: 'mobileNumber',
  Email: 'emailAddress',
  ProjectName: 'preferredProject',
  Source: 'leadSource',
  Remark: 'remarks',
  SecondaryNumber: 'remarks',
  CreatedDate: 'addedDate',
  HasVisitScheduled: 'remarks',
  VisitDate: 'remarks',
  LastName: 'skip',
  ApiKey: 'skip',
  name: 'leadName',
  mobile: 'mobileNumber',
  email: 'emailAddress',
  project: 'preferredProject',
  projectName: 'preferredProject',
  source: 'leadSource',
  msg: 'remarks',
  comments: 'remarks',
  city: 'preferredLocation',
  configuration: 'configuration',
  propertyType: 'propertyType',
};
const magicBricksTargetFieldOptions = [
  { value: 'leadName', label: 'Lead name', required: true },
  { value: 'mobileNumber', label: 'Mobile number', required: true },
  { value: 'emailAddress', label: 'Email address', required: false },
  { value: 'preferredProject', label: 'Preferred project', required: false },
  { value: 'leadSource', label: 'Lead source', required: false },
  { value: 'addedDate', label: 'Added date', required: false },
  { value: 'remarks', label: 'Remarks', required: false },
  { value: 'preferredLocation', label: 'Preferred location', required: false },
  { value: 'configuration', label: 'Configuration', required: false },
  { value: 'propertyType', label: 'Property type', required: false },
  { value: 'skip', label: 'Do not import', required: false },
];
const magicBricksPushSourceFields = [
  { key: 'ApiKey', label: 'ApiKey', sample: 'mb_xxxxx' },
  { key: 'FirstName', label: 'FirstName', sample: 'Sahil' },
  { key: 'LastName', label: 'LastName', sample: 'Lad' },
  { key: 'Mobile', label: 'Mobile', sample: '9867456673' },
  { key: 'SecondaryNumber', label: 'SecondaryNumber', sample: '9937485683' },
  { key: 'CreatedDate', label: 'CreatedDate', sample: '07/09/2020 00:00:00' },
  { key: 'Email', label: 'Email', sample: 'sahil67@gmail.com' },
  { key: 'Remark', label: 'Remark', sample: 'Remark' },
  { key: 'HasVisitScheduled', label: 'HasVisitScheduled', sample: 'true' },
  { key: 'Source', label: 'Source', sample: 'MagicBricks' },
  { key: 'VisitDate', label: 'VisitDate', sample: '11/09/2020 00:00:00' },
  { key: 'ProjectName', label: 'ProjectName', sample: 'Godrej' },
];

const defaultMetaFieldMapping = {
  full_name: 'leadName',
  first_name: 'leadName',
  last_name: 'leadName',
  phone_number: 'mobileNumber',
  mobile: 'mobileNumber',
  email: 'emailAddress',
  project_name: 'preferredProject',
  preferred_project: 'preferredProject',
  city: 'preferredLocation',
  location: 'preferredLocation',
  configuration: 'configuration',
  property_type: 'propertyType',
  budget: 'budgetRange',
  remarks: 'remarks',
};
const metaTargetFieldOptions = [
  { value: 'leadName', label: 'Lead name', required: true },
  { value: 'mobileNumber', label: 'Mobile number', required: true },
  { value: 'emailAddress', label: 'Email address', required: false },
  { value: 'preferredProject', label: 'Preferred project', required: false },
  { value: 'preferredLocation', label: 'Preferred location', required: false },
  { value: 'configuration', label: 'Configuration', required: false },
  { value: 'propertyType', label: 'Property type', required: false },
  { value: 'budgetRange', label: 'Budget range', required: false },
  { value: 'remarks', label: 'Remarks', required: false },
  { value: 'skip', label: 'Do not import', required: false },
];
const metaSourceFields = [
  { key: 'full_name', label: 'Full name', sample: 'Sahil Lad' },
  { key: 'first_name', label: 'First name', sample: 'Sahil' },
  { key: 'last_name', label: 'Last name', sample: 'Lad' },
  { key: 'phone_number', label: 'Phone number', sample: '9867456673' },
  { key: 'email', label: 'Email', sample: 'sahil67@gmail.com' },
  { key: 'project_name', label: 'Project name', sample: 'Sunset Residency' },
  { key: 'city', label: 'City', sample: 'Mumbai' },
  { key: 'configuration', label: 'Configuration', sample: '2 BHK' },
  { key: 'budget', label: 'Budget', sample: '75 Lakh - 1 Cr' },
  { key: 'remarks', label: 'Remarks', sample: 'Interested in this project.' },
];

const defaultMasterValues: Record<string, Body[]> = {
  status: defaultPipelineStatuses,
  source: defaultLeadSources,
  temperature: [
    {
      name: 'Very Hot',
      code: 'VHOT',
      description: 'Ready to transact quickly.',
      group: 'Hot',
      score: 95,
      statusType: 'Custom',
      isActive: true,
      isSystemDefault: false,
      sortOrder: 1,
      displayColor: '#BE123C',
      showInStatsCard: true,
      showInFilterBar: true,
    },
    {
      name: 'Hot',
      code: 'HOT',
      description: 'Strong interest and high follow-up priority.',
      group: 'Hot',
      score: 80,
      statusType: 'System Default',
      isActive: true,
      isSystemDefault: true,
      sortOrder: 2,
      displayColor: '#E11D48',
      showInStatsCard: true,
      showInFilterBar: true,
    },
    {
      name: 'Warm',
      code: 'WARM',
      description: 'Engaged but requires nurturing.',
      group: 'Warm',
      score: 60,
      statusType: 'System Default',
      isActive: true,
      isSystemDefault: true,
      sortOrder: 3,
      displayColor: '#D97706',
      showInStatsCard: true,
      showInFilterBar: true,
    },
    {
      name: 'Cold',
      code: 'COLD',
      description: 'Minimal engagement so far.',
      group: 'Cold',
      score: 25,
      statusType: 'System Default',
      isActive: true,
      isSystemDefault: true,
      sortOrder: 4,
      displayColor: '#0284C7',
      showInStatsCard: true,
      showInFilterBar: true,
    },
    {
      name: 'Neutral',
      code: 'NEUT',
      description: 'Balanced interest, pending more data.',
      group: 'Neutral',
      score: 45,
      statusType: 'Custom',
      isActive: false,
      isSystemDefault: false,
      sortOrder: 5,
      displayColor: '#475569',
      showInStatsCard: false,
      showInFilterBar: false,
    },
  ],
  property_type: ['Apartment', 'Villa', 'Plot', 'Commercial'].map(
    (name, index) => ({
      name,
      sortOrder: index + 1,
      group: 'Property',
    }),
  ),
  project_location: [
    'Andheri (E), Mumbai',
    'Goregaon (E), Mumbai',
    'Powai, Mumbai',
    'Andheri (W), Mumbai',
    'Malad, Mumbai',
    'Bandra, Mumbai',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Project',
    score: [18, 16, 20, 18, 14, 16][index] ?? 10,
  })),
  project_configuration: [
    '1 BHK',
    '2 BHK',
    '3 BHK',
    '4 BHK',
    '5 BHK',
    'Studio',
    'Penthouse',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Inventory',
    score: [8, 12, 16, 20, 22, 7, 25][index] ?? 10,
  })),
  possession_timeline: [
    'Immediate',
    'Within 3 Months',
    'Within 6 Months',
    'Within 12 Months',
    'Ready to Move',
    'Under Construction',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Timeline',
  })),
  project_zone: [
    'Central',
    'Harbour Line',
    'Western',
    'Western Line',
    'Eastern',
    'East',
    'West',
    'South Mumbai',
    'Thane',
    'Navi Mumbai',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Location',
  })),
  lead_budget_range: [
    '50 Lakh - 75 Lakh',
    '75 Lakh - 1 Cr',
    '1 Cr - 1.5 Cr',
    '1.5 Cr - 2 Cr',
    '2 Cr - 3 Cr',
    '3 Cr+',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Budget',
    score: [10, 14, 18, 22, 26, 30][index] ?? 10,
  })),
  carpet_area_range: [
    '400 - 600 sq ft',
    '600 - 800 sq ft',
    '800 - 1000 sq ft',
    '1000 - 1500 sq ft',
    '1500 - 2000 sq ft',
    '2000+ sq ft',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Area',
  })),
  project_amenity: [
    'Gym',
    'Parking',
    'Club House',
    'Swimming Pool',
    'Landscaped Garden',
    "Children's Play Area",
    'Jogging Track',
    'Security',
    'Lake Deck',
    'EV Parking',
    'Terrace Garden',
  ].map((name, index) => ({ name, sortOrder: index + 1, group: 'Amenity' })),
  project_status: [
    'Active',
    'Ready To Move',
    'Under Construction',
    'High Demand',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Project Status',
    statusType: 'System Default',
  })),
  project_developer: [
    'Truroot Realty',
    'Lakeview Infra',
    'Palm Habitat',
    'Sunset Homes',
  ].map((name, index) => ({ name, sortOrder: index + 1, group: 'Developer' })),
  project_whatsapp_template: [
    {
      name: 'Default project share',
      code: 'DEFAULT_PROJECT_SHARE',
      description: [
        'Hello!',
        '',
        'We are thrilled to introduce *{{projectName}}*, a residential project by the Developer *{{developer}}*, located at {{location}}.',
        '{{description}}',
        '',
        'Offering {{configurations}} apartments.',
        '',
        '{{configurationSection}}',
        '{{priceSection}}',
        '{{highlightsSection}}',
        '{{amenitiesSection}}',
        '{{possessionSection}}',
        '{{mediaSection}}',
        'Thank you for considering {{developer}}.',
        '',
        'Best regards,',
        '{{senderName}}',
        '{{senderPhone}}',
      ].join('\n'),
      sortOrder: 1,
      group: 'WhatsApp',
      statusType: 'System Default',
      isSystemDefault: true,
      isActive: true,
      displayColor: '#059669',
    },
  ],
  unit_tower: [
    'Tower A',
    'Tower B',
    'Tower C',
    'Tower D',
    'Tower E',
    'Tower Z',
  ].map((name, index) => ({ name, sortOrder: index + 1, group: 'Tower' })),
  unit_facing: [
    'East',
    'West',
    'North',
    'South',
    'Garden',
    'Sea View',
    'Lake',
    'Road',
  ].map((name, index) => ({ name, sortOrder: index + 1, group: 'Facing' })),
  unit_availability: ['Available', 'Hold', 'Booked', 'Sold'].map(
    (name, index) => ({
      name,
      sortOrder: index + 1,
      group: 'Inventory Status',
      statusType: 'System Default',
    }),
  ),
  unit_booking_status: [
    'Open',
    'Family revisit',
    'Negotiation',
    'Token received',
    'Closed',
  ].map((name, index) => ({
    name,
    sortOrder: index + 1,
    group: 'Booking Status',
  })),
};

const slug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

const formatCurrencyCr = (value: number) => {
  if (!value) return '₹ 0 Cr';
  return `₹ ${(value / 10000000).toFixed(2)} Cr`;
};

const daysAgoLabel = (date?: Date | null) => {
  if (!date) return 'No activity';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

const normalizeConfigurationCarpetAreas = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([configuration, area]) => [
        configuration.trim(),
        String(area ?? '').trim(),
      ])
      .filter(
        ([configuration, area]) =>
          configuration && /^\d+(?:\.\d+)?$/.test(area) && Number(area) > 0,
      ),
  );
};

type ProjectConfigurationVariant = {
  id: string;
  configuration: string;
  carpetArea: string;
  priceAmount: string;
  priceUnit: 'Lakh' | 'Cr';
};

const normalizeProjectConfigurationVariants = (
  value: unknown,
): ProjectConfigurationVariant[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const record = item as Record<string, unknown>;
    const configuration = String(record.configuration ?? '').trim();
    if (!configuration) return [];
    const carpetArea = String(record.carpetArea ?? '').trim();
    const priceAmount = String(record.priceAmount ?? '').trim();
    return [
      {
        id:
          String(record.id ?? `variant-${index + 1}`).trim() ||
          `variant-${index + 1}`,
        configuration,
        carpetArea:
          /^\d+(?:\.\d+)?$/.test(carpetArea) && Number(carpetArea) > 0
            ? carpetArea
            : '',
        priceAmount:
          /^\d+(?:\.\d+)?$/.test(priceAmount) && Number(priceAmount) >= 0
            ? priceAmount
            : '',
        priceUnit: record.priceUnit === 'Lakh' ? 'Lakh' : 'Cr',
      },
    ];
  });
};

const configurationVariantsFromLegacyAreas = (
  values: Record<string, string>,
): ProjectConfigurationVariant[] =>
  Object.entries(values).map(([configuration, carpetArea], index) => ({
    id: `legacy-${index + 1}`,
    configuration,
    carpetArea,
    priceAmount: '',
    priceUnit: 'Cr',
  }));

const configurationCarpetAreasFromVariants = (
  variants: readonly ProjectConfigurationVariant[],
) =>
  Object.fromEntries(
    variants
      .filter((variant) => variant.carpetArea)
      .map((variant) => [variant.configuration, variant.carpetArea]),
  );

const normalizeOptionalFloorCount = (value: unknown) => {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException(
      'Number of floors must be a positive whole number',
    );
  }
  return parsed;
};

const normalizeProjectBrochures = (value: unknown, fallback?: Body) => {
  const fromList = asArray(value)
    .map((item) => (item && typeof item === 'object' ? (item as Body) : null))
    .filter((item): item is Body => Boolean(item?.url))
    .map((item) => ({
      url: String(item.url),
      storageKey: item.storageKey ? String(item.storageKey) : undefined,
      fileName: item.fileName ? String(item.fileName) : undefined,
      mimeType: item.mimeType ? String(item.mimeType) : undefined,
      sizeBytes:
        item.sizeBytes === null || item.sizeBytes === undefined
          ? undefined
          : Number(item.sizeBytes),
    }));

  if (fromList.length) return fromList;
  if (fallback?.brochureUrl) {
    return [
      {
        url: String(fallback.brochureUrl),
        storageKey: fallback.brochureStorageKey
          ? String(fallback.brochureStorageKey)
          : undefined,
        fileName: fallback.brochureFileName
          ? String(fallback.brochureFileName)
          : undefined,
        mimeType: fallback.brochureMimeType
          ? String(fallback.brochureMimeType)
          : undefined,
        sizeBytes:
          fallback.brochureSizeBytes === null ||
          fallback.brochureSizeBytes === undefined
            ? undefined
            : Number(fallback.brochureSizeBytes),
      },
    ];
  }
  return [];
};

const queryValues = (value: unknown) => {
  const rawValues = Array.isArray(value) ? value : [value];
  return rawValues
    .flatMap((item) => String(item ?? '').split(','))
    .map((item) => item.trim())
    .filter((item) => item && item !== 'all');
};

const leadListSystemColumns = [
  { id: 'addedDate', label: 'Added Date', canHide: true },
  { id: 'lastUpdate', label: 'Last Update', canHide: true },
  { id: 'source', label: 'Source', canHide: true },
  { id: 'name', label: 'Name', canHide: false },
  { id: 'number', label: 'Number', canHide: false },
  { id: 'projectName', label: 'Project Name', canHide: true },
  { id: 'executive', label: 'Executive', canHide: true },
  { id: 'leadStatus', label: 'Lead Status', canHide: true },
  { id: 'leadType', label: 'Lead Type', canHide: true },
  { id: 'followUpDate', label: 'Follow-up Date', canHide: true },
  { id: 'remark', label: 'Remark', canHide: true },
  { id: 'actions', label: 'Action Button', canHide: false },
];

const leadListColumnDefaults = leadListSystemColumns.map((column) => column.id);
const leadListLockedColumns = leadListSystemColumns
  .filter((column) => !column.canHide)
  .map((column) => column.id);
const leadListRestrictedSourceRoles = new Set(['TELECALLER', 'SALES_AGENT']);
const leadListConfigurableRoles = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'SALES_MANAGER',
  'TEAM_LEADER',
  'MANAGER',
  'SALES_AGENT',
  'TELECALLER',
  'MARKETING',
];

const leadUpdateSystemFields = [
  { id: 'name', label: 'Lead name', group: 'Identity' },
  { id: 'mobile', label: 'Mobile number', group: 'Contact' },
  { id: 'email', label: 'Email', group: 'Contact' },
  { id: 'source', label: 'Source', group: 'Pipeline' },
  { id: 'status', label: 'Lead status', group: 'Pipeline' },
  { id: 'leadType', label: 'Lead type', group: 'Pipeline' },
  { id: 'projectName', label: 'Project name', group: 'Requirement' },
  { id: 'executive', label: 'Executive assignment', group: 'Assignment' },
  { id: 'budget', label: 'Budget', group: 'Requirement' },
  { id: 'location', label: 'Location', group: 'Requirement' },
  { id: 'configuration', label: 'Configuration', group: 'Requirement' },
  { id: 'propertyType', label: 'Property type', group: 'Requirement' },
  { id: 'followUpDate', label: 'Follow-up date', group: 'Follow-up' },
  { id: 'remark', label: 'Remark', group: 'Follow-up' },
] as const;

const leadUpdateFieldDefaults: string[] = leadUpdateSystemFields.map(
  (field) => field.id,
);
const leadUpdateAdminRoles = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'SALES_MANAGER',
  'TEAM_LEADER',
  'MANAGER',
]);
const leadUpdateDefaultRestrictedFields: Record<string, string[]> = {
  TELECALLER: leadUpdateFieldDefaults.filter(
    (field) => !['source', 'executive'].includes(field),
  ),
  SALES_AGENT: leadUpdateFieldDefaults.filter(
    (field) => !['source', 'executive'].includes(field),
  ),
  MARKETING: [
    'name',
    'mobile',
    'email',
    'source',
    'status',
    'leadType',
    'projectName',
    'budget',
    'location',
    'configuration',
    'propertyType',
    'remark',
  ],
  HR: [],
};

const parseStringArray = (value: unknown) => {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const deriveLeadType = (value?: unknown) => {
  const label = String(value ?? '').toLowerCase();
  if (/(high|hot|urgent|priority)/.test(label)) return 'Hot';
  if (/(cold|low)/.test(label)) return 'Cold';
  return 'Warm';
};

const parsePriceInput = (amount: unknown, unit?: unknown) => {
  const numeric = normalizeMoney(amount);
  if (numeric === undefined) return undefined;
  if (unit === 'Cr') return numeric * 10000000;
  if (unit === 'Lakh') return numeric * 100000;
  return numeric;
};

const formatMoneyRange = (min?: unknown, max?: unknown) => {
  const format = (value: unknown) => {
    const numeric = Number(value ?? 0);
    if (!numeric) return 'INR 0';
    if (numeric >= 10000000) return `INR ${(numeric / 10000000).toFixed(2)} Cr`;
    if (numeric >= 100000) return `INR ${(numeric / 100000).toFixed(2)} Lakh`;
    return `INR ${numeric.toLocaleString('en-IN')}`;
  };
  return `${format(min)} - ${format(max)}`;
};

@Injectable()
export class CrmService {
  private readonly assignmentTransaction = new AsyncLocalStorage<{
    tx: Prisma.TransactionClient;
    afterCommit: Array<() => Promise<unknown>>;
  }>();
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
    private readonly leadVisibility: LeadVisibilityService,
    private readonly tenantAccess: TenantAccessService,
    private readonly tenantContext: TenantContextService,
    private readonly notificationSettings: TenantNotificationService,
    private readonly whatsappDispatches: WhatsAppDispatchService,
    @Optional()
    private readonly leadSourceConnections?: LeadSourceConnectionsService,
  ) {}

  private connections() {
    return (
      this.leadSourceConnections ??
      new LeadSourceConnectionsService(
        this.prisma,
        this.tenantAccess,
        this.tenantContext,
      )
    );
  }

  private db() {
    const transaction = this.assignmentTransaction.getStore();
    if (transaction) return transaction.tx;
    return this.prisma as any;
  }

  private assertTenantWorkspaceMutation() {
    const tenant = this.tenantContext.getTenant();
    if (!tenant) {
      throw new ForbiddenException('Select a tenant workspace');
    }
    if (tenant.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Platform spectators have read-only workspace access',
      );
    }
  }

  private async withAssignmentTransaction<T>(
    leadId: string,
    work: () => Promise<T>,
  ): Promise<T> {
    if (this.assignmentTransaction.getStore()) return work();
    const afterCommit: Array<() => Promise<unknown>> = [];
    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "Lead" WHERE "id" = ${leadId} FOR UPDATE`;
        return this.assignmentTransaction.run({ tx, afterCommit }, work);
      },
      { timeout: 20000 },
    );
    for (const effect of afterCommit) {
      await effect().catch((error: unknown) =>
        this.logger.warn(
          `Post-commit assignment notification failed: ${String(error)}`,
        ),
      );
    }
    return result;
  }

  private async resolveActiveLeadStatus(
    value: unknown,
    db: Pick<Prisma.TransactionClient, 'leadMasterValue'> = this.prisma,
  ): Promise<LeadStatusMaster> {
    const identifier = String(value ?? '').trim();
    if (!identifier) throw new BadRequestException('Lead status is required');
    const status = await db.leadMasterValue.findFirst({
      where: {
        categoryRef: { code: { equals: 'status', mode: 'insensitive' } },
        isActive: true,
        OR: [
          { id: identifier },
          { code: { equals: identifier, mode: 'insensitive' } },
          { name: { equals: identifier, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        code: true,
        triggerAction: true,
        allowFollowUp: true,
        manualScore: true,
      },
    });
    if (!status) throw new BadRequestException('Lead status is invalid');
    return status;
  }

  private isSiteVisitCompletionStatus(status: LeadStatusMaster) {
    const identity = `${status.code} ${status.name}`.toLowerCase();
    return (
      (identity.includes('site visit') ||
        identity.includes('site_visit') ||
        identity.includes('re-visit') ||
        identity.includes('re_visit') ||
        identity.includes('revisit')) &&
      (identity.includes('done') || identity.includes('completed'))
    );
  }

  private isProtectedSiteVisitStatus(status: LeadStatusMaster) {
    return (
      String(status.triggerAction).toUpperCase() === 'CREATE_SITE_VISIT' ||
      this.isSiteVisitCompletionStatus(status)
    );
  }

  private async nextLeadDisplayId() {
    const latestLead = await this.db().lead.findFirst({
      where: { displayId: { startsWith: 'TR' } },
      orderBy: { displayId: 'desc' },
      select: { displayId: true },
    });
    const currentSequence = Number(
      String(latestLead?.displayId ?? '').match(/^TR(\d+)$/)?.[1] ?? 0,
    );

    return `TR${String(currentSequence + 1).padStart(6, '0')}`;
  }

  private async leadScoreMasterValues() {
    return this.db().leadMasterValue.findMany({
      where: {
        isActive: true,
        categoryRef: { code: { in: [...leadScoreCategories] } },
      },
      select: {
        id: true,
        name: true,
        manualScore: true,
        categoryRef: { select: { code: true, name: true } },
      },
    });
  }

  private async audit(
    actorUserId: string | undefined,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: Body,
    organizationId?: string,
  ) {
    await this.db()
      .auditLog.create({
        data: {
          actorUserId,
          action,
          organizationId: organizationId ?? this.tenantContext.getTenantId(),
          entityType,
          entityId,
          metadata,
        },
      })
      .catch((error: unknown) => {
        if (this.assignmentTransaction.getStore()) throw error;
      });
  }

  private roleLabel(role?: string | null) {
    return getUserRoleLabel(role) || 'Assignee';
  }

  private async buildLeadStatusScoreMetadata(
    lead: Body,
    statusChanged: boolean,
    statusMaster?: Body | null,
    dbClient: Body = this.db(),
  ) {
    if (!statusChanged || !statusMaster) {
      return {
        statusScoreEarned: undefined,
        sourcePointsEnabled: undefined,
        statusScoreRecipients: [],
      };
    }

    let score = Number(statusMaster.manualScore ?? 0) || 0;
    if (
      score === 0 &&
      (statusMaster.id || statusMaster.name || statusMaster.code)
    ) {
      const resolvedStatus = await dbClient.leadMasterValue.findFirst({
        where: {
          isActive: true,
          categoryRef: { code: 'status' },
          OR: [
            { id: String(statusMaster.id) },
            { code: String(statusMaster.code ?? statusMaster.id) },
            {
              name: {
                equals: String(statusMaster.name ?? statusMaster.id),
                mode: 'insensitive',
              },
            },
          ],
        },
        select: { manualScore: true },
      });
      score = Number(resolvedStatus?.manualScore ?? 0) || 0;
    }

    const sourceId = optionalString(lead.sourceId);
    const sourceMaster = sourceId
      ? await dbClient.leadMasterValue.findFirst({
          where: {
            isActive: true,
            categoryRef: { code: 'source' },
            OR: [{ id: sourceId }, { code: sourceId }, { name: sourceId }],
          },
          select: { id: true, name: true, pointsEnabled: true },
        })
      : null;
    const sourcePointsEnabled = sourceMaster?.pointsEnabled !== false;

    const assignedList: Array<{ userId: string; roleType: string }> = [];
    if (lead.telecallerId) {
      assignedList.push({
        userId: String(lead.telecallerId),
        roleType: 'PRE_SALES',
      });
    }
    if (lead.fieldExecutiveId) {
      assignedList.push({
        userId: String(lead.fieldExecutiveId),
        roleType: 'SALES',
      });
    }
    if (!assignedList.length && lead.ownerId) {
      assignedList.push({
        userId: String(lead.ownerId),
        roleType: 'OWNER',
      });
    }

    const uniqueRecipients = sourcePointsEnabled
      ? assignedList.filter(
          (recipient, index, list) =>
            list.findIndex((item) => item.userId === recipient.userId) ===
            index,
        )
      : [];

    const recipientPoints =
      uniqueRecipients.length > 0 ? score / uniqueRecipients.length : 0;
    const recipients = uniqueRecipients.map((recipient) => ({
      ...recipient,
      points: recipientPoints,
    }));

    return {
      statusScoreEarned: sourcePointsEnabled ? score : 0,
      sourcePointsEnabled,
      statusScoreSourceId: sourceMaster?.id ?? sourceId ?? null,
      statusScoreSourceName: sourceMaster?.name ?? null,
      statusScoreRecipients: recipients,
    };
  }

  private formatFollowUpSchedule(value?: Date | string | null) {
    if (!value) return 'the scheduled slot';
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return 'the scheduled slot';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private buildNotificationLeadPath(
    role: string | null | undefined,
    leadId: string,
  ) {
    if (role === 'SALES_AGENT') return `/field-executive/leads/${leadId}`;
    if (role === 'TELECALLER') return `/telecaller/leads/${leadId}`;
    return `/leads/${leadId}`;
  }

  private buildNotificationFollowUpPath(role: string | null | undefined) {
    if (role === 'SALES_AGENT') return '/field-executive/follow-ups';
    if (role === 'TELECALLER') return '/telecaller/follow-ups';
    return '/leads/follow-up';
  }

  private buildNotificationPath(
    role: string | null | undefined,
    destination: MobileNotificationDestination,
  ) {
    if (destination === 'follow-ups') {
      return this.buildNotificationFollowUpPath(role);
    }
    if (destination === 'site-visits') {
      return role === 'SALES_AGENT'
        ? '/field-executive/site-visits'
        : '/leads/site-visits';
    }
    if (destination === 'all-leads') {
      if (role === 'SALES_AGENT') return '/field-executive/leads';
      if (role === 'TELECALLER') return '/telecaller/leads/my';
      return '/leads/all';
    }
    return '/notifications';
  }

  private buildNotificationNavigationPayload(
    role: string | null | undefined,
    destination: MobileNotificationDestination,
    identifiers: Pick<
      NotificationNavigationPayload,
      'leadId' | 'leadDisplayId' | 'visitId'
    > = {},
  ): NotificationNavigationPayload {
    const path = this.buildNotificationPath(role, destination);
    return {
      destination,
      ...identifiers,
      webPath: path,
      mobilePath: path,
    };
  }

  private async createNotificationWithNavigation(
    notificationData: Body,
    navigation: NotificationNavigationPayload,
  ) {
    const notificationId = randomUUID();
    const payload = { ...navigation, notificationId };
    const resolved = await this.resolveNotificationDispatchContext(
      notificationData,
    );
    const eventKey =
      notificationData.type === 'site-visit-updated' &&
      resolved?.context.status === 'Cancelled'
        ? 'site-visit-cancelled'
        : String(notificationData.type ?? '');
    const whatsappEnabled =
      resolved && SUPPORTED_WHATSAPP_EVENT_SET.has(eventKey)
        ? await this.notificationSettings.isChannelEnabled(
            resolved.organizationId,
            'whatsapp',
            eventKey,
          )
        : false;

    const persistNotification = async (tx: Prisma.TransactionClient) => {
      await tx.notification.create({
        data: {
          ...notificationData,
          id: notificationId,
          organizationId: resolved?.organizationId ?? null,
          details: {
            ...(notificationData.details ?? {}),
            ...payload,
          },
        } as Prisma.NotificationUncheckedCreateInput,
      });
      if (
        whatsappEnabled &&
        resolved &&
        typeof notificationData.userId === 'string'
      ) {
        await this.whatsappDispatches.enqueueWithClient(tx, {
          organizationId: resolved.organizationId,
          notificationId,
          recipientUserId: notificationData.userId,
          eventKey: eventKey as SupportedWhatsAppEvent,
          context: resolved.context,
        });
      }
    };
    const assignmentTransaction = this.assignmentTransaction.getStore();
    if (assignmentTransaction) {
      await persistNotification(assignmentTransaction.tx);
    } else {
      await this.prisma.$transaction(persistNotification);
    }
    return payload;
  }

  private async resolveNotificationDispatchContext(notificationData: Body) {
    const recipientId =
      typeof notificationData.userId === 'string'
        ? notificationData.userId
        : undefined;
    const recipient = recipientId
      ? await this.db().user.findUnique({
          where: { id: recipientId },
          select: { fullName: true },
        })
      : null;
    const details =
      notificationData.details && typeof notificationData.details === 'object'
        ? notificationData.details
        : {};
    let organizationId =
      typeof notificationData.organizationId === 'string'
        ? notificationData.organizationId
        : this.tenantContext.getTenantId();
    let leadName =
      typeof details.leadName === 'string' ? details.leadName : undefined;
    let leadReference =
      typeof details.leadDisplayId === 'string'
        ? details.leadDisplayId
        : undefined;
    let scheduledAt =
      typeof details.scheduledAt === 'string' ||
      details.scheduledAt instanceof Date
        ? details.scheduledAt
        : undefined;
    let projectName =
      typeof details.projectName === 'string' ? details.projectName : undefined;
    let status =
      typeof details.status === 'string' ? details.status : undefined;

    if (
      notificationData.entityType === 'Lead' &&
      typeof notificationData.entityId === 'string'
    ) {
      const lead = await this.db().lead.findUnique({
        where: { id: notificationData.entityId },
        select: { organizationId: true, name: true, displayId: true },
      });
      organizationId = lead?.organizationId ?? organizationId;
      leadName = lead?.name ?? leadName;
      leadReference = lead?.displayId ?? leadReference;
    }

    if (
      notificationData.entityType === 'SiteVisit' &&
      typeof notificationData.entityId === 'string'
    ) {
      const visit = await this.db().siteVisit.findUnique({
        where: { id: notificationData.entityId },
        select: {
          scheduledAt: true,
          status: true,
          lead: {
            select: {
              organizationId: true,
              name: true,
              displayId: true,
            },
          },
          project: { select: { name: true } },
        },
      });
      organizationId = visit?.lead.organizationId ?? organizationId;
      leadName = visit?.lead.name ?? leadName;
      leadReference = visit?.lead.displayId ?? leadReference;
      scheduledAt = visit?.scheduledAt ?? scheduledAt;
      projectName = visit?.project?.name ?? projectName;
      status = visit?.status ?? status;
    }

    if (!organizationId) return null;
    const eventType = String(notificationData.type ?? '');
    if (
      !scheduledAt &&
      ['lead-assigned', 'lead-reassigned', 'sla-breach-transferred'].includes(
        eventType,
      )
    ) {
      scheduledAt = new Date();
    }
    return {
      organizationId,
      context: {
        recipientName: recipient?.fullName?.trim() || 'Team member',
        title: String(notificationData.title ?? ''),
        body: String(
          notificationData.description ?? notificationData.message ?? '',
        ),
        leadName,
        leadReference,
        scheduledAt,
        projectName,
        status,
      },
    };
  }

  private buildFollowUpReminderPayload(
    role: string | null | undefined,
    lead: Body,
    followUp: Body,
  ): FollowUpReminderPayload {
    const leadDisplayId = String(lead.displayId ?? lead.id ?? '').trim();
    const followUpType = String(
      followUp.typeName ?? followUp.typeId ?? 'follow-up',
    ).trim();
    return {
      ...this.buildNotificationNavigationPayload(role, 'follow-ups', {
        leadId: String(lead.id ?? ''),
        leadDisplayId,
      }),
      leadId: String(lead.id ?? ''),
      leadDisplayId,
      leadName: String(lead.name ?? 'Lead').trim(),
      followUpId: String(followUp.id ?? ''),
      followUpType,
      scheduledAt: String(followUp.scheduledAt ?? ''),
      webPath: this.buildNotificationLeadPath(role, leadDisplayId),
      followUpWebPath: this.buildNotificationFollowUpPath(role),
    };
  }

  async registerDeviceToken(
    userId: string,
    body: {
      token: string;
      platform?: string;
      deviceId?: string;
      appVersion?: string;
    },
  ) {
    const rawToken = String(body?.token ?? '').trim();
    if (!rawToken) {
      throw new BadRequestException('FCM Device Token is required');
    }

    const platform = (body?.platform || 'ANDROID').toUpperCase();

    const existing = await this.db().mobileDeviceToken.findUnique({
      where: { token: rawToken },
    });

    if (existing) {
      return this.db().mobileDeviceToken.update({
        where: { id: existing.id },
        data: {
          userId,
          platform,
          deviceId: body?.deviceId ?? existing.deviceId,
          appVersion: body?.appVersion ?? existing.appVersion,
          isActive: true,
          lastSeenAt: new Date(),
        },
      });
    }

    return this.db().mobileDeviceToken.create({
      data: {
        userId,
        token: rawToken,
        platform,
        deviceId: body?.deviceId,
        appVersion: body?.appVersion,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  async unregisterDeviceToken(userId: string, token: string) {
    const rawToken = String(token ?? '').trim();
    if (!rawToken) return { success: true };

    await this.db().mobileDeviceToken.updateMany({
      where: { userId, token: rawToken },
      data: { isActive: false },
    });

    return { success: true, message: 'FCM device token unregistered' };
  }

  async listUserDeviceTokens(userId: string) {
    return this.db().mobileDeviceToken.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async sendTestPushNotification(
    userId: string,
    title?: string,
    bodyText?: string,
  ) {
    this.assertTenantWorkspaceMutation();
    await this.tenantAccess.assertEmployee(userId);
    const organizationId = this.tenantAccess.organizationId;
    const tokens = await this.listUserDeviceTokens(userId);
    if (!tokens.length) {
      throw new BadRequestException(
        'No active FCM device tokens registered for this user.',
      );
    }

    await this.sendPushNotification(
      userId,
      {
        title: title || 'Truroot CRM Test Push Notification',
        body:
          bodyText ||
          'This is a live test push notification sent via Firebase Cloud Messaging.',
        type: 'test-notification',
        data: this.buildNotificationNavigationPayload(null, 'notifications'),
      },
      { organizationId },
    );
    return {
      success: true,
      message: `Test push sent to ${tokens.length} active device token(s)`,
      tokenCount: tokens.length,
    };
  }

  private async getGoogleFcmAccessToken(): Promise<{
    token: string;
    projectId: string;
  } | null> {
    try {
      let serviceAccount: any = null;
      const rawJson =
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

      if (rawJson) {
        serviceAccount =
          typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;
      } else {
        const fs = require('fs');
        const path = require('path');
        const potentialPaths = [
          path.join(process.cwd(), 'firebase-service-account.json'),
          path.join(process.cwd(), 'service-account.json'),
          path.join(process.cwd(), 'apps/api/firebase-service-account.json'),
        ];
        for (const p of potentialPaths) {
          if (fs.existsSync(p)) {
            serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
            break;
          }
        }
      }

      if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
        return null;
      }

      const projectId = serviceAccount.project_id || 'realestatecrm-da93a';
      const iat = Math.floor(Date.now() / 1000);
      const exp = iat + 3600;
      const header = Buffer.from(
        JSON.stringify({ alg: 'RS256', typ: 'JWT' }),
      ).toString('base64url');
      const claimSet = Buffer.from(
        JSON.stringify({
          iss: serviceAccount.client_email,
          scope: 'https://www.googleapis.com/auth/firebase.messaging',
          aud: 'https://oauth2.googleapis.com/token',
          exp,
          iat,
        }),
      ).toString('base64url');

      const sign = createSign('RSA-SHA256');
      sign.update(`${header}.${claimSet}`);
      const signature = sign.sign(serviceAccount.private_key, 'base64url');
      const jwt = `${header}.${claimSet}.${signature}`;

      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      const data: any = await res.json();
      if (data?.access_token) {
        return { token: data.access_token, projectId };
      } else if (data?.error_description) {
        this.logger.warn(`Google OAuth token error: ${data.error_description}`);
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to generate Google FCM Access Token: ${err?.message}`,
      );
    }
    return null;
  }

  public async isNotificationChannelEnabled(
    channel: 'fcm' | 'whatsapp',
    eventType?: string,
    organizationId?: string,
  ): Promise<boolean> {
    try {
      const tenantId = organizationId ?? this.tenantContext.getTenantId();
      if (!tenantId) return channel === 'fcm';
      return this.notificationSettings.isChannelEnabled(
        tenantId,
        channel,
        eventType,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to check tenant notification setting for ${channel}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return false;
    }
  }

  public async sendPushNotification(
    recipientUserId: string,
    payload: {
      title: string;
      body: string;
      type: string;
      data?: Record<string, any>;
    },
    options?: { organizationId?: string },
  ) {
    const emptyResult = {
      attempted: false,
      delivered: false,
      tokenCount: 0,
      deliveredCount: 0,
      invalidTokenCount: 0,
    };
    if (!recipientUserId) return emptyResult;
    const transaction = this.assignmentTransaction.getStore();
    if (transaction) {
      transaction.afterCommit.push(() =>
        this.sendPushNotification(recipientUserId, payload, options),
      );
      return emptyResult;
    }

    const isFcmEnabled = await this.isNotificationChannelEnabled(
      'fcm',
      payload.type,
      options?.organizationId,
    );
    if (!isFcmEnabled) {
      this.logger.log(
        `FCM Push notification skipped for event ${
          payload.type ?? 'general'
        }: disabled in notification settings`,
      );
      return emptyResult;
    }

    const fcmAuth = await this.getGoogleFcmAccessToken();
    const serverKey = String(process.env.FCM_SERVER_KEY ?? '').trim();

    if (!fcmAuth && !serverKey) {
      this.logger.warn(
        'FCM Push skip: Neither FIREBASE_SERVICE_ACCOUNT_JSON nor FCM_SERVER_KEY is configured.',
      );
      return emptyResult;
    }

    const tokens = await this.db().mobileDeviceToken.findMany({
      where: {
        userId: recipientUserId,
        isActive: true,
      },
      select: {
        id: true,
        token: true,
      },
    });
    if (!tokens.length) {
      this.logger.warn(
        `FCM Push skip: No active device tokens registered for user ${recipientUserId}.`,
      );
      return emptyResult;
    }

    const projectId =
      fcmAuth?.projectId || process.env.FCM_PROJECT_ID || 'realestatecrm-da93a';
    const notificationTitle = payload.title;
    const notificationBody = payload.body;

    const stringData: Record<string, string> = {
      type: payload.type || 'general-notification',
    };
    if (payload.data) {
      Object.entries(payload.data).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          stringData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      });
    }

    const invalidTokenIds: string[] = [];
    let deliveredCount = 0;
    let attempted = false;

    for (const entry of tokens) {
      try {
        let sent = false;

        if (fcmAuth?.token) {
          attempted = true;
          const v1Url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
          const v1Response = await fetch(v1Url, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
            headers: {
              Authorization: `Bearer ${fcmAuth.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: entry.token,
                notification: {
                  title: notificationTitle,
                  body: notificationBody,
                },
                android: {
                  notification: {
                    icon: 'ic_notification',
                    color: '#0f1b36',
                    default_sound: true,
                    notification_count: 1,
                  },
                },
                apns: {
                  payload: {
                    aps: {
                      sound: 'default',
                      badge: 1,
                    },
                  },
                },
                data: stringData,
              },
            }),
          });

          if (v1Response.ok) {
            this.logger.log(
              `FCM v1 push delivered successfully to user ${recipientUserId} token ${entry.id} (${payload.type})`,
            );
            sent = true;
            deliveredCount += 1;
          } else {
            const errRes: any = await v1Response.json().catch(() => null);
            if (
              errRes?.error?.status === 'UNREGISTERED' ||
              errRes?.error?.code === 404
            ) {
              invalidTokenIds.push(entry.id);
            } else {
              this.logger.warn(
                `FCM v1 push response for ${entry.id}: ${
                  v1Response.status
                } ${JSON.stringify(errRes)}`,
              );
            }
          }
        }

        if (!sent && serverKey) {
          attempted = true;
          const legacyResponse = await fetch(
            'https://fcm.googleapis.com/fcm/send',
            {
              method: 'POST',
              signal: AbortSignal.timeout(15000),
              headers: {
                Authorization: `key=${serverKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: entry.token,
                notification: {
                  title: notificationTitle,
                  body: notificationBody,
                  icon: 'ic_notification',
                  sound: 'default',
                  badge: '1',
                },
                data: stringData,
              }),
            },
          );

          if (legacyResponse.ok) {
            const resJson: any = await legacyResponse.json().catch(() => null);
            if (
              resJson?.results?.[0]?.error === 'NotRegistered' ||
              resJson?.results?.[0]?.error === 'InvalidRegistration'
            ) {
              invalidTokenIds.push(entry.id);
            } else {
              this.logger.log(
                `FCM legacy push accepted for user ${recipientUserId} token ${entry.id} (${payload.type})`,
              );
              sent = true;
              deliveredCount += 1;
            }
          } else {
            const errRes = await legacyResponse.text().catch(() => '');
            this.logger.warn(
              `FCM legacy push response for ${entry.id}: ${legacyResponse.status} ${errRes}`,
            );
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `FCM push error for user ${recipientUserId}: ${err?.message}`,
        );
      }
    }

    if (invalidTokenIds.length > 0) {
      await this.db().mobileDeviceToken.updateMany({
        where: { id: { in: invalidTokenIds } },
        data: { isActive: false },
      });
    }

    return {
      attempted,
      delivered: deliveredCount > 0,
      tokenCount: tokens.length,
      deliveredCount,
      invalidTokenCount: invalidTokenIds.length,
    };
  }

  private async sendFollowUpReminderPush(
    recipientUserId: string,
    reminder: FollowUpReminderPayload,
    organizationId?: string,
  ) {
    const notificationTitle =
      reminder.title || `Follow-up due for ${reminder.leadName}`;
    const notificationBody =
      reminder.description ||
      `${reminder.followUpType} scheduled at ${this.formatFollowUpSchedule(
        reminder.scheduledAt,
      )}`;

    return this.sendPushNotification(
      recipientUserId,
      {
        title: notificationTitle,
        body: notificationBody,
        type: 'follow-up-reminder',
        data: reminder as any,
      },
      { organizationId },
    );
  }

  private magicBricksPublicApiBaseUrl() {
    const configured =
      process.env.MAGICBRICKS_PUBLIC_API_BASE_URL ??
      process.env.PUBLIC_API_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');
    const frontendUrl = String(process.env.FRONTEND_URL ?? '').replace(
      /\/$/,
      '',
    );
    if (frontendUrl.startsWith('http')) return `${frontendUrl}/api`;
    return 'https://crmtrueroot.com/api';
  }

  private magicBricksWebhookUrl() {
    return `${this.magicBricksPublicApiBaseUrl()}/integrations/magicbricks/leads`;
  }

  private getMagicBricksFieldMapping(mapping?: unknown) {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      return { ...defaultMagicBricksFieldMapping };
    }
    const nextMapping = { ...defaultMagicBricksFieldMapping };
    for (const [sourceField, targetField] of Object.entries(mapping as Body)) {
      if (typeof targetField !== 'string' || !targetField.trim()) continue;
      nextMapping[sourceField] = targetField;
    }
    return nextMapping;
  }

  async resolveTenantOrganizationId(
    actorUserId?: string,
    explicitOrgId?: string,
  ): Promise<string | undefined> {
    if (!actorUserId) {
      if (explicitOrgId)
        throw new ForbiddenException('Authenticated tenant selection required');
      return this.tenantContext.getTenantId();
    }
    const account = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { role: true, isActive: true },
    });
    if (!account?.isActive)
      throw new ForbiddenException('Active account required');
    if (explicitOrgId && account.role === 'SUPER_ADMIN') {
      const organization = await this.prisma.organization.findUnique({
        where: { id: explicitOrgId },
        select: { id: true },
      });
      if (!organization)
        throw new ForbiddenException('Invalid tenant selection');
      return organization.id;
    }
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId: actorUserId,
        isActive: true,
        ...(explicitOrgId ? { organizationId: explicitOrgId } : {}),
      },
      select: { organizationId: true },
      take: 2,
    });
    if (memberships.length !== 1) {
      throw new ForbiddenException('Select an active tenant workspace');
    }
    return memberships[0].organizationId;
  }

  private portalIntegrationDelegate() {
    return (this.db() as any).portalIntegration as
      | {
          findUnique: (args: Body) => Promise<Body | null>;
          findFirst: (args: Body) => Promise<Body | null>;
          create: (args: Body) => Promise<Body>;
          update: (args: Body) => Promise<Body>;
        }
      | undefined;
  }

  private async ensurePortalIntegrationTable() {
    await this.db().$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PortalIntegration" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT,
        "provider" TEXT NOT NULL,
        "displayName" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'Draft',
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "webhookKeyId" TEXT NOT NULL UNIQUE,
        "fieldMapping" JSONB,
        "settings" JSONB,
        "credentials" JSONB,
        "notes" TEXT,
        "lastTestedAt" TIMESTAMP(3),
        "lastTestStatus" TEXT,
        "lastLeadReceivedAt" TIMESTAMP(3),
        "totalLeadsReceived" INTEGER NOT NULL DEFAULT 0,
        "createdById" TEXT,
        "updatedById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.db().$executeRawUnsafe(`
      ALTER TABLE "PortalIntegration"
      ADD COLUMN IF NOT EXISTS "organizationId" TEXT,
      ADD COLUMN IF NOT EXISTS "settings" JSONB,
      ADD COLUMN IF NOT EXISTS "credentials" JSONB
    `);
    await this.db().$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PortalIntegration_provider_isActive_idx"
      ON "PortalIntegration" ("provider", "isActive")
    `);
    await this.db().$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PortalIntegration_org_provider_idx"
      ON "PortalIntegration" ("organizationId", "provider")
    `);
  }

  private async portalIntegrationFindByProvider(
    provider: string,
    organizationId?: string,
  ) {
    // A missing connection means this tenant needs its own connection. Never
    // fall back to another tenant's (or a legacy unowned) credentials.
    if (organizationId) {
      return this.prisma.portalIntegration.findFirst({
        where: { provider, organizationId },
      });
    }
    const delegate = this.portalIntegrationDelegate();
    if (delegate) {
      try {
        if (organizationId) {
          const found = await delegate.findFirst({
            where: { provider, organizationId },
          });
          if (found) return found;
        } else {
          const found = await delegate.findFirst({
            where: { provider },
          });
          if (found) return found;
        }
      } catch {
        // Fall back to raw SQL when the Prisma client is stale
      }
    }
    await this.ensurePortalIntegrationTable();
    if (organizationId) {
      const rows = (await this.db().$queryRawUnsafe(
        `SELECT * FROM "PortalIntegration" WHERE "provider" = $1 AND "organizationId" = $2 LIMIT 1`,
        provider,
        organizationId,
      )) as Body[];
      if (rows[0]) return rows[0];
    }
    const rows = (await this.db().$queryRawUnsafe(
      `SELECT * FROM "PortalIntegration" WHERE "provider" = $1 LIMIT 1`,
      provider,
    )) as Body[];
    return rows[0] ?? null;
  }

  private async portalIntegrationFindByWebhookKeyId(webhookKeyId: string) {
    return this.prisma.portalIntegration.findUnique({
      where: { webhookKeyId },
    });
  }

  private async portalIntegrationCreate(data: Body) {
    const delegate = this.portalIntegrationDelegate();
    if (delegate) {
      try {
        return await delegate.create({ data });
      } catch {
        // Fall back to raw SQL
      }
    }
    await this.ensurePortalIntegrationTable();
    const rows = (await this.db().$queryRawUnsafe(
      `
        INSERT INTO "PortalIntegration" (
          "id",
          "organizationId",
          "provider",
          "displayName",
          "status",
          "isActive",
          "webhookKeyId",
          "fieldMapping",
          "settings",
          "credentials",
          "notes",
          "lastTestedAt",
          "lastTestStatus",
          "lastLeadReceivedAt",
          "totalLeadsReceived",
          "createdById",
          "updatedById",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        RETURNING *
      `,
      data.id,
      data.organizationId ?? null,
      data.provider,
      data.displayName,
      data.status,
      data.isActive,
      data.webhookKeyId,
      JSON.stringify(data.fieldMapping ?? null),
      JSON.stringify(data.settings ?? null),
      JSON.stringify(data.credentials ?? null),
      data.notes ?? null,
      data.lastTestedAt ?? null,
      data.lastTestStatus ?? null,
      data.lastLeadReceivedAt ?? null,
      Number(data.totalLeadsReceived ?? 0),
      data.createdById ?? null,
      data.updatedById ?? null,
      data.createdAt,
      data.updatedAt,
    )) as Body[];
    return rows[0];
  }

  private async portalIntegrationUpdate(
    id: string,
    data: Body,
    removedMetaPageIds: readonly string[] = [],
  ) {
    const delegate = this.portalIntegrationDelegate();
    if (
      delegate &&
      data.settings?.formRoutingOverrides &&
      typeof this.prisma.$transaction === 'function'
    ) {
      // Existing page/account writers must preserve form saves made since their initial read.
      return this.prisma.$transaction(async (tx) => {
        const records = await tx.$queryRaw<{ settings: Prisma.JsonValue }[]>`
          SELECT "settings" FROM "PortalIntegration" WHERE "id" = ${id} FOR UPDATE
        `;
        if (!records[0])
          throw new NotFoundException('Portal integration not found');
        const formRoutingOverrides = this.getMetaSettings(
          records[0].settings,
        ).formRoutingOverrides;
        for (const pageId of removedMetaPageIds)
          delete formRoutingOverrides[pageId];
        return tx.portalIntegration.update({
          where: { id },
          data: {
            ...data,
            settings: { ...data.settings, formRoutingOverrides },
          },
        });
      });
    }
    if (delegate) {
      try {
        return await delegate.update({
          where: { id },
          data,
        });
      } catch {
        // Fall back to raw SQL
      }
    }
    await this.ensurePortalIntegrationTable();
    const existingRows = (await this.db().$queryRawUnsafe(
      `SELECT * FROM "PortalIntegration" WHERE "id" = $1 LIMIT 1`,
      id,
    )) as Body[];
    const existing = existingRows[0];
    if (!existing) {
      throw new NotFoundException('Portal integration not found');
    }

    const next: Body = {
      ...existing,
      ...data,
      organizationId:
        data.organizationId === undefined
          ? existing.organizationId
          : data.organizationId,
      fieldMapping:
        data.fieldMapping === undefined
          ? existing.fieldMapping
          : data.fieldMapping,
      settings: data.settings === undefined ? existing.settings : data.settings,
      credentials:
        data.credentials === undefined
          ? existing.credentials
          : data.credentials,
      totalLeadsReceived:
        typeof data.totalLeadsReceived === 'object' &&
        data.totalLeadsReceived &&
        'increment' in data.totalLeadsReceived
          ? Number(existing.totalLeadsReceived ?? 0) +
            Number(data.totalLeadsReceived.increment ?? 0)
          : Number(data.totalLeadsReceived ?? existing.totalLeadsReceived ?? 0),
      updatedAt: new Date(),
    };

    const rows = (await this.db().$queryRawUnsafe(
      `
        UPDATE "PortalIntegration"
        SET
          "organizationId" = $2,
          "provider" = $3,
          "displayName" = $4,
          "status" = $5,
          "isActive" = $6,
          "webhookKeyId" = $7,
          "fieldMapping" = $8::jsonb,
          "settings" = $9::jsonb,
          "credentials" = $10::jsonb,
          "notes" = $11,
          "lastTestedAt" = $12,
          "lastTestStatus" = $13,
          "lastLeadReceivedAt" = $14,
          "totalLeadsReceived" = $15,
          "createdById" = $16,
          "updatedById" = $17,
          "createdAt" = $18,
          "updatedAt" = $19
        WHERE "id" = $1
        RETURNING *
      `,
      id,
      next.organizationId ?? null,
      next.provider,
      next.displayName,
      next.status,
      next.isActive,
      next.webhookKeyId,
      JSON.stringify(next.fieldMapping ?? null),
      JSON.stringify(next.settings ?? null),
      JSON.stringify(next.credentials ?? null),
      next.notes ?? null,
      next.lastTestedAt ?? null,
      next.lastTestStatus ?? null,
      next.lastLeadReceivedAt ?? null,
      next.totalLeadsReceived,
      next.createdById ?? null,
      next.updatedById ?? null,
      next.createdAt,
      next.updatedAt,
    )) as Body[];
    return rows[0];
  }

  private async ensureMagicBricksIntegration(
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.connections().getPrimaryAccount(
      magicBricksProvider,
      defaultMagicBricksFieldMapping,
      actorUserId,
      organizationId,
    );
    const mapping = this.getMagicBricksFieldMapping(integration.fieldMapping);
    const needsMappingPatch =
      !integration.fieldMapping ||
      (integration.fieldMapping as Body).CreatedDate === 'remarks';
    if (mapping.CreatedDate === 'remarks') mapping.CreatedDate = 'addedDate';
    if (needsMappingPatch) {
      await this.connections().saveFieldMapping(
        magicBricksProvider,
        integration.id,
        mapping,
        actorUserId,
      );
      return this.connections().getAccount(magicBricksProvider, integration.id);
    }
    return integration;
  }

  private async getMagicBricksSourceMaster() {
    const sources = await this.ensureMasters('source', defaultLeadSources);
    return (
      sources.find(
        (source: Body) =>
          String(source.code ?? '').toUpperCase() === 'MAGICBRICKS' ||
          String(source.name ?? '').toLowerCase() === 'magicbricks',
      ) ?? sources[0]
    );
  }

  private async getDefaultNewLeadStatusMaster() {
    const statuses = await this.ensureMasters(
      'status',
      defaultPipelineStatuses,
    );
    return (
      statuses.find(
        (status: Body) =>
          String(status.code ?? '').toUpperCase() === 'NEW_LEAD' ||
          String(status.name ?? '').toLowerCase() === 'new lead',
      ) ?? null
    );
  }

  private async getDefaultInterestedLeadStatusMaster() {
    const statuses = await this.ensureMasters(
      'status',
      defaultPipelineStatuses,
    );
    return (
      statuses.find(
        (status: Body) =>
          String(status.code ?? '').toUpperCase() === 'INTERESTED' ||
          String(status.name ?? '').toLowerCase() === 'interested',
      ) ?? null
    );
  }

  private async getMagicBricksLeadStats(organizationId?: string) {
    const magicBricksSource = await this.getMagicBricksSourceMaster();
    const sourceFilters = [
      magicBricksSource?.id,
      magicBricksSource?.code,
      magicBricksSource?.name,
      magicBricksSource?.name
        ? slug(String(magicBricksSource.name))
        : undefined,
      'MagicBricks',
      'MAGICBRICKS',
    ].filter(Boolean);

    const monthStart = startOfDay(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );

    const [totalImportedThisMonth, latestLead] = await Promise.all([
      this.db().lead.count({
        where: {
          deletedAt: null,
          organizationId,
          sourceId: { in: sourceFilters },
          createdAt: { gte: monthStart },
        },
      }),
      this.db().lead.findFirst({
        where: {
          deletedAt: null,
          sourceId: { in: sourceFilters },
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalImportedThisMonth,
      lastImportedAt: latestLead?.createdAt ?? null,
    };
  }

  private async buildMagicBricksManual(integration: Body) {
    const apiKey = this.connections().buildMagicBricksApiKey(
      integration.webhookKeyId,
    );
    const workingEndpoint = this.magicBricksWebhookUrl();
    const samplePayload = {
      ApiKey: apiKey,
      FirstName: 'Sahil',
      LastName: 'Lad',
      Mobile: '9867456673',
      SecondaryNumber: '9937485683',
      CreatedDate: '07/09/2020 00:00:00',
      Email: 'sahil67@gmail.com',
      Remark: 'Interested in this project. Please contact.',
      HasVisitScheduled: 'true',
      Source: 'MagicBricks',
      VisitDate: '11/09/2020 00:00:00',
      ProjectName: 'Godrej',
    };
    const completeUrl = `${workingEndpoint}?${new URLSearchParams(
      Object.entries(samplePayload).reduce(
        (accumulator, [key, value]) => ({
          ...accumulator,
          [key]: String(value),
        }),
        {},
      ),
    ).toString()}`;

    return {
      crmName: 'Trueroot Realty CRM',
      pushIntegrationType: 'GET',
      apiKey,
      workingEndpointOpenUrl: workingEndpoint,
      parametersToBePassedWithValues: samplePayload,
      completeWorkingEndpointUrl: completeUrl,
      responseMessageOnLeadSharing: {
        success: 'Success: Lead Mapped To TRUEROOT-CRM Successfully.',
        failure: 'Failure: Lead already exists',
      },
      authenticationType: 'Open URL with ApiKey query parameter',
      clientId: 'Not required',
      clientKey: 'Not required',
      integrationManual: [
        'Configure MagicBricks push integration type as GET.',
        'Use the working endpoint open URL and pass ApiKey plus lead fields as query parameters.',
        'FirstName and Mobile are required. LastName, Email, SecondaryNumber, Remark, Source, VisitDate and ProjectName are optional.',
        'The CRM validates the ApiKey, checks duplicates by mobile/email, maps the project by name, and creates the lead as New Lead.',
      ],
    };
  }

  private coalesceMagicBricksPayload(body: Body) {
    const firstName = String(body.FirstName ?? body.firstName ?? '').trim();
    const lastName = String(body.LastName ?? body.lastName ?? '').trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    return {
      ...body,
      FirstName: fullName || body.FirstName,
      api_key: body.api_key ?? body.ApiKey ?? body.apikey,
      name: body.name ?? body.responderName ?? fullName,
      mobile: body.mobile ?? body.Mobile ?? body.responderPhone,
      alternateMobile:
        body.alternateMobile ??
        body.alternateNumber ??
        body.SecondaryNumber ??
        body.secondaryNumber,
      email: body.email ?? body.Email ?? body.responderEmail,
      project: body.project ?? body.ProjectName ?? body.projectName ?? body.isd,
      projectName:
        body.ProjectName ?? body.projectName ?? body.project ?? body.isd,
      msg: body.msg ?? body.Remark ?? body.remark ?? body.comments,
      comments: body.comments ?? body.Remark ?? body.remark ?? body.msg,
      city: body.city ?? body.City,
      source: body.source ?? body.Source ?? magicBricksDisplayName,
      createdDate: body.CreatedDate ?? body.createdDate,
      hasVisitScheduled: body.HasVisitScheduled ?? body.hasVisitScheduled,
      visitDate: body.VisitDate ?? body.visitDate,
    };
  }

  private async normalizeMagicBricksPayload(
    body: Body,
    mapping?: unknown,
    organizationId?: string,
  ) {
    const payload = this.coalesceMagicBricksPayload(body);
    const fieldMapping = this.getMagicBricksFieldMapping(mapping);
    const normalized: Body = {};

    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      if (targetField === 'skip') continue;
      const rawValue = payload[sourceField];
      if (
        rawValue === undefined ||
        rawValue === null ||
        String(rawValue).trim() === ''
      ) {
        continue;
      }
      if (!normalized[targetField]) {
        normalized[targetField] = String(rawValue).trim();
      }
    }

    const projectName =
      normalized.preferredProject ??
      payload.projectName ??
      payload.project ??
      undefined;
    const matchedProject = projectName
      ? await this.db().project.findFirst({
          where: {
            organizationId,
            OR: [
              { name: { equals: String(projectName), mode: 'insensitive' } },
              { name: { contains: String(projectName), mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, location: true },
        })
      : null;

    const [magicBricksSource, newLeadStatus] = await Promise.all([
      this.getMagicBricksSourceMaster(),
      this.getDefaultNewLeadStatusMaster(),
    ]);
    const remarksParts = [
      normalized.remarks,
      payload.comments && payload.comments !== normalized.remarks
        ? String(payload.comments).trim()
        : undefined,
      payload.alternateMobile
        ? `Secondary number: ${String(payload.alternateMobile).trim()}`
        : undefined,
      payload.createdDate &&
      String(normalized.addedDate ?? '').trim() !==
        String(payload.createdDate).trim()
        ? `MagicBricks created date: ${String(payload.createdDate).trim()}`
        : undefined,
      payload.hasVisitScheduled !== undefined
        ? `Has visit scheduled: ${String(payload.hasVisitScheduled).trim()}`
        : undefined,
      payload.visitDate
        ? `Visit date: ${String(payload.visitDate).trim()}`
        : undefined,
      matchedProject
        ? undefined
        : projectName
        ? `Project: ${String(projectName).trim()}`
        : undefined,
      payload.city ? `City: ${String(payload.city).trim()}` : undefined,
    ].filter(Boolean);

    return {
      payload,
      fieldMapping,
      normalizedLead: {
        leadName: normalized.leadName ?? '',
        mobileNumber: normalized.mobileNumber ?? '',
        emailAddress: normalized.emailAddress ?? '',
        preferredProjectId: matchedProject?.id,
        preferredProjectName:
          matchedProject?.name ?? (projectName ? String(projectName) : ''),
        preferredLocation:
          normalized.preferredLocation ?? matchedProject?.location ?? '',
        leadSourceName: magicBricksSource?.name ?? magicBricksDisplayName,
        leadSourceId: magicBricksSource?.id,
        leadStatusId: newLeadStatus?.id,
        addedDate: normalizeMagicBricksDate(
          normalized.addedDate ?? payload.createdDate,
        ),
        remarks: remarksParts.join(' | '),
        configuration: normalized.configuration ?? '',
        propertyType: normalized.propertyType ?? '',
      },
    };
  }

  async getMagicBricksIntegration(
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureMagicBricksIntegration(
      actorUserId,
      organizationId,
    );
    return this.buildMagicBricksAccountResponse(integration);
  }

  private async buildMagicBricksAccountResponse(integration: Body) {
    const stats = await this.getMagicBricksLeadStats(
      integration.organizationId,
    );
    const manual = await this.buildMagicBricksManual(integration);
    const apiKey = this.connections().buildMagicBricksApiKey(
      integration.webhookKeyId,
    );
    const mapping = this.getMagicBricksFieldMapping(integration.fieldMapping);

    return {
      data: {
        id: integration.id,
        provider: magicBricksProvider,
        name: integration.name ?? 'Primary account',
        externalAccountId: integration.externalAccountId ?? null,
        displayName: magicBricksDisplayName,
        crmName: manual.crmName,
        status: integration.status,
        isActive: integration.isActive,
        isPrimary: Boolean(integration.isPrimary),
        archivedAt: integration.archivedAt ?? null,
        apiKey,
        apiKeyPreview: `••••••••${apiKey.slice(-8)}`,
        endpointUrl: manual.workingEndpointOpenUrl,
        completeWorkingEndpointUrl: manual.completeWorkingEndpointUrl,
        pushIntegrationType: manual.pushIntegrationType,
        authenticationType: manual.authenticationType,
        responseMessages: manual.responseMessageOnLeadSharing,
        fieldMapping: mapping,
        fieldOptions: magicBricksTargetFieldOptions,
        sourceFields: magicBricksPushSourceFields,
        manual,
        stats,
        lastTestedAt: integration.lastTestedAt,
        lastTestStatus: integration.lastTestStatus,
        lastLeadReceivedAt: integration.lastLeadReceivedAt,
        totalLeadsReceived: integration.totalLeadsReceived,
        leadCount: integration._count?.leads ?? 0,
        notes: integration.notes ?? '',
        routing: integration.routingRule ?? null,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    };
  }

  async listMagicBricksAccounts(includeArchived = false) {
    const result = await this.connections().listAccounts(
      magicBricksProvider,
      includeArchived,
    );
    const accounts = await Promise.all(
      result.accounts.map(
        async (account) =>
          (await this.buildMagicBricksAccountResponse(account)).data,
      ),
    );
    return { data: { accounts, summary: result.summary } };
  }

  async getMagicBricksAccount(accountId: string) {
    const account = await this.connections().getAccount(
      magicBricksProvider,
      accountId,
    );
    return this.buildMagicBricksAccountResponse(account);
  }

  async createMagicBricksAccount(body: Body, actorUserId?: string) {
    const account = await this.connections().createAccount(
      magicBricksProvider,
      {
        name: String(body.name ?? ''),
        externalAccountId: optionalString(body.externalAccountId),
      },
      defaultMagicBricksFieldMapping,
      actorUserId,
    );
    return this.buildMagicBricksAccountResponse(account);
  }

  async updateMagicBricksAccount(
    accountId: string,
    body: Body,
    actorUserId?: string,
  ) {
    const account = await this.connections().updateAccount(
      magicBricksProvider,
      accountId,
      {
        name: body.name === undefined ? undefined : String(body.name),
        externalAccountId:
          body.externalAccountId === undefined
            ? undefined
            : String(body.externalAccountId ?? ''),
        isActive: body.isActive,
        notes: body.notes === undefined ? undefined : String(body.notes ?? ''),
      },
      actorUserId,
    );
    return this.buildMagicBricksAccountResponse(account);
  }

  async setMagicBricksAccountsStatus(isActive: boolean, actorUserId?: string) {
    await this.connections().setProviderStatus(
      magicBricksProvider,
      isActive,
      actorUserId,
    );
    return this.listMagicBricksAccounts();
  }

  async archiveMagicBricksAccount(accountId: string, actorUserId?: string) {
    await this.connections().archiveAccount(
      magicBricksProvider,
      accountId,
      actorUserId,
    );
    return this.listMagicBricksAccounts();
  }

  async restoreMagicBricksAccount(accountId: string, actorUserId?: string) {
    const account = await this.connections().restoreAccount(
      magicBricksProvider,
      accountId,
      actorUserId,
    );
    return this.buildMagicBricksAccountResponse(account);
  }

  async saveMagicBricksIntegration(
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }
    const integration = await this.ensureMagicBricksIntegration(
      actorUserId,
      organizationId,
    );
    const isPaused = requestedIntegrationPauseState(body, integration);
    await this.connections().updateAccount(
      magicBricksProvider,
      integration.id,
      {
        ...(body.isActive !== undefined ||
        body.isPaused !== undefined ||
        body.status !== undefined
          ? { isActive: !isPaused }
          : {}),
        notes: body.notes === undefined ? undefined : String(body.notes ?? ''),
      },
      actorUserId,
    );
    return this.getMagicBricksIntegration(actorUserId);
  }

  async regenerateMagicBricksApiKey(
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureMagicBricksIntegration(
      actorUserId,
      organizationId,
    );
    await this.connections().regenerateCredential(
      magicBricksProvider,
      integration.id,
      actorUserId,
    );
    return this.getMagicBricksIntegration(actorUserId);
  }

  async saveMagicBricksFieldMapping(
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureMagicBricksIntegration(
      actorUserId,
      organizationId,
    );
    const mapping = this.getMagicBricksFieldMapping(body.fieldMapping);
    const targetValues = Object.values(mapping);
    if (
      !targetValues.includes('leadName') ||
      !targetValues.includes('mobileNumber')
    ) {
      throw new BadRequestException(
        'Lead name and mobile number must be mapped before continuing',
      );
    }
    await this.connections().saveFieldMapping(
      magicBricksProvider,
      integration.id,
      mapping,
      actorUserId,
    );
    return this.getMagicBricksIntegration(actorUserId);
  }

  async regenerateMagicBricksAccountApiKey(
    accountId: string,
    actorUserId?: string,
  ) {
    const account = await this.connections().regenerateCredential(
      magicBricksProvider,
      accountId,
      actorUserId,
    );
    return this.buildMagicBricksAccountResponse(account);
  }

  async saveMagicBricksAccountFieldMapping(
    accountId: string,
    body: Body,
    actorUserId?: string,
  ) {
    const mapping = this.getMagicBricksFieldMapping(body.fieldMapping);
    const targetValues = Object.values(mapping);
    if (
      !targetValues.includes('leadName') ||
      !targetValues.includes('mobileNumber')
    ) {
      throw new BadRequestException(
        'Lead name and mobile number must be mapped before continuing',
      );
    }
    const account = await this.connections().saveFieldMapping(
      magicBricksProvider,
      accountId,
      mapping,
      actorUserId,
    );
    return this.buildMagicBricksAccountResponse(account);
  }

  async saveMagicBricksAccountRouting(
    accountId: string,
    body: Body,
    actorUserId?: string,
  ) {
    await this.connections().saveRouting(
      magicBricksProvider,
      accountId,
      body,
      actorUserId,
    );
    return this.getMagicBricksAccount(accountId);
  }

  async getMagicBricksAccountActivity(accountId: string) {
    return {
      data: await this.connections().listActivity(
        magicBricksProvider,
        accountId,
      ),
    };
  }

  async testMagicBricksIntegration(
    body: Body,
    actorUserId?: string,
    ip?: string,
    userAgent?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureMagicBricksIntegration(
      actorUserId,
      organizationId,
    );
    return this.testMagicBricksAccountRecord(
      integration,
      body,
      actorUserId,
      ip,
      userAgent,
    );
  }

  async testMagicBricksAccount(
    accountId: string,
    body: Body,
    actorUserId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const integration = await this.connections().getAccount(
      magicBricksProvider,
      accountId,
    );
    return this.testMagicBricksAccountRecord(
      integration,
      body,
      actorUserId,
      ip,
      userAgent,
    );
  }

  private async testMagicBricksAccountRecord(
    integration: Body,
    body: Body,
    actorUserId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const apiKey = this.connections().buildMagicBricksApiKey(
      integration.webhookKeyId,
    );
    const samplePayload = {
      ApiKey: apiKey,
      FirstName: 'Sahil',
      LastName: 'Lad',
      Mobile: '9867456673',
      SecondaryNumber: '9937485683',
      CreatedDate: '07/09/2020 00:00:00',
      Email: 'sahil67@gmail.com',
      Remark: 'Interested in the project. Please contact me.',
      HasVisitScheduled: 'true',
      Source: 'MagicBricks',
      VisitDate: '11/09/2020 00:00:00',
      ProjectName: 'Sunset Residency',
      ...(body.samplePayload ?? {}),
    };

    const preview = await this.normalizeMagicBricksPayload(
      samplePayload,
      integration.fieldMapping,
      integration.organizationId,
    );
    const errors: string[] = [];

    if (isIntegrationPaused(integration)) {
      errors.push('MagicBricks Push API is paused');
    }
    if (!preview.normalizedLead.leadName) errors.push('Lead name is required');
    if (!preview.normalizedLead.mobileNumber)
      errors.push('Mobile number is required');

    const duplicate = preview.normalizedLead.mobileNumber
      ? await this.db().lead.findFirst({
          where: {
            OR: [
              { mobile: preview.normalizedLead.mobileNumber },
              preview.normalizedLead.emailAddress
                ? { email: preview.normalizedLead.emailAddress }
                : undefined,
            ].filter(Boolean),
          },
          select: { id: true, displayId: true, name: true },
        })
      : null;

    const valid = errors.length === 0;
    const status = valid ? 'Success' : 'Failed';

    await this.connections().recordTest(integration.id, status, actorUserId);
    await this.audit(
      actorUserId,
      'MAGICBRICKS_INTEGRATION_TESTED',
      'LeadSourceConnection',
      integration.id,
      {
        valid,
        duplicateLeadId: duplicate?.id,
        ip,
        userAgent,
      },
    );

    return {
      data: {
        valid,
        status,
        endpointUrl: this.magicBricksWebhookUrl(),
        apiKey,
        samplePayload,
        normalizedLead: preview.normalizedLead,
        duplicate:
          duplicate && valid
            ? {
                id: duplicate.id,
                displayId: duplicate.displayId,
                name: duplicate.name,
              }
            : null,
        wouldCreateLead: valid && !duplicate,
        errors,
        responseMessages: {
          success: 'Success: Lead Mapped To TRUEROOT-CRM Successfully.',
          failure: duplicate
            ? 'Failure: Lead already exists'
            : 'Failure: Lead payload is invalid',
        },
      },
    };
  }

  async receiveMagicBricksLead(
    body: Body,
    apiKeyFromHeader?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const apiKey =
      apiKeyFromHeader ?? body.api_key ?? body.ApiKey ?? body.apikey;
    const webhookKeyId = this.connections().verifyMagicBricksApiKey(apiKey);
    const integration = webhookKeyId
      ? await this.connections().findByWebhookKey(
          magicBricksProvider,
          webhookKeyId,
        )
      : null;

    if (!integration || !integration.organizationId) {
      return {
        success: false,
        message: 'Failure: Invalid API key',
      };
    }

    if (isIntegrationPaused(integration)) {
      await this.audit(
        undefined,
        'MAGICBRICKS_WEBHOOK_PAUSED',
        'PortalIntegration',
        integration.id,
        { ip, userAgent },
      );
      return {
        success: false,
        message:
          'Failure: MagicBricks Push API is paused. Lead was not created.',
        status: 'PAUSED',
      };
    }

    const preview = await this.normalizeMagicBricksPayload(
      body,
      integration.fieldMapping,
      integration.organizationId,
    );
    if (
      !preview.normalizedLead.leadName ||
      !preview.normalizedLead.mobileNumber
    ) {
      return {
        success: false,
        message: 'Failure: Name and mobile are required',
      };
    }

    const duplicate = await this.db().lead.findFirst({
      where: {
        OR: [
          { mobile: preview.normalizedLead.mobileNumber },
          preview.normalizedLead.emailAddress
            ? { email: preview.normalizedLead.emailAddress }
            : undefined,
        ].filter(Boolean),
      },
      select: { id: true, displayId: true },
    });

    if (duplicate) {
      await this.audit(
        undefined,
        'MAGICBRICKS_DUPLICATE_LEAD_RECEIVED',
        'Lead',
        duplicate.id,
        {
          displayId: duplicate.displayId,
          ip,
          userAgent,
        },
      );
      return {
        success: false,
        message: 'Failure: Lead already exists',
        leadId: duplicate.id,
        displayId: duplicate.displayId,
      };
    }

    // Payload normalization and duplicate lookup can overlap an admin pause.
    const currentIntegration = await this.connections().findByWebhookKey(
      magicBricksProvider,
      integration.webhookKeyId,
    );
    if (!currentIntegration || isIntegrationPaused(currentIntegration)) {
      return {
        success: false,
        message:
          'Failure: MagicBricks Push API is paused. Lead was not created.',
        status: 'PAUSED',
      };
    }
    const routing =
      currentIntegration.routingRule?.isActive === false
        ? undefined
        : currentIntegration.routingRule;
    const lead = await this.createLead(
      {
        organizationId: integration.organizationId,
        name: preview.normalizedLead.leadName,
        mobile: preview.normalizedLead.mobileNumber,
        email: preview.normalizedLead.emailAddress || undefined,
        sourceId: preview.normalizedLead.leadSourceId,
        statusId: preview.normalizedLead.leadStatusId,
        createdAt: preview.normalizedLead.addedDate,
        preferredProject:
          routing?.projectId ?? preview.normalizedLead.preferredProjectId,
        preferredLocation:
          preview.normalizedLead.preferredLocation || undefined,
        remarks: preview.normalizedLead.remarks || undefined,
        configuration: preview.normalizedLead.configuration || undefined,
        propertyType: preview.normalizedLead.propertyType || undefined,
        ownerId: routing?.ownerId ?? undefined,
        telecallerId: routing?.telecallerId ?? undefined,
        fieldExecutiveId: routing?.fieldExecutiveId ?? undefined,
        autoAssignmentTeamId:
          !routing?.ownerId &&
          !routing?.telecallerId &&
          !routing?.fieldExecutiveId
            ? routing?.teamId ?? undefined
            : undefined,
        integrationConnectionId: integration.id,
      },
      undefined,
      { fromIntegration: true },
    );

    await this.connections().recordLeadReceived(integration.id);
    await this.audit(undefined, 'MAGICBRICKS_LEAD_RECEIVED', 'Lead', lead.id, {
      displayId: lead.displayId,
      integrationConnectionId: integration.id,
      integrationAccountName: integration.name,
      organizationId: integration.organizationId,
      ip,
      userAgent,
    });

    return {
      success: true,
      message: 'Success: Lead Mapped To TRUEROOT-CRM Successfully.',
      leadId: lead.id,
      displayId: lead.displayId,
    };
  }

  // --- WEBSITE LEAD INTEGRATION ---
  // --- 99ACRES PORTAL INTEGRATION ---
  private acres99PublicApiBaseUrl() {
    return this.magicBricksPublicApiBaseUrl();
  }

  private acres99WebhookUrl() {
    return `${this.acres99PublicApiBaseUrl()}/integrations/99acres/leads`;
  }

  private get99AcresFieldMapping(mapping?: unknown) {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      return { ...default99AcresFieldMapping };
    }
    const nextMapping = { ...default99AcresFieldMapping };
    for (const [sourceField, targetField] of Object.entries(mapping as Body)) {
      if (typeof targetField !== 'string' || !targetField.trim()) continue;
      nextMapping[sourceField] = targetField;
    }
    return nextMapping;
  }

  private async ensure99AcresIntegration(
    actorUserId?: string,
    organizationId?: string,
  ) {
    const orgId = await this.resolveTenantOrganizationId(
      actorUserId,
      organizationId,
    );
    const existing = await this.portalIntegrationFindByProvider(
      acres99Provider,
      orgId,
    );
    if (existing) {
      const existingMapping = this.get99AcresFieldMapping(
        existing.fieldMapping,
      );
      const needsPatch =
        !existing.webhookKeyId ||
        !existing.fieldMapping ||
        !existing.displayName ||
        (!existing.organizationId && orgId);
      if (!needsPatch) return existing;
      return this.portalIntegrationUpdate(existing.id, {
        displayName: existing.displayName || acres99DisplayName,
        webhookKeyId: existing.webhookKeyId || randomBytes(12).toString('hex'),
        fieldMapping: existingMapping,
        organizationId: existing.organizationId || orgId,
        updatedById: actorUserId,
      });
    }

    const now = new Date();
    return this.portalIntegrationCreate({
      id: crypto.randomUUID(),
      organizationId: orgId ?? null,
      provider: acres99Provider,
      displayName: acres99DisplayName,
      status: 'Draft',
      isActive: true,
      webhookKeyId: randomBytes(12).toString('hex'),
      fieldMapping: default99AcresFieldMapping,
      totalLeadsReceived: 0,
      createdById: actorUserId,
      updatedById: actorUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  private async get99AcresSourceMaster() {
    const sources = await this.ensureMasters('source', defaultLeadSources);
    return (
      sources.find(
        (source: Body) =>
          String(source.code ?? '').toUpperCase() === '99ACRES' ||
          String(source.name ?? '').toLowerCase() === '99acres',
      ) ?? sources[0]
    );
  }

  private async get99AcresLeadStats(organizationId?: string) {
    const acresSource = await this.get99AcresSourceMaster();
    const sourceFilters = [
      acresSource?.id,
      acresSource?.code,
      acresSource?.name,
      '99Acres',
      '99acres',
      '99ACRES',
    ].filter(Boolean);

    const monthStart = startOfDay(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );

    const whereClause: Body = {
      deletedAt: null,
      sourceId: { in: sourceFilters },
    };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const [totalImportedThisMonth, latestLead] = await Promise.all([
      this.db().lead.count({
        where: {
          ...whereClause,
          createdAt: { gte: monthStart },
        },
      }),
      this.db().lead.findFirst({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalImportedThisMonth,
      lastImportedAt: latestLead?.createdAt ?? null,
    };
  }

  async get99AcresIntegration(actorUserId?: string, organizationId?: string) {
    const orgId = await this.resolveTenantOrganizationId(
      actorUserId,
      organizationId,
    );
    const integration = await this.ensure99AcresIntegration(actorUserId, orgId);
    const stats = await this.get99AcresLeadStats(integration.organizationId);
    const webhookUrl = `${this.acres99PublicApiBaseUrl()}/public/webhooks/99acres/${
      integration.webhookKeyId
    }`;
    const mapping = this.get99AcresFieldMapping(integration.fieldMapping);

    return {
      data: {
        id: integration.id,
        organizationId: integration.organizationId,
        provider: acres99Provider,
        displayName: acres99DisplayName,
        status: integration.status,
        isActive: integration.isActive,
        webhookKeyId: integration.webhookKeyId,
        webhookUrl,
        credentials: integration.credentials ?? {},
        fieldMapping: mapping,
        stats,
        lastTestedAt: integration.lastTestedAt,
        lastTestStatus: integration.lastTestStatus,
        lastLeadReceivedAt: integration.lastLeadReceivedAt,
        totalLeadsReceived: integration.totalLeadsReceived,
        notes: integration.notes ?? '',
      },
    };
  }

  async save99AcresIntegration(
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const orgId = await this.resolveTenantOrganizationId(
      actorUserId,
      organizationId,
    );
    const integration = await this.ensure99AcresIntegration(actorUserId, orgId);
    const isPaused = requestedIntegrationPauseState(body, integration);
    const isActive = !isPaused;
    await this.portalIntegrationUpdate(integration.id, {
      ...(body.isActive !== undefined ||
      body.isPaused !== undefined ||
      body.status !== undefined
        ? { isActive }
        : {}),
      credentials:
        body.credentials !== undefined
          ? body.credentials
          : integration.credentials,
      notes:
        body.notes === undefined ? integration.notes : String(body.notes ?? ''),
      status: isPaused
        ? 'Paused'
        : body.status
        ? String(body.status)
        : integration.status === 'Draft' || integration.status === 'Paused'
        ? 'Configured'
        : integration.status,
      updatedById: actorUserId,
    });
    await this.audit(
      actorUserId,
      '99ACRES_INTEGRATION_UPDATED',
      'PortalIntegration',
      integration.id,
    );
    return this.get99AcresIntegration(actorUserId, orgId);
  }

  async regenerate99AcresApiKey(actorUserId?: string, organizationId?: string) {
    const orgId = await this.resolveTenantOrganizationId(
      actorUserId,
      organizationId,
    );
    const integration = await this.ensure99AcresIntegration(actorUserId, orgId);
    await this.portalIntegrationUpdate(integration.id, {
      webhookKeyId: randomBytes(12).toString('hex'),
      updatedById: actorUserId,
      status:
        integration.status === 'Draft' ? 'Configured' : integration.status,
    });
    await this.audit(
      actorUserId,
      '99ACRES_API_KEY_REGENERATED',
      'PortalIntegration',
      integration.id,
    );
    return this.get99AcresIntegration(actorUserId, orgId);
  }

  async save99AcresFieldMapping(
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const orgId = await this.resolveTenantOrganizationId(
      actorUserId,
      organizationId,
    );
    const integration = await this.ensure99AcresIntegration(actorUserId, orgId);
    const mapping = this.get99AcresFieldMapping(body.fieldMapping);
    await this.portalIntegrationUpdate(integration.id, {
      fieldMapping: mapping,
      status:
        !integration.isActive || integration.status === 'Paused'
          ? 'Paused'
          : 'Mapped',
      updatedById: actorUserId,
    });
    await this.audit(
      actorUserId,
      '99ACRES_FIELD_MAPPING_UPDATED',
      'PortalIntegration',
      integration.id,
      { fieldMapping: mapping },
    );
    return this.get99AcresIntegration(actorUserId, orgId);
  }

  async test99AcresIntegration(
    body: Body,
    actorUserId?: string,
    ip?: string,
    userAgent?: string,
    organizationId?: string,
  ) {
    const orgId = await this.resolveTenantOrganizationId(
      actorUserId,
      organizationId,
    );
    const integration = await this.ensure99AcresIntegration(actorUserId, orgId);
    const samplePayload = {
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul.sharma@example.com',
      propertyType: '2 BHK Apartment',
      budget: '1 - 1.5 Cr',
      location: 'Andheri, Mumbai',
      remarks: 'Interested in ready possession properties',
      ...(body.samplePayload ?? body),
    };

    const sourceMaster = await this.get99AcresSourceMaster();
    const lead = await this.createLead({
      organizationId: integration.organizationId ?? undefined,
      name: samplePayload.name,
      mobile: samplePayload.phone,
      email: samplePayload.email,
      sourceId: sourceMaster?.id,
      preferredLocation: samplePayload.location,
      propertyType: samplePayload.propertyType,
      remarks: samplePayload.remarks,
    });

    await this.portalIntegrationUpdate(integration.id, {
      lastTestedAt: new Date(),
      lastTestStatus: 'Success',
      updatedById: actorUserId,
    });

    return {
      success: true,
      message: 'Test 99Acres lead ingested successfully',
      leadId: lead.id,
      displayId: lead.displayId,
    };
  }

  async receive99AcresLead(
    body: Body,
    apiKeyOrKeyId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const key =
      apiKeyOrKeyId ??
      body.keyId ??
      body.api_key ??
      body.ApiKey ??
      body.webhookKeyId;

    if (!key) {
      return {
        success: false,
        message: 'Failure: Webhook key or API key is required',
      };
    }

    const integration = await this.portalIntegrationFindByWebhookKeyId(
      String(key),
    );
    if (
      !integration ||
      integration.provider !== acres99Provider ||
      !integration.organizationId
    ) {
      return {
        success: false,
        message: 'Failure: 99Acres integration not found for this key',
      };
    }

    if (isIntegrationPaused(integration)) {
      return {
        success: false,
        message: 'Failure: 99Acres integration is paused',
        status: 'PAUSED',
      };
    }

    const payload = body || {};
    const name =
      payload.Name ||
      payload.name ||
      payload.FullName ||
      payload.fullName ||
      '99Acres Lead';
    const mobile =
      payload.Mobile || payload.mobile || payload.Phone || payload.phone;
    const email = payload.Email || payload.email;

    if (!mobile && !email) {
      return {
        success: false,
        message: 'Failure: Phone or email is required',
      };
    }

    const duplicateWhere: Body = {
      deletedAt: null,
      OR: [
        mobile ? { mobile: String(mobile).trim() } : undefined,
        email ? { email: String(email).trim() } : undefined,
      ].filter(Boolean),
    };
    if (integration.organizationId) {
      duplicateWhere.organizationId = integration.organizationId;
    }

    const duplicate = await this.db().lead.findFirst({
      where: duplicateWhere,
      select: { id: true, displayId: true },
    });

    if (duplicate) {
      return {
        success: false,
        message: 'Failure: Lead already exists',
        leadId: duplicate.id,
        displayId: duplicate.displayId,
      };
    }

    const sourceMaster = await this.get99AcresSourceMaster();
    const lead = await this.createLead({
      organizationId: integration.organizationId ?? undefined,
      name: String(name).trim(),
      mobile: mobile ? String(mobile).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      sourceId: sourceMaster?.id,
      preferredLocation:
        payload.Location || payload.location || payload.City || payload.city,
      propertyType: payload.PropertyType || payload.propertyType,
      budgetRange: payload.Budget || payload.budget,
      remarks:
        payload.Remarks || payload.remarks || payload.Query || payload.query,
    });

    await this.portalIntegrationUpdate(integration.id, {
      lastLeadReceivedAt: new Date(),
      totalLeadsReceived: { increment: 1 },
      status: isIntegrationPaused(integration) ? 'Paused' : 'Connected',
    });

    return {
      success: true,
      message: 'Success: 99Acres lead ingested successfully',
      leadId: lead.id,
      displayId: lead.displayId,
    };
  }

  // --- WEBSITE LEAD INTEGRATION ---
  private websitePublicApiBaseUrl() {
    return (
      process.env.WEBSITE_PUBLIC_API_BASE_URL ??
      process.env.MAGICBRICKS_PUBLIC_API_BASE_URL ??
      'https://crmtrueroot.com/api'
    );
  }

  private websiteWebhookUrl() {
    return `${this.websitePublicApiBaseUrl()}/integrations/website/leads`;
  }

  private async assertLeadRoutingInOrganization(
    organizationId: string,
    routing: Record<string, unknown>,
  ): Promise<void> {
    const reference = (key: string): string | undefined => {
      const value = routing[key];
      if (value === undefined || value === null || value === '')
        return undefined;
      if (typeof value !== 'string' || !value.trim()) {
        throw new BadRequestException(`Invalid ${key}`);
      }
      return value.trim();
    };
    const projectId = reference('projectId');
    const teamId = reference('teamId');
    const userIds = [
      ...new Set(
        ['ownerId', 'managerId', 'telecallerId', 'fieldExecutiveId']
          .map(reference)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (
      projectId &&
      !(await this.prisma.project.findFirst({
        where: { id: projectId, organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Project not found in this workspace');
    if (
      teamId &&
      !(await this.prisma.team.findFirst({
        where: { id: teamId, organizationId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Team not found in this workspace');
    if (userIds.length) {
      const count = await this.prisma.user.count({
        where: {
          id: { in: userIds },
          isActive: true,
          role: { not: 'SUPER_ADMIN' },
          organizationMemberships: {
            some: { organizationId, isActive: true },
            none: { organizationId: { not: organizationId } },
          },
        },
      });
      if (count !== userIds.length) {
        throw new NotFoundException('Assignee not found in this workspace');
      }
    }
  }

  private async ensureWebsiteIntegration(
    actorUserId?: string,
    organizationId?: string,
  ) {
    const orgId = await this.resolveTenantOrganizationId(
      actorUserId,
      organizationId,
    );
    if (!orgId) throw new ForbiddenException('Select a tenant workspace');
    return this.prisma.portalIntegration.upsert({
      where: {
        organizationId_provider: { organizationId: orgId, provider: 'website' },
      },
      update: {},
      create: {
        provider: 'website',
        organizationId: orgId,
        displayName: 'Website Leads',
        webhookKeyId: randomBytes(12).toString('hex'),
        isActive: true,
        status: 'Configured',
        createdById: actorUserId,
        updatedById: actorUserId,
        fieldMapping: {
          connectedWebsites: [],
          mapping: {
            name: 'leadName',
            mobile: 'mobileNumber',
            email: 'emailAddress',
            configuration: 'configuration',
            project: 'preferredProject',
            remarks: 'remarks',
          },
        },
      },
    });
  }

  private async getWebsiteSourceMaster() {
    let websiteSource = await this.db().leadMasterValue.findFirst({
      where: {
        categoryRef: { code: 'source' },
        OR: [
          { code: { equals: 'WEBSITE', mode: 'insensitive' } },
          { name: { equals: 'Website', mode: 'insensitive' } },
        ],
      },
    });

    if (!websiteSource) {
      let sourceCat = await this.db().leadMasterCategory.findUnique({
        where: { code: 'source' },
      });
      if (!sourceCat) {
        sourceCat = await this.db().leadMasterCategory.create({
          data: { code: 'source', name: 'Lead Source Master' },
        });
      }
      websiteSource = await this.db().leadMasterValue.create({
        data: {
          categoryId: sourceCat.id,
          name: 'Website',
          code: 'WEBSITE',
          description: 'Landing page and website web form lead captures',
          group: 'Portal',
          statusType: 'Custom',
          isActive: true,
          pointsEnabled: true,
        },
      });
    }

    return websiteSource;
  }

  async getWebsiteIntegration(actorUserId?: string, organizationId?: string) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    const rawMapping = (integration.fieldMapping as any) ?? {};
    const connectedWebsites = await normalizeLegacyRoutingOwners(
      this.db(),
      Array.isArray(rawMapping.connectedWebsites)
        ? rawMapping.connectedWebsites
        : [],
      this.tenantAccess.employeeWhere(integration.organizationId),
    );
    const fieldMapping = rawMapping.mapping ?? {
      name: 'leadName',
      mobile: 'mobileNumber',
      email: 'emailAddress',
      configuration: 'configuration',
      project: 'preferredProject',
      remarks: 'remarks',
    };

    const apiKey = `truroot_web_${integration.webhookKeyId}`;

    return {
      data: {
        id: integration.id,
        provider: 'website',
        displayName: 'Website Leads',
        crmName: 'Truroot Realty CRM',
        status: integration.status,
        isActive: integration.isActive,
        apiKey,
        apiKeyPreview: `••••••••${apiKey.slice(-8)}`,
        endpointUrl: this.websiteWebhookUrl(),
        scriptSnippetUrl: `${this.websitePublicApiBaseUrl()}/integrations/website/tracker.js`,
        connectedWebsites,
        fieldMapping,
        fieldOptions: [
          { value: 'leadName', label: 'Lead Name', required: true },
          { value: 'mobileNumber', label: 'Mobile Number', required: true },
          { value: 'emailAddress', label: 'Email Address', required: false },
          {
            value: 'configuration',
            label: 'Configuration (BHK)',
            required: false,
          },
          { value: 'preferredLocation', label: 'Location', required: false },
          { value: 'remarks', label: 'Remarks / Comments', required: false },
          { value: 'skip', label: 'Do Not Import', required: false },
        ],
        sourceFields: [
          { key: 'name', label: 'Full Name', sample: 'Rahul Verma' },
          { key: 'mobile', label: 'Mobile / Tel', sample: '9876543210' },
          { key: 'email', label: 'Email Address', sample: 'rahul@example.com' },
          { key: 'configuration', label: 'Configuration', sample: '2 BHK' },
          {
            key: 'project',
            label: 'Project Name',
            sample: 'Walchand Park View',
          },
          {
            key: 'remarks',
            label: 'Remarks',
            sample: 'Looking for ready possession',
          },
        ],
        stats: {
          totalImportedThisMonth: integration.totalLeadsReceived ?? 0,
          lastImportedAt: integration.lastLeadReceivedAt
            ? integration.lastLeadReceivedAt.toISOString()
            : null,
        },
        lastTestedAt: integration.lastTestedAt
          ? integration.lastTestedAt.toISOString()
          : null,
        lastTestStatus: integration.lastTestStatus,
        lastLeadReceivedAt: integration.lastLeadReceivedAt
          ? integration.lastLeadReceivedAt.toISOString()
          : null,
        totalLeadsReceived: integration.totalLeadsReceived ?? 0,
        notes: integration.notes ?? '',
      },
    };
  }

  async saveWebsiteIntegration(
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    const isPaused = requestedIntegrationPauseState(body, integration);
    await this.portalIntegrationUpdate(integration.id, {
      isActive: !isPaused,
      notes:
        body.notes === undefined ? integration.notes : String(body.notes ?? ''),
      status: isPaused ? 'Paused' : 'Configured',
      updatedById: actorUserId,
    });
    return this.getWebsiteIntegration(actorUserId, organizationId);
  }

  async addWebsiteUrl(
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    const rawMapping = (integration.fieldMapping as any) ?? {};
    const connectedWebsites = Array.isArray(rawMapping.connectedWebsites)
      ? [...rawMapping.connectedWebsites]
      : [];
    const url = String(body.url ?? '').trim();
    if (!url) throw new BadRequestException('Website URL is required');

    const newWebsite = {
      id: `site_${Date.now()}`,
      url,
      name: body.name
        ? String(body.name).trim()
        : url.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      addedAt: new Date().toISOString(),
      leadsCount: 0,
    };
    connectedWebsites.push(newWebsite);

    await this.portalIntegrationUpdate(integration.id, {
      fieldMapping: {
        ...rawMapping,
        connectedWebsites,
      },
      updatedById: actorUserId,
    });
    return this.getWebsiteIntegration(actorUserId, organizationId);
  }

  async deleteWebsiteUrl(
    websiteId: string,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    const rawMapping = (integration.fieldMapping as any) ?? {};
    const connectedWebsites = (rawMapping.connectedWebsites ?? []).filter(
      (site: any) => site.id !== websiteId,
    );
    await this.portalIntegrationUpdate(integration.id, {
      fieldMapping: {
        ...rawMapping,
        connectedWebsites,
      },
      updatedById: actorUserId,
    });
    return this.getWebsiteIntegration(actorUserId, organizationId);
  }

  private async assertValidRoutingAssignees(
    telecallerId?: string,
    fieldExecutiveId?: string,
    ownerId?: string,
  ) {
    if (this.tenantAccess.selectedOrganizationId) {
      await this.tenantAccess.assertEmployees(
        [telecallerId, fieldExecutiveId, ownerId].filter((id): id is string =>
          Boolean(id),
        ),
      );
    }
    return assertValidRoutingAssignees(
      this.prisma,
      telecallerId,
      fieldExecutiveId,
      ownerId,
    );
  }

  async saveWebsiteRouting(
    websiteId: string,
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    await this.assertLeadRoutingInOrganization(
      integration.organizationId,
      body,
    );
    const rawMapping = (integration.fieldMapping as any) ?? {};
    const requestedTelecallerId = optionalString(body.telecallerId);
    const requestedFieldExecutiveId = optionalString(body.fieldExecutiveId);
    const requestedOwnerId = optionalString(body.ownerId);
    await this.assertValidRoutingAssignees(
      requestedTelecallerId,
      requestedFieldExecutiveId,
      requestedOwnerId,
    );
    const connectedWebsites = (rawMapping.connectedWebsites ?? []).map(
      (site: any) => {
        if (site.id !== websiteId) return site;
        return {
          ...site,
          projectId: body.projectId || undefined,
          sourceId: body.sourceId || undefined,
          teamId: body.teamId || undefined,
          ownerId: requestedOwnerId,
          telecallerId: requestedTelecallerId,
          fieldExecutiveId: requestedFieldExecutiveId,
        };
      },
    );

    await this.portalIntegrationUpdate(integration.id, {
      fieldMapping: {
        ...rawMapping,
        connectedWebsites,
      },
      updatedById: actorUserId,
    });
    return this.getWebsiteIntegration(actorUserId, organizationId);
  }

  async regenerateWebsiteApiKey(actorUserId?: string, organizationId?: string) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    await this.portalIntegrationUpdate(integration.id, {
      webhookKeyId: randomBytes(12).toString('hex'),
      updatedById: actorUserId,
    });
    return this.getWebsiteIntegration(actorUserId, organizationId);
  }

  async saveWebsiteFieldMapping(
    body: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    const rawMapping = (integration.fieldMapping as any) ?? {};
    await this.portalIntegrationUpdate(integration.id, {
      fieldMapping: {
        ...rawMapping,
        mapping: body.fieldMapping ?? rawMapping.mapping,
      },
      updatedById: actorUserId,
    });
    return this.getWebsiteIntegration(actorUserId, organizationId);
  }

  async testWebsiteIntegration(
    body: Body,
    actorUserId?: string,
    ip?: string,
    userAgent?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    if (isIntegrationPaused(integration)) {
      await this.portalIntegrationUpdate(integration.id, {
        lastTestedAt: new Date(),
        lastTestStatus: 'Failed',
        updatedById: actorUserId,
      });

      return {
        data: {
          valid: false,
          status: 'Paused',
          endpointUrl: this.websiteWebhookUrl(),
          apiKey: `truroot_web_${integration.webhookKeyId}`,
          samplePayload: body.samplePayload ?? {},
          wouldCreateLead: false,
          errors: ['Website Integration is paused'],
        },
      };
    }

    const samplePayload = {
      name: String(body.samplePayload?.name ?? body.name ?? 'Rahul Verma'),
      mobile: String(body.samplePayload?.mobile ?? body.mobile ?? '9876543210'),
      email: String(
        body.samplePayload?.email ?? body.email ?? 'rahul@example.com',
      ),
      configuration: String(
        body.samplePayload?.configuration ?? body.configuration ?? '2 BHK',
      ),
      websiteUrl: String(
        body.samplePayload?.websiteUrl ??
          body.websiteUrl ??
          'https://jpnorthgarden.projectmiraroad.com/',
      ),
    };

    // Test the same routing, duplicate checks, and assignment policy as a real
    // website submission rather than creating an independently routed lead.
    const result = await this.receiveWebsiteLead(
      samplePayload,
      `truroot_web_${integration.webhookKeyId}`,
      ip,
      userAgent,
    );
    if (!result.success) {
      await this.portalIntegrationUpdate(integration.id, {
        lastTestedAt: new Date(),
        lastTestStatus: 'Failed',
        updatedById: actorUserId,
      });
      return {
        data: {
          valid: false,
          status: 'Failed',
          endpointUrl: this.websiteWebhookUrl(),
          apiKey: `truroot_web_${integration.webhookKeyId}`,
          samplePayload,
          wouldCreateLead: false,
          errors: [result.message],
        },
      };
    }

    await this.portalIntegrationUpdate(integration.id, {
      lastTestedAt: new Date(),
      lastTestStatus: 'Success',
    });

    return {
      data: {
        valid: true,
        status: 'Connected',
        endpointUrl: this.websiteWebhookUrl(),
        apiKey: `truroot_web_${integration.webhookKeyId}`,
        samplePayload,
        normalizedLead: {
          leadName: samplePayload.name,
          mobileNumber: samplePayload.mobile,
          emailAddress: samplePayload.email,
          configuration: samplePayload.configuration,
          leadSourceName: 'Website',
        },
        wouldCreateLead: true,
        errors: [],
      },
    };
  }

  async receiveWebsiteLead(
    body: Body,
    apiKey?: string,
    ip?: string,
    userAgent?: string,
  ) {
    // Handle raw string, Buffer, JSON string, or urlencoded body types
    let rawBody: Record<string, any> = {};
    if (typeof body === 'string') {
      try {
        rawBody = JSON.parse(body);
      } catch {
        try {
          const params = new URLSearchParams(body);
          const parsed: Record<string, any> = {};
          params.forEach((v, k) => {
            if (k) parsed[k] = v;
          });
          rawBody = parsed;
        } catch {
          rawBody = {};
        }
      }
    } else if (Buffer.isBuffer(body)) {
      try {
        const str = (body as Buffer).toString('utf-8');
        try {
          rawBody = JSON.parse(str);
        } catch {
          const params = new URLSearchParams(str);
          const parsed: Record<string, any> = {};
          params.forEach((v, k) => {
            if (k) parsed[k] = v;
          });
          rawBody = parsed;
        }
      } catch {
        rawBody = {};
      }
    } else if (body && typeof body === 'object') {
      rawBody = { ...body };
    }

    const suppliedKey = String(
      apiKey ?? rawBody.apiKey ?? rawBody.api_key ?? rawBody.ApiKey ?? '',
    ).trim();
    const keyId = suppliedKey.replace(/^truroot_web_/, '');
    if (!keyId) throw new UnauthorizedException('Website API key is required');
    const integration = await this.portalIntegrationFindByWebhookKeyId(keyId);
    if (
      !integration ||
      integration.provider !== 'website' ||
      !integration.organizationId
    ) {
      throw new UnauthorizedException('Invalid website API key');
    }
    const organizationId = integration.organizationId;
    if (isIntegrationPaused(integration)) {
      await this.audit(
        undefined,
        'WEBSITE_WEBHOOK_PAUSED',
        'PortalIntegration',
        integration.id,
        { ip, userAgent },
        organizationId,
      ).catch(() => undefined);

      return {
        success: false,
        message:
          'Failure: Website Integration is paused. Lead was not created.',
        status: 'PAUSED',
      };
    }

    // Flatten Google Ads user_column_data, Elementor form_fields, WPForms, CF7, and nested objects
    const extractedFields: Record<string, string> = {};
    const walkPayload = (node: any) => {
      if (!node) return;

      // Handle Google Ads user_column_data format: [{ column_id/column_name: "FULL_NAME", string_value: "..." }]
      if (Array.isArray(node)) {
        for (const item of node) {
          if (item && typeof item === 'object') {
            const key = String(
              item.column_id ||
                item.column_name ||
                item.name ||
                item.label ||
                item.id ||
                item.field_id ||
                '',
            )
              .trim()
              .toLowerCase();
            const val = String(
              item.string_value || item.value || item.val || item.text || '',
            ).trim();
            if (key && val) {
              extractedFields[key] = val;
              extractedFields[key.replace(/[^a-z0-9]/g, '')] = val;
            }
            walkPayload(item);
          }
        }
        return;
      }

      if (typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          const keyLower = k.trim().toLowerCase();
          const cleanKey = keyLower.replace(/[^a-z0-9]/g, '');
          if (v && (typeof v === 'string' || typeof v === 'number')) {
            const strVal = String(v).trim();
            if (strVal) {
              extractedFields[keyLower] = strVal;
              extractedFields[cleanKey] = strVal;
            }
          } else if (v && typeof v === 'object') {
            walkPayload(v);
          }
        }
      }
    };

    walkPayload(rawBody);

    // 1. Extract Name
    let extractedFirstName =
      extractedFields['first_name'] ||
      extractedFields['firstname'] ||
      extractedFields['fname'] ||
      '';
    let extractedLastName =
      extractedFields['last_name'] ||
      extractedFields['lastname'] ||
      extractedFields['lname'] ||
      '';

    let extractedName =
      extractedFields['your-name'] ||
      extractedFields['your_name'] ||
      extractedFields['yourname'] ||
      extractedFields['full_name'] ||
      extractedFields['fullname'] ||
      extractedFields['full name'] ||
      extractedFields['name'] ||
      extractedFields['lead_name'] ||
      extractedFields['leadname'] ||
      extractedFields['customer_name'] ||
      extractedFields['customername'] ||
      extractedFields['client_name'] ||
      extractedFields['clientname'] ||
      extractedFields['person_name'] ||
      extractedFields['personname'] ||
      extractedFields['user_name'] ||
      extractedFields['username'] ||
      extractedFields['author_name'] ||
      (extractedFirstName || extractedLastName
        ? `${extractedFirstName} ${extractedLastName}`.trim()
        : '');

    // Fallback: search extractedFields for any string value that looks like a person's name
    if (!extractedName || extractedName.toLowerCase() === 'website lead') {
      for (const [k, v] of Object.entries(extractedFields)) {
        if (
          k.includes('name') &&
          v &&
          v.length >= 2 &&
          !v.includes('@') &&
          !v.startsWith('http') &&
          !/\d{5,}/.test(v)
        ) {
          extractedName = v;
          break;
        }
      }
    }

    const name =
      extractedName && extractedName.toLowerCase() !== 'website lead'
        ? extractedName
        : 'Website Lead';

    // 2. Extract Mobile Number (Ensuring valid 10+ digits)
    const prefixCC = String(
      extractedFields['fullmobileno'] ||
        extractedFields['full_mobile_no'] ||
        extractedFields['countrycode'] ||
        extractedFields['country_code'] ||
        '',
    ).trim();
    const mainNum = String(
      extractedFields['mobile'] ||
        extractedFields['phone'] ||
        extractedFields['phone_number'] ||
        extractedFields['phonenumber'] ||
        extractedFields['user_phone'] ||
        extractedFields['your-phone'] ||
        extractedFields['your_phone'] ||
        '',
    ).trim();

    let mobile = '';

    // If prefixCC (+91) and mainNum (2342342342) are both provided
    if (prefixCC && mainNum && mainNum.replace(/\D/g, '').length >= 10) {
      mobile = `${prefixCC} ${mainNum}`.trim();
    } else if (mainNum && mainNum.replace(/\D/g, '').length >= 10) {
      mobile = mainNum;
    } else {
      const phoneCandidates = [
        extractedFields['mobile'],
        extractedFields['phone_number'],
        extractedFields['phonenumber'],
        extractedFields['phone number'],
        extractedFields['user_phone'],
        extractedFields['userphone'],
        extractedFields['user phone'],
        extractedFields['phone'],
        extractedFields['tel'],
        extractedFields['your-phone'],
        extractedFields['your_phone'],
        extractedFields['yourphone'],
        extractedFields['contact'],
        extractedFields['contact_number'],
        extractedFields['number'],
        extractedFields['fullmobileno'],
      ];

      for (const candidate of phoneCandidates) {
        if (candidate) {
          const digits = candidate.replace(/\D/g, '');
          if (digits.length >= 10) {
            mobile = candidate;
            break;
          }
        }
      }
    }

    // Fallback: search all values in extractedFields for a 10+ digit number string
    if (!mobile || mobile.replace(/\D/g, '').length < 10) {
      for (const val of Object.values(extractedFields)) {
        if (val) {
          const cleanDigits = val.replace(/\D/g, '');
          if (cleanDigits.length >= 10 && cleanDigits.length <= 15) {
            mobile = val;
            break;
          }
        }
      }
    }

    // Fallback: if no phone number was submitted (e.g. only email/name), generate a unique timestamp/email phone key so lead capture NEVER fails
    if (!mobile) {
      const emailVal =
        extractedFields['email'] ||
        extractedFields['emailaddress'] ||
        extractedFields['user_email'] ||
        extractedFields['your-email'];
      if (emailVal) {
        const hash = Math.abs(
          String(emailVal)
            .split('')
            .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0),
        )
          .toString()
          .padEnd(10, '0')
          .slice(0, 10);
        mobile = `999${hash.slice(3)}`;
      } else {
        mobile = `999${Date.now().toString().slice(-7)}`;
      }
    }

    const email =
      rawBody.email ||
      rawBody.emailAddress ||
      rawBody.user_email ||
      rawBody['your-email']
        ? String(
            rawBody.email ||
              rawBody.emailAddress ||
              rawBody.user_email ||
              rawBody['your-email'],
          ).trim()
        : undefined;
    const configuration =
      rawBody.configuration || rawBody.config || rawBody.bhk
        ? String(rawBody.configuration || rawBody.config || rawBody.bhk).trim()
        : undefined;
    const project =
      rawBody.project || rawBody.projectName || rawBody.project_name
        ? String(
            rawBody.project || rawBody.projectName || rawBody.project_name,
          ).trim()
        : undefined;
    const submittedRemarks = optionalString(
      rawBody.remarks ??
        rawBody.remark ??
        rawBody.comments ??
        rawBody.comment ??
        rawBody.message ??
        rawBody.msg ??
        extractedFields.remarks ??
        extractedFields.remark ??
        extractedFields.comments ??
        extractedFields.comment ??
        extractedFields.message ??
        extractedFields.msg,
    );

    // 3. Robust Deduplication Guard (Last 10 digits match + 24 hour window + Concurrency Lock)
    const cleanDigits = mobile.replace(/\D/g, '').slice(-10);
    const recentDuplicateWindow = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24-hour window
    const phoneKey = cleanDigits.length >= 10 ? cleanDigits : mobile;
    const lockKey = `${organizationId}:${phoneKey}`;

    // Clean stale locks (> 15 seconds old)
    const lockNow = Date.now();
    for (const [k, lockTime] of activeLeadLocks.entries()) {
      if (lockNow - lockTime > 15000) {
        activeLeadLocks.delete(k);
      }
    }

    // Handle parallel duplicate requests sent in the exact same millisecond by browser
    if (activeLeadLocks.has(lockKey)) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const existingAfterWait = await this.db().lead.findFirst({
        where: {
          organizationId,
          OR: [{ mobile: { contains: phoneKey } }, { mobile: mobile }],
          createdAt: { gte: recentDuplicateWindow },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existingAfterWait) {
        return {
          success: true,
          message:
            'Website lead captured successfully into Truroot Realty CRM.',
          leadId: existingAfterWait.id,
          displayId: existingAfterWait.displayId,
        };
      }
    }

    activeLeadLocks.set(lockKey, lockNow);

    let existingRecentLead: any = null;
    try {
      if (cleanDigits.length >= 10) {
        existingRecentLead = await this.db().lead.findFirst({
          where: {
            organizationId,
            OR: [{ mobile: { contains: cleanDigits } }, { mobile: mobile }],
            createdAt: { gte: recentDuplicateWindow },
          },
          orderBy: { createdAt: 'desc' },
        });
      } else {
        existingRecentLead = await this.db().lead.findFirst({
          where: {
            organizationId,
            mobile,
            createdAt: { gte: recentDuplicateWindow },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    } finally {
      setTimeout(() => activeLeadLocks.delete(lockKey), 3000);
    }

    if (existingRecentLead) {
      // Update existing lead if name was previously 'Website Lead' and real name is now extracted!
      if (
        name &&
        name !== 'Website Lead' &&
        (!existingRecentLead.name || existingRecentLead.name === 'Website Lead')
      ) {
        await this.db()
          .lead.update({
            where: { id: existingRecentLead.id },
            data: { name },
          })
          .catch(() => undefined);
      }

      this.logger.log(
        `[WebsiteWebhook] deduplicated rapid submission for ${name} (${mobile}), reusing existing lead ${existingRecentLead.displayId}`,
      );
      await this.audit(
        undefined,
        'WEBSITE_DUPLICATE_LEAD_RECEIVED',
        'Lead',
        existingRecentLead.id,
        {
          displayId: existingRecentLead.displayId,
          name,
          mobile,
          websiteUrl: rawBody.websiteUrl || rawBody.url || rawBody.site || '',
          reason: 'Duplicate submission deduplicated within 24 hours',
          outcome: `Reused existing lead ${existingRecentLead.displayId}`,
        },
        organizationId,
      ).catch(() => undefined);
      return {
        success: true,
        message: 'Website lead captured successfully into Truroot Realty CRM.',
        leadId: existingRecentLead.id,
        displayId: existingRecentLead.displayId,
      };
    }

    // Extract website URL/domain from request payload or headers
    const incomingUrl = String(
      body.websiteUrl || body.url || body.site || body.referrer || '',
    ).trim();

    const rawMapping = (integration.fieldMapping as any) ?? {};
    const connectedWebsites = Array.isArray(rawMapping.connectedWebsites)
      ? [...rawMapping.connectedWebsites]
      : [];

    let matchedWebsite: any = undefined;
    let matchedWebsiteIndex = -1;

    if (connectedWebsites.length > 0) {
      if (incomingUrl) {
        matchedWebsiteIndex = connectedWebsites.findIndex((s: any) => {
          const sUrl = String(s.url ?? '')
            .toLowerCase()
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .replace(/\/$/, '');
          const sName = String(s.name ?? '').toLowerCase();
          const cleanIncoming = incomingUrl
            .toLowerCase()
            .replace(/^https?:\/\//i, '')
            .replace(/^www\./i, '')
            .replace(/\/$/, '');
          return (
            (sUrl &&
              (cleanIncoming.includes(sUrl) || sUrl.includes(cleanIncoming))) ||
            (sName &&
              (cleanIncoming.includes(sName) || sName.includes(cleanIncoming)))
          );
        });
      }
      // Never borrow another website's route for an unknown incoming URL.
      // A URL-less legacy request is attributable only when one site exists.
      if (
        matchedWebsiteIndex === -1 &&
        !incomingUrl &&
        connectedWebsites.length === 1
      ) {
        matchedWebsiteIndex = 0;
      }
      if (matchedWebsiteIndex !== -1) {
        matchedWebsite = connectedWebsites[matchedWebsiteIndex];
      }
    }

    // Determine Source ID override or default Website source
    let effectiveSourceId = matchedWebsite?.sourceId;
    if (!effectiveSourceId) {
      const sourceMaster = await this.getWebsiteSourceMaster();
      effectiveSourceId = sourceMaster?.id;
    }

    // Determine Project ID override or match by name
    let effectiveProjectId = matchedWebsite?.projectId;
    if (!effectiveProjectId && project) {
      const projects = await this.db()
        .project.findMany({
          where: { status: 'Active', organizationId },
          select: { id: true, name: true },
        })
        .catch(() => []);
      const matchedProj = projects.find(
        (p: any) =>
          p.name.toLowerCase().includes(project.toLowerCase()) ||
          project.toLowerCase().includes(p.name.toLowerCase()),
      );
      if (matchedProj) effectiveProjectId = matchedProj.id;
    }

    const [routing] = await normalizeLegacyRoutingOwners(
      this.prisma,
      [matchedWebsite ?? {}],
      this.tenantAccess.employeeWhere(organizationId),
    );
    const lead = await this.createLead(
      {
        organizationId,
        name,
        mobile,
        email,
        sourceId: effectiveSourceId,
        projectId: effectiveProjectId,
        preferredProjectId: effectiveProjectId,
        configuration,
        ownerId: routing.ownerId,
        telecallerId: routing.telecallerId,
        fieldExecutiveId: routing.fieldExecutiveId,
        autoAssignmentTeamId: matchedWebsite?.teamId,
        remarks: submittedRemarks,
      },
      undefined,
      { fromIntegration: true },
    );

    this.logger.log(
      `[WebsiteWebhook] created website lead as ${lead.displayId} (${lead.id}) for ${name} (${mobile})`,
    );

    await this.audit(
      undefined,
      'WEBSITE_LEAD_RECEIVED',
      'Lead',
      lead.id,
      {
        displayId: lead.displayId,
        name,
        mobile,
        websiteUrl: incomingUrl || matchedWebsite?.url || 'Website Form',
        outcome: `Website lead ${lead.displayId} created successfully`,
      },
      organizationId,
    ).catch(() => undefined);

    // Update connectedWebsites lead counter so website screen reflects captured lead count
    if (matchedWebsiteIndex !== -1 && connectedWebsites[matchedWebsiteIndex]) {
      connectedWebsites[matchedWebsiteIndex] = {
        ...connectedWebsites[matchedWebsiteIndex],
        leadsCount:
          (connectedWebsites[matchedWebsiteIndex].leadsCount || 0) + 1,
        lastLeadReceivedAt: new Date().toISOString(),
      };
    }

    await this.portalIntegrationUpdate(integration.id, {
      lastLeadReceivedAt: new Date(),
      totalLeadsReceived: { increment: 1 },
      fieldMapping: {
        ...rawMapping,
        connectedWebsites,
      },
    });

    return {
      success: true,
      message: 'Website lead captured successfully into Truroot Realty CRM.',
      leadId: lead.id,
      displayId: lead.displayId,
    };
  }

  private metaPublicApiBaseUrl() {
    const configured =
      process.env.META_PUBLIC_API_BASE_URL ?? process.env.PUBLIC_API_BASE_URL;
    if (configured) return configured.replace(/\/$/, '');
    const frontendUrl = String(process.env.FRONTEND_URL ?? '').replace(
      /\/$/,
      '',
    );
    if (frontendUrl.startsWith('http')) return `${frontendUrl}/api`;
    return 'https://crmtrueroot.com/api';
  }

  private metaWebhookUrl() {
    return `${this.metaPublicApiBaseUrl()}/integrations/meta/webhook`;
  }

  private metaOAuthCallbackUrl() {
    return `${this.metaPublicApiBaseUrl()}/integrations/meta/oauth/callback`;
  }

  private metaFrontendReturnUrl(params: Record<string, string>) {
    const frontendUrl = String(
      process.env.FRONTEND_URL ?? 'https://crmtrueroot.com',
    ).replace(/\/$/, '');
    const url = new URL(`${frontendUrl}/leads/import/connect/meta`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  private metaAppSecret() {
    return String(process.env.META_APP_SECRET ?? '').trim();
  }

  private configuredMetaAppId(
    settings?: ReturnType<typeof this.getMetaSettings>,
  ) {
    return String(process.env.META_APP_ID ?? settings?.appId ?? '').trim();
  }

  private metaOAuthStateSecret() {
    return String(
      process.env.META_OAUTH_STATE_SECRET ??
        process.env.JWT_SECRET ??
        process.env.ACCESS_TOKEN_SECRET ??
        'meta-oauth-state',
    );
  }

  private encodeMetaOAuthState(payload: Body) {
    const body = Buffer.from(
      JSON.stringify({
        ...payload,
        expiresAt: Date.now() + 10 * 60 * 1000,
        nonce: randomBytes(8).toString('hex'),
      }),
      'utf8',
    ).toString('base64url');
    const signature = createHmac('sha256', this.metaOAuthStateSecret())
      .update(body)
      .digest('base64url');
    return `${body}.${signature}`;
  }

  private decodeMetaOAuthState(state: unknown) {
    const raw = String(state ?? '');
    const [body, signature] = raw.split('.');
    if (!body || !signature)
      throw new BadRequestException('Invalid OAuth state');
    const expectedSignature = createHmac('sha256', this.metaOAuthStateSecret())
      .update(body)
      .digest('base64url');
    if (signature !== expectedSignature) {
      throw new BadRequestException('Invalid OAuth state signature');
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.actorUserId || Number(payload.expiresAt) < Date.now()) {
      throw new BadRequestException('Expired OAuth state');
    }
    return payload as {
      actorUserId: string;
      organizationId?: string;
      reconnectAccountId?: string;
    };
  }

  private getMetaFieldMapping(mapping?: unknown) {
    if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
      return { ...defaultMetaFieldMapping };
    }
    const nextMapping = { ...defaultMetaFieldMapping };
    for (const [sourceField, targetField] of Object.entries(mapping as Body)) {
      if (typeof targetField !== 'string' || !targetField.trim()) continue;
      nextMapping[sourceField] = targetField;
    }
    return nextMapping;
  }

  private getMetaSettings(settings?: unknown) {
    const source =
      settings && typeof settings === 'object' && !Array.isArray(settings)
        ? (settings as Body)
        : {};
    const legacyPageId = String(source.pageId ?? '').trim();
    const legacySelectedFormIds = Array.isArray(source.selectedFormIds)
      ? source.selectedFormIds.map((value: unknown) => String(value))
      : [];
    const rawPageSelections =
      source.pageFormSelections &&
      typeof source.pageFormSelections === 'object' &&
      !Array.isArray(source.pageFormSelections)
        ? (source.pageFormSelections as Body)
        : {};
    const pageFormSelections = Object.fromEntries(
      Object.entries(rawPageSelections).map(([pageId, formIds]) => [
        String(pageId),
        Array.isArray(formIds)
          ? formIds.map((value: unknown) => String(value))
          : [],
      ]),
    );
    if (
      legacyPageId &&
      legacySelectedFormIds.length &&
      !pageFormSelections[legacyPageId]
    ) {
      pageFormSelections[legacyPageId] = legacySelectedFormIds;
    }
    const rawPageProjectMappings =
      source.pageProjectMappings &&
      typeof source.pageProjectMappings === 'object' &&
      !Array.isArray(source.pageProjectMappings)
        ? (source.pageProjectMappings as Body)
        : {};
    const pageProjectMappings = Object.fromEntries(
      Object.entries(rawPageProjectMappings)
        .map(([pageId, projectId]) => [
          String(pageId).trim(),
          String(projectId ?? '').trim(),
        ])
        .filter(([pageId, projectId]) => pageId && projectId),
    );
    const toPageValueMappings = (value: unknown) =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? Object.fromEntries(
            Object.entries(value as Body)
              .map(([pageId, mappedId]) => [
                String(pageId).trim(),
                String(mappedId ?? '').trim(),
              ])
              .filter(([pageId, mappedId]) => pageId && mappedId),
          )
        : {};
    const rawAssignmentOverrides =
      source.pageAssignmentOverrides &&
      typeof source.pageAssignmentOverrides === 'object' &&
      !Array.isArray(source.pageAssignmentOverrides)
        ? (source.pageAssignmentOverrides as Body)
        : {};
    const pageAssignmentOverrides = Object.fromEntries(
      Object.entries(rawAssignmentOverrides)
        .map(([pageId, override]) => {
          const sourceOverride =
            override && typeof override === 'object' && !Array.isArray(override)
              ? (override as Body)
              : {};
          const telecallerId = String(sourceOverride.telecallerId ?? '').trim();
          const fieldExecutiveId = String(
            sourceOverride.fieldExecutiveId ?? '',
          ).trim();
          const ownerId = String(sourceOverride.ownerId ?? '').trim();
          return [
            String(pageId).trim(),
            {
              ...(ownerId ? { ownerId } : {}),
              ...(telecallerId ? { telecallerId } : {}),
              ...(fieldExecutiveId ? { fieldExecutiveId } : {}),
            },
          ];
        })
        .filter(([pageId, override]) => pageId && Object.keys(override).length),
    );
    const formRoutingOverrides: MetaFormRoutingOverrides = {};
    const rawFormRouting = source.formRoutingOverrides;
    if (
      rawFormRouting &&
      typeof rawFormRouting === 'object' &&
      !Array.isArray(rawFormRouting)
    ) {
      for (const [pageId, forms] of Object.entries(rawFormRouting)) {
        if (!forms || typeof forms !== 'object' || Array.isArray(forms))
          continue;
        for (const [formId, override] of Object.entries(forms)) {
          const result = MetaFormRoutingSchema.safeParse(override);
          if (!result.success || !Object.keys(result.data).length) continue;
          formRoutingOverrides[pageId] ??= {};
          formRoutingOverrides[pageId][formId] = result.data;
        }
      }
    }
    return {
      pageId: legacyPageId,
      selectedPageId: String(
        source.selectedPageId ?? source.pageId ?? '',
      ).trim(),
      appId: String(source.appId ?? '').trim(),
      configId: String(
        source.configId ??
          process.env.META_BUSINESS_LOGIN_CONFIG_ID ??
          process.env.META_CONFIG_ID ??
          '1381302940097054',
      ).trim(),
      graphApiVersion: String(source.graphApiVersion ?? 'v20.0').trim(),
      selectedFormIds: legacySelectedFormIds,
      pageFormSelections,
      pageProjectMappings,
      pageSourceMappings: toPageValueMappings(source.pageSourceMappings),
      pageTeamMappings: toPageValueMappings(source.pageTeamMappings),
      pageAssignmentOverrides,
      formRoutingOverrides,
      pausedAccountIds: Array.isArray(source.pausedAccountIds)
        ? source.pausedAccountIds.map((v: unknown) => String(v))
        : [],
      pausedPageIds: Array.isArray(source.pausedPageIds)
        ? source.pausedPageIds.map((v: unknown) => String(v))
        : [],
      pausedFormIds: Array.isArray(source.pausedFormIds)
        ? source.pausedFormIds.map((v: unknown) => String(v))
        : [],
    };
  }

  private getMetaCredentials(credentials?: unknown) {
    const source =
      credentials &&
      typeof credentials === 'object' &&
      !Array.isArray(credentials)
        ? (credentials as Body)
        : {};
    const rawAccounts = Array.isArray(source.accounts) ? source.accounts : [];
    const rawPages = Array.isArray(source.pages) ? source.pages : [];
    const accountPages = rawAccounts.flatMap((account: Body) =>
      Array.isArray(account.pages)
        ? account.pages.map((page: Body) => ({
            ...page,
            accountId: String(page.accountId ?? account.id ?? ''),
            accountName: String(page.accountName ?? account.name ?? ''),
          }))
        : [],
    );
    const pageById = new Map<string, Body>();
    [...rawPages, ...accountPages].forEach((page: Body) => {
      const id = String(page?.id ?? '').trim();
      if (!id) return;
      pageById.set(id, { ...(pageById.get(id) ?? {}), ...page, id });
    });
    return {
      pageAccessToken: String(source.pageAccessToken ?? '').trim(),
      userAccessToken: String(source.userAccessToken ?? '').trim(),
      accounts: rawAccounts.map((account: Body) => ({
        id: String(account.id ?? ''),
        name: String(account.name ?? 'Facebook account'),
        userAccessToken: String(account.userAccessToken ?? '').trim(),
        connectedAt: account.connectedAt ?? null,
        pages: Array.isArray(account.pages) ? account.pages : [],
      })),
      pages: Array.from(pageById.values()),
    };
  }

  private sanitizeMetaPages(
    pages: Body[],
    pageFormSelections: Record<string, string[]> = {},
    pageProjectMappings: Record<string, string> = {},
    projectsById: ReadonlyMap<
      string,
      { name: string; location: string }
    > = new Map(),
    pageSourceMappings: Record<string, string> = {},
    sourcesById: ReadonlyMap<string, string> = new Map(),
    pageTeamMappings: Record<string, string> = {},
    teamsById: ReadonlyMap<string, string> = new Map(),
    pageAssignmentOverrides: Record<
      string,
      { ownerId?: string; telecallerId?: string; fieldExecutiveId?: string }
    > = {},
    usersById: ReadonlyMap<string, string> = new Map(),
    pausedPageIds: string[] = [],
  ) {
    return pages.map((page) => ({
      id: String(page.id ?? ''),
      name: String(page.name ?? 'Untitled Page'),
      category: String(page.category ?? ''),
      accountId: String(page.accountId ?? ''),
      accountName: String(page.accountName ?? ''),
      portfolioId: String(page.portfolioId ?? 'personal'),
      portfolioName: String(page.portfolioName ?? 'Direct Personal Pages'),
      discoveryPath: String(page.discoveryPath ?? '/me/accounts'),
      tasks: Array.isArray(page.tasks)
        ? page.tasks.map((task: unknown) => String(task))
        : [],
      hasAccessToken: Boolean(page.accessToken),
      leadgenSubscribed: Boolean(page.leadgenSubscribed),
      subscriptionError: page.subscriptionError
        ? String(page.subscriptionError)
        : null,
      isPaused: pausedPageIds.includes(String(page.id ?? '')),
      formsEnabledCount: (pageFormSelections[String(page.id ?? '')] ?? [])
        .length,
      formsTotalCount: Number(page.formsTotalCount ?? 0),
      projectId: pageProjectMappings[String(page.id ?? '')] ?? '',
      projectName:
        projectsById.get(pageProjectMappings[String(page.id ?? '')] ?? '')
          ?.name ?? '',
      projectLocation:
        projectsById.get(pageProjectMappings[String(page.id ?? '')] ?? '')
          ?.location ?? '',
      sourceId: pageSourceMappings[String(page.id ?? '')] ?? '',
      sourceName:
        sourcesById.get(pageSourceMappings[String(page.id ?? '')] ?? '') ?? '',
      teamId: pageTeamMappings[String(page.id ?? '')] ?? '',
      teamName:
        teamsById.get(pageTeamMappings[String(page.id ?? '')] ?? '') ?? '',
      ownerId: pageAssignmentOverrides[String(page.id ?? '')]?.ownerId ?? '',
      ownerName:
        usersById.get(
          pageAssignmentOverrides[String(page.id ?? '')]?.ownerId ?? '',
        ) ?? '',
      telecallerId:
        pageAssignmentOverrides[String(page.id ?? '')]?.telecallerId ?? '',
      telecallerName:
        usersById.get(
          pageAssignmentOverrides[String(page.id ?? '')]?.telecallerId ?? '',
        ) ?? '',
      fieldExecutiveId:
        pageAssignmentOverrides[String(page.id ?? '')]?.fieldExecutiveId ?? '',
      fieldExecutiveName:
        usersById.get(
          pageAssignmentOverrides[String(page.id ?? '')]?.fieldExecutiveId ??
            '',
        ) ?? '',
    }));
  }

  private sanitizeMetaAccounts(
    accounts: Body[],
    pausedAccountIds: string[] = [],
  ) {
    return accounts.map((account) => ({
      id: String(account.id ?? ''),
      name: String(account.name ?? 'Facebook account'),
      connectedAt: account.connectedAt ?? null,
      pagesCount: Array.isArray(account.pages) ? account.pages.length : 0,
      isPaused: pausedAccountIds.includes(String(account.id ?? '')),
    }));
  }

  private selectedMetaPageAccessToken(
    pageId: string,
    credentials: ReturnType<typeof this.getMetaCredentials>,
  ) {
    const page = credentials.pages.find(
      (candidate: Body) => String(candidate.id ?? '') === pageId,
    );
    return String(
      page?.accessToken ?? credentials.pageAccessToken ?? '',
    ).trim();
  }

  private metaEnabledFormIdsForPage(
    pageId: string,
    settings: ReturnType<typeof this.getMetaSettings>,
  ) {
    return settings.pageFormSelections[String(pageId)] ?? [];
  }

  private async ensureMetaIntegration(
    actorUserId?: string,
    organizationId = this.tenantAccess.organizationId,
  ) {
    const existing = await this.portalIntegrationFindByProvider(
      metaProvider,
      organizationId,
    );
    if (existing) {
      const needsPatch =
        !existing.webhookKeyId ||
        !existing.fieldMapping ||
        !existing.displayName;
      if (!needsPatch) return existing;
      return this.portalIntegrationUpdate(existing.id, {
        displayName: existing.displayName || metaDisplayName,
        webhookKeyId: existing.webhookKeyId || randomBytes(18).toString('hex'),
        fieldMapping: this.getMetaFieldMapping(existing.fieldMapping),
        settings: this.getMetaSettings(existing.settings),
        credentials: this.getMetaCredentials(existing.credentials),
        updatedById: actorUserId,
      });
    }

    const now = new Date();
    return this.portalIntegrationCreate({
      id: crypto.randomUUID(),
      provider: metaProvider,
      organizationId,
      displayName: metaDisplayName,
      status: 'Draft',
      isActive: true,
      webhookKeyId: randomBytes(18).toString('hex'),
      fieldMapping: defaultMetaFieldMapping,
      settings: { graphApiVersion: 'v20.0', pageFormSelections: {} },
      credentials: {},
      totalLeadsReceived: 0,
      createdById: actorUserId,
      updatedById: actorUserId,
      createdAt: now,
      updatedAt: now,
    });
  }

  private async getMetaAdsSourceMaster() {
    const sources = await this.ensureMasters('source', defaultLeadSources);
    return (
      sources.find(
        (source: Body) =>
          String(source.code ?? '').toUpperCase() === 'META_ADS' ||
          String(source.name ?? '').toLowerCase() === 'meta ads',
      ) ?? sources[0]
    );
  }

  private async getMetaLeadStats(
    settings?: ReturnType<typeof this.getMetaSettings>,
  ) {
    const metaSource = await this.getMetaAdsSourceMaster();
    const mappedSourceIds = settings?.pageSourceMappings
      ? Object.values(settings.pageSourceMappings).filter((id): id is string =>
          Boolean(id),
        )
      : [];

    const metaSources = await this.db().leadMasterValue.findMany({
      where: {
        categoryRef: { code: 'source' },
        isActive: true,
        OR: [
          {
            code: {
              in: [
                'META_ADS',
                'META_LEAD_ADS',
                'META',
                'FACEBOOK',
                'FACEBOOK_ADS',
                'INSTAGRAM',
                'INSTAGRAM_ADS',
              ],
            },
          },
          { name: { contains: 'Meta', mode: 'insensitive' } },
          { name: { contains: 'Facebook', mode: 'insensitive' } },
          { name: { contains: 'Instagram', mode: 'insensitive' } },
        ],
      },
      select: { id: true, code: true, name: true },
    });

    const allSourceIds = Array.from(
      new Set(
        [
          metaSource?.id,
          ...mappedSourceIds,
          ...metaSources.map((s) => s.id),
        ].filter((id): id is string => Boolean(id)),
      ),
    );

    const monthStart = startOfDay(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    );

    const auditLogs = await this.db().auditLog.findMany({
      where: {
        action: { in: ['META_LEAD_RECEIVED', 'META_DUPLICATE_LEAD_RECEIVED'] },
        entityType: 'Lead',
      },
      select: { entityId: true },
    });

    const auditLeadIds = Array.from(
      new Set(
        auditLogs
          .map((log) => log.entityId)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const matchConditions: any[] = [];
    if (allSourceIds.length > 0) {
      matchConditions.push({ sourceId: { in: allSourceIds } });
    }
    if (auditLeadIds.length > 0) {
      matchConditions.push({ id: { in: auditLeadIds } });
    }

    const whereClause: any = {
      organizationId: this.tenantAccess.organizationId,
      deletedAt: null,
      ...(matchConditions.length > 0 ? { OR: matchConditions } : {}),
    };

    const [totalImportedThisMonth, latestLead] = await Promise.all([
      this.db().lead.count({
        where: {
          ...whereClause,
          createdAt: { gte: monthStart },
        },
      }),
      this.db().lead.findFirst({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalImportedThisMonth,
      lastImportedAt: latestLead?.createdAt ?? null,
    };
  }

  private async buildMetaManual(integration: Body) {
    const settings = this.getMetaSettings(integration.settings);
    return {
      crmName: 'Trueroot Realty CRM',
      integrationType: 'Meta Lead Ads webhook',
      callbackUrl: this.metaWebhookUrl(),
      oauthRedirectUrl: this.metaOAuthCallbackUrl(),
      verifyToken: integration.webhookKeyId,
      graphApiVersion: settings.graphApiVersion,
      setupSteps: [
        'Add the OAuth redirect URL in Facebook Login for Business settings.',
        'Add the webhook callback URL and verify token in Meta App Dashboard > Webhooks.',
        'Connect the Facebook account, then choose the Page and lead forms in CRM.',
        'Subscribe the app to the Page leadgen webhook event if Meta does not auto-subscribe it.',
        'When Meta sends leadgen_id, the CRM fetches lead fields from Graph API and creates a CRM lead.',
      ],
      requiredPermissions: [
        'leads_retrieval',
        'pages_manage_metadata',
        'pages_show_list',
        'pages_read_engagement',
      ],
      oauthScopes: ['pages_show_list', 'pages_read_engagement'],
    };
  }

  async getMetaIntegration(actorUserId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const credentials = this.getMetaCredentials(integration.credentials);
    const manual = await this.buildMetaManual(integration);
    const stats = await this.getMetaLeadStats(settings);
    const assignmentOverrides: Record<
      string,
      { ownerId?: string; telecallerId?: string; fieldExecutiveId?: string }
    > = settings.pageAssignmentOverrides;
    const mappedAssigneeIds = Object.values(assignmentOverrides).flatMap(
      (override) =>
        [
          override.ownerId,
          override.telecallerId,
          override.fieldExecutiveId,
        ].filter((userId): userId is string => Boolean(userId)),
    );
    const [mappedProjects, mappedSources, mappedTeams, mappedUsers] =
      await Promise.all([
        this.db().project.findMany({
          where: {
            id: {
              in: Array.from(
                new Set(Object.values(settings.pageProjectMappings)),
              ),
            },
            status: { not: 'Archived' },
          },
          select: { id: true, name: true, location: true },
        }),
        this.db().leadMasterValue.findMany({
          where: {
            id: {
              in: Array.from(
                new Set(Object.values(settings.pageSourceMappings)),
              ),
            },
            isActive: true,
            categoryRef: { code: 'source' },
          },
          select: { id: true, name: true },
        }),
        this.db().team.findMany({
          where: {
            id: {
              in: Array.from(new Set(Object.values(settings.pageTeamMappings))),
            },
            isActive: true,
          },
          select: { id: true, name: true },
        }),
        this.db().user.findMany({
          where: {
            id: {
              in: Array.from(new Set(mappedAssigneeIds)),
            },
            isActive: true,
          },
          select: { id: true, fullName: true, email: true },
        }),
      ]);
    const projectsById = new Map<string, { name: string; location: string }>(
      mappedProjects.map(
        (project) =>
          [project.id, { name: project.name, location: project.location }] as [
            string,
            { name: string; location: string },
          ],
      ),
    );
    const sourcesById = new Map<string, string>(
      mappedSources.map((source) => [source.id, source.name]),
    );
    const teamsById = new Map<string, string>(
      mappedTeams.map((team) => [team.id, team.name]),
    );
    const usersById = new Map<string, string>(
      mappedUsers.map((user) => [
        user.id,
        user.fullName ?? user.email ?? 'CRM user',
      ]),
    );
    return {
      data: {
        id: integration.id,
        provider: metaProvider,
        displayName: metaDisplayName,
        status: integration.status,
        isActive: integration.isActive,
        endpointUrl: manual.callbackUrl,
        verifyToken: manual.verifyToken,
        graphApiVersion: settings.graphApiVersion,
        pageId: settings.pageId,
        selectedPageId: settings.selectedPageId || settings.pageId,
        appId: this.configuredMetaAppId(settings),
        configId:
          settings.configId ||
          process.env.META_BUSINESS_LOGIN_CONFIG_ID ||
          process.env.META_CONFIG_ID ||
          '1381302940097054',
        selectedFormIds: settings.selectedFormIds,
        pageFormSelections: settings.pageFormSelections,
        pageProjectMappings: settings.pageProjectMappings,
        pageSourceMappings: settings.pageSourceMappings,
        pageTeamMappings: settings.pageTeamMappings,
        pageAssignmentOverrides: settings.pageAssignmentOverrides,
        formRoutingOverrides: settings.formRoutingOverrides,
        pageAccessTokenConfigured: Boolean(
          credentials.pageAccessToken ||
            credentials.pages.some((page: Body) => Boolean(page.accessToken)),
        ),
        oauthRedirectUrl: manual.oauthRedirectUrl,
        connectedAccounts: this.sanitizeMetaAccounts(
          credentials.accounts,
          settings.pausedAccountIds,
        ),
        connectedPages: this.sanitizeMetaPages(
          credentials.pages,
          settings.pageFormSelections,
          settings.pageProjectMappings,
          projectsById,
          settings.pageSourceMappings,
          sourcesById,
          settings.pageTeamMappings,
          teamsById,
          settings.pageAssignmentOverrides,
          usersById,
          settings.pausedPageIds,
        ),
        fieldMapping: this.getMetaFieldMapping(integration.fieldMapping),
        fieldOptions: metaTargetFieldOptions,
        sourceFields: metaSourceFields,
        manual,
        stats,
        lastTestedAt: integration.lastTestedAt,
        lastTestStatus: integration.lastTestStatus,
        lastLeadReceivedAt:
          integration.lastLeadReceivedAt ?? stats.lastImportedAt,
        totalLeadsReceived: integration.totalLeadsReceived,
        notes: integration.notes ?? '',
      },
    };
  }

  async saveMetaIntegration(body: Body, actorUserId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const currentSettings = this.getMetaSettings(integration.settings);
    const currentCredentials = this.getMetaCredentials(integration.credentials);
    const bodySelectedPageId = body.selectedPageId ?? body.pageId;
    const incomingPageId =
      bodySelectedPageId === undefined
        ? currentSettings.selectedPageId || currentSettings.pageId
        : String(bodySelectedPageId ?? '').trim();
    const pageAccessToken =
      body.pageAccessToken === undefined
        ? this.selectedMetaPageAccessToken(incomingPageId, currentCredentials)
        : String(body.pageAccessToken ?? '').trim();
    const incomingPageFormSelections =
      body.pageFormSelections &&
      typeof body.pageFormSelections === 'object' &&
      !Array.isArray(body.pageFormSelections)
        ? Object.fromEntries(
            Object.entries(body.pageFormSelections as Body).map(
              ([pageId, formIds]) => [
                String(pageId),
                Array.isArray(formIds)
                  ? formIds.map((value: unknown) => String(value))
                  : [],
              ],
            ),
          )
        : currentSettings.pageFormSelections;
    const selectedFormIds = Array.isArray(body.selectedFormIds)
      ? body.selectedFormIds.map((value: unknown) => String(value))
      : incomingPageId
      ? incomingPageFormSelections[incomingPageId] ??
        currentSettings.selectedFormIds
      : currentSettings.selectedFormIds;
    const pageFormSelections = {
      ...incomingPageFormSelections,
      ...(incomingPageId ? { [incomingPageId]: selectedFormIds } : {}),
    };
    const incomingPageProjectMappings =
      body.pageProjectMappings &&
      typeof body.pageProjectMappings === 'object' &&
      !Array.isArray(body.pageProjectMappings)
        ? Object.fromEntries(
            Object.entries(body.pageProjectMappings as Body)
              .map(([pageId, projectId]) => [
                String(pageId).trim(),
                String(projectId ?? '').trim(),
              ])
              .filter(([pageId, projectId]) => pageId && projectId),
          )
        : currentSettings.pageProjectMappings;
    if (body.pageProjectMappings !== undefined) {
      const mappedPageIds = Object.keys(incomingPageProjectMappings);
      const mappedProjectIds = Array.from(
        new Set(Object.values(incomingPageProjectMappings)),
      );
      const connectedPageIds = new Set(
        currentCredentials.pages.map((page: Body) => String(page.id ?? '')),
      );
      if (mappedPageIds.some((pageId) => !connectedPageIds.has(pageId))) {
        throw new BadRequestException(
          'Project mappings must reference connected Meta Pages',
        );
      }
      if (mappedProjectIds.length) {
        const activeProjectCount = await this.db().project.count({
          where: {
            id: { in: mappedProjectIds },
            status: { not: 'Archived' },
          },
        });
        if (activeProjectCount !== mappedProjectIds.length) {
          throw new BadRequestException(
            'Project mappings must reference active CRM projects',
          );
        }
      }
    }

    await this.portalIntegrationUpdate(integration.id, {
      isActive:
        body.isActive === undefined
          ? integration.isActive
          : Boolean(body.isActive),
      status:
        body.isActive === false
          ? 'Paused'
          : integration.status === 'Draft'
          ? 'Configured'
          : integration.status,
      settings: {
        ...currentSettings,
        pageId:
          bodySelectedPageId === undefined
            ? currentSettings.pageId
            : incomingPageId,
        selectedPageId: incomingPageId,
        appId: process.env.META_APP_ID
          ? this.configuredMetaAppId(currentSettings)
          : body.appId === undefined
          ? currentSettings.appId
          : String(body.appId ?? '').trim(),
        configId:
          body.configId === undefined
            ? currentSettings.configId
            : String(body.configId ?? '1381302940097054').trim(),
        graphApiVersion:
          body.graphApiVersion === undefined
            ? currentSettings.graphApiVersion
            : String(body.graphApiVersion ?? 'v20.0').trim(),
        selectedFormIds,
        pageFormSelections,
        pageProjectMappings: incomingPageProjectMappings,
      },
      credentials: {
        ...currentCredentials,
        ...(body.pageAccessToken !== undefined ? { pageAccessToken } : {}),
      },
      notes:
        body.notes === undefined ? integration.notes : String(body.notes ?? ''),
      updatedById: actorUserId,
    });
    await this.audit(
      actorUserId,
      'META_INTEGRATION_UPDATED',
      'PortalIntegration',
      integration.id,
    );
    return this.getMetaIntegration(actorUserId);
  }

  async startMetaOAuth(actorUserId: string, reconnectAccountId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const appId = this.configuredMetaAppId(settings);
    if (!appId) {
      throw new BadRequestException(
        'Meta App ID is required before connecting Facebook',
      );
    }
    if (!this.metaAppSecret()) {
      throw new BadRequestException(
        'META_APP_SECRET is required before connecting Facebook',
      );
    }
    const useConfigId =
      String(
        (settings as any).useConfigId ??
          process.env.USE_META_CONFIG_ID ??
          'false',
      ).toLowerCase() === 'true';
    const configId =
      settings.configId ||
      process.env.META_BUSINESS_LOGIN_CONFIG_ID ||
      process.env.META_CONFIG_ID;
    const permissions = [
      'pages_show_list',
      'pages_read_engagement',
      'leads_retrieval',
      'pages_manage_metadata',
      'business_management',
    ];
    const url = new URL(
      `https://www.facebook.com/${
        settings.graphApiVersion || 'v20.0'
      }/dialog/oauth`,
    );
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', this.metaOAuthCallbackUrl());
    const overrideDefaultResponseType =
      (settings as any).overrideDefaultResponseType ??
      process.env.META_OVERRIDE_DEFAULT_RESPONSE_TYPE ??
      'true';
    if (useConfigId && configId) {
      url.searchParams.set('config_id', configId);
      if (String(overrideDefaultResponseType).toLowerCase() !== 'false') {
        url.searchParams.set('override_default_response_type', 'true');
      }
    } else {
      url.searchParams.set('scope', permissions.join(','));
    }
    const normalizedReconnectAccountId = String(
      reconnectAccountId ?? '',
    ).trim();
    if (
      normalizedReconnectAccountId &&
      !this.getMetaCredentials(integration.credentials).accounts.some(
        (account: Body) =>
          String(account.id ?? '') === normalizedReconnectAccountId,
      )
    ) {
      throw new BadRequestException(
        'The Facebook account selected for reconnect is no longer connected',
      );
    }
    url.searchParams.set(
      'state',
      this.encodeMetaOAuthState({
        actorUserId,
        organizationId: integration.organizationId,
        ...(normalizedReconnectAccountId
          ? { reconnectAccountId: normalizedReconnectAccountId }
          : {}),
      }),
    );
    url.searchParams.set('response_type', 'code');
    return {
      data: {
        authUrl: url.toString(),
        redirectUri: this.metaOAuthCallbackUrl(),
        permissions,
      },
    };
  }

  private async fetchMetaJson(
    url: URL,
    errorLabel: string,
    init?: RequestInit,
  ) {
    const response = await fetch(url, init);
    const data = (await response.json().catch(() => null)) as Body | null;
    if (!response.ok) {
      throw new BadRequestException(
        `${errorLabel} failed with ${response.status}${
          data?.error?.message ? `: ${data.error.message}` : ''
        }`,
      );
    }
    return data ?? {};
  }

  private async exchangeMetaOAuthCode(
    code: string,
    appId: string,
    graphApiVersion: string,
  ) {
    const tokenUrl = new URL(
      `https://graph.facebook.com/${graphApiVersion}/oauth/access_token`,
    );
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', this.metaAppSecret());
    tokenUrl.searchParams.set('redirect_uri', this.metaOAuthCallbackUrl());
    tokenUrl.searchParams.set('code', code);
    const shortToken = await this.fetchMetaJson(
      tokenUrl,
      'Meta OAuth token exchange',
    );
    const accessToken = String(shortToken.access_token ?? '').trim();
    if (!accessToken) {
      throw new BadRequestException(
        'Meta OAuth did not return an access token',
      );
    }

    const longTokenUrl = new URL(
      `https://graph.facebook.com/${graphApiVersion}/oauth/access_token`,
    );
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longTokenUrl.searchParams.set('client_id', appId);
    longTokenUrl.searchParams.set('client_secret', this.metaAppSecret());
    longTokenUrl.searchParams.set('fb_exchange_token', accessToken);
    const longToken = await this.fetchMetaJson(
      longTokenUrl,
      'Meta long-lived token exchange',
    ).catch(() => shortToken);
    return String(longToken.access_token ?? accessToken).trim();
  }

  private async fetchMetaPaginatedData(
    initialUrl: URL,
    label: string,
    maxPages = 20,
    requireComplete = false,
  ): Promise<any[]> {
    const results: any[] = [];
    let currentUrl: string | null = initialUrl.toString();
    let count = 0;

    while (currentUrl && count < maxPages) {
      count++;
      try {
        const response = await this.fetchMetaJson(
          new URL(currentUrl),
          `${label} (page ${count})`,
        );
        const data = Array.isArray(response.data) ? response.data : [];
        results.push(...data);

        const nextUrl = response.paging?.next
          ? String(response.paging.next).trim()
          : null;
        currentUrl = nextUrl && nextUrl !== currentUrl ? nextUrl : null;
      } catch (error) {
        if (requireComplete) throw error;
        break;
      }
    }

    if (currentUrl && requireComplete) {
      throw new BadRequestException(
        'Meta form retrieval could not be completed. Please retry.',
      );
    }
    return results;
  }

  private async fetchMetaPages(
    userAccessToken: string,
    graphApiVersion: string,
  ) {
    const pageMap = new Map<string, Body>();

    // 1. Fetch Direct User Accounts (/me/accounts) with Pagination
    const directAccountsUrl = new URL(
      `https://graph.facebook.com/${graphApiVersion}/me/accounts`,
    );
    directAccountsUrl.searchParams.set(
      'fields',
      'id,name,category,access_token',
    );
    directAccountsUrl.searchParams.set('limit', '100');
    directAccountsUrl.searchParams.set('access_token', userAccessToken);

    const directPages = await this.fetchMetaPaginatedData(
      directAccountsUrl,
      'Meta Pages direct fetch',
    );

    directPages.forEach((page: Body) => {
      const id = String(page.id ?? '').trim();
      if (id) {
        pageMap.set(id, {
          ...page,
          portfolioId: page.portfolioId || 'personal',
          portfolioName: page.portfolioName || 'Direct Personal Pages',
          discoveryPath: page.discoveryPath || '/me/accounts',
        });
      }
    });

    // 2. Fetch Business Portfolios (/me/businesses) & their owned/client pages
    try {
      const businessesUrl = new URL(
        `https://graph.facebook.com/${graphApiVersion}/me/businesses`,
      );
      businessesUrl.searchParams.set('fields', 'id,name');
      businessesUrl.searchParams.set('limit', '100');
      businessesUrl.searchParams.set('access_token', userAccessToken);

      const businesses = await this.fetchMetaPaginatedData(
        businessesUrl,
        'Meta Business Portfolios fetch',
      );

      await Promise.all(
        businesses.map(async (business: Body) => {
          const bizId = String(business.id ?? '').trim();
          const bizName = String(business.name ?? 'Business Portfolio').trim();
          if (!bizId) return;

          // Fetch Owned Pages for Portfolio
          const ownedUrl = new URL(
            `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(
              bizId,
            )}/owned_pages`,
          );
          ownedUrl.searchParams.set('fields', 'id,name,category,access_token');
          ownedUrl.searchParams.set('limit', '100');
          ownedUrl.searchParams.set('access_token', userAccessToken);

          // Fetch Client Pages for Portfolio
          const clientUrl = new URL(
            `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(
              bizId,
            )}/client_pages`,
          );
          clientUrl.searchParams.set('fields', 'id,name,category,access_token');
          clientUrl.searchParams.set('limit', '100');
          clientUrl.searchParams.set('access_token', userAccessToken);

          const [ownedPages, clientPages] = await Promise.all([
            this.fetchMetaPaginatedData(
              ownedUrl,
              `Meta Owned Pages (${bizId})`,
            ).catch(() => []),
            this.fetchMetaPaginatedData(
              clientUrl,
              `Meta Client Pages (${bizId})`,
            ).catch(() => []),
          ]);

          ownedPages.forEach((page: Body) => {
            const id = String(page.id ?? '').trim();
            if (id && !pageMap.has(id)) {
              pageMap.set(id, {
                ...page,
                portfolioId: bizId,
                portfolioName: bizName,
                discoveryPath: 'owned_pages',
              });
            }
          });

          clientPages.forEach((page: Body) => {
            const id = String(page.id ?? '').trim();
            if (id && !pageMap.has(id)) {
              pageMap.set(id, {
                ...page,
                portfolioId: bizId,
                portfolioName: `${bizName} (Client Assets)`,
                discoveryPath: 'client_pages',
              });
            }
          });
        }),
      );
    } catch {
      // Business portfolio fetch is non-blocking fallback
    }

    const allPages = Array.from(pageMap.values());

    // 3. Fallback Page Access Token Resolution for Pages missing inline access_token
    await Promise.all(
      allPages.map(async (page: Body) => {
        const id = String(page.id ?? '').trim();
        const currentToken = String(page.access_token ?? '').trim();
        if (id && !currentToken) {
          try {
            const pageUrl = new URL(
              `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(
                id,
              )}`,
            );
            pageUrl.searchParams.set('fields', 'access_token');
            pageUrl.searchParams.set('access_token', userAccessToken);
            const resolved = await this.fetchMetaJson(
              pageUrl,
              `Meta Page Token resolution (${id})`,
            );
            if (resolved.access_token) {
              page.access_token = String(resolved.access_token).trim();
            }
          } catch {
            // Ignore individual token resolution failures
          }
        }
      }),
    );

    return allPages.map((page: Body) => ({
      id: String(page.id ?? ''),
      name: String(page.name ?? 'Untitled Page'),
      category: String(page.category ?? ''),
      tasks: Array.isArray(page.tasks) ? page.tasks : [],
      accessToken: String(page.access_token ?? '').trim(),
      portfolioId: String(page.portfolioId ?? 'personal'),
      portfolioName: String(page.portfolioName ?? 'Direct Personal Pages'),
      discoveryPath: String(page.discoveryPath ?? '/me/accounts'),
      formsTotalCount: 0,
    }));
  }

  private async fetchMetaAccount(
    userAccessToken: string,
    graphApiVersion: string,
  ) {
    const url = new URL(`https://graph.facebook.com/${graphApiVersion}/me`);
    url.searchParams.set('fields', 'id,name');
    url.searchParams.set('access_token', userAccessToken);
    const response = await this.fetchMetaJson(url, 'Meta account fetch');
    return {
      id: String(response.id ?? crypto.randomUUID()),
      name: String(response.name ?? 'Facebook account'),
    };
  }

  private mergeMetaAccountCredentials({
    currentCredentials,
    account,
    userAccessToken,
    pages,
  }: {
    currentCredentials: MetaCredentials;
    account: { id: string; name: string };
    userAccessToken: string;
    pages: Body[];
  }) {
    const connectedAt = new Date().toISOString();
    const pagesWithAccount: Body[] = pages.map((page) => ({
      ...page,
      accountId: account.id,
      accountName: account.name,
    }));
    const nextAccount = {
      id: account.id,
      name: account.name,
      userAccessToken,
      connectedAt,
      pages: pagesWithAccount,
    };
    const accounts = [
      ...currentCredentials.accounts.filter(
        (item: Body) => item.id !== account.id,
      ),
      nextAccount,
    ];
    const pageById = new Map<string, Body>();
    currentCredentials.pages.forEach((page: Body) => {
      const id = String(page.id ?? '').trim();
      if (id && String(page.accountId ?? '') !== account.id)
        pageById.set(id, page);
    });
    pagesWithAccount.forEach((page: Body) => {
      const id = String(page.id ?? '').trim();
      if (id) pageById.set(id, page);
    });
    return {
      ...currentCredentials,
      userAccessToken,
      accounts,
      pages: Array.from(pageById.values()),
      pageAccessToken:
        String(pagesWithAccount[0]?.accessToken ?? '') ||
        currentCredentials.pageAccessToken,
    };
  }

  private async fetchMetaLeadFormsForToken(
    pageId: string,
    pageAccessToken: string,
    graphApiVersion: string,
  ) {
    const url = new URL(
      `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(
        pageId,
      )}/leadgen_forms`,
    );
    url.searchParams.set(
      'fields',
      'id,name,status,leads_count,created_time,questions',
    );
    url.searchParams.set('limit', '100');
    url.searchParams.set('access_token', pageAccessToken);
    const forms = await this.fetchMetaPaginatedData(
      url,
      'Meta lead forms fetch',
      20,
      true,
    );
    return forms.map((form: Body) => ({
      id: String(form.id ?? ''),
      name: String(form.name ?? 'Untitled form'),
      status: String(form.status ?? ''),
      leadsCount: Number(form.leads_count ?? 0),
      createdTime: form.created_time ?? null,
      questions: Array.isArray(form.questions)
        ? form.questions.map((question: Body) => ({
            key: String(question.key ?? question.id ?? ''),
            label: String(question.label ?? question.key ?? ''),
            type: String(question.type ?? ''),
          }))
        : [],
    }));
  }

  private async fetchMetaPageForToken(
    pageId: string,
    pageAccessToken: string,
    graphApiVersion: string,
  ) {
    const url = new URL(
      `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(
        pageId,
      )}`,
    );
    url.searchParams.set('fields', 'id,name,category,tasks');
    url.searchParams.set('access_token', pageAccessToken);
    const page = await this.fetchMetaJson(url, 'Meta Page validation');
    const resolvedPageId = String(page.id ?? '').trim();
    if (!resolvedPageId || resolvedPageId !== pageId) {
      throw new BadRequestException(
        'The Page access token does not belong to the supplied Page ID',
      );
    }
    return {
      id: resolvedPageId,
      name: String(page.name ?? 'Facebook Page'),
      category: String(page.category ?? ''),
      tasks: Array.isArray(page.tasks) ? page.tasks : [],
    };
  }

  private async subscribeMetaPageLeadgen(
    pageId: string,
    pageAccessToken: string,
    graphApiVersion: string,
  ) {
    if (!pageId || !pageAccessToken) {
      return {
        subscribed: false,
        error: 'Missing Page ID or Page access token',
      };
    }
    const url = new URL(
      `https://graph.facebook.com/${graphApiVersion}/${encodeURIComponent(
        pageId,
      )}/subscribed_apps`,
    );
    url.searchParams.set('subscribed_fields', 'leadgen');
    url.searchParams.set('access_token', pageAccessToken);

    try {
      await this.fetchMetaJson(url, 'Meta Page leadgen subscription', {
        method: 'POST',
      });
      return { subscribed: true, error: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not subscribe Page';
      return { subscribed: false, error: message };
    }
  }

  private resolveMetaPageId(savedPageId: string, pages: Body[]) {
    if (
      savedPageId &&
      pages.some((page) => String(page.id ?? '') === savedPageId)
    ) {
      return savedPageId;
    }
    return String(pages[0]?.id ?? savedPageId);
  }

  private metaOAuthRecoveryMessage(error: unknown) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('User has insufficient privileges on the page') ||
      message.includes('(#10)')
    ) {
      return 'Facebook connected, but this account cannot manage the requested Page. Sign in with a Page admin or Business Manager user who has full Page access, then try again. You can also add that Page manually with its Page ID and Page access token.';
    }
    return (
      message ||
      'Facebook connection could not load Pages. Confirm the account has Page access and try again.'
    );
  }

  async completeMetaOAuth(query: Body) {
    if (query.error || query.error_description) {
      return this.metaFrontendReturnUrl({
        metaConnected: '0',
        metaError: String(query.error_description ?? query.error),
      });
    }
    const code = String(query.code ?? '').trim();
    if (!code) throw new BadRequestException('Meta OAuth code is missing');
    const state = this.decodeMetaOAuthState(query.state);
    if (!state.organizationId)
      throw new BadRequestException('Reconnect Meta from a tenant workspace');
    const organizationId = await this.resolveTenantOrganizationId(
      state.actorUserId,
      String(state.organizationId),
    );
    const integration = await this.ensureMetaIntegration(
      state.actorUserId,
      organizationId,
    );
    const settings = this.getMetaSettings(integration.settings);
    const appId = this.configuredMetaAppId(settings);
    if (!appId || !this.metaAppSecret()) {
      throw new BadRequestException('Meta OAuth app credentials are missing');
    }
    const graphApiVersion = settings.graphApiVersion || 'v20.0';
    const userAccessToken = await this.exchangeMetaOAuthCode(
      code,
      appId,
      graphApiVersion,
    );
    const account = await this.fetchMetaAccount(
      userAccessToken,
      graphApiVersion,
    );
    if (state.reconnectAccountId && state.reconnectAccountId !== account.id) {
      return this.metaFrontendReturnUrl({
        metaConnected: '0',
        metaError:
          'Reconnect cancelled because you signed in with a different Facebook account. Sign in with the selected account and try again.',
      });
    }
    let pages: Body[];
    try {
      pages = await this.fetchMetaPages(userAccessToken, graphApiVersion);
    } catch (error) {
      return this.metaFrontendReturnUrl({
        metaConnected: '0',
        metaError: this.metaOAuthRecoveryMessage(error),
      });
    }
    const pagesWithSubscriptions: Body[] = await Promise.all(
      pages.map(async (page) => {
        const subscription = await this.subscribeMetaPageLeadgen(
          page.id,
          page.accessToken,
          graphApiVersion,
        );
        return {
          ...page,
          leadgenSubscribed: subscription.subscribed,
          subscriptionError: subscription.error,
        };
      }),
    );
    const nextPageFormSelections = { ...settings.pageFormSelections };
    await Promise.all(
      pagesWithSubscriptions.map(async (page: Body) => {
        if (nextPageFormSelections[page.id]?.length) return;
        try {
          const forms = await this.fetchMetaLeadFormsForToken(
            page.id,
            page.accessToken,
            graphApiVersion,
          );
          nextPageFormSelections[page.id] = forms
            .map((form) => form.id)
            .filter(Boolean);
          page.formsTotalCount = forms.length;
        } catch (error) {
          page.formsTotalCount = 0;
          page.formsFetchError =
            error instanceof Error ? error.message : 'Could not fetch forms';
          nextPageFormSelections[page.id] = [];
        }
      }),
    );
    const currentCredentials = this.getMetaCredentials(integration.credentials);
    const mergedCredentials = this.mergeMetaAccountCredentials({
      currentCredentials,
      account,
      userAccessToken,
      pages: pagesWithSubscriptions,
    });
    const resolvedPageId = this.resolveMetaPageId(
      settings.selectedPageId || settings.pageId,
      mergedCredentials.pages,
    );
    const selectedPage = pagesWithSubscriptions.find(
      (page) => page.id === resolvedPageId,
    );
    await this.portalIntegrationUpdate(integration.id, {
      status: pagesWithSubscriptions.length ? 'Connected' : 'Configured',
      settings: {
        ...settings,
        appId,
        pageId: resolvedPageId,
        selectedPageId: resolvedPageId,
        selectedFormIds: nextPageFormSelections[resolvedPageId] ?? [],
        pageFormSelections: nextPageFormSelections,
      },
      credentials: {
        ...mergedCredentials,
        pageAccessToken:
          selectedPage?.accessToken || mergedCredentials.pageAccessToken || '',
      },
      updatedById: state.actorUserId,
    });
    await this.audit(
      state.actorUserId,
      'META_OAUTH_CONNECTED',
      'PortalIntegration',
      integration.id,
      {
        accountId: account.id,
        accountName: account.name,
        pages: pagesWithSubscriptions.map((page) => ({
          id: page.id,
          name: page.name,
          leadgenSubscribed: page.leadgenSubscribed,
          enabledForms: nextPageFormSelections[page.id]?.length ?? 0,
        })),
      },
    );
    return this.metaFrontendReturnUrl({ metaConnected: '1' });
  }

  async listMetaLeadForms(pageId: string, actorUserId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const credentials = this.getMetaCredentials(integration.credentials);
    const resolvedPageId = String(
      pageId || settings.selectedPageId || settings.pageId || '',
    ).trim();
    if (!resolvedPageId) throw new BadRequestException('Meta Page is required');
    const pageAccessToken = this.selectedMetaPageAccessToken(
      resolvedPageId,
      credentials,
    );
    if (!pageAccessToken) {
      throw new BadRequestException(
        'Selected Meta Page does not have an access token',
      );
    }
    const rawForms = await this.fetchMetaLeadFormsForToken(
      resolvedPageId,
      pageAccessToken,
      settings.graphApiVersion,
    );
    return {
      data: rawForms.map((form) => ({
        ...form,
        isPaused: settings.pausedFormIds.includes(String(form.id)),
      })),
    };
  }

  async listMetaDeliveryLogs(query: Body, actorUserId?: string) {
    await this.ensureMetaIntegration(actorUserId);
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(50, Math.max(5, Number(query.limit ?? 10) || 10));
    const [logs, total] = await Promise.all([
      this.db().auditLog.findMany({
        where: {
          organizationId: this.tenantAccess.organizationId,
          action: {
            in: [
              'META_WEBHOOK_RECEIVED',
              'META_LEAD_RECEIVED',
              'META_DUPLICATE_LEAD_RECEIVED',
              'META_LEAD_SKIPPED',
              'META_LEAD_FAILED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.db().auditLog.count({
        where: {
          organizationId: this.tenantAccess.organizationId,
          action: {
            in: [
              'META_WEBHOOK_RECEIVED',
              'META_LEAD_RECEIVED',
              'META_DUPLICATE_LEAD_RECEIVED',
              'META_LEAD_SKIPPED',
              'META_LEAD_FAILED',
            ],
          },
        },
      }),
    ]);
    return {
      data: logs.map((log: Body) => ({
        id: log.id,
        action: log.action,
        occurredAt: log.createdAt,
        ...(typeof log.metadata === 'object' && log.metadata
          ? log.metadata
          : {}),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listWebsiteDeliveryLogs(
    query: Body,
    actorUserId?: string,
    organizationId?: string,
  ) {
    const integration = await this.ensureWebsiteIntegration(
      actorUserId,
      organizationId,
    );
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(50, Math.max(5, Number(query.limit ?? 10) || 10));
    const [logs, total] = await Promise.all([
      this.db().auditLog.findMany({
        where: {
          organizationId: integration.organizationId,
          action: {
            in: [
              'WEBSITE_WEBHOOK_RECEIVED',
              'WEBSITE_LEAD_RECEIVED',
              'WEBSITE_DUPLICATE_LEAD_RECEIVED',
              'WEBSITE_LEAD_SKIPPED',
              'WEBSITE_LEAD_FAILED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          entityId: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.db().auditLog.count({
        where: {
          organizationId: integration.organizationId,
          action: {
            in: [
              'WEBSITE_WEBHOOK_RECEIVED',
              'WEBSITE_LEAD_RECEIVED',
              'WEBSITE_DUPLICATE_LEAD_RECEIVED',
              'WEBSITE_LEAD_SKIPPED',
              'WEBSITE_LEAD_FAILED',
            ],
          },
        },
      }),
    ]);
    return {
      data: logs.map((log: Body) => ({
        id: log.id,
        action: log.action,
        occurredAt: log.createdAt,
        ...(typeof log.metadata === 'object' && log.metadata
          ? log.metadata
          : {}),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async toggleMetaPagePause(
    pageId: string,
    isPaused: boolean,
    actorUserId?: string,
  ) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const targetPageId = String(pageId ?? '').trim();
    let pausedPageIds = [...settings.pausedPageIds];
    if (isPaused) {
      if (!pausedPageIds.includes(targetPageId)) {
        pausedPageIds.push(targetPageId);
      }
    } else {
      pausedPageIds = pausedPageIds.filter((id) => id !== targetPageId);
    }

    await this.portalIntegrationUpdate(integration.id, {
      settings: {
        ...settings,
        pausedPageIds,
      },
      updatedById: actorUserId,
    });

    await this.audit(
      actorUserId,
      isPaused ? 'META_PAGE_PAUSED' : 'META_PAGE_RESUMED',
      'PortalIntegration',
      integration.id,
      { pageId: targetPageId, isPaused },
    );

    return this.getMetaIntegration(actorUserId);
  }

  async toggleMetaAccountPause(
    accountId: string,
    isPaused: boolean,
    actorUserId?: string,
  ) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const targetAccountId = String(accountId ?? '').trim();
    let pausedAccountIds = [...settings.pausedAccountIds];
    if (isPaused) {
      if (!pausedAccountIds.includes(targetAccountId)) {
        pausedAccountIds.push(targetAccountId);
      }
    } else {
      pausedAccountIds = pausedAccountIds.filter(
        (id) => id !== targetAccountId,
      );
    }

    await this.portalIntegrationUpdate(integration.id, {
      settings: {
        ...settings,
        pausedAccountIds,
      },
      updatedById: actorUserId,
    });

    await this.audit(
      actorUserId,
      isPaused ? 'META_ACCOUNT_PAUSED' : 'META_ACCOUNT_RESUMED',
      'PortalIntegration',
      integration.id,
      { accountId: targetAccountId, isPaused },
    );

    return this.getMetaIntegration(actorUserId);
  }

  async toggleMetaFormPause(
    formId: string,
    isPaused: boolean,
    actorUserId?: string,
  ) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const targetFormId = String(formId ?? '').trim();
    let pausedFormIds = [...settings.pausedFormIds];
    if (isPaused) {
      if (!pausedFormIds.includes(targetFormId)) {
        pausedFormIds.push(targetFormId);
      }
    } else {
      pausedFormIds = pausedFormIds.filter((id) => id !== targetFormId);
    }

    await this.portalIntegrationUpdate(integration.id, {
      settings: {
        ...settings,
        pausedFormIds,
      },
      updatedById: actorUserId,
    });

    await this.audit(
      actorUserId,
      isPaused ? 'META_FORM_PAUSED' : 'META_FORM_RESUMED',
      'PortalIntegration',
      integration.id,
      { formId: targetFormId, isPaused },
    );

    return this.getMetaIntegration(actorUserId);
  }

  async addManualMetaPage(body: Body, actorUserId?: string) {
    const pageId = String(body.pageId ?? '').trim();
    const pageAccessToken = String(body.pageAccessToken ?? '').trim();
    const accountName = String(
      body.accountName ?? 'Manual Page connection',
    ).trim();
    if (!pageId || !pageAccessToken) {
      throw new BadRequestException(
        'Page ID and Page access token are required',
      );
    }

    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const currentCredentials = this.getMetaCredentials(integration.credentials);
    const graphApiVersion = settings.graphApiVersion || 'v20.0';
    const [page, forms, subscription] = await Promise.all([
      this.fetchMetaPageForToken(pageId, pageAccessToken, graphApiVersion),
      this.fetchMetaLeadFormsForToken(pageId, pageAccessToken, graphApiVersion),
      this.subscribeMetaPageLeadgen(pageId, pageAccessToken, graphApiVersion),
    ]);
    const accountId = `manual:${pageId}`;
    const connectedAt = new Date().toISOString();
    const storedPage = {
      ...page,
      accountId,
      accountName: accountName || 'Manual Page connection',
      accessToken: pageAccessToken,
      formsTotalCount: forms.length,
      leadgenSubscribed: subscription.subscribed,
      subscriptionError: subscription.error ?? null,
    };
    const pageById = new Map<string, Body>();
    currentCredentials.pages.forEach((candidate: Body) => {
      const candidateId = String(candidate.id ?? '').trim();
      if (candidateId) pageById.set(candidateId, candidate);
    });
    pageById.set(pageId, storedPage);
    const accounts = [
      ...currentCredentials.accounts.filter(
        (candidate: Body) => String(candidate.id ?? '') !== accountId,
      ),
      {
        id: accountId,
        name: accountName || 'Manual Page connection',
        userAccessToken: '',
        connectedAt,
        pages: [storedPage],
      },
    ];
    const pageFormSelections = {
      ...settings.pageFormSelections,
      [pageId]: forms.map((form) => form.id),
    };
    await this.portalIntegrationUpdate(integration.id, {
      status: subscription.subscribed ? 'Configured' : 'Needs attention',
      settings: {
        ...settings,
        pageId: settings.pageId || pageId,
        selectedPageId: pageId,
        selectedFormIds: pageFormSelections[pageId],
        pageFormSelections,
      },
      credentials: {
        ...currentCredentials,
        pageAccessToken: currentCredentials.pageAccessToken || pageAccessToken,
        accounts,
        pages: Array.from(pageById.values()),
      },
      updatedById: actorUserId,
    });
    await this.audit(
      actorUserId,
      'META_MANUAL_PAGE_CONNECTED',
      'PortalIntegration',
      integration.id,
      {
        pageId,
        accountId,
        formsDiscovered: forms.length,
        subscribed: subscription.subscribed,
      },
    );
    return this.getMetaIntegration(actorUserId);
  }

  async saveMetaPageForms(pageId: string, body: Body, actorUserId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const selectedFormIds = Array.isArray(body.selectedFormIds)
      ? body.selectedFormIds.map((value: unknown) => String(value))
      : [];
    const credentials = this.getMetaCredentials(integration.credentials);
    const isConnectedPage = credentials.pages.some(
      (page: Body) => String(page.id ?? '') === pageId,
    );
    if (!isConnectedPage) {
      throw new BadRequestException('Meta Page is not connected');
    }
    const requestedProjectId =
      body.projectId === undefined
        ? undefined
        : String(body.projectId ?? '').trim();
    const requestedSourceId =
      body.sourceId === undefined
        ? undefined
        : String(body.sourceId ?? '').trim();
    const requestedTeamId =
      body.teamId === undefined ? undefined : String(body.teamId ?? '').trim();
    const requestedTelecallerId =
      body.telecallerId === undefined
        ? undefined
        : String(body.telecallerId ?? '').trim();
    const requestedFieldExecutiveId =
      body.fieldExecutiveId === undefined
        ? undefined
        : String(body.fieldExecutiveId ?? '').trim();
    const requestedOwnerId =
      body.ownerId === undefined
        ? undefined
        : String(body.ownerId ?? '').trim();
    if (requestedProjectId) {
      const project = await this.db().project.findFirst({
        where: { id: requestedProjectId, status: { not: 'Archived' } },
        select: { id: true },
      });
      if (!project) {
        throw new BadRequestException(
          'Select an active CRM project for this Page',
        );
      }
    }
    if (requestedSourceId) {
      const source = await this.db().leadMasterValue.findFirst({
        where: {
          id: requestedSourceId,
          isActive: true,
          categoryRef: { code: 'source' },
        },
        select: { id: true },
      });
      if (!source)
        throw new BadRequestException('Select an active lead source');
    }
    if (requestedTeamId) {
      const team = await this.db().team.findFirst({
        where: { id: requestedTeamId, isActive: true },
        select: { id: true },
      });
      if (!team) throw new BadRequestException('Select an active CRM team');
    }
    await this.assertValidRoutingAssignees(
      requestedTelecallerId,
      requestedFieldExecutiveId,
      requestedOwnerId,
    );
    const pageProjectMappings = {
      ...settings.pageProjectMappings,
    };
    if (requestedProjectId !== undefined) {
      if (requestedProjectId) {
        pageProjectMappings[pageId] = requestedProjectId;
      } else {
        delete pageProjectMappings[pageId];
      }
    }
    const pageSourceMappings = { ...settings.pageSourceMappings };
    if (requestedSourceId !== undefined) {
      if (requestedSourceId) pageSourceMappings[pageId] = requestedSourceId;
      else delete pageSourceMappings[pageId];
    }
    const pageTeamMappings = { ...settings.pageTeamMappings };
    if (requestedTeamId !== undefined) {
      if (requestedTeamId) pageTeamMappings[pageId] = requestedTeamId;
      else delete pageTeamMappings[pageId];
    }
    const pageAssignmentOverrides = { ...settings.pageAssignmentOverrides };
    if (
      requestedTelecallerId !== undefined ||
      requestedFieldExecutiveId !== undefined ||
      requestedOwnerId !== undefined
    ) {
      const nextOverride = {
        ...(requestedOwnerId ? { ownerId: requestedOwnerId } : {}),
        ...(requestedTelecallerId
          ? { telecallerId: requestedTelecallerId }
          : {}),
        ...(requestedFieldExecutiveId
          ? { fieldExecutiveId: requestedFieldExecutiveId }
          : {}),
      };
      if (Object.keys(nextOverride).length)
        pageAssignmentOverrides[pageId] = nextOverride;
      else delete pageAssignmentOverrides[pageId];
    }
    await this.portalIntegrationUpdate(integration.id, {
      settings: {
        ...settings,
        pageId,
        selectedPageId: pageId,
        selectedFormIds,
        pageFormSelections: {
          ...settings.pageFormSelections,
          [pageId]: selectedFormIds,
        },
        pageProjectMappings,
        pageSourceMappings,
        pageTeamMappings,
        pageAssignmentOverrides,
      },
      updatedById: actorUserId,
    });
    await this.audit(
      actorUserId,
      'META_PAGE_FORMS_UPDATED',
      'PortalIntegration',
      integration.id,
      {
        pageId,
        selectedFormIds,
        projectId: requestedProjectId ?? null,
        sourceId: requestedSourceId ?? null,
        teamId: requestedTeamId ?? null,
        ownerId: requestedOwnerId ?? null,
        telecallerId: requestedTelecallerId ?? null,
        fieldExecutiveId: requestedFieldExecutiveId ?? null,
      },
    );
    return this.getMetaIntegration(actorUserId);
  }

  async saveMetaFormRouting(
    pageId: string,
    formId: string,
    body: unknown,
    actorUserId?: string,
  ) {
    this.assertTenantWorkspaceMutation();
    const parsed = MetaFormRoutingSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join('; '),
      );
    }
    const routing = parsed.data;
    const integration = await this.ensureMetaIntegration(actorUserId);
    const credentials = this.getMetaCredentials(integration.credentials);
    if (!credentials.pages.some((page) => String(page.id) === pageId)) {
      throw new BadRequestException('Select a connected Meta Page');
    }
    const forms = await this.listMetaLeadForms(pageId, actorUserId);
    if (!forms.data.some((form) => form.id === formId)) {
      throw new BadRequestException(
        'Select a lead form belonging to this Meta Page',
      );
    }
    if (routing.projectId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: routing.projectId,
          organizationId: integration.organizationId,
          status: { not: 'Archived' },
        },
        select: { id: true },
      });
      if (!project)
        throw new BadRequestException(
          'Select an active CRM project for this form',
        );
    }
    if (routing.sourceId) {
      const source = await this.prisma.leadMasterValue.findFirst({
        where: {
          id: routing.sourceId,
          isActive: true,
          categoryRef: { code: 'source' },
        },
        select: { id: true },
      });
      if (!source)
        throw new BadRequestException('Select an active lead source');
    }
    if (routing.assignment?.mode === 'automatic' && routing.assignment.teamId) {
      const team = await this.prisma.team.findFirst({
        where: {
          id: routing.assignment.teamId,
          organizationId: integration.organizationId,
          isActive: true,
        },
        select: { id: true },
      });
      if (!team) throw new BadRequestException('Select an active CRM team');
    }
    if (routing.assignment?.mode === 'person') {
      await this.assertValidRoutingAssignees(
        routing.assignment.telecallerId,
        routing.assignment.fieldExecutiveId,
        routing.assignment.ownerId,
      );
    }
    // Update one JSON leaf atomically, preserving concurrent sibling-form saves.
    const serialized = JSON.stringify(routing);
    const reset = Object.keys(routing).length === 0;
    await this.prisma.$executeRaw`
      UPDATE "PortalIntegration"
      SET "settings" = jsonb_set(COALESCE("settings", '{}'::jsonb), '{formRoutingOverrides}',
        CASE WHEN ${reset} THEN
          COALESCE("settings"->'formRoutingOverrides', '{}'::jsonb) #- ARRAY[${pageId}, ${formId}]
        ELSE jsonb_set(COALESCE("settings"->'formRoutingOverrides', '{}'::jsonb), ARRAY[${pageId}],
          COALESCE("settings"->'formRoutingOverrides'->${pageId}, '{}'::jsonb)
            || jsonb_build_object(${formId}::text, ${serialized}::jsonb), true)
        END, true),
        "updatedById" = ${actorUserId ?? null}, "updatedAt" = NOW()
      WHERE "id" = ${integration.id} AND "organizationId" = ${
        integration.organizationId
      }
    `;
    await this.audit(
      actorUserId,
      'META_FORM_ROUTING_UPDATED',
      'PortalIntegration',
      integration.id,
      {
        pageId,
        formId,
        routing,
        reset,
      },
    );
    return this.getMetaIntegration(actorUserId);
  }

  async disconnectMetaAccount(accountId: string, actorUserId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const settings = this.getMetaSettings(integration.settings);
    const credentials = this.getMetaCredentials(integration.credentials);
    const removedPageIds = new Set(
      credentials.pages
        .filter((page: Body) => String(page.accountId ?? '') === accountId)
        .map((page: Body) => String(page.id ?? '')),
    );
    const nextAccounts = credentials.accounts.filter(
      (account: Body) => String(account.id ?? '') !== accountId,
    );
    const nextPages = credentials.pages.filter(
      (page: Body) => String(page.accountId ?? '') !== accountId,
    );
    const nextPageFormSelections = Object.fromEntries(
      Object.entries(settings.pageFormSelections).filter(
        ([pageId]) => !removedPageIds.has(pageId),
      ),
    );
    const nextPageProjectMappings = Object.fromEntries(
      Object.entries(settings.pageProjectMappings).filter(
        ([pageId]) => !removedPageIds.has(pageId),
      ),
    );
    const nextPageSourceMappings = Object.fromEntries(
      Object.entries(settings.pageSourceMappings).filter(
        ([pageId]) => !removedPageIds.has(pageId),
      ),
    );
    const nextPageTeamMappings = Object.fromEntries(
      Object.entries(settings.pageTeamMappings).filter(
        ([pageId]) => !removedPageIds.has(pageId),
      ),
    );
    const nextPageAssignmentOverrides = Object.fromEntries(
      Object.entries(settings.pageAssignmentOverrides).filter(
        ([pageId]) => !removedPageIds.has(pageId),
      ),
    );
    const nextSelectedPageId = removedPageIds.has(settings.selectedPageId)
      ? String(nextPages[0]?.id ?? '')
      : settings.selectedPageId;
    await this.portalIntegrationUpdate(
      integration.id,
      {
        status: nextPages.length ? integration.status : 'Configured',
        settings: {
          ...settings,
          pageId: nextSelectedPageId,
          selectedPageId: nextSelectedPageId,
          selectedFormIds: nextPageFormSelections[nextSelectedPageId] ?? [],
          pageFormSelections: nextPageFormSelections,
          pageProjectMappings: nextPageProjectMappings,
          pageSourceMappings: nextPageSourceMappings,
          pageTeamMappings: nextPageTeamMappings,
          pageAssignmentOverrides: nextPageAssignmentOverrides,
          formRoutingOverrides: Object.fromEntries(
            Object.entries(settings.formRoutingOverrides).filter(
              ([pageId]) => !removedPageIds.has(pageId),
            ),
          ),
        },
        credentials: {
          ...credentials,
          accounts: nextAccounts,
          pages: nextPages,
          pageAccessToken:
            nextPages.find(
              (page: Body) => String(page.id ?? '') === nextSelectedPageId,
            )?.accessToken ?? '',
        },
        updatedById: actorUserId,
      },
      [...removedPageIds],
    );
    await this.audit(
      actorUserId,
      'META_ACCOUNT_DISCONNECTED',
      'PortalIntegration',
      integration.id,
      { accountId, removedPageIds: Array.from(removedPageIds) },
    );
    return this.getMetaIntegration(actorUserId);
  }

  async regenerateMetaVerifyToken(actorUserId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    await this.portalIntegrationUpdate(integration.id, {
      webhookKeyId: randomBytes(18).toString('hex'),
      status:
        integration.status === 'Draft' ? 'Configured' : integration.status,
      updatedById: actorUserId,
    });
    await this.audit(
      actorUserId,
      'META_VERIFY_TOKEN_REGENERATED',
      'PortalIntegration',
      integration.id,
    );
    return this.getMetaIntegration(actorUserId);
  }

  async saveMetaFieldMapping(body: Body, actorUserId?: string) {
    const integration = await this.ensureMetaIntegration(actorUserId);
    const mapping = this.getMetaFieldMapping(body.fieldMapping);
    const targetValues = Object.values(mapping);
    if (
      !targetValues.includes('leadName') ||
      !targetValues.includes('mobileNumber')
    ) {
      throw new BadRequestException(
        'Lead name and mobile number must be mapped before continuing',
      );
    }
    await this.portalIntegrationUpdate(integration.id, {
      fieldMapping: mapping,
      status: 'Mapped',
      updatedById: actorUserId,
    });
    await this.audit(
      actorUserId,
      'META_FIELD_MAPPING_UPDATED',
      'PortalIntegration',
      integration.id,
      { fieldMapping: mapping },
    );
    return this.getMetaIntegration(actorUserId);
  }

  async verifyMetaWebhook(query: Body) {
    const integration = await this.prisma.portalIntegration.findFirst({
      where: {
        provider: metaProvider,
        organizationId: { not: null },
        webhookKeyId: String(
          query['hub.verify_token'] ?? query.hub_verify_token ?? '',
        ),
      },
      select: { webhookKeyId: true },
    });
    const mode = String(query['hub.mode'] ?? query.hub_mode ?? '');
    const token = String(
      query['hub.verify_token'] ?? query.hub_verify_token ?? '',
    );
    const challenge = String(
      query['hub.challenge'] ?? query.hub_challenge ?? '',
    );
    if (mode === 'subscribe' && token && token === integration?.webhookKeyId) {
      return challenge;
    }
    throw new ForbiddenException('Invalid Meta webhook verification token');
  }

  private extractMetaLeadgenEvents(body: Body) {
    const entries = Array.isArray(body.entry) ? body.entry : [];
    const events: Body[] = [];
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        if (String(change?.field ?? '') !== 'leadgen') continue;
        const value = change.value ?? {};
        events.push({
          leadgenId: value.leadgen_id,
          formId: value.form_id,
          pageId: value.page_id ?? entry.id,
          adId: value.ad_id,
          createdTime: value.created_time,
        });
      }
    }
    return events.filter((event) => event.leadgenId);
  }

  private async fetchMetaLeadDetails(
    leadgenId: string,
    accessToken: string,
    graphApiVersion: string,
  ) {
    const version = graphApiVersion || 'v20.0';
    // Page, form, and ad identifiers are delivered by the leadgen webhook.
    // Request only documented leadgen payload fields to avoid optional Graph
    // display fields that vary by API version and Page permission.
    const fields = ['created_time', 'field_data'].join(',');
    const url = new URL(
      `https://graph.facebook.com/${version}/${encodeURIComponent(leadgenId)}`,
    );
    url.searchParams.set('fields', fields);
    url.searchParams.set('access_token', accessToken);
    const response = await fetch(url);
    if (!response.ok) {
      const responseText = await response.text().catch(() => '');
      throw new BadRequestException(
        `Meta lead fetch failed with ${response.status}${
          responseText ? `: ${responseText}` : ''
        }`,
      );
    }
    return (await response.json()) as Body;
  }

  private coalesceMetaLeadPayload(lead: Body, event?: Body) {
    const fieldData = Array.isArray(lead.field_data) ? lead.field_data : [];
    const fieldMap: Body = {};
    for (const field of fieldData) {
      const key = String(field?.name ?? '').trim();
      const values = Array.isArray(field?.values) ? field.values : [];
      if (!key || !values.length) continue;
      fieldMap[key] = values.map((value) => String(value)).join(', ');
    }
    const firstName = String(
      fieldMap.first_name ?? fieldMap.firstname ?? '',
    ).trim();
    const lastName = String(
      fieldMap.last_name ?? fieldMap.lastname ?? '',
    ).trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    return {
      ...fieldMap,
      leadgenId: lead.id ?? event?.leadgenId,
      formId: event?.formId,
      pageId: event?.pageId,
      adId: event?.adId,
      createdTime: lead.created_time ?? event?.createdTime,
      adName: undefined,
      // The leadgen endpoint does not expose form_name. The webhook formId
      // remains the canonical identifier while this preserves formatter compatibility.
      formName: undefined,
      pageName: undefined,
      platform: undefined,
      full_name: fieldMap.full_name ?? fieldMap.name ?? fullName,
      phone_number:
        fieldMap.phone_number ??
        fieldMap.phone ??
        fieldMap.mobile ??
        fieldMap.mobile_number,
      project_name:
        fieldMap.project_name ?? fieldMap.project ?? fieldMap.preferred_project,
      remarks:
        fieldMap.remarks ??
        fieldMap.remark ??
        fieldMap.message ??
        fieldMap.comments,
    };
  }

  private normalizeMetaDate(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'number') {
      const millis = value > 9999999999 ? value : value * 1000;
      return new Date(millis);
    }
    const raw = String(value).trim();
    if (/^\d+$/.test(raw)) {
      const numeric = Number(raw);
      return this.normalizeMetaDate(numeric);
    }
    return normalizeDate(raw);
  }

  private async normalizeMetaPayload(
    lead: Body,
    mapping?: unknown,
    event?: Body,
    settings?: ReturnType<typeof this.getMetaSettings>,
    organizationId = this.tenantAccess.organizationId,
  ) {
    const payload = this.coalesceMetaLeadPayload(lead, event);
    const fieldMapping = this.getMetaFieldMapping(mapping);
    const normalized: Body = {};
    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      if (targetField === 'skip') continue;
      const rawValue = payload[sourceField];
      if (
        rawValue === undefined ||
        rawValue === null ||
        String(rawValue).trim() === ''
      ) {
        continue;
      }
      if (!normalized[targetField]) {
        normalized[targetField] = String(rawValue).trim();
      }
    }

    const projectName =
      normalized.preferredProject ?? payload.project_name ?? undefined;
    const matchedProject = projectName
      ? await this.db().project.findFirst({
          where: {
            organizationId,
            OR: [
              { name: { equals: String(projectName), mode: 'insensitive' } },
              { name: { contains: String(projectName), mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, location: true },
        })
      : null;
    const routing = resolveMetaRouting(
      settings ?? {
        pageProjectMappings: {},
        pageSourceMappings: {},
        pageTeamMappings: {},
        pageAssignmentOverrides: {},
      },
      String(payload.pageId ?? ''),
      String(payload.formId ?? ''),
    );
    const configuredProjectId = routing.projectId ?? '';
    const configuredProject = configuredProjectId
      ? await this.db().project.findFirst({
          where: {
            id: configuredProjectId,
            organizationId,
            status: { not: 'Archived' },
          },
          select: { id: true, name: true, location: true },
        })
      : null;
    const resolvedProject = configuredProject ?? matchedProject;
    const configuredSourceId = routing.sourceId ?? '';
    const configuredTeamId = routing.teamId ?? '';
    const configuredAssignment = routing;
    const [
      metaSource,
      newLeadStatus,
      configuredSource,
      configuredTeam,
      configuredUsers,
    ] = await Promise.all([
      this.getMetaAdsSourceMaster(),
      this.getDefaultNewLeadStatusMaster(),
      configuredSourceId
        ? this.db().leadMasterValue.findFirst({
            where: {
              id: configuredSourceId,
              AND: [this.tenantAccess.employeeWhere(organizationId)],
              isActive: true,
              categoryRef: { code: 'source' },
            },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      configuredTeamId
        ? this.db().team.findFirst({
            where: { id: configuredTeamId, organizationId, isActive: true },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      [
        configuredAssignment.ownerId,
        configuredAssignment.telecallerId,
        configuredAssignment.fieldExecutiveId,
      ].filter(Boolean).length
        ? this.db().user.findMany({
            where: {
              id: {
                in: [
                  configuredAssignment.ownerId,
                  configuredAssignment.telecallerId,
                  configuredAssignment.fieldExecutiveId,
                ].filter(Boolean),
              },
              AND: [this.tenantAccess.employeeWhere(organizationId)],
              isActive: true,
            },
            select: { id: true, role: true },
          })
        : Promise.resolve([]),
    ]);
    const configuredOwnerId = configuredUsers.some(
      (user) =>
        user.id === configuredAssignment.ownerId &&
        ROUTING_OWNER_ROLES.includes(user.role),
    )
      ? configuredAssignment.ownerId
      : undefined;
    const configuredTelecallerId = configuredUsers.some(
      (user) =>
        user.id === configuredAssignment.telecallerId &&
        user.role === Role.TELECALLER,
    )
      ? configuredAssignment.telecallerId
      : undefined;
    const configuredFieldExecutiveId = configuredUsers.some(
      (user) =>
        user.id === configuredAssignment.fieldExecutiveId &&
        user.role === Role.SALES_AGENT,
    )
      ? configuredAssignment.fieldExecutiveId
      : undefined;
    const remarksParts = [
      normalized.remarks,
      payload.adName ? `Meta ad: ${String(payload.adName).trim()}` : undefined,
      payload.formName
        ? `Meta form: ${String(payload.formName).trim()}`
        : undefined,
      payload.pageName
        ? `Meta page: ${String(payload.pageName).trim()}`
        : undefined,
      resolvedProject
        ? undefined
        : projectName
        ? `Project: ${String(projectName).trim()}`
        : undefined,
    ].filter(Boolean);

    // Collect unmapped Meta form Q&A responses for the remarks
    const rawFieldData = Array.isArray(lead.field_data) ? lead.field_data : [];
    const mappedSourceFields = new Set(Object.keys(fieldMapping));
    const standardMetaFields = new Set([
      'first_name',
      'firstname',
      'last_name',
      'lastname',
      'full_name',
      'name',
      'phone_number',
      'phone',
      'mobile',
      'mobile_number',
      'email',
      'email_address',
      'remarks',
      'remark',
      'message',
      'comments',
      'project_name',
      'project',
      'preferred_project',
    ]);
    const formResponses: string[] = [];
    for (const field of rawFieldData) {
      const key = String(field?.name ?? '').trim();
      const values = Array.isArray(field?.values) ? field.values : [];
      if (!key || !values.length) continue;
      if (mappedSourceFields.has(key) || standardMetaFields.has(key)) continue;
      const label = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const answer = values.map((value) => String(value)).join(', ');
      formResponses.push(`${label}: ${answer}`);
    }
    if (formResponses.length) {
      remarksParts.push(`Meta Form Responses — ${formResponses.join(' | ')}`);
    }

    return {
      payload,
      fieldMapping,
      normalizedLead: {
        leadName: normalized.leadName ?? '',
        mobileNumber: normalized.mobileNumber ?? '',
        emailAddress: normalized.emailAddress ?? '',
        preferredProjectId: resolvedProject?.id,
        preferredProjectName:
          resolvedProject?.name ?? (projectName ? String(projectName) : ''),
        preferredLocation:
          normalized.preferredLocation ?? resolvedProject?.location ?? '',
        leadSourceName:
          configuredSource?.name ?? metaSource?.name ?? 'Meta Ads',
        leadSourceId: configuredSource?.id ?? metaSource?.id,
        leadStatusId: newLeadStatus?.id,
        addedDate: this.normalizeMetaDate(payload.createdTime),
        remarks: remarksParts.join(' | '),
        configuration: normalized.configuration ?? '',
        propertyType: normalized.propertyType ?? '',
        budgetRange: normalized.budgetRange ?? '',
        configuredProjectId: configuredProjectId || undefined,
        routingScope: routing.scope,
        routingFieldScopes: routing.fieldScopes,
        routingFallbacks: [
          ...(configuredProjectId && !configuredProject ? ['project'] : []),
          ...(configuredSourceId && !configuredSource ? ['source'] : []),
          ...(configuredTeamId && !configuredTeam ? ['team'] : []),
          ...((configuredAssignment.ownerId ||
            configuredAssignment.telecallerId ||
            configuredAssignment.fieldExecutiveId) &&
          !(
            configuredOwnerId ||
            configuredTelecallerId ||
            configuredFieldExecutiveId
          )
            ? ['person']
            : []),
        ],
        projectMappingApplied: Boolean(configuredProject),
        projectMappingInvalid: Boolean(
          configuredProjectId && !configuredProject,
        ),
        configuredSourceId: configuredSourceId || undefined,
        sourceMappingApplied: Boolean(configuredSource),
        sourceMappingInvalid: Boolean(configuredSourceId && !configuredSource),
        configuredTeamId: configuredTeamId || undefined,
        teamMappingApplied: Boolean(configuredTeam),
        teamMappingInvalid: Boolean(configuredTeamId && !configuredTeam),
        ownerId: configuredOwnerId,
        telecallerId: configuredTelecallerId,
        fieldExecutiveId: configuredFieldExecutiveId,
        assignmentOverrideApplied: Boolean(
          configuredOwnerId ||
            configuredTelecallerId ||
            configuredFieldExecutiveId,
        ),
        automaticAssignmentConfigured:
          settings?.formRoutingOverrides?.[String(payload.pageId ?? '')]?.[
            String(payload.formId ?? '')
          ]?.assignment?.mode === 'automatic',
      },
    };
  }

  async receiveMetaWebhook(body: Body, ip?: string, userAgent?: string) {
    const events = this.extractMetaLeadgenEvents(body);
    const integrations = await this.prisma.portalIntegration.findMany({
      where: { provider: metaProvider, organizationId: { not: null } },
    });
    const results: Body[] = [];
    const errors: string[] = [];
    for (const event of events) {
      const matches = integrations.filter((integration) =>
        this.getMetaCredentials(integration.credentials).pages.some(
          (page) => String(page.id) === String(event.pageId),
        ),
      );
      if (matches.length !== 1) {
        errors.push(
          `Meta Page ${String(event.pageId)} has no unique workspace owner`,
        );
        continue;
      }
      const organizationId = matches[0].organizationId;
      if (!organizationId) continue;
      const result = await this.tenantContext.run({ organizationId }, () =>
        this.receiveMetaIntegrationWebhook(
          matches[0],
          {
            entry: [
              {
                id: event.pageId,
                changes: [
                  {
                    field: 'leadgen',
                    value: {
                      leadgen_id: event.leadgenId,
                      form_id: event.formId,
                      page_id: event.pageId,
                      ad_id: event.adId,
                      created_time: event.createdTime,
                    },
                  },
                ],
              },
            ],
          },
          ip,
          userAgent,
        ),
      );
      results.push(...(result.results ?? []));
      errors.push(...result.errors);
    }
    return {
      received: true,
      processed: results.filter((result) => result.leadId && !result.skipped)
        .length,
      results,
      errors,
    };
  }

  private async receiveMetaIntegrationWebhook(
    integration: Body,
    body: Body,
    ip?: string,
    userAgent?: string,
  ) {
    if (!integration.isActive || integration.status === 'Paused') {
      this.logger.warn(
        '[MetaWebhook] skipped: integration is inactive or paused',
      );
      await this.audit(
        undefined,
        'META_LEAD_SKIPPED',
        'PortalIntegration',
        integration.id,
        {
          reason: 'Meta integration is paused',
          ip,
          userAgent,
        },
      );
      return {
        received: true,
        processed: 0,
        errors: ['Meta integration is paused'],
      };
    }
    const credentials = this.getMetaCredentials(integration.credentials);
    const settings = this.getMetaSettings(integration.settings);
    if (!credentials.pages.length && !credentials.pageAccessToken) {
      this.logger.warn('[MetaWebhook] skipped: no Page token is configured');
      await this.audit(
        undefined,
        'META_LEAD_SKIPPED',
        'PortalIntegration',
        integration.id,
        {
          reason: 'Meta Page access token is not configured',
          ip,
          userAgent,
        },
      );
      return {
        received: true,
        processed: 0,
        errors: ['Meta Page access token is not configured'],
      };
    }
    const events = this.extractMetaLeadgenEvents(body);
    this.logger.log(`[MetaWebhook] received ${events.length} leadgen event(s)`);
    await this.audit(
      undefined,
      'META_WEBHOOK_RECEIVED',
      'PortalIntegration',
      integration.id,
      {
        eventCount: events.length,
        leadgenIds: events.map((event) => String(event.leadgenId)),
        pageIds: events
          .map((event) => String(event.pageId ?? ''))
          .filter(Boolean),
        ip,
        userAgent,
      },
    );
    const results: Body[] = [];
    const errors: string[] = [];
    for (const event of events) {
      try {
        const eventPageId = String(event.pageId ?? '').trim();
        const eventFormId = String(event.formId ?? '').trim();

        // Check if the Meta Account containing this page is paused
        const matchedPage = credentials.pages.find(
          (p: Body) => String(p.id ?? '') === eventPageId,
        );
        const eventAccountId = matchedPage
          ? String(matchedPage.accountId ?? '')
          : '';
        if (
          eventAccountId &&
          settings.pausedAccountIds.includes(eventAccountId)
        ) {
          this.logger.warn(
            `[MetaWebhook] skipped leadgenId=${event.leadgenId}: Account ${eventAccountId} is currently paused`,
          );
          results.push({
            leadgenId: event.leadgenId,
            pageId: eventPageId,
            formId: eventFormId,
            skipped: true,
            reason: 'Meta Account lead syncing is paused',
          });
          await this.audit(
            undefined,
            'META_LEAD_SKIPPED',
            'PortalIntegration',
            integration.id,
            {
              leadgenId: event.leadgenId,
              pageId: eventPageId,
              formId: eventFormId,
              reason: 'Meta Account lead syncing is paused',
            },
          );
          continue;
        }

        // Check if Meta Page is paused
        if (eventPageId && settings.pausedPageIds.includes(eventPageId)) {
          this.logger.warn(
            `[MetaWebhook] skipped leadgenId=${event.leadgenId}: Page ${eventPageId} is currently paused`,
          );
          results.push({
            leadgenId: event.leadgenId,
            pageId: eventPageId,
            formId: eventFormId,
            skipped: true,
            reason: 'Meta Page lead syncing is paused',
          });
          await this.audit(
            undefined,
            'META_LEAD_SKIPPED',
            'PortalIntegration',
            integration.id,
            {
              leadgenId: event.leadgenId,
              pageId: eventPageId,
              formId: eventFormId,
              reason: 'Meta Page lead syncing is paused',
            },
          );
          continue;
        }

        // Check if Meta Form is paused
        if (eventFormId && settings.pausedFormIds.includes(eventFormId)) {
          this.logger.warn(
            `[MetaWebhook] skipped leadgenId=${event.leadgenId}: Form ${eventFormId} is currently paused`,
          );
          results.push({
            leadgenId: event.leadgenId,
            pageId: eventPageId,
            formId: eventFormId,
            skipped: true,
            reason: 'Meta Lead Form syncing is paused',
          });
          await this.audit(
            undefined,
            'META_LEAD_SKIPPED',
            'PortalIntegration',
            integration.id,
            {
              leadgenId: event.leadgenId,
              pageId: eventPageId,
              formId: eventFormId,
              reason: 'Meta Lead Form syncing is paused',
            },
          );
          continue;
        }
        const pageAccessToken = this.selectedMetaPageAccessToken(
          eventPageId || settings.selectedPageId || settings.pageId,
          credentials,
        );
        if (!pageAccessToken) {
          this.logger.warn(
            `[MetaWebhook] skipped leadgenId=${event.leadgenId}: Page ${
              eventPageId || 'unknown'
            } has no stored token`,
          );
          results.push({
            leadgenId: event.leadgenId,
            pageId: eventPageId,
            formId: eventFormId,
            skipped: true,
            reason: 'Meta Page is not connected or has no stored Page token',
          });
          await this.audit(
            undefined,
            'META_LEAD_SKIPPED',
            'PortalIntegration',
            integration.id,
            {
              leadgenId: event.leadgenId,
              pageId: eventPageId,
              formId: eventFormId,
              reason: 'Meta Page is not connected or has no stored Page token',
            },
          );
          continue;
        }
        const enabledFormIds = this.metaEnabledFormIdsForPage(
          eventPageId || settings.selectedPageId || settings.pageId,
          settings,
        );
        if (!enabledFormIds.length || !enabledFormIds.includes(eventFormId)) {
          this.logger.warn(
            `[MetaWebhook] skipped leadgenId=${event.leadgenId}: form ${
              eventFormId || 'unknown'
            } is not enabled`,
          );
          results.push({
            leadgenId: event.leadgenId,
            pageId: eventPageId,
            formId: eventFormId,
            skipped: true,
            reason: enabledFormIds.length
              ? 'Form is not enabled for CRM import'
              : 'No forms are enabled for this Page',
          });
          await this.audit(
            undefined,
            'META_LEAD_SKIPPED',
            'PortalIntegration',
            integration.id,
            {
              leadgenId: event.leadgenId,
              pageId: eventPageId,
              formId: eventFormId,
              reason: enabledFormIds.length
                ? 'Form is not enabled for CRM import'
                : 'No forms are enabled for this Page',
            },
          );
          continue;
        }
        const details = await this.fetchMetaLeadDetails(
          String(event.leadgenId),
          pageAccessToken,
          settings.graphApiVersion,
        );
        const preview = await this.normalizeMetaPayload(
          details,
          integration.fieldMapping,
          event,
          settings,
          integration.organizationId,
        );
        if (preview.normalizedLead.projectMappingInvalid) {
          this.logger.warn(
            `[MetaWebhook] configured project ${
              preview.normalizedLead.configuredProjectId
            } is unavailable for Page ${
              eventPageId || 'unknown'
            }; using form mapping fallback`,
          );
        }
        if (
          !preview.normalizedLead.leadName ||
          !preview.normalizedLead.mobileNumber
        ) {
          const reason = 'Lead name and mobile are required after form mapping';
          this.logger.warn(
            `[MetaWebhook] failed leadgenId=${event.leadgenId}: ${reason}`,
          );
          errors.push(`Lead ${event.leadgenId}: ${reason}`);
          await this.audit(
            undefined,
            'META_LEAD_FAILED',
            'PortalIntegration',
            integration.id,
            {
              leadgenId: event.leadgenId,
              pageId: eventPageId,
              formId: eventFormId,
              reason,
            },
          );
          continue;
        }
        const duplicate = await this.db().lead.findFirst({
          where: {
            organizationId: integration.organizationId,
            OR: [
              { mobile: preview.normalizedLead.mobileNumber },
              preview.normalizedLead.emailAddress
                ? { email: preview.normalizedLead.emailAddress }
                : undefined,
            ].filter(Boolean),
          },
          select: { id: true, displayId: true },
        });
        if (duplicate) {
          this.logger.log(
            `[MetaWebhook] duplicate leadgenId=${event.leadgenId} matched ${duplicate.displayId}`,
          );
          results.push({
            leadgenId: event.leadgenId,
            skipped: true,
            reason: 'duplicate',
            leadId: duplicate.id,
            displayId: duplicate.displayId,
          });
          await this.audit(
            undefined,
            'META_DUPLICATE_LEAD_RECEIVED',
            'Lead',
            duplicate.id,
            {
              displayId: duplicate.displayId,
              leadgenId: event.leadgenId,
              pageId: eventPageId,
              formId: eventFormId,
              outcome: 'Duplicate lead preserved',
              ip,
              userAgent,
            },
          );
          continue;
        }
        const lead = await this.createLead(
          {
            organizationId: integration.organizationId,
            name: preview.normalizedLead.leadName,
            mobile: preview.normalizedLead.mobileNumber,
            email: preview.normalizedLead.emailAddress || undefined,
            sourceId: preview.normalizedLead.leadSourceId,
            statusId: preview.normalizedLead.leadStatusId,
            createdAt: preview.normalizedLead.addedDate,
            preferredProject: preview.normalizedLead.preferredProjectId,
            preferredLocation:
              preview.normalizedLead.preferredLocation || undefined,
            remarks: preview.normalizedLead.remarks || undefined,
            configuration: preview.normalizedLead.configuration || undefined,
            propertyType: preview.normalizedLead.propertyType || undefined,
            budgetRange: preview.normalizedLead.budgetRange || undefined,
            ownerId: preview.normalizedLead.ownerId,
            telecallerId: preview.normalizedLead.telecallerId,
            fieldExecutiveId: preview.normalizedLead.fieldExecutiveId,
            autoAssignmentTeamId: preview.normalizedLead
              .assignmentOverrideApplied
              ? undefined
              : preview.normalizedLead.teamMappingApplied
              ? preview.normalizedLead.configuredTeamId
              : undefined,
          },
          undefined,
          {
            fromIntegration: true,
            useConfiguredAutomation:
              preview.normalizedLead.automaticAssignmentConfigured,
          },
        );
        results.push({
          leadgenId: event.leadgenId,
          leadId: lead.id,
          displayId: lead.displayId,
        });
        this.logger.log(
          `[MetaWebhook] created leadgenId=${event.leadgenId} as ${lead.displayId}`,
        );
        await this.audit(undefined, 'META_LEAD_RECEIVED', 'Lead', lead.id, {
          displayId: lead.displayId,
          leadgenId: event.leadgenId,
          pageId: eventPageId,
          formId: eventFormId,
          configuredProjectId: preview.normalizedLead.configuredProjectId,
          resolvedProjectId: preview.normalizedLead.preferredProjectId,
          projectMappingApplied: preview.normalizedLead.projectMappingApplied,
          projectMappingInvalid: preview.normalizedLead.projectMappingInvalid,
          configuredSourceId: preview.normalizedLead.configuredSourceId,
          sourceMappingApplied: preview.normalizedLead.sourceMappingApplied,
          configuredTeamId: preview.normalizedLead.configuredTeamId,
          teamMappingApplied: preview.normalizedLead.teamMappingApplied,
          ownerId: preview.normalizedLead.ownerId,
          telecallerId: preview.normalizedLead.telecallerId,
          fieldExecutiveId: preview.normalizedLead.fieldExecutiveId,
          assignmentOverrideApplied:
            preview.normalizedLead.assignmentOverrideApplied,
          routingScope: preview.normalizedLead.routingScope,
          routingFieldScopes: preview.normalizedLead.routingFieldScopes,
          routingFallbacks: preview.normalizedLead.routingFallbacks,
          outcome: 'Lead created in CRM',
          ip,
          userAgent,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `[MetaWebhook] failed leadgenId=${event.leadgenId}: ${reason}`,
        );
        errors.push(`Lead ${event.leadgenId}: ${reason}`);
        await this.audit(
          undefined,
          'META_LEAD_FAILED',
          'PortalIntegration',
          integration.id,
          {
            leadgenId: event.leadgenId,
            pageId: String(event.pageId ?? ''),
            formId: String(event.formId ?? ''),
            reason,
          },
        );
      }
    }
    if (results.some((result) => !result.skipped)) {
      await this.portalIntegrationUpdate(integration.id, {
        lastLeadReceivedAt: new Date(),
        totalLeadsReceived: {
          increment: results.filter((result) => !result.skipped).length,
        },
        status: 'Connected',
      });
    }
    return {
      received: true,
      processed: results.filter((result) => !result.skipped).length,
      skipped: results.filter((result) => result.skipped).length,
      results,
      errors,
    };
  }

  private async createFollowUpNotification({
    recipientUserId,
    lead,
    followUp,
    actorUserId,
    event,
    note,
  }: {
    recipientUserId?: string | null;
    lead: Body;
    followUp: Body;
    actorUserId?: string;
    event: 'created' | 'reassigned' | 'updated' | 'completed' | 'reminder';
    note?: string | null;
  }) {
    if (!recipientUserId) return;
    const [recipient, actor] = await Promise.all([
      this.db().user.findUnique({
        where: { id: recipientUserId },
        select: { id: true, role: true, fullName: true, email: true },
      }),
      actorUserId
        ? this.db().user.findUnique({
            where: { id: actorUserId },
            select: { fullName: true, email: true },
          })
        : Promise.resolve(null),
    ]);
    if (!recipient?.id) return;

    const scheduleLabel = this.formatFollowUpSchedule(followUp.scheduledAt);
    const actorLabel =
      actor?.fullName?.trim() || actor?.email?.trim() || 'CRM team';
    const reminderPayload = this.buildFollowUpReminderPayload(
      recipient.role,
      lead,
      followUp,
    );
    const leadDisplayId = reminderPayload.leadDisplayId;
    const followUpType = reminderPayload.followUpType;

    const notificationContent =
      event === 'reminder'
        ? {
            type: 'follow-up-reminder',
            title: 'Follow-up reminder',
            description: `${lead.name} (${leadDisplayId}) is due now for ${followUpType}.`,
            message:
              note?.trim() ||
              `Follow up with ${lead.name} for the scheduled ${followUpType} task.`,
          }
        : event === 'completed'
        ? {
            type: 'follow-up-completed',
            title: 'Follow-up marked complete',
            description: `${lead.name} (${leadDisplayId}) follow-up was completed.`,
            message:
              note?.trim() ||
              `${actorLabel} completed the ${followUpType} follow-up.`,
          }
        : event === 'reassigned'
        ? {
            type: 'follow-up-reassigned',
            title: 'Follow-up reassigned to you',
            description: `${lead.name} (${leadDisplayId}) is now assigned to you for ${scheduleLabel}.`,
            message:
              note?.trim() ||
              `${actorLabel} reassigned this ${followUpType} follow-up to you.`,
          }
        : event === 'updated'
        ? {
            type: 'follow-up-updated',
            title: 'Follow-up updated',
            description: `${lead.name} (${leadDisplayId}) follow-up was updated for ${scheduleLabel}.`,
            message:
              note?.trim() ||
              `${actorLabel} updated the ${followUpType} follow-up assigned to you.`,
          }
        : {
            type: 'follow-up-assigned',
            title: 'New follow-up assigned',
            description: `${lead.name} (${leadDisplayId}) needs attention on ${scheduleLabel}.`,
            message:
              note?.trim() ||
              `${actorLabel} assigned a ${followUpType} follow-up to you.`,
          };

    await this.createNotificationWithNavigation(
      {
        userId: recipient.id,
        type: notificationContent.type,
        title: notificationContent.title,
        description: notificationContent.description,
        badge: this.roleLabel(recipient.role),
        message: notificationContent.message,
        entityType: 'Lead',
        entityId: lead.id,
        details: { ...reminderPayload, assignedToId: recipient.id },
      },
      reminderPayload,
    ).catch(() => undefined);

    await this.sendPushNotification(
      recipient.id,
      {
        title: notificationContent.title,
        body: notificationContent.description || notificationContent.message,
        type: notificationContent.type,
        data: reminderPayload as any,
      },
      { organizationId: lead.organizationId },
    ).catch(() => undefined);
  }

  private async ensureMasters(categoryCode: string, defaults: Body[]) {
    const category = await this.db().leadMasterCategory.upsert({
      where: { code: categoryCode },
      update: {},
      create: { code: categoryCode, name: categoryCode.replace(/_/g, ' ') },
    });

    const existingCount = await this.db().leadMasterValue.count({
      where: { categoryId: category.id },
    });
    if (!existingCount && defaults.length) {
      await this.db().leadMasterValue.createMany({
        data: defaults.map((item) => ({
          categoryId: category.id,
          name: item.name,
          code: item.code ?? slug(item.name),
          description: item.description,
          group: item.group,
          type: item.type,
          statusType: item.statusType ?? 'System Default',
          isActive: item.isActive ?? true,
          isSystemDefault: item.statusType === 'System Default',
          sortOrder: item.sortOrder ?? 0,
          displayColor: item.displayColor,
          manualScore: item.manualScore ?? item.score ?? 0,
          triggerAction: item.triggerAction ?? 'NONE',
          allowFollowUp: item.allowFollowUp ?? true,
          followUpNotificationEnabled: item.followUpNotificationEnabled ?? true,
          followUpRenotifyMinutes: item.followUpRenotifyMinutes ?? null,
        })),
        skipDuplicates: true,
      });
    }

    return this.db().leadMasterValue.findMany({
      where: { categoryId: category.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  private salesAgentLeadScope(userId: string) {
    return {
      OR: [
        { fieldExecutiveId: userId },
        { ownerId: userId },
        { siteVisits: { some: { assignedExecutiveId: userId } } },
      ],
    };
  }

  private normalizeFollowUpRenotifyMinutes(
    value: unknown,
    followUpNotificationEnabled: boolean,
  ) {
    if (!followUpNotificationEnabled) return null;
    if (value === undefined || value === null || value === '') return null;
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes < 2) {
      throw new BadRequestException(
        'Follow-up renotification interval must be at least 2 minutes',
      );
    }
    return minutes;
  }

  private normalizeMasterCode(rawCode: unknown, fallbackName: string) {
    const base = String(rawCode ?? fallbackName)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return base || 'MASTER';
  }

  private async uniqueMasterCode(
    categoryId: string,
    rawCode: unknown,
    fallbackName: string,
    excludeId?: string,
  ) {
    const baseCode = this.normalizeMasterCode(rawCode, fallbackName);
    let candidate = baseCode;
    let suffix = 2;

    while (
      await this.db().leadMasterValue.findFirst({
        where: {
          categoryId,
          code: candidate,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      })
    ) {
      candidate = `${baseCode}_${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async buildProjectAndRequirementWhere(
    projectFilterIds: string[],
    propertyTypes: string[],
    configurations: string[],
  ): Promise<Prisma.LeadWhereInput[]> {
    const conditions: Prisma.LeadWhereInput[] = [];

    if (configurations.length) {
      conditions.push({
        requirement: {
          is: {
            configuration: { in: configurations },
          },
        },
      });
    }

    if (propertyTypes.length) {
      const projectsWithPropType = await this.db().project.findMany({
        where: {
          propertyType: { in: propertyTypes, mode: 'insensitive' },
        },
        select: { id: true },
      });
      const matchingPropTypeProjIds = projectsWithPropType.map((p) => p.id);

      conditions.push({
        OR: [
          {
            requirement: {
              is: {
                propertyType: { in: propertyTypes },
              },
            },
          },
          ...(matchingPropTypeProjIds.length > 0
            ? [
                {
                  requirement: {
                    is: {
                      preferredProjectId: { in: matchingPropTypeProjIds },
                    },
                  },
                },
                {
                  projectInterests: {
                    some: {
                      projectId: { in: matchingPropTypeProjIds },
                    },
                  },
                },
              ]
            : []),
        ],
      });
    }

    if (projectFilterIds.length) {
      const matchingProjects = await this.db().project.findMany({
        where: {
          OR: [
            { id: { in: projectFilterIds } },
            { name: { in: projectFilterIds, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      const allProjectIds = Array.from(
        new Set([...projectFilterIds, ...matchingProjects.map((p) => p.id)]),
      );

      conditions.push({
        OR: [
          {
            requirement: {
              is: {
                preferredProjectId: { in: allProjectIds },
              },
            },
          },
          {
            projectInterests: {
              some: {
                projectId: { in: allProjectIds },
              },
            },
          },
          {
            siteVisits: {
              some: {
                projectId: { in: allProjectIds },
              },
            },
          },
          {
            bookings: {
              some: {
                projectId: { in: allProjectIds },
              },
            },
          },
        ],
      });
    }

    return conditions;
  }

  private async buildLeadSearchConditions(
    searchRaw: unknown,
    canViewSource = true,
  ): Promise<Prisma.LeadWhereInput[]> {
    const search = String(searchRaw ?? '').trim();
    if (!search) return [];

    const [matchingProjects, matchingPropTypeProjects, matchingSources] =
      await Promise.all([
        this.db()
          .project.findMany({
            where: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
                { developer: { contains: search, mode: 'insensitive' } },
              ],
            },
            select: { id: true },
            take: 200,
          })
          .catch(() => []),
        this.db()
          .project.findMany({
            where: {
              propertyType: { contains: search, mode: 'insensitive' },
            },
            select: { id: true },
            take: 200,
          })
          .catch(() => []),
        this.db()
          .leadMasterValue.findMany({
            where: {
              name: { contains: search, mode: 'insensitive' },
            },
            select: { id: true },
            take: 200,
          })
          .catch(() => []),
      ]);

    const matchedProjIds = matchingProjects.map((p: Body) => p.id);
    const matchedPropTypeProjIds = matchingPropTypeProjects.map(
      (p: Body) => p.id,
    );
    const matchedSourceIds = canViewSource
      ? matchingSources.map((s: Body) => s.id)
      : [];

    const conditions: Prisma.LeadWhereInput[] = [
      { name: { contains: search, mode: 'insensitive' } },
      { mobile: { contains: search, mode: 'insensitive' } },
      { alternateMobile: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { displayId: { contains: search, mode: 'insensitive' } },
      { heardAboutUs: { contains: search, mode: 'insensitive' } },
      {
        requirement: {
          is: {
            propertyType: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        requirement: {
          is: {
            preferredLocation: { contains: search, mode: 'insensitive' },
          },
        },
      },
      {
        requirement: {
          is: {
            configuration: { contains: search, mode: 'insensitive' },
          },
        },
      },
      ...(matchedSourceIds.length > 0
        ? [{ sourceId: { in: matchedSourceIds } }]
        : []),
      ...(matchedProjIds.length > 0
        ? [
            {
              requirement: {
                is: {
                  preferredProjectId: { in: matchedProjIds },
                },
              },
            },
            {
              projectInterests: {
                some: {
                  projectId: { in: matchedProjIds },
                },
              },
            },
            {
              siteVisits: {
                some: {
                  projectId: { in: matchedProjIds },
                },
              },
            },
            {
              bookings: {
                some: {
                  projectId: { in: matchedProjIds },
                },
              },
            },
          ]
        : []),
      ...(matchedPropTypeProjIds.length > 0
        ? [
            {
              requirement: {
                is: {
                  preferredProjectId: { in: matchedPropTypeProjIds },
                },
              },
            },
            {
              projectInterests: {
                some: {
                  projectId: { in: matchedPropTypeProjIds },
                },
              },
            },
          ]
        : []),
    ];

    return conditions;
  }

  async listLeads(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const activeTenantId =
      this.tenantAccess.selectedOrganizationId ||
      this.tenantContext.getTenantId();
    const where: Body = {
      deletedAt: null,
      ...(activeTenantId ? { organizationId: activeTenantId } : {}),
    };
    const segment = String(query.segment ?? '').toLowerCase();
    const ownerIds = parseMultiQueryValues(query.ownerId);
    const managerIds = parseMultiQueryValues(query.managerId);
    const telecallerIds = parseMultiQueryValues(query.telecallerId);
    const stageIds = parseMultiQueryValues(query.stageId);
    const statusIds = parseMultiQueryValues(query.statusId);
    const temperatureIds = parseMultiQueryValues(query.temperatureId);
    const sourceIds = parseMultiQueryValues(query.sourceId);
    const integrationConnectionIds = parseMultiQueryValues(
      query.integrationConnectionId,
    );
    const columnPreference = await this.getLeadListColumnPreference({}, user);
    const canViewSourceColumn =
      columnPreference.visibleColumns.includes('source');
    const propertyTypes = parseMultiQueryValues(query.propertyType);
    const configurations = parseMultiQueryValues(query.configuration);
    const teamIds = parseMultiQueryValues(query.teamId);
    const areaFilters = parseMultiQueryValues(query.area);
    const projectFilterIds = parseMultiQueryValues(
      query.projectId ?? query['projectId[]'],
    );
    if (query.search) {
      const searchConditions = await this.buildLeadSearchConditions(
        query.search,
        canViewSourceColumn,
      );
      if (searchConditions.length) {
        where.AND = [...(where.AND ?? []), { OR: searchConditions }];
      }
    }
    if (ownerIds.length) {
      where.AND = [
        ...(where.AND ?? []),
        this.leadVisibility.assignmentScope(ownerIds, {
          includeSiteVisits: false,
        }),
      ];
    }
    if (managerIds.length) where.managerId = { in: managerIds };
    if (telecallerIds.length) where.telecallerId = { in: telecallerIds };
    if (stageIds.length) where.stageId = { in: stageIds };
    if (statusIds.length) where.statusId = { in: statusIds };
    if (temperatureIds.length) where.temperatureId = { in: temperatureIds };
    if (sourceIds.length && canViewSourceColumn) {
      where.sourceId = { in: sourceIds };
    }
    if (integrationConnectionIds.length) {
      where.integrationConnectionId = { in: integrationConnectionIds };
    }
    const reqFilterConditions = await this.buildProjectAndRequirementWhere(
      projectFilterIds,
      propertyTypes,
      configurations,
    );
    if (reqFilterConditions.length) {
      where.AND = [...(where.AND ?? []), ...reqFilterConditions];
    }
    if (teamIds.length) {
      const teams = await this.db().team.findMany({
        where: { id: { in: teamIds } },
        include: { members: { select: { userId: true } } },
      });
      const teamUserIds = Array.from(
        new Set(
          teams.flatMap((team: Body) => [
            team.leaderId,
            ...(team.members ?? []).map((member: Body) => member.userId),
          ]),
        ),
      ).filter(Boolean);
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { ownerId: { in: teamUserIds } },
            { managerId: { in: teamUserIds } },
            { telecallerId: { in: teamUserIds } },
            { fieldExecutiveId: { in: teamUserIds } },
          ],
        },
      ];
    }
    if (areaFilters.length) {
      const matchingProjects = await this.db().project.findMany({
        where: {
          OR: areaFilters.map((area) => ({
            location: { contains: area, mode: 'insensitive' },
          })),
        },
        select: { id: true },
        take: 500,
      });
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: areaFilters.flatMap((area) => [
            {
              requirement: {
                is: {
                  preferredLocation: { contains: area, mode: 'insensitive' },
                },
              },
            },
            {
              requirement: {
                is: {
                  preferredProjectId: {
                    in: matchingProjects.map((project: Body) => project.id),
                  },
                },
              },
            },
          ]),
        },
      ];
    }
    const userAssignmentScope =
      await this.leadVisibility.resolveAssignmentScope(user);
    if (userAssignmentScope) {
      where.AND = [...(where.AND ?? []), userAssignmentScope];
    }
    if (query.from || query.to) {
      where.createdAt = {};
      const from = normalizeDate(query.from);
      const to = normalizeDate(query.to);
      if (from) where.createdAt.gte = startOfDay(from);
      // A date picker emits date-only values, so include every lead on the end date.
      if (to) where.createdAt.lte = endOfDay(to);
    }

    if (segment === 'lost') {
      const lostStatuses = await this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'LOST', mode: 'insensitive' } },
            { name: { contains: 'LOST', mode: 'insensitive' } },
            { name: { contains: 'NOT INTERESTED', mode: 'insensitive' } },
            { name: { contains: 'UNINTERESTED', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { lostAt: { not: null } },
            { statusId: { in: lostStatuses.map((status) => status.id) } },
            { stageId: { in: lostStatuses.map((status) => status.id) } },
          ],
        },
      ];
    }

    if (segment === 'hot') {
      const priorityValues = await this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'HIGH', mode: 'insensitive' } },
            { code: { contains: 'URGENT', mode: 'insensitive' } },
            { code: { contains: 'HOT', mode: 'insensitive' } },
            { name: { contains: 'HIGH', mode: 'insensitive' } },
            { name: { contains: 'URGENT', mode: 'insensitive' } },
            { name: { contains: 'HOT', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            {
              priorityId: { in: priorityValues.map((priority) => priority.id) },
            },
            {
              temperatureId: {
                in: priorityValues.map((priority) => priority.id),
              },
            },
            {
              statusId: {
                in: priorityValues.map((priority) => priority.id),
              },
            },
            {
              stageId: {
                in: priorityValues.map((priority) => priority.id),
              },
            },
            { interestLevel: { contains: 'high', mode: 'insensitive' } },
            { interestLevel: { contains: 'hot', mode: 'insensitive' } },
          ],
        },
        { lostAt: null },
      ];
    }

    if (segment === 'cold') {
      const days = Math.max(Number(query.inactivityDays) || 7, 1);
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.AND = [
        ...(where.AND ?? []),
        { activities: { none: { occurredAt: { gte: cutoff } } } },
        {
          OR: [
            { lastContactedAt: { lte: cutoff } },
            { lastContactedAt: null, updatedAt: { lte: cutoff } },
          ],
        },
        { lostAt: null },
      ];
    }

    if (segment === 'new') {
      const newMasters = await this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'NEW', mode: 'insensitive' } },
            { name: { contains: 'NEW', mode: 'insensitive' } },
            { code: { contains: 'FRESH', mode: 'insensitive' } },
            { name: { contains: 'FRESH', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { statusId: null },
            { statusId: { in: newMasters.map((m) => m.id) } },
            { stageId: { in: newMasters.map((m) => m.id) } },
          ],
        },
        { lostAt: null },
      ];
    }

    if (segment === 'interested') {
      const interestedMasters = await this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'INTERESTED', mode: 'insensitive' } },
            { name: { contains: 'INTERESTED', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { statusId: { in: interestedMasters.map((m) => m.id) } },
            { stageId: { in: interestedMasters.map((m) => m.id) } },
            { interestLevel: { contains: 'interested', mode: 'insensitive' } },
          ],
        },
        { lostAt: null },
      ];
    }

    if (segment === 'follow-up') {
      const followUpMasters = await this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'FOLLOW', mode: 'insensitive' } },
            { name: { contains: 'FOLLOW', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { nextFollowUpAt: { not: null } },
            { statusId: { in: followUpMasters.map((m) => m.id) } },
            { stageId: { in: followUpMasters.map((m) => m.id) } },
          ],
        },
        { lostAt: null },
      ];
    }

    if (segment === 'site-visit') {
      const siteVisitMasters = await this.db().leadMasterValue.findMany({
        where: {
          categoryRef: { code: { equals: 'status', mode: 'insensitive' } },
          isActive: true,
          OR: [
            { code: { equals: 'SITE_VISIT_SCHEDULE', mode: 'insensitive' } },
            { name: { equals: 'Site Visit Schedule', mode: 'insensitive' } },
            { name: { equals: 'Site Visit Scheduled', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        { statusId: { in: siteVisitMasters.map((master) => master.id) } },
        { lostAt: null },
      ];
    }

    if (segment === 'site-visit-completed') {
      const completedMasters = await this.db().leadMasterValue.findMany({
        where: {
          categoryRef: { code: { equals: 'status', mode: 'insensitive' } },
          isActive: true,
          OR: [
            { code: { equals: 'SITE_VISIT_DONE', mode: 'insensitive' } },
            { code: { equals: 'SITE_VISIT_COMPLETED', mode: 'insensitive' } },
            { name: { equals: 'Site Visit Done', mode: 'insensitive' } },
            { name: { equals: 'Site Visit Completed', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        { statusId: { in: completedMasters.map((master) => master.id) } },
        { lostAt: null },
      ];
    }

    if (segment === 'revisit-completed') {
      const revisitMasters = await this.db().leadMasterValue.findMany({
        where: {
          categoryRef: { code: { equals: 'status', mode: 'insensitive' } },
          isActive: true,
          OR: [
            { code: { equals: 'RE_VISIT_DONE', mode: 'insensitive' } },
            { code: { equals: 'REVISIT_DONE', mode: 'insensitive' } },
            { name: { equals: 'Re-Visit Done', mode: 'insensitive' } },
            { name: { equals: 'Revisit Done', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        { statusId: { in: revisitMasters.map((master) => master.id) } },
        { lostAt: null },
      ];
    }

    if (segment === 'booked') {
      const bookedMasters = await this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'BOOKED', mode: 'insensitive' } },
            { name: { contains: 'BOOKED', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { bookings: { some: {} } },
            { statusId: { in: bookedMasters.map((m) => m.id) } },
            { stageId: { in: bookedMasters.map((m) => m.id) } },
          ],
        },
        { lostAt: null },
      ];
    }

    const [items, total] = await Promise.all([
      this.db().lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: {
          requirement: true,
          integrationConnection: {
            select: { id: true, name: true, provider: true },
          },
        },
      }),
      this.db().lead.count({ where }),
    ]);
    return this.mapLeadListResponse(items, page, limit, total, {
      canViewSource: canViewSourceColumn,
    });
  }

  private async mapLeadListResponse(
    items: Body[],
    page: number,
    limit: number,
    total: number,
    options: { canViewSource?: boolean } = {},
  ) {
    const canViewSource = options.canViewSource !== false;
    const masterIds = Array.from(
      new Set(
        items.flatMap((lead: Body) => [
          canViewSource ? lead.sourceId : undefined,
          lead.stageId,
          lead.statusId,
          lead.priorityId,
          lead.temperatureId,
        ]),
      ),
    ).filter(Boolean) as string[];
    const projectIds = Array.from(
      new Set(
        items
          .map((lead: Body) => lead.requirement?.preferredProjectId)
          .filter(Boolean),
      ),
    ) as string[];
    const userIds = Array.from(
      new Set(
        items.flatMap((lead: Body) => [
          lead.ownerId,
          lead.managerId,
          lead.telecallerId,
          lead.fieldExecutiveId,
        ]),
      ),
    ).filter(Boolean) as string[];
    const [masterValues, users, projects, scoreMasters] = await Promise.all([
      masterIds.length
        ? this.db().leadMasterValue.findMany({
            where: { id: { in: masterIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? this.db().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, email: true },
          })
        : Promise.resolve([]),
      projectIds.length
        ? this.db().project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true, location: true },
          })
        : Promise.resolve([]),
      this.leadScoreMasterValues(),
    ]);
    const masterMap = new Map<string, string>(
      masterValues.map((value: Body) => [String(value.id), String(value.name)]),
    );
    const userMap = new Map(
      users.map((value: Body) => [value.id, value.fullName ?? value.email]),
    );
    const projectMap = new Map<string, Body>(
      projects.map((project: Body) => [project.id, project]),
    );
    const data = items.map((lead: Body) => {
      const prefProjectId = lead.requirement?.preferredProjectId ?? null;
      const matchedProj = prefProjectId ? projectMap.get(prefProjectId) : null;
      const resolvedProjName =
        matchedProj?.name ?? lead.requirement?.preferredLocation ?? null;

      return {
        ...lead,
        projectId: prefProjectId,
        preferredProjectId: prefProjectId,
        projectName: resolvedProjName,
        projectArea:
          matchedProj?.location ?? lead.requirement?.preferredLocation ?? null,
        project: matchedProj
          ? {
              id: matchedProj.id,
              name: matchedProj.name,
              location: matchedProj.location,
            }
          : resolvedProjName,
        sourceId: canViewSource ? lead.sourceId : null,
        sourceName:
          canViewSource && lead.sourceId
            ? masterMap.get(lead.sourceId)
            : undefined,
        integrationConnectionId: lead.integrationConnectionId ?? null,
        integrationAccountName:
          lead.integrationConnection?.name ?? 'Legacy / unattributed',
        integrationProvider: lead.integrationConnection?.provider ?? null,
        stageName: lead.stageId ? masterMap.get(lead.stageId) : undefined,
        statusName: lead.statusId ? masterMap.get(lead.statusId) : undefined,
        priorityName: lead.priorityId
          ? masterMap.get(lead.priorityId)
          : undefined,
        temperatureName: lead.temperatureId
          ? masterMap.get(lead.temperatureId)
          : undefined,
        leadType: deriveLeadType(
          lead.temperatureId
            ? masterMap.get(lead.temperatureId)
            : masterMap.get(lead.priorityId),
        ),
        ...buildLeadScore(lead, scoreMasters, masterMap),
        ownerName: lead.ownerId ? userMap.get(lead.ownerId) : undefined,
        managerName: lead.managerId ? userMap.get(lead.managerId) : undefined,
        telecallerName: lead.telecallerId
          ? userMap.get(lead.telecallerId)
          : undefined,
        fieldExecutiveName: lead.fieldExecutiveId
          ? userMap.get(lead.fieldExecutiveId)
          : undefined,
        ...(lead.activities
          ? {
              activities: lead.activities.map(
                (activity: { type?: unknown; metadata?: unknown }) =>
                  leadActivitySourceVisibility(activity, canViewSource),
              ),
            }
          : {}),
        ...leadSourceVisibilityFields(canViewSource),
      };
    });

    return { data, meta: { page, limit, total } };
  }

  private teamLeadAssignmentScope(userIds: string[]): Prisma.LeadWhereInput {
    if (!userIds.length) return { id: { in: [] } };
    return this.leadVisibility.assignmentScope(userIds);
  }

  private async buildTeamLeadWorkspaceWhere(
    query: Query,
    userIds: string[],
    canViewSource = true,
  ): Promise<Prisma.LeadWhereInput> {
    const activeTenantId = this.tenantAccess.selectedOrganizationId;
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...(activeTenantId ? { organizationId: activeTenantId } : {}),
      AND: [this.teamLeadAssignmentScope(userIds)],
    };
    const sourceIds = parseMultiQueryValues(query.sourceId);
    const integrationConnectionIds = parseMultiQueryValues(
      query.integrationConnectionId,
    );
    const statusIds = parseMultiQueryValues(query.statusId);
    const stageIds = parseMultiQueryValues(query.stageId);
    const temperatureIds = parseMultiQueryValues(query.temperatureId);
    const propertyTypes = parseMultiQueryValues(query.propertyType);
    const configurations = parseMultiQueryValues(query.configuration);
    const ownerIds = parseMultiQueryValues(query.ownerId);
    const telecallerIds = parseMultiQueryValues(query.telecallerId);
    const areaFilters = parseMultiQueryValues(query.area);
    const projectFilterIds = parseMultiQueryValues(
      query.projectId ?? query['projectId[]'],
    );

    if (query.search) {
      const searchConditions = await this.buildLeadSearchConditions(
        query.search,
        canViewSource,
      );
      if (searchConditions.length) {
        where.AND = [
          ...((where.AND as Prisma.LeadWhereInput[]) ?? []),
          { OR: searchConditions },
        ];
      }
    }
    if (sourceIds.length) where.sourceId = { in: sourceIds };
    if (integrationConnectionIds.length) {
      where.integrationConnectionId = { in: integrationConnectionIds };
    }
    if (statusIds.length) where.statusId = { in: statusIds };
    if (stageIds.length) where.stageId = { in: stageIds };
    if (temperatureIds.length) where.temperatureId = { in: temperatureIds };
    if (ownerIds.length) where.ownerId = { in: ownerIds };
    if (telecallerIds.length) where.telecallerId = { in: telecallerIds };
    const reqFilterConditions = await this.buildProjectAndRequirementWhere(
      projectFilterIds,
      propertyTypes,
      configurations,
    );
    if (reqFilterConditions.length) {
      where.AND = [
        ...((where.AND as Prisma.LeadWhereInput[]) ?? []),
        ...reqFilterConditions,
      ];
    }
    if (areaFilters.length) {
      where.AND = [
        ...((where.AND as Prisma.LeadWhereInput[]) ?? []),
        {
          OR: areaFilters.map((area) => ({
            requirement: {
              is: {
                preferredLocation: { contains: area, mode: 'insensitive' },
              },
            },
          })),
        },
      ];
    }
    if (query.from || query.to) {
      where.createdAt = {};
      const from = normalizeDate(query.from);
      const to = normalizeDate(query.to);
      if (from) where.createdAt.gte = startOfDay(from);
      if (to) where.createdAt.lte = endOfDay(to);
    }

    return where;
  }

  async getTeamLeadWorkspace(query: Query, user?: Body) {
    if (!user?.sub) throw new ForbiddenException('Missing authenticated user');
    const canViewSource = await this.canViewLeadSource(user);
    if (!canViewSource) query = { ...query, sourceId: undefined };
    const { page, limit, skip } = pageMeta(query);
    const requestedScope = String(query.scope ?? 'team').toLowerCase();
    const leaderTeam = await this.db().team.findFirst({
      where: { leaderId: user.sub, isActive: true },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                avatarStorageKey: true,
              },
            },
          },
        },
      },
    });
    const managerReports =
      String(user.role ?? '') === 'MANAGER'
        ? await this.db().employeeProfile.findMany({
            where: { reportingToId: user.sub, user: { isActive: true } },
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  role: true,
                  avatarStorageKey: true,
                },
              },
            },
          })
        : [];
    const reportMembers = managerReports
      .map((profile: Body) => profile.user)
      .filter((member: Body | null | undefined): member is Body =>
        Boolean(member?.id),
      );
    const hierarchyScopeUserIds =
      (await this.leadVisibility.resolveAssignmentScopeUserIds(user)) ?? [
        user.sub,
      ];
    const canViewTeamWorkspace =
      Boolean(leaderTeam) ||
      reportMembers.length > 0 ||
      hierarchyScopeUserIds.length > 1;
    if (requestedScope === 'mine') {
      const ownWhere = await this.buildTeamLeadWorkspaceWhere(
        query,
        [user.sub],
        canViewSource,
      );
      const [ownItems, ownTotal] = await Promise.all([
        this.db().lead.findMany({
          where: ownWhere,
          skip,
          take: limit,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          include: { requirement: true },
        }),
        this.db().lead.count({ where: ownWhere }),
      ]);
      const ownLeads = await this.mapLeadListResponse(
        ownItems,
        page,
        limit,
        ownTotal,
        { canViewSource },
      );
      return {
        meta: {
          scope: 'mine',
          canViewTeam: canViewTeamWorkspace,
          canEdit: false,
          teamId: leaderTeam?.id ?? null,
          teamName:
            leaderTeam?.name ??
            (reportMembers.length ? 'Direct reports' : null),
          page,
          limit,
          total: ownLeads.meta.total,
        },
        summary: {
          totalTeamLeads: 0,
          newLeads: 0,
          hotLeads: 0,
          pendingFollowUps: 0,
          overdueFollowUps: 0,
          scheduledSiteVisits: 0,
          completedSiteVisits: 0,
          bookedLeads: 0,
        },
        members: [],
        rows: ownLeads.data,
      };
    }
    if (!canViewTeamWorkspace) {
      throw new ForbiddenException(
        'You do not have access to scoped team leads',
      );
    }

    const teamMembers = leaderTeam
      ? (leaderTeam.members ?? [])
          .map((member: Body) => member.user)
          .filter((member: Body | null | undefined): member is Body =>
            Boolean(member?.id),
          )
      : reportMembers;
    const teamMemberIds = teamMembers.map((member: Body) => String(member.id));
    const scopedMemberIds = Array.from(
      new Set([...teamMemberIds, ...hierarchyScopeUserIds]),
    );
    const requestedMemberId =
      typeof query.memberId === 'string' && query.memberId.trim()
        ? query.memberId.trim()
        : null;
    if (requestedMemberId && !scopedMemberIds.includes(requestedMemberId)) {
      throw new ForbiddenException(
        'You do not have access to this team member',
      );
    }
    const visibleUserIds = requestedMemberId
      ? [requestedMemberId]
      : scopedMemberIds;
    const where = await this.buildTeamLeadWorkspaceWhere(
      query,
      visibleUserIds,
      canViewSource,
    );
    const memberSummaryWhere = await this.buildTeamLeadWorkspaceWhere(
      { ...query, memberId: undefined },
      scopedMemberIds,
      canViewSource,
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const [priorityValues, bookedValues] = await Promise.all([
      this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'HIGH', mode: 'insensitive' } },
            { code: { contains: 'URGENT', mode: 'insensitive' } },
            { name: { contains: 'HIGH', mode: 'insensitive' } },
            { name: { contains: 'URGENT', mode: 'insensitive' } },
            { name: { contains: 'HOT', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
      this.db().leadMasterValue.findMany({
        where: {
          OR: [
            { code: { contains: 'BOOK', mode: 'insensitive' } },
            { code: { contains: 'WON', mode: 'insensitive' } },
            { code: { contains: 'CONVERT', mode: 'insensitive' } },
            { name: { contains: 'BOOK', mode: 'insensitive' } },
            { name: { contains: 'WON', mode: 'insensitive' } },
            { name: { contains: 'CONVERT', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      }),
    ]);
    const priorityIds = priorityValues.map((value) => value.id);
    const bookedIds = bookedValues.map((value) => value.id);
    const hotWhere: Prisma.LeadWhereInput = {
      AND: [
        where,
        {
          OR: [
            { priorityId: { in: priorityIds } },
            { temperatureId: { in: priorityIds } },
            { interestLevel: { contains: 'high', mode: 'insensitive' } },
          ],
        },
      ],
    };
    const bookedWhere: Prisma.LeadWhereInput = {
      AND: [
        where,
        {
          OR: [
            { statusId: { in: bookedIds } },
            { stageId: { in: bookedIds } },
            { convertedAt: { not: null } },
            { bookings: { some: { status: 'Booked' } } },
          ],
        },
      ],
    };

    const [
      items,
      total,
      totalTeamLeads,
      newLeads,
      hotLeads,
      pendingFollowUps,
      overdueFollowUps,
      scheduledSiteVisits,
      completedSiteVisits,
      bookedLeads,
      memberLeadRows,
      memberFollowUps,
      memberSiteVisits,
    ] = await Promise.all([
      this.db().lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        include: { requirement: true },
      }),
      this.db().lead.count({ where }),
      this.db().lead.count({ where }),
      this.db().lead.count({
        where: { AND: [where, { createdAt: { gte: todayStart } }] },
      }),
      this.db().lead.count({ where: hotWhere }),
      this.db().followUp.count({
        where: { assignedToId: { in: visibleUserIds }, completedAt: null },
      }),
      this.db().followUp.count({
        where: {
          assignedToId: { in: visibleUserIds },
          completedAt: null,
          scheduledAt: { lt: todayStart },
        },
      }),
      this.db().siteVisit.count({
        where: { assignedExecutiveId: { in: visibleUserIds } },
      }),
      this.db().siteVisit.count({
        where: {
          assignedExecutiveId: { in: visibleUserIds },
          OR: [{ status: 'Completed' }, { checkedOutAt: { not: null } }],
        },
      }),
      this.db().lead.count({ where: bookedWhere }),
      this.db().lead.findMany({
        where: memberSummaryWhere,
        select: {
          id: true,
          ownerId: true,
          managerId: true,
          telecallerId: true,
          fieldExecutiveId: true,
          priorityId: true,
          temperatureId: true,
          statusId: true,
          stageId: true,
          convertedAt: true,
          bookings: { select: { status: true } },
        },
      }),
      this.db().followUp.findMany({
        where: { assignedToId: { in: teamMemberIds }, completedAt: null },
        select: { assignedToId: true, scheduledAt: true },
      }),
      this.db().siteVisit.findMany({
        where: { assignedExecutiveId: { in: teamMemberIds } },
        select: {
          assignedExecutiveId: true,
          status: true,
          checkedOutAt: true,
        },
      }),
    ]);

    const formatted = await this.mapLeadListResponse(
      items,
      page,
      limit,
      total,
      {
        canViewSource,
      },
    );
    const priorityIdSet = new Set(priorityIds);
    const bookedIdSet = new Set(bookedIds);
    const members = teamMembers.map((member: Body) => {
      const memberId = String(member.id);
      const memberLeads = memberLeadRows.filter((lead: Body) =>
        [
          lead.ownerId,
          lead.managerId,
          lead.telecallerId,
          lead.fieldExecutiveId,
        ].includes(memberId),
      );
      const memberPendingFollowUps = memberFollowUps.filter(
        (followUp: Body) => followUp.assignedToId === memberId,
      );
      const memberVisits = memberSiteVisits.filter(
        (visit: Body) => visit.assignedExecutiveId === memberId,
      );
      return {
        id: memberId,
        name: member.fullName ?? member.email ?? 'Employee',
        role: member.role,
        image: member.avatarStorageKey ?? null,
        assignedLeads: memberLeads.length,
        hotLeads: memberLeads.filter(
          (lead: Body) =>
            priorityIdSet.has(String(lead.priorityId)) ||
            priorityIdSet.has(String(lead.temperatureId)),
        ).length,
        pendingFollowUps: memberPendingFollowUps.length,
        overdueFollowUps: memberPendingFollowUps.filter(
          (followUp: Body) => new Date(followUp.scheduledAt) < todayStart,
        ).length,
        siteVisits: memberVisits.length,
        completedSiteVisits: memberVisits.filter(
          (visit: Body) =>
            visit.status === 'Completed' || Boolean(visit.checkedOutAt),
        ).length,
        bookedLeads: memberLeads.filter(
          (lead: Body) =>
            bookedIdSet.has(String(lead.statusId)) ||
            bookedIdSet.has(String(lead.stageId)) ||
            Boolean(lead.convertedAt) ||
            (lead.bookings ?? []).some(
              (booking: Body) => booking.status === 'Booked',
            ),
        ).length,
      };
    });

    return {
      meta: {
        scope: 'team',
        canViewTeam: true,
        canEdit: false,
        teamId: leaderTeam?.id ?? null,
        teamName: leaderTeam?.name ?? 'Direct reports',
        page,
        limit,
        total,
      },
      summary: {
        totalTeamLeads,
        newLeads,
        hotLeads,
        pendingFollowUps,
        overdueFollowUps,
        scheduledSiteVisits,
        completedSiteVisits,
        bookedLeads,
      },
      members,
      rows: formatted.data,
    };
  }

  async listDeletedLeads(query: Query) {
    const { page, limit, skip } = pageMeta(query);
    const where: Body = { deletedAt: { not: null } };
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { mobile: { contains: String(query.search), mode: 'insensitive' } },
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { displayId: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }
    if (query.from || query.to) {
      where.deletedAt = { not: null };
      const from = normalizeDate(query.from);
      const to = normalizeDate(query.to);
      if (from) where.deletedAt.gte = startOfDay(from);
      if (to) where.deletedAt.lte = endOfDay(to);
    }

    const [items, total] = await Promise.all([
      this.db().lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { deletedAt: 'desc' },
        include: { requirement: true },
      }),
      this.db().lead.count({ where }),
    ]);

    const userIds = Array.from(
      new Set(
        items.flatMap((lead: Body) => [
          lead.deletedById,
          lead.ownerId,
          lead.managerId,
          lead.telecallerId,
          lead.fieldExecutiveId,
        ]),
      ),
    ).filter(Boolean) as string[];
    const masterIds = Array.from(
      new Set(
        items.flatMap((lead: Body) => [
          lead.sourceId,
          lead.stageId,
          lead.statusId,
          lead.priorityId,
          lead.temperatureId,
        ]),
      ),
    ).filter(Boolean) as string[];
    const projectIds = Array.from(
      new Set(
        items
          .map((lead: Body) => lead.requirement?.preferredProjectId)
          .filter(Boolean),
      ),
    ) as string[];
    const [users, masterValues, projects] = await Promise.all([
      userIds.length
        ? this.db().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, email: true, role: true },
          })
        : Promise.resolve([]),
      masterIds.length
        ? this.db().leadMasterValue.findMany({
            where: { id: { in: masterIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      projectIds.length
        ? this.db().project.findMany({
            where: { id: { in: projectIds } },
            select: { id: true, name: true, location: true },
          })
        : Promise.resolve([]),
    ]);
    const userMap = new Map(
      users.map((user: Body) => [user.id, user.fullName ?? user.email]),
    );
    const masterMap = new Map<string, string>(
      masterValues.map((value: Body) => [String(value.id), String(value.name)]),
    );
    const projectMap = new Map<string, Body>(
      projects.map((project: Body) => [project.id, project]),
    );

    return {
      data: items.map((lead: Body) => ({
        id: lead.id,
        displayId: lead.displayId,
        name: lead.name,
        mobile: `${lead.mobileCountryCode ?? '+91'} ${lead.mobile}`,
        email: lead.email,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
        sourceId: lead.sourceId,
        sourceName: lead.sourceId ? masterMap.get(lead.sourceId) : undefined,
        stageId: lead.stageId,
        stageName: lead.stageId ? masterMap.get(lead.stageId) : undefined,
        statusId: lead.statusId,
        statusName: lead.statusId ? masterMap.get(lead.statusId) : undefined,
        temperatureId: lead.temperatureId,
        temperatureName: lead.temperatureId
          ? masterMap.get(lead.temperatureId)
          : undefined,
        leadType: deriveLeadType(
          lead.temperatureId
            ? masterMap.get(lead.temperatureId)
            : masterMap.get(lead.priorityId),
        ),
        nextFollowUpAt: lead.nextFollowUpAt,
        remarks: lead.remarks,
        requirement: [
          lead.requirement?.configuration,
          lead.requirement?.propertyType,
        ]
          .filter(Boolean)
          .join(' '),
        projectName: lead.requirement?.preferredProjectId
          ? projectMap.get(lead.requirement.preferredProjectId)?.name ??
            lead.requirement?.preferredLocation ??
            null
          : lead.requirement?.preferredLocation ?? null,
        projectArea: lead.requirement?.preferredProjectId
          ? projectMap.get(lead.requirement.preferredProjectId)?.location ??
            lead.requirement?.preferredLocation ??
            null
          : lead.requirement?.preferredLocation ?? null,
        projectId: lead.requirement?.preferredProjectId ?? null,
        preferredProjectId: lead.requirement?.preferredProjectId ?? null,
        project: lead.requirement?.preferredProjectId
          ? {
              id: lead.requirement.preferredProjectId,
              name:
                projectMap.get(lead.requirement.preferredProjectId)?.name ??
                null,
              location:
                projectMap.get(lead.requirement.preferredProjectId)?.location ??
                null,
            }
          : lead.requirement?.preferredLocation ?? null,
        deletedAt: lead.deletedAt,
        deletedById: lead.deletedById,
        deletedByName: lead.deletedById
          ? userMap.get(lead.deletedById)
          : undefined,
        deleteReason: lead.deleteReason,
        ownerName: lead.ownerId ? userMap.get(lead.ownerId) : undefined,
        managerName: lead.managerId ? userMap.get(lead.managerId) : undefined,
        telecallerName: lead.telecallerId
          ? userMap.get(lead.telecallerId)
          : undefined,
        fieldExecutiveName: lead.fieldExecutiveId
          ? userMap.get(lead.fieldExecutiveId)
          : undefined,
        assignedTo:
          (lead.telecallerId ? userMap.get(lead.telecallerId) : undefined) ??
          (lead.fieldExecutiveId
            ? userMap.get(lead.fieldExecutiveId)
            : undefined) ??
          (lead.ownerId ? userMap.get(lead.ownerId) : undefined) ??
          'Unassigned',
      })),
      meta: { page, limit, total },
    };
  }

  async softDeleteLead(id: string, body: Body = {}, actorUserId?: string) {
    const lead = await this.db().lead.findFirst({
      where: { OR: [{ id }, { displayId: id }], deletedAt: null },
      select: { id: true, displayId: true, name: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    const deleted = await this.db().lead.update({
      where: { id: lead.id },
      data: {
        deletedAt: new Date(),
        deletedById: actorUserId,
        deleteReason: body.reason ? String(body.reason) : null,
      },
    });
    await Promise.all([
      this.audit(actorUserId, 'LEAD_SOFT_DELETED', 'Lead', lead.id, {
        reason: body.reason,
      }),
      this.db().activity.create({
        data: {
          leadId: lead.id,
          actorId: actorUserId,
          type: 'LEAD_SOFT_DELETED',
          title: 'Lead deleted',
          description: body.reason
            ? String(body.reason)
            : 'Lead moved to deleted leads.',
        },
      }),
    ]).catch(() => undefined);
    return { deleted: true, lead: deleted };
  }

  async restoreLead(id: string, actorUserId?: string) {
    const lead = await this.db().lead.findFirst({
      where: { OR: [{ id }, { displayId: id }], deletedAt: { not: null } },
      select: { id: true },
    });
    if (!lead) throw new NotFoundException('Deleted lead not found');
    const restored = await this.db().lead.update({
      where: { id: lead.id },
      data: {
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
      },
    });
    await Promise.all([
      this.audit(actorUserId, 'LEAD_RESTORED', 'Lead', lead.id),
      this.db().activity.create({
        data: {
          leadId: lead.id,
          actorId: actorUserId,
          type: 'LEAD_RESTORED',
          title: 'Lead restored',
          description: 'Lead restored from deleted leads.',
        },
      }),
    ]).catch(() => undefined);
    return { restored: true, lead: restored };
  }

  async permanentlyDeleteLead(id: string, actorUserId?: string) {
    const lead = await this.db().lead.findFirst({
      where: { OR: [{ id }, { displayId: id }], deletedAt: { not: null } },
      select: { id: true, displayId: true, name: true },
    });
    if (!lead) throw new NotFoundException('Deleted lead not found');

    await this.audit(actorUserId, 'LEAD_PERMANENTLY_DELETED', 'Lead', lead.id, {
      displayId: lead.displayId,
      name: lead.name,
    }).catch(() => undefined);

    await this.db().$transaction(async (tx) => {
      await tx.autoAssignmentEvent.deleteMany({ where: { leadId: lead.id } });
      await tx.duplicateLeadGroup.deleteMany({
        where: {
          OR: [{ existingLeadId: lead.id }, { duplicateLeadId: lead.id }],
        },
      });
      await tx.notification.deleteMany({
        where: {
          entityType: 'Lead',
          OR: [{ entityId: lead.id }, { entityId: lead.displayId }],
        },
      });
      await tx.callLog.updateMany({
        where: { leadId: lead.id },
        data: { leadId: null },
      });
      await tx.payment.deleteMany({ where: { leadId: lead.id } });
      await tx.lead.delete({ where: { id: lead.id } });
    });

    return { deleted: true };
  }

  private async getContactLeadScopedUserIds(user?: Body, query?: Query) {
    const actorId = typeof user?.sub === 'string' ? user.sub : '';
    if (!actorId) {
      return undefined;
    }

    if (query?.scope === 'mine') {
      return [actorId];
    }

    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(user);
    return scopedUserIds ?? undefined;
  }

  private async assertUserWithinLeadScope(
    targetUserId: string,
    actor?: string | Body,
    domain: 'leads' | 'tasks' = 'leads',
  ) {
    if (!targetUserId || !actor || typeof actor === 'string') return;
    const scopedUserIds =
      domain === 'tasks'
        ? await this.taskAssignmentScopeUserIds(actor)
        : await this.leadVisibility.resolveAssignmentScopeUserIds(actor);
    if (scopedUserIds !== null && !scopedUserIds.includes(targetUserId)) {
      throw new ForbiddenException(
        'Selected user is outside your permitted scope',
      );
    }
  }

  private async taskTenantWhere(): Promise<Prisma.TaskWhereInput> {
    const employees = await this.prisma.user.findMany({
      where: this.tenantAccess.employeeWhere(),
      select: { id: true },
    });
    const employeeIds = employees.map((employee) => employee.id);
    return {
      AND: [
        {
          OR: [
            { assignedToId: { in: employeeIds } },
            { assignedToId: null, createdById: { in: employeeIds } },
          ],
        },
        {
          OR: [
            { leadId: null },
            {
              lead: {
                is: {
                  organizationId: this.tenantAccess.organizationId,
                  deletedAt: null,
                },
              },
            },
          ],
        },
      ],
    };
  }

  private async taskAssignmentScopeUserIds(user?: Body) {
    // HR's employee workspace covers employees, not just HR-owned CRM leads.
    // This exception applies only to tasks; linked leads retain their checks.
    if (user?.role === 'HR') return null;
    return this.leadVisibility.resolveAssignmentScopeUserIds(user);
  }

  private async contactLeadTenantWhere(): Promise<Prisma.ContactLeadWhereInput> {
    const employees = await this.prisma.user.findMany({
      where: this.tenantAccess.employeeWhere(),
      select: { id: true },
    });
    const employeeIds = employees.map((employee) => employee.id);
    return {
      OR: [
        { assignedToId: { in: employeeIds } },
        { assignedToId: null, createdById: { in: employeeIds } },
      ],
    };
  }

  private async getVisibleContactLead(id: string, actor?: string | Body) {
    const scopedUserIds =
      actor && typeof actor !== 'string'
        ? await this.leadVisibility.resolveAssignmentScopeUserIds(actor)
        : null;
    const contact = await this.prisma.contactLead.findFirst({
      where: {
        id,
        AND: [await this.contactLeadTenantWhere()],
        ...(scopedUserIds === null
          ? {}
          : { assignedToId: { in: scopedUserIds } }),
      },
    });
    if (!contact) throw new NotFoundException('Contact lead not found');
    return contact;
  }

  private async buildContactLeadsWhere(query: Query, user?: Body) {
    const where: Body = { AND: [await this.contactLeadTenantWhere()] };
    const statusValues = queryValues(query.status);
    const sourceIds = queryValues(query.sourceId);
    const assignedToIds = queryValues(query.assignedToId);
    const preferredProjectIds = queryValues(query.preferredProjectId);
    const teamIds = queryValues(query.teamId);
    const areaValues = queryValues(query.area);
    const configurationValues = queryValues(query.configuration);

    const search = String(query.search ?? '').trim();
    if (search) {
      const [matchedSources, matchedProjects, matchedUsers] = await Promise.all(
        [
          this.db().leadMasterValue.findMany({
            where: {
              isActive: true,
              name: { contains: search, mode: 'insensitive' },
            },
            select: { id: true },
            take: 50,
          }),
          this.db().project.findMany({
            where: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { location: { contains: search, mode: 'insensitive' } },
                { developer: { contains: search, mode: 'insensitive' } },
                { propertyType: { contains: search, mode: 'insensitive' } },
              ],
            },
            select: { id: true },
            take: 50,
          }),
          this.db().user.findMany({
            where: {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
            select: { id: true },
            take: 50,
          }),
        ],
      );
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        ...(matchedSources.length
          ? [{ sourceId: { in: matchedSources.map((item: Body) => item.id) } }]
          : []),
        ...(matchedProjects.length
          ? [
              {
                preferredProjectId: {
                  in: matchedProjects.map((item: Body) => item.id),
                },
              },
            ]
          : []),
        ...(matchedUsers.length
          ? [
              {
                assignedToId: {
                  in: matchedUsers.map((item: Body) => item.id),
                },
              },
            ]
          : []),
      ] satisfies Prisma.ContactLeadWhereInput[];
    }
    if (statusValues.length) {
      where.status =
        statusValues.length === 1 ? statusValues[0] : { in: statusValues };
    } else {
      where.status = { not: 'ARCHIVED' };
    }
    if (sourceIds.length) {
      where.sourceId =
        sourceIds.length === 1 ? sourceIds[0] : { in: sourceIds };
    }

    const scopedUserIds = await this.getContactLeadScopedUserIds(user, query);
    let nextAssignedToIds = assignedToIds;
    if (teamIds.length) {
      const teamUsers = await this.db().user.findMany({
        where: {
          OR: [
            { employeeProfile: { is: { teamId: { in: teamIds } } } },
            { teamMemberships: { some: { teamId: { in: teamIds } } } },
          ],
        },
        select: { id: true },
      });
      const teamUserIds = teamUsers.map((user: Body) => String(user.id));
      nextAssignedToIds = nextAssignedToIds.length
        ? nextAssignedToIds.filter((id) => teamUserIds.includes(id))
        : teamUserIds;
    }
    if (scopedUserIds !== undefined) {
      nextAssignedToIds = nextAssignedToIds.length
        ? nextAssignedToIds.filter((id) => scopedUserIds.includes(id))
        : scopedUserIds;
    }
    if (nextAssignedToIds.length) {
      where.assignedToId =
        nextAssignedToIds.length === 1
          ? nextAssignedToIds[0]
          : { in: nextAssignedToIds };
    } else if (teamIds.length || scopedUserIds !== undefined) {
      where.assignedToId = { in: [] };
    }

    let nextProjectIds = preferredProjectIds;
    if (areaValues.length || configurationValues.length) {
      const projectRows = await this.db().project.findMany({
        select: { id: true, location: true, configurations: true },
      });
      const matchingProjectIds = projectRows
        .filter((project: Body) => {
          const matchesArea =
            !areaValues.length ||
            areaValues.some(
              (area) =>
                String(project.location ?? '').toLowerCase() ===
                area.toLowerCase(),
            );
          const projectConfigurations = asArray(project.configurations).map(
            (item) => String(item).toLowerCase(),
          );
          const matchesConfiguration =
            !configurationValues.length ||
            configurationValues.some((configuration) =>
              projectConfigurations.includes(configuration.toLowerCase()),
            );
          return matchesArea && matchesConfiguration;
        })
        .map((project: Body) => String(project.id));
      nextProjectIds = nextProjectIds.length
        ? nextProjectIds.filter((id) => matchingProjectIds.includes(id))
        : matchingProjectIds;
    }
    if (nextProjectIds.length) {
      where.preferredProjectId =
        nextProjectIds.length === 1
          ? nextProjectIds[0]
          : { in: nextProjectIds };
    } else if (
      preferredProjectIds.length ||
      areaValues.length ||
      configurationValues.length
    ) {
      where.preferredProjectId = { in: [] };
    }
    const dateFrom = normalizeDate(query.dateFrom ?? query.from);
    const dateTo = normalizeDate(query.dateTo ?? query.to);
    if (dateTo) {
      dateTo.setHours(23, 59, 59, 999);
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    return where;
  }

  async getContactLeadStats(query: Query, user?: Body) {
    const baseWhere = await this.buildContactLeadsWhere(query, user);
    const { status: _statusFilter, ...whereWithoutStatus } = baseWhere;

    const hasExplicitStatusFilter = queryValues(query.status).length > 0;
    const baseCondition = hasExplicitStatusFilter
      ? baseWhere
      : { ...whereWithoutStatus, status: { not: 'ARCHIVED' } };

    const [total, cold, interested, notInterested, converted] =
      await Promise.all([
        this.db().contactLead.count({ where: baseCondition }),
        this.db().contactLead.count({
          where: { ...whereWithoutStatus, status: 'COLD' },
        }),
        this.db().contactLead.count({
          where: { ...whereWithoutStatus, status: 'INTERESTED' },
        }),
        this.db().contactLead.count({
          where: { ...whereWithoutStatus, status: 'NOT_INTERESTED' },
        }),
        this.db().contactLead.count({
          where: { ...whereWithoutStatus, status: 'CONVERTED' },
        }),
      ]);

    return {
      data: {
        total,
        cold,
        interested,
        notInterested,
        converted,
      },
    };
  }

  async listContactLeads(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const where = await this.buildContactLeadsWhere(query, user);

    const [items, total] = await Promise.all([
      this.db().contactLead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db().contactLead.count({ where }),
    ]);
    const itemSourceIds = Array.from(
      new Set(items.map((item: Body) => item.sourceId).filter(Boolean)),
    ) as string[];
    const itemProjectIds = Array.from(
      new Set(
        items.map((item: Body) => item.preferredProjectId).filter(Boolean),
      ),
    ) as string[];
    const itemUserIds = Array.from(
      new Set(items.map((item: Body) => item.assignedToId).filter(Boolean)),
    ) as string[];
    const [sources, projects, users] = await Promise.all([
      itemSourceIds.length
        ? this.db().leadMasterValue.findMany({
            where: { id: { in: itemSourceIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      itemProjectIds.length
        ? this.db().project.findMany({
            where: { id: { in: itemProjectIds } },
            select: { id: true, name: true, location: true },
          })
        : Promise.resolve([]),
      itemUserIds.length
        ? this.db().user.findMany({
            where: { id: { in: itemUserIds } },
            select: { id: true, fullName: true, email: true },
          })
        : Promise.resolve([]),
    ]);
    const sourceMap = new Map(
      sources.map((item: Body) => [item.id, item.name]),
    );
    const projectMap = new Map<string, Body>(
      projects.map((item: Body) => [item.id, item]),
    );
    const userMap = new Map(
      users.map((item: Body) => [item.id, item.fullName ?? item.email]),
    );

    return {
      data: items.map((item: Body) => ({
        ...item,
        sourceName: item.sourceId ? sourceMap.get(item.sourceId) : undefined,
        projectName: item.preferredProjectId
          ? projectMap.get(item.preferredProjectId)?.name
          : undefined,
        projectArea: item.preferredProjectId
          ? projectMap.get(item.preferredProjectId)?.location
          : undefined,
        assignedToName: item.assignedToId
          ? userMap.get(item.assignedToId)
          : undefined,
      })),
      meta: { page, limit, total },
    };
  }

  async createContactLead(body: Body, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    if (!body.customerName && !body.name) {
      throw new BadRequestException('Customer name is required');
    }
    if (!body.mobile && !body.mobileNumber) {
      throw new BadRequestException('Mobile number is required');
    }
    const requestedAssignedToId = body.assignedToId ?? body.assignTo;
    const assignedToId = requestedAssignedToId
      ? String(requestedAssignedToId)
      : typeof actor === 'string'
      ? undefined
      : actorUserId;
    if (!assignedToId && actor && typeof actor !== 'string') {
      throw new BadRequestException('Assigned user is required');
    }
    if (assignedToId) {
      await this.tenantAccess.assertEmployee(assignedToId);
      await this.assertUserWithinLeadScope(assignedToId, actor);
    }
    const contact = await this.db().contactLead.create({
      data: {
        sourceId: body.sourceId,
        customerName: body.customerName ?? body.name,
        mobileCountryCode: body.mobileCountryCode ?? '+91',
        mobile: body.mobile ?? body.mobileNumber,
        alternateCountryCode: body.alternateCountryCode,
        alternateMobile: body.alternateMobile,
        email: body.email,
        preferredProjectId: body.preferredProjectId ?? body.preferredProject,
        note: this.getContactLeadNote(body),
        assignedToId,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
    });
    await this.audit(
      actorUserId,
      'CONTACT_LEAD_CREATED',
      'ContactLead',
      contact.id,
    );
    return contact;
  }

  async updateContactLead(id: string, body: Body, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    await this.getVisibleContactLead(id, actor);
    const requestedAssignedToId = body.assignedToId ?? body.assignTo;
    if (requestedAssignedToId !== undefined && requestedAssignedToId !== null) {
      await this.tenantAccess.assertEmployee(String(requestedAssignedToId));
      await this.assertUserWithinLeadScope(
        String(requestedAssignedToId),
        actor,
      );
    }
    const contact = await this.db().contactLead.update({
      where: { id },
      data: {
        sourceId: body.sourceId,
        customerName: body.customerName ?? body.name,
        mobileCountryCode: body.mobileCountryCode,
        mobile: body.mobile ?? body.mobileNumber,
        alternateCountryCode: body.alternateCountryCode,
        alternateMobile: body.alternateMobile,
        email: body.email,
        preferredProjectId: body.preferredProjectId ?? body.preferredProject,
        note: this.getContactLeadNote(body),
        assignedToId: body.assignedToId ?? body.assignTo,
        updatedById: actorUserId,
      },
    });
    await this.audit(
      actorUserId,
      'CONTACT_LEAD_UPDATED',
      'ContactLead',
      id,
      body,
    );
    return contact;
  }

  async markContactLeadInterested(id: string, actor?: string | Body) {
    return this.updateContactLeadStatus(id, 'INTERESTED', actor);
  }

  async markContactLeadNotInterested(id: string, actor?: string | Body) {
    return this.updateContactLeadStatus(id, 'NOT_INTERESTED', actor);
  }

  async deleteContactLead(id: string, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    const contact = await this.getVisibleContactLead(id, actor);

    await this.db().contactLead.delete({ where: { id } });
    await this.audit(
      actorUserId,
      'CONTACT_LEAD_DELETED',
      'ContactLead',
      contact.id,
      { customerName: contact.customerName, mobile: contact.mobile },
    ).catch(() => undefined);
    return { deleted: true };
  }

  private getContactLeadNote(body: Body): string | null | undefined {
    const note = body.note ?? body.notes;
    if (note === undefined) return undefined;
    if (typeof note !== 'string') return undefined;
    return note.trim() || null;
  }

  async archiveContactLead(id: string, actor?: string | Body) {
    return this.updateContactLeadStatus(id, 'ARCHIVED', actor);
  }

  async unarchiveContactLead(id: string, actor?: string | Body) {
    return this.updateContactLeadStatus(id, 'COLD', actor);
  }

  private async updateContactLeadStatus(
    id: string,
    status: string,
    actor?: string | Body,
  ) {
    const actorUserId = this.actorIdFrom(actor);
    await this.getVisibleContactLead(id, actor);
    const contact = await this.db().contactLead.update({
      where: { id },
      data: { status, updatedById: actorUserId },
    });
    await this.audit(actorUserId, `CONTACT_LEAD_${status}`, 'ContactLead', id);
    return contact;
  }

  async convertContactLead(id: string, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    const contact = await this.getVisibleContactLead(id, actor);
    if (contact.status === 'CONVERTED' && contact.convertedLeadId) {
      return { leadId: contact.convertedLeadId, contact };
    }
    const interestedStatus = await this.getDefaultInterestedLeadStatusMaster();
    const lead = await this.createLead(
      {
        name: contact.customerName,
        email: contact.email,
        mobileCountryCode: contact.mobileCountryCode,
        mobile: contact.mobile,
        alternateCountryCode: contact.alternateCountryCode,
        alternateMobile: contact.alternateMobile,
        sourceId: contact.sourceId,
        preferredProject: contact.preferredProjectId,
        remarks: contact.note,
        statusId: interestedStatus?.id,
        ownerId: contact.assignedToId,
        telecallerId: contact.assignedToId,
      },
      actor,
    );
    const updatedContact = await this.db().contactLead.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedLeadId: lead.id,
        convertedAt: new Date(),
        updatedById: actorUserId,
      },
    });
    await this.audit(actorUserId, 'CONTACT_LEAD_CONVERTED', 'ContactLead', id, {
      leadId: lead.id,
    });
    return { lead, contact: updatedContact };
  }

  async bulkUpdateLeadSource(body: Body, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    await this.assertLeadUpdateFieldsAllowed(
      { sourceId: body.sourceId },
      actor,
    );
    const leadIds = parseStringArray(body.leadIds);
    const sourceId = String(body.sourceId ?? '');
    if (!leadIds.length)
      throw new BadRequestException('At least one lead is required');
    if (!sourceId) throw new BadRequestException('Lead source is required');

    const source = await this.db().leadMasterValue.findFirst({
      where: { id: sourceId, categoryRef: { code: 'source' }, isActive: true },
      select: { id: true, name: true },
    });
    if (!source) throw new BadRequestException('Valid lead source is required');

    const updated = await this.db().$transaction(async (tx: Body) => {
      const result = await tx.lead.updateMany({
        where: { id: { in: leadIds } },
        data: { sourceId },
      });
      await tx.activity.createMany({
        data: leadIds.map((leadId) => ({
          leadId,
          actorId: actorUserId,
          type: 'LEAD_SOURCE_UPDATED',
          title: 'Lead source updated',
          description: `Lead source changed to ${source.name}`,
          metadata: { sourceId },
        })),
        skipDuplicates: true,
      });
      return result;
    });
    await this.audit(
      actorUserId,
      'LEAD_SOURCE_BULK_UPDATED',
      'Lead',
      undefined,
      {
        leadIds,
        sourceId,
        count: updated.count,
      },
    );
    return { updated: updated.count, source };
  }

  private leadColumnPreferenceId(role?: string | null) {
    const normalizedRole = String(role ?? '')
      .trim()
      .toUpperCase();
    return leadListConfigurableRoles.includes(normalizedRole)
      ? `role:${normalizedRole}`
      : 'global';
  }

  private leadUpdateFieldPreferenceId(role?: string | null) {
    const normalizedRole = String(role ?? '')
      .trim()
      .toUpperCase();
    return leadListConfigurableRoles.includes(normalizedRole)
      ? `lead-update-fields:role:${normalizedRole}`
      : 'lead-update-fields:global';
  }

  private defaultLeadColumnsForRole(role?: string | null) {
    const normalizedRole = String(role ?? '')
      .trim()
      .toUpperCase();
    if (leadListRestrictedSourceRoles.has(normalizedRole)) {
      return leadListColumnDefaults.filter((column) => column !== 'source');
    }
    return leadListColumnDefaults;
  }

  private normalizeLeadColumns(columns: unknown, role?: string | null) {
    const requested = parseStringArray(columns).filter((column) =>
      leadListColumnDefaults.includes(column),
    );
    const source = requested.length
      ? requested
      : this.defaultLeadColumnsForRole(role);
    const next = source.filter(
      (column, index, list) => list.indexOf(column) === index,
    );

    for (const lockedColumn of leadListLockedColumns) {
      if (!next.includes(lockedColumn)) next.push(lockedColumn);
    }

    return leadListColumnDefaults.filter((column) => next.includes(column));
  }

  private defaultLeadUpdateFieldsForRole(role?: string | null) {
    const normalizedRole = String(role ?? '')
      .trim()
      .toUpperCase();
    if (leadUpdateAdminRoles.has(normalizedRole))
      return leadUpdateFieldDefaults;
    return (
      leadUpdateDefaultRestrictedFields[normalizedRole] ??
      leadUpdateFieldDefaults
    );
  }

  private normalizeLeadUpdateFields(fields: unknown, role?: string | null) {
    const requested = parseStringArray(fields).filter((field) =>
      leadUpdateFieldDefaults.includes(field),
    );
    const source = requested.length
      ? requested
      : this.defaultLeadUpdateFieldsForRole(role);
    return leadUpdateFieldDefaults.filter((field) => source.includes(field));
  }

  private leadUpdateFieldsFromBody(body: Body) {
    const fieldMap: Record<string, string[]> = {
      name: ['name', 'leadName'],
      mobile: ['mobile', 'mobileNumber'],
      email: ['email', 'emailAddress'],
      source: ['sourceId', 'leadSource'],
      status: ['statusId', 'leadStatus'],
      leadType: ['temperatureId'],
      projectName: ['preferredProject'],
      executive: ['ownerId', 'managerId', 'telecallerId', 'fieldExecutiveId'],
      budget: ['budgetRange', 'minBudget', 'maxBudget'],
      location: ['preferredLocation'],
      configuration: ['configuration'],
      propertyType: ['propertyType'],
      followUpDate: ['nextFollowUpAt', 'followUpDate'],
      remark: ['remarks'],
    };

    return Object.entries(fieldMap)
      .filter(([, keys]) =>
        keys.some((key) => {
          const value = body[key];
          return value !== undefined && value !== null && value !== '';
        }),
      )
      .map(([field]) => field);
  }

  private actorIdFrom(actor?: string | Body) {
    return typeof actor === 'string' ? actor : actor?.sub;
  }

  private async effectiveLeadUpdateFieldsForRole(role?: string | null) {
    const id = this.leadUpdateFieldPreferenceId(role);
    const pref = await this.db().leadListColumnPreference.findUnique({
      where: { id },
    });
    return this.normalizeLeadUpdateFields(
      pref?.visibleColumns ?? this.defaultLeadUpdateFieldsForRole(role),
      role,
    );
  }

  private async assertLeadUpdateFieldsAllowed(
    body: Body,
    actor?: string | Body,
  ) {
    if (!actor || typeof actor === 'string') return;
    const actorRole = String(actor.role ?? '').toUpperCase();
    if (!actorRole) return;
    const requestedFields = this.leadUpdateFieldsFromBody(body);
    if (!requestedFields.length) return;
    const allowedFields = await this.effectiveLeadUpdateFieldsForRole(
      actorRole,
    );
    const disallowedFields = requestedFields.filter(
      (field) => !allowedFields.includes(field),
    );
    if (!disallowedFields.length) return;

    const labelById = new Map<string, string>(
      leadUpdateSystemFields.map((field) => [field.id, field.label]),
    );
    throw new ForbiddenException(
      `You are not allowed to update ${disallowedFields
        .map((field) => labelById.get(field) ?? field)
        .join(', ')} for leads`,
    );
  }

  async getLeadListColumnPreference(query: Query = {}, actor?: Body) {
    const actorRole = String(actor?.role ?? '').toUpperCase();
    const requestedRole = String(query.role ?? '')
      .trim()
      .toUpperCase();
    const canInspectRole = ['SUPER_ADMIN', 'ADMIN'].includes(actorRole);
    const role =
      requestedRole &&
      canInspectRole &&
      leadListConfigurableRoles.includes(requestedRole)
        ? requestedRole
        : actorRole;
    const id = this.leadColumnPreferenceId(role);
    const pref = await this.db().leadListColumnPreference.findUnique({
      where: { id },
    });
    const defaultColumns = this.defaultLeadColumnsForRole(role);
    const visibleColumns = this.normalizeLeadColumns(
      pref?.visibleColumns ?? defaultColumns,
      role,
    );

    return {
      id,
      role,
      visibleColumns,
      lockedColumns: leadListLockedColumns,
      systemColumns: leadListSystemColumns,
    };
  }

  private async canViewLeadSource(user?: Body) {
    const preference = await this.getLeadListColumnPreference({}, user);
    return preference.visibleColumns.includes('source');
  }

  async updateLeadListColumnPreference(
    body: Body,
    actorUserId?: string,
    actorRole?: string,
  ) {
    const requestedRole = String(body.role ?? '')
      .trim()
      .toUpperCase();
    const canManageRole = ['SUPER_ADMIN', 'ADMIN'].includes(
      String(actorRole ?? '').toUpperCase(),
    );
    const role =
      requestedRole && canManageRole
        ? requestedRole
        : String(actorRole ?? '')
            .trim()
            .toUpperCase();
    const preferenceRole = leadListConfigurableRoles.includes(role)
      ? role
      : undefined;
    const id = this.leadColumnPreferenceId(preferenceRole);
    const visibleColumns = this.normalizeLeadColumns(
      body.visibleColumns,
      preferenceRole,
    );

    return this.db().leadListColumnPreference.upsert({
      where: { id },
      create: { id, visibleColumns, updatedById: actorUserId },
      update: { visibleColumns, updatedById: actorUserId },
    });
  }

  async getLeadUpdateFieldPreference(query: Query = {}, actor?: Body) {
    const actorRole = String(actor?.role ?? '').toUpperCase();
    const requestedRole = String(query.role ?? '')
      .trim()
      .toUpperCase();
    const canInspectRole = ['SUPER_ADMIN', 'ADMIN'].includes(actorRole);
    const role =
      requestedRole &&
      canInspectRole &&
      leadListConfigurableRoles.includes(requestedRole)
        ? requestedRole
        : actorRole;
    const id = this.leadUpdateFieldPreferenceId(role);
    const pref = await this.db().leadListColumnPreference.findUnique({
      where: { id },
    });
    const enabledFields = this.normalizeLeadUpdateFields(
      pref?.visibleColumns ?? this.defaultLeadUpdateFieldsForRole(role),
      role,
    );

    return {
      id,
      role,
      enabledFields,
      systemFields: leadUpdateSystemFields,
    };
  }

  async updateLeadUpdateFieldPreference(body: Body, actorUserId?: string) {
    const role = String(body.role ?? '')
      .trim()
      .toUpperCase();
    const preferenceRole = leadListConfigurableRoles.includes(role)
      ? role
      : undefined;
    const id = this.leadUpdateFieldPreferenceId(preferenceRole);
    const enabledFields = this.normalizeLeadUpdateFields(
      body.enabledFields ?? body.visibleColumns,
      preferenceRole,
    );

    await this.db().leadListColumnPreference.upsert({
      where: { id },
      create: { id, visibleColumns: enabledFields, updatedById: actorUserId },
      update: { visibleColumns: enabledFields, updatedById: actorUserId },
    });
    return this.getLeadUpdateFieldPreference(
      { role: preferenceRole },
      {
        sub: actorUserId,
        role: 'ADMIN',
      },
    );
  }

  async listAutoAssignmentRules() {
    return {
      data: await this.db().autoAssignmentRule.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  async createAutoAssignmentRule(body: Body, actorUserId?: string) {
    const sequence = parseStringArray(
      body.transferSequence ?? body.userSequence,
    );
    if (!body.initialUserId && !sequence.length) {
      throw new BadRequestException('At least one assigned user is required');
    }
    const transferSequence = normalizeAutoAssignmentRoute(
      body.initialUserId,
      sequence,
    );
    const rotationCount =
      body.rotationCount === undefined
        ? 1
        : validateRotationCount(body.rotationCount);
    await this.validateAutoAssignmentRoute(transferSequence, rotationCount);
    return this.db().autoAssignmentRule.create({
      data: {
        name: body.name ?? 'Default auto assignment',
        isEnabled: Boolean(body.isEnabled),
        initialUserId: transferSequence[0],
        transferSequence,
        rotationCount,
        transferTimeMinutes: Math.max(Number(body.transferTimeMinutes) || 2, 1),
        sourceId: body.sourceId || null,
        projectId: body.projectId || null,
        teamId: body.teamId || null,
        userRules: body.userRules,
        createdById: actorUserId,
        updatedById: actorUserId,
      },
    });
  }

  async updateAutoAssignmentRule(id: string, body: Body, actorUserId?: string) {
    if (!this.assignmentTransaction.getStore()) {
      const change = () => this.updateAutoAssignmentRule(id, body, actorUserId);
      if (body.isEnabled === false) {
        return this.terminateAutoAssignmentRuleRuns(
          id,
          'Routing rule disabled',
          change,
        );
      }
      return this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "AutoAssignmentRule" WHERE "id" = ${id} FOR UPDATE`;
          return this.assignmentTransaction.run(
            { tx, afterCommit: [] },
            change,
          );
        },
        { timeout: 20000 },
      );
    }
    const current = await this.db().autoAssignmentRule.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException('Auto-assignment rule not found');
    const sequence = parseStringArray(
      body.transferSequence ?? body.userSequence ?? current.transferSequence,
    );
    const initialUserId =
      body.initialUserId === undefined
        ? current.initialUserId
        : body.initialUserId;
    const transferSequence = normalizeAutoAssignmentRoute(
      initialUserId,
      sequence,
    );
    const rotationCount =
      body.rotationCount === undefined
        ? current.rotationCount
        : validateRotationCount(body.rotationCount);
    const routeChanged =
      body.initialUserId !== undefined ||
      body.transferSequence !== undefined ||
      body.userSequence !== undefined ||
      body.rotationCount !== undefined;
    if (body.isEnabled !== false || routeChanged)
      await this.validateAutoAssignmentRoute(transferSequence, rotationCount);
    return this.db().autoAssignmentRule.update({
      where: { id },
      data: {
        name: body.name,
        isEnabled:
          body.isEnabled === undefined ? undefined : Boolean(body.isEnabled),
        initialUserId: transferSequence[0],
        transferSequence,
        rotationCount:
          body.rotationCount === undefined ? undefined : rotationCount,
        transferTimeMinutes: body.transferTimeMinutes
          ? Math.max(Number(body.transferTimeMinutes), 1)
          : undefined,
        sourceId: body.sourceId,
        projectId: body.projectId,
        teamId: body.teamId,
        userRules: body.userRules,
        updatedById: actorUserId,
      },
    });
  }

  async deleteAutoAssignmentRule(id: string) {
    return this.terminateAutoAssignmentRuleRuns(
      id,
      'Routing rule deleted',
      () => this.db().autoAssignmentRule.delete({ where: { id } }),
    );
  }

  private async terminateAutoAssignmentRuleRuns<T>(
    ruleId: string,
    stopReason: string,
    change: () => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        // Match the worker's lead-before-event lock order; sorted IDs prevent multi-lead deadlocks.
        await tx.$queryRaw`SELECT "id" FROM "Lead" WHERE "id" IN (SELECT "leadId" FROM "AutoAssignmentEvent" WHERE "ruleId" = ${ruleId} AND "status" = 'ACTIVE') ORDER BY "id" FOR UPDATE`;
        await tx.$queryRaw`SELECT "id" FROM "AutoAssignmentRule" WHERE "id" = ${ruleId} FOR UPDATE`;
        return this.assignmentTransaction.run(
          { tx, afterCommit: [] },
          async () => {
            const result = await change();
            await tx.autoAssignmentEvent.updateMany({
              where: { ruleId, status: 'ACTIVE' },
              data: {
                status: 'COMPLETED',
                stopReason,
                lastCheckedAt: new Date(),
              },
            });
            return result;
          },
        );
      },
      { timeout: 20000 },
    );
  }

  private async validateAutoAssignmentRoute(
    userIds: string[],
    rotationCount: number,
  ) {
    if (!userIds.length)
      throw new BadRequestException('At least one assigned user is required');
    if (rotationCount > 1 && userIds.length < 2)
      throw new BadRequestException(
        'Repeating rotation requires at least two users',
      );
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, isActive: true },
      select: { id: true },
    });
    if (users.length !== userIds.length)
      throw new BadRequestException(
        'Auto-assignment route contains an inactive or invalid user',
      );
  }

  async listAutoAssignmentEvents(query: Query, actor?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const where = query.status ? { status: String(query.status) } : {};
    const [events, total]: [AutoAssignmentEvent[], number] = await Promise.all([
      this.db().autoAssignmentEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueAt: 'desc' },
      }),
      this.db().autoAssignmentEvent.count({ where }),
    ]);
    if (!events.length) return { data: [], meta: { page, limit, total } };
    const assignmentScope = await this.leadVisibility.resolveAssignmentScope(
      actor,
    );
    const leads = await this.prisma.lead.findMany({
      where: {
        id: { in: [...new Set(events.map((event) => event.leadId))] },
        deletedAt: null,
        ...(assignmentScope ? { AND: [assignmentScope] } : {}),
      },
      select: { id: true, name: true, displayId: true },
    });
    const leadById = new Map(leads.map((lead) => [lead.id, lead]));
    const userIds = [
      ...new Set(
        events.flatMap((event) =>
          leadById.has(event.leadId) && event.currentUserId
            ? [event.currentUserId]
            : [],
        ),
      ),
    ];
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const userById = new Map(users.map((user) => [user.id, user.fullName]));
    const data = events.map((event) => ({
      ...event,
      leadName: leadById.get(event.leadId)?.name ?? null,
      leadDisplayId: leadById.get(event.leadId)?.displayId ?? null,
      currentUserName: event.currentUserId
        ? userById.get(event.currentUserId) ?? null
        : null,
    }));
    return { data, meta: { page, limit, total } };
  }

  private async findAutoAssignmentRuleForLead(
    lead: Body,
    preferredTeamId?: string,
  ) {
    // These legacy rules and transfer recipients have no tenant ownership.
    // Keep tenant leads unassigned until tenant-owned rules are migrated.
    if (lead.organizationId) return null;
    if (lead.sourceId || lead.source) {
      const sourceMaster = await this.db().leadMasterValue.findFirst({
        where: {
          OR: [
            ...(lead.sourceId ? [{ id: String(lead.sourceId) }] : []),
            ...(lead.source
              ? [
                  {
                    name: { equals: String(lead.source), mode: 'insensitive' },
                  },
                  {
                    code: { equals: String(lead.source), mode: 'insensitive' },
                  },
                ]
              : []),
          ],
          categoryRef: { code: 'source' },
        },
      });
      if (sourceMaster && sourceMaster.autoAssignActive === false) {
        return null;
      }
    }

    const projectId = lead.requirement?.preferredProjectId;
    const where = {
      isEnabled: true,
      AND: [
        {
          OR: [
            { sourceId: null },
            ...(lead.sourceId ? [{ sourceId: String(lead.sourceId) }] : []),
          ],
        },
        {
          OR: [
            { projectId: null },
            ...(projectId ? [{ projectId: String(projectId) }] : []),
          ],
        },
      ],
    };

    // A Meta Page can route into a specific team. Global rules remain the
    // fallback so existing lead sources continue to use normal assignment.
    if (preferredTeamId) {
      const teamRule = await this.db().autoAssignmentRule.findFirst({
        where: { ...where, teamId: preferredTeamId },
        orderBy: { createdAt: 'asc' },
      });
      if (teamRule) return teamRule;
    }

    return this.db().autoAssignmentRule.findFirst({
      where: { ...where, teamId: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  private autoAssignmentDueAt(rule: Body, assignedAt: Date) {
    return new Date(
      assignedAt.getTime() +
        Math.max(Number(rule.transferTimeMinutes) || 2, 1) * 60000,
    );
  }

  private autoAssignmentSequence(rule: Body) {
    return normalizeAutoAssignmentRoute(
      rule.initialUserId,
      parseStringArray(rule.transferSequence),
    );
  }

  private autoAssignmentSnapshot(
    rule: Body,
    legacy = false,
  ): AutoAssignmentSnapshot {
    return {
      userIds: this.autoAssignmentSequence(rule),
      rotationCount: legacy
        ? 1
        : validateRotationCount(rule.rotationCount ?? 1),
      transferTimeMinutes: Math.max(Number(rule.transferTimeMinutes) || 2, 1),
    };
  }

  private async autoAssignmentAssigneeType(
    userId: string,
  ): Promise<LeadAssigneeType> {
    const user = await this.db().user.findUnique({
      where: { id: userId },
      select: { isActive: true, role: true },
    });
    if (!user?.isActive) {
      throw new BadRequestException(
        'Auto-assignment route contains an inactive or invalid user',
      );
    }
    return user.role === 'SALES_AGENT' ? 'field-executive' : 'telecaller';
  }

  private async activateAutoAssignmentEvent(
    rule: Body,
    leadId: string,
    currentUserId: string,
    currentStep: number,
    assignedAt = new Date(),
  ) {
    const activeEvent = await this.db().autoAssignmentEvent.findFirst({
      where: { leadId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    const snapshot =
      readAutoAssignmentSnapshot(activeEvent?.routeSnapshot) ??
      this.autoAssignmentSnapshot(rule, Boolean(activeEvent));
    const dueAt = this.autoAssignmentDueAt(snapshot, assignedAt);
    const currentCycle = activeEvent?.currentCycle ?? 1;
    const historyEntry = {
      userId: currentUserId,
      currentStep,
      currentCycle,
      assignedAt: assignedAt.toISOString(),
    };

    if (activeEvent) {
      await this.db().autoAssignmentEvent.update({
        where: { id: activeEvent.id },
        data: {
          currentUserId,
          currentStep,
          currentCycle,
          routeSnapshot: snapshot,
          assignedAt,
          dueAt,
          lastCheckedAt: assignedAt,
          history: [...asArray(activeEvent.history), historyEntry],
        },
      });
      return;
    }

    await this.db().autoAssignmentEvent.create({
      data: {
        ruleId: rule.id,
        leadId,
        currentUserId,
        currentStep,
        currentCycle,
        routeSnapshot: snapshot,
        assignedAt,
        dueAt,
        history: [historyEntry],
      },
    });
  }

  private async syncAutoAssignmentEventForAssignee(
    lead: Body,
    assigneeId: string,
  ) {
    if (!this.assignmentTransaction.getStore()) {
      return this.withAssignmentTransaction(String(lead.id), () =>
        this.syncAutoAssignmentEventForAssignee(lead, assigneeId),
      );
    }
    const activeEvent = await this.db().autoAssignmentEvent.findFirst({
      where: { leadId: lead.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
    if (activeEvent)
      await this.db()
        .$queryRaw`SELECT "id" FROM "AutoAssignmentEvent" WHERE "id" = ${activeEvent.id} FOR UPDATE`;
    let rule = activeEvent?.ruleId
      ? await this.db().autoAssignmentRule.findUnique({
          where: { id: activeEvent.ruleId },
        })
      : await this.findAutoAssignmentRuleForLead(lead);
    if (!rule) return;
    if (!activeEvent) {
      await this.db()
        .$queryRaw`SELECT "id" FROM "AutoAssignmentRule" WHERE "id" = ${rule.id} FOR SHARE`;
      rule = await this.db().autoAssignmentRule.findUnique({
        where: { id: rule.id },
      });
      if (!rule?.isEnabled) return;
    }

    const sequence = (
      readAutoAssignmentSnapshot(activeEvent?.routeSnapshot) ??
      this.autoAssignmentSnapshot(rule, Boolean(activeEvent))
    ).userIds;
    const currentStep = sequence.findIndex(
      (userId) => String(userId) === String(assigneeId),
    );

    if (currentStep < 0) {
      await this.db().autoAssignmentEvent.updateMany({
        where: { leadId: lead.id, status: 'ACTIVE' },
        data: {
          status: 'STOPPED',
          stopReason: 'Manual owner is outside the saved route',
          lastCheckedAt: new Date(),
        },
      });
      return;
    }

    await this.activateAutoAssignmentEvent(
      rule,
      lead.id,
      assigneeId,
      currentStep,
    );
  }

  private async createAutoAssignmentEventForLead(
    lead: Body,
    preferredTeamId?: string,
  ) {
    if (!this.assignmentTransaction.getStore()) {
      return this.withAssignmentTransaction(String(lead.id), () =>
        this.createAutoAssignmentEventForLead(lead, preferredTeamId),
      );
    }
    let rule = await this.findAutoAssignmentRuleForLead(lead, preferredTeamId);
    if (!rule) return;
    await this.db()
      .$queryRaw`SELECT "id" FROM "AutoAssignmentRule" WHERE "id" = ${rule.id} FOR SHARE`;
    rule = await this.db().autoAssignmentRule.findUnique({
      where: { id: rule.id },
    });
    if (!rule?.isEnabled) return;
    const sequence = this.autoAssignmentSequence(rule);
    const currentUserId = rule.initialUserId ?? sequence[0];
    if (!currentUserId) return;
    const assigneeType = await this.autoAssignmentAssigneeType(currentUserId);
    await this.assignLead(
      lead.id,
      {
        toUserId: currentUserId,
        assigneeType,
        strategy: 'auto-assignment',
        reason: 'Initial automatic CRM assignment',
      },
      undefined,
    );

    const now = new Date();
    const currentStep = Math.max(
      sequence.findIndex((userId) => String(userId) === String(currentUserId)),
      0,
    );
    await this.activateAutoAssignmentEvent(
      rule,
      lead.id,
      currentUserId,
      currentStep,
      now,
    );
  }

  async runAutoAssignmentTransfers() {
    const dueEvents = await this.db().autoAssignmentEvent.findMany({
      where: { status: 'ACTIVE', dueAt: { lte: new Date() } },
      take: 50,
      orderBy: { dueAt: 'asc' },
    });
    for (const event of dueEvents) {
      await this.processAutoAssignmentEvent(event).catch((error: unknown) => {
        this.logger.error(
          `Auto-assignment event ${String(
            event.id,
          )} failed; progress not advanced: ${String(error)}`,
        );
      });
    }
    return { processed: dueEvents.length };
  }

  private async processAutoAssignmentEvent(event: Body) {
    if (!this.assignmentTransaction.getStore()) {
      return this.withAssignmentTransaction(String(event.leadId), () =>
        this.processAutoAssignmentEvent(event),
      );
    }
    await this.db()
      .$queryRaw`SELECT "id" FROM "AutoAssignmentEvent" WHERE "id" = ${event.id} FOR UPDATE`;
    const currentEvent = await this.db().autoAssignmentEvent.findUnique({
      where: { id: event.id },
    });
    if (
      !currentEvent ||
      currentEvent.status !== 'ACTIVE' ||
      currentEvent.dueAt > new Date()
    )
      return;
    event = currentEvent;
    const [lead, rule] = await Promise.all([
      this.db().lead.findUnique({ where: { id: event.leadId } }),
      event.ruleId
        ? this.db().autoAssignmentRule.findUnique({
            where: { id: event.ruleId },
          })
        : Promise.resolve(null),
    ]);
    if (lead?.organizationId) {
      await this.db().autoAssignmentEvent.update({
        where: { id: event.id },
        data: { status: 'STOPPED', lastCheckedAt: new Date() },
      });
      return;
    }
    if (!lead || lead.deletedAt || !rule || !rule.isEnabled) {
      await this.db().autoAssignmentEvent.update({
        where: { id: event.id },
        data: { status: 'COMPLETED', lastCheckedAt: new Date() },
      });
      return;
    }

    if (lead.ownerId !== event.currentUserId) {
      await this.db().autoAssignmentEvent.update({
        where: { id: event.id },
        data: {
          status: 'STOPPED',
          stopReason: 'Primary owner no longer matches the routing run',
          lastCheckedAt: new Date(),
        },
      });
      return;
    }

    const acted = await this.hasLeadActionAfter(event.leadId, event.assignedAt);
    if (acted) {
      await this.db().autoAssignmentEvent.update({
        where: { id: event.id },
        data: {
          status: 'STOPPED',
          stopReason: 'CRM action recorded',
          lastCheckedAt: new Date(),
        },
      });
      return;
    }

    const snapshot =
      readAutoAssignmentSnapshot(event.routeSnapshot) ??
      this.autoAssignmentSnapshot(rule, true);
    const nextPosition = nextAutoAssignmentPosition(
      snapshot,
      Number(event.currentStep ?? 0),
      Number(event.currentCycle ?? 1),
    );
    if (!nextPosition) {
      await this.db().autoAssignmentEvent.update({
        where: { id: event.id },
        data: {
          status: 'EXHAUSTED',
          stopReason: 'Completed all configured passes',
          exhaustedAt: new Date(),
          lastCheckedAt: new Date(),
        },
      });
      await this.notifyAdminsAutoAssignmentExhausted(lead);
      return;
    }

    const nextUserId = snapshot.userIds[nextPosition.currentStep];
    const nextUser = await this.db().user.findUnique({
      where: { id: nextUserId },
      select: { isActive: true, role: true },
    });
    if (!nextUser?.isActive) {
      const stopReason = `Next route user ${nextUserId} is inactive or unavailable`;
      await this.db().autoAssignmentEvent.update({
        where: { id: event.id },
        data: { status: 'STOPPED', stopReason, lastCheckedAt: new Date() },
      });
      await this.notifyAdminsAutoAssignmentExhausted(lead, stopReason);
      return;
    }
    const assigneeType: LeadAssigneeType =
      nextUser.role === 'SALES_AGENT' ? 'field-executive' : 'telecaller';
    await this.assignLead(
      event.leadId,
      {
        toUserId: nextUserId,
        assigneeType,
        strategy: 'auto-transfer',
        reason: 'No CRM action before auto-transfer due time',
      },
      undefined,
    );
    await this.notifyAutoAssignmentMovedFromUser(
      lead,
      rule,
      event.currentUserId,
      nextUserId,
    );
    const now = new Date();
    const dueAt = this.autoAssignmentDueAt(snapshot, now);
    await this.db().autoAssignmentEvent.update({
      where: { id: event.id },
      data: {
        currentUserId: nextUserId,
        ...nextPosition,
        routeSnapshot: snapshot,
        assignedAt: now,
        dueAt,
        lastCheckedAt: now,
        history: [
          ...asArray(event.history),
          {
            userId: nextUserId,
            ...nextPosition,
            assignedAt: now.toISOString(),
          },
        ],
      },
    });
  }

  private async hasLeadActionAfter(leadId: string, assignedAt: Date) {
    const [activity, followUp, note, callLog, siteVisit, booking] =
      await Promise.all([
        this.db().activity.count({
          where: {
            leadId,
            occurredAt: { gt: assignedAt },
            type: {
              notIn: [
                'LEAD_CREATED',
                'Lead created',
                'LEAD_ASSIGNED',
                'Lead assigned',
                'LEAD_REASSIGNED',
                'Lead reassigned',
                'Lead Assigned',
                'Lead Reassigned',
                'LEAD_SOURCE_UPDATED',
                'AUTO_ASSIGNMENT_MISSED',
                'AUTO_ASSIGNMENT_TRANSFERRED',
                'SYSTEM_LOG',
              ],
            },
          },
        }),
        this.db().followUp.count({
          where: { leadId, createdAt: { gt: assignedAt } },
        }),
        this.db().note.count({
          where: { leadId, createdAt: { gt: assignedAt } },
        }),
        this.db().callLog.count({
          where: { leadId, createdAt: { gt: assignedAt } },
        }),
        this.db().siteVisit.count({
          where: { leadId, createdAt: { gt: assignedAt } },
        }),
        this.db().booking.count({
          where: { leadId, createdAt: { gt: assignedAt } },
        }),
      ]);
    return (
      activity > 0 ||
      followUp > 0 ||
      note > 0 ||
      callLog > 0 ||
      siteVisit > 0 ||
      booking > 0
    );
  }

  private async notifyAutoAssignmentMovedFromUser(
    lead: Body,
    rule: Body,
    previousUserId?: string | null,
    nextUserId?: string | null,
  ) {
    if (!previousUserId || !nextUserId || previousUserId === nextUserId) return;

    const nextUser = await this.db().user.findUnique({
      where: { id: String(nextUserId) },
      select: { fullName: true, email: true },
    });
    const nextUserName =
      nextUser?.fullName ?? nextUser?.email ?? 'the next assignee';
    const leadLabel = lead.displayId
      ? `${lead.name} (${lead.displayId})`
      : lead.name;
    const message = `${leadLabel} was moved from you to ${nextUserName} because no CRM action was recorded before the auto-assignment timer ended.`;

    await Promise.all([
      this.db().notification.create({
        data: {
          organizationId: lead.organizationId ?? null,
          userId: String(previousUserId),
          type: 'AUTO_ASSIGNMENT_TRANSFERRED',
          title: 'Lead moved to next assignee',
          description: message,
          message,
          badge: 'auto-assignment',
          entityType: 'Lead',
          entityId: lead.id,
          details: {
            leadId: lead.id,
            leadDisplayId: lead.displayId ?? lead.id,
            leadName: lead.name,
            ruleId: rule.id,
            nextUserId,
            nextUserName,
            performanceImpact: false,
            scoreImpact: 0,
          },
        },
      }),
      this.db().activity.create({
        data: {
          leadId: lead.id,
          actorId: String(previousUserId),
          type: 'AUTO_ASSIGNMENT_MISSED',
          title: 'Auto assignment missed',
          description: message,
          metadata: {
            ruleId: rule.id,
            previousUserId,
            nextUserId,
            nextUserName,
            performanceImpact: false,
            scoreImpact: 0,
          },
        },
      }),
    ]);
    if (nextUserId) {
      const navigation = this.buildNotificationNavigationPayload(
        null,
        'all-leads',
        {
          leadId: lead.id,
          leadDisplayId: lead.displayId ?? lead.id,
        },
      );
      const notificationPayload = await this.createNotificationWithNavigation(
        {
          organizationId: lead.organizationId ?? null,
          userId: String(nextUserId),
          type: 'sla-breach-transferred',
          title: 'Lead transferred to you after SLA breach',
          description: `Lead ${lead.name} was auto-transferred to you because the previous assignment exceeded its action SLA.`,
          badge: 'auto-assignment',
          entityType: 'Lead',
          entityId: lead.id,
          details: {
            leadId: lead.id,
            leadDisplayId: lead.displayId ?? lead.id,
            leadName: lead.name,
            ruleId: rule.id,
            previousUserId,
          },
        },
        navigation,
      );
      this.sendPushNotification(
        String(nextUserId),
        {
          title: 'Lead Transferred to You (SLA Breach)',
          body: `Lead ${lead.name} was auto-transferred to you due to uncontacted SLA expiration.`,
          type: 'sla-breach-transferred',
          data: {
            leadName: lead.name,
            ...notificationPayload,
          },
        },
        { organizationId: lead.organizationId },
      ).catch((err) =>
        this.logger.warn(`Push notify error on SLA transfer: ${err?.message}`),
      );
    }
  }

  private async notifyAdminsAutoAssignmentExhausted(
    lead: Body,
    stopReason?: string,
  ) {
    if (!lead.organizationId) return;
    const admins = await this.db().user.findMany({
      where: {
        isActive: true,
        role: { not: 'SUPER_ADMIN' },
        organizationMemberships: {
          some: {
            organizationId: lead.organizationId,
            isActive: true,
            role: 'ADMIN',
          },
          none: { organizationId: { not: lead.organizationId } },
        },
      },
      select: { id: true },
    });
    if (!admins.length) return;
    const navigation = this.buildNotificationNavigationPayload(
      null,
      'all-leads',
      {
        leadId: lead.id,
        leadDisplayId: lead.displayId ?? lead.id,
      },
    );
    await this.db().notification.createMany({
      data: admins.map((admin: Body) => ({
        organizationId: lead.organizationId,
        userId: admin.id,
        type: stopReason
          ? 'AUTO_ASSIGNMENT_STOPPED'
          : 'AUTO_ASSIGNMENT_EXHAUSTED',
        title: stopReason
          ? 'Auto assignment stopped'
          : 'Auto assignment exhausted',
        message:
          stopReason ??
          `Lead ${
            lead.displayId ?? lead.name
          } reached the end of its transfer sequence.`,
        entityType: 'Lead',
        entityId: lead.id,
        details: navigation,
      })),
      skipDuplicates: true,
    });
    admins.forEach((admin: Body) => {
      this.sendPushNotification(
        admin.id,
        {
          title: stopReason ? 'Auto assignment stopped' : 'SLA Exhausted Alert',
          body: `Lead ${
            lead.displayId ?? lead.name
          } reached the end of its SLA transfer sequence.`,
          type: 'sla-exhausted',
          data: navigation,
        },
        { organizationId: lead.organizationId },
      ).catch((err) =>
        this.logger.warn(`Push notify error on SLA exhausted: ${err?.message}`),
      );
    });
  }

  async getLeadPipeline(query: Query, user?: Body) {
    const canViewSource = await this.canViewLeadSource(user);
    const statuses = await this.ensureMasters(
      'status',
      defaultPipelineStatuses,
    );
    const sources = await this.ensureMasters('source', defaultLeadSources);
    const propertyTypes = await this.ensureMasters(
      'property_type',
      defaultMasterValues.property_type,
    );
    const configurations = await this.ensureMasters(
      'project_configuration',
      defaultMasterValues.project_configuration,
    );
    const sourceMap = new Map(
      sources.flatMap((row: Body) => [
        [row.id, row.name],
        [row.code, row.name],
        [slug(row.name), row.name],
      ]),
    );
    const userIds = new Set<string>();
    const projectIds = new Set<string>();
    const where: Body = { deletedAt: null };
    const assignmentScope = await this.leadVisibility.resolveAssignmentScope(
      user,
    );
    if (assignmentScope) {
      where.AND = [assignmentScope];
    }

    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { mobile: { contains: String(query.search), mode: 'insensitive' } },
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { displayId: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }
    if (canViewSource && query.sourceId && query.sourceId !== 'all') {
      const sourceFilter = String(query.sourceId);
      const matchingSource = sources.find(
        (source: Body) =>
          source.id === sourceFilter ||
          source.code === sourceFilter ||
          slug(source.name) === sourceFilter ||
          source.name === sourceFilter,
      );
      where.sourceId = {
        in: [
          sourceFilter,
          matchingSource?.id,
          matchingSource?.code,
          matchingSource?.name,
          matchingSource ? slug(matchingSource.name) : undefined,
        ].filter(Boolean),
      };
    }
    if (query.assignedToId === 'unassigned') {
      where.ownerId = null;
    } else if (query.assignedToId && query.assignedToId !== 'all') {
      where.ownerId = String(query.assignedToId);
    }
    if (query.managerId && query.managerId !== 'all')
      where.managerId = String(query.managerId);
    if (query.search) {
      const searchConditions = await this.buildLeadSearchConditions(
        query.search,
        canViewSource,
      );
      if (searchConditions.length) {
        where.AND = [...(where.AND ?? []), { OR: searchConditions }];
      }
    }
    if (query.from || query.to) {
      where.createdAt = {};
      const from = normalizeDate(query.from);
      const to = normalizeDate(query.to);
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const leads = await this.db().lead.findMany({
      where,
      take: 500,
      orderBy: { updatedAt: 'desc' },
      include: {
        requirement: true,
        integrationConnection: {
          select: { id: true, name: true, provider: true, archivedAt: true },
        },
        projectInterests: { include: { project: true } },
        activities: { orderBy: { occurredAt: 'desc' }, take: 1 },
        callLogs: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
    });

    for (const lead of leads) {
      [lead.ownerId, lead.managerId, lead.telecallerId, lead.fieldExecutiveId]
        .filter(Boolean)
        .forEach((id: string) => userIds.add(id));
      if (lead.requirement?.preferredProjectId)
        projectIds.add(lead.requirement.preferredProjectId);
      for (const pi of lead.projectInterests ?? []) {
        if (pi.projectId) projectIds.add(pi.projectId);
      }
    }

    const [users, projects] = await Promise.all([
      this.db()
        .user.findMany({
          where: {
            isActive: true,
            OR: [
              userIds.size ? { id: { in: [...userIds] } } : undefined,
              {
                role: {
                  in: ['TELECALLER', 'SALES_AGENT', 'SALES_MANAGER', 'ADMIN'],
                },
              },
            ].filter(Boolean) as any,
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
          },
          take: 500,
        })
        .catch(() => []),
      this.db()
        .project.findMany({
          where: projectIds.size ? { id: { in: [...projectIds] } } : {},
          select: { id: true, name: true, location: true, propertyType: true },
          take: 200,
        })
        .catch(() => []),
    ]);

    const usersById = new Map<string, Body>(
      users.map((item: Body) => [item.id, item]),
    );
    const projectsById = new Map<string, Body>(
      projects.map((item: Body) => [item.id, item]),
    );
    const statusIds = new Set(statuses.map((status: Body) => status.id));
    const fallbackStatus = statuses[0];
    const columnMap = new Map<string, PipelineColumnRecord>(
      statuses.map((status: Body) => [
        status.id,
        {
          id: status.id,
          name: status.name,
          code: status.code,
          color: status.displayColor ?? '#2563EB',
          count: 0,
          value: 0,
          hiddenCount: 0,
          leads: [] as Body[],
        },
      ]),
    );

    const filterProjectId =
      query.projectId && query.projectId !== 'all'
        ? String(query.projectId)
        : null;
    const filterPropertyType =
      query.propertyType && query.propertyType !== 'all'
        ? String(query.propertyType).toLowerCase()
        : null;

    const includedLeads: Body[] = [];
    for (const lead of leads) {
      const leadProjectIds = new Set<string>(
        [
          lead.requirement?.preferredProjectId,
          ...(lead.projectInterests ?? []).map((pi: Body) => pi.projectId),
        ].filter(Boolean) as string[],
      );
      const preferredProjectId = lead.requirement?.preferredProjectId;
      const preferredProject = preferredProjectId
        ? projectsById.get(preferredProjectId)
        : null;

      if (filterProjectId) {
        const matchesProj =
          leadProjectIds.has(filterProjectId) ||
          Array.from(leadProjectIds).some(
            (id) =>
              projectsById.get(id)?.name?.toLowerCase() ===
              filterProjectId.toLowerCase(),
          );
        if (!matchesProj) continue;
      }
      if (
        query.branch &&
        query.branch !== 'all' &&
        !String(preferredProject?.location ?? '')
          .toLowerCase()
          .includes(String(query.branch).toLowerCase())
      )
        continue;
      if (filterPropertyType) {
        const reqPropType = String(
          lead.requirement?.propertyType ?? '',
        ).toLowerCase();
        const matchesPropType =
          reqPropType === filterPropertyType ||
          Array.from(leadProjectIds).some(
            (id) =>
              String(projectsById.get(id)?.propertyType ?? '').toLowerCase() ===
              filterPropertyType,
          );
        if (!matchesPropType) continue;
      }
      if (
        query.configuration &&
        query.configuration !== 'all' &&
        String(lead.requirement?.configuration ?? '').toLowerCase() !==
          String(query.configuration).toLowerCase()
      )
        continue;
      includedLeads.push(lead);
      const statusId = statusIds.has(lead.statusId)
        ? lead.statusId
        : fallbackStatus?.id;
      const column = columnMap.get(statusId);
      if (!column) continue;

      const budget = Number(
        lead.requirement?.maxBudget ?? lead.requirement?.minBudget ?? 0,
      );
      const owner = usersById.get(lead.ownerId);
      const lastDate =
        lead.activities?.[0]?.occurredAt ??
        lead.callLogs?.[0]?.startedAt ??
        lead.updatedAt;
      column.count += 1;
      column.value += budget;
      if (column.leads.length >= 25) {
        column.hiddenCount += 1;
        continue;
      }

      column.leads.push({
        id: lead.id,
        displayId: lead.displayId,
        name: lead.name,
        mobile: `${lead.mobileCountryCode ?? '+91'} ${lead.mobile}`,
        source: canViewSource
          ? sourceMap.get(lead.sourceId) ?? lead.sourceId ?? 'Unknown'
          : HIDDEN_LEAD_SOURCE,
        propertyRequirement:
          [lead.requirement?.configuration, lead.requirement?.propertyType]
            .filter(Boolean)
            .join(' ') || 'Requirement pending',
        budget: formatCurrencyCr(budget),
        assignedUser: owner
          ? {
              id: owner.id,
              name: owner.fullName ?? owner.email,
              role: owner.role,
            }
          : null,
        project: preferredProject?.name ?? null,
        lastActivity: daysAgoLabel(lastDate),
      });
    }

    const columns: PipelineColumnRecord[] = [...columnMap.values()];
    const totalLeads = columns.reduce((sum, column) => sum + column.count, 0);
    const totalValue = columns.reduce((sum, column) => sum + column.value, 0);
    const maxCount = Math.max(...columns.map((column) => column.count), 1);
    const sourceCounts = new Map<string, number>();
    for (const lead of includedLeads) {
      const label = canViewSource
        ? sourceMap.get(lead.sourceId) ?? lead.sourceId ?? 'Unknown'
        : HIDDEN_LEAD_SOURCE;
      sourceCounts.set(label, (sourceCounts.get(label) ?? 0) + 1);
    }

    return {
      filters: {
        statuses: statuses.map((status: Body) => ({
          id: status.id,
          name: status.name,
          code: status.code,
          color: status.displayColor ?? '#2563EB',
          sortOrder: status.sortOrder,
        })),
        sources: (canViewSource ? sources : []).map((source: Body) => ({
          id: slug(source.name),
          name: source.name,
        })),
        propertyTypes: propertyTypes.map((item: Body) => ({
          id: item.name,
          name: item.name,
        })),
        configurations: configurations.map((item: Body) => ({
          id: item.name,
          name: item.name,
        })),
        users: users.map((item: Body) => ({
          id: item.id,
          name: item.fullName ?? item.email,
          role: item.role,
          image: item.avatarStorageKey ?? undefined,
        })),
        projects: projects.map((item: Body) => ({
          id: item.id,
          name: item.name,
          location: item.location,
        })),
      },
      columns: columns.map((column) => ({
        ...column,
        valueLabel: formatCurrencyCr(column.value),
      })),
      summary: [
        {
          label: 'Total Leads',
          count: totalLeads,
          valueLabel: formatCurrencyCr(totalValue),
        },
        ...columns.map((column) => ({
          label: column.name,
          count: column.count,
          valueLabel: formatCurrencyCr(column.value),
          color: column.color,
        })),
      ],
      stagePerformance: columns.map((column) => ({
        stage: column.name,
        count: column.count,
        percent: totalLeads ? Math.round((column.count / totalLeads) * 100) : 0,
        color: column.color,
        width: `${Math.max(
          Math.round((column.count / maxCount) * 100),
          column.count ? 12 : 0,
        )}%`,
      })),
      topSources: [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, count]) => ({
          name,
          count,
          percent: totalLeads ? Math.round((count / totalLeads) * 100) : 0,
        })),
      meta: {
        totalLeads,
        totalValueLabel: formatCurrencyCr(totalValue),
        limitPerColumn: 25,
      },
    };
  }

  async createLead(
    body: Body,
    actor?: string | Body,
    options: {
      fromIntegration?: boolean;
      useConfiguredAutomation?: boolean;
    } = {},
  ) {
    if (!body.name && !body.leadName) {
      throw new BadRequestException('Lead name is required');
    }
    if (!body.mobile && !body.mobileNumber) {
      throw new BadRequestException('Mobile number is required');
    }
    const createdAt = normalizeDate(body.createdAt);
    const calendarDate =
      typeof body.createdAt === 'string'
        ? body.createdAt.match(/^(\d{4})-(\d{2})-(\d{2})/)
        : null;
    const validCalendarDate =
      !calendarDate ||
      new Date(
        Date.UTC(
          Number(calendarDate[1]),
          Number(calendarDate[2]) - 1,
          Number(calendarDate[3]),
        ),
      )
        .toISOString()
        .slice(0, 10) === calendarDate[0];
    if (
      body.createdAt !== undefined &&
      (!createdAt ||
        Number.isNaN(createdAt.getTime()) ||
        !validCalendarDate ||
        (typeof body.createdAt !== 'string' &&
          !(body.createdAt instanceof Date)))
    ) {
      throw new BadRequestException(
        'Valid lead added date and time is required',
      );
    }

    const actorUser =
      typeof actor === 'string' ? { sub: actor, role: undefined } : actor;
    const actorUserId = actorUser?.sub;
    let actorRole = actorUser?.role;

    if (actorUserId && !actorRole) {
      const dbUser = await this.db()
        .user.findUnique({
          where: { id: actorUserId },
          select: { role: true },
        })
        .catch(() => null);
      actorRole = dbUser?.role;
    }

    const optionalId = (value: unknown) => {
      const text = typeof value === 'string' ? value.trim() : '';
      return text || undefined;
    };
    const explicitOwnerId = optionalId(body.ownerId);
    const explicitManagerId = optionalId(body.managerId);
    const explicitTelecallerId = optionalId(body.telecallerId);
    const explicitFieldExecutiveId = optionalId(body.fieldExecutiveId);
    const hasExplicitAssignment = Boolean(
      explicitOwnerId ||
        explicitManagerId ||
        explicitTelecallerId ||
        explicitFieldExecutiveId,
    );
    await Promise.all(
      [
        explicitOwnerId,
        explicitManagerId,
        explicitTelecallerId,
        explicitFieldExecutiveId,
      ]
        .filter((id): id is string => Boolean(id))
        .map((id) => this.assertUserWithinLeadScope(id, actor)),
    );

    const defaultTelecallerId =
      !options.fromIntegration &&
      !explicitTelecallerId &&
      actorRole === 'TELECALLER'
        ? actorUserId
        : undefined;
    const defaultFieldExecutiveId =
      !options.fromIntegration &&
      !explicitFieldExecutiveId &&
      actorRole === 'SALES_AGENT'
        ? actorUserId
        : undefined;

    const telecallerId = explicitTelecallerId ?? defaultTelecallerId;
    const fieldExecutiveId =
      explicitFieldExecutiveId ?? defaultFieldExecutiveId;
    const managerId = explicitManagerId;
    const ownerId =
      explicitOwnerId ??
      telecallerId ??
      fieldExecutiveId ??
      managerId ??
      (options.fromIntegration || actorRole === 'SUPER_ADMIN'
        ? undefined
        : actorUserId);

    const effectiveOrgId = actorUserId
      ? await this.resolveTenantOrganizationId(
          actorUserId,
          optionalId(body.organizationId),
        )
      : optionalId(body.organizationId);

    const integrationConnectionId = optionalId(body.integrationConnectionId);
    if (integrationConnectionId) {
      if (!effectiveOrgId)
        throw new BadRequestException(
          'Integration accounts require a tenant workspace',
        );
      const account = await this.prisma.leadSourceConnection.findFirst({
        where: {
          id: integrationConnectionId,
          organizationId: effectiveOrgId,
          archivedAt: null,
        },
        select: { id: true },
      });
      if (!account)
        throw new NotFoundException(
          'Integration account not found in this workspace',
        );
    }

    let rawProjectInput =
      body.preferredProjectId ??
      body.projectId ??
      body.preferredProject ??
      body.projectName ??
      body.project ??
      (Array.isArray(body.projectIds) ? body.projectIds[0] : undefined) ??
      (Array.isArray(body.projects) ? body.projects[0] : undefined);

    if (rawProjectInput && typeof rawProjectInput === 'object') {
      rawProjectInput =
        (rawProjectInput as any).id ??
        (rawProjectInput as any).name ??
        (rawProjectInput as any).value;
    }

    let effectiveProjId: string | undefined = undefined;
    if (rawProjectInput && typeof rawProjectInput === 'string') {
      const trimmed = rawProjectInput.trim();
      if (trimmed) {
        const matchedProject = await this.db()
          .project.findFirst({
            where: {
              ...(effectiveOrgId ? { organizationId: effectiveOrgId } : {}),
              OR: [
                { id: trimmed },
                { name: { equals: trimmed, mode: 'insensitive' } },
                { name: { contains: trimmed, mode: 'insensitive' } },
              ],
            },
            select: { id: true, name: true },
          })
          .catch(() => null);

        effectiveProjId = matchedProject?.id ?? trimmed;
      }
    }

    if (effectiveOrgId) {
      await this.assertLeadRoutingInOrganization(effectiveOrgId, {
        projectId: effectiveProjId,
        teamId: body.autoAssignmentTeamId,
        ownerId,
        managerId,
        telecallerId,
        fieldExecutiveId,
      });
    }

    await assertValidRoutingAssignees(
      this.db(),
      telecallerId,
      fieldExecutiveId,
      undefined,
      { allowBothExecutives: true },
    );

    const createLeadRecord = (displayId: string) =>
      this.db().$transaction(async (tx: Prisma.TransactionClient) => {
        const createdLead = await tx.lead.create({
          data: {
            organizationId: effectiveOrgId,
            displayId,
            name: body.name ?? body.leadName,
            email: body.email ?? body.emailAddress,
            mobileCountryCode: body.mobileCountryCode ?? '+91',
            mobile: body.mobile ?? body.mobileNumber,
            alternateCountryCode: body.alternateCountryCode,
            alternateMobile: body.alternateMobile ?? body.alternateNumber,
            gender: body.gender,
            sourceId: body.sourceId ?? body.leadSource,
            campaignId: body.campaignId ?? body.campaign,
            stageId: body.stageId ?? body.leadStage,
            statusId: body.statusId ?? body.leadStatus,
            priorityId: body.priorityId ?? body.priority,
            temperatureId: body.temperatureId,
            interestLevel: body.interestLevel,
            heardAboutUs: body.heardAboutUs,
            remarks: body.remarks,
            referenceBy: body.referenceBy,
            ownerId,
            managerId,
            telecallerId,
            fieldExecutiveId,
            integrationConnectionId,
            createdById: actorUserId,
            createdAt,
            assignedAt: normalizeDate(body.assignDate),
            nextFollowUpAt: normalizeDate(body.followUpDate),
            requirement: {
              create: {
                propertyType: body.propertyType,
                configuration: body.configuration,
                budgetRange: body.budgetRange,
                minBudget: normalizeMoney(body.minBudget),
                maxBudget: normalizeMoney(body.maxBudget),
                budgetUnit: body.maxBudgetUnit ?? body.minBudgetUnit,
                preferredLocation: body.preferredLocation,
                preferredProjectId: effectiveProjId,
                possessionTimeline: body.possessionTimeline,
                carpetAreaRange: body.carpetAreaRange,
                purpose: body.purpose,
                minArea: normalizeMoney(body.minArea),
                maxArea: normalizeMoney(body.maxArea),
                zone: body.zone,
              },
            },
          },
          include: { requirement: true },
        });
        await this.realtime.enqueueLeadCreated(tx, createdLead.id);
        return createdLead;
      });

    const suppliedDisplayId = optionalId(body.displayId);
    let displayId = suppliedDisplayId ?? (await this.nextLeadDisplayId());
    let lead;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        lead = await createLeadRecord(displayId);
        break;
      } catch (error) {
        const uniqueTarget =
          error instanceof Prisma.PrismaClientKnownRequestError
            ? error.meta?.target
            : undefined;
        const displayIdConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          (Array.isArray(uniqueTarget)
            ? uniqueTarget.includes('displayId')
            : String(uniqueTarget ?? '').includes('displayId'));

        if (!displayIdConflict || suppliedDisplayId || attempt === 2) {
          throw error;
        }

        const seq = Number(String(displayId).match(/^TR(\d+)$/)?.[1] ?? 0);
        displayId =
          seq > 0
            ? `TR${String(seq + 1).padStart(6, '0')}`
            : await this.nextLeadDisplayId();
      }
    }

    if (!lead) {
      throw new BadRequestException('Unable to allocate a lead reference');
    }

    if (effectiveProjId) {
      await this.db()
        .leadProjectInterest.create({
          data: {
            leadId: lead.id,
            projectId: effectiveProjId,
            isPrimary: true,
          },
        })
        .catch(() => undefined);
    }

    await this.recordLeadRemark(
      lead.id,
      this.remarkFromBody(body),
      actorUserId,
    );

    if (body.followUpDate) {
      const timeStr = body.followUpTime || '11:00 AM';
      let scheduledAt = normalizeDate(`${body.followUpDate} ${timeStr}`);
      if (!scheduledAt) {
        scheduledAt = normalizeDate(body.followUpDate);
      }
      if (scheduledAt) {
        const assignedFollowUpUserId =
          telecallerId ?? fieldExecutiveId ?? ownerId ?? actorUserId;
        const createdFollowUp = await this.db()
          .followUp.create({
            data: {
              leadId: lead.id,
              assignedToId: assignedFollowUpUserId,
              typeId: body.followUpType || 'call',
              statusId: 'Scheduled',
              scheduledAt,
            },
          })
          .catch(() => undefined);

        if (createdFollowUp && assignedFollowUpUserId) {
          await this.createFollowUpNotification({
            recipientUserId: assignedFollowUpUserId,
            lead,
            followUp: createdFollowUp,
            actorUserId,
            event: 'created',
            note: body.remarks || 'Initial follow-up',
          }).catch(() => undefined);
        }
      }
    }

    const assignees = [
      telecallerId,
      fieldExecutiveId,
      managerId,
      ownerId,
    ].filter((id): id is string => Boolean(id));
    const uniqueAssignees = Array.from(new Set(assignees));

    for (const assigneeId of uniqueAssignees) {
      const recipient = await this.db()
        .user.findUnique({
          where: { id: assigneeId },
          select: { id: true, role: true, fullName: true },
        })
        .catch(() => null);
      if (!recipient) continue;

      const assignmentNavigation = this.buildNotificationNavigationPayload(
        recipient.role,
        'all-leads',
        {
          leadId: lead.id,
          leadDisplayId: lead.displayId ?? lead.id,
        },
      );

      const assignmentPushPayload = await this.createNotificationWithNavigation(
        {
          userId: recipient.id,
          type: 'lead-assigned',
          title: 'New lead assigned',
          description: `${lead.name} (${
            lead.displayId ?? lead.id
          }) has been assigned to you.`,
          badge: this.roleLabel(recipient.role),
          message: body.remarks?.trim()
            ? `Remarks: ${body.remarks.trim()}`
            : 'Open the CRM to review the lead context.',
          entityType: 'Lead',
          entityId: lead.id,
          details: {
            leadName: lead.name,
            remarks: body.remarks ?? null,
            assignedBy: actorUser?.fullName ?? null,
          },
        },
        assignmentNavigation,
      ).catch(() => undefined);

      this.sendPushNotification(
        recipient.id,
        {
          title: 'New lead assigned',
          body: `${lead.name} (${
            lead.displayId ?? lead.id
          }) has been assigned to you.`,
          type: 'lead-assigned',
          data: {
            leadName: lead.name,
            ...assignmentPushPayload,
          },
        },
        { organizationId: effectiveOrgId },
      ).catch((err) =>
        this.logger.warn(
          `Push notify error on lead create assign: ${err?.message}`,
        ),
      );
    }

    const initialStatusMaster = lead.statusId
      ? await this.db().leadMasterValue.findFirst({
          where: {
            isActive: true,
            categoryRef: { code: 'status' },
            OR: [
              { id: String(lead.statusId) },
              { code: String(lead.statusId) },
              { name: String(lead.statusId) },
            ],
          },
          select: {
            id: true,
            name: true,
            code: true,
            manualScore: true,
          },
        })
      : null;
    const initialStatusScoreMetadata = await this.buildLeadStatusScoreMetadata(
      lead,
      Boolean(initialStatusMaster),
      initialStatusMaster,
    );

    await this.audit(
      actorUserId,
      'LEAD_CREATED',
      'Lead',
      lead.id,
      {
        displayId,
      },
      effectiveOrgId,
    );
    await this.db()
      .activity.create({
        data: {
          leadId: lead.id,
          actorId: actorUserId,
          type: 'LEAD_CREATED',
          title: 'Lead created',
          description: 'Lead was created in the system',
          metadata: initialStatusMaster
            ? {
                fields: ['status'],
                statusId: initialStatusMaster.id,
                statusName: initialStatusMaster.name,
                ...initialStatusScoreMetadata,
              }
            : undefined,
        },
      })
      .catch(() => undefined);
    if (
      !hasExplicitAssignment &&
      (!options.fromIntegration ||
        options.useConfiguredAutomation ||
        optionalId(body.autoAssignmentTeamId))
    ) {
      await this.createAutoAssignmentEventForLead(
        lead,
        optionalId(body.autoAssignmentTeamId),
      ).catch((error: unknown) =>
        this.logger.error(
          `Initial auto-assignment failed for lead ${String(lead.id)}: ${String(
            error,
          )}`,
        ),
      );
    } else if (hasExplicitAssignment && !options.fromIntegration) {
      const explicitAssigneeId = optionalId(
        lead.ownerId || lead.telecallerId || lead.fieldExecutiveId,
      );
      if (explicitAssigneeId) {
        await this.syncAutoAssignmentEventForAssignee(
          lead,
          explicitAssigneeId,
        ).catch((error: unknown) =>
          this.logger.error(
            `Explicit auto-assignment enrollment failed for lead ${String(
              lead.id,
            )}: ${String(error)}`,
          ),
        );
      }
    }

    const returnLead: any = { ...lead };
    if (effectiveProjId) {
      const projectObj = await this.db()
        .project.findUnique({
          where: { id: effectiveProjId },
          select: {
            id: true,
            name: true,
            location: true,
            minPrice: true,
            maxPrice: true,
            imageUrl: true,
          },
        })
        .catch(() => null);

      if (projectObj) {
        returnLead.projectId = projectObj.id;
        returnLead.preferredProjectId = projectObj.id;
        returnLead.preferredProjectName = projectObj.name;
        returnLead.project = projectObj;
      }
    }

    return returnLead;
  }

  /** Public presentation response; internal routing/scoring retains the raw source. */
  async getLeadForViewer(id: string, user?: Body) {
    const [lead, canViewSource] = await Promise.all([
      this.getLead(id, user),
      this.canViewLeadSource(user),
    ]);
    return {
      ...lead,
      activities: (lead.activities ?? []).map(
        (activity: { type?: unknown; metadata?: unknown }) =>
          leadActivitySourceVisibility(activity, canViewSource),
      ),
      ...leadSourceVisibilityFields(canViewSource),
    };
  }

  async getLead(id: string, user?: Body | string) {
    const actorUser = typeof user === 'string' ? undefined : user;
    const assignmentScope = await this.leadVisibility.resolveAssignmentScope(
      actorUser,
    );
    const lead = await this.db().lead.findFirst({
      where: {
        OR: [{ id }, { displayId: id }],
        deletedAt: null,
        ...(assignmentScope ? { AND: [assignmentScope] } : {}),
      },
      include: {
        requirement: true,
        integrationConnection: {
          select: { id: true, name: true, provider: true, archivedAt: true },
        },
        followUps: { orderBy: { scheduledAt: 'desc' } },
        activities: { orderBy: { occurredAt: 'desc' } },
        tasks: {
          orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
        },
        notes: { orderBy: { createdAt: 'desc' } },
        siteVisits: {
          orderBy: { scheduledAt: 'desc' },
          include: { project: true, unit: true },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: { project: true, unit: true },
        },
        projectInterests: {
          orderBy: { createdAt: 'desc' },
          include: { project: true, unit: true },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');

    const preferredProject = lead.requirement?.preferredProjectId
      ? await this.db().project.findUnique({
          where: { id: lead.requirement.preferredProjectId },
          select: { id: true, name: true, location: true },
        })
      : null;

    const userIds = Array.from(
      new Set([
        lead.ownerId,
        lead.managerId,
        lead.telecallerId,
        lead.fieldExecutiveId,
        ...(lead.followUps || []).map((item: Body) => item.assignedToId),
        ...(lead.tasks || []).map((item: Body) => item.assignedToId),
        ...(lead.notes || []).map((item: Body) => item.authorId),
        ...(lead.siteVisits || []).map(
          (item: Body) => item.assignedExecutiveId,
        ),
        ...(lead.bookings || []).map((item: Body) => item.salesExecutiveId),
        ...(lead.projectInterests || []).map(
          (item: Body) => item.salesExecutiveId,
        ),
      ]),
    ).filter(Boolean) as string[];

    const masterIds = Array.from(
      new Set([
        lead.sourceId,
        lead.stageId,
        lead.statusId,
        lead.priorityId,
        lead.campaignId,
        lead.temperatureId,
        ...(lead.followUps || []).map((item: Body) => item.typeId),
      ]),
    ).filter(Boolean) as string[];

    const [users, masterValues, scoreMasters] = await Promise.all([
      userIds.length
        ? this.db().user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarStorageKey: true,
            },
          })
        : Promise.resolve([]),
      masterIds.length
        ? this.db().leadMasterValue.findMany({
            where: { id: { in: masterIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      this.leadScoreMasterValues(),
    ]);

    const masterMap = new Map<string, string>(
      masterValues.map((value: Body) => [String(value.id), String(value.name)]),
    );
    const userMap = new Map<
      string,
      { fullName?: string | null; image?: string | null }
    >(
      users.map((value: Body) => [
        value.id,
        {
          fullName: value.fullName,
          image: value.avatarStorageKey,
        },
      ]),
    );

    const prefProjectId = lead.requirement?.preferredProjectId ?? null;
    const resolvedProjName =
      preferredProject?.name ?? lead.requirement?.preferredLocation ?? null;

    return {
      ...lead,
      projectId: prefProjectId,
      preferredProjectId: prefProjectId,
      projectName: resolvedProjName,
      projectArea:
        preferredProject?.location ??
        lead.requirement?.preferredLocation ??
        null,
      project: preferredProject
        ? {
            id: preferredProject.id,
            name: preferredProject.name,
            location: preferredProject.location,
          }
        : resolvedProjName,
      sourceName: lead.sourceId ? masterMap.get(lead.sourceId) : undefined,
      integrationConnectionId: lead.integrationConnectionId ?? null,
      integrationAccountName:
        lead.integrationConnection?.name ?? 'Legacy / unattributed',
      integrationProvider: lead.integrationConnection?.provider ?? null,
      stageName: lead.stageId ? masterMap.get(lead.stageId) : undefined,
      statusName: lead.statusId ? masterMap.get(lead.statusId) : undefined,
      priorityName: lead.priorityId
        ? masterMap.get(lead.priorityId)
        : undefined,
      campaignName: lead.campaignId
        ? masterMap.get(lead.campaignId)
        : undefined,
      temperatureName: lead.temperatureId
        ? masterMap.get(lead.temperatureId)
        : undefined,
      ...buildLeadScore(lead, scoreMasters, masterMap),
      ownerName: lead.ownerId ? userMap.get(lead.ownerId)?.fullName : undefined,
      managerName: lead.managerId
        ? userMap.get(lead.managerId)?.fullName
        : undefined,
      telecallerName: lead.telecallerId
        ? userMap.get(lead.telecallerId)?.fullName
        : undefined,
      fieldExecutiveName: lead.fieldExecutiveId
        ? userMap.get(lead.fieldExecutiveId)?.fullName
        : undefined,
      followUps: (lead.followUps || []).map((item: Body) => ({
        ...item,
        assignedToName: item.assignedToId
          ? userMap.get(item.assignedToId)?.fullName
          : undefined,
        typeName: item.typeId ? masterMap.get(item.typeId) : undefined,
      })),
      tasks: (lead.tasks || []).map((item: Body) => ({
        ...item,
        assignedToName: item.assignedToId
          ? userMap.get(item.assignedToId)?.fullName
          : undefined,
      })),
      notes: (lead.notes || []).map((item: Body) => ({
        ...item,
        authorName: item.authorId
          ? userMap.get(item.authorId)?.fullName
          : undefined,
        authorImage: item.authorId
          ? userMap.get(item.authorId)?.image
          : undefined,
      })),
      siteVisits: (lead.siteVisits || []).map((item: Body) => ({
        ...item,
        assignedExecutiveName: item.assignedExecutiveId
          ? userMap.get(item.assignedExecutiveId)?.fullName
          : undefined,
        projectName: item.project?.name,
        unitLabel: item.unit?.id
          ? [
              item.unit.tower,
              `Unit ${item.unit.unitNumber}`,
              item.unit.configuration,
            ]
              .filter(Boolean)
              .join(', ')
          : undefined,
      })),
      preferredProjectName: preferredProject?.name,
      preferredProjectLocation: preferredProject?.location,
      bookings: (lead.bookings || []).map((booking: Body) =>
        this.toBookingWorkspaceRow(booking),
      ),
      projectInterests: (lead.projectInterests || []).map((item: Body) => ({
        ...item,
        projectName: item.project?.name,
        projectLocation: item.project?.location,
        unitLabel: item.unit?.id
          ? [
              item.unit.tower,
              `Unit ${item.unit.unitNumber}`,
              item.unit.configuration,
            ]
              .filter(Boolean)
              .join(', ')
          : undefined,
        configuration:
          item.unit?.configuration ??
          (Array.isArray(item.project?.configurations)
            ? item.project.configurations.join(', ')
            : undefined),
        priceRange:
          item.project?.minPrice || item.project?.maxPrice
            ? formatMoneyRange(item.project?.minPrice, item.project?.maxPrice)
            : undefined,
        imageUrl: item.unit?.imageUrl ?? item.project?.imageUrl ?? undefined,
      })),
    };
  }

  private toBookingWorkspaceRow(booking: Body) {
    const lead = booking.lead ?? {};
    const project = booking.project ?? {};
    const unit = booking.unit ?? {};
    const payments = booking.payments ?? [];
    const incentives = booking.incentives ?? [];
    const receivedBrokerage = this.sumPayments(payments, 'BROKERAGE');
    const receivedIncentive = this.sumPayments(payments, 'INCENTIVE');
    const totalIncentive = incentives.reduce(
      (sum: number, item: Body) =>
        sum + Number(item.amount ?? 0) + Number(item.extraAmount ?? 0),
      0,
    );
    const netBrokerageAmount = Math.max(
      Number(booking.netBrokerageAmount ?? 0),
      0,
    );
    return {
      id: booking.id,
      leadId: booking.leadId,
      leadDisplayId: lead.displayId,
      leadName: booking.customerNameSnapshot ?? lead.name,
      leadPhone: booking.customerMobileSnapshot
        ? booking.customerMobileSnapshot
        : lead.mobile
        ? `${lead.mobileCountryCode ?? '+91'} ${lead.mobile}`
        : undefined,
      leadCreatedAt: booking.leadCreatedAtSnapshot ?? lead.createdAt,
      leadSource: booking.leadSourceSnapshot,
      projectId: booking.projectId,
      projectName: booking.projectNameSnapshot ?? project.name,
      projectLocation: project.location,
      unitId: booking.unitId,
      unitLabel: booking.flatNoSnapshot
        ? [
            booking.towerWingSnapshot,
            `Unit ${booking.flatNoSnapshot}`,
            booking.configurationSnapshot,
          ]
            .filter(Boolean)
            .join(', ')
        : unit.id
        ? [unit.tower, `Unit ${unit.unitNumber}`, unit.configuration]
            .filter(Boolean)
            .join(', ')
        : undefined,
      towerWing: booking.towerWingSnapshot ?? unit.tower,
      flatNo: booking.flatNoSnapshot ?? unit.unitNumber,
      configuration: booking.configurationSnapshot ?? unit.configuration,
      unitAvailability: unit.availability,
      unitBookingStatus: unit.bookingStatus,
      amount: Number(booking.bookingAmount ?? 0),
      bookingAmount: Number(booking.bookingAmount ?? 0),
      agreementValue: Number(
        booking.agreementValue ?? booking.bookingAmount ?? 0,
      ),
      bookingDate: booking.bookingDate,
      status: booking.status,
      remarks: booking.remarks,
      closedById: booking.closedById,
      brokerage: {
        basePct: Number(booking.baseBrokeragePct ?? 0),
        ladderPct: Number(booking.ladderBrokeragePct ?? 0),
        aopPct: Number(booking.aopBrokeragePct ?? 0),
        gstPct: Number(booking.gstPct ?? 0),
        tdsPct: Number(booking.tdsPct ?? 0),
        passbackAmount: Number(booking.passbackAmount ?? 0),
        baseAmount: Number(booking.baseBrokerageAmount ?? 0),
        ladderAmount: Number(booking.ladderBrokerageAmount ?? 0),
        aopAmount: Number(booking.aopBrokerageAmount ?? 0),
        grossAmount: Number(booking.grossBrokerageAmount ?? 0),
        gstAmount: Number(booking.gstAmount ?? 0),
        tdsAmount: Number(booking.tdsAmount ?? 0),
        netAmount: netBrokerageAmount,
        receivedAmount: receivedBrokerage,
        pendingAmount: Math.max(netBrokerageAmount - receivedBrokerage, 0),
      },
      incentive: {
        totalAmount:
          totalIncentive +
          (booking.extraIncentives ?? []).reduce(
            (sum: number, item: Body) => sum + Number(item.amount ?? 0),
            0,
          ),
        receivedAmount: receivedIncentive,
        pendingAmount: Math.max(
          totalIncentive +
            (booking.extraIncentives ?? []).reduce(
              (sum: number, item: Body) => sum + Number(item.amount ?? 0),
              0,
            ) -
            receivedIncentive,
          0,
        ),
      },
      incentives: incentives.map((item: Body) => ({
        id: item.id,
        roleType: item.roleType,
        recipientUserId: item.recipientUserId,
        recipientName: item.recipient?.fullName ?? item.recipient?.email,
        percentage: Number(item.percentage ?? 0),
        calculationMode: normalizeCalculationMode(item.calculationMode),
        fixedAmount: Number(item.fixedAmount ?? 0),
        amount: Number(item.amount ?? 0),
        extraAmount: Number(item.extraAmount ?? 0),
        paymentStatus: item.paymentStatus,
        paymentDate: item.paymentDate,
      })),
      extraIncentives: (booking.extraIncentives ?? []).map((item: Body) => ({
        id: item.id,
        bookingId: item.bookingId,
        recipientUserId: item.recipientUserId,
        recipientName: item.recipient?.fullName ?? item.recipient?.email,
        title: item.title,
        amount: Number(item.amount ?? 0),
        paymentStatus: item.paymentStatus,
        paymentDate: item.paymentDate,
        remarks: item.remarks,
        createdById: item.createdById,
        creatorName: item.createdBy?.fullName ?? item.createdBy?.email,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      payments: payments.map((payment: Body) => ({
        id: payment.id,
        kind: payment.kind,
        component: payment.component,
        amount: Number(payment.amount ?? 0),
        status: payment.status,
        paymentDate: payment.paymentDate,
        receivedDate: payment.receivedDate,
        method: payment.method,
        referenceNo: payment.referenceNo ?? payment.receiptId,
        remarks: payment.remarks,
        recipientUserId: payment.recipientUserId,
        recipientName: payment.recipient?.fullName ?? payment.recipient?.email,
      })),
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  }

  private async getBookingFinanceViewer(user?: Body) {
    if (!user?.sub) return null;
    if (['SUPER_ADMIN', 'ADMIN', 'HR'].includes(String(user.role ?? ''))) {
      return {
        visibilityScope: 'ALL' as const,
        teamUserIds: new Set<string>([user.sub]),
        bookingUserIds: null,
        canEdit: false,
      };
    }

    const [profile, leaderTeams] = await Promise.all([
      this.db().employeeProfile.findUnique({
        where: { userId: user.sub },
        select: { teamId: true },
      }),
      this.db().team.findMany({
        where: { leaderId: user.sub },
        select: { id: true },
      }),
    ]);

    const roleScope =
      leaderTeams.length > 0 ||
      ['TEAM_LEADER', 'MANAGER', 'SALES_MANAGER'].includes(
        String(user.role ?? ''),
      )
        ? 'TEAM_LEADER'
        : String(user.role ?? '') === 'TELECALLER'
        ? 'PRE_SALES'
        : String(user.role ?? '') === 'SALES_AGENT'
        ? 'SALES'
        : null;
    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(user);
    const bookingUserIds = scopedUserIds
      ? new Set(scopedUserIds)
      : new Set<string>([user.sub]);

    if (!roleScope) {
      return {
        visibilityScope: 'OWN' as const,
        teamUserIds: new Set<string>([user.sub]),
        bookingUserIds,
        canEdit: false,
      };
    }

    const setting = await this.db().incentiveVisibilitySetting.findUnique({
      where: { roleScope },
      select: { visibilityScope: true, canEdit: true },
    });

    const visibilityScope =
      setting?.visibilityScope ??
      (roleScope === 'TEAM_LEADER' ? 'OWN_AND_TEAM' : 'OWN');

    const teamIds = Array.from(
      new Set(
        [profile?.teamId, ...leaderTeams.map((team: Body) => team.id)].filter(
          Boolean,
        ) as string[],
      ),
    );

    const teamMembers =
      visibilityScope === 'OWN_AND_TEAM' && teamIds.length
        ? await this.db().employeeProfile.findMany({
            where: { teamId: { in: teamIds } },
            select: { userId: true },
          })
        : [];

    const finalTeamUserIds = new Set<string>([user.sub]);
    if (visibilityScope === 'OWN_AND_TEAM') {
      if (scopedUserIds) {
        scopedUserIds.forEach((id) => finalTeamUserIds.add(id));
      }
      teamMembers.forEach((member: Body) =>
        finalTeamUserIds.add(member.userId),
      );
    }

    return {
      visibilityScope,
      canEdit: Boolean(setting?.canEdit),
      teamUserIds: finalTeamUserIds,
      bookingUserIds,
    };
  }

  private bookingFinanceRelationsForViewer(
    row: Body,
    viewer: BookingFinanceViewer | null,
  ) {
    if (!viewer || viewer.visibilityScope === 'ALL') {
      return {
        incentives: row.incentives ?? [],
        extraIncentives: row.extraIncentives ?? [],
        payments: row.payments ?? [],
      };
    }

    const canSeeRecipient = (recipientUserId?: string) =>
      Boolean(recipientUserId) && viewer.teamUserIds.has(recipientUserId);

    const incentives = (row.incentives ?? []).filter((item) =>
      canSeeRecipient(item.recipientUserId),
    );
    const extraIncentives = (row.extraIncentives ?? []).filter((item) =>
      canSeeRecipient(item.recipientUserId),
    );
    const payments = (row.payments ?? []).filter(
      (payment) =>
        payment.kind !== 'INCENTIVE' ||
        canSeeRecipient(payment.recipientUserId),
    );

    return { incentives, extraIncentives, payments };
  }

  private applyBookingFinanceVisibility(
    row: ReturnType<CrmService['toBookingWorkspaceRow']>,
    viewer: BookingFinanceViewer | null,
  ) {
    if (!viewer || viewer.visibilityScope === 'ALL') {
      return row;
    }

    const { incentives, extraIncentives, payments } =
      this.bookingFinanceRelationsForViewer(row, viewer);
    const receivedIncentive = this.sumPayments(payments, 'INCENTIVE');
    const baseIncentiveSum = incentives.reduce(
      (sum, item) =>
        sum + Number(item.amount ?? 0) + Number(item.extraAmount ?? 0),
      0,
    );
    const extraIncentiveSum = extraIncentives.reduce(
      (sum, item) => sum + Number(item.amount ?? 0),
      0,
    );
    const totalIncentive = baseIncentiveSum + extraIncentiveSum;

    return {
      ...row,
      incentive: {
        totalAmount: totalIncentive,
        receivedAmount: receivedIncentive,
        pendingAmount: Math.max(totalIncentive - receivedIncentive, 0),
      },
      incentives,
      extraIncentives,
      payments,
    };
  }

  private bookingInclude() {
    return {
      lead: true,
      project: true,
      unit: true,
      incentives: {
        include: {
          recipient: {
            include: { employeeProfile: { include: { team: true } } },
          },
        },
        orderBy: { roleType: 'asc' },
      },
      payments: {
        include: { recipient: true },
        orderBy: { paymentDate: 'desc' },
      },
      extraIncentives: {
        include: {
          recipient: true,
          createdBy: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    };
  }

  private sumPayments(payments: Body[], kind: 'BROKERAGE' | 'INCENTIVE') {
    return payments
      .filter((payment) => String(payment.kind ?? '').toUpperCase() === kind)
      .filter((payment) =>
        ['received', 'paid', 'completed', 'settled'].includes(
          String(payment.status ?? '').toLowerCase(),
        ),
      )
      .filter(
        (payment) => String(payment.status ?? '').toLowerCase() !== 'reversed',
      )
      .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);
  }

  private percentageAmount(base: number, percentage: number) {
    return Math.round(((base * percentage) / 100) * 100) / 100;
  }

  private bookingMonthBounds(value: unknown) {
    const date = value ? new Date(String(value)) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return {
      start: new Date(safeDate.getFullYear(), safeDate.getMonth(), 1),
      end: new Date(safeDate.getFullYear(), safeDate.getMonth() + 1, 1),
    };
  }

  private async employeeMonthlyJustificationTargetMap(
    client: Body,
    userIds: string[],
  ) {
    if (!userIds.length) return new Map<string, number>();
    try {
      const rows = (await client.$queryRaw(
        Prisma.sql`
          SELECT
            "userId",
            "monthlyBasic",
            "justificationMultiplier",
            "justificationMode",
            "justificationAmount"
          FROM "EmployeeProfile"
          WHERE "userId" IN (${Prisma.join(userIds)})
        `,
      )) as Array<{
        userId: string;
        monthlyBasic: unknown;
        justificationMultiplier: unknown;
        justificationMode: unknown;
        justificationAmount: unknown;
      }>;
      return new Map(
        rows.map((row) => {
          const mode = String(
            row.justificationMode ?? 'MULTIPLIER',
          ).toUpperCase();
          const target =
            mode === 'MANUAL'
              ? Number(row.justificationAmount ?? 0)
              : Number(row.monthlyBasic ?? 0) *
                Number(row.justificationMultiplier ?? 0);
          return [row.userId, Math.max(target, 0)] as const;
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes('justificationMultiplier') ||
        message.includes('justificationMode') ||
        message.includes('justificationAmount')
      ) {
        return new Map<string, number>();
      }
      throw error;
    }
  }

  private async recalculateJustifiedBookingIncentives(
    tx: Body,
    recipientUserIds: Array<string | null | undefined>,
    bookingDate: unknown,
  ) {
    const uniqueRecipientIds = Array.from(
      new Set(recipientUserIds.filter((id): id is string => Boolean(id))),
    );
    if (!uniqueRecipientIds.length) return;

    const { start, end } = this.bookingMonthBounds(bookingDate);
    await Promise.all(
      uniqueRecipientIds.map(async (recipientUserId) => {
        const [monthlyTargetByUserId, incentiveRows] = await Promise.all([
          this.employeeMonthlyJustificationTargetMap(tx, [recipientUserId]),
          tx.bookingIncentive.findMany({
            where: {
              recipientUserId,
              booking: {
                status: 'Booked',
                bookingDate: { gte: start, lt: end },
              },
            },
            select: {
              id: true,
              bookingId: true,
              percentage: true,
              calculationMode: true,
              fixedAmount: true,
              booking: {
                select: {
                  bookingDate: true,
                  netBrokerageAmount: true,
                },
              },
            },
          }),
        ]);

        let remainingJustification = Math.max(
          monthlyTargetByUserId.get(recipientUserId) ?? 0,
          0,
        );
        const rowsByBooking = new Map<
          string,
          {
            bookingDate: Date;
            brokerageAmount: number;
            rows: typeof incentiveRows;
          }
        >();

        incentiveRows.forEach((row) => {
          const existing = rowsByBooking.get(row.bookingId);
          if (existing) {
            existing.rows.push(row);
            return;
          }
          rowsByBooking.set(row.bookingId, {
            bookingDate: new Date(row.booking.bookingDate),
            brokerageAmount: Math.max(
              Number(row.booking.netBrokerageAmount ?? 0),
              0,
            ),
            rows: [row],
          });
        });

        const updates = Array.from(rowsByBooking.values())
          .sort(
            (left, right) =>
              left.bookingDate.getTime() - right.bookingDate.getTime(),
          )
          .flatMap((bookingGroup) => {
            const commissionableBrokerage = Math.max(
              bookingGroup.brokerageAmount - remainingJustification,
              0,
            );
            remainingJustification = Math.max(
              remainingJustification - bookingGroup.brokerageAmount,
              0,
            );
            return bookingGroup.rows.map((row) => ({
              id: row.id,
              amount:
                normalizeCalculationMode(row.calculationMode) === 'FIXED'
                  ? Math.max(Number(row.fixedAmount ?? 0), 0)
                  : this.percentageAmount(
                      commissionableBrokerage,
                      Number(row.percentage ?? 0),
                    ),
            }));
          });

        await Promise.all(
          updates.map((row) =>
            tx.bookingIncentive.update({
              where: { id: row.id },
              data: { amount: row.amount },
            }),
          ),
        );
      }),
    );
  }

  private calculateBookingFinance(
    agreementValue: number,
    rule?: Body | null,
    passbackOverride?: number,
    amountOverrides?: {
      baseBrokerageAmount?: number;
      ladderBrokerageAmount?: number;
      aopBrokerageAmount?: number;
    },
  ) {
    const brokerageComponentAmount = (
      percentageField: string,
      modeField: string,
      fixedAmountField: string,
    ) => {
      const mode = normalizeCalculationMode(rule?.[modeField]);
      const fixedAmount = Number(rule?.[fixedAmountField] ?? 0);
      if (mode === 'FIXED') return Math.max(fixedAmount, 0);
      return this.percentageAmount(
        agreementValue,
        Number(rule?.[percentageField] ?? 0),
      );
    };
    const basePct = Number(rule?.baseBrokeragePct ?? 0);
    const ladderPct = Number(rule?.ladderBrokeragePct ?? 0);
    const aopPct = Number(rule?.aopBrokeragePct ?? 0);
    const gstPct = Number(rule?.gstPct ?? 0);
    const tdsPct = Number(rule?.tdsPct ?? 0);
    const passbackAmount =
      passbackOverride ?? Number(rule?.passbackDefaultAmount ?? 0);
    const baseOverride = amountOverrides?.baseBrokerageAmount;
    const ladderOverride = amountOverrides?.ladderBrokerageAmount;
    const aopOverride = amountOverrides?.aopBrokerageAmount;
    const baseAmount =
      baseOverride !== undefined
        ? Math.max(baseOverride, 0)
        : brokerageComponentAmount(
            'baseBrokeragePct',
            'baseBrokerageMode',
            'baseBrokerageFixedAmount',
          );
    const ladderAmount =
      ladderOverride !== undefined
        ? Math.max(ladderOverride, 0)
        : brokerageComponentAmount(
            'ladderBrokeragePct',
            'ladderBrokerageMode',
            'ladderBrokerageFixedAmount',
          );
    const aopAmount =
      aopOverride !== undefined
        ? Math.max(aopOverride, 0)
        : brokerageComponentAmount(
            'aopBrokeragePct',
            'aopBrokerageMode',
            'aopBrokerageFixedAmount',
          );
    const grossAmount = baseAmount + ladderAmount + aopAmount;
    const gstAmount = this.percentageAmount(grossAmount, gstPct);
    const tdsAmount = this.percentageAmount(grossAmount, tdsPct);
    const netBrokerageAmount = Math.max(
      grossAmount + gstAmount - tdsAmount - passbackAmount,
      0,
    );
    return {
      baseBrokeragePct: basePct,
      ladderBrokeragePct: ladderPct,
      aopBrokeragePct: aopPct,
      gstPct,
      tdsPct,
      passbackAmount,
      baseBrokerageAmount: baseAmount,
      ladderBrokerageAmount: ladderAmount,
      aopBrokerageAmount: aopAmount,
      grossBrokerageAmount: grossAmount,
      gstAmount,
      tdsAmount,
      netBrokerageAmount,
    };
  }

  private async incentivePolicyDefaults(tx?: Body) {
    if (!PAYROLL_INCENTIVE_FIELDS_SUPPORTED) {
      return {
        minimumDealsToQualify: 3,
        salesIncentivePct: 2.5,
        preSalesIncentivePct: 1,
        teamLeaderIncentivePct: 0.5,
      };
    }
    const settings = await (tx ?? this.db()).payrollSetting.findFirst();
    return {
      minimumDealsToQualify: Number(settings?.minimumDealsToQualify ?? 3) || 0,
      salesIncentivePct: Number(settings?.salesIncentivePct ?? 2.5) || 0,
      preSalesIncentivePct: Number(settings?.preSalesIncentivePct ?? 1) || 0,
      teamLeaderIncentivePct:
        Number(settings?.teamLeaderIncentivePct ?? 0.5) || 0,
    };
  }

  private resolveIncentivePercentage(
    configuredValue: unknown,
    fallbackValue: number,
  ) {
    const numericValue = Number(configuredValue ?? 0);
    return numericValue > 0 ? numericValue : fallbackValue;
  }

  private resolveIncentiveCalculation(
    rule: Body | null | undefined,
    percentageField: string,
    modeField: string,
    fixedAmountField: string,
    fallbackPercentage: number,
  ) {
    const mode = normalizeCalculationMode(rule?.[modeField]);
    if (mode === 'FIXED') {
      return {
        percentage: 0,
        calculationMode: 'FIXED',
        fixedAmount: Math.max(Number(rule?.[fixedAmountField] ?? 0), 0),
      };
    }

    return {
      percentage: this.resolveIncentivePercentage(
        rule?.[percentageField],
        fallbackPercentage,
      ),
      calculationMode: 'PERCENTAGE',
      fixedAmount: 0,
    };
  }

  private async bookingSnapshotData(
    tx: Body,
    leadId: string,
    projectId: string,
    unitId?: string,
    overrides?: { flatNo?: string; configuration?: string },
  ) {
    const [lead, project, unit] = await Promise.all([
      tx.lead.findUnique({
        where: { id: leadId },
        include: { requirement: true },
      }),
      tx.project.findUnique({ where: { id: projectId } }),
      unitId
        ? tx.projectUnit.findUnique({ where: { id: unitId } })
        : Promise.resolve(null),
    ]);
    if (!lead) throw new NotFoundException('Lead not found');
    if (!project) throw new BadRequestException('Project is required');
    const flatNo = optionalString(overrides?.flatNo) ?? unit?.unitNumber;
    const configuration =
      optionalString(overrides?.configuration) ??
      unit?.configuration ??
      lead.requirement?.configuration ??
      undefined;
    if (!flatNo) throw new BadRequestException('Flat number is required');
    if (!configuration) {
      throw new BadRequestException('Property / unit type is required');
    }
    const source = lead.sourceId
      ? await tx.leadMasterValue.findUnique({
          where: { id: lead.sourceId },
          select: { name: true },
        })
      : null;
    return {
      lead,
      project,
      unit,
      snapshots: {
        leadCreatedAtSnapshot: lead.createdAt,
        leadSourceSnapshot: source?.name ?? undefined,
        customerNameSnapshot: lead.name,
        customerMobileSnapshot: lead.mobile
          ? `${lead.mobileCountryCode ?? '+91'} ${lead.mobile}`
          : undefined,
        projectNameSnapshot: project.name,
        towerWingSnapshot: unit?.tower,
        flatNoSnapshot: flatNo,
        configurationSnapshot: configuration,
      },
    };
  }

  private async rebuildBookingIncentives(tx: Body, booking: Body, lead: Body) {
    const existingRows = await tx.bookingIncentive.findMany({
      where: { bookingId: booking.id },
      select: { recipientUserId: true },
    });
    const salesUserId =
      lead.fieldExecutiveId ?? booking.closedById ?? lead.ownerId;
    const preSalesUserId = lead.telecallerId ?? lead.ownerId;
    let teamLeaderId: string | undefined;
    if (salesUserId) {
      const salesUser = await tx.user.findUnique({
        where: { id: salesUserId },
        include: { employeeProfile: { include: { team: true } } },
      });
      teamLeaderId = salesUser?.employeeProfile?.team?.leaderId ?? undefined;
    }
    if (!teamLeaderId && preSalesUserId) {
      const preSalesUser = await tx.user.findUnique({
        where: { id: preSalesUserId },
        include: { employeeProfile: { include: { team: true } } },
      });
      teamLeaderId = preSalesUser?.employeeProfile?.team?.leaderId ?? undefined;
    }

    const rule = booking.projectId
      ? await tx.projectBrokerageRule.findUnique({
          where: { projectId: booking.projectId },
        })
      : null;
    const defaults = await this.incentivePolicyDefaults(tx);
    const rows = [
      {
        roleType: 'SALES',
        recipientUserId: salesUserId,
        ...this.resolveIncentiveCalculation(
          rule,
          'salesIncentivePct',
          'salesIncentiveMode',
          'salesIncentiveFixedAmount',
          defaults.salesIncentivePct,
        ),
      },
      {
        roleType: 'PRE_SALES',
        recipientUserId: preSalesUserId,
        ...this.resolveIncentiveCalculation(
          rule,
          'preSalesIncentivePct',
          'preSalesIncentiveMode',
          'preSalesIncentiveFixedAmount',
          defaults.preSalesIncentivePct,
        ),
      },
      {
        roleType: 'TEAM_LEADER',
        recipientUserId: teamLeaderId,
        ...this.resolveIncentiveCalculation(
          rule,
          'teamLeaderIncentivePct',
          'teamLeaderIncentiveMode',
          'teamLeaderIncentiveFixedAmount',
          defaults.teamLeaderIncentivePct,
        ),
      },
    ].filter((row) => row.recipientUserId);

    await tx.bookingIncentive.deleteMany({ where: { bookingId: booking.id } });
    if (String(booking.status).toLowerCase() === 'booked' && rows.length) {
      await tx.bookingIncentive.createMany({
        data: rows.map((row) => ({
          bookingId: booking.id,
          roleType: row.roleType,
          recipientUserId: row.recipientUserId,
          percentage: row.percentage,
          calculationMode: row.calculationMode,
          fixedAmount: row.fixedAmount,
          amount: 0,
          paymentStatus: 'Pending',
        })),
      });
    }
    await this.recalculateJustifiedBookingIncentives(
      tx,
      [
        ...existingRows.map((row) => row.recipientUserId),
        ...rows.map((row) => row.recipientUserId),
      ],
      booking.bookingDate,
    );
  }

  private async assertBookingUnitAvailable(
    tx: Body,
    leadId: string,
    projectId: string,
    unitId: string,
    currentBookingId?: string,
  ) {
    const blockingBookingWhere: Body = { status: 'Booked' };
    if (currentBookingId) {
      blockingBookingWhere.id = { not: currentBookingId };
    }
    const unit = await tx.projectUnit.findFirst({
      where: { id: unitId, projectId },
      include: {
        bookings: {
          where: blockingBookingWhere,
          select: { id: true, leadId: true, status: true },
        },
      },
    });
    if (!unit) {
      throw new BadRequestException('Selected unit does not belong to project');
    }
    const existingLeadBooking = unit.bookings.find(
      (booking: Body) => booking.leadId === leadId,
    );
    if (existingLeadBooking) {
      throw new BadRequestException(
        'This lead already has a confirmed booking for the selected unit',
      );
    }
    const availability = String(unit.availability).toLowerCase();
    const bookingStatus = String(unit.bookingStatus).toLowerCase();
    const isBlocked =
      ['booked', 'sold'].includes(availability) ||
      bookingStatus === 'booked' ||
      unit.bookings.length > 0;
    if (isBlocked) {
      throw new BadRequestException('Selected unit is already booked or sold');
    }
    return unit;
  }

  private async releaseUnitIfNoConfirmedBookings(
    tx: Body,
    unitId: string,
    currentBookingId?: string,
  ) {
    const confirmedBookingCount = await tx.booking.count({
      where: {
        unitId,
        status: 'Booked',
        ...(currentBookingId ? { id: { not: currentBookingId } } : {}),
      },
    });
    if (confirmedBookingCount > 0) return;
    await tx.projectUnit.update({
      where: { id: unitId },
      data: { availability: 'Available', bookingStatus: 'Available' },
    });
  }

  private async createBookingRecord(
    tx: Body,
    leadId: string,
    body: Body,
    user: Body,
    status = 'Scheduled',
  ) {
    const bookingAmount = normalizeMoney(body.bookingAmount ?? body.amount);
    const agreementValue = normalizeMoney(
      body.agreementValue ??
        body.agreementAmount ??
        body.bookingAmount ??
        body.amount,
    );
    const bookingDate = normalizeDate(
      body.bookingDate ?? body.scheduledAt ?? body.plannedAt,
    );
    if (!body.projectId) throw new BadRequestException('Project is required');
    const unitId = optionalString(body.unitId);
    if (!bookingAmount || bookingAmount <= 0) {
      throw new BadRequestException('Valid booking amount is required');
    }
    if (!agreementValue || agreementValue <= 0) {
      throw new BadRequestException('Valid agreement value is required');
    }
    if (!bookingDate) {
      throw new BadRequestException('Valid booking date is required');
    }
    if (unitId) {
      await this.assertBookingUnitAvailable(tx, leadId, body.projectId, unitId);
    }

    const [{ lead, snapshots }, rule] = await Promise.all([
      this.bookingSnapshotData(tx, leadId, body.projectId, unitId, {
        flatNo: body.flatNo,
        configuration: body.unitType,
      }),
      tx.projectBrokerageRule.findUnique({
        where: { projectId: body.projectId },
      }),
    ]);
    const finance = this.calculateBookingFinance(
      agreementValue,
      rule,
      normalizeMoney(body.passbackAmount),
      {
        baseBrokerageAmount: normalizeMoney(body.baseBrokerageAmount),
        ladderBrokerageAmount: normalizeMoney(body.ladderBrokerageAmount),
        aopBrokerageAmount: normalizeMoney(body.aopBrokerageAmount),
      },
    );

    const booking = await tx.booking.create({
      data: {
        leadId,
        projectId: body.projectId,
        unitId,
        bookingAmount,
        agreementValue,
        bookingDate,
        status,
        remarks: optionalString(body.remarks ?? body.notes),
        ...snapshots,
        ...finance,
        closedById: status === 'Booked' ? user?.sub : undefined,
      },
      include: this.bookingInclude(),
    });
    await this.rebuildBookingIncentives(tx, booking, lead);
    const bookingWithFinance = await tx.booking.findUnique({
      where: { id: booking.id },
      include: this.bookingInclude(),
    });

    await tx.activity.create({
      data: {
        leadId,
        actorId: user?.sub,
        type: status === 'Booked' ? 'BOOKING_CONFIRMED' : 'BOOKING_SCHEDULED',
        title: status === 'Booked' ? 'Booking confirmed' : 'Booking scheduled',
        description: body.notes ?? body.nextAction,
        metadata: {
          bookingId: booking.id,
          projectId: body.projectId,
          unitId,
          flatNo: snapshots.flatNoSnapshot,
          configuration: snapshots.configurationSnapshot,
          siteVisitId: body.siteVisitId,
          nextAction: body.nextAction,
          agreementValue,
          netBrokerageAmount: finance.netBrokerageAmount,
        },
      },
    });

    return bookingWithFinance ?? booking;
  }

  async listBookings(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const search = String(query.search ?? '').trim();
    const where: Body = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.projectId && query.projectId !== 'all') {
      where.projectId = query.projectId;
    }
    if (query.configuration && query.configuration !== 'all') {
      where.OR = [
        ...(where.OR ?? []),
        {
          configurationSnapshot: {
            equals: query.configuration,
            mode: 'insensitive',
          },
        },
        {
          unit: {
            configuration: { equals: query.configuration, mode: 'insensitive' },
          },
        },
      ];
    }
    if (query.leadId) where.leadId = query.leadId;
    const executiveId =
      query.executiveId && query.executiveId !== 'all'
        ? String(query.executiveId)
        : query.assignedToId && query.assignedToId !== 'all'
        ? String(query.assignedToId)
        : undefined;
    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(user);
    if (scopedUserIds !== null) {
      if (executiveId) {
        if (scopedUserIds.includes(executiveId)) {
          where.OR = [
            ...(where.OR ?? []),
            { closedById: executiveId },
            { lead: { ownerId: executiveId } },
            { lead: { telecallerId: executiveId } },
            { lead: { fieldExecutiveId: executiveId } },
          ];
        } else {
          where.closedById = { in: [] };
        }
      } else {
        where.AND = [
          ...(where.AND ?? []),
          {
            OR: [
              { closedById: { in: scopedUserIds } },
              {
                lead: {
                  is: {
                    OR: [
                      { ownerId: { in: scopedUserIds } },
                      { managerId: { in: scopedUserIds } },
                      { telecallerId: { in: scopedUserIds } },
                      { fieldExecutiveId: { in: scopedUserIds } },
                    ],
                  },
                },
              },
            ],
          },
        ];
      }
    } else if (executiveId) {
      where.OR = [
        ...(where.OR ?? []),
        { closedById: executiveId },
        { lead: { ownerId: executiveId } },
        { lead: { telecallerId: executiveId } },
        { lead: { fieldExecutiveId: executiveId } },
      ];
    }
    if (query.teamId && query.teamId !== 'all') {
      const teamMembers = await this.db().employeeProfile.findMany({
        where: { teamId: query.teamId },
        select: { userId: true },
      });
      const teamUserIds = teamMembers.map((member: Body) => member.userId);
      where.AND = [
        ...(where.AND ?? []),
        {
          lead: {
            OR: [
              { ownerId: { in: teamUserIds } },
              { telecallerId: { in: teamUserIds } },
              { fieldExecutiveId: { in: teamUserIds } },
            ],
          },
        },
      ];
    }
    if (query.paymentStatus && query.paymentStatus !== 'all') {
      where.payments =
        query.paymentStatus === 'pending'
          ? {
              none: {
                status: { in: ['Received', 'Paid', 'Completed', 'Settled'] },
              },
            }
          : {
              some: {
                status: { equals: query.paymentStatus, mode: 'insensitive' },
              },
            };
    }
    const dateFrom = normalizeDate(query.dateFrom ?? query.from);
    const dateTo = normalizeDate(query.dateTo ?? query.to);
    if (dateFrom || dateTo) {
      where.bookingDate = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }
    if (user?.role === 'TELECALLER') {
      where.AND = [...(where.AND ?? []), { lead: { telecallerId: user.sub } }];
    }
    if (user?.role === 'SALES_AGENT') {
      where.AND = [
        ...(where.AND ?? []),
        {
          lead: {
            OR: [
              { fieldExecutiveId: user.sub },
              { siteVisits: { some: { assignedExecutiveId: user.sub } } },
            ],
          },
        },
      ];
    }
    if (search) {
      const searchFilter = {
        OR: [
          { lead: { name: { contains: search, mode: 'insensitive' } } },
          { lead: { displayId: { contains: search, mode: 'insensitive' } } },
          { lead: { mobile: { contains: search, mode: 'insensitive' } } },
          { project: { name: { contains: search, mode: 'insensitive' } } },
          { unit: { unitNumber: { contains: search, mode: 'insensitive' } } },
        ],
      };
      where.AND = [...(where.AND ?? []), searchFilter];
    }

    const [rows, total] = await Promise.all([
      this.db().booking.findMany({
        where,
        include: this.bookingInclude(),
        orderBy: { bookingDate: 'desc' },
        skip,
        take: limit,
      }),
      this.db().booking.count({ where }),
    ]);
    const allForStats = await this.db().booking.findMany({
      where,
      include: { payments: true },
    });
    const stats = allForStats.reduce(
      (acc: Body, booking: Body) => {
        const net = Math.max(Number(booking.netBrokerageAmount ?? 0), 0);
        const received = this.sumPayments(booking.payments ?? [], 'BROKERAGE');
        acc.total += 1;
        if (booking.status === 'Scheduled') acc.scheduled += 1;
        if (booking.status === 'Booked') acc.confirmed += 1;
        if (booking.status === 'Cancelled') acc.cancelled += 1;
        acc.value += Number(
          booking.agreementValue ?? booking.bookingAmount ?? 0,
        );
        acc.totalBrokerage += net;
        acc.receivedBrokerage += received;
        acc.pendingBrokerage += Math.max(net - received, 0);
        return acc;
      },
      {
        total: 0,
        scheduled: 0,
        confirmed: 0,
        cancelled: 0,
        value: 0,
        totalBrokerage: 0,
        receivedBrokerage: 0,
        pendingBrokerage: 0,
      },
    );
    const financeViewer = await this.getBookingFinanceViewer(user);
    return {
      data: rows.map((booking: Body) =>
        this.applyBookingFinanceVisibility(
          this.toBookingWorkspaceRow(booking),
          financeViewer,
        ),
      ),
      meta: { page, limit, total, stats },
    };
  }

  async listLeadBookings(leadId: string, user?: Body) {
    const lead = await this.getLead(leadId, user);
    const rows = await this.db().booking.findMany({
      where: { leadId: lead.id },
      include: this.bookingInclude(),
      orderBy: { bookingDate: 'desc' },
    });
    return rows.map((booking: Body) => this.toBookingWorkspaceRow(booking));
  }

  async createBooking(leadId: string, body: Body, user?: Body) {
    const lead = await this.getLead(leadId, user);
    const booking = await this.db().$transaction(async (tx: Body) =>
      this.createBookingRecord(tx, lead.id, body, user ?? {}, 'Scheduled'),
    );
    await this.audit(user?.sub, 'BOOKING_SCHEDULED', 'Booking', booking.id, {
      leadId: lead.id,
    });
    return this.toBookingWorkspaceRow(booking);
  }

  async updateBooking(
    leadId: string,
    bookingId: string,
    body: Body,
    user?: Body,
  ) {
    const lead = await this.getLead(leadId, user);
    const existing = await this.db().booking.findFirst({
      where: { id: bookingId, leadId: lead.id },
      include: this.bookingInclude(),
    });
    if (!existing) throw new NotFoundException('Booking not found');
    const nextStatus = body.status ?? existing.status;
    const booking = await this.db().$transaction(async (tx: Body) => {
      const bookingAmount = normalizeMoney(body.bookingAmount ?? body.amount);
      const agreementValue = normalizeMoney(
        body.agreementValue ?? body.agreementAmount,
      );
      const bookingDate = normalizeDate(body.bookingDate ?? body.scheduledAt);
      const nextProjectId = body.projectId ?? existing.projectId;
      const nextUnitId =
        body.unitId === null || body.unitId === ''
          ? undefined
          : body.unitId ?? existing.unitId ?? undefined;
      if (!nextProjectId) {
        throw new BadRequestException('Project is required');
      }
      const unitSelectionChanged =
        String(nextProjectId) !== String(existing.projectId) ||
        String(nextUnitId ?? '') !== String(existing.unitId ?? '');
      if (
        nextUnitId &&
        nextStatus !== 'Cancelled' &&
        (unitSelectionChanged ||
          (nextStatus === 'Booked' && existing.status !== 'Booked'))
      ) {
        await this.assertBookingUnitAvailable(
          tx,
          lead.id,
          nextProjectId,
          nextUnitId,
          bookingId,
        );
      }
      const [{ lead: snapshotLead, snapshots }, rule] = await Promise.all([
        this.bookingSnapshotData(tx, lead.id, nextProjectId, nextUnitId, {
          flatNo: body.flatNo ?? existing.flatNoSnapshot,
          configuration: body.unitType ?? existing.configurationSnapshot,
        }),
        tx.projectBrokerageRule.findUnique({
          where: { projectId: nextProjectId },
        }),
      ]);
      const nextAgreementValue =
        agreementValue ??
        Number(existing.agreementValue ?? existing.bookingAmount ?? 0);
      const finance = this.calculateBookingFinance(
        nextAgreementValue,
        rule,
        normalizeMoney(body.passbackAmount) ??
          Number(existing.passbackAmount ?? 0),
        {
          baseBrokerageAmount: normalizeMoney(body.baseBrokerageAmount),
          ladderBrokerageAmount: normalizeMoney(body.ladderBrokerageAmount),
          aopBrokerageAmount: normalizeMoney(body.aopBrokerageAmount),
        },
      );
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          projectId: body.projectId ?? undefined,
          unitId: body.unitId !== undefined ? nextUnitId ?? null : undefined,
          bookingAmount: bookingAmount ?? undefined,
          agreementValue: agreementValue ?? undefined,
          bookingDate: bookingDate ?? undefined,
          status: nextStatus,
          remarks:
            body.remarks !== undefined || body.notes !== undefined
              ? optionalString(body.remarks ?? body.notes) ?? null
              : undefined,
          ...snapshots,
          ...finance,
          closedById: nextStatus === 'Booked' ? user?.sub : existing.closedById,
        },
        include: this.bookingInclude(),
      });
      await this.rebuildBookingIncentives(tx, updated, snapshotLead);
      const updatedWithFinance = await tx.booking.findUnique({
        where: { id: bookingId },
        include: this.bookingInclude(),
      });
      if (
        existing.status === 'Booked' &&
        existing.unitId &&
        (nextStatus !== 'Booked' || unitSelectionChanged)
      ) {
        await this.releaseUnitIfNoConfirmedBookings(
          tx,
          existing.unitId,
          bookingId,
        );
      }
      if (nextStatus === 'Booked' && updated.unitId) {
        await tx.projectUnit.update({
          where: { id: updated.unitId },
          data: { availability: 'Booked', bookingStatus: 'Booked' },
        });
        const bookingStage = await tx.leadMasterValue.findFirst({
          where: {
            OR: [
              { name: { contains: 'Booking', mode: 'insensitive' } },
              { code: { contains: 'BOOK', mode: 'insensitive' } },
            ],
          },
          orderBy: { sortOrder: 'asc' },
        });
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            stageId: bookingStage?.id ?? undefined,
            statusId: bookingStage?.id ?? undefined,
            convertedAt: new Date(),
          },
        });
        if (
          bookingStage?.id &&
          String(lead.statusId ?? '') !== String(bookingStage.id)
        ) {
          const statusScoreMetadata = await this.buildLeadStatusScoreMetadata(
            lead,
            true,
            bookingStage,
            tx,
          );
          await tx.activity.create({
            data: {
              leadId: lead.id,
              actorId: user?.sub,
              type: 'LEAD_UPDATED',
              title: 'Lead status updated',
              description: `Lead status was changed to ${bookingStage.name}`,
              metadata: {
                fields: ['status'],
                fromStatusId: lead.statusId,
                statusId: bookingStage.id,
                statusName: bookingStage.name,
                ...statusScoreMetadata,
              },
            },
          });
        }
      }
      await tx.activity.create({
        data: {
          leadId: lead.id,
          actorId: user?.sub,
          type:
            nextStatus === 'Booked'
              ? 'BOOKING_CONFIRMED'
              : nextStatus === 'Cancelled'
              ? 'BOOKING_CANCELLED'
              : 'BOOKING_UPDATED',
          title:
            nextStatus === 'Booked'
              ? 'Booking confirmed'
              : nextStatus === 'Cancelled'
              ? 'Booking cancelled'
              : 'Booking updated',
          description: body.notes ?? body.nextAction,
          metadata: { bookingId, status: nextStatus },
        },
      });
      return updatedWithFinance ?? updated;
    });
    await this.audit(user?.sub, 'BOOKING_UPDATED', 'Booking', booking.id, {
      leadId: lead.id,
      status: booking.status,
    });
    return this.toBookingWorkspaceRow(booking);
  }

  async getBookingDetails(id: string, user?: Body) {
    const booking = await this.db().booking.findUnique({
      where: { id },
      include: this.bookingInclude(),
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(user);
    if (scopedUserIds !== null) {
      const relatedUserIds = [
        booking.closedById,
        booking.lead?.ownerId,
        booking.lead?.managerId,
        booking.lead?.telecallerId,
        booking.lead?.fieldExecutiveId,
      ].filter((value): value is string => Boolean(value));
      if (!relatedUserIds.some((userId) => scopedUserIds.includes(userId))) {
        throw new NotFoundException('Booking not found');
      }
    }
    const financeViewer = await this.getBookingFinanceViewer(user);
    return this.applyBookingFinanceVisibility(
      this.toBookingWorkspaceRow(booking),
      financeViewer,
    );
  }

  async createBookingPayment(bookingId: string, body: Body, user?: Body) {
    const booking = await this.db().booking.findUnique({
      where: { id: bookingId },
      include: this.bookingInclude(),
    });
    if (!booking) throw new NotFoundException('Booking not found');
    const amount = normalizeMoney(body.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Valid payment amount is required');
    }
    const kind = String(body.kind ?? 'BROKERAGE').toUpperCase();
    if (!['BROKERAGE', 'INCENTIVE'].includes(kind)) {
      throw new BadRequestException(
        'Payment kind must be BROKERAGE or INCENTIVE',
      );
    }
    if (kind === 'BROKERAGE') {
      const netBrokerage = Math.max(Number(booking.netBrokerageAmount ?? 0), 0);
      const receivedBrokerage = this.sumPayments(
        booking.payments ?? [],
        'BROKERAGE',
      );
      const pendingBrokerage = Math.max(netBrokerage - receivedBrokerage, 0);
      if (netBrokerage <= 0) {
        throw new BadRequestException(
          'Brokerage payment cannot be recorded when net brokerage is zero',
        );
      }
      if (pendingBrokerage <= 0) {
        throw new BadRequestException('Brokerage is already fully received');
      }
      if (amount - pendingBrokerage > 0.009) {
        throw new BadRequestException(
          'Brokerage payment cannot exceed pending brokerage',
        );
      }
    }
    const paymentDate =
      normalizeDate(body.paymentDate ?? body.receivedDate) ?? new Date();
    const payment = await this.db().payment.create({
      data: {
        bookingId,
        leadId: booking.leadId,
        amount,
        paymentDate,
        receivedDate: paymentDate,
        status: body.status ?? 'Received',
        kind,
        component: optionalString(body.component),
        recipientUserId: optionalString(body.recipientUserId),
        method: optionalString(body.method),
        referenceNo: optionalString(body.referenceNo ?? body.receiptId),
        remarks: optionalString(body.remarks),
      },
    });
    await this.audit(
      user?.sub,
      'BOOKING_PAYMENT_ADDED',
      'Payment',
      payment.id,
      {
        bookingId,
        kind,
        component: body.component,
        amount,
      },
    );
    return this.getBookingDetails(bookingId, user);
  }

  async reverseBookingPayment(
    bookingId: string,
    paymentId: string,
    body: Body,
    user?: Body,
  ) {
    const payment = await this.db().payment.findFirst({
      where: { id: paymentId, bookingId },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (String(payment.status).toLowerCase() === 'reversed') {
      throw new BadRequestException('This payment is already reversed');
    }

    await this.db().payment.update({
      where: { id: payment.id },
      data: {
        status: 'Reversed',
        remarks:
          optionalString(body.reason) ??
          optionalString(body.remarks) ??
          'Payment reversed',
      },
    });
    await this.audit(
      user?.sub,
      'BOOKING_PAYMENT_REVERSED',
      'Payment',
      payment.id,
      {
        bookingId,
        kind: payment.kind,
        amount: Number(payment.amount ?? 0),
        reason: optionalString(body.reason ?? body.remarks),
      },
    );
    return this.getBookingDetails(bookingId, user);
  }

  async markBookingIncentivePaid(
    bookingId: string,
    incentiveId: string,
    body: Body,
    user?: Body,
  ) {
    const paymentDate = normalizeDate(body.paymentDate) ?? new Date();
    await this.db().$transaction(async (tx) => {
      const incentive = await tx.bookingIncentive.findFirst({
        where: { id: incentiveId, bookingId },
        include: { booking: { select: { leadId: true } } },
      });
      if (!incentive)
        throw new NotFoundException('Booking incentive not found');
      if (String(incentive.paymentStatus).toLowerCase() === 'paid') {
        throw new BadRequestException('This incentive is already marked paid');
      }
      if (
        !['approved', 'finalized'].includes(
          String(incentive.paymentStatus).toLowerCase(),
        )
      ) {
        throw new BadRequestException(
          'Approve the incentive before recording payment',
        );
      }

      const amount =
        Number(incentive.amount ?? 0) + Number(incentive.extraAmount ?? 0);
      await tx.bookingIncentive.update({
        where: { id: incentive.id },
        data: { paymentStatus: 'Paid', paymentDate },
      });
      await tx.payment.create({
        data: {
          bookingId,
          leadId: incentive.booking.leadId,
          amount,
          paymentDate,
          receivedDate: paymentDate,
          status: 'Paid',
          kind: 'INCENTIVE',
          component: `${incentive.roleType}_INCENTIVE`,
          recipientUserId: incentive.recipientUserId,
          method: optionalString(body.method) ?? 'Manual',
          referenceNo: optionalString(body.referenceNo),
          remarks:
            optionalString(body.remarks) ??
            'Marked paid manually outside payroll',
        },
      });
    });
    await this.audit(
      user?.sub,
      'BOOKING_INCENTIVE_MARKED_PAID',
      'BookingIncentive',
      incentiveId,
      {
        bookingId,
        paymentDate: paymentDate.toISOString(),
      },
    );
    return this.getBookingDetails(bookingId, user);
  }

  async updateBookingIncentive(
    bookingId: string,
    incentiveId: string,
    body: Body,
    user?: Body,
  ) {
    let impactedUserIds: Array<string | null | undefined> = [];
    let bookingDate: Date | null = null;

    await this.db().$transaction(async (tx) => {
      const incentive = await tx.bookingIncentive.findFirst({
        where: { id: incentiveId, bookingId },
        include: {
          booking: {
            select: {
              bookingDate: true,
              netBrokerageAmount: true,
            },
          },
        },
      });
      if (!incentive) {
        throw new NotFoundException('Booking incentive not found');
      }
      if (String(incentive.paymentStatus).toLowerCase() === 'paid') {
        throw new BadRequestException(
          'Reverse the incentive payment before editing this incentive',
        );
      }

      const data: Body = {};

      if (body.recipientUserId !== undefined) {
        const recipientUserId = optionalString(body.recipientUserId);
        if (!recipientUserId) {
          data.recipientUserId = null;
        } else {
          const recipient = await tx.user.findUnique({
            where: { id: recipientUserId },
            select: { id: true },
          });
          if (!recipient) {
            throw new BadRequestException('Recipient user not found');
          }
          data.recipientUserId = recipientUserId;
        }
      }

      const calculationMode = normalizeCalculationMode(
        body.calculationMode ?? incentive.calculationMode,
      );
      data.calculationMode = calculationMode;

      if (calculationMode === 'FIXED') {
        const fixedAmount = normalizeMoney(
          body.fixedAmount ?? body.amount ?? incentive.fixedAmount,
        );
        if (fixedAmount === undefined || fixedAmount < 0) {
          throw new BadRequestException(
            'Valid fixed incentive amount is required',
          );
        }
        data.fixedAmount = fixedAmount;
        data.amount = fixedAmount;
        data.percentage = 0;
      } else {
        const percentage =
          body.percentage !== undefined
            ? Number(body.percentage)
            : Number(incentive.percentage ?? 0);
        if (!Number.isFinite(percentage) || percentage < 0) {
          throw new BadRequestException(
            'Valid incentive percentage is required',
          );
        }
        const netBrokerageAmount = Number(
          incentive.booking.netBrokerageAmount ?? 0,
        );
        data.percentage = percentage;
        data.fixedAmount = 0;
        data.amount = Math.max(
          0,
          Math.round(((netBrokerageAmount * percentage) / 100) * 100) / 100,
        );
      }

      if (body.extraAmount !== undefined) {
        const extraAmount = normalizeMoney(body.extraAmount);
        if (extraAmount === undefined || extraAmount < 0) {
          throw new BadRequestException(
            'Valid extra incentive amount is required',
          );
        }
        data.extraAmount = extraAmount;
      }

      if (body.paymentStatus !== undefined) {
        const paymentStatus = normalizeIncentiveDecisionStatus(
          body.paymentStatus,
        );
        if (!paymentStatus || paymentStatus === 'Finalized') {
          throw new BadRequestException(
            'Incentive status must be Pending, Approved, or Rejected',
          );
        }
        data.paymentStatus = paymentStatus;
        data.paymentDate = null;
      }

      await tx.bookingIncentive.update({
        where: { id: incentive.id },
        data,
      });

      impactedUserIds = [incentive.recipientUserId, data.recipientUserId];
      bookingDate = incentive.booking.bookingDate;

      await this.recalculateJustifiedBookingIncentives(
        tx,
        impactedUserIds,
        bookingDate ?? new Date(),
      );
    });

    await this.audit(
      user?.sub,
      'BOOKING_INCENTIVE_UPDATED',
      'BookingIncentive',
      incentiveId,
      {
        bookingId,
        impactedUserIds: impactedUserIds.filter(Boolean),
      },
    );

    return this.getBookingDetails(bookingId, user);
  }

  async reverseBookingIncentivePayment(
    bookingId: string,
    incentiveId: string,
    body: Body,
    user?: Body,
  ) {
    await this.db().$transaction(async (tx) => {
      const incentive = await tx.bookingIncentive.findFirst({
        where: { id: incentiveId, bookingId },
      });
      if (!incentive)
        throw new NotFoundException('Booking incentive not found');
      if (String(incentive.paymentStatus).toLowerCase() !== 'paid') {
        throw new BadRequestException('Only paid incentives can be reversed');
      }

      await tx.bookingIncentive.update({
        where: { id: incentive.id },
        data: { paymentStatus: 'Pending', paymentDate: null },
      });
      await tx.payment.updateMany({
        where: {
          bookingId,
          kind: 'INCENTIVE',
          component: `${incentive.roleType}_INCENTIVE`,
          recipientUserId: incentive.recipientUserId,
          status: { in: ['Paid', 'Received', 'Settled', 'Completed'] },
        },
        data: {
          status: 'Reversed',
          remarks:
            optionalString(body.reason) ??
            optionalString(body.remarks) ??
            'Manual incentive payout reversed',
        },
      });
    });

    await this.audit(
      user?.sub,
      'BOOKING_INCENTIVE_PAYMENT_REVERSED',
      'BookingIncentive',
      incentiveId,
      {
        bookingId,
        reason: optionalString(body.reason ?? body.remarks),
      },
    );
    return this.getBookingDetails(bookingId, user);
  }

  async getProjectBrokerageRule(projectId: string) {
    const project = await this.db().project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const rule = await this.db().projectBrokerageRule.findUnique({
      where: { projectId },
    });
    const defaults = await this.incentivePolicyDefaults();
    return rule
      ? { ...rule, isConfigured: true }
      : {
          projectId,
          baseBrokeragePct: 0,
          baseBrokerageMode: 'FIXED',
          baseBrokerageFixedAmount: 0,
          ladderBrokeragePct: 0,
          ladderBrokerageMode: 'FIXED',
          ladderBrokerageFixedAmount: 0,
          aopBrokeragePct: 0,
          aopBrokerageMode: 'FIXED',
          aopBrokerageFixedAmount: 0,
          gstPct: 0,
          tdsPct: 0,
          passbackDefaultAmount: 0,
          salesIncentivePct: defaults.salesIncentivePct,
          salesIncentiveMode: 'FIXED',
          salesIncentiveFixedAmount: 0,
          preSalesIncentivePct: defaults.preSalesIncentivePct,
          preSalesIncentiveMode: 'FIXED',
          preSalesIncentiveFixedAmount: 0,
          teamLeaderIncentivePct: defaults.teamLeaderIncentivePct,
          teamLeaderIncentiveMode: 'FIXED',
          teamLeaderIncentiveFixedAmount: 0,
          isConfigured: false,
        };
  }

  async upsertProjectBrokerageRule(projectId: string, body: Body, user?: Body) {
    const project = await this.db().project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    const data = {
      baseBrokeragePct: normalizeMoney(body.baseBrokeragePct) ?? 0,
      baseBrokerageMode: normalizeCalculationMode(body.baseBrokerageMode),
      baseBrokerageFixedAmount:
        normalizeMoney(body.baseBrokerageFixedAmount) ?? 0,
      ladderBrokeragePct: normalizeMoney(body.ladderBrokeragePct) ?? 0,
      ladderBrokerageMode: normalizeCalculationMode(body.ladderBrokerageMode),
      ladderBrokerageFixedAmount:
        normalizeMoney(body.ladderBrokerageFixedAmount) ?? 0,
      aopBrokeragePct: normalizeMoney(body.aopBrokeragePct) ?? 0,
      aopBrokerageMode: normalizeCalculationMode(body.aopBrokerageMode),
      aopBrokerageFixedAmount:
        normalizeMoney(body.aopBrokerageFixedAmount) ?? 0,
      gstPct: normalizeMoney(body.gstPct) ?? 0,
      tdsPct: normalizeMoney(body.tdsPct) ?? 0,
      passbackDefaultAmount: normalizeMoney(body.passbackDefaultAmount) ?? 0,
      salesIncentivePct: normalizeMoney(body.salesIncentivePct) ?? 0,
      salesIncentiveMode: normalizeCalculationMode(body.salesIncentiveMode),
      salesIncentiveFixedAmount:
        normalizeMoney(body.salesIncentiveFixedAmount) ?? 0,
      preSalesIncentivePct: normalizeMoney(body.preSalesIncentivePct) ?? 0,
      preSalesIncentiveMode: normalizeCalculationMode(
        body.preSalesIncentiveMode,
      ),
      preSalesIncentiveFixedAmount:
        normalizeMoney(body.preSalesIncentiveFixedAmount) ?? 0,
      teamLeaderIncentivePct: normalizeMoney(body.teamLeaderIncentivePct) ?? 0,
      teamLeaderIncentiveMode: normalizeCalculationMode(
        body.teamLeaderIncentiveMode,
      ),
      teamLeaderIncentiveFixedAmount:
        normalizeMoney(body.teamLeaderIncentiveFixedAmount) ?? 0,
      updatedById: user?.sub,
    };
    const rule = await this.db().projectBrokerageRule.upsert({
      where: { projectId },
      create: { projectId, ...data },
      update: data,
    });
    await this.recalculateProjectBookingFinance(projectId);
    await this.audit(
      user?.sub,
      'PROJECT_BROKERAGE_RULE_UPDATED',
      'ProjectBrokerageRule',
      rule.id,
      { projectId },
    );
    return rule;
  }

  private async recalculateProjectBookingFinance(projectId: string) {
    await this.db().$transaction(async (tx: Body) => {
      const bookings = await tx.booking.findMany({
        where: { projectId },
        include: this.bookingInclude(),
      });
      const rule = await tx.projectBrokerageRule.findUnique({
        where: { projectId },
      });
      for (const booking of bookings) {
        const finance = this.calculateBookingFinance(
          Number(booking.agreementValue ?? booking.bookingAmount ?? 0),
          rule,
          Number(booking.passbackAmount ?? 0),
        );
        const updated = await tx.booking.update({
          where: { id: booking.id },
          data: finance,
          include: this.bookingInclude(),
        });
        await this.rebuildBookingIncentives(tx, updated, booking.lead);
      }
    });
  }

  private bookingReportRange(query: Query) {
    const now = new Date();
    const preset = String(query.preset ?? query.range ?? 'this_month');
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = endOfDay(now);
    if (preset === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (preset === 'yesterday') {
      start = startOfDay(addDays(now, -1));
      end = endOfDay(addDays(now, -1));
    } else if (preset === 'last_7_days') {
      start = startOfDay(addDays(now, -6));
    } else if (preset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (preset === 'quarterly') {
      start = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );
    } else if (preset === 'half_yearly') {
      start = new Date(now.getFullYear(), now.getMonth() < 6 ? 0 : 6, 1);
    } else if (preset === 'yearly') {
      start = new Date(now.getFullYear(), 0, 1);
    } else if (preset === 'custom') {
      start = normalizeDate(query.dateFrom) ?? start;
      end = normalizeDate(query.dateTo)
        ? endOfDay(normalizeDate(query.dateTo)!)
        : end;
    }
    return { preset, start, end };
  }

  private emptyBookingFinanceMetrics() {
    return {
      bookings: 0,
      agreementValue: 0,
      totalBrokerage: 0,
      receivedBrokerage: 0,
      pendingBrokerage: 0,
      salesIncentive: 0,
      preSalesIncentive: 0,
      teamLeaderIncentive: 0,
      extraIncentive: 0,
      totalCommission: 0,
      paidCommission: 0,
      pendingCommission: 0,
      commissionInJustification: 0,
    };
  }

  private addBookingFinanceMetrics(target: Body, booking: Body) {
    const payments = booking.payments ?? [];
    const receivedBrokerage = this.sumPayments(payments, 'BROKERAGE');
    const receivedIncentive = this.sumPayments(payments, 'INCENTIVE');
    const netBrokerage = Math.max(Number(booking.netBrokerageAmount ?? 0), 0);
    const incentives = booking.incentives ?? [];
    const extraIncentives = booking.extraIncentives ?? [];
    const incentiveAmount = (roleType: string) =>
      incentives
        .filter((item: Body) => item.roleType === roleType)
        .reduce(
          (sum: number, item: Body) =>
            sum + Number(item.amount ?? 0) + Number(item.extraAmount ?? 0),
          0,
        );
    const extraIncentiveSum = extraIncentives.reduce(
      (sum: number, item: Body) => sum + Number(item.amount ?? 0),
      0,
    );
    const baseIncentiveSum = incentives.reduce(
      (sum: number, item: Body) =>
        sum + Number(item.amount ?? 0) + Number(item.extraAmount ?? 0),
      0,
    );
    const commissionableBrokerage = incentives.reduce(
      (max: number, item: Body) => {
        const percentage = Number(item.percentage ?? 0);
        if (percentage <= 0) return max;
        return Math.max(max, (Number(item.amount ?? 0) * 100) / percentage);
      },
      0,
    );
    target.bookings += 1;
    target.agreementValue += Number(
      booking.agreementValue ?? booking.bookingAmount ?? 0,
    );
    target.totalBrokerage += netBrokerage;
    target.receivedBrokerage += receivedBrokerage;
    target.pendingBrokerage += Math.max(netBrokerage - receivedBrokerage, 0);
    target.salesIncentive += incentiveAmount('SALES');
    target.preSalesIncentive += incentiveAmount('PRE_SALES');
    target.teamLeaderIncentive += incentiveAmount('TEAM_LEADER');
    target.extraIncentive += extraIncentiveSum;
    target.totalCommission += baseIncentiveSum + extraIncentiveSum;
    target.paidCommission += receivedIncentive;
    target.pendingCommission += Math.max(
      baseIncentiveSum + extraIncentiveSum - receivedIncentive,
      0,
    );
    if (String(booking.status).toLowerCase() === 'booked') {
      target.commissionInJustification += Math.max(
        netBrokerage - commissionableBrokerage,
        0,
      );
    }
  }

  async getBookingFinanceReport(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const { preset, start, end } = this.bookingReportRange(query);
    const scope = String(query.scope ?? 'booking');
    const where: Body = { bookingDate: { gte: start, lte: end } };
    const viewer = await this.getBookingFinanceViewer(user);
    if (viewer?.bookingUserIds) {
      const scopedUserIds = Array.from(viewer.bookingUserIds);
      where.AND = [
        {
          OR: [
            { closedById: { in: scopedUserIds } },
            {
              lead: {
                is: {
                  OR: [
                    { ownerId: { in: scopedUserIds } },
                    { managerId: { in: scopedUserIds } },
                    { telecallerId: { in: scopedUserIds } },
                    { fieldExecutiveId: { in: scopedUserIds } },
                  ],
                },
              },
            },
          ],
        },
      ];
    }
    if (query.projectId && query.projectId !== 'all')
      where.projectId = query.projectId;
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.configuration && query.configuration !== 'all') {
      where.configurationSnapshot = {
        equals: query.configuration,
        mode: 'insensitive',
      };
    }
    const unfilteredRows = await this.db().booking.findMany({
      where,
      include: this.bookingInclude(),
      orderBy: { bookingDate: 'desc' },
    });
    const rows = unfilteredRows.map((booking: Body) => ({
      ...booking,
      ...this.bookingFinanceRelationsForViewer(booking, viewer),
    }));
    const teamUserIds =
      query.teamId && query.teamId !== 'all'
        ? new Set(
            (
              await this.db().employeeProfile.findMany({
                where: { teamId: String(query.teamId) },
                select: { userId: true },
              })
            ).map((member) => member.userId),
          )
        : null;
    const filtered = rows.filter((booking: Body) => {
      if (query.executiveId && query.executiveId !== 'all') {
        return [
          booking.closedById,
          booking.lead?.ownerId,
          booking.lead?.telecallerId,
          booking.lead?.fieldExecutiveId,
        ].includes(query.executiveId);
      }
      if (
        teamUserIds &&
        ![
          booking.closedById,
          booking.lead?.ownerId,
          booking.lead?.telecallerId,
          booking.lead?.fieldExecutiveId,
          ...(booking.incentives ?? []).map(
            (item: Body) => item.recipientUserId,
          ),
        ].some((userId) => userId && teamUserIds.has(userId))
      ) {
        return false;
      }
      if (query.paymentStatus && query.paymentStatus !== 'all') {
        const requestedStatus = String(query.paymentStatus).toLowerCase();
        const payments = booking.payments ?? [];
        if (
          requestedStatus === 'pending'
            ? payments.some((payment: Body) =>
                ['received', 'paid', 'completed', 'settled'].includes(
                  String(payment.status ?? '').toLowerCase(),
                ),
              )
            : !payments.some(
                (payment: Body) =>
                  String(payment.status ?? '').toLowerCase() ===
                  requestedStatus,
              )
        ) {
          return false;
        }
      }
      return true;
    });
    const summary = this.emptyBookingFinanceMetrics();
    filtered.forEach((booking: Body) =>
      this.addBookingFinanceMetrics(summary, booking),
    );

    const grouped = new Map<string, Body>();
    const ensureRow = (id: string, name: string, detail?: string) => {
      if (!grouped.has(id)) {
        grouped.set(id, {
          id,
          name,
          detail,
          ...this.emptyBookingFinanceMetrics(),
        });
      }
      return grouped.get(id);
    };
    filtered.forEach((booking: Body) => {
      let key = booking.id;
      let name =
        booking.customerNameSnapshot ?? booking.lead?.name ?? 'Booking';
      let detail = booking.projectNameSnapshot ?? booking.project?.name;
      if (scope === 'project') {
        key = booking.projectId ?? 'unassigned';
        name =
          booking.projectNameSnapshot ??
          booking.project?.name ??
          'Unassigned project';
        detail = booking.project?.location;
      } else if (scope === 'source') {
        key = booking.leadSourceSnapshot ?? 'Unassigned source';
        name = booking.leadSourceSnapshot ?? 'Unassigned source';
      } else if (scope === 'user') {
        const salesIncentive = booking.incentives?.find(
          (item: Body) => item.roleType === 'SALES',
        );
        key =
          booking.lead?.fieldExecutiveId ??
          booking.closedById ??
          booking.lead?.ownerId ??
          'unassigned';
        name =
          salesIncentive?.recipient?.fullName ??
          salesIncentive?.recipient?.email ??
          'Unassigned executive';
        detail = 'Sales person';
      } else if (scope === 'team') {
        const salesIncentive = booking.incentives?.find(
          (item: Body) => item.roleType === 'SALES',
        );
        const team = salesIncentive?.recipient?.employeeProfile?.team;
        key = team?.id ?? 'unassigned';
        name = team?.name ?? 'Unassigned team';
        detail = team?.leaderId ? 'Team with leader assigned' : 'Team';
      }
      const row = ensureRow(key, name, detail);
      this.addBookingFinanceMetrics(row, booking);
      row.latestBookingDate =
        !row.latestBookingDate ||
        new Date(booking.bookingDate) > new Date(row.latestBookingDate)
          ? booking.bookingDate
          : row.latestBookingDate;
    });
    const reportRows = [...grouped.values()].sort(
      (a, b) => b.totalBrokerage - a.totalBrokerage,
    );
    return {
      meta: {
        preset,
        scope,
        dateFrom: start.toISOString(),
        dateTo: end.toISOString(),
        page,
        limit,
        totalRows: reportRows.length,
      },
      summary,
      rows: reportRows.slice(skip, skip + limit),
      bookings: filtered
        .slice(skip, skip + limit)
        .map((booking: Body) => this.toBookingWorkspaceRow(booking)),
    };
  }

  async getMyCommissions(query: Query, user?: Body) {
    if (!user?.sub) throw new ForbiddenException('Missing authenticated user');

    const { page, limit, skip } = pageMeta(query);
    const { preset, start, end } = this.bookingReportRange(query);
    const viewer = await this.getBookingFinanceViewer(user);
    const requestedScope = String(query.scope ?? 'mine');
    const canViewTeam =
      requestedScope === 'team' &&
      viewer?.visibilityScope !== 'OWN' &&
      viewer?.visibilityScope !== undefined;
    const recipientUserIds = canViewTeam
      ? Array.from(viewer?.teamUserIds ?? [])
      : [user.sub];

    const [profile, leaderTeams] = await Promise.all([
      this.db().employeeProfile.findUnique({
        where: { userId: user.sub },
        select: { teamId: true },
      }),
      this.db().team.findMany({
        where: { leaderId: user.sub, isActive: true },
        select: { id: true, name: true },
      }),
    ]);
    const canManageTeamScope =
      leaderTeams.length > 0 ||
      ['TEAM_LEADER', 'MANAGER', 'SALES_MANAGER'].includes(
        String(user.role ?? ''),
      );
    if (requestedScope === 'team' && (!canManageTeamScope || !canViewTeam)) {
      throw new ForbiddenException(
        'You do not have access to team commissions',
      );
    }
    const ownRoleTypes =
      String(user.role ?? '') === 'TEAM_LEADER'
        ? new Set(['TEAM_LEADER'])
        : String(user.role ?? '') === 'TELECALLER'
        ? new Set(['PRE_SALES'])
        : String(user.role ?? '') === 'SALES_AGENT'
        ? new Set(['SALES'])
        : new Set(['SALES', 'PRE_SALES', 'TEAM_LEADER']);

    const assignmentScopeUserIds =
      canManageTeamScope && requestedScope !== 'team'
        ? Array.from(viewer?.teamUserIds ?? new Set<string>([user.sub]))
        : recipientUserIds;

    const bookings = await this.db().booking.findMany({
      where: {
        status: 'Booked',
        bookingDate: { gte: start, lte: end },
        OR: [
          { closedById: { in: assignmentScopeUserIds } },
          {
            lead: {
              is: {
                OR: [
                  { ownerId: { in: assignmentScopeUserIds } },
                  { managerId: { in: assignmentScopeUserIds } },
                  { telecallerId: { in: assignmentScopeUserIds } },
                  { fieldExecutiveId: { in: assignmentScopeUserIds } },
                ],
              },
            },
          },
          {
            incentives: { some: { recipientUserId: { in: recipientUserIds } } },
          },
          {
            extraIncentives: {
              some: { recipientUserId: { in: recipientUserIds } },
            },
          },
        ],
      },
      include: this.bookingInclude(),
      orderBy: { bookingDate: 'desc' },
    });

    const history = bookings.flatMap((booking: Body) => {
      const baseRows = (booking.incentives ?? [])
        .filter(
          (item: Body) =>
            recipientUserIds.includes(item.recipientUserId) &&
            (canViewTeam || ownRoleTypes.has(String(item.roleType))),
        )
        .map((item: Body) => {
          const percentage = Number(item.percentage ?? 0);
          const baseAmount = Number(item.amount ?? 0);
          return {
            id: item.id,
            bookingId: booking.id,
            bookingDate: booking.bookingDate,
            customerName:
              booking.customerNameSnapshot ?? booking.lead?.name ?? 'Customer',
            projectName:
              booking.projectNameSnapshot ?? booking.project?.name ?? 'Project',
            recipientUserId: item.recipientUserId,
            recipientName:
              item.recipient?.fullName ?? item.recipient?.email ?? 'Employee',
            roleType: item.roleType,
            percentage,
            amount: baseAmount + Number(item.extraAmount ?? 0),
            brokerageAmount: Math.max(
              Number(booking.netBrokerageAmount ?? 0),
              0,
            ),
            commissionableBrokerage:
              percentage > 0 ? Math.round((baseAmount * 100) / percentage) : 0,
            paymentStatus: item.paymentStatus,
            paymentDate: item.paymentDate,
            kind: 'BASE',
          };
        });
      const extraRows = (booking.extraIncentives ?? [])
        .filter((item: Body) => recipientUserIds.includes(item.recipientUserId))
        .map((item: Body) => ({
          id: item.id,
          bookingId: booking.id,
          bookingDate: booking.bookingDate,
          customerName:
            booking.customerNameSnapshot ?? booking.lead?.name ?? 'Customer',
          projectName:
            booking.projectNameSnapshot ?? booking.project?.name ?? 'Project',
          recipientUserId: item.recipientUserId,
          recipientName:
            item.recipient?.fullName ?? item.recipient?.email ?? 'Employee',
          roleType: 'EXTRA',
          percentage: 0,
          amount: Number(item.amount ?? 0),
          brokerageAmount: 0,
          commissionableBrokerage: 0,
          paymentStatus: item.paymentStatus,
          paymentDate: item.paymentDate,
          kind: 'EXTRA',
        }));
      return [...baseRows, ...extraRows];
    });

    const monthKeys = new Set<string>();
    for (
      let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      cursor <= end;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    ) {
      monthKeys.add(`${cursor.getFullYear()}-${cursor.getMonth() + 1}`);
    }
    const monthlyTargetByUserId =
      await this.employeeMonthlyJustificationTargetMap(
        this.db(),
        recipientUserIds,
      );
    // Named periods carry their full target even early in the period. Using
    // elapsed months makes a quarter equal to a month in October, and a
    // half-year equal to four months rather than six.
    const presetTargetMonths: Partial<Record<string, number>> = {
      this_month: 1,
      quarterly: 3,
      half_yearly: 6,
      yearly: 12,
    };
    const monthsInRange =
      presetTargetMonths[preset] ?? Math.max(monthKeys.size, 1);
    const targetForUser = (userId: string) => {
      return Number(monthlyTargetByUserId.get(userId) ?? 0) * monthsInRange;
    };
    const targetValue = recipientUserIds.reduce(
      (total, recipientUserId) => total + targetForUser(recipientUserId),
      0,
    );
    const achievedBrokerageByUserBooking = new Map<string, number>();
    bookings.forEach((booking: Body) => {
      const lead = booking.lead ?? {};
      const salesUserId =
        lead.fieldExecutiveId ?? booking.closedById ?? lead.ownerId;
      const preSalesUserId = lead.telecallerId ?? lead.ownerId;
      const achievedRecipientIds = new Set<string>();

      recipientUserIds.forEach((recipientUserId) => {
        if (
          salesUserId === recipientUserId &&
          (canViewTeam || ownRoleTypes.has('SALES'))
        ) {
          achievedRecipientIds.add(recipientUserId);
        }
        if (
          preSalesUserId === recipientUserId &&
          (canViewTeam || ownRoleTypes.has('PRE_SALES'))
        ) {
          achievedRecipientIds.add(recipientUserId);
        }
      });

      (booking.incentives ?? []).forEach((item: Body) => {
        if (
          recipientUserIds.includes(item.recipientUserId) &&
          (canViewTeam || ownRoleTypes.has(String(item.roleType)))
        ) {
          achievedRecipientIds.add(item.recipientUserId);
        }
      });

      if (
        !canViewTeam &&
        canManageTeamScope &&
        ownRoleTypes.has('TEAM_LEADER')
      ) {
        const teamUserIds = viewer?.teamUserIds ?? new Set<string>();
        if (
          (salesUserId && teamUserIds.has(salesUserId)) ||
          (preSalesUserId && teamUserIds.has(preSalesUserId))
        ) {
          achievedRecipientIds.add(user.sub);
        }
      }

      achievedRecipientIds.forEach((recipientUserId) => {
        achievedBrokerageByUserBooking.set(
          `${recipientUserId}:${booking.id}`,
          Math.max(Number(booking.netBrokerageAmount ?? 0), 0),
        );
      });
    });

    const achievedBrokerageByUser = Array.from(
      achievedBrokerageByUserBooking.entries(),
    ).reduce((totals, [key, value]) => {
      const [recipientUserId] = key.split(':');
      totals.set(recipientUserId, (totals.get(recipientUserId) ?? 0) + value);
      return totals;
    }, new Map<string, number>());
    const achievedTarget = Array.from(achievedBrokerageByUser.values()).reduce(
      (sum, value) => sum + value,
      0,
    );
    const commissionableBrokerage = recipientUserIds.reduce(
      (sum, recipientUserId) =>
        sum +
        Math.max(
          (achievedBrokerageByUser.get(recipientUserId) ?? 0) -
            targetForUser(recipientUserId),
          0,
        ),
      0,
    );

    const paidStatuses = new Set(['paid', 'received', 'completed', 'settled']);
    const summary = history.reduce(
      (total, item) => {
        total.totalCommission += item.amount;
        total.eligibleCommission += item.amount;
        if (paidStatuses.has(String(item.paymentStatus ?? '').toLowerCase())) {
          total.paidCommission += item.amount;
        } else {
          total.pendingCommission += item.amount;
        }
        return total;
      },
      {
        totalCommission: 0,
        eligibleCommission: 0,
        paidCommission: 0,
        pendingCommission: 0,
        commissionInJustification: targetValue,
        achievedBrokerage: achievedTarget,
        justificationTarget: targetValue,
        commissionableBrokerage,
      },
    );

    const memberSummaries = canViewTeam
      ? (
          Array.from(
            history
              .reduce(
                (members, item) => {
                  const member = members.get(item.recipientUserId) ?? {
                    userId: item.recipientUserId,
                    name: item.recipientName,
                    commission: 0,
                    paid: 0,
                    pending: 0,
                    bookings: new Set<string>(),
                  };
                  member.commission += item.amount;
                  member.bookings.add(item.bookingId);
                  if (
                    paidStatuses.has(
                      String(item.paymentStatus ?? '').toLowerCase(),
                    )
                  ) {
                    member.paid += item.amount;
                  } else {
                    member.pending += item.amount;
                  }
                  members.set(item.recipientUserId, member);
                  return members;
                },
                new Map<
                  string,
                  {
                    userId: string;
                    name: string;
                    commission: number;
                    paid: number;
                    pending: number;
                    bookings: Set<string>;
                  }
                >(),
              )
              .values(),
          ) as Array<{
            userId: string;
            name: string;
            commission: number;
            paid: number;
            pending: number;
            bookings: Set<string>;
          }>
        ).map((member) => ({
          ...member,
          bookings: member.bookings.size,
          achievedBrokerage: achievedBrokerageByUser.get(member.userId) ?? 0,
          commissionableBrokerage: Math.max(
            (achievedBrokerageByUser.get(member.userId) ?? 0) -
              targetForUser(member.userId),
            0,
          ),
        }))
      : [];
    const teamMemberProfiles = canViewTeam
      ? await this.db().user.findMany({
          where: { id: { in: recipientUserIds }, isActive: true },
          select: {
            id: true,
            fullName: true,
            email: true,
          },
          orderBy: { fullName: 'asc' },
        })
      : [];
    const teamLeads = canViewTeam
      ? await this.db().lead.findMany({
          where: {
            OR: [
              { ownerId: { in: recipientUserIds } },
              { telecallerId: { in: recipientUserIds } },
              { fieldExecutiveId: { in: recipientUserIds } },
            ],
          },
          select: { ownerId: true, telecallerId: true, fieldExecutiveId: true },
        })
      : [];
    const assignedLeadCount = new Map<string, number>();
    teamLeads.forEach((lead) => {
      new Set([lead.ownerId, lead.telecallerId, lead.fieldExecutiveId]).forEach(
        (userId) => {
          if (userId && recipientUserIds.includes(userId)) {
            assignedLeadCount.set(
              userId,
              (assignedLeadCount.get(userId) ?? 0) + 1,
            );
          }
        },
      );
    });
    const memberSummaryByUserId = new Map(
      memberSummaries.map((member) => [member.userId, member]),
    );
    const members = canViewTeam
      ? teamMemberProfiles.map((member) => {
          const summary = memberSummaryByUserId.get(member.id);
          return {
            userId: member.id,
            name: member.fullName ?? member.email,
            assignedLeads: assignedLeadCount.get(member.id) ?? 0,
            commission: summary?.commission ?? 0,
            paid: summary?.paid ?? 0,
            pending: summary?.pending ?? 0,
            bookings: summary?.bookings ?? 0,
            achievedBrokerage: achievedBrokerageByUser.get(member.id) ?? 0,
            justificationTarget: targetForUser(member.id),
            commissionableBrokerage: Math.max(
              (achievedBrokerageByUser.get(member.id) ?? 0) -
                targetForUser(member.id),
              0,
            ),
          };
        })
      : [];

    return {
      meta: {
        preset,
        scope: canViewTeam ? 'team' : 'mine',
        canViewTeam: canManageTeamScope && viewer?.visibilityScope !== 'OWN',
        canEdit: Boolean(viewer?.canEdit),
        teamName: leaderTeams[0]?.name ?? null,
        teamId: leaderTeams[0]?.id ?? profile?.teamId ?? null,
        page,
        limit,
        totalRows: history.length,
      },
      summary,
      target: {
        targetValue,
        achievedTarget,
        pendingTarget: Math.max(targetValue - achievedTarget, 0),
      },
      members,
      rows: history.slice(skip, skip + limit),
    };
  }

  async generateBookingFinanceReportPdf(query: Query, user?: Body) {
    const report = await this.getBookingFinanceReport(
      { ...query, page: '1', limit: '100' },
      user,
    );
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 28,
    });
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const navy = '#073763';
    const muted = '#64748b';
    doc.fontSize(9).fillColor(muted).text('Truroot Realty CRM', 28, 24);
    doc
      .fontSize(18)
      .fillColor(navy)
      .text('Brokerage & Incentive Report', 28, 42, { align: 'center' });
    doc
      .moveTo(28, 72)
      .lineTo(812, 72)
      .strokeColor('#ff6b00')
      .lineWidth(2)
      .stroke();
    doc
      .fontSize(9)
      .fillColor(muted)
      .text(
        `${new Date(report.meta.dateFrom).toLocaleDateString(
          'en-IN',
        )} - ${new Date(report.meta.dateTo).toLocaleDateString('en-IN')} · ${
          report.meta.scope
        } report`,
        28,
        82,
      );

    const summary = [
      ['Bookings', report.summary.bookings],
      [
        'Agreement Value',
        `INR ${Math.round(report.summary.agreementValue).toLocaleString(
          'en-IN',
        )}`,
      ],
      [
        'Total Brokerage',
        `INR ${Math.round(report.summary.totalBrokerage).toLocaleString(
          'en-IN',
        )}`,
      ],
      [
        'Pending Brokerage',
        `INR ${Math.round(report.summary.pendingBrokerage).toLocaleString(
          'en-IN',
        )}`,
      ],
      [
        'Received Brokerage',
        `INR ${Math.round(report.summary.receivedBrokerage).toLocaleString(
          'en-IN',
        )}`,
      ],
      [
        'Paid Commission',
        `INR ${Math.round(report.summary.paidCommission).toLocaleString(
          'en-IN',
        )}`,
      ],
    ];
    const cardWidth = 126;
    summary.forEach(([label, value], index) => {
      const x = 28 + index * (cardWidth + 5);
      doc.roundedRect(x, 108, cardWidth, 52, 4).strokeColor('#dbe4f0').stroke();
      doc
        .fontSize(8)
        .fillColor(muted)
        .text(String(label), x + 8, 119);
      doc
        .fontSize(12)
        .fillColor(navy)
        .text(String(value), x + 8, 136, {
          width: cardWidth - 16,
        });
    });

    const tableTop = 190;
    const columns = [
      ['Name', 150],
      ['Bookings', 54],
      ['Agreement', 86],
      ['Brokerage', 82],
      ['Received', 78],
      ['Pending', 78],
      ['Sales Inc.', 72],
      ['Pre-sales', 72],
      ['TL Inc.', 72],
      ['Latest', 70],
    ] as const;
    let x = 28;
    doc.rect(28, tableTop, 784, 24).fill('#073763');
    columns.forEach(([label, width]) => {
      doc
        .fontSize(7)
        .fillColor('#ffffff')
        .text(label, x + 4, tableTop + 8, {
          width: width - 8,
        });
      x += width;
    });
    let y = tableTop + 24;
    report.rows.forEach((row: Body, rowIndex: number) => {
      if (y > 540) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 28 });
        y = 40;
      }
      doc.rect(28, y, 784, 28).fill(rowIndex % 2 ? '#ffffff' : '#f8fafc');
      const values = [
        row.name,
        row.bookings,
        Math.round(row.agreementValue).toLocaleString('en-IN'),
        Math.round(row.totalBrokerage).toLocaleString('en-IN'),
        Math.round(row.receivedBrokerage).toLocaleString('en-IN'),
        Math.round(row.pendingBrokerage).toLocaleString('en-IN'),
        Math.round(row.salesIncentive).toLocaleString('en-IN'),
        Math.round(row.preSalesIncentive).toLocaleString('en-IN'),
        Math.round(row.teamLeaderIncentive).toLocaleString('en-IN'),
        row.latestBookingDate
          ? new Date(row.latestBookingDate).toLocaleDateString('en-IN')
          : '-',
      ];
      x = 28;
      values.forEach((value, index) => {
        const width = columns[index][1];
        doc
          .fontSize(7)
          .fillColor('#0f2744')
          .text(String(value), x + 4, y + 9, {
            width: width - 8,
            ellipsis: true,
          });
        x += width;
      });
      y += 28;
    });
    doc.end();
    return {
      filename: `brokerage-incentive-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`,
      pdfBuffer: await done,
    };
  }

  async listCommissionTargets(query: Query) {
    const year = Number(query.year ?? new Date().getFullYear());
    const month = query.month ? Number(query.month) : undefined;
    const targets = await this.db().userCommissionTarget.findMany({
      where: {
        year,
        ...(month ? { month } : {}),
        ...(query.userId && query.userId !== 'all'
          ? { userId: query.userId }
          : {}),
        ...(query.roleScope && query.roleScope !== 'all'
          ? { roleScope: query.roleScope }
          : {}),
      },
      include: {
        user: { include: { employeeProfile: { include: { team: true } } } },
      },
      orderBy: [{ year: 'desc' }, { month: 'asc' }],
    });
    return targets.map((target: Body) => ({
      id: target.id,
      userId: target.userId,
      userName: target.user?.fullName ?? target.user?.email,
      role: target.user?.role,
      teamName: target.user?.employeeProfile?.team?.name,
      roleScope: target.roleScope,
      year: target.year,
      month: target.month,
      targetValue: target.targetValue,
    }));
  }

  async upsertCommissionTarget(body: Body, user?: Body) {
    const userId = optionalString(body.userId);
    const roleScope = optionalString(body.roleScope);
    const year = Number(body.year);
    const month = Number(body.month);
    if (!userId || !roleScope || !year || !month) {
      throw new BadRequestException(
        'User, role scope, year and month are required',
      );
    }
    return this.db().userCommissionTarget.upsert({
      where: {
        userId_roleScope_year_month: { userId, roleScope, year, month },
      },
      create: {
        userId,
        roleScope,
        year,
        month,
        targetValue: Number(body.targetValue ?? 0),
        updatedById: user?.sub,
      },
      update: {
        targetValue: Number(body.targetValue ?? 0),
        updatedById: user?.sub,
      },
    });
  }

  async listIncentiveVisibilitySettings() {
    const settings = await this.db().incentiveVisibilitySetting.findMany({
      orderBy: { roleScope: 'asc' },
    });
    return settings;
  }

  async updateIncentiveVisibilitySettings(body: Body, user?: Body) {
    const items = Array.isArray(body.settings) ? body.settings : [];
    await this.db().$transaction(
      items.map((item: Body) =>
        this.db().incentiveVisibilitySetting.upsert({
          where: { roleScope: item.roleScope },
          create: {
            roleScope: item.roleScope,
            visibilityScope: item.visibilityScope ?? 'OWN',
            canEdit: Boolean(item.canEdit),
            updatedById: user?.sub,
          },
          update: {
            visibilityScope: item.visibilityScope ?? 'OWN',
            canEdit: Boolean(item.canEdit),
            updatedById: user?.sub,
          },
        }),
      ),
    );
    return this.listIncentiveVisibilitySettings();
  }

  async updateLead(id: string, body: Body, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    await this.assertLeadUpdateFieldsAllowed(body, actor);
    const current = await this.getLead(id, actor);
    await assertValidRoutingAssignees(
      this.db(),
      body.telecallerId !== current.telecallerId
        ? body.telecallerId
        : undefined,
      body.fieldExecutiveId !== current.fieldExecutiveId
        ? body.fieldExecutiveId
        : undefined,
      undefined,
      { allowBothExecutives: true },
    );
    await Promise.all(
      [body.ownerId, body.managerId, body.telecallerId, body.fieldExecutiveId]
        .filter((id): id is string => typeof id === 'string' && Boolean(id))
        .map((id) => this.assertUserWithinLeadScope(id, actor)),
    );
    const requestedStatus = body.statusId ?? body.leadStatus;
    const statusMaster = requestedStatus
      ? await this.resolveActiveLeadStatus(requestedStatus)
      : current.statusId
      ? await this.db().leadMasterValue.findFirst({
          where: {
            id: current.statusId,
            isActive: true,
            categoryRef: { code: { equals: 'status', mode: 'insensitive' } },
          },
          select: {
            id: true,
            name: true,
            code: true,
            triggerAction: true,
            allowFollowUp: true,
            manualScore: true,
          },
        })
      : null;
    const statusChanged =
      Boolean(requestedStatus && statusMaster) &&
      String(statusMaster?.id) !== String(current.statusId ?? '');
    if (
      statusChanged &&
      statusMaster &&
      this.isProtectedSiteVisitStatus(statusMaster)
    ) {
      throw new BadRequestException(
        this.isSiteVisitCompletionStatus(statusMaster)
          ? 'Complete the site visit from the Site Visits workspace before applying this lead status.'
          : 'Schedule the site visit before applying this lead status.',
      );
    }
    const statusScoreMeta = statusChanged ? statusMaster : null;
    const allowFollowUp = statusMaster?.allowFollowUp ?? true;
    const shouldMarkConverted = Boolean(
      body.markConverted ||
        (statusChanged &&
          statusMaster &&
          isConversionStatus(statusMaster) &&
          !current.convertedAt),
    );

    const remarksChanged =
      body.remarks !== undefined &&
      String(body.remarks ?? '').trim() !==
        String(current.remarks ?? '').trim();

    if (allowFollowUp && (statusChanged || remarksChanged)) {
      const incomingFollowUpDate = normalizeDate(
        body.nextFollowUpAt ?? body.followUpDate,
      );
      if (!incomingFollowUpDate && !current.nextFollowUpAt) {
        throw new BadRequestException(
          'A follow-up date is required when updating lead status or remarks.',
        );
      }
    }

    const calculatedNextFollowUpAt = allowFollowUp
      ? normalizeDate(body.nextFollowUpAt ?? body.followUpDate) ??
        current.nextFollowUpAt
      : null;

    const incomingProjectId =
      body.projectId !== undefined
        ? body.projectId
        : body.preferredProjectId !== undefined
        ? body.preferredProjectId
        : body.preferredProject !== undefined
        ? body.preferredProject
        : body.requirement?.projectId !== undefined
        ? body.requirement.projectId
        : body.requirement?.preferredProjectId;

    const resolvedProjectId =
      incomingProjectId !== undefined
        ? incomingProjectId
          ? String(incomingProjectId).trim()
          : null
        : undefined;

    const changedFields = [
      ['name', body.name ?? body.leadName],
      ['email', body.email ?? body.emailAddress],
      ['mobile', body.mobile ?? body.mobileNumber],
      ['source', body.sourceId ?? body.leadSource],
      ['stage', body.stageId ?? body.leadStage],
      ['status', body.statusId ?? body.leadStatus],
      ['priority', body.priorityId ?? body.priority],
      ['lead type', body.temperatureId],
      ['campaign', body.campaignId ?? body.campaign],
      ['telecaller', body.telecallerId],
      ['field executive', body.fieldExecutiveId],
      ['preferred project', incomingProjectId],
      ['preferred location', body.preferredLocation],
      ['configuration', body.configuration],
      [
        'budget',
        body.budgetRange ??
          (body.minBudget || body.maxBudget ? 'updated' : undefined),
      ],
      ['zone', body.zone],
      ['possession', body.possessionTimeline],
      [
        'carpet area',
        body.carpetAreaRange ??
          (body.minArea || body.maxArea ? 'updated' : undefined),
      ],
      ['follow-up', body.nextFollowUpAt ?? body.followUpDate],
      ['remarks', body.remarks],
    ]
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      )
      .map(([label]) => label);
    const lead = await this.db().lead.update({
      where: { id: current.id },
      data: {
        name: body.name ?? body.leadName,
        email: body.email ?? body.emailAddress,
        mobile: body.mobile ?? body.mobileNumber,
        sourceId: body.sourceId ?? body.leadSource,
        stageId: body.stageId ?? body.leadStage,
        statusId: requestedStatus ? statusMaster?.id : undefined,
        priorityId: body.priorityId ?? body.priority,
        campaignId: body.campaignId ?? body.campaign,
        temperatureId: body.temperatureId,
        interestLevel: body.interestLevel,
        remarks: body.remarks,
        managerId: body.managerId,
        telecallerId: body.telecallerId,
        fieldExecutiveId: body.fieldExecutiveId,
        lostReasonId: body.lostReasonId,
        lostCompetitor: body.lostCompetitor,
        lostAt:
          body.lostReasonId || body.lostCompetitor ? new Date() : undefined,
        convertedAt: shouldMarkConverted ? new Date() : undefined,
        nextFollowUpAt: calculatedNextFollowUpAt,
        requirement: {
          upsert: {
            create: {
              propertyType: body.propertyType,
              configuration: body.configuration,
              budgetRange: body.budgetRange,
              minBudget: normalizeMoney(body.minBudget),
              maxBudget: normalizeMoney(body.maxBudget),
              preferredLocation: body.preferredLocation,
              preferredProjectId: resolvedProjectId,
              possessionTimeline: body.possessionTimeline,
              carpetAreaRange: body.carpetAreaRange,
              purpose: body.purpose,
              minArea: normalizeMoney(body.minArea),
              maxArea: normalizeMoney(body.maxArea),
              zone: body.zone,
            },
            update: {
              propertyType: body.propertyType,
              configuration: body.configuration,
              budgetRange: body.budgetRange,
              minBudget: normalizeMoney(body.minBudget),
              maxBudget: normalizeMoney(body.maxBudget),
              preferredLocation: body.preferredLocation,
              preferredProjectId: resolvedProjectId,
              possessionTimeline: body.possessionTimeline,
              carpetAreaRange: body.carpetAreaRange,
              purpose: body.purpose,
              minArea: normalizeMoney(body.minArea),
              maxArea: normalizeMoney(body.maxArea),
              zone: body.zone,
            },
          },
        },
      },
      include: { requirement: true },
    });
    const statusScoreMetadata = await this.buildLeadStatusScoreMetadata(
      lead,
      statusChanged,
      statusScoreMeta,
    );
    await this.audit(actorUserId, 'LEAD_UPDATED', 'Lead', lead.id, body);
    await this.db()
      .activity.create({
        data: {
          leadId: lead.id,
          actorId: actorUserId,
          type: 'LEAD_UPDATED',
          title: 'Lead details updated',
          description: changedFields.length
            ? `Updated ${changedFields.slice(0, 5).join(', ')}${
                changedFields.length > 5
                  ? ` and ${changedFields.length - 5} more`
                  : ''
              }.`
            : 'Lead details were updated from the edit workspace.',
          metadata: {
            fields: changedFields,
            notifyTeam: Boolean(body.notifyTeam),
            statusName:
              statusChanged && statusScoreMeta
                ? statusScoreMeta.name
                : undefined,
            statusId:
              statusChanged && statusScoreMeta ? statusScoreMeta.id : undefined,
            ...statusScoreMetadata,
          },
        },
      })
      .catch(() => undefined);

    this.logger.log(
      `[BACKEND_LEAD_UPDATE_START] Target Lead ID: ${id} | Input StatusId: ${
        body.statusId ?? body.leadStatus ?? 'unchanged'
      } | Remarks: "${body.remarks ?? 'N/A'}" | Input PreferredProject: "${
        incomingProjectId ?? 'unchanged'
      }" | Actor: ${actorUserId ?? 'System'}`,
    );

    await this.recordLeadRemark(
      lead.id,
      this.remarkFromBody(body),
      actorUserId,
    );

    if (allowFollowUp && calculatedNextFollowUpAt) {
      await this.db().followUp.updateMany({
        where: {
          leadId: lead.id,
          completedAt: null,
          scheduledAt: { not: calculatedNextFollowUpAt },
        },
        data: {
          completedAt: new Date(),
          statusId: 'Completed',
          notes: 'Superseded by new follow-up date',
        },
      });

      const existingActiveFollowUp = await this.db().followUp.findFirst({
        where: {
          leadId: lead.id,
          completedAt: null,
          scheduledAt: calculatedNextFollowUpAt,
        },
      });

      if (!existingActiveFollowUp) {
        const assignedToId =
          lead.telecallerId ??
          lead.fieldExecutiveId ??
          lead.ownerId ??
          actorUserId;
        await this.db().followUp.create({
          data: {
            leadId: lead.id,
            assignedToId: assignedToId ?? actorUserId,
            typeId: 'Call',
            statusId: 'Scheduled',
            scheduledAt: calculatedNextFollowUpAt,
            nextAction: body.remarks || 'Follow-up',
            notes: body.remarks || undefined,
            setReminder: true,
          },
        });
      }
    }

    const leadProject = lead.requirement?.preferredProjectId
      ? await this.db().project.findUnique({
          where: { id: lead.requirement.preferredProjectId },
          select: { id: true, name: true },
        })
      : null;

    this.logger.log(
      `[BACKEND_LEAD_UPDATE_SUCCESS] Saved Lead ID: ${lead.id} (${
        lead.name
      }) | StatusID: ${lead.statusId ?? 'None'} | Linked Project Name: "${
        leadProject?.name ?? 'Not Linked'
      }" (ID: ${
        lead.requirement?.preferredProjectId ?? 'None'
      }) | NextFollowUpAt: ${lead.nextFollowUpAt?.toISOString() ?? 'None'}`,
    );

    return actor && typeof actor !== 'string'
      ? this.getLeadForViewer(lead.id, actor)
      : this.getLead(lead.id, actor);
  }

  private isAdminRole(role?: string | null) {
    return (
      role === 'SUPER_ADMIN' ||
      role === 'ADMIN' ||
      role === 'HR' ||
      role === 'SALES_MANAGER' ||
      role === 'MANAGER' ||
      role === 'TEAM_LEADER' ||
      role === 'BACKEND'
    );
  }

  private async assertLeadAssignedToEmployee(
    leadId: string,
    employeeId: string,
  ) {
    const lead = await this.db().lead.findFirst({
      where: {
        id: leadId,
        deletedAt: null,
        OR: [
          { ownerId: employeeId },
          { telecallerId: employeeId },
          { fieldExecutiveId: employeeId },
          { assignments: { some: { toUserId: employeeId, isCurrent: true } } },
        ],
      },
      select: { id: true },
    });
    if (!lead) {
      throw new BadRequestException(
        'Selected lead is not assigned to this employee',
      );
    }
  }

  private async taskAssigneeName(assignedToId?: string | null) {
    if (!assignedToId) return null;
    await this.tenantAccess.assertEmployee(assignedToId);
    const assignee = await this.db().user.findUnique({
      where: { id: assignedToId },
      select: { id: true, fullName: true, email: true, isActive: true },
    });
    if (!assignee?.isActive) {
      throw new BadRequestException('Select an active employee for this task');
    }
    return assignee.fullName ?? assignee.email ?? null;
  }

  private async createTaskRecord(
    body: Body,
    user?: Body,
    fixedLeadId?: string,
  ) {
    if (!body.title) {
      throw new BadRequestException('Task title is required');
    }
    if (!body.assignedToId) {
      throw new BadRequestException('Assigned user is required');
    }

    const leadId = fixedLeadId ?? body.leadId;
    const assignedToId = String(body.assignedToId);
    await this.assertUserWithinLeadScope(
      assignedToId,
      user,
      fixedLeadId ? 'leads' : 'tasks',
    );
    const assignedToName = await this.taskAssigneeName(assignedToId);
    let lead: Body | null = null;
    if (leadId) {
      lead = await this.getLead(String(leadId), user);
      await this.assertLeadAssignedToEmployee(lead.id, assignedToId);
    }

    const task = await this.db().task.create({
      data: {
        leadId: lead?.id,
        title: String(body.title),
        description: body.description ? String(body.description) : null,
        type: body.type ? String(body.type) : null,
        priority: body.priority ? String(body.priority) : 'Medium',
        status: normalizeTaskStatus(body.status),
        dueAt: normalizeDate(body.dueAt ?? body.dueDate),
        assignedToId,
        createdById: user?.sub,
        completedAt:
          normalizeTaskStatus(body.status) === 'Completed' ? new Date() : null,
      },
    });

    await Promise.all([
      this.audit(user?.sub, 'LEAD_TASK_CREATED', 'Task', task.id, {
        leadId: lead?.id,
        assignedToId: task.assignedToId,
      }),
      lead
        ? this.db().activity.create({
            data: {
              leadId: lead.id,
              actorId: user?.sub,
              type: 'LEAD_TASK_CREATED',
              title: 'Task created',
              description: `${task.title} assigned to ${
                assignedToName ?? 'team member'
              }`,
              metadata: {
                taskId: task.id,
                assignedToId: task.assignedToId,
                status: task.status,
                priority: task.priority,
              },
            },
          })
        : Promise.resolve(undefined),
    ]);

    return {
      ...task,
      assignedToName,
      leadDisplayId: lead?.displayId,
      leadName: lead?.name,
    };
  }

  async createTask(leadId: string, body: Body, user?: Body) {
    return this.createTaskRecord(body, user, leadId);
  }

  async createNote(leadId: string, body: Body, user?: Body) {
    if (!body.text || !String(body.text).trim()) {
      throw new BadRequestException('Note text is required');
    }

    const lead = await this.getLead(leadId, user);
    const text = String(body.text).trim();

    const note = await this.db().note.create({
      data: {
        leadId: lead.id,
        text,
        authorId: user?.sub ?? null,
        isPinned: body.isPinned === true || body.isPinned === 'true',
      },
    });

    await this.syncLeadLatestRemark(lead.id, text);

    await Promise.all([
      this.audit(user?.sub, 'LEAD_NOTE_CREATED', 'Note', note.id, {
        leadId: lead.id,
      }),
      this.db().activity.create({
        data: {
          leadId: lead.id,
          actorId: user?.sub,
          type: 'LEAD_NOTE_CREATED',
          title: 'Note added',
          description:
            note.text.length > 80 ? `${note.text.slice(0, 80)}...` : note.text,
          metadata: {
            noteId: note.id,
            isPinned: note.isPinned,
          },
        },
      }),
    ]).catch(() => undefined);

    return note;
  }

  async updateTask(leadId: string, taskId: string, body: Body, user?: Body) {
    const lead = await this.getLead(leadId, user);
    const existing = await this.db().task.findFirst({
      where: { id: taskId, leadId: lead.id },
    });
    if (!existing) {
      throw new NotFoundException('Task not found');
    }

    let assignedUserName: string | null = null;
    if (body.assignedToId) {
      await this.assertUserWithinLeadScope(String(body.assignedToId), user);
      await this.assertLeadAssignedToEmployee(
        lead.id,
        String(body.assignedToId),
      );
      assignedUserName = await this.taskAssigneeName(String(body.assignedToId));
    }
    const nextStatus =
      body.status !== undefined
        ? normalizeTaskStatus(body.status)
        : existing.status;

    const task = await this.db().task.update({
      where: { id: existing.id },
      data: {
        title: body.title ?? existing.title,
        description:
          body.description === null
            ? null
            : body.description !== undefined
            ? String(body.description)
            : existing.description,
        type:
          body.type === null
            ? null
            : body.type !== undefined
            ? String(body.type)
            : existing.type,
        priority:
          body.priority !== undefined
            ? String(body.priority)
            : existing.priority,
        status: nextStatus,
        completedAt:
          nextStatus === 'Completed'
            ? existing.completedAt ?? new Date()
            : body.status !== undefined
            ? null
            : existing.completedAt,
        dueAt:
          body.dueAt !== undefined || body.dueDate !== undefined
            ? normalizeDate(body.dueAt ?? body.dueDate)
            : existing.dueAt,
        assignedToId:
          body.assignedToId !== undefined
            ? String(body.assignedToId)
            : existing.assignedToId,
      },
    });

    await Promise.all([
      this.audit(user?.sub, 'LEAD_TASK_UPDATED', 'Task', task.id, {
        leadId: lead.id,
      }),
      this.db().activity.create({
        data: {
          leadId: lead.id,
          actorId: user?.sub,
          type: 'LEAD_TASK_UPDATED',
          title: 'Task updated',
          description:
            body.status === 'Completed'
              ? `${task.title} marked completed`
              : `${task.title} updated`,
          metadata: {
            taskId: task.id,
            assignedToId: task.assignedToId,
            assignedToName: assignedUserName,
            status: task.status,
            priority: task.priority,
          },
        },
      }),
    ]);

    return {
      ...task,
      assignedToName: assignedUserName,
    };
  }

  async listTasks(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const where: Body = { AND: [await this.taskTenantWhere()] };
    const scopedUserIds = await this.taskAssignmentScopeUserIds(user);
    if (scopedUserIds !== null) {
      if (query.assignedToId && query.assignedToId !== 'all') {
        const requestedId = String(query.assignedToId);
        if (scopedUserIds.includes(requestedId)) {
          where.assignedToId = requestedId;
        } else {
          where.assignedToId = { in: [] };
        }
      } else {
        where.assignedToId = { in: scopedUserIds };
      }
    } else if (query.assignedToId && query.assignedToId !== 'all') {
      where.assignedToId = String(query.assignedToId);
    }
    if (query.status && query.status !== 'all') {
      where.status = normalizeTaskStatus(query.status);
    }
    if (query.leadId && query.leadId !== 'all') {
      where.leadId = String(query.leadId);
    }
    if (query.from || query.to) {
      where.dueAt = {};
      const from = normalizeDate(query.from);
      const to = normalizeDate(query.to);
      if (from) where.dueAt.gte = from;
      if (to) where.dueAt.lte = to;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: String(query.search), mode: 'insensitive' } },
        {
          description: {
            contains: String(query.search),
            mode: 'insensitive',
          },
        },
        {
          lead: {
            is: {
              OR: [
                {
                  name: {
                    contains: String(query.search),
                    mode: 'insensitive',
                  },
                },
                {
                  displayId: {
                    contains: String(query.search),
                    mode: 'insensitive',
                  },
                },
              ],
            },
          },
        },
      ];
    }
    where.AND = [
      ...(where.AND ?? []),
      { OR: [{ leadId: null }, { lead: { is: { deletedAt: null } } }] },
    ];
    if (user?.role === 'HR') {
      const leadUserIds =
        await this.leadVisibility.resolveAssignmentScopeUserIds(user);
      if (leadUserIds !== null) {
        where.AND.push({
          OR: [
            { leadId: null },
            { lead: { is: this.leadVisibility.assignmentScope(leadUserIds) } },
          ],
        });
      }
    }

    const [items, total] = await Promise.all([
      this.db().task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        include: { lead: { include: { requirement: true } } },
      }),
      this.db().task.count({ where }),
    ]);

    const userIds = Array.from(
      new Set(
        items.flatMap((task: Body) => [task.assignedToId, task.createdById]),
      ),
    ).filter(Boolean) as string[];
    const users = userIds.length
      ? await this.db().user.findMany({
          where: {
            AND: [this.tenantAccess.employeeWhere(), { id: { in: userIds } }],
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
          },
        })
      : [];
    const userMap = new Map<string, Body>(
      users.map((item: Body) => [String(item.id), item]),
    );

    return {
      data: items.map((task: Body) => ({
        id: task.id,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        status: normalizeTaskStatus(task.status),
        dueAt: task.dueAt,
        completedAt: task.completedAt,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        assignedToId: task.assignedToId,
        assignedToName: task.assignedToId
          ? userMap.get(task.assignedToId)?.fullName ??
            userMap.get(task.assignedToId)?.email
          : undefined,
        assignedToRole: task.assignedToId
          ? userMap.get(task.assignedToId)?.role
          : undefined,
        assignedToImage: task.assignedToId
          ? userMap.get(task.assignedToId)?.avatarStorageKey
          : undefined,
        createdById: task.createdById,
        createdByName: task.createdById
          ? userMap.get(task.createdById)?.fullName ??
            userMap.get(task.createdById)?.email
          : undefined,
        leadId: task.leadId,
        leadDisplayId: task.lead?.displayId,
        leadName: task.lead?.name,
        leadMobile: task.lead?.mobile,
        leadRequirement:
          [
            task.lead?.requirement?.configuration,
            task.lead?.requirement?.propertyType,
          ]
            .filter(Boolean)
            .join(' ') || undefined,
        leadLocation: task.lead?.requirement?.preferredLocation,
      })),
      meta: { page, limit, total },
    };
  }

  async createEmployeeTask(body: Body, user?: Body) {
    return this.createTaskRecord(body, user);
  }

  async updateEmployeeTask(id: string, body: Body, user?: Body) {
    const existing = await this.db().task.findFirst({
      where: {
        id,
        AND: [await this.taskTenantWhere()],
        OR: [{ leadId: null }, { lead: { is: { deletedAt: null } } }],
      },
    });
    if (!existing) throw new NotFoundException('Task not found');
    const scopedUserIds = await this.taskAssignmentScopeUserIds(user);
    const canManage =
      scopedUserIds === null ||
      (Boolean(existing.assignedToId) &&
        scopedUserIds.includes(existing.assignedToId!)) ||
      (!existing.assignedToId && existing.createdById === user?.sub);
    if (!canManage) {
      throw new ForbiddenException('You cannot update this task');
    }
    if (existing.leadId) await this.getLead(existing.leadId, user);

    const nextAssignedToId =
      body.assignedToId !== undefined
        ? String(body.assignedToId)
        : existing.assignedToId;
    if (nextAssignedToId) {
      await this.assertUserWithinLeadScope(nextAssignedToId, user, 'tasks');
      if (nextAssignedToId !== existing.assignedToId) {
        await this.taskAssigneeName(nextAssignedToId);
      }
    } else if (body.assignedToId !== undefined) {
      throw new BadRequestException('Assigned user is required');
    }
    if (body.leadId && nextAssignedToId) {
      const lead = await this.getLead(String(body.leadId), user);
      await this.assertLeadAssignedToEmployee(lead.id, nextAssignedToId);
    }
    if (existing.leadId && nextAssignedToId) {
      await this.assertLeadAssignedToEmployee(
        existing.leadId,
        nextAssignedToId,
      );
    }

    const nextStatus =
      body.status !== undefined
        ? normalizeTaskStatus(body.status)
        : existing.status;
    const task = await this.db().task.update({
      where: { id: existing.id },
      data: {
        title: body.title !== undefined ? String(body.title) : existing.title,
        description:
          body.description !== undefined
            ? body.description === null
              ? null
              : String(body.description)
            : existing.description,
        type: body.type !== undefined ? String(body.type) : existing.type,
        priority:
          body.priority !== undefined
            ? String(body.priority)
            : existing.priority,
        status: nextStatus,
        dueAt:
          body.dueAt !== undefined || body.dueDate !== undefined
            ? normalizeDate(body.dueAt ?? body.dueDate)
            : existing.dueAt,
        assignedToId: nextAssignedToId,
        completedAt:
          nextStatus === 'Completed'
            ? existing.completedAt ?? new Date()
            : body.status !== undefined
            ? null
            : existing.completedAt,
      },
    });
    await this.audit(user?.sub, 'EMPLOYEE_TASK_UPDATED', 'Task', task.id, {
      assignedToId: task.assignedToId,
      status: task.status,
    });
    return task;
  }

  async deleteEmployeeTask(id: string, user?: Body) {
    const existing = await this.db().task.findFirst({
      where: { id, AND: [await this.taskTenantWhere()] },
    });
    if (!existing) throw new NotFoundException('Task not found');
    const scopedUserIds = await this.taskAssignmentScopeUserIds(user);
    const canManage =
      scopedUserIds === null ||
      (Boolean(existing.assignedToId) &&
        scopedUserIds.includes(existing.assignedToId!)) ||
      (!existing.assignedToId && existing.createdById === user?.sub);
    if (!canManage) {
      throw new ForbiddenException('You cannot delete this task');
    }
    if (existing.leadId) await this.getLead(existing.leadId, user);

    await this.db().task.delete({
      where: { id: existing.id },
    });

    await this.audit(user?.sub, 'EMPLOYEE_TASK_DELETED', 'Task', id, {
      title: existing.title,
    });

    return { success: true, message: 'Task deleted successfully' };
  }

  async deleteTask(leadId: string, taskId: string, user?: Body) {
    const lead = await this.getLead(leadId, user);
    const existing = await this.db().task.findFirst({
      where: { id: taskId, leadId: lead.id },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const admin = this.isAdminRole(user?.role);
    const canManage =
      admin ||
      existing.createdById === user?.sub ||
      existing.assignedToId === user?.sub;
    if (!canManage) {
      throw new ForbiddenException('You cannot delete this task');
    }

    await this.db().task.delete({
      where: { id: existing.id },
    });

    await this.audit(user?.sub, 'LEAD_TASK_DELETED', 'Task', taskId, {
      leadId: lead.id,
      title: existing.title,
    });

    return { success: true, message: 'Task deleted successfully' };
  }

  async moveLeadInPipeline(id: string, body: Body, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    if (!body.statusId)
      throw new BadRequestException('Target status is required');
    const current = await this.getLead(id, actor);
    const status = await this.resolveActiveLeadStatus(body.statusId);

    const statusName = String(status.name).toLowerCase();
    const shouldCreateSiteVisit =
      String(status.triggerAction).toUpperCase() === 'CREATE_SITE_VISIT';
    if (this.isSiteVisitCompletionStatus(status)) {
      throw new BadRequestException(
        'Complete the site visit from the Site Visits workspace before applying this lead status.',
      );
    }
    const shouldConvert = isConversionStatus(status);
    if (statusName.includes('lost') && !body.lostReasonId && !body.lostReason) {
      throw new BadRequestException('Lost reason is required');
    }

    const bookingAmount = normalizeMoney(body.bookingAmount);
    const bookingDate = normalizeDate(body.bookingDate);
    if (shouldConvert) {
      if (!body.projectId) {
        throw new BadRequestException('Project is required to convert lead');
      }
      if (!body.unitId) {
        throw new BadRequestException('Unit is required to convert lead');
      }
      if (!bookingAmount || bookingAmount <= 0) {
        throw new BadRequestException('Valid booking amount is required');
      }
      if (!bookingDate) {
        throw new BadRequestException('Valid booking date is required');
      }
    }

    const allowFollowUp = status.allowFollowUp ?? true;
    const calculatedNextFollowUpAt = allowFollowUp
      ? normalizeDate(
          body.nextFollowUpAt ?? body.followUpDate ?? body.scheduledAt,
        ) ?? current.nextFollowUpAt
      : null;

    const result = await this.db().$transaction(
      async (tx: Prisma.TransactionClient) => {
        const lead = await tx.lead.update({
          where: { id: current.id },
          data: {
            statusId: status.id,
            stageId: body.stageId,
            lostReasonId: body.lostReasonId,
            lostCompetitor: body.lostCompetitor,
            lostAt: statusName.includes('lost') ? new Date() : undefined,
            convertedAt: shouldConvert ? new Date() : undefined,
            nextFollowUpAt: calculatedNextFollowUpAt,
          },
        });

        if (shouldCreateSiteVisit) {
          if (!body.projectId || !body.scheduledAt) {
            throw new BadRequestException(
              'Project and a valid visit schedule are required for a site visit',
            );
          }
          const { fieldExecutiveId } = await this.resolveSiteVisitAssignment(
            current.id,
            actorUserId,
            tx,
          );
          await tx.siteVisit.create({
            data: {
              displayId: `SV-${Date.now()}`,
              leadId: current.id,
              projectId: body.projectId,
              unitId: body.unitId,
              scheduledAt: normalizeDate(body.scheduledAt) ?? new Date(),
              assignedExecutiveId: fieldExecutiveId,
              status: 'Scheduled',
              visitType: body.visitType ?? 'Site Visit',
              durationMinutes: Number(body.durationMinutes) || undefined,
              meetingPoint: body.meetingPoint,
              transportMode: body.transportMode,
              visitorCount: Number(body.visitorCount) || undefined,
              specialRequest: body.specialRequest,
              notes: body.notes,
              createdById: actorUserId,
            },
          });
        }

        if (shouldConvert) {
          const booking = await this.createBookingRecord(
            tx,
            current.id,
            body,
            { sub: actorUserId },
            'Booked',
          );
          await tx.projectUnit.update({
            where: { id: booking.unitId },
            data: { availability: 'Booked', bookingStatus: 'Booked' },
          });
        }

        await tx.activity.create({
          data: {
            lead: { connect: { id: current.id } },
            actorId: actorUserId,
            type: shouldConvert ? 'Conversion' : 'Status Change',
            title: shouldConvert
              ? `Converted lead to ${status.name}`
              : `Moved to ${status.name}`,
            description: body.notes,
            metadata: {
              fromStatusId: current.statusId,
              toStatusId: status.id,
              projectId: body.projectId,
              unitId: body.unitId,
            },
          },
        });

        return lead;
      },
    );

    await this.audit(actorUserId, 'LEAD_PIPELINE_MOVED', 'Lead', current.id, {
      fromStatusId: current.statusId,
      toStatusId: status.id,
      converted: shouldConvert,
    });
    const pipelineStatusChanged =
      String(current.statusId ?? '') !== String(status.id);
    const statusScoreMetadata = await this.buildLeadStatusScoreMetadata(
      result,
      pipelineStatusChanged,
      status,
    );
    await this.db()
      .activity.create({
        data: {
          leadId: current.id,
          actorId: actorUserId,
          type: 'LEAD_UPDATED',
          title: 'Lead status updated',
          description: `Lead status was changed to ${status.name}`,
          metadata: {
            fields: ['status'],
            fromStatusId: current.statusId,
            statusId: status.id,
            statusName: status.name,
            ...statusScoreMetadata,
          },
        },
      })
      .catch(() => undefined);
    return result;
  }

  async assignLead(id: string, body: Body, actor?: string | Body) {
    if (!this.assignmentTransaction.getStore()) {
      const lead = await this.getLead(id, actor);
      return this.withAssignmentTransaction(String(lead.id), () =>
        this.assignLead(lead.id, body, actor),
      );
    }
    const actorUserId = this.actorIdFrom(actor);
    const current = await this.getLead(id, actor);
    const toUserId =
      body.toUserId ??
      body.assigneeId ??
      body.telecallerId ??
      body.fieldExecutiveId;
    const assigneeType =
      body.assigneeType === 'field-executive'
        ? 'field-executive'
        : 'telecaller';
    const assignmentStrategy = String(body.strategy ?? '');
    const isAutoRouteAssignment = ['auto-assignment', 'auto-transfer'].includes(
      assignmentStrategy,
    );
    const previousAssigneeId = isAutoRouteAssignment
      ? current.ownerId ?? current.telecallerId ?? current.fieldExecutiveId
      : assigneeType === 'field-executive'
      ? current.fieldExecutiveId
      : current.telecallerId;
    const isDuplicateAssign = body.strategy === 'duplicate-assign';
    const isSameAssignment = isAutoRouteAssignment
      ? previousAssigneeId === toUserId
      : (assigneeType === 'field-executive' &&
          current.fieldExecutiveId === toUserId) ||
        (assigneeType !== 'field-executive' &&
          current.telecallerId === toUserId);
    if (!toUserId) throw new BadRequestException('Assignee is required');
    await this.assertUserWithinLeadScope(String(toUserId), actor);
    if (isSameAssignment && isDuplicateAssign) {
      return {
        leadId: current.id,
        toUserId,
        assigneeType,
        skipped: true,
        applied: false,
        skipReason: 'already-assigned',
      };
    }
    if (isSameAssignment) {
      throw new BadRequestException(
        `Lead is already assigned to this ${
          assigneeType === 'field-executive'
            ? 'field executive'
            : 'Pre Sales user'
        }`,
      );
    }

    const [targetUser, actorUser, previousAssignee] = await Promise.all([
      this.db().user.findUnique({
        where: { id: String(toUserId) },
        select: { id: true, fullName: true, role: true, email: true },
      }),
      actorUserId
        ? this.db().user.findUnique({
            where: { id: actorUserId },
            select: { id: true, fullName: true, role: true },
          })
        : Promise.resolve(null),
      previousAssigneeId
        ? this.db().user.findUnique({
            where: { id: previousAssigneeId },
            select: { id: true, fullName: true, email: true },
          })
        : Promise.resolve(null),
    ]);

    if (!targetUser) {
      throw new BadRequestException('Selected assignee is invalid');
    }

    // Keep management ownership routing compatible, but never put a Sales
    // Agent in Pre Sales (or a Telecaller in Sales), even through direct calls.
    if (
      targetUser.role === Role.SALES_AGENT ||
      targetUser.role === Role.TELECALLER
    ) {
      await assertValidRoutingAssignees(
        this.db(),
        assigneeType === 'telecaller' ? String(toUserId) : undefined,
        assigneeType === 'field-executive' ? String(toUserId) : undefined,
      );
    }

    await this.db().leadAssignment.updateMany({
      where: { leadId: current.id, isCurrent: true },
      data: { isCurrent: false },
    });
    const assignment = await this.db().leadAssignment.create({
      data: {
        leadId: current.id,
        fromUserId: previousAssigneeId,
        toUserId,
        assigneeType,
        strategy: body.strategy,
        reason: body.reason,
        assignedById: actorUserId,
      },
    });
    const nextOwnerId = isAutoRouteAssignment
      ? toUserId
      : assigneeType === 'field-executive'
      ? current.telecallerId ?? current.ownerId ?? toUserId
      : toUserId;
    const shouldClearTelecaller =
      isAutoRouteAssignment &&
      assigneeType === 'field-executive' &&
      current.telecallerId === previousAssigneeId;
    const shouldClearFieldExecutive =
      isAutoRouteAssignment &&
      assigneeType === 'telecaller' &&
      current.fieldExecutiveId === previousAssigneeId;

    const updatedLead = await this.db().lead.update({
      where: { id: current.id },
      data: {
        ownerId: nextOwnerId,
        telecallerId:
          assigneeType === 'field-executive'
            ? shouldClearTelecaller
              ? null
              : current.telecallerId
            : toUserId,
        fieldExecutiveId:
          assigneeType === 'field-executive'
            ? toUserId
            : shouldClearFieldExecutive
            ? null
            : current.fieldExecutiveId,
        assignedAt: new Date(),
      },
    });
    const isReassignment = Boolean(previousAssigneeId);
    const previousAssigneeLabel =
      previousAssignee?.fullName ?? previousAssignee?.email ?? 'Unassigned';
    const targetUserLabel =
      targetUser.fullName ?? targetUser.email ?? 'assignee';
    const activityDescription = body.notes ?? body.reason ?? null;
    await this.db().activity.create({
      data: {
        leadId: current.id,
        actorId: actorUserId,
        type: isReassignment ? 'Lead Reassigned' : 'Lead Assigned',
        title: isReassignment
          ? `Lead reassigned to ${targetUserLabel}`
          : `Lead assigned to ${targetUserLabel}`,
        description:
          activityDescription ??
          (isReassignment
            ? `Reassigned from ${previousAssigneeLabel} to ${targetUserLabel}`
            : `Assigned to ${targetUserLabel}`),
        metadata: {
          fromUserId: previousAssigneeId,
          toUserId: targetUser.id,
          reason: body.reason ?? null,
          notes: body.notes ?? null,
          assigneeType,
        },
      },
    });
    const assignmentNavigation = this.buildNotificationNavigationPayload(
      targetUser.role,
      'all-leads',
      {
        leadId: current.id,
        leadDisplayId: current.displayId ?? current.id,
      },
    );
    const assignmentPushPayload = await this.createNotificationWithNavigation(
      {
        userId: targetUser.id,
        type: isReassignment ? 'lead-reassigned' : 'lead-assigned',
        title: isReassignment ? 'Lead reassigned to you' : 'New lead assigned',
        description: `${current.name} (${
          current.displayId ?? current.id
        }) has been ${isReassignment ? 'reassigned' : 'assigned'} to you.`,
        badge: assigneeType,
        message: body.reason
          ? `Reason: ${body.reason}${body.notes ? ` | ${body.notes}` : ''}`
          : body.notes ?? 'Open the CRM to review the lead context.',
        entityType: 'Lead',
        entityId: current.id,
        details: {
          leadName: current.name,
          reason: body.reason ?? null,
          notes: body.notes ?? null,
          assignedBy: actorUser?.fullName ?? null,
          assigneeType,
        },
      },
      assignmentNavigation,
    );
    if (targetUser?.id) {
      this.sendPushNotification(
        targetUser.id,
        {
          title: isReassignment
            ? 'Lead reassigned to you'
            : 'New lead assigned',
          body: `${current.name} (${
            current.displayId ?? current.id
          }) has been ${isReassignment ? 'reassigned' : 'assigned'} to you.`,
          type: isReassignment ? 'lead-reassigned' : 'lead-assigned',
          data: {
            leadName: current.name,
            assigneeType,
            ...assignmentPushPayload,
          },
        },
        { organizationId: current.organizationId },
      ).catch((err) =>
        this.logger.warn(`Push notify error on lead assign: ${err?.message}`),
      );
    }
    await this.audit(
      actorUserId,
      'LEAD_ASSIGNED',
      'Lead',
      current.id,
      assignment,
    );
    await this.db().activity.create({
      data: {
        leadId: current.id,
        actorId: actorUserId,
        type: isReassignment ? 'LEAD_REASSIGNED' : 'LEAD_ASSIGNED',
        title: isReassignment ? 'Lead reassigned' : 'Lead assigned',
        description: isReassignment
          ? `Lead ownership was reassigned from ${previousAssigneeLabel} to ${targetUserLabel}`
          : `Lead ownership was assigned to ${targetUserLabel}`,
      },
    });
    if (!isAutoRouteAssignment && updatedLead.ownerId === toUserId) {
      await this.syncAutoAssignmentEventForAssignee(
        { ...current, ...updatedLead },
        String(toUserId),
      );
    }
    return assignment;
  }

  async bulkAssign(body: Body, actor?: string | Body) {
    const assigneeField =
      body.assigneeType === 'field-executive'
        ? { fieldExecutiveId: 'updated' }
        : { telecallerId: 'updated' };
    await this.assertLeadUpdateFieldsAllowed(assigneeField, actor);
    const leadIds = Array.isArray(body.leadIds) ? body.leadIds : [];
    const results = [];
    for (const leadId of leadIds) {
      results.push(await this.assignLead(leadId, body, actor));
    }
    const appliedAssignments = results.filter(
      (result: Body) => !result?.skipped,
    ).length;
    const skippedAssignments = results.filter(
      (result: Body) => result?.skipped,
    ).length;
    return {
      data: results,
      meta: {
        total: results.length,
        appliedAssignments,
        skippedAssignments,
      },
    };
  }

  private remarkFromBody(body: Body): string | undefined {
    if (Object.prototype.hasOwnProperty.call(body, 'remarks')) {
      return String(body.remarks ?? '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
      return String(body.notes ?? '').trim();
    }
    return undefined;
  }

  /**
   * Lead.remarks is the latest table value. Notes are the durable remark history.
   * Keep both in sync for every workflow that submits a remark.
   */
  private async recordLeadRemark(
    leadId: string,
    remark: string | undefined,
    authorId?: string | null,
  ) {
    const text = String(remark ?? '').trim();
    if (!text) return null;

    this.logger.log(
      `[BACKEND_RECORD_REMARK] Lead ID: ${leadId} | Remark: "${text}" | Author: ${
        authorId ?? 'System'
      }`,
    );

    // The remark dialog posts a Note before creating its optional reminder.
    // Reuse that immediate note so one user action produces one history entry.
    const recentSince = new Date(Date.now() - 5_000);
    const existingNote = await this.db().note.findFirst({
      where: {
        leadId,
        text,
        ...(authorId ? { authorId } : {}),
        createdAt: { gte: recentSince },
      },
      orderBy: { createdAt: 'desc' },
    });
    const note =
      existingNote ??
      (await this.db().note.create({
        data: {
          leadId,
          text,
          authorId: authorId ?? null,
          isPinned: false,
        },
      }));

    await this.db().lead.update({
      where: { id: leadId },
      data: { remarks: text },
    });
    return note;
  }

  private async syncLeadLatestRemark(leadId: string, preferredRemark?: string) {
    const trimmedPreferred = String(preferredRemark ?? '').trim();
    if (trimmedPreferred) {
      await this.db().lead.update({
        where: { id: leadId },
        data: { remarks: trimmedPreferred },
      });
      return trimmedPreferred;
    }

    const [latestNote, latestFollowUp] = await Promise.all([
      this.db().note.findFirst({
        where: {
          leadId,
          text: { not: '' },
        },
        orderBy: { updatedAt: 'desc' },
        select: { text: true, updatedAt: true },
      }),
      this.db().followUp.findFirst({
        where: {
          leadId,
          notes: { not: null },
          NOT: { notes: '' },
        },
        orderBy: { updatedAt: 'desc' },
        select: { notes: true, updatedAt: true },
      }),
    ]);

    const latestRemark =
      latestFollowUp?.updatedAt &&
      (!latestNote?.updatedAt ||
        latestFollowUp.updatedAt > latestNote.updatedAt)
        ? latestFollowUp.notes?.trim()
        : latestNote?.text?.trim();

    await this.db().lead.update({
      where: { id: leadId },
      data: { remarks: latestRemark || null },
    });
    return latestRemark || null;
  }

  private async assertLeadStatusAllowsFollowUp(leadId: string) {
    const lead = await this.db().lead.findUnique({
      where: { id: leadId },
      select: { statusId: true },
    });

    if (!lead?.statusId) return;

    const status = await this.db().leadMasterValue.findUnique({
      where: { id: lead.statusId },
      select: { name: true, allowFollowUp: true },
    });

    if (status?.allowFollowUp === false) {
      throw new BadRequestException(
        `Follow-up creation is disabled for ${status.name ?? 'this'} status`,
      );
    }
  }

  async createFollowUp(leadId: string, body: Body, actor?: string | Body) {
    const actorUserId = typeof actor === 'string' ? actor : actor?.sub;
    const actorRole = typeof actor === 'string' ? undefined : actor?.role;
    const lead = await this.getLead(
      leadId,
      typeof actor === 'string' ? undefined : actor,
    );
    await this.assertLeadStatusAllowsFollowUp(lead.id);
    const scheduledAt = normalizeDate(
      body.scheduledAt ??
        `${body.followUpDate ?? ''} ${body.followUpTime ?? ''}`,
    );
    if (!scheduledAt)
      throw new BadRequestException('Valid follow-up date/time is required');
    const assignedToId =
      actorRole === 'SALES_AGENT'
        ? actorUserId
        : actorRole === 'TELECALLER'
        ? actorUserId
        : optionalString(body.assignedToId) ??
          lead.telecallerId ??
          lead.fieldExecutiveId ??
          lead.ownerId ??
          actorUserId;
    if (assignedToId) {
      await this.assertUserWithinLeadScope(String(assignedToId), actor);
    }
    const followUpRemark = this.remarkFromBody(body);
    const followUpTypeId =
      actorRole === 'TELECALLER'
        ? 'Call'
        : optionalString(body.typeId) ??
          optionalString(body.followUpType) ??
          'Call';
    const followUpStatusId =
      optionalString(body.statusId) ??
      optionalString(body.status) ??
      'Scheduled';
    const nextAction =
      optionalString(body.nextAction) ?? followUpRemark ?? 'Follow-up';

    const existingActiveFollowUps =
      (await this.db().followUp.findMany?.({
        where: {
          leadId: lead.id,
          completedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      })) ?? [];

    let followUp;
    if (existingActiveFollowUps.length > 0) {
      const [primary, ...duplicates] = existingActiveFollowUps;
      followUp = await this.db().followUp.update({
        where: { id: primary.id },
        data: {
          assignedToId,
          typeId: followUpTypeId,
          statusId: followUpStatusId,
          scheduledAt,
          nextAction,
          notes: followUpRemark || primary.notes || undefined,
          slaDueAt: normalizeDate(body.slaDueAt) ?? primary.slaDueAt,
          setReminder: true,
          reminderSentAt: null,
        },
      });
      if (duplicates.length > 0) {
        await this.db().followUp.deleteMany({
          where: { id: { in: duplicates.map((d) => d.id) } },
        });
      }
    } else {
      followUp = await this.db().followUp.create({
        data: {
          leadId: lead.id,
          assignedToId,
          typeId: followUpTypeId,
          statusId: followUpStatusId,
          scheduledAt,
          nextAction,
          notes: followUpRemark || undefined,
          slaDueAt: normalizeDate(body.slaDueAt),
          setReminder: true,
          reminderSentAt: null,
        },
      });
    }
    await this.db().lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: scheduledAt },
    });
    await this.recordLeadRemark(lead.id, followUpRemark, actorUserId);
    await this.audit(
      actorUserId,
      'FOLLOW_UP_CREATED',
      'FollowUp',
      followUp.id,
      { leadId: lead.id },
    );
    await this.db()
      .activity.create({
        data: {
          leadId: lead.id,
          actorId: actorUserId,
          type: 'FOLLOW_UP_CREATED',
          title: 'Follow-up created',
          description: `A ${String(
            followUpTypeId ?? 'follow-up',
          ).trim()} follow-up was scheduled for ${this.formatFollowUpSchedule(
            scheduledAt,
          )}.`,
          metadata: {
            followUpId: followUp.id,
            assignedToId,
            scheduledAt,
            nextAction: nextAction ?? null,
          },
        },
      })
      .catch(() => undefined);
    await this.createFollowUpNotification({
      recipientUserId: assignedToId,
      lead,
      followUp,
      actorUserId,
      event: 'created',
      note: nextAction ?? followUpRemark ?? null,
    });
    return { ...followUp, remarks: followUp.notes };
  }

  async updateFollowUp(id: string, body: Body, actor?: string | Body) {
    const actorUserId = typeof actor === 'string' ? actor : actor?.sub;
    const actorRole = typeof actor === 'string' ? undefined : actor?.role;
    const existing = await this.db().followUp.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            displayId: true,
            telecallerId: true,
            fieldExecutiveId: true,
            ownerId: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException('Follow-up not found');
    await this.getLead(existing.lead.id, actor);
    const canTelecallerUpdate =
      actorRole === 'TELECALLER' &&
      (existing.assignedToId === actorUserId ||
        existing.lead?.telecallerId === actorUserId ||
        existing.lead?.ownerId === actorUserId);
    const canFieldExecutiveUpdate =
      actorRole === 'SALES_AGENT' &&
      (existing.assignedToId === actorUserId ||
        existing.lead?.fieldExecutiveId === actorUserId);
    if (
      (actorRole === 'TELECALLER' && !canTelecallerUpdate) ||
      (actorRole === 'SALES_AGENT' && !canFieldExecutiveUpdate)
    ) {
      throw new ForbiddenException('You cannot update this follow-up');
    }
    const nextAssignedToId =
      actorRole === 'SALES_AGENT' || actorRole === 'TELECALLER'
        ? actorUserId
        : body.assignedToId !== undefined
        ? body.assignedToId
        : existing.assignedToId;
    if (nextAssignedToId) {
      await this.assertUserWithinLeadScope(String(nextAssignedToId), actor);
    }
    const nextScheduledAt =
      body.scheduledAt !== undefined
        ? normalizeDate(body.scheduledAt)
        : existing.scheduledAt;
    const shouldResetReminderState =
      !existing.completedAt &&
      (existing.assignedToId !== nextAssignedToId ||
        existing.scheduledAt.getTime() !== nextScheduledAt?.getTime());
    const followUpRemark = this.remarkFromBody(body);
    const shouldUpdateRemark = followUpRemark !== undefined;
    const nextAction =
      optionalString(body.nextAction) ??
      (shouldUpdateRemark && followUpRemark ? followUpRemark : undefined);
    const nextFollowUpScheduledAt =
      body.nextScheduledAt !== undefined
        ? normalizeDate(body.nextScheduledAt)
        : undefined;

    if (body.completed === true && body.nextScheduledAt !== undefined) {
      if (!nextFollowUpScheduledAt) {
        throw new BadRequestException(
          'Valid next follow-up date/time is required',
        );
      }
      if (!followUpRemark) {
        throw new BadRequestException(
          'Remarks are required to complete this follow-up',
        );
      }

      const nextFollowUpAssignedToId =
        actorRole === 'SALES_AGENT' || actorRole === 'TELECALLER'
          ? actorUserId
          : optionalString(body.nextAssignedToId) ??
            nextAssignedToId ??
            existing.lead?.telecallerId ??
            existing.lead?.fieldExecutiveId ??
            existing.lead?.ownerId ??
            actorUserId;
      if (nextFollowUpAssignedToId) {
        await this.assertUserWithinLeadScope(
          String(nextFollowUpAssignedToId),
          actor,
        );
      }

      const result = await this.db().$transaction(async (tx: Body) => {
        const completedFollowUp = await tx.followUp.update({
          where: { id },
          data: {
            assignedToId: nextAssignedToId,
            typeId: actorRole === 'TELECALLER' ? 'Call' : body.typeId,
            statusId: body.statusId ?? body.status ?? 'Completed',
            completedAt: new Date(),
            nextAction: followUpRemark,
            notes: followUpRemark,
          },
        });

        await tx.followUp.updateMany({
          where: {
            leadId: completedFollowUp.leadId,
            completedAt: null,
            id: { not: id },
          },
          data: {
            completedAt: new Date(),
            statusId: 'Completed',
            notes: 'Superseded by new follow-up',
          },
        });

        const nextFollowUp = await tx.followUp.create({
          data: {
            leadId: completedFollowUp.leadId,
            assignedToId: nextFollowUpAssignedToId,
            typeId: 'Call',
            statusId: 'Scheduled',
            scheduledAt: nextFollowUpScheduledAt,
            nextAction: 'Follow-up',
            setReminder: true,
            reminderSentAt: null,
          },
        });

        await tx.note.create({
          data: {
            leadId: completedFollowUp.leadId,
            text: followUpRemark,
            authorId: actorUserId ?? null,
            isPinned: false,
          },
        });

        await tx.lead.update({
          where: { id: completedFollowUp.leadId },
          data: {
            nextFollowUpAt: nextFollowUp.scheduledAt,
            remarks: followUpRemark,
          },
        });

        await tx.activity.create({
          data: {
            leadId: completedFollowUp.leadId,
            actorId: actorUserId,
            type: 'FOLLOW_UP_COMPLETED',
            title: 'Follow-up completed',
            description: `The follow-up was completed with remarks captured for ${
              existing.lead?.name ?? 'this lead'
            }.`,
            metadata: {
              followUpId: completedFollowUp.id,
              assignedToId: nextAssignedToId,
              completedAt: completedFollowUp.completedAt ?? null,
              remarks: followUpRemark,
            },
          },
        });

        await tx.activity.create({
          data: {
            leadId: completedFollowUp.leadId,
            actorId: actorUserId,
            type: 'FOLLOW_UP_CREATED',
            title: 'Follow-up created',
            description: `A Call follow-up was scheduled for ${this.formatFollowUpSchedule(
              nextFollowUp.scheduledAt,
            )}.`,
            metadata: {
              followUpId: nextFollowUp.id,
              assignedToId: nextFollowUpAssignedToId,
              scheduledAt: nextFollowUp.scheduledAt,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId,
            action: 'FOLLOW_UP_COMPLETED_WITH_NEXT',
            entityType: 'FollowUp',
            entityId: completedFollowUp.id,
            metadata: {
              leadId: completedFollowUp.leadId,
              nextFollowUpId: nextFollowUp.id,
            },
          },
        });

        return { completedFollowUp, nextFollowUp };
      });

      await this.syncCompletedFollowUpCallLog(
        result.completedFollowUp,
        body,
        actorUserId,
      ).catch(() => undefined);
      await this.createFollowUpNotification({
        recipientUserId: nextAssignedToId,
        lead: existing.lead ?? {
          id: result.completedFollowUp.leadId,
          name: 'Lead',
        },
        followUp: result.completedFollowUp,
        actorUserId,
        event: 'completed',
        note: followUpRemark,
      });
      await this.createFollowUpNotification({
        recipientUserId: nextFollowUpAssignedToId,
        lead: existing.lead ?? {
          id: result.completedFollowUp.leadId,
          name: 'Lead',
        },
        followUp: result.nextFollowUp,
        actorUserId,
        event: 'created',
        note: 'Follow-up',
      });

      return {
        ...result.completedFollowUp,
        remarks: result.completedFollowUp.notes,
        nextFollowUp: {
          ...result.nextFollowUp,
          remarks: result.nextFollowUp.notes,
        },
      };
    }

    const followUp = await this.db().followUp.update({
      where: { id },
      data: {
        assignedToId: nextAssignedToId,
        typeId: actorRole === 'TELECALLER' ? 'Call' : body.typeId,
        statusId: body.statusId ?? body.status,
        scheduledAt: nextScheduledAt,
        completedAt:
          body.completed === true
            ? new Date()
            : normalizeDate(body.completedAt),
        nextAction,
        notes: shouldUpdateRemark ? followUpRemark || null : undefined,
        setReminder: body.completed === true ? undefined : true,
        reminderSentAt:
          body.completed === true
            ? undefined
            : shouldResetReminderState
            ? null
            : undefined,
      },
    });
    if (followUp.completedAt) {
      const nextPendingFollowUp = await this.db().followUp.findFirst({
        where: {
          leadId: followUp.leadId,
          completedAt: null,
        },
        orderBy: { scheduledAt: 'asc' },
        select: { scheduledAt: true },
      });
      await this.db().lead.update({
        where: { id: followUp.leadId },
        data: {
          nextFollowUpAt: nextPendingFollowUp?.scheduledAt ?? null,
        },
      });
    } else if (followUp.scheduledAt) {
      await this.db().lead.update({
        where: { id: followUp.leadId },
        data: { nextFollowUpAt: followUp.scheduledAt },
      });
    }
    if (shouldUpdateRemark) {
      if (followUpRemark) {
        await this.recordLeadRemark(
          followUp.leadId,
          followUpRemark,
          actorUserId,
        );
      } else {
        await this.db().lead.update({
          where: { id: followUp.leadId },
          data: { remarks: null },
        });
      }
    }
    await this.audit(actorUserId, 'FOLLOW_UP_UPDATED', 'FollowUp', id, body);
    const activityType = followUp.completedAt
      ? 'FOLLOW_UP_COMPLETED'
      : existing.assignedToId !== nextAssignedToId
      ? 'FOLLOW_UP_REASSIGNED'
      : 'FOLLOW_UP_UPDATED';
    const activityTitle = followUp.completedAt
      ? 'Follow-up completed'
      : existing.assignedToId !== nextAssignedToId
      ? 'Follow-up reassigned'
      : 'Follow-up updated';
    const activityDescription = followUp.completedAt
      ? `The follow-up was completed with remarks captured for ${
          existing.lead?.name ?? 'this lead'
        }.`
      : existing.assignedToId !== nextAssignedToId
      ? `The follow-up ownership was changed for ${
          existing.lead?.name ?? 'this lead'
        }.`
      : `The follow-up schedule or remarks were updated for ${
          existing.lead?.name ?? 'this lead'
        }.`;
    await this.db()
      .activity.create({
        data: {
          leadId: followUp.leadId,
          actorId: actorUserId,
          type: activityType,
          title: activityTitle,
          description: activityDescription,
          metadata: {
            followUpId: followUp.id,
            assignedToId: nextAssignedToId,
            completedAt: followUp.completedAt ?? null,
            scheduledAt: followUp.scheduledAt ?? null,
            nextAction: followUp.nextAction ?? null,
          },
        },
      })
      .catch(() => undefined);
    if (followUp.completedAt) {
      await this.syncCompletedFollowUpCallLog(
        followUp,
        body,
        actorUserId,
      ).catch(() => undefined);
    }
    if (followUp.completedAt) {
      await this.createFollowUpNotification({
        recipientUserId: nextAssignedToId,
        lead: existing.lead ?? { id: followUp.leadId, name: 'Lead' },
        followUp,
        actorUserId,
        event: 'completed',
        note: followUpRemark ?? body.nextAction ?? null,
      });
    } else if (existing.assignedToId !== nextAssignedToId) {
      await this.createFollowUpNotification({
        recipientUserId: nextAssignedToId,
        lead: existing.lead ?? { id: followUp.leadId, name: 'Lead' },
        followUp,
        actorUserId,
        event: 'reassigned',
        note: followUpRemark ?? body.nextAction ?? null,
      });
    } else {
      await this.createFollowUpNotification({
        recipientUserId: nextAssignedToId,
        lead: existing.lead ?? { id: followUp.leadId, name: 'Lead' },
        followUp,
        actorUserId,
        event: 'updated',
        note: followUpRemark ?? body.nextAction ?? null,
      });
    }
    return { ...followUp, remarks: followUp.notes };
  }

  private parseCallCompletionText(body: Body) {
    const raw =
      optionalString(body.remarks) ??
      optionalString(body.notes) ??
      optionalString(body.nextAction) ??
      '';
    const outcomeMatch = raw.match(/Call Outcome:\s*([^\n]+)/i);
    const remarksMatch = raw.match(/Remarks:\s*([\s\S]+)/i);
    return {
      outcome:
        optionalString(body.callOutcome) ??
        optionalString(body.outcome) ??
        outcomeMatch?.[1]?.trim() ??
        'Connected',
      remarks:
        optionalString(body.customerResponse) ??
        remarksMatch?.[1]?.trim() ??
        raw.trim() ??
        null,
    };
  }

  private async syncCompletedFollowUpCallLog(
    followUp: Body,
    body: Body,
    actorUserId?: string,
  ) {
    const typeName = String(followUp.typeId ?? 'Call').toLowerCase();
    if (!typeName.includes('call')) return;
    const assignedUserId = followUp.assignedToId ?? actorUserId;
    if (!assignedUserId) return;
    const { outcome, remarks } = this.parseCallCompletionText(body);
    const existingLog = await this.db().callLog.findFirst({
      where: { nextFollowUpId: followUp.id },
      select: { id: true },
    });
    const data = {
      leadId: followUp.leadId,
      userId: assignedUserId,
      direction: 'Outgoing',
      startedAt: followUp.completedAt ?? new Date(),
      durationSeconds: Number.isFinite(Number(body.durationSeconds))
        ? Number(body.durationSeconds)
        : undefined,
      outcome,
      followUpStatus: followUp.statusId ?? 'Completed',
      notes: remarks,
      customerResponse: remarks,
      nextFollowUpId: followUp.id,
    };
    if (existingLog) {
      await this.db().callLog.update({
        where: { id: existingLog.id },
        data,
      });
      return;
    }
    await this.db().callLog.create({ data });
  }

  private async enrichFollowUpRows(items: Body[]) {
    const sourceIds = Array.from(
      new Set(items.map((item: Body) => item.lead?.sourceId).filter(Boolean)),
    ) as string[];
    const leadStatusIds = Array.from(
      new Set(items.map((item: Body) => item.lead?.statusId).filter(Boolean)),
    ) as string[];
    const leadTemperatureIds = Array.from(
      new Set(
        items.map((item: Body) => item.lead?.temperatureId).filter(Boolean),
      ),
    ) as string[];
    const projectIds = Array.from(
      new Set(
        items
          .map((item: Body) => item.lead?.requirement?.preferredProjectId)
          .filter(Boolean),
      ),
    ) as string[];
    const userIds = Array.from(
      new Set(
        items
          .flatMap((item: Body) => [
            item.assignedToId,
            item.lead?.ownerId,
            item.lead?.telecallerId,
            item.lead?.fieldExecutiveId,
          ])
          .filter(Boolean),
      ),
    ) as string[];
    const typeIds = Array.from(
      new Set(items.map((item: Body) => item.typeId).filter(Boolean)),
    ) as string[];
    const statusIds = Array.from(
      new Set(items.map((item: Body) => item.statusId).filter(Boolean)),
    ) as string[];

    const [leadMasters, users, projects, followUpTypes, followUpStatuses] =
      await Promise.all([
        sourceIds.length || leadStatusIds.length || leadTemperatureIds.length
          ? this.db().leadMasterValue.findMany({
              where: {
                id: {
                  in: [...sourceIds, ...leadStatusIds, ...leadTemperatureIds],
                },
              },
              select: { id: true, name: true },
            })
          : [],
        userIds.length
          ? this.db().user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, fullName: true, role: true },
            })
          : [],
        projectIds.length
          ? this.db().project.findMany({
              where: { id: { in: projectIds } },
              select: { id: true, name: true, location: true },
            })
          : [],
        typeIds.length
          ? this.db().leadMasterValue.findMany({
              where: {
                id: { in: typeIds },
                categoryRef: { code: 'followup_type' },
              },
              select: { id: true, name: true },
            })
          : [],
        statusIds.length
          ? this.db().leadMasterValue.findMany({
              where: {
                id: { in: statusIds },
                categoryRef: { code: 'followup_status' },
              },
              select: { id: true, name: true },
            })
          : [],
      ]);

    const userMap = new Map<string, any>(
      users.map((user: Body) => [user.id, user]),
    );
    const masterNameById = new Map(
      leadMasters.map((item: Body) => [String(item.id), item.name]),
    );
    const projectMap = new Map<string, Body>(
      projects.map((project: Body) => [project.id, project]),
    );
    const typeNameById = new Map(
      followUpTypes.map((item: Body) => [String(item.id), item.name]),
    );
    const statusNameById = new Map(
      followUpStatuses.map((item: Body) => [String(item.id), item.name]),
    );

    return items.map((item: Body) => {
      const assignedUser = item.assignedToId
        ? userMap.get(item.assignedToId)
        : null;

      return {
        ...item,
        remarks: item.notes,
        typeName:
          typeNameById.get(String(item.typeId ?? '')) ?? item.typeId ?? 'Call',
        statusName:
          statusNameById.get(String(item.statusId ?? '')) ??
          item.statusId ??
          (item.completedAt ? 'Completed' : 'Scheduled'),
        assignedToName: assignedUser?.fullName ?? 'Assigned user',
        assignedToRole: assignedUser?.role ?? null,
        lead: item.lead
          ? {
              ...item.lead,
              sourceName:
                masterNameById.get(String(item.lead.sourceId ?? '')) ??
                item.lead.sourceName ??
                item.lead.sourceId ??
                'Unknown Source',
              statusName:
                masterNameById.get(String(item.lead.statusId ?? '')) ??
                item.lead.statusName ??
                item.lead.statusId ??
                null,
              temperatureName:
                masterNameById.get(String(item.lead.temperatureId ?? '')) ??
                item.lead.temperatureName ??
                item.lead.temperatureId ??
                null,
              projectName: item.lead.requirement?.preferredProjectId
                ? projectMap.get(item.lead.requirement.preferredProjectId)?.name
                : item.lead.requirement?.preferredLocation ?? null,
              projectArea: item.lead.requirement?.preferredProjectId
                ? projectMap.get(item.lead.requirement.preferredProjectId)
                    ?.location
                : item.lead.requirement?.preferredLocation ?? null,
              ownerName: item.lead.ownerId
                ? userMap.get(item.lead.ownerId)?.fullName
                : null,
              telecallerName: item.lead.telecallerId
                ? userMap.get(item.lead.telecallerId)?.fullName
                : null,
              fieldExecutiveName: item.lead.fieldExecutiveId
                ? userMap.get(item.lead.fieldExecutiveId)?.fullName
                : null,
            }
          : null,
      };
    });
  }

  async listFollowUps(query: Query, actor: Body) {
    const actorUserId = String(actor?.sub ?? actor?.id ?? '');
    if (!actorUserId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const { page, limit, skip } = pageMeta(query);
    const where: Body = {};
    const orClauses: Body[] = [];
    const inactiveStatuses = await this.db().leadMasterValue.findMany({
      where: {
        categoryRef: { code: 'status' },
        OR: [
          { name: { equals: 'Not Interested', mode: 'insensitive' } },
          { code: { equals: 'NOT_INTERESTED', mode: 'insensitive' } },
          { name: { equals: 'Lost Lead', mode: 'insensitive' } },
          { code: { equals: 'LOST_LEAD', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    const inactiveStatusValues = [
      ...inactiveStatuses.map((status) => status.id),
      'Not Interested',
      'Lost Lead',
    ];
    const leadWhere: Body = { statusId: { notIn: inactiveStatusValues } };
    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(actor);
    if (scopedUserIds !== null) {
      const requestedAssignedToId =
        query.assignedToId && query.assignedToId !== 'all'
          ? String(query.assignedToId)
          : null;
      if (requestedAssignedToId) {
        where.assignedToId = scopedUserIds.includes(requestedAssignedToId)
          ? requestedAssignedToId
          : { in: [] };
      } else {
        where.assignedToId = { in: scopedUserIds };
      }
      leadWhere.AND = [this.leadVisibility.assignmentScope(scopedUserIds)];
    } else if (query.assignedToId && query.assignedToId !== 'all') {
      where.assignedToId = String(query.assignedToId);
    }

    if (query.leadId) {
      where.leadId = String(query.leadId);
    }

    if (query.type && query.type !== 'all') {
      orClauses.push(
        { typeId: String(query.type) },
        { typeId: { contains: String(query.type), mode: 'insensitive' } },
      );
    }

    if (query.status && query.status !== 'all') {
      const normalizedStatus = String(query.status).trim().toLowerCase();
      if (normalizedStatus === 'completed') {
        where.completedAt = { not: null };
      } else if (
        ['pending', 'scheduled', 'today', 'overdue', 'upcoming'].includes(
          normalizedStatus,
        )
      ) {
        where.completedAt = null;
      } else {
        orClauses.push(
          { statusId: String(query.status) },
          {
            statusId: {
              contains: String(query.status),
              mode: 'insensitive',
            },
          },
        );
      }
    }

    if (query.search) {
      leadWhere.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        {
          displayId: { contains: String(query.search), mode: 'insensitive' },
        },
        { mobile: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }

    if (Object.keys(leadWhere).length) {
      where.lead = leadWhere;
    }

    if (query.dateFrom || query.dateTo) {
      const dateRange: Body = {};
      const from = normalizeDate(query.dateFrom);
      const to = normalizeDate(query.dateTo);
      if (from) dateRange.gte = from;
      if (to) dateRange.lte = to;
      if (Object.keys(dateRange).length) {
        where.scheduledAt = dateRange;
      }
    }

    if (orClauses.length) {
      where.OR = orClauses;
    }

    const duplicateLeads = await this.db().followUp.groupBy({
      by: ['leadId'],
      where: { ...where, completedAt: null },
      _count: { id: true },
      having: { id: { _count: { gt: 1 } } },
    });

    for (const group of duplicateLeads) {
      if (!group.leadId) continue;
      const pendingForLead = await this.db().followUp.findMany({
        where: { leadId: group.leadId, completedAt: null },
        orderBy: { scheduledAt: 'desc' },
        select: { id: true },
      });
      if (pendingForLead.length > 1) {
        const [, ...olderIds] = pendingForLead;
        await this.db().followUp.updateMany({
          where: {
            id: { in: olderIds.map((item: { id: string }) => item.id) },
          },
          data: {
            completedAt: new Date(),
            statusId: 'Completed',
            notes: 'Superseded by new follow-up',
          },
        });
      }
    }

    const orderDirection = query.sort === 'desc' ? 'desc' : 'asc';
    const [rawItems, total] = await Promise.all([
      this.db().followUp.findMany({
        where,
        include: {
          lead: {
            include: {
              requirement: true,
            },
          },
        },
        orderBy: { scheduledAt: orderDirection },
        skip,
        take: limit,
      }),
      this.db().followUp.count({ where }),
    ]);

    let items = rawItems;
    if (!query.leadId) {
      const leadMap = new Map<string, any>();
      for (const item of rawItems) {
        const leadKey =
          item.leadId ||
          item.lead?.id ||
          (item.lead?.mobile
            ? String(item.lead.mobile).replace(/\D/g, '')
            : '') ||
          item.id;
        const existing = leadMap.get(leadKey);
        if (!existing) {
          leadMap.set(leadKey, item);
          continue;
        }
        const itemIsPending = item.completedAt === null;
        const existingIsPending = existing.completedAt === null;

        if (itemIsPending && !existingIsPending) {
          leadMap.set(leadKey, item);
        } else if (itemIsPending === existingIsPending) {
          const itemTime = new Date(item.scheduledAt).getTime();
          const existingTime = new Date(existing.scheduledAt).getTime();
          if (itemTime >= existingTime) {
            leadMap.set(leadKey, item);
          }
        }
      }
      items = Array.from(leadMap.values());
    }

    return {
      data: await this.enrichFollowUpRows(items),
      meta: { page, limit, total: items.length },
    };
  }

  async listFieldExecutiveFollowUps(query: Query, userId: string) {
    const { page, limit, skip } = pageMeta(query);
    const where: Body = { assignedToId: userId };
    if (query.status === 'pending') where.completedAt = null;
    if (query.status === 'completed') where.completedAt = { not: null };
    if (query.search) {
      where.lead = {
        OR: [
          { name: { contains: String(query.search), mode: 'insensitive' } },
          {
            displayId: { contains: String(query.search), mode: 'insensitive' },
          },
        ],
      };
    }
    const [items, total] = await Promise.all([
      this.db().followUp.findMany({
        where,
        include: { lead: { include: { requirement: true } } },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      this.db().followUp.count({ where }),
    ]);
    return {
      data: items.map((item: Body) => ({ ...item, remarks: item.notes })),
      meta: { page, limit, total },
    };
  }

  async listMyFollowUps(query: Query, actor: Body) {
    return this.listFollowUps(query, actor);
  }

  async getTimeline(leadId: string, user?: Body) {
    const lead = await this.getLead(leadId, user);
    const canViewSource = await this.canViewLeadSource(user);
    const activities = await this.db().activity.findMany({
      where: { leadId: lead.id },
      orderBy: { occurredAt: 'desc' },
    });
    const actorIds = Array.from(
      new Set(
        activities
          .map((item: Body) => item.actorId)
          .filter(Boolean) as string[],
      ),
    );
    const actors = actorIds.length
      ? await this.db().user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, fullName: true, email: true, role: true },
        })
      : [];
    const actorMap = new Map<string, Body>(
      actors.map((actor: Body) => [actor.id, actor]),
    );
    return {
      data: activities.map((item: Body) => ({
        ...item,
        actorName: item.actorId
          ? actorMap.get(item.actorId)?.fullName ??
            actorMap.get(item.actorId)?.email
          : undefined,
        actorRole: item.actorId ? actorMap.get(item.actorId)?.role : undefined,
        ...leadActivitySourceVisibility(item, canViewSource),
      })),
    };
  }

  async listMasters(categoryCode: string, query: Query) {
    const defaults = defaultMasterValues[categoryCode] ?? [];
    if (defaults.length) {
      await this.ensureMasters(categoryCode, defaults);
    }
    const category = await this.db().leadMasterCategory.upsert({
      where: { code: categoryCode },
      update: {},
      create: { code: categoryCode, name: categoryCode.replace(/_/g, ' ') },
    });
    const where: Body = { categoryId: category.id };
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { code: { contains: String(query.search), mode: 'insensitive' } },
        {
          description: { contains: String(query.search), mode: 'insensitive' },
        },
      ];
    }
    return {
      data: await this.db().leadMasterValue.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
      }),
      meta: { category },
    };
  }

  async createMaster(categoryCode: string, body: Body, actorUserId?: string) {
    const category = await this.db().leadMasterCategory.upsert({
      where: { code: categoryCode },
      update: {},
      create: { code: categoryCode, name: categoryCode.replace(/_/g, ' ') },
    });
    const name = String(body.name ?? '').trim();
    if (!name) throw new BadRequestException('Master name is required');
    const code = await this.uniqueMasterCode(category.id, body.code, name);
    const followUpNotificationEnabled =
      body.followUpNotificationEnabled === undefined
        ? true
        : Boolean(body.followUpNotificationEnabled);
    const followUpRenotifyMinutes = this.normalizeFollowUpRenotifyMinutes(
      body.followUpRenotifyMinutes,
      followUpNotificationEnabled,
    );
    const value = await this.db().leadMasterValue.create({
      data: {
        categoryId: category.id,
        name,
        code,
        description: body.description,
        group: body.category,
        type: body.type,
        statusType: body.statusType ?? 'Custom',
        isActive: body.isActive ?? true,
        isSystemDefault: body.isSystemDefault ?? false,
        sortOrder: body.sortOrder ?? 0,
        probability: body.probability,
        weight: body.weight,
        manualScore: body.score,
        pointsEnabled:
          categoryCode === 'source'
            ? body.pointsEnabled === undefined
              ? true
              : Boolean(body.pointsEnabled)
            : true,
        autoAssignActive:
          categoryCode === 'source'
            ? body.autoAssignActive === undefined
              ? true
              : Boolean(body.autoAssignActive)
            : true,
        channel: body.channel,
        reasonCategory: body.reasonCategory,
        displayColor: body.displayColor,
        tagColor: body.tagColor,
        ratingValue: body.ratingValue,
        triggerAction: body.triggerAction ?? 'NONE',
        allowFollowUp:
          body.allowFollowUp === undefined ? true : Boolean(body.allowFollowUp),
        showInStatsCard:
          body.showInStatsCard === undefined
            ? true
            : Boolean(body.showInStatsCard),
        showInFilterBar:
          body.showInFilterBar === undefined
            ? true
            : Boolean(body.showInFilterBar),
        followUpNotificationEnabled,
        followUpRenotifyMinutes,
      },
    });
    await this.audit(
      actorUserId,
      'LEAD_MASTER_CREATED',
      'LeadMasterValue',
      value.id,
      { categoryCode },
    );
    return value;
  }

  async updateMaster(
    categoryCode: string,
    id: string,
    body: Body,
    actorUserId?: string,
  ) {
    const current = await this.db().leadMasterValue.findUnique({
      where: { id },
      include: { categoryRef: { select: { code: true } } },
    });
    if (!current || current.categoryRef.code !== categoryCode) {
      throw new NotFoundException('Master record not found');
    }
    const name =
      body.name === undefined ? current.name : String(body.name ?? '').trim();
    if (!name) throw new BadRequestException('Master name is required');
    const code = await this.uniqueMasterCode(
      current.categoryId,
      body.code ?? current.code,
      name,
      id,
    );
    const followUpNotificationEnabled =
      body.followUpNotificationEnabled === undefined
        ? undefined
        : Boolean(body.followUpNotificationEnabled);
    const effectiveFollowUpNotificationEnabled =
      followUpNotificationEnabled ?? current.followUpNotificationEnabled;
    const followUpRenotifyMinutes =
      body.followUpRenotifyMinutes === undefined &&
      followUpNotificationEnabled === undefined
        ? undefined
        : this.normalizeFollowUpRenotifyMinutes(
            body.followUpRenotifyMinutes,
            effectiveFollowUpNotificationEnabled,
          );
    const value = await this.db().leadMasterValue.update({
      where: { id },
      data: {
        name,
        code,
        description: body.description,
        group: body.category,
        type: body.type,
        statusType: body.statusType,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
        probability: body.probability,
        weight: body.weight,
        manualScore: body.score,
        pointsEnabled:
          categoryCode === 'source' && body.pointsEnabled !== undefined
            ? Boolean(body.pointsEnabled)
            : undefined,
        autoAssignActive:
          categoryCode === 'source' && body.autoAssignActive !== undefined
            ? Boolean(body.autoAssignActive)
            : undefined,
        channel: body.channel,
        reasonCategory: body.reasonCategory,
        displayColor: body.displayColor,
        tagColor: body.tagColor,
        ratingValue: body.ratingValue,
        triggerAction: body.triggerAction,
        allowFollowUp:
          body.allowFollowUp === undefined
            ? undefined
            : Boolean(body.allowFollowUp),
        showInStatsCard:
          body.showInStatsCard === undefined
            ? undefined
            : Boolean(body.showInStatsCard),
        showInFilterBar:
          body.showInFilterBar === undefined
            ? undefined
            : Boolean(body.showInFilterBar),
        followUpNotificationEnabled,
        followUpRenotifyMinutes,
      },
    });
    await this.audit(
      actorUserId,
      'LEAD_MASTER_UPDATED',
      'LeadMasterValue',
      id,
      { categoryCode },
    );
    return value;
  }

  async deleteMaster(categoryCode: string, id: string, actorUserId?: string) {
    const current = await this.db().leadMasterValue.findUnique({
      where: { id },
      include: { categoryRef: { select: { code: true } } },
    });
    if (!current || current.categoryRef.code !== categoryCode) {
      throw new NotFoundException('Master record not found');
    }
    if (current.isSystemDefault)
      throw new BadRequestException('System defaults cannot be deleted');
    await this.db().leadMasterValue.delete({ where: { id } });
    await this.audit(actorUserId, 'LEAD_MASTER_DELETED', 'LeadMasterValue', id);
    return { deleted: true };
  }

  async bulkReorderMasters(
    items: Array<{
      id: string;
      sortOrder: number;
      showInStatsCard?: boolean;
      showInFilterBar?: boolean;
      displayColor?: string;
    }>,
    actorUserId?: string,
  ) {
    if (!Array.isArray(items) || items.length === 0) return { count: 0 };

    const dbItems = items.filter((i) => i.id && !i.id.startsWith('core:'));
    if (dbItems.length === 0) return { count: 0 };

    await this.db().$transaction(
      dbItems.map((item, idx) => {
        const data: any = {
          sortOrder: item.sortOrder !== undefined ? item.sortOrder : idx + 1,
        };
        if (item.showInStatsCard !== undefined)
          data.showInStatsCard = Boolean(item.showInStatsCard);
        if (item.showInFilterBar !== undefined)
          data.showInFilterBar = Boolean(item.showInFilterBar);
        if (item.displayColor !== undefined)
          data.displayColor = item.displayColor;

        return this.db().leadMasterValue.update({
          where: { id: item.id },
          data,
        });
      }),
    );

    await this.audit(
      actorUserId,
      'LEAD_MASTERS_BULK_REORDERED',
      'LeadMasterValue',
      'bulk',
      { count: dbItems.length },
    );
    return { success: true, count: dbItems.length };
  }

  private async projectCounts(projectId: string) {
    const now = new Date();
    const [activeLeads, upcomingVisits] = await Promise.all([
      this.db()
        .leadProjectInterest.count({ where: { projectId } })
        .catch(() => 0),
      this.db()
        .siteVisit.count({
          where: {
            projectId,
            scheduledAt: { gte: now },
            status: { in: ['Upcoming', 'Scheduled'] },
          },
        })
        .catch(() => 0),
    ]);
    return { activeLeads, upcomingVisits };
  }

  private async enrichProject(project: Body) {
    const counts = await this.projectCounts(project.id);
    const units = project.units ?? [];
    const brochures = normalizeProjectBrochures(project.brochures, project);
    const legacyConfigurationCarpetAreas = normalizeConfigurationCarpetAreas(
      project.configurationCarpetAreas,
    );
    const storedVariants = normalizeProjectConfigurationVariants(
      project.configurationVariants,
    );
    const configurationVariants = storedVariants.length
      ? storedVariants
      : configurationVariantsFromLegacyAreas(legacyConfigurationCarpetAreas);
    const configurations = Array.from(
      new Set(configurationVariants.map((variant) => variant.configuration)),
    );
    return {
      ...project,
      propertyType: project.propertyType ?? 'Residential',
      configurations: configurations.length
        ? configurations
        : asArray(project.configurations),
      configurationVariants,
      configurationCarpetAreas: Object.keys(legacyConfigurationCarpetAreas)
        .length
        ? legacyConfigurationCarpetAreas
        : configurationCarpetAreasFromVariants(configurationVariants),
      amenities: asArray(project.amenities),
      highlights: asArray(project.highlights),
      imageGallery: asArray(project.imageGallery),
      videoGallery: asArray(
        project.videoUrls ??
          project.videos ??
          (project.videoUrl ? [project.videoUrl] : []),
      ),
      videoUrls: asArray(
        project.videoUrls ??
          project.videos ??
          (project.videoUrl ? [project.videoUrl] : []),
      ),
      videos: asArray(
        project.videoUrls ??
          project.videos ??
          (project.videoUrl ? [project.videoUrl] : []),
      ),
      videoUrl:
        project.videoUrl ?? asArray(project.videoUrls ?? project.videos)[0],
      brochures,
      brochureUrl: project.brochureUrl ?? brochures[0]?.url,
      brochureStorageKey:
        project.brochureStorageKey ?? brochures[0]?.storageKey,
      brochureFileName: project.brochureFileName ?? brochures[0]?.fileName,
      brochureMimeType: project.brochureMimeType ?? brochures[0]?.mimeType,
      brochureSizeBytes: project.brochureSizeBytes ?? brochures[0]?.sizeBytes,
      priceRange: formatMoneyRange(project.minPrice, project.maxPrice),
      activeLeads: counts.activeLeads,
      upcomingVisits: counts.upcomingVisits,
      units: units.map((unit: Body) => ({
        ...unit,
        imageGallery: asArray(unit.imageGallery),
        visitCount: unit._count?.siteVisits ?? 0,
      })),
    };
  }

  async listProjects(query: Query) {
    const { page, limit, skip } = pageMeta(query);
    const where: Body = {};
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { location: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }
    if (query.status) where.status = String(query.status);
    if (query.propertyType) where.propertyType = String(query.propertyType);
    const [items, total] = await Promise.all([
      this.db().project.findMany({
        where,
        skip,
        take: limit,
        include: {
          units: { include: { _count: { select: { siteVisits: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db().project.count({ where }),
    ]);
    return {
      data: await Promise.all(
        items.map((project: Body) => this.enrichProject(project)),
      ),
      meta: { page, limit, total },
    };
  }

  async getProject(idOrSlug: string) {
    let project = await this.db().project.findUnique({
      where: { id: idOrSlug },
      include: {
        units: { include: { _count: { select: { siteVisits: true } } } },
      },
    });

    if (!project) {
      const slugTarget = idOrSlug
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-');
      const allProjects = await this.db().project.findMany({
        include: {
          units: { include: { _count: { select: { siteVisits: true } } } },
        },
      });
      project =
        allProjects.find((p) => {
          if (!p.name) return false;
          const pSlug = p.name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-');
          return pSlug === slugTarget || p.id === idOrSlug;
        }) ?? null;
    }

    if (!project) throw new NotFoundException('Project not found');
    return this.enrichProject(project);
  }

  async inquirePublicProject(idOrSlug: string, body: Record<string, any>) {
    const project: any = await this.getProject(idOrSlug);
    const name = String(body.name ?? 'Public Visitor').trim();
    const phone = String(body.phone ?? '').trim();
    const email = body.email ? String(body.email).trim() : undefined;
    const preferredConfiguration = body.configuration
      ? String(body.configuration)
      : undefined;
    if (!phone) throw new BadRequestException('Phone number is required');

    const existing = await this.db().lead.findFirst({
      where: { phone },
    });

    if (existing) {
      await this.db().lead.update({
        where: { id: existing.id },
        data: {
          preferredProjectId: project.id,
          configuration: preferredConfiguration ?? existing.configuration,
          notes: body.notes
            ? `${existing.notes ?? ''}\n[Public Inquiry]: ${body.notes}`.trim()
            : existing.notes,
        },
      });
      return { success: true, message: 'Inquiry received successfully' };
    }

    await this.createLead(
      {
        name,
        mobile: phone,
        email,
        preferredProjectId: project.id,
        configuration: preferredConfiguration,
        remarks: body.notes ? `[Public Inquiry]: ${body.notes}` : undefined,
      },
      undefined,
      { fromIntegration: true },
    );

    return { success: true, message: 'Inquiry submitted successfully' };
  }

  async createProject(body: Body, actorUserId?: string) {
    const brochures = normalizeProjectBrochures(body.brochures, body);
    const primaryBrochure = brochures[0];
    const configurationVariants = normalizeProjectConfigurationVariants(
      body.configurationVariants,
    );
    const legacyConfigurationCarpetAreas = normalizeConfigurationCarpetAreas(
      body.configurationCarpetAreas,
    );
    const configurations = configurationVariants.length
      ? Array.from(
          new Set(
            configurationVariants.map((variant) => variant.configuration),
          ),
        )
      : body.configurations;
    const project = await this.db().project.create({
      data: {
        name: body.name,
        location: body.location,
        developer: body.developer,
        propertyType: body.propertyType
          ? String(body.propertyType)
          : 'Residential',
        status: body.status ?? 'Active',
        possession: body.possession,
        minPrice: parsePriceInput(
          body.minPrice ?? body.priceMin,
          body.priceMinUnit,
        ),
        maxPrice: parsePriceInput(
          body.maxPrice ?? body.priceMax,
          body.priceMaxUnit,
        ),
        configurations,
        configurationVariants,
        configurationCarpetAreas: configurationVariants.length
          ? configurationCarpetAreasFromVariants(configurationVariants)
          : legacyConfigurationCarpetAreas,
        numberOfFloors: normalizeOptionalFloorCount(body.numberOfFloors),
        amenities: body.amenities,
        highlights: body.highlights,
        description: body.description,
        reraNumber: body.reraNumber,
        imageUrl: body.imageUrl,
        imageGallery: body.imageGallery,
        videoUrl:
          body.videoUrl ??
          (Array.isArray(body.videoUrls) ? body.videoUrls[0] : null),
        videoUrls: body.videoUrls ?? (body.videoUrl ? [body.videoUrl] : []),
        brochureUrl: primaryBrochure?.url ?? body.brochureUrl,
        brochureStorageKey:
          primaryBrochure?.storageKey ?? body.brochureStorageKey,
        brochureFileName: primaryBrochure?.fileName ?? body.brochureFileName,
        brochureMimeType: primaryBrochure?.mimeType ?? body.brochureMimeType,
        brochureSizeBytes: primaryBrochure?.sizeBytes ?? body.brochureSizeBytes,
        brochures,
        salesOwnerId: body.salesOwnerId,
        demandScore: body.demandScore,
        latitude: optionalCoordinate(body.latitude, -90, 90, 'latitude'),
        longitude: optionalCoordinate(body.longitude, -180, 180, 'longitude'),
        geofenceRadiusM: optionalPositiveInteger(body.geofenceRadiusM),
      },
    });
    await this.audit(actorUserId, 'PROJECT_CREATED', 'Project', project.id);
    return this.getProject(project.id);
  }

  async updateProject(id: string, body: Body, actorUserId?: string) {
    const brochures =
      body.brochures === undefined
        ? undefined
        : normalizeProjectBrochures(body.brochures, body);
    const primaryBrochure = brochures?.[0];
    const hasConfigurationVariants = body.configurationVariants !== undefined;
    const configurationVariants = hasConfigurationVariants
      ? normalizeProjectConfigurationVariants(body.configurationVariants)
      : undefined;
    const project = await this.db().project.update({
      where: { id },
      data: {
        name: body.name,
        location: body.location,
        developer: body.developer,
        propertyType:
          body.propertyType !== undefined
            ? String(body.propertyType)
            : undefined,
        status: body.status,
        possession: body.possession,
        minPrice: parsePriceInput(
          body.minPrice ?? body.priceMin,
          body.priceMinUnit,
        ),
        maxPrice: parsePriceInput(
          body.maxPrice ?? body.priceMax,
          body.priceMaxUnit,
        ),
        configurations:
          configurationVariants === undefined
            ? body.configurations
            : Array.from(
                new Set(
                  configurationVariants.map((variant) => variant.configuration),
                ),
              ),
        configurationVariants,
        configurationCarpetAreas:
          configurationVariants === undefined
            ? body.configurationCarpetAreas === undefined
              ? undefined
              : normalizeConfigurationCarpetAreas(body.configurationCarpetAreas)
            : configurationCarpetAreasFromVariants(configurationVariants),
        numberOfFloors: normalizeOptionalFloorCount(body.numberOfFloors),
        amenities: body.amenities,
        highlights: body.highlights,
        description: body.description,
        reraNumber: body.reraNumber,
        imageUrl: body.imageUrl,
        imageGallery: body.imageGallery,
        videoUrl:
          body.videoUrl !== undefined
            ? body.videoUrl
            : Array.isArray(body.videoUrls)
            ? body.videoUrls[0] ?? null
            : undefined,
        videoUrls:
          body.videoUrls !== undefined
            ? body.videoUrls
            : body.videoUrl
            ? [body.videoUrl]
            : undefined,
        brochureUrl:
          brochures === undefined
            ? body.brochureUrl
            : primaryBrochure?.url ?? null,
        brochureStorageKey:
          brochures === undefined
            ? body.brochureStorageKey
            : primaryBrochure?.storageKey ?? null,
        brochureFileName:
          brochures === undefined
            ? body.brochureFileName
            : primaryBrochure?.fileName ?? null,
        brochureMimeType:
          brochures === undefined
            ? body.brochureMimeType
            : primaryBrochure?.mimeType ?? null,
        brochureSizeBytes:
          brochures === undefined
            ? body.brochureSizeBytes
            : primaryBrochure?.sizeBytes ?? null,
        brochures,
        salesOwnerId: body.salesOwnerId,
        demandScore: body.demandScore,
        latitude:
          body.latitude === ''
            ? null
            : optionalCoordinate(body.latitude, -90, 90, 'latitude'),
        longitude:
          body.longitude === ''
            ? null
            : optionalCoordinate(body.longitude, -180, 180, 'longitude'),
        geofenceRadiusM: optionalPositiveInteger(body.geofenceRadiusM),
      },
    });
    await this.audit(actorUserId, 'PROJECT_UPDATED', 'Project', id, body);
    return this.getProject(project.id);
  }

  async listUnits(projectId: string) {
    return {
      data: (
        await this.db().projectUnit.findMany({
          where: { projectId },
          include: { _count: { select: { siteVisits: true } } },
          orderBy: [{ tower: 'asc' }, { unitNumber: 'asc' }],
        })
      ).map((unit: Body) => ({
        ...unit,
        imageGallery: asArray(unit.imageGallery),
        visitCount: unit._count?.siteVisits ?? 0,
      })),
    };
  }

  async getUnit(projectId: string, unitId: string) {
    const unit = await this.db().projectUnit.findFirst({
      where: { id: unitId, projectId },
      include: {
        project: true,
        siteVisits: {
          include: { lead: true },
          orderBy: { scheduledAt: 'desc' },
        },
        bookings: { include: { lead: true }, orderBy: { bookingDate: 'desc' } },
        _count: { select: { siteVisits: true } },
      },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    const linkedLeads = await this.listProjectLeads(projectId, { unitId });
    return {
      ...unit,
      imageGallery: asArray(unit.imageGallery),
      visitCount: unit._count?.siteVisits ?? 0,
      linkedLeads: linkedLeads.data,
    };
  }

  async createUnit(projectId: string, body: Body, actorUserId?: string) {
    const unit = await this.db().projectUnit.create({
      data: {
        projectId,
        tower: body.tower,
        unitNumber: body.unitNumber,
        configuration: body.configuration,
        carpetAreaSqft: normalizeMoney(body.carpetAreaSqft ?? body.carpetArea),
        floor: body.floor,
        facing: body.facing,
        price: parsePriceInput(body.price ?? body.priceAmount, body.priceUnit),
        availability: body.availability ?? 'Available',
        bookingStatus: body.bookingStatus ?? 'Open',
        salesOwnerId: body.salesOwnerId,
        imageUrl: body.imageUrl,
        imageGallery: body.imageGallery,
      },
    });
    await this.audit(
      actorUserId,
      'PROJECT_UNIT_CREATED',
      'ProjectUnit',
      unit.id,
      { projectId },
    );
    return this.getUnit(projectId, unit.id);
  }

  async updateUnit(
    projectId: string,
    unitId: string,
    body: Body,
    actorUserId?: string,
  ) {
    const unit = await this.db().projectUnit.update({
      where: { id: unitId },
      data: {
        tower: body.tower,
        unitNumber: body.unitNumber,
        configuration: body.configuration,
        carpetAreaSqft: normalizeMoney(body.carpetAreaSqft ?? body.carpetArea),
        floor: body.floor,
        facing: body.facing,
        price: parsePriceInput(body.price ?? body.priceAmount, body.priceUnit),
        availability: body.availability,
        bookingStatus: body.bookingStatus,
        salesOwnerId: body.salesOwnerId,
        imageUrl: body.imageUrl,
        imageGallery: body.imageGallery,
      },
    });
    await this.audit(
      actorUserId,
      'PROJECT_UNIT_UPDATED',
      'ProjectUnit',
      unitId,
      { projectId },
    );
    return this.getUnit(projectId, unit.id);
  }

  async listProjectLeads(projectId: string, query: Query = {}) {
    const where: Body = { projectId };
    if (query.unitId) where.unitId = String(query.unitId);
    const interests = await this.db().leadProjectInterest.findMany({
      where,
      include: { lead: { include: { requirement: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: interests.map((interest: Body) => ({
        id: interest.lead.id,
        displayId: interest.lead.displayId,
        name: interest.lead.name,
        stage: interest.lead.statusId ?? interest.lead.stageId ?? 'New Lead',
        owner: interest.lead.ownerId ?? 'Unassigned',
        budget: formatMoneyRange(
          interest.lead.requirement?.minBudget,
          interest.lead.requirement?.maxBudget,
        ),
        projectId: interest.projectId,
        unitId: interest.unitId,
      })),
    };
  }

  async linkLeadToUnit(
    projectId: string,
    unitId: string,
    body: Body,
    actorUserId?: string,
  ) {
    await this.getUnit(projectId, unitId);
    let leadId = body.leadId;
    if (!leadId) {
      if (!body.name && !body.leadName)
        throw new BadRequestException('Lead name is required');
      const lead = await this.createLead(
        {
          leadName: body.name ?? body.leadName,
          mobileNumber:
            body.mobile ??
            body.mobileNumber ??
            `90000${String(Date.now()).slice(-5)}`,
          leadStatus: body.stage ?? 'new',
          leadStage: body.stage ?? 'new-lead',
          propertyType: body.propertyType,
          minBudget: normalizeMoney(body.minBudget ?? body.budget),
          maxBudget: normalizeMoney(body.maxBudget ?? body.budget),
        },
        actorUserId,
      );
      leadId = lead.id;
    }
    const link = await this.db().leadProjectInterest.create({
      data: {
        leadId,
        projectId,
        unitId,
        isPrimary: body.isPrimary ?? true,
        matchPercent: body.matchPercent,
      },
    });
    await this.audit(
      actorUserId,
      'LEAD_LINKED_TO_UNIT',
      'LeadProjectInterest',
      link.id,
      { projectId, unitId, leadId },
    );
    return link;
  }

  async listSiteVisits(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const where: Body = {};
    if (query.leadId) {
      const leadId = String(query.leadId);
      where.lead = { is: { OR: [{ id: leadId }, { displayId: leadId }] } };
    }
    if (query.status && query.status !== 'all')
      where.status = String(query.status);
    if (query.type) where.visitType = String(query.type);
    if (query.projectId) where.projectId = String(query.projectId);
    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(user);
    if (scopedUserIds !== null) {
      if (query.assignedTo && query.assignedTo !== 'all') {
        const requestedId = String(query.assignedTo);
        if (scopedUserIds.includes(requestedId)) {
          where.assignedExecutiveId = requestedId;
        } else {
          where.assignedExecutiveId = { in: [] };
        }
      } else {
        where.AND = [
          ...(where.AND ?? []),
          {
            OR: [
              { assignedExecutiveId: { in: scopedUserIds } },
              {
                lead: {
                  is: {
                    OR: [
                      { ownerId: { in: scopedUserIds } },
                      { managerId: { in: scopedUserIds } },
                      { telecallerId: { in: scopedUserIds } },
                      { fieldExecutiveId: { in: scopedUserIds } },
                    ],
                  },
                },
              },
            ],
          },
        ];
      }
    } else if (query.assignedTo && query.assignedTo !== 'all') {
      where.assignedExecutiveId = String(query.assignedTo);
    }
    if (query.from || query.to) {
      where.scheduledAt = {};
      const from = normalizeDate(query.from);
      const to = normalizeDate(query.to);
      if (from) where.scheduledAt.gte = from;
      if (to) where.scheduledAt.lte = to;
    }
    if (query.search) {
      where.OR = [
        { displayId: { contains: String(query.search), mode: 'insensitive' } },
        {
          lead: {
            name: { contains: String(query.search), mode: 'insensitive' },
          },
        },
        {
          lead: {
            mobile: { contains: String(query.search), mode: 'insensitive' },
          },
        },
        {
          project: {
            name: { contains: String(query.search), mode: 'insensitive' },
          },
        },
      ];
    }
    const [items, total] = await Promise.all([
      this.db().siteVisit.findMany({
        where,
        skip,
        take: limit,
        include: { lead: true, project: true, unit: true },
        orderBy: { scheduledAt: 'desc' },
      }),
      this.db().siteVisit.count({ where }),
    ]);
    const executiveIds = [
      ...new Set(
        items
          .map((visit: Body) => visit.assignedExecutiveId)
          .filter(Boolean) as string[],
      ),
    ];
    const leadMasterIds = [
      ...new Set(
        items.flatMap((visit: Body) => [
          visit.lead?.sourceId,
          visit.lead?.statusId,
          visit.lead?.stageId,
        ]),
      ),
    ].filter(Boolean) as string[];
    const executives = executiveIds.length
      ? await this.db().user.findMany({
          where: { id: { in: executiveIds } },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
          },
        })
      : [];
    const masterValues = leadMasterIds.length
      ? await this.db().leadMasterValue.findMany({
          where: { id: { in: leadMasterIds } },
          select: { id: true, name: true },
        })
      : [];
    const executivesById = new Map<string, Body>(
      executives.map((executive: Body) => [executive.id, executive]),
    );
    const masterMap = new Map(
      masterValues.map((item: Body) => [item.id, item.name]),
    );

    return {
      data: items.map((visit: Body) => ({
        ...visit,
        leadName: visit.lead?.name,
        leadDisplayId: visit.lead?.displayId,
        leadPhone: `${visit.lead?.mobileCountryCode ?? '+91'} ${
          visit.lead?.mobile ?? ''
        }`.trim(),
        leadSource: visit.lead?.sourceId
          ? masterMap.get(visit.lead.sourceId)
          : undefined,
        leadStatus: visit.lead?.statusId
          ? masterMap.get(visit.lead.statusId)
          : undefined,
        leadStage: visit.lead?.stageId
          ? masterMap.get(visit.lead.stageId)
          : undefined,
        projectName: visit.project?.name,
        projectLocation: visit.project?.location,
        projectLatitude: visit.project?.latitude,
        projectLongitude: visit.project?.longitude,
        projectGeofenceRadiusM: visit.project?.geofenceRadiusM,
        unitLabel: visit.unit
          ? `${visit.unit.tower ?? ''}, Unit ${visit.unit.unitNumber}`.trim()
          : undefined,
        assignedExecutiveName:
          executivesById.get(visit.assignedExecutiveId)?.fullName ??
          executivesById.get(visit.assignedExecutiveId)?.email,
        assignedExecutiveImage: executivesById.get(visit.assignedExecutiveId)
          ?.avatarStorageKey,
        assignedExecutiveRole: executivesById.get(visit.assignedExecutiveId)
          ?.role,
      })),
      meta: { page, limit, total },
    };
  }

  async getSiteVisit(id: string, user?: Body) {
    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(user);
    const visit = await this.db().siteVisit.findFirst({
      where: {
        OR: [{ id }, { displayId: id }],
        ...(scopedUserIds !== null
          ? {
              AND: [
                {
                  OR: [
                    { assignedExecutiveId: { in: scopedUserIds } },
                    {
                      lead: {
                        is: this.leadVisibility.assignmentScope(scopedUserIds),
                      },
                    },
                  ],
                },
              ],
            }
          : {}),
      },
      include: { lead: true, project: true, unit: true },
    });
    if (!visit) throw new NotFoundException('Site visit not found');
    const executive = visit.assignedExecutiveId
      ? await this.db().user.findUnique({
          where: { id: visit.assignedExecutiveId },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            avatarStorageKey: true,
          },
        })
      : null;
    const leadMasterIds = [
      visit.lead?.sourceId,
      visit.lead?.statusId,
      visit.lead?.stageId,
    ].filter(Boolean) as string[];
    const masterValues = leadMasterIds.length
      ? await this.db().leadMasterValue.findMany({
          where: { id: { in: leadMasterIds } },
          select: { id: true, name: true },
        })
      : [];
    const masterMap = new Map(
      masterValues.map((item: Body) => [item.id, item.name]),
    );

    return {
      data: {
        ...visit,
        leadName: visit.lead?.name,
        leadDisplayId: visit.lead?.displayId,
        leadPhone: `${visit.lead?.mobileCountryCode ?? '+91'} ${
          visit.lead?.mobile ?? ''
        }`.trim(),
        leadSource: visit.lead?.sourceId
          ? masterMap.get(visit.lead.sourceId)
          : undefined,
        leadStatus: visit.lead?.statusId
          ? masterMap.get(visit.lead.statusId)
          : undefined,
        leadStage: visit.lead?.stageId
          ? masterMap.get(visit.lead.stageId)
          : undefined,
        projectName: visit.project?.name,
        projectLocation: visit.project?.location,
        projectLatitude: visit.project?.latitude,
        projectLongitude: visit.project?.longitude,
        projectGeofenceRadiusM: visit.project?.geofenceRadiusM,
        projectImageUrl: visit.project?.imageUrl,
        projectImageGallery: Array.isArray(visit.project?.imageGallery)
          ? visit.project?.imageGallery
          : [],
        unitLabel: visit.unit
          ? `${visit.unit.tower ?? ''}, Unit ${visit.unit.unitNumber}`.trim()
          : undefined,
        unitImageUrl: visit.unit?.imageUrl,
        unitImageGallery: Array.isArray(visit.unit?.imageGallery)
          ? visit.unit?.imageGallery
          : [],
        assignedExecutiveName: executive?.fullName ?? executive?.email,
        assignedExecutiveImage: executive?.avatarStorageKey,
        assignedExecutiveRole: executive?.role,
      },
    };
  }

  async getSiteVisitOptions(query: Query, user?: Body) {
    const projectSelectWithGeofence = {
      id: true,
      name: true,
      location: true,
      latitude: true,
      longitude: true,
      geofenceRadiusM: true,
      imageUrl: true,
      imageGallery: true,
      units: {
        select: {
          id: true,
          tower: true,
          unitNumber: true,
          configuration: true,
          price: true,
          availability: true,
          bookingStatus: true,
          imageUrl: true,
          imageGallery: true,
          bookings: {
            where: { status: 'Booked' },
            select: { id: true },
          },
        },
        orderBy: { unitNumber: 'asc' as const },
      },
    };
    const projectSelectLegacy = {
      id: true,
      name: true,
      location: true,
      imageUrl: true,
      imageGallery: true,
      units: {
        select: {
          id: true,
          tower: true,
          unitNumber: true,
          configuration: true,
          price: true,
          availability: true,
          bookingStatus: true,
          imageUrl: true,
          imageGallery: true,
          bookings: {
            where: { status: 'Booked' },
            select: { id: true },
          },
        },
        orderBy: { unitNumber: 'asc' as const },
      },
    };

    const scopedUserIds =
      await this.leadVisibility.resolveAssignmentScopeUserIds(user);
    const assignmentScope = scopedUserIds
      ? this.leadVisibility.assignmentScope(scopedUserIds)
      : null;
    const leadSearchWhere = query.search
      ? {
          OR: [
            {
              name: {
                contains: String(query.search),
                mode: 'insensitive',
              },
            },
            {
              mobile: {
                contains: String(query.search),
                mode: 'insensitive',
              },
            },
            {
              displayId: {
                contains: String(query.search),
                mode: 'insensitive',
              },
            },
          ],
        }
      : null;
    const [leads, projects] = await Promise.all([
      this.db().lead.findMany({
        where: {
          deletedAt: null,
          ...(assignmentScope || leadSearchWhere
            ? {
                AND: [assignmentScope, leadSearchWhere].filter(Boolean),
              }
            : {}),
        },
        select: {
          id: true,
          displayId: true,
          name: true,
          mobileCountryCode: true,
          mobile: true,
          sourceId: true,
          stageId: true,
          statusId: true,
          ownerId: true,
          telecallerId: true,
          fieldExecutiveId: true,
          requirement: {
            select: {
              preferredProjectId: true,
              preferredLocation: true,
              configuration: true,
              budgetRange: true,
              minBudget: true,
              maxBudget: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      this.db()
        .project.findMany({
          select: projectSelectWithGeofence,
          orderBy: { name: 'asc' },
          take: 100,
        })
        .catch((error: unknown) => {
          if (!isMissingProjectGeofenceFieldError(error)) {
            throw error;
          }
          return this.db().project.findMany({
            select: projectSelectLegacy,
            orderBy: { name: 'asc' },
            take: 100,
          });
        }),
    ]);
    const relatedExecutiveIds = leads
      .map((lead: Body) => lead.fieldExecutiveId)
      .filter((id: unknown): id is string => typeof id === 'string');
    const visibleExecutiveIds = scopedUserIds
      ? Array.from(new Set([...scopedUserIds, ...relatedExecutiveIds]))
      : null;
    // For a scoped (non-global) viewer such as a Manager/Team Leader, the Bookings
    // and Brokerage filters match executives against owner/telecaller/field-exec/
    // closedBy, which spans more roles than site-visit assignment. Widen the role
    // set to the manager's full scoped hierarchy so those filters are populated.
    // Global viewers keep the site-visit-assignable role set.
    const executiveRoleScope = (
      visibleExecutiveIds
        ? [
            'SALES_AGENT',
            'SALES_MANAGER',
            'ADMIN',
            'TELECALLER',
            'TEAM_LEADER',
            'MANAGER',
          ]
        : siteVisitExecutiveRoles
    ) as Body;
    const executives = await this.db().user.findMany({
      where: {
        isActive: true,
        role: { in: executiveRoleScope },
        ...(visibleExecutiveIds ? { id: { in: visibleExecutiveIds } } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarStorageKey: true,
      },
      orderBy: { fullName: 'asc' },
      take: 100,
    });
    const masterIds = Array.from(
      new Set(
        leads.flatMap((lead: Body) => [
          lead.sourceId,
          lead.statusId,
          lead.stageId,
        ]),
      ),
    ).filter(Boolean) as string[];
    const masterValues = masterIds.length
      ? await this.db().leadMasterValue.findMany({
          where: { id: { in: masterIds } },
          select: { id: true, name: true },
        })
      : [];
    const masterMap = new Map(
      masterValues.map((item: Body) => [item.id, item.name]),
    );
    const assignedUserIds = Array.from(
      new Set(
        leads.flatMap((lead: Body) => [
          lead.ownerId,
          lead.telecallerId,
          lead.fieldExecutiveId,
        ]),
      ),
    ).filter(Boolean) as string[];
    const assignedUsers = assignedUserIds.length
      ? await this.db().user.findMany({
          where: { id: { in: assignedUserIds } },
          select: { id: true, fullName: true, email: true, role: true },
        })
      : [];
    const assignedUserMap = new Map<
      string,
      { fullName?: string | null; email?: string | null }
    >(
      assignedUsers.map((item: Body) => [
        String(item.id),
        {
          fullName: item.fullName,
          email: item.email,
        },
      ]),
    );
    const assignedName = (userId?: string | null) => {
      if (!userId) return undefined;
      const assignedUser = assignedUserMap.get(String(userId));
      return assignedUser?.fullName ?? assignedUser?.email ?? undefined;
    };

    return {
      executives: executives.map((executive: Body) => ({
        id: executive.id,
        name: executive.fullName ?? executive.email,
        email: executive.email,
        role: executive.role,
        image: executive.avatarStorageKey ?? undefined,
      })),
      leads: leads.map((lead: Body) => ({
        id: lead.id,
        displayId: lead.displayId,
        name: lead.name,
        phone: `${lead.mobileCountryCode ?? '+91'} ${lead.mobile}`.trim(),
        sourceId: lead.sourceId,
        sourceName: lead.sourceId ? masterMap.get(lead.sourceId) : undefined,
        stageId: lead.stageId,
        stageName: lead.stageId ? masterMap.get(lead.stageId) : undefined,
        statusId: lead.statusId,
        statusName: lead.statusId ? masterMap.get(lead.statusId) : undefined,
        preferredProjectId: lead.requirement?.preferredProjectId,
        preferredLocation: lead.requirement?.preferredLocation,
        configuration: lead.requirement?.configuration,
        budgetRange:
          lead.requirement?.budgetRange ??
          (lead.requirement?.maxBudget ?? lead.requirement?.minBudget
            ? String(lead.requirement?.maxBudget ?? lead.requirement?.minBudget)
            : undefined),
        ownerId: lead.ownerId,
        ownerName: assignedName(lead.ownerId),
        telecallerId: lead.telecallerId,
        telecallerName: assignedName(lead.telecallerId),
        fieldExecutiveId: lead.fieldExecutiveId,
        fieldExecutiveName: assignedName(lead.fieldExecutiveId),
      })),
      projects: projects.map((project: Body) => ({
        id: project.id,
        name: project.name,
        location: project.location,
        latitude: project.latitude,
        longitude: project.longitude,
        geofenceRadiusM: project.geofenceRadiusM,
        imageUrl: project.imageUrl,
        imageGallery: project.imageGallery,
        units: project.units.map((unit: Body) => {
          const hasConfirmedBooking = (unit.bookings ?? []).length > 0;
          return {
            id: unit.id,
            tower: unit.tower,
            unitNumber: unit.unitNumber,
            configuration: unit.configuration,
            price: unit.price,
            availability: hasConfirmedBooking ? 'Booked' : unit.availability,
            bookingStatus: hasConfirmedBooking ? 'Booked' : unit.bookingStatus,
            imageUrl: unit.imageUrl,
            imageGallery: unit.imageGallery,
          };
        }),
      })),
    };
  }

  private async resolveSiteVisitAssignment(
    leadId: string,
    actorUserId?: string,
    db: Pick<Prisma.TransactionClient, 'lead' | 'user'> = this.prisma,
  ) {
    const actor = actorUserId
      ? await db.user.findFirst({
          where: { id: actorUserId, isActive: true },
          select: { role: true },
        })
      : null;
    if (actorUserId && !actor) {
      throw new ForbiddenException(
        'An active user is required to schedule a site visit',
      );
    }
    const lead = await db.lead.findFirst({
      where: {
        OR: [{ id: leadId }, { displayId: leadId }],
        deletedAt: null,
        ...(actor?.role === 'TELECALLER' ? { telecallerId: actorUserId } : {}),
        ...(actor?.role === 'SALES_AGENT' && actorUserId
          ? { AND: [this.salesAgentLeadScope(actorUserId)] }
          : {}),
      },
      select: { id: true, fieldExecutiveId: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    const assignmentError =
      'Assign an active field executive to this client before scheduling a site visit.';
    if (!lead.fieldExecutiveId) throw new BadRequestException(assignmentError);
    const executive = await db.user.findFirst({
      where: {
        id: lead.fieldExecutiveId,
        isActive: true,
        role: { in: siteVisitExecutiveRoles },
      },
      select: { id: true },
    });
    if (!executive) throw new BadRequestException(assignmentError);
    return { id: lead.id, fieldExecutiveId: executive.id };
  }

  private async nextSiteVisitDisplayId() {
    const visits = await this.db().siteVisit.findMany({
      where: { displayId: { startsWith: 'SV-' } },
      select: { displayId: true },
      take: 500,
      orderBy: { createdAt: 'desc' },
    });
    let maxNum = 0;
    for (const v of visits) {
      const match = String(v.displayId ?? '').match(/^SV-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    return `SV-${String(maxNum + 1).padStart(4, '0')}`;
  }

  async createSiteVisit(body: Body, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    const scheduledAt = normalizeDate(
      body.scheduledAt ?? `${body.date ?? ''} ${body.time ?? ''}`,
    );
    if (!body.leadId) throw new BadRequestException('Lead is required');
    if (!body.projectId) throw new BadRequestException('Project is required');
    if (!scheduledAt)
      throw new BadRequestException('Valid visit date/time is required');
    await this.getLead(body.leadId, actor);
    const requestedLeadStatus = body.leadStatusId
      ? await this.resolveActiveLeadStatus(body.leadStatusId)
      : null;
    if (
      requestedLeadStatus &&
      String(requestedLeadStatus.triggerAction).toUpperCase() !==
        'CREATE_SITE_VISIT'
    ) {
      throw new BadRequestException(
        'The selected lead status does not schedule a site visit.',
      );
    }

    let displayId = body.displayId;
    if (!displayId) {
      displayId = await this.nextSiteVisitDisplayId();
    }

    let visit: SiteVisitRecord | null = null;
    let assignedExecutiveId: string | null = null;
    let leadId = '';
    let attempts = 0;
    while (!visit && attempts < 5) {
      try {
        const created = await this.db().$transaction(
          async (tx: Prisma.TransactionClient) => {
            const assignment = await this.resolveSiteVisitAssignment(
              body.leadId,
              actorUserId,
              tx,
            );
            const newVisit = await tx.siteVisit.create({
              data: {
                displayId,
                leadId: assignment.id,
                projectId: body.projectId,
                unitId: body.unitId,
                status: body.status ?? 'Scheduled',
                visitType: body.visitType ?? 'Site Visit',
                scheduledAt,
                durationMinutes:
                  Number(body.durationMinutes ?? body.duration) || undefined,
                assignedExecutiveId: assignment.fieldExecutiveId,
                meetingPoint: body.meetingPoint,
                transportMode: body.transportMode,
                visitorCount:
                  Number(body.visitorCount ?? body.visitors) || undefined,
                specialRequest: body.specialRequest,
                notes: body.notes,
                reminderEnabled: body.reminderEnabled ?? false,
                reminderAt: normalizeDate(body.reminderAt),
                createdById: actorUserId,
              },
            });
            if (requestedLeadStatus) {
              await tx.lead.update({
                where: { id: assignment.id },
                data: { statusId: requestedLeadStatus.id },
              });
            }
            return { newVisit, assignment };
          },
        );
        visit = created.newVisit;
        leadId = created.assignment.id;
        assignedExecutiveId = created.assignment.fieldExecutiveId;
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          !body.displayId
        ) {
          attempts++;
          const num =
            parseInt(String(displayId).replace(/^SV-/i, ''), 10) ||
            attempts + 1;
          displayId = `SV-${String(num + 1).padStart(4, '0')}`;
        } else {
          throw error;
        }
      }
    }

    if (!visit) {
      throw new BadRequestException(
        'Unable to create site visit due to ID collision. Please try again.',
      );
    }
    await this.audit(actorUserId, 'SITE_VISIT_CREATED', 'SiteVisit', visit.id);
    if (requestedLeadStatus) {
      await this.audit(actorUserId, 'LEAD_UPDATED', 'Lead', leadId, {
        statusId: requestedLeadStatus.id,
        source: 'SITE_VISIT_CREATED',
      });
    }
    await this.db()
      .activity.create({
        data: {
          leadId: visit.leadId,
          actorId: actorUserId,
          type: 'SITE_VISIT_CREATED',
          title: 'Site visit scheduled',
          description: 'A new site visit was scheduled',
        },
      })
      .catch(() => undefined);
    if (assignedExecutiveId) {
      const [lead, recipient] = await Promise.all([
        this.db()
          .lead.findUnique({
            where: { id: visit.leadId },
            select: { name: true, displayId: true, organizationId: true },
          })
          .catch(() => null),
        this.db().user.findUnique({
          where: { id: assignedExecutiveId },
          select: { id: true, role: true },
        }),
      ]);
      const leadName = lead?.name ?? 'Client';
      const scheduledTimeStr = new Date(visit.scheduledAt).toLocaleString();
      const navigation = this.buildNotificationNavigationPayload(
        recipient?.role,
        'site-visits',
        {
          visitId: visit.id,
          leadId: visit.leadId,
          leadDisplayId: lead?.displayId ?? undefined,
        },
      );
      const pushPayload = recipient
        ? await this.createNotificationWithNavigation(
            {
              userId: recipient.id,
              type: 'site-visit-scheduled',
              title: 'New Site Visit Scheduled',
              description: `Site visit scheduled with ${leadName} for ${scheduledTimeStr}`,
              badge: this.roleLabel(recipient.role),
              message: 'Open Site Visits to review the schedule.',
              entityType: 'SiteVisit',
              entityId: visit.id,
              details: { leadName, scheduledAt: visit.scheduledAt },
            },
            navigation,
          )
        : navigation;
      this.sendPushNotification(
        assignedExecutiveId,
        {
          title: 'New Site Visit Scheduled',
          body: `Site visit scheduled with ${leadName} for ${scheduledTimeStr}`,
          type: 'site-visit-scheduled',
          data: {
            leadName,
            scheduledAt: visit.scheduledAt,
            ...pushPayload,
          },
        },
        { organizationId: lead?.organizationId },
      ).catch((err) =>
        this.logger.warn(
          `Push notify error on site visit schedule: ${err?.message}`,
        ),
      );
    }
    return visit;
  }

  private async resolveSiteVisitCompletion(
    visitType: string | null | undefined,
    body: Body,
  ): Promise<SiteVisitCompletion> {
    const requestedStatus =
      body.leadStatusId ??
      body.leadStatus ??
      body.statusId ??
      (String(visitType ?? '')
        .toLowerCase()
        .includes('revisit')
        ? 'RE_VISIT_DONE'
        : 'SITE_VISIT_DONE');
    const leadStatus = await this.resolveActiveLeadStatus(requestedStatus);
    if (!this.isSiteVisitCompletionStatus(leadStatus)) {
      throw new BadRequestException(
        'Select a completed site-visit status before completing the visit.',
      );
    }

    const rawFollowUpDate = body.nextFollowUpAt ?? body.followUpDate;
    const followUpTime = body.followUpTime ? String(body.followUpTime) : '';
    let scheduledFollowUp: Date | null = null;
    if (rawFollowUpDate) {
      if (followUpTime) {
        scheduledFollowUp = normalizeDate(
          `${String(rawFollowUpDate).slice(0, 10)} ${followUpTime}`,
        );
      }
      if (!scheduledFollowUp)
        scheduledFollowUp = normalizeDate(rawFollowUpDate);
    }

    return {
      leadStatusId: leadStatus.id,
      scheduledFollowUp,
      remarkText: String(
        body.feedback ?? body.remarks ?? body.notes ?? '',
      ).trim(),
    };
  }

  private async applySiteVisitCompletion(
    tx: Prisma.TransactionClient,
    visit: { leadId: string; assignedExecutiveId?: string | null },
    completion: SiteVisitCompletion,
    actorUserId?: string | null,
  ) {
    await tx.lead.update({
      where: { id: visit.leadId },
      data: {
        statusId: completion.leadStatusId,
        nextFollowUpAt: completion.scheduledFollowUp ?? undefined,
        remarks: completion.remarkText || undefined,
      },
    });
    if (completion.scheduledFollowUp) {
      const existingFollowUp = await tx.followUp.findFirst({
        where: {
          leadId: visit.leadId,
          completedAt: null,
          scheduledAt: completion.scheduledFollowUp,
        },
        select: { id: true },
      });
      if (!existingFollowUp) {
        await tx.followUp.create({
          data: {
            leadId: visit.leadId,
            assignedToId: visit.assignedExecutiveId ?? actorUserId ?? undefined,
            typeId: 'Call',
            statusId: 'Scheduled',
            scheduledAt: completion.scheduledFollowUp,
            nextAction: completion.remarkText || 'Site Visit Follow-up',
            notes: completion.remarkText || undefined,
            setReminder: true,
          },
        });
      }
    }
    if (completion.remarkText) {
      await tx.note.create({
        data: {
          leadId: visit.leadId,
          authorId: actorUserId ?? null,
          text: `[Site Visit Remark] ${completion.remarkText}`,
          isPinned: false,
        },
      });
    }
  }

  async updateSiteVisit(id: string, body: Body, actor?: string | Body) {
    const actorUserId = this.actorIdFrom(actor);
    if (actor && typeof actor !== 'string') {
      await this.getSiteVisit(id, actor);
    }
    const existing = await this.db().siteVisit.findFirst({
      where: { OR: [{ id }, { displayId: id }] },
    });
    if (!existing) throw new NotFoundException('Site visit not found');

    if (
      (body.assignedExecutiveId !== undefined &&
        body.assignedExecutiveId !== existing.assignedExecutiveId) ||
      (body.assigneeId !== undefined &&
        body.assigneeId !== existing.assignedExecutiveId)
    ) {
      throw new BadRequestException(
        'The assigned executive cannot be changed on a site visit.',
      );
    }

    const updateData: Record<string, any> = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.visitType !== undefined) updateData.visitType = body.visitType;
    if (body.scheduledAt !== undefined && body.scheduledAt !== null) {
      updateData.scheduledAt = normalizeDate(body.scheduledAt);
    }
    if (body.durationMinutes !== undefined)
      updateData.durationMinutes = body.durationMinutes;
    if (body.feedback !== undefined) updateData.feedback = body.feedback;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.meetingPoint !== undefined)
      updateData.meetingPoint = body.meetingPoint;
    if (body.transportMode !== undefined)
      updateData.transportMode = body.transportMode;
    if (body.visitorCount !== undefined)
      updateData.visitorCount = body.visitorCount;
    if (body.specialRequest !== undefined)
      updateData.specialRequest = body.specialRequest;
    if (body.reminderAt !== undefined) {
      updateData.reminderAt = body.reminderAt
        ? normalizeDate(body.reminderAt)
        : null;
    }

    const isCompleting =
      String(body.status ?? '').toLowerCase() === 'completed' &&
      String(existing.status).toLowerCase() !== 'completed';
    const completion = isCompleting
      ? await this.resolveSiteVisitCompletion(existing.visitType, body)
      : null;
    const visit = completion
      ? await this.db().$transaction(async (tx: Prisma.TransactionClient) => {
          const completedVisit = await tx.siteVisit.update({
            where: { id: existing.id },
            data: updateData,
          });
          await this.applySiteVisitCompletion(
            tx,
            completedVisit,
            completion,
            actorUserId,
          );
          return completedVisit;
        })
      : await this.db().siteVisit.update({
          where: { id: existing.id },
          data: updateData,
        });
    if (visit.assignedExecutiveId) {
      const [lead, recipient] = await Promise.all([
        this.db()
          .lead.findUnique({
            where: { id: visit.leadId },
            select: { name: true, displayId: true, organizationId: true },
          })
          .catch(() => null),
        this.db().user.findUnique({
          where: { id: visit.assignedExecutiveId },
          select: { id: true, role: true },
        }),
      ]);
      const leadName = lead?.name ?? 'Client';
      const navigation = this.buildNotificationNavigationPayload(
        recipient?.role,
        'site-visits',
        {
          visitId: visit.id,
          leadId: visit.leadId,
          leadDisplayId: lead?.displayId ?? undefined,
        },
      );
      const pushPayload = recipient
        ? await this.createNotificationWithNavigation(
            {
              userId: recipient.id,
              type:
                visit.status === 'Cancelled'
                  ? 'site-visit-cancelled'
                  : 'site-visit-updated',
              title: `Site Visit ${visit.status || 'Updated'}`,
              description: `Site visit for ${leadName} has been updated (${
                visit.status || 'Updated'
              })`,
              badge: this.roleLabel(recipient.role),
              message: 'Open Site Visits to review the latest update.',
              entityType: 'SiteVisit',
              entityId: visit.id,
              details: { leadName, status: visit.status },
            },
            navigation,
          )
        : navigation;
      this.sendPushNotification(
        visit.assignedExecutiveId,
        {
          title: `Site Visit ${visit.status || 'Updated'}`,
          body: `Site visit for ${leadName} has been updated (${
            visit.status || 'Updated'
          })`,
          type:
            visit.status === 'Cancelled'
              ? 'site-visit-cancelled'
              : 'site-visit-updated',
          data: {
            status: visit.status,
            ...pushPayload,
          },
        },
        { organizationId: lead?.organizationId },
      ).catch((err) =>
        this.logger.warn(
          `Push notify error on site visit update: ${err?.message}`,
        ),
      );
    }
    await this.audit(
      actorUserId,
      'SITE_VISIT_UPDATED',
      'SiteVisit',
      existing.id,
      body,
    );
    const activityType =
      body.status === 'Completed'
        ? 'SITE_VISIT_COMPLETED'
        : body.status === 'Cancelled'
        ? 'SITE_VISIT_CANCELLED'
        : 'SITE_VISIT_UPDATED';
    const activityTitle =
      body.status === 'Completed'
        ? 'Site visit completed'
        : body.status === 'Cancelled'
        ? 'Site visit cancelled'
        : 'Site visit updated';
    const activityDesc =
      body.feedback ||
      body.notes ||
      `Site visit status set to ${visit.status || 'Updated'}`;

    await this.db()
      .activity.create({
        data: {
          leadId: visit.leadId,
          actorId: actorUserId,
          type: activityType,
          title: activityTitle,
          description: activityDesc,
        },
      })
      .catch(() => undefined);

    return visit;
  }

  async recordFieldExecutiveLocation(body: Body, user: Body) {
    const latitude = coordinate(body.latitude, -90, 90, 'latitude');
    const longitude = coordinate(body.longitude, -180, 180, 'longitude');
    const accuracy = optionalCoordinate(body.accuracy, 0, 100000, 'accuracy');
    const speed = optionalCoordinate(body.speed, 0, 1000, 'speed');
    const heading = optionalCoordinate(body.heading, 0, 360, 'heading');
    const existing = await this.db().user.findUnique({
      where: { id: user.sub },
      select: { metadata: true },
    });
    const currentMetadata =
      existing?.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Body)
        : {};
    const wasTracking = currentMetadata.fieldTracking?.isTracking === true;
    const startedAt =
      currentMetadata.fieldTracking?.startedAt ?? new Date().toISOString();
    const fieldTracking = {
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      trackedAt: new Date().toISOString(),
      startedAt,
      isTracking: true,
    };
    await this.db().user.update({
      where: { id: user.sub },
      data: {
        metadata: {
          ...currentMetadata,
          fieldTracking,
        },
      },
    });
    if (!wasTracking) {
      await this.audit(user.sub, 'FIELD_TRACKING_STARTED', 'User', user.sub);
    }
    return { success: true, fieldTracking };
  }

  async stopFieldExecutiveLocation(user: Body) {
    const existing = await this.db().user.findUnique({
      where: { id: user.sub },
      select: { metadata: true },
    });
    const currentMetadata =
      existing?.metadata && typeof existing.metadata === 'object'
        ? (existing.metadata as Body)
        : {};
    const fieldTracking = {
      ...(currentMetadata.fieldTracking ?? {}),
      stoppedAt: new Date().toISOString(),
      isTracking: false,
    };
    await this.db().user.update({
      where: { id: user.sub },
      data: {
        metadata: {
          ...currentMetadata,
          fieldTracking,
        },
      },
    });
    await this.audit(user.sub, 'FIELD_TRACKING_STOPPED', 'User', user.sub);
    return { success: true, fieldTracking };
  }

  async listLiveFieldExecutiveLocations() {
    const executives = await this.db().user.findMany({
      where: {
        isActive: true,
        role: 'SALES_AGENT',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        avatarStorageKey: true,
        metadata: true,
      },
      orderBy: { fullName: 'asc' },
    });
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const visits = await this.db().siteVisit.findMany({
      where: {
        assignedExecutiveId: { in: executives.map((item) => item.id) },
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
      include: { lead: true, project: true },
      orderBy: { scheduledAt: 'asc' },
    });
    const visitsByExecutive = new Map<string, Body[]>();
    visits.forEach((visit: Body) => {
      const current = visitsByExecutive.get(visit.assignedExecutiveId) ?? [];
      current.push(visit);
      visitsByExecutive.set(visit.assignedExecutiveId, current);
    });
    return {
      data: executives.map((executive: Body) => {
        const metadata =
          executive.metadata && typeof executive.metadata === 'object'
            ? executive.metadata
            : {};
        const fieldTracking = metadata.fieldTracking ?? null;
        const todaysVisits = visitsByExecutive.get(executive.id) ?? [];
        const activeVisit =
          todaysVisits.find(
            (visit) => visit.checkedInAt && !visit.checkedOutAt,
          ) ?? null;
        const nextVisit =
          todaysVisits.find((visit) => !visit.checkedOutAt) ?? null;
        return {
          id: executive.id,
          name: executive.fullName ?? executive.email,
          email: executive.email,
          role: executive.role,
          image: executive.avatarStorageKey,
          tracking: fieldTracking,
          activeVisit: activeVisit
            ? {
                id: activeVisit.id,
                leadName: activeVisit.lead?.name,
                projectName: activeVisit.project?.name,
                scheduledAt: activeVisit.scheduledAt,
              }
            : null,
          nextVisit: nextVisit
            ? {
                id: nextVisit.id,
                leadName: nextVisit.lead?.name,
                projectName: nextVisit.project?.name,
                scheduledAt: nextVisit.scheduledAt,
              }
            : null,
        };
      }),
    };
  }

  async checkInSiteVisit(id: string, body: Body, user: Body) {
    const visit = await this.db().siteVisit.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!visit) throw new NotFoundException('Site visit not found');
    if (user.role === 'SALES_AGENT' && visit.assignedExecutiveId !== user.sub) {
      throw new ForbiddenException('You cannot start this site visit');
    }
    if (visit.checkedInAt) {
      throw new BadRequestException('This site visit is already started');
    }
    const latitude = coordinate(body.latitude, -90, 90, 'latitude');
    const longitude = coordinate(body.longitude, -180, 180, 'longitude');
    const geofenceReady =
      visit.project?.latitude !== null &&
      visit.project?.latitude !== undefined &&
      visit.project?.longitude !== null &&
      visit.project?.longitude !== undefined;
    const canOverride =
      body.overrideGeofence === true &&
      ['SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER'].includes(user.role);
    if (!geofenceReady && user.role === 'SALES_AGENT') {
      throw new BadRequestException('Project geofence is not configured');
    }
    if (geofenceReady && !canOverride) {
      const projectLatitude = Number(visit.project?.latitude);
      const projectLongitude = Number(visit.project?.longitude);
      const radius = Number(visit.project?.geofenceRadiusM ?? 150);
      const distanceM = Math.round(
        haversineDistanceMeters(
          latitude,
          longitude,
          projectLatitude,
          projectLongitude,
        ),
      );
      if (distanceM > radius) {
        throw new BadRequestException({
          message: 'You are outside the project geofence',
          distanceM,
          radiusM: radius,
          remainingM: distanceM - radius,
        });
      }
    }
    const checkedIn = await this.db().siteVisit.update({
      where: { id },
      data: {
        checkedInAt: new Date(),
        checkedInLatitude: latitude,
        checkedInLongitude: longitude,
        checkedInAccuracyM: coordinate(body.accuracy, 0, 100000, 'accuracy'),
      },
    });
    await this.audit(user.sub, 'SITE_VISIT_CHECKED_IN', 'SiteVisit', id, {
      latitude,
      longitude,
    });
    await this.db()
      .activity.create({
        data: {
          leadId: checkedIn.leadId,
          actorId: user.sub,
          type: 'SITE_VISIT_CHECKED_IN',
          title: 'Site visit started',
          description: 'Field executive checked in for the site visit',
        },
      })
      .catch(() => undefined);
    return checkedIn;
  }

  async checkOutSiteVisit(id: string, body: Body, user: Body) {
    const visit = await this.db().siteVisit.findUnique({ where: { id } });
    if (!visit) throw new NotFoundException('Site visit not found');
    if (user.role === 'SALES_AGENT' && visit.assignedExecutiveId !== user.sub) {
      throw new ForbiddenException('You cannot complete this site visit');
    }
    if (!visit.checkedInAt) {
      throw new BadRequestException('Start the visit before completing it');
    }
    if (visit.checkedOutAt) {
      throw new BadRequestException('This site visit is already completed');
    }
    const feedback = String(body.feedback ?? '').trim();
    if (!feedback) {
      throw new BadRequestException('Feedback remarks are required');
    }
    const latitude = coordinate(body.latitude, -90, 90, 'latitude');
    const longitude = coordinate(body.longitude, -180, 180, 'longitude');
    const notes = [body.outcome, body.nextAction]
      .filter(Boolean)
      .map(String)
      .join(' | ');
    const completion = await this.resolveSiteVisitCompletion(
      visit.visitType,
      body,
    );
    const checkedOut = await this.db().$transaction(
      async (tx: Prisma.TransactionClient) => {
        const completedVisit = await tx.siteVisit.update({
          where: { id },
          data: {
            checkedOutAt: new Date(),
            checkedOutLatitude: latitude,
            checkedOutLongitude: longitude,
            checkedOutAccuracyM: coordinate(
              body.accuracy,
              0,
              100000,
              'accuracy',
            ),
            status: 'Completed',
            feedback,
            rating: body.rating ? Number(body.rating) : undefined,
            notes: notes || undefined,
          },
        });
        await this.applySiteVisitCompletion(
          tx,
          completedVisit,
          completion,
          user.sub,
        );
        return completedVisit;
      },
    );
    await this.audit(user.sub, 'SITE_VISIT_CHECKED_OUT', 'SiteVisit', id, {
      latitude,
      longitude,
      outcome: body.outcome,
    });
    return checkedOut;
  }

  async listCallLogs(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const where: Body = {};
    if (query.type) where.direction = String(query.type);
    if (query.outcome) where.outcome = String(query.outcome);
    if (query.dateFrom || query.dateTo) {
      where.startedAt = {
        ...(query.dateFrom ? { gte: new Date(String(query.dateFrom)) } : {}),
        ...(query.dateTo
          ? { lte: new Date(`${String(query.dateTo)}T23:59:59.999Z`) }
          : {}),
      };
    }

    const actorRole = String(user?.role ?? '');
    const hasGlobalScope = [
      'SUPER_ADMIN',
      'ADMIN',
      'HR',
      'SALES_MANAGER',
    ].includes(actorRole);
    let allowedUserIds: string[] | undefined;
    let allowedTeamIds: string[] = [];

    if (!hasGlobalScope) {
      if (actorRole === 'TEAM_LEADER' || actorRole === 'MANAGER') {
        const [teams, grants, profile] = await Promise.all([
          this.db().team.findMany({
            where: {
              isActive: true,
              OR: [
                { leaderId: user?.sub },
                { visibilityGrants: { some: { leaderUserId: user?.sub } } },
              ],
            },
            select: { id: true },
          }),
          this.db().teamLeaderVisibilityGrant.findMany({
            where: { leaderUserId: user?.sub },
            select: { teamId: true, userId: true },
          }),
          this.db().employeeProfile.findUnique({
            where: { userId: user?.sub },
            select: { teamId: true },
          }),
        ]);
        allowedTeamIds = Array.from(
          new Set(
            [
              ...teams.map((team) => team.id),
              ...grants.map((grant) => grant.teamId).filter(Boolean),
              profile?.teamId,
            ].filter(Boolean) as string[],
          ),
        );
        const scopedUsers = await this.db().user.findMany({
          where: {
            OR: [
              { id: user?.sub },
              {
                id: {
                  in: grants
                    .map((grant) => grant.userId)
                    .filter(Boolean) as string[],
                },
              },
              { employeeProfile: { is: { teamId: { in: allowedTeamIds } } } },
              { teamMemberships: { some: { teamId: { in: allowedTeamIds } } } },
            ],
          },
          select: { id: true },
        });
        allowedUserIds = scopedUsers.map((item) => item.id);
      } else {
        allowedUserIds = user?.sub ? [String(user.sub)] : [];
      }
    }

    if (query.teamId && query.teamId !== 'all') {
      const requestedTeamUsers = await this.db().user.findMany({
        where: {
          OR: [
            { employeeProfile: { is: { teamId: String(query.teamId) } } },
            { teamMemberships: { some: { teamId: String(query.teamId) } } },
          ],
        },
        select: { id: true },
      });
      const requestedIds = requestedTeamUsers.map((item) => item.id);
      allowedUserIds = allowedUserIds
        ? allowedUserIds.filter((id) => requestedIds.includes(id))
        : requestedIds;
    }
    if (query.executive && query.executive !== 'all') {
      const requestedUserId = String(query.executive);
      if (!allowedUserIds || allowedUserIds.includes(requestedUserId)) {
        allowedUserIds = [requestedUserId];
      } else {
        allowedUserIds = [];
      }
    }
    if (allowedUserIds) where.userId = { in: allowedUserIds };
    if (query.search) {
      const search = String(query.search).trim();
      if (search) {
        where.lead = {
          OR: [
            { name: { contains: search } },
            { mobile: { contains: search } },
            { displayId: { contains: search } },
          ],
        };
      }
    }
    const [items, total] = await Promise.all([
      this.db().callLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          lead: {
            select: { id: true, displayId: true, name: true, mobile: true },
          },
        },
        orderBy: { startedAt: 'desc' },
      }),
      this.db().callLog.count({ where }),
    ]);
    const userIds = Array.from(
      new Set(items.map((item) => item.userId).filter(Boolean)),
    ) as string[];
    const callers = userIds.length
      ? await this.db().user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            fullName: true,
            role: true,
            employeeProfile: {
              select: { team: { select: { id: true, name: true } } },
            },
          },
        })
      : [];
    const callerById = new Map(callers.map((caller) => [caller.id, caller]));
    return {
      data: items.map((item) => ({
        ...item,
        caller: item.userId ? callerById.get(item.userId) ?? null : null,
      })),
      meta: { page, limit, total },
      scope: { hasGlobalScope, allowedTeamIds },
    };
  }

  async createCallLog(body: Body, actorUserId?: string) {
    const log = await this.db().callLog.create({
      data: {
        leadId: body.leadId,
        userId: body.userId ?? actorUserId,
        direction: body.direction ?? body.callType ?? 'Outgoing',
        startedAt:
          normalizeDate(
            body.startedAt ?? `${body.callDate ?? ''} ${body.callTime ?? ''}`,
          ) ?? new Date(),
        durationSeconds: body.durationSeconds,
        outcome: body.outcome,
        followUpStatus: body.followUpStatus,
        notes: body.notes,
        recordingId: body.recordingId,
        customerResponse: body.customerResponse,
      },
    });
    await this.audit(actorUserId, 'CALL_LOG_CREATED', 'CallLog', log.id);
    return log;
  }

  async listLeadImports(query: Query) {
    const { page, limit, skip } = pageMeta(query);
    const organizationId = this.tenantAccess.organizationId;
    const where: Body = { organizationId };
    if (query.targetType)
      where.targetType = String(query.targetType).toUpperCase();
    const [items, total] = await Promise.all([
      this.db().leadImport.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { rows: true },
      }),
      this.db().leadImport.count({ where }),
    ]);
    const userIds = Array.from(
      new Set(items.map((item: Body) => item.importedById).filter(Boolean)),
    ) as string[];
    const users = userIds.length
      ? await this.db().user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true },
        })
      : [];
    const userMap = new Map(
      users.map((item: Body) => [
        item.id,
        item.fullName ?? item.email ?? 'Unknown',
      ]),
    );
    return {
      data: items.map((item: Body) => ({
        ...item,
        importedByName: item.importedById
          ? userMap.get(item.importedById)
          : null,
      })),
      meta: { page, limit, total },
    };
  }

  async getLeadImportStats() {
    const organizationId = this.tenantAccess.organizationId;
    const sources = await this.db().leadMasterValue.findMany({
      where: { categoryRef: { code: 'source' } },
      select: { id: true, name: true, code: true },
    });

    const leadCounts = await this.db().lead.groupBy({
      by: ['sourceId'],
      _count: { _all: true },
      where: { organizationId, deletedAt: null },
    });

    const countMap: Record<string, number> = {};
    for (const group of leadCounts) {
      if (group.sourceId) {
        countMap[group.sourceId] = group._count._all;
      }
    }

    const sourceCounts: Record<string, number> = {
      magicbricks: 0,
      '99acres': 0,
      housing: 0,
      google: 0,
      meta: 0,
      justdial: 0,
      website: 0,
      referral: 0,
      'walk-in': 0,
    };

    sources.forEach((src: any) => {
      const count = countMap[src.id] || 0;
      const lowerName = (src.name || '').toLowerCase();
      const lowerCode = (src.code || '').toLowerCase();

      if (lowerName.includes('magicbricks') || lowerCode.includes('magic')) {
        sourceCounts.magicbricks += count;
      } else if (lowerName.includes('99acres') || lowerCode.includes('99')) {
        sourceCounts['99acres'] += count;
      } else if (
        lowerName.includes('housing') ||
        lowerCode.includes('housing')
      ) {
        sourceCounts.housing += count;
      } else if (lowerName.includes('google') || lowerCode.includes('google')) {
        sourceCounts.google += count;
      } else if (
        lowerName.includes('meta') ||
        lowerName.includes('facebook') ||
        lowerName.includes('instagram') ||
        lowerCode.includes('meta') ||
        lowerCode.includes('facebook') ||
        lowerCode.includes('fb') ||
        lowerCode.includes('ig')
      ) {
        sourceCounts.meta += count;
      } else if (
        lowerName.includes('justdial') ||
        lowerCode.includes('justdial')
      ) {
        sourceCounts.justdial += count;
      } else if (
        lowerName.includes('website') ||
        lowerCode.includes('website')
      ) {
        sourceCounts.website += count;
      } else if (
        lowerName.includes('referral') ||
        lowerCode.includes('referral')
      ) {
        sourceCounts.referral += count;
      } else if (
        lowerName.includes('walk-in') ||
        lowerName.includes('walkin') ||
        lowerCode.includes('walk')
      ) {
        sourceCounts['walk-in'] += count;
      }
    });

    // Integration routing can intentionally override a lead's CRM source. Count
    // successful channel captures from their lead audit records so these cards
    // continue to represent the originating connector, not the selected source.
    // Join to active leads and count distinct lead IDs to exclude deleted leads
    // and avoid double-counting duplicate audit entries.
    const integrationLeadCounts = await this.db().$queryRaw<
      Array<{ action: string; count: number }>
    >`
      SELECT audit."action", COUNT(DISTINCT lead."id")::int AS "count"
      FROM "AuditLog" audit
      INNER JOIN "Lead" lead
        ON lead."id" = audit."entityId"
       AND lead."deletedAt" IS NULL
      WHERE audit."entityType" = 'Lead'
        AND lead."organizationId" = ${organizationId}
        AND audit."organizationId" = ${organizationId}
        AND audit."action" IN (
          'MAGICBRICKS_LEAD_RECEIVED',
          'HOUSING_LEAD_RECEIVED',
          'WEBSITE_LEAD_RECEIVED',
          'META_LEAD_RECEIVED'
        )
      GROUP BY audit."action"
    `;
    const integrationCountsByAction = new Map<string, number>();
    for (const { action, count } of integrationLeadCounts) {
      integrationCountsByAction.set(action, Number(count));
    }
    sourceCounts.magicbricks =
      integrationCountsByAction.get('MAGICBRICKS_LEAD_RECEIVED') ?? 0;
    sourceCounts.housing =
      integrationCountsByAction.get('HOUSING_LEAD_RECEIVED') ?? 0;
    sourceCounts.website =
      integrationCountsByAction.get('WEBSITE_LEAD_RECEIVED') ?? 0;
    sourceCounts.meta =
      integrationCountsByAction.get('META_LEAD_RECEIVED') ?? 0;

    const newStatusMaster = await this.db().leadMasterValue.findFirst({
      where: {
        categoryRef: { code: 'status' },
        OR: [
          { code: { equals: 'New', mode: 'insensitive' } },
          { name: { equals: 'New', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    const [
      totalLeads,
      newLeads,
      totalImports,
      portalIntegrations,
      portalAccounts,
    ] = await Promise.all([
      this.db().lead.count({ where: { organizationId, deletedAt: null } }),
      newStatusMaster?.id
        ? this.db().lead.count({
            where: {
              organizationId,
              deletedAt: null,
              statusId: newStatusMaster.id,
            },
          })
        : Promise.resolve(0),
      this.db().leadImport.count({ where: { organizationId } }),
      this.db().portalIntegration.findMany({
        where: {
          organizationId,
          provider: {
            in: [magicBricksProvider, acres99Provider, metaProvider, 'website'],
          },
        },
        select: {
          provider: true,
          status: true,
          isActive: true,
          lastTestStatus: true,
          lastLeadReceivedAt: true,
        },
      }),
      this.prisma.leadSourceConnection.findMany({
        where: {
          organizationId,
          provider: { in: ['magicbricks', 'housing'] },
          archivedAt: null,
        },
        select: {
          provider: true,
          status: true,
          isActive: true,
          lastTestStatus: true,
          lastLeadReceivedAt: true,
        },
      }),
    ]);

    const portalByProvider = new Map(
      portalIntegrations.map((integration: Body) => [
        integration.provider,
        integration,
      ]),
    );
    for (const provider of ['magicbricks', 'housing']) {
      const accounts = portalAccounts.filter(
        (account) => account.provider === provider,
      );
      portalByProvider.delete(provider);
      if (!accounts.length) continue;
      const active = accounts.filter((account) => account.isActive);
      const latest = accounts
        .map((account) => account.lastLeadReceivedAt)
        .filter((value): value is Date => Boolean(value))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      portalByProvider.set(provider, {
        isActive: active.length > 0,
        status: active.some((account) => /connected/i.test(account.status))
          ? 'Connected'
          : 'Configured',
        lastLeadReceivedAt: latest,
        lastTestStatus: active.some((account) =>
          /failed|error/i.test(account.lastTestStatus ?? ''),
        )
          ? 'Failed'
          : null,
      });
    }
    const normalizeState = (integration?: Body | null) => {
      if (!integration) return 'NOT_CONFIGURED';
      if (integration.isActive === false) return 'PAUSED';
      if (/failed|error/i.test(String(integration.lastTestStatus ?? ''))) {
        return 'ERROR';
      }
      if (
        integration.lastLeadReceivedAt ||
        /connected|active/i.test(String(integration.status ?? ''))
      ) {
        return 'ACTIVE';
      }
      return 'CONFIGURED';
    };
    const connector = (
      id: 'magicbricks' | '99acres' | 'housing' | 'meta' | 'website',
      integration?: Body | null,
    ) => {
      const leadCount = sourceCounts[id] ?? 0;
      const normalizedState = normalizeState(integration);
      return {
        id,
        state:
          normalizedState === 'CONFIGURED' && leadCount > 0
            ? 'ACTIVE'
            : normalizedState,
        leadCount,
        lastLeadReceivedAt:
          integration?.lastLeadReceivedAt?.toISOString?.() ?? null,
        lastTestStatus: integration?.lastTestStatus ?? null,
      };
    };
    const connectors = [
      connector('magicbricks', portalByProvider.get(magicBricksProvider)),
      connector('99acres', portalByProvider.get(acres99Provider)),
      connector('housing', portalByProvider.get('housing')),
      connector('meta', portalByProvider.get(metaProvider)),
      connector('website', portalByProvider.get('website')),
    ];

    return {
      sourceCounts,
      connectors,
      totalLeads,
      newLeads,
      duplicates: 0,
      totalImports,
    };
  }

  private async resolveImportSourceId(value?: unknown) {
    return this.resolveImportMasterValueId('source', value);
  }

  private async resolveImportMasterValueId(category: string, value?: unknown) {
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;
    const masterValue = await this.db().leadMasterValue.findFirst({
      where: {
        categoryRef: { code: category },
        isActive: true,
        OR: [
          { id: raw },
          { code: { equals: raw, mode: 'insensitive' } },
          { name: { equals: raw, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
    return masterValue?.id;
  }

  private async resolveImportProjectId(value?: unknown) {
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;
    const project = await this.db().project.findFirst({
      where: {
        OR: [{ id: raw }, { name: { equals: raw, mode: 'insensitive' } }],
      },
      select: { id: true },
    });
    return project?.id;
  }

  private async resolveImportAssignee(value?: unknown, roles?: string[]) {
    const raw = String(value ?? '').trim();
    if (!raw) return undefined;
    const user = await this.db().user.findFirst({
      where: {
        ...(roles?.length ? { role: { in: roles } } : {}),
        OR: [
          { id: raw },
          { email: { equals: raw, mode: 'insensitive' } },
          { fullName: { equals: raw, mode: 'insensitive' } },
        ],
      },
      select: { id: true, role: true },
    });
    return user;
  }

  private normalizeImportedLeadRow(
    row: Body,
    targetType: 'LEAD' | 'CONTACT_LEAD',
  ) {
    const name =
      row.name ??
      row.leadName ??
      row.customerName ??
      row['Lead Name'] ??
      row['Customer Name'] ??
      row['Full Name'];
    const mobile =
      row.mobile ??
      row.mobileNumber ??
      row['Mobile Number'] ??
      row['Phone Number'];
    const normalized: Body = {
      name: name ? String(name).trim() : '',
      customerName: name ? String(name).trim() : '',
      mobile: mobile ? String(mobile).trim() : '',
      email:
        row.email ??
        row.emailAddress ??
        row['Email Address'] ??
        row['Email ID'],
      alternateMobile:
        row.alternateMobile ??
        row.alternateNumber ??
        row['Alternate Mobile Number'],
      note: row.note ?? row.remarks ?? row['Remarks / Notes'] ?? row['Note'],
      sourceValue:
        row.sourceId ?? row.leadSource ?? row.source ?? row['Lead Source'],
      projectValue:
        row.preferredProjectId ??
        row.preferredProject ??
        row.projectName ??
        row.project ??
        row['Project'] ??
        row['Project Name'],
      assigneeValue:
        row.assignedToId ??
        row.assignedTo ??
        row.assignTo ??
        row.ownerId ??
        row.telecallerId ??
        row['Assign To'],
      telecallerValue:
        row.telecallerId ??
        row.telecaller ??
        row.telecallerName ??
        row.preSales ??
        row.preSalesExecutive ??
        row['Pre Sales'] ??
        row['Pre Sales Executive'] ??
        row['Telecaller'],
      fieldExecutiveValue:
        row.fieldExecutiveId ??
        row.fieldExecutive ??
        row.fieldExecutiveName ??
        row['Field Executive'],
      preferredLocation:
        row.preferredLocation ?? row.location ?? row['Preferred Location'],
    };

    if (targetType === 'LEAD') {
      normalized.propertyType =
        row.propertyType ?? row['Property Type'] ?? row['Property'];
      normalized.configuration = row.configuration ?? row['Configuration'];
      normalized.minBudget = row.minBudget ?? row['Minimum Budget'];
      normalized.maxBudget =
        row.maxBudget ?? row['Maximum Budget'] ?? row.budget;
      normalized.stageId = row.stageId ?? row.leadStage ?? row['Lead Stage'];
      normalized.statusId =
        row.statusId ?? row.leadStatus ?? row['Lead Status'];
      normalized.priorityId = row.priorityId ?? row.priority ?? row['Priority'];
      normalized.temperatureId =
        row.temperatureId ??
        row.leadType ??
        row['Lead Type'] ??
        row.leadTemperature ??
        row['Lead Temperature'];
    }

    return normalized;
  }

  async createLeadImport(body: Body, actorUserId?: string) {
    const organizationId = this.tenantAccess.organizationId;
    const rawRows = Array.isArray(body.rows) ? body.rows : [];
    const targetType =
      String(body.targetType ?? 'LEAD').toUpperCase() === 'CONTACT_LEAD'
        ? 'CONTACT_LEAD'
        : 'LEAD';
    const normalizedRows = rawRows.map((row: Body) =>
      this.normalizeImportedLeadRow(row, targetType),
    );
    const seenMobiles = new Set<string>();
    const importedRecords: Body[] = [];
    const rowPayloads: Body[] = [];

    for (const [index, row] of normalizedRows.entries()) {
      const name = String(
        targetType === 'CONTACT_LEAD' ? row.customerName : row.name,
      ).trim();
      const mobile = String(row.mobile ?? '').trim();

      if (!name || !mobile) {
        rowPayloads.push({
          rowNumber: index + 1,
          rawData: rawRows[index],
          mappedData: row,
          status: 'Error',
          errorMessage: 'Name and mobile are required',
        });
        continue;
      }

      if (seenMobiles.has(mobile)) {
        rowPayloads.push({
          rowNumber: index + 1,
          rawData: rawRows[index],
          mappedData: row,
          status: 'Duplicate',
          errorMessage: 'Duplicate mobile number found in this import file',
        });
        continue;
      }
      seenMobiles.add(mobile);

      const [
        sourceId,
        preferredProjectId,
        genericAssignee,
        telecaller,
        fieldExecutive,
        statusId,
        stageId,
        priorityId,
        temperatureId,
        existingRecord,
      ] = await Promise.all([
        this.resolveImportSourceId(row.sourceValue),
        this.resolveImportProjectId(row.projectValue),
        this.resolveImportAssignee(row.assigneeValue),
        this.resolveImportAssignee(row.telecallerValue, ['TELECALLER']),
        this.resolveImportAssignee(row.fieldExecutiveValue, ['SALES_AGENT']),
        targetType === 'LEAD'
          ? this.resolveImportMasterValueId('status', row.statusId)
          : Promise.resolve(undefined),
        targetType === 'LEAD'
          ? this.resolveImportMasterValueId('stage', row.stageId)
          : Promise.resolve(undefined),
        targetType === 'LEAD'
          ? this.resolveImportMasterValueId('priority', row.priorityId)
          : Promise.resolve(undefined),
        targetType === 'LEAD'
          ? this.resolveImportMasterValueId('temperature', row.temperatureId)
          : Promise.resolve(undefined),
        targetType === 'CONTACT_LEAD'
          ? this.db().contactLead.findFirst({
              where: { mobile },
              select: { id: true },
            })
          : this.db().lead.findFirst({
              where: { mobile },
              select: { id: true },
            }),
      ]);

      const assignedToId = genericAssignee?.id;
      const telecallerId = telecaller?.id;
      const fieldExecutiveId = fieldExecutive?.id;
      const importedTelecallerId =
        telecallerId ??
        (genericAssignee?.role === Role.TELECALLER ? assignedToId : undefined);
      const importedFieldExecutiveId =
        fieldExecutiveId ??
        (genericAssignee?.role === Role.SALES_AGENT ? assignedToId : undefined);

      if (existingRecord?.id) {
        try {
          if (targetType === 'CONTACT_LEAD') {
            await this.updateContactLead(
              existingRecord.id,
              {
                customerName: name,
                mobile,
                email: row.email,
                alternateMobile: row.alternateMobile,
                sourceId,
                preferredProjectId,
                assignedToId,
                note: row.note,
              },
              actorUserId,
            );
          } else {
            await this.updateLead(
              existingRecord.id,
              {
                name,
                mobile,
                email: row.email,
                alternateMobile: row.alternateMobile,
                sourceId,
                preferredProject: preferredProjectId,
                ownerId:
                  importedTelecallerId ??
                  importedFieldExecutiveId ??
                  assignedToId,
                telecallerId: importedTelecallerId,
                fieldExecutiveId: importedFieldExecutiveId,
                remarks: row.note,
                preferredLocation: row.preferredLocation,
                propertyType: row.propertyType,
                configuration: row.configuration,
                minBudget: row.minBudget,
                maxBudget: row.maxBudget,
                stageId,
                statusId,
                priorityId,
                temperatureId,
              },
              actorUserId,
            );
          }
          rowPayloads.push({
            rowNumber: index + 1,
            rawData: rawRows[index],
            mappedData: {
              ...row,
              sourceId,
              preferredProjectId,
              assignedToId,
              telecallerId,
              fieldExecutiveId,
              statusId,
              stageId,
              priorityId,
              temperatureId,
            },
            status: 'Updated',
          });
        } catch (error) {
          rowPayloads.push({
            rowNumber: index + 1,
            rawData: rawRows[index],
            mappedData: {
              ...row,
              sourceId,
              preferredProjectId,
              assignedToId,
              telecallerId,
              fieldExecutiveId,
              statusId,
              stageId,
              priorityId,
              temperatureId,
            },
            status: 'Error',
            errorMessage:
              error instanceof Error
                ? error.message
                : 'Update failed for this row',
          });
        }
        continue;
      }

      try {
        const createdRecord =
          targetType === 'CONTACT_LEAD'
            ? await this.createContactLead(
                {
                  customerName: name,
                  mobile,
                  email: row.email,
                  alternateMobile: row.alternateMobile,
                  sourceId,
                  preferredProjectId,
                  assignedToId,
                  note: row.note,
                },
                actorUserId,
              )
            : await this.createLead(
                {
                  name,
                  mobile,
                  email: row.email,
                  alternateMobile: row.alternateMobile,
                  sourceId,
                  preferredProject: preferredProjectId,
                  ownerId:
                    importedTelecallerId ??
                    importedFieldExecutiveId ??
                    assignedToId,
                  telecallerId: importedTelecallerId,
                  fieldExecutiveId: importedFieldExecutiveId,
                  remarks: row.note,
                  preferredLocation: row.preferredLocation,
                  propertyType: row.propertyType,
                  configuration: row.configuration,
                  minBudget: row.minBudget,
                  maxBudget: row.maxBudget,
                  stageId,
                  statusId,
                  priorityId,
                  temperatureId,
                },
                actorUserId,
                { fromIntegration: true },
              );

        importedRecords.push(createdRecord);
        rowPayloads.push({
          rowNumber: index + 1,
          rawData: rawRows[index],
          mappedData: {
            ...row,
            sourceId,
            preferredProjectId,
            assignedToId,
            telecallerId,
            fieldExecutiveId,
            statusId,
            stageId,
            priorityId,
            temperatureId,
          },
          status: 'Imported',
        });
      } catch (error) {
        rowPayloads.push({
          rowNumber: index + 1,
          rawData: rawRows[index],
          mappedData: {
            ...row,
            sourceId,
            preferredProjectId,
            assignedToId,
            telecallerId,
            fieldExecutiveId,
            statusId,
            stageId,
            priorityId,
            temperatureId,
          },
          status: 'Error',
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Import failed for this row',
        });
      }
    }

    const duplicates = rowPayloads.filter(
      (row: Body) => row.status === 'Duplicate',
    ).length;
    const errors = rowPayloads.filter(
      (row: Body) => row.status === 'Error',
    ).length;
    const importedCount = rowPayloads.filter(
      (row: Body) => row.status === 'Imported',
    ).length;
    const updatedCount = rowPayloads.filter(
      (row: Body) => row.status === 'Updated',
    ).length;
    const record = await this.db().leadImport.create({
      data: {
        organizationId,
        source: body.source ?? 'Excel/CSV',
        targetType,
        fileName: body.fileName,
        status: importedCount > 0 || updatedCount > 0 ? 'Completed' : 'Failed',
        progress: 100,
        totalRecords: rawRows.length,
        newLeads: importedCount,
        updatedLeads: updatedCount,
        duplicates,
        errors,
        importedById: actorUserId,
        rows: {
          create: rowPayloads,
        },
      },
      include: { rows: true },
    });
    await this.audit(
      actorUserId,
      'LEAD_IMPORT_CREATED',
      'LeadImport',
      record.id,
      { targetType, importedCount, updatedCount, duplicates, errors },
      organizationId,
    );
    return record;
  }

  async listDuplicates() {
    return {
      data: await this.db().duplicateLeadGroup.findMany({
        orderBy: { detectedOn: 'desc' },
      }),
    };
  }

  async registerNotificationDeviceToken(body: Body, user?: Body) {
    if (!user?.sub) throw new ForbiddenException('Authentication required');
    const token = String(body.token ?? '').trim();
    if (!token) throw new BadRequestException('Device token is required');
    const platform = String(body.platform ?? 'android').trim() || 'android';
    const deviceId = body.deviceId ? String(body.deviceId).trim() : null;
    const appVersion = body.appVersion ? String(body.appVersion).trim() : null;

    return this.db().$transaction(async (tx: Body) => {
      if (deviceId) {
        // A Firebase token can rotate. Keep one active token per app installation,
        // while retaining active registrations from the user's other devices.
        await tx.mobileDeviceToken.updateMany({
          where: {
            userId: user.sub,
            platform,
            deviceId,
            token: { not: token },
            isActive: true,
          },
          data: { isActive: false, lastSeenAt: new Date() },
        });
      }

      return tx.mobileDeviceToken.upsert({
        where: { token },
        update: {
          userId: user.sub,
          platform,
          deviceId,
          appVersion,
          isActive: true,
          lastSeenAt: new Date(),
        },
        create: {
          userId: user.sub,
          token,
          platform,
          deviceId,
          appVersion,
          isActive: true,
          lastSeenAt: new Date(),
        },
        select: {
          id: true,
          token: true,
          platform: true,
          deviceId: true,
          appVersion: true,
          isActive: true,
          lastSeenAt: true,
        },
      });
    });
  }

  async unregisterNotificationDeviceToken(body: Body, user?: Body) {
    if (!user?.sub) throw new ForbiddenException('Authentication required');
    const token = String(body.token ?? '').trim();
    if (!token) throw new BadRequestException('Device token is required');

    await this.db().mobileDeviceToken.updateMany({
      where: {
        userId: user.sub,
        token,
      },
      data: {
        isActive: false,
        lastSeenAt: new Date(),
      },
    });
    return { removed: true };
  }

  async runFollowUpReminderDispatches() {
    const now = new Date();
    const dueFollowUps = await this.prisma.followUp.findMany({
      where: {
        completedAt: null,
        scheduledAt: { lte: now },
        assignedToId: { not: null },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 100,
      include: {
        lead: {
          select: {
            id: true,
            displayId: true,
            name: true,
            organizationId: true,
            statusId: true,
            updatedAt: true,
            deletedAt: true,
          },
        },
      },
    });

    let processedCount = 0;
    for (const followUp of dueFollowUps) {
      if (!followUp.assignedToId) continue;
      try {
        const reminder = await this.prisma.$transaction(async (tx) => {
          const current = await tx.followUp.findUnique({
            where: { id: followUp.id },
            select: {
              id: true,
              assignedToId: true,
              completedAt: true,
              reminderSentAt: true,
              scheduledAt: true,
              typeId: true,
              lead: {
                select: {
                  id: true,
                  displayId: true,
                  name: true,
                  organizationId: true,
                  statusId: true,
                  updatedAt: true,
                  deletedAt: true,
                },
              },
            },
          });
          if (
            !current?.assignedToId ||
            current.completedAt ||
            current.scheduledAt > now ||
            current.lead?.deletedAt
          ) {
            return null;
          }
          const status = current.lead?.statusId
            ? await tx.leadMasterValue.findUnique({
                where: { id: current.lead.statusId },
                select: {
                  followUpNotificationEnabled: true,
                  followUpRenotifyMinutes: true,
                },
              })
            : null;
          if (status?.followUpNotificationEnabled === false) {
            return null;
          }
          const renotifyMinutes = Number(status?.followUpRenotifyMinutes ?? 0);
          if (current.reminderSentAt) {
            const canRenotify =
              Number.isFinite(renotifyMinutes) && renotifyMinutes > 0;
            const nextReminderAt = new Date(
              current.reminderSentAt.getTime() + renotifyMinutes * 60 * 1000,
            );
            if (!canRenotify || nextReminderAt > now) {
              return null;
            }
          }
          const organizationId = current.lead?.organizationId;
          if (!organizationId) return null;
          const recipient = await tx.user.findFirst({
            where: {
              id: current.assignedToId,
              isActive: true,
              role: { not: 'SUPER_ADMIN' },
              organizationMemberships: {
                some: { organizationId, isActive: true },
                none: { organizationId: { not: organizationId } },
              },
            },
            select: { id: true, role: true, fullName: true },
          });
          if (!recipient?.id) return null;

          const lead = current.lead ?? followUp.lead;
          const claim = await tx.followUp.updateMany({
            where: {
              id: current.id,
              completedAt: null,
              assignedToId: current.assignedToId,
              reminderSentAt: current.reminderSentAt,
              scheduledAt: { lte: now },
            },
            data: { reminderSentAt: now },
          });
          if (claim.count !== 1) return null;

          const notificationId = randomUUID();
          const notificationDescription = `${lead.name} (${
            lead.displayId ?? lead.id
          }) is due now.`;
          const reminderPayload = this.buildFollowUpReminderPayload(
            recipient.role,
            lead,
            current,
          );
          await tx.notification.create({
            data: {
              id: notificationId,
              organizationId,
              userId: recipient.id,
              type: 'follow-up-reminder',
              title: 'Follow-up reminder',
              description: notificationDescription,
              badge: this.roleLabel(recipient.role),
              message: `${String(
                current.typeId ?? 'Follow-up',
              )} is scheduled for ${this.formatFollowUpSchedule(
                current.scheduledAt,
              )}.`,
              entityType: 'Lead',
              entityId: lead.id,
              details: { ...reminderPayload, notificationId },
            },
          });
          const whatsappEnabled =
            await this.notificationSettings.isChannelEnabled(
              organizationId,
              'whatsapp',
              'follow-up-reminder',
            );
          if (whatsappEnabled) {
            await this.whatsappDispatches.enqueueWithClient(tx, {
              organizationId,
              notificationId,
              recipientUserId: recipient.id,
              eventKey: 'follow-up-reminder',
              context: {
                recipientName: recipient.fullName || 'Team member',
                title: 'Follow-up reminder',
                body: notificationDescription,
                leadName: lead.name,
                leadReference: lead.displayId ?? lead.id,
                scheduledAt: current.scheduledAt,
              },
            });
          }
          return {
            organizationId,
            recipientId: recipient.id,
            role: recipient.role,
            lead,
            followUp: current,
          };
        });

        if (!reminder) continue;
        processedCount += 1;
        await this.sendFollowUpReminderPush(
          reminder.recipientId,
          this.buildFollowUpReminderPayload(
            reminder.role,
            reminder.lead,
            reminder.followUp,
          ),
          reminder.organizationId,
        );
      } catch (error) {
        this.logger.warn(
          `Unable to dispatch follow-up reminder ${followUp.id}: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }

    return { processed: processedCount };
  }

  async listNotifications(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const where: Body = {
      organizationId: this.tenantAccess.organizationId,
    };
    if (user?.sub) where.userId = user.sub;
    if (query.type) where.type = String(query.type);
    if (query.read === 'false') where.readAt = null;
    const [items, total, unreadCount] = await Promise.all([
      this.db().notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db().notification.count({ where }),
      this.db().notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { data: items, meta: { page, limit, total }, unreadCount };
  }

  async markNotificationRead(id: string, user?: Body) {
    const notification = await this.db().notification.findFirst({
      where: {
        id,
        organizationId: this.tenantAccess.organizationId,
        ...(user?.sub ? { userId: user.sub } : {}),
      },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.db().notification.update({
      where: { id: notification.id },
      data: { readAt: new Date() },
    });
  }

  async markAllNotificationsRead(user?: Body) {
    await this.db().notification.updateMany({
      where: {
        organizationId: this.tenantAccess.organizationId,
        ...(user?.sub ? { userId: user.sub } : {}),
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { updated: true };
  }

  async sendBroadcastNotification(
    body: {
      title: string;
      message: string;
      type?: string;
      targetType?: 'ALL' | 'ROLE' | 'TEAM' | 'INDIVIDUAL';
      targetRole?: string;
      targetTeamId?: string;
      targetUserIds?: string[];
      sendPush?: boolean;
      sendWhatsApp?: boolean;
    },
    actorUser?: Body,
  ) {
    this.assertTenantWorkspaceMutation();
    const organizationId = this.tenantAccess.organizationId;
    const title = String(body.title ?? '').trim();
    const message = String(body.message ?? '').trim();
    if (!title || !message) {
      throw new BadRequestException('Title and Message content are required');
    }

    const targetType = body.targetType || 'ALL';
    const sendPush = body.sendPush !== false;
    const sendWhatsApp = body.sendWhatsApp !== false;
    let targetUserIds: string[] = [];

    if (targetType === 'INDIVIDUAL' && Array.isArray(body.targetUserIds)) {
      targetUserIds = [...new Set(body.targetUserIds.filter(Boolean))];
      await this.tenantAccess.assertEmployees(targetUserIds);
    } else if (targetType === 'ROLE' && body.targetRole) {
      if (!Object.values(Role).includes(body.targetRole as Role)) {
        throw new BadRequestException('Invalid target role');
      }
      const users = await this.db().user.findMany({
        where: {
          AND: [
            this.tenantAccess.employeeWhere(),
            {
              isActive: true,
              organizationMemberships: {
                some: {
                  organizationId,
                  isActive: true,
                  role: body.targetRole as Role,
                },
              },
            },
          ],
        },
        select: { id: true },
      });
      targetUserIds = users.map((u: any) => u.id);
    } else if (targetType === 'TEAM' && body.targetTeamId) {
      await this.tenantAccess.assertTeams([body.targetTeamId]);
      const members = await this.db().teamMembership.findMany({
        where: {
          teamId: body.targetTeamId,
          team: { organizationId },
          user: {
            AND: [this.tenantAccess.employeeWhere(), { isActive: true }],
          },
        },
        select: { userId: true },
      });
      targetUserIds = members.map((m: any) => m.userId);
    } else {
      const users = await this.db().user.findMany({
        where: {
          AND: [this.tenantAccess.employeeWhere(), { isActive: true }],
        },
        select: { id: true },
      });
      targetUserIds = users.map((u: any) => u.id);
    }

    if (!targetUserIds.length) {
      throw new BadRequestException(
        'No active target users found for this notification criteria',
      );
    }

    const broadcastGroupId = `BC-${Date.now()}`;
    const notificationType = body.type || 'announcement';
    const navigation = this.buildNotificationNavigationPayload(
      null,
      'notifications',
    );
    const recipients = await this.db().user.findMany({
      where: {
        AND: [
          this.tenantAccess.employeeWhere(),
          { id: { in: targetUserIds }, isActive: true },
        ],
      },
      select: { id: true, fullName: true },
    });
    const createData = recipients.map((recipient: Body) => ({
      id: randomUUID(),
      organizationId,
      userId: recipient.id,
      type: notificationType,
      title,
      description: message,
      message,
      badge: 'Broadcast',
      entityType: 'Broadcast',
      entityId: broadcastGroupId,
      details: {
        targetType,
        targetRole: body.targetRole,
        targetTeamId: body.targetTeamId,
        sendPush,
        sendWhatsApp,
        broadcastGroupId,
        senderId: actorUser?.sub,
        ...navigation,
      },
      readAt: null,
    }));

    let whatsappQueuedCount = 0;
    await this.db().$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.notification.createMany({ data: createData });
      if (sendWhatsApp && SUPPORTED_WHATSAPP_EVENT_SET.has(notificationType)) {
        for (const [index, recipient] of recipients.entries()) {
          const queued = await this.whatsappDispatches.enqueueWithClient(tx, {
            organizationId,
            notificationId: createData[index].id,
            recipientUserId: recipient.id,
            eventKey: notificationType as SupportedWhatsAppEvent,
            context: {
              recipientName: recipient.fullName || 'Team member',
              title,
              body: message,
            },
          });
          if (queued) whatsappQueuedCount += 1;
        }
      }
    });

    const notificationPayload = {
      title,
      body: message,
      type: notificationType,
      data: navigation,
    };
    let pushCount = 0;
    if (sendPush) {
      for (const recipient of recipients) {
        try {
          await this.sendPushNotification(recipient.id, notificationPayload, {
            organizationId,
          });
          pushCount += 1;
        } catch (error) {
          this.logger.warn(
            `Failed to dispatch push notification to user ${recipient.id}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }
    }

    await this.audit(
      actorUser?.sub,
      'BROADCAST_NOTIFICATION_SENT',
      'Notification',
      broadcastGroupId,
      {
        title,
        targetType,
        recipientCount: targetUserIds.length,
        pushSent: sendPush,
      },
      organizationId,
    );

    return {
      success: true,
      broadcastGroupId,
      recipientCount: recipients.length,
      pushCount,
      whatsappQueuedCount,
      message: `Notification broadcasted to ${recipients.length} user(s).`,
    };
  }

  async listNotificationRecipients(query: Query) {
    const users = await this.db().user.findMany({
      where: {
        AND: [this.tenantAccess.employeeWhere(), { isActive: true }],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarStorageKey: true,
        organizationMemberships: {
          where: { organizationId: this.tenantAccess.organizationId },
          select: { role: true },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return {
      data: users.map((u: any) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.organizationMemberships[0]?.role,
        avatarUrl: u.avatarStorageKey,
      })),
    };
  }

  async listBroadcastNotifications(query: Query) {
    const { page, limit, skip } = pageMeta(query);
    const notifications = await this.db().notification.findMany({
      where: {
        organizationId: this.tenantAccess.organizationId,
        OR: [{ badge: 'Broadcast' }, { entityType: 'Broadcast' }],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Group by title, message, and createdAt timestamp window
    const groupedMap = new Map<string, any>();
    notifications.forEach((item: any) => {
      const details = (item.details as any) ?? {};
      const key =
        details.broadcastGroupId ||
        `${item.title}_${item.message}_${item.createdAt
          .toISOString()
          .slice(0, 16)}`;
      if (!groupedMap.has(key)) {
        groupedMap.set(key, {
          id: item.id,
          broadcastGroupId: details.broadcastGroupId || item.id,
          title: item.title,
          message: item.message || item.description,
          description: item.description,
          type: item.type,
          badge: item.badge,
          targetType: details.targetType || 'ALL',
          targetRole: details.targetRole,
          targetTeamId: details.targetTeamId,
          sendPush: details.sendPush !== false,
          recipientCount: 1,
          createdAt: item.createdAt,
          recipientIds: [item.userId],
        });
      } else {
        const existing = groupedMap.get(key);
        existing.recipientCount += 1;
        if (!existing.recipientIds.includes(item.userId)) {
          existing.recipientIds.push(item.userId);
        }
      }
    });

    const broadcasts = Array.from(groupedMap.values());
    const paginated = broadcasts.slice(skip, skip + limit);

    return {
      data: paginated,
      meta: {
        page,
        limit,
        total: broadcasts.length,
      },
    };
  }

  async resendBroadcastNotification(id: string, actorUser?: Body) {
    this.assertTenantWorkspaceMutation();
    const organizationId = this.tenantAccess.organizationId;
    const notification = await this.db().notification.findFirst({
      where: { id, organizationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const details = (notification.details as any) ?? {};
    const broadcastGroupId = details.broadcastGroupId;

    let targetNotifications: any[] = [notification];
    if (broadcastGroupId) {
      targetNotifications = await this.db().notification.findMany({
        where: {
          organizationId,
          details: {
            path: ['broadcastGroupId'],
            equals: broadcastGroupId,
          },
        },
      });
    }

    const targetUserIds = Array.from(
      new Set(targetNotifications.map((n) => n.userId)),
    );

    return this.sendBroadcastNotification(
      {
        title: notification.title,
        message: notification.message || notification.description || '',
        type: notification.type,
        targetType: 'INDIVIDUAL',
        targetUserIds: targetUserIds.filter(
          (userId): userId is string => typeof userId === 'string',
        ),
        sendPush: details.sendPush !== false,
        sendWhatsApp: details.sendWhatsApp !== false,
      },
      actorUser,
    );
  }

  async deleteNotification(id: string, actorUser?: Body) {
    this.assertTenantWorkspaceMutation();
    const organizationId = this.tenantAccess.organizationId;
    const notification = await this.db().notification.findFirst({
      where: { id, organizationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const details = (notification.details as any) ?? {};
    const broadcastGroupId = details.broadcastGroupId;

    if (broadcastGroupId) {
      await this.db().notification.deleteMany({
        where: {
          organizationId,
          details: {
            path: ['broadcastGroupId'],
            equals: broadcastGroupId,
          },
        },
      });
    } else {
      await this.db().notification.deleteMany({
        where: { id, organizationId },
      });
    }

    return { success: true, message: 'Notification deleted successfully' };
  }

  async getSourceAnalytics() {
    const [rows, accountRows] = await Promise.all([
      this.db()
        .lead.groupBy({
          by: ['sourceId'],
          where: { organizationId: this.tenantAccess.organizationId },
          _count: { _all: true },
        })
        .catch(() => []),
      this.db()
        .lead.groupBy({
          by: ['integrationConnectionId'],
          where: {
            organizationId: this.tenantAccess.organizationId,
            integrationConnectionId: { not: null },
          },
          _count: { _all: true },
        })
        .catch(() => []),
    ]);
    const accountIds = accountRows
      .map((row: Body) => row.integrationConnectionId)
      .filter((id: unknown): id is string => typeof id === 'string');
    const accounts = accountIds.length
      ? await this.db().leadSourceConnection.findMany({
          where: {
            organizationId: this.tenantAccess.organizationId,
            id: { in: accountIds },
          },
          select: { id: true, name: true, provider: true, archivedAt: true },
        })
      : [];
    const accountById = new Map<
      string,
      { name: string; provider: string; archivedAt: Date | null }
    >(
      accounts.map((account) => [
        account.id,
        {
          name: account.name,
          provider: account.provider,
          archivedAt: account.archivedAt,
        },
      ]),
    );
    return {
      data: rows.map((row: Body) => ({
        sourceId: row.sourceId ?? 'Unknown',
        leads: row._count?._all ?? 0,
      })),
      accounts: accountRows.map((row: Body) => {
        const account = accountById.get(String(row.integrationConnectionId));
        return {
          integrationConnectionId: row.integrationConnectionId,
          accountName: account?.name ?? 'Archived or unavailable account',
          provider: account?.provider ?? null,
          archived: Boolean(account?.archivedAt),
          leads: row._count?._all ?? 0,
        };
      }),
    };
  }

  async getConversionAnalytics(query: Query = {}) {
    const range = String(query.range ?? '8weeks');
    const explicitFrom = normalizeDate(query.from);
    const explicitTo = normalizeDate(query.to);
    const rangeDays =
      range === 'week'
        ? 7
        : range === 'month'
        ? 30
        : range === 'quarter'
        ? 90
        : range === 'year'
        ? 365
        : 56;
    const toDate = explicitTo ? endOfDay(explicitTo) : endOfDay(new Date());
    const fromDate = explicitFrom
      ? startOfDay(explicitFrom)
      : startOfDay(addDays(toDate, -(rangeDays - 1)));
    const previousToDate = endOfDay(addDays(fromDate, -1));
    const previousFromDate = startOfDay(
      addDays(previousToDate, -(rangeDays - 1)),
    );
    const search = String(query.search ?? '')
      .trim()
      .toLowerCase();
    const branchFilter = String(query.branch ?? 'all').toLowerCase();

    const loadLeads = async (start: Date, end: Date) =>
      this.db().lead.findMany({
        where: {
          deletedAt: null,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          name: true,
          displayId: true,
          mobile: true,
          sourceId: true,
          statusId: true,
          stageId: true,
          temperatureId: true,
          ownerId: true,
          managerId: true,
          telecallerId: true,
          fieldExecutiveId: true,
          interestLevel: true,
          lastContactedAt: true,
          createdAt: true,
          updatedAt: true,
          convertedAt: true,
          requirement: {
            select: {
              propertyType: true,
              configuration: true,
              budgetRange: true,
              preferredLocation: true,
              preferredProjectId: true,
            },
          },
          followUps: {
            select: {
              id: true,
            },
          },
          callLogs: {
            select: {
              id: true,
            },
          },
          siteVisits: {
            select: {
              id: true,
              status: true,
              scheduledAt: true,
            },
          },
          bookings: {
            select: {
              id: true,
              status: true,
              bookingAmount: true,
              bookingDate: true,
              projectId: true,
              closedById: true,
            },
          },
        },
      });

    const [currentLeads, previousLeads] = await Promise.all([
      loadLeads(fromDate, toDate),
      loadLeads(previousFromDate, previousToDate),
    ]);

    const allLeads = [...currentLeads, ...previousLeads];
    const sourceIds = Array.from(
      new Set(allLeads.map((lead: Body) => lead.sourceId).filter(Boolean)),
    );
    const statusIds = Array.from(
      new Set(
        allLeads
          .flatMap((lead: Body) => [lead.statusId, lead.stageId])
          .filter(Boolean),
      ),
    );
    const projectIds = Array.from(
      new Set(
        allLeads
          .flatMap((lead: Body) => [
            lead.requirement?.preferredProjectId,
            ...lead.bookings.map((booking: Body) => booking.projectId),
          ])
          .filter(Boolean),
      ),
    );
    const userIds = Array.from(
      new Set(
        allLeads
          .flatMap((lead: Body) => [
            lead.ownerId,
            lead.managerId,
            lead.telecallerId,
            lead.fieldExecutiveId,
          ])
          .filter(Boolean),
      ),
    );

    const [sources, statuses, projects, users, scoreMasters] =
      await Promise.all([
        sourceIds.length
          ? this.db().leadMasterValue.findMany({
              where: { id: { in: sourceIds } },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
        statusIds.length
          ? this.db().leadMasterValue.findMany({
              where: { id: { in: statusIds } },
              select: { id: true, name: true, code: true, triggerAction: true },
            })
          : Promise.resolve([]),
        projectIds.length
          ? this.db().project.findMany({
              where: { id: { in: projectIds } },
              select: { id: true, name: true, location: true },
            })
          : Promise.resolve([]),
        userIds.length
          ? this.db().user.findMany({
              where: { id: { in: userIds } },
              select: {
                id: true,
                fullName: true,
                role: true,
                email: true,
                avatarStorageKey: true,
              },
            })
          : Promise.resolve([]),
        this.leadScoreMasterValues(),
      ]);

    const sourceMap = new Map(
      sources.map((item: Body) => [item.id, item.name]),
    );
    const statusMap = new Map(statuses.map((item: Body) => [item.id, item]));
    const masterNameById = new Map<string, string>([
      ...sources.map((item: Body) => [item.id, item.name] as [string, string]),
      ...statuses.map((item: Body) => [item.id, item.name] as [string, string]),
    ]);
    const projectMap = new Map(projects.map((item: Body) => [item.id, item]));
    const userMap = new Map(users.map((item: Body) => [item.id, item]));

    const stageColorMap: Record<string, string> = {
      total: '#2563eb',
      new: '#0284c7',
      interested: '#f97316',
      sitevisit: '#e11d48',
      revisit: '#8b5cf6',
      booked: '#16a34a',
    };
    const sourceColors = [
      '#2563eb',
      '#10b981',
      '#ef4444',
      '#8b5cf6',
      '#0ea5e9',
      '#f59e0b',
      '#94a3b8',
    ];

    const getBranch = (lead: Body) => {
      const preferredProject = (
        lead.requirement?.preferredProjectId
          ? projectMap.get(lead.requirement.preferredProjectId)
          : null
      ) as Body | null;
      return (
        preferredProject?.location ||
        lead.requirement?.preferredLocation ||
        'Unspecified'
      );
    };

    const getStatusMeta = (lead: Body) => {
      const status = statusMap.get(lead.statusId) as Body | undefined;
      return {
        name: String(status?.name ?? '').toLowerCase(),
        code: String(status?.code ?? '').toLowerCase(),
      };
    };

    const isNewLead = (lead: Body) => {
      const status = getStatusMeta(lead);
      return Boolean(
        status.name.includes('new') ||
          status.name.includes('fresh') ||
          status.code.includes('new') ||
          status.code.includes('fresh') ||
          (!lead.lastContactedAt &&
            !lead.callLogs?.length &&
            !lead.followUps?.length),
      );
    };

    const isContactedLead = (lead: Body) => {
      const status = getStatusMeta(lead);
      return Boolean(
        lead.lastContactedAt ||
          lead.callLogs.length ||
          lead.followUps.length ||
          status.name.includes('contact') ||
          status.name.includes('interested') ||
          status.name.includes('proposal') ||
          status.name.includes('negotiation') ||
          status.name.includes('site visit') ||
          status.name.includes('book') ||
          status.code.includes('contact') ||
          status.code.includes('interested') ||
          status.code.includes('proposal') ||
          status.code.includes('negotiation') ||
          status.code.includes('site_visit') ||
          status.code.includes('booked'),
      );
    };

    const isInterestedLead = (lead: Body) => {
      const status = getStatusMeta(lead);
      const stage = statusMap.get(lead.stageId) as Body | undefined;
      const lifecycle = [
        status.name,
        status.code,
        stage?.name,
        stage?.code,
        lead.interestLevel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .replace(/[_-]+/g, ' ');

      return Boolean(
        lifecycle.includes('interest') &&
          !lifecycle.includes('not interest') &&
          !lifecycle.includes('uninterested'),
      );
    };

    const activeBookingsFor = (lead: Body) =>
      lead.bookings.filter(
        (booking: Body) =>
          String(booking.status ?? '').toLowerCase() !== 'cancelled',
      );
    const confirmedBookingsFor = (lead: Body) =>
      lead.bookings.filter(
        (booking: Body) =>
          String(booking.status ?? '').toLowerCase() === 'booked',
      );
    const hasCompletedSiteVisit = (lead: Body) =>
      lead.siteVisits.some((visit: Body) => {
        const status = String(visit.status ?? '').toLowerCase();
        return (
          status.includes('complete') ||
          status.includes('done') ||
          status.includes('checked')
        );
      }) || lead.siteVisits.length > 0;

    const hasCompletedReVisit = (lead: Body) =>
      lead.siteVisits.some((visit: Body) => {
        const status = String(visit.status ?? '').toLowerCase();
        return (
          visit.isReVisit === true ||
          status.includes('revisit') ||
          status.includes('re-visit')
        );
      }) || lead.siteVisits.length > 1;

    const isConvertedLead = (lead: Body) => {
      const status = statusMap.get(lead.statusId) as Body | undefined;
      return Boolean(
        lead.convertedAt ||
          confirmedBookingsFor(lead).length ||
          (status && isConversionStatus(status)),
      );
    };

    const passesFilter = (lead: Body) => {
      const branch = getBranch(lead).toLowerCase();
      const preferredProject = (
        lead.requirement?.preferredProjectId
          ? projectMap.get(lead.requirement.preferredProjectId)
          : null
      ) as Body | null;
      const sourceName = String(sourceMap.get(lead.sourceId) ?? 'Unknown');
      if (branchFilter !== 'all' && !branch.includes(branchFilter))
        return false;
      if (!search) return true;
      return [
        lead.name,
        lead.displayId,
        lead.mobile,
        sourceName,
        preferredProject?.name,
        preferredProject?.location,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    };

    const filterLeads = (rows: Body[]) => rows.filter(passesFilter);
    const currentFiltered = filterLeads(currentLeads);
    const previousFiltered = filterLeads(previousLeads);

    const totalBookingValue = (rows: Body[]) =>
      rows.reduce(
        (sum: number, lead: Body) =>
          sum +
          activeBookingsFor(lead).reduce(
            (bookingSum: number, booking: Body) =>
              bookingSum + Number(booking.bookingAmount ?? 0),
            0,
          ),
        0,
      );

    const totalRevenueValue = (rows: Body[]) =>
      rows.reduce(
        (sum: number, lead: Body) =>
          sum +
          confirmedBookingsFor(lead).reduce(
            (bookingSum: number, booking: Body) =>
              bookingSum + Number(booking.bookingAmount ?? 0),
            0,
          ),
        0,
      );

    const avgLeadToBookingDays = (rows: Body[]) => {
      const durations = rows.flatMap((lead: Body) =>
        confirmedBookingsFor(lead)
          .filter((booking: Body) => booking.bookingDate)
          .map((booking: Body) =>
            diffDays(new Date(lead.createdAt), new Date(booking.bookingDate)),
          ),
      );
      if (!durations.length) return 0;
      return (
        durations.reduce((sum, value) => sum + value, 0) / durations.length
      );
    };

    const buildOverview = (rows: Body[]) => {
      const totalLeads = rows.length;
      const convertedLeads = rows.filter(isConvertedLead).length;
      const conversionRate = totalLeads
        ? (convertedLeads / totalLeads) * 100
        : 0;
      return {
        totalLeads,
        convertedLeads,
        conversionRate,
        bookingValue: totalBookingValue(rows),
        revenueGenerated: totalRevenueValue(rows),
        avgLeadToBookingDays: avgLeadToBookingDays(rows),
      };
    };

    const currentOverview = buildOverview(currentFiltered);
    const previousOverview = buildOverview(previousFiltered);
    const pctChange = (current: number, previous: number) => {
      if (!previous) return current ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const funnelCounts = {
      total: currentFiltered.length,
      new: currentFiltered.filter(isNewLead).length,
      interested: currentFiltered.filter(isInterestedLead).length,
      sitevisit: currentFiltered.filter(hasCompletedSiteVisit).length,
      revisit: currentFiltered.filter(hasCompletedReVisit).length,
      booked: currentFiltered.filter(isConvertedLead).length,
    };
    const funnelKeys = [
      ['total', 'Total Leads'],
      ['new', 'New Leads'],
      ['interested', 'Interested'],
      ['sitevisit', 'Site Visit Done'],
      ['revisit', 'Re-Visit Done'],
      ['booked', 'Booking Done'],
    ] as const;
    const funnelStages = funnelKeys.map(([key, label], index) => {
      const count = funnelCounts[key];
      const previousCount =
        index === 0
          ? funnelCounts.total
          : funnelCounts[funnelKeys[index - 1][0]];
      const overallPct =
        funnelCounts.total > 0 ? (count / funnelCounts.total) * 100 : 0;
      const stepPct = previousCount > 0 ? (count / previousCount) * 100 : 0;
      return {
        label,
        count,
        percentage: overallPct,
        conversionPct: index === 0 ? null : stepPct,
        color: stageColorMap[key],
      };
    });

    const trendBuckets: Array<{
      start: Date;
      end: Date;
      label: string;
    }> = [];
    const bucketDays = range === 'year' ? 30 : 7;
    let cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const bucketStart = new Date(cursor);
      const bucketEnd = endOfDay(
        addDays(
          bucketStart,
          Math.min(bucketDays - 1, Math.ceil(diffDays(bucketStart, toDate))),
        ),
      );
      const label = `${bucketStart.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })} - ${bucketEnd.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })}`;
      trendBuckets.push({ start: bucketStart, end: bucketEnd, label });
      cursor = startOfDay(addDays(bucketEnd, 1));
      if (trendBuckets.length >= 8) break;
    }
    const trend = trendBuckets.map((bucket) => {
      const rows = currentFiltered.filter((lead: Body) => {
        const createdAt = new Date(lead.createdAt);
        return createdAt >= bucket.start && createdAt <= bucket.end;
      });
      const converted = rows.filter(isConvertedLead).length;
      return {
        period: bucket.label,
        leads: rows.length,
        converted,
        conversionRate: rows.length
          ? Number(((converted / rows.length) * 100).toFixed(2))
          : 0,
      };
    });

    const sourceCounts = new Map<string, number>();
    currentFiltered.forEach((lead: Body) => {
      if (!isConvertedLead(lead)) return;
      const sourceName = String(sourceMap.get(lead.sourceId) ?? 'Unknown');
      sourceCounts.set(sourceName, (sourceCounts.get(sourceName) ?? 0) + 1);
    });
    const totalConverted = currentOverview.convertedLeads || 1;
    const sourceConversions = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([source, converted], index) => ({
        source,
        converted,
        percentage: (converted / totalConverted) * 100,
        color: sourceColors[index % sourceColors.length],
      }));

    const assigneeKeyFor = (lead: Body) =>
      lead.fieldExecutiveId ||
      lead.telecallerId ||
      lead.ownerId ||
      lead.managerId ||
      'unassigned';
    const teamMap = new Map<string, Body>();
    currentFiltered.forEach((lead: Body) => {
      const key = assigneeKeyFor(lead);
      if (!teamMap.has(key)) {
        const user = userMap.get(key) as Body | undefined;
        teamMap.set(key, {
          id: key,
          name: user?.fullName ?? 'Unassigned',
          role: user?.role ?? 'UNASSIGNED',
          image: user?.avatarStorageKey ?? null,
          email: user?.email ?? null,
          totalLeads: 0,
          contacted: 0,
          interested: 0,
          siteVisits: 0,
          bookings: 0,
          bookingValue: 0,
          revenue: 0,
          leadToBookingDays: [] as number[],
        });
      }
      const row = teamMap.get(key);
      if (!row) return;
      row.totalLeads += 1;
      if (isContactedLead(lead)) row.contacted += 1;
      if (isInterestedLead(lead)) row.interested += 1;
      if (hasCompletedSiteVisit(lead)) row.siteVisits += 1;
      row.bookings += confirmedBookingsFor(lead).length;
      row.bookingValue += activeBookingsFor(lead).reduce(
        (sum: number, booking: Body) =>
          sum + Number(booking.bookingAmount ?? 0),
        0,
      );
      row.revenue += confirmedBookingsFor(lead).reduce(
        (sum: number, booking: Body) =>
          sum + Number(booking.bookingAmount ?? 0),
        0,
      );
      confirmedBookingsFor(lead).forEach((booking: Body) => {
        if (booking.bookingDate) {
          row.leadToBookingDays.push(
            diffDays(new Date(lead.createdAt), new Date(booking.bookingDate)),
          );
        }
      });
    });

    const roleLabel = (role?: string) =>
      role ? getUserRoleLabel(role) : 'Unassigned';

    const teamPerformanceRows = [...teamMap.values()]
      .sort((a: Body, b: Body) => b.bookings - a.bookings)
      .map((row: Body) => {
        const conversionRate = row.totalLeads
          ? (row.bookings / row.totalLeads) * 100
          : 0;
        return {
          id: row.id,
          name: row.name,
          role: roleLabel(row.role),
          image: row.image,
          totalLeads: row.totalLeads,
          contacted: row.contacted,
          interested: row.interested,
          siteVisits: row.siteVisits,
          bookings: row.bookings,
          conversionRate,
          bookingValue: row.bookingValue,
          revenue: row.revenue,
          avgLeadToBookingDays: row.leadToBookingDays.length
            ? row.leadToBookingDays.reduce(
                (sum: number, value: number) => sum + value,
                0,
              ) / row.leadToBookingDays.length
            : 0,
        };
      });

    const teamTotals = {
      totalLeads: teamPerformanceRows.reduce(
        (sum, row) => sum + row.totalLeads,
        0,
      ),
      contacted: teamPerformanceRows.reduce(
        (sum, row) => sum + row.contacted,
        0,
      ),
      interested: teamPerformanceRows.reduce(
        (sum, row) => sum + row.interested,
        0,
      ),
      siteVisits: teamPerformanceRows.reduce(
        (sum, row) => sum + row.siteVisits,
        0,
      ),
      bookings: teamPerformanceRows.reduce((sum, row) => sum + row.bookings, 0),
      bookingValue: teamPerformanceRows.reduce(
        (sum, row) => sum + row.bookingValue,
        0,
      ),
      revenue: teamPerformanceRows.reduce((sum, row) => sum + row.revenue, 0),
    };
    const teamTotalsWithRate = {
      ...teamTotals,
      conversionRate: teamTotals.totalLeads
        ? (teamTotals.bookings / teamTotals.totalLeads) * 100
        : 0,
    };

    const projectCounts = new Map<string, Body>();
    const branchCounts = new Map<string, Body>();
    currentFiltered.forEach((lead: Body) => {
      const branchName = getBranch(lead);
      if (!branchCounts.has(branchName)) {
        branchCounts.set(branchName, {
          branch: branchName,
          totalLeads: 0,
          bookings: 0,
          bookingValue: 0,
        });
      }
      branchCounts.get(branchName).totalLeads += 1;
      branchCounts.get(branchName).bookings +=
        confirmedBookingsFor(lead).length;
      branchCounts.get(branchName).bookingValue += activeBookingsFor(
        lead,
      ).reduce(
        (sum: number, booking: Body) =>
          sum + Number(booking.bookingAmount ?? 0),
        0,
      );
      activeBookingsFor(lead).forEach((booking: Body) => {
        const projectId =
          booking.projectId ||
          lead.requirement?.preferredProjectId ||
          'unknown';
        const project = projectMap.get(projectId) as Body | undefined;
        const label = project?.name ?? 'Others';
        if (!projectCounts.has(label)) {
          projectCounts.set(label, { project: label, bookings: 0 });
        }
        projectCounts.get(label).bookings += 1;
      });
    });
    const totalProjectBookings =
      [...projectCounts.values()].reduce(
        (sum: number, item: Body) => sum + item.bookings,
        0,
      ) || 1;
    const projectConversions = [...projectCounts.values()]
      .sort((a: Body, b: Body) => b.bookings - a.bookings)
      .map((item: Body) => ({
        project: item.project,
        bookings: item.bookings,
        percentage: (item.bookings / totalProjectBookings) * 100,
        color: '#6366f1',
      }));
    const branchPerformance = [...branchCounts.values()]
      .sort((a: Body, b: Body) => b.bookings - a.bookings)
      .map((item: Body) => ({
        branch: item.branch,
        totalLeads: item.totalLeads,
        bookings: item.bookings,
        bookingValue: item.bookingValue,
        conversionRate: item.totalLeads
          ? (item.bookings / item.totalLeads) * 100
          : 0,
      }));

    const scoreBuckets = {
      '81 - 100': { count: 0, converted: 0 },
      '61 - 80': { count: 0, converted: 0 },
      '41 - 60': { count: 0, converted: 0 },
      '0 - 40': { count: 0, converted: 0 },
    };
    currentFiltered.forEach((lead: Body) => {
      const score = buildLeadScore(
        lead,
        scoreMasters,
        masterNameById,
      ).leadScore;
      let bucket = '0 - 40';
      if (score >= 81) bucket = '81 - 100';
      else if (score >= 61) bucket = '61 - 80';
      else if (score >= 41) bucket = '41 - 60';
      scoreBuckets[bucket].count += 1;
      if (isConvertedLead(lead)) scoreBuckets[bucket].converted += 1;
    });
    const scoreConversionBuckets = Object.entries(scoreBuckets).map(
      ([range, bucket], index) => ({
        range,
        percentage: bucket.count ? (bucket.converted / bucket.count) * 100 : 0,
        leads: bucket.count,
        toneClass:
          index === 0
            ? 'text-emerald-500'
            : index === 1
            ? 'text-green-500'
            : index === 2
            ? 'text-lime-500'
            : 'text-yellow-500',
      }),
    );

    const bestRow = teamPerformanceRows[0];
    const slowestRow = [...teamPerformanceRows]
      .filter((row) => row.avgLeadToBookingDays > 0)
      .sort((a, b) => b.avgLeadToBookingDays - a.avgLeadToBookingDays)[0];
    const avgRowDays = teamPerformanceRows
      .filter((row) => row.avgLeadToBookingDays > 0)
      .reduce(
        (sum, row, _, arr) => sum + row.avgLeadToBookingDays / arr.length,
        0,
      );

    const recentTrend = trend.slice(-4);
    const avgRecentBookings = recentTrend.length
      ? recentTrend.reduce((sum, item) => sum + item.converted, 0) /
        recentTrend.length
      : 0;
    const avgRecentRevenue = recentTrend.length
      ? currentOverview.revenueGenerated / recentTrend.length
      : 0;
    const confidenceScore = Math.max(
      55,
      Math.min(
        96,
        Math.round(
          currentOverview.conversionRate * 4 +
            (bestRow?.conversionRate ?? currentOverview.conversionRate),
        ),
      ),
    );

    const branchSet = Array.from(
      new Set(
        currentLeads
          .map((lead: Body) => getBranch(lead))
          .filter(Boolean)
          .sort(),
      ),
    );

    return {
      filters: {
        branches: branchSet,
      },
      overview: {
        totalLeads: {
          value: currentOverview.totalLeads,
          change: pctChange(
            currentOverview.totalLeads,
            previousOverview.totalLeads,
          ),
          helper: `vs previous ${rangeDays} days`,
        },
        convertedLeads: {
          value: currentOverview.convertedLeads,
          change: pctChange(
            currentOverview.convertedLeads,
            previousOverview.convertedLeads,
          ),
          helper: `vs previous ${rangeDays} days`,
        },
        conversionRate: {
          value: currentOverview.conversionRate,
          change: pctChange(
            currentOverview.conversionRate,
            previousOverview.conversionRate,
          ),
          helper: `vs previous ${rangeDays} days`,
        },
        bookingValue: {
          value: currentOverview.bookingValue,
          change: pctChange(
            currentOverview.bookingValue,
            previousOverview.bookingValue,
          ),
          helper: `vs previous ${rangeDays} days`,
        },
        revenueGenerated: {
          value: currentOverview.revenueGenerated,
          change: pctChange(
            currentOverview.revenueGenerated,
            previousOverview.revenueGenerated,
          ),
          helper: `vs previous ${rangeDays} days`,
        },
        avgLeadToBookingDays: {
          value: currentOverview.avgLeadToBookingDays,
          change: pctChange(
            previousOverview.avgLeadToBookingDays,
            currentOverview.avgLeadToBookingDays,
          ),
          helper: `vs previous ${rangeDays} days`,
        },
      },
      funnelStages,
      trend,
      sourceConversions,
      teamPerformanceRows,
      teamTotals: teamTotalsWithRate,
      branchPerformance,
      projectConversions,
      timeAnalysis: {
        bestPerformer: {
          name: bestRow?.name ?? 'No data',
          time: bestRow?.avgLeadToBookingDays
            ? bestRow.avgLeadToBookingDays
            : currentOverview.avgLeadToBookingDays,
        },
        average: {
          name: 'All Executives',
          time: avgRowDays || currentOverview.avgLeadToBookingDays,
        },
        needsImprovement: {
          name: slowestRow?.name ?? 'No data',
          time:
            slowestRow?.avgLeadToBookingDays ??
            currentOverview.avgLeadToBookingDays,
        },
      },
      scoreConversionBuckets,
      forecast: {
        expectedBookingsMin: Math.max(0, Math.round(avgRecentBookings * 3.6)),
        expectedBookingsMax: Math.max(0, Math.round(avgRecentBookings * 4.4)),
        expectedRevenueMin: avgRecentRevenue * 3.6,
        expectedRevenueMax: avgRecentRevenue * 4.4,
        confidenceScore,
      },
      benchmark: {
        yourRate: currentOverview.conversionRate,
        industryAvg: 7.18,
        topPerformers:
          bestRow?.conversionRate ?? currentOverview.conversionRate,
      },
      range: {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        range,
      },
      formatters: {
        compactCurrencyExample: compactCurrency(100000),
      },
    };
  }

  async createBookingExtraIncentive(
    bookingId: string,
    body: Body,
    actorUser?: Body,
  ) {
    const booking = await this.db().booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const amount = normalizeMoney(body.amount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Valid incentive amount is required');
    }
    if (!body.recipientUserId) {
      throw new BadRequestException('Recipient user is required');
    }
    const recipient = await this.db().user.findUnique({
      where: { id: body.recipientUserId },
    });
    if (!recipient) {
      throw new BadRequestException('Recipient user not found');
    }
    if (!body.title || !String(body.title).trim()) {
      throw new BadRequestException('Title is required');
    }

    const extraIncentive = await this.db().bookingExtraIncentive.create({
      data: {
        bookingId,
        recipientUserId: body.recipientUserId,
        title: String(body.title).trim(),
        amount,
        paymentStatus: 'Pending',
        paymentDate: null,
        remarks: optionalString(body.remarks),
        createdById: actorUser?.sub,
      },
    });

    await this.audit(
      actorUser?.sub,
      'BOOKING_EXTRA_INCENTIVE_CREATED',
      'BookingExtraIncentive',
      extraIncentive.id,
      {
        bookingId,
        amount,
        recipientUserId: body.recipientUserId,
      },
    );

    return this.getBookingDetails(bookingId, actorUser);
  }

  async updateBookingExtraIncentive(
    bookingId: string,
    id: string,
    body: Body,
    actorUser?: Body,
  ) {
    const existing = await this.db().bookingExtraIncentive.findFirst({
      where: { id, bookingId },
    });
    if (!existing) throw new NotFoundException('Extra incentive not found');

    const data: Body = {};
    if (body.amount !== undefined) {
      const amount = normalizeMoney(body.amount);
      if (!amount || amount <= 0) {
        throw new BadRequestException('Valid incentive amount is required');
      }
      data.amount = amount;
    }
    if (body.recipientUserId !== undefined) {
      if (!body.recipientUserId) {
        throw new BadRequestException('Recipient user is required');
      }
      const recipient = await this.db().user.findUnique({
        where: { id: body.recipientUserId },
      });
      if (!recipient) {
        throw new BadRequestException('Recipient user not found');
      }
      data.recipientUserId = body.recipientUserId;
    }
    if (body.title !== undefined) {
      if (!body.title || !String(body.title).trim()) {
        throw new BadRequestException('Title is required');
      }
      data.title = String(body.title).trim();
    }
    if (String(existing.paymentStatus).toLowerCase() === 'paid') {
      throw new BadRequestException(
        'Reverse the extra incentive payment before editing this incentive',
      );
    }
    if (body.paymentStatus !== undefined) {
      const paymentStatus = normalizeIncentiveDecisionStatus(
        body.paymentStatus,
      );
      if (!paymentStatus || paymentStatus === 'Finalized') {
        throw new BadRequestException(
          'Incentive status must be Pending, Approved, or Rejected',
        );
      }
      data.paymentStatus = paymentStatus;
      data.paymentDate = null;
    }
    if (body.paymentDate !== undefined) {
      throw new BadRequestException(
        'Use the payment action to mark extra incentives paid or reversed',
      );
    }
    if (body.remarks !== undefined) {
      data.remarks = optionalString(body.remarks) ?? null;
    }

    const updated = await this.db().bookingExtraIncentive.update({
      where: { id },
      data,
    });

    await this.audit(
      actorUser?.sub,
      'BOOKING_EXTRA_INCENTIVE_UPDATED',
      'BookingExtraIncentive',
      updated.id,
      {
        bookingId,
        ...data,
      },
    );

    return this.getBookingDetails(bookingId, actorUser);
  }

  async markBookingExtraIncentivePaid(
    bookingId: string,
    id: string,
    body: Body,
    actorUser?: Body,
  ) {
    const paymentDate = normalizeDate(body.paymentDate) ?? new Date();
    await this.db().$transaction(async (tx) => {
      const extra = await tx.bookingExtraIncentive.findFirst({
        where: { id, bookingId },
        include: { booking: { select: { leadId: true } } },
      });
      if (!extra) throw new NotFoundException('Extra incentive not found');
      if (String(extra.paymentStatus).toLowerCase() === 'paid') {
        throw new BadRequestException('This extra incentive is already paid');
      }
      if (
        !['approved', 'finalized'].includes(
          String(extra.paymentStatus).toLowerCase(),
        )
      ) {
        throw new BadRequestException(
          'Approve the extra incentive before recording payment',
        );
      }

      await tx.bookingExtraIncentive.update({
        where: { id },
        data: { paymentStatus: 'Paid', paymentDate },
      });
      await tx.payment.create({
        data: {
          bookingId,
          leadId: extra.booking.leadId,
          amount: extra.amount,
          paymentDate,
          receivedDate: paymentDate,
          status: 'Paid',
          kind: 'INCENTIVE',
          component: 'EXTRA_INCENTIVE',
          recipientUserId: extra.recipientUserId,
          method: optionalString(body.method) ?? 'Manual',
          referenceNo: optionalString(body.referenceNo),
          remarks:
            optionalString(body.remarks) ??
            `Extra incentive paid: ${extra.title}`,
        },
      });
    });

    await this.audit(
      actorUser?.sub,
      'BOOKING_EXTRA_INCENTIVE_MARKED_PAID',
      'BookingExtraIncentive',
      id,
      {
        bookingId,
        paymentDate: paymentDate.toISOString(),
      },
    );

    return this.getBookingDetails(bookingId, actorUser);
  }

  async reverseBookingExtraIncentivePayment(
    bookingId: string,
    id: string,
    body: Body,
    actorUser?: Body,
  ) {
    await this.db().$transaction(async (tx) => {
      const extra = await tx.bookingExtraIncentive.findFirst({
        where: { id, bookingId },
      });
      if (!extra) throw new NotFoundException('Extra incentive not found');
      if (String(extra.paymentStatus).toLowerCase() !== 'paid') {
        throw new BadRequestException(
          'Only paid extra incentives can be reversed',
        );
      }

      await tx.bookingExtraIncentive.update({
        where: { id },
        data: { paymentStatus: 'Pending', paymentDate: null },
      });
      await tx.payment.updateMany({
        where: {
          bookingId,
          kind: 'INCENTIVE',
          component: 'EXTRA_INCENTIVE',
          recipientUserId: extra.recipientUserId,
          status: { in: ['Paid', 'Received', 'Settled', 'Completed'] },
        },
        data: {
          status: 'Reversed',
          remarks:
            optionalString(body.reason) ??
            optionalString(body.remarks) ??
            `Extra incentive reversed: ${extra.title}`,
        },
      });
    });

    await this.audit(
      actorUser?.sub,
      'BOOKING_EXTRA_INCENTIVE_PAYMENT_REVERSED',
      'BookingExtraIncentive',
      id,
      {
        bookingId,
        reason: optionalString(body.reason ?? body.remarks),
      },
    );

    return this.getBookingDetails(bookingId, actorUser);
  }

  async deleteBookingExtraIncentive(
    bookingId: string,
    id: string,
    actorUser?: Body,
  ) {
    const existing = await this.db().bookingExtraIncentive.findFirst({
      where: { id, bookingId },
    });
    if (!existing) throw new NotFoundException('Extra incentive not found');

    await this.db().bookingExtraIncentive.delete({
      where: { id },
    });

    await this.audit(
      actorUser?.sub,
      'BOOKING_EXTRA_INCENTIVE_DELETED',
      'BookingExtraIncentive',
      id,
      {
        bookingId,
        amount: Number(existing.amount),
        recipientUserId: existing.recipientUserId,
      },
    );

    return this.getBookingDetails(bookingId, actorUser);
  }

  private async buildMobileUserScope(
    user?: Body,
  ): Promise<Record<string, any>> {
    const scope: Record<string, any> = {};
    if (!user) return scope;
    const userAssignmentScope =
      await this.leadVisibility.resolveAssignmentScope(user);
    if (userAssignmentScope) {
      scope.AND = [userAssignmentScope];
    }
    return scope;
  }

  async getMobileLeadSummary(query: Query, user?: Body) {
    const baseScope = await this.buildMobileUserScope(user);
    const where: Body = {
      deletedAt: null,
      ...baseScope,
    };

    if (query.assignedToId && query.assignedToId !== 'all') {
      where.ownerId = String(query.assignedToId);
    }
    if (query.projectId && query.projectId !== 'all') {
      where.requirement = {
        is: { preferredProjectId: String(query.projectId) },
      };
    }
    if (query.from || query.to || query.dateFrom || query.dateTo) {
      where.createdAt = {};
      const from = normalizeDate(query.dateFrom ?? query.from);
      const to = normalizeDate(query.dateTo ?? query.to);
      if (from) where.createdAt.gte = startOfDay(from);
      if (to) where.createdAt.lte = endOfDay(to);
    }
    if (query.search) {
      where.OR = [
        { name: { contains: String(query.search), mode: 'insensitive' } },
        { mobile: { contains: String(query.search), mode: 'insensitive' } },
        { email: { contains: String(query.search), mode: 'insensitive' } },
        { displayId: { contains: String(query.search), mode: 'insensitive' } },
      ];
    }

    const [statusGroups, tempGroups, totalLeads] = await Promise.all([
      this.db().lead.groupBy({
        by: ['statusId'],
        where,
        _count: { id: true },
      }),
      this.db().lead.groupBy({
        by: ['temperatureId'],
        where,
        _count: { id: true },
      }),
      this.db().lead.count({ where }),
    ]);

    const statusCountMap = new Map<string, number>();
    for (const g of statusGroups) {
      if (g.statusId) statusCountMap.set(g.statusId, g._count.id);
    }

    const tempCountMap = new Map<string, number>();
    for (const g of tempGroups) {
      if (g.temperatureId) tempCountMap.set(g.temperatureId, g._count.id);
    }

    const [statusCategory, tempCategory] = await Promise.all([
      this.db().leadMasterCategory.findFirst({
        where: { code: { in: ['status', 'lead_status', 'lead-status'] } },
      }),
      this.db().leadMasterCategory.findFirst({
        where: {
          code: { in: ['temperature', 'lead_temperature', 'lead-temperature'] },
        },
      }),
    ]);

    const categoryIds = [statusCategory?.id, tempCategory?.id].filter(
      Boolean,
    ) as string[];
    const masterValues = categoryIds.length
      ? await this.db().leadMasterValue.findMany({
          where: {
            categoryId: { in: categoryIds },
            isActive: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        })
      : [];

    const statusMasters = masterValues.filter(
      (m) => m.categoryId === statusCategory?.id,
    );
    const tempMasters = masterValues.filter(
      (m) => m.categoryId === tempCategory?.id,
    );

    // Build filter pills
    const filterPills: Array<{
      id: string;
      name: string;
      count: number;
      color: string;
      category: 'all' | 'status' | 'temperature';
      filterKey: string | null;
      filterValue: string | null;
      sortOrder: number;
    }> = [
      {
        id: 'all',
        name: 'All',
        count: totalLeads,
        color: '#0F172A',
        category: 'all',
        filterKey: null,
        filterValue: null,
        sortOrder: -1,
      },
    ];

    const hasFilterBarFlag = masterValues.some(
      (m) => m.showInFilterBar === true,
    );
    const filterBarItems = hasFilterBarFlag
      ? masterValues.filter((m) => m.showInFilterBar)
      : statusMasters;

    for (const item of filterBarItems) {
      const isStatus = item.categoryId === statusCategory?.id;
      const count = isStatus
        ? statusCountMap.get(item.id) ?? 0
        : tempCountMap.get(item.id) ?? 0;
      filterPills.push({
        id: item.id,
        name: item.name,
        count,
        color: item.displayColor || (isStatus ? '#2563EB' : '#F59E0B'),
        category: isStatus ? 'status' : 'temperature',
        filterKey: isStatus ? 'statusId' : 'temperatureId',
        filterValue: item.id,
        sortOrder: item.sortOrder,
      });
    }

    // Build stats cards for mobile dashboard
    const hasStatsFlag = masterValues.some((m) => m.showInStatsCard === true);
    const statsCardMasters = hasStatsFlag
      ? masterValues.filter((m) => m.showInStatsCard)
      : statusMasters;

    const statsCards = statsCardMasters.map((item) => {
      const isStatus = item.categoryId === statusCategory?.id;
      const count = isStatus
        ? statusCountMap.get(item.id) ?? 0
        : tempCountMap.get(item.id) ?? 0;
      return {
        id: item.id,
        key: item.code,
        title: item.name,
        count,
        color: item.displayColor || (isStatus ? '#0284C7' : '#EF4444'),
        category: (isStatus ? 'status' : 'temperature') as
          | 'status'
          | 'temperature',
        filterKey: isStatus ? 'statusId' : 'temperatureId',
        filterValue: item.id,
        sortOrder: item.sortOrder,
      };
    });

    // Follow-ups & SLA metrics
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const followUpWhere: Body = {
      lead: { deletedAt: null },
    };
    if (user?.role === 'TELECALLER' || user?.role === 'SALES_AGENT') {
      followUpWhere.assignedToId = user.sub;
    }

    const [
      todayFollowUps,
      overdueFollowUps,
      upcomingFollowUps,
      completedTodayFollowUps,
      pendingQueueCount,
      breachedCount,
      dueNextHourCount,
      managerAttentionCount,
    ] = await Promise.all([
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: null,
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: null,
          scheduledAt: { lt: todayStart },
        },
      }),
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: null,
          scheduledAt: { gt: todayEnd },
        },
      }),
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: null,
        },
      }),
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: null,
          scheduledAt: { lt: new Date(now.getTime() - 30 * 60 * 1000) },
        },
      }),
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: null,
          scheduledAt: {
            gte: now,
            lte: new Date(now.getTime() + 60 * 60 * 1000),
          },
        },
      }),
      this.db().followUp.count({
        where: {
          ...followUpWhere,
          completedAt: null,
          scheduledAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        totalLeads,
        quickStats: {
          todayFollowUps,
          overdueFollowUps,
          upcomingFollowUps,
          completedTodayFollowUps,
          pendingQueueCount,
        },
        queueSla: {
          breachedCount,
          dueNextHourCount,
          managerAttentionCount,
        },
        statsCards,
        filterPills,
      },
    };
  }

  async listMobileLeads(query: Query, user?: Body) {
    const { page, limit, skip } = pageMeta(query);
    const baseScope = await this.buildMobileUserScope(user);
    const where: Body = {
      deletedAt: null,
      ...baseScope,
    };

    if (query.search) {
      const searchConditions = await this.buildLeadSearchConditions(
        query.search,
      );
      if (searchConditions.length) {
        where.AND = [
          ...((where.AND as Prisma.LeadWhereInput[]) ?? []),
          { OR: searchConditions },
        ];
      }
    }

    const statusIds = parseMultiQueryValues(query.statusId);
    if (statusIds.length) where.statusId = { in: statusIds };

    const temperatureIds = parseMultiQueryValues(query.temperatureId);
    if (temperatureIds.length) where.temperatureId = { in: temperatureIds };

    const projectIds = parseMultiQueryValues(
      query.projectId ?? query['projectId[]'],
    );
    const configurations = parseMultiQueryValues(query.configuration);
    const propertyTypes = parseMultiQueryValues(query.propertyType);

    const reqFilterConditions = await this.buildProjectAndRequirementWhere(
      projectIds,
      propertyTypes,
      configurations,
    );
    if (reqFilterConditions.length) {
      where.AND = [
        ...((where.AND as Prisma.LeadWhereInput[]) ?? []),
        ...reqFilterConditions,
      ];
    }
    if (false && 'legacy') {
      where.requirement = {
        is: {
          ...(projectIds.length
            ? { preferredProjectId: { in: projectIds } }
            : {}),
          ...(configurations.length
            ? { configuration: { in: configurations } }
            : {}),
          ...(propertyTypes.length
            ? { propertyType: { in: propertyTypes } }
            : {}),
        },
      };
    }

    if (query.assignedTo && query.assignedTo !== 'all') {
      where.ownerId = String(query.assignedTo);
    }

    if (query.dateFrom || query.dateTo || query.from || query.to) {
      where.createdAt = {};
      const from = normalizeDate(query.dateFrom ?? query.from);
      const to = normalizeDate(query.dateTo ?? query.to);
      if (from) where.createdAt.gte = startOfDay(from);
      if (to) where.createdAt.lte = endOfDay(to);
    }

    const [rawItems, total] = await Promise.all([
      this.db().lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sort === 'asc' ? 'asc' : 'desc' },
        include: {
          requirement: true,
          followUps: {
            where: { completedAt: null },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          },
        },
      }),
      this.db().lead.count({ where }),
    ]);

    const masterIds = Array.from(
      new Set(
        rawItems
          .flatMap((l: Body) => [l.statusId, l.temperatureId, l.sourceId])
          .filter(Boolean),
      ),
    ) as string[];

    const reqProjectIds = Array.from(
      new Set(
        rawItems
          .map((l: Body) => l.requirement?.preferredProjectId)
          .filter(Boolean),
      ),
    ) as string[];

    const userIds = Array.from(
      new Set(
        rawItems
          .flatMap((l: Body) => [l.ownerId, l.telecallerId, l.fieldExecutiveId])
          .filter(Boolean),
      ),
    ) as string[];

    const [masters, projects, users] = await Promise.all([
      masterIds.length
        ? this.db().leadMasterValue.findMany({
            where: { id: { in: masterIds } },
            select: {
              id: true,
              name: true,
              displayColor: true,
              allowFollowUp: true,
            },
          })
        : Promise.resolve(
            [] as Array<{
              id: string;
              name: string;
              displayColor: string | null;
              allowFollowUp: boolean;
            }>,
          ),
      reqProjectIds.length
        ? this.db().project.findMany({
            where: { id: { in: reqProjectIds } },
            select: { id: true, name: true, location: true },
          })
        : Promise.resolve(
            [] as Array<{ id: string; name: string; location: string }>,
          ),
      userIds.length
        ? this.db().user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, fullName: true, role: true },
          })
        : Promise.resolve(
            [] as Array<{ id: string; fullName: string; role: string }>,
          ),
    ]);

    const masterMap = new Map<string, any>(masters.map((m: any) => [m.id, m]));
    const projectMap = new Map<string, any>(
      projects.map((p: any) => [p.id, p]),
    );
    const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));

    const now = new Date();
    const formatDateTime = (d: Date | string | null | undefined) => {
      if (!d) return null;
      const date = d instanceof Date ? d : new Date(String(d));
      if (Number.isNaN(date.getTime())) return null;
      return date.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    };

    const getInitials = (name: string) => {
      const parts = String(name || '')
        .trim()
        .split(/\s+/);
      if (!parts.length || !parts[0]) return 'L';
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    };

    const items = rawItems.map((lead: Body) => {
      const status = lead.statusId ? masterMap.get(lead.statusId) : null;
      const temperature = lead.temperatureId
        ? masterMap.get(lead.temperatureId)
        : null;
      const project = lead.requirement?.preferredProjectId
        ? projectMap.get(lead.requirement.preferredProjectId)
        : null;
      const assignedUser = lead.ownerId
        ? userMap.get(lead.ownerId)
        : lead.telecallerId
        ? userMap.get(lead.telecallerId)
        : lead.fieldExecutiveId
        ? userMap.get(lead.fieldExecutiveId)
        : null;

      const nextFollowUp = lead.followUps?.[0] ?? null;

      return {
        id: lead.id,
        displayId: lead.displayId,
        name: lead.name,
        initials: getInitials(lead.name),
        phone: lead.mobile,
        email: lead.email,
        status: status
          ? {
              id: status.id,
              name: status.name,
              color: status.displayColor || '#2563EB',
              allowFollowUp: status.allowFollowUp ?? true,
            }
          : null,
        temperature: temperature
          ? {
              id: temperature.id,
              name: temperature.name,
              color: temperature.displayColor || '#EF4444',
            }
          : null,
        project: project
          ? {
              id: project.id,
              name: project.name,
              location: project.location,
            }
          : null,
        configuration: lead.requirement?.configuration || 'Not specified',
        budgetRange: lead.requirement?.budgetRange || null,
        location:
          lead.requirement?.preferredLocation ||
          project?.location ||
          'Location not available',
        nextFollowUp: nextFollowUp
          ? {
              id: nextFollowUp.id,
              scheduledAt: nextFollowUp.scheduledAt,
              scheduledLabel: formatDateTime(nextFollowUp.scheduledAt),
              isOverdue: new Date(nextFollowUp.scheduledAt) < now,
              remarks: nextFollowUp.notes || nextFollowUp.nextAction || null,
            }
          : null,
        remark: lead.remarks || nextFollowUp?.notes || 'No remark added',
        assignedTo: assignedUser
          ? {
              id: assignedUser.id,
              name: assignedUser.fullName,
              role: assignedUser.role,
            }
          : null,
        createdAt: lead.createdAt,
        createdLabel: formatDateTime(lead.createdAt),
        updatedAt: lead.updatedAt,
      };
    });

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async getMobileLeadMasters(user?: Body) {
    const [statusCat, tempCat, srcCat] = await Promise.all([
      this.db().leadMasterCategory.findFirst({
        where: { code: { in: ['status', 'lead_status', 'lead-status'] } },
      }),
      this.db().leadMasterCategory.findFirst({
        where: {
          code: { in: ['temperature', 'lead_temperature', 'lead-temperature'] },
        },
      }),
      this.db().leadMasterCategory.findFirst({
        where: { code: { in: ['source', 'lead_source', 'lead-source'] } },
      }),
    ]);

    const catIds = [statusCat?.id, tempCat?.id, srcCat?.id].filter(
      Boolean,
    ) as string[];

    const [allMasters, projects, users] = await Promise.all([
      catIds.length
        ? this.db().leadMasterValue.findMany({
            where: { categoryId: { in: catIds }, isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          })
        : Promise.resolve([] as any[]),
      this.db().project.findMany({
        where: { status: 'Active' },
        select: { id: true, name: true, location: true, configurations: true },
        orderBy: { name: 'asc' },
      }),
      this.db().user.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, email: true, role: true },
        orderBy: { fullName: 'asc' },
      }),
    ]);

    const statuses = allMasters
      .filter((m) => m.categoryId === statusCat?.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        color: m.displayColor || '#2563EB',
        allowFollowUp: m.allowFollowUp ?? true,
        showInStatsCard: m.showInStatsCard ?? true,
        showInFilterBar: m.showInFilterBar ?? true,
        sortOrder: m.sortOrder,
      }));

    const temperatures = allMasters
      .filter((m) => m.categoryId === tempCat?.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
        color: m.displayColor || '#EF4444',
        sortOrder: m.sortOrder,
      }));

    const sources = allMasters
      .filter((m) => m.categoryId === srcCat?.id)
      .map((m) => ({
        id: m.id,
        name: m.name,
        code: m.code,
      }));

    const projectConfigurations = new Set<string>([
      '1 BHK',
      '2 BHK',
      '3 BHK',
      '4 BHK',
      '5 BHK',
      'Studio',
      'Penthouse',
    ]);

    for (const p of projects) {
      if (Array.isArray(p.configurations)) {
        for (const c of p.configurations) {
          if (c && typeof c === 'string') projectConfigurations.add(c.trim());
        }
      }
    }

    return {
      success: true,
      data: {
        statuses,
        temperatures,
        sources,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          location: p.location,
        })),
        configurations: Array.from(projectConfigurations).sort(),
        budgetRanges: [
          '50 Lakh - 75 Lakh',
          '75 Lakh - 1 Cr',
          '1 Cr - 1.5 Cr',
          '1.5 Cr - 2 Cr',
          '2 Cr - 3 Cr',
          '3 Cr+',
        ],
        propertyTypes: ['Apartment', 'Villa', 'Plot', 'Commercial'],
        assignees: users.map((u) => ({
          id: u.id,
          name: u.fullName,
          email: u.email,
          role: u.role,
        })),
      },
    };
  }

  async listMobileFollowUps(query: Query, actor: Body) {
    const followUpsResult = await this.listFollowUps(query, actor);
    const summaryResult = await this.getMobileLeadSummary(query, actor);
    return {
      success: true,
      data: followUpsResult.data,
      summary: {
        todayCount: summaryResult.data.quickStats.todayFollowUps,
        overdueCount: summaryResult.data.quickStats.overdueFollowUps,
        upcomingCount: summaryResult.data.quickStats.upcomingFollowUps,
        completedTodayCount:
          summaryResult.data.quickStats.completedTodayFollowUps,
        pendingCount: summaryResult.data.quickStats.pendingQueueCount,
        breachedCount: summaryResult.data.queueSla.breachedCount,
        dueNextHourCount: summaryResult.data.queueSla.dueNextHourCount,
        managerAttentionCount:
          summaryResult.data.queueSla.managerAttentionCount,
      },
      meta: followUpsResult.meta,
    };
  }
}
