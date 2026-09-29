import {
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  IndianRupee,
  Info,
  MapPin,
  MoreVertical,
  Navigation,
  Plus,
  RefreshCw,
  Search,
  SquareArrowOutUpRight,
  Star,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  DataTable,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  ScrollArea,
  SearchInput,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  type ColumnDef,
} from "ui";

import { api } from "../../../../common/api";
import { getApiErrorMessage } from "../../../../common/apiError";
import {
  ExecutiveCell,
  LeadCell,
  ProjectCell,
} from "../../../../common/components/DataTableCells";
import {
  formatDateForDisplay,
  formatTimeForDisplay,
  scheduledInputToIso,
} from "../../../../common/time";
import { fieldExecutiveSidebarItems } from "../../../field-executive/fieldExecutiveData";
import {
  buildFieldExecutiveSiteVisitPath,
  isFieldExecutivePath,
} from "../../../field-executive/fieldExecutiveRouteContext";
import { useVisitAttendance } from "../../../field-executive/useFieldExecutive";
import {
  getFirstInventoryImage,
  normalizeBookingAmountInput,
  toRupeeAmount,
} from "../../bookings/bookingUiUtils";
import { useBookingMutations } from "../../bookings/useBookings";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import {
  findProjectById,
  formatProjectUnitLabel,
  getUnitById as getLiveUnitById,
  getUnitsByProjectId as getLiveUnitsByProjectId,
  resolveProjectUnitFromProjects,
} from "../../projects/projectCatalogUtils";
import { formatUnitLabel } from "../../projects/projectsData";
import { addLeadSidebarItems } from "../add/addLeadData";
import { ClockTimePicker } from "../assignment/ClockTimePicker";
import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import { leadDetailsData } from "../details/leadDetailsData";
import type {
  SiteVisitItem,
  SiteVisitStatus,
} from "../details/leadDetailsTypes";
import {
  useSiteVisitMutations,
  useSiteVisitOptions,
  useSiteVisits,
  type ApiSiteVisitRow,
  type SiteVisitOptionsResponse,
} from "./useSiteVisits";

type SiteVisitBucket =
  | "all"
  | "upcoming"
  | "scheduled"
  | "completed"
  | "cancelled";

type VisitOutcome =
  | "Interested"
  | "Needs Follow-up"
  | "Ready for Booking"
  | "Not Interested";

export interface SiteVisitRow extends SiteVisitItem {
  leadId: string;
  leadDisplayId: string;
  leadName: string;
  leadPhone: string;
  leadSource: string;
  leadStatus: string;
  leadStage: string;
  owner: string;
  assignedExecutiveId?: string;
  assignedExecutiveImage?: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  projectLatitude?: number | null;
  projectLongitude?: number | null;
  projectGeofenceRadiusM?: number | null;
}

export interface CreateVisitFormState {
  leadId: string;
  projectId: string;
  unitId: string;
  date: string;
  time: string;
  visitType: SiteVisitItem["visitType"];
  meetingPoint: string;
  durationMinutes: string;
  transportMode: string;
  visitorCount: string;
  specialRequest: string;
}

const siteVisitTabs: Array<{ id: SiteVisitBucket; label: string }> = [
  { id: "all", label: "All Visits" },
  { id: "upcoming", label: "Upcoming" },
  { id: "scheduled", label: "Scheduled" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

const visitTypeOptions: Array<{
  value: SiteVisitItem["visitType"];
  label: string;
}> = [
  { value: "Site Visit", label: "Site Visit" },
  { value: "Re-Visit", label: "Re-Visit" },
  { value: "Virtual Visit", label: "Virtual Visit" },
];

const durationOptions = [
  { value: "30", label: "30 Minutes" },
  { value: "45", label: "45 Minutes" },
  { value: "60", label: "60 Minutes" },
  { value: "90", label: "90 Minutes" },
  { value: "120", label: "120 Minutes" },
];

const transportOptions = [
  { value: "Own Vehicle", label: "Own Vehicle" },
  { value: "Company Cab", label: "Company Cab" },
  { value: "Client Pickup", label: "Client Pickup" },
  { value: "Video Call", label: "Video Call" },
];

const visitorCountOptions = [
  { value: "1", label: "1 Visitor" },
  { value: "2", label: "2 Visitors" },
  { value: "3", label: "3 Visitors" },
  { value: "4", label: "4 Visitors" },
  { value: "5", label: "5+ Visitors" },
];

const visitTimeOptions = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "03:00 PM",
  "06:00 PM",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRawIdentifier = (value?: string | null) =>
  Boolean(value && (uuidPattern.test(value) || value.length > 28));

const formatSiteVisitReference = (value?: string | null) =>
  value && !isRawIdentifier(value) ? value : "Site visit";

const resolveAssigneeName = (
  value?: string | null,
  fallback?: string | null,
) => {
  if (value && !isRawIdentifier(value)) return value;
  if (fallback && !isRawIdentifier(fallback)) return fallback;
  return "Unassigned";
};

const normalizeVisitType = (
  value?: string | null,
): SiteVisitItem["visitType"] => {
  if (value === "Re-Visit" || value === "Virtual Visit") return value;
  return "Site Visit";
};

const additionalRows: SiteVisitRow[] = [
  {
    id: "SV-1011",
    leadId: "TR001243",
    leadDisplayId: "TR001243",
    leadName: "Vikram Singh",
    leadPhone: "+91 99876 54321",
    leadSource: "Google Ads",
    leadStatus: "Site Visit",
    leadStage: "Site Visit",
    owner: "Aditya Patil",
    status: "Upcoming",
    projectId: "skyline-enclave",
    unitId: "skyline-c-702",
    visitType: "Site Visit",
    date: "22 May 2025",
    time: "02:00 PM",
    project: "Skyline Enclave",
    unit: "Tower C, Unit 702",
    location: "Skyline Enclave, Goregaon (E), Mumbai",
    assignedExecutive: "Amit Joshi",
    duration: "60 Minutes",
    meetingPoint: "Sales Gallery",
    transportMode: "Company Cab",
    visitors: "2",
    specialRequest: "Client requested parking near the sample flat.",
    notes: "High-intent buyer, compare with Ocean Heights.",
    reminder: { enabled: true, date: "22 May 2025", time: "11:00 AM" },
    createdAt: "21 May 2025, 04:10 PM",
  },
  {
    id: "SV-1010",
    leadId: "TR001238",
    leadDisplayId: "TR001238",
    leadName: "Neha Kapoor",
    leadPhone: "+91 91234 77880",
    leadSource: "99acres",
    leadStatus: "Interested",
    leadStage: "Interested",
    owner: "Pooja Sharma",
    status: "Scheduled",
    projectId: "lakeview-residency",
    unitId: "lake-b-504",
    visitType: "Virtual Visit",
    date: "23 May 2025",
    time: "05:00 PM",
    project: "Lakeview Residency",
    unit: "3 BHK Sample Unit",
    location: "Lakeview Residency, Powai, Mumbai",
    assignedExecutive: "Sneha Iyer",
    duration: "45 Minutes",
    meetingPoint: "Video call",
    transportMode: "Video Call",
    visitors: "1",
    notes: "Wants a virtual walkthrough before weekend physical visit.",
    reminder: { enabled: true, date: "23 May 2025", time: "03:30 PM" },
    createdAt: "21 May 2025, 01:20 PM",
  },
  {
    id: "SV-1009",
    leadId: "TR001229",
    leadDisplayId: "TR001229",
    leadName: "Amit Singh",
    leadPhone: "+91 99215 65432",
    leadSource: "MagicBricks",
    leadStatus: "Negotiation",
    leadStage: "Negotiation",
    owner: "Rahul Sharma",
    status: "Completed",
    projectId: "palm-springs",
    unitId: "palm-d-1102",
    visitType: "Re-Visit",
    date: "19 May 2025",
    time: "12:30 PM",
    project: "Palm Springs",
    unit: "Tower D, Unit 1102",
    location: "Palm Springs, Andheri (W), Mumbai",
    assignedExecutive: "Rahul Mehta",
    duration: "90 Minutes",
    meetingPoint: "Tower D Lobby",
    visitors: "3",
    notes: "Family approved layout. Next step is pricing negotiation.",
    feedback: "Positive revisit, manager follow-up needed.",
    reminder: { enabled: false, date: "", time: "" },
    createdAt: "18 May 2025, 06:45 PM",
  },
];

const baseRows: SiteVisitRow[] = leadDetailsData.siteVisits.visits.map(
  (visit) => ({
    ...visit,
    leadId: leadDetailsData.profile.id,
    leadDisplayId: leadDetailsData.profile.id,
    leadName: leadDetailsData.profile.name,
    leadPhone: leadDetailsData.profile.phone,
    leadSource: leadDetailsData.profile.source,
    leadStatus: leadDetailsData.profile.status,
    leadStage: leadDetailsData.profile.stage,
    owner: leadDetailsData.profile.assignedTo,
  }),
);

const siteVisitRows = [...baseRows, ...additionalRows];

const formatApiVisitDate = (value?: string) => {
  return {
    date: formatDateForDisplay(value),
    time: formatTimeForDisplay(value),
  };
};

const distanceMeters = (
  fromLatitude: number,
  fromLongitude: number,
  toLatitude: number,
  toLongitude: number,
) => {
  const earthRadiusM = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(toLatitude - fromLatitude);
  const dLng = toRad(toLongitude - fromLongitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(fromLatitude)) *
      Math.cos(toRad(toLatitude)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return Math.round(
    2 * earthRadiusM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
  );
};

const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;

const mapApiVisit = (
  visit: ApiSiteVisitRow,
  projects: SiteVisitOptionsResponse["projects"],
): SiteVisitRow => {
  const scheduled = formatApiVisitDate(visit.scheduledAt);
  const reminder = formatApiVisitDate(visit.reminderAt);
  const resolved = resolveProjectUnitFromProjects(projects, {
    projectId: visit.projectId,
    unitId: visit.unitId,
    projectName: visit.projectName,
    unitLabel: visit.unitLabel,
  });
  const projectOwner = resolved.project?.salesOwner;
  const executiveName = resolveAssigneeName(
    visit.assignedExecutiveName ?? visit.assignedExecutiveId,
    projectOwner,
  );
  return {
    id: visit.displayId ?? visit.id,
    leadId: visit.leadId,
    leadDisplayId: visit.leadDisplayId ?? visit.leadId,
    leadName: visit.leadName ?? "Lead",
    leadPhone: visit.leadPhone ?? "-",
    leadSource: visit.leadSource ?? "-",
    leadStatus: visit.leadStatus ?? visit.leadStage ?? "-",
    leadStage: visit.leadStage ?? "-",
    assignedExecutiveId: visit.assignedExecutiveId,
    assignedExecutiveImage: visit.assignedExecutiveImage,
    owner: projectOwner ?? executiveName,
    status: visit.status,
    projectId: resolved.projectId,
    unitId: resolved.unitId,
    visitType: normalizeVisitType(visit.visitType),
    date: scheduled.date,
    time: scheduled.time,
    project: resolved.projectName,
    unit: resolved.unitLabel,
    location: resolved.project
      ? `${resolved.project.name}, ${resolved.project.location}`
      : visit.projectName ?? "-",
    assignedExecutive: executiveName,
    duration: visit.durationMinutes ? `${visit.durationMinutes} Minutes` : "-",
    meetingPoint: visit.meetingPoint ?? "-",
    transportMode: visit.transportMode ?? "-",
    visitors: visit.visitorCount ? String(visit.visitorCount) : "1",
    specialRequest: visit.specialRequest ?? "",
    notes: visit.notes ?? "",
    checkedInAt: visit.checkedInAt ?? null,
    checkedOutAt: visit.checkedOutAt ?? null,
    projectLatitude:
      visit.projectLatitude === null || visit.projectLatitude === undefined
        ? resolved.project?.latitude === null ||
          resolved.project?.latitude === undefined
          ? null
          : Number(resolved.project.latitude)
        : Number(visit.projectLatitude),
    projectLongitude:
      visit.projectLongitude === null || visit.projectLongitude === undefined
        ? resolved.project?.longitude === null ||
          resolved.project?.longitude === undefined
          ? null
          : Number(resolved.project.longitude)
        : Number(visit.projectLongitude),
    projectGeofenceRadiusM:
      visit.projectGeofenceRadiusM ?? resolved.project?.geofenceRadiusM ?? 150,
    feedback: visit.feedback ?? "",
    rating: visit.rating ?? null,
    reminder: {
      enabled: Boolean(visit.reminderEnabled),
      date: reminder.date,
      time: reminder.time,
    },
    createdAt: visit.createdAt,
  };
};

const getBucket = (visit: SiteVisitRow): Exclude<SiteVisitBucket, "all"> => {
  switch (visit.status) {
    case "Upcoming":
      return "upcoming";
    case "Scheduled":
      return "scheduled";
    case "Completed":
      return "completed";
    case "Cancelled":
      return "cancelled";
  }
};

const getPosition = (onSuccess: (position: GeolocationPosition) => void) => {
  if (!navigator.geolocation) {
    toast.error("Geolocation is not available in this browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    () => toast.error("Location permission is required"),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
};

const getPositionAsync = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
    });
  });

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 shadow-card",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function StatusBadge({ status }: { status: SiteVisitStatus }) {
  const className =
    status === "Completed"
      ? "bg-green-50 text-success"
      : status === "Cancelled"
      ? "bg-red-50 text-red-600"
      : status === "Upcoming"
      ? "bg-blue-50 text-blue-700"
      : "bg-orange-50 text-primary";

  return (
    <Badge className={cn("border-0 text-[11px] font-extrabold", className)}>
      {status}
    </Badge>
  );
}

