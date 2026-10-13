import { useMemo } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { api } from "../../../../common/api";
import { useAppSelector } from "../../../../store";
import {
  configurationOptions,
  leadSourceOptions,
  priorityOptions,
  propertyTypeOptions,
  stageOptions,
  statusOptions,
} from "../add/addLeadData";
import type { LeadRow } from "./allLeadsTypes";

// Lead tables paginate client-side, so their query must include every row the UI can page through.
export const LEAD_TABLE_MAX_ROWS = 5000;

export interface ApiLead {
  id: string;
  displayId: string;
  name: string;
  email?: string | null;
  mobileCountryCode?: string;
  mobile: string;
  sourceId?: string | null;
  sourceName?: string | null;
  integrationConnectionId?: string | null;
  integrationAccountName?: string | null;
  integrationProvider?: string | null;
  stageId?: string | null;
  stageName?: string | null;
  statusId?: string | null;
  statusName?: string | null;
  priorityId?: string | null;
  priorityName?: string | null;
  temperatureId?: string | null;
  temperatureName?: string | null;
  leadType?: "Hot" | "Warm" | "Cold" | string | null;
  projectName?: string | null;
  projectArea?: string | null;
  remarks?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  telecallerId?: string | null;
  telecallerName?: string | null;
  fieldExecutiveId?: string | null;
  fieldExecutiveName?: string | null;
  nextFollowUpAt?: string | null;
  lastContactedAt?: string | null;
  lostAt?: string | null;
  lostReasonId?: string | null;
  lostReasonName?: string | null;
  lostCompetitor?: string | null;
  interestLevel?: string | null;
  leadScore?: number | null;
  leadScoreLabel?: string | null;
  leadScoreBreakdown?: Array<{
    category: string;
    label: string;
    score: number;
  }>;
  updatedAt?: string;
  createdAt?: string;
  requirement?: {
    propertyType?: string | null;
    configuration?: string | null;
    minBudget?: string | number | null;
    maxBudget?: string | number | null;
    budgetUnit?: string | null;
    budgetRange?: string | null;
    preferredLocation?: string | null;
    preferredProjectId?: string | null;
  } | null;
}

