import { api } from "./api";
import { isPlatformHost, tenantSlugFromHost } from "@truroot/shared";

export interface ResolvedTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  brandingPrimaryColor?: string | null;
  brandingSecondaryColor?: string | null;
  status: string;
  showLogoInLogin?: boolean;
  loginCms?: any;
}

export const resolveTenantFromHostname = () => resolveTenantFromHost();

export class TenantNotFoundError extends Error {
  constructor(readonly host: string) {
    super("No workspace exists at this address.");
    this.name = "TenantNotFoundError";
  }
}

type TenantResolutionResponse =
  | { found: false }
  | { found: true; organization: ResolvedTenant };

export function loginTenantQueryKey() {
  return [
    "login-tenant",
    window.location.host,
    isPlatformHost(window.location.hostname) ? window.location.search : "",
  ] as const;
}

function clearResolvedTenant() {
  localStorage.removeItem("active_organization_id");
  localStorage.removeItem("active_organization_slug");
  localStorage.removeItem("active_organization_data");
}

export async function resolveTenantFromHost(
  location?: Pick<Location, "hostname" | "search">,
): Promise<ResolvedTenant | null> {
  if (typeof window === "undefined") return null;

  location ??= window.location;
  const hostname = location.hostname.toLowerCase();
  const platformHost = isPlatformHost(hostname);
  const urlParams = new URLSearchParams(location.search);
  const explicitOrg =
    urlParams.get("org") || urlParams.get("tenant") || urlParams.get("slug");

  clearResolvedTenant();
  if (platformHost && !explicitOrg) return null;

  // A tenant hostname is authoritative; query parameters cannot substitute a
  // different workspace. Explicit workspace links still work on platform hosts.
  const lookupHost = platformHost && explicitOrg ? explicitOrg : hostname;
  const hostSlug = tenantSlugFromHost(lookupHost);
  if (hostSlug) {
    localStorage.setItem("active_organization_slug", hostSlug);
  }

  try {
    const response = await api.get<TenantResolutionResponse>(
      `/organizations/resolve-domain?host=${encodeURIComponent(lookupHost)}`,
      { timeout: 10_000 },
    );
    if (response.data?.found === false) {
      throw new TenantNotFoundError(lookupHost);
    }
    if (response.data?.found === true && response.data.organization) {
      const org = response.data.organization;
      if (!org.id || !org.slug || !org.name || !org.status) {
        throw new Error("Workspace lookup returned an incomplete response.");
      }
      localStorage.setItem("active_organization_id", org.id);
      localStorage.setItem("active_organization_slug", org.slug);
      localStorage.setItem("active_organization_data", JSON.stringify(org));
      return org;
    }
    throw new Error("Workspace lookup returned an invalid response.");
  } catch (error) {
    clearResolvedTenant();
    // Network failures must remain distinguishable from a confirmed missing tenant.
    throw error;
  }
}
