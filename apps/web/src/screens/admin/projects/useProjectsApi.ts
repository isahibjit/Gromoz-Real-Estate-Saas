import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../../common/api";
import type {
  ProjectCatalogItem,
  ProjectBrochure,
  ProjectConfigurationVariant,
  ProjectUnit,
  UnitAvailabilityStatus,
} from "./projectsData";

interface ApiUnit {
  id: string;
  projectId: string;
  tower?: string | null;
  unitNumber: string;
  configuration?: string | null;
  carpetAreaSqft?: string | number | null;
  floor?: string | null;
  facing?: string | null;
  price?: string | number | null;
  availability: UnitAvailabilityStatus;
  bookingStatus: string;
  salesOwnerId?: string | null;
  imageUrl?: string | null;
  imageGallery?: string[];
  visitCount?: number;
}

interface ApiProject {
  id: string;
  name: string;
  location: string;
  developer?: string | null;
  propertyType?: string | null;
  status: ProjectCatalogItem["status"];
  possession?: string | null;
  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  priceRange?: string;
  configurations?: string[];
  configurationCarpetAreas?: Record<string, string | number> | null;
  configurationVariants?: Array<{
    id?: string | null;
    configuration?: string | null;
    carpetArea?: string | number | null;
    priceAmount?: string | number | null;
    priceUnit?: "Lakh" | "Cr" | null;
  }> | null;
  numberOfFloors?: number | null;
  amenities?: string[];
  highlights?: string[];
  description?: string | null;
  reraNumber?: string | null;
  imageUrl?: string | null;
  imageGallery?: string[];
  videoUrl?: string | null;
  videoUrls?: string[] | null;
  videos?: string[] | null;
  brochureUrl?: string | null;
  brochureStorageKey?: string | null;
  brochureFileName?: string | null;
  brochureMimeType?: string | null;
  brochureSizeBytes?: number | null;
  brochures?: ProjectBrochure[] | null;
  salesOwnerId?: string | null;
  activeLeads?: number;
  upcomingVisits?: number;
  demandScore?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  geofenceRadiusM?: number | null;
  units?: ApiUnit[];
}

const formatMoney = (value?: string | number | null) => {
  const numeric = Number(value ?? 0);
  if (!numeric) return "INR 0";
  if (numeric >= 10000000) return `INR ${(numeric / 10000000).toFixed(2)} Cr`;
  if (numeric >= 100000) return `INR ${(numeric / 100000).toFixed(2)} Lakh`;
  return `INR ${numeric.toLocaleString("en-IN")}`;
};

const formatArea = (value?: string | number | null) => {
  const numeric = Number(value ?? 0);
  return numeric ? `${numeric.toLocaleString("en-IN")} sq.ft.` : "-";
};

export const mapApiUnit = (unit: ApiUnit): ProjectUnit => ({
  id: unit.id,
  projectId: unit.projectId,
  imageUrl: unit.imageUrl ?? undefined,
  imageGallery: unit.imageGallery ?? [],
  tower: unit.tower ?? "Tower A",
  unitNumber: unit.unitNumber,
  configuration: unit.configuration ?? "-",
  carpetArea: formatArea(unit.carpetAreaSqft),
  floor: unit.floor ?? "-",
  facing: unit.facing ?? "-",
  price: formatMoney(unit.price),
  availability: unit.availability,
  bookingStatus: unit.bookingStatus,
  visitCount: unit.visitCount ?? 0,
  salesOwner: unit.salesOwnerId ?? undefined,
});

