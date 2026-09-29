import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../../../../common/api";

export interface MetaFieldOption {
  value: string;
  label: string;
  required: boolean;
}

export interface MetaSourceField {
  key: string;
  label: string;
  sample: string;
}

export interface MetaIntegrationConfig {
  id: string;
  provider: string;
  displayName: string;
  status: string;
  isActive: boolean;
  endpointUrl: string;
  verifyToken: string;
  graphApiVersion: string;
  pageId: string;
  selectedPageId: string;
  appId: string;
  selectedFormIds: string[];
  pageFormSelections: Record<string, string[]>;
  pageProjectMappings: Record<string, string>;
  pageSourceMappings: Record<string, string>;
  pageTeamMappings: Record<string, string>;
  pageAssignmentOverrides: Record<
    string,
    { telecallerId?: string; fieldExecutiveId?: string }
  >;
  pageAccessTokenConfigured: boolean;
  oauthRedirectUrl: string;
  connectedAccounts: Array<{
    id: string;
    name: string;
    connectedAt: string | null;
    pagesCount: number;
    isPaused?: boolean;
  }>;
  connectedPages: Array<{
    id: string;
    name: string;
    category: string;
    accountId: string;
    accountName: string;
    portfolioId?: string;
    portfolioName?: string;
    discoveryPath?: string;
    tasks: string[];
    hasAccessToken: boolean;
    leadgenSubscribed?: boolean;
    subscriptionError?: string | null;
    isPaused?: boolean;
    formsEnabledCount: number;
    formsTotalCount: number;
    projectId: string;
    projectName: string;
    projectLocation: string;
    sourceId: string;
    sourceName: string;
    teamId: string;
    teamName: string;
    telecallerId: string;
    telecallerName: string;
    fieldExecutiveId: string;
    fieldExecutiveName: string;
  }>;
  fieldMapping: Record<string, string>;
  fieldOptions: MetaFieldOption[];
  sourceFields: MetaSourceField[];
  manual: {
    crmName: string;
    integrationType: string;
    callbackUrl: string;
    oauthRedirectUrl: string;
    verifyToken: string;
    graphApiVersion: string;
    setupSteps: string[];
    requiredPermissions: string[];
  };
  stats: {
    totalImportedThisMonth: number;
    lastImportedAt: string | null;
  };
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastLeadReceivedAt: string | null;
  totalLeadsReceived: number;
  notes: string;
}

export interface MetaLeadForm {
  id: string;
  name: string;
  status: string;
  leadsCount: number;
  createdTime: string | null;
  questions: Array<{ key: string; label: string; type: string }>;
  isPaused?: boolean;
}

export interface MetaDeliveryLog {
  id: string;
  action: string;
  occurredAt: string;
  leadgenId?: string;
  pageId?: string;
  formId?: string;
  displayId?: string;
  reason?: string;
  outcome?: string;
  eventCount?: number;
}

const integrationQueryKey = ["lead-imports", "meta"] as const;

export function useMetaIntegration() {
  return useQuery({
    queryKey: integrationQueryKey,
    queryFn: async () => {
      const { data } = await api.get("/integrations/meta");
      return data.data as MetaIntegrationConfig;
    },
  });
}

export function useMetaIntegrationMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: integrationQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["lead-imports"] });
  };

  return {
    saveConfig: useMutation({
      mutationFn: async (payload: {
        isActive?: boolean;
        pageId?: string;
        selectedPageId?: string;
        appId?: string;
        graphApiVersion?: string;
        pageAccessToken?: string;
        selectedFormIds?: string[];
        pageFormSelections?: Record<string, string[]>;
        pageProjectMappings?: Record<string, string>;
        pageSourceMappings?: Record<string, string>;
        pageTeamMappings?: Record<string, string>;
        pageAssignmentOverrides?: Record<
          string,
          { telecallerId?: string; fieldExecutiveId?: string }
        >;
        notes?: string;
      }) => {
        const { data } = await api.patch("/integrations/meta", payload);
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    regenerateVerifyToken: useMutation({
      mutationFn: async () => {
        const { data } = await api.post(
          "/integrations/meta/regenerate-verify-token",
        );
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    saveFieldMapping: useMutation({
      mutationFn: async (fieldMapping: Record<string, string>) => {
        const { data } = await api.patch("/integrations/meta/field-mapping", {
          fieldMapping,
        });
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    startOAuth: useMutation({
      mutationFn: async (reconnectAccountId?: string) => {
        const { data } = await api.get("/integrations/meta/oauth/start", {
          params: reconnectAccountId ? { reconnectAccountId } : undefined,
        });
        return data.data as {
          authUrl: string;
          redirectUri: string;
          permissions: string[];
        };
      },
    }),
    addManualPage: useMutation({
      mutationFn: async (payload: {
        pageId: string;
        pageAccessToken: string;
        accountName?: string;
      }) => {
        const { data } = await api.post("/integrations/meta/pages/manual", payload);
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    savePageForms: useMutation({
      mutationFn: async (payload: {
        pageId: string;
        selectedFormIds: string[];
        projectId?: string;
        sourceId?: string;
        teamId?: string;
        telecallerId?: string;
        fieldExecutiveId?: string;
      }) => {
        const { data } = await api.patch(
          `/integrations/meta/pages/${payload.pageId}/forms`,
          {
            selectedFormIds: payload.selectedFormIds,
            projectId: payload.projectId,
            sourceId: payload.sourceId,
            teamId: payload.teamId,
            telecallerId: payload.telecallerId,
            fieldExecutiveId: payload.fieldExecutiveId,
          },
        );
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    disconnectAccount: useMutation({
      mutationFn: async (accountId: string) => {
        const { data } = await api.delete(
          `/integrations/meta/accounts/${accountId}`,
        );
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    toggleAccountPause: useMutation({
      mutationFn: async (payload: { accountId: string; isPaused: boolean }) => {
        const { data } = await api.patch(
          `/integrations/meta/accounts/${payload.accountId}/pause`,
          { isPaused: payload.isPaused },
        );
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    togglePagePause: useMutation({
      mutationFn: async (payload: { pageId: string; isPaused: boolean }) => {
        const { data } = await api.patch(
          `/integrations/meta/pages/${payload.pageId}/pause`,
          { isPaused: payload.isPaused },
        );
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    toggleFormPause: useMutation({
      mutationFn: async (payload: {
        formId: string;
        isPaused: boolean;
        pageId?: string;
      }) => {
        const { data } = await api.patch(
          `/integrations/meta/forms/${payload.formId}/pause`,
          { isPaused: payload.isPaused },
        );
        if (payload.pageId) {
          await queryClient.invalidateQueries({
            queryKey: [...integrationQueryKey, "forms", payload.pageId],
          });
        }
        return data.data as MetaIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
  };
}

export function useMetaLeadForms(pageId: string) {
  return useQuery({
    queryKey: [...integrationQueryKey, "forms", pageId],
    enabled: Boolean(pageId),
    queryFn: async () => {
      const { data } = await api.get("/integrations/meta/forms", {
        params: { pageId },
      });
      return data.data as MetaLeadForm[];
    },
  });
}

export function useMetaDeliveryLogs(page: number) {
  return useQuery({
    queryKey: [...integrationQueryKey, "delivery-logs", page],
    queryFn: async () => {
      const { data } = await api.get("/integrations/meta/delivery-logs", {
        params: { page, limit: 8 },
      });
      return data as {
        data: MetaDeliveryLog[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      };
    },
  });
}
