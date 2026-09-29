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

  return (
    <div className="min-h-screen bg-background lg:flex">
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
      <div className="min-w-0 flex-1">
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
        {children ?? <Outlet />}
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
