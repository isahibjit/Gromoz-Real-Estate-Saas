import type { PropsWithChildren } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { AuthTokens } from "@truroot/shared/auth";

import { LoginScreen } from "./screens/auth/login/login";
import { RegisterOrganizationScreen } from "./screens/auth/register/RegisterOrganizationScreen";
import { BillingOverviewScreen } from "./screens/billing/BillingOverviewScreen";
import { SuperAdminDashboard } from "./screens/superadmin/SuperAdminDashboard";
import { AllTenantsScreen } from "./screens/superadmin/AllTenantsScreen";
import { TenantOverviewScreen } from "./screens/superadmin/TenantOverviewScreen";
import { PlansPricingScreen } from "./screens/superadmin/PlansPricingScreen";
import { PlatformAuditLogsScreen } from "./screens/superadmin/PlatformAuditLogsScreen";
import { PlatformSettingsScreen } from "./screens/superadmin/PlatformSettingsScreen";
import { WorkspaceSettingsPage } from "./screens/admin/settings/WorkspaceSettingsPage";
import { DownloadAppScreen } from "./screens/public/DownloadAppScreen";
import { MobileAppScreen } from "./screens/admin/settings/MobileAppScreen";
import { useRefreshSession } from "./common/queries/useRefreshSession";
import { useAppSelector } from "./store";
import { DashboardScreen } from "./screens/admin/dashboard/dashboard";
import { TelecallerDashboardScreen } from "./screens/telecaller/dashboard/TelecallerDashboardScreen";

import { MyLeadsScreen } from "./screens/telecaller/leads/MyLeadsScreen";
import { AutoAssignmentMasterScreen } from "./screens/admin/leads/assignment/AutoAssignmentMasterScreen";
import { EditLeadScreen } from "./screens/admin/leads/edit/EditLeadScreen";
import { LeadDetailsScreen } from "./screens/admin/leads/details/LeadDetailsScreen";
import { LeadSiteVisitsScreen } from "./screens/admin/leads/details/site-visits/LeadSiteVisitsScreen";
import { SiteVisitsScreen } from "./screens/admin/leads/site-visits/SiteVisitsScreen";
import { SiteVisitDetailsScreen } from "./screens/admin/leads/site-visits/SiteVisitDetailsScreen";
import { ProjectDetailsScreen } from "./screens/admin/projects/ProjectDetailsScreen";
import { ProjectMastersScreen } from "./screens/admin/projects/masters/ProjectMastersScreen";
import { ProjectsScreen } from "./screens/admin/projects/ProjectsScreen";
import { UnitDetailsScreen } from "./screens/admin/projects/UnitDetailsScreen";
import { BookingsScreen } from "./screens/admin/bookings/BookingsScreen";
import { BrokerageIncentiveReportScreen } from "./screens/admin/bookings/BrokerageIncentiveReportScreen";
import { ImportLeadsScreen } from "./screens/admin/leads/import/ImportLeadsScreen";
import { ConnectMagicBricksScreen } from "./screens/admin/leads/import/magicbricks/ConnectMagicBricksScreen";
import { MapMagicBricksFieldsScreen } from "./screens/admin/leads/import/magicbricks/MapMagicBricksFieldsScreen";
import { ConnectMetaLeadsScreen } from "./screens/admin/leads/import/meta/ConnectMetaLeadsScreen";
import { ConnectWebsiteScreen } from "./screens/admin/leads/import/website/ConnectWebsiteScreen";
import { Connect99AcresScreen } from "./screens/admin/leads/import/99acres/Connect99AcresScreen";
import { Map99AcresFieldsScreen } from "./screens/admin/leads/import/99acres/Map99AcresFieldsScreen";
import { Test99AcresConnectionScreen } from "./screens/admin/leads/import/99acres/Test99AcresConnectionScreen";
import { ConnectHousingScreen } from "./screens/admin/leads/import/housing/ConnectHousingScreen";
import { MapHousingFieldsScreen } from "./screens/admin/leads/import/housing/MapHousingFieldsScreen";
import { TestHousingConnectionScreen } from "./screens/admin/leads/import/housing/TestHousingConnectionScreen";
import { ImportSummaryScreen } from "./screens/admin/leads/import/ImportSummaryScreen";
import { AllLeadsScreen } from "./screens/admin/leads/all/AllLeadsScreen";
import { ContactLeadsScreen } from "./screens/admin/leads/contact/ContactLeadsScreen";
import { DuplicateLeadsScreen } from "./screens/admin/leads/duplicates/DuplicateLeadsScreen";
import { FollowUpLeadsScreen } from "./screens/admin/leads/follow-up/FollowUpLeadsScreen";
import { InactiveLeadsScreen } from "./screens/admin/leads/inactive/InactiveLeadsScreen";
import { DeletedLeadsScreen } from "./screens/admin/leads/deleted/DeletedLeadsScreen";
import { LeadPipelineScreen } from "./screens/admin/leads/pipeline/LeadPipelineScreen";
import { ConversionAnalyticsScreen } from "./screens/admin/leads/conversion/ConversionAnalyticsScreen";
import { LeadSourceAnalyticsScreen } from "./screens/admin/leads/source-analytics/LeadSourceAnalyticsScreen";
import { ForgotPasswordScreen } from "./screens/auth/forgot-password/ForgotPasswordScreen";
import { ResetPasswordScreen } from "./screens/auth/reset-password/ResetPasswordScreen";
import { LeadMastersScreen } from "./screens/admin/leads/masters/LeadMastersScreen";
import { AuditLogScreen } from "./screens/admin/leads/masters/audit-log/AuditLogScreen";
import { TelecallerMyPerformanceScreen } from "./screens/telecaller/performance/TelecallerMyPerformanceScreen";
import { VisitHistoryScreen } from "./screens/telecaller/visits/VisitHistoryScreen";
import { TelecallerCallHistoryScreen } from "./screens/telecaller/communication/TelecallerCallHistoryScreen";
import { CallHistoryScreen } from "./screens/calls/CallHistoryScreen";
import { NotificationsScreen } from "./screens/notifications/NotificationsScreen";
import { TelecallerWhatsAppLogsScreen } from "./screens/telecaller/communication/TelecallerWhatsAppLogsScreen";
import { DashboardWorkspaceFrame } from "./screens/admin/dashboard/DashboardWorkspaceLayout";
import { FieldExecutiveDashboardScreen } from "./screens/field-executive/FieldExecutiveDashboardScreen";
import { useFieldExecutiveLiveTracking } from "./screens/field-executive/useFieldExecutive";
import {
  FieldExecutiveSiteVisitsScreen,
} from "./screens/field-executive/FieldExecutiveCoreScreens";
import { HrWorkspaceScreen } from "./screens/hr/HrWorkspaceScreen";
import { HrEmployeeDetailsScreen } from "./screens/hr/HrEmployeeDetailsScreen";
import { HrTeamDetailsScreen } from "./screens/hr/HrTeamDetailsScreen";
import { EmployeeTasksScreen } from "./screens/tasks/EmployeeTasksScreen";
import { AdminPerformanceScreen } from "./screens/admin/performance/AdminPerformanceScreen";
import { AdminCallingPerformanceScreen } from "./screens/admin/performance/AdminCallingPerformanceScreen";
import { AdminLeadPerformanceScreen } from "./screens/admin/performance/AdminLeadPerformanceScreen";
import { AccessControlScreen } from "./screens/admin/access-control/AccessControlScreen";
import { MyCommissionsScreen } from "./screens/commissions/MyCommissionsScreen";
import {
  PrivacyPolicyPage,
  TermsOfUsePage,
} from "./screens/legal/LegalPages";
import { PublicProjectGalleryScreen } from "./screens/public/PublicProjectGalleryScreen";
import { EmailSettingsScreen } from "./screens/admin/settings/EmailSettingsScreen";
import { NotificationSettingsScreen } from "./screens/admin/settings/NotificationSettingsScreen";
import { Loader2 } from "lucide-react";
import { Card } from "ui";
import { canAccess } from "./common/access/access";
import {
  getFirstAccessibleNavigationPath,
  moduleKeyForPath,
  pageKeyForPath,
} from "./common/navigation/navigationRegistry";

