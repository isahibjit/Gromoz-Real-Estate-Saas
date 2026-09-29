import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Shield,
  User,
  X,
} from "lucide-react";
import { Button, cn } from "ui";
import { getUserRoleLabel } from "../../../common/roleLabels";

import trurootLogo from "../../../assets/truroot-logo.png";
import type { SidebarItem, SidebarChildItem } from "./dashboardData";
import { useAppSelector } from "../../../store";
import { useDashboardLayoutContext } from "./DashboardLayoutContext";
import { filterSidebarItems } from "../../../common/access/access";
import {
  getActiveNavigation,
  getNavigationForUser,
} from "../../../common/navigation/navigationRegistry";
import { useLogoutMutation } from "../../../common/mutations/useAuthMutations";

const SIDEBAR_EXPANDED_STORAGE_KEY = "truroot.sidebar.expanded-items";

interface DashboardSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  activeItem?: string;
  activeChild?: string;
  activeItemId?: string;
  activeChildId?: string;
  items?: SidebarItem[];
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
  activeItem = "Dashboard",
  activeChild,
  activeItemId,
  activeChildId,
  items: customItems,
  footerContent,
  onCollapse,
  onMobileClose,
  managed = false,
}: DashboardSidebarProps) {
  const layout = useDashboardLayoutContext();
  const setLayoutSidebar = layout?.setSidebar;
  const user = useAppSelector((state) => state.auth.user);
  const location = useLocation();
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();

  const [isHovered, setIsHovered] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const activeOrgId = localStorage.getItem("active_organization_id") || "default";

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

  useLayoutEffect(() => {
    if (!setLayoutSidebar || managed) return undefined;
    const sidebarConfig = {
      activeItem,
      activeChild,
      sidebarItems: customItems,
      sidebarFooter: footerContent,
    };
    setLayoutSidebar(sidebarConfig);
    return () =>
      setLayoutSidebar((current) => (current === sidebarConfig ? {} : current));
  }, [
    activeChild,
    activeItem,
    customItems,
    footerContent,
    managed,
    setLayoutSidebar,
  ]);

  const derivedItems = getNavigationForUser(user);
  const items = customItems
    ? filterSidebarItems(customItems, user)
    : derivedItems;
  const routeActive = getActiveNavigation(location.pathname, items);
  const resolvedActiveItemId = activeItemId ?? routeActive.activeItemId;
  const resolvedActiveChildId = activeChildId ?? routeActive.activeChildId;
  const resolvedActiveItem = activeItem ?? routeActive.activeItem;
  const resolvedActiveChild = activeChild ?? routeActive.activeChild;

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set(resolvedActiveItemId ? [resolvedActiveItemId] : []);
    }
    try {
      const raw = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as string[]) : [];
      const next = new Set(stored);
      if (resolvedActiveItemId) next.add(resolvedActiveItemId);
      return next;
    } catch {
      return new Set(resolvedActiveItemId ? [resolvedActiveItemId] : []);
    }
  });

  useLayoutEffect(() => {
    if (!resolvedActiveItemId) return;
    setExpandedItems((current) => {
      if (current.has(resolvedActiveItemId)) return current;
      const next = new Set(current);
      next.add(resolvedActiveItemId);
      return next;
    });
  }, [resolvedActiveItemId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      SIDEBAR_EXPANDED_STORAGE_KEY,
      JSON.stringify(Array.from(expandedItems)),
    );
  }, [expandedItems]);

  if (layout && !managed) {
    return null;
  }

  const toggleExpandedItem = (item: SidebarItem) => {
    if (!item.children?.length && !item.expandable) {
      return;
    }

    const itemId = item.id ?? item.label;
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const showBigLogo = !collapsed || isHovered;
  const hasCustomLogo = Boolean(branding.logoUrl && branding.logoUrl.trim() !== "");
  const hasCollapsedLogo = Boolean(branding.collapsedLogoUrl && branding.collapsedLogoUrl.trim() !== "");
  const canRenderCustomLogoInSidebar = (hasCustomLogo || hasCollapsedLogo) && branding.showLogoInSidebar;

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
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-slate-200 bg-white text-slate-700 shadow-xs transition-all duration-300 ease-in-out overflow-x-hidden lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          showBigLogo ? "w-[295px]" : "w-[80px]",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Brand Header */}
        <div
          className={cn(
            "flex h-20 flex-none items-center border-b border-slate-100 transition-all duration-300",
            showBigLogo ? "justify-between px-4" : "justify-center px-2",
          )}
          style={{
            backgroundColor: branding.sidebarHeaderBg || "transparent",
          }}
        >
          {showBigLogo ? (
            <>
              <Link
                to={user?.role === "SUPER_ADMIN" ? "/superadmin" : "/admin/dashboard"}
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
                  <img
                    src={trurootLogo}
                    alt="Truroot CRM Logo"
                    style={{
                      width: "220px",
                      maxHeight: "58px",
                      objectFit: "contain",
                    }}
                  />
                )}
              </Link>
              <button
                type="button"
                onClick={onCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition duration-200 hidden lg:flex cursor-pointer"
                title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
              </button>
              <button
                type="button"
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
              onClick={onCollapse}
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
                <img
                  src={trurootLogo}
                  alt="Truroot Logo Icon"
                  className="h-9 w-9 object-contain"
                />
              )}
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav
          className={cn(
            "flex-1 min-h-0 space-y-1.5 overflow-y-auto overflow-x-hidden px-2.5 py-4",
            showBigLogo
              ? "scrollbar-thin scrollbar-thumb-slate-200"
              : "scrollbar-none",
          )}
        >
          {items.map((item) => {
            const Icon = item.icon;
            const itemId = item.id ?? item.label;
            const active =
              itemId === resolvedActiveItemId ||
              item.label === resolvedActiveItem;
            const expanded =
              expandedItems.has(itemId) && item.children && showBigLogo;

            const hasChildren = Boolean(item.children && item.children.length > 0);

            if (hasChildren && item.children) {
              return (
                <div key={itemId} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => toggleExpandedItem(item)}
                    title={!showBigLogo ? item.label : undefined}
                    className={cn(
                      "group relative flex w-full items-center rounded-sm py-2 text-[13px] font-medium transition-all duration-150 cursor-pointer",
                      showBigLogo
                        ? "px-3 gap-3 justify-start"
                        : "w-11 mx-auto justify-center px-0",
                      active
                        ? "bg-[#0D1F3D] text-white shadow-xs font-semibold"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0 transition-colors",
                        active
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-700",
                      )}
                    />

                    {showBigLogo && (
                      <div className="flex flex-1 items-center justify-between min-w-0 gap-2">
                        <span className="truncate min-w-0 font-medium">{item.label}</span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                            expanded && "rotate-90 text-slate-600",
                            active && "text-white",
                          )}
                        />
                      </div>
                    )}

                    {/* Tooltip on Collapsed Hover */}
                    {!showBigLogo && (
                      <div className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-sm bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1.5">
                        <span>{item.label}</span>
                      </div>
                    )}
                  </button>

                  {expanded && (
                    <div className="ml-7 space-y-1 border-l border-slate-200 pl-3 py-1">
                      {item.children.map((child: SidebarChildItem) => {
                        const childId = child.id ?? child.label;
                        const childActive =
                          childId === resolvedActiveChildId ||
                          child.label === resolvedActiveChild;

                        return (
                          <NavLink
                            key={childId}
                            to={child.to}
                            onClick={onMobileClose}
                            className={cn(
                              "flex items-center justify-between rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                              childActive
                                ? "bg-[#0D1F3D] text-white font-semibold shadow-xs"
                                : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900",
                            )}
                          >
                            <span className="truncate">{child.label}</span>
                            {child.badge && (
                              <span
                                className={cn(
                                  "ml-auto shrink-0 rounded-sm px-1.5 py-0.2 text-[10px] font-extrabold",
                                  childActive
                                    ? "bg-[#E20613] text-white"
                                    : "bg-red-50 text-[#E20613] border border-red-200/60",
                                )}
                              >
                                {child.badge}
                              </span>
                            )}
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={itemId}
                to={item.to || "#"}
                onClick={onMobileClose}
                title={!showBigLogo ? item.label : undefined}
                className={cn(
                  "group relative flex items-center rounded-sm py-2 text-[13px] font-medium transition-all duration-150",
                  showBigLogo
                    ? "px-3 gap-3 justify-start"
                    : "w-11 mx-auto justify-center px-0",
                  active
                    ? "bg-[#0D1F3D] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
                )}
              >
                <Icon
                  className={cn(
                    "h-4.5 w-4.5 shrink-0 transition-colors",
                    active
                      ? "text-white"
                      : "text-slate-400 group-hover:text-slate-700",
                  )}
                />

                {showBigLogo && (
                  <div className="flex flex-1 items-center justify-between min-w-0 gap-2">
                    <span className="truncate min-w-0 font-medium">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          "shrink-0 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[10px] font-extrabold transition-colors",
                          active
                            ? "bg-[#E20613] text-white border border-[#E20613]"
                            : "bg-red-50 text-[#E20613] border border-red-200/60",
                        )}
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
                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#0D1F3D] text-xs font-semibold text-white shadow-xs">
                      {user.fullName?.charAt(0) ??
                        user.email.charAt(0).toUpperCase()}
                      <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-[#E20613] ring-2 ring-white" />
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
                    <p className="text-xs font-bold text-[#0D1F3D] truncate">
                      {user.fullName || user.email}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <NavLink
                    to="/employee/me"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onMobileClose();
                    }}
                    className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#0D1F3D] transition-colors"
                  >
                    <User className="h-4 w-4 text-[#E20613]" /> My Profile
                  </NavLink>
                  <NavLink
                    to="/employee/settings"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onMobileClose();
                    }}
                    className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#0D1F3D] transition-colors"
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
      </aside>
    </>
  );
}

export const DashboardSidebar = memo(DashboardSidebarComponent);
