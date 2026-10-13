import type { Role } from '@prisma/client';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'punchIn'
  | 'punchOut';

export const PERMISSION_ACTIONS: PermissionAction[] = [
  'view',
  'create',
  'update',
  'delete',
  'punchIn',
  'punchOut',
];

export interface ModulePermission {
  moduleKey: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPunchIn: boolean;
  canPunchOut: boolean;
}

export interface AccessModuleDefinition {
  key: string;
  label: string;
  group: string;
  description: string;
  actions: PermissionAction[];
  actionLabels?: Partial<Record<PermissionAction, string>>;
  actionRoles?: Partial<Record<PermissionAction, Role[]>>;
  kind?: 'module' | 'page';
  parentModuleKey?: string;
  navigationMode?: 'sidebar' | 'route-only';
}

const crud: PermissionAction[] = ['view', 'create', 'update', 'delete'];
const readOnly: PermissionAction[] = ['view'];
const manage: PermissionAction[] = ['view', 'create', 'update'];
const attendanceActions: PermissionAction[] = [
  'view',
  'punchIn',
  'punchOut',
  'update',
];
const attendanceCorrectionRoles: Role[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'HR',
  'SALES_MANAGER',
];

const CORE_ACCESS_MODULES: AccessModuleDefinition[] = [
  {
    key: 'mobile_app',
    label: 'Mobile app releases',
    group: 'Settings',
    description:
      'Upload and publish Android APK releases. Administrators only.',
    actions: manage,
  },
  {
    key: 'dashboard',
    label: 'Dashboard',
    group: 'Core',
    description: 'Main CRM dashboard and overview widgets.',
    actions: readOnly,
  },
  {
    key: 'leads',
    label: 'All Leads',
    group: 'Lead Management',
    description: 'All active leads list, lead details, and pipeline.',
    actions: crud,
  },
  {
    key: 'follow_up_leads',
    label: 'Follow-Up Leads',
    group: 'Lead Management',
    description: 'Scheduled follow-up leads and reminders.',
    actions: crud,
  },
  {
    key: 'contact_leads',
    label: 'Contact Leads',
    group: 'Lead Management',
    description: 'Cold-contact leads directory and conversion.',
    actions: crud,
  },
  {
    key: 'lost_leads',
    label: 'Lost & Inactive Leads',
    group: 'Lead Management',
    description: 'Lost leads and inactive lead recovery.',
    actions: crud,
  },
  {
    key: 'lead_masters',
    label: 'Lead Masters (Status & Sources)',
    group: 'Masters',
    description:
      'Lead source, status, type, priority, and requirement masters.',
    actions: crud,
  },
  {
    key: 'property_masters',
    label: 'Property & Configuration Masters',
    group: 'Masters',
    description: 'Property type, project configuration, and area masters.',
    actions: crud,
  },
  {
    key: 'auto_assignment_master',
    label: 'Auto assignment master',
    group: 'Masters',
    description: 'Lead routing and handoff automation rules.',
    actions: manage,
  },
  {
    key: 'projects',
    label: 'Projects',
    group: 'Projects',
    description: 'Projects, project masters, inventory, and project details.',
    actions: crud,
  },
  {
    key: 'site_visits',
    label: 'Site visits',
    group: 'Site Visits',
    description: 'Site visit planning, execution, and visit history.',
    actions: crud,
  },
  {
    key: 'bookings',
    label: 'Bookings',
    group: 'Bookings',
    description: 'Booking records, receipts, and booking status.',
    actions: crud,
  },
  {
    key: 'employees',
    label: 'Employees',
    group: 'Employees',
    description: 'Employee directory and employee profile management.',
    actions: crud,
  },
  {
    key: 'teams',
    label: 'Teams',
    group: 'Employees',
    description: 'Team creation, team members, and team leaders.',
    actions: crud,
  },
  {
    key: 'attendance',
    label: 'Attendance',
    group: 'Employees',
    description: 'Attendance workspace, punch records, and corrections.',
    actions: attendanceActions,
    actionLabels: {
      view: 'View attendance',
      punchIn: 'Punch in',
      punchOut: 'Punch out',
      update: 'Correct attendance',
    },
    actionRoles: {
      update: attendanceCorrectionRoles,
    },
  },
  {
    key: 'leaves',
    label: 'Leaves',
    group: 'Employees',
    description: 'Leave requests, decisions, and leave history.',
    actions: manage,
  },
  {
    key: 'holidays',
    label: 'Holidays',
    group: 'Employees',
    description: 'Holiday calendar and holiday visibility.',
    actions: crud,
  },
  {
    key: 'payroll',
    label: 'Payroll',
    group: 'Employees',
    description: 'Payroll runs, payroll settings, and salary processing.',
    actions: manage,
  },
  {
    key: 'payslips',
    label: 'Payslips',
    group: 'Employees',
    description: 'Payslip generation and employee payslip access.',
    actions: manage,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    group: 'Employees',
    description: 'Employee task assignment and tracking.',
    actions: crud,
  },
  {
    key: 'performance',
    label: 'Performance',
    group: 'Employees',
    description: 'Admin-wide employee performance dashboard.',
    actions: readOnly,
  },
  {
    key: 'top_performers',
    label: 'Top performer lists',
    group: 'Employees',
    description:
      'Access to user-wise and team-wise top performer leaderboard lists.',
    actions: readOnly,
  },
  {
    key: 'hr_settings',
    label: 'HR settings',
    group: 'Settings',
    description: 'Payroll, attendance, and HR configuration settings.',
    actions: manage,
  },
  {
    key: 'shifts',
    label: 'Shifts',
    group: 'Settings',
    description: 'Shift timings, working days, grace rules, and penalties.',
    actions: crud,
  },
  {
    key: 'incentives',
    label: 'Incentives',
    group: 'Settings',
    description:
      'Incentive configuration access for future incentive workflows.',
    actions: manage,
  },
  {
    key: 'access_control',
    label: 'Access control',
    group: 'Settings',
    description: 'Role templates and per-employee module permissions.',
    actions: manage,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    group: 'Employee Self-Service',
    description: 'Notification center access.',
    actions: readOnly,
  },
];

