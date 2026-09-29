import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  UserCheck,
  CalendarClock,
  MapPin,
  CheckSquare,
  Receipt,
  Volume2,
  Search,
  CheckCheck,
  Ban,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge, Button, Card, Switch, Input, cn } from "ui";
import { api } from "../../../common/api";

type EventSettingItem = {
  fcmEnabled: boolean;
  whatsappEnabled: boolean;
};

type NotificationSettingsResponse = {
  id: string;
  globalFcmEnabled: boolean;
  globalWhatsAppEnabled: boolean;
  eventSettings: Record<string, EventSettingItem>;
  updatedAt?: string;
  updatedById?: string;
};

interface EventMeta {
  key: string;
  title: string;
  description: string;
  audience: string;
  badgeText: string;
}

interface CategoryMeta {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  events: EventMeta[];
}

const NOTIFICATION_CATEGORIES: CategoryMeta[] = [
  {
    id: "leads",
    title: "Leads & Auto-Assignment",
    description: "Alerts for new lead assignments, transfers, and SLA breach auto-routing",
    icon: UserCheck,
    events: [
      {
        key: "lead-assigned",
        title: "New Lead Assigned",
        description: "Sent to executive when a lead is newly assigned to them.",
        audience: "Assigned Executive",
        badgeText: "Lead Lifecycle",
      },
      {
        key: "lead-reassigned",
        title: "Lead Ownership Reassigned",
        description: "Sent when lead ownership is manually or automatically transferred.",
        audience: "New Executive",
        badgeText: "Lead Transfer",
      },
      {
        key: "sla-breach-transferred",
        title: "SLA Breach Auto-Transfer",
        description: "Alert dispatched when a lead breaches SLA time limit and is re-routed.",
        audience: "Previous & New Owner",
        badgeText: "SLA Rule",
      },
    ],
  },
  {
    id: "followups",
    title: "Follow-ups & Reminders",
    description: "Notifications for upcoming scheduled follow-ups, renotifies, and status updates",
    icon: CalendarClock,
    events: [
      {
        key: "follow-up-assigned",
        title: "Follow-up Scheduled",
        description: "Dispatched when a new follow-up date and time is assigned.",
        audience: "Assigned Executive",
        badgeText: "Follow-up",
      },
      {
        key: "follow-up-reminder",
        title: "Follow-up Due Reminder",
        description: "Alert sent exactly at the scheduled follow-up time.",
        audience: "Assigned Executive",
        badgeText: "Due Alert",
      },
      {
        key: "follow-up-renotify",
        title: "Recurring Renotify Alert",
        description: "Subsequent reminders sent every 'X' minutes until follow-up is completed.",
        audience: "Assigned Executive",
        badgeText: "Recurring",
      },
      {
        key: "follow-up-updated",
        title: "Follow-up Status Updated",
        description: "Sent when a follow-up is rescheduled, completed, or outcome logged.",
        audience: "Assigned Staff",
        badgeText: "Status Change",
      },
    ],
  },
  {
    id: "site-visits",
    title: "Site Visits & Property Tours",
    description: "Alerts for customer site visits, venue reminders, and executive dispatch",
    icon: MapPin,
    events: [
      {
        key: "site-visit-scheduled",
        title: "Site Visit Scheduled",
        description: "Dispatched when a buyer site visit is fixed with property details.",
        audience: "Assigned Agent & Lead",
        badgeText: "Site Visit",
      },
      {
        key: "site-visit-reminder",
        title: "Site Visit Due Reminder",
        description: "Timely reminder sent before the scheduled site visit inspection time.",
        audience: "Assigned Agent",
        badgeText: "Visit Reminder",
      },
      {
        key: "site-visit-updated",
        title: "Site Visit Status Changed",
        description: "Alert issued when site visit is marked Completed, Rescheduled, or Cancelled.",
        audience: "Executive & Manager",
        badgeText: "Visit Outcome",
      },
    ],
  },
  {
    id: "tasks",
    title: "Tasks & Workflows",
    description: "Operational task assignments, reminders, and resolution updates",
    icon: CheckSquare,
    events: [
      {
        key: "task-assigned",
        title: "Task Assigned",
        description: "Sent to team member when a CRM action item or task is delegated.",
        audience: "Task Assignee",
        badgeText: "Task Assign",
      },
      {
        key: "task-updated",
        title: "Task Status Updated",
        description: "Alert issued when task progress, priority, or completion status is changed.",
        audience: "Assignee & Creator",
        badgeText: "Task Update",
      },
    ],
  },
  {
    id: "bookings",
    title: "Bookings & Sales",
    description: "Deal closing, unit reservation, and payment milestone notifications",
    icon: Receipt,
    events: [
      {
        key: "booking-created",
        title: "New Booking Recorded",
        description: "Instant notification when a buyer completes a unit booking.",
        audience: "Sales Team & Admin",
        badgeText: "Closing",
      },
    ],
  },
  {
    id: "system",
    title: "System Broadcasts & Announcements",
    description: "Global broadcast messages and admin system alerts",
    icon: Volume2,
    events: [
      {
        key: "announcement",
        title: "System Broadcast Announcement",
        description: "Mass push notification & WhatsApp broadcast sent by system administrators.",
        audience: "All Users / Targeted Roles",
        badgeText: "Broadcast",
      },
    ],
  },
];

