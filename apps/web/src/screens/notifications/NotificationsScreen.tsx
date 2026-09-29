import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Calendar,
  PhoneCall,
  ArrowRightLeft,
  Settings,
  X,
  ChevronRight,
  Bell,
  Check,
  Plus,
  Send,
  RotateCw,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Button,
  Card,
  Tabs,
  TabsList,
  TabsTrigger,
  Badge,
  Checkbox,
  cn,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "ui";

import { useDashboardLayout } from "../admin/dashboard/DashboardLayoutContext";
import { useNotifications } from "../../common/queries/useNotifications";
import { useNotificationMutations } from "../../common/mutations/useNotificationMutations";
import { resolveNotificationPath } from "../../common/notifications/notificationNavigation";
import { useAppSelector } from "../../store";
import { telecallerSidebarItems } from "../telecaller/dashboard/telecallerDashboardData";
import { fieldExecutiveSidebarItems } from "../field-executive/fieldExecutiveData";
import { SendNotificationModal } from "./SendNotificationModal";
import { api } from "../../common/api";
import trurootLogo from "../../assets/truroot-logo.png";

function getNotificationIcon(type: string) {
  switch (type) {
    case "assignment":
      return { icon: UserPlus, color: "text-orange-500", bg: "bg-orange-50" };
    case "lead":
      return { icon: Calendar, color: "text-green-500", bg: "bg-green-50" };
    case "follow-up":
    case "follow-up-assigned":
    case "follow-up-updated":
    case "follow-up-reassigned":
    case "follow-up-completed":
    case "follow-up-reminder":
      return { icon: PhoneCall, color: "text-red-500", bg: "bg-red-50" };
    case "announcement":
    case "broadcast":
      return { icon: Send, color: "text-primary", bg: "bg-primary/10" };
    case "system":
      return { icon: Settings, color: "text-blue-500", bg: "bg-blue-50" };
    default:
      return { icon: Bell, color: "text-primary", bg: "bg-primary/10" };
  }
}

function isLeadNotificationType(type: string) {
  return type === "lead" || type.startsWith("follow-up");
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function filterDetailEntries(details?: Record<string, any> | null) {
  if (!details || typeof details !== "object") return [];
  const hiddenKeys = new Set([
    "webPath",
    "followUpWebPath",
    "mobilePath",
    "destination",
    "notificationId",
    "broadcastGroupId",
    "senderId",
  ]);

  return Object.entries(details).filter(([key, value]) => {
    if (hiddenKeys.has(key)) return false;
    if (typeof value === "string" && uuidPattern.test(value.trim())) {
      return false;
    }
    return true;
  });
}

function formatDetailKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (value) => value.toUpperCase());
}

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