type AuthUser = AuthTokens["user"] | null | undefined;

const LOGIN_PATH = "/login";
const REGISTER_PATH = "/register";
const BILLING_PATH = "/billing";
const SUPERADMIN_PATH = "/superadmin";
const LOGIN_OTP_PATH = "/login/otp";
const FORGOT_PASSWORD_PATH = "/forgot-password";
const RESET_PASSWORD_PATH = "/reset-password";
const PRIVACY_POLICY_PATH = "/privacy-policy";
const TERMS_OF_USE_PATH = "/terms";
const DASHBOARD_PATH = "/dashboard";
const TELECALLER_DASHBOARD_PATH = "/telecaller/dashboard";
const MY_COMMISSIONS_PATH = "/my-commissions";

const TELECALLER_VISIT_HISTORY_PATH = "/telecaller/visits/history";
const TELECALLER_MY_LEADS_PATH = "/telecaller/leads/my";
const TELECALLER_FOLLOW_UPS_PATH = "/telecaller/follow-ups";
const TELECALLER_LEAD_DETAILS_PATH = "/telecaller/leads/:leadId";
const TELECALLER_MY_PERFORMANCE_PATH = "/telecaller/performance";
const TELECALLER_CALL_HISTORY_PATH = "/telecaller/communication/call-history";
const CALL_HISTORY_PATH = "/call-history";
const TELECALLER_WHATSAPP_LOGS_PATH = "/telecaller/communication/whatsapp-logs";
const TELECALLER_LEAD_TRANSFER_REQUEST_PATH = "/telecaller/requests/transfer";
const NOTIFICATIONS_PATH = "/notifications";
const FIELD_EXECUTIVE_DASHBOARD_PATH = "/field-executive/dashboard";
const FIELD_EXECUTIVE_LEADS_PATH = "/field-executive/leads";
const FIELD_EXECUTIVE_LEAD_DETAILS_PATH = "/field-executive/leads/:leadId";
const FIELD_EXECUTIVE_SITE_VISITS_PATH = "/field-executive/site-visits";
const FIELD_EXECUTIVE_SITE_VISIT_DETAILS_PATH = "/field-executive/site-visits/:visitId";
const FIELD_EXECUTIVE_FOLLOW_UPS_PATH = "/field-executive/follow-ups";
const AUTO_ASSIGNMENT_PATH = "/leads/auto-assignment";
const ADD_LEAD_PATH = "/leads/add";
const COLD_LEADS_PATH = "/leads/cold";
const INACTIVE_LEADS_PATH = "/leads/inactive";
const LOST_LEADS_PATH = "/leads/lost";
const DELETED_LEADS_PATH = "/leads/deleted";
const BULK_UPLOAD_LEADS_PATH = "/leads/bulk-upload";
const SITE_VISITS_PATH = "/leads/site-visits";
const SITE_VISIT_DETAILS_PATH = "/site-visits/:visitId";
const BOOKINGS_PATH = "/bookings";
const BOOKING_FINANCE_PATH = "/bookings/finance";
const PROJECTS_PATH = "/projects";
const PROJECT_MASTERS_PATH = "/projects/masters";
const PROJECT_DETAILS_PATH = "/projects/:projectId";
const UNIT_DETAILS_PATH = "/projects/:projectId/inventory/:inventoryId";
const LEAD_DETAILS_PATH = "/leads/:leadId";
const LEAD_SITE_VISITS_PATH = "/leads/:leadId/site-visits";
const EDIT_LEAD_PATH = "/leads/:leadId/edit";
const HOT_LEADS_PATH = "/leads/hot";
const IMPORT_LEADS_PATH = "/leads/import";
const CONNECT_MAGICBRICKS_PATH = "/leads/import/connect/magicbricks";
const MAP_MAGICBRICKS_FIELDS_PATH =
  "/leads/import/connect/magicbricks/map-fields";
