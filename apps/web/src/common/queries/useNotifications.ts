import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "../api";

export interface ApiNotificationRow {
  id: string;
  userId?: string;
  type: string;
  title: string;
  description?: string;
  badge?: string;
  message?: string;
  details?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  readAt?: string;
  createdAt: string;
}

export function useNotifications(
  params?: Record<string, any>,
): UseQueryResult<{ rows: ApiNotificationRow[]; total: number }, Error> {
  return useQuery({
    queryKey: ["notifications", params],
    queryFn: async () => {
      const { data } = await api.get("/notifications", { params });
      return {
        rows: data.data as ApiNotificationRow[],
        total: data.meta.total as number,
      };
    },
  });
}