export const PAGE_VISIBILITY_MODULES: AccessModuleDefinition[] = [
  {
    key: 'page.mobile_app',
    label: 'Mobile app',
    group: 'Page visibility: Settings',
    description: 'Android app publishing settings. Administrators only.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'mobile_app',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.dashboard',
    label: 'Dashboard',
    group: 'Page visibility: Core',
    description: 'Dashboard landing page in the sidebar.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'dashboard',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.all_leads',
    label: 'All Leads',
    group: 'Page visibility: Lead management',
    description: 'All Leads workspace and lead details.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.contact_leads',
    label: 'Contact Leads',
    group: 'Page visibility: Lead management',
    description: 'Contact lead directory and conversion page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'contact_leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.follow_up_leads',
    label: 'Follow-Up Leads',
    group: 'Page visibility: Lead management',
    description: 'Follow-up queues and reminders.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.inactive_leads',
    label: 'Inactive Leads',
    group: 'Page visibility: Lead management',
    description: 'Inactive and lost lead recovery page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'lost_leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.deleted_leads',
    label: 'Deleted Leads',
    group: 'Page visibility: Lead management',
    description: 'Deleted lead records page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.lead_pipeline',
    label: 'Lead Pipeline',
    group: 'Page visibility: Lead management',
    description: 'Lead pipeline board.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.lead_analytics',
    label: 'Lead Conversion Analytics',
    group: 'Page visibility: Lead management',
    description: 'Lead conversion analytics page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.import_leads',
    label: 'Import Leads',
    group: 'Page visibility: Lead management',
    description: 'Lead import sources and upload tools.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.project_masters',
    label: 'Project Masters',
    group: 'Page visibility: Masters',
    description: 'Project and configuration master page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'property_masters',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.lead_masters',
    label: 'Lead Masters',
    group: 'Page visibility: Masters',
    description: 'Lead status, source, and type master page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'lead_masters',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.auto_assignment',
    label: 'Auto Assignment Master',
    group: 'Page visibility: Masters',
    description: 'Auto-assignment configuration page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'auto_assignment_master',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.projects',
    label: 'Projects',
    group: 'Page visibility: Projects',
    description: 'Projects and inventory workspace.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'projects',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.site_visits',
    label: 'Site Visits',
    group: 'Page visibility: Operations',
    description: 'Site visit scheduling and history.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'site_visits',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.bookings_pipeline',
    label: 'Bookings Pipeline',
    group: 'Page visibility: Operations',
    description: 'Booking records and pipeline.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'bookings',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.booking_finance',
    label: 'Brokerage & Incentives',
    group: 'Page visibility: Operations',
    description: 'Brokerage and incentive reports.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'bookings',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.employee_directory',
    label: 'Employee Directory',
    group: 'Page visibility: Employees',
    description: 'Employee directory and profiles.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'employees',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.teams',
    label: 'Teams',
    group: 'Page visibility: Employees',
    description: 'Team management page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'teams',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.attendance',
    label: 'Attendance',
    group: 'Page visibility: Employees',
    description: 'Attendance workspace.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'attendance',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.leave_requests',
    label: 'Leave Requests',
    group: 'Page visibility: Employees',
    description: 'Leave request management page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leaves',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.holidays',
    label: 'Holidays',
    group: 'Page visibility: Employees',
    description: 'Holiday calendar.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'holidays',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.payroll',
    label: 'Payroll',
    group: 'Page visibility: Employees',
    description: 'Payroll workspace.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'payroll',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.payslips',
    label: 'Payslips',
    group: 'Page visibility: Employees',
    description: 'Payslip workspace.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'payslips',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.tasks',
    label: 'Tasks',
    group: 'Page visibility: Employees',
    description: 'Task workspace.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'tasks',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.performance',
    label: 'Performance',
    group: 'Page visibility: Employees',
    description: 'Performance dashboards.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'performance',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.access_control',
    label: 'Access Control',
    group: 'Page visibility: Employees',
    description: 'Role and employee access control page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'access_control',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.email_settings',
    label: 'Email Connectors',
    group: 'Page visibility: Settings',
    description: 'SMTP and email connector settings.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'hr_settings',
    navigationMode: 'route-only',
  },
  {
    key: 'page.general_settings',
    label: 'General Settings',
    group: 'Page visibility: Settings',
    description: 'General CRM settings page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'hr_settings',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.call_history',
    label: 'Call History',
    group: 'Page visibility: Communication',
    description: 'Call history page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'leads',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.my_performance',
    label: 'My Performance',
    group: 'Page visibility: Communication',
    description: 'Personal performance dashboard.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'performance',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.my_commissions',
    label: 'My Commissions',
    group: 'Page visibility: Communication',
    description: 'Personal commission page.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'dashboard',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.notifications',
    label: 'Notifications',
    group: 'Page visibility: Communication',
    description: 'Notification center.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'notifications',
    navigationMode: 'sidebar',
  },
  {
    key: 'page.notification_settings',
    label: 'Notification Settings',
    group: 'Page visibility: Settings',
    description: 'FCM and WhatsApp notification channel and trigger settings.',
    actions: readOnly,
    kind: 'page',
    parentModuleKey: 'notifications',
    navigationMode: 'sidebar',
  },
];

