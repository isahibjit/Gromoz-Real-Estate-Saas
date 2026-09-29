import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export function useNotificationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
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
