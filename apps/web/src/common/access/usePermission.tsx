import { useMemo } from "react";
import { useAppSelector } from "../../store";
import { canAccess, type PermissionAction } from "./access";

export function usePermission(moduleKey: string) {
  const user = useAppSelector((state) => state.auth.user);

  return useMemo(
    () => ({
      canView: canAccess(user, moduleKey, "view"),
      canCreate: canAccess(user, moduleKey, "create"),
      canUpdate: canAccess(user, moduleKey, "update"),
      canDelete: canAccess(user, moduleKey, "delete"),
      canPunchIn: canAccess(user, moduleKey, "punchIn"),
      canPunchOut: canAccess(user, moduleKey, "punchOut"),
    }),
    [user, moduleKey],
  );
}

export interface PermissionGuardProps {
  moduleKey: string;
  action?: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  moduleKey,
  action = "view",
  children,
  fallback = null,
}: PermissionGuardProps) {
  const user = useAppSelector((state) => state.auth.user);

  if (!canAccess(user, moduleKey, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