export const PAGE_PARENT_MODULE_MAP: Record<string, string> =
  PAGE_VISIBILITY_MODULES.reduce<Record<string, string>>((acc, page) => {
    if (page.parentModuleKey) {
      acc[page.key] = page.parentModuleKey;
    }
    return acc;
  }, {});

export const ACCESS_MODULES: AccessModuleDefinition[] = [
  ...CORE_ACCESS_MODULES,
  ...PAGE_VISIBILITY_MODULES,
];

const moduleKeys = ACCESS_MODULES.map((module) => module.key);

const allow = (
  moduleKey: string,
  actions: Partial<Omit<ModulePermission, 'moduleKey'>> = {},
): ModulePermission => ({
  moduleKey,
  canView: true,
  canCreate: Boolean(actions.canCreate),
  canUpdate: Boolean(actions.canUpdate),
  canDelete: Boolean(actions.canDelete),
  canPunchIn: Boolean(actions.canPunchIn),
  canPunchOut: Boolean(actions.canPunchOut),
});

const allowAll = (moduleKey: string): ModulePermission => {
  const actions =
    ACCESS_MODULES.find((module) => module.key === moduleKey)?.actions ?? [];
  return {
    moduleKey,
    canView: actions.includes('view'),
    canCreate: actions.includes('create'),
    canUpdate: actions.includes('update'),
    canDelete: actions.includes('delete'),
    canPunchIn: actions.includes('punchIn'),
    canPunchOut: actions.includes('punchOut'),
  };
};

