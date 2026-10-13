import { useState } from "react";
import type {
  MetaFormRoutingOverride,
  MetaRoutingSettings,
} from "@truroot/shared";
import { resolveMetaRouting } from "./metaRouting";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  SearchableSelect,
} from "ui";
import type { LeadFilterOption } from "../../all/useAllLeads";
import { getApiErrorMessage } from "../../../../../common/apiError";
import { mapRoutingAssigneeSelection } from "../routingAssignee";

const INHERIT = "__page__";
const DEFAULT = "__default__";
type AssignmentMode = "inherit" | "person" | "automatic";

interface Props {
  pageId: string;
  formId: string;
  formName: string;
  settings: MetaRoutingSettings;
  projectOptions: readonly LeadFilterOption[];
  sourceOptions: readonly LeadFilterOption[];
  teamOptions: readonly LeadFilterOption[];
  assigneeOptions: readonly LeadFilterOption[];
  onSave: (routing: MetaFormRoutingOverride) => Promise<void>;
  onClose: () => void;
}

export function MetaFormRoutingDialog(props: Props) {
  const saved =
    props.settings.formRoutingOverrides?.[props.pageId]?.[props.formId];
  const [projectId, setProjectId] = useState(
    saved?.projectId === undefined ? INHERIT : saved.projectId ?? DEFAULT,
  );
  const [sourceId, setSourceId] = useState(
    saved?.sourceId === undefined ? INHERIT : saved.sourceId ?? DEFAULT,
  );
  const [mode, setMode] = useState<AssignmentMode>(
    saved?.assignment?.mode ?? "inherit",
  );
  const [teamId, setTeamId] = useState(
    saved?.assignment?.mode === "automatic"
      ? saved.assignment.teamId ?? ""
      : "",
  );
  const [assigneeId, setAssigneeId] = useState(
    saved?.assignment?.mode === "person"
      ? saved.assignment.ownerId ??
          saved.assignment.telecallerId ??
          saved.assignment.fieldExecutiveId ??
          ""
      : "",
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const selectedPerson = mapRoutingAssigneeSelection(
    assigneeId,
    props.assigneeOptions,
  );
  const routing: MetaFormRoutingOverride = {
    ...(projectId === INHERIT
      ? {}
      : { projectId: projectId === DEFAULT ? null : projectId }),
    ...(sourceId === INHERIT
      ? {}
      : { sourceId: sourceId === DEFAULT ? null : sourceId }),
    ...(mode === "inherit"
      ? {}
      : {
          assignment:
            mode === "automatic"
              ? { mode, teamId: teamId || null }
              : {
                  mode,
                  ...(selectedPerson.ownerId
                    ? { ownerId: selectedPerson.ownerId }
                    : {}),
                  ...(selectedPerson.telecallerId
                    ? { telecallerId: selectedPerson.telecallerId }
                    : {}),
                  ...(selectedPerson.fieldExecutiveId
                    ? { fieldExecutiveId: selectedPerson.fieldExecutiveId }
                    : {}),
                },
        }),
  };
  const effective = resolveMetaRouting(
    {
      ...props.settings,
      formRoutingOverrides: {
        [props.pageId]: { [props.formId]: routing },
      },
    },
    props.pageId,
    props.formId,
  );
  const optionLabel = (
    options: readonly LeadFilterOption[],
    value: string | null | undefined,
    fallback: string,
  ) =>
    value
      ? options.find((option) => option.value === value)?.label ??
        "Unavailable selection"
      : fallback;
  const effectivePerson =
    effective.ownerId ?? effective.telecallerId ?? effective.fieldExecutiveId;
  const save = async (next: MetaFormRoutingOverride) => {
    if (pending) return;
    if (
      next.assignment?.mode === "person" &&
      !Object.values(selectedPerson).some(Boolean)
    ) {
      setError("Select an active person to receive leads from this form.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await props.onSave(next);
      props.onClose();
    } catch (failure) {
      setError(
        getApiErrorMessage(
          failure,
          "Could not save form routing. Please try again.",
        ),
      );
    } finally {
      setPending(false);
    }
  };
  const overrideOptions = (
    options: readonly LeadFilterOption[],
    defaultLabel: string,
  ) => [
    { value: INHERIT, label: "Use page configuration" },
    { value: DEFAULT, label: defaultLabel },
    ...options.filter((option) => option.value),
  ];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) props.onClose();
      }}
    >
      <DialogContent className="max-h-screen max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure form routing</DialogTitle>
          <DialogDescription className="break-words">
            {props.formName}. Form overrides take priority over page settings.
            Other values continue using page configuration.
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={pending} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-semibold">CRM project</p>
              <SearchableSelect
                disabled={pending}
                ariaLabel="Form CRM project"
                value={projectId}
                onValueChange={setProjectId}
                options={overrideOptions(
                  props.projectOptions,
                  "Use incoming project value",
                )}
                searchPlaceholder="Search projects..."
              />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-sm font-semibold">Lead source</p>
              <SearchableSelect
                disabled={pending}
                ariaLabel="Form lead source"
                value={sourceId}
                onValueChange={setSourceId}
                options={overrideOptions(
                  props.sourceOptions,
                  "Use Meta Ads source",
                )}
                searchPlaceholder="Search sources..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Assignment</p>
            <SearchableSelect
              disabled={pending}
              ariaLabel="Form assignment mode"
              value={mode}
              onValueChange={(value) => {
                if (
                  value === "inherit" ||
                  value === "person" ||
                  value === "automatic"
                )
                  setMode(value);
              }}
              options={[
                { value: "inherit", label: "Use page assignment" },
                { value: "person", label: "Assign to a person" },
                { value: "automatic", label: "Automatic assignment" },
              ]}
            />
          </div>
          {mode === "person" ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Assign to</p>
              <SearchableSelect
                disabled={pending}
                ariaLabel="Form assignee"
                value={assigneeId}
                onValueChange={setAssigneeId}
                options={props.assigneeOptions.filter((option) => option.value)}
                placeholder="Select a person"
                searchPlaceholder="Search CRM users..."
              />
              <p className="text-sm text-muted-foreground">
                This person receives new leads directly, bypassing automatic
                assignment.
              </p>
            </div>
          ) : mode === "automatic" ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Route to team</p>
              <SearchableSelect
                disabled={pending}
                ariaLabel="Form automatic assignment team"
                value={teamId}
                onValueChange={setTeamId}
                options={[...props.teamOptions]}
                searchPlaceholder="Search teams..."
              />
              <p className="text-sm text-muted-foreground">
                Replaces the page assignment. If the team has no matching rule,
                standard automatic assignment applies.
              </p>
            </div>
          ) : null}
        </fieldset>
        <section
          aria-label="Effective form routing"
          className="space-y-2 rounded-lg border border-border bg-muted p-4 text-sm"
        >
          <h3 className="font-semibold">Effective routing</h3>
          <p>
            Project:{" "}
            {optionLabel(
              props.projectOptions,
              effective.projectId,
              "Incoming project value",
            )}{" "}
            ({effective.fieldScopes.project})
          </p>
          <p>
            Source:{" "}
            {optionLabel(props.sourceOptions, effective.sourceId, "Meta Ads")} (
            {effective.fieldScopes.source})
          </p>
          <p>
            Assignment:{" "}
            {effectivePerson
              ? optionLabel(props.assigneeOptions, effectivePerson, "")
              : optionLabel(
                  props.teamOptions,
                  effective.teamId,
                  "Standard automatic assignment",
                )}{" "}
            ({effective.fieldScopes.assignment})
          </p>
        </section>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => void save({})}
          >
            Reset to page configuration
          </Button>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={props.onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending}
              onClick={() => void save(routing)}
            >
              {pending ? "Saving..." : "Save form routing"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
