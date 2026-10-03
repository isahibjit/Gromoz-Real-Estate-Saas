import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  ClipboardList,
  MapPin,
  Send,
  Phone,
  RefreshCw,
  Route,
  User,
  UserX,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "ui";

import { api } from "../../common/api";
import { useAppSelector } from "../../store";
import { ClockTimePicker } from "../admin/leads/assignment/ClockTimePicker";
import { getApiErrorMessage } from "../../common/apiError";
import { scheduledInputToIso } from "../../common/time";
import { DashboardKpiCard } from "../../common/dashboard/DashboardKpiCard";
import { WorkspacePage } from "../../components/layout/PageHeader";
import { PerformanceRankingCard } from "../../common/dashboard/PerformanceRankingCard";
import { useSiteVisits } from "../admin/leads/site-visits/useSiteVisits";
import { DashboardAttendanceCard } from "../hr/components/DashboardAttendanceCard";
import { buildFieldExecutiveSiteVisitPath } from "./fieldExecutiveRouteContext";
import { RouteMap, type RouteOrigin } from "./RouteMap";
import { useFieldExecutiveChrome } from "./useFieldExecutiveChrome";
import {
  type FieldExecutiveVisit,
  useFieldExecutiveDashboard,
  useVisitAttendance,
} from "./useFieldExecutive";

const isToday = (value: string) => {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

function getGeolocationErrorMessage(
  error: GeolocationPositionError,
  actionLabel: string,
) {
  if (error.code === error.PERMISSION_DENIED) {
    return `Location permission is required to ${actionLabel}.`;
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Could not read your current location. Check GPS or network and try again.";
  }
  if (error.code === error.TIMEOUT) {
    return "Location lookup timed out. Move near open sky and try again.";
  }
  return "Unable to read current location. Try again.";
}

function requestPosition(
  onSuccess: (position: GeolocationPosition) => void,
  actionLabel: string,
) {
  if (!navigator.geolocation) {
    return toast.error("Geolocation is not available in this browser");
  }
  navigator.geolocation.getCurrentPosition(
    onSuccess,
    (error) => toast.error(getGeolocationErrorMessage(error, actionLabel)),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
}

function AttendanceAction({
  visit,
  checkIn,
  checkOut,
  isStarted,
  onStartVisit,
  onUndoStart,
  onCheckInSuccess,
  onCompleteVisit,
}: {
  visit: FieldExecutiveVisit;
  checkIn: ReturnType<typeof useVisitAttendance>["checkIn"];
  checkOut: ReturnType<typeof useVisitAttendance>["checkOut"];
  isStarted: boolean;
  onStartVisit: (visit: FieldExecutiveVisit) => void;
  onUndoStart: () => void;
  onCheckInSuccess: () => void;
  onCompleteVisit: (visit: FieldExecutiveVisit) => void;
}) {
  if (visit.checkedOutAt)
    return (
      <Badge className="border-0 bg-green-50 px-3 py-1.5 text-[12px] font-bold text-green-700">
        Visit Completed
      </Badge>
    );
  if (visit.checkedInAt)
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-9 px-3.5 font-bold shadow-sm"
        disabled={checkOut.isPending}
        onClick={() => onCompleteVisit(visit)}
      >
        <CheckCircle2 className="mr-1.5 size-4" strokeWidth={1.5} /> Complete
        Visit
      </Button>
    );
  return (
    <div className="flex shrink-0 items-center gap-2">
      {isStarted ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            className="h-9 px-3.5 font-bold shadow-sm"
            disabled={checkIn.isPending}
            onClick={() =>
              requestPosition(
                (position) =>
                  checkIn.mutate(
                    { id: visit.id, position },
                    {
                      onSuccess: () => {
                        onCheckInSuccess();
                        toast.success("Checked in at site.");
                      },
                      onError: (error) =>
                        toast.error(
                          getApiErrorMessage(error, "Unable to check in"),
                        ),
                    },
                  ),
                "check in at the site",
              )
            }
          >
            <MapPin className="mr-1.5 size-4" strokeWidth={1.5} /> Check in
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 px-2.5 font-bold shadow-none"
            disabled={checkIn.isPending}
            onClick={onUndoStart}
          >
            Undo
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          className="h-9 px-4 font-bold shadow-sm whitespace-nowrap"
          onClick={() => onStartVisit(visit)}
        >
          <Route className="mr-1.5 size-4" strokeWidth={1.5} /> Start visit
        </Button>
      )}
    </div>
  );
}