const allowManage = (moduleKey: string): ModulePermission =>
  allow(moduleKey, { canCreate: true, canUpdate: true });

const allowAttendance = (canCorrect = false): ModulePermission =>
  allow('attendance', {
    canPunchIn: true,
    canPunchOut: true,
    canUpdate: canCorrect,
  });

const allowPages = (moduleKeys: string[]): ModulePermission[] =>
  moduleKeys.map((moduleKey) => allow(moduleKey));

const allPageKeys = PAGE_VISIBILITY_MODULES.map((page) => page.key);

const adminPageKeys = allPageKeys;
const hrPageKeys = [
  'page.dashboard',
  'page.employee_directory',
  'page.teams',
  'page.attendance',
  'page.leave_requests',
  'page.holidays',
  'page.payroll',
  'page.payslips',
  'page.tasks',
  'page.access_control',
  'page.general_settings',
  'page.notifications',
];
const salesManagerPageKeys = [
  'page.dashboard',
  'page.all_leads',
  'page.contact_leads',
  'page.follow_up_leads',
  'page.inactive_leads',
  'page.deleted_leads',
  'page.lead_pipeline',
  'page.lead_analytics',
  'page.import_leads',
  'page.project_masters',
  'page.lead_masters',
  'page.auto_assignment',
  'page.projects',
  'page.site_visits',
  'page.bookings_pipeline',
  'page.booking_finance',
  'page.employee_directory',
  'page.teams',
  'page.attendance',
  'page.performance',
  'page.tasks',
  'page.call_history',
  'page.notifications',
];
const teamLeaderPageKeys = [
  'page.dashboard',
  'page.all_leads',
  'page.contact_leads',
  'page.follow_up_leads',
  'page.inactive_leads',
  'page.lead_masters',
  'page.project_masters',
  'page.projects',
  'page.site_visits',
  'page.employee_directory',
  'page.teams',
  'page.attendance',
  'page.leave_requests',
  'page.holidays',
  'page.payslips',
  'page.tasks',
  'page.performance',
  'page.call_history',
  'page.my_performance',
  'page.my_commissions',
  'page.notifications',
];
const managerPageKeys = teamLeaderPageKeys.filter(
  (key) => key !== 'page.teams',
);
const employeePageKeys = [
  'page.dashboard',
  'page.all_leads',
  'page.follow_up_leads',
  'page.site_visits',
  'page.call_history',
  'page.my_performance',
  'page.my_commissions',
  'page.notifications',
  'page.employee_directory',
  'page.attendance',
  'page.leave_requests',
  'page.holidays',
  'page.payslips',
  'page.tasks',
];
const marketingPageKeys = [
  'page.dashboard',
  'page.all_leads',
  'page.contact_leads',
  'page.lead_masters',
  'page.projects',
  'page.notifications',
];
const backendPageKeys = [
  'page.attendance',
  'page.tasks',
  'page.employee_directory',
];

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, ModulePermission[]> = {
  SUPER_ADMIN: [
    ...CORE_ACCESS_MODULES.map((module) => allowAll(module.key)),
    ...allowPages(adminPageKeys),
  ],
  ADMIN: [
    ...CORE_ACCESS_MODULES.map((module) => allowAll(module.key)),
    ...allowPages(adminPageKeys),
  ],
  HR: [
    allow('dashboard'),
    allowAll('employees'),
    allowAll('teams'),
    allowAttendance(true),
    allowManage('leaves'),
    allowAll('holidays'),
    allowManage('payroll'),
    allowManage('payslips'),
    allowAll('tasks'),
    allowManage('hr_settings'),
    allowAll('shifts'),
    allowManage('incentives'),
    allowManage('access_control'),
    allowManage('notifications'),
    ...allowPages(hrPageKeys),
  ],
  SALES_MANAGER: [
    allow('dashboard'),
    allowAll('leads'),
    allowAll('lead_masters'),
    allowManage('auto_assignment_master'),
    allowAll('projects'),
    allowAll('site_visits'),
    allowAll('bookings'),
    allow('employees'),
    allow('teams'),
    allow('performance'),
    allowAttendance(true),
    allowManage('incentives'),
    allowManage('tasks'),
    allowManage('notifications'),
    ...allowPages(salesManagerPageKeys),
  ],
  TEAM_LEADER: [
    allow('dashboard'),
    allowManage('leads'),
    allowManage('follow_up_leads'),
    allowManage('contact_leads'),
    allow('lost_leads'),
    allow('lead_masters'),
    allow('property_masters'),
    allow('projects'),
    allow('site_visits'),
    allowManage('tasks'),
    allow('employees'),
    allow('teams'),
    allow('performance'),
    allowAttendance(),
    allow('leaves', { canCreate: true, canUpdate: true }),
    allow('holidays'),
    allow('payroll'),
    allow('payslips'),
    allowManage('incentives'),
    allow('top_performers'),
    allowManage('notifications'),
    ...allowPages(teamLeaderPageKeys),
  ],
  MANAGER: [
    allow('dashboard'),
    allowManage('leads'),
    allowManage('follow_up_leads'),
    allowManage('contact_leads'),
    allow('lost_leads'),
    allow('lead_masters'),
    allow('property_masters'),
    allow('projects'),
    allow('site_visits'),
    allowManage('tasks'),
    allow('employees'),
    allow('performance'),
    allowAttendance(),
    allow('leaves', { canCreate: true, canUpdate: true }),
    allow('holidays'),
    allow('payroll'),
    allow('payslips'),
    allowManage('incentives'),
    allow('top_performers'),
    allowManage('notifications'),
    ...allowPages(managerPageKeys),
  ],
  SALES_AGENT: [
    allow('dashboard'),
    allowManage('leads'),
    allow('lead_masters'),
    allowManage('projects'),
    allow('performance'),
    allowManage('site_visits'),
    allowManage('tasks'),
    allowAttendance(),
    allow('leaves', { canCreate: true, canUpdate: true }),
    allow('holidays'),
    allow('payroll'),
    allow('payslips'),
    allowManage('incentives'),
    allow('top_performers'),
    allowManage('notifications'),
    ...allowPages(employeePageKeys),
  ],
  TELECALLER: [
    allow('dashboard'),
    allowManage('leads'),
    allow('lead_masters'),
    allowManage('projects'),
    allow('performance'),
    allowManage('site_visits'),
    allowManage('tasks'),
    allowAttendance(),
    allow('leaves', { canCreate: true, canUpdate: true }),
    allow('holidays'),
    allow('payroll'),
    allow('payslips'),
    allowManage('incentives'),
    allow('top_performers'),
    allowManage('notifications'),
    ...allowPages(employeePageKeys),
  ],
  MARKETING: [
    allow('dashboard'),
    allowAll('leads'),
    allowManage('lead_masters'),
    allow('projects'),
    allowManage('notifications'),
    ...allowPages(marketingPageKeys),
  ],
  BACKEND: [
    allowAttendance(),
    allowManage('tasks'),
    allow('employees'),
    ...allowPages(backendPageKeys),
  ],
};

export const ACCESS_MODULE_KEYS = new Set(moduleKeys);