export const mapApiProject = (project: ApiProject): ProjectCatalogItem => ({
  id: project.id,
  name: project.name,
  location: project.location,
  developer: project.developer ?? "",
  propertyType: project.propertyType ?? "Residential",
  status: project.status,
  possession: project.possession ?? "",
  priceRange:
    project.priceRange ??
    `${formatMoney(project.minPrice)} - ${formatMoney(project.maxPrice)}`,
  configurations: project.configurations ?? [],
  configurationCarpetAreas: Object.fromEntries(
    Object.entries(project.configurationCarpetAreas ?? {}).map(
      ([configuration, area]) => [configuration, String(area)],
    ),
  ),
  configurationVariants: (project.configurationVariants?.flatMap(
    (variant, index): ProjectConfigurationVariant[] => {
      const configuration = variant.configuration?.trim();
      if (!configuration) return [];
      return [{
        id: variant.id ?? `variant-${index + 1}`,
        configuration,
        carpetArea: String(variant.carpetArea ?? ""),
        priceAmount: String(variant.priceAmount ?? ""),
        priceUnit: variant.priceUnit === "Lakh" ? "Lakh" : "Cr",
      }];
    },
  ) ?? Object.entries(project.configurationCarpetAreas ?? {}).map(
    ([configuration, carpetArea], index): ProjectConfigurationVariant => ({
      id: `legacy-${index + 1}`,
      configuration,
      carpetArea: String(carpetArea),
      priceAmount: "",
      priceUnit: "Cr",
    }),
  )),
  numberOfFloors: project.numberOfFloors ?? null,
  amenities: project.amenities ?? [],
  highlights: project.highlights ?? [],
  description: project.description ?? "",
  reraNumber: project.reraNumber ?? "",
  imageUrl:
    project.imageUrl ??
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=900&h=520",
  imageGallery: project.imageGallery ?? [],
  videoUrl: project.videoUrl ?? project.videoUrls?.[0] ?? project.videos?.[0] ?? undefined,
  videoUrls: project.videoUrls ?? project.videos ?? (project.videoUrl ? [project.videoUrl] : []),
  videos: project.videos ?? project.videoUrls ?? (project.videoUrl ? [project.videoUrl] : []),
  brochureUrl: project.brochureUrl ?? undefined,
  brochureStorageKey: project.brochureStorageKey ?? undefined,
  brochureFileName: project.brochureFileName ?? undefined,
  brochureMimeType: project.brochureMimeType ?? undefined,
  brochureSizeBytes: project.brochureSizeBytes ?? undefined,
  brochures:
    project.brochures?.length
      ? project.brochures
      : project.brochureUrl
      ? [
          {
            url: project.brochureUrl,
            storageKey: project.brochureStorageKey ?? undefined,
            fileName: project.brochureFileName ?? undefined,
            mimeType: project.brochureMimeType ?? undefined,
            sizeBytes: project.brochureSizeBytes ?? undefined,
          },
        ]
      : [],
  imageTone: "from-slate-100 via-white to-blue-100",
  salesOwner: project.salesOwnerId ?? "",
  activeLeads: project.activeLeads ?? 0,
  upcomingVisits: project.upcomingVisits ?? 0,
  demandScore: project.demandScore ?? 0,
  latitude:
    project.latitude === null || project.latitude === undefined
      ? null
      : Number(project.latitude),
  longitude:
    project.longitude === null || project.longitude === undefined
      ? null
      : Number(project.longitude),
  geofenceRadiusM: project.geofenceRadiusM ?? 150,
  units: (project.units ?? []).map(mapApiUnit),
  linkedLeads: [],
  linkedVisits: [],
});

export function useProjects(search = "") {
  return useQuery({
    queryKey: ["projects", search],
    queryFn: async () => {
      const { data } = await api.get("/projects", {
        params: { limit: 100, search: search || undefined },
      });
      const projects = (data.data ?? []).map(mapApiProject) as ProjectCatalogItem[];
      projects.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      );
      return {
        projects,
        total: (data.meta?.total as number) ?? projects.length,
      };
    },
  });
}

export function useProject(projectId?: string) {
  return useQuery({
    queryKey: ["projects", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}`);
      return mapApiProject(data);
    },
  });
}

export function useProjectUnit(projectId?: string, unitId?: string) {
  return useQuery({
    queryKey: ["projects", projectId, "units", unitId],
    enabled: Boolean(projectId && unitId),
    queryFn: async () => {
      const { data } = await api.get(`/projects/${projectId}/units/${unitId}`);
      return {
        raw: data,
        unit: mapApiUnit(data),
      };
    },
  });
}

export function useProjectMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["projects"] });
    void queryClient.invalidateQueries({ queryKey: ["site-visits"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return {
    createProject: useMutation({
      mutationFn: async (payload: Record<string, unknown>) =>
        (await api.post("/projects", payload)).data,
      onSuccess: invalidate,
    }),
    updateProject: useMutation({
      mutationFn: async ({
        id,
        payload,
      }: {
        id: string;
        payload: Record<string, unknown>;
      }) => (await api.patch(`/projects/${id}`, payload)).data,
      onSuccess: invalidate,
    }),
    createUnit: useMutation({
      mutationFn: async ({
        projectId,
        payload,
      }: {
        projectId: string;
        payload: Record<string, unknown>;
      }) => (await api.post(`/projects/${projectId}/units`, payload)).data,
      onSuccess: invalidate,
    }),
    updateUnit: useMutation({
      mutationFn: async ({
        projectId,
        unitId,
        payload,
      }: {
        projectId: string;
        unitId: string;
        payload: Record<string, unknown>;
      }) =>
        (await api.patch(`/projects/${projectId}/units/${unitId}`, payload))
          .data,
      onSuccess: invalidate,
    }),
    linkLead: useMutation({
      mutationFn: async ({
        projectId,
        unitId,
        payload,
      }: {
        projectId: string;
        unitId: string;
        payload: Record<string, unknown>;
      }) =>
        (
          await api.post(
            `/projects/${projectId}/units/${unitId}/link-lead`,
            payload,
          )
        ).data,
      onSuccess: invalidate,
    }),
    uploadImage: useMutation({
      mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return (
          await api.post("/uploads/images", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        ).data as { url: string; key: string };
      },
    }),
    uploadProjectVideo: useMutation({
      mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return (
          await api.post("/uploads/project-videos", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        ).data as {
          url: string;
          key: string;
          mimeType: string;
          sizeBytes: number;
        };
      },
    }),
    uploadProjectBrochure: useMutation({
      mutationFn: async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        return (
          await api.post("/uploads/project-brochures", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        ).data as {
          url: string;
          key: string;
          mimeType: string;
          sizeBytes: number;
        };
      },
    }),
  };
}
