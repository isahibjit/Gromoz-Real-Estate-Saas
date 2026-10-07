import type { LeadRow } from "./allLeadsTypes";

export type LeadMasterCategory = "status" | "lead_type";
type LeadMasterFields = Pick<LeadRow, "statusId" | "temperatureId">;

export function matchesLeadMasterValue(
  lead: LeadMasterFields,
  category: LeadMasterCategory,
  masterId: string,
) {
  return category === "status"
    ? lead.statusId === masterId
    : lead.temperatureId === masterId;
}

export function countLeadMasterValueMatches(
  leads: readonly LeadMasterFields[],
  category: LeadMasterCategory,
  masterId: string,
) {
  return leads.filter((lead) =>
    matchesLeadMasterValue(lead, category, masterId),
  ).length;
}
