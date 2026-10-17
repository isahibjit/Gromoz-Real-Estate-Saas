import { CanceledError } from "axios";
import { isPlatformHost } from "@truroot/shared";

export const ACTIVE_ORGANIZATION_KEY = "active_organization_id";

export function currentOrganizationId(): string | null {
  return localStorage.getItem(ACTIVE_ORGANIZATION_KEY);
}

export function isPlatformView(role?: string, pathname = window.location.pathname): boolean {
  if (role !== "SUPER_ADMIN") return false;
  if (pathname === "/superadmin" || pathname.startsWith("/superadmin/")) return true;
  // If user is on a tenant subdomain, SuperAdmin is in tenant inspection mode
  if (!isPlatformHost(window.location.hostname)) {
    return false;
  }
  return !currentOrganizationId();
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
