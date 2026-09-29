import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Building2,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Eye,
  FileText,
  Filter,
  FolderKanban,
  Grid2X2,
  Home,
  ImagePlus,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Share2,
  Sparkles,
  Upload,
  Video,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  ScrollArea,
  SearchInput,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  MultiSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  cn,
} from "ui";

import { usePermission } from "../../../common/access/usePermission";
import { DashboardHeader } from "../dashboard/DashboardHeader";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import { ProjectGeofencePicker } from "./ProjectGeofencePicker";
import { ProjectConfigurationVariants } from "./ProjectConfigurationCarpetAreas";
import { VideoUploadPreviewModal } from "./VideoUploadPreviewModal";
import { ProjectWhatsAppShareDialog } from "./ProjectWhatsAppShareDialog";
import {
  getProjectImageGallery,
  projectsCatalog,
  type ProjectBrochure,
  type ProjectCatalogItem,
  type ProjectConfigurationVariant,
  type ProjectStatus,
} from "./projectsData";
import { toOptions, useMasterOptions } from "./useProjectMasters";
import {
  mapApiProject,
  useProjectMutations,
  useProjects,
} from "./useProjectsApi";

type ProjectTab = "all" | "active" | "ready" | "construction" | "demand";
type ProjectViewMode = "cards" | "list";
type ProjectPriceUnit = "Lakh" | "Cr";

interface ProjectFormState {
  name: string;
  location: string;
  developer: string;
  status: ProjectStatus;
  possession: string;
  priceMin: string;
  priceMinUnit: ProjectPriceUnit;
  priceMax: string;
  priceMaxUnit: ProjectPriceUnit;
  configurationVariants: ProjectConfigurationVariant[];
  amenities: string[];
  highlights: string;
  description: string;
  reraNumber: string;
  brochureUrl: string;
  brochureStorageKey: string;
  brochureFileName: string;
  brochureMimeType: string;
  brochureSizeBytes: number | null;
  brochures: ProjectBrochure[];
  imageUrl: string;
  imageName: string;
  imageGallery: Array<{ id: string; url: string; name: string }>;
  numberOfFloors: string;
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
  videoUrl: string;
  videoUrls: string[];
}

type ProjectFormErrors = Partial<Record<keyof ProjectFormState, string>>;

const projectTabs: Array<{
  id: ProjectTab;
  label: string;
  status?: ProjectStatus;
}> = [
  { id: "all", label: "All Projects" },
  { id: "active", label: "Active", status: "Active" },
  { id: "ready", label: "Ready To Move", status: "Ready To Move" },
  {
    id: "construction",
    label: "Under Construction",
    status: "Under Construction",
  },
  { id: "demand", label: "High Demand", status: "High Demand" },
];

const projectStatusOptions: ProjectStatus[] = [
  "Active",
  "Ready To Move",
  "Under Construction",
  "High Demand",
];
const projectPriceUnitOptions: ProjectPriceUnit[] = ["Cr", "Lakh"];

const createEmptyProjectForm = (): ProjectFormState => ({
  name: "",
  location: "",
  developer: "",
  status: "Active",
  possession: "",
  priceMin: "",
  priceMinUnit: "Cr",
  priceMax: "",
  priceMaxUnit: "Cr",
  configurationVariants: [],
  amenities: [],
  highlights: "",
  description: "",
  reraNumber: "",
  brochureUrl: "",
  brochureStorageKey: "",
  brochureFileName: "",
  brochureMimeType: "",
  brochureSizeBytes: null,
  brochures: [],
  imageUrl: "",
  imageName: "",
  imageGallery: [],
  numberOfFloors: "",
  latitude: "",
  longitude: "",
  geofenceRadiusM: "150",
  videoUrl: "",
  videoUrls: [],
});

const projectPreviewGallery = [
  "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=900&h=520",
  "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&q=80&w=900&h=520",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=900&h=520",
];

const projectQuickTips = [
  "Add clear project images",
  "Provide accurate location",
  "Review details before saving",
];

const fallbackProjectAmenityOptions = [
  { label: "Gym", value: "Gym" },
  { label: "Parking", value: "Parking" },
  { label: "Club House", value: "Club House" },
  { label: "Swimming Pool", value: "Swimming Pool" },
  { label: "Landscaped Garden", value: "Landscaped Garden" },
  { label: "Children's Play Area", value: "Children's Play Area" },
  { label: "Jogging Track", value: "Jogging Track" },
  { label: "Security", value: "Security" },
];

const fallbackProjectLocationOptions = Array.from(
  new Set([
    "Bandra, Mumbai",
    ...projectsCatalog.map((project) => project.location),
  ]),
).map((location) => ({ label: location, value: location }));

const fallbackProjectConfigurationOptions = [
  { label: "1 BHK", value: "1 BHK" },
  { label: "2 BHK", value: "2 BHK" },
  { label: "3 BHK", value: "3 BHK" },
  { label: "4 BHK", value: "4 BHK" },
  { label: "5 BHK", value: "5 BHK" },
  { label: "Studio", value: "Studio" },
  { label: "Penthouse", value: "Penthouse" },
];

const projectFormFieldConfigs: Array<{
  label: string;
  field: keyof Pick<
    ProjectFormState,
    "name" | "location" | "developer" | "possession" | "reraNumber"
  >;
  placeholder: string;
  required: boolean;
}> = [
  {
    label: "Project Name",
    field: "name",
    placeholder: "Harbour Crest",
    required: false,
  },
  {
    label: "Location",
    field: "location",
    placeholder: "Bandra, Mumbai",
    required: false,
  },
  {
    label: "Developer",
    field: "developer",
    placeholder: "Truroot Realty",
    required: false,
  },
  {
    label: "Possession",
    field: "possession",
    placeholder: "2026-12-01",
    required: false,
  },
  {
    label: "RERA Number",
    field: "reraNumber",
    placeholder: "P51800000000",
    required: false,
  },
];

const formatProjectPossession = (dateValue: string) => {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return `Ready by ${date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })}`;
};

const getStatusClassName = (status: ProjectStatus) =>
  status === "High Demand"
    ? "bg-orange-50 text-primary"
    : status === "Ready To Move"
    ? "bg-green-50 text-success"
    : status === "Under Construction"
    ? "bg-blue-50 text-blue-700"
    : "bg-slate-100 text-secondary";

function ProjectStatCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <Card className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-md sm:size-12",
            tone,
          )}
        >
          <Icon className="size-5 sm:size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-secondary">
            {label}
          </p>
          <p className="mt-1 truncate text-xl font-extrabold text-secondary sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ProjectCard({
  project,
  onShare,
  onSharePdf,
}: {
  project: ProjectCatalogItem;
  onView: (project: ProjectCatalogItem) => void;
  onShare: (project: ProjectCatalogItem) => void;
  onSharePdf: (project: ProjectCatalogItem) => void;
}) {
  const navigate = useNavigate();

  const projectImages = getProjectImageGallery(project);
  const [imageIndex, setImageIndex] = useState(0);
  const activeImageIndex = imageIndex % projectImages.length;
  const showCarouselControls = projectImages.length > 1;

  const moveImage = (event: React.MouseEvent, direction: 1 | -1) => {
    event.stopPropagation();
    setImageIndex(
      (current) =>
        (current + direction + projectImages.length) % projectImages.length,
    );
  };

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,37,68,0.08)]"
      onClick={handleCardClick}
    >
      <div
        className={cn(
          "relative h-32 overflow-hidden bg-gradient-to-br",
          project.imageTone,
        )}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
        >
          {projectImages.map((imageUrl, index) => (
            <img
              key={`${project.id}-card-image-${imageUrl}-${index}`}
              src={imageUrl}
              alt={`${project.name} image ${index + 1}`}
              className="h-full w-full shrink-0 object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ))}
        </div>
        {showCarouselControls ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute left-3 top-1/2 size-8 -translate-y-1/2 rounded-md border-white/80 bg-white/90 p-1 text-secondary opacity-0 shadow-none transition-opacity hover:bg-white group-hover:opacity-100"
              aria-label={`Previous image for ${project.name}`}
              onClick={(e) => moveImage(e, -1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="absolute right-3 top-1/2 size-8 -translate-y-1/2 rounded-md border-white/80 bg-white/90 p-1 text-secondary opacity-0 shadow-none transition-opacity hover:bg-white group-hover:opacity-100"
              aria-label={`Next image for ${project.name}`}
              onClick={(e) => moveImage(e, 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {projectImages.map((imageUrl, index) => (
                <button
                  key={`${project.id}-${imageUrl}-${index}`}
                  type="button"
                  className={cn(
                    "size-1.5 rounded-full bg-white/70 ring-1 ring-black/10 transition-all",
                    index === activeImageIndex && "w-4 bg-white",
                  )}
                  aria-label={`Show image ${index + 1} for ${project.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageIndex(index);
                  }}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-secondary">
              {project.name}
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MapPin className="size-3.5" />
              {project.location}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 rounded-md bg-white shadow-none"
              aria-label={`Share ${project.name} on WhatsApp`}
              title={`Share ${project.name} on WhatsApp`}
              onClick={(event) => {
                event.stopPropagation();
                onShare(project);
              }}
            >
              <Share2 className="size-3.5" />
            </Button>
            <Badge
              className={cn(
                "border-0 text-[11px] font-extrabold",
                getStatusClassName(project.status),
              )}
            >
              {project.status}
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="font-bold text-muted-foreground">Configuration</p>
            <p className="mt-1 truncate font-extrabold text-secondary">
              {project.configurations.length
                ? project.configurations.join(", ")
                : "Not specified"}
            </p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="font-bold text-muted-foreground">Possession</p>
            <p className="mt-1 truncate font-extrabold text-secondary">
              {project.possession
                ? formatProjectPossession(project.possession)
                : "Not specified"}
            </p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="font-bold text-muted-foreground">Active Leads</p>
            <p className="mt-1 font-extrabold text-secondary">
              {project.activeLeads}
            </p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
            <p className="font-bold text-muted-foreground">Visits</p>
            <p className="mt-1 font-extrabold text-secondary">
              {project.upcomingVisits}
            </p>
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-muted-foreground">
                Brochure PDF
              </p>
              <p className="mt-1 truncate text-xs font-extrabold text-secondary">
                {project.brochureUrl
                  ? project.brochureFileName || "Project brochure.pdf"
                  : "Not uploaded"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-8 shrink-0 rounded-md px-3 text-xs shadow-none"
              onClick={(event) => {
                event.stopPropagation();
                onSharePdf(project);
              }}
            >
              <FileText className="size-3.5" />
              Share PDF
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-[11px] font-bold text-muted-foreground">
              Price Range
            </p>
            <p className="mt-1 text-sm font-extrabold text-secondary">
              {project.priceRange}
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs font-extrabold text-primary transition-all duration-300 group-hover:translate-x-1">
            View Details &rarr;
          </span>
        </div>
      </div>
    </Card>
  );
}

function ProjectPreviewGallery({ project }: { project: ProjectCatalogItem }) {
  const projectImages = getProjectImageGallery(project);
  const [imageIndex, setImageIndex] = useState(0);
  const activeImageIndex = imageIndex % projectImages.length;

  return (
    <div className="space-y-3">
      <div className="h-48 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeImageIndex * 100}%)` }}
        >
          {projectImages.map((imageUrl, index) => (
            <img
              key={`${project.id}-preview-image-${imageUrl}-${index}`}
              src={imageUrl}
              alt={`${project.name} image ${index + 1}`}
              className="h-full w-full shrink-0 object-cover"
            />
          ))}
        </div>
      </div>
      {projectImages.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {projectImages.slice(0, 4).map((imageUrl, index) => (
            <button
              key={`${project.id}-preview-${imageUrl}-${index}`}
              type="button"
              className={cn(
                "h-16 overflow-hidden rounded-md border bg-slate-100 transition-colors",
                index === activeImageIndex
                  ? "border-primary"
                  : "border-slate-200",
              )}
              aria-label={`Show ${project.name} preview image ${index + 1}`}
              onClick={() => setImageIndex(index)}
            >
              <img
                src={imageUrl}
                alt={`${project.name} preview ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProjectsTable({
  projects,
  onView,
  onShare,
}: {
  projects: ProjectCatalogItem[];
  onView: (project: ProjectCatalogItem) => void;
  onShare: (project: ProjectCatalogItem) => void;
}) {
  return (
    <Table className="min-w-[980px]">
      <TableHeader>
        <TableRow>
          {[
            "Project",
            "Status",
            "Configuration",
            "Possession",
            "Active Leads",
            "Upcoming Visits",
            "Actions",
          ].map((head) => (
            <TableHead key={head}>{head}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => {
          return (
            <TableRow key={project.id}>
              <TableCell>
                <p className="font-extrabold text-secondary">{project.name}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {project.location} · {project.priceRange}
                </p>
              </TableCell>
              <TableCell>
                <Badge
                  className={cn(
                    "border-0 text-[11px] font-extrabold",
                    getStatusClassName(project.status),
                  )}
                >
                  {project.status}
                </Badge>
              </TableCell>
              <TableCell>
                <p className="font-extrabold text-secondary">
                  {project.configurations.join(", ") || "-"}
                </p>
              </TableCell>
              <TableCell>
                <p className="font-extrabold text-secondary">
                  {project.possession
                    ? formatProjectPossession(project.possession)
                    : "-"}
                </p>
              </TableCell>
              <TableCell>{project.activeLeads}</TableCell>
              <TableCell>{project.upcomingVisits}</TableCell>
              <TableCell>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-md shadow-none"
                    aria-label={`View ${project.name}`}
                    title={`View ${project.name}`}
                    onClick={() => onView(project)}
                  >
                    <Eye className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-md shadow-none"
                    aria-label={`Share ${project.name} on WhatsApp`}
                    title={`Share ${project.name} on WhatsApp`}
                    onClick={() => onShare(project)}
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                  {projectsCatalog.some(
                    (catalogProject) => catalogProject.id === project.id,
                  ) ? (
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-md shadow-none"
                      aria-label={`Open ${project.name}`}
                      title={`Open ${project.name}`}
                    >
                      <Link to={`/projects/${project.id}`}>
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ProjectsScreen() {
  const { canCreate } = usePermission("projects");
  const queryClient = useQueryClient();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<ProjectTab>("all");
  const [viewMode, setViewMode] = useState<ProjectViewMode>("cards");
  const [projects, setProjects] =
    useState<ProjectCatalogItem[]>(projectsCatalog);
  const [projectFormOpen, setProjectFormOpen] = useState(false);
  const [viewingProject, setViewingProject] =
    useState<ProjectCatalogItem | null>(null);
  const [sharingProject, setSharingProject] =
    useState<ProjectCatalogItem | null>(null);
  const hasPrefetchedProjectMastersRef = useRef(false);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(() =>
    createEmptyProjectForm(),
  );
  const [projectFormErrors, setProjectFormErrors] = useState<ProjectFormErrors>(
    {},
  );
  const [projectMessage, setProjectMessage] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState(false);
  const projectsQuery = useProjects(search);
  const projectMutations = useProjectMutations();

  const handleConfirmVideoUpload = async (file: File) => {
    try {
      const uploaded = await projectMutations.uploadProjectVideo.mutateAsync(
        file,
      );
      setProjectForm((curr) => ({
        ...curr,
        videoUrls: Array.from(new Set([...curr.videoUrls, uploaded.url])),
        videoUrl: curr.videoUrl || uploaded.url,
      }));
      setProjectMessage("Project video uploaded and ready to save.");
      toast.success("Video uploaded successfully!");
    } catch {
      setProjectMessage("Could not upload video file.");
      toast.error("Could not upload video file.");
    }
  };
  const locationMasters = useMasterOptions(
    "project_location",
    fallbackProjectLocationOptions,
  );
  const configurationMasters = useMasterOptions(
    "project_configuration",
    fallbackProjectConfigurationOptions,
  );
  const amenityMasters = useMasterOptions(
    "project_amenity",
    fallbackProjectAmenityOptions,
  );
  const statusMasters = useMasterOptions(
    "project_status",
    toOptions(projectStatusOptions),
  );
  const projectStatusSelectOptions = statusMasters.options
    .map((option) => option.value)
    .filter((status): status is ProjectStatus =>
      projectStatusOptions.includes(status as ProjectStatus),
    );

  useEffect(() => {
    if (projectsQuery.data?.projects) {
      setProjects(projectsQuery.data.projects);
    }
  }, [projectsQuery.data?.projects]);

  useEffect(() => {
    if (!projectFormOpen || hasPrefetchedProjectMastersRef.current) {
      return;
    }
    hasPrefetchedProjectMastersRef.current = true;
    void Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["lead-masters", "project_location"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["lead-masters", "project_configuration"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["lead-masters", "project_amenity"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["lead-masters", "project_status"],
      }),
    ]);
  }, [projectFormOpen, queryClient]);

  useEffect(() => {
    if (!projectFormOpen) {
      hasPrefetchedProjectMastersRef.current = false;
    }
  }, [projectFormOpen]);

  const filteredProjects = useMemo(() => {
    const tab = projectTabs.find((item) => item.id === activeTab);
    const normalizedSearch = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesTab = !tab?.status || project.status === tab.status;
      const matchesSearch =
        !normalizedSearch ||
        [
          project.name,
          project.location,
          project.developer,
          project.salesOwner,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      return matchesTab && matchesSearch;
    });
  }, [activeTab, projects, search]);

  const totalUnits = projects.reduce(
    (sum, project) => sum + project.units.length,
    0,
  );
  const availableUnits = projects
    .flatMap((project) => project.units)
    .filter((unit) => unit.availability === "Available").length;

  const openCreateProjectForm = () => {
    setProjectForm(createEmptyProjectForm());
    setProjectFormErrors({});
    setProjectMessage("");
    setProjectFormOpen(true);
  };

  const shareProjectPdf = (project: ProjectCatalogItem) => {
    if (!project.brochureUrl) {
      toast.error("Upload a brochure PDF before sharing");
      return;
    }

    const message = [
      `Project brochure for ${project.name}`,
      project.brochureUrl,
    ].join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const updateProjectForm = <K extends keyof ProjectFormState>(
    field: K,
    value: ProjectFormState[K],
  ) => {
    setProjectForm((current) => ({ ...current, [field]: value }));
    setProjectFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateProjectImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      const uploaded = await projectMutations.uploadImage.mutateAsync(file);
      const imageUrl = uploaded.url;
      setProjectForm((current) => {
        const nextGallery = [
          ...current.imageGallery,
          {
            id: `${file.name}-${current.imageGallery.length}`,
            url: imageUrl,
            name: file.name,
          },
        ].slice(0, 5);

        return {
          ...current,
          imageUrl: nextGallery[0]?.url ?? imageUrl,
          imageName: nextGallery[0]?.name ?? file.name,
          imageGallery: nextGallery,
        };
      });
      setProjectMessage("Project image uploaded and ready to save.");
    } catch {
      setProjectMessage("Could not upload project image. Please try again.");
      return;
    }
  };

  const updateProjectBrochures = async (files: FileList | null | undefined) => {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) return;
    const invalidFile = selectedFiles.find(
      (file) => file.type !== "application/pdf",
    );
    if (invalidFile) {
      setProjectMessage("Upload PDF brochures only.");
      return;
    }

    try {
      const uploadedBrochures = await Promise.all(
        selectedFiles.map(async (file) => {
          const uploaded =
            await projectMutations.uploadProjectBrochure.mutateAsync(file);
          return {
            url: uploaded.url,
            storageKey: uploaded.key,
            fileName: file.name,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
          } satisfies ProjectBrochure;
        }),
      );
      setProjectForm((current) => {
        const brochures = [...current.brochures, ...uploadedBrochures];
        const primaryBrochure = brochures[0];
        return {
          ...current,
          brochures,
          brochureUrl: primaryBrochure?.url ?? "",
          brochureStorageKey: primaryBrochure?.storageKey ?? "",
          brochureFileName: primaryBrochure?.fileName ?? "",
          brochureMimeType: primaryBrochure?.mimeType ?? "",
          brochureSizeBytes: primaryBrochure?.sizeBytes ?? null,
        };
      });
      setProjectMessage(
        `${uploadedBrochures.length} brochure PDF${
          uploadedBrochures.length === 1 ? "" : "s"
        } uploaded and ready to save.`,
      );
    } catch {
      setProjectMessage("Could not upload brochure PDF.");
    }
  };

  const removeProjectBrochure = (brochureUrl: string) => {
    setProjectForm((current) => {
      const brochures = current.brochures.filter(
        (brochure) => brochure.url !== brochureUrl,
      );
      const primaryBrochure = brochures[0];
      return {
        ...current,
        brochures,
        brochureUrl: primaryBrochure?.url ?? "",
        brochureStorageKey: primaryBrochure?.storageKey ?? "",
        brochureFileName: primaryBrochure?.fileName ?? "",
        brochureMimeType: primaryBrochure?.mimeType ?? "",
        brochureSizeBytes: primaryBrochure?.sizeBytes ?? null,
      };
    });
  };

  const removeProjectImage = (imageId: string) => {
    setProjectForm((current) => {
      const nextGallery = current.imageGallery.filter(
        (image) => image.id !== imageId,
      );
      return {
        ...current,
        imageGallery: nextGallery,
        imageUrl: nextGallery[0]?.url ?? "",
        imageName: nextGallery[0]?.name ?? "",
      };
    });
  };

  const validateProjectForm = () => {
    const nextErrors: ProjectFormErrors = {};
    if (!projectForm.name.trim()) nextErrors.name = "Project name is required.";
    if (!projectForm.location.trim())
      nextErrors.location = "Location is required.";
    const hasLatitude = projectForm.latitude.trim().length > 0;
    const hasLongitude = projectForm.longitude.trim().length > 0;
    if (hasLatitude !== hasLongitude) {
      nextErrors.latitude = "Latitude and longitude must be provided together.";
      nextErrors.longitude =
        "Latitude and longitude must be provided together.";
    }
    if (hasLatitude) {
      const latitude = Number(projectForm.latitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        nextErrors.latitude = "Latitude must be between -90 and 90.";
      }
    }
    if (hasLongitude) {
      const longitude = Number(projectForm.longitude);
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        nextErrors.longitude = "Longitude must be between -180 and 180.";
      }
    }
    const radius = Number(projectForm.geofenceRadiusM);
    if (!Number.isInteger(radius) || radius <= 0) {
      nextErrors.geofenceRadiusM = "Geofence radius must be a positive number.";
    }
    return nextErrors;
  };

  const createProject = async () => {
    const nextErrors = validateProjectForm();
    setProjectFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: projectForm.name,
      location: projectForm.location,
      developer: projectForm.developer.trim() || undefined,
      status: projectForm.status,
      possession: projectForm.possession
        ? formatProjectPossession(projectForm.possession)
        : undefined,
      priceMin: projectForm.priceMin || undefined,
      priceMinUnit: projectForm.priceMinUnit,
      priceMax: projectForm.priceMax || undefined,
      priceMaxUnit: projectForm.priceMaxUnit,
      configurationVariants: projectForm.configurationVariants,
      configurations: Array.from(
        new Set(
          projectForm.configurationVariants
            .map((variant) => variant.configuration)
            .filter(Boolean),
        ),
      ),
      amenities: projectForm.amenities,
      highlights: projectForm.highlights
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
      description: projectForm.description,
      reraNumber: projectForm.reraNumber.trim() || undefined,
      brochureUrl: projectForm.brochureUrl || undefined,
      brochureStorageKey: projectForm.brochureStorageKey || undefined,
      brochureFileName: projectForm.brochureFileName || undefined,
      brochureMimeType: projectForm.brochureMimeType || undefined,
      brochureSizeBytes: projectForm.brochureSizeBytes ?? undefined,
      brochures: projectForm.brochures,
      videoUrl: projectForm.videoUrl || projectForm.videoUrls[0] || undefined,
      videoUrls: projectForm.videoUrls.length
        ? projectForm.videoUrls
        : projectForm.videoUrl
        ? [projectForm.videoUrl]
        : undefined,
      imageUrl:
        projectForm.imageUrl ||
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=900&h=520",
      imageGallery: projectForm.imageGallery.map((image) => image.url),
      numberOfFloors: projectForm.numberOfFloors || undefined,
      latitude: projectForm.latitude.trim() || undefined,
      longitude: projectForm.longitude.trim() || undefined,
      geofenceRadiusM: projectForm.geofenceRadiusM,
    };

    const created = await projectMutations.createProject.mutateAsync(payload);
    const newProject = mapApiProject(created);
    setProjects((current) => [
      newProject,
      ...current.filter((project) => project.id !== newProject.id),
    ]);
    setViewingProject(newProject);
    setProjectMessage(`${newProject.name} added successfully.`);
    setProjectFormOpen(false);
    setActiveTab("all");
  };

  const saveProjectDraft = () => {
    setProjectMessage("Project draft saved locally.");
    setProjectFormOpen(false);
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
          breadcrumbs={<span>Projects</span>}
        />
        <main className="space-y-5 p-4 sm:p-6">
          <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-extrabold text-secondary">
                <FolderKanban className="size-7 text-primary" />
                Projects
              </h1>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                Project-owned inventory, lead demand, and visit activity in one
                operational view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreate ? (
                <Button
                  type="button"
                  className="h-11 rounded-md px-5"
                  onClick={openCreateProjectForm}
                >
                  <Plus className="size-4" />
                  Add Project
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-md shadow-none px-2"
                aria-label="Refresh projects"
                title="Refresh projects"
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11 rounded-md shadow-none px-2"
                aria-label="Filter projects"
                title="Filter projects"
              >
                <Filter className="size-4" />
              </Button>
            </div>
          </section>

          {projectMessage ? (
            <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm font-extrabold text-success">
              {projectMessage}
            </div>
          ) : null}

          <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
            <ProjectStatCard
              label="Total Projects"
              value={`${projects.length}`}
              helper="Projects in your CRM"
              icon={Building2}
              tone="bg-blue-50 text-blue-700"
            />
            <ProjectStatCard
              label="Total Units"
              value={`${totalUnits}`}
              helper="Across active inventory"
              icon={Home}
              tone="bg-slate-100 text-secondary"
            />
            <ProjectStatCard
              label="Available Units"
              value={`${availableUnits}`}
              helper="Ready for lead matching"
              icon={CalendarCheck}
              tone="bg-green-50 text-success"
            />
            <ProjectStatCard
              label="Linked Leads"
              value={`${projects.reduce(
                (sum, project) => sum + project.linkedLeads.length,
                0,
              )}`}
              helper="Project interest records"
              icon={UsersRound}
              tone="bg-orange-50 text-primary"
            />
          </section>

          <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 sm:flex-row sm:items-center sm:justify-between p-2">
              <div className="flex gap-6 overflow-x-auto">
                {projectTabs.map((tab) => {
                  const selected = activeTab === tab.id;
                  const count = tab.status
                    ? projects.filter(
                        (project) => project.status === tab.status,
                      ).length
                    : projects.length;
                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      variant="ghost"
                      className={cn(
                        "h-10 shrink-0 rounded-md px-3 text-sm font-extrabold text-secondary hover:bg-slate-50",
                        selected && "bg-blue-50 text-blue-700",
                      )}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      {tab.label} ({count})
                    </Button>
                  );
                })}
              </div>
              <div className="flex gap-1 pb-3 sm:pb-0">
                <Button
                  type="button"
                  variant={viewMode === "cards" ? "navy" : "outline"}
                  size="icon"
                  className="size-9 rounded-md shadow-none p-1"
                  aria-label="Card view"
                  title="Card view"
                  onClick={() => setViewMode("cards")}
                >
                  <Grid2X2 className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === "list" ? "navy" : "outline"}
                  size="icon"
                  className="size-9 rounded-md shadow-none p-1"
                  aria-label="List view"
                  title="List view"
                  onClick={() => setViewMode("list")}
                >
                  <List className="size-4" />
                </Button>
              </div>
            </div>
            <div className="border-b border-slate-100 px-4 py-3">
              <SearchInput
                aria-label="Search projects"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search projects by name, location, or developer..."
                className="h-10 max-w-xl text-sm"
              />
            </div>
            {viewMode === "cards" ? (
              <div className="p-4">
                {filteredProjects.length === 0 ? (
                  <div className="flex min-h-72 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center">
                    <span className="flex size-12 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                      <Building2 className="size-6" />
                    </span>
                    <h3 className="mt-4 text-base font-extrabold text-secondary">
                      No projects yet
                    </h3>
                    <p className="mt-2 max-w-md text-sm font-semibold text-muted-foreground">
                      Create your first project to start managing inventory,
                      site visits, and linked leads.
                    </p>
                    {canCreate ? (
                      <Button
                        type="button"
                        className="mt-5 h-10 rounded-md px-5"
                        onClick={openCreateProjectForm}
                      >
                        <Plus className="size-4" />
                        Add Project
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onView={setViewingProject}
                        onShare={setSharingProject}
                        onSharePdf={shareProjectPdf}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-base font-extrabold text-secondary">
                  No projects yet
                </p>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">
                  Create a project to populate this table.
                </p>
              </div>
            ) : (
              <ProjectsTable
                projects={filteredProjects}
                onView={setViewingProject}
                onShare={setSharingProject}
              />
            )}
          </Card>
        </main>
      </div>
      <Dialog open={projectFormOpen} onOpenChange={setProjectFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-[1320px] overflow-hidden rounded-md border border-slate-200 bg-[#fbfcff] p-0 shadow-[0_24px_80px_rgba(15,37,68,0.18)]">
          <div className="grid max-h-[90vh] lg:grid-cols-[400px_minmax(0,1fr)] 2xl:grid-cols-[440px_minmax(0,1fr)]">
            <ScrollArea className="border-r border-slate-200/80 bg-gradient-to-b from-white via-slate-50/80 to-white">
              <aside className="p-7">
                <div className="flex flex-col items-start gap-4">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-50 text-primary">
                    <Building2 className="size-5" />
                  </span>
                  <div className="max-w-[220px]">
                    <h2 className="text-[2.25rem] font-extrabold leading-[1.05] text-secondary">
                      Add Project
                    </h2>
                    <p className="mt-3 text-sm font-semibold leading-7 text-muted-foreground">
                      Create a frontend-only project record with inventory ready
                      to add from Project Details.
                    </p>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-200 pt-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label
                        className="text-sm font-extrabold text-secondary"
                        htmlFor="project-image"
                      >
                        Project Image
                      </label>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        Upload up to 5 images (JPG, PNG)
                      </p>
                    </div>
                  </div>
                  <input
                    id="project-image"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) =>
                      void Promise.all(
                        Array.from(event.target.files ?? [])
                          .slice(0, 5)
                          .map((file) => updateProjectImage(file)),
                      )
                    }
                  />
                  <div className="mt-4 space-y-4">
                    <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      <img
                        src={
                          projectForm.imageGallery[0]?.url ??
                          projectPreviewGallery[0]
                        }
                        alt="Selected project preview"
                        className="h-40 w-full object-cover"
                      />
                      {projectForm.imageGallery[0] ? (
                        <button
                          type="button"
                          aria-label={`Remove ${projectForm.imageGallery[0].name}`}
                          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-white/95 text-secondary shadow-sm"
                          onClick={() =>
                            removeProjectImage(projectForm.imageGallery[0].id)
                          }
                        >
                          <X className="size-4" />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {projectForm.imageGallery
                        .slice(1, 4)
                        .map((image) => image.url)
                        .concat(projectPreviewGallery.slice(1))
                        .slice(0, 3)
                        .map((imageUrl, index) => {
                          const galleryItem = projectForm.imageGallery.slice(
                            1,
                            4,
                          )[index];
                          return (
                            <div
                              key={`${imageUrl}-${index}`}
                              className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                            >
                              <img
                                src={imageUrl}
                                alt="Project gallery preview"
                                className="h-20 w-full object-cover"
                              />
                              {galleryItem ? (
                                <button
                                  type="button"
                                  aria-label={`Remove ${galleryItem.name}`}
                                  className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-white/95 text-secondary"
                                  onClick={() =>
                                    removeProjectImage(galleryItem.id)
                                  }
                                >
                                  <X className="size-3" />
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                      <label
                        htmlFor="project-image"
                        className="flex h-20 min-w-0 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-3 text-center text-xs font-extrabold text-secondary transition-colors hover:border-primary hover:text-primary"
                      >
                        <span className="flex flex-col items-center gap-1">
                          <ImagePlus className="size-4" />
                          Add more
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-50 text-secondary">
                        <FileText className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-secondary">
                          Brochure PDF
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                          Attach one or more project brochure PDFs.
                        </p>
                      </div>
                    </div>

                    <label className="mt-4 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-sm font-extrabold text-secondary transition-colors hover:border-primary hover:text-primary">
                      <Upload className="size-4" />
                      Upload brochures
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          void updateProjectBrochures(event.target.files);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>

                    {projectForm.brochures.length ? (
                      <div className="mt-3 space-y-2">
                        {projectForm.brochures.map((brochure, index) => (
                          <div
                            key={`${brochure.url}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-secondary">
                                {brochure.fileName ||
                                  `Project brochure ${index + 1}.pdf`}
                              </p>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                {index === 0
                                  ? "Primary brochure"
                                  : "Additional brochure"}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md shadow-none"
                                asChild
                              >
                                <a
                                  href={brochure.url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  View
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-md text-red-600 shadow-none"
                                onClick={() =>
                                  removeProjectBrochure(brochure.url)
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-700">
                        <Video className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold text-secondary">
                          Project Videos
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                          Add YouTube/Drive video links or upload video files.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <Input
                        type="url"
                        placeholder="Paste video link (YouTube/Drive/MP4)..."
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        className="h-10 text-xs shadow-none border-slate-200"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 shrink-0 text-xs font-bold shadow-none"
                        onClick={() => {
                          if (newVideoUrl.trim()) {
                            setProjectForm((curr) => ({
                              ...curr,
                              videoUrls: Array.from(
                                new Set([
                                  ...curr.videoUrls,
                                  newVideoUrl.trim(),
                                ]),
                              ),
                              videoUrl: curr.videoUrl || newVideoUrl.trim(),
                            }));
                            setNewVideoUrl("");
                          }
                        }}
                      >
                        Add Link
                      </Button>
                    </div>

                    <label className="mt-3 flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 text-xs font-extrabold text-secondary transition-colors hover:border-primary hover:text-primary">
                      <Upload className="size-3.5" />
                      Upload video file (.mp4, .webm)
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPendingVideoFile(file);
                            setIsVideoPreviewOpen(true);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    </label>

                    {projectForm.videoUrls.length ? (
                      <div className="mt-3 space-y-2">
                        {projectForm.videoUrls.map((url, index) => (
                          <div
                            key={`${url}-${index}`}
                            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-extrabold text-secondary">
                                {url}
                              </p>
                              <p className="text-[11px] font-semibold text-muted-foreground">
                                Video {index + 1}
                              </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-md text-[11px] shadow-none"
                                asChild
                              >
                                <a href={url} target="_blank" rel="noreferrer">
                                  Watch
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-md text-[11px] text-red-600 shadow-none"
                                onClick={() =>
                                  setProjectForm((curr) => {
                                    const next = curr.videoUrls.filter(
                                      (item) => item !== url,
                                    );
                                    return {
                                      ...curr,
                                      videoUrls: next,
                                      videoUrl: next[0] ?? "",
                                    };
                                  })
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <Card className="mt-7 rounded-[18px] border border-slate-200 bg-white p-4 shadow-none">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-secondary">
                    <Sparkles className="size-4 text-primary" />
                    Quick tips
                  </div>
                  <div className="mt-4 space-y-3">
                    {projectQuickTips.map((tip) => (
                      <p
                        key={tip}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
                      >
                        <span className="flex size-5 items-center justify-center rounded-full bg-green-50 text-success">
                          <Check className="size-3" />
                        </span>
                        {tip}
                      </p>
                    ))}
                  </div>
                </Card>
              </aside>
            </ScrollArea>

            <ScrollArea className="bg-white">
              <section className="p-6">
                <DialogHeader className="space-y-2 border-b border-slate-200 pb-6 text-left">
                  <div className="flex items-start gap-4">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                      <Sparkles className="size-5" />
                    </span>
                    <div>
                      <DialogTitle className="text-[1.65rem] text-secondary">
                        Let&apos;s create your project
                      </DialogTitle>
                      <DialogDescription className="mt-1 text-sm font-semibold text-muted-foreground">
                        Fill in the essential details to get started. You can
                        edit these later anytime.
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  {projectFormFieldConfigs.map(
                    ({ label, field, placeholder, required }) => {
                      if (field === "location") {
                        const hasError = Boolean(projectFormErrors.location);

                        return (
                          <div key={field} className="space-y-2">
                            <label
                              className="text-sm font-extrabold text-secondary"
                              htmlFor="project-location"
                            >
                              {label}
                              {required ? (
                                <span className="ml-1 text-primary">*</span>
                              ) : null}
                            </label>
                            <SearchableSelect
                              value={projectForm.location}
                              options={locationMasters.options}
                              placeholder="Select project location"
                              ariaLabel="Location"
                              searchPlaceholder="Search project locations..."
                              noOptionsText="No matching locations"
                              className={cn(
                                "h-12 rounded-md text-sm font-semibold shadow-none",
                                hasError && "border-destructive",
                              )}
                              contentClassName="max-h-[360px]"
                              portaled={false}
                              modal={false}
                              onValueChange={(nextValue) =>
                                updateProjectForm("location", nextValue)
                              }
                            />
                            {hasError ? (
                              <p className="text-xs font-bold text-destructive">
                                {projectFormErrors.location}
                              </p>
                            ) : null}
                          </div>
                        );
                      }

                      if (field === "possession") {
                        const hasValue = Boolean(projectForm.possession);
                        const hasError = Boolean(projectFormErrors.possession);

                        return (
                          <div key={field} className="space-y-2">
                            <label
                              className="text-sm font-extrabold text-secondary"
                              htmlFor="project-possession"
                            >
                              {label}
                              {required ? (
                                <span className="ml-1 text-primary">*</span>
                              ) : null}
                            </label>
                            <div className="relative">
                              <DatePicker
                                id="project-possession"
                                aria-label="Possession"
                                value={projectForm.possession}
                                invalid={hasError}
                                className="h-12 rounded-md border-slate-200 pr-10 text-sm font-semibold shadow-none"
                                onChange={(event) =>
                                  updateProjectForm(
                                    "possession",
                                    event.target.value,
                                  )
                                }
                              />
                              {hasValue && !hasError ? (
                                <Check className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-success" />
                              ) : null}
                            </div>
                            {hasError ? (
                              <p className="text-xs font-bold text-destructive">
                                {projectFormErrors.possession}
                              </p>
                            ) : null}
                          </div>
                        );
                      }

                      if (field === "developer") {
                        const hasError = Boolean(projectFormErrors.developer);

                        return (
                          <div key={field} className="space-y-2">
                            <label
                              className="text-sm font-extrabold text-secondary"
                              htmlFor="project-developer"
                            >
                              {label}
                              {required ? (
                                <span className="ml-1 text-primary">*</span>
                              ) : null}
                            </label>
                            <Input
                              value={projectForm.developer}
                              placeholder="Enter developer name"
                              aria-label="Developer"
                              className={cn(
                                "h-12 rounded-md border-slate-200 text-sm font-semibold shadow-none",
                                hasError && "border-destructive",
                              )}
                              onChange={(event) =>
                                updateProjectForm(
                                  "developer",
                                  event.target.value,
                                )
                              }
                            />
                            {hasError ? (
                              <p className="text-xs font-bold text-destructive">
                                {projectFormErrors.developer}
                              </p>
                            ) : null}
                          </div>
                        );
                      }

                      const hasValue = Boolean(projectForm[field]);
                      const hasError = Boolean(projectFormErrors[field]);

                      return (
                        <div key={field} className="space-y-2">
                          <label
                            className="text-sm font-extrabold text-secondary"
                            htmlFor={`project-${field}`}
                          >
                            {label}
                            {required ? (
                              <span className="ml-1 text-primary">*</span>
                            ) : null}
                          </label>
                          <div className="relative">
                            <Input
                              id={`project-${field}`}
                              aria-label={label}
                              value={projectForm[field] as string}
                              placeholder={placeholder}
                              invalid={hasError}
                              className="h-12 rounded-md border-slate-200 pr-10 text-sm font-semibold shadow-none"
                              onChange={(event) =>
                                updateProjectForm(field, event.target.value)
                              }
                            />
                            {hasValue && !hasError ? (
                              <Check className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-success" />
                            ) : null}
                          </div>
                          {hasError ? (
                            <p className="text-xs font-bold text-destructive">
                              {projectFormErrors[field]}
                            </p>
                          ) : null}
                        </div>
                      );
                    },
                  )}

                  <div className="md:col-span-2">
                    <ProjectConfigurationVariants
                      value={projectForm.configurationVariants}
                      configurationOptions={configurationMasters.options}
                      onChange={(configurationVariants) =>
                        updateProjectForm(
                          "configurationVariants",
                          configurationVariants,
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-extrabold text-secondary">
                      Number of Floors
                    </label>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={projectForm.numberOfFloors}
                      placeholder="27"
                      aria-label="Number of floors"
                      className="h-12 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                      onChange={(event) =>
                        updateProjectForm(
                          "numberOfFloors",
                          event.target.value.replace(/\D/g, ""),
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-extrabold text-secondary">
                      Price Range{" "}
                      <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2">
                          <Input
                            aria-label="Minimum Price"
                            type="number"
                            min={0}
                            step={0.01}
                            value={projectForm.priceMin}
                            placeholder="1.4"
                            invalid={Boolean(projectFormErrors.priceMin)}
                            className="h-12 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                            onChange={(event) =>
                              updateProjectForm("priceMin", event.target.value)
                            }
                          />
                          <Select
                            value={projectForm.priceMinUnit}
                            onValueChange={(value) =>
                              updateProjectForm(
                                "priceMinUnit",
                                value as ProjectPriceUnit,
                              )
                            }
                          >
                            <SelectTrigger
                              aria-label="Minimum Price Unit"
                              className="h-12 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {projectPriceUnitOptions.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {projectFormErrors.priceMin ? (
                          <p className="mt-2 text-xs font-bold text-destructive">
                            {projectFormErrors.priceMin}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2">
                          <Input
                            aria-label="Maximum Price"
                            type="number"
                            min={0}
                            step={0.01}
                            value={projectForm.priceMax}
                            placeholder="2.8"
                            invalid={Boolean(projectFormErrors.priceMax)}
                            className="h-12 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                            onChange={(event) =>
                              updateProjectForm("priceMax", event.target.value)
                            }
                          />
                          <Select
                            value={projectForm.priceMaxUnit}
                            onValueChange={(value) =>
                              updateProjectForm(
                                "priceMaxUnit",
                                value as ProjectPriceUnit,
                              )
                            }
                          >
                            <SelectTrigger
                              aria-label="Maximum Price Unit"
                              className="h-12 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {projectPriceUnitOptions.map((unit) => (
                                <SelectItem key={unit} value={unit}>
                                  {unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {projectFormErrors.priceMax ? (
                          <p className="mt-2 text-xs font-bold text-destructive">
                            {projectFormErrors.priceMax}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-sm font-extrabold text-secondary"
                      htmlFor="project-amenities"
                    >
                      Amenities
                    </label>
                    <MultiSelect
                      ariaLabel="Amenities"
                      label="Select amenities"
                      placeholder="Choose amenities"
                      options={amenityMasters.options}
                      value={projectForm.amenities}
                      onValueChange={(value: string[]) =>
                        updateProjectForm("amenities", value)
                      }
                      className="justify-between"
                      contentClassName="max-h-[360px]"
                      searchPlaceholder="Search amenities"
                      noOptionsText="No matching amenities"
                      selectedLabelText="amenity"
                      selectedLabelTextPlural="amenities"
                      maxLabelCount={1}
                      portaled={false}
                      modal={false}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <label className="text-sm font-extrabold text-secondary">
                      Status
                    </label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value) =>
                        updateProjectForm("status", value as ProjectStatus)
                      }
                    >
                      <SelectTrigger
                        aria-label="Project Status"
                        className="h-12 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                      >
                        <span className="flex items-center gap-2">
                          <Circle className="size-3 fill-current text-success" />
                          <SelectValue />
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {(projectStatusSelectOptions.length
                          ? projectStatusSelectOptions
                          : projectStatusOptions
                        ).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <ProjectGeofencePicker
                    latitude={projectForm.latitude}
                    longitude={projectForm.longitude}
                    geofenceRadiusM={projectForm.geofenceRadiusM}
                    errors={projectFormErrors}
                    onChange={updateProjectForm}
                  />

                  <div className="space-y-2 md:col-span-2">
                    <label
                      className="text-sm font-extrabold text-secondary"
                      htmlFor="project-highlights"
                    >
                      Project highlights
                    </label>
                    <Textarea
                      id="project-highlights"
                      aria-label="Project highlights"
                      value={projectForm.highlights}
                      placeholder="Enter highlights separated by commas or new lines"
                      className="min-h-[88px] rounded-md border-slate-200 px-4 py-4 text-sm font-semibold shadow-none"
                      onChange={(event) =>
                        updateProjectForm("highlights", event.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label
                      className="text-sm font-extrabold text-secondary"
                      htmlFor="project-description"
                    >
                      Description
                    </label>
                    <Textarea
                      id="project-description"
                      aria-label="Description"
                      value={projectForm.description}
                      placeholder="Short project positioning note"
                      maxLength={500}
                      className="min-h-[104px] rounded-md border-slate-200 px-4 py-4 text-sm font-semibold shadow-none"
                      onChange={(event) =>
                        updateProjectForm("description", event.target.value)
                      }
                    />
                    <p className="text-right text-xs font-bold text-muted-foreground">
                      {projectForm.description.length}/500
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md px-5 text-sm font-extrabold shadow-none"
                    onClick={saveProjectDraft}
                  >
                    <Upload className="size-4" />
                    Save as Draft
                  </Button>
                  <div className="flex gap-3">
                    <DialogClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-md px-6 text-sm font-extrabold shadow-none"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="button"
                      className="h-10 rounded-md bg-primary px-6 text-sm font-extrabold text-white hover:bg-primary-hover"
                      onClick={createProject}
                    >
                      <Sparkles className="size-4" />
                      Create Project
                    </Button>
                  </div>
                </div>
              </section>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewingProject)}
        onOpenChange={(open) => !open && setViewingProject(null)}
      >
        <DialogContent className="max-w-2xl rounded-xl bg-white">
          <DialogHeader>
            <DialogTitle>
              {viewingProject?.name ?? "Project Details"}
            </DialogTitle>
            <DialogDescription>
              {viewingProject?.location ?? "Project overview"}
            </DialogDescription>
          </DialogHeader>
          {viewingProject ? (
            <div className="space-y-4">
              <ProjectPreviewGallery project={viewingProject} />
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Developer", viewingProject.developer],
                  ["Status", viewingProject.status],
                  ["Possession", viewingProject.possession],
                  ["Price Range", viewingProject.priceRange],
                  [
                    "Configurations",
                    viewingProject.configurations.join(", ") || "-",
                  ],
                  ["Amenities", viewingProject.amenities.join(", ") || "-"],
                  [
                    "Number of Floors",
                    viewingProject.numberOfFloors
                      ? String(viewingProject.numberOfFloors)
                      : "Not specified",
                  ],
                  ["Inventory", `${viewingProject.units.length} units`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-slate-100 bg-slate-50 p-3"
                  >
                    <p className="text-[11px] font-bold text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-secondary">
                      {value}
                    </p>
                  </div>
                ))}
                <div className="rounded-md border border-slate-100 bg-slate-50 p-3 sm:col-span-2">
                  <p className="text-[11px] font-bold text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1 text-sm font-semibold text-secondary">
                    {viewingProject.description}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="shadow-none">
                Close
              </Button>
            </DialogClose>
            {viewingProject &&
            projectsCatalog.some(
              (project) => project.id === viewingProject.id,
            ) ? (
              <Button asChild>
                <Link to={`/projects/${viewingProject.id}`}>
                  Open Full Page
                </Link>
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <ProjectWhatsAppShareDialog
        open={Boolean(sharingProject)}
        onOpenChange={(open) => {
          if (!open) setSharingProject(null);
        }}
        project={sharingProject}
      />
      <VideoUploadPreviewModal
        open={isVideoPreviewOpen}
        file={pendingVideoFile}
        onOpenChange={setIsVideoPreviewOpen}
        onConfirmUpload={handleConfirmVideoUpload}
      />
    </div>
  );
}
