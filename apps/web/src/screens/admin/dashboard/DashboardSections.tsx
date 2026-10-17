import { displayReference } from "../../../common/displayReference";
import { useEffect, useMemo, useState } from "react";
import { getUserRoleLabel } from "../../../common/roleLabels";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CalendarPlus2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Download,
  MapPinned,
  Navigation,
  PhoneCall,
  Plus,
  RadioTower,
  ShieldAlert,
  Target,
  TriangleAlert,
} from "lucide-react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { usePlatformGoogleMaps } from "../../../common/queries/usePlatformGoogleMaps";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "ui";

import type { LiveFieldExecutiveLocation } from "../../field-executive/useFieldExecutive";
import type { AdminDashboardData } from "./useAdminDashboard";
import { DashboardPanel } from "./DashboardPanel";
import { dashboardCardClass } from "./dashboardStyles";

const defaultCenter = { lat: 19.076, lng: 72.8777 };

function getExecutiveCoordinates(
  tracking: LiveFieldExecutiveLocation["tracking"] | undefined,
) {
  const latitude = tracking?.latitude;
  const longitude = tracking?.longitude;
  return typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
    ? { lat: latitude, lng: longitude }
    : null;
}

function MapUpdater({ center, zoom }: { center: { lat: number; lng: number }; zoom: number }) {
  const map = useMap();
  const { lat, lng } = center;
  useEffect(() => {
    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(zoom);
    }
  }, [lat, lng, map, zoom]);
  return null;
}

const metricVisuals = {
  "follow-ups-due": {
    icon: ClipboardList,
    tone: "bg-blue-50 text-blue-700",
  },
  "overdue-follow-ups": {
    icon: TriangleAlert,
    tone: "bg-rose-50 text-rose-600",
  },
  "site-visits-pending": {
    icon: CalendarClock,
    tone: "bg-amber-50 text-amber-600",
  },
  "site-visits-completed": {
    icon: CheckCircle2,
    tone: "bg-emerald-50 text-emerald-600",
  },
  "bookings-today": {
    icon: BriefcaseBusiness,
    tone: "bg-orange-50 text-orange-600",
  },
  "teams-needing-attention": {
    icon: ShieldAlert,
    tone: "bg-sky-50 text-sky-600",
  },
} as const;

const quickActions = [
  {
    label: "Add lead",
    to: "/leads/all",
    state: { openAddLead: true },
    icon: Plus,
    tone: "bg-orange-50 text-orange-600",
  },
  {
    label: "Notify team",
    to: "/notifications",
    icon: Bell,
    tone: "bg-blue-50 text-blue-700",
  },
  {
    label: "Schedule visit",
    to: "/leads/site-visits",
    icon: CalendarPlus2,
    tone: "bg-indigo-50 text-indigo-700",
  },
  {
    label: "Create reminder",
    to: "/leads/follow-up",
    icon: Clock3,
    tone: "bg-violet-50 text-violet-700",
  },
  {
    label: "Export report",
    to: "/dashboard",
    icon: Download,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    label: "Add booking",
    to: "/bookings",
    icon: BriefcaseBusiness,
    tone: "bg-orange-50 text-orange-600",
  },
] as const;

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const formatRole = getUserRoleLabel;

function metricDirectionClass(direction: "up" | "down" | "neutral") {
  if (direction === "up") return "text-emerald-600";
  if (direction === "down") return "text-rose-600";
  return "text-slate-500";
}

function visitStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized.includes("completed") || normalized.includes("booked")) {
    return "bg-emerald-50 text-emerald-600";
  }
  if (normalized.includes("confirmed") || normalized.includes("progress")) {
    return "bg-blue-50 text-blue-700";
  }
  if (normalized.includes("cancelled")) {
    return "bg-rose-50 text-rose-600";
  }
  return "bg-amber-50 text-amber-600";
}

function agendaToneClass(
  tone: AdminDashboardData["todayAgenda"][number]["statusTone"],
) {
  if (tone === "success") return "bg-emerald-50 text-emerald-600";
  if (tone === "info") return "bg-blue-50 text-blue-700";
  if (tone === "danger") return "bg-rose-50 text-rose-600";
  return "bg-amber-50 text-amber-600";
}