function SiteVisitsTable({
  rows,
  allRows,
  activeTab,
  onTabChange,
  onStatusChange,
  fieldExecutiveRoute,
  currentPosition,
  startedVisitIds,
  onStartVisit,
  onUndoStartVisit,
  onCheckIn,
  onCheckOut,
}: {
  rows: SiteVisitRow[];
  allRows: SiteVisitRow[];
  activeTab: SiteVisitBucket;
  onTabChange: (tab: SiteVisitBucket) => void;
  onStatusChange: (visit: SiteVisitRow, status: SiteVisitStatus) => void;
  fieldExecutiveRoute: boolean;
  currentPosition?: GeolocationPosition | null;
  startedVisitIds: ReadonlySet<string>;
  onStartVisit: (visit: SiteVisitRow) => void;
  onUndoStartVisit: (visit: SiteVisitRow) => void;
  onCheckIn: (visit: SiteVisitRow) => void;
  onCheckOut: (visit: SiteVisitRow) => void;
}) {
  const navigate = useNavigate();
  const activeTabOption = siteVisitTabs.find((tab) => tab.id === activeTab);

  const columns = useMemo<ColumnDef<SiteVisitRow>[]>(
    () => [
      {
        header: "Lead Details",
        cell: (visit) => {
          const leadRouteId =
            visit.leadDisplayId && !isRawIdentifier(visit.leadDisplayId)
              ? visit.leadDisplayId
              : visit.leadId;
          return (
            <LeadCell
              id={leadRouteId}
              displayId={visit.leadDisplayId}
              name={visit.leadName}
              phone={visit.leadPhone}
              avatarSeed={visit.leadId}
              hideLeadCode
            />
          );
        },
      },
      {
        header: "Visit Schedule",
        headerClassName: "min-w-[190px]",
        className: "min-w-[190px]",
        cell: (visit) => (
          <div className="min-w-[170px]">
            <p className="text-xs font-extrabold text-secondary">
              {visit.date}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {visit.time} - {visit.duration}
            </p>
          </div>
        ),
      },
      {
        header: "Project & Location",
        cell: (visit) => (
          <ProjectCell
            id={visit.projectId}
            name={visit.project}
            unitLabel={visit.unit || visit.location}
          />
        ),
      },
      {
        header: "Executive",
        cell: (visit) => (
          <ExecutiveCell
            id={visit.assignedExecutiveId}
            name={visit.assignedExecutive}
            email={`Owner: ${visit.owner}`}
            image={visit.assignedExecutiveImage}
          />
        ),
      },
      {
        header: "Visit Type",
        cell: (visit) => (
          <Badge className="border-0 bg-slate-100 px-3 py-1 text-xs font-extrabold text-secondary">
            {visit.visitType}
          </Badge>
        ),
      },
      {
        header: "Status",
        cell: (visit) => (
          <div>
            <StatusBadge status={visit.status} />
            {visit.rating ? (
              <div className="mt-1 flex items-center gap-1">
                <span className="flex items-center text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-3 w-3",
                        i < (visit.rating ?? 0)
                          ? "fill-amber-400 text-amber-500"
                          : "fill-slate-200 text-slate-200",
                      )}
                    />
                  ))}
                </span>
                <span className="text-[11px] font-bold text-slate-700">
                  {visit.rating}/5
                </span>
              </div>
            ) : null}
          </div>
        ),
      },
      {
        header: "Visit Action",
        headerClassName: "min-w-[190px]",
        className: "min-w-[190px]",
        cell: (visit: SiteVisitRow) => {
          if (fieldExecutiveRoute) {
            const hasGeofence =
              visit.projectLatitude !== null &&
              visit.projectLatitude !== undefined &&
              visit.projectLongitude !== null &&
              visit.projectLongitude !== undefined;
            const radius = visit.projectGeofenceRadiusM ?? 150;
            const distance =
              hasGeofence && currentPosition
                ? distanceMeters(
                    currentPosition.coords.latitude,
                    currentPosition.coords.longitude,
                    Number(visit.projectLatitude),
                    Number(visit.projectLongitude),
                  )
                : null;
            const insideGeofence = !hasGeofence
              ? false
              : distance !== null && distance <= radius;
            const isStarted = startedVisitIds.has(visit.id);

            if (visit.checkedOutAt || visit.status === "Completed") {
              return (
                <Badge className="border-0 bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1.5 text-xs rounded-xl inline-flex items-center gap-1.5 shadow-none">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Visit Completed
                </Badge>
              );
            }

            if (visit.checkedInAt) {
              return (
                <Button
                  type="button"
                  size="sm"
                  className="h-8.5 px-3.5 text-xs font-extrabold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                  onClick={() => onCheckOut(visit)}
                >
                  <CheckCircle2 className="size-3.5" />
                  Complete Visit
                </Button>
              );
            }

            return (
              <div className="min-w-[170px] space-y-1">
                {isStarted ? (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 px-3 text-xs font-extrabold bg-primary text-white hover:bg-primary/90 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                      disabled={!insideGeofence}
                      onClick={() => onCheckIn(visit)}
                    >
                      <MapPin className="size-3.5" />
                      Check In
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs font-bold border-slate-200 text-slate-600 rounded-xl shadow-none"
                      onClick={() => onUndoStartVisit(visit)}
                    >
                      <XCircle className="size-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8.5 px-3.5 text-xs font-extrabold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-xs inline-flex items-center gap-1.5"
                    onClick={() => onStartVisit(visit)}
                  >
                    <Navigation className="size-3.5" />
                    Start Visit
                  </Button>
                )}
                <p className="text-[10px] font-bold text-muted-foreground truncate">
                  {!isStarted
                    ? "Start route to check-in"
                    : !hasGeofence
                    ? "Geofence pending"
                    : !currentPosition
                    ? "Locating GPS..."
                    : insideGeofence
                    ? "At site location"
                    : `${formatDistance(
                        Math.max((distance ?? 0) - radius, 0),
                      )} away`}
                </p>
              </div>
            );
          }

          if (visit.status === "Completed" || visit.checkedOutAt) {
            return (
              <Badge className="border-0 bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1.5 text-xs rounded-xl inline-flex items-center gap-1.5 shadow-none">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                Completed
              </Badge>
            );
          }
          if (visit.status === "Cancelled") {
            return (
              <Badge className="border-0 bg-red-50 text-red-700 font-extrabold px-3 py-1.5 text-xs rounded-xl inline-flex items-center gap-1.5 shadow-none">
                <XCircle className="size-3.5 text-red-600" />
                Cancelled
              </Badge>
            );
          }
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8.5 px-3.5 text-xs font-extrabold border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl shadow-xs inline-flex items-center gap-1.5"
              onClick={() => onStatusChange(visit, "Completed")}
            >
              <CheckCircle2 className="size-3.5" />
              Complete Visit
            </Button>
          );
        },
      },
      {
        header: "Reminder",
        cell: (visit) => (
          <div>
            <p className="text-xs font-extrabold text-secondary">
              {visit.reminder.enabled ? visit.reminder.date : "No reminder"}
            </p>
            {visit.reminder.enabled && (
              <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                {visit.reminder.time}
              </p>
            )}
          </div>
        ),
      },
      {
        header: "",
        headerClassName: "text-right",
        className: "text-right align-middle",
        cell: (visit) => {
          const leadRouteId =
            visit.leadDisplayId && !isRawIdentifier(visit.leadDisplayId)
              ? visit.leadDisplayId
              : visit.leadId;
          return (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-8 rounded-md"
                  aria-label={`Open actions for ${visit.id}`}
                >
                  <MoreVertical className="h-4 w-4 text-blue-700" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="min-w-[240px] rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,37,68,0.16)]"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <span className="block text-xs font-extrabold text-secondary">
                    {formatSiteVisitReference(visit.id)}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted-foreground">
                    {visit.leadName} - {visit.date}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
                  onSelect={() =>
                    navigate(
                      fieldExecutiveRoute
                        ? buildFieldExecutiveSiteVisitPath(visit.id)
                        : `/site-visits/${visit.id}`,
                    )
                  }
                >
                  <span className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                    <SquareArrowOutUpRight className="size-4" />
                  </span>
                  <span>
                    <span className="block">View site visit</span>
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      Review schedule, project, and execution context
                    </span>
                  </span>
                </DropdownMenuItem>
                {visit.projectId && (
                  <DropdownMenuItem
                    className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
                    onSelect={() => navigate(`/projects/${visit.projectId}`)}
                  >
                    <span className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-blue-700">
                      <MapPin className="size-4" />
                    </span>
                    <span>
                      <span className="block">Open Project</span>
                      <span className="block text-[11px] font-semibold text-muted-foreground">
                        {visit.project}
                      </span>
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {visit.status !== "Completed" &&
                  visit.status !== "Cancelled" && (
                    <>
                      <DropdownMenuItem
                        className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-green-50 focus:text-success"
                        onSelect={() => onStatusChange(visit, "Completed")}
                      >
                        <span className="flex size-8 items-center justify-center rounded-md bg-green-50 text-success">
                          <CheckCircle2 className="size-4" />
                        </span>
                        <span>
                          <span className="block">Mark Completed</span>
                          <span className="block text-[11px] font-semibold text-muted-foreground">
                            Tour finished successfully
                          </span>
                        </span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-red-50 focus:text-red-700"
                        onSelect={() => onStatusChange(visit, "Cancelled")}
                      >
                        <span className="flex size-8 items-center justify-center rounded-md bg-red-50 text-red-700">
                          <XCircle className="size-4" />
                        </span>
                        <span>
                          <span className="block">Cancel Visit</span>
                          <span className="block text-[11px] font-semibold text-muted-foreground">
                            No-show or rescheduled
                          </span>
                        </span>
                      </DropdownMenuItem>
                    </>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      currentPosition,
      fieldExecutiveRoute,
      navigate,
      onCheckIn,
      onCheckOut,
      onStartVisit,
      onStatusChange,
      onUndoStartVisit,
      startedVisitIds,
    ],
  );

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 sm:flex-row sm:items-center sm:justify-between p-2">
        <div className="flex gap-6 overflow-x-auto py-2">
          {siteVisitTabs.map((tab) => {
            const selected = activeTab === tab.id;
            const count =
              tab.id === "all"
                ? allRows.length
                : allRows.filter((visit) => getBucket(visit) === tab.id).length;

            return (
              <Button
                key={tab.id}
                type="button"
                variant="ghost"
                className={cn(
                  "h-10 shrink-0 rounded-md px-3 py-4 text-sm font-extrabold text-secondary hover:bg-primary/10 hover:text-blue-700",
                  selected && "bg-primary/10 text-blue-700",
                )}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label} ({count})
              </Button>
            );
          })}
        </div>
        <div className="flex gap-3 pb-3 sm:pb-0">
          <Select defaultValue="table">
            <SelectTrigger
              aria-label="View site visits"
              className="h-9 w-[150px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">View: Table</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md px-4 text-xs shadow-none"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <DataTable
        className="min-w-[1180px] border-0 shadow-none rounded-none"
        columns={columns}
        data={rows}
        emptyMessage={`No site visits found in ${
          activeTabOption?.label ?? "this"
        } bucket.`}
      />
    </Card>
  );
}

function TodayScheduleCard({ rows }: { rows: SiteVisitRow[] }) {
  const todayRows = rows
    .filter((row) => row.status === "Upcoming" || row.status === "Scheduled")
    .slice(0, 4);

  return (
    <Panel title="Today & Upcoming">
      <div className="space-y-3">
        {todayRows.map((visit) => (
          <div
            key={visit.id}
            className="rounded-md border border-slate-100 bg-slate-50 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-secondary">
                {visit.time}
              </p>
              <StatusBadge status={visit.status} />
            </div>
            <p className="mt-2 text-xs font-extrabold text-secondary">
              {visit.leadName}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {visit.project}
            </p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OperationsCard({ rows }: { rows: SiteVisitRow[] }) {
  const completed = rows.filter((row) => row.status === "Completed").length;
  const active = rows.filter(
    (row) => row.status === "Upcoming" || row.status === "Scheduled",
  ).length;
  const completionRate = rows.length
    ? Math.round((completed / rows.length) * 100)
    : 0;

  return (
    <Panel title="Operations Snapshot">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-extrabold text-secondary">
            <span>Completion Rate</span>
            <span>{completionRate}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-success"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-muted-foreground">
              Active Visits
            </p>
            <p className="mt-1 text-xl font-extrabold text-secondary">
              {active}
            </p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="text-[11px] font-bold text-muted-foreground">
              Completed
            </p>
            <p className="mt-1 text-xl font-extrabold text-secondary">
              {completed}
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-extrabold text-secondary">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

function CreateVisitSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof CalendarCheck;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-extrabold text-secondary">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function CreateVisitSummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-secondary">
        {value || "-"}
      </p>
    </div>
  );
}

const formatMoney = (value?: string | number | null) => {
  const numeric = Number(value ?? 0);
  if (!numeric) return "";
  if (numeric >= 10000000) return `INR ${(numeric / 10000000).toFixed(2)} Cr`;
  if (numeric >= 100000) return `INR ${(numeric / 100000).toFixed(2)} Lakh`;
  return `INR ${numeric.toLocaleString("en-IN")}`;
};

export function CreateSiteVisitModal({
  open,
  form,
  rows,
  optionsData,
  isSaving,
  lockedLeadId,
  onOpenChange,
  onChange,
  onSubmit,
}: {
  open: boolean;
  form: CreateVisitFormState;
  rows: SiteVisitRow[];
  optionsData?: SiteVisitOptionsResponse;
  isSaving: boolean;
  lockedLeadId?: string;
  onOpenChange: (open: boolean) => void;
  onChange: <K extends keyof CreateVisitFormState>(
    field: K,
    value: CreateVisitFormState[K],
  ) => void;
  onSubmit: () => void;
}) {
  const availableLeads = useMemo(
    () =>
      lockedLeadId
        ? optionsData?.leads.filter(
            (lead) =>
              lead.id === lockedLeadId || lead.displayId === lockedLeadId,
          ) ?? []
        : optionsData?.leads ?? [],
    [lockedLeadId, optionsData?.leads],
  );
  const leadOptions = useMemo(() => {
    if (availableLeads.length) {
      return availableLeads.map((lead) => ({
        value: lead.id,
        label: [lead.name, lead.phone, lead.displayId]
          .filter(Boolean)
          .join(" - "),
      }));
    }
    const leadMap = new Map<string, SiteVisitRow>();
    rows.forEach((row) => {
      if (!leadMap.has(row.leadId)) {
        leadMap.set(row.leadId, row);
      }
    });
    return Array.from(leadMap.values()).map((row) => ({
      value: row.leadId,
      label: [
        row.leadName,
        row.leadPhone,
        isRawIdentifier(row.leadDisplayId) ? undefined : row.leadDisplayId,
      ]
        .filter(Boolean)
        .join(" - "),
    }));
  }, [availableLeads, rows]);

  const selectedLead =
    availableLeads.find(
      (lead) => lead.id === form.leadId || lead.displayId === form.leadId,
    ) ?? rows.find((row) => row.leadId === form.leadId);
  const projectCatalog: SiteVisitOptionsResponse["projects"] =
    optionsData?.projects ?? [];
  const selectedProjectOption = findProjectById(projectCatalog, form.projectId);
  const selectedProject = selectedProjectOption;
  const selectedUnitOption = selectedProjectOption?.units.find(
    (unit) => unit.id === form.unitId,
  );
  const selectedUnit =
    selectedUnitOption ??
    getLiveUnitById(projectCatalog, form.projectId, form.unitId);
  const selectedLeadName =
    selectedLead && "leadName" in selectedLead
      ? selectedLead.leadName
      : selectedLead?.name;
  const selectedLeadPhone =
    selectedLead && "leadPhone" in selectedLead
      ? selectedLead.leadPhone
      : selectedLead?.phone;
  const selectedLeadStatus =
    selectedLead && "leadStatus" in selectedLead
      ? selectedLead.leadStatus
      : "statusName" in (selectedLead ?? {})
      ? selectedLead?.statusName ?? selectedLead?.stageName ?? "-"
      : "-";
  const selectedLeadSource =
    selectedLead && "leadSource" in selectedLead
      ? selectedLead.leadSource
      : "sourceName" in (selectedLead ?? {})
      ? selectedLead?.sourceName ?? "-"
      : "-";
  const selectedUnitLabel = selectedUnit
    ? "unitNumber" in selectedUnit
      ? `${selectedUnit.tower ?? "Tower"} Unit ${selectedUnit.unitNumber}`
      : formatUnitLabel(selectedUnit)
    : "";
  let selectedPrice = "-";
  if (selectedUnit && "price" in selectedUnit) {
    const unitPrice = selectedUnit.price;
    selectedPrice = formatMoney(unitPrice) || String(unitPrice ?? "-");
  } else if (selectedProject && "priceRange" in selectedProject) {
    selectedPrice = String(
      (selectedProject as { priceRange?: string }).priceRange ?? "-",
    );
  }
  const unitOptions = selectedProjectOption
    ? selectedProjectOption.units.map((unit) => ({
        value: unit.id,
        label: [
          `${unit.tower ?? "Tower"} Unit ${unit.unitNumber}`,
          unit.configuration,
          formatMoney(unit.price),
          unit.availability,
        ]
          .filter(Boolean)
          .join(" - "),
      }))
    : getLiveUnitsByProjectId(projectCatalog, form.projectId).map((unit) => ({
        value: unit.id,
        label: `${formatProjectUnitLabel(unit)} - ${unit.configuration} - ${
          unit.price
        }`,
      }));
  const projectOptions = projectCatalog.map((project) => ({
    value: project.id,
    label: `${project.name} - ${project.location}`,
  }));
  const [previewImageIndex, setPreviewImageIndex] = useState(0);

  const previewImages = useMemo(() => {
    if (selectedUnit) {
      const unitGallery = selectedUnit.imageGallery?.filter(Boolean) ?? [];
      if (unitGallery.length > 0) return unitGallery as string[];
      if (selectedUnit.imageUrl) return [selectedUnit.imageUrl] as string[];
    }
    if (selectedProject) {
      const projectGallery =
        selectedProject.imageGallery?.filter(Boolean) ?? [];
      if (projectGallery.length > 0) return projectGallery as string[];
      if (selectedProject.imageUrl)
        return [selectedProject.imageUrl] as string[];
    }
    return [] as string[];
  }, [selectedProject, selectedUnit]);

  useEffect(() => {
    setPreviewImageIndex(0);
  }, [form.projectId, form.unitId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[92vh] max-h-[760px] max-w-6xl overflow-hidden rounded-[14px] p-0">
        <div className="grid h-full min-h-0 lg:grid-cols-[310px_minmax(0,1fr)]">
          <ScrollArea className="h-full w-full min-h-0 border-r border-slate-200 bg-slate-50/70">
            <aside className="p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-12 items-center justify-center rounded-[12px] bg-blue-50 text-blue-700">
                  <CalendarCheck className="size-6" />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-secondary">
                    Create Site Visit
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                    Schedule a visit from existing CRM lead, project, and
                    inventory records.
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <CreateVisitSummaryCard
                  label="Selected Lead"
                  value={selectedLeadName ?? "Not selected"}
                />
                <CreateVisitSummaryCard
                  label="Phone"
                  value={selectedLeadPhone ?? "-"}
                />
                <CreateVisitSummaryCard
                  label="Project"
                  value={selectedProject?.name ?? "Not selected"}
                />
                <CreateVisitSummaryCard
                  label="Unit"
                  value={selectedUnitLabel || "-"}
                />
              </div>

              {/* Premium Preview Gallery */}
              {previewImages.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-extrabold text-secondary uppercase tracking-wider">
                    Property Preview
                  </p>
                  <div className="group relative h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
                    <img
                      src={
                        previewImages[previewImageIndex % previewImages.length]
                      }
                      alt="Property Preview"
                      className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
                    />

                    {previewImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-secondary opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                          onClick={() =>
                            setPreviewImageIndex(
                              (prev) =>
                                (prev - 1 + previewImages.length) %
                                previewImages.length,
                            )
                          }
                        >
                          <ChevronLeft className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-secondary opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                          onClick={() =>
                            setPreviewImageIndex(
                              (prev) => (prev + 1) % previewImages.length,
                            )
                          }
                        >
                          <ChevronRight className="size-3.5" />
                        </button>
                      </>
                    )}

                    <div className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {selectedUnit ? "Unit Photo" : "Project Photo"}
                    </div>
                  </div>

                  {previewImages.length > 1 && (
                    <ScrollArea className="w-full">
                      <div className="flex gap-1.5 pb-1">
                        {previewImages.map((imgUrl: string, idx: number) => (
                          <button
                            key={`${idx}-${imgUrl}`}
                            type="button"
                            className={cn(
                              "h-10 w-14 shrink-0 overflow-hidden rounded border bg-slate-100 transition-all",
                              idx === previewImageIndex % previewImages.length
                                ? "border-primary ring-1 ring-primary"
                                : "border-slate-200 hover:border-slate-300",
                            )}
                            onClick={() => setPreviewImageIndex(idx)}
                          >
                            <img
                              src={imgUrl}
                              alt={`Thumbnail ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              <div className="mt-6 rounded-md border border-orange-100 bg-orange-50 px-4 py-3">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs font-extrabold text-secondary">
                      Scheduling Tip
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                      Use the searchable lead field instead of typing IDs. IDs
                      are still sent internally to the API.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </ScrollArea>

          <div className="flex min-h-0 min-w-0 flex-col bg-white">
            <DialogHeader className="border-b border-slate-100 px-6 py-5">
              <DialogTitle className="text-2xl font-extrabold text-secondary">
                Plan Site Visit
              </DialogTitle>
              <DialogDescription className="text-sm font-semibold text-muted-foreground">
                Choose the lead, property, schedule, and field handoff details.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="min-h-0 flex-1 overflow-hidden">
              <div className="space-y-4 p-6">
                <CreateVisitSection icon={UserRoundCheck} title="Lead Context">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <FieldLabel label="Lead" required />
                      {lockedLeadId ? (
                        <CreateVisitSummaryCard
                          label="Selected Lead"
                          value={
                            [selectedLeadName, selectedLeadPhone]
                              .filter(Boolean)
                              .join(" - ") ||
                            "Lead locked to current details page"
                          }
                        />
                      ) : (
                        <SearchableSelect
                          value={form.leadId}
                          options={leadOptions}
                          placeholder="Search lead by name, phone, or lead ID"
                          ariaLabel="Lead"
                          searchPlaceholder="Search leads..."
                          noOptionsText="No matching leads"
                          className="h-11 rounded-[10px]"
                          portaled={false}
                          modal={false}
                          onValueChange={(value) => {
                            const leadId = value as string;
                            const lead =
                              rows.find((row) => row.leadId === leadId) ??
                              optionsData?.leads.find(
                                (item) => item.id === leadId,
                              );
                            onChange("leadId", leadId);
                            if (lead) {
                              const projectId =
                                "projectId" in lead
                                  ? lead.projectId
                                  : "preferredProjectId" in lead
                                  ? lead.preferredProjectId
                                  : "";
                              onChange("projectId", projectId ?? "");
                              onChange(
                                "unitId",
                                "unitId" in lead ? lead.unitId ?? "" : "",
                              );
                            }
                          }}
                        />
                      )}
                    </div>

                    <CreateVisitSummaryCard
                      label="Lead Status"
                      value={selectedLeadStatus}
                    />
                    <CreateVisitSummaryCard
                      label="Source"
                      value={selectedLeadSource}
                    />
                  </div>
                </CreateVisitSection>

                <CreateVisitSection icon={Building2} title="Property Details">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel label="Project" required />
                      <SearchableSelect
                        value={form.projectId}
                        options={projectOptions}
                        placeholder="Search project"
                        ariaLabel="Project"
                        searchPlaceholder="Search projects..."
                        className="h-11 rounded-[10px]"
                        portaled={false}
                        modal={false}
                        onValueChange={(value) => {
                          const projectId = value as string;
                          onChange("projectId", projectId);
                          onChange(
                            "unitId",
                            optionsData?.projects.find(
                              (project) => project.id === projectId,
                            )?.units[0]?.id ??
                              getLiveUnitsByProjectId(
                                optionsData?.projects ?? [],
                                projectId,
                              )[0]?.id ??
                              "",
                          );
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel label="Unit" />
                      <SearchableSelect
                        value={form.unitId}
                        options={unitOptions}
                        placeholder="Search unit"
                        ariaLabel="Unit"
                        searchPlaceholder="Search inventory..."
                        disabled={!form.projectId}
                        className="h-11 rounded-[10px]"
                        portaled={false}
                        modal={false}
                        onValueChange={(value) =>
                          onChange("unitId", value as string)
                        }
                      />
                    </div>
                    <CreateVisitSummaryCard
                      label="Location"
                      value={selectedProject?.location ?? "-"}
                    />
                    <CreateVisitSummaryCard
                      label="Price"
                      value={selectedPrice}
                    />
                  </div>
                </CreateVisitSection>

                <CreateVisitSection icon={Clock} title="Field Handoff">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <FieldLabel label="Visit Type" required />
                      <Select
                        value={form.visitType}
                        onValueChange={(value) =>
                          onChange(
                            "visitType",
                            normalizeVisitType(value as string),
                          )
                        }
                      >
                        <SelectTrigger
                          aria-label="Visit type"
                          className="h-11 rounded-[10px] text-sm font-semibold shadow-none"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {visitTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel label="Visit Date" required />
                      <DatePicker
                        aria-label="Visit date"
                        value={form.date}
                        className="h-11 rounded-[10px] text-sm font-semibold"
                        onChange={(event) =>
                          onChange("date", event.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <FieldLabel label="Visit Time" required />
                      <ClockTimePicker
                        value={form.time}
                        options={visitTimeOptions}
                        widthClassName="w-full h-11 rounded-[10px]"
                        onChange={(value) => onChange("time", value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel label="Duration" />
                      <Select
                        value={form.durationMinutes}
                        onValueChange={(value) =>
                          onChange("durationMinutes", value as string)
                        }
                      >
                        <SelectTrigger
                          aria-label="Duration"
                          className="h-11 rounded-[10px] text-sm font-semibold shadow-none"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel label="Visitors" />
                      <Select
                        value={form.visitorCount}
                        onValueChange={(value) =>
                          onChange("visitorCount", value as string)
                        }
                      >
                        <SelectTrigger
                          aria-label="Visitor count"
                          className="h-11 rounded-[10px] text-sm font-semibold shadow-none"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {visitorCountOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel label="Transport" />
                      <Select
                        value={form.transportMode}
                        onValueChange={(value) =>
                          onChange("transportMode", value as string)
                        }
                      >
                        <SelectTrigger
                          aria-label="Transport"
                          className="h-11 rounded-[10px] text-sm font-semibold shadow-none"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {transportOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel label="Meeting Point" />
                      <Input
                        aria-label="Meeting point"
                        value={form.meetingPoint}
                        placeholder="Sales gallery, tower lobby, video link..."
                        className="h-11 rounded-[10px] text-sm font-semibold"
                        onChange={(event) =>
                          onChange("meetingPoint", event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <FieldLabel label="Special Request" />
                      <Textarea
                        aria-label="Special request"
                        value={form.specialRequest}
                        placeholder="Parking needs, senior citizen assistance, preferred sample flat, negotiation context..."
                        className="min-h-[92px] rounded-[10px] text-sm font-semibold"
                        onChange={(event) =>
                          onChange("specialRequest", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </CreateVisitSection>
              </div>
            </ScrollArea>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold text-muted-foreground">
                Required: lead, project, date, time, and executive.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[10px] px-5 shadow-none"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-10 rounded-[10px] px-5"
                  onClick={onSubmit}
                  disabled={
                    isSaving ||
                    !form.leadId ||
                    !form.projectId ||
                    !form.date ||
                    !form.time
                  }
                >
                  <CalendarCheck className="size-4" />
                  {isSaving ? "Scheduling..." : "Schedule Visit"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SiteVisitsWorkspaceContentProps {
  embedded?: boolean;
  leadScoped?: boolean;
  fieldExecutiveRoute: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  activeTab: SiteVisitBucket;
  onTabChange: (tab: SiteVisitBucket) => void;
  executiveFilter: string;
  onExecutiveFilterChange: (value: string) => void;
  allRows: SiteVisitRow[];
  filteredRows: SiteVisitRow[];
  stats: LeadStatsRowItem[];
  optionsData?: SiteVisitOptionsResponse;
  lockedLeadId?: string;
  onRefresh: () => void;
  onOpenCreate: () => void;
  onStatusChange: (visit: SiteVisitRow, status: SiteVisitStatus) => void;
  startedVisitIds: ReadonlySet<string>;
  onStartVisit: (visit: SiteVisitRow) => void;
  onUndoStartVisit: (visit: SiteVisitRow) => void;
  onCheckIn: (visit: SiteVisitRow) => void;
  onCheckOut: (visit: SiteVisitRow) => void;
  currentPosition?: GeolocationPosition | null;
  isCreateOpen: boolean;
  createVisitForm: CreateVisitFormState;
  isCreateSaving: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onCreateChange: <K extends keyof CreateVisitFormState>(
    field: K,
    value: CreateVisitFormState[K],
  ) => void;
  onCreateSubmit: () => void;
  completionVisit: SiteVisitRow | null;
  completionOutcome: VisitOutcome;
  completionRemarks: string;
  bookingAmount: string;
  bookingDate: string;
  bookingNextAction: string;
  completionRating: string;
  completionNextAction: string;
  completionLeadStatus: string;
  completionFollowUpDate: string;
  completionFollowUpTime?: string;
  masterStatusOptions?: string[];
  onCompletionRemarksChange: (value: string) => void;
  onCompletionOutcomeChange: (value: VisitOutcome) => void;
  onCompletionRatingChange: (value: string) => void;
  onCompletionNextActionChange: (value: string) => void;
  onCompletionLeadStatusChange: (value: string) => void;
  onCompletionFollowUpDateChange: (value: string) => void;
  onCompletionFollowUpTimeChange?: (value: string) => void;
  onBookingAmountChange: (value: string) => void;
  onBookingDateChange: (value: string) => void;
  onBookingNextActionChange: (value: string) => void;
  onCompletionOpenChange: (open: boolean) => void;
  onCompletionSubmit: () => void;
  isCompletionSaving: boolean;
  cancelVisit: SiteVisitRow | null;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  onCancelOpenChange: (open: boolean) => void;
  onCancelSubmit: () => void;
  isCancelSaving: boolean;
}

function SiteVisitsWorkspaceContent({
  leadScoped = false,
  fieldExecutiveRoute,
  search,
  onSearchChange,
  activeTab,
  onTabChange,
  executiveFilter,
  onExecutiveFilterChange,
  allRows,
  filteredRows,
  stats,
  optionsData,
  lockedLeadId,
  onRefresh,
  onOpenCreate,
  onStatusChange,
  startedVisitIds,
  onStartVisit,
  onUndoStartVisit,
  onCheckIn,
  onCheckOut,
  currentPosition,
  isCreateOpen,
  createVisitForm,
  isCreateSaving,
  onCreateOpenChange,
  onCreateChange,
  onCreateSubmit,
  completionVisit,
  completionOutcome,
  completionRemarks,
  bookingAmount,
  bookingDate,
  bookingNextAction,
  completionRating,
  completionNextAction,
  completionLeadStatus,
  completionFollowUpDate,
  completionFollowUpTime = "10:00 AM",
  masterStatusOptions,
  onCompletionRemarksChange,
  onCompletionOutcomeChange,
  onCompletionRatingChange,
  onCompletionNextActionChange,
  onCompletionLeadStatusChange,
  onCompletionFollowUpDateChange,
  onCompletionFollowUpTimeChange,
  onBookingAmountChange,
  onBookingDateChange,
  onBookingNextActionChange,
  onCompletionOpenChange,
  onCompletionSubmit,
  isCompletionSaving,
  cancelVisit,
  cancelReason,
  onCancelReasonChange,
  onCancelOpenChange,
  onCancelSubmit,
  isCancelSaving,
}: SiteVisitsWorkspaceContentProps) {
  const title = fieldExecutiveRoute
    ? "My Schedule"
    : leadScoped
    ? "Site Visits"
    : "Site Visits";
  const description = fieldExecutiveRoute
    ? "Assigned field handoffs, navigation, attendance, and visit execution."
    : leadScoped
    ? "Lead-scoped visit management with the same scheduling, status, and execution controls as the dedicated workspace."
    : "Central visit control for scheduled property tours, re-visits, virtual visits, and field execution.";
  const completionProject = optionsData?.projects.find(
    (project) => project.id === completionVisit?.projectId,
  );
  const completionUnit = completionProject?.units.find(
    (unit) => unit.id === completionVisit?.unitId,
  );
  const completionUnitImage = getFirstInventoryImage(
    completionUnit,
    completionProject,
  );

  return (
    <>
      <div className="space-y-5">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-extrabold text-secondary">
              <CalendarCheck className="h-7 w-7 text-primary" />
              {title}
            </h1>
            <p className="mt-2 text-sm font-semibold text-blue-800">
              {description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {!fieldExecutiveRoute && !leadScoped ? (
              <Select
                value={executiveFilter}
                onValueChange={onExecutiveFilterChange}
              >
                <SelectTrigger
                  aria-label="Filter by assigned executive"
                  className="h-11 w-[220px] rounded-md text-sm font-bold shadow-none"
                >
                  <SelectValue placeholder="Assigned Executive" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Executives</SelectItem>
                  {(optionsData?.executives ?? []).map((executive) => (
                    <SelectItem key={executive.id} value={executive.id}>
                      {executive.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md px-5 shadow-none"
              onClick={onRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md px-5 shadow-none"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
            {!fieldExecutiveRoute ? (
              <Button
                type="button"
                className="h-11 rounded-md px-5"
                onClick={onOpenCreate}
              >
                <Plus className="h-4 w-4" />
                Create Site Visit
              </Button>
            ) : null}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-3 shadow-sm">
          <SearchInput
            aria-label="Search site visits"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={
              fieldExecutiveRoute
                ? "Search assigned visits, leads, projects, or mobile number..."
                : "Search by lead, project, executive, mobile number..."
            }
            className="h-10 max-w-xl text-sm"
          />
        </section>

        <StatsRow stats={stats} />

        <section className="space-y-5">
          <SiteVisitsTable
            rows={filteredRows}
            allRows={allRows}
            activeTab={activeTab}
            onTabChange={onTabChange}
            onStatusChange={onStatusChange}
            fieldExecutiveRoute={fieldExecutiveRoute}
            currentPosition={currentPosition}
            startedVisitIds={startedVisitIds}
            onStartVisit={onStartVisit}
            onUndoStartVisit={onUndoStartVisit}
            onCheckIn={onCheckIn}
            onCheckOut={onCheckOut}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <TodayScheduleCard rows={allRows} />
            <OperationsCard rows={allRows} />
          </div>
        </section>
      </div>

      {!fieldExecutiveRoute ? (
        <CreateSiteVisitModal
          open={isCreateOpen}
          form={createVisitForm}
          rows={allRows}
          optionsData={optionsData}
          isSaving={isCreateSaving}
          lockedLeadId={lockedLeadId}
          onOpenChange={onCreateOpenChange}
          onChange={onCreateChange}
          onSubmit={onCreateSubmit}
        />
      ) : null}

      <Dialog
        open={Boolean(completionVisit)}
        onOpenChange={onCompletionOpenChange}
      >
        <DialogContent
          className={cn(
            "max-h-[90vh] sm:max-w-2xl md:max-w-3xl overflow-y-auto rounded-[16px] bg-white p-6 shadow-xl border border-slate-200",
          )}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-secondary">
              Complete site visit
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-muted-foreground">
              Add the visit outcome, update lead status & schedule next
              follow-up.
            </DialogDescription>
          </DialogHeader>

          {completionVisit ? (
            <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-secondary">
                    {(() => {
                      const rawName = completionVisit.leadName ?? "";
                      try {
                        return decodeURIComponent(rawName.replace(/%20/g, " "));
                      } catch {
                        return rawName.replace(/%20/g, " ");
                      }
                    })()}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {completionVisit.project} - {completionVisit.date},{" "}
                    {completionVisit.time}
                  </p>
                </div>
                <Badge className="border-0 bg-green-50 text-success font-extrabold px-2.5 py-1 text-xs">
                  Completion
                </Badge>
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-secondary">
              Visit outcome
            </label>
            <Select
              value={completionOutcome}
              onValueChange={(value) =>
                onCompletionOutcomeChange(value as VisitOutcome)
              }
            >
              <SelectTrigger className="h-10 rounded-[10px] text-sm font-bold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Interested">Interested</SelectItem>
                <SelectItem value="Needs Follow-up">Needs follow-up</SelectItem>
                <SelectItem value="Ready for Booking">
                  Ready for booking
                </SelectItem>
                <SelectItem value="Not Interested">Not interested</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-secondary">
              Lead status
            </label>
            <SearchableSelect
              value={completionLeadStatus}
              onValueChange={onCompletionLeadStatusChange}
              options={(masterStatusOptions && masterStatusOptions.length > 0
                ? masterStatusOptions
                : [
                    "New Lead",
                    "Interested",
                    "Site Visit Scheduled",
                    "Site Visit Done",
                    "Re-Visit Scheduled",
                    "Re-Visit Done",
                    "Booking Done",
                    "Warm",
                    "Hot",
                    "Cold",
                    "Not Interested",
                    "Lost",
                  ]
              ).map((statusOption) => ({
                value: statusOption,
                label: statusOption,
              }))}
              placeholder="Select lead status"
              searchPlaceholder="Search lead status..."
              className="h-10 rounded-[10px] text-sm font-bold shadow-none border-slate-200 bg-white"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 text-xs font-extrabold text-secondary">
              <label>Visit rating</label>
              <Select
                value={completionRating}
                onValueChange={onCompletionRatingChange}
              >
                <SelectTrigger className="h-10 rounded-[10px] text-sm font-bold shadow-none">
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  {["5", "4", "3", "2", "1"].map((rating) => (
                    <SelectItem key={rating} value={rating}>
                      {rating} / 5 ⭐
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 text-xs font-extrabold text-secondary">
              <label>Follow-up date</label>
              <DatePicker
                value={completionFollowUpDate}
                onChange={(event) =>
                  onCompletionFollowUpDateChange(event.target.value)
                }
              />
            </div>

            <div className="space-y-1.5 text-xs font-extrabold text-secondary">
              <label>Follow-up time</label>
              <ClockTimePicker
                value={completionFollowUpTime || "10:00 AM"}
                options={[
                  "08:00 AM",
                  "09:00 AM",
                  "10:00 AM",
                  "11:00 AM",
                  "12:00 PM",
                  "01:00 PM",
                  "02:00 PM",
                  "03:00 PM",
                  "04:00 PM",
                  "05:00 PM",
                  "06:00 PM",
                  "07:00 PM",
                  "08:00 PM",
                ]}
                onChange={onCompletionFollowUpTimeChange || (() => {})}
              />
            </div>
          </div>

          {completionOutcome === "Ready for Booking" ? (
            <Card className="rounded-[12px] border border-blue-100 bg-blue-50/60 p-4 shadow-none">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-secondary">
                    Schedule booking reservation
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    This records buyer intent. The unit is blocked only after
                    booking confirmation.
                  </p>
                </div>
                <Badge className="border-0 bg-white text-blue-700">
                  Reservation
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[10px] border border-white bg-white p-3">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    Project
                  </p>
                  <p className="mt-1 text-xs font-extrabold text-secondary">
                    {completionProject?.name ?? completionVisit?.project}
                  </p>
                </div>
                <div className="overflow-hidden rounded-[10px] border border-white bg-white">
                  {completionUnitImage ? (
                    <img
                      src={completionUnitImage}
                      alt={`Unit ${completionUnit?.unitNumber ?? ""}`}
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-full items-center justify-center bg-slate-100 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[11px] font-bold text-muted-foreground">
                      Unit
                    </p>
                    <p className="mt-1 text-xs font-extrabold text-secondary">
                      {completionUnit
                        ? [
                            completionUnit.tower,
                            `Unit ${completionUnit.unitNumber}`,
                            completionUnit.configuration,
                          ]
                            .filter(Boolean)
                            .join(", ")
                        : completionVisit?.unit ?? "Unit pending"}
                    </p>
                  </div>
                </div>
                <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                  Reservation amount received (INR)
                  <div className="relative">
                    <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={bookingAmount}
                      inputMode="decimal"
                      placeholder="Example: 150000"
                      className="h-10 rounded-[10px] bg-white pl-9 text-sm font-semibold"
                      onChange={(event) =>
                        onBookingAmountChange(
                          normalizeBookingAmountInput(event.target.value),
                        )
                      }
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Enter reservation money in actual rupees, not Lakh or Cr.
                  </p>
                </label>
                <label className="space-y-1.5 text-xs font-extrabold text-secondary">
                  Planned booking date
                  <DatePicker
                    value={bookingDate}
                    onChange={(event) =>
                      onBookingDateChange(event.target.value)
                    }
                  />
                </label>
              </div>
              <label className="mt-3 block space-y-1.5 text-xs font-extrabold text-secondary">
                Next action
                <Input
                  value={bookingNextAction}
                  className="h-10 rounded-[10px] bg-white text-sm font-semibold"
                  onChange={(event) =>
                    onBookingNextActionChange(event.target.value)
                  }
                />
              </label>
            </Card>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-secondary">
              Visit remark
            </label>
            <Textarea
              value={completionRemarks}
              placeholder="Client response, project feedback, objections, next action, booking intent..."
              className="min-h-[130px] resize-none rounded-[10px] text-sm font-semibold"
              onChange={(event) =>
                onCompletionRemarksChange(event.target.value)
              }
            />
            {!completionRemarks.trim() ? (
              <p className="text-[11px] font-bold text-primary">
                Feedback remarks are required to complete the visit.
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[10px] px-5 shadow-none"
              onClick={() => onCompletionOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 rounded-[10px] px-5"
              onClick={onCompletionSubmit}
              disabled={isCompletionSaving || !completionRemarks.trim()}
            >
              <CheckCircle2 className="size-4" />
              {isCompletionSaving ? "Saving..." : "Complete Visit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelVisit)}
        onOpenChange={(open) => {
          if (!open) onCancelOpenChange(false);
        }}
      >
        <DialogContent className="sm:max-w-[480px] rounded-[16px] p-0 overflow-hidden border border-slate-200 shadow-xl bg-white">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <XCircle className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-secondary">
                  Cancel Site Visit
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                  Are you sure you want to cancel this scheduled site visit?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="p-6 space-y-4">
            {cancelVisit && (
              <div className="rounded-[10px] border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-secondary">
                    {cancelVisit.leadName}
                  </span>
                  <Badge className="border-0 bg-slate-200 text-secondary text-[10px] font-bold">
                    {formatSiteVisitReference(cancelVisit.id)}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground font-medium pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Project
                    </span>
                    <span className="text-secondary font-bold truncate block">
                      {cancelVisit.project || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Schedule
                    </span>
                    <span className="text-secondary font-bold block">
                      {cancelVisit.date} at {cancelVisit.time}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-secondary">
                Reason for cancellation{" "}
                <span className="text-muted-foreground font-normal">
                  (Optional)
                </span>
              </label>
              <Textarea
                value={cancelReason}
                placeholder="Enter cancellation details or feedback (e.g. client postponed, no response, relocated)..."
                className="min-h-[90px] resize-none rounded-[10px] text-sm font-semibold border-slate-200 focus:border-red-400 focus:ring-red-400/20"
                onChange={(e) => onCancelReasonChange(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[10px] px-4 font-bold border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none"
                onClick={() => onCancelOpenChange(false)}
              >
                Keep Visit
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-[10px] px-5 font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm inline-flex items-center gap-2"
                onClick={onCancelSubmit}
                disabled={isCancelSaving}
              >
                <XCircle className="size-4" />
                {isCancelSaving ? "Cancelling..." : "Yes, Cancel Visit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SiteVisitsWorkspaceProps {
  leadId?: string;
  embedded?: boolean;
  fieldExecutiveRoute?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function SiteVisitsWorkspace({
  leadId,
  embedded = false,
  fieldExecutiveRoute = false,
  search: controlledSearch,
  onSearchChange,
}: SiteVisitsWorkspaceProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [activeTab, setActiveTab] = useState<SiteVisitBucket>("all");
  const [executiveFilter, setExecutiveFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [completionVisit, setCompletionVisit] = useState<SiteVisitRow | null>(
    null,
  );
  const [cancelVisit, setCancelVisit] = useState<SiteVisitRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [startedVisitIds, setStartedVisitIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [completionOutcome, setCompletionOutcome] =
    useState<VisitOutcome>("Interested");
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [completionRating, setCompletionRating] = useState("5");
  const [completionNextAction, setCompletionNextAction] = useState("");
  const [completionLeadStatus, setCompletionLeadStatus] =
    useState("Site Visit Done");
  const [completionFollowUpDate, setCompletionFollowUpDate] = useState("");
  const [completionFollowUpTime, setCompletionFollowUpTime] =
    useState("10:00 AM");

  const leadMasterStatusesQuery = useQuery({
    queryKey: ["lead-masters", "status", "completion-options"],
    queryFn: async () => {
      const { data } = await api.get<{
        data: Array<{
          id: string;
          name?: string;
          label?: string;
          code?: string;
          isActive?: boolean;
        }>;
      }>("/lead-masters/status");
      return (data.data ?? [])
        .filter((item) => item.isActive !== false)
        .map((item) => item.name ?? item.label ?? item.code ?? item.id);
    },
  });

  const masterStatusOptions = useMemo(() => {
    const loaded = leadMasterStatusesQuery.data ?? [];
    if (loaded.length > 0) return loaded;
    return [
      "New Lead",
      "Interested",
      "Site Visit Scheduled",
      "Site Visit Done",
      "Re-Visit Scheduled",
      "Re-Visit Done",
      "Booking Done",
      "Warm",
      "Hot",
      "Cold",
      "Not Interested",
      "Lost",
    ];
  }, [leadMasterStatusesQuery.data]);

  const [bookingAmount, setBookingAmount] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingNextAction, setBookingNextAction] = useState(
    "Collect reservation amount and documents",
  );
  const [createVisitForm, setCreateVisitForm] = useState<CreateVisitFormState>({
    leadId: leadId ?? "",
    projectId: "",
    unitId: "",
    date: "",
    time: "10:00 AM",
    visitType: "Site Visit",
    meetingPoint: "Sales Gallery",
    durationMinutes: "60",
    transportMode: "Own Vehicle",
    visitorCount: "2",
    specialRequest: "",
  });
  const search = controlledSearch ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;
  const visitsQuery = useSiteVisits(search, 100, leadId);
  const optionsQuery = useSiteVisitOptions(search);
  const visitMutations = useSiteVisitMutations();
  const bookingMutations = useBookingMutations();
  const { checkIn, checkOut } = useVisitAttendance();
  const [currentPosition, setCurrentPosition] =
    useState<GeolocationPosition | null>(null);

  const mappedRows = useMemo(() => {
    if (visitsQuery.isError)
      return fieldExecutiveRoute || leadId ? [] : siteVisitRows;
    return (visitsQuery.data?.rows ?? []).map((visit) =>
      mapApiVisit(visit, optionsQuery.data?.projects ?? []),
    );
  }, [
    fieldExecutiveRoute,
    leadId,
    optionsQuery.data?.projects,
    visitsQuery.data?.rows,
    visitsQuery.isError,
  ]);

  const allRows = useMemo(() => {
    if (!leadId) return mappedRows;
    return mappedRows.filter(
      (visit) => visit.leadId === leadId || visit.leadDisplayId === leadId,
    );
  }, [leadId, mappedRows]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allRows.filter((visit) => {
      const matchesTab = activeTab === "all" || getBucket(visit) === activeTab;
      const matchesExecutive =
        executiveFilter === "all" ||
        visit.assignedExecutiveId === executiveFilter ||
        visit.assignedExecutive === executiveFilter;
      const matchesSearch =
        !normalizedSearch ||
        [
          visit.leadName,
          visit.leadPhone,
          visit.project,
          visit.location,
          visit.assignedExecutive,
          visit.owner,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesTab && matchesExecutive && matchesSearch;
    });
  }, [activeTab, allRows, executiveFilter, search]);

  useEffect(() => {
    if (!fieldExecutiveRoute || !navigator.geolocation) return undefined;
    const watchId = navigator.geolocation.watchPosition(
      (position) => setCurrentPosition(position),
      () => setCurrentPosition(null),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [fieldExecutiveRoute]);
  const stats = useMemo<LeadStatsRowItem[]>(
    () => [
      {
        label: "Total Visits",
        value: `${allRows.length}`,
        change: "",
        helper: "All active lead visits",
        icon: CalendarCheck,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        label: "Upcoming",
        value: `${allRows.filter((row) => row.status === "Upcoming").length}`,
        change: "",
        helper: "Next scheduled visits",
        icon: Clock,
        tone: "bg-orange-50 text-primary",
      },
      {
        label: "Completed",
        value: `${allRows.filter((row) => row.status === "Completed").length}`,
        change: "",
        helper: "Completed tours",
        icon: CheckCircle2,
        tone: "bg-green-50 text-success",
      },
      {
        label: "Cancelled",
        value: `${allRows.filter((row) => row.status === "Cancelled").length}`,
        change: "",
        helper: "Needs reschedule review",
        icon: XCircle,
        tone: "bg-red-50 text-red-600",
      },
      {
        label: fieldExecutiveRoute ? "Check-ins Pending" : "Sales Executives",
        value: fieldExecutiveRoute
          ? `${allRows.filter((row) => !row.checkedInAt).length}`
          : `${optionsQuery.data?.executives.length ?? 0}`,
        change: "",
        helper: fieldExecutiveRoute
          ? "Awaiting attendance"
          : "Assigned this week",
        icon: UserRoundCheck,
        tone: "bg-violet-50 text-violet-700",
      },
    ],
    [allRows, fieldExecutiveRoute, optionsQuery.data?.executives.length],
  );

  useEffect(() => {
    if (!leadId) return;
    setCreateVisitForm((current) => ({
      ...current,
      leadId,
      projectId: current.projectId || allRows[0]?.projectId || "",
      unitId: current.unitId || allRows[0]?.unitId || "",
    }));
  }, [allRows, leadId]);

  const updateCreateVisitForm = <K extends keyof CreateVisitFormState>(
    field: K,
    value: CreateVisitFormState[K],
  ) => {
    setCreateVisitForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateVisit = async () => {
    if (
      !createVisitForm.leadId ||
      !createVisitForm.projectId ||
      !createVisitForm.date ||
      !createVisitForm.time
    ) {
      return;
    }

    await visitMutations.createVisit.mutateAsync({
      leadId: createVisitForm.leadId,
      projectId: createVisitForm.projectId || undefined,
      unitId: createVisitForm.unitId || undefined,
      visitType: createVisitForm.visitType,
      scheduledAt: scheduledInputToIso(
        createVisitForm.date,
        createVisitForm.time,
      ),
      meetingPoint: createVisitForm.meetingPoint || undefined,
      durationMinutes: Number(createVisitForm.durationMinutes) || undefined,
      transportMode: createVisitForm.transportMode || undefined,
      visitorCount: Number(createVisitForm.visitorCount) || undefined,
      specialRequest: createVisitForm.specialRequest || undefined,
      status: "Scheduled",
    });

    setIsCreateOpen(false);
    setCreateVisitForm((current) => ({
      ...current,
      leadId: leadId ?? "",
      projectId: "",
      unitId: "",
      date: "",
      specialRequest: "",
    }));
  };

  const updateVisitStatus = async (
    visitId: string,
    status: SiteVisitStatus,
    payload: Record<string, unknown> = {},
  ) => {
    const apiRow = visitsQuery.data?.rows.find(
      (visit) =>
        visit.id === visitId ||
        visit.displayId === visitId ||
        (visit.displayId ?? visit.id) === visitId,
    );
    const targetId = apiRow?.id ?? visitId;
    try {
      await visitMutations.updateVisit.mutateAsync({
        id: targetId,
        payload: { status, ...payload },
      });
      await visitsQuery.refetch();
      toast.success(
        status === "Completed"
          ? "Site visit marked completed."
          : status === "Cancelled"
          ? "Site visit cancelled."
          : `Site visit status set to ${status}.`,
      );
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(error, `Unable to set visit status to ${status}`),
      );
    }
  };

  const handleStatusChange = (visit: SiteVisitRow, status: SiteVisitStatus) => {
    if (status === "Completed") {
      setCompletionVisit(visit);
      setCompletionRemarks(visit.feedback ?? "");
      setCompletionOutcome("Interested");
      setCompletionRating("5");
      setCompletionNextAction("");
      setBookingAmount("");
      setBookingDate(new Date().toISOString().slice(0, 10));
      setBookingNextAction("Collect reservation amount and documents");
      return;
    }
    if (status === "Cancelled") {
      setCancelVisit(visit);
      setCancelReason("");
      return;
    }
    void updateVisitStatus(visit.id, status);
  };

  const closeCompletionDialog = () => {
    setCompletionVisit(null);
    setCompletionOutcome("Interested");
    setCompletionRemarks("");
    setCompletionRating("5");
    setCompletionNextAction("");
    setBookingAmount("");
    setBookingDate("");
    setBookingNextAction("Collect reservation amount and documents");
  };

  const closeCancelDialog = () => {
    setCancelVisit(null);
    setCancelReason("");
  };

  const submitCancellation = async () => {
    if (!cancelVisit) return;
    await updateVisitStatus(cancelVisit.id, "Cancelled", {
      notes: cancelReason.trim()
        ? `[Cancellation Reason] ${cancelReason.trim()}`
        : undefined,
      feedback: cancelReason.trim()
        ? `Cancelled: ${cancelReason.trim()}`
        : undefined,
    });
    closeCancelDialog();
  };

  const submitCompletion = async () => {
    if (!completionVisit) return;
    if (!completionRemarks.trim()) {
      toast.error("Feedback remarks are required.");
      return;
    }
    const bookingAmountInRupees = toRupeeAmount(bookingAmount);
    if (
      completionOutcome === "Ready for Booking" &&
      (!completionVisit.projectId ||
        !completionVisit.unitId ||
        !bookingAmountInRupees ||
        !bookingDate)
    ) {
      toast.error("Project, unit, amount, and booking date are required.");
      return;
    }
    const apiRow = visitsQuery.data?.rows.find(
      (visit) =>
        visit.id === completionVisit.id ||
        visit.displayId === completionVisit.id ||
        (visit.displayId ?? visit.id) === completionVisit.id,
    );
    const targetId = apiRow?.id ?? completionVisit.id;

    if (fieldExecutiveRoute && completionVisit.checkedInAt) {
      getPosition((position) => {
        const nextFollowUpAt = completionFollowUpDate
          ? scheduledInputToIso(
              completionFollowUpDate,
              completionFollowUpTime || "10:00 AM",
            )
          : undefined;
        void checkOut
          .mutateAsync({
            id: targetId,
            position,
            feedback: completionRemarks.trim(),
            outcome: completionOutcome,
            rating: completionRating,
            leadStatus: completionLeadStatus,
            followUpDate: completionFollowUpDate,
            followUpTime: completionFollowUpTime,
            nextFollowUpAt,
            nextAction: completionFollowUpDate
              ? `Follow-up set for ${completionFollowUpDate}`
              : completionNextAction,
          })
          .then(() => toast.success("Visit completed."))
          .catch((error: unknown) =>
            toast.error(getApiErrorMessage(error, "Unable to complete visit")),
          );
      });
    } else {
      const nextFollowUpAt = completionFollowUpDate
        ? scheduledInputToIso(
            completionFollowUpDate,
            completionFollowUpTime || "10:00 AM",
          )
        : undefined;
      await updateVisitStatus(completionVisit.id, "Completed", {
        leadStatus: completionLeadStatus,
        followUpDate: completionFollowUpDate,
        followUpTime: completionFollowUpTime,
        nextFollowUpAt,
        feedback:
          [completionOutcome, completionRemarks.trim()]
            .filter(Boolean)
            .join(": ") || undefined,
        rating: Number(completionRating) || undefined,
        notes:
          [
            completionRemarks.trim(),
            completionFollowUpDate
              ? `Follow-up: ${completionFollowUpDate} ${completionFollowUpTime}`
              : "",
          ]
            .filter(Boolean)
            .join(" | ") || undefined,
      });
    }

    // Sync Lead Status, Follow-up date & append Visit Remarks to Lead record
    try {
      const leadRouteId = completionVisit.leadId;
      if (leadRouteId) {
        const nextFollowUpAt = completionFollowUpDate
          ? scheduledInputToIso(
              completionFollowUpDate,
              completionFollowUpTime || "10:00 AM",
            )
          : undefined;
        await api
          .patch(`/leads/${leadRouteId}`, {
            status: completionLeadStatus,
            statusId: completionLeadStatus,
            followUpDate: nextFollowUpAt || completionFollowUpDate || undefined,
            nextFollowUpAt: nextFollowUpAt || undefined,
            remarks: completionRemarks.trim()
              ? `[Site Visit Remark] ${completionRemarks.trim()}`
              : undefined,
          })
          .catch(() => null);

        if (completionFollowUpDate) {
          const followUpTimeStr = completionFollowUpTime || "10:00 AM";
          await api
            .post(`/leads/${leadRouteId}/follow-ups`, {
              scheduledAt: nextFollowUpAt,
              followUpDate: completionFollowUpDate,
              followUpTime: followUpTimeStr,
              nextAction: `Follow-up after site visit: ${completionOutcome}`,
              notes: completionRemarks.trim() || "Site visit completed",
            })
            .catch(() => null);
        }
      }
    } catch {
      // Ignore background lead update failure
    }

    if (completionOutcome === "Ready for Booking") {
      await bookingMutations.createBooking.mutateAsync({
        leadId: completionVisit.leadId,
        projectId: completionVisit.projectId ?? "",
        unitId: completionVisit.unitId ?? "",
        bookingAmount: bookingAmountInRupees,
        bookingDate,
        notes: completionRemarks.trim() || undefined,
        nextAction: bookingNextAction,
        siteVisitId: completionVisit.id,
      });
      toast.success("Booking reservation scheduled.");
    }
    closeCompletionDialog();
  };

  const handleCheckIn = (visit: SiteVisitRow) => {
    getPosition((position) => {
      const apiRow = visitsQuery.data?.rows.find(
        (row) => (row.displayId ?? row.id) === visit.id,
      );
      if (!apiRow) return;
      void checkIn
        .mutateAsync({ id: apiRow.id, position })
        .then(() => {
          setStartedVisitIds((current) => {
            const next = new Set(current);
            next.delete(visit.id);
            return next;
          });
          toast.success("Checked in at site.");
        })
        .catch((error: unknown) =>
          toast.error(getApiErrorMessage(error, "Unable to check in")),
        );
    });
  };

  const handleStartVisit = (visit: SiteVisitRow) => {
    getPosition(() => {
      setStartedVisitIds((current) => new Set(current).add(visit.id));
      toast.success(`Route started for ${visit.project}.`);
    });
  };

  const handleUndoStartVisit = (visit: SiteVisitRow) => {
    setStartedVisitIds((current) => {
      const next = new Set(current);
      next.delete(visit.id);
      return next;
    });
    toast.success("Visit start undone.");
  };

  const handleCheckOut = (visit: SiteVisitRow) => {
    setCompletionVisit(visit);
    setCompletionRemarks(visit.feedback ?? "");
    setCompletionOutcome("Interested");
    setCompletionRating("5");
    setCompletionNextAction("");
  };

  return (
    <SiteVisitsWorkspaceContent
      embedded={embedded}
      leadScoped={Boolean(leadId)}
      fieldExecutiveRoute={fieldExecutiveRoute}
      search={search}
      onSearchChange={setSearch}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      executiveFilter={executiveFilter}
      onExecutiveFilterChange={setExecutiveFilter}
      allRows={allRows}
      filteredRows={filteredRows}
      stats={stats}
      optionsData={optionsQuery.data}
      lockedLeadId={leadId}
      onRefresh={() => {
        void visitsQuery.refetch();
      }}
      onOpenCreate={() => setIsCreateOpen(true)}
      onStatusChange={handleStatusChange}
      startedVisitIds={startedVisitIds}
      onStartVisit={handleStartVisit}
      onUndoStartVisit={handleUndoStartVisit}
      onCheckIn={handleCheckIn}
      onCheckOut={handleCheckOut}
      currentPosition={currentPosition}
      isCreateOpen={isCreateOpen}
      createVisitForm={createVisitForm}
      isCreateSaving={visitMutations.createVisit.isPending}
      onCreateOpenChange={setIsCreateOpen}
      onCreateChange={updateCreateVisitForm}
      onCreateSubmit={() => {
        void handleCreateVisit().catch((error: unknown) =>
          toast.error(
            getApiErrorMessage(error, "Unable to schedule site visit"),
          ),
        );
      }}
      completionVisit={completionVisit}
      completionOutcome={completionOutcome}
      completionRemarks={completionRemarks}
      bookingAmount={bookingAmount}
      bookingDate={bookingDate}
      bookingNextAction={bookingNextAction}
      completionRating={completionRating}
      completionNextAction={completionNextAction}
      completionLeadStatus={completionLeadStatus}
      completionFollowUpDate={completionFollowUpDate}
      completionFollowUpTime={completionFollowUpTime}
      masterStatusOptions={masterStatusOptions}
      onCompletionRemarksChange={setCompletionRemarks}
      onCompletionOutcomeChange={setCompletionOutcome}
      onCompletionRatingChange={setCompletionRating}
      onCompletionNextActionChange={setCompletionNextAction}
      onCompletionLeadStatusChange={setCompletionLeadStatus}
      onCompletionFollowUpDateChange={setCompletionFollowUpDate}
      onCompletionFollowUpTimeChange={setCompletionFollowUpTime}
      onBookingAmountChange={setBookingAmount}
      onBookingDateChange={setBookingDate}
      onBookingNextActionChange={setBookingNextAction}
      onCompletionOpenChange={(open) => {
        if (!open) closeCompletionDialog();
      }}
      onCompletionSubmit={submitCompletion}
      isCompletionSaving={
        visitMutations.updateVisit.isPending ||
        checkOut.isPending ||
        bookingMutations.createBooking.isPending
      }
      cancelVisit={cancelVisit}
      cancelReason={cancelReason}
      onCancelReasonChange={setCancelReason}
      onCancelOpenChange={(open) => {
        if (!open) closeCancelDialog();
      }}
      onCancelSubmit={submitCancellation}
      isCancelSaving={visitMutations.updateVisit.isPending}
    />
  );
}

export function SiteVisitsScreen({ leadId }: { leadId?: string } = {}) {
  const [search, setSearch] = useState("");
  const location = useLocation();
  const fieldExecutiveRoute = isFieldExecutivePath(location.pathname);

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: fieldExecutiveRoute
          ? fieldExecutiveSidebarItems
          : addLeadSidebarItems,
        activeItem: "Site Visits",
        activeChild: undefined,
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span>
              {fieldExecutiveRoute ? "Field Operations" : "Lead Management"}
            </span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">
              {fieldExecutiveRoute ? "My Schedule" : "Site Visits"}
            </span>
          </div>
        ),
        headerContent: (
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search site visits"
                value={search}
                placeholder={
                  fieldExecutiveRoute
                    ? "Search assigned visits, leads, projects, or mobile number..."
                    : "Search by lead, project, executive, mobile number..."
                }
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none bg-white"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
            <Select defaultValue="week">
              <SelectTrigger
                aria-label="Date range"
                className="h-10 w-[200px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <CalendarDays className="h-4 w-4 text-info mr-2" />
                <SelectValue />
              </SelectTrigger>
            </Select>
          </div>
        ),
      },
    },
    [fieldExecutiveRoute, search],
  );

  return (
    <main className="mx-auto  space-y-8 p-4 sm:p-6">
      <SiteVisitsWorkspace
        leadId={leadId}
        fieldExecutiveRoute={fieldExecutiveRoute}
        search={search}
        onSearchChange={setSearch}
      />
    </main>
  );
}