const CONNECT_META_PATH = "/leads/import/connect/meta";
const CONNECT_WEBSITE_PATH = "/leads/import/connect/website";
const CONNECT_99ACRES_PATH = "/leads/import/connect/99acres";
const MAP_99ACRES_FIELDS_PATH = "/leads/import/connect/99acres/map-fields";
const TEST_99ACRES_CONNECTION_PATH =
  "/leads/import/connect/99acres/test-connection";
const CONNECT_HOUSING_PATH = "/leads/import/connect/housing";
const MAP_HOUSING_FIELDS_PATH = "/leads/import/connect/housing/map-fields";
const TEST_HOUSING_CONNECTION_PATH = "/leads/import/test/housing";
const IMPORT_SUMMARY_PATH = "/leads/import/summary/:importId";
const ALL_LEADS_PATH = "/leads/all";
const CONTACT_LEADS_PATH = "/leads/contact";
const REASSIGN_LEADS_PATH = "/leads/reassign";
const DUPLICATE_LEADS_PATH = "/leads/duplicates";
const FOLLOW_UP_LEADS_PATH = "/leads/follow-up";
const LEAD_PIPELINE_PATH = "/leads/pipeline";
const LEAD_CONVERSION_ANALYTICS_PATH = "/leads/conversion-analytics";
const SLA_DASHBOARD_PATH = "/leads/sla-dashboard";
const LEAD_RECOVERY_PATH = "/leads/recovery";
const LEAD_SOURCE_ANALYTICS_PATH = "/reports/lead-source-analytics";
const LEAD_MASTERS_PATH = "/leads/masters";
const LEAD_MASTERS_AUDIT_LOG_PATH = "/leads/masters/audit-log";
const ADMIN_EMPLOYEES_PATH = "/admin/employees";
const ADMIN_EMPLOYEE_DETAILS_PATH = "/admin/employees/:employeeId";
const ADMIN_TEAMS_PATH = "/admin/teams";
const ADMIN_TEAM_DETAILS_PATH = "/admin/teams/:teamId";
const ADMIN_ATTENDANCE_PATH = "/admin/attendance";
const ADMIN_LEAVES_PATH = "/admin/leaves";
const ADMIN_HOLIDAYS_PATH = "/admin/holidays";
const ADMIN_PAYROLL_PATH = "/admin/payroll";
const ADMIN_PAYSLIPS_PATH = "/admin/payslips";
const ADMIN_TASKS_PATH = "/admin/tasks";
const ADMIN_PERFORMANCE_PATH = "/admin/performance";
const ADMIN_CALLING_PERFORMANCE_PATH = "/admin/performance/calling";
const ADMIN_LEAD_PERFORMANCE_PATH = "/admin/performance/leads";
const ADMIN_ACCESS_CONTROL_PATH = "/admin/access-control";
const ADMIN_SETTINGS_PATH = "/admin/settings";
const ADMIN_WORKSPACE_SETTINGS_PATH = "/admin/settings/workspace";
const EMPLOYEE_PROFILE_PATH = "/employee/me";
const EMPLOYEE_ATTENDANCE_PATH = "/employee/attendance";
const EMPLOYEE_LEAVES_PATH = "/employee/leaves";
const EMPLOYEE_HOLIDAYS_PATH = "/employee/holidays";
const EMPLOYEE_PAYSLIPS_PATH = "/employee/payslips";
const EMPLOYEE_TASKS_PATH = "/employee/tasks";
const EMPLOYEE_SETTINGS_PATH = "/employee/settings";

