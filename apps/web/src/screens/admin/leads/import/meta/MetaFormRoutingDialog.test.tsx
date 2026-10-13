import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { MetaRoutingSettings } from "@truroot/shared";
import { MetaFormRoutingDialog } from "./MetaFormRoutingDialog";
import { hasUnsavedMetaPageConfiguration } from "./metaRouting";

// Keep the dialog and buttons real; use native selects to exercise routing state.
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  SearchableSelect: ({
    ariaLabel,
    value,
    onValueChange,
    options,
    disabled,
  }: {
    ariaLabel: string;
    value: string;
    onValueChange: (value: string) => void;
    options: { value: string; label: string }[];
    disabled?: boolean;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">Select</option>
      {options
        .filter((option) => option.value)
        .map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
    </select>
  ),
}));

const settings: MetaRoutingSettings = {
  pageProjectMappings: { page: "page-project" },
  pageSourceMappings: { page: "page-source" },
  pageTeamMappings: { page: "team" },
  pageAssignmentOverrides: { page: { telecallerId: "afreen" } },
};

const props = {
  pageId: "page",
  formId: "form",
  formName: "Project enquiry",
  settings,
  projectOptions: [
    { value: "page-project", label: "Page project" },
    { value: "form-project", label: "Form project" },
  ],
  sourceOptions: [{ value: "page-source", label: "Page source" }],
  teamOptions: [
    { value: "", label: "Use standard auto-assignment" },
    { value: "team", label: "Team A" },
  ],
  assigneeOptions: [
    { value: "afreen", label: "Afreen", role: "TELECALLER" },
    { value: "sales", label: "Sales person", role: "SALES_AGENT" },
    { value: "manager", label: "Manager", role: "MANAGER" },
  ],
};

function setup(
  overrides: Partial<React.ComponentProps<typeof MetaFormRoutingDialog>> = {},
) {
  const onSave = jest.fn().mockResolvedValue(undefined);
  const onClose = jest.fn();
  render(
    <MetaFormRoutingDialog
      {...props}
      onSave={onSave}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onSave, onClose };
}

it("shows inherited values and saves only the changed form field", async () => {
  const { onSave } = setup();
  const summary = screen.getByRole("region", {
    name: "Effective form routing",
  });
  expect(
    within(summary).getByText("Project: Page project (page)"),
  ).toBeInTheDocument();
  expect(
    within(summary).getByText("Assignment: Afreen (page)"),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Form CRM project"), {
    target: { value: "form-project" },
  });
  expect(
    within(summary).getByText("Project: Form project (form)"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save form routing" }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({ projectId: "form-project" }),
  );
});

it("uses explicit defaults and suppresses the page person in automatic mode", async () => {
  const { onSave } = setup();
  fireEvent.change(screen.getByLabelText("Form CRM project"), {
    target: { value: "__default__" },
  });
  fireEvent.change(screen.getByLabelText("Form lead source"), {
    target: { value: "__default__" },
  });
  fireEvent.change(screen.getByLabelText("Form assignment mode"), {
    target: { value: "automatic" },
  });
  expect(
    screen.getByText("Assignment: Standard automatic assignment (form)"),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save form routing" }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      projectId: null,
      sourceId: null,
      assignment: { mode: "automatic", teamId: null },
    }),
  );
});

it.each([
  ["afreen", "telecallerId"],
  ["sales", "fieldExecutiveId"],
  ["manager", "ownerId"],
])("maps %s to its canonical assignment field", async (id, field) => {
  const { onSave } = setup();
  fireEvent.change(screen.getByLabelText("Form assignment mode"), {
    target: { value: "person" },
  });
  fireEvent.change(screen.getByLabelText("Form assignee"), {
    target: { value: id },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save form routing" }));
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      assignment: { mode: "person", [field]: id },
    }),
  );
});

it("keeps the draft open and shows API failure without closing", async () => {
  const onSave = jest.fn().mockRejectedValue({
    response: { data: { message: "Select an active CRM team" } },
  });
  const { onClose } = setup({ onSave });
  fireEvent.change(screen.getByLabelText("Form assignment mode"), {
    target: { value: "automatic" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save form routing" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Select an active CRM team",
  );
  expect(onClose).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Form assignment mode")).toHaveValue(
    "automatic",
  );
});

it("cancel performs no writes and reset sends an empty configuration", async () => {
  const { onSave, onClose } = setup();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Reset to page configuration" }),
  );
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({}));
});

it("blocks repeated submissions and editing while saving", async () => {
  let complete: (() => void) | undefined;
  const onSave = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  setup({ onSave });
  fireEvent.click(screen.getByRole("button", { name: "Save form routing" }));
  expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  expect(screen.getByLabelText("Form CRM project")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Saving..." }));
  expect(onSave).toHaveBeenCalledTimes(1);
  complete?.();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Save form routing" }),
    ).toBeEnabled(),
  );
});

it("detects unsaved routing and enabled-form changes but ignores form ordering", () => {
  const configuration = {
    ...settings,
    pageFormSelections: { page: ["one", "two"] },
  };
  const draft = {
    selectedFormIds: ["two", "one"],
    projectId: "page-project",
    sourceId: "page-source",
    teamId: "team",
    ownerId: "",
    telecallerId: "afreen",
    fieldExecutiveId: "",
  };
  expect(hasUnsavedMetaPageConfiguration(configuration, "page", draft)).toBe(
    false,
  );
  expect(
    hasUnsavedMetaPageConfiguration(configuration, "page", {
      ...draft,
      teamId: "different",
    }),
  ).toBe(true);
  expect(
    hasUnsavedMetaPageConfiguration(configuration, "page", {
      ...draft,
      selectedFormIds: ["one"],
    }),
  ).toBe(true);
});
