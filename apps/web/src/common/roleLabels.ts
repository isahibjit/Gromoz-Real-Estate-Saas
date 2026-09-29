export function getUserRoleLabel(role?: string | null) {
  if (!role) return "-";
  const normalized = role.trim().toUpperCase();
  if (normalized === "SUPER_ADMIN" || normalized === "ADMIN") return "Admin";
  if (normalized === "SALES_MANAGER" || normalized === "MANAGER") return "Manager";
  if (normalized === "TEAM_LEADER" || normalized === "TL") return "Team Leader";
  if (
    normalized === "TELECALLER" ||
    normalized === "PRE_SALES" ||
    normalized === "PRE_SALES_EXECUTIVE"
  ) {
    return "Pre Sales Executive";
  }
  if (
    normalized === "SALES_AGENT" ||
    normalized === "FIELD_EXECUTIVE" ||
    normalized === "SALES_EXECUTIVE"
  ) {
    return "Sales Executive";
  }
  if (
    normalized === "BACKEND" ||
    normalized === "BACKOFFICE" ||
    normalized === "OPS" ||
    normalized === "BACK_END_EXECUTIVE" ||
    normalized === "BACKEND_EXECUTIVE"
  ) {
    return "Back-End Executive";
  }
  if (normalized === "HR") return "HR";

  return role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
