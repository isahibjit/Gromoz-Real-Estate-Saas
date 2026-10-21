import { useWorkspaceAdministration } from '../../../common/queries/useWorkspaceAdministration';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  ShieldAlert,
  Smartphone,
  User,
  X,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Button, cn } from "ui";
import { BrandLogo } from "../../../components/ui/BrandLogo";
import { useLogoutMutation } from "../../../common/mutations/useAuthMutations";
import { getUserRoleLabel } from "../../../common/roleLabels";
import { recordRecentSearch } from "../../../components/navigation/HeaderSearchBar";
import { useAppSelector } from "../../../store";
import { useDashboardLayoutContext } from "./DashboardLayoutContext";
import { isPlatformView } from "../../../common/tenantRequestScope";
import { buildSidebarCategories, type NavCategory } from "./sidebarNavigation";

const superAdminNavCategories: NavCategory[] = [
  {
    title: "Platform Administration",
    items: [
      {
        label: "SuperAdmin Dashboard",
        icon: LayoutDashboard,
        to: "/superadmin",
      },
      {
        label: "Tenant Organizations",
        icon: Building2,
        to: "/superadmin/tenants",
        badge: "Tenants",
      },
      {
        label: "Pricing & Plans",
        icon: CreditCard,
        to: "/superadmin/plans",
        badge: "Commercial",
      },
      {
        label: "Platform Audit Logs",
        icon: ShieldAlert,
        to: "/superadmin/audit",
      },
      {
        label: "Platform Settings",
        icon: Settings,
        to: "/superadmin/settings",
      },
      {
        label: "Mobile app releases",
        icon: Smartphone,
        to: "/superadmin/mobile-app",
      },
    ],
  },
];

interface DashboardSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  activeItem?: string;
  activeChild?: string;
  activeItemId?: string;
  activeChildId?: string;
  items?: any[];
  footerContent?: ReactNode;
  onCollapse: () => void;
  onMobileClose: () => void;
  managed?: boolean;
}

export const MobileMenuButton = ({ onClick }: { onClick: () => void }) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    aria-label="Open navigation"
    className="mr-2 text-slate-700 hover:bg-slate-100 lg:hidden"
    onClick={onClick}
  >
    <Menu className="size-5" />
  </Button>
);