function teamHealthTone(health: string) {
  if (health === "Critical") return "bg-rose-50 text-rose-600";
  if (health === "Attention") return "bg-amber-50 text-amber-600";
  return "bg-emerald-50 text-emerald-600";
}

function formatTrackingTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DashboardEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <RadioTower className="size-5" />
      </div>
      <p className="mt-4 text-sm font-extrabold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function SearchResultList({
  rows,
  selectedId,
  onSelect,
}: {
  rows: LiveFieldExecutiveLocation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="dashboard-executive-list grid gap-2">
      {rows.map((row) => {
        const isSelected = row.id === selectedId;
        const statusLabel = row.activeVisit?.checkedInAt
          ? "At site"
          : row.nextVisit
          ? "On route"
          : row.tracking?.isTracking
          ? "Available"
          : "Offline";
        const statusTone =
          statusLabel === "At site"
            ? "bg-emerald-50 text-emerald-600"
            : statusLabel === "On route"
            ? "bg-blue-50 text-blue-700"
            : statusLabel === "Available"
            ? "bg-violet-50 text-violet-700"
            : "bg-slate-100 text-slate-500";

        return (
          <Button
            key={row.id}
            type="button"
            variant="outline"
            aria-pressed={isSelected}
            onClick={() => onSelect(row.id)}
            className={cn(
              "h-auto w-full min-w-0 justify-start whitespace-normal rounded-lg border px-3 py-3 text-left transition",
              isSelected
                ? "border-primary/25 bg-primary/5 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <div className="flex w-full min-w-0 items-start gap-3">
              <Avatar className="size-10 border border-slate-200" style={{ width: 40, height: 40, minWidth: 40, minHeight: 40 }}>
                <AvatarImage src={row.image || undefined} alt={row.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <AvatarFallback className="bg-slate-100 text-xs font-bold text-slate-700">
                  {getInitials(row.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-sm font-bold text-slate-900">
                    {row.name}
                  </p>
                  <Badge className={cn("shrink-0 font-semibold", statusTone)}>
                    {statusLabel}
                  </Badge>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {row.activeVisit?.projectName ??
                    row.nextVisit?.projectName ??
                    "No active stop"}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-400">
                  Last sync {formatTrackingTime(row.tracking?.trackedAt)}
                </p>
                {row.activeVisit || row.nextVisit ? (
                  <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                    {row.activeVisit?.leadName ?? row.nextVisit?.leadName} |{" "}
                    {new Date(
                      row.activeVisit?.scheduledAt ?? row.nextVisit?.scheduledAt ?? ""
                    ).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                ) : null}
              </div>
            </div>
          </Button>
        );
      })}
    </div>
  );
}

function LiveExecutiveMap({
  rows,
  selectedId,
}: {
  rows: LiveFieldExecutiveLocation[];
  selectedId: string | null;
}) {
  const { apiKey } = usePlatformGoogleMaps();
  const selectedExecutive =
    rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const center =
    getExecutiveCoordinates(selectedExecutive?.tracking) ?? defaultCenter;

  if (!apiKey) {
    return (
      <DashboardEmptyState
        title="Live map unavailable"
        description="The platform map service is currently unavailable. Contact platform support if the issue continues."
      />
    );
  }

  return (
    <APIProvider key={apiKey} apiKey={apiKey}>
      <div className="dashboard-live-map min-w-0 overflow-hidden rounded-lg border border-border">
        <Map
          defaultCenter={center}
          defaultZoom={selectedExecutive ? 12 : 11}
          gestureHandling="cooperative"
          disableDefaultUI={false}
          mapId="live-executives-map"
        >
          <MapUpdater center={center} zoom={selectedExecutive ? 12 : 11} />
          {rows.map((row) => {
            const position = getExecutiveCoordinates(row.tracking);
            if (!position) return null;

            return (
              <AdvancedMarker
                key={row.id}
                position={position}
              >
                <div className="relative flex items-center justify-center">
                  <Avatar className="size-12 border-[3px] border-white shadow-md" style={{ width: 48, height: 48, minWidth: 48, minHeight: 48 }}>
                    <AvatarImage src={row.image || undefined} alt={row.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <AvatarFallback className="bg-slate-100 text-base font-bold text-slate-700">
                      {getInitials(row.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1.5 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-white bg-white" />
                </div>
              </AdvancedMarker>
            );
          })}
        </Map>
      </div>
    </APIProvider>
  );
}

export function DashboardQuickActions() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">Quick actions</h2>
      </div>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))]">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              asChild
              type="button"
              variant="outline"
              className="h-14 justify-start rounded-md border-slate-200 bg-white px-4 text-left shadow-none hover:bg-slate-50"
            >
              <Link to={action.to} state={"state" in action ? action.state : undefined}>
                <span
                  className={cn(
                    "mr-3 flex size-8 items-center justify-center rounded-md",
                    action.tone,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="truncate text-sm font-semibold text-slate-800">
                  {action.label}
                </span>
              </Link>
            </Button>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardMetricCards({
  rows,
}: {
  rows: AdminDashboardData["metricCards"];
}) {
  return (
    <section className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
      {rows.map((row) => {
        const visual = metricVisuals[row.id as keyof typeof metricVisuals];
        const Icon = visual?.icon ?? Target;
        return (
          <Card
            key={row.id}
            className={cn(
              dashboardCardClass,
              "min-w-0 overflow-hidden rounded-md px-3 py-3 shadow-none sm:px-4",
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11",
                  visual?.tone ?? "bg-slate-100 text-slate-600",
                )}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-slate-500">
                  {row.label}
                </p>
                <div className="mt-1 flex min-w-0 items-center gap-2">
                  <p className="truncate text-xl font-extrabold leading-none text-slate-900 sm:text-2xl">
                    {row.value.toLocaleString("en-IN")}
                  </p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-0.5 text-xs font-bold",
                      metricDirectionClass(row.direction),
                    )}
                  >
                    {row.direction === "up" ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : row.direction === "down" ? (
                      <ArrowDownRight className="size-3.5" />
                    ) : null}
                    {row.change}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] font-medium text-slate-400">
                  {row.helper}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

export function LiveExecutiveTrackingPanel({
  rows,
}: {
  rows: LiveFieldExecutiveLocation[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  const selectedExecutive =
    rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const selectedPosition = getExecutiveCoordinates(selectedExecutive?.tracking);
  const selectedMapLink = selectedPosition
    ? `https://www.google.com/maps/search/?api=1&query=${selectedPosition.lat},${selectedPosition.lng}`
    : null;

  const stats = useMemo(() => {
    const total = rows.length;
    const atSite = rows.filter((row) => Boolean(row.activeVisit?.checkedInAt)).length;
    const onField = rows.filter((row) => row.tracking?.isTracking).length;
    const onRoute = rows.filter(
      (row) => row.tracking?.isTracking && !row.activeVisit?.checkedInAt && row.nextVisit,
    ).length;
    const available = rows.filter(
      (row) => row.tracking?.isTracking && !row.activeVisit?.checkedInAt && !row.nextVisit,
    ).length;
    const offline = rows.filter((row) => !row.tracking?.isTracking).length;

    return {
      total,
      onField,
      atSite,
      onRoute,
      available,
      offline,
    };
  }, [rows]);

  return (
    <DashboardPanel
      title="Live executive tracking"
      subtitle="Real-time"
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/leads/site-visits">View all</Link>
        </Button>
      }
      className="dashboard-tracking-panel rounded-lg"
    >
      {rows.length ? (
        <div className="space-y-4">
          <div className="dashboard-tracking-grid grid min-w-0 gap-4">
            <LiveExecutiveMap rows={rows} selectedId={selectedId} />
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-slate-500">
                    Active executives ({stats.onField})
                  </p>
                </div>
                {selectedMapLink ? (
                  <Button asChild type="button" variant="outline" size="sm" className="h-8 px-3 text-xs">
                    <a href={selectedMapLink} target="_blank" rel="noreferrer">
                      <Navigation className="mr-1 size-3.5" />
                      Open map
                    </a>
                  </Button>
                ) : null}
              </div>
              <div className="dashboard-executive-scroll overflow-y-auto overscroll-contain rounded-lg pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} role="region" aria-label="Executive locations">
                <SearchResultList
                  rows={rows}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 sm:grid-cols-5">
            <div>
              <p className="text-[11px] font-bold text-slate-500">Total executives</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{stats.total}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500">On field</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{stats.onField}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500">At site</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{stats.atSite}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500">Available</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{stats.available + stats.onRoute}</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500">Offline</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">{stats.offline}</p>
            </div>
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          title="No live executive tracking"
          description="Field-executive location pings will appear here once live tracking is active."
        />
      )}
    </DashboardPanel>
  );
}

export function PendingFollowUpsPanel({
  rows,
}: {
  rows: AdminDashboardData["pendingFollowUps"];
}) {
  return (
    <DashboardPanel
      title="Pending follow-ups"
      subtitle={`${rows.length} pending`}
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/leads/follow-up">View all</Link>
        </Button>
      }
      className="rounded-lg"
      contentClassName="space-y-3"
    >
      {rows.length ? (
        <>
        <div className="dashboard-follow-up-scroll overflow-y-auto overscroll-contain rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" tabIndex={0} role="region" aria-label="Pending follow-up preview">
          {rows.slice(0, 4).map((row) => (
            <div
              key={row.id}
              className="min-w-0 border-b border-border bg-card p-3 last:border-b-0"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <Link
                      to={`/leads/${row.leadId}`}
                      className="min-w-0 flex-1 break-words rounded text-sm font-bold text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {row.leadName}
                    </Link>
                <Badge variant={row.isOverdue ? "danger" : "warning"} className="shrink-0">
                  {row.isOverdue ? "Overdue" : "Due today"}
                </Badge>
              </div>
              <p className="mt-1 break-words text-xs text-muted-foreground">{displayReference(row.leadDisplayId, "Lead")}</p>
              <p className="mt-2 line-clamp-2 break-words text-sm text-foreground" title={row.nextAction}>{row.nextAction}</p>
              <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="size-6 shrink-0" style={{ width: 24, height: 24, minWidth: 24, minHeight: 24, maxWidth: 24, maxHeight: 24 }}>
                  <AvatarImage src={row.assignedToImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <AvatarFallback className="text-xs">{getInitials(row.assignedToName)}</AvatarFallback>
                </Avatar>
                <p className="min-w-0 break-words">{row.assignedToName} <span>({formatRole(row.assignedToRole)})</span></p>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <p className="text-xs text-muted-foreground">{row.dueLabel}</p>
                <div className="ml-auto flex items-center gap-1">
                <Button asChild type="button" variant="ghost" size="icon" className="size-10 rounded-md text-muted-foreground">
                  <Link to="/notifications" aria-label={`Notify ${row.assignedToName}`}>
                    <Bell className="size-4" />
                  </Link>
                </Button>
                <Button asChild type="button" variant="ghost" size="icon" className="size-10 rounded-md text-muted-foreground">
                  <Link to="/leads/follow-up" aria-label={`Remind ${row.assignedToName}`}>
                    <Clock3 className="size-4" />
                  </Link>
                </Button>
                <Button asChild type="button" variant="ghost" size="icon" className="size-10 rounded-md text-success">
                  <Link to={`/leads/${row.leadId}`} aria-label={`Open ${row.leadName}`}>
                    <PhoneCall className="size-4" />
                  </Link>
                </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Showing {Math.min(rows.length, 4)} of {rows.length} pending follow-ups. Use View all for the complete list.</p>
        </>
      ) : (
        <DashboardEmptyState
          title="No pending follow-ups"
          description="Open follow-up items that need immediate admin attention will appear here."
        />
      )}
    </DashboardPanel>
  );
}

export function TodayAgendaPanel({
  rows,
}: {
  rows: AdminDashboardData["todayAgenda"];
}) {
  return (
    <DashboardPanel
      title="Today's agenda"
      subtitle={`${rows.length} items`}
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/leads/site-visits">View all</Link>
        </Button>
      }
      className="rounded-md"
    >
      {rows.length ? (
        <div className="space-y-3">
          {rows.slice(0, 5).map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-start gap-3"
            >
              <div>
                <p className="text-xs font-bold text-slate-500">{row.time}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {row.type}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {row.title}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Avatar className="size-4" style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }}>
                    <AvatarImage src={row.assigneeImage} alt={row.assigneeName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <AvatarFallback className="bg-slate-100 text-[8px] font-bold text-slate-700">
                      {getInitials(row.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="truncate text-[11px] text-slate-400">
                    {row.assigneeName}
                  </p>
                </div>
              </div>
              <Badge className={cn("font-semibold", agendaToneClass(row.statusTone))}>
                {row.statusLabel}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <DashboardEmptyState
          title="No agenda items"
          description="Today's calls, visits, and team checkpoints will appear here."
        />
      )}
    </DashboardPanel>
  );
}

export function ConversionTrendPanel({
  data,
}: {
  data: AdminDashboardData["conversionTrend"];
}) {
  const chartRows = data.currentWeek.map((item, index) => ({
    label: item.label,
    thisWeek: item.rate,
    lastWeek: data.previousWeek[index]?.rate ?? 0,
  }));

  return (
    <DashboardPanel
      title="Lead conversion trend"
      action={
        <Badge className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          This week
        </Badge>
      }
      className="rounded-md"
    >
      <div className="mb-2">
        <p className="text-4xl font-extrabold leading-none text-slate-900">
          {data.summaryRate}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Conversion rate
        </p>
        <p className="mt-1 text-xs font-bold text-emerald-600">
          {data.summaryChange}
        </p>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="thisWeek"
              stroke="#2563eb"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="This week"
            />
            <Line
              type="monotone"
              dataKey="lastWeek"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 2.5 }}
              name="Last week"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DashboardPanel>
  );
}

export function UpcomingSiteVisitsPanel({
  rows,
}: {
  rows: AdminDashboardData["upcomingSiteVisits"];
}) {
  return (
    <DashboardPanel
      title="Upcoming site visits"
      subtitle={`${rows.length} upcoming`}
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/leads/site-visits">View all</Link>
        </Button>
      }
      className="rounded-md"
    >
      {rows.length ? (
        <div className="space-y-3">
          {rows.slice(0, 4).map((row) => (
            <Link
              key={row.id}
              to={`/site-visits/${row.id}`}
              className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-start gap-3 rounded-md border border-slate-200 p-3 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="h-16 w-[88px] shrink-0 overflow-hidden rounded-md bg-slate-100">
                {row.projectImage ? (
                  <img
                    src={row.projectImage}
                    alt={row.projectName}
                    className="block h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <MapPinned className="size-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {row.projectName}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                  {row.leadName}
                </p>
                <div className="mt-1 hidden items-center gap-1.5 sm:flex">
                  <Avatar className="size-4" style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }}>
                    <AvatarImage src={row.assigneeImage} alt={row.assigneeName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <AvatarFallback className="bg-slate-100 text-[8px] font-bold text-slate-700">
                      {getInitials(row.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="truncate text-xs font-semibold text-slate-500">
                    {row.assigneeName} • {row.scheduledLabel}
                  </p>
                </div>
              </div>
              <Badge
                className={cn(
                  "self-start whitespace-nowrap font-semibold",
                  visitStatusTone(row.status),
                )}
              >
                {row.status}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <DashboardEmptyState
          title="No upcoming site visits"
          description="Confirmed and scheduled upcoming visits will appear here."
        />
      )}
    </DashboardPanel>
  );
}

export function TeamPerformancePanel({
  rows,
}: {
  rows: AdminDashboardData["teamPerformance"];
}) {
  return (
    <DashboardPanel
      title="Team performance"
      subtitle="Operational team ranking"
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/admin/teams">View all</Link>
        </Button>
      }
      contentClassName="overflow-x-auto"
      className="rounded-md"
    >
      {rows.length ? (
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200">
              <TableHead className="h-10 whitespace-nowrap px-3 text-[11px] font-extrabold text-slate-500">
                Team
              </TableHead>
              <TableHead className="h-10 whitespace-nowrap px-3 text-[11px] font-extrabold text-slate-500">
                Leads assigned
              </TableHead>
              <TableHead className="h-10 whitespace-nowrap px-3 text-[11px] font-extrabold text-slate-500">
                Follow-up done
              </TableHead>
              <TableHead className="h-10 whitespace-nowrap px-3 text-[11px] font-extrabold text-slate-500">
                Overdue
              </TableHead>
              <TableHead className="h-10 whitespace-nowrap px-3 text-[11px] font-extrabold text-slate-500">
                Visit today
              </TableHead>
              <TableHead className="h-10 whitespace-nowrap px-3 text-[11px] font-extrabold text-slate-500">
                Conversion
              </TableHead>
              <TableHead className="h-10 whitespace-nowrap px-3 text-[11px] font-extrabold text-slate-500">
                Health
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const teamTarget =
                row.id === "unassigned" ? "/admin/teams" : `/admin/teams/${row.id}`;

              return (
                <TableRow key={row.id} className="border-slate-100">
                  <TableCell className="px-3 py-3">
                    <div className="min-w-[180px]">
                      <Link
                        to={teamTarget}
                        className="text-sm font-bold text-slate-900 transition-colors hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        {row.leaderName}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-slate-700">
                    {row.assignedLeads}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-slate-700">
                    {row.followUpsDone}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-rose-600">
                    {row.overdueFollowUps}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-slate-700">
                    {row.todaySiteVisitsCompleted}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3 text-sm font-semibold text-slate-700">
                    {row.conversionRate}
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-3 py-3">
                    <Badge className={cn("font-semibold", teamHealthTone(row.health))}>
                      {row.health === "On Track" ? "Excellent" : row.health === "Attention" ? "Average" : "Needs attention"}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <DashboardEmptyState
          title="No team operations found"
          description="Team-level lead, follow-up, and site-visit performance will appear here."
        />
      )}
    </DashboardPanel>
  );
}

export function AlertsPanel({
  rows,
}: {
  rows: AdminDashboardData["alerts"];
}) {
  return (
    <DashboardPanel
      title="Operational alerts"
      subtitle={`${rows.length} alerts`}
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/notifications">View all</Link>
        </Button>
      }
      className="rounded-md"
    >
      {rows.length ? (
        <div className="space-y-3">
          {rows.slice(0, 5).map((row) => (
            <div
              key={`${row.title}-${row.time}`}
              className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3"
            >
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-full",
                  row.tone === "danger"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-amber-50 text-amber-600",
                )}
              >
                {row.tone === "danger" ? (
                  <TriangleAlert className="size-4" />
                ) : (
                  <Bell className="size-4" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate text-sm font-bold",
                    row.tone === "danger" ? "text-rose-600" : "text-amber-700",
                  )}
                >
                  {row.title}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {row.subtitle}
                </p>
              </div>
              <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                {row.time}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <DashboardEmptyState
          title="No operational alerts"
          description="Important system and CRM alerts will appear here when action is required."
        />
      )}
    </DashboardPanel>
  );
}

export function RemindersPanel({
  rows,
}: {
  rows: AdminDashboardData["reminders"];
}) {
  return (
    <DashboardPanel
      title="Reminders"
      subtitle={`${rows.length} active`}
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/leads/follow-up">View all</Link>
        </Button>
      }
      className="rounded-md"
    >
      {rows.length ? (
        <div className="space-y-3">
          {rows.slice(0, 4).map((row) => (
            <div
              key={row.id}
              className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-3"
            >
              <span className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                <Clock3 className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">
                  {row.title}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Avatar className="size-4" style={{ width: 16, height: 16, minWidth: 16, minHeight: 16 }}>
                    <AvatarImage src={row.assigneeImage} alt={row.assigneeName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <AvatarFallback className="bg-slate-100 text-[8px] font-bold text-slate-700">
                      {getInitials(row.assigneeName)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="truncate text-xs font-medium text-slate-500">
                    {row.leadName} • {row.assigneeName}
                  </p>
                </div>
              </div>
              <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                {row.scheduledLabel}
              </span>
            </div>
          ))}
          <Button asChild type="button" variant="ghost" className="w-full justify-center rounded-md border border-dashed border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Link to="/leads/follow-up">
              <Plus className="mr-1 size-4" />
              Add reminder
            </Link>
          </Button>
        </div>
      ) : (
        <DashboardEmptyState
          title="No reminders"
          description="Scheduled operational reminders will appear here."
        />
      )}
    </DashboardPanel>
  );
}

export function LeadsBySourceChart({
  data,
}: {
  data: AdminDashboardData["sourceDistribution"];
}) {
  const total = data.reduce((sum, source) => sum + source.value, 0);
  const hasData = data.some((source) => source.value > 0);

  return (
    <DashboardPanel
      title="Leads by source"
      action={
        <Badge className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          This month
        </Badge>
      }
      className="rounded-md"
    >
      {hasData ? (
        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
          <div className="relative mx-auto h-[230px] w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height={230}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={1}
                  startAngle={90}
                  endAngle={-270}
                  stroke="#fff"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {data.map((source) => (
                    <Cell key={source.name} fill={source.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => Number(value).toLocaleString("en-IN")} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <strong className="text-3xl font-extrabold leading-none text-slate-900">
                {total.toLocaleString("en-IN")}
              </strong>
              <span className="mt-2 text-sm font-semibold text-slate-500">
                Total leads
              </span>
            </div>
          </div>
          <ul className="space-y-3">
            {data.map((source) => (
              <li
                key={source.name}
                className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3 text-sm"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: source.color }}
                />
                <span className="truncate font-semibold text-slate-700">
                  {source.name}
                </span>
                <span className="whitespace-nowrap font-bold text-slate-900">
                  {source.value} ({source.percent})
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <DashboardEmptyState
          title="No source performance yet"
          description="Lead source distribution will appear here for the selected range."
        />
      )}
    </DashboardPanel>
  );
}

export function LeadFunnelChart({
  data,
}: {
  data: AdminDashboardData["conversionFunnel"];
}) {
  const hasData = data.some((item) => Number(String(item.value).replace(/,/g, "")) > 0);

  return (
    <DashboardPanel
      title="Lead funnel"
      action={
        <Badge className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          This month
        </Badge>
      }
      className="rounded-md"
    >
      {hasData ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-center">
          <div className="flex flex-col items-center justify-center gap-2 py-2">
            {data.map((item) => (
              <div
                key={item.stage}
                className="h-[34px]"
                style={{
                  width: item.width,
                  backgroundColor: item.color,
                  clipPath: "polygon(4% 0, 96% 0, 88% 100%, 12% 100%)",
                }}
              />
            ))}
          </div>
          <div className="space-y-3">
            {data.map((item) => (
              <div
                key={item.stage}
                className="grid grid-cols-[1fr_auto] items-center gap-3"
              >
                <span className="text-sm font-semibold text-slate-700">
                  {item.stage}
                </span>
                <span className="whitespace-nowrap text-sm font-bold text-slate-900">
                  {item.value}
                  {item.percent ? ` (${item.percent})` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <DashboardEmptyState
          title="No funnel activity yet"
          description="Lead funnel progression will appear here for the selected range."
        />
      )}
    </DashboardPanel>
  );
}

export function RecentActivityPanel({
  rows,
}: {
  rows: AdminDashboardData["recentActivity"];
}) {
  return (
    <DashboardPanel
      title="Recent activity"
      action={
        <Button
          asChild
          type="button"
          variant="ghost"
          className="h-8 px-0 text-xs font-bold text-primary hover:bg-transparent hover:text-primary/80"
        >
          <Link to="/notifications">View all</Link>
        </Button>
      }
      className="rounded-md"
    >
      {rows.length ? (
        <div className="space-y-3">
          {rows.slice(0, 5).map((row) => (
            <div key={row.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-start gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Target className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900">
                  {row.title}
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                  {row.subtitle}
                </p>
              </div>
              <span className="whitespace-nowrap text-[11px] font-medium text-slate-400">
                {row.occurredLabel}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <DashboardEmptyState
          title="No recent activity"
          description="CRM activity updates will appear here as teams work through leads and visits."
        />
      )}
    </DashboardPanel>
  );
}
