import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import {
  DashboardLayoutProvider,
  useDashboardLayoutContext,
} from "./DashboardLayoutContext";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardSidebar } from "./DashboardSidebar";
import { TodayFollowUpsFab } from "../leads/follow-up/TodayFollowUpsFab";
import { useAppSelector } from "../../../store";
import {
  buildBreadcrumbsFromNavigation,
  getActiveNavigation,
  getNavigationForUser,
} from "../../../common/navigation/navigationRegistry";

function DashboardWorkspaceLayoutContent({ children }: { children?: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const layout = useDashboardLayoutContext();
  const location = useLocation();
  const user = useAppSelector((state) => state.auth.user);
  const header = layout?.header ?? {};
  const sidebar = layout?.sidebar ?? {};
  const sidebarItems = getNavigationForUser(user);
  const activeNavigation = getActiveNavigation(location.pathname, sidebarItems);
  const derivedBreadcrumbs = buildBreadcrumbsFromNavigation(location.pathname);

  const isSuperAdminImpersonating =
    user?.role === "SUPER_ADMIN" && Boolean(localStorage.getItem("active_organization_id"));

  const handleExitImpersonation = () => {
    localStorage.removeItem("active_organization_id");
    window.location.href = "/superadmin";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans w-full">
      <DashboardSidebar
        managed
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        activeItem={activeNavigation.activeItem ?? sidebar.activeItem}
        activeChild={activeNavigation.activeChild ?? sidebar.activeChild}
        activeItemId={activeNavigation.activeItemId}
        activeChildId={activeNavigation.activeChildId}
        items={sidebarItems}
        footerContent={sidebar.sidebarFooter}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 min-w-0 w-full ${
          collapsed ? "lg:pl-[80px]" : "lg:pl-[295px]"
        }`}
      >
        {isSuperAdminImpersonating && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm flex-shrink-0 z-40">
            <div className="flex items-center gap-2">
              <span className="bg-amber-800 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                SuperAdmin Mode
              </span>
              <span>
                You are inspecting a tenant workspace. Changes will directly modify this customer's live records.
              </span>
            </div>
            <button
              type="button"
              onClick={handleExitImpersonation}
              className="bg-white text-amber-900 px-3 py-1 rounded text-xs font-semibold hover:bg-amber-50 transition cursor-pointer shadow-sm"
            >
              Exit to Platform Portal
            </button>
          </div>
        )}
        <DashboardHeader
          managed
          search={header.search}
          onSearchChange={header.onSearchChange}
          breadcrumbs={
            header.breadcrumbs ??
            (derivedBreadcrumbs.length ? (
              <span>{derivedBreadcrumbs.join(" / ")}</span>
            ) : undefined)
          }
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
        >
          {header.headerContent}
        </DashboardHeader>
        <main className="flex-1 overflow-y-auto bg-[#F3F5F7] w-full">
          <div className="w-full p-6 lg:p-8 space-y-6 font-sans">
            {children ?? <Outlet />}
          </div>
        </main>
        <TodayFollowUpsFab />
      </div>
    </div>
  );
}

export function DashboardWorkspaceLayout() {
  return (
    <DashboardLayoutProvider>
      <DashboardWorkspaceLayoutContent />
    </DashboardLayoutProvider>
  );
}

export function DashboardWorkspaceFrame({ children }: { children: ReactNode }) {
  return (
    <DashboardLayoutProvider>
      <DashboardWorkspaceLayoutContent>{children}</DashboardWorkspaceLayoutContent>
    </DashboardLayoutProvider>
  );
}
