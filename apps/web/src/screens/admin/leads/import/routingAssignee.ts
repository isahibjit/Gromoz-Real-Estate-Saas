import type { LeadFilterOption } from "../all/useAllLeads";

export interface RoutingAssigneeSelection {
  ownerId: string;
  telecallerId: string;
  fieldExecutiveId: string;
}

const ROUTING_TELECALLER_ROLE = "TELECALLER";
const ROUTING_FIELD_EXECUTIVE_ROLE = "SALES_AGENT";
const ROUTING_OWNER_ROLES = new Set([
  "ADMIN",
  "SUPER_ADMIN",
  "SALES_MANAGER",
  "MANAGER",
  "TEAM_LEADER",
]);

const ROUTING_ASSIGNEE_ROLES = new Set([
  ROUTING_TELECALLER_ROLE,
  ROUTING_FIELD_EXECUTIVE_ROLE,
  ...ROUTING_OWNER_ROLES,
]);

const EMPTY_SELECTION: RoutingAssigneeSelection = {
  ownerId: "",
  telecallerId: "",
  fieldExecutiveId: "",
};

export function getRoutingAssigneeOptions(
  options: readonly LeadFilterOption[],
): LeadFilterOption[] {
  return options.filter(
    (option) =>
      typeof option.role === "string" &&
      ROUTING_ASSIGNEE_ROLES.has(option.role),
  );
}

export function mapRoutingAssigneeSelection(
  value: string,
  options: readonly LeadFilterOption[],
): RoutingAssigneeSelection {
  if (!value) {
    return { ...EMPTY_SELECTION };
  }

  const selectedOption = options.find((option) => option.value === value);
  const role = selectedOption?.role;

  if (role === ROUTING_TELECALLER_ROLE) {
    return { ...EMPTY_SELECTION, telecallerId: value };
  }
  if (role === ROUTING_FIELD_EXECUTIVE_ROLE) {
    return { ...EMPTY_SELECTION, fieldExecutiveId: value };
  }
  if (typeof role === "string" && ROUTING_OWNER_ROLES.has(role)) {
    return { ...EMPTY_SELECTION, ownerId: value };
  }

  return { ...EMPTY_SELECTION };
}
