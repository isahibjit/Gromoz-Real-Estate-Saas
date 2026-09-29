export type NotificationDestination =
  | "all-leads"
  | "follow-ups"
  | "site-visits"
  | "notifications";

const destinations = new Set<NotificationDestination>([
  "all-leads",
  "follow-ups",
  "site-visits",
  "notifications",
]);

function isDestination(value: unknown): value is NotificationDestination {
  return typeof value === "string" && destinations.has(value as NotificationDestination);
}

function fallbackPath(details: Record<string, unknown>) {
  const path =
    typeof details.webPath === "string"
      ? details.webPath
      : typeof details.followUpWebPath === "string"
        ? details.followUpWebPath
        : null;
  return path?.startsWith("/") ? path : null;
}

export function resolveNotificationPath(
  details: Record<string, unknown> | null | undefined,
  role?: string | null,
) {
  if (!details) return null;
  const destination = details.destination;
  if (!isDestination(destination)) return fallbackPath(details);

  if (destination === "all-leads") {
    if (role === "SALES_AGENT") return "/field-executive/leads";
    if (role === "TELECALLER") return "/telecaller/leads/my";
    return "/leads/all";
  }
  if (destination === "follow-ups") {
    if (role === "SALES_AGENT") return "/field-executive/follow-ups";
    if (role === "TELECALLER") return "/telecaller/follow-ups";
    return "/leads/follow-up";
  }
  if (destination === "site-visits") {
    return role === "SALES_AGENT"
      ? "/field-executive/site-visits"
      : "/leads/site-visits";
  }
  return "/notifications";
}
