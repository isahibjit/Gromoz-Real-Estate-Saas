import { type ReactNode, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  cn,
} from "ui";
import {
  Building2,
  CalendarClock,
  ChevronRight,
  ExternalLink,
  FileText,
  type LucideIcon,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  UserRound,
} from "lucide-react";

import { api } from "../../../../common/api";

type PreviewNote = {
  id?: string;
  text?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
};

type PreviewFollowUp = {
  id?: string | null;
  scheduledAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  remarks?: string | null;
  assignedToName?: string | null;
};

type PreviewLead = {
  id: string;
  displayId?: string | null;
  name?: string | null;
  email?: string | null;
  mobile?: string | null;
  sourceName?: string | null;
  statusName?: string | null;
  temperatureName?: string | null;
  leadType?: string | null;
  remarks?: string | null;
  telecallerName?: string | null;
  fieldExecutiveName?: string | null;
  ownerName?: string | null;
  preferredProjectName?: string | null;
  preferredProjectLocation?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  requirement?: {
    configuration?: string | null;
    budgetRange?: string | null;
    preferredLocation?: string | null;
    preferredProjectId?: string | null;
    propertyType?: string | null;
  } | null;
  notes?: PreviewNote[];
  followUps?: PreviewFollowUp[];
  projectInterests?: Array<{
    projectName?: string | null;
    projectLocation?: string | null;
    configuration?: string | null;
    priceRange?: string | null;
    isPrimary?: boolean | null;
  }>;
};

type PreviewProjectInterest = NonNullable<
  PreviewLead["projectInterests"]
>[number];

const hasPreviewProjectInterest = (
  project: PreviewProjectInterest | null | undefined,
): project is PreviewProjectInterest =>
  Boolean(project);

type LeadPreviewAction =
  | "assign"
  | "status"
  | "leadType"
  | "followUp"
  | "source"
  | "project"
  | "requirement"
  | "remark";

type LeadPreviewActionConfig = {
  enabled: boolean;
  onClick?: () => void;
};

