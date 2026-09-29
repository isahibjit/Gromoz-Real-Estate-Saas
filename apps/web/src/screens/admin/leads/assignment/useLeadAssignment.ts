import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../../common/api";
import type { AssigneeOption, AssigneeType } from "./leadAssignmentTypes";

interface ApiUserOption {
  id: string;
  name: string;
  role?: string;
  email?: string;
  image?: string | null;
}

interface PipelineFiltersResponse {
  filters?: {
    users?: ApiUserOption[];
  };
}

export function useAssigneesQuery() {
  return useQuery({
    queryKey: ["leads", "pipeline", "filter-users", "assignees"],
    queryFn: async () => {
      const [pipelineResponse, leadsResponse] = await Promise.all([
        api.get<PipelineFiltersResponse>("/leads/pipeline", {
          params: { limitPerColumn: 1 },
        }),
        api.get<{ data: Array<Record<string, any>> }>("/leads", {
          params: { limit: 200 },
        }),
      ]);
      const users = pipelineResponse.data.filters?.users ?? [];
      const leads = leadsResponse.data.data ?? [];
      
      const roleToType = (role?: string): AssigneeType | undefined => {
        if (role === "TELECALLER") return "telecaller";
        if (role === "SALES_AGENT") return "field-executive";
        if (role === "SALES_MANAGER") return "admin";
        return undefined;
      };

      const assignmentCount = (userId: string, type: AssigneeType) =>
        leads.filter((lead) => {
          if (type === "telecaller") return lead.telecallerId === userId;
          if (type === "field-executive") return lead.fieldExecutiveId === userId;
          return lead.managerId === userId;
        }).length;

      const capacityForType = (type: AssigneeType) =>
        type === "admin" ? 20 : type === "field-executive" ? 35 : 30;

      const mapped: AssigneeOption[] = users
        .filter((user) => roleToType(user.role))
        .map((user) => {
          const type = roleToType(user.role)!;
          const currentLoad = assignmentCount(user.id, type);
          const capacity = capacityForType(type);
          const utilization = capacity > 0 ? Math.min(Math.round((currentLoad / capacity) * 100), 100) : 0;

          return {
            id: user.id,
            name: user.name || user.email || "Unknown",
            type,
            currentLoad,
            capacity,
            performance: Math.max(100 - utilization, 0),
            avatarUrl: user.image ?? undefined,
            locations: ["Mumbai"],
          };
        });
      
      return mapped;
    },
  });
}

export function useAssignLeadsMutation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      leadIds: string[];
      toUserId: string;
      assigneeId?: string;
      assigneeType?: string;
      strategy?: string;
      reason?: string;
      notes ?: string;
    }) => {
      const res = await api.post("/leads/bulk-assign", data);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({
        queryKey: ["leads", "pipeline", "filter-users", "assignees"],
      });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export const useBulkAssignLeadsMutation = useAssignLeadsMutation;
