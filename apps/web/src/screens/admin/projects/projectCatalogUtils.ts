export interface ProjectUnitLike {
  id: string;
  tower?: string | null;
  unitNumber: string;
  configuration?: string | null;
  price?: string | number | null;
  availability?: string;
  bookingStatus?: string;
  imageUrl?: string | null;
  imageGallery?: string[];
}

export interface ProjectCatalogLike<TUnit extends ProjectUnitLike = ProjectUnitLike> {
  id: string;
  name: string;
  location: string;
  priceRange?: string;
  salesOwner?: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  geofenceRadiusM?: number | null;
  imageUrl?: string | null;
  imageGallery?: string[];
  units?: TUnit[];
}

export function findProjectById<TProject extends ProjectCatalogLike<any>>(
  projects: TProject[],
  projectId?: string,
) {
  return projects.find((project) => project.id === projectId);
}

export function findProjectByName<TProject extends ProjectCatalogLike<any>>(
  projects: TProject[],
  projectName?: string,
) {
  const normalized = projectName?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }
  return projects.find(
    (project) => project.name.trim().toLowerCase() === normalized,
  );
}

export function getUnitsByProjectId<
  TUnit extends ProjectUnitLike,
  TProject extends ProjectCatalogLike<TUnit>,
>(projects: TProject[], projectId?: string) {
  return findProjectById(projects, projectId)?.units ?? [];
}

export function getUnitById<
  TUnit extends ProjectUnitLike,
  TProject extends ProjectCatalogLike<TUnit>,
>(projects: TProject[], projectId?: string, unitId?: string) {
  return getUnitsByProjectId(projects, projectId).find(
    (unit) => unit.id === unitId,
  );
}

export function formatProjectUnitLabel(
  unit?: Pick<ProjectUnitLike, "tower" | "unitNumber"> | null,
) {
  return unit ? `${unit.tower ?? "Tower"}, Unit ${unit.unitNumber}` : "";
}

export function resolveProjectUnitFromProjects<
  TUnit extends ProjectUnitLike,
  TProject extends ProjectCatalogLike<TUnit>,
>(
  projects: TProject[],
  {
    projectId,
    unitId,
    projectName,
    unitLabel,
  }: {
    projectId?: string;
    unitId?: string;
    projectName?: string;
    unitLabel?: string;
  },
) {
  const project =
    findProjectById(projects, projectId) ?? findProjectByName(projects, projectName);
  const normalizedUnitLabel = unitLabel?.trim().toLowerCase();
  const unit =
    getUnitById(projects, project?.id ?? projectId, unitId) ??
    (project?.units ?? []).find((candidate) => {
      if (!normalizedUnitLabel) {
        return false;
      }
      const formatted = formatProjectUnitLabel(candidate).toLowerCase();
      return (
        formatted === normalizedUnitLabel ||
        `${candidate.tower ?? "Tower"} ${candidate.unitNumber}`.toLowerCase() ===
          normalizedUnitLabel ||
        candidate.configuration?.trim().toLowerCase() === normalizedUnitLabel
      );
    });

  return {
    project,
    unit,
    projectId: project?.id ?? projectId ?? "",
    unitId: unit?.id ?? unitId ?? "",
    projectName: project?.name ?? projectName ?? "",
    unitLabel: formatProjectUnitLabel(unit) || unitLabel || "",
    location: project?.location ?? "",
  };
}
