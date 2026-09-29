import {
  Building2,
  CalendarCheck,
  Clock3,
  Edit3,
  FileText,
  ImageOff,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
} from "ui";
import { useProjects } from "../../../projects/useProjectsApi";
import { getProjectImageGallery } from "../../../projects/projectsData";
import type { LabelValue, LeadDetailsData } from "../leadDetailsTypes";
import { useFollowUpMutations } from "../../follow-up/useFollowUpsWorkspace";

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
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

function getItemValue(items: LabelValue[], label: string, fallback = "-") {
  return items.find((item) => item.label === label)?.value || fallback;
}

function getRequirementValue(
  data: LeadDetailsData,
  label: string,
  fallback = "-",
) {
  return (
    data.requirements.find((item) => item.label === label)?.value || fallback
  );
}

function LeadOperationsCard({ data }: { data: LeadDetailsData }) {
  const latestRemark =
    data.notes[0] || data.followUp?.notes || "No remarks added";
  const nextFollowUp = data.followUp
    ? `${data.followUp.date}, ${data.followUp.time}`
    : "Not scheduled";
  const fields = [
    { label: "Added date", value: data.profile.createdOn, icon: CalendarCheck },
    { label: "Last update", value: data.profile.lastUpdated, icon: Clock3 },
    { label: "Source", value: data.profile.source, icon: Phone },
    { label: "Lead status", value: data.profile.status, icon: FileText },
    { label: "Lead type", value: data.profile.temperature, icon: FileText },
    { label: "Executive", value: data.profile.assignedTo, icon: UserRound },
    { label: "Follow-up date", value: nextFollowUp, icon: CalendarCheck },
    { label: "Remark", value: latestRemark, icon: FileText },
  ];

  return (
    <Panel title="Lead pipeline summary">
      <div className="grid gap-3 md:grid-cols-2">
        {fields.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-md border border-slate-200 bg-slate-50/70 p-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-blue-700 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-extrabold leading-5 text-secondary">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function ProjectContextCard({ data }: { data: LeadDetailsData }) {
  const navigate = useNavigate();
  const projectsQuery = useProjects("");
  const preferredProject = getRequirementValue(
    data,
    "Preferred Project",
    "Not selected",
  );
  const location = getRequirementValue(
    data,
    "Preferred Location",
    data.profile.location,
  );
  const configuration = getRequirementValue(
    data,
    "Configuration",
    "Not captured",
  );
  const budget = getRequirementValue(data, "Budget Range", "Not captured");
  const projectMatch = data.matchingProjects?.[0] ?? null;
  const resolvedProject = useMemo(() => {
    const catalog = projectsQuery.data?.projects ?? [];
    const normalizedPreferredProject = preferredProject.trim().toLowerCase();
    const normalizedLocation = location.trim().toLowerCase();

    const byMatchProjectId = projectMatch?.projectId
      ? catalog.find((project) => project.id === projectMatch.projectId)
      : null;
    if (byMatchProjectId) return byMatchProjectId;

    const byPreferredName = catalog.find(
      (project) =>
        project.name.trim().toLowerCase() === normalizedPreferredProject,
    );
    if (byPreferredName) return byPreferredName;

    if (normalizedPreferredProject && normalizedLocation) {
      const byNameAndLocation = catalog.find(
        (project) =>
          project.name
            .trim()
            .toLowerCase()
            .includes(normalizedPreferredProject) &&
          project.location.trim().toLowerCase().includes(normalizedLocation),
      );
      if (byNameAndLocation) return byNameAndLocation;
    }

    return null;
  }, [
    location,
    preferredProject,
    projectMatch?.projectId,
    projectsQuery.data?.projects,
  ]);
  const projectName =
    resolvedProject?.name || projectMatch?.name || preferredProject;
  const projectLocation =
    resolvedProject?.location || projectMatch?.location || location;
  const projectConfiguration =
    resolvedProject?.configurations?.join(", ") ||
    projectMatch?.configuration ||
    configuration;
  const projectPriceRange =
    resolvedProject?.priceRange || projectMatch?.priceRange || budget;
  const projectGallery = resolvedProject
    ? getProjectImageGallery(resolvedProject).filter(Boolean).slice(0, 3)
    : projectMatch?.imageUrl
    ? [projectMatch.imageUrl]
    : [];
  const projectDeveloper = resolvedProject?.developer || "Project preview";
  const projectHighlights = resolvedProject?.highlights?.slice(0, 2) ?? [];
  const canOpenProject = Boolean(resolvedProject?.id);
  const projectFacts = [
    {
      label: "Project area",
      value: projectLocation,
      icon: MapPin,
    },
    {
      label: "Configuration",
      value: projectConfiguration,
      icon: Building2,
    },
    {
      label: "Budget range",
      value: projectPriceRange,
      icon: Sparkles,
    },
    {
      label: "Lead preference",
      value: preferredProject,
      icon: CalendarCheck,
    },
  ];

  return (
    <Panel title="Project mapping" className="overflow-hidden p-5">
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.08fr)_minmax(20rem,0.92fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
            {projectGallery.length ? (
              <div className="space-y-3 bg-slate-950 p-3">
                <div className="relative h-[270px] overflow-hidden rounded-lg">
                  <img
                    src={projectGallery[0]}
                    alt={`${projectName} preview 1`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/72 to-transparent p-4">
                    <h3 className="text-2xl font-extrabold leading-tight text-white">
                      {projectName}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {projectDeveloper}
                    </p>
                  </div>
                </div>
                {projectGallery.length > 1 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {projectGallery.slice(1, 4).map((imageUrl, index) => (
                      <div
                        key={`${imageUrl}-${index}`}
                        className="overflow-hidden rounded-lg border border-white/10 bg-slate-900"
                      >
                        <img
                          src={imageUrl}
                          alt={`${projectName} preview ${index + 2}`}
                          className="h-24 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex h-[250px] items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
                <div className="flex flex-col items-center gap-3 text-center text-slate-200">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/10">
                    <ImageOff className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">
                      Project image unavailable
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-300">
                      This lead is mapped, but no preview media is attached yet.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-white px-3 py-1 text-xs font-bold text-secondary shadow-sm">
                <MapPin className="mr-1 h-3.5 w-3.5 text-blue-700" />
                {projectLocation}
              </Badge>
              <Badge className="border-0 bg-white px-3 py-1 text-xs font-bold text-secondary shadow-sm">
                <Building2 className="mr-1 h-3.5 w-3.5 text-blue-700" />
                {projectConfiguration}
              </Badge>
              <Badge className="border-0 bg-white px-3 py-1 text-xs font-bold text-secondary shadow-sm">
                <Sparkles className="mr-1 h-3.5 w-3.5 text-blue-700" />
                {projectPriceRange}
              </Badge>
            </div>
            {projectHighlights.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {projectHighlights.map((highlight) => (
                  <Badge
                    key={highlight}
                    className="border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-secondary"
                  >
                    {highlight}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-blue-100 bg-blue-50/65 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-blue-700">
                  Lead mapped to
                </p>
                <p className="mt-2 text-xl font-extrabold text-secondary">
                  {projectName}
                </p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {projectLocation}
                </p>
              </div>
              <Button
                type="button"
                variant={canOpenProject ? "primary" : "outline"}
                className="h-10 rounded-lg px-4 text-sm font-extrabold"
                disabled={!canOpenProject}
                onClick={() => {
                  if (!resolvedProject?.id) return;
                  navigate(`/projects/${resolvedProject.id}`);
                }}
              >
                View project
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {projectFacts.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="min-h-[112px] rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="">
                    <div className="flex items-center gap-3 ">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-blue-700 shadow-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 ">
                        <p className="text-xs font-bold text-muted-foreground">
                          {item.label}
                        </p>
                      </div>
                    </div>

                    <div className="">
                      <p className="mt-1 break-words text-sm font-extrabold leading-6 text-secondary">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-extrabold text-secondary">
              Project workspace
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
              Open the project record for deeper inventory, media, and unit
              details.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function NotesCard({ data }: { data: LeadDetailsData }) {
  const previewNotes = data.notes.slice(0, 3);

  return (
    <Panel title="Remarks and notes">
      <div className="space-y-3">
        {previewNotes.length ? (
          previewNotes.map((note, index) => (
            <div
              key={`${note}-${index}`}
              className="rounded-md border border-slate-200 bg-slate-50/70 p-3 text-sm font-semibold leading-6 text-secondary"
            >
              {note}
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm font-semibold text-muted-foreground">
            No remarks or notes captured yet
          </div>
        )}
      </div>
      <p className="mt-4 text-xs font-semibold text-muted-foreground">
        {data.noteMeta}
      </p>
    </Panel>
  );
}

function ActivityTimelineCard({
  data,
  onViewFullTimeline,
}: {
  data: LeadDetailsData;
  onViewFullTimeline: () => void;
}) {
  return (
    <Panel
      title="Activity Timeline"
      action={
        <Select defaultValue="all">
          <SelectTrigger
            aria-label="Activity filter"
            className="h-9 w-32 rounded-md text-xs font-bold shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-5">
        {data.timeline.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="grid grid-cols-[62px_36px_minmax(0,1fr)_82px] gap-3"
            >
              <span className="text-xs font-semibold text-muted-foreground">
                {item.time}
              </span>
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full",
                  item.tone,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-secondary">
                  {item.title}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {item.description}
                </p>
                {item.helper ? (
                  <p className="mt-2 text-xs font-extrabold text-secondary">
                    {item.helper}
                  </p>
                ) : null}
              </div>
              <span className="text-right text-[11px] font-semibold text-muted-foreground">
                {item.date}
              </span>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mt-5 h-10 w-full rounded-md text-xs font-extrabold text-blue-700"
        onClick={onViewFullTimeline}
      >
        View Full Timeline
      </Button>
    </Panel>
  );
}

function LeadIdentityCard({ data }: { data: LeadDetailsData }) {
  const items = [
    {
      label: "Name",
      value: getItemValue(data.about, "Full Name"),
      icon: UserRound,
    },
    {
      label: "Number",
      value: getItemValue(data.about, "Mobile Number"),
      icon: Phone,
    },
    {
      label: "Alternate number",
      value: getItemValue(data.about, "Alternate Number"),
      icon: Phone,
    },
    {
      label: "Email",
      value: getItemValue(data.about, "Email Address"),
      icon: Mail,
    },
    {
      label: "Address",
      value: getItemValue(data.about, "Address", data.profile.location),
      icon: MapPin,
    },
  ];

  return (
    <Panel title="Lead identity">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-md border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-50 text-blue-700">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-extrabold leading-5 text-secondary">
                    {item.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function FollowUpCard({ data }: { data: LeadDetailsData }) {
  const { updateFollowUp } = useFollowUpMutations();
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [completionCallOutcome, setCompletionCallOutcome] =
    useState("Connected");

  const completionRequiresCallOutcome = data.followUp?.type
    ?.toLowerCase()
    .includes("call");
  const isCompletedFollowUp =
    data.followUp?.status?.toLowerCase().includes("completed") ?? false;

  const handleOpenCompletion = () => {
    setCompletionRemarks("");
    setCompletionCallOutcome("Connected");
    setCompletionOpen(true);
  };

  const handleConfirmComplete = () => {
    if (!data.followUp?.id || !data.followUp.leadId) {
      toast.error("Follow-up context is missing for this lead");
      return;
    }
    if (!completionRemarks.trim()) {
      toast.error(
        completionRequiresCallOutcome
          ? "Add the call summary before completing this follow-up"
          : "Add completion remarks before completing this follow-up",
      );
      return;
    }

    const notes = completionRequiresCallOutcome
      ? `Call Outcome: ${completionCallOutcome}\nRemarks: ${completionRemarks.trim()}`
      : completionRemarks.trim();

    updateFollowUp.mutate(
      {
        leadId: data.followUp.leadId,
        followUpId: data.followUp.id,
        payload: {
          completed: true,
          status: "Completed",
          nextAction: data.followUp.nextAction,
          remarks: notes,
          notes,
        },
      },
      {
        onSuccess: () => {
          toast.success("Follow-up marked completed");
          setCompletionOpen(false);
          setCompletionRemarks("");
          setCompletionCallOutcome("Connected");
        },
        onError: () => toast.error("Unable to complete follow-up"),
      },
    );
  };

  if (!data.followUp) {
    return (
      <Panel title="Next Follow-up">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <CalendarCheck className="mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold text-muted-foreground">
            No active follow-ups
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-9 rounded-md text-xs font-extrabold shadow-none"
          >
            Schedule Follow-up
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Next Follow-up"
      action={
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
          <Edit3 className="h-4 w-4" />
        </Button>
      }
    >
      <div className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-md border border-slate-100 p-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <CalendarCheck className="h-5 w-5" />
        </span>
        <div className="grid grid-cols-2 gap-2 text-sm font-extrabold text-secondary">
          <span>{data.followUp.date}</span>
          <span>{data.followUp.time}</span>
        </div>
        <Badge className="border-0 bg-orange-50 text-primary">
          {data.followUp.due}
        </Badge>
      </div>
      <div className="mt-4 space-y-3 text-sm">
        {[
          ["Follow-up Type", data.followUp.type],
          ["Assigned To", data.followUp.assignedTo],
          ["Remarks", data.followUp.notes],
        ].map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[120px_minmax(0,1fr)] gap-3"
          >
            <span className="font-semibold text-muted-foreground">{label}</span>
            <span className="font-extrabold text-secondary">{value}</span>
          </div>
        ))}
      </div>
      {!isCompletedFollowUp ? (
        <Button
          type="button"
          className="mt-5 h-11 w-full rounded-md bg-primary text-sm font-extrabold text-white hover:bg-primary/90"
          onClick={handleOpenCompletion}
        >
          Mark as Completed
        </Button>
      ) : (
        <div className="mt-5 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-extrabold text-success">
          This follow-up has already been completed.
        </div>
      )}
      <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
        <DialogContent className="max-w-xl rounded-xl border border-slate-200 bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Complete follow-up
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              Close the {data.followUp.type.toLowerCase()} follow-up with clear outcome remarks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-extrabold text-secondary">
                {data.profile.name}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Scheduled {data.followUp.date} at {data.followUp.time}
              </p>
              <Badge className="mt-3 border-0 bg-blue-100 text-blue-700">
                {data.followUp.type}
              </Badge>
            </div>

            {completionRequiresCallOutcome ? (
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-secondary">
                  Call outcome
                </p>
                <Select
                  value={completionCallOutcome}
                  onValueChange={setCompletionCallOutcome}
                >
                  <SelectTrigger className="h-11 rounded-md text-sm font-semibold shadow-none">
                    <SelectValue placeholder="Select call outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Connected",
                      "Callback Requested",
                      "No Answer",
                      "Interested",
                      "Not Interested",
                    ].map((outcome) => (
                      <SelectItem key={outcome} value={outcome}>
                        {outcome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-extrabold text-secondary">
                {completionRequiresCallOutcome
                  ? "Call summary"
                  : "Completion remarks"}
              </p>
              <Textarea
                value={completionRemarks}
                placeholder={
                  completionRequiresCallOutcome
                    ? "Capture how the call went, what the lead said, and the next context."
                    : "Capture how this follow-up went and any closing remarks."
                }
                className="min-h-[120px] rounded-md py-3 text-sm font-semibold"
                onChange={(event) => setCompletionRemarks(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 shadow-none"
                onClick={() => setCompletionOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-10 rounded-md px-4"
                disabled={updateFollowUp.isPending}
                onClick={handleConfirmComplete}
              >
                {updateFollowUp.isPending ? "Saving..." : "Complete follow-up"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

export function OverviewTab({
  data,
  leadId: _leadId,
  onViewFullTimeline,
}: {
  data: LeadDetailsData;
  leadId: string;
  onViewFullTimeline: () => void;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.94fr)]">
      <div className="space-y-5">
        <LeadOperationsCard data={data} />
        <LeadIdentityCard data={data} />
        <NotesCard data={data} />
      </div>
      <aside className="space-y-5">
        <ProjectContextCard data={data} />
        <ActivityTimelineCard
          data={data}
          onViewFullTimeline={onViewFullTimeline}
        />
        <FollowUpCard data={data} />
      </aside>
    </section>
  );
}
