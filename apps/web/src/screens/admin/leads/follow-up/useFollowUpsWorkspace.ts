import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../../../common/api";

export interface FollowUpWorkspaceApiRecord {
  id: string;
  leadId: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  assignedToRole?: string | null;
  typeId?: string | null;
  typeName?: string | null;
  statusId?: string | null;
  statusName?: string | null;
  scheduledAt: string;
  completedAt?: string | null;
  nextAction?: string | null;
  remarks?: string | null;
  notes?: string | null;
  setReminder?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lead?: {
    id: string;
    displayId?: string | null;
    name?: string | null;
    mobileCountryCode?: string | null;
    mobile?: string | null;
    sourceId?: string | null;
    sourceName?: string | null;
    statusId?: string | null;
    statusName?: string | null;
    temperatureId?: string | null;
    temperatureName?: string | null;
    projectName?: string | null;
    projectArea?: string | null;
    ownerName?: string | null;
    telecallerName?: string | null;
    fieldExecutiveName?: string | null;
    requirement?: {
      configuration?: string | null;
      propertyType?: string | null;
      preferredLocation?: string | null;
      preferredProjectId?: string | null;
      budgetRange?: string | null;
    } | null;
  } | null;
}

interface FollowUpsResponse {
  data: FollowUpWorkspaceApiRecord[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

interface FollowUpListParams {
  search?: string;
  type?: string;
  status?: string;
  assignedToId?: string;
  leadId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export function useFollowUpsList(params: FollowUpListParams) {
  return useQuery({
    queryKey: ["follow-ups", params],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await api.get<FollowUpsResponse>("/leads/follow-ups", {
          params: {
            ...params,
            type:
              params.type && params.type !== "All" ? params.type : undefined,
            assignedToId:
              params.assignedToId && params.assignedToId !== "all"
                ? params.assignedToId
                : undefined,
            status:
              params.status && params.status !== "all"
                ? params.status
                : undefined,
            search: params.search || undefined,
            limit: params.limit ?? 200,
          },
        })
      ).data,
  });
}

export function useFollowUpMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["field-executive"] });
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["lead-timeline"] });
    void queryClient.invalidateQueries({ queryKey: ["lead-details"] });
    void queryClient.invalidateQueries({ queryKey: ["lead-remarks"] });
  };

  return {
    createFollowUp: useMutation({
      mutationFn: async ({
        leadId,
        payload,
      }: {
        leadId: string;
        payload: Record<string, unknown>;
      }) => (await api.post(`/leads/${leadId}/follow-ups`, payload)).data,
      onSuccess: invalidate,
    }),
    updateFollowUp: useMutation({
      mutationFn: async ({
        leadId,
        followUpId,
        payload,
      }: {
        leadId: string;
        followUpId: string;
        payload: Record<string, unknown>;
      }) =>
        (await api.patch(`/leads/${leadId}/follow-ups/${followUpId}`, payload))
          .data,
      onSuccess: invalidate,
    }),
  };
}
