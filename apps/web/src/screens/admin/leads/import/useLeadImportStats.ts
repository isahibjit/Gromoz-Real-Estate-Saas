import { useQuery } from "@tanstack/react-query";

import { api } from "../../../../common/api";
import { currentOrganizationId } from "../../../../common/tenantRequestScope";
import type { ConnectorSummary } from "./leadSourceRegistry";

export interface LeadImportStatsResponse {
  readonly sourceCounts: Record<string, number>;
  readonly connectors: ConnectorSummary[];
  readonly totalLeads: number;
  readonly newLeads: number;
  readonly duplicates: number;
  readonly totalImports: number;
}

export function leadImportStatsQueryKey(organizationId: string) {
  return ["lead-import-stats", organizationId] as const;
}

export function useLeadImportStats() {
  const organizationId = currentOrganizationId() ?? "unscoped";
  return useQuery({
    queryKey: leadImportStatsQueryKey(organizationId),
    queryFn: async () =>
      (await api.get<LeadImportStatsResponse>("/lead-imports/stats")).data,
    enabled: organizationId !== "unscoped",
  });
}