function DashboardSidebarComponent({
  collapsed,
  mobileOpen,
  items,
  activeItem,
  activeChild,
  footerContent,
  onCollapse,
  onMobileClose,
  managed = false,
}: DashboardSidebarProps) {
  const layout = useDashboardLayoutContext();
  const setLayoutSidebar = layout?.setSidebar;

  useLayoutEffect(() => {
    if (!setLayoutSidebar || managed) return undefined;
    const sidebarConfig = {
      activeItem,
      activeChild,
      sidebarItems: items,
      sidebarFooter: footerContent,
    };
    setLayoutSidebar(sidebarConfig);
    return () =>
      setLayoutSidebar((current) => (current === sidebarConfig ? {} : current));
  }, [activeChild, activeItem, footerContent, items, managed, setLayoutSidebar]);

  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const logoutMutation = useLogoutMutation();
  const workspaceAdministration = useWorkspaceAdministration();

  const [isHovered, setIsHovered] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isSuperAdminOnly = isPlatformView(user?.role, location.pathname);
  const activeOrgId = isSuperAdminOnly ? "default" : localStorage.getItem("active_organization_id") || "default";

  // Dynamic Workspace Branding
  const [branding, setBranding] = useState<{
    logoUrl?: string;
    collapsedLogoUrl?: string;
    showLogoInSidebar: boolean;
    sidebarLogoHeight: number;
    sidebarLogoObjectFit: "contain" | "cover";
    sidebarLogoBg: string;
    sidebarLogoRadius: number;
    sidebarLogoAlign?: "left" | "center" | "right";
    sidebarHeaderBg?: string;
  }>({
    logoUrl: "",
    collapsedLogoUrl: "",
    showLogoInSidebar: true,
    sidebarLogoHeight: 42,
    sidebarLogoObjectFit: "contain",
    sidebarLogoBg: "transparent",
    sidebarLogoRadius: 6,
    sidebarLogoAlign: "left",
    sidebarHeaderBg: "transparent",
  });

  const loadBranding = useCallback(() => {
    try {
      const key = `visiblo_workspace_branding_${activeOrgId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setBranding({
          logoUrl: parsed.logoUrl || "",
          collapsedLogoUrl: parsed.collapsedLogoUrl || "",
          showLogoInSidebar: parsed.showLogoInSidebar ?? true,
          sidebarLogoHeight: parsed.sidebarLogoHeight ?? 42,
          sidebarLogoObjectFit: parsed.sidebarLogoObjectFit ?? "contain",
          sidebarLogoBg: parsed.sidebarLogoBg ?? "transparent",
          sidebarLogoRadius: parsed.sidebarLogoRadius ?? 6,
          sidebarLogoAlign: parsed.sidebarLogoAlign ?? "left",
          sidebarHeaderBg: parsed.sidebarHeaderBg ?? "transparent",
        });
        return;
      }
    } catch {
      /* ignore */
    }
    setBranding({
      logoUrl: "",
      collapsedLogoUrl: "",
      showLogoInSidebar: true,
      sidebarLogoHeight: 42,
      sidebarLogoObjectFit: "contain",
      sidebarLogoBg: "transparent",
      sidebarLogoRadius: 6,
      sidebarLogoAlign: "left",
      sidebarHeaderBg: "transparent",
    });
  }, [activeOrgId]);

  useEffect(() => {
    loadBranding();
    window.addEventListener("workspace_branding_updated", loadBranding);
    return () => window.removeEventListener("workspace_branding_updated", loadBranding);
  }, [loadBranding]);

  // Click outside to close user menu popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (layout && !managed) {
    return null;
  }

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const categories = isSuperAdminOnly
    ? superAdminNavCategories
    : buildSidebarCategories(user, location.pathname, workspaceAdministration.canManage);

  const showBigLogo = mobileOpen || !collapsed || isHovered;
  const hasCustomLogo = Boolean(branding.logoUrl && branding.logoUrl.trim() !== "");
  const hasCollapsedLogo = Boolean(branding.collapsedLogoUrl && branding.collapsedLogoUrl.trim() !== "");
  const canRenderCustomLogoInSidebar = (hasCustomLogo || hasCollapsedLogo) && branding.showLogoInSidebar;

  const isItemActive = (to: string) => {
    const currentPath = location.pathname;
    const [itemPath, itemQuery] = to.split("?");
    const allItems = categories.flatMap((category) => category.items);

    // Query-specific matches like /admin/settings?tab=login-cms
    if (itemQuery) {
      return currentPath === itemPath && location.search.includes(itemQuery);
    }

    // Exact path match
    if (currentPath === itemPath) {
      const hasQuerySpecificExactMatch = allItems.some((item) => {
        const [otherPath, otherQuery] = item.to.split("?");
        return (
          otherPath === itemPath &&
          Boolean(otherQuery) &&
          location.search.includes(otherQuery)
        );
      });
      if (hasQuerySpecificExactMatch) {
        return false;
      }
      return true;
    }

    // If another sidebar item has an exact match for the current path, don't highlight the prefix parent
    // E.g. When on /projects/masters, don't highlight /projects
    const hasMoreSpecificExactMatch = allItems.some((item) => {
      const [otherPath] = item.to.split("?");
      return otherPath !== itemPath && currentPath === otherPath;
    });

    if (hasMoreSpecificExactMatch) {
      return false;
    }

    // Sub-route hierarchy check (e.g. /projects/proj-123 under /projects)
    if (to === "/admin/dashboard" || to === "/superadmin") {
      return false;
    }
    return currentPath.startsWith(itemPath + "/");
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Refined Enterprise White Theme Sidebar */}
      <aside
        aria-label="Main navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar text-sidebar-foreground shadow-xs transition-all duration-300 ease-in-out overflow-x-hidden ${
          showBigLogo ? "w-[295px] shadow-xl" : "w-[80px]"
        } ${
          mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full lg:visible lg:translate-x-0"
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand Header */}
        <div
          className={`flex h-20 flex-none items-center border-b border-slate-100 transition-all duration-300 ${
            showBigLogo ? "justify-between px-4" : "justify-center px-2"
          }`}
          style={{
            backgroundColor: branding.sidebarHeaderBg || "transparent",
          }}
        >
          {showBigLogo ? (
            <>
              <Link
                to={isSuperAdminOnly ? "/superadmin" : "/admin/dashboard"}
                className={cn(
                  "flex items-center w-full max-w-[220px]",
                  branding.sidebarLogoAlign === "center"
                    ? "justify-center"
                    : branding.sidebarLogoAlign === "right"
                    ? "justify-end"
                    : "justify-start",
                )}
                onClick={onMobileClose}
              >
                {canRenderCustomLogoInSidebar && branding.logoUrl ? (
                  <div
                    className={cn(
                      "flex items-center w-full transition-all duration-200",
                      branding.sidebarLogoAlign === "center"
                        ? "justify-center"
                        : branding.sidebarLogoAlign === "right"
                        ? "justify-end"
                        : "justify-start",
                    )}
                    style={{
                      backgroundColor: branding.sidebarLogoBg,
                      borderRadius: `${branding.sidebarLogoRadius}px`,
                      padding:
                        branding.sidebarLogoBg !== "transparent" ? "4px 8px" : "0px",
                    }}
                  >
                    <img
                      src={branding.logoUrl}
                      alt="Company Logo"
                      style={{
                        height: `${branding.sidebarLogoHeight}px`,
                        maxHeight: "56px",
                        maxWidth: "210px",
                        objectFit: branding.sidebarLogoObjectFit,
                      }}
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <BrandLogo className="h-auto w-56" />
                )}
              </Link>
              <button
                type="button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={(e) => {
                  e.stopPropagation();
                  onCollapse();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition duration-200 hidden lg:flex cursor-pointer"
                title={collapsed ? "Expand permanently" : "Collapse Sidebar"}
              >
                <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
              </button>
              <button
                type="button"
                aria-label="Close sidebar"
                onClick={onMobileClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition duration-200 lg:hidden cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              aria-label="Expand sidebar"
              onClick={(e) => {
                e.stopPropagation();
                onCollapse();
              }}
              className="flex items-center justify-center p-1 rounded-lg hover:bg-slate-100 transition duration-200 cursor-pointer"
              title="Expand Sidebar"
            >
              {canRenderCustomLogoInSidebar ? (
                <div
                  className="flex items-center justify-center transition-all duration-200"
                  style={{
                    backgroundColor: branding.sidebarLogoBg,
                    borderRadius: `${branding.sidebarLogoRadius}px`,
                    padding:
                      branding.sidebarLogoBg !== "transparent" ? "2px 4px" : "0px",
                  }}
                >
                  <img
                    src={branding.collapsedLogoUrl || branding.logoUrl}
                    alt="Company Logo"
                    style={{
                      height: branding.collapsedLogoUrl
                        ? "38px"
                        : `${Math.min(branding.sidebarLogoHeight, 40)}px`,
                      maxHeight: "44px",
                      maxWidth: "48px",
                      objectFit: branding.collapsedLogoUrl
                        ? "contain"
                        : branding.sidebarLogoObjectFit,
                    }}
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              ) : (
                <BrandLogo variant="mark" className="h-11 w-10" />
              )}
            </button>
          )}
        </div>

        {/* Navigation Items Categorized */}
        <nav
          className={cn(
            "flex-1 min-h-0 space-y-3 overflow-y-auto overflow-x-hidden px-2.5 py-4",
            showBigLogo
              ? "scrollbar-thin scrollbar-thumb-slate-200"
              : "scrollbar-none",
          )}
        >
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-0.5">
              {showBigLogo && (
                <p className="px-3 text-[11px] font-medium text-sidebar-muted pt-2 pb-1">
                  {cat.title}
                </p>
              )}
              {cat.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      onMobileClose();
                      recordRecentSearch({
                        label: item.label,
                        category: cat.title,
                        to: item.to,
                        badge: item.badge,
                      });
                    }}
                    title={!showBigLogo ? item.label : undefined}
                    className={`group relative flex items-center rounded-sm py-2 text-[13px] font-medium transition-all duration-150 ${
                      showBigLogo
                        ? "px-3 gap-3 justify-start"
                        : "w-11 mx-auto justify-center px-0"
                    } ${
                      active
                        ? "bg-primary text-white shadow-xs font-semibold" /* Active State */
                        : "text-sidebar-muted hover:bg-surface-subtle hover:text-secondary" /* Default & Hover State */
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? "text-white"
                          : "text-sidebar-muted group-hover:text-secondary"
                      }`}
                    />

                    {showBigLogo && (
                      <div className="flex flex-1 items-center justify-between min-w-0 gap-2">
                        <span className="truncate min-w-0">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`shrink-0 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[10px] font-extrabold transition-colors ${
                              active
                                ? "bg-white text-primary border border-white/70"
                                : "bg-surface-subtle text-primary border border-primary/15"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tooltip on Collapsed Hover */}
                    {!showBigLogo && (
                      <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-sm bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1.5">
                        <span>{item.label}</span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Footer Profile Card in Sidebar */}
        <div
          className="border-t border-slate-100 p-2.5 relative z-20 shrink-0"
          ref={sidebarRef}
        >
          {user && (
            <div className="relative">
              <div
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  "flex items-center rounded-sm p-2 transition-all cursor-pointer",
                  showBigLogo ? "justify-between" : "justify-center",
                  userMenuOpen
                    ? "bg-slate-100 ring-1 ring-slate-200"
                    : "hover:bg-slate-50",
                )}
              >
                <div
                  className={cn(
                    "flex items-center gap-2.5",
                    showBigLogo ? "overflow-hidden" : "justify-center",
                  )}
                >
                  {user.image ? (
                    <img
                      src={user.image}
                      alt="User Avatar"
                      className="h-8 w-8 rounded-sm object-cover shrink-0 shadow-xs border border-slate-200"
                    />
                  ) : (
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-xs font-semibold text-white shadow-xs">
                      {user.fullName?.charAt(0) ??
                        user.email.charAt(0).toUpperCase()}
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-tertiary ring-2 ring-white" />
                    </div>
                  )}

                  {showBigLogo && (
                    <div className="flex flex-col truncate">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {user.fullName ?? user.email}
                      </p>
                      <p className="text-[11px] font-medium text-slate-500 truncate">
                        {getUserRoleLabel(user.role)}
                      </p>
                    </div>
                  )}
                </div>

                {showBigLogo && (
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 text-slate-400 transition-transform",
                      userMenuOpen && "-rotate-90 text-slate-600",
                    )}
                  />
                )}
              </div>

              {/* User Quick Actions Dropdown Card popping upwards */}
              {userMenuOpen && (
                <div
                  className={cn(
                    "absolute bottom-full mb-2 rounded-sm border border-slate-200 bg-white p-2 shadow-2xl space-y-1 z-[100] animate-dropdown",
                    showBigLogo ? "left-0 right-0 w-full" : "left-0 w-56",
                  )}
                >
                  <div className="px-3 py-2 border-b border-slate-100 mb-1">
                    <p className="text-xs font-bold text-primary truncate">
                      {user.fullName || user.email}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <NavLink
                    to={user.role === "SUPER_ADMIN" ? "/superadmin/account" : "/employee/me"}
                    onClick={() => {
                      setUserMenuOpen(false);
                      onMobileClose();
                    }}
                    className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors"
                  >
                    <User className="h-4 w-4 text-tertiary" /> My Profile
                  </NavLink>
                  <NavLink
                    to={user.role === "SUPER_ADMIN" ? "/superadmin/account#security" : "/employee/settings"}
                    onClick={() => {
                      setUserMenuOpen(false);
                      onMobileClose();
                    }}
                    className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-primary transition-colors w-full"
                  >
                    <Shield className="h-4 w-4 text-blue-600" /> Security & 2FA
                  </NavLink>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="flex w-full items-center justify-start gap-2.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold text-xs mt-1 rounded-sm border-t border-slate-100 pt-2"
                  >
                    <LogOut className="h-4 w-4 text-rose-600" /> Sign Out
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export const DashboardSidebar = memo(DashboardSidebarComponent);
