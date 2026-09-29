import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  BedDouble,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  Eye,
  FileImage,
  FileText,
  FolderArchive,
  Grid2X2,
  Hash,
  IndianRupee,
  Info,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  Plus,
  Share2,
  TrendingUp,
  Upload,
  UsersRound,
  Video,
  X,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  cn,
} from "ui";
import { VideoUploadPreviewModal } from "./VideoUploadPreviewModal";

import { DashboardHeader } from "../dashboard/DashboardHeader";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import {
  formatUnitLabel,
  getProjectById,
  getProjectImageGallery,
  getUnitById,
  type ProjectBrochure,
  type ProjectCatalogItem,
  type ProjectConfigurationVariant,
  type ProjectStatus,
  type ProjectUnit,
  type UnitAvailabilityStatus,
} from "./projectsData";
import { toOptions, useMasterOptions } from "./useProjectMasters";
import { mapApiUnit, useProject, useProjectMutations } from "./useProjectsApi";
import { ProjectGeofencePicker } from "./ProjectGeofencePicker";
import { ProjectConfigurationVariants } from "./ProjectConfigurationCarpetAreas";
import { ProjectWhatsAppShareDialog } from "./ProjectWhatsAppShareDialog";

interface UnitFormState {
  tower: string;
  unitNumber: string;
  configuration: string;
  floor: string;
  facing: string;
  priceAmount: string;
  priceUnit: "Lakh" | "Cr";
  availability: UnitAvailabilityStatus;
  bookingStatus: string;
  imageUrl: string;
  imageName: string;
  imageGallery: Array<{ id: string; url: string; name: string }>;
}

type UnitFormErrors = Partial<Record<keyof UnitFormState, string>>;

type EditProjectFormState = {
  name: string;
  location: string;
  developer: string;
  possession: string;
  configurationVariants: ProjectConfigurationVariant[];
  numberOfFloors: string;
  status: ProjectStatus | "Archived";
  description: string;
  latitude: string;
  longitude: string;
  geofenceRadiusM: string;
  imageGallery: string[];
  brochureUrl: string;
  brochureStorageKey: string;
  brochureFileName: string;
  brochureMimeType: string;
  brochureSizeBytes: number | null;
  brochures: ProjectBrochure[];
  videoUrl: string;
  videoUrls: string[];
};

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return "Size unavailable";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const createEmptyUnitForm = (configuration = ""): UnitFormState => ({
  tower: "",
  unitNumber: "",
  configuration,
  floor: "",
  facing: "",
  priceAmount: "",
  priceUnit: "Cr",
  availability: "Available",
  bookingStatus: "Open",
  imageUrl: "",
  imageName: "",
  imageGallery: [],
});

const getEditableProjectGallery = (project?: ProjectCatalogItem | null) => {
  if (!project) return [];
  return Array.from(
    new Set(
      [project.imageUrl, ...(project.imageGallery ?? [])].filter(
        (image): image is string => Boolean(image),
      ),
    ),
  );
};

const getUnitStatusClassName = (status: UnitAvailabilityStatus) =>
  status === "Available"
    ? "bg-green-50 text-success"
    : status === "Hold"
    ? "bg-orange-50 text-primary"
    : status === "Booked"
    ? "bg-blue-50 text-blue-700"
    : "bg-slate-100 text-secondary";

const unitTowerOptions = [
  "Tower A",
  "Tower B",
  "Tower C",
  "Tower D",
  "Tower Z",
];
const unitFacingOptions = [
  "East",
  "West",
  "North",
  "South",
  "Garden",
  "Sea View",
  "Lake",
  "Road",
];
const unitBookingStatusOptions = [
  "Open",
  "Family revisit",
  "Negotiation",
  "Token received",
  "Closed",
];
const unitPriceUnitOptions: UnitFormState["priceUnit"][] = ["Cr", "Lakh"];
const DEFAULT_CONFIGURATIONS = [
  "1 BHK",
  "2 BHK",
  "3 BHK",
  "4 BHK",
  "5 BHK",
  "Studio",
  "Penthouse",
];

const DEFAULT_PROJECT_LOCATIONS = ["Bandra, Mumbai"];
const unitFieldConfigs: Array<{
  label: string;
  ariaLabel: string;
  field: keyof Pick<UnitFormState, "unitNumber" | "floor">;
  placeholder: string;
  icon: LucideIcon;
  type: "text" | "number";
}> = [
  {
    label: "Unit Number",
    ariaLabel: "Unit Number",
    field: "unitNumber",
    placeholder: "1204",
    icon: Hash,
    type: "number",
  },
  {
    label: "Floor",
    ariaLabel: "Floor",
    field: "floor",
    placeholder: "12",
    icon: Layers,
    type: "number",
  },
];