const DEFAULT_EVENT_SETTINGS: Record<string, EventSettingItem> = {
  "lead-assigned": { fcmEnabled: true, whatsappEnabled: true },
  "lead-reassigned": { fcmEnabled: true, whatsappEnabled: true },
  "sla-breach-transferred": { fcmEnabled: true, whatsappEnabled: true },
  "follow-up-assigned": { fcmEnabled: true, whatsappEnabled: true },
  "follow-up-reminder": { fcmEnabled: true, whatsappEnabled: true },
  "follow-up-renotify": { fcmEnabled: true, whatsappEnabled: true },
  "follow-up-updated": { fcmEnabled: true, whatsappEnabled: true },
  "site-visit-scheduled": { fcmEnabled: true, whatsappEnabled: true },
  "site-visit-reminder": { fcmEnabled: true, whatsappEnabled: true },
  "site-visit-updated": { fcmEnabled: true, whatsappEnabled: true },
  "task-assigned": { fcmEnabled: true, whatsappEnabled: true },
  "task-updated": { fcmEnabled: true, whatsappEnabled: true },
  "booking-created": { fcmEnabled: true, whatsappEnabled: true },
  "announcement": { fcmEnabled: true, whatsappEnabled: true },
};

export function NotificationSettingsScreen() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Local draft state for settings
  const [draftGlobalFcm, setDraftGlobalFcm] = useState(true);
  const [draftGlobalWhatsApp, setDraftGlobalWhatsApp] = useState(true);
  const [draftEventSettings, setDraftEventSettings] = useState<
    Record<string, EventSettingItem>
  >(DEFAULT_EVENT_SETTINGS);

  const { data, isLoading, isError, refetch } =
    useQuery<NotificationSettingsResponse>({
      queryKey: ["notification-settings"],
      queryFn: async () => {
        const response = await api.get("/notifications/settings");
        return response.data;
      },
    });

  // Sync draft state when query data loads
  useEffect(() => {
    if (data) {
      setDraftGlobalFcm(data.globalFcmEnabled);
      setDraftGlobalWhatsApp(data.globalWhatsAppEnabled);
      setDraftEventSettings({
        ...DEFAULT_EVENT_SETTINGS,
        ...(data.eventSettings || {}),
      });
    }
  }, [data]);

  const isDirty = useMemo(() => {
    if (!data) return false;
    if (draftGlobalFcm !== data.globalFcmEnabled) return true;
    if (draftGlobalWhatsApp !== data.globalWhatsAppEnabled) return true;

    const originalEvents = data.eventSettings || {};
    for (const key of Object.keys(DEFAULT_EVENT_SETTINGS)) {
      const orig = originalEvents[key] || DEFAULT_EVENT_SETTINGS[key];
      const draft = draftEventSettings[key] || DEFAULT_EVENT_SETTINGS[key];
      if (
        orig.fcmEnabled !== draft.fcmEnabled ||
        orig.whatsappEnabled !== draft.whatsappEnabled
      ) {
        return true;
      }
    }
    return false;
  }, [data, draftGlobalFcm, draftGlobalWhatsApp, draftEventSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        globalFcmEnabled: draftGlobalFcm,
        globalWhatsAppEnabled: draftGlobalWhatsApp,
        eventSettings: draftEventSettings,
      };
      const response = await api.patch("/notifications/settings", payload);
      return response.data;
    },
    onSuccess: (updatedData) => {
      toast.success("Notification settings updated successfully!");
      queryClient.setQueryData(["notification-settings"], updatedData);
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || "Failed to update notification settings",
      );
    },
  });

  const handleToggleEventChannel = (
    eventKey: string,
    channel: "fcm" | "whatsapp",
    value: boolean,
  ) => {
    setDraftEventSettings((prev) => ({
      ...prev,
      [eventKey]: {
        ...DEFAULT_EVENT_SETTINGS[eventKey],
        ...(prev[eventKey] || {}),
        [channel === "fcm" ? "fcmEnabled" : "whatsappEnabled"]: value,
      },
    }));
  };

  const handleBatchToggleCategory = (
    categoryId: string,
    channel: "fcm" | "whatsapp",
    enable: boolean,
  ) => {
    const category = NOTIFICATION_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return;

    setDraftEventSettings((prev) => {
      const updated = { ...prev };
      for (const event of category.events) {
        updated[event.key] = {
          ...DEFAULT_EVENT_SETTINGS[event.key],
          ...(updated[event.key] || {}),
          [channel === "fcm" ? "fcmEnabled" : "whatsappEnabled"]: enable,
        };
      }
      return updated;
    });
    toast.success(
      `${enable ? "Enabled" : "Disabled"} ${channel.toUpperCase()} for all ${category.title} events`,
    );
  };

  const handleSetAllChannels = (enable: boolean) => {
    setDraftGlobalFcm(enable);
    setDraftGlobalWhatsApp(enable);
    const updatedEvents: Record<string, EventSettingItem> = {};
    for (const key of Object.keys(DEFAULT_EVENT_SETTINGS)) {
      updatedEvents[key] = { fcmEnabled: enable, whatsappEnabled: enable };
    }
    setDraftEventSettings(updatedEvents);
    toast.success(
      enable
        ? "All notification channels and triggers enabled"
        : "All notification channels and triggers disabled",
    );
  };

  const handleResetToOriginal = () => {
    if (data) {
      setDraftGlobalFcm(data.globalFcmEnabled);
      setDraftGlobalWhatsApp(data.globalWhatsAppEnabled);
      setDraftEventSettings({
        ...DEFAULT_EVENT_SETTINGS,
        ...(data.eventSettings || {}),
      });
      toast.success("Reset changes to last saved state");
    }
  };

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return NOTIFICATION_CATEGORIES;
    const q = searchQuery.toLowerCase().trim();
    return NOTIFICATION_CATEGORIES.map((cat) => ({
      ...cat,
      events: cat.events.filter(
        (ev) =>
          ev.title.toLowerCase().includes(q) ||
          ev.description.toLowerCase().includes(q) ||
          ev.key.toLowerCase().includes(q) ||
          ev.audience.toLowerCase().includes(q),
      ),
    })).filter(
      (cat) =>
        cat.events.length > 0 ||
        cat.title.toLowerCase().includes(q) ||
        cat.description.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="space-y-2">
            <div className="h-7 w-72 rounded-md bg-slate-200/80" />
            <div className="h-3.5 w-80 rounded bg-slate-200/50" />
          </div>
          <div className="h-9 w-32 rounded-lg bg-slate-200/70" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-44 rounded-xl border border-slate-200 bg-white p-5 shadow-xs" />
          <div className="h-44 rounded-xl border border-slate-200 bg-white p-5 shadow-xs" />
        </div>
        <div className="h-96 rounded-xl border border-slate-200 bg-white p-6 shadow-xs" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center font-sans">
        <AlertCircle className="mx-auto size-12 text-red-500" />
        <h2 className="mt-3 text-lg font-black text-secondary">
          Failed to load notification settings
        </h2>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          Please check your connection and administrative permissions.
        </p>
        <Button
          onClick={() => refetch()}
          className="mt-4 h-9 rounded-xl text-xs font-bold"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="relative space-y-6 font-sans text-secondary antialiased pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-start gap-3">
            <span className="flex shrink-0 size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs mt-0.5 p-1">
              <BellRing className="size-5 shrink-0 p-1" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-secondary">
                  Notification Channel & Trigger Settings
                </h1>
                {isDirty && (
                  <Badge className="border-0 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                    Unsaved Changes
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                Control master notification delivery channels (FCM Push & WhatsApp Business API) and fine-tune event triggers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              onClick={handleResetToOriginal}
              className="h-10 rounded-xl px-4 text-xs font-bold text-slate-700 shadow-none border-slate-200"
            >
              <RotateCcw className="mr-1.5 size-3.5 text-muted-foreground" />
              Discard Changes
            </Button>
          )}

          <Button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !isDirty}
            className={cn(
              "h-10 rounded-xl px-6 text-xs font-black shadow-sm transition-all",
              isDirty
                ? "bg-primary text-white hover:bg-primary/90 shadow-md ring-2 ring-primary/20"
                : "opacity-60 cursor-not-allowed",
            )}
          >
            {saveMutation.isPending ? (
              "Saving Settings..."
            ) : (
              <>
                <Save className="mr-1.5 size-4" />
                Save Notification Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Global Master Channel Toggles */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* FCM Push Card */}
        <Card
          className={cn(
            "relative flex flex-col justify-between rounded-2xl border p-6 transition-all shadow-xs",
            draftGlobalFcm
              ? "border-emerald-500/30 bg-emerald-50/20 ring-1 ring-emerald-500/10"
              : "border-slate-200 bg-slate-50/50 opacity-90",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex shrink-0 size-11 items-center justify-center rounded-2xl font-black shadow-xs transition-colors p-1",
                    draftGlobalFcm
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500",
                  )}
                >
                  <Smartphone className="size-5 shrink-0 p-1" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-secondary">
                      Mobile Push Notifications (FCM)
                    </h3>
                    <Badge
                      className={cn(
                        "border-0 text-[10px] font-black",
                        draftGlobalFcm
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {draftGlobalFcm ? "ACTIVE" : "DISABLED"}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                    Firebase Cloud Messaging Service
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={draftGlobalFcm}
                  onCheckedChange={(val) => setDraftGlobalFcm(val)}
                  className="scale-110"
                />
              </div>
            </div>

            <p className="mt-4 text-xs font-semibold text-slate-600 leading-relaxed">
              Global master switch for native push notifications delivered to registered user devices (Android / iOS). When disabled, zero push messages will be sent across any event.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-200/60 pt-3 text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-emerald-600 shrink-0" />
              App Push Channel Protected
            </span>
            <span className="text-slate-500 font-extrabold">
              {draftGlobalFcm ? "Broadcasting Enabled" : "Broadcasting Paused"}
            </span>
          </div>
        </Card>

        {/* WhatsApp Card */}
        <Card
          className={cn(
            "relative flex flex-col justify-between rounded-2xl border p-6 transition-all shadow-xs",
            draftGlobalWhatsApp
              ? "border-emerald-500/30 bg-emerald-50/20 ring-1 ring-emerald-500/10"
              : "border-slate-200 bg-slate-50/50 opacity-90",
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex shrink-0 size-11 items-center justify-center rounded-2xl font-black shadow-xs transition-colors p-1",
                    draftGlobalWhatsApp
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-500",
                  )}
                >
                  <MessageSquare className="size-5 shrink-0 p-1" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-secondary">
                      WhatsApp Business API
                    </h3>
                    <Badge
                      className={cn(
                        "border-0 text-[10px] font-black",
                        draftGlobalWhatsApp
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {draftGlobalWhatsApp ? "ACTIVE" : "DISABLED"}
                    </Badge>
                  </div>
                  <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                    Meta WABA & PinBot Connector
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={draftGlobalWhatsApp}
                  onCheckedChange={(val) => setDraftGlobalWhatsApp(val)}
                  className="scale-110"
                />
              </div>
            </div>

            <p className="mt-4 text-xs font-semibold text-slate-600 leading-relaxed">
              Global master switch for automated WhatsApp template notifications sent to client & staff phone numbers. When disabled, zero WhatsApp messages will be dispatched.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-200/60 pt-3 text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-emerald-600 shrink-0" />
              Approved Template Auto-Dispatch
            </span>
            <span className="text-slate-500 font-extrabold">
              {draftGlobalWhatsApp ? "Messaging Enabled" : "Messaging Paused"}
            </span>
          </div>
        </Card>
      </div>

      {/* Quick Controls & Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-y border-slate-200/80 py-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search event triggers (e.g. follow-up, lead, site visit)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-10 rounded-xl text-xs font-semibold border-slate-200 shadow-none bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSetAllChannels(true)}
            className="h-9 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100"
          >
            <CheckCheck className="mr-1.5 size-3.5 text-emerald-600" />
            Enable All Channels
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSetAllChannels(false)}
            className="h-9 rounded-xl text-xs font-bold text-slate-700 bg-slate-100/80 border-slate-200 hover:bg-slate-200"
          >
            <Ban className="mr-1.5 size-3.5 text-slate-500" />
            Disable All Channels
          </Button>
        </div>
      </div>

      {/* Categorized Event Matrix */}
      <div className="space-y-8">
        {filteredCategories.map((category) => {
          const CategoryIcon = category.icon;
          return (
            <Card
              key={category.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            >
              {/* Category Header Bar */}
              <div className="flex flex-col gap-3 bg-slate-50/80 p-5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <span className="flex shrink-0 size-9 items-center justify-center rounded-xl bg-white text-primary font-black shadow-2xs border border-slate-200/80 p-1">
                    <CategoryIcon className="size-4 shrink-0 p-1" />
                  </span>
                  <div>
                    <h2 className="text-base font-extrabold text-secondary leading-tight">
                      {category.title}
                    </h2>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Category Master Shortcuts */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBatchToggleCategory(category.id, "fcm", true)}
                    className="h-8 text-[11px] font-bold text-slate-700 hover:bg-white"
                  >
                    + All FCM
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBatchToggleCategory(category.id, "whatsapp", true)}
                    className="h-8 text-[11px] font-bold text-slate-700 hover:bg-white"
                  >
                    + All WhatsApp
                  </Button>
                </div>
              </div>

              {/* Event Rows */}
              <div className="divide-y divide-slate-100">
                {category.events.map((event) => {
                  const setting =
                    draftEventSettings[event.key] ||
                    DEFAULT_EVENT_SETTINGS[event.key] || {
                      fcmEnabled: true,
                      whatsappEnabled: true,
                    };

                  const effectiveFcm = draftGlobalFcm && setting.fcmEnabled;
                  const effectiveWhatsApp =
                    draftGlobalWhatsApp && setting.whatsappEnabled;

                  return (
                    <div
                      key={event.key}
                      className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Left Details */}
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-extrabold text-secondary">
                            {event.title}
                          </h3>
                          <Badge className="border-0 bg-slate-100 text-[10px] font-bold text-slate-700">
                            {event.key}
                          </Badge>
                          <Badge className="border-0 bg-blue-50 text-[10px] font-bold text-blue-700">
                            {event.badgeText}
                          </Badge>
                        </div>
                        <p className="text-xs font-semibold text-muted-foreground leading-relaxed">
                          {event.description}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">
                          Target Audience:{" "}
                          <span className="text-secondary font-extrabold">
                            {event.audience}
                          </span>
                        </p>
                      </div>

                      {/* Right Channel Controls */}
                      <div className="flex items-center gap-6 self-start md:self-center shrink-0 border-t border-slate-100 pt-3 md:border-t-0 md:pt-0">
                        {/* FCM Toggle Box */}
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-2.5 px-3.5 transition-colors min-w-[150px] justify-between",
                            effectiveFcm
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-slate-200 bg-slate-50/60",
                          )}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Smartphone className="size-3.5 text-slate-600 shrink-0" />
                              <span className="text-xs font-black text-secondary">
                                FCM Push
                              </span>
                            </div>
                            <p className="text-[10px] font-bold">
                              {!draftGlobalFcm ? (
                                <span className="text-amber-600">Global Off</span>
                              ) : setting.fcmEnabled ? (
                                <span className="text-emerald-700 flex items-center gap-0.5">
                                  <CheckCircle2 className="size-3 shrink-0 inline" /> Active
                                </span>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-0.5">
                                  <XCircle className="size-3 shrink-0 inline" /> Disabled
                                </span>
                              )}
                            </p>
                          </div>

                          <Switch
                            checked={setting.fcmEnabled}
                            onCheckedChange={(val) =>
                              handleToggleEventChannel(event.key, "fcm", val)
                            }
                            disabled={!draftGlobalFcm}
                          />
                        </div>

                        {/* WhatsApp Toggle Box */}
                        <div
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-2.5 px-3.5 transition-colors min-w-[150px] justify-between",
                            effectiveWhatsApp
                              ? "border-emerald-200 bg-emerald-50/30"
                              : "border-slate-200 bg-slate-50/60",
                          )}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <MessageSquare className="size-3.5 text-slate-600 shrink-0" />
                              <span className="text-xs font-black text-secondary">
                                WhatsApp
                              </span>
                            </div>
                            <p className="text-[10px] font-bold">
                              {!draftGlobalWhatsApp ? (
                                <span className="text-amber-600">Global Off</span>
                              ) : setting.whatsappEnabled ? (
                                <span className="text-emerald-700 flex items-center gap-0.5">
                                  <CheckCircle2 className="size-3 shrink-0 inline" /> Active
                                </span>
                              ) : (
                                <span className="text-slate-500 flex items-center gap-0.5">
                                  <XCircle className="size-3 shrink-0 inline" /> Disabled
                                </span>
                              )}
                            </p>
                          </div>

                          <Switch
                            checked={setting.whatsappEnabled}
                            onCheckedChange={(val) =>
                              handleToggleEventChannel(
                                event.key,
                                "whatsapp",
                                val,
                              )
                            }
                            disabled={!draftGlobalWhatsApp}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        {filteredCategories.length === 0 && (
          <Card className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <Search className="size-10 text-muted-foreground" />
            <h3 className="mt-3 text-base font-black text-secondary">
              No matching notification events found
            </h3>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Try searching with another keyword like 'follow-up', 'lead', or 'site visit'.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSearchQuery("")}
              className="mt-4 h-9 rounded-xl text-xs font-bold"
            >
              Clear Search Filter
            </Button>
          </Card>
        )}
      </div>

      {/* Floating Unsaved Changes Footer Bar */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/90 px-6 py-3.5 text-white shadow-2xl backdrop-blur-md w-11/12 max-w-2xl">
          <div className="flex items-center gap-2.5">
            <span className="flex size-3 rounded-full bg-amber-400 animate-ping" />
            <p className="text-xs font-extrabold text-slate-100">
              You have unsaved notification setting changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetToOriginal}
              className="h-9 rounded-xl px-3 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-9 rounded-xl px-4 text-xs font-black bg-primary text-white hover:bg-primary/90 shadow-md"
            >
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
