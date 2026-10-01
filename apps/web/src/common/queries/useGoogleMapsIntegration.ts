import { useQuery } from "@tanstack/react-query";

import { api } from "../api";
import { currentOrganizationId } from "../tenantRequestScope";

export interface GoogleMapsMetadata {
  readonly configured: boolean;
  readonly keyHint: string | null;
  readonly updatedAt: string | null;
}

interface GoogleMapsRuntimeConfig {
  readonly configured: boolean;
  readonly apiKey: string | null;
}

export function googleMapsMetadataQueryKey(organizationId: string) {
  return ["integrations", "google-maps", "metadata", organizationId] as const;
}

export function googleMapsRuntimeQueryKey(organizationId: string) {
  return ["integrations", "google-maps", "runtime", organizationId] as const;
}

export function useGoogleMapsMetadata() {
  const organizationId = currentOrganizationId() ?? "unscoped";
  return useQuery({
    queryKey: googleMapsMetadataQueryKey(organizationId),
    queryFn: async () =>
      (await api.get<GoogleMapsMetadata>("/integrations/google-maps")).data,
    enabled: organizationId !== "unscoped",
  });
}

export function useGoogleMapsRuntimeConfig() {
  const organizationId = currentOrganizationId() ?? "unscoped";
  const query = useQuery({
    queryKey: googleMapsRuntimeQueryKey(organizationId),
    queryFn: async () =>
      (
        await api.get<GoogleMapsRuntimeConfig>(
          "/integrations/google-maps/runtime",
        )
      ).data,
    enabled: organizationId !== "unscoped",
    retry: false,
  });
  const tenantApiKey = query.data?.apiKey?.trim() || undefined;
  const hostname = typeof window === "undefined" ? "" : window.location.hostname;
  const isLocalDevelopment =
    import.meta.env.DEV && (hostname === "localhost" || hostname === "127.0.0.1");
  const developmentApiKey = isLocalDevelopment
    ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim()
    : undefined;

  return {
    apiKey: tenantApiKey ?? developmentApiKey,
    isUsingDevelopmentFallback: !tenantApiKey && Boolean(developmentApiKey),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
