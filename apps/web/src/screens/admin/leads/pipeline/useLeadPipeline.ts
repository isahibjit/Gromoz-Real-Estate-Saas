import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../../../common/api";

export interface PipelineOption {
  id: string;
  name: string;
  role?: string;
  location?: string;
}

export interface PipelineStatus extends PipelineOption {
  code: string;
  color: string;
  sortOrder: number;
}

export interface PipelineLead {
  id: string;
  displayId: string;
  name: string;
  mobile: string;
  source: string;
  propertyRequirement: string;
  budget: string;
  assignedUser: null | {
    id: string;
    name: string;
    role: string;
  };
  project?: string | null;
  lastActivity: string;
}

export interface PipelineColumn {
  id: string;
  name: string;
  code: string;
  color: string;
  count: number;
  value: number;
  valueLabel: string;
  hiddenCount: number;
  leads: PipelineLead[];
}

export interface PipelineSummary {
  label: string;
  count: number;
  valueLabel: string;
  color?: string;
}

export interface PipelineStagePerformance {
  stage: string;
  count: number;
  percent: number;
  color: string;
  width: string;
}

export interface PipelineSourcePerformance {
  name: string;
  count: number;
  percent: number;
}

export interface LeadPipelineData {
  filters: {
    statuses: PipelineStatus[];
    sources: PipelineOption[];
    propertyTypes?: PipelineOption[];
    configurations?: PipelineOption[];
    users: PipelineOption[];
    executives?: PipelineOption[];
    projects: PipelineOption[];
  };
  columns: PipelineColumn[];
  summary: PipelineSummary[];
  stagePerformance: PipelineStagePerformance[];
  topSources: PipelineSourcePerformance[];
  meta: {
    totalLeads: number;
    totalValueLabel: string;
    limitPerColumn: number;
  };
}

export interface PipelineFilters {
  search: string;
  sourceId: string;
  propertyType: string;
  configuration: string;
  assignedToId: string;
  managerId: string;
  executiveId: string;
  projectId: string;
  from: string;
  to: string;
}

export interface PipelineMovePayload {
  leadId: string;
  statusId: string;
  scheduledAt?: string;
  projectId?: string;
  unitId?: string;
  bookingAmount?: string;
  bookingDate?: string;
  lostReason?: string;
  lostReasonId?: string;
  lostCompetitor?: string;
  notes?: string;
}

const compactFilters = (filters: PipelineFilters) =>
  Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value && value !== "all"),
  );

export function useLeadPipeline(filters: PipelineFilters) {
  return useQuery<LeadPipelineData>({
    queryKey: ["leads", "pipeline", filters],
    queryFn: async () => {
      const { data } = await api.get("/leads/pipeline", {
        params: compactFilters(filters),
      });
      return data;
    },
  });
}

export function useMovePipelineLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, ...payload }: PipelineMovePayload) => {
      const { data } = await api.post(
        `/leads/${leadId}/pipeline-move`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads", "pipeline"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["site-visits"] });
      void queryClient.invalidateQueries({ queryKey: ["leads", "details"] });
    },
  });
}
