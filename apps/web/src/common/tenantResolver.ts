import { api } from "./api";
import { isPlatformHost } from "@truroot/shared";

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

export const resolveTenantFromHostname = resolveTenantFromHost;

export async function resolveTenantFromHost(): Promise<ResolvedTenant | null> {
  if (typeof window === "undefined") return null;

  const urlParams = new URLSearchParams(window.location.search);
  const explicitOrg = urlParams.get("org") || urlParams.get("tenant") || urlParams.get("slug");

  if (explicitOrg) {
    try {
      const response = await api.get(`/organizations/resolve-domain?host=${encodeURIComponent(explicitOrg)}`);
      if (response.data?.found && response.data?.organization) {
        localStorage.setItem("active_organization_id", response.data.organization.id);
        localStorage.setItem("active_organization_slug", response.data.organization.slug);
        return response.data.organization;
      }
    } catch {
      // continue
    }
  }

  const hostname = window.location.hostname.toLowerCase();

  // Platform login must not inherit another workspace's cached branding.
  if (isPlatformHost(hostname)) return null;

  try {
    const response = await api.get(`/organizations/resolve-domain?host=${encodeURIComponent(hostname)}`);
    if (response.data?.found && response.data?.organization) {
      const org = response.data.organization;
      localStorage.setItem("active_organization_id", org.id);
      localStorage.setItem("active_organization_slug", org.slug);
      localStorage.setItem("active_organization_data", JSON.stringify(org));
      return org;
    }
  } catch (err) {
    console.warn("Domain resolution check failed", err);
  }

  return null;
}
