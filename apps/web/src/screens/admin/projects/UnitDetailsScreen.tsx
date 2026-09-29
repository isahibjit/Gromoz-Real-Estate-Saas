import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Compass,
  Home,
  Layers3,
  Plus,
  UsersRound,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  Input,
  ScrollArea,
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
  cn,
} from "ui";

import { DashboardHeader } from "../dashboard/DashboardHeader";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import { assigneeOptions } from "../leads/add/addLeadData";
import {
  formatUnitLabel,
  getProjectById,
  getUnitById,
  type ProjectUnit,
  type UnitAvailabilityStatus,
} from "./projectsData";
import {
  useProject,
  useProjectMutations,
  useProjectUnit,
} from "./useProjectsApi";

const getUnitStatusClassName = (status: UnitAvailabilityStatus) =>
  status === "Available"
    ? "bg-green-50 text-success"
    : status === "Hold"
    ? "bg-orange-50 text-primary"
    : status === "Booked"
    ? "bg-blue-50 text-blue-700"
    : "bg-slate-100 text-secondary";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveAssigneeName = (
  value?: string | null,
  fallback?: string | null,
) => {
  const option = assigneeOptions.find(
    (item) => item.id === value || item.name === value,
  );
  if (option) return option.name;
  if (value && !uuidPattern.test(value)) return value;
  return fallback ?? "Unassigned";
};

function InfoTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-base font-extrabold text-secondary">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

const unitPreviewGallery = [
  "https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&q=80&w=700&h=460",
  "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&q=80&w=700&h=460",
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&q=80&w=700&h=460",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=700&h=460",
];

const salesExecutives = [
  "Sneha Iyer",
  "Rahul Mehta",
  "Vikram Singh",
  "Aditya Patil",
  "Pooja Sharma",
  "Rahul Sharma",
];

