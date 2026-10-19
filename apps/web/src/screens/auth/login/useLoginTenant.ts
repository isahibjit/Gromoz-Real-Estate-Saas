import { useQuery } from "@tanstack/react-query";
import {
  loginTenantQueryKey,
  resolveTenantFromHostname,
} from "../../../common/tenantResolver";

/** Share the public host lookup between login presentation and tenant branding. */
export function useLoginTenant() {
  return useQuery({
    queryKey: loginTenantQueryKey(),
    queryFn: resolveTenantFromHostname,
    staleTime: 60_000,
    retry: false,
  });
}
