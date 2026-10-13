export interface ExistingLeadAssignments {
  readonly ownerId?: string;
  readonly telecallerId?: string;
  readonly fieldExecutiveId?: string;
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
      (lead) =>
        (lead.telecallerId ?? lead.ownerId ?? "") === selection.telecallerId,
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
