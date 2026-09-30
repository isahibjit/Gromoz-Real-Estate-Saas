import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { currentOrganizationId } from "../tenantRequestScope";

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const organizationId = currentOrganizationId() ?? "unscoped";
  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["notifications", organizationId],
    });
  };

  return {
    markRead: useMutation({
      mutationFn: async (id: string) =>
        (await api.patch(`/notifications/${id}/read`)).data,
      onSuccess: invalidate,
    }),
    markAllRead: useMutation({
      mutationFn: async () =>
        (await api.patch(`/notifications/mark-all-read`)).data,
      onSuccess: invalidate,
    }),
  };
}
