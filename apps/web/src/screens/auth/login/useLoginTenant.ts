import { useQuery } from "@tanstack/react-query";
import { resolveTenantFromHostname } from "../../../common/tenantResolver";

/** Share the public host lookup between login presentation and tenant branding. */
export function useLoginTenant() {
  return useQuery({
    queryKey: ["login-tenant", window.location.host, window.location.search],
    queryFn: resolveTenantFromHostname,
    staleTime: 60_000,
    retry: false,
  });
}
