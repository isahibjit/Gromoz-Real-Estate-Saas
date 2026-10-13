import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FollowUpLeadUpdateDialog } from "./FollowUpLeadsScreen";
import type { FollowUpLead } from "./followUpLeadsTypes";
import { api } from "../../../../common/api";
import { scheduledInputToIso } from "../../../../common/time";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  SearchableSelect: ({
    value,
    onValueChange,
    options,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
  }) => (
    <select
      aria-label={placeholder}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const followUp: FollowUpLead = {
  id: "follow-up-id",
  leadId: "lead-backend-id",
  assignedToId: "executive",
  name: "Customer One",
  initials: "CO",
  property: "Residential",
  source: "Meta Ads",
  mobile: "9999999999",
  projectName: "Project",
  executiveName: "Afreen",
  leadStatus: "New Lead",
  leadStatusId: "new",
  leadType: "Warm",
  scheduledAt: "2026-10-12T04:30:00Z",
  dateGroup: "Today",
  time: "10:00 AM",
  lastContact: "Today",
  lastContactTime: "10:00 AM",
  owner: "Afreen",
  ownerAvatarUrl: "",
  status: "Due Now",
  remark: "Current follow-up remark",
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockResolvedValue({
    data: {
      notes: [
        { id: "history", text: "Earlier lead remark", authorName: "Afreen" },
      ],
    },
  });
});

function renderDialog(
  overrides: Partial<
    React.ComponentProps<typeof FollowUpLeadUpdateDialog>
  > = {},
) {
  const onSaved = jest.fn().mockResolvedValue(undefined);
  const onOpenChange = jest.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <FollowUpLeadUpdateDialog
        lead={followUp}
        open
        statusOptions={[
          { value: "new", label: "New Lead", allowFollowUp: true },
          { value: "done", label: "Booking Done", allowFollowUp: false },
        ]}
        leadTypeOptions={[{ value: "warm", label: "Warm" }]}
        budgetOptions={[]}
        configurationOptions={[]}
        enabledUpdateFields={["status", "leadType", "remark", "followUpDate"]}
        onSaved={onSaved}
        onOpenChange={onOpenChange}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { onSaved, onOpenChange };
}

test("Follow-up uses the same shared form and reads lead history, not follow-up ID", async () => {
  const { onSaved } = renderDialog();
  expect(
    screen.getByRole("heading", { name: "Update reminder, status & remark" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Select status" })).toHaveValue(
    "new",
  );
  expect(api.get).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  await screen.findByText("Earlier lead remark");
  expect(api.get).toHaveBeenCalledWith("/leads/lead-backend-id");
  expect(onSaved).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
});

test("history tab preserves follow-up form drafts", async () => {
  renderDialog();
  fireEvent.change(screen.getByPlaceholderText("Enter new remark..."), {
    target: { value: "Draft follow-up remark" },
  });
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  await screen.findByText("Earlier lead remark");
  await userEvent.click(screen.getByRole("tab", { name: "Update lead" }));
  expect(screen.getByPlaceholderText("Enter new remark...")).toHaveValue(
    "Draft follow-up remark",
  );
});

test("requires the next date before submitting changed remarks", async () => {
  const { onSaved } = renderDialog();
  fireEvent.change(screen.getByPlaceholderText("Enter new remark..."), {
    target: { value: "Call again" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  expect(onSaved).not.toHaveBeenCalled();
});

test("preserves the specialized follow-up payload and local scheduling time", async () => {
  const { onSaved, onOpenChange } = renderDialog();
  fireEvent.change(screen.getByPlaceholderText("Enter new remark..."), {
    target: { value: "Call again" },
  });
  fireEvent.change(screen.getByLabelText("Follow-up date", { exact: true }), {
    target: { value: "2026-10-13" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(onSaved).toHaveBeenCalledWith(
    "lead-backend-id",
    expect.objectContaining({
      statusId: "new",
      remarks: "Call again",
      followUpId: "follow-up-id",
      completed: true,
      nextScheduledAt: scheduledInputToIso("2026-10-13", "10:00 AM"),
      nextAssignedToId: "executive",
    }),
  );
});

test("a failed save retains the draft and leaves the dialog open", async () => {
  const failedSave = jest.fn().mockRejectedValue(new Error("Save failed"));
  const { onOpenChange } = renderDialog({ onSaved: failedSave });
  fireEvent.change(screen.getByPlaceholderText("Enter new remark..."), {
    target: { value: "Keep draft" },
  });
  fireEvent.change(screen.getByLabelText("Follow-up date", { exact: true }), {
    target: { value: "2026-10-13" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  await waitFor(() => expect(failedSave).toHaveBeenCalledTimes(1));
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByPlaceholderText("Enter new remark...")).toHaveValue(
    "Keep draft",
  );
});

test("statuses without follow-ups still save without a next date", async () => {
  const { onSaved } = renderDialog();
  fireEvent.change(screen.getByRole("combobox", { name: "Select status" }), {
    target: { value: "done" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(onSaved).toHaveBeenCalledWith("lead-backend-id", {
    statusId: "done",
    temperatureId: "warm",
  });
});

test("closing performs no save", async () => {
  const { onSaved, onOpenChange } = renderDialog();
  await userEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
  expect(onOpenChange).toHaveBeenCalledWith(false);
  expect(onSaved).not.toHaveBeenCalled();
});

test("read-only users retain history without update fields or action", async () => {
  renderDialog({ enabledUpdateFields: [] });
  expect(
    screen.queryByRole("button", { name: "Update Lead" }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  await screen.findByText("Earlier lead remark");
});
