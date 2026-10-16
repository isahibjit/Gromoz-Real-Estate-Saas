import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export interface StatusMasterItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  sortOrder: number;
  displayColor?: string;
  tagColor?: string;
  icon?: string;
  showInStatsCard: boolean;
  showInFilterBar: boolean;
  isActive: boolean;
}

const hasUsableMasterName = (
  item: StatusMasterItem | null | undefined,
): item is StatusMasterItem =>
  Boolean(
    item &&
      typeof item.id === "string" &&
      item.id.trim() &&
      typeof item.name === "string" &&
      item.name.trim(),
  );

const sanitizeMasterItems = (
  items?: Array<StatusMasterItem | null | undefined> | null,
) => (items ?? []).filter(hasUsableMasterName);

export function useLeadStatusMaster() {
  const query = useQuery({
    queryKey: ["lead-masters", "status"],
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      const { data } = await api.get<{
        data: Array<StatusMasterItem | null | undefined>;
      }>("/lead-masters/status");
      return sanitizeMasterItems(data.data);
    },
    staleTime: 5 * 60 * 1000,
  });

  const statuses = useMemo(
    () =>
      sanitizeMasterItems(query.data).sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [query.data],
  );

  const statsCardStatuses = useMemo(
    () => statuses.filter((s) => s.isActive && s.showInStatsCard !== false),
    [statuses],
  );

  const filterBarStatuses = useMemo(
    () => statuses.filter((s) => s.isActive && s.showInFilterBar !== false),
    [statuses],
  );

  return {
    ...query,
    allStatuses: statuses,
    statsCardStatuses,
    filterBarStatuses,
  };
}

export function useLeadTypeMaster() {
  const query = useQuery({
    queryKey: ["lead-masters", "temperature"],
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      const { data } = await api.get<{
        data: Array<StatusMasterItem | null | undefined>;
      }>("/lead-masters/temperature");
      return sanitizeMasterItems(data.data);
    },
    staleTime: 5 * 60 * 1000,
  });

  const leadTypes = useMemo(
    () =>
      sanitizeMasterItems(query.data).sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [query.data],
  );

  const statsCardLeadTypes = useMemo(
    () => leadTypes.filter((s) => s.isActive && s.showInStatsCard !== false),
    [leadTypes],
  );

  const filterBarLeadTypes = useMemo(
    () => leadTypes.filter((s) => s.isActive && s.showInFilterBar !== false),
    [leadTypes],
  );

  return {
    ...query,
    allLeadTypes: leadTypes,
    statsCardLeadTypes,
    filterBarLeadTypes,
  };
}
