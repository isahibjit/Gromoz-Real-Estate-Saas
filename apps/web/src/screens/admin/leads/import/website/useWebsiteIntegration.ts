import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "../../../../../common/api";
import { currentOrganizationId } from "../../../../../common/tenantRequestScope";

export interface WebsiteFieldOption {
  value: string;
  label: string;
  required: boolean;
}

export interface WebsiteSourceField {
  key: string;
  label: string;
  sample: string;
}

export interface ConnectedWebsiteItem {
  id: string;
  url: string;
  name: string;
  addedAt: string;
  projectId?: string;
  projectName?: string;
  sourceId?: string;
  sourceName?: string;
  teamId?: string;
  teamName?: string;
  telecallerId?: string;
  telecallerName?: string;
  fieldExecutiveId?: string;
  fieldExecutiveName?: string;
  leadsCount: number;
  lastLeadAt?: string | null;
}

export interface WebsiteIntegrationStats {
  totalImportedThisMonth: number;
  lastImportedAt: string | null;
}

export interface WebsiteIntegrationConfig {
  id: string;
  provider: string;
  displayName: string;
  crmName: string;
  status: string;
  isActive: boolean;
  apiKey: string;
  apiKeyPreview: string;
  endpointUrl: string;
  scriptSnippetUrl: string;
  connectedWebsites: ConnectedWebsiteItem[];
  fieldMapping: Record<string, string>;
  fieldOptions: WebsiteFieldOption[];
  sourceFields: WebsiteSourceField[];
  stats: WebsiteIntegrationStats;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastLeadReceivedAt: string | null;
  totalLeadsReceived: number;
  notes: string;
}

export interface WebsiteTestResult {
  valid: boolean;
  status: string;
  endpointUrl: string;
  apiKey: string;
  samplePayload: Record<string, string>;
  normalizedLead: {
    leadName: string;
    mobileNumber: string;
    emailAddress?: string;
    preferredProjectId?: string;
    preferredProjectName?: string;
    preferredLocation?: string;
    leadSourceName?: string;
    leadSourceId?: string;
    remarks?: string;
    configuration?: string;
  };
  wouldCreateLead: boolean;
  errors: string[];
}

export interface WebsiteIntegrationMutations {
  saveConfig: UseMutationResult<
    WebsiteIntegrationConfig,
    Error,
    { isActive?: boolean; notes?: string; status?: string }
  >;
  addWebsiteUrl: UseMutationResult<
    WebsiteIntegrationConfig,
    Error,
    { url: string; name?: string }
  >;
  deleteWebsiteUrl: UseMutationResult<
    WebsiteIntegrationConfig,
    Error,
    string
  >;
  saveWebsiteRouting: UseMutationResult<
    WebsiteIntegrationConfig,
    Error,
    {
      websiteId: string;
      projectId?: string;
      sourceId?: string;
      teamId?: string;
      telecallerId?: string;
      fieldExecutiveId?: string;
    }
  >;
  regenerateApiKey: UseMutationResult<
    WebsiteIntegrationConfig,
    Error,
    void
  >;
  saveFieldMapping: UseMutationResult<
    WebsiteIntegrationConfig,
    Error,
    Record<string, string>
  >;
  testConnection: UseMutationResult<
    WebsiteTestResult,
    Error,
    Record<string, string> | undefined
  >;
}

const integrationQueryKey = (organizationId: string) =>
  ["lead-imports", organizationId, "website"] as const;

export function useWebsiteIntegration(): UseQueryResult<
  WebsiteIntegrationConfig,
  Error
> {
  const organizationId = currentOrganizationId() ?? "unscoped";

  return useQuery({
    queryKey: integrationQueryKey(organizationId),
    queryFn: async () => {
      const { data } = await api.get("/integrations/website");
      return data.data as WebsiteIntegrationConfig;
    },
  });
}

export function useWebsiteIntegrationMutations(): WebsiteIntegrationMutations {
  const queryClient = useQueryClient();
  const organizationId = currentOrganizationId() ?? "unscoped";

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: integrationQueryKey(organizationId),
    });
    await queryClient.invalidateQueries({
      queryKey: ["lead-import-stats", organizationId],
    });
  };

  return {
    saveConfig: useMutation({
      mutationFn: async (payload: {
        isActive?: boolean;
        notes?: string;
        status?: string;
      }) => {
        const { data } = await api.patch("/integrations/website", payload);
        return data.data as WebsiteIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    addWebsiteUrl: useMutation({
      mutationFn: async (payload: { url: string; name?: string }) => {
        const { data } = await api.post(
          "/integrations/website/websites",
          payload,
        );
        return data.data as WebsiteIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    deleteWebsiteUrl: useMutation({
      mutationFn: async (websiteId: string) => {
        const { data } = await api.delete(
          `/integrations/website/websites/${websiteId}`,
        );
        return data.data as WebsiteIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    saveWebsiteRouting: useMutation({
      mutationFn: async (payload: {
        websiteId: string;
        projectId?: string;
        sourceId?: string;
        teamId?: string;
        telecallerId?: string;
        fieldExecutiveId?: string;
      }) => {
        const { data } = await api.patch(
          `/integrations/website/websites/${payload.websiteId}/routing`,
          payload,
        );
        return data.data as WebsiteIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    regenerateApiKey: useMutation({
      mutationFn: async () => {
        const { data } = await api.post(
          "/integrations/website/generate-api-key",
        );
        return data.data as WebsiteIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    saveFieldMapping: useMutation({
      mutationFn: async (fieldMapping: Record<string, string>) => {
        const { data } = await api.patch(
          "/integrations/website/field-mapping",
          { fieldMapping },
        );
        return data.data as WebsiteIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    testConnection: useMutation<
      WebsiteTestResult,
      Error,
      Record<string, string> | undefined
    >({
      mutationFn: async (samplePayload?: Record<string, string>) => {
        const { data } = await api.post("/integrations/website/test", {
          samplePayload,
        });
        return data.data as WebsiteTestResult;
      },
      onSuccess: invalidate,
    }),
  };
}
export interface WebsiteDeliveryLog {
  id: string;
  action: string;
  occurredAt: string;
  displayId?: string;
  websiteUrl?: string;
  name?: string;
  mobile?: string;
  reason?: string;
  outcome?: string;
}

export function useWebsiteDeliveryLogs(page: number) {
  const organizationId = currentOrganizationId() ?? "unscoped";

  return useQuery({
    queryKey: [
      ...integrationQueryKey(organizationId),
      "delivery-logs",
      page,
    ],
    queryFn: async () => {
      const { data } = await api.get("/integrations/website/delivery-logs", {
        params: { page, limit: 8 },
      });
      return data as {
        data: WebsiteDeliveryLog[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}
