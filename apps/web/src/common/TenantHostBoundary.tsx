import type { PropsWithChildren } from "react";
import { TenantNotFoundError } from "./tenantResolver";
import { useLoginTenant } from "../screens/auth/login/useLoginTenant";
import { TenantHostStatusScreen } from "../screens/public/TenantHostStatusScreen";

/** Verify tenant hosts before mounting routes or refreshing an existing session. */
export function TenantHostBoundary({ children }: PropsWithChildren) {
  const tenantQuery = useLoginTenant();
  if (tenantQuery.isPending || tenantQuery.isFetching || tenantQuery.isError) {
    return (
      <TenantHostStatusScreen
        host={window.location.hostname}
        state={
          tenantQuery.isPending || tenantQuery.isFetching
            ? "loading"
            : tenantQuery.error instanceof TenantNotFoundError
            ? "not-found"
            : "error"
        }
        onRetry={() => {
          void tenantQuery.refetch();
        }}
      />
    );
  }
  return children;
}
