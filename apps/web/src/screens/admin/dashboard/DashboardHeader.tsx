import { useLayoutEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  LogOut,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  SearchInput,
} from "ui";

import { useAppSelector } from "../../../store";
import { useLogoutMutation } from "../../../common/mutations/useAuthMutations";
import { MobileMenuButton } from "./DashboardSidebar";
import { useDashboardLayoutContext } from "./DashboardLayoutContext";
import { useNotifications } from "../../../common/queries/useNotifications";
import { useNotificationMutations } from "../../../common/mutations/useNotificationMutations";
import { api } from "../../../common/api";

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
  const layout = useDashboardLayoutContext();
  const setLayoutHeader = layout?.setHeader;

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

  const { data: notificationsData } = useNotifications();
  const mutations = useNotificationMutations();
  const notifications = notificationsData?.rows || [];

  // Get only unread notifications for the dropdown
  const unreadNotifications = notifications.filter((n) => !n.readAt);

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  }

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

  return (
    <header className="crm-header sticky top-0 z-30 gap-4 px-4 shadow-[0_1px_0_hsl(var(--border))] sm:px-5">
      <div className="lg:hidden">
        <MobileMenuButton onClick={onMobileMenuOpen} />
      </div>
      <div className="hidden items-center gap-4 lg:flex">
        <MobileMenuButton
          label="Toggle sidebar"
          onClick={onDesktopSidebarToggle}
        />
        {breadcrumbs && (
          <div className="text-sm font-semibold text-muted-foreground">
            {breadcrumbs}
          </div>
        )}
      </div>

      <div className="flex-1 ml-4 lg:ml-8">
        {children
          ? children
          : onSearchChange && (
              <div className="crm-header-search">
                <SearchInput
                  aria-label="Search dashboard"
                  value={search ?? ""}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search by Lead, Customer, Mobile, Project..."
                  className="h-10 text-sm"
                />
              </div>
            )}
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
        <Button asChild className="hidden h-10 px-4 text-sm sm:inline-flex">
          <Link to="/leads/all" state={{ openAddLead: true }}>
            <Plus className="size-4" />
            Add Lead
          </Link>
        </Button>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative"
            >
              <Bell className="size-4.5" />
              {unreadNotifications.length > 0 && (
                <span className="absolute -right-2 -top-1 flex h-5 w-5 translate-x-0.5 items-center justify-center rounded-full bg-destructive text-[10px] font-extrabold text-white leading-none shadow-sm ring-2 ring-white">
                  {unreadNotifications.length > 99
                    ? "99+"
                    : unreadNotifications.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold">Notifications</span>
              {unreadNotifications.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto p-1 text-[11px] font-semibold text-primary hover:bg-transparent hover:text-primary/80 shadow-none"
                  onClick={() => mutations.markAllRead.mutate()}
                  disabled={mutations.markAllRead.isPending}
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto p-2">
              {unreadNotifications.length > 0 ? (
                unreadNotifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    asChild
                    className="cursor-pointer p-0"
                  >
                    <Link
                      to="/notifications"
                      onClick={() => mutations.markRead.mutate(notif.id)}
                      className="flex w-full flex-col items-start rounded-md bg-slate-50 p-3 text-sm transition-colors hover:bg-slate-100 focus:bg-slate-100 outline-none"
                    >
                      <div className="flex w-full items-start justify-between gap-2">
                        <p className="font-semibold text-secondary">
                          {notif.title}
                        </p>
                        <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground whitespace-normal text-left line-clamp-2">
                        {notif.description || notif.message}
                      </p>
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="py-6 text-center text-sm font-medium text-muted-foreground">
                  You&apos;re all caught up!
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              asChild
              className="cursor-pointer justify-center font-bold text-primary focus:bg-transparent focus:text-primary"
            >
              <Link to="/notifications">View all notifications</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-auto gap-2.5 px-2 py-1"
            >
              <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={profileName}
                    className="block h-full w-full min-h-0 min-w-0 flex-none object-cover"
                  />
                ) : (
                  <Avatar className="h-full w-full border-0 bg-transparent">
                    <AvatarFallback className="rounded-full bg-slate-100 text-secondary">
                      {profileName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-sm font-bold">{profileName}</span>
                <span className="block text-[11px] font-medium text-muted-foreground capitalize">
                  {user?.role?.replace(/_/g, " ").toLowerCase() ||
                    "Super admin"}
                </span>
              </span>
              <ChevronDown className="hidden size-3.5 md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/employee/me")}>
              <UserRound className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/employee/settings")}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
