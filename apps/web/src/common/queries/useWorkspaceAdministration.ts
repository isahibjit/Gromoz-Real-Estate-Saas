import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../../store";
import { api } from "../api";
import {
  currentOrganizationId,
  currentOrganizationSlug,
} from "../tenantRequestScope";
interface WorkspaceMembership {
  organizationId: string;
  slug: string;
  role: string;
  isOwner: boolean;
}
/** UI visibility follows the active membership. Server guards remain authoritative. */
export function useWorkspaceAdministration() {
  const user = useAppSelector((state) => state.auth.user);
  const organizationId = currentOrganizationId(),
    slug = currentOrganizationSlug();
  const hasSelection = Boolean(organizationId || slug);
  const query = useQuery({
    queryKey: ["workspace-administration", user?.id, organizationId, slug],
    queryFn: async () => {
      const { data } = await api.get<WorkspaceMembership[]>(
        "/organizations/my-orgs",
      );
      if (!Array.isArray(data))
        throw new Error("Invalid workspace membership response");
      return data;
    },
    enabled: Boolean(user) && user?.role !== "SUPER_ADMIN" && hasSelection,
    retry: false,
    staleTime: 60000,
  });
  const membership = query.data?.find((entry) =>
    organizationId
      ? entry.organizationId === organizationId
      : entry.slug === slug,
  );
  return {
    canManage:
      user?.role !== "SUPER_ADMIN" &&
      (hasSelection
        ? Boolean(membership?.isOwner || membership?.role === "ADMIN")
        : user?.role === "ADMIN"),
    isPending:
      Boolean(user) &&
      user?.role !== "SUPER_ADMIN" &&
      hasSelection &&
      query.isPending,
    isError: query.isError,
    retry: query.refetch,
  };
}
