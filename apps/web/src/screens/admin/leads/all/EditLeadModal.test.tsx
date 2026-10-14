import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { api } from "../../../../common/api";
import { EditLeadModal } from "./AddLeadModal";
import {
  scheduledInputToIso,
  scheduledValueToPickerTime,
} from "../../../../common/time";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), patch: jest.fn() },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("../../projects/useProjectsApi", () => ({
  useProjects: () => ({ data: { projects: [] } }),
}));
jest.mock("../../projects/useProjectMasters", () => ({
  useMasterOptions: () => ({ options: [] }),
}));
jest.mock("./useAllLeads", () => ({
  ...jest.requireActual("./useAllLeads"),
  useLeadListFilterOptions: () => ({
    options: {
      sourceOptions: [
        { value: "referral", label: "Referral" },
        { value: "website", label: "Website" },
      ],
      statusOptions: [{ value: "interested", label: "Interested" }],
      priorityOptions: [],
      ownerOptions: [{ value: "afreen", label: "Afreen", role: "TELECALLER" }],
    },
  }),
}));
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  SearchableSelect: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const lead = {
  id: "lead-1",
  name: "Customer",
  mobile: "9876543210",
  email: "buyer@example.com",
  sourceId: "referral",
  statusId: "interested",
  telecallerId: "afreen",
  managerId: "manager",
  remarks: "Existing note",
  nextFollowUpAt: "2026-10-15T04:30:00.000Z",
  followUps: [{ scheduledAt: "2026-10-15T04:30:00.000Z" }],
  requirement: { propertyType: "Apartment", configuration: "2 BHK" },
};
let enabledFields: string[];
const onOpenChange = jest.fn();

function renderEdit() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <EditLeadModal leadId="lead-1" open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  enabledFields = [
    "name",
    "mobile",
    "email",
    "status",
    "propertyType",
    "configuration",
    "remark",
    "followUpDate",
  ];
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: url === "/lead-field-permissions" ? { enabledFields } : lead,
  }));
  jest.mocked(api.patch).mockResolvedValue({ data: lead });
});

test("editing a permitted field sends only its change, not prefilled restricted source/assignments", async () => {
  renderEdit();
  const name = await screen.findByDisplayValue("Customer");
  fireEvent.change(name, { target: { value: "Updated customer" } });
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith("/leads/lead-1", {
      leadName: "Updated customer",
    }),
  );
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("source and assignment respect the effective field configuration", async () => {
  renderEdit();
  await screen.findByDisplayValue("Customer");
  expect(screen.getByRole("combobox", { name: "Lead source" })).toBeDisabled();
  expect(
    screen.getByRole("combobox", { name: "Assign lead to user" }),
  ).toBeDisabled();
  expect(screen.getByLabelText(/Customer name/)).not.toBeDisabled();
});

test("custom role permissions disable name but keep configured email editable", async () => {
  enabledFields = ["email"];
  renderEdit();
  await screen.findByDisplayValue("Customer");
  expect(screen.getByLabelText(/Customer name/)).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Email ID"), {
    target: { value: "changed@example.com" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith("/leads/lead-1", {
      emailAddress: "changed@example.com",
    }),
  );
});

test("backend failure is shown and the edited draft stays open", async () => {
  jest.mocked(api.patch).mockRejectedValue({
    response: {
      data: {
        message:
          "A follow-up date is required when updating lead status or remarks.",
      },
    },
  });
  renderEdit();
  fireEvent.change(await screen.findByDisplayValue("Customer"), {
    target: { value: "Draft customer" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "A follow-up date is required when updating lead status or remarks.",
    ),
  );
  expect(screen.getByDisplayValue("Draft customer")).toBeInTheDocument();
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(toast.success).not.toHaveBeenCalled();
});

test("unchanged save performs no PATCH and does not create duplicate remark activity", async () => {
  renderEdit();
  await screen.findByDisplayValue("Customer");
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("No changes to save."),
  );
  expect(api.patch).not.toHaveBeenCalled();
});

test("failed permissions load blocks writes instead of assuming unrestricted access", async () => {
  jest.mocked(api.get).mockImplementation(async (url) => {
    if (url === "/lead-field-permissions")
      throw new Error("Could not load field permissions");
    return { data: lead };
  });
  renderEdit();
  await screen.findByText(/Could not load field permissions/);
  expect(screen.getByRole("button", { name: "Update lead" })).toBeDisabled();
  expect(api.patch).not.toHaveBeenCalled();
});

test("cancel performs no write", async () => {
  renderEdit();
  fireEvent.change(await screen.findByDisplayValue("Customer"), {
    target: { value: "Unsaved" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.patch).not.toHaveBeenCalled();
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("hidden Source is shown as Source Unknown even when Source editing is enabled", async () => {
  enabledFields = ["name", "source"];
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data:
      url === "/lead-field-permissions"
        ? { enabledFields }
        : {
            ...lead,
            sourceId: null,
            sourceName: "Source Unknown",
            canViewSource: false,
          },
  }));
  renderEdit();
  const name = await screen.findByDisplayValue("Customer");
  const source = screen.getByRole("combobox", { name: "Lead source" });
  expect(source).toBeDisabled();
  expect(source).toHaveTextContent("Source Unknown");
  expect(screen.queryByText("Referral")).not.toBeInTheDocument();
  fireEvent.change(name, { target: { value: "Updated customer" } });
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith("/leads/lead-1", {
      leadName: "Updated customer",
    }),
  );
});

test("a changed follow-up sends the exact instant, not a date-only midnight", async () => {
  renderEdit();
  await screen.findByDisplayValue("Customer");
  fireEvent.change(screen.getByLabelText("Follow-up date"), {
    target: { value: "2026-10-16" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith("/leads/lead-1", {
      nextFollowUpAt: scheduledInputToIso(
        "2026-10-16",
        scheduledValueToPickerTime(lead.nextFollowUpAt),
      ),
    }),
  );
});

test("permission-enabled source edits send the source change only", async () => {
  enabledFields = ["source"];
  renderEdit();
  await screen.findByDisplayValue("Customer");
  expect(
    screen.getByRole("combobox", { name: "Lead source" }),
  ).not.toBeDisabled();
  fireEvent.change(screen.getByRole("combobox", { name: "Lead source" }), {
    target: { value: "website" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith("/leads/lead-1", {
      leadSource: "website",
    }),
  );
});

test("save is disabled while pending, and success waits for the response", async () => {
  let complete: (value: { data: typeof lead }) => void = () => undefined;
  jest.mocked(api.patch).mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  renderEdit();
  fireEvent.change(await screen.findByDisplayValue("Customer"), {
    target: { value: "Pending" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update lead" }));
  expect(
    await screen.findByRole("button", { name: "Saving..." }),
  ).toBeDisabled();
  expect(toast.success).not.toHaveBeenCalled();
  complete({ data: lead });
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

test("lead load failure blocks editing instead of exposing a blank create form", async () => {
  jest.mocked(api.get).mockImplementation(async (url) => {
    if (url === "/leads/lead-1") throw new Error("Lead not found");
    return { data: { enabledFields } };
  });
  renderEdit();
  await screen.findByText("Lead not found");
  expect(screen.getByRole("button", { name: "Update lead" })).toBeDisabled();
  expect(api.patch).not.toHaveBeenCalled();
});