function LoadingWorkspace() {
  return (
    <main className="min-h-screen bg-slate-50/60 lg:flex animate-pulse">
      {/* Sidebar Skeleton */}
      <aside className="hidden min-h-screen w-[280px] shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 lg:flex">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex h-12 items-center px-2 border-b border-slate-100 pb-3">
            <div className="h-8 w-36 bg-slate-200/80 rounded-md" />
          </div>

          {/* Nav Group 1 */}
          <div className="space-y-1.5">
            <div className="h-2.5 w-20 bg-slate-200/60 rounded px-2 mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 bg-slate-50 border border-slate-100/80"
              >
                <div className="size-4 rounded bg-slate-200/70 shrink-0" />
                <div className="h-3 w-3/4 rounded bg-slate-200/60" />
              </div>
            ))}
          </div>

          {/* Nav Group 2 */}
          <div className="space-y-1.5 pt-2">
            <div className="h-2.5 w-28 bg-slate-200/60 rounded px-2 mb-2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 bg-slate-50 border border-slate-100/80"
              >
                <div className="size-4 rounded bg-slate-200/70 shrink-0" />
                <div className="h-3 w-2/3 rounded bg-slate-200/60" />
              </div>
            ))}
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="flex items-center gap-3 border-t border-slate-100 p-2 pt-4">
          <div className="size-9 rounded-full bg-slate-200/80 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-slate-200/70" />
            <div className="h-2.5 w-16 rounded bg-slate-200/40" />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <section className="min-w-0 flex-1 flex flex-col">
        {/* Topbar Header */}
        <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-slate-100 lg:hidden" />
            <div className="h-4 w-36 rounded bg-slate-200/70" />
          </div>
          <div className="hidden h-9 w-96 max-w-md rounded-lg bg-slate-100/90 border border-slate-200/60 md:block" />
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-28 rounded-lg bg-slate-900/10 sm:block" />
            <div className="size-9 rounded-lg bg-slate-100" />
            <div className="size-9 rounded-full bg-slate-200/80" />
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 p-6 md:p-8 space-y-6 max-w-[1440px] w-full mx-auto">
          {/* Header Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
            <div className="space-y-2">
              <div className="h-3 w-32 bg-slate-200/60 rounded" />
              <div className="h-7 w-60 bg-slate-200/80 rounded-md" />
              <div className="h-3.5 w-80 bg-slate-200/50 rounded" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-32 bg-slate-200/70 rounded-lg" />
              <div className="h-9 w-24 bg-slate-200/50 rounded-lg" />
            </div>
          </div>

          {/* 4 KPI Metric Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="h-3.5 w-24 rounded bg-slate-200/60" />
                  <div className="size-8 rounded-lg bg-slate-100" />
                </div>
                <div className="h-7 w-28 rounded bg-slate-200/80" />
                <div className="h-3 w-20 rounded bg-slate-100" />
              </div>
            ))}
          </div>

          {/* 2-Column Analytics & Activity Feed */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.7fr)]">
            {/* Main Table / Overview Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="h-5 w-44 rounded bg-slate-200/70" />
                <div className="flex gap-2">
                  <div className="h-8 w-20 rounded-md bg-slate-100" />
                  <div className="h-8 w-20 rounded-md bg-slate-100" />
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-4 p-3 rounded-lg bg-slate-50/70 border border-slate-100"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="size-8 rounded-full bg-slate-200/70 shrink-0" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3.5 w-1/3 rounded bg-slate-200/70" />
                        <div className="h-2.5 w-1/4 rounded bg-slate-200/40" />
                      </div>
                    </div>
                    <div className="h-6 w-20 rounded-full bg-slate-200/60" />
                    <div className="h-4 w-16 rounded bg-slate-200/50 hidden sm:block" />
                  </div>
                ))}
              </div>
            </div>

            {/* Side Activity Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="h-5 w-36 rounded bg-slate-200/70 pb-3 border-b border-slate-100" />
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="size-2.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-4/5 rounded bg-slate-200/70" />
                      <div className="h-2.5 w-1/2 rounded bg-slate-200/40" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function SuperAdminRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  if (user?.role !== "SUPER_ADMIN") {
    return <Navigate to={DASHBOARD_PATH} replace />;
  }

  return <DashboardWorkspaceFrame>{children}</DashboardWorkspaceFrame>;
}

function AdminRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  // If Platform SuperAdmin is not impersonating a tenant, redirect them to the Platform SuperAdmin portal
  if (
    user?.role === "SUPER_ADMIN" &&
    !localStorage.getItem("active_organization_id") &&
    location.pathname === DASHBOARD_PATH
  ) {
    return <Navigate to={SUPERADMIN_PATH} replace />;
  }

  const inaccessibleFallback = buildInaccessibleRouteFallback(user, location.pathname);
  if (["/settings/mobile-app", "/settings/notifications"].includes(location.pathname) && !["ADMIN", "SUPER_ADMIN"].includes(user?.role ?? "")) return inaccessibleFallback;
  const moduleKey = moduleKeyForPath(location.pathname);
  const pageKey = pageKeyForPath(location.pathname);
  if (
    !["ADMIN", "SUPER_ADMIN", "HR", "SALES_MANAGER"].includes(user?.role ?? "") &&
    (!moduleKey || !canAccess(user, moduleKey))
  ) {
    return inaccessibleFallback;
  }
  if (
    (moduleKey && !canAccess(user, moduleKey)) ||
    (pageKey && !canAccess(user, pageKey))
  ) {
    return inaccessibleFallback;
  }
  return <DashboardWorkspaceFrame>{children}</DashboardWorkspaceFrame>;
}

function TelecallerRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }
  if (user?.role !== "TELECALLER") {
    return buildInaccessibleRouteFallback(user, location.pathname);
  }
  const moduleKey = moduleKeyForPath(location.pathname);
  const pageKey = pageKeyForPath(location.pathname);
  if (
    (moduleKey && !canAccess(user, moduleKey)) ||
    (pageKey && !canAccess(user, pageKey))
  ) {
    return buildInaccessibleRouteFallback(user, location.pathname);
  }
  return <DashboardWorkspaceFrame>{children}</DashboardWorkspaceFrame>;
}

function FieldExecutiveRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  useFieldExecutiveLiveTracking(
    isAuthenticated && user?.role === "SALES_AGENT",
  );
  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }
  if (user?.role !== "SALES_AGENT") {
    return buildInaccessibleRouteFallback(user, location.pathname);
  }
  const moduleKey = moduleKeyForPath(location.pathname);
  const pageKey = pageKeyForPath(location.pathname);
  if (
    (moduleKey && !canAccess(user, moduleKey)) ||
    (pageKey && !canAccess(user, pageKey))
  ) {
    return buildInaccessibleRouteFallback(user, location.pathname);
  }
  return <DashboardWorkspaceFrame>{children}</DashboardWorkspaceFrame>;
}

function EmployeeRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  if (!["SUPER_ADMIN", "ADMIN", "HR", "SALES_MANAGER", "TEAM_LEADER", "MANAGER", "TELECALLER", "SALES_AGENT", "BACKEND"].includes(user?.role ?? "")) {
    return buildInaccessibleRouteFallback(user, location.pathname);
  }
  const moduleKey = moduleKeyForPath(location.pathname);
  const pageKey = pageKeyForPath(location.pathname);
  if (
    (moduleKey && !canAccess(user, moduleKey)) ||
    (pageKey && !canAccess(user, pageKey))
  ) {
    return buildInaccessibleRouteFallback(user, location.pathname);
  }
  return <DashboardWorkspaceFrame>{children}</DashboardWorkspaceFrame>;
}

function PermissionRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }
  const moduleKey = moduleKeyForPath(location.pathname);
  const pageKey = pageKeyForPath(location.pathname);
  if (
    (moduleKey && !canAccess(user, moduleKey)) ||
    (pageKey && !canAccess(user, pageKey))
  ) {
    return buildInaccessibleRouteFallback(user, location.pathname);
  }
  return <DashboardWorkspaceFrame>{children}</DashboardWorkspaceFrame>;
}

function defaultDashboardPath(role?: string) {
  if (role === "SUPER_ADMIN") return SUPERADMIN_PATH;
  if (role === "SALES_AGENT") return FIELD_EXECUTIVE_DASHBOARD_PATH;
  if (role === "TEAM_LEADER" || role === "MANAGER") return ALL_LEADS_PATH;
  return role === "TELECALLER" ? TELECALLER_DASHBOARD_PATH : DASHBOARD_PATH;
}

function defaultAccessiblePath(user: AuthUser) {
  return getFirstAccessibleNavigationPath(user);
}

function buildInaccessibleRouteFallback(user: AuthUser, currentPathname: string) {
  const fallbackPath = defaultAccessiblePath(user);
  if (fallbackPath && fallbackPath.split("?")[0] !== currentPathname) {
    return <Navigate to={fallbackPath} replace />;
  }
  return (
    <DashboardWorkspaceFrame>
      <NoAccessibleWorkspace />
    </DashboardWorkspaceFrame>
  );
}

function NoAccessibleWorkspace() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
      <Card className="w-full max-w-lg rounded-md border border-slate-200 bg-white p-6 text-center shadow-none">
        <h1 className="text-xl font-extrabold text-secondary">
          No workspace access assigned
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
          Your account is active, but no accessible modules are enabled. Ask an
          admin to update your access from Access Control.
        </p>
      </Card>
    </main>
  );
}

function PublicOnlyRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const defaultDashboard =
    defaultAccessiblePath(user) ?? defaultDashboardPath(user?.role);
  let fromPath =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    typeof location.state.from === "object" &&
    location.state.from !== null &&
    "pathname" in location.state.from &&
    typeof location.state.from.pathname === "string"
      ? location.state.from.pathname
      : defaultDashboard;

  const requestedModuleKey = moduleKeyForPath(fromPath);
  const requestedPageKey = pageKeyForPath(fromPath);
  if (
    (requestedModuleKey && !canAccess(user, requestedModuleKey)) ||
    (requestedPageKey && !canAccess(user, requestedPageKey))
  ) {
    fromPath = defaultDashboard;
  }

  // If the user requested the generic dashboard but is a Pre Sales or field user, route them to their specific accessible entry.
  if (
    fromPath === DASHBOARD_PATH &&
    ["TELECALLER", "SALES_AGENT"].includes(user?.role ?? "")
  ) {
    fromPath = defaultDashboard;
  }

  if (isAuthenticated) {
    return <Navigate to={fromPath} replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const user = useAppSelector((state) => state.auth.user);
  const defaultDashboard =
    defaultAccessiblePath(user) ?? defaultDashboardPath(user?.role);
  return <Navigate to={defaultDashboard} replace />;
}

export default function App() {
  const location = useLocation();
  const isPublicLegalRoute =
    [PRIVACY_POLICY_PATH, TERMS_OF_USE_PATH, "/download-app"].includes(location.pathname) ||
    location.pathname.startsWith("/p/");
  const sessionQuery = useRefreshSession({ enabled: !isPublicLegalRoute });

  if (!isPublicLegalRoute && sessionQuery.isPending) {
    return <LoadingWorkspace />;
  }

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/download-app" element={<DownloadAppScreen />} />
      <Route path="/settings/mobile-app" element={<AdminRoute><MobileAppScreen /></AdminRoute>} />
      <Route path={PRIVACY_POLICY_PATH} element={<PrivacyPolicyPage />} />
      <Route path={TERMS_OF_USE_PATH} element={<TermsOfUsePage />} />
      <Route path="/p/:projectId" element={<PublicProjectGalleryScreen />} />
      <Route path="/p/:projectId/img" element={<PublicProjectGalleryScreen activeView="img" />} />
      <Route path="/p/:projectId/br" element={<PublicProjectGalleryScreen activeView="br" />} />
      <Route path="/p/:projectId/vd" element={<PublicProjectGalleryScreen activeView="vd" />} />
      <Route
        path={LOGIN_PATH}
        element={
          <PublicOnlyRoute>
            <LoginScreen />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={REGISTER_PATH}
        element={
          <PublicOnlyRoute>
            <RegisterOrganizationScreen />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={BILLING_PATH}
        element={
          <AdminRoute>
            <BillingOverviewScreen />
          </AdminRoute>
        }
      />
      <Route
        path={SUPERADMIN_PATH}
        element={
          <SuperAdminRoute>
            <SuperAdminDashboard />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/superadmin/tenants"
        element={
          <SuperAdminRoute>
            <AllTenantsScreen />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/superadmin/tenants/:tenantId"
        element={
          <SuperAdminRoute>
            <TenantOverviewScreen />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/superadmin/plans"
        element={
          <SuperAdminRoute>
            <PlansPricingScreen />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/superadmin/audit"
        element={
          <SuperAdminRoute>
            <PlatformAuditLogsScreen />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/superadmin/settings"
        element={
          <SuperAdminRoute>
            <PlatformSettingsScreen />
          </SuperAdminRoute>
        }
      />
      <Route
        path={LOGIN_OTP_PATH}
        element={<Navigate to={LOGIN_PATH} replace />}
      />
      <Route
        path={FORGOT_PASSWORD_PATH}
        element={
          <PublicOnlyRoute>
            <ForgotPasswordScreen />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={RESET_PASSWORD_PATH}
        element={
          <PublicOnlyRoute>
            <ResetPasswordScreen />
          </PublicOnlyRoute>
        }
      />
      <Route
        path={DASHBOARD_PATH}
        element={
          <AdminRoute>
            <DashboardScreen />
          </AdminRoute>
        }
      />
      <Route
        path={TELECALLER_DASHBOARD_PATH}
        element={
          <TelecallerRoute>
            <TelecallerDashboardScreen />
          </TelecallerRoute>
        }
      />
      <Route
        path={FIELD_EXECUTIVE_DASHBOARD_PATH}
        element={
          <FieldExecutiveRoute>
            <FieldExecutiveDashboardScreen />
          </FieldExecutiveRoute>
        }
      />
      <Route
        path={FIELD_EXECUTIVE_LEADS_PATH}
        element={
          <FieldExecutiveRoute>
            <AllLeadsScreen />
          </FieldExecutiveRoute>
        }
      />
      <Route
        path={FIELD_EXECUTIVE_LEAD_DETAILS_PATH}
        element={
          <FieldExecutiveRoute>
            <LeadDetailsScreen />
          </FieldExecutiveRoute>
        }
      />
      <Route
        path={FIELD_EXECUTIVE_SITE_VISITS_PATH}
        element={
          <FieldExecutiveRoute>
            <FieldExecutiveSiteVisitsScreen />
          </FieldExecutiveRoute>
        }
      />
      <Route
        path={FIELD_EXECUTIVE_SITE_VISIT_DETAILS_PATH}
        element={
          <FieldExecutiveRoute>
            <SiteVisitDetailsScreen />
          </FieldExecutiveRoute>
        }
      />
      <Route
        path={FIELD_EXECUTIVE_FOLLOW_UPS_PATH}
        element={
          <FieldExecutiveRoute>
            <FollowUpLeadsScreen />
          </FieldExecutiveRoute>
        }
      />
      {[
        ADMIN_EMPLOYEES_PATH,
        ADMIN_TEAMS_PATH,
        ADMIN_ATTENDANCE_PATH,
        ADMIN_LEAVES_PATH,
        ADMIN_HOLIDAYS_PATH,
        ADMIN_PAYROLL_PATH,
        ADMIN_PAYSLIPS_PATH,
      ].map((path) => (
        <Route key={path} path={path} element={<AdminRoute><HrWorkspaceScreen /></AdminRoute>} />
      ))}
      <Route
        path="/attendance"
        element={<Navigate to={ADMIN_ATTENDANCE_PATH} replace />}
      />
      <Route
        path={ADMIN_ACCESS_CONTROL_PATH}
        element={
          <AdminRoute>
            <AccessControlScreen />
          </AdminRoute>
        }
      />
      <Route
        path={ADMIN_SETTINGS_PATH}
        element={
          <AdminRoute>
            <WorkspaceSettingsPage />
          </AdminRoute>
        }
      />
      <Route
        path={ADMIN_WORKSPACE_SETTINGS_PATH}
        element={
          <AdminRoute>
            <WorkspaceSettingsPage />
          </AdminRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <AdminRoute>
            <WorkspaceSettingsPage />
          </AdminRoute>
        }
      />
      <Route
        path={ADMIN_TASKS_PATH}
        element={
          <AdminRoute>
            <EmployeeTasksScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/tasks"
        element={<Navigate to={ADMIN_TASKS_PATH} replace />}
      />
      <Route
        path={ADMIN_CALLING_PERFORMANCE_PATH}
        element={
          <PermissionRoute>
            <AdminCallingPerformanceScreen />
          </PermissionRoute>
        }
      />
      <Route
        path={ADMIN_LEAD_PERFORMANCE_PATH}
        element={
          <AdminRoute>
            <AdminLeadPerformanceScreen />
          </AdminRoute>
        }
      />
      <Route
        path={ADMIN_PERFORMANCE_PATH}
        element={
          <AdminRoute>
            <AdminPerformanceScreen />
          </AdminRoute>
        }
      />
      <Route
        path={ADMIN_EMPLOYEE_DETAILS_PATH}
        element={
          <AdminRoute>
            <HrEmployeeDetailsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={ADMIN_TEAM_DETAILS_PATH}
        element={
          <AdminRoute>
            <HrTeamDetailsScreen />
          </AdminRoute>
        }
      />
      {[
        EMPLOYEE_ATTENDANCE_PATH,
        EMPLOYEE_LEAVES_PATH,
        EMPLOYEE_HOLIDAYS_PATH,
        EMPLOYEE_PAYSLIPS_PATH,
        EMPLOYEE_SETTINGS_PATH,
      ].map((path) => (
        <Route key={path} path={path} element={<EmployeeRoute><HrWorkspaceScreen /></EmployeeRoute>} />
      ))}
      <Route
        path={EMPLOYEE_TASKS_PATH}
        element={
          <EmployeeRoute>
            <EmployeeTasksScreen />
          </EmployeeRoute>
        }
      />
      <Route
        path={EMPLOYEE_PROFILE_PATH}
        element={
          <EmployeeRoute>
            <HrEmployeeDetailsScreen />
          </EmployeeRoute>
        }
      />
      <Route
        path={MY_COMMISSIONS_PATH}
        element={
          <EmployeeRoute>
            <MyCommissionsScreen />
          </EmployeeRoute>
        }
      />

      <Route
        path={TELECALLER_MY_LEADS_PATH}
        element={
          <TelecallerRoute>
            <MyLeadsScreen />
          </TelecallerRoute>
        }
      />
      <Route
        path={TELECALLER_FOLLOW_UPS_PATH}
        element={
          <TelecallerRoute>
            <FollowUpLeadsScreen />
          </TelecallerRoute>
        }
      />
      <Route
        path={TELECALLER_WHATSAPP_LOGS_PATH}
        element={
          <TelecallerRoute>
            <TelecallerWhatsAppLogsScreen />
          </TelecallerRoute>
        }
      />
      <Route
        path={TELECALLER_LEAD_TRANSFER_REQUEST_PATH}
        element={
          <TelecallerRoute>
            <Navigate to={NOTIFICATIONS_PATH} replace />
          </TelecallerRoute>
        }
      />
      <Route
        path={NOTIFICATIONS_PATH}
        element={
          <EmployeeRoute>
            <NotificationsScreen />
          </EmployeeRoute>
        }
      />
      <Route
        path={TELECALLER_LEAD_DETAILS_PATH}
        element={
          <TelecallerRoute>
            <LeadDetailsScreen />
          </TelecallerRoute>
        }
      />
      <Route
        path={TELECALLER_MY_PERFORMANCE_PATH}
        element={
          <TelecallerRoute>
            <TelecallerMyPerformanceScreen />
          </TelecallerRoute>
        }
      />
      <Route
        path={TELECALLER_VISIT_HISTORY_PATH}
        element={
          <TelecallerRoute>
            <VisitHistoryScreen />
          </TelecallerRoute>
        }
      />
      <Route
        path={TELECALLER_CALL_HISTORY_PATH}
        element={
          <TelecallerRoute>
            <TelecallerCallHistoryScreen />
          </TelecallerRoute>
        }
      />
      <Route path={CALL_HISTORY_PATH} element={<PermissionRoute><CallHistoryScreen /></PermissionRoute>} />
      <Route
        path={AUTO_ASSIGNMENT_PATH}
        element={
          <AdminRoute>
            <AutoAssignmentMasterScreen />
          </AdminRoute>
        }
      />
      <Route
        path={ADD_LEAD_PATH}
        element={
          <AdminRoute>
            <Navigate
              to={ALL_LEADS_PATH}
              replace
              state={{ openAddLead: true }}
            />
          </AdminRoute>
        }
      />
      <Route
        path={COLD_LEADS_PATH}
        element={
          <AdminRoute>
            <Navigate to={`${ALL_LEADS_PATH}?bucket=cold`} replace />
          </AdminRoute>
        }
      />
      <Route
        path={BULK_UPLOAD_LEADS_PATH}
        element={
          <AdminRoute>
            <Navigate to={`${IMPORT_LEADS_PATH}?method=excel-csv`} replace />
          </AdminRoute>
        }
      />
      <Route
        path={EDIT_LEAD_PATH}
        element={
          <AdminRoute>
            <EditLeadScreen />
          </AdminRoute>
        }
      />
      <Route
        path={HOT_LEADS_PATH}
        element={
          <AdminRoute>
            <Navigate to={`${ALL_LEADS_PATH}?bucket=hot`} replace />
          </AdminRoute>
        }
      />
      <Route
        path={IMPORT_LEADS_PATH}
        element={
          <AdminRoute>
            <ImportLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={CONNECT_MAGICBRICKS_PATH}
        element={
          <AdminRoute>
            <ConnectMagicBricksScreen />
          </AdminRoute>
        }
      />
      <Route
        path={MAP_MAGICBRICKS_FIELDS_PATH}
        element={
          <AdminRoute>
            <MapMagicBricksFieldsScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/leads/import/connect/magicbricks/test-connection"
        element={<Navigate to={CONNECT_MAGICBRICKS_PATH} replace />}
      />
      <Route
        path={CONNECT_META_PATH}
        element={
          <AdminRoute>
            <ConnectMetaLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={CONNECT_WEBSITE_PATH}
        element={
          <AdminRoute>
            <ConnectWebsiteScreen />
          </AdminRoute>
        }
      />
      <Route
        path={CONNECT_99ACRES_PATH}
        element={
          <AdminRoute>
            <Connect99AcresScreen />
          </AdminRoute>
        }
      />
      <Route
        path={MAP_99ACRES_FIELDS_PATH}
        element={
          <AdminRoute>
            <Map99AcresFieldsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={TEST_99ACRES_CONNECTION_PATH}
        element={
          <AdminRoute>
            <Test99AcresConnectionScreen />
          </AdminRoute>
        }
      />
      <Route
        path={CONNECT_HOUSING_PATH}
        element={
          <AdminRoute>
            <ConnectHousingScreen />
          </AdminRoute>
        }
      />
      <Route
        path={MAP_HOUSING_FIELDS_PATH}
        element={
          <AdminRoute>
            <MapHousingFieldsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={TEST_HOUSING_CONNECTION_PATH}
        element={
          <AdminRoute>
            <TestHousingConnectionScreen />
          </AdminRoute>
        }
      />
      <Route
        path={IMPORT_SUMMARY_PATH}
        element={
          <AdminRoute>
            <ImportSummaryScreen />
          </AdminRoute>
        }
      />
      <Route
        path={ALL_LEADS_PATH}
        element={
          <AdminRoute>
            <AllLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={CONTACT_LEADS_PATH}
        element={
          <AdminRoute>
            <ContactLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={REASSIGN_LEADS_PATH}
        element={
          <AdminRoute>
            <Navigate to={ALL_LEADS_PATH} replace />
          </AdminRoute>
        }
      />
      <Route
        path={DUPLICATE_LEADS_PATH}
        element={
          <AdminRoute>
            <DuplicateLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={FOLLOW_UP_LEADS_PATH}
        element={
          <AdminRoute>
            <FollowUpLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/settings/email"
        element={
          <AdminRoute>
            <EmailSettingsScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/settings/notifications"
        element={
          <AdminRoute>
            <NotificationSettingsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={INACTIVE_LEADS_PATH}
        element={
          <AdminRoute>
            <InactiveLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LOST_LEADS_PATH}
        element={
          <AdminRoute>
            <Navigate to={INACTIVE_LEADS_PATH} replace />
          </AdminRoute>
        }
      />
      <Route
        path={DELETED_LEADS_PATH}
        element={
          <AdminRoute>
            <DeletedLeadsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_PIPELINE_PATH}
        element={
          <AdminRoute>
            <LeadPipelineScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/leads/conversion"
        element={
          <AdminRoute>
            <ConversionAnalyticsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_CONVERSION_ANALYTICS_PATH}
        element={
          <AdminRoute>
            <ConversionAnalyticsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={SLA_DASHBOARD_PATH}
        element={
          <AdminRoute>
            <Navigate to={FOLLOW_UP_LEADS_PATH} replace />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_RECOVERY_PATH}
        element={
          <AdminRoute>
            <Navigate to={ALL_LEADS_PATH} replace />
          </AdminRoute>
        }
      />
      <Route
        path="/leads/source-analytics"
        element={
          <AdminRoute>
            <LeadSourceAnalyticsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_SOURCE_ANALYTICS_PATH}
        element={
          <AdminRoute>
            <LeadSourceAnalyticsScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/leads/sources"
        element={
          <AdminRoute>
            <LeadMastersScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_MASTERS_PATH}
        element={
          <AdminRoute>
            <LeadMastersScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/leads/audit-log"
        element={
          <AdminRoute>
            <AuditLogScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_MASTERS_AUDIT_LOG_PATH}
        element={
          <AdminRoute>
            <AuditLogScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/leads/assignment/masters"
        element={
          <AdminRoute>
            <AutoAssignmentMasterScreen />
          </AdminRoute>
        }
      />
      <Route
        path={AUTO_ASSIGNMENT_PATH}
        element={
          <AdminRoute>
            <AutoAssignmentMasterScreen />
          </AdminRoute>
        }
      />
      <Route
        path={PROJECTS_PATH}
        element={
          <AdminRoute>
            <ProjectsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={PROJECT_MASTERS_PATH}
        element={
          <AdminRoute>
            <ProjectMastersScreen />
          </AdminRoute>
        }
      />
      <Route
        path={PROJECT_DETAILS_PATH}
        element={
          <AdminRoute>
            <ProjectDetailsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={UNIT_DETAILS_PATH}
        element={
          <AdminRoute>
            <UnitDetailsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={SITE_VISITS_PATH}
        element={
          <AdminRoute>
            <SiteVisitsScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/site-visits"
        element={
          <AdminRoute>
            <SiteVisitsScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/site-visits/tracking"
        element={
          <AdminRoute>
            <SiteVisitsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={SITE_VISIT_DETAILS_PATH}
        element={
          <AdminRoute>
            <SiteVisitDetailsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={BOOKINGS_PATH}
        element={
          <AdminRoute>
            <BookingsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={BOOKING_FINANCE_PATH}
        element={
          <AdminRoute>
            <BrokerageIncentiveReportScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/bookings/brokerage-report"
        element={
          <AdminRoute>
            <BrokerageIncentiveReportScreen />
          </AdminRoute>
        }
      />
      <Route
        path="/commissions"
        element={
          <AdminRoute>
            <BrokerageIncentiveReportScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_SITE_VISITS_PATH}
        element={
          <AdminRoute>
            <LeadSiteVisitsScreen />
          </AdminRoute>
        }
      />
      <Route
        path={EDIT_LEAD_PATH}
        element={
          <AdminRoute>
            <EditLeadScreen />
          </AdminRoute>
        }
      />
      <Route
        path={LEAD_DETAILS_PATH}
        element={
          <AdminRoute>
            <LeadDetailsScreen />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to={DASHBOARD_PATH} replace />} />
    </Routes>
  );
}