function CompleteVisitDialog({
  visit,
  feedback,
  leadStatus,
  followUpDate,
  followUpTime,
  masterStatusOptions,
  isSaving,
  onFeedbackChange,
  onLeadStatusChange,
  onFollowUpDateChange,
  onFollowUpTimeChange,
  onClose,
  onSubmit,
}: {
  visit: FieldExecutiveVisit | null;
  feedback: string;
  leadStatus: string;
  followUpDate: string;
  followUpTime: string;
  masterStatusOptions: string[];
  isSaving: boolean;
  onFeedbackChange: (value: string) => void;
  onLeadStatusChange: (value: string) => void;
  onFollowUpDateChange: (value: string) => void;
  onFollowUpTimeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Dialog open={Boolean(visit)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-2xl border border-slate-200 bg-white p-0 shadow-xl overflow-hidden">
        <DialogHeader className="border-b border-slate-100 px-6 py-4 text-left">
          <DialogTitle className="text-xl font-extrabold text-secondary">
            Complete site visit
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-muted-foreground">
            Update lead status, follow-up, and client feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {visit ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-extrabold text-secondary">
                {(() => {
                  const rawName = visit.leadName ?? "";
                  try {
                    return decodeURIComponent(rawName.replace(/%20/g, " "));
                  } catch {
                    return rawName.replace(/%20/g, " ");
                  }
                })()}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                {visit.projectName} · {visit.time}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-secondary">
              Lead status
            </label>
            <SearchableSelect
              value={leadStatus}
              onValueChange={onLeadStatusChange}
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
              className="h-10 rounded-lg text-sm font-bold shadow-none border-slate-200 bg-white"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-xs font-extrabold text-secondary">
              Next follow-up date
              <DatePicker
                value={followUpDate}
                onChange={(event) => onFollowUpDateChange(event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-xs font-extrabold text-secondary">
              Next follow-up time
              <ClockTimePicker
                value={followUpTime || "10:00 AM"}
                options={[
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
                ]}
                onChange={onFollowUpTimeChange}
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Visit feedback / remarks
            </span>
            <Textarea
              value={feedback}
              placeholder="Client response, objections, next step, booking intent..."
              className="min-h-[110px] resize-none rounded-lg border-slate-200 text-sm font-semibold shadow-none"
              onChange={(event) => onFeedbackChange(event.target.value)}
            />
            {!feedback.trim() ? (
              <p className="text-[11px] font-bold text-primary">
                Feedback is required to complete the visit.
              </p>
            ) : null}
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md px-5 shadow-none"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-md px-5"
            onClick={onSubmit}
            disabled={isSaving || !feedback.trim()}
          >
            <CheckCircle2 className="size-4" />
            {isSaving ? "Completing..." : "Complete Visit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FieldExecutiveDashboardScreen() {
  const [routeStarted, setRouteStarted] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState<RouteOrigin | null>(null);
  const [activeRouteVisitId, setActiveRouteVisitId] = useState<string | null>(
    null,
  );
  const [completionVisit, setCompletionVisit] =
    useState<FieldExecutiveVisit | null>(null);
  const [completionFeedback, setCompletionFeedback] = useState("");
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

  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const dashboard = useFieldExecutiveDashboard();
  const siteVisits = useSiteVisits("");
  const { checkIn, checkOut } = useVisitAttendance();
  useFieldExecutiveChrome({
    activeItem: "Dashboard",
    breadcrumbs: <span>Dashboard</span>,
  });

  const todaySchedule = useMemo<FieldExecutiveVisit[]>(
    () =>
      (siteVisits.data?.rows ?? [])
        .filter((visit) => isToday(visit.scheduledAt))
        .sort(
          (left, right) =>
            new Date(left.scheduledAt).getTime() -
            new Date(right.scheduledAt).getTime(),
        )
        .map((visit) => ({
          id: visit.id,
          displayId: visit.displayId,
          scheduledAt: visit.scheduledAt,
          time: formatTime(visit.scheduledAt),
          leadId: visit.leadId,
          leadName: visit.leadName,
          leadPhone: visit.leadPhone,
          projectId: visit.projectId,
          projectName: visit.projectName,
          location: visit.projectLocation ?? visit.projectName,
          meetingPoint: visit.meetingPoint ?? "Meeting point pending",
          status: visit.status,
          checkedInAt: visit.checkedInAt,
          checkedOutAt: visit.checkedOutAt,
          projectLatitude: visit.projectLatitude,
          projectLongitude: visit.projectLongitude,
          projectGeofenceRadiusM: visit.projectGeofenceRadiusM,
        })),
    [siteVisits.data?.rows],
  );

  if (dashboard.isLoading || siteVisits.isLoading)
    return (
      <WorkspacePage className="flex min-h-[70vh] items-center justify-center text-sm font-semibold text-muted-foreground">
        Loading your field dashboard...
      </WorkspacePage>
    );
  if (!dashboard.data || siteVisits.isError)
    return (
      <WorkspacePage className="text-sm font-semibold text-destructive">
        Unable to load your field dashboard.
      </WorkspacePage>
    );
  const { data } = dashboard;
  const checkedIn = todaySchedule.filter((visit) => visit.checkedInAt).length;
  const checkedOut = todaySchedule.filter((visit) => visit.checkedOutAt).length;
  const activeRouteVisit =
    todaySchedule.find((visit) => visit.id === activeRouteVisitId) ?? null;
  const routeStops = activeRouteVisit ? [activeRouteVisit] : todaySchedule;
  const startVisitNavigation = (visit: FieldExecutiveVisit) => {
    requestPosition((position) => {
      setRouteOrigin({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
      setActiveRouteVisitId(visit.id);
      setRouteStarted(true);
      toast.success(`Route started for ${visit.projectName ?? "site visit"}.`);
    }, "start the visit route");
  };
  const undoStartedVisit = () => {
    setRouteStarted(false);
    setRouteOrigin(null);
    setActiveRouteVisitId(null);
    toast.success("Visit start undone.");
  };
  const clearStartedVisit = () => {
    setRouteStarted(false);
    setRouteOrigin(null);
    setActiveRouteVisitId(null);
  };
  const openCompletionDialog = (visit: FieldExecutiveVisit) => {
    setCompletionVisit(visit);
    setCompletionFeedback("");
    setCompletionLeadStatus("Site Visit Done");
    setCompletionFollowUpDate("");
    setCompletionFollowUpTime("10:00 AM");
  };
  const closeCompletionDialog = () => {
    setCompletionVisit(null);
    setCompletionFeedback("");
    setCompletionLeadStatus("Site Visit Done");
    setCompletionFollowUpDate("");
    setCompletionFollowUpTime("10:00 AM");
  };
  const completeVisit = () => {
    if (!completionVisit) return;
    const feedback = completionFeedback.trim();
    if (!feedback) {
      toast.error("Feedback is required to complete the visit.");
      return;
    }
    const nextFollowUpAt = completionFollowUpDate
      ? scheduledInputToIso(
          completionFollowUpDate,
          completionFollowUpTime || "10:00 AM",
        )
      : undefined;

    requestPosition(
      (position) =>
        checkOut.mutate(
          {
            id: completionVisit.id,
            position,
            feedback,
            outcome: "Completed",
            leadStatus: completionLeadStatus,
            followUpDate: completionFollowUpDate,
            followUpTime: completionFollowUpTime,
            nextFollowUpAt,
          },
          {
            onSuccess: () => {
              if (completionVisit.leadId) {
                void api
                  .patch(`/leads/${completionVisit.leadId}`, {
                    status: completionLeadStatus,
                    statusId: completionLeadStatus,
                    followUpDate:
                      nextFollowUpAt || completionFollowUpDate || undefined,
                    nextFollowUpAt: nextFollowUpAt || undefined,
                    remarks: `[Site Visit Remark] ${feedback}`,
                  })
                  .catch(() => null);

                if (completionFollowUpDate) {
                  void api
                    .post(`/leads/${completionVisit.leadId}/follow-ups`, {
                      scheduledAt: nextFollowUpAt,
                      followUpDate: completionFollowUpDate,
                      followUpTime: completionFollowUpTime || "10:00 AM",
                      nextAction: "Follow-up after site visit",
                      notes: feedback || "Site visit completed",
                    })
                    .catch(() => null);
                }
              }
              toast.success("Visit completed.");
              closeCompletionDialog();
            },
            onError: (error) =>
              toast.error(
                getApiErrorMessage(error, "Unable to complete visit"),
              ),
          },
        ),
      "complete the visit",
    );
  };
  const handleStartRoute = () => {
    const nextVisit = todaySchedule.find(
      (visit) => !visit.checkedInAt && !visit.checkedOutAt,
    );
    if (!nextVisit) {
      toast.error("No pending site visits available to start.");
      return;
    }
    startVisitNavigation(nextVisit);
  };
  const kpis = [
    [
      "Assigned Leads",
      data.kpis.assignedLeads,
      User,
      "bg-blue-50 text-blue-700",
      () => navigate("/field-executive/leads"),
    ],
    [
      "Today's Site Visits",
      todaySchedule.length,
      CalendarCheck,
      "bg-cyan-50 text-cyan-700",
      () => navigate("/field-executive/site-visits"),
    ],
    [
      "Upcoming Visits",
      data.kpis.upcomingVisits,
      Clock,
      "bg-violet-50 text-violet-700",
      () => navigate("/field-executive/site-visits"),
    ],
    [
      "Completed Visits",
      data.kpis.completedVisits,
      CheckCircle2,
      "bg-green-50 text-green-700",
      () => navigate("/field-executive/site-visits"),
    ],
    [
      "Pending Follow-ups",
      data.kpis.pendingFollowUps,
      Phone,
      "bg-orange-50 text-orange-700",
      () => navigate("/field-executive/follow-ups"),
    ],
    [
      "Missed Visits",
      data.kpis.missedVisits,
      UserX,
      "bg-red-50 text-red-700",
      () => navigate("/field-executive/site-visits"),
    ],
    [
      "Visits Pending Start",
      Math.max(todaySchedule.length - checkedIn, 0),
      ClipboardList,
      "bg-amber-50 text-amber-700",
      () => navigate("/field-executive/site-visits"),
    ],
    [
      "Bookings Done",
      data.kpis.bookingsAssisted,
      CircleDollarSign,
      "bg-indigo-50 text-indigo-700",
      undefined,
    ],
  ] as const;
  const maxFunnelValue = Math.max(
    ...data.funnel.map((item: any) => item.value),
    1,
  );

  return (
    <WorkspacePage>
      <section className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-secondary">Dashboard</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Field operations overview for {user?.fullName ?? "Sales Executive"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 shadow-none"
            onClick={() =>
              void Promise.all([dashboard.refetch(), siteVisits.refetch()])
            }
          >
            <RefreshCw className="size-4" strokeWidth={1.5} /> Refresh
          </Button>
          <Button
            type="button"
            className="h-10"
            disabled={routeStarted}
            onClick={handleStartRoute}
          >
            <Route className="size-4" strokeWidth={1.5} />
            {routeStarted ? "Route Started" : "Start Route"}
          </Button>
          {routeStarted ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 shadow-none"
              onClick={undoStartedVisit}
            >
              Undo
            </Button>
          ) : null}
        </div>
      </section>

      <DashboardAttendanceCard />

      <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
        {kpis.map(([label, value, Icon, tone, onClick]) => (
          <DashboardKpiCard
            key={label}
            label={label}
            value={value}
            icon={Icon}
            toneClassName={tone}
            onClick={onClick}
          />
        ))}
      </section>

      <PerformanceRankingCard />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT COLUMN */}
        <div className="space-y-5">
          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-extrabold text-secondary">
                  Today&apos;s Upcoming Site Visits
                </h2>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  Start routes, check in, and complete visits from one schedule.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate("/field-executive/site-visits")}
              >
                View Full Schedule
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table className="min-w-[1180px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] whitespace-nowrap">
                      Time
                    </TableHead>
                    <TableHead className="w-[180px]">Lead / Customer</TableHead>
                    <TableHead className="w-[170px]">Project</TableHead>
                    <TableHead className="w-[170px]">Location</TableHead>
                    <TableHead className="w-[160px]">Meeting Point</TableHead>
                    <TableHead className="w-[130px]">Status</TableHead>
                    <TableHead className="w-[360px] text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todaySchedule.length ? (
                    todaySchedule.map((visit) => (
                      <TableRow key={visit.id} className="align-middle">
                        <TableCell className="whitespace-nowrap py-4 font-extrabold leading-5 text-secondary">
                          {visit.time}
                        </TableCell>
                        <TableCell className="py-4">
                          <Link
                            className="font-bold text-secondary hover:text-primary"
                            to={`/field-executive/leads/${visit.leadId}`}
                          >
                            {visit.leadName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {visit.leadPhone}
                          </p>
                        </TableCell>
                        <TableCell className="py-4 font-semibold leading-6 text-secondary">
                          {visit.projectName}
                        </TableCell>
                        <TableCell className="py-4 text-sm font-semibold leading-6 text-secondary">
                          {visit.location}
                        </TableCell>
                        <TableCell className="py-4 text-sm font-semibold leading-6 text-secondary">
                          {visit.meetingPoint}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className="border-0 bg-blue-50 text-blue-700">
                            {visit.checkedOutAt
                              ? "Visit Completed"
                              : visit.checkedInAt
                              ? "Meeting in Progress"
                              : visit.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2.5 whitespace-nowrap">
                            <div className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200/80 bg-slate-50/80 p-1 shadow-sm">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`View site visit for ${visit.leadName}`}
                                className="size-8 border-slate-200 bg-white p-1.5 shadow-none hover:bg-slate-100"
                                asChild
                              >
                                <Link
                                  to={buildFieldExecutiveSiteVisitPath(
                                    visit.id,
                                  )}
                                >
                                  <CalendarCheck
                                    className="size-4 text-slate-600"
                                    strokeWidth={1.5}
                                  />
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`Call ${visit.leadName}`}
                                className="size-8 border-slate-200 bg-white p-1.5 shadow-none hover:bg-slate-100"
                                asChild
                              >
                                <a href={`tel:${visit.leadPhone}`}>
                                  <Phone
                                    className="size-4 text-slate-600"
                                    strokeWidth={1.5}
                                  />
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={`Navigate to ${visit.projectName}`}
                                className="size-8 border-slate-200 bg-white p-1.5 shadow-none hover:bg-slate-100"
                                asChild
                              >
                                <a
                                  target="_blank"
                                  rel="noreferrer"
                                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                                    visit.location ?? "Mumbai",
                                  )}`}
                                >
                                  <Send
                                    className="size-4 text-slate-600"
                                    strokeWidth={1.5}
                                  />
                                </a>
                              </Button>
                            </div>
                            <AttendanceAction
                              visit={visit}
                              checkIn={checkIn}
                              checkOut={checkOut}
                              isStarted={activeRouteVisitId === visit.id}
                              onStartVisit={startVisitNavigation}
                              onUndoStart={undoStartedVisit}
                              onCheckInSuccess={clearStartedVisit}
                              onCompleteVisit={openCompletionDialog}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-10 text-center text-sm text-muted-foreground"
                      >
                        No site visits scheduled for today.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
            <Card className="rounded-md border border-slate-200 p-4 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-secondary">
                  Today&apos;s Route on Google Maps
                </h2>
                <Badge
                  variant="neutral"
                  className="bg-slate-100 text-secondary hover:bg-slate-100"
                >
                  {activeRouteVisit ? "Active route" : "Planned route"}
                </Badge>
              </div>
              {activeRouteVisit ? (
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  Navigating to{" "}
                  {activeRouteVisit.projectName ?? "selected site visit"}. Undo
                  start if this was selected by mistake.
                </p>
              ) : null}
              <div className="mt-4">
                <RouteMap
                  stops={routeStops}
                  routeStarted={routeStarted}
                  origin={routeOrigin}
                />
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="rounded-md border border-slate-200 p-4 shadow-card">
                <h2 className="font-extrabold text-secondary">
                  Site Visit Funnel Overview
                </h2>
                <div className="mt-5 space-y-3">
                  {data.funnel.map((item: any, index: any) => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-xs font-semibold text-muted-foreground">
                        <span>{item.label}</span>
                        <span className="font-extrabold text-secondary">
                          {item.value}
                        </span>
                      </div>
                      <div className="h-6 overflow-hidden rounded-md bg-slate-100">
                        <div
                          className={`h-full rounded-md ${
                            ["bg-slate-300", "bg-slate-300", "bg-primary"][
                              index
                            ]
                          }`}
                          style={{
                            width: `${Math.max(
                              (item.value / maxFunnelValue) * 100,
                              item.value ? 12 : 0,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-md border border-slate-200 p-4 shadow-card">
                <h2 className="font-extrabold text-secondary">
                  Check-in Status
                </h2>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {[
                    ["Checked in", checkedIn, "text-green-600"],
                    [
                      "Pending",
                      Math.max(todaySchedule.length - checkedIn, 0),
                      "text-orange-500",
                    ],
                    ["Checked out", checkedOut, "text-blue-600"],
                    ["Missed", data.kpis.missedVisits, "text-red-600"],
                  ].map(([label, value, tone]) => (
                    <div
                      key={String(label)}
                      className="rounded-md bg-slate-50 p-3 text-center"
                    >
                      <p className="text-[11px] font-bold text-muted-foreground">
                        {label}
                      </p>
                      <p className={`mt-1 text-xl font-extrabold ${tone}`}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <Card className="rounded-md border border-slate-200 p-4 shadow-card">
            <h2 className="font-extrabold text-secondary">
              Today&apos;s Stops
            </h2>
            <div className="mt-4 divide-y divide-slate-100">
              {todaySchedule.map((visit, index) => (
                <div key={visit.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-7 shrink-0 px-2 py-1 items-center justify-center rounded-full bg-primary text-xs font-extrabold text-white shadow-sm">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-secondary">
                      {visit.projectName}
                    </p>
                    <p className="truncate text-xs font-medium text-muted-foreground">
                      {visit.location}
                    </p>
                  </div>
                  <Badge className="border border-slate-200 bg-white text-secondary shadow-sm">
                    {visit.time}
                  </Badge>
                </div>
              ))}
              {!todaySchedule.length ? (
                <p className="py-6 text-sm font-medium text-muted-foreground">
                  No route stops today.
                </p>
              ) : null}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">
          <Card className="rounded-md border border-slate-200 p-4 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-secondary">My Day</h2>
              <Clock className="size-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ["Today's visits", todaySchedule.length],
                ["Follow-ups today", data.kpis.pendingFollowUps],
                [
                  "Visits pending start",
                  Math.max(todaySchedule.length - checkedIn, 0),
                ],
                ["Completed visits", checkedOut],
                ["Next visit", todaySchedule[0]?.time ?? "-"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <span className="font-semibold text-muted-foreground">
                    {label}
                  </span>
                  <span className="font-extrabold text-secondary">{value}</span>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-6 w-full font-bold shadow-sm"
              onClick={() => navigate("/field-executive/site-visits")}
            >
              View My Schedule
            </Button>
          </Card>

          <Card className="rounded-md border border-slate-200 p-4 shadow-card">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-secondary">
                Alerts & Notifications
              </h2>
              <BellRing className="size-4 text-primary" strokeWidth={1.5} />
            </div>
            <div className="mt-4 space-y-3">
              {todaySchedule.slice(0, 2).map((visit) => (
                <div
                  key={visit.id}
                  className="rounded-md border border-slate-100 p-3 shadow-sm"
                >
                  <p className="text-sm font-bold text-secondary">
                    Upcoming visit
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {visit.leadName} - {visit.projectName}
                  </p>
                  <p className="mt-1.5 text-xs font-bold text-primary">
                    {visit.time}
                  </p>
                </div>
              ))}
              {data.kpis.pendingFollowUps > 0 ? (
                <div className="rounded-md border border-orange-100 bg-orange-50 p-3 shadow-sm">
                  <p className="text-sm font-bold text-secondary">
                    Follow-up action due
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {data.kpis.pendingFollowUps} pending follow-up
                    {data.kpis.pendingFollowUps === 1 ? "" : "s"}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="rounded-md border border-slate-200 p-4 shadow-card">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-secondary">Recent Activity</h2>
            </div>
            <div className="mt-4 space-y-4">
              {data.recentActivities.length ? (
                data.recentActivities.map((activity: any) => (
                  <div key={activity.id} className="flex gap-3">
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-green-600"
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="text-sm font-bold text-secondary">
                        {activity.title}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                        {activity.description ||
                          formatDateTime(activity.occurredAt)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  No recent field activity.
                </p>
              )}
            </div>
          </Card>

          <Card className="rounded-md border border-slate-200 p-4 shadow-card">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="font-extrabold text-secondary">Quick Actions</h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                className="font-bold shadow-sm"
                onClick={() => setRouteStarted(true)}
              >
                <Route className="mr-1.5 size-4" strokeWidth={1.5} /> Start
                Route
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-bold shadow-sm"
                onClick={() => navigate("/field-executive/site-visits")}
              >
                <MapPin className="mr-1.5 size-4" strokeWidth={1.5} /> Start
                Visit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-bold shadow-sm"
                onClick={() => navigate("/field-executive/follow-ups")}
              >
                <ClipboardList className="mr-1.5 size-4" strokeWidth={1.5} />{" "}
                Add Follow-up
              </Button>
              <Button
                type="button"
                variant="outline"
                className="font-bold shadow-sm"
                asChild
              >
                <a href={`tel:${todaySchedule[0]?.leadPhone ?? ""}`}>
                  <Phone className="mr-1.5 size-4" strokeWidth={1.5} /> Call
                  Lead
                </a>
              </Button>
            </div>
          </Card>
        </div>
      </section>
      <CompleteVisitDialog
        visit={completionVisit}
        feedback={completionFeedback}
        leadStatus={completionLeadStatus}
        followUpDate={completionFollowUpDate}
        followUpTime={completionFollowUpTime}
        masterStatusOptions={masterStatusOptions}
        isSaving={checkOut.isPending}
        onFeedbackChange={setCompletionFeedback}
        onLeadStatusChange={setCompletionLeadStatus}
        onFollowUpDateChange={setCompletionFollowUpDate}
        onFollowUpTimeChange={setCompletionFollowUpTime}
        onClose={closeCompletionDialog}
        onSubmit={completeVisit}
      />
    </WorkspacePage>
  );
}
