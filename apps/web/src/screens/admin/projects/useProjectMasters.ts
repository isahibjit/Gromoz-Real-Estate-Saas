import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "../../../common/api";

export interface MasterOption {
  label: string;
  value: string;
}

interface ApiMasterValue {
  id: string;
  name: string;
  code?: string | null;
  isActive?: boolean;
}

const uniqueOptions = (options: MasterOption[]) => {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function useMasterOptions(category: string, fallback: MasterOption[]) {
  const query = useQuery({
    queryKey: ["lead-masters", category],
    queryFn: async () => {
      const { data } = await api.get(`/lead-masters/${category}`, {
        params: { limit: 100 },
      });
      return (data.data as ApiMasterValue[])
        .filter((item) => item.isActive !== false)
        .map((item) => ({ label: item.name, value: item.name }));
    },
  });

  const options = useMemo(
    () => uniqueOptions([...(query.data ?? []), ...fallback]),
    [fallback, query.data],
  );

  return { ...query, options };
}

export const toOptions = (values: string[]): MasterOption[] =>
  values.map((value) => ({ label: value, value }));
