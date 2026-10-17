import { z } from "zod";

export const TENANT_BASE_DOMAIN = "gromoze.com";
export const PLATFORM_HOST = `crm.${TENANT_BASE_DOMAIN}`;
const RESERVED_SLUGS = new Set([
  "crm",
  "www",
  "api",
  "app",
  "admin",
  "superadmin",
  "platform",
  "localhost",
  "mail",
  "smtp",
  "imap",
  "pop",
  "ftp",
  "cpanel",
  "webmail",
  "autodiscover",
  "autoconfig",
  "support",
  "status",
  "cdn",
  "assets",
  "uploads",
  "billing",
  "auth",
  "ns1",
  "ns2",
  "cname",
]);

export const TenantSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(63)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Use letters, numbers and internal hyphens only",
  )
  .refine(
    (slug) => !RESERVED_SLUGS.has(slug),
    "This subdomain is reserved for the platform",
  );

export function tenantWorkspaceUrl(slug: string): string {
  return `https://${TenantSlugSchema.parse(slug)}.${TENANT_BASE_DOMAIN}`;
}

export function normalizeTenantHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function isPlatformHost(host: string): boolean {
  return [
    TENANT_BASE_DOMAIN,
    PLATFORM_HOST,
    `www.${TENANT_BASE_DOMAIN}`,
    "localhost",
    "127.0.0.1",
  ].includes(normalizeTenantHost(host));
}

/** Accept only an exact platform subdomain or an explicit slug, never another domain's first label. */
export function tenantSlugFromHost(host: string): string | null {
  const normalized = normalizeTenantHost(host);
  const suffix = `.${TENANT_BASE_DOMAIN}`;
  const candidate = normalized.endsWith(suffix)
    ? normalized.slice(0, -suffix.length)
    : normalized;
  const parsed = TenantSlugSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function workspaceIsAccessible(organization: {
  status: string;
  setupFeePaid: boolean;
  trialEndsAt?: Date | string | null;
}): boolean {
  return (
    (organization.status === "ACTIVE" && organization.setupFeePaid) ||
    (organization.status === "TRIAL" &&
      organization.trialEndsAt != null &&
      new Date(organization.trialEndsAt).getTime() > Date.now())
  );
}
