import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  ChevronRight,
  Clock,
  Megaphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "ui";
import { api } from "../../common/api";
import { currentOrganizationId } from "../../common/tenantRequestScope";

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category?: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

interface ApiNotificationItem {
  id: string;
  title: string;
  description?: string | null;
  message?: string | null;
  type: string;
  readAt?: string | null;
  createdAt: string;
  details?: Record<string, unknown> | null;
}

interface NotificationFeedState {
  organizationId: string;
  unreadCount: number;
  notifications: NotificationItem[];
}

export function HeaderNotificationBell() {
  const organizationId = currentOrganizationId() ?? "unscoped";
  const [isOpen, setIsOpen] = useState(false);
  const [feed, setFeed] = useState<NotificationFeedState>({
    organizationId,
    unreadCount: 0,
    notifications: [],
  });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const visibleFeed =
    feed.organizationId === organizationId
      ? feed
      : { organizationId, unreadCount: 0, notifications: [] };
  const { unreadCount, notifications } = visibleFeed;

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/notifications").catch(() => null);
      if (res?.data && currentOrganizationId() === organizationId) {
        const rows: ApiNotificationItem[] = Array.isArray(res.data.data)
          ? res.data.data
          : [];
        setFeed({
          organizationId,
          unreadCount: Number(res.data.unreadCount ?? 0),
          notifications: rows.map((row) => ({
            id: row.id,
            title: row.title,
            body: row.description || row.message || "",
            category: row.type,
            isRead: Boolean(row.readAt),
            createdAt: row.createdAt,
            actionUrl:
              row.details && typeof row.details.webPath === "string"
                ? row.details.webPath
                : null,
          })),
        });
      }
    } catch {
      // Graceful local fallback
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (logId: string, actionUrl?: string | null) => {
    try {
      await api.patch(`/notifications/${logId}/read`).catch(() => null);
      setFeed((current) => ({
        ...current,
        notifications: current.notifications.map((notification) =>
          notification.id === logId
            ? { ...notification, isRead: true }
            : notification,
        ),
        unreadCount: Math.max(0, current.unreadCount - 1),
      }));
      if (actionUrl) {
        setIsOpen(false);
        navigate(actionUrl);
      }
    } catch {
      // Fallback
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/mark-all-read").catch(() => null);
      setFeed((current) => ({
        ...current,
        notifications: current.notifications.map((notification) => ({
          ...notification,
          isRead: true,
        })),
        unreadCount: 0,
      }));
    } catch {
      // Fallback
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "EMERGENCY_ALERT":
      case "ALERT":
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case "TARGET_ALERT":
        return <Zap className="h-4 w-4 text-amber-600" />;
      case "LEAD_UPDATE":
        return <Sparkles className="h-4 w-4 text-blue-600" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-[#0D1F3D]" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadNotifications();
        }}
        title="Notifications"
        className={`relative inline-flex h-9 w-9 items-center justify-center rounded-sm border transition-colors cursor-pointer ${
          isOpen
            ? "border-[#0D1F3D] bg-slate-100 text-[#0D1F3D]"
            : "border-slate-200 text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-2.5 w-2.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E20613] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E20613]" />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-sm border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden font-sans">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-[#0D1F3D]">
                Notifications
              </span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-[#E20613]">
                  {unreadCount} New
                </span>
              ) : (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  All Read
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#0D1F3D] cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-xs font-semibold text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold text-[#0D1F3D]">
                  No new notifications
                </p>
                <p className="text-[11px] text-slate-500">
                  You are all caught up on system updates and leads.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id, item.actionUrl)}
                  className={`flex items-start gap-3 p-3 text-xs transition-colors cursor-pointer hover:bg-slate-50 ${
                    !item.isRead ? "bg-blue-50/30" : ""
                  }`}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-slate-100">
                    {getCategoryIcon(item.category)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`truncate text-xs ${
                          !item.isRead
                            ? "font-extrabold text-[#0D1F3D]"
                            : "font-semibold text-slate-700"
                        }`}
                      >
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E20613]" />
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-slate-500">
                      {item.body}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {item.actionUrl && (
                        <span className="font-bold text-[#E20613] flex items-center gap-0.5">
                          View details <ChevronRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="w-full text-xs font-bold text-[#0D1F3D] hover:text-[#E20613]"
            >
              Open Notification Center{" "}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
