import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
import { useMemo } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, cn } from "ui";
import { WorkspacePage } from "../../../../components/layout/PageHeader";

import { getFirstInventoryImage } from "../../bookings/bookingUiUtils";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import { addLeadSidebarItems } from "../add/addLeadData";
import {
  fieldExecutiveSidebarItems,
} from "../../../field-executive/fieldExecutiveData";
import {
  buildFieldExecutiveLeadPath,
  FIELD_EXECUTIVE_SITE_VISITS_PATH,
  isFieldExecutivePath,
} from "../../../field-executive/fieldExecutiveRouteContext";
import { HrEmployeeIdentityCell } from "../../../hr/components/HrEmployeeIdentityCell";
import {
  useSiteVisit,
  useSiteVisitOptions,
} from "./useSiteVisits";

const rawIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const hasHumanLabel = (value?: string | null) =>
  Boolean(value && !rawIdPattern.test(value) && value.length < 29);

const visitReference = (value?: string | null) =>
  hasHumanLabel(value) ? value : "Site visit";

const leadReference = (value?: string | null) => (hasHumanLabel(value) ? value : "-");

const formatVisitDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusClassName = (status?: string) =>
  status === "Completed"
    ? "bg-green-50 text-success"
    : status === "Cancelled"
    ? "bg-red-50 text-red-600"
    : status === "Upcoming"
    ? "bg-blue-50 text-blue-700"
    : "bg-orange-50 text-primary";

const statusLabel = (visit: { checkedInAt?: string | null; checkedOutAt?: string | null }) =>
  visit.checkedOutAt
    ? "Visit completed"
    : visit.checkedInAt
    ? "Meeting in progress"
    : "Not started";

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof CalendarCheck;
}) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-sm font-extrabold text-secondary">
            {value || "-"}
          </p>
        </div>
      </div>
    </Card>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-secondary">
        {value && value.trim() ? value : "-"}
      </p>
    </div>
  );
}

function SectionTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon: typeof CalendarCheck;
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
        <Icon className="size-4" />
      </span>
      <h2 className="text-base font-extrabold text-secondary">{title}</h2>
    </div>
  );
}

function ContextRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <span
        className={cn(
          "text-right text-sm font-extrabold text-secondary",
          tone === "warning" && "text-primary",
          tone === "danger" && "text-red-600",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function QuickLinkButton({
  label,
  href,
  to,
  icon: Icon,
}: {
  label: string;
  href?: string;
  to?: string;
  icon: typeof MapPin;
}) {
  const content = (
    <>
      <span className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-semibold text-secondary">{label}</span>
      </span>
      <Navigation className="size-4 text-muted-foreground" />
    </>
  );

  if (to) {
    return (
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full justify-between rounded-md border-slate-200 px-4 shadow-none"
        asChild
      >
        <Link to={to}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full justify-between rounded-md border-slate-200 px-4 shadow-none"
      asChild
    >
      <a target="_blank" rel="noreferrer" href={href}>
        {content}
      </a>
    </Button>
  );
}

export function SiteVisitDetailsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { visitId = "" } = useParams();
  const fieldExecutiveRoute = isFieldExecutivePath(location.pathname);
  const detailQuery = useSiteVisit(visitId);
  const optionsQuery = useSiteVisitOptions();

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: fieldExecutiveRoute
          ? fieldExecutiveSidebarItems
          : addLeadSidebarItems,
        activeItem: fieldExecutiveRoute ? "Site Visits" : "Lead Management",
        activeChild: fieldExecutiveRoute ? undefined : "Site Visits",
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span>{fieldExecutiveRoute ? "Field operations" : "Lead management"}</span>
            <span>/</span>
            <span>
              <Link
                to={fieldExecutiveRoute ? FIELD_EXECUTIVE_SITE_VISITS_PATH : "/leads/site-visits"}
                className="hover:text-primary"
              >
                Site visits
              </Link>
            </span>
            <span>/</span>
            <span className="text-foreground">View site visit</span>
          </div>
        ),
      },
    },
    [fieldExecutiveRoute],
  );

  const visit = detailQuery.data;
  const project = useMemo(
    () => optionsQuery.data?.projects.find((item) => item.id === visit?.projectId),
    [optionsQuery.data?.projects, visit?.projectId],
  );
  const unit = useMemo(
    () => project?.units.find((item) => item.id === visit?.unitId),
    [project, visit?.unitId],
  );

  const unitImage = getFirstInventoryImage(
    {
      imageUrl: visit?.unitImageUrl,
      imageGallery: visit?.unitImageGallery,
    },
    {
      imageUrl: visit?.projectImageUrl,
      imageGallery: visit?.projectImageGallery,
    },
  );
  const leadPath =
    visit?.leadDisplayId && hasHumanLabel(visit.leadDisplayId)
      ? fieldExecutiveRoute
        ? buildFieldExecutiveLeadPath(visit.leadDisplayId)
        : `/leads/${visit.leadDisplayId}`
      : visit?.leadId
      ? fieldExecutiveRoute
        ? buildFieldExecutiveLeadPath(visit.leadId)
        : `/leads/${visit.leadId}`
      : "";
  const whatsappPhone = (visit?.leadPhone ?? "").replace(/[^\d+]/g, "");
  const leadEmail = "";
  const reminderLabel = visit?.reminderEnabled
    ? formatVisitDateTime(visit.reminderAt)
    : "No reminder";
  const geofenceLabel =
    visit?.projectLatitude !== null &&
    visit?.projectLatitude !== undefined &&
    visit?.projectLongitude !== null &&
    visit?.projectLongitude !== undefined
      ? `${visit.projectGeofenceRadiusM ?? 150} m radius configured`
      : "Geofence not configured";

  if (detailQuery.isLoading) {
    return (
      <WorkspacePage className="text-sm font-semibold text-muted-foreground">
        Loading site visit details...
      </WorkspacePage>
    );
  }

  if (!visit) {
    return (
      <WorkspacePage className="text-sm font-semibold text-destructive">
        Site visit not found.
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md border-slate-200 px-4 text-xs font-extrabold shadow-none"
          onClick={() =>
            navigate(
              fieldExecutiveRoute
                ? FIELD_EXECUTIVE_SITE_VISITS_PATH
                : "/leads/site-visits",
            )
          }
        >
          <ArrowLeft className="size-4" />
          Back to site visits
        </Button>
        <div className="flex gap-3">
          {leadPath ? (
            <Button type="button" variant="outline" className="h-10 rounded-md border-slate-200 px-4 text-xs font-extrabold shadow-none" asChild>
              <Link to={leadPath}>Open lead</Link>
            </Button>
          ) : null}
          {visit.projectId ? (
            <Button type="button" variant="outline" className="h-10 rounded-md border-slate-200 px-4 text-xs font-extrabold shadow-none" asChild>
              <Link to={`/projects/${visit.projectId}`}>Open project</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_360px]">
        <Card className="overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-card">
          <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="min-h-[312px] bg-slate-100">
              {unitImage ? (
                <img
                  src={unitImage}
                  alt={visit.projectName ?? "Site visit property"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[312px] items-center justify-center text-primary">
                  <Building2 className="size-10" />
                </div>
              )}
            </div>
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("border-0 px-3 py-1 text-[12px] font-extrabold", statusClassName(visit.status))}>
                      {visit.status}
                    </Badge>
                    <Badge className="border-0 bg-slate-100 px-3 py-1 text-[12px] font-extrabold text-secondary">
                      {visitReference(visit.displayId ?? visit.id)}
                    </Badge>
                  </div>
                  <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-secondary">
                    {visit.projectName ?? visit.projectLocation ?? "Site visit"}
                  </h1>
                  <p className="mt-3 flex items-center gap-2 text-xl font-semibold text-blue-800">
                    <MapPin className="size-5 text-blue-700" />
                    {visit.projectLocation || "Project location not available"}
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-11 rounded-md bg-secondary px-5 text-sm font-extrabold text-white hover:bg-secondary/90"
                  asChild
                >
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                      visit.projectLocation || "Mumbai",
                    )}`}
                  >
                    <Navigation className="size-4" />
                    Navigate
                  </a>
                </Button>
              </div>

              <div className="grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-3">
                <SummaryCard
                  label="Scheduled at"
                  value={formatVisitDateTime(visit.scheduledAt)}
                  icon={CalendarCheck}
                />
                <SummaryCard
                  label="Visit type"
                  value={visit.visitType}
                  icon={Clock3}
                />
                <SummaryCard
                  label="Assigned executive"
                  value={visit.assignedExecutiveName ?? "Not assigned"}
                  icon={UserRoundCheck}
                />
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
        <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-card">
          <SectionTitle title="Lead & assignee" icon={UserRound} />
          <div className="mt-5 space-y-5">
            <div className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
              <p className="text-xs font-bold text-muted-foreground">Lead</p>
              <p className="mt-2 text-xl font-extrabold text-secondary">
                {visit.leadName || "Lead"}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span>{leadReference(visit.leadDisplayId)}</span>
                {visit.leadPhone ? (
                  <>
                    <span className="size-1 rounded-full bg-slate-300" />
                    <span>{visit.leadPhone}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {visit.leadPhone ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md border-slate-200 text-xs font-extrabold text-primary shadow-none"
                    asChild
                  >
                    <a href={`tel:${visit.leadPhone}`}>
                      <Phone className="size-4" />
                      Call
                    </a>
                  </Button>
                ) : null}
                {whatsappPhone ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md border-slate-200 text-xs font-extrabold text-success shadow-none"
                    asChild
                  >
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href={`https://wa.me/${whatsappPhone.replace(/^\+/, "")}`}
                    >
                      <MessageCircle className="size-4" />
                      WhatsApp
                    </a>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md border-slate-200 text-xs font-extrabold text-blue-700 shadow-none"
                  asChild
                >
                  <a href={`mailto:${leadEmail || "support@truerootrealty.com"}`}>
                    <Mail className="size-4" />
                    Email
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-bold text-muted-foreground">Assigned executive</p>
              <HrEmployeeIdentityCell
                fullName={visit.assignedExecutiveName ?? "Assigned executive"}
                email={
                  visit.assignedExecutiveRole
                    ? visit.assignedExecutiveRole.replace(/_/g, " ")
                    : "Sales executive"
                }
                image={visit.assignedExecutiveImage}
                disabled
              />
            </div>
          </div>
        </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-5">
          <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-card">
            <SectionTitle title="Visit details" icon={CalendarCheck} />
            <div className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
              <div className="grid gap-5 border-b border-slate-100 pb-5 md:grid-cols-3">
                <SummaryCard label="Project" value={visit.projectName ?? "-"} icon={Building2} />
                <SummaryCard
                  label="Unit"
                  value={
                    unit
                      ? [unit.tower, `Unit ${unit.unitNumber}`, unit.configuration]
                          .filter(Boolean)
                          .join(", ")
                      : visit.unitLabel || "-"
                  }
                  icon={Building2}
                />
                <SummaryCard label="Meeting point" value={visit.meetingPoint || "-"} icon={MapPin} />
              </div>
              <div className="grid gap-5 pt-5 md:grid-cols-3">
                <SummaryCard label="Transport mode" value={visit.transportMode || "-"} icon={Navigation} />
                <SummaryCard label="Visitor count" value={visit.visitorCount ? String(visit.visitorCount) : "1"} icon={UserRoundCheck} />
                <SummaryCard label="Reminder" value={reminderLabel} icon={Bell} />
              </div>
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-3">
            <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-card">
              <SectionTitle title="Special request" icon={CheckCircle2} />
              <p className="text-sm font-semibold leading-7 text-secondary">
                {visit.specialRequest?.trim() || "-"}
              </p>
            </Card>
            <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-card">
              <SectionTitle title="Notes" icon={Mail} />
              <p className="text-sm font-semibold leading-7 text-secondary">
                {visit.notes?.trim() || "-"}
              </p>
            </Card>
            <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-card">
              <SectionTitle title="Feedback & Rating" icon={MessageCircle} />
              {visit.rating ? (
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < (visit.rating ?? 0)
                            ? "fill-amber-400 text-amber-500"
                            : "fill-slate-200 text-slate-200",
                        )}
                      />
                    ))}
                  </span>
                  <span className="text-xs font-extrabold text-secondary">
                    {visit.rating}/5 Stars
                  </span>
                </div>
              ) : null}
              <p className="text-sm font-semibold leading-7 text-secondary">
                {visit.feedback?.trim() || "-"}
              </p>
            </Card>
          </div>
        </div>

        <div className="grid gap-5">
          <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-card">
            <SectionTitle title="Location context / on-site tracking" icon={MapPin} />
            <div className="rounded-md border border-slate-200 bg-white px-4 py-1 shadow-card">
              <ContextRow label="Project location" value={visit.projectLocation || "-"} />
              <ContextRow label="Geofence" value={geofenceLabel} />
              <ContextRow label="Check-in status" value={statusLabel({ checkedInAt: visit.checkedInAt, checkedOutAt: null })} tone={!visit.checkedInAt ? "warning" : "default"} />
              <ContextRow label="Check-out status" value={visit.checkedOutAt ? "Completed" : "Not completed"} tone={!visit.checkedOutAt ? "danger" : "default"} />
            </div>
          </Card>

          <Card className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-card">
            <SectionTitle title="Quick links" icon={Navigation} />
            <div className="space-y-3">
              <QuickLinkButton
                label="Open project location"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  visit.projectLocation || "Mumbai",
                )}`}
                icon={MapPin}
              />
              {leadPath ? (
                <QuickLinkButton
                  label="Open lead details"
                  to={leadPath}
                  icon={UserRoundCheck}
                />
              ) : null}
            </div>
          </Card>
        </div>
      </section>
    </WorkspacePage>
  );
}
