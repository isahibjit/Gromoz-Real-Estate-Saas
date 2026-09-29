import {
  memo,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import { Button, cn } from "ui";

import trurootLogo from "../../../assets/truroot-logo.png";
import type { SidebarItem } from "./dashboardData";
import { useAppSelector } from "../../../store";
import { useDashboardLayoutContext } from "./DashboardLayoutContext";
import {
  filterSidebarItems,
} from "../../../common/access/access";
import {
  getActiveNavigation,
  getNavigationForUser,
} from "../../../common/navigation/navigationRegistry";

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
      setLayoutSidebar((current) =>
        current === sidebarConfig ? {} : current,
      );
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
      return new Set(
        resolvedActiveItemId ? [resolvedActiveItemId] : [],
      );
    }
    try {
      const raw = window.localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY);
      const stored = raw ? (JSON.parse(raw) as string[]) : [];
      const next = new Set(stored);
      if (resolvedActiveItemId) next.add(resolvedActiveItemId);
      return next;
    } catch {
      return new Set(
        resolvedActiveItemId ? [resolvedActiveItemId] : [],
      );
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

  return (
    <>
      {mobileOpen ? (
        <Button
          type="button"
          variant="ghost"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-40 h-auto w-auto rounded-none bg-secondary/45 hover:bg-secondary/45 lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        aria-label="Main navigation"
        className={cn(
          "crm-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "lg:w-[72px]",
        )}
      >
        <div className="flex h-header shrink-0 items-center justify-center border-b border-border bg-card px-3">
          <img
            src={trurootLogo}
            alt="Truroot Realty"
            className={cn(
              "h-auto w-full max-w-[205px]",
              collapsed && "lg:max-w-[48px] lg:object-cover lg:object-left",
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close navigation"
            className="absolute right-2 text-secondary lg:hidden"
            onClick={onMobileClose}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="crm-sidebar-scrollbar flex-1 space-y-1.5 overflow-y-auto px-2.5 py-3.5">
          {items.map((item) => {
            const Icon = item.icon;
            const itemId = item.id ?? item.label;
            const active =
              itemId === resolvedActiveItemId ||
              item.label === resolvedActiveItem;
            const expanded =
              expandedItems.has(itemId) && item.children && !collapsed;
            const itemButtonClassName = cn(
              "crm-sidebar-item w-full !justify-start bg-transparent text-white/85 hover:bg-white/10 hover:text-white",
              active &&
                "bg-primary text-white hover:bg-primary-hover hover:text-white",
              collapsed && "lg:!justify-center lg:px-0",
            );
            const itemContent = (
              <>
                <Icon
                  aria-hidden="true"
                  className="size-5 shrink-0"
                  strokeWidth={2}
                />
                <span className={cn("truncate", collapsed && "lg:hidden")}>
                  {item.label}
                </span>
                {item.badge && !collapsed ? (
                  <span
                    className={cn(
                      "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                      item.badgeClassName,
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
                {item.expandable || item.children ? (
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      item.badge && !collapsed ? "ml-2" : "ml-auto",
                      "size-4",
                      expanded && "rotate-90",
                      collapsed && "lg:hidden",
                    )}
                  />
                ) : null}
              </>
            );

            return (
              <div key={itemId}>
                {item.to ? (
                  <Button
                    asChild
                    variant="ghost"
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={itemButtonClassName}
                    onClick={onMobileClose}
                  >
                    <Link to={item.to}>{itemContent}</Link>
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    aria-expanded={item.children?.length ? expanded : undefined}
                    className={itemButtonClassName}
                    onClick={() => toggleExpandedItem(item)}
                  >
                    {itemContent}
                  </Button>
                )}
                {item.children?.length ? (
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-in-out",
                      expanded
                        ? "grid-rows-[1fr] opacity-100 mt-1"
                        : "grid-rows-[0fr] opacity-0 pointer-events-none"
                    )}
                  >
                    <div className="overflow-hidden space-y-1 pl-8">
                      {item.children.map((child) =>
                        child.to ? (
                          <Button
                            key={child.id ?? child.label}
                            asChild
                            variant="ghost"
                            aria-label={child.label}
                            className={cn(
                              "h-8 w-full overflow-hidden !justify-start bg-transparent px-2 text-[13px] font-semibold text-white/85 hover:bg-white/10 hover:text-white",
                              ((child.id ?? child.label) ===
                                resolvedActiveChildId ||
                                child.label === resolvedActiveChild) &&
                                "text-primary hover:text-primary",
                            )}
                            onClick={onMobileClose}
                          >
                            <Link
                              to={child.to}
                              className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-hidden"
                            >
                              <span
                                className={cn(
                                  "size-1.5 shrink-0 rounded-full bg-primary",
                                  (child.id ?? child.label) !==
                                    resolvedActiveChildId &&
                                    child.label !== resolvedActiveChild &&
                                    "bg-white/45",
                                )}
                              />
                              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">
                                {child.label}
                              </span>
                              {child.badge ? (
                                <span
                                  className={cn(
                                    "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                                    child.badgeClassName,
                                  )}
                                >
                                  {child.badge}
                                </span>
                              ) : null}
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            key={child.id ?? child.label}
                            type="button"
                            variant="ghost"
                            aria-label={child.label}
                            className={cn(
                              "h-8 w-full overflow-hidden !justify-start bg-transparent px-2 text-[13px] font-semibold text-white/85 hover:bg-white/10 hover:text-white",
                              ((child.id ?? child.label) ===
                                resolvedActiveChildId ||
                                child.label === resolvedActiveChild) &&
                                "text-primary hover:text-primary",
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 shrink-0 rounded-full bg-primary",
                                (child.id ?? child.label) !==
                                  resolvedActiveChildId &&
                                  child.label !== resolvedActiveChild &&
                                  "bg-white/45",
                              )}
                            />
                            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left">
                              {child.label}
                            </span>
                            {child.badge ? (
                              <span
                                className={cn(
                                  "ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold",
                                  child.badgeClassName,
                                )}
                              >
                                {child.badge}
                              </span>
                            ) : null}
                          </Button>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="space-y-3 p-3.5">
          <Button
            type="button"
            variant="ghost"
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className={cn(
              "h-12 w-full justify-start rounded-lg border border-white/20 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white",
              collapsed && "lg:justify-center lg:px-0",
            )}
            onClick={onCollapse}
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
            <span className={cn(collapsed && "lg:hidden")}>Collapse Menu</span>
          </Button>
        </div>
      </aside>
    </>
  );
}

export const DashboardSidebar = memo(
  DashboardSidebarComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.collapsed === nextProps.collapsed &&
      prevProps.mobileOpen === nextProps.mobileOpen &&
      prevProps.activeItem === nextProps.activeItem &&
      prevProps.activeChild === nextProps.activeChild &&
      prevProps.items === nextProps.items &&
      prevProps.footerContent === nextProps.footerContent &&
      prevProps.managed === nextProps.managed
    );
  },
);

export function MobileMenuButton({
  onClick,
  label = "Open navigation",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      onClick={onClick}
    >
      <Menu className="size-5" />
    </Button>
  );
}
