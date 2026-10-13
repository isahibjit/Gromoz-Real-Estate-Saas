export interface ExistingLeadAssignments {
  readonly ownerId?: string;
  readonly telecallerId?: string;
  readonly fieldExecutiveId?: string;
}

interface LeadAssignmentDisplay extends ExistingLeadAssignments {
  readonly ownerName?: string;
  readonly telecallerName?: string;
  readonly fieldExecutiveName?: string;
}

export function getPreSalesAssignmentId(lead: ExistingLeadAssignments): string {
  return lead.telecallerId && lead.telecallerId !== lead.fieldExecutiveId
    ? lead.telecallerId
    : "";
}

export function getLeadAssignmentEntries(lead: LeadAssignmentDisplay) {
  const entries: Array<{ label: string; value: string }> = [];
  const duplicateSalesAssignment =
    Boolean(lead.telecallerId) &&
    lead.telecallerId === lead.fieldExecutiveId &&
    Boolean(lead.fieldExecutiveName);

  if (lead.telecallerName && !duplicateSalesAssignment) {
    entries.push({ label: "Pre Sales Executive", value: lead.telecallerName });
  }
  if (lead.fieldExecutiveName) {
    entries.push({ label: "Sales Executive", value: lead.fieldExecutiveName });
  }
  if (!entries.length && lead.ownerName) {
    entries.push({ label: "Owner", value: lead.ownerName });
  }
  return entries;
}

export interface LeadAssignmentChange {
  readonly toUserId: string;
  readonly assigneeType: "telecaller" | "field-executive";
}

interface LeadAssignmentSelection {
  readonly telecallerId: string;
  readonly fieldExecutiveId: string;
}

export interface LeadAssignmentChanges {
  readonly assignments: LeadAssignmentChange[];
  readonly telecallerUnchangedForAll: boolean;
  readonly fieldExecutiveUnchangedForAll: boolean;
}

export function buildLeadAssignmentChanges(
  leads: readonly ExistingLeadAssignments[],
  selection: LeadAssignmentSelection,
): LeadAssignmentChanges {
  const telecallerUnchangedForAll =
    Boolean(selection.telecallerId) &&
    leads.length > 0 &&
    leads.every(
      (lead) => getPreSalesAssignmentId(lead) === selection.telecallerId,
    );
  const fieldExecutiveUnchangedForAll =
    Boolean(selection.fieldExecutiveId) &&
    leads.length > 0 &&
    leads.every(
      (lead) => (lead.fieldExecutiveId ?? "") === selection.fieldExecutiveId,
    );

  return {
    telecallerUnchangedForAll,
    fieldExecutiveUnchangedForAll,
    assignments: [
      ...(selection.telecallerId && !telecallerUnchangedForAll
        ? [
            {
              toUserId: selection.telecallerId,
              assigneeType: "telecaller" as const,
            },
          ]
        : []),
      ...(selection.fieldExecutiveId && !fieldExecutiveUnchangedForAll
        ? [
            {
              toUserId: selection.fieldExecutiveId,
              assigneeType: "field-executive" as const,
            },
          ]
        : []),
    ],
  };
}
