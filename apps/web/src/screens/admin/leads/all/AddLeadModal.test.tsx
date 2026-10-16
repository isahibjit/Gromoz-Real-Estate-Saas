import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { api } from "../../../../common/api";
import { scheduledInputToIso } from "../../../../common/time";
import { defaultAddLeadFormData } from "../add/addLeadData";
import { buildLeadPayload } from "../add/useCreateLead";
import { AddLeadModal } from "./AddLeadModal";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("../../../../store", () => ({
  useAppSelector: () => ({ id: "admin", role: "ADMIN" }),
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
      sourceOptions: [{ value: "referral", label: "Referral" }],
      statusOptions: [{ value: "new", label: "New Lead" }],
      priorityOptions: [],
      ownerOptions: [],
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
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
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

const onOpenChange = jest.fn();
function renderAdd() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <AddLeadModal
        open
        onOpenChange={onOpenChange}
        sourceOptions={[{ value: "referral", label: "Referral" }]}
        assigneeOptions={[]}
      />
    </QueryClientProvider>,
  );
}
async function fillRequired() {
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Lead source" }),
    "referral",
  );
  fireEvent.change(screen.getByLabelText(/Customer name/), {
    target: { value: "Date test" },
  });
  fireEvent.change(screen.getByLabelText(/Mobile number/), {
    target: { value: "9999999999" },
  });
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockResolvedValue({ data: {} });
  jest.mocked(api.post).mockResolvedValue({ data: { id: "lead" } });
});

test("defaults the editable added timestamp to the current time", () => {
  const before = Date.now();
  renderAdd();
  const input = screen.getByLabelText("Lead added date and time", {
    exact: true,
  });
  expect(input).toHaveAttribute("type", "datetime-local");
  const value = (input as HTMLInputElement).value;
  const instant = new Date(value).getTime();
  expect(instant).toBeGreaterThanOrEqual(before - 60000);
  expect(instant).toBeLessThanOrEqual(Date.now());
});

test("sends the selected added timestamp as an instant without changing follow-up or assignment dates", async () => {
  renderAdd();
  await fillRequired();
  fireEvent.change(
    screen.getByLabelText("Lead added date and time", { exact: true }),
    {
      target: { value: "2026-10-01T09:15" },
    },
  );
  await userEvent.click(screen.getByRole("button", { name: "Save lead" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/leads",
      expect.objectContaining({
        createdAt: scheduledInputToIso("2026-10-01", "09:15"),
        assignDate: undefined,
        followUpDate: undefined,
      }),
    ),
  );
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

test("requires a date when cleared instead of silently using now", async () => {
  renderAdd();
  await fillRequired();
  fireEvent.change(
    screen.getByLabelText("Lead added date and time", { exact: true }),
    { target: { value: "" } },
  );
  await userEvent.click(screen.getByRole("button", { name: "Save lead" }));
  expect(
    screen.getByText("Select a valid lead added date and time."),
  ).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test("disables the date and submit button while saving", async () => {
  let finishSave: ((value: { data: { id: string } }) => void) | undefined;
  jest.mocked(api.post).mockReturnValue(
    new Promise((resolve) => {
      finishSave = resolve;
    }),
  );
  renderAdd();
  await fillRequired();
  await userEvent.click(screen.getByRole("button", { name: "Save lead" }));
  expect(
    await screen.findByRole("button", { name: "Saving..." }),
  ).toBeDisabled();
  expect(
    screen.getByLabelText("Lead added date and time", { exact: true }),
  ).toBeDisabled();
  finishSave?.({ data: { id: "lead" } });
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

test("retains the selected date and other draft fields on API failure", async () => {
  jest
    .mocked(api.post)
    .mockRejectedValue({ response: { data: { message: "Save denied" } } });
  renderAdd();
  await fillRequired();
  fireEvent.change(
    screen.getByLabelText("Lead added date and time", { exact: true }),
    { target: { value: "2026-10-01T09:15" } },
  );
  await userEvent.click(screen.getByRole("button", { name: "Save lead" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Save denied"));
  expect(
    screen.getByLabelText("Lead added date and time", { exact: true }),
  ).toHaveValue("2026-10-01T09:15");
  expect(screen.getByLabelText(/Customer name/)).toHaveValue("Date test");
  expect(onOpenChange).not.toHaveBeenCalled();
});

test("cancelling performs no writes and reopening discards the chosen date", async () => {
  const result = renderAdd();
  fireEvent.change(
    screen.getByLabelText("Lead added date and time", { exact: true }),
    { target: { value: "2020-01-01T09:15" } },
  );
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.post).not.toHaveBeenCalled();
  result.unmount();
  renderAdd();
  expect(
    screen.getByLabelText("Lead added date and time", { exact: true }),
  ).not.toHaveValue("2020-01-01T09:15");
});

test("legacy creation forms may omit the timestamp, but malformed explicit timestamps are rejected", () => {
  expect(buildLeadPayload(defaultAddLeadFormData).createdAt).toBeUndefined();
  expect(() =>
    buildLeadPayload({
      ...defaultAddLeadFormData,
      createdAt: "2026-02-30T09:15",
    }),
  ).toThrow("Select a valid lead added date and time.");
});
