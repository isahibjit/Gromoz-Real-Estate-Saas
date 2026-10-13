import type { MetaRoutingSettings } from "@truroot/shared";
// Match authSchemas: Vite consumes the shared source, while Nest uses its build.
export { resolveMetaRouting } from "../../../../../../../../packages/shared/src/meta-routing";

export interface MetaPageRoutingDraft {
  selectedFormIds: readonly string[];
  projectId: string;
  sourceId: string;
  teamId: string;
  ownerId: string;
  telecallerId: string;
  fieldExecutiveId: string;
}

export function hasUnsavedMetaPageConfiguration(
  settings: MetaRoutingSettings & {
    pageFormSelections: Record<string, string[]>;
  },
  pageId: string,
  draft: MetaPageRoutingDraft,
) {
  const assignment = settings.pageAssignmentOverrides[pageId];
  return (
    draft.projectId !== (settings.pageProjectMappings[pageId] ?? "") ||
    draft.sourceId !== (settings.pageSourceMappings[pageId] ?? "") ||
    draft.teamId !== (settings.pageTeamMappings[pageId] ?? "") ||
    draft.ownerId !== (assignment?.ownerId ?? "") ||
    draft.telecallerId !== (assignment?.telecallerId ?? "") ||
    draft.fieldExecutiveId !== (assignment?.fieldExecutiveId ?? "") ||
    JSON.stringify([...draft.selectedFormIds].sort()) !==
      JSON.stringify([...(settings.pageFormSelections[pageId] ?? [])].sort())
  );
}