interface LeadsResponse {
  data: ApiLead[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface TeamLeadWorkspaceMember {
  id: string;
  name: string;
  role: string;
  image?: string | null;
  assignedLeads: number;
  hotLeads: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  siteVisits: number;
  completedSiteVisits: number;
  bookedLeads: number;
}

export interface TeamLeadWorkspaceResponse {
  meta: {
    scope: "mine" | "team";
    canViewTeam: boolean;
    canEdit: boolean;
    teamId: string | null;
    teamName: string | null;
    page: number;
    limit: number;
    total: number;
  };
  summary: {
    totalTeamLeads: number;
    newLeads: number;
    hotLeads: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
    scheduledSiteVisits: number;
    completedSiteVisits: number;
    bookedLeads: number;
  };
  members: TeamLeadWorkspaceMember[];
  rows: LeadRow[];
}

interface ApiMasterValue {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
  triggerAction?: string | null;
  allowFollowUp?: boolean | null;
}

interface ApiUserOption {
  id: string;
  name: string;
  role?: string;
  image?: string;
}

interface ApiTeamOption {
  id: string;
  name: string;
  isActive?: boolean;
}

const hasUsableMasterValue = (
  item: ApiMasterValue | null | undefined,
): item is ApiMasterValue =>
  Boolean(
    item &&
      typeof item.id === "string" &&
      item.id.trim() &&
      typeof item.name === "string" &&
      item.name.trim(),
  );

const hasUsableUserOption = (
  user: ApiUserOption | null | undefined,
): user is ApiUserOption =>
  Boolean(
    user &&
      typeof user.id === "string" &&
      user.id.trim() &&
      typeof user.name === "string" &&
      user.name.trim(),
  );

const hasUsableTeamOption = (
  team: ApiTeamOption | null | undefined,
): team is ApiTeamOption =>
  Boolean(
    team &&
      typeof team.id === "string" &&
      team.id.trim() &&
      typeof team.name === "string" &&
      team.name.trim(),
  );

const hasUsableApiLead = (lead: ApiLead | null | undefined): lead is ApiLead =>
  Boolean(
    lead &&
      typeof lead.id === "string" &&
      lead.id.trim() &&
      typeof lead.name === "string" &&
      lead.name.trim(),
  );

const hasUsableWorkspaceMember = (
  member: TeamLeadWorkspaceMember | null | undefined,
): member is TeamLeadWorkspaceMember =>
  Boolean(
    member &&
      typeof member.id === "string" &&
      member.id.trim() &&
      typeof member.name === "string" &&
      member.name.trim(),
  );

interface PipelineFiltersResponse {
  filters?: {
    users?: ApiUserOption[];
  };
}

export interface LeadFilterOption {
  label: string;
  value: string;
  role?: string;
  image?: string;
  triggerAction?: string;
  allowFollowUp?: boolean;
}

export interface LeadListFilters {
  sourceId: string[];
  integrationConnectionId: string[];
  statusId: string[];
  stageId: string[];
  temperatureId: string[];
  propertyType: string[];
  configuration: string[];
  ownerId: string[];
  telecallerId: string[];
  teamId: string[];
  area: string[];
  projectId?: string[];
  from: string;
  to: string;
}

export interface LeadListFilterOptions {
  sourceOptions: LeadFilterOption[];
  integrationAccountOptions: LeadFilterOption[];
  statusOptions: LeadFilterOption[];
  stageOptions: LeadFilterOption[];
  priorityOptions: LeadFilterOption[];
  leadTypeOptions: LeadFilterOption[];
  budgetOptions: LeadFilterOption[];
  propertyTypeOptions: LeadFilterOption[];
  configurationOptions: LeadFilterOption[];
  areaOptions: LeadFilterOption[];
  projectOptions: LeadFilterOption[];
  ownerOptions: LeadFilterOption[];
  telecallerOptions: LeadFilterOption[];
  teamOptions: LeadFilterOption[];
}

export interface LeadListSystemColumn {
  id: string;
  label: string;
  canHide: boolean;
}

export interface LeadListColumnPreference {
  id: string;
  role?: string;
  visibleColumns: string[];
  lockedColumns: string[];
  systemColumns: LeadListSystemColumn[];
}

export interface LeadUpdateSystemField {
  id: string;
  label: string;
  group: string;
}

export interface LeadUpdateFieldPreference {
  id: string;
  role?: string;
  enabledFields: string[];
  systemFields: LeadUpdateSystemField[];
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isRawIdentifier = (value?: string | null) =>
  Boolean(value && uuidPattern.test(value));

const optionLabel = (
  options: Array<{ id: string; label: string }>,
  value?: string | null,
  fallback = "Not Set",
) => {
  const matched = options.find((option) => option.id === value)?.label;
  if (matched) return matched;
  if (value && !isRawIdentifier(value)) return value;
  return fallback;
};

const cleanLabel = (value?: string | null, fallback = "Not Set") =>
  value && !isRawIdentifier(value) ? value : fallback;

const uniqueOptions = (options: LeadFilterOption[]) => {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const fallbackOptions = (options: Array<{ id: string; label: string }>) =>
  options.map((option) => ({ label: option.label, value: option.id }));

const fallbackLeadTypeOptions: LeadFilterOption[] = [
  { label: "Very Hot", value: "Very Hot" },
  { label: "Hot", value: "Hot" },
  { label: "Warm", value: "Warm" },
  { label: "Cold", value: "Cold" },
];

const serializeFilterValues = (values?: string[]) =>
  values && values.length > 0 ? values.join(",") : undefined;

const mapMasterOptions = (
  items: Array<ApiMasterValue | null | undefined>,
  fallback: LeadFilterOption[],
) => {
  const activeItems = items
    .filter(hasUsableMasterValue)
    .filter((item) => item.isActive !== false)
    .map((item) => ({
      label: item.name,
      value: item.id,
      triggerAction: item.triggerAction ?? undefined,
      allowFollowUp: item.allowFollowUp ?? true,
    }));

  return activeItems.length ? uniqueOptions(activeItems) : uniqueOptions(fallback);
};

const mapNamedMasterOptions = (
  items: Array<ApiMasterValue | null | undefined>,
  fallback: LeadFilterOption[],
) => {
  const activeItems = items
    .filter(hasUsableMasterValue)
    .filter((item) => item.isActive !== false)
    .map((item) => ({ label: item.name, value: item.name }));

  return activeItems.length ? uniqueOptions(activeItems) : uniqueOptions(fallback);
};

const mapUserOptions = (
  users: Array<ApiUserOption | null | undefined> | undefined,
  roles: string[],
) =>
  uniqueOptions(
    (users ?? [])
      .filter(hasUsableUserOption)
      .filter((user) => user.role && roles.includes(user.role))
      .map((user) => ({
        label: user.name,
        value: user.id,
        role: user.role,
        image: user.image,
      })),
  ).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, {
      sensitivity: "base",
      numeric: true,
    }),
  );

const formatBudget = (lead: ApiLead) => {
  const value = lead.requirement?.maxBudget ?? lead.requirement?.minBudget;
  if (value === null || value === undefined || value === "") return "Not Set";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value);
  if (numeric >= 10000000) return `₹${(numeric / 10000000).toFixed(2)} Cr`;
  if (numeric >= 100000) return `₹${(numeric / 100000).toFixed(2)} Lakh`;
  return `₹${numeric.toLocaleString("en-IN")}`;
};

const formatMobile = (mobile?: string | null, countryCode = "+91") => {
  if (!mobile) return "Not Set";
  let raw = String(mobile).trim();
  if (!raw) return "Not Set";

  raw = raw.replace(/^(\+?91\s*)+/i, "+91 ");

  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    const [, cc, num] = match;
    const cleanNum = num.replace(/^(\+?91\s*)+/i, "").trim();
    return cleanNum ? `${cc} ${cleanNum}` : cc;
  }

