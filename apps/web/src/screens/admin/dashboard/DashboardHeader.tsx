import React, { useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Home,
  LogOut,
  Plus,
  Shield,
  User,
} from "lucide-react";
import {
  Button,
  cn,
} from "ui";

import { useAppSelector } from "../../../store";
import { useLogoutMutation } from "../../../common/mutations/useAuthMutations";
import { MobileMenuButton } from "./DashboardSidebar";
import { useDashboardLayoutContext } from "./DashboardLayoutContext";
import { api } from "../../../common/api";
import { HeaderSearchBar } from "../../../components/navigation/HeaderSearchBar";
import { HeaderNotificationBell } from "../../../components/notifications/HeaderNotificationBell";
import { getUserRoleLabel } from "../../../common/roleLabels";
import { buildBreadcrumbsFromNavigation } from "../../../common/navigation/navigationRegistry";

interface DashboardHeaderProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  onMobileMenuOpen: () => void;
  onDesktopSidebarToggle: () => void;
  breadcrumbs?: React.ReactNode;
  children?: React.ReactNode;
  managed?: boolean;
}

export function DashboardHeader({
  search,
  onSearchChange,
  onMobileMenuOpen,
  onDesktopSidebarToggle,
  breadcrumbs,
  children,
  managed = false,
}: DashboardHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const layout = useDashboardLayoutContext();
  const setLayoutHeader = layout?.setHeader;
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  const user = useAppSelector((state) => state.auth.user);
  const logoutMutation = useLogoutMutation();

  const meQuery = useQuery({
    queryKey: ["dashboard-header", "me", user?.id],
    queryFn: async () =>
      (await api.get("/employees/me")).data as {
        image?: string | null;
        fullName?: string | null;
      },
    enabled: Boolean(user?.id),
    retry: false,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // Close header dropdown on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (!setLayoutHeader || managed) return undefined;
    const headerConfig = {
      search,
      onSearchChange,
      breadcrumbs,
      headerContent: children,
    };
    setLayoutHeader(headerConfig);
    return () =>
      setLayoutHeader((current) => (current === headerConfig ? {} : current));
  }, [breadcrumbs, children, managed, onSearchChange, search, setLayoutHeader]);

  if (layout && !managed) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const profileImage = meQuery.data?.image ?? user?.image ?? undefined;
  const profileName = meQuery.data?.fullName ?? user?.fullName ?? "Admin User";
  const userRoleText = getUserRoleLabel(user?.role);
  const breadcrumbList = buildBreadcrumbsFromNavigation(location.pathname);

  const isPlatformSuperAdminView =
    user?.role === "SUPER_ADMIN" &&
    !localStorage.getItem("active_organization_id");

  return (
    <header className="flex h-20 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm gap-4 sticky top-0 z-30">
      {/* Left Group: Breadcrumbs & Header Search Bar */}
      <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0 mr-4">
        <div className="lg:hidden">
          <MobileMenuButton onClick={onMobileMenuOpen} />
        </div>

        {/* Left Header Breadcrumb Navigation */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 flex-shrink-0">
          <NavLink
            to={isPlatformSuperAdminView ? "/superadmin" : "/admin/dashboard"}
            className="flex items-center text-slate-400 hover:text-[#0D1F3D] transition-colors"
            title="Home"
          >
            <Home className="h-4 w-4" />
          </NavLink>

          {breadcrumbList.map((crumb, idx) => {
            const isLast = idx === breadcrumbList.length - 1;
            return (
              <React.Fragment key={crumb + idx}>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                {isLast ? (
                  <span className="font-extrabold text-[#0D1F3D] bg-slate-100 px-2.5 py-1 rounded-sm border border-slate-200/60 shadow-xs">
                    {crumb}
                  </span>
                ) : (
                  <span className="font-semibold text-slate-600">
                    {crumb}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Subtle Vertical Divider */}
        <div className="h-5 w-[1px] bg-slate-200 flex-shrink-0 hidden md:block" />

        {/* Search Bar on the Left */}
        <div className="flex-1 max-w-[480px] lg:max-w-[540px] min-w-[240px]">
          <HeaderSearchBar />
        </div>
      </div>

      {/* Right Group: Add Lead Button (only for tenant CRM), Notifications & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {!isPlatformSuperAdminView && (
          <Button
            asChild
            className="hidden h-9 px-3.5 text-xs font-bold sm:inline-flex bg-[#0D1F3D] hover:bg-[#0D1F3D]/90 text-white rounded-sm shadow-xs"
          >
            <Link to="/leads/all" state={{ openAddLead: true }}>
              <Plus className="size-3.5 mr-1" />
              Add Lead
            </Link>
          </Button>
        )}

        <HeaderNotificationBell />

        {/* User Profile Avatar Card in Header */}
        {user && (
          <div className="relative" ref={headerRef}>
            <div
              onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
              className="flex items-center gap-2.5 p-1 rounded-sm cursor-pointer hover:bg-slate-100/80 transition-all"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="User Avatar"
                  className="h-9 w-9 rounded-sm object-cover shadow-xs border border-slate-200"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-[#0D1F3D] text-xs font-bold text-white shadow-sm">
                  {profileName.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-[#0D1F3D] max-w-[140px] truncate">
                  {profileName}
                </p>
                <p className="text-[11px] font-semibold text-[#E20613] max-w-[140px] truncate">
                  {userRoleText}
                </p>
              </div>

              <ChevronDown className="hidden size-3.5 text-slate-400 md:block" />
            </div>

            {/* Header User Dropdown Card */}
            {headerMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-sm border border-slate-200 bg-white p-2 shadow-2xl space-y-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-[#0D1F3D] truncate">
                    {profileName}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
                <NavLink
                  to="/employee/me"
                  onClick={() => setHeaderMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#0D1F3D]"
                >
                  <User className="h-4 w-4 text-[#E20613]" /> My Profile
                </NavLink>
                <NavLink
                  to="/employee/settings"
                  onClick={() => setHeaderMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#0D1F3D]"
                >
                  <Shield className="h-4 w-4 text-blue-600" /> Security & 2FA
                </NavLink>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={handleLogout}
                  className="flex items-center justify-start gap-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs mt-1 rounded-sm border-t border-slate-100 pt-2"
                >
                  <LogOut className="h-4 w-4 text-rose-600" /> Sign Out
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