function UnitHeroGallery({
  unit,
  gallery,
  onUpload,
  onDelete,
  onMove,
  onOpenLightbox,
}: {
  unit: ProjectUnit;
  gallery: string[];
  onUpload: (files: FileList | null) => void;
  onDelete: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onOpenLightbox: (index: number) => void;
}) {
  const [imageIndex, setImageIndex] = useState(0);
  const activeImageIndex = gallery.length > 0 ? imageIndex % gallery.length : 0;
  const showCarouselControls = gallery.length > 1;

  const moveImage = (direction: -1 | 1) => {
    setImageIndex(
      (current) => (current + direction + gallery.length) % gallery.length,
    );
  };

  return (
    <div className="grid gap-3 bg-slate-50 p-4 border-l border-slate-200 lg:w-[380px]">
      <div className="group relative h-64 overflow-hidden rounded-md bg-slate-100 shadow-inner">
        {gallery.length > 0 ? (
          <img
            src={gallery[activeImageIndex]}
            alt={`${formatUnitLabel(unit)} cover`}
            className="h-full w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
            onClick={() => onOpenLightbox(activeImageIndex)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground text-xs">
            No cover image
          </div>
        )}
        {showCarouselControls ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-3 top-1/2 size-9 -translate-y-1/2 rounded-md border-white/80 bg-white/90 p-1 text-secondary opacity-0 shadow-none transition-opacity hover:bg-white group-hover:opacity-100"
              onClick={() => moveImage(-1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-3 top-1/2 size-9 -translate-y-1/2 rounded-md border-white/80 bg-white/90 p-1 text-secondary opacity-0 shadow-none transition-opacity hover:bg-white group-hover:opacity-100"
              onClick={() => moveImage(1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </>
        ) : null}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
        <span className="text-xs font-bold text-secondary">
          {gallery.length} Images
        </span>
        {gallery.length < 15 ? (
          <label className="flex h-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-extrabold text-secondary hover:bg-slate-50 transition-colors shadow-sm">
            Add Photo
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              onChange={(e) => onUpload(e.target.files)}
            />
          </label>
        ) : null}
      </div>

      <ScrollArea className="h-20 w-full">
        <div className="flex gap-2 pb-2">
          {gallery.map((imageUrl, index) => (
            <div
              key={`${unit.id}-gallery-${index}`}
              className={cn(
                "group/thumb relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-slate-100 transition-all",
                index === activeImageIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-slate-200",
              )}
            >
              <img
                src={imageUrl}
                alt={`Thumbnail ${index + 1}`}
                className="h-full w-full object-cover cursor-pointer"
                onClick={() => setImageIndex(index)}
              />
              <Button
                type="button"
                variant="ghost"
                className="absolute right-1 top-1 hidden size-5 items-center justify-center rounded bg-black/60 p-0 text-white hover:bg-black/80 group-hover/thumb:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
              >
                <X className="size-3" />
              </Button>
              {gallery.length > 1 ? (
                <div className="absolute inset-x-0 bottom-0 hidden bg-black/40 justify-around py-0.5 group-hover/thumb:flex text-[9px]">
                  <button
                    type="button"
                    disabled={index === 0}
                    className="text-white disabled:opacity-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(index, -1);
                    }}
                  >
                    &larr;
                  </button>
                  <button
                    type="button"
                    disabled={index === gallery.length - 1}
                    className="text-white disabled:opacity-30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(index, 1);
                    }}
                  >
                    &rarr;
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function UnitDetailsScreen() {
  const { projectId, inventoryId } = useParams();
  const unitId = inventoryId;
  const staticProject = getProjectById(projectId);
  const staticUnit = getUnitById(projectId, unitId);
  const projectQuery = useProject(projectId);
  const unitQuery = useProjectUnit(projectId, unitId);
  const project = projectQuery.data ?? staticProject;
  const unit = unitQuery.data?.unit ?? staticUnit;
  const projectMutations = useProjectMutations();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Availability status state
  const [availability, setAvailability] = useState<UnitAvailabilityStatus>(
    () => unit?.availability ?? "Available",
  );

  // Sales owner state
  const [salesOwner, setSalesOwner] = useState<string>(
    () => unit?.salesOwner || project?.salesOwner || "Sneha Iyer",
  );

  // Gallery images state
  const [gallery, setGallery] = useState<string[]>(() => {
    if (unit?.imageGallery && unit.imageGallery.length > 0) {
      return unit.imageGallery;
    }
    return unit?.imageUrl
      ? [unit.imageUrl, ...unitPreviewGallery.slice(1)]
      : [...unitPreviewGallery];
  });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Lead lists state (for updates to trigger re-renders)
  const [activeLeads, setActiveLeads] = useState(
    () => project?.linkedLeads.filter((l: any) => l.unitId === unit?.id) || [],
  );
  const [assignmentMessage, setAssignmentMessage] = useState("");

  // Assign lead form states
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadOwner, setNewLeadOwner] = useState(salesOwner);
  const [newLeadStage, setNewLeadStage] = useState("Interested");
  const [newLeadBudget, setNewLeadBudget] = useState("INR 1.3 Cr");

  useEffect(() => {
    if (!unit) return;
    setAvailability(unit.availability);
    const nextOwner = unit.salesOwner || project?.salesOwner || "Sneha Iyer";
    setSalesOwner(nextOwner);
    setNewLeadOwner(nextOwner);
    if (unit.imageGallery && unit.imageGallery.length > 0) {
      setGallery(unit.imageGallery);
      return;
    }
    setGallery(
      unit.imageUrl ? [unit.imageUrl, ...unitPreviewGallery.slice(1)] : [],
    );
  }, [project?.salesOwner, unit]);

  useEffect(() => {
    if (!project || !unit) return;
    const apiLeads = unitQuery.data?.raw?.linkedLeads;
    setActiveLeads(
      Array.isArray(apiLeads)
        ? apiLeads
        : project.linkedLeads.filter((lead: any) => lead.unitId === unit.id),
    );
  }, [project, unit, unitQuery.data]);

  if (!project || !unit) {
    return <Navigate to="/projects" replace />;
  }

  const linkedVisits = Array.isArray(unitQuery.data?.raw?.siteVisits)
    ? unitQuery.data.raw.siteVisits.map((visit: any) => {
        const scheduledAt = new Date(visit.scheduledAt);
        return {
          id: visit.displayId ?? visit.id,
          leadId: visit.leadId,
          leadName: visit.lead?.name ?? "Lead",
          status: visit.status,
          date: Number.isNaN(scheduledAt.getTime())
            ? "-"
            : scheduledAt.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
          time: Number.isNaN(scheduledAt.getTime())
            ? "-"
            : scheduledAt.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
          projectId: project.id,
          unitId: unit.id,
          assignedExecutive: resolveAssigneeName(
            visit.assignedExecutiveId,
            project.salesOwner,
          ),
        };
      })
    : project.linkedVisits.filter((visit: any) => visit.unitId === unit.id);

  // Handlers
  const persistUnitGallery = async (nextGallery: string[]) => {
    if (!projectId || !unitId) return;
    await projectMutations.updateUnit.mutateAsync({
      projectId,
      unitId,
      payload: {
        imageUrl: nextGallery[0] ?? "",
        imageGallery: nextGallery,
      },
    });
  };

  const handleSetStatus = async (newStatus: UnitAvailabilityStatus) => {
    if (projectId && unitId) {
      await projectMutations.updateUnit.mutateAsync({
        projectId,
        unitId,
        payload: { availability: newStatus },
      });
    }
    setAvailability(newStatus);
  };

  const handleSetSalesOwner = async (newOwner: string) => {
    if (projectId && unitId) {
      await projectMutations.updateUnit.mutateAsync({
        projectId,
        unitId,
        payload: { salesOwnerId: newOwner },
      });
    }
    setSalesOwner(newOwner);
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files) return;
    const uploadedResults = await Promise.allSettled(
      Array.from(files)
        .slice(0, 15 - gallery.length)
        .map((file) =>
          projectMutations.uploadImage.mutateAsync(file).then((uploaded) => ({
            file,
            url: uploaded.url,
          })),
        ),
    );
    const urls = uploadedResults
      .filter(
        (
          result,
        ): result is PromiseFulfilledResult<{ file: File; url: string }> =>
          result.status === "fulfilled",
      )
      .map((result) => result.value.url);
    const failedCount = uploadedResults.length - urls.length;
    if (!urls.length) {
      return;
    }
    const nextGallery = [...gallery, ...urls];
    setGallery(nextGallery);
    await persistUnitGallery(nextGallery);
    if (failedCount > 0) {
      // Keep successful uploads; prompt the user to retry only the failed files.
      console.error(
        `${failedCount} unit image upload${failedCount === 1 ? "" : "s"} failed.`,
      );
    }
  };

  const handleDeleteImage = async (index: number) => {
    const nextGallery = gallery.filter((_, idx) => idx !== index);
    setGallery(nextGallery);
    await persistUnitGallery(nextGallery);
  };

  const handleMoveImage = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= gallery.length) return;
    const nextGallery = [...gallery];
    const temp = nextGallery[index];
    nextGallery[index] = nextGallery[nextIndex];
    nextGallery[nextIndex] = temp;
    setGallery(nextGallery);
    await persistUnitGallery(nextGallery);
  };

  const handleAssignLead = async () => {
    if (!newLeadName.trim()) {
      return;
    }
    if (projectId && unitId) {
      await projectMutations.linkLead.mutateAsync({
        projectId,
        unitId,
        payload: {
          name: newLeadName,
          stage: newLeadStage,
          owner: newLeadOwner,
          budget: newLeadBudget,
        },
      });
    }
    const newLead = {
      id: `TR${Date.now().toString().slice(-6)}`,
      name: newLeadName,
      stage: newLeadStage,
      owner: newLeadOwner,
      budget: newLeadBudget,
      projectId: project.id,
      unitId: unit.id,
    };
    setActiveLeads((curr: any) => [...curr, newLead]);
    setNewLeadName("");
    setAssignmentMessage(
      `Lead ${newLeadName} assigned to ${formatUnitLabel(unit)}.`,
    );
    setTimeout(() => setAssignmentMessage(""), 4000);
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        activeItem="Projects"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          search={search}
          onSearchChange={setSearch}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <>
              <Link to="/projects" className="hover:text-secondary">
                Projects
              </Link>
              <span> / </span>
              <Link
                to={`/projects/${project.id}`}
                className="hover:text-secondary"
              >
                {project.name}
              </Link>
              <span> / </span>
              <span className="text-muted-foreground font-semibold">
                Inventory
              </span>
              <span> / </span>
              <span className="text-secondary font-bold">
                Unit {unit.unitNumber}
              </span>
            </>
          }
        />
        <main className="space-y-5 p-4 sm:p-6">
          <Button
            asChild
            variant="ghost"
            className="h-8 px-0 text-xs font-extrabold text-muted-foreground hover:bg-transparent hover:text-secondary"
          >
            <Link to={`/projects/${project.id}`}>
              <ArrowLeft className="size-4" />
              Back to Project Details
            </Link>
          </Button>

          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={cn(
                        "border-0 text-[11px] font-extrabold",
                        getUnitStatusClassName(availability),
                      )}
                    >
                      {availability}
                    </Badge>
                    <Badge className="border-0 bg-slate-100 text-[11px] font-extrabold text-secondary">
                      {unit.bookingStatus}
                    </Badge>
                  </div>
                  <h1 className="mt-4 text-3xl font-extrabold text-secondary">
                    {formatUnitLabel(unit)}
                  </h1>
                  <p className="mt-2 text-sm font-semibold text-muted-foreground">
                    {project.name} · {project.location}
                  </p>
                  <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-secondary">
                    Experience luxurious living in {formatUnitLabel(unit)}, a
                    premium {unit.configuration} home in the heart of{" "}
                    {project.name}. Featuring premium orientation, ample
                    sunlight, and access to all project amenities.
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  {/* Status Toggle Actions */}
                  {availability !== "Sold" && (
                    <Button
                      type="button"
                      className="h-10 rounded-md px-4 shadow-sm"
                      onClick={() => handleSetStatus("Sold")}
                    >
                      <Check className="mr-1.5 size-4" /> Mark Sold
                    </Button>
                  )}
                  {availability !== "Hold" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md px-4 shadow-none"
                      onClick={() => handleSetStatus("Hold")}
                    >
                      <Circle className="mr-1.5 size-3 fill-current text-primary" />{" "}
                      Mark Reserved
                    </Button>
                  )}
                  {availability !== "Available" && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-md px-4 shadow-none"
                      onClick={() => handleSetStatus("Available")}
                    >
                      <CalendarCheck className="mr-1.5 size-4" /> Mark Available
                    </Button>
                  )}

                  <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-secondary hover:bg-slate-50 transition-colors shadow-none">
                    Upload Images
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => handleUploadImages(e.target.files)}
                    />
                  </label>

                  <Button
                    asChild
                    variant="outline"
                    className="h-10 rounded-md px-4 shadow-none"
                  >
                    <Link to={`/projects/${project.id}`}>
                      View Project Details
                    </Link>
                  </Button>
                </div>
              </div>
              <UnitHeroGallery
                unit={unit}
                gallery={gallery}
                onUpload={handleUploadImages}
                onDelete={handleDeleteImage}
                onMove={handleMoveImage}
                onOpenLightbox={(idx) => setLightboxIndex(idx)}
              />
            </div>
          </Card>

          <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
            <InfoTile
              label="Configuration"
              value={unit.configuration}
              icon={Home}
            />
            <InfoTile label="Floor" value={unit.floor} icon={Layers3} />
            <InfoTile label="Facing" value={unit.facing} icon={Compass} />
            <InfoTile label="Price" value={unit.price} icon={Building2} />
            <InfoTile
              label="Visit Count"
              value={`${unit.visitCount}`}
              icon={CalendarCheck}
            />
            <InfoTile
              label="Linked Leads"
              value={`${activeLeads.length}`}
              icon={UsersRound}
            />
            <InfoTile
              label="Booking Status"
              value={unit.bookingStatus}
              icon={CalendarCheck}
            />
          </section>

          {/* Lead & Sales Assignment Section */}
          <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-base font-extrabold text-secondary mb-4 flex items-center gap-2">
              <UsersRound className="size-5 text-primary" /> Sales & Lead
              Assignment Hub
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Sales Representative & Performance Stats */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-secondary block mb-1">
                    Assigned Sales Owner
                  </label>
                  <div className="flex gap-2">
                    <Select
                      value={salesOwner}
                      onValueChange={handleSetSalesOwner}
                    >
                      <SelectTrigger
                        aria-label="Sales Executive"
                        className="h-10 rounded-md text-sm font-bold shadow-none flex-1"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {salesExecutives.map((exec) => (
                          <SelectItem key={exec} value={exec}>
                            {exec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                    The lead engagement owner responsible for showings and
                    closing.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Active Leads
                    </p>
                    <p className="mt-1.5 text-xl font-extrabold text-secondary">
                      {activeLeads.length}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Site Visits
                    </p>
                    <p className="mt-1.5 text-xl font-extrabold text-secondary">
                      {linkedVisits.length}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-100 bg-slate-50/50 p-3 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">
                      Follow-ups
                    </p>
                    <p className="mt-1.5 text-xl font-extrabold text-secondary">
                      {activeLeads.filter((l: any) => l.stage !== "Closed").length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assign Lead to Unit form */}
              <div className="rounded-md border border-slate-100 bg-slate-50/30 p-4">
                <h3 className="text-sm font-extrabold text-secondary mb-3 flex items-center gap-1.5">
                  <Plus className="size-4" /> Link/Assign Lead to Unit
                </h3>
                {assignmentMessage ? (
                  <div className="mb-3 rounded-md border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-extrabold text-success">
                    {assignmentMessage}
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="space-y-1">
                    <label className="font-extrabold text-secondary">
                      Lead Name
                    </label>
                    <Input
                      value={newLeadName}
                      placeholder="e.g. Vikram Singh"
                      className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold"
                      onChange={(e) => setNewLeadName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-secondary">
                      Sales Owner
                    </label>
                    <Select
                      value={newLeadOwner}
                      onValueChange={setNewLeadOwner}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {salesExecutives.map((exec) => (
                          <SelectItem key={exec} value={exec}>
                            {exec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-secondary">
                      Stage
                    </label>
                    <Select
                      value={newLeadStage}
                      onValueChange={setNewLeadStage}
                    >
                      <SelectTrigger className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          "New Lead",
                          "Interested",
                          "Site Visit",
                          "Negotiation",
                          "Token received",
                          "Closed",
                        ].map((stg) => (
                          <SelectItem key={stg} value={stg}>
                            {stg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-extrabold text-secondary">
                      Budget
                    </label>
                    <Input
                      value={newLeadBudget}
                      placeholder="e.g. INR 1.35 Cr"
                      className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold"
                      onChange={(e) => setNewLeadBudget(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 pt-2 flex justify-end">
                    <Button
                      type="button"
                      className="h-9 rounded-md px-4 text-xs shadow-sm"
                      onClick={handleAssignLead}
                    >
                      Assign & Link Lead
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <section className="grid gap-5 xl:grid-cols-2">
            <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
              <h2 className="mb-4 text-base font-extrabold text-secondary">
                Linked Leads
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Lead", "Stage", "Budget", "Owner"].map((head) => (
                      <TableHead key={head}>{head}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeLeads.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-sm font-semibold text-muted-foreground"
                      >
                        No linked leads for this unit.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeLeads.map((lead: any) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <Link
                            to={`/leads/${lead.id}`}
                            className="font-extrabold text-blue-700 hover:text-blue-800"
                          >
                            {lead.name}
                          </Link>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {lead.id}
                          </p>
                        </TableCell>
                        <TableCell>{lead.stage}</TableCell>
                        <TableCell>{lead.budget}</TableCell>
                        <TableCell>{lead.owner}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
              <h2 className="mb-4 text-base font-extrabold text-secondary">
                Site Visits
              </h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    {["Visit", "Lead", "Schedule", "Executive"].map((head) => (
                      <TableHead key={head}>{head}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedVisits.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-10 text-center text-sm font-semibold text-muted-foreground"
                      >
                        No site visits linked to this unit.
                      </TableCell>
                    </TableRow>
                  ) : (
                    linkedVisits.map((visit : any) => (
                      <TableRow key={visit.id}>
                        <TableCell>
                          <p className="font-extrabold text-secondary">
                            {visit.id}
                          </p>
                          <Badge className="mt-1 border-0 bg-blue-50 text-blue-700">
                            {visit.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/leads/${visit.leadId}`}
                            className="font-extrabold text-blue-700 hover:text-blue-800"
                          >
                            {visit.leadName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {visit.date}, {visit.time}
                        </TableCell>
                        <TableCell>{visit.assignedExecutive}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </section>
        </main>
      </div>

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-4xl border-none bg-black/90 p-0 text-white shadow-2xl overflow-hidden rounded-md"
        >
          <div className="relative flex items-center justify-center p-8 min-h-[300px]">
            {lightboxIndex !== null && gallery[lightboxIndex] ? (
              <img
                src={gallery[lightboxIndex]}
                alt="Lightbox Preview"
                className="max-h-[75vh] w-auto object-contain rounded-md"
              />
            ) : null}
            <Button
              variant="ghost"
              onClick={() => setLightboxIndex(null)}
              className="absolute right-4 top-4 text-white/80 hover:text-white bg-black/50 p-1.5 rounded-full"
            >
              <X className="size-6" />
            </Button>
            {lightboxIndex !== null && gallery.length > 1 ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setLightboxIndex(
                      (curr) => (curr! - 1 + gallery.length) % gallery.length,
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
                >
                  <ChevronLeft className="size-6" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setLightboxIndex((curr) => (curr! + 1) % gallery.length)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
                >
                  <ChevronRight className="size-6" />
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