function SummaryTile({
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
          <p className="truncate text-xs font-bold text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 truncate text-lg font-extrabold text-secondary">
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

function ProjectHeroGallery({
  project,
  gallery,
  onUpload,
  onDelete,
  onMove,
  onOpenLightbox,
}: {
  project: ProjectCatalogItem;
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
    <div className="flex flex-col justify-start gap-3 bg-slate-50 p-4 border-l border-slate-200 lg:w-[380px] self-stretch">
      <div className="group relative h-64 overflow-hidden rounded-md bg-slate-100 shadow-inner">
        {gallery.length > 0 ? (
          <img
            src={gallery[activeImageIndex]}
            alt={`${project.name} cover`}
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
              className="hidden"
              onChange={(event) => {
                onUpload(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        ) : null}
      </div>

      <ScrollArea className="h-20 w-full">
        <div className="flex gap-2 pb-2">
          {gallery.map((imageUrl, index) => (
            <div
              key={`${project.id}-gallery-${index}`}
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
              <button
                type="button"
                className="absolute right-1 top-1 hidden size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80 group-hover/thumb:flex"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
              >
                <X className="size-3" />
              </button>
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

export function ProjectDetailsScreen() {
  const { projectId } = useParams();
  const staticProject = getProjectById(projectId);

  const projectQuery = useProject(projectId);
  const project = projectQuery.data ?? staticProject;
  const projectBrochures = project?.brochures ?? [];
  const projectMutations = useProjectMutations();
  const towerMasters = useMasterOptions(
    "unit_tower",
    toOptions(unitTowerOptions),
  );
  const facingMasters = useMasterOptions(
    "unit_facing",
    toOptions(unitFacingOptions),
  );
  const bookingStatusMasters = useMasterOptions(
    "unit_booking_status",
    toOptions(unitBookingStatusOptions),
  );
  const availabilityMasters = useMasterOptions(
    "unit_availability",
    toOptions(["Available", "Hold", "Booked", "Sold"]),
  );
  const configurationMasters = useMasterOptions(
    "project_configuration",
    toOptions(DEFAULT_CONFIGURATIONS),
  );
  const locationMasters = useMasterOptions(
    "project_location",
    toOptions(
      Array.from(
        new Set(
          [project?.location, ...DEFAULT_PROJECT_LOCATIONS].filter(
            (value): value is string => Boolean(value),
          ),
        ),
      ),
    ),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [projectName, setProjectName] = useState(() => project?.name ?? "");
  const [projectLocation, setProjectLocation] = useState(
    () => project?.location ?? "",
  );
  const [projectDeveloper, setProjectDeveloper] = useState(
    () => project?.developer ?? "",
  );
  const projectPossession = project?.possession ?? "";
  const [projectDescription, setProjectDescription] = useState(
    () => project?.description ?? "",
  );
  const [projectStatus, setProjectStatus] = useState<
    ProjectStatus | "Archived"
  >(() => project?.status ?? "Active");

  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [shareProjectOpen, setShareProjectOpen] = useState(false);
  const [projectFormState, setProjectFormState] =
    useState<EditProjectFormState>({
      name: project?.name ?? "",
      location: project?.location ?? "",
      developer: project?.developer ?? "",
      possession: project?.possession ?? "",
      configurationVariants: project?.configurationVariants ?? [],
      numberOfFloors: project?.numberOfFloors?.toString() ?? "",
      status: project?.status ?? "Active",
      description: project?.description ?? "",
      latitude: project?.latitude?.toString() ?? "",
      longitude: project?.longitude?.toString() ?? "",
      geofenceRadiusM: project?.geofenceRadiusM?.toString() ?? "150",
      imageGallery: getEditableProjectGallery(project),
      brochureUrl: project?.brochureUrl ?? "",
      brochureStorageKey: project?.brochureStorageKey ?? "",
      brochureFileName: project?.brochureFileName ?? "",
      brochureMimeType: project?.brochureMimeType ?? "",
      brochureSizeBytes: project?.brochureSizeBytes ?? null,
      brochures: project?.brochures ?? [],
      videoUrl: project?.videoUrl ?? project?.videoUrls?.[0] ?? "",
      videoUrls: project?.videoUrls?.length
        ? project.videoUrls
        : project?.videoUrl
        ? [project.videoUrl]
        : [],
    });

  const [newEditVideoUrl, setNewEditVideoUrl] = useState("");
  const [newDetailVideoUrl, setNewDetailVideoUrl] = useState("");
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  const [gallery, setGallery] = useState<string[]>(() =>
    project ? getProjectImageGallery(project) : [],
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [units, setUnits] = useState<ProjectUnit[]>(() => project?.units ?? []);
  const [unitFormOpen, setUnitFormOpen] = useState(false);
  const [viewingUnit, setViewingUnit] = useState<ProjectUnit | null>(null);
  const [unitForm, setUnitForm] = useState<UnitFormState>(() =>
    createEmptyUnitForm(project?.configurations[0]),
  );
  const [unitFormErrors, setUnitFormErrors] = useState<UnitFormErrors>({});
  const [inventoryMessage, setInventoryMessage] = useState("");
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  const [unitSearch, setUnitSearch] = useState("");
  const [towerFilter, setTowerFilter] = useState("All");
  const [configFilter, setConfigFilter] = useState("All");
  const [availabilityFilter, setAvailabilityFilter] = useState("All");
  const [bookingStatusFilter, setBookingStatusFilter] = useState("All");
  const [unitViewMode, setUnitViewMode] = useState<"grid" | "list">("grid");
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [isVideoPreviewOpen, setIsVideoPreviewOpen] = useState(false);
  const [videoUploadTarget, setVideoUploadTarget] = useState<
    "overview" | "edit"
  >("overview");
  const [selectedDetailVideoIndex, setSelectedDetailVideoIndex] = useState(0);

  const handleConfirmVideoUpload = async (file: File) => {
    if (videoUploadTarget === "overview") {
      await handleUploadProjectVideoFile([file] as any);
    } else {
      try {
        const uploaded = await projectMutations.uploadProjectVideo.mutateAsync(
          file,
        );
        setProjectFormState((current) => ({
          ...current,
          videoUrls: Array.from(new Set([...current.videoUrls, uploaded.url])),
          videoUrl: current.videoUrl || uploaded.url,
        }));
        toast.success("Video uploaded and ready to save");
      } catch {
        toast.error("Could not upload video file");
      }
    }
  };

  useEffect(() => {
    if (!project) return;
    setProjectName(project.name);
    setProjectLocation(project.location);
    setProjectDeveloper(project.developer);
    setProjectStatus(project.status);
    setProjectDescription(project.description);
    setProjectFormState({
      name: project.name,
      location: project.location,
      developer: project.developer,
      possession: project.possession ?? "",
      configurationVariants: project.configurationVariants ?? [],
      numberOfFloors: project.numberOfFloors?.toString() ?? "",
      status: project.status,
      description: project.description,
      latitude: project.latitude?.toString() ?? "",
      longitude: project.longitude?.toString() ?? "",
      geofenceRadiusM: project.geofenceRadiusM?.toString() ?? "150",
      imageGallery: getEditableProjectGallery(project),
      brochureUrl: project.brochureUrl ?? "",
      brochureStorageKey: project.brochureStorageKey ?? "",
      brochureFileName: project.brochureFileName ?? "",
      brochureMimeType: project.brochureMimeType ?? "",
      brochureSizeBytes: project.brochureSizeBytes ?? null,
      brochures: project.brochures ?? [],
      videoUrl: project.videoUrl ?? project.videoUrls?.[0] ?? "",
      videoUrls: project.videoUrls?.length
        ? project.videoUrls
        : project.videoUrl
        ? [project.videoUrl]
        : [],
    });
    setGallery(getProjectImageGallery(project));
    setUnits(project.units ?? []);
  }, [project]);

  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const label = `${unit.tower} Unit ${unit.unitNumber}`.toLowerCase();
      const matchesSearch =
        !unitSearch || label.includes(unitSearch.toLowerCase());
      const matchesTower = towerFilter === "All" || unit.tower === towerFilter;
      const matchesConfig =
        configFilter === "All" || unit.configuration === configFilter;
      const matchesAvailability =
        availabilityFilter === "All" ||
        unit.availability === availabilityFilter;
      const matchesBookingStatus =
        bookingStatusFilter === "All" ||
        unit.bookingStatus === bookingStatusFilter;
      return (
        matchesSearch &&
        matchesTower &&
        matchesConfig &&
        matchesAvailability &&
        matchesBookingStatus
      );
    });
  }, [
    units,
    unitSearch,
    towerFilter,
    configFilter,
    availabilityFilter,
    bookingStatusFilter,
  ]);

  const uniqueTowers = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set([
          ...towerMasters.options.map((option) => option.value),
          ...units.map((u) => u.tower),
        ]),
      ),
    ];
  }, [towerMasters.options, units]);

  const uniqueConfigs = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set([
          ...(project?.configurations ?? []),
          ...configurationMasters.options.map((option) => option.value),
        ]),
      ),
    ];
  }, [configurationMasters.options, project?.configurations]);

  if (projectQuery.isPending && !staticProject) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
      </div>
    );
  }

  if (!project && !projectQuery.isPending) {
    return <Navigate to="/projects" replace />;
  }

  const handleUploadImages = async (files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []).slice(0, 15 - gallery.length);
    if (!selectedFiles.length) return;

    try {
      const uploadedResults = await Promise.allSettled(
        selectedFiles.map((file) =>
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
        toast.error("Could not upload project images. Please try again.");
        return;
      }
      const nextGallery = [...gallery, ...urls];
      setGallery(nextGallery);
      if (projectId) {
        await projectMutations.updateProject.mutateAsync({
          id: projectId,
          payload: { imageUrl: nextGallery[0], imageGallery: nextGallery },
        });
      }
      toast.success(
        `${urls.length} image${urls.length === 1 ? "" : "s"} uploaded`,
      );
      if (failedCount > 0) {
        toast.error(
          `${failedCount} image${
            failedCount === 1 ? "" : "s"
          } could not be uploaded.`,
        );
      }
    } catch {
      toast.error("Could not upload project images");
    }
  };

  const handleDeleteImage = async (index: number) => {
    const nextGallery = gallery.filter((_, idx) => idx !== index);
    setGallery(nextGallery);
    if (projectId) {
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: { imageUrl: nextGallery[0] ?? "", imageGallery: nextGallery },
      });
    }
  };

  const handleMoveImage = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= gallery.length) return;
    const nextGallery = [...gallery];
    const temp = nextGallery[index];
    nextGallery[index] = nextGallery[nextIndex];
    nextGallery[nextIndex] = temp;
    setGallery(nextGallery);
    if (projectId) {
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: { imageUrl: nextGallery[0] ?? "", imageGallery: nextGallery },
      });
    }
  };

  const handleUploadEditProjectImages = async (files: FileList | null) => {
    const remainingSlots = 15 - projectFormState.imageGallery.length;
    const selectedFiles = Array.from(files ?? []).slice(0, remainingSlots);
    if (!selectedFiles.length) return;

    try {
      const uploadedResults = await Promise.allSettled(
        selectedFiles.map((file) =>
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
        toast.error("Could not upload project images. Please try again.");
        return;
      }

      setProjectFormState((current) => ({
        ...current,
        imageGallery: [...current.imageGallery, ...urls],
      }));
      toast.success(
        `${urls.length} image${urls.length === 1 ? "" : "s"} ready to save`,
      );
      if (failedCount > 0) {
        toast.error(
          `${failedCount} image${
            failedCount === 1 ? "" : "s"
          } could not be uploaded.`,
        );
      }
    } catch {
      toast.error("Could not prepare project images");
    }
  };

  const handleUploadEditProjectBrochures = async (
    files: FileList | null | undefined,
  ) => {
    const selectedFiles = Array.from(files ?? []);
    if (!selectedFiles.length) return;
    if (selectedFiles.some((file) => file.type !== "application/pdf")) {
      toast.error("Upload PDF brochures only");
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
      setProjectFormState((current) => {
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
      toast.success(
        `${uploadedBrochures.length} brochure PDF${
          uploadedBrochures.length === 1 ? "" : "s"
        } ready to save`,
      );
    } catch {
      toast.error("Could not upload brochure PDF");
    }
  };

  const handleRemoveEditProjectBrochure = (brochureUrl: string) => {
    setProjectFormState((current) => {
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

  const handleUploadProjectBrochures = async (
    files: FileList | null | undefined,
  ) => {
    const selectedFiles = Array.from(files ?? []);
    if (!projectId || !project || !selectedFiles.length) return;
    if (selectedFiles.some((file) => file.type !== "application/pdf")) {
      toast.error("Upload PDF brochures only");
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
      const brochures = [...(project.brochures ?? []), ...uploadedBrochures];
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: {
          brochures,
        },
      });
      toast.success(
        `${uploadedBrochures.length} brochure PDF${
          uploadedBrochures.length === 1 ? "" : "s"
        } uploaded`,
      );
    } catch {
      toast.error("Could not upload brochure PDF");
    }
  };

  const handleRemoveProjectBrochure = async (brochureUrl: string) => {
    if (!projectId || !projectBrochures.length) return;

    try {
      const brochures = projectBrochures.filter(
        (brochure: ProjectBrochure) => brochure.url !== brochureUrl,
      );
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: { brochures },
      });
      toast.success("Project brochure removed");
    } catch {
      toast.error("Could not remove brochure");
    }
  };

  const handleCopyProjectBrochureLink = async () => {
    if (!projectBrochures.length) {
      toast.error("Upload a brochure PDF first");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        projectBrochures
          .map((brochure: ProjectBrochure) => brochure.url)
          .join("\n"),
      );
      toast.success("Brochure links copied");
    } catch {
      toast.error("Could not copy brochure links");
    }
  };

  const handleShareProjectBrochure = () => {
    if (!projectBrochures.length) {
      toast.error("Upload a brochure PDF first");
      return;
    }

    const message = [
      `Project brochures for ${project?.name ?? "this project"}`,
      ...projectBrochures.map((brochure: ProjectBrochure) => brochure.url),
    ].join("\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleAddProjectVideoLink = async (urlToAdd?: string) => {
    const targetUrl = (urlToAdd || newDetailVideoUrl).trim();
    if (!targetUrl || !projectId || !project) return;

    try {
      const existingVideos = project.videoUrls?.length
        ? project.videoUrls
        : project.videoUrl
        ? [project.videoUrl]
        : [];
      const nextVideoUrls = Array.from(new Set([...existingVideos, targetUrl]));
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: {
          videoUrls: nextVideoUrls,
          videoUrl: nextVideoUrls[0] ?? "",
        },
      });
      setNewDetailVideoUrl("");
      toast.success("Project video link added");
    } catch {
      toast.error("Could not add project video link");
    }
  };

  const handleUploadProjectVideoFile = async (
    files: FileList | null | undefined,
  ) => {
    const file = files?.[0];
    if (!file || !projectId || !project) return;

    try {
      setIsVideoUploading(true);
      const uploaded = await projectMutations.uploadProjectVideo.mutateAsync(
        file,
      );
      const existingVideos = project.videoUrls?.length
        ? project.videoUrls
        : project.videoUrl
        ? [project.videoUrl]
        : [];
      const nextVideoUrls = Array.from(
        new Set([...existingVideos, uploaded.url]),
      );
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: {
          videoUrls: nextVideoUrls,
          videoUrl: nextVideoUrls[0] ?? "",
        },
      });
      toast.success("Project video file uploaded successfully");
    } catch {
      toast.error("Could not upload video file");
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleRemoveProjectVideo = async (videoUrlToRemove: string) => {
    if (!projectId || !project) return;

    try {
      const existingVideos = project.videoUrls?.length
        ? project.videoUrls
        : project.videoUrl
        ? [project.videoUrl]
        : [];
      const nextVideoUrls = existingVideos.filter(
        (u: string) => u !== videoUrlToRemove,
      );
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: {
          videoUrls: nextVideoUrls,
          videoUrl: nextVideoUrls[0] ?? "",
        },
      });
      toast.success("Project video removed");
    } catch {
      toast.error("Could not remove video");
    }
  };

  const handleDeleteEditProjectImage = (index: number) => {
    setProjectFormState((current) => ({
      ...current,
      imageGallery: current.imageGallery.filter((_, idx) => idx !== index),
    }));
  };

  const handleMoveEditProjectImage = (index: number, direction: -1 | 1) => {
    setProjectFormState((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.imageGallery.length) {
        return current;
      }

      const nextGallery = [...current.imageGallery];
      const currentImage = nextGallery[index];
      nextGallery[index] = nextGallery[nextIndex];
      nextGallery[nextIndex] = currentImage;

      return {
        ...current,
        imageGallery: nextGallery,
      };
    });
  };

  const handleEditProjectSave = async () => {
    const nextGallery = projectFormState.imageGallery.filter(Boolean);
    if (projectId) {
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: {
          ...projectFormState,
          numberOfFloors: projectFormState.numberOfFloors.trim()
            ? Number(projectFormState.numberOfFloors)
            : null,
          configurations: Array.from(
            new Set(
              projectFormState.configurationVariants
                .map((variant) => variant.configuration)
                .filter(Boolean),
            ),
          ),
          imageUrl: nextGallery[0] ?? "",
          imageGallery: nextGallery,
          brochureUrl: projectFormState.brochureUrl || undefined,
          brochureStorageKey: projectFormState.brochureStorageKey || undefined,
          brochureFileName: projectFormState.brochureFileName || undefined,
          brochureMimeType: projectFormState.brochureMimeType || undefined,
          brochureSizeBytes: projectFormState.brochureSizeBytes ?? undefined,
          brochures: projectFormState.brochures,
          videoUrl:
            projectFormState.videoUrl ||
            projectFormState.videoUrls[0] ||
            undefined,
          videoUrls: projectFormState.videoUrls.length
            ? projectFormState.videoUrls
            : projectFormState.videoUrl
            ? [projectFormState.videoUrl]
            : undefined,
        },
      });
    }
    setProjectName(projectFormState.name);
    setProjectLocation(projectFormState.location);
    setProjectDeveloper(projectFormState.developer);
    setProjectStatus(projectFormState.status as any);
    setProjectDescription(projectFormState.description);
    setGallery(nextGallery);
    setIsEditProjectOpen(false);
  };

  const handleArchiveProject = async () => {
    const nextStatus = projectStatus === "Archived" ? "Active" : "Archived";
    if (projectId) {
      await projectMutations.updateProject.mutateAsync({
        id: projectId,
        payload: { status: nextStatus },
      });
    }
    setProjectStatus(nextStatus);
  };

  const totalInventory = units.length;
  const availableCount = units.filter(
    (u) => u.availability === "Available",
  ).length;
  const reservedCount = units.filter((u) => u.availability === "Hold").length;
  const soldCount = units.filter(
    (u) => u.availability === "Sold" || u.availability === "Booked",
  ).length;
  const conversionRate =
    totalInventory > 0
      ? `${Math.round((soldCount / totalInventory) * 100)}%`
      : "0%";

  const openCreateUnitForm = () => {
    setUnitForm(createEmptyUnitForm(project.configurations[0] || "2 BHK"));
    setUnitFormErrors({});
    setInventoryMessage("");
    setEditingUnitId(null);
    setUnitFormOpen(true);
  };

  const openEditUnitForm = (unit: ProjectUnit) => {
    const priceMatch = unit.price.match(/INR\s+(\d+(?:\.\d+)?)\s+(Cr|Lakh)/i);
    const priceAmount = priceMatch ? priceMatch[1] : "";
    const priceUnit = priceMatch ? (priceMatch[2] as "Cr" | "Lakh") : "Cr";

    setUnitForm({
      tower: unit.tower,
      unitNumber: unit.unitNumber,
      configuration: unit.configuration,
      floor: unit.floor,
      facing: unit.facing,
      priceAmount,
      priceUnit,
      availability: unit.availability,
      bookingStatus: unit.bookingStatus,
      imageUrl: unit.imageUrl || "",
      imageName: "",
      imageGallery: (unit.imageGallery || []).map((url, idx) => ({
        id: `edit-${idx}-${Date.now()}`,
        url,
        name: `Image ${idx + 1}`,
      })),
    });
    setEditingUnitId(unit.id);
    setUnitFormErrors({});
    setInventoryMessage("");
    setUnitFormOpen(true);
  };

  const updateUnitForm = <K extends keyof UnitFormState>(
    field: K,
    value: UnitFormState[K],
  ) => {
    setUnitForm((current) => ({ ...current, [field]: value }));
    setUnitFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleUploadUnitImages = async (files: FileList | null) => {
    if (!files) return;
    const uploadedResults = await Promise.allSettled(
      Array.from(files)
        .slice(0, 5 - unitForm.imageGallery.length)
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
      toast.error("Could not upload unit images. Please try again.");
      return;
    }
    const newItems = urls.map((url, idx) => ({
      id: `new-${Date.now()}-${idx}`,
      url,
      name: `Image ${unitForm.imageGallery.length + idx + 1}`,
    }));
    const nextGallery = [...unitForm.imageGallery, ...newItems];
    updateUnitForm("imageGallery", nextGallery);
    if (nextGallery.length > 0) {
      updateUnitForm("imageUrl", nextGallery[0].url);
    }
    if (failedCount > 0) {
      toast.error(
        `${failedCount} image${
          failedCount === 1 ? "" : "s"
        } could not be uploaded.`,
      );
    }
  };

  const handleDeleteUnitImage = (index: number) => {
    const nextGallery = unitForm.imageGallery.filter((_, idx) => idx !== index);
    updateUnitForm("imageGallery", nextGallery);
    updateUnitForm("imageUrl", nextGallery[0]?.url || "");
  };

  const validateUnitForm = () => {
    return {};
  };

  const createOrUpdateUnit = async () => {
    const nextErrors = validateUnitForm();
    setUnitFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const savedUnitNumber =
      unitForm.unitNumber.trim() || `Auto ${Date.now().toString().slice(-6)}`;
    const savedTower = unitForm.tower.trim();
    const savedConfiguration = unitForm.configuration.trim();
    const savedFloor = unitForm.floor.trim();
    const savedFacing = unitForm.facing.trim();
    const savedPriceAmount = unitForm.priceAmount.trim();
    const savedBookingStatus = unitForm.bookingStatus.trim() || "Open";

    if (editingUnitId) {
      let updatedUnit: ProjectUnit | null = null;
      if (projectId) {
        const updated = await projectMutations.updateUnit.mutateAsync({
          projectId,
          unitId: editingUnitId,
          payload: {
            tower: savedTower || undefined,
            unitNumber: savedUnitNumber,
            configuration: savedConfiguration || undefined,
            floor: savedFloor || undefined,
            facing: savedFacing || undefined,
            priceAmount: savedPriceAmount || undefined,
            priceUnit: unitForm.priceUnit,
            availability: unitForm.availability,
            bookingStatus: savedBookingStatus,
            imageUrl: unitForm.imageUrl,
            imageGallery: unitForm.imageGallery.map((img) => img.url),
          },
        });
        updatedUnit = mapApiUnit(updated);
      }
      setUnits((current) =>
        current.map((u) => {
          if (u.id === editingUnitId) {
            return (
              updatedUnit ?? {
                ...u,
                tower: savedTower || "-",
                unitNumber: savedUnitNumber,
                configuration: savedConfiguration || "-",
                floor: savedFloor || "-",
                facing: savedFacing || "-",
                price: savedPriceAmount
                  ? `INR ${savedPriceAmount} ${unitForm.priceUnit}`
                  : "-",
                availability: unitForm.availability,
                bookingStatus: savedBookingStatus,
                imageUrl: unitForm.imageUrl || u.imageUrl,
              }
            );
          }
          return u;
        }),
      );
      setInventoryMessage(
        `${
          savedTower ? `${savedTower}, ` : ""
        }Unit ${savedUnitNumber} updated successfully.`,
      );
    } else {
      const created = projectId
        ? await projectMutations.createUnit.mutateAsync({
            projectId,
            payload: {
              tower: savedTower || undefined,
              unitNumber: savedUnitNumber,
              configuration: savedConfiguration || undefined,
              floor: savedFloor || undefined,
              facing: savedFacing || undefined,
              priceAmount: savedPriceAmount || undefined,
              priceUnit: unitForm.priceUnit,
              availability: unitForm.availability,
              bookingStatus: savedBookingStatus,
              imageUrl: unitForm.imageUrl,
              imageGallery: unitForm.imageGallery.map((img) => img.url),
            },
          })
        : null;
      const newUnit: ProjectUnit = created
        ? mapApiUnit(created)
        : {
            id: `${project?.id ?? "project"}-${
              savedTower || "inventory"
            }-${savedUnitNumber}`
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
            projectId: project?.id ?? "",
            imageUrl: unitForm.imageUrl,
            tower: savedTower || "-",
            unitNumber: savedUnitNumber,
            configuration: savedConfiguration || "-",
            carpetArea: "-",
            floor: savedFloor || "-",
            facing: savedFacing || "-",
            price: savedPriceAmount
              ? `INR ${savedPriceAmount} ${unitForm.priceUnit}`
              : "-",
            availability: unitForm.availability,
            bookingStatus: savedBookingStatus,
            visitCount: 0,
          };
      setUnits((current) => [newUnit, ...current]);
      setViewingUnit(newUnit);
      setInventoryMessage(`${formatUnitLabel(newUnit)} added successfully.`);
    }
    setUnitFormOpen(false);
  };

  const getStatusClassName = (status: ProjectStatus | "Archived") =>
    status === "High Demand"
      ? "bg-orange-50 text-primary"
      : status === "Ready To Move"
      ? "bg-green-50 text-success"
      : status === "Under Construction"
      ? "bg-blue-50 text-blue-700"
      : status === "Archived"
      ? "bg-red-50 text-red-600"
      : "bg-slate-100 text-secondary";

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
              <span className="text-secondary">{projectName}</span>
            </>
          }
        />
        <main className="space-y-5 p-4 sm:p-6">
          <Button
            asChild
            variant="ghost"
            className="h-8 px-0 text-xs font-extrabold text-muted-foreground hover:bg-transparent hover:text-secondary"
          >
            <Link to="/projects">
              <ArrowLeft className="size-4" />
              Back to Projects
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
                        getStatusClassName(projectStatus),
                      )}
                    >
                      {projectStatus}
                    </Badge>
                    {projectPossession ? (
                      <Badge className="border-0 bg-slate-100 text-[11px] font-extrabold text-secondary">
                        {projectPossession}
                      </Badge>
                    ) : null}
                  </div>
                  <h1 className="mt-4 text-3xl font-extrabold text-secondary">
                    {projectName}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      {projectLocation}
                    </span>
                    <span>·</span>
                    {projectDeveloper ? (
                      <span>Developer: {projectDeveloper}</span>
                    ) : null}
                    {project.numberOfFloors ? (
                      <span>{project.numberOfFloors} floors</span>
                    ) : null}
                  </div>
                  <p className="mt-4 max-w-3xl text-sm font-semibold leading-6 text-secondary">
                    {projectDescription}
                  </p>
                </div>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Button
                    type="button"
                    className="h-10 rounded-md px-4 shadow-sm"
                    onClick={openCreateUnitForm}
                  >
                    <Plus className="mr-1.5 size-4" /> Add Inventory
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 rounded-md px-4 shadow-none"
                    onClick={() => setIsEditProjectOpen(true)}
                  >
                    Edit Project
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-md px-4 shadow-none"
                    onClick={() => setShareProjectOpen(true)}
                  >
                    <Share2 className="mr-1.5 size-4" />
                    Share WhatsApp
                  </Button>
                  <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-secondary hover:bg-slate-50 transition-colors shadow-none">
                    Upload Images
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        handleUploadImages(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <label className="flex h-10 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-secondary transition-colors hover:bg-slate-50 shadow-none">
                    <FileText className="mr-1.5 size-4" />
                    {projectBrochures.length
                      ? "Add brochure PDFs"
                      : "Upload brochure PDFs"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        void handleUploadProjectBrochures(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-10 rounded-md px-4 shadow-none transition-colors",
                      projectStatus === "Archived"
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                        : "text-destructive hover:bg-red-50",
                    )}
                    onClick={handleArchiveProject}
                  >
                    <FolderArchive className="mr-1.5 size-4" />
                    {projectStatus === "Archived"
                      ? "Archived (Activate)"
                      : "Archive Project"}
                  </Button>
                </div>
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-secondary">
                        <FileText className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-secondary">
                          {projectBrochures.length
                            ? `${projectBrochures.length} brochure PDF${
                                projectBrochures.length === 1 ? "" : "s"
                              } uploaded`
                            : "No brochure uploaded"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {projectBrochures.length
                            ? "PDF brochures are ready to view, copy, or share with clients."
                            : "Upload PDF brochures to view, copy, or share them with clients."}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {projectBrochures.length ? (
                        <>
                          <Button
                            asChild
                            type="button"
                            variant="outline"
                            className="h-9 rounded-md px-3 text-xs shadow-none"
                          >
                            <a
                              href={projectBrochures[0]?.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="size-4" />
                              View PDF
                            </a>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-md px-3 text-xs shadow-none"
                            onClick={handleCopyProjectBrochureLink}
                          >
                            <Copy className="size-4" />
                            Copy links
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-md px-3 text-xs shadow-none"
                            onClick={handleShareProjectBrochure}
                          >
                            <Share2 className="size-4" />
                            Share PDFs
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-md px-3 text-xs text-destructive shadow-none hover:bg-red-50"
                            onClick={() =>
                              handleRemoveProjectBrochure(
                                projectBrochures[0]?.url ?? "",
                              )
                            }
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 rounded-md px-3 text-xs shadow-none"
                          onClick={() =>
                            toast.error("Upload a brochure PDF first")
                          }
                        >
                          <Share2 className="size-4" />
                          Share PDF
                        </Button>
                      )}
                    </div>
                  </div>
                  {projectBrochures.length ? (
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {projectBrochures.map(
                        (brochure: ProjectBrochure, index: number) => (
                          <div
                            key={`${brochure.url}-${index}`}
                            className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-secondary">
                                {brochure.fileName ||
                                  `Project brochure ${index + 1}.pdf`}
                              </p>
                              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">
                                {index === 0 ? "Primary PDF" : "Additional PDF"}{" "}
                                - {formatFileSize(brochure.sizeBytes)}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                asChild
                                type="button"
                                variant="ghost"
                                className="h-8 rounded-md px-2 text-xs shadow-none"
                              >
                                <a
                                  href={brochure.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`View ${
                                    brochure.fileName || `brochure ${index + 1}`
                                  }`}
                                >
                                  <ExternalLink className="size-4" />
                                </a>
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                className="h-8 rounded-md px-2 text-xs text-destructive shadow-none hover:bg-red-50"
                                onClick={() =>
                                  handleRemoveProjectBrochure(brochure.url)
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white text-purple-700">
                        <Video className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-secondary">
                          {project.videoUrls?.length
                            ? `${project.videoUrls.length} project video${
                                project.videoUrls.length === 1 ? "" : "s"
                              }`
                            : project.videoUrl
                            ? "1 project video"
                            : "No videos linked"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          Watch video tours, paste video links, or upload video
                          files directly.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="flex h-9 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-secondary transition-colors hover:bg-slate-50 shadow-none">
                        <Upload className="mr-1.5 size-3.5" />
                        {isVideoUploading ? "Uploading..." : "Upload Video"}
                        <input
                          type="file"
                          accept="video/*"
                          disabled={isVideoUploading}
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setVideoUploadTarget("overview");
                              setPendingVideoFile(file);
                              setIsVideoPreviewOpen(true);
                              event.currentTarget.value = "";
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Input
                      type="url"
                      placeholder="Paste video link (YouTube/Drive/MP4)..."
                      value={newDetailVideoUrl}
                      onChange={(e) => setNewDetailVideoUrl(e.target.value)}
                      className="h-9 text-xs shadow-none border-slate-200 font-semibold bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 shrink-0 text-xs font-extrabold shadow-none bg-white"
                      onClick={() => void handleAddProjectVideoLink()}
                    >
                      Add Link
                    </Button>
                  </div>

                  {project.videoUrls?.length || project.videoUrl ? (
                    <div className="mt-4 grid gap-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs lg:grid-cols-[340px_minmax(0,1fr)]">
                      {/* Compact Live Video Player */}
                      <div className="relative aspect-video max-h-[210px] w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shadow-md">
                        {(() => {
                          const videosList = (
                            project.videoUrls?.length
                              ? project.videoUrls
                              : [project.videoUrl!]
                          ).filter(Boolean);
                          const activeUrl =
                            videosList[selectedDetailVideoIndex] ||
                            videosList[0];
                          if (!activeUrl) return null;
                          if (
                            activeUrl.includes("youtube.com") ||
                            activeUrl.includes("youtu.be")
                          ) {
                            const embedId = activeUrl.includes("v=")
                              ? activeUrl.split("v=")[1]?.split("&")[0]
                              : activeUrl.split("/").pop();
                            return (
                              <iframe
                                src={`https://www.youtube.com/embed/${embedId}`}
                                title="Project Video"
                                className="aspect-video h-full w-full object-cover"
                                allowFullScreen
                              />
                            );
                          }
                          return (
                            <video
                              controls
                              autoPlay={false}
                              src={activeUrl}
                              className="aspect-video h-full w-full object-contain"
                            />
                          );
                        })()}
                      </div>

                      {/* Playlist / Videos List */}
                      <div className="flex flex-col justify-between space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="flex items-center gap-1.5 text-xs font-extrabold text-secondary">
                            <Video className="size-3.5 text-purple-600" />
                            Linked Video Tours
                          </span>
                          <span className="text-[11px] font-bold text-muted-foreground">
                            {
                              (project.videoUrls?.length
                                ? project.videoUrls
                                : [project.videoUrl!]
                              ).filter(Boolean).length
                            }{" "}
                            Total
                          </span>
                        </div>

                        <div className="max-h-[165px] space-y-2 overflow-y-auto pr-1">
                          {(project.videoUrls?.length
                            ? project.videoUrls
                            : [project.videoUrl!]
                          )
                            .filter(Boolean)
                            .map((videoUrl: string, index: number) => {
                              const isSelected =
                                selectedDetailVideoIndex === index;
                              const isYouTube =
                                videoUrl.includes("youtube.com") ||
                                videoUrl.includes("youtu.be");
                              return (
                                <div
                                  key={`${videoUrl}-${index}`}
                                  className={cn(
                                    "flex cursor-pointer items-center justify-between gap-2 rounded-lg border p-2 text-xs transition-all",
                                    isSelected
                                      ? "border-purple-500 bg-purple-50/70 text-purple-950 shadow-xs"
                                      : "border-slate-200 bg-slate-50/50 text-secondary hover:bg-slate-100",
                                  )}
                                  onClick={() =>
                                    setSelectedDetailVideoIndex(index)
                                  }
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span
                                      className={cn(
                                        "flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-black px-1",
                                        isSelected
                                          ? "bg-purple-600 text-white"
                                          : "border border-slate-200 bg-white text-slate-600",
                                      )}
                                    >
                                      {index + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-extrabold">
                                        {isYouTube
                                          ? `YouTube Tour ${index + 1}`
                                          : `Project Video Tour ${index + 1}`}
                                      </p>
                                      <p className="truncate text-[10px] font-semibold text-muted-foreground">
                                        {isYouTube
                                          ? "YouTube Link"
                                          : "Uploaded MP4 Video"}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                      type="button"
                                      variant={isSelected ? "navy" : "outline"}
                                      size="sm"
                                      className="h-7 px-2 text-[11px] font-bold shadow-none"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedDetailVideoIndex(index);
                                      }}
                                    >
                                      {isSelected ? "Playing" : "Preview"}
                                    </Button>
                                    <Button
                                      asChild
                                      type="button"
                                      variant="ghost"
                                      className="size-7 p-0 text-slate-500 hover:text-slate-800"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <a
                                        href={videoUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        title="Open in new tab"
                                      >
                                        <ExternalLink className="size-3.5" />
                                      </a>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="size-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleRemoveProjectVideo(videoUrl);
                                      }}
                                      title="Remove video"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              <ProjectHeroGallery
                project={project}
                gallery={gallery}
                onUpload={handleUploadImages}
                onDelete={handleDeleteImage}
                onMove={handleMoveImage}
                onOpenLightbox={(idx) => setLightboxIndex(idx)}
              />
            </div>
          </Card>

          <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
            <SummaryTile
              label="Total Inventory"
              value={`${totalInventory}`}
              icon={Building2}
            />
            <SummaryTile
              label="Available Units"
              value={`${availableCount}`}
              icon={CalendarCheck}
            />
            <SummaryTile
              label="Reserved Units"
              value={`${reservedCount}`}
              icon={Info}
            />
            <SummaryTile
              label="Sold Units"
              value={`${soldCount}`}
              icon={Check}
            />
            <SummaryTile
              label="Active Leads"
              value={`${project.activeLeads}`}
              icon={UsersRound}
            />
            <SummaryTile
              label="Site Visits"
              value={`${project.linkedVisits.length}`}
              icon={Calendar}
            />
            <SummaryTile
              label="Conversion Rate"
              value={conversionRate}
              icon={TrendingUp}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-5">
              <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
                <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-base font-extrabold text-secondary">
                        Unit Inventory ({filteredUnits.length})
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        Manage and filter physical property assets linked to
                        this project hub.
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant={unitViewMode === "grid" ? "navy" : "outline"}
                        size="icon"
                        className="size-9 rounded-md p-1 shadow-none"
                        onClick={() => setUnitViewMode("grid")}
                      >
                        <LayoutGrid className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant={unitViewMode === "list" ? "navy" : "outline"}
                        size="icon"
                        className="size-9 rounded-md p-1 shadow-none"
                        onClick={() => setUnitViewMode("list")}
                      >
                        <List className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5 text-xs">
                    <div className="space-y-1">
                      <label className="font-extrabold text-secondary">
                        Search Unit
                      </label>
                      <Input
                        value={unitSearch}
                        placeholder="Search number or tower..."
                        className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold"
                        onChange={(e) => setUnitSearch(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-secondary">
                        Tower
                      </label>
                      <Select
                        value={towerFilter}
                        onValueChange={setTowerFilter}
                      >
                        <SelectTrigger className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueTowers.map((tower) => (
                            <SelectItem key={tower} value={tower}>
                              {tower}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-secondary">
                        Configuration
                      </label>
                      <Select
                        value={configFilter}
                        onValueChange={setConfigFilter}
                      >
                        <SelectTrigger className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueConfigs.map((config) => (
                            <SelectItem key={config} value={config}>
                              {config}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-secondary">
                        Availability
                      </label>
                      <Select
                        value={availabilityFilter}
                        onValueChange={setAvailabilityFilter}
                      >
                        <SelectTrigger className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "All",
                            ...availabilityMasters.options.map(
                              (option) => option.value,
                            ),
                          ].map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-extrabold text-secondary">
                        Booking Status
                      </label>
                      <Select
                        value={bookingStatusFilter}
                        onValueChange={setBookingStatusFilter}
                      >
                        <SelectTrigger className="h-9 text-xs rounded-md border-slate-200 shadow-none font-semibold col-span-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            "All",
                            ...bookingStatusMasters.options.map(
                              (option) => option.value,
                            ),
                          ].map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {inventoryMessage ? (
                  <div className="mb-4 rounded-md border border-success/20 bg-success/10 px-3 py-2 text-xs font-extrabold text-success">
                    {inventoryMessage}
                  </div>
                ) : null}

                {unitViewMode === "grid" ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredUnits.length === 0 ? (
                      <div className="col-span-full py-16 text-center text-sm font-semibold text-muted-foreground">
                        No units match the filter options.
                      </div>
                    ) : (
                      filteredUnits.map((unit) => (
                        <Card
                          key={unit.id}
                          className="group overflow-hidden rounded-md border border-slate-200 bg-white transition-all duration-300 hover:border-slate-300 hover:shadow-[0_12px_24px_rgba(15,37,68,0.06)]"
                        >
                          <div className="relative h-28 bg-slate-100">
                            <img
                              src={
                                unit.imageUrl ||
                                "https://images.unsplash.com/photo-1617103996702-96ff29b1c467?auto=format&fit=crop&q=80&w=700&h=460"
                              }
                              alt={formatUnitLabel(unit)}
                              className="h-full w-full object-cover"
                            />
                            <Badge
                              className={cn(
                                "absolute right-2 top-2 border-0 text-[10px] font-extrabold",
                                getUnitStatusClassName(unit.availability),
                              )}
                            >
                              {unit.availability}
                            </Badge>
                          </div>
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">
                                {unit.tower} · Floor {unit.floor}
                              </p>
                              <h3 className="text-sm font-extrabold text-secondary mt-0.5">
                                {formatUnitLabel(unit)}
                              </h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-muted-foreground">
                              <div className="bg-slate-50 p-2 rounded-md">
                                <span className="block font-bold text-secondary">
                                  {unit.configuration}
                                </span>
                                Config
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              <p className="text-xs font-extrabold text-secondary">
                                {unit.price}
                              </p>
                              <div className="flex gap-1.5">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-[11px] font-bold shadow-none"
                                >
                                  <Link
                                    to={`/projects/${project.id}/inventory/${unit.id}`}
                                  >
                                    View
                                  </Link>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-[11px] font-bold shadow-none"
                                  onClick={() => openEditUnitForm(unit)}
                                >
                                  Edit
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                ) : (
                  <Table className="min-w-[860px]">
                    <TableHeader>
                      <TableRow>
                        {[
                          "Unit",
                          "Configuration",
                          "Floor",
                          "Facing",
                          "Price",
                          "Status",
                          "Actions",
                        ].map((head) => (
                          <TableHead key={head}>{head}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUnits.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="py-10 text-center text-sm font-semibold text-muted-foreground"
                          >
                            No units found matching selection.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredUnits.map((unit) => (
                          <TableRow key={unit.id}>
                            <TableCell>
                              <p className="font-extrabold text-secondary">
                                {formatUnitLabel(unit)}
                              </p>
                              <p className="text-xs font-semibold text-muted-foreground">
                                {unit.bookingStatus}
                              </p>
                            </TableCell>
                            <TableCell>{unit.configuration}</TableCell>
                            <TableCell>{unit.floor}</TableCell>
                            <TableCell>{unit.facing}</TableCell>
                            <TableCell className="font-extrabold text-secondary">
                              {unit.price}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "border-0 text-[11px] font-extrabold",
                                  getUnitStatusClassName(unit.availability),
                                )}
                              >
                                {unit.availability}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  asChild
                                  variant="outline"
                                  size="icon"
                                  className="size-8 rounded-md shadow-none"
                                  aria-label={`View ${formatUnitLabel(unit)}`}
                                  title={`View ${formatUnitLabel(unit)}`}
                                >
                                  <Link
                                    to={`/projects/${project.id}/inventory/${unit.id}`}
                                  >
                                    <Eye className="size-3.5" />
                                  </Link>
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-8 rounded-md shadow-none"
                                  aria-label={`Edit ${formatUnitLabel(unit)}`}
                                  title={`Edit ${formatUnitLabel(unit)}`}
                                  onClick={() => openEditUnitForm(unit)}
                                >
                                  <Plus className="size-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>

              <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
                <h2 className="mb-4 text-base font-extrabold text-secondary">
                  Linked Leads
                </h2>
                {project.linkedLeads.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
                    <UsersRound className="mx-auto size-6 text-slate-400" />
                    <p className="mt-3 text-sm font-extrabold text-secondary">
                      Nothing linked yet
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">
                      Leads linked to this project will appear here once a
                      project preference, unit, or booking is assigned.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {["Lead", "Stage", "Budget", "Unit", "Owner"].map(
                          (head) => (
                            <TableHead key={head}>{head}</TableHead>
                          ),
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.linkedLeads.map((lead: any) => (
                        <TableRow
                          key={`${lead.id}-${lead.unitId ?? "project"}`}
                        >
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
                          <TableCell>
                            {formatUnitLabel(
                              getUnitById(project.id, lead.unitId),
                            ) || "Project preference"}
                          </TableCell>
                          <TableCell>{lead.owner}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>

            <aside className="space-y-5">
              <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
                <h2 className="text-base font-extrabold text-secondary">
                  Scheduled Site Visits
                </h2>
                <div className="mt-4 space-y-3">
                  {project.linkedVisits.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
                      <CalendarCheck className="mx-auto size-6 text-slate-400" />
                      <p className="mt-3 text-sm font-extrabold text-secondary">
                        No site visits scheduled
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-muted-foreground">
                        Scheduled visits for this project will appear here once
                        they are created from leads or site visit planning.
                      </p>
                    </div>
                  ) : (
                    project.linkedVisits.map((visit: any) => (
                      <div
                        key={visit.id}
                        className="rounded-md border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-extrabold text-secondary">
                            {visit.leadName}
                          </p>
                          <Badge className="border-0 bg-blue-50 text-blue-700">
                            {visit.status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs font-semibold text-muted-foreground">
                          {visit.date}, {visit.time}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          {formatUnitLabel(
                            getUnitById(project.id, visit.unitId),
                          ) || project.name}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </aside>
          </section>
        </main>
      </div>

      <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(1180px,calc(100vw-1.5rem))] max-w-none flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 shadow-xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-4 text-left sm:px-6 sm:py-5">
            <DialogTitle className="text-xl font-extrabold text-secondary">
              Edit Project Details
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-semibold text-muted-foreground">
              Update the project profile, operational status, and geofence
              settings from one workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="space-y-5 px-5 py-5 text-xs font-bold text-secondary sm:px-6 sm:py-6">
              <div className="grid gap-x-4 gap-y-4 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <label>Project Name</label>
                  <Input
                    value={projectFormState.name}
                    className="h-11 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                    onChange={(e) =>
                      setProjectFormState((current) => ({
                        ...current,
                        name: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Location</label>
                  <SearchableSelect
                    value={projectFormState.location}
                    options={locationMasters.options}
                    placeholder="Select project location"
                    ariaLabel="Project location"
                    searchPlaceholder="Search project locations..."
                    noOptionsText="No matching locations"
                    className="h-11 rounded-md text-sm font-semibold shadow-none"
                    contentClassName="max-h-[360px]"
                    portaled={false}
                    modal={false}
                    onValueChange={(nextValue) =>
                      setProjectFormState((current) => ({
                        ...current,
                        location: nextValue,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Developer</label>
                  <Input
                    value={projectFormState.developer}
                    placeholder="Enter developer name"
                    aria-label="Project developer"
                    className="h-11 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                    onChange={(event) =>
                      setProjectFormState((current) => ({
                        ...current,
                        developer: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Number of floors</label>
                  <Input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={projectFormState.numberOfFloors}
                    placeholder="27"
                    aria-label="Number of floors"
                    className="h-11 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                    onChange={(event) =>
                      setProjectFormState((current) => ({
                        ...current,
                        numberOfFloors: event.target.value.replace(/\D/g, ""),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label>Status</label>
                  <Select
                    value={projectFormState.status}
                    onValueChange={(val) =>
                      setProjectFormState((current) => ({
                        ...current,
                        status: val as any,
                      }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-md border-slate-200 text-sm font-semibold shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Active",
                        "Ready To Move",
                        "Under Construction",
                        "High Demand",
                        "Archived",
                      ].map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label>Possession</label>
                  <DatePicker
                    aria-label="Project possession"
                    value={projectFormState.possession}
                    className="h-11 rounded-md border-slate-200 text-sm font-semibold shadow-none"
                    onChange={(event) =>
                      setProjectFormState((current) => ({
                        ...current,
                        possession: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="lg:col-span-2">
                  <ProjectConfigurationVariants
                    value={projectFormState.configurationVariants}
                    configurationOptions={configurationMasters.options}
                    onChange={(configurationVariants) =>
                      setProjectFormState((current) => ({
                        ...current,
                        configurationVariants,
                      }))
                    }
                  />
                </div>
              </div>

              <section className="rounded-md border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-secondary">
                      <FileImage className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Project images
                      </h3>
                      <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-muted-foreground">
                        Add, reorder, or remove photos here. Changes are linked
                        to the project only after you click Save Changes.
                      </p>
                    </div>
                  </div>
                  <label
                    className={cn(
                      "inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-extrabold text-secondary transition-colors hover:bg-slate-100",
                      projectFormState.imageGallery.length >= 15 &&
                        "pointer-events-none opacity-50",
                    )}
                  >
                    <Plus className="size-4" />
                    Add images
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={projectFormState.imageGallery.length >= 15}
                      onChange={(event) => {
                        void handleUploadEditProjectImages(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {projectFormState.imageGallery.length ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                      <div className="relative aspect-[16/10] bg-slate-100">
                        <img
                          src={projectFormState.imageGallery[0]}
                          alt="Project cover preview"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1 text-[11px] font-extrabold text-secondary">
                          <Check className="size-3.5 text-success" />
                          Cover image
                        </span>
                      </div>
                    </div>

                    <div className="grid max-h-[280px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {projectFormState.imageGallery.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="group overflow-hidden rounded-md border border-slate-200 bg-white"
                        >
                          <div className="relative aspect-[4/3] bg-slate-100">
                            <img
                              src={image}
                              alt={`Project image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                              <div className="flex items-center gap-1 rounded-md bg-white/95 p-1">
                                <button
                                  type="button"
                                  className="flex size-7 items-center justify-center rounded-md text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  disabled={index === 0}
                                  aria-label="Move image left"
                                  onClick={() =>
                                    handleMoveEditProjectImage(index, -1)
                                  }
                                >
                                  <ChevronLeft className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  className="flex size-7 items-center justify-center rounded-md text-secondary hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                  disabled={
                                    index ===
                                    projectFormState.imageGallery.length - 1
                                  }
                                  aria-label="Move image right"
                                  onClick={() =>
                                    handleMoveEditProjectImage(index, 1)
                                  }
                                >
                                  <ChevronRight className="size-4" />
                                </button>
                              </div>
                              <button
                                type="button"
                                className="flex size-8 items-center justify-center rounded-md bg-white/95 text-red-600 hover:bg-red-50"
                                aria-label="Remove project image"
                                onClick={() =>
                                  handleDeleteEditProjectImage(index)
                                }
                              >
                                <X className="size-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-3 py-2">
                            <span className="truncate text-[11px] font-extrabold text-secondary">
                              {index === 0
                                ? "Cover image"
                                : `Gallery image ${index + 1}`}
                            </span>
                            <span className="text-[10px] font-extrabold text-muted-foreground">
                              {index + 1}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-36 flex-col items-center justify-center rounded-md border border-dashed border-slate-200 bg-white text-center">
                    <FileImage className="size-6 text-muted-foreground" />
                    <p className="mt-2 text-sm font-extrabold text-secondary">
                      No project images selected
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Add images to set the cover and gallery before saving.
                    </p>
                  </div>
                )}

                <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
                  {projectFormState.imageGallery.length}/15 images selected.
                </p>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-secondary">
                      <FileText className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Project brochure PDF
                      </h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                        Upload one or more PDF brochures. Changes are saved to
                        the project only after you click Save Changes.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-extrabold text-secondary transition-colors hover:bg-slate-100">
                    <Plus className="size-4" />
                    Upload PDF
                    <input
                      type="file"
                      multiple
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(event) => {
                        void handleUploadEditProjectBrochures(
                          event.target.files,
                        );
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {projectFormState.brochures.length ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {projectFormState.brochures.map((brochure, index) => (
                      <div
                        key={`${brochure.url}-${index}`}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold text-secondary">
                            {brochure.fileName ||
                              `Project brochure ${index + 1}.pdf`}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-muted-foreground">
                            {index === 0 ? "Primary PDF" : "Additional PDF"} -{" "}
                            {formatFileSize(brochure.sizeBytes)}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-md shadow-none"
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
                            className="h-9 rounded-md text-red-600 shadow-none"
                            onClick={() =>
                              handleRemoveEditProjectBrochure(brochure.url)
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm font-extrabold text-secondary">
                      No brochure uploaded
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Upload a PDF to make it available from this project.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-purple-50 text-purple-700">
                      <Video className="size-5" />
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Project videos
                      </h3>
                      <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                        Add video links (YouTube/Drive/MP4) or upload video
                        files directly.
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-extrabold text-secondary transition-colors hover:bg-slate-100">
                    <Upload className="size-4" />
                    Upload Video
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setVideoUploadTarget("edit");
                          setPendingVideoFile(file);
                          setIsVideoPreviewOpen(true);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="mt-3 flex gap-2">
                  <Input
                    type="url"
                    placeholder="Paste video link (YouTube/Drive/MP4)..."
                    value={newEditVideoUrl}
                    onChange={(e) => setNewEditVideoUrl(e.target.value)}
                    className="h-10 text-xs shadow-none border-slate-200 font-semibold"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 shrink-0 text-xs font-extrabold shadow-none"
                    onClick={() => {
                      if (newEditVideoUrl.trim()) {
                        setProjectFormState((current) => ({
                          ...current,
                          videoUrls: Array.from(
                            new Set([
                              ...current.videoUrls,
                              newEditVideoUrl.trim(),
                            ]),
                          ),
                          videoUrl: current.videoUrl || newEditVideoUrl.trim(),
                        }));
                        setNewEditVideoUrl("");
                      }
                    }}
                  >
                    Add Link
                  </Button>
                </div>

                {projectFormState.videoUrls.length ? (
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {projectFormState.videoUrls.map(
                      (url: string, index: number) => (
                        <div
                          key={`${url}-${index}`}
                          className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-extrabold text-secondary">
                              {url}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">
                              Video {index + 1}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-md shadow-none text-xs"
                              asChild
                            >
                              <a href={url} target="_blank" rel="noreferrer">
                                Watch
                              </a>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 rounded-md text-red-600 shadow-none text-xs"
                              onClick={() =>
                                setProjectFormState((current) => {
                                  const next = current.videoUrls.filter(
                                    (item: string) => item !== url,
                                  );
                                  return {
                                    ...current,
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
                      ),
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                    <p className="text-sm font-extrabold text-secondary">
                      No video linked
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Paste a video link or upload a video file to showcase this
                      project.
                    </p>
                  </div>
                )}
              </section>

              <ProjectGeofencePicker
                latitude={projectFormState.latitude}
                longitude={projectFormState.longitude}
                geofenceRadiusM={projectFormState.geofenceRadiusM}
                onChange={(field, value) =>
                  setProjectFormState((current) => ({
                    ...current,
                    [field]: value,
                  }))
                }
              />

              <div className="space-y-1.5">
                <label>Description</label>
                <Textarea
                  value={projectFormState.description}
                  className="min-h-[120px] rounded-md border-slate-200 p-3 text-sm font-semibold shadow-none"
                  onChange={(e: any) =>
                    setProjectFormState((current) => ({
                      ...current,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <Button
              type="button"
              variant="outline"
              className="w-full shadow-none sm:w-auto sm:min-w-[124px]"
              onClick={() => setIsEditProjectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto sm:min-w-[148px]"
              disabled={projectMutations.updateProject.isPending}
              onClick={handleEditProjectSave}
            >
              {projectMutations.updateProject.isPending
                ? "Saving changes..."
                : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute right-4 top-4 text-white/80 hover:text-white bg-black/50 p-1.5 rounded-full"
            >
              <X className="size-6" />
            </button>
            {lightboxIndex !== null && gallery.length > 1 ? (
              <>
                <button
                  onClick={() =>
                    setLightboxIndex(
                      (curr) => (curr! - 1 + gallery.length) % gallery.length,
                    )
                  }
                  className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
                >
                  <ChevronLeft className="size-6" />
                </button>
                <button
                  onClick={() =>
                    setLightboxIndex((curr) => (curr! + 1) % gallery.length)
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/80"
                >
                  <ChevronRight className="size-6" />
                </button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={unitFormOpen} onOpenChange={setUnitFormOpen}>
        <DialogContent className="max-h-[88vh] max-w-[1240px] overflow-hidden rounded-md border border-slate-200 bg-[#fbfcff] p-0 shadow-[0_24px_80px_rgba(15,37,68,0.22)]">
          <div className="grid max-h-[88vh] lg:grid-cols-[330px_minmax(0,1fr)]">
            <ScrollArea className="border-r border-slate-200/80 bg-gradient-to-b from-white via-slate-50/80 to-white">
              <aside className="p-6">
                <div className="flex items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <FileImage className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-extrabold text-secondary">
                      Unit Images
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">
                      Upload photos of the unit. You can add up to 5 images.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {unitForm.imageGallery.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {unitForm.imageGallery.map((img, index) => (
                        <div
                          key={img.id}
                          className={cn(
                            "group relative h-20 rounded-md border border-slate-200 overflow-hidden bg-slate-100",
                            index === 0 && "col-span-2 h-32",
                          )}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="h-full w-full object-cover"
                          />
                          {index === 0 && (
                            <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                              Cover Photo
                            </span>
                          )}
                          <button
                            type="button"
                            className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded bg-black/60 text-white hover:bg-black/80"
                            onClick={() => handleDeleteUnitImage(index)}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 text-xs font-semibold text-muted-foreground">
                      No images uploaded yet.
                    </div>
                  )}

                  {unitForm.imageGallery.length < 5 ? (
                    <label className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-secondary hover:bg-slate-50 transition-colors shadow-sm">
                      <Plus className="size-4" />
                      Upload Photo
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => handleUploadUnitImages(e.target.files)}
                      />
                    </label>
                  ) : null}
                </div>
              </aside>
            </ScrollArea>

            <div className="flex min-h-0 flex-col bg-white">
              <ScrollArea className="min-h-0 flex-1">
                <section className="p-6 lg:p-8">
                  <DialogHeader className="space-y-0 text-left">
                    <div className="flex items-start gap-4">
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                        <Building2 className="size-6" />
                      </span>
                      <div>
                        <DialogTitle className="text-2xl text-secondary">
                          {editingUnitId
                            ? "Edit Unit Inventory"
                            : "Add Unit Inventory"}
                        </DialogTitle>
                        <DialogDescription className="mt-2 text-sm font-semibold text-muted-foreground">
                          {editingUnitId
                            ? `Modify the record for Unit ${unitForm.unitNumber}`
                            : `Create a frontend-only unit record for ${projectName}.`}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="mt-8 grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-secondary">
                        Tower
                      </label>
                      <Select
                        value={unitForm.tower}
                        onValueChange={(value) =>
                          updateUnitForm("tower", value)
                        }
                      >
                        <SelectTrigger
                          className={cn(
                            "h-12 rounded-md border-slate-200 text-base font-semibold shadow-none",
                            unitFormErrors.tower && "border-destructive",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <Building2 className="size-5 text-slate-500" />
                            <SelectValue placeholder="Select tower" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {towerMasters.options
                            .map((option) => option.value)
                            .map((tower) => (
                              <SelectItem key={tower} value={tower}>
                                {tower}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {unitFormErrors.tower ? (
                        <p className="text-xs font-bold text-destructive">
                          {unitFormErrors.tower}
                        </p>
                      ) : null}
                    </div>

                    {unitFieldConfigs.map(
                      ({
                        label,
                        ariaLabel,
                        field,
                        placeholder,
                        icon: Icon,
                        type,
                      }) => {
                        const hasValue = Boolean(unitForm[field]);
                        const hasError = Boolean(unitFormErrors[field]);

                        return (
                          <div key={field} className="space-y-2">
                            <label
                              className="text-sm font-extrabold text-secondary"
                              htmlFor={`unit-${field}`}
                            >
                              {label}
                            </label>
                            <div className="relative">
                              <Icon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                              <Input
                                id={`unit-${field}`}
                                type={type}
                                {...(type === "number"
                                  ? { min: 0, step: 0.01 }
                                  : {})}
                                aria-label={ariaLabel}
                                value={unitForm[field]}
                                placeholder={placeholder}
                                className={cn(
                                  "h-12 rounded-md border-slate-200 pl-12 pr-10 text-base font-semibold shadow-none",
                                  hasError && "border-destructive",
                                )}
                                onChange={(event) =>
                                  updateUnitForm(field, event.target.value)
                                }
                              />
                              {hasValue && !hasError ? (
                                <Check className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-success" />
                              ) : null}
                            </div>
                            {hasError ? (
                              <p className="text-xs font-bold text-destructive">
                                {unitFormErrors[field]}
                              </p>
                            ) : null}
                          </div>
                        );
                      },
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-secondary">
                        Facing
                      </label>
                      <Select
                        value={unitForm.facing}
                        onValueChange={(value) =>
                          updateUnitForm("facing", value)
                        }
                      >
                        <SelectTrigger
                          aria-label="Facing"
                          className="h-12 rounded-md border-slate-200 text-base font-semibold shadow-none"
                        >
                          <span className="flex items-center gap-3">
                            <BedDouble className="size-5 text-slate-500" />
                            <SelectValue placeholder="Select facing" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {facingMasters.options
                            .map((option) => option.value)
                            .map((facing) => (
                              <SelectItem key={facing} value={facing}>
                                {facing}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label
                        className="text-sm font-extrabold text-secondary"
                        htmlFor="unit-priceAmount"
                      >
                        Price
                      </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_116px] gap-2">
                        <div className="relative">
                          <IndianRupee className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-500" />
                          <Input
                            id="unit-priceAmount"
                            type="number"
                            aria-label="Price"
                            value={unitForm.priceAmount}
                            placeholder="1.35"
                            className={cn(
                              "h-12 rounded-md border-slate-200 pl-12 pr-10 text-base font-semibold shadow-none",
                              unitFormErrors.priceAmount &&
                                "border-destructive",
                            )}
                            onChange={(event) =>
                              updateUnitForm("priceAmount", event.target.value)
                            }
                          />
                          {unitForm.priceAmount &&
                          !unitFormErrors.priceAmount ? (
                            <Check className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-success" />
                          ) : null}
                        </div>
                        <Select
                          value={unitForm.priceUnit}
                          onValueChange={(value) =>
                            updateUnitForm(
                              "priceUnit",
                              value as UnitFormState["priceUnit"],
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label="Price Unit"
                            className="h-12 rounded-md border-slate-200 text-base font-semibold shadow-none"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unitPriceUnitOptions.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {unitFormErrors.priceAmount ? (
                        <p className="text-xs font-bold text-destructive">
                          {unitFormErrors.priceAmount}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-extrabold text-secondary">
                        Booking Status
                      </label>
                      <Select
                        value={unitForm.bookingStatus}
                        onValueChange={(value) =>
                          updateUnitForm("bookingStatus", value)
                        }
                      >
                        <SelectTrigger
                          aria-label="Booking Status"
                          className="h-12 rounded-md border-slate-200 text-base font-semibold shadow-none"
                        >
                          <span className="flex items-center gap-3">
                            <Circle className="size-3 fill-current text-success" />
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {bookingStatusMasters.options
                            .map((option) => option.value)
                            .map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-secondary">
                        Configuration
                      </label>
                      <Select
                        value={unitForm.configuration}
                        onValueChange={(value) =>
                          updateUnitForm("configuration", value)
                        }
                      >
                        <SelectTrigger
                          aria-label="Configuration"
                          className={cn(
                            "h-12 rounded-md border-slate-200 text-base font-semibold shadow-none",
                            unitFormErrors.configuration &&
                              "border-destructive",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            <Grid2X2 className="size-5 text-slate-500" />
                            <SelectValue placeholder="Select configuration" />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(
                            new Set([
                              ...(project.configurations.length > 0
                                ? project.configurations
                                : DEFAULT_CONFIGURATIONS),
                              ...configurationMasters.options.map(
                                (option) => option.value,
                              ),
                            ]),
                          ).map((configuration) => (
                            <SelectItem
                              key={configuration}
                              value={configuration}
                            >
                              {configuration}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {unitFormErrors.configuration ? (
                        <p className="text-xs font-bold text-destructive">
                          {unitFormErrors.configuration}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-extrabold text-secondary">
                        Availability
                      </label>
                      <Select
                        value={unitForm.availability}
                        onValueChange={(value) =>
                          updateUnitForm(
                            "availability",
                            value as UnitAvailabilityStatus,
                          )
                        }
                      >
                        <SelectTrigger
                          aria-label="Availability"
                          className="h-12 rounded-md border-slate-200 text-base font-semibold shadow-none"
                        >
                          <span className="flex items-center gap-3">
                            <CalendarCheck className="size-5 text-slate-500" />
                            <SelectValue />
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {availabilityMasters.options
                            .map(
                              (option) =>
                                option.value as UnitAvailabilityStatus,
                            )
                            .map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>
              </ScrollArea>

              <div className="flex justify-end gap-3 border-t border-slate-200 bg-white px-6 py-5 lg:px-8">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-md px-7 text-sm font-extrabold shadow-none"
                  onClick={() => setUnitFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-md bg-primary px-7 text-sm font-extrabold text-white hover:bg-primary-hover"
                  onClick={createOrUpdateUnit}
                >
                  {editingUnitId ? "Save Changes" : "Create Unit"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(viewingUnit)}
        onOpenChange={(open) => !open && setViewingUnit(null)}
      >
        <DialogContent className="max-w-2xl rounded-xl bg-white">
          <DialogHeader>
            <DialogTitle>
              {viewingUnit ? formatUnitLabel(viewingUnit) : "Unit Details"}
            </DialogTitle>
            <DialogDescription>
              {projectName} inventory details.
            </DialogDescription>
          </DialogHeader>
          {viewingUnit ? (
            <div className="space-y-4">
              {viewingUnit.imageUrl ? (
                <div className="h-48 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                  <img
                    src={viewingUnit.imageUrl}
                    alt={formatUnitLabel(viewingUnit)}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Configuration", viewingUnit.configuration],
                  ["Floor", viewingUnit.floor],
                  ["Facing", viewingUnit.facing],
                  ["Price", viewingUnit.price],
                  ["Availability", viewingUnit.availability],
                  ["Booking Status", viewingUnit.bookingStatus],
                  ["Visit Count", `${viewingUnit.visitCount}`],
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
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="shadow-none">
                Close
              </Button>
            </DialogClose>
            {viewingUnit ? (
              <Button asChild>
                <Link
                  to={`/projects/${project.id}/inventory/${viewingUnit.id}`}
                >
                  Open Full Page
                </Link>
              </Button>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <ProjectWhatsAppShareDialog
        open={shareProjectOpen}
        onOpenChange={setShareProjectOpen}
        project={project}
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