export function NotificationsScreen() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const queryClient = useQueryClient();
  
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<any | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<{ id: string; title: string } | null>(null);
  
  const userRoleUpper = String(user?.role ?? "").toUpperCase();
  const canSendNotifications =
    !user?.role ||
    !["TELECALLER"].includes(userRoleUpper);

  const [filters, setFilters] = useState({
    all: true,
    lead: false,
    assignment: false,
    system: false,
    others: false,
  });

  const sidebarConfig =
    user?.role === "TELECALLER"
      ? {
          activeItem: "Notifications",
          sidebarItems: telecallerSidebarItems,
        }
      : user?.role === "SALES_AGENT"
      ? {
          activeItem: "Dashboard",
          sidebarItems: fieldExecutiveSidebarItems,
        }
      : undefined;

  useDashboardLayout(
    {
      sidebar: sidebarConfig,
      header: {
        search,
        onSearchChange: setSearch,
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span className="cursor-pointer text-secondary hover:underline">
              Home
            </span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Notifications</span>
          </div>
        ),
      },
    },
    [search, user?.role],
  );

  const { data, isLoading } = useNotifications();
  const mutations = useNotificationMutations();

  const broadcastsQuery = useQuery({
    queryKey: ["broadcasts"],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>("/notifications/broadcasts");
      return res.data?.data || [];
    },
    enabled: canSendNotifications,
  });

  const notifications = data?.rows || [];
  const broadcasts = broadcastsQuery.data || [];

  const selectedNotification =
    notifications.find((n) => n.id === selectedNotificationId) ?? null;
  const selectedNotificationWebPath = resolveNotificationPath(
    selectedNotification?.details,
    user?.role,
  );

  const handleMarkAllRead = () => {
    mutations.markAllRead.mutate(undefined, {
      onSuccess: () => toast.success("All notifications marked as read"),
      onError: () => toast.error("Failed to mark all as read"),
    });
  };

  const handleNotificationClick = (id: string, isUnread: boolean) => {
    setSelectedNotificationId(id);
    setIsPreviewModalOpen(true);
    if (isUnread) {
      mutations.markRead.mutate(id);
    }
  };

  const handleResendBroadcast = async (id: string) => {
    setResendingId(id);
    try {
      const res = await api.post<{ message?: string; recipientCount?: number }>(
        `/notifications/resend/${id}`,
      );
      toast.success(res.data?.message || "Notification resent successfully!");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to resend notification");
    } finally {
      setResendingId(null);
    }
  };

  const onRequestDelete = (id: string, title: string) => {
    setDeletingTarget({ id, title });
  };

  const confirmDeleteNotification = async () => {
    if (!deletingTarget) return;
    setDeletingId(deletingTarget.id);
    try {
      await api.delete(`/notifications/${deletingTarget.id}`);
      toast.success("Notification deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["broadcasts"] });
      setDeletingTarget(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete notification");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditBroadcast = (broadcast: any) => {
    setEditingBroadcast(broadcast);
    setIsSendModalOpen(true);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "unread" && n.readAt) return false;
    if (filters.all) return true;
    if (filters.lead && isLeadNotificationType(n.type)) return true;
    if (filters.assignment && n.type === "assignment") return true;
    if (filters.system && n.type === "system") return true;
    if (
      filters.others &&
      !isLeadNotificationType(n.type) &&
      !["assignment", "system"].includes(n.type)
    ) {
      return true;
    }
    return false;
  });

  return (
    <>
      <main className="flex-1 p-6 overflow-auto">
        <div className="mx-auto space-y-6">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white p-2 border border-border shadow-sm shrink-0 flex items-center justify-center">
                <img src={trurootLogo} alt="Truroot Realty" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-secondary">
                  Notifications
                </h1>
                <p className="text-sm font-semibold text-muted-foreground mt-0.5">
                  Stay updated with important alerts, team broadcasts, and activities.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canSendNotifications && (
                <Button
                  size="sm"
                  className="h-9 px-4 text-xs font-bold bg-primary text-white hover:bg-primary/90 shadow-sm"
                  onClick={() => {
                    setEditingBroadcast(null);
                    setIsSendModalOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Create Notification
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 text-xs font-bold bg-white"
                onClick={handleMarkAllRead}
                disabled={mutations.markAllRead.isPending}
              >
                <Check className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                Mark all as read
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-6 overflow-x-auto">
              {[
                { value: "all", label: "All Alerts" },
                { value: "unread", label: "Unread" },
                ...(canSendNotifications
                  ? [{ value: "broadcasts", label: `Sent Broadcasts (${broadcasts.length})` }]
                  : []),
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 text-sm font-bold text-muted-foreground data-[state=active]:text-primary whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {activeTab === "broadcasts" ? (
              /* Sent Broadcasts Table View */
              <div className="mt-6">
                <Card className="border-border shadow-sm rounded-[var(--radius-card)] overflow-hidden bg-white">
                  <div className="p-5 border-b border-border flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Broadcast History & Management
                      </h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        Manage, edit, resend ("Try Again"), and delete broadcast notifications.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-border text-muted-foreground font-bold">
                          <th className="p-3.5 pl-5">Notification Title & Message</th>
                          <th className="p-3.5">Category</th>
                          <th className="p-3.5">Target Audience</th>
                          <th className="p-3.5">Recipients</th>
                          <th className="p-3.5">Sent Date</th>
                          <th className="p-3.5 pr-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {broadcastsQuery.isLoading ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground font-semibold">
                              Loading broadcast history...
                            </td>
                          </tr>
                        ) : broadcasts.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground font-semibold">
                              No broadcast notifications created yet. Click "+ Create Notification" to get started.
                            </td>
                          </tr>
                        ) : (
                          broadcasts.map((b) => (
                            <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-3.5 pl-5 max-w-[280px]">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <Send className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-extrabold text-secondary text-[13px] truncate">
                                      {b.title}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground truncate font-medium">
                                      {b.message || b.description}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <Badge variant="neutral" className="bg-slate-100 text-slate-600 font-extrabold text-[10px] uppercase">
                                  {b.type || "Announcement"}
                                </Badge>
                              </td>
                              <td className="p-3.5">
                                <span className="font-extrabold text-secondary bg-slate-50 px-2 py-1 rounded text-[11px]">
                                  {b.targetType === "ALL"
                                    ? "🌐 All Staff"
                                    : b.targetType === "ROLE"
                                    ? `👔 ${b.targetRole}`
                                    : b.targetType === "TEAM"
                                    ? "👥 Team"
                                    : "👤 Selected Staff"}
                                </span>
                              </td>
                              <td className="p-3.5">
                                <span className="font-extrabold text-secondary">
                                  {b.recipientCount} Employee(s)
                                </span>
                              </td>
                              <td className="p-3.5 text-muted-foreground font-bold whitespace-nowrap">
                                {formatTimeAgo(b.createdAt)}
                              </td>
                              <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Resend / Try Again */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={resendingId === b.id}
                                    onClick={() => handleResendBroadcast(b.id)}
                                    className="h-7 px-2.5 text-[11px] font-bold text-primary border-primary/20 hover:bg-primary/5 rounded-md"
                                    title="Try Again / Resend FCM push & in-app alerts"
                                  >
                                    {resendingId === b.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <>
                                        <RotateCw className="w-3 h-3 mr-1" /> Try Again
                                      </>
                                    )}
                                  </Button>

                                  {/* Edit & Resend */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditBroadcast(b)}
                                    className="h-7 px-2 text-[11px] font-bold text-secondary border-border hover:bg-slate-100 rounded-md"
                                    title="Edit title or content and resend"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>

                                  {/* Delete */}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingId === b.id}
                                    onClick={() => onRequestDelete(b.id, b.title)}
                                    className="h-7 px-2 text-[11px] font-bold text-destructive border-destructive/20 hover:bg-destructive/10 rounded-md"
                                    title="Delete notification"
                                  >
                                    {deletingId === b.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col lg:flex-row gap-6 mt-6">
                {/* Left Filter Sidebar */}
                <div className="w-full lg:w-[280px] shrink-0">
                  <Card className="p-5 border-border shadow-sm rounded-[var(--radius-card)]">
                    <h3 className="text-sm font-extrabold text-secondary mb-4">
                      Filters
                    </h3>

                    <div className="space-y-6">
                      {/* Notification Type */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-secondary">
                          Notification Type
                        </label>
                        <div className="space-y-2.5">
                          <label className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-2.5">
                              <Checkbox
                                checked={filters.all}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    all: e.target.checked,
                                  }))
                                }
                                className="rounded-[4px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <span className="text-[13px] font-semibold text-secondary">
                                All Types
                              </span>
                            </div>
                          </label>
                          <label className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-2.5">
                              <Checkbox
                                checked={filters.lead}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    lead: e.target.checked,
                                  }))
                                }
                                className="rounded-[4px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-secondary">
                                Lead & Follow-up
                              </span>
                            </div>
                          </label>
                          <label className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-2.5">
                              <Checkbox
                                checked={filters.assignment}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    assignment: e.target.checked,
                                  }))
                                }
                                className="rounded-[4px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-secondary">
                                Assignment
                              </span>
                            </div>
                          </label>
                          <label className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-2.5">
                              <Checkbox
                                checked={filters.system}
                                onChange={(e) =>
                                  setFilters((prev) => ({
                                    ...prev,
                                    system: e.target.checked,
                                  }))
                                }
                                className="rounded-[4px] data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                              <span className="text-[13px] font-semibold text-muted-foreground group-hover:text-secondary">
                                System
                              </span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          variant="outline"
                          onClick={() => setFilters({ all: true, lead: false, assignment: false, system: false, others: false })}
                          className="w-full h-10 font-bold text-xs bg-slate-50 border-border text-secondary rounded-[var(--radius-control)]"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mr-2 rotate-90" />
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Main Notification List */}
                <div className="flex-1 min-w-0">
                  <Card className="border-border shadow-sm rounded-[var(--radius-card)] overflow-hidden">
                    <div className="p-5 border-b border-border bg-white">
                      <h3 className="text-sm font-extrabold text-secondary">
                        Notifications
                      </h3>
                    </div>

                    <div className="divide-y divide-border bg-white">
                      {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground text-sm font-medium">Loading notifications...</div>
                      ) : filteredNotifications.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm font-medium">No notifications found.</div>
                      ) : (
                        filteredNotifications.map((notification) => {
                          const { icon: Icon, color, bg } = getNotificationIcon(notification.type);
                          const isUnread = !notification.readAt;
                          
                          return (
                            <div
                              key={notification.id}
                              onClick={() => handleNotificationClick(notification.id, isUnread)}
                              className={cn(
                                "p-5 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer relative group",
                                isUnread && "bg-slate-50/50",
                              )}
                            >
                              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-border/40 shadow-xs", bg)}>
                                <Icon className={cn("w-5 h-5", color)} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 sm:gap-4">
                                  <div>
                                    <h4 className={cn("text-[13px] font-extrabold text-secondary", !isUnread && "text-secondary/80")}>
                                      {notification.title}
                                    </h4>
                                    <p className="text-[13px] font-semibold text-muted-foreground mt-0.5">
                                      {notification.description || notification.message}
                                    </p>
                                    {notification.badge && (
                                      <div className="mt-2.5 flex items-center gap-2">
                                        <Badge variant="neutral" className="bg-slate-100 text-slate-500 hover:bg-slate-100 px-2 text-[10px] rounded-md font-extrabold">
                                          {notification.badge}
                                        </Badge>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto mt-2 sm:mt-0">
                                    <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap">
                                      {formatTimeAgo(notification.createdAt)}
                                    </span>
                                    {isUnread && (
                                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
                                    )}
                                    {canSendNotifications && (
                                      <div className="flex items-center gap-1 ml-2">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleResendBroadcast(notification.id);
                                          }}
                                          disabled={resendingId === notification.id}
                                          className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-slate-100 transition-colors"
                                          title="Try Again / Resend notification"
                                        >
                                          {resendingId === notification.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <RotateCw className="w-3.5 h-3.5" />
                                          )}
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditBroadcast(notification);
                                          }}
                                          className="p-1.5 rounded text-muted-foreground hover:text-secondary hover:bg-slate-100 transition-colors"
                                          title="Edit & Resend notification"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onRequestDelete(notification.id, notification.title);
                                          }}
                                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                                          title="Delete notification"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </Tabs>
        </div>
      </main>

      {/* Notification Preview Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden rounded-[var(--radius-card)] [&>button]:hidden">
          {(() => {
            if (!selectedNotification) return null;
            const { icon: Icon, color, bg } = getNotificationIcon(selectedNotification.type);
            
            return (
              <>
                <DialogHeader className="sr-only">
                  <DialogTitle>Notification Preview</DialogTitle>
                </DialogHeader>

                <div className="relative p-6 pb-0 flex items-start gap-4">
                  <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
                    <X className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Close</span>
                  </DialogClose>

                  <div className={cn("w-12 h-12 rounded-2xl p-2 border border-border shrink-0 flex items-center justify-center", bg)}>
                    <img src={trurootLogo} alt="Truroot" className="w-full h-full object-contain" />
                  </div>
                  <div className="pr-6">
                    <h2 className="text-xl font-extrabold text-secondary">
                      {selectedNotification.title}
                    </h2>
                    {selectedNotification.description && (
                      <p className="text-sm font-semibold text-muted-foreground mt-1 leading-snug">
                        {selectedNotification.description}
                      </p>
                    )}
                    {selectedNotification.badge && (
                      <div className="mt-2.5">
                        <Badge variant="neutral" className="bg-slate-100 text-slate-500 hover:bg-slate-100 px-2.5 py-0.5 text-xs rounded-md font-extrabold">
                          {selectedNotification.badge}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
                  {(() => {
                    const detailEntries = filterDetailEntries(
                      selectedNotification.details,
                    );
                    if (!detailEntries.length) return null;
                    return (
                      <div className="space-y-3">
                        <h3 className="text-sm font-extrabold text-secondary">
                          Details
                        </h3>
                        <div className="space-y-2.5">
                          {detailEntries.map(([key, value]) => (
                            <div
                              key={key}
                              className="grid grid-cols-[120px_1fr] sm:grid-cols-[140px_1fr] gap-2 items-start"
                            >
                              <span className="text-[13px] font-semibold text-muted-foreground">
                                {formatDetailKey(key)}
                              </span>
                              <span className="text-[13px] font-bold text-foreground break-words">
                                : {String(value ?? "-")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {selectedNotification.message && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-extrabold text-secondary">Message</h3>
                      <Card className="p-4 bg-slate-50 border-border rounded-[var(--radius-control)] shadow-none">
                        <p className="text-[13px] font-semibold text-muted-foreground leading-relaxed">
                          {selectedNotification.message}
                        </p>
                      </Card>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 bg-white">
                  {canSendNotifications ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={resendingId === selectedNotification.id}
                        onClick={() => handleResendBroadcast(selectedNotification.id)}
                        className="h-9 px-3 text-xs font-bold text-primary border-primary/20 hover:bg-primary/5 rounded-xl"
                      >
                        {resendingId === selectedNotification.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Try Again
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsPreviewModalOpen(false);
                          handleEditBroadcast(selectedNotification);
                        }}
                        className="h-9 px-3 text-xs font-bold text-secondary border-border hover:bg-slate-100 rounded-xl"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsPreviewModalOpen(false);
                          onRequestDelete(selectedNotification.id, selectedNotification.title);
                        }}
                        className="h-9 px-3 text-xs font-bold text-destructive border-destructive/20 hover:bg-destructive/10 rounded-xl"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    {selectedNotificationWebPath ? (
                      <Button
                        variant="outline"
                        className="h-9 px-4 text-xs font-bold rounded-xl"
                        onClick={() => {
                          setIsPreviewModalOpen(false);
                          navigate(selectedNotificationWebPath);
                        }}
                      >
                        Open context
                      </Button>
                    ) : null}
                    <DialogClose asChild>
                      <Button className="h-9 px-5 text-xs font-extrabold bg-secondary text-white hover:bg-secondary/90 rounded-xl shadow-sm">
                        Close
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Broadcast / Create Notification Modal */}
      <SendNotificationModal
        open={isSendModalOpen}
        onOpenChange={setIsSendModalOpen}
        editData={editingBroadcast}
      />

      {/* Reusable Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deletingTarget)}
        onOpenChange={(open) => {
          if (!open) setDeletingTarget(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl border border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100">
                <Trash2 className="size-5 shrink-0" />
              </span>
              <div>
                <DialogTitle className="text-lg font-extrabold text-secondary">
                  Delete Notification?
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs font-semibold text-muted-foreground leading-relaxed">
                  Are you sure you want to delete{" "}
                  <strong className="text-secondary font-extrabold">
                    "{deletingTarget?.title}"
                  </strong>
                  ? This will remove the notification broadcast from the system.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl px-5 text-xs font-extrabold shadow-none border-slate-200"
              onClick={() => setDeletingTarget(null)}
              disabled={Boolean(deletingId)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={Boolean(deletingId)}
              className="h-10 rounded-xl px-5 text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white shadow-sm min-w-[100px]"
              onClick={confirmDeleteNotification}
            >
              {deletingId ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Notification"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