interface LeadPreviewDialogProps {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenDetails?: (leadId: string) => void;
  actions?: Partial<Record<LeadPreviewAction, LeadPreviewActionConfig>>;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const fallbackText = (value?: string | null, fallback = "Not captured") =>
  value?.trim() || fallback;

function PreviewActionCard({
  icon: Icon,
  label,
  value,
  helper,
  tone = "bg-slate-50 text-secondary",
  action,
  valueClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper?: string;
  tone?: string;
  action?: LeadPreviewActionConfig;
  valueClassName?: string;
}) {
  const interactive = Boolean(action?.enabled && action.onClick);
  const content = (
    <>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md",
            tone,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold text-muted-foreground">
              {label}
            </p>
            {interactive ? (
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-primary" />
            ) : null}
          </div>
          <p
            className={cn(
              "mt-1 min-w-0 line-clamp-2 break-words text-sm font-extrabold leading-5 text-secondary",
              valueClassName,
            )}
            title={value}
          >
            {value}
          </p>
          {helper ? (
            <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-muted-foreground">
              {helper}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
  const className = cn(
    "rounded-md border border-slate-200 bg-white p-3 text-left",
    interactive
      ? "cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      : "cursor-default",
  );

  if (interactive) {
    return (
      <button type="button" className={className} onClick={action?.onClick}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function PreviewPanel({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: LeadPreviewActionConfig;
  className?: string;
}) {
  const interactive = Boolean(action?.enabled && action.onClick);
  const panelClassName = cn(
    "block w-full rounded-md border border-slate-200 bg-white p-4 text-left",
    interactive
      ? "cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      : "cursor-default",
    className,
  );

  if (interactive) {
    return (
      <button type="button" className={panelClassName} onClick={action?.onClick}>
        {children}
      </button>
    );
  }

  return <div className={panelClassName}>{children}</div>;
}

export function LeadPreviewDialog({
  leadId,
  open,
  onOpenChange,
  onOpenDetails,
  actions,
}: LeadPreviewDialogProps) {
  const leadQuery = useQuery({
    queryKey: ["lead-preview", leadId],
    enabled: open && Boolean(leadId),
    queryFn: async () =>
      (await api.get<PreviewLead | null>(`/leads/${leadId}`)).data,
  });

  const lastLeadRef = useRef<PreviewLead | null>(null);
  if (leadQuery.data) {
    lastLeadRef.current = leadQuery.data;
  }
  const lead = leadQuery.data || lastLeadRef.current;
  const latestNotes = lead?.notes?.filter(Boolean).slice(0, 3) ?? [];
  const latestFollowUpRemark = useMemo(
    () =>
      lead?.followUps
        ?.filter(Boolean)
        .find((followUp) => (followUp.remarks || followUp.notes)?.trim()),
    [lead?.followUps],
  );
  const projects = useMemo(() => {
    const rows =
      lead?.projectInterests
        ?.filter(hasPreviewProjectInterest)
        .map((project) => ({
          name: project.projectName,
          location: project.projectLocation,
          configuration: project.configuration,
          budget: project.priceRange,
          isPrimary: project.isPrimary,
        })) ?? [];
    if (rows.length) return rows.slice(0, 3);
    return [
      {
        name: lead?.preferredProjectName,
        location:
          lead?.preferredProjectLocation || lead?.requirement?.preferredLocation,
        configuration: lead?.requirement?.configuration,
        budget: lead?.requirement?.budgetRange,
        isPrimary: true,
      },
    ].filter((project) => project.name || project.location);
  }, [lead]);
  const actionFor = (action: LeadPreviewAction) => actions?.[action];
  const latestRemark =
    latestFollowUpRemark?.remarks || latestFollowUpRemark?.notes || lead?.remarks;
  const requirementSummary = [
    lead?.requirement?.budgetRange,
    lead?.requirement?.preferredLocation,
    lead?.requirement?.configuration,
  ]
    .filter(Boolean)
    .join(" / ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[min(88vh,760px)] !w-[min(94vw,68rem)] !max-w-none flex-col overflow-hidden rounded-xl bg-white p-0">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 pr-14 sm:px-6 sm:py-5 sm:pr-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="text-2xl font-extrabold tracking-[-0.02em] text-secondary">
                Lead preview
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-semibold text-muted-foreground">
                Important customer details, notes, remarks, and project context.
              </DialogDescription>
            </div>
            {lead?.statusName || lead?.temperatureName || lead?.leadType ? (
              <div className="flex flex-wrap gap-2">
                <Badge className="border-0 bg-blue-50 text-blue-700">
                  {fallbackText(lead.statusName, "No status")}
                </Badge>
                <Badge className="border border-green-200 bg-green-50 text-success">
                  {fallbackText(lead.temperatureName || lead.leadType, "No type")}
                </Badge>
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5">
          {leadQuery.isLoading && !lead ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
              Loading lead preview...
            </div>
          ) : leadQuery.isError || !lead ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 px-4 py-6 text-sm font-semibold text-destructive">
              Could not load this lead preview. Open the full lead details page
              and try again.
            </div>
          ) : (
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.9fr)]">
              <section className="min-w-0 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.82fr)]">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-muted-foreground">
                        Lead identity
                      </p>
                      <p
                        className="mt-2 line-clamp-2 break-words text-2xl font-extrabold leading-tight tracking-[-0.02em] text-secondary"
                        title={fallbackText(lead.name, "Unnamed lead")}
                      >
                        {fallbackText(lead.name, "Unnamed lead")}
                      </p>
                      <p className="mt-1 text-xs font-bold text-muted-foreground">
                        {fallbackText(lead.displayId, lead.id)}
                      </p>
                    </div>
                    <div className="grid min-w-0 gap-2">
                      <PreviewActionCard
                        icon={Phone}
                        label="Phone"
                        value={fallbackText(lead.mobile)}
                        tone="bg-orange-50 text-primary"
                        valueClassName="break-all"
                      />
                      <PreviewActionCard
                        icon={Mail}
                        label="Email"
                        value={fallbackText(lead.email)}
                        tone="bg-blue-50 text-blue-700"
                        valueClassName="break-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <PreviewActionCard
                    icon={UserRound}
                    label="Executive"
                    value={fallbackText(
                      [
                        lead.telecallerName
                          ? `Pre Sales: ${lead.telecallerName}`
                          : null,
                        lead.fieldExecutiveName
                          ? `Sales Person: ${lead.fieldExecutiveName}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" / "),
                    )}
                    helper="Update assignment"
                    action={actionFor("assign")}
                  />
                  <PreviewActionCard
                    icon={MessageSquareText}
                    label="Status"
                    value={fallbackText(lead.statusName, "New Lead")}
                    helper="Change lead status"
                    tone="bg-blue-50 text-blue-700"
                    action={actionFor("status")}
                  />
                  <PreviewActionCard
                    icon={MessageSquareText}
                    label="Lead type"
                    value={fallbackText(
                      lead.temperatureName || lead.leadType,
                      "No type",
                    )}
                    helper="Change lead type"
                    tone="bg-green-50 text-success"
                    action={actionFor("leadType")}
                  />
                  <PreviewActionCard
                    icon={Building2}
                    label="Requirement"
                    value={fallbackText(
                      requirementSummary,
                      "Requirement not captured",
                    )}
                    helper="Budget, location, and configuration"
                    action={actionFor("requirement")}
                  />
                  <PreviewActionCard
                    icon={CalendarClock}
                    label="Next follow-up"
                    value={formatDateTime(lead.nextFollowUpAt)}
                    helper="Update reminder"
                    action={actionFor("followUp")}
                  />
                  <PreviewActionCard
                    icon={CalendarClock}
                    label="Last contact"
                    value={formatDateTime(lead.lastContactedAt)}
                  />
                  {actions?.source ? (
                    <PreviewActionCard
                      icon={FileText}
                      label="Source"
                      value={fallbackText(lead.sourceName, "Unknown")}
                      helper="Update lead source"
                      tone="bg-blue-50 text-blue-700"
                      action={actionFor("source")}
                    />
                  ) : null}
                </div>

                <PreviewPanel action={actionFor("remark")} className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquareText className="size-4 text-primary" />
                    <h3 className="text-base font-extrabold text-secondary">
                      Remarks
                    </h3>
                    {actions?.remark?.enabled && actions.remark.onClick ? (
                      <ChevronRight className="ml-auto size-4 text-primary" />
                    ) : null}
                  </div>
                  <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-slate-50 px-3 py-3 text-sm font-semibold leading-6 text-secondary">
                    {fallbackText(latestRemark, "No remarks captured yet.")}
                  </p>
                </PreviewPanel>
              </section>

              <aside className="min-w-0 space-y-4">
                <PreviewPanel action={actionFor("project")} className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-4 text-blue-700" />
                    <h3 className="text-sm font-extrabold text-secondary">
                      Projects
                    </h3>
                    {actions?.project?.enabled && actions.project.onClick ? (
                      <ChevronRight className="ml-auto size-4 text-primary" />
                    ) : null}
                  </div>
                  <div className="mt-3 max-h-[248px] space-y-2 overflow-y-auto pr-1">
                    {projects.length ? (
                      projects.map((project, index) => (
                        <div
                          key={`${project.name ?? "project"}-${index}`}
                          className="rounded-md border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="min-w-0 truncate text-sm font-extrabold text-secondary"
                              title={fallbackText(
                                project.name,
                                "Project not selected",
                              )}
                            >
                              {fallbackText(project.name, "Project not selected")}
                            </p>
                            {project.isPrimary ? (
                              <Badge className="border-0 bg-blue-50 text-blue-700">
                                Primary
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <MapPin className="size-3" />
                            {fallbackText(project.location)}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-secondary">
                            {[project.configuration, project.budget]
                              .filter(Boolean)
                              .join(" / ") || "Requirement not captured"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm font-semibold text-muted-foreground">
                        No project is mapped yet.
                      </p>
                    )}
                  </div>
                </PreviewPanel>

                <div className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <h3 className="text-sm font-extrabold text-secondary">
                      Notes
                    </h3>
                  </div>
                  <div className="mt-3 max-h-[248px] space-y-2 overflow-y-auto pr-1">
                    {latestNotes.length ? (
                      latestNotes.map((note) => (
                        <div
                          key={note.id ?? note.createdAt ?? note.text}
                          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                        >
                          <p className="line-clamp-3 text-xs font-semibold leading-5 text-secondary">
                            {fallbackText(note.text, "No note text")}
                          </p>
                          <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                            {fallbackText(note.authorName, "System")} /{" "}
                            {formatDateTime(note.createdAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-sm font-semibold text-muted-foreground">
                        No notes added yet.
                      </p>
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <p className="max-w-xl text-xs font-semibold leading-5 text-muted-foreground">
            Click enabled sections to update this lead. Restricted fields stay
            view-only for your role.
          </p>
          <div className="flex shrink-0 justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md shadow-none"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            {leadId ? (
              <Button
                type="button"
                className="h-10 rounded-md"
                onClick={() => onOpenDetails?.(leadId)}
              >
                Open full details
                <ExternalLink className="size-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
