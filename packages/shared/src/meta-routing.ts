import { z } from "zod";

const routingId = z.string().trim().min(1, "Select a valid CRM record");

const personAssignment = z
  .object({
    mode: z.literal("person"),
    ownerId: routingId.optional(),
    telecallerId: routingId.optional(),
    fieldExecutiveId: routingId.optional(),
  })
  .strict()
  .refine(
    (value) =>
      [value.ownerId, value.telecallerId, value.fieldExecutiveId].filter(
        Boolean,
      ).length === 1,
    "Select exactly one person for the form",
  );

export const MetaFormRoutingSchema = z
  .object({
    projectId: routingId.nullable().optional(),
    sourceId: routingId.nullable().optional(),
    assignment: z
      .union([
        personAssignment,
        z
          .object({
            mode: z.literal("automatic"),
            teamId: routingId.nullable(),
          })
          .strict(),
      ])
      .optional(),
  })
  .strict();

export type MetaFormRoutingOverride = z.infer<typeof MetaFormRoutingSchema>;
export type MetaFormRoutingOverrides = Record<
  string,
  Record<string, MetaFormRoutingOverride>
>;
export interface MetaPageAssignment {
  ownerId?: string;
  telecallerId?: string;
  fieldExecutiveId?: string;
}
export interface MetaRoutingSettings {
  pageProjectMappings: Record<string, string>;
  pageSourceMappings: Record<string, string>;
  pageTeamMappings: Record<string, string>;
  pageAssignmentOverrides: Record<string, MetaPageAssignment>;
  formRoutingOverrides?: MetaFormRoutingOverrides;
}

/** Resolve configuration only; the API validates availability before ingestion. */
export function resolveMetaRouting(
  settings: MetaRoutingSettings,
  pageId: string,
  formId: string,
) {
  const form = settings.formRoutingOverrides?.[pageId]?.[formId];
  const assignment = form?.assignment;
  const pageAssignment = settings.pageAssignmentOverrides[pageId] ?? {};
  const person: MetaPageAssignment =
    assignment?.mode === "person"
      ? {
          ...(assignment.ownerId ? { ownerId: assignment.ownerId } : {}),
          ...(assignment.telecallerId
            ? { telecallerId: assignment.telecallerId }
            : {}),
          ...(assignment.fieldExecutiveId
            ? { fieldExecutiveId: assignment.fieldExecutiveId }
            : {}),
        }
      : assignment?.mode === "automatic"
      ? {}
      : pageAssignment;
  const projectId =
    form?.projectId !== undefined
      ? form.projectId
      : settings.pageProjectMappings[pageId] ?? null;
  const sourceId =
    form?.sourceId !== undefined
      ? form.sourceId
      : settings.pageSourceMappings[pageId] ?? null;
  const teamId =
    assignment?.mode === "automatic"
      ? assignment.teamId
      : assignment?.mode === "person"
      ? null
      : settings.pageTeamMappings[pageId] ?? null;
  return {
    projectId,
    sourceId,
    teamId,
    ...person,
    scope:
      form && Object.keys(form).length ? ("form" as const) : ("page" as const),
    fieldScopes: {
      project:
        form?.projectId !== undefined ? ("form" as const) : ("page" as const),
      source:
        form?.sourceId !== undefined ? ("form" as const) : ("page" as const),
      assignment: assignment ? ("form" as const) : ("page" as const),
    },
  };
}
