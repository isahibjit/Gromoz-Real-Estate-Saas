export function getUserRoleLabel(role?: string | null) {
  if (!role) return '-';
  const normalized = role.trim().toUpperCase();
  if (normalized === 'TELECALLER') return 'Pre Sales';
  if (
    normalized === 'BACKEND' ||
    normalized === 'BACKOFFICE' ||
    normalized === 'BACK_END_EXECUTIVE' ||
    normalized === 'BACKEND_EXECUTIVE'
  ) {
    return 'Back-End Executive';
  }
  if (normalized === 'SALES_AGENT' || normalized === 'FIELD_EXECUTIVE') {
    return 'Field Executive';
  }
  if (normalized === 'TEAM_LEADER') return 'Team Leader';
  if (normalized === 'SALES_MANAGER') return 'Sales Manager';
  if (normalized === 'SUPER_ADMIN') return 'Super Admin';
  return role
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