  const cc = (countryCode || "+91").trim();
  return `${cc} ${raw}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not Set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}\n${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const stageTone = (stage: string) => {
  const normalized = stage.toLowerCase();
  if (normalized.includes("lost")) return "bg-red-100 text-red-600";
  if (normalized.includes("book") || normalized.includes("won"))
    return "bg-green-100 text-success";
  if (normalized.includes("visit")) return "bg-violet-100 text-violet-700";
  if (normalized.includes("follow")) return "bg-orange-100 text-primary";
  if (normalized.includes("contact")) return "bg-cyan-100 text-cyan-700";
  if (normalized.includes("interest")) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-secondary";
};

const assignedUser = (lead: ApiLead) =>
  [
    {
      id: lead.ownerId,
      name: lead.ownerName,
      role: "Owner",
    },
    {
      id: lead.telecallerId,
      name: lead.telecallerName,
      role: "Pre Sales Executive",
    },
    {
      id: lead.fieldExecutiveId,
      name: lead.fieldExecutiveName,
      role: "Sales Executive",
    },
  ].find((option) => option.id && option.name);

export const mapApiLeadToRow = (lead: ApiLead): LeadRow => {
  const owner = assignedUser(lead);
  const leadScore = Math.max(0, Math.min(Number(lead.leadScore ?? 0), 100));
  const stage =
    cleanLabel(lead.statusName, "") ||
    cleanLabel(lead.stageName, "") ||
    optionLabel(statusOptions, lead.statusId, "") ||
    optionLabel(stageOptions, lead.stageId, "New Lead");
  const priority =
    cleanLabel(lead.priorityName, "") ||
    optionLabel(priorityOptions, lead.priorityId, "Medium");
  const propertyType = optionLabel(
    propertyTypeOptions,
    lead.requirement?.propertyType,
    "Not Set",
  );

  return {
    id: lead.displayId ?? lead.id,
    backendId: lead.id,
    projectId: lead.requirement?.preferredProjectId ?? undefined,
    ownerId: lead.ownerId ?? undefined,
    telecallerId: lead.telecallerId ?? undefined,
    fieldExecutiveId: lead.fieldExecutiveId ?? undefined,
    name: lead.name,
    avatarSeed: lead.name,
    mobile: formatMobile(lead.mobile, lead.mobileCountryCode),
    email: lead.email,
    source:
      cleanLabel(lead.sourceName, "") ||
      optionLabel(leadSourceOptions, lead.sourceId, "Unknown"),
    sourceId: lead.sourceId,
    integrationConnectionId: lead.integrationConnectionId ?? undefined,
    integrationAccountName: lead.integrationAccountName ?? undefined,
    statusId: lead.statusId ?? lead.stageId,
    temperatureId: lead.temperatureId,
    budgetRange: lead.requirement?.budgetRange,
    configuration: lead.requirement?.configuration,
    preferredLocation: lead.requirement?.preferredLocation,
    addedDate: formatDateTime(lead.createdAt),
    lastUpdate: formatDateTime(lead.updatedAt),
    budget: formatBudget(lead),
    propertyType:
      [lead.requirement?.configuration, propertyType]
        .filter(Boolean)
        .join(" ") || propertyType,
    stage,
    stageTone: stageTone(stage),
    status: stage,
    statusName: stage,
    priority,
    leadType:
      cleanLabel(lead.temperatureName, "") ||
      (lead.leadType === "Hot" ||
      lead.leadType === "Warm" ||
      lead.leadType === "Cold"
        ? lead.leadType
        : "Warm"),
    projectName:
      cleanLabel(lead.projectName, "") ||
      cleanLabel(lead.requirement?.preferredLocation, "Not Set"),
    projectArea: lead.projectArea ?? lead.requirement?.preferredLocation,
    ownerName: cleanLabel(lead.ownerName, "") || undefined,
    telecallerName: cleanLabel(lead.telecallerName, "") || undefined,
    fieldExecutiveName: cleanLabel(lead.fieldExecutiveName, "") || undefined,
    lostReasonId: lead.lostReasonId ?? undefined,
    lostReasonName: cleanLabel(lead.lostReasonName, "") || undefined,
    lostCompetitor: lead.lostCompetitor,
    assignedTo: owner?.name ?? "Unassigned",
    assignedRole: owner?.role ?? "Not Assigned",
    lastFollowUp: formatDateTime(lead.updatedAt),
    nextFollowUp: formatDateTime(lead.nextFollowUpAt),
    nextFollowUpAt: lead.nextFollowUpAt,
    remark: cleanLabel(lead.remarks, "Not Set"),
    lastContactedAt: lead.lastContactedAt,
    lostAt: lead.lostAt,
    interestLevel: lead.interestLevel,
    leadScore,
    leadScoreLabel: cleanLabel(
      lead.leadScoreLabel,
      leadScore > 0 ? "Developing" : "Not scored",
    ),
    leadScoreBreakdown: lead.leadScoreBreakdown ?? [],
  };
};

export function useAllLeads(
  search: string,
  segment?: string,
  inactivityDays?: number,
  filters?: Partial<LeadListFilters>,
  limit = 100,
  page = 1,
): UseQueryResult<{ rows: LeadRow[]; total: number }> {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? "anonymous";
  const userRole = user?.role ?? "anonymous";

  return useQuery<{ rows: LeadRow[]; total: number }>({
    queryKey: [
      "leads",
      "all",
      userId,
      userRole,
      search,
      segment,
      inactivityDays,
      filters,
      limit,
      page,
    ],
    enabled: Boolean(user?.id),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const leadsRes = await api.get<LeadsResponse>("/leads", {
        params: {
          page,
          limit,
          search: search || undefined,
          segment,
          inactivityDays,
          sourceId:
            serializeFilterValues(filters?.sourceId),
          integrationConnectionId:
            serializeFilterValues(filters?.integrationConnectionId),
          statusId:
            serializeFilterValues(filters?.statusId),
          stageId:
            serializeFilterValues(filters?.stageId),
          temperatureId:
            serializeFilterValues(filters?.temperatureId),
          propertyType:
            serializeFilterValues(filters?.propertyType),
          configuration:
            serializeFilterValues(filters?.configuration),
          ownerId:
            serializeFilterValues(filters?.ownerId),
          telecallerId:
            serializeFilterValues(filters?.telecallerId),
          teamId:
            serializeFilterValues(filters?.teamId),
          area: serializeFilterValues(filters?.area),
          projectId: serializeFilterValues(filters?.projectId),
          from: filters?.from || undefined,
          to: filters?.to || undefined,
        },
      });

      let sources: ApiMasterValue[] = [];
      try {
        const sourcesRes = await api.get<{ data: ApiMasterValue[] }>(
          "/lead-masters/source",
          {
            params: { limit: 100 },
          },
        );
        sources = (sourcesRes.data?.data || []).filter(hasUsableMasterValue);
      } catch {
        sources = [];
      }

      let statuses: ApiMasterValue[] = [];
      try {
        const statusesRes = await api.get<{ data: ApiMasterValue[] }>(
          "/lead-masters/status",
          {
            params: { limit: 100 },
          },
        );
        statuses = (statusesRes.data?.data || []).filter(hasUsableMasterValue);
      } catch {
        statuses = [];
      }

      const getSourceLabel = (sourceId?: string | null) => {
        if (!sourceId) return "Unknown";
        const found = sources.find(
          (source) =>
            source.id === sourceId ||
            source.code === sourceId ||
            source.name === sourceId,
        );
        if (found) return found.name;
        return isRawIdentifier(sourceId)
          ? "Unknown"
          : optionLabel(leadSourceOptions, sourceId, "Unknown");
      };

      const getStageLabel = (lead: ApiLead) => {
        if (lead.statusName && !isRawIdentifier(lead.statusName)) {
          return lead.statusName;
        }
        if (lead.stageName && !isRawIdentifier(lead.stageName)) {
          return lead.stageName;
        }

        if (lead.statusId) {
          const found = statuses.find(
            (status) =>
              status.id === lead.statusId ||
              status.code === lead.statusId ||
              status.name === lead.statusId,
          );
          if (found) return found.name;
        }

        if (lead.stageId) {
          const found = statuses.find(
            (status) =>
              status.id === lead.stageId ||
              status.code === lead.stageId ||
              status.name === lead.stageId,
          );
          if (found) return found.name;
        }

        return (
          (!isRawIdentifier(lead.statusId)
            ? optionLabel(statusOptions, lead.statusId, "")
            : "") ||
          (!isRawIdentifier(lead.stageId)
            ? optionLabel(stageOptions, lead.stageId, "New Lead")
            : "New Lead")
        );
      };

      const rows = (leadsRes.data.data ?? [])
        .filter(hasUsableApiLead)
        .map((lead) => {
          const mapped = mapApiLeadToRow(lead);
          mapped.source =
            cleanLabel(lead.sourceName, "") || getSourceLabel(lead.sourceId);
          mapped.stage = getStageLabel(lead);
          mapped.stageTone = stageTone(mapped.stage);
          return mapped;
        });

      return {
        rows,
        total: leadsRes.data.meta.total,
      };
    },
  });
}

export function useTeamLeadWorkspace(
  search: string,
  filters?: Partial<LeadListFilters>,
  memberId?: string,
  limit = 100,
  enabled = true,
): UseQueryResult<TeamLeadWorkspaceResponse> {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? "anonymous";
  const userRole = user?.role ?? "anonymous";

  return useQuery<TeamLeadWorkspaceResponse>({
    queryKey: [
      "leads",
      "team-workspace",
      userId,
      userRole,
      search,
      filters,
      memberId,
      limit,
    ],
    enabled: enabled && Boolean(user?.id),
    placeholderData: keepPreviousData,
    retry: false,
    queryFn: async () => {
      const response = await api.get<
        Omit<TeamLeadWorkspaceResponse, "members" | "rows"> & {
          members?: Array<TeamLeadWorkspaceMember | null | undefined>;
          rows: Array<ApiLead | null | undefined>;
        }
      >("/leads/team-workspace", {
        params: {
          scope: "team",
          page: 1,
          limit,
          search: search || undefined,
          memberId: memberId || undefined,
          sourceId: serializeFilterValues(filters?.sourceId),
          statusId: serializeFilterValues(filters?.statusId),
          stageId: serializeFilterValues(filters?.stageId),
          temperatureId: serializeFilterValues(filters?.temperatureId),
          propertyType: serializeFilterValues(filters?.propertyType),
          configuration: serializeFilterValues(filters?.configuration),
          ownerId: serializeFilterValues(filters?.ownerId),
          telecallerId: serializeFilterValues(filters?.telecallerId),
          area: serializeFilterValues(filters?.area),
          from: filters?.from || undefined,
          to: filters?.to || undefined,
        },
      });

      return {
        ...response.data,
        members: (response.data.members ?? []).filter(hasUsableWorkspaceMember),
        rows: (response.data.rows ?? [])
          .filter(hasUsableApiLead)
          .map(mapApiLeadToRow),
      };
    },
  });
}

export function useLeadListFilterOptions() {
  const user = useAppSelector((state) => state.auth.user);
  const userId = user?.id ?? "anonymous";
  const userRole = user?.role ?? "anonymous";

  const sourcesQuery = useQuery({
    queryKey: ["lead-masters", "source", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/source", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const statusesQuery = useQuery({
    queryKey: ["lead-masters", "status", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/status", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const stagesQuery = useQuery({
    queryKey: ["lead-masters", "stage", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/stage", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const prioritiesQuery = useQuery({
    queryKey: ["lead-masters", "priority", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/priority", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const leadTypesQuery = useQuery({
    queryKey: ["lead-masters", "temperature", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/temperature", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const budgetRangesQuery = useQuery({
    queryKey: ["lead-masters", "lead_budget_range", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/lead_budget_range", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const propertyTypesQuery = useQuery({
    queryKey: ["lead-masters", "property_type", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/property_type", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const configurationsQuery = useQuery({
    queryKey: ["lead-masters", "project_configuration", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>(
          "/lead-masters/project_configuration",
          {
            params: { limit: 100 },
          },
        )
      ).data.data,
  });

  const areaQuery = useQuery({
    queryKey: ["lead-masters", "project_location", "filter-options"],
    queryFn: async () =>
      (
        await api.get<{ data: Array<ApiMasterValue | null | undefined> }>("/lead-masters/project_location", {
          params: { limit: 100 },
        })
      ).data.data,
  });

  const usersQuery = useQuery({
    queryKey: ["leads", "pipeline", "filter-users", userId, userRole],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await api.get<PipelineFiltersResponse>("/leads/pipeline", {
          params: { limitPerColumn: 1 },
        })
      ).data.filters?.users ?? [],
  });

  const teamsQuery = useQuery({
    queryKey: ["teams", "lead-filter-options", userId, userRole],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (await api.get<{ data: Array<ApiTeamOption | null | undefined> }>("/teams")).data.data,
  });

  const projectsQuery = useQuery({
    queryKey: ["projects", "lead-filter-options", userId, userRole],
    enabled: Boolean(user?.id),
    queryFn: async () =>
      (
        await api.get<{
          data: Array<{ id: string; name: string } | null | undefined>;
        }>("/projects")
      ).data.data ?? [],
  });

  const integrationAccountsQuery = useQuery({
    queryKey: ["lead-imports", "account-filter-options", userId, userRole],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const results = await Promise.allSettled([
        api.get<{ data: { accounts?: Array<{ id: string; name: string }> } }>(
          "/integrations/magicbricks/accounts",
        ),
        api.get<{ data: { accounts?: Array<{ id: string; name: string }> } }>(
          "/housing-integrations/accounts",
        ),
      ]);
      return results.flatMap((result, index) => {
        if (result.status !== "fulfilled") return [];
        const accounts = result.value.data.data?.accounts ?? [];
        const provider = index === 0 ? "MagicBricks" : "Housing.com";
        return accounts.map((account) => ({
          value: account.id,
          label: account.name,
          role: provider,
        }));
      });
    },
  });

  const options = useMemo<LeadListFilterOptions>(
    () => ({
      sourceOptions: mapMasterOptions(
        sourcesQuery.data ?? [],
        fallbackOptions(leadSourceOptions),
      ),
      integrationAccountOptions: uniqueOptions(
        integrationAccountsQuery.data ?? [],
      ).sort((left, right) => left.label.localeCompare(right.label)),
      statusOptions: mapMasterOptions(
        statusesQuery.data ?? [],
        fallbackOptions(statusOptions),
      ),
      stageOptions: mapMasterOptions(
        stagesQuery.data ?? [],
        fallbackOptions(stageOptions),
      ),
      priorityOptions: mapMasterOptions(
        prioritiesQuery.data ?? [],
        fallbackOptions(priorityOptions),
      ),
      leadTypeOptions: mapMasterOptions(
        leadTypesQuery.data ?? [],
        fallbackLeadTypeOptions,
      ),
      budgetOptions: mapNamedMasterOptions(budgetRangesQuery.data ?? [], []),
      propertyTypeOptions: mapNamedMasterOptions(
        propertyTypesQuery.data ?? [],
        fallbackOptions(propertyTypeOptions).map((option) => ({
          ...option,
          value: option.label,
        })),
      ),
      configurationOptions: mapNamedMasterOptions(
        configurationsQuery.data ?? [],
        fallbackOptions(configurationOptions).map((option) => ({
          ...option,
          value: option.label,
        })),
      ),
      areaOptions: mapNamedMasterOptions(areaQuery.data ?? [], []),
      projectOptions: uniqueOptions(
        (projectsQuery.data ?? [])
          .filter(
            (project): project is { id: string; name: string } =>
              Boolean(
                project &&
                  typeof project.id === "string" &&
                  project.id.trim() &&
                  typeof project.name === "string" &&
                  project.name.trim(),
              ),
          )
          .map((project) => ({
            label: project.name,
            value: project.id,
          })),
      ).sort((a, b) =>
        a.label.localeCompare(b.label, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      ),
      ownerOptions: mapUserOptions(usersQuery.data, [
        "ADMIN",
        "SUPER_ADMIN",
        "SALES_MANAGER",
        "TEAM_LEADER",
        "MANAGER",
        "TELECALLER",
        "SALES_AGENT",
      ]),
      telecallerOptions: mapUserOptions(usersQuery.data, ["TELECALLER"]),
      teamOptions: uniqueOptions(
        (teamsQuery.data ?? [])
          .filter(hasUsableTeamOption)
          .filter((team) => team.isActive !== false)
          .map((team) => ({ label: team.name, value: team.id })),
      ).sort((a, b) =>
        a.label.localeCompare(b.label, undefined, {
          sensitivity: "base",
          numeric: true,
        }),
      ),
    }),
    [
      prioritiesQuery.data,
      leadTypesQuery.data,
      budgetRangesQuery.data,
      propertyTypesQuery.data,
      configurationsQuery.data,
      areaQuery.data,
      projectsQuery.data,
      sourcesQuery.data,
      stagesQuery.data,
      statusesQuery.data,
      usersQuery.data,
      teamsQuery.data,
      integrationAccountsQuery.data,
    ],
  );

  return {
    options,
    isLoading:
      sourcesQuery.isLoading ||
      statusesQuery.isLoading ||
      stagesQuery.isLoading ||
      prioritiesQuery.isLoading ||
      leadTypesQuery.isLoading ||
      budgetRangesQuery.isLoading ||
      propertyTypesQuery.isLoading ||
      configurationsQuery.isLoading ||
      areaQuery.isLoading ||
      usersQuery.isLoading ||
      teamsQuery.isLoading ||
      integrationAccountsQuery.isLoading,
  };
}

export function useBulkUpdateLeadSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadIds,
      sourceId,
    }: {
      leadIds: string[];
      sourceId: string;
    }) => (await api.patch("/leads/bulk/source", { leadIds, sourceId })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBulkAssignSelectedLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadIds,
      assignments,
      duplicateReminder,
      duplicateRemark,
      strategy,
      reason,
      notes,
    }: {
      leadIds: string[];
      assignments: Array<{
        toUserId: string;
        assigneeType: "telecaller" | "field-executive";
      }>;
      duplicateReminder?: boolean;
      duplicateRemark?: boolean;
      strategy?: "manual" | "manual-reassignment" | "duplicate-assign";
      reason?: string;
      notes?: string;
    }) => {
      const results: unknown[] = [];
      for (const { toUserId, assigneeType } of assignments) {
        const response = await api.post("/leads/bulk-assign", {
          leadIds,
          toUserId,
          assigneeType,
          strategy:
            strategy ??
            ((duplicateReminder || duplicateRemark)
              ? "duplicate-assign"
              : "manual"),
          reason:
            reason ??
            ((duplicateReminder || duplicateRemark)
              ? "Duplicate and assign selected leads"
              : "Assign selected leads"),
          notes,
          duplicateReminder,
          duplicateRemark,
        });
        results.push(response.data);
      }
      return results;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["lead-details"] });
      await queryClient.invalidateQueries({ queryKey: ["lead-timeline"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBulkPatchSelectedLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      leadIds,
      payload,
    }: {
      leadIds: string[];
      payload: Record<string, unknown>;
    }) =>
      Promise.all(
        leadIds.map((leadId) => api.patch(`/leads/${leadId}`, payload)),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useLeadColumnPreferences() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["lead-list-columns"],
    queryFn: async () =>
      (await api.get<LeadListColumnPreference>("/lead-list-columns")).data,
  });
  const mutation = useMutation({
    mutationFn: async (visibleColumns: string[]) =>
      (await api.patch("/lead-list-columns", { visibleColumns })).data,
    onMutate: async (newVisibleColumns: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["lead-list-columns"] });
      const previousData =
        queryClient.getQueryData<LeadListColumnPreference>(["lead-list-columns"]);
      if (previousData) {
        queryClient.setQueryData<LeadListColumnPreference>(["lead-list-columns"], {
          ...previousData,
          visibleColumns: newVisibleColumns,
        });
      }
      return { previousData };
    },
    onError: (_err, _newVisibleColumns, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["lead-list-columns"], context.previousData);
      }
      toast.error("Could not update column preference");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lead-list-columns"] });
    },
  });
  return { query, mutation };
}

export function useLeadUpdateFieldPermissions(role?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["lead-field-permissions", role ?? "effective"],
    queryFn: async () =>
      (
        await api.get<LeadUpdateFieldPreference>("/lead-field-permissions", {
          params: role ? { role } : undefined,
        })
      ).data,
  });
  const mutation = useMutation({
    mutationFn: async ({
      role: targetRole,
      enabledFields,
    }: {
      role: string;
      enabledFields: string[];
    }) =>
      (
        await api.patch("/lead-field-permissions", {
          role: targetRole,
          enabledFields,
        })
      ).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lead-field-permissions"] });
    },
  });
  return { query, mutation };
}
