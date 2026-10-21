import { useQuery } from "@tanstack/react-query";
import {
  loginTenantQueryKey,
  resolveTenantFromHostname,
} from "../../../common/tenantResolver";

/** Share host verification between app entry, login and tenant branding. */
export function useLoginTenant() {
  return useQuery({
    queryKey: loginTenantQueryKey(),
    queryFn: resolveTenantFromHostname,
    staleTime: 60_000,
    retry: false,
  });
}
