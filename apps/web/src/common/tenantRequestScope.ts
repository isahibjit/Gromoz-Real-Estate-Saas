import { CanceledError } from "axios";

export const ACTIVE_ORGANIZATION_KEY = "active_organization_id";

export function currentOrganizationId(): string | null {
  return localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
}

export function isPlatformView(role?: string, pathname = window.location.pathname): boolean {
  return role === "SUPER_ADMIN" && (
    pathname === "/superadmin" || pathname.startsWith("/superadmin/") ||
    !currentOrganizationId()
  );
}

export function assertCurrentOrganization(
  organizationId: string | null | undefined,
): void {
  if (
    organizationId !== undefined &&
    organizationId !== currentOrganizationId()
  ) {
    throw new CanceledError(
      "Workspace changed while this request was in progress",
    );
  }
}
