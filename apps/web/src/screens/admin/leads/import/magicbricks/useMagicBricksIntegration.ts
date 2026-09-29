import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "../../../../../common/api";

export interface MagicBricksFieldOption {
  value: string;
  label: string;
  required: boolean;
}

export interface MagicBricksSourceField {
  key: string;
  label: string;
  sample: string;
}

export interface MagicBricksManualDetails {
  crmName: string;
  pushIntegrationType: string;
  apiKey: string;
  workingEndpointOpenUrl: string;
  parametersToBePassedWithValues: Record<string, string>;
  completeWorkingEndpointUrl: string;
  responseMessageOnLeadSharing: {
    success: string;
    failure: string;
  };
  authenticationType: string;
  clientId: string;
  clientKey: string;
  integrationManual: string[];
}

export interface MagicBricksIntegrationStats {
  totalImportedThisMonth: number;
  lastImportedAt: string | null;
}

export interface MagicBricksIntegrationConfig {
  id: string;
  provider: string;
  displayName: string;
  crmName: string;
  status: string;
  isActive: boolean;
  apiKey: string;
  apiKeyPreview: string;
  endpointUrl: string;
  completeWorkingEndpointUrl: string;
  pushIntegrationType: string;
  authenticationType: string;
  responseMessages: {
    success: string;
    failure: string;
  };
  fieldMapping: Record<string, string>;
  fieldOptions: MagicBricksFieldOption[];
  sourceFields: MagicBricksSourceField[];
  manual: MagicBricksManualDetails;
  stats: MagicBricksIntegrationStats;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastLeadReceivedAt: string | null;
  totalLeadsReceived: number;
  notes: string;
}

export interface MagicBricksTestResult {
  valid: boolean;
  status: string;
  endpointUrl: string;
  apiKey: string;
  samplePayload: Record<string, string>;
  normalizedLead: {
    leadName: string;
    mobileNumber: string;
    emailAddress: string;
    preferredProjectId?: string;
    preferredProjectName?: string;
    preferredLocation?: string;
    leadSourceName?: string;
    leadSourceId?: string;
    remarks?: string;
    configuration?: string;
    propertyType?: string;
  };
  duplicate: {
    id: string;
    displayId?: string;
    name: string;
  } | null;
  wouldCreateLead: boolean;
  errors: string[];
  responseMessages: {
    success: string;
    failure: string;
  };
}

const integrationQueryKey = ["lead-imports", "magicbricks"] as const;

export function useMagicBricksIntegration() {
  return useQuery({
    queryKey: integrationQueryKey,
    queryFn: async () => {
      const { data } = await api.get("/integrations/magicbricks");
      return data.data as MagicBricksIntegrationConfig;
    },
  });
}

export function useMagicBricksIntegrationMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: integrationQueryKey });
    await queryClient.invalidateQueries({ queryKey: ["lead-imports"] });
  };

  return {
    saveConfig: useMutation({
      mutationFn: async (payload: {
        isActive?: boolean;
        notes?: string;
        status?: string;
      }) => {
        const { data } = await api.patch("/integrations/magicbricks", payload);
        return data.data as MagicBricksIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    regenerateApiKey: useMutation({
      mutationFn: async () => {
        const { data } = await api.post(
          "/integrations/magicbricks/generate-api-key",
        );
        return data.data as MagicBricksIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    saveFieldMapping: useMutation({
      mutationFn: async (fieldMapping: Record<string, string>) => {
        const { data } = await api.patch(
          "/integrations/magicbricks/field-mapping",
          { fieldMapping },
        );
        return data.data as MagicBricksIntegrationConfig;
      },
      onSuccess: invalidate,
    }),
    testConnection: useMutation({
      mutationFn: async (samplePayload?: Record<string, string>) => {
        const { data } = await api.post("/integrations/magicbricks/test", {
          samplePayload,
        });
        return data.data as MagicBricksTestResult;
      },
      onSuccess: invalidate,
    }),
  };
}
