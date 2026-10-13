import type { ReactNode } from "react";
import {
  notifyManager,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { api } from "../../../../common/api";
import { AutoAssignmentMasterScreen } from "./AutoAssignmentMasterScreen";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("../../dashboard/DashboardLayoutContext", () => ({
  useDashboardLayout: jest.fn(),
}));
jest.mock("../all/useAllLeads", () => ({
  useLeadListFilterOptions: () => ({
    options: {
      ownerOptions: [
        { value: "u1", label: "User one" },
        { value: "u2", label: "User two" },
        { value: "u3", label: "User three" },
      ],
    },
  }),
}));
// Keep inputs/buttons/layout real; native selects make state interactions deterministic.
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <select
      aria-label="First assignee"
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">Select</option>
      {children}
    </select>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
  MultiSelect: ({
    value,
    onValueChange,
    options,
  }: {
    value: string[];
    onValueChange: (value: string[]) => void;
    options: { value: string; label: string }[];
  }) => (
    <select
      multiple
      aria-label="Handoff sequence"
      value={value}
      onChange={(event) =>
        onValueChange(
          Array.from(event.target.selectedOptions, (option) => option.value),
        )
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const rule = {
  id: "rule",
  name: "Saved route",
  isEnabled: true,
  initialUserId: "u1",
  transferSequence: ["u1", "u2", "u3"],
  transferTimeMinutes: 1,
  rotationCount: 3,
};

beforeAll(() =>
  notifyManager.setNotifyFunction((callback) => {
    act(callback);
  }),
);
afterAll(() => notifyManager.setNotifyFunction((callback) => callback()));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: url.endsWith("rules")
      ? { data: [rule] }
      : {
          data: [
            {
              id: "event",
              leadId: "lead",
              currentUserId: "u1",
              currentStep: 0,
              currentCycle: 2,
              routeSnapshot: {
                userIds: ["u1", "u2", "u3"],
                rotationCount: 2,
                transferTimeMinutes: 1,
              },
              assignedAt: "2026-10-12T00:00:00Z",
              dueAt: "2026-10-12T00:01:00Z",
              status: "ACTIVE",
            },
          ],
        },
  }));
  jest.mocked(api.post).mockResolvedValue({ data: { id: "created" } });
  jest.mocked(api.patch).mockResolvedValue({ data: rule });
});

async function setup() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <AutoAssignmentMasterScreen />
    </QueryClientProvider>,
  );
  await screen.findByText("Saved route");
}

it("defaults and resets to one pass and displays the helper", async () => {
  await setup();
  const input = screen.getByRole("spinbutton", { name: "Lead rotation count" });
  expect(input).toHaveValue(1);
  expect(
    screen.getByText(
      "Number of passes through the selected users. Includes the first pass.",
    ),
  ).toBeInTheDocument();
  fireEvent.change(input, { target: { value: "2" } });
  expect(screen.getByText(/2 passes through this route/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(input).toHaveValue(1);
});

it("editing loads the saved count and saves it with the existing route", async () => {
  await setup();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(
    screen.getByRole("spinbutton", { name: "Lead rotation count" }),
  ).toHaveValue(3);
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith(
      "/auto-assignment/rules/rule",
      expect.objectContaining({
        rotationCount: 3,
        transferSequence: ["u2", "u3"],
        initialUserId: "u1",
      }),
    ),
  );
  await waitFor(() =>
    expect(
      screen.getByRole("spinbutton", { name: "Lead rotation count" }),
    ).toHaveValue(1),
  );
});

it("progress uses the event snapshot, not the edited rule's count", async () => {
  await setup();
  expect(screen.getByText("Pass 2 of 2 · User 1 of 3")).toBeInTheDocument();
});

it("shows lead name, CRM number, and API assignee name instead of UUIDs", async () => {
  const leadId = "fbe3b95e-1bd0-4df7-ac90-8497c05335bf";
  const userId = "0202e073-8768-4974-bf8a-19ff958c2140";
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: {
      data: url.endsWith("rules")
        ? [rule]
        : [
            {
              id: "event",
              leadId,
              currentUserId: userId,
              leadName: "Customer enquiry",
              leadDisplayId: "TR000764",
              currentUserName: "Afreen",
              currentStep: 1,
              currentCycle: 1,
              status: "EXHAUSTED",
            },
          ],
    },
  }));
  await setup();
  expect(await screen.findByText("Customer enquiry")).toBeInTheDocument();
  expect(screen.getByText("TR000764")).toBeInTheDocument();
  expect(screen.getByText("Afreen")).toBeInTheDocument();
  expect(document.body.textContent).not.toContain(leadId);
  expect(document.body.textContent).not.toContain(userId);
});

it("missing references and legacy stop reasons never fall back to UUIDs", async () => {
  const leadId = "fbe3b95e-1bd0-4df7-ac90-8497c05335bf";
  const userId = "0202e073-8768-4974-bf8a-19ff958c2140";
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: {
      data: url.endsWith("rules")
        ? [rule]
        : [
            {
              id: "event",
              leadId,
              currentUserId: userId,
              currentStep: 1,
              currentCycle: 1,
              status: "STOPPED",
              stopReason: `Next route user ${userId} is inactive or unavailable`,
            },
          ],
    },
  }));
  await setup();
  expect(await screen.findByText("Lead unavailable")).toBeInTheDocument();
  expect(screen.getByText("User unavailable")).toBeInTheDocument();
  expect(
    screen.getByText("The next assignee is inactive or unavailable"),
  ).toBeInTheDocument();
  expect(document.body.textContent).not.toContain(leadId);
  expect(document.body.textContent).not.toContain(userId);
});

it.each(["0", "-1", "1.5", "2147483648", ""])(
  "rejects invalid count %s before any write",
  async (count) => {
    await setup();
    fireEvent.change(screen.getByLabelText("First assignee"), {
      target: { value: "u1" },
    });
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Lead rotation count" }),
      { target: { value: count } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("positive whole number"),
    );
    expect(api.post).not.toHaveBeenCalled();
  },
);

it("rejects repeating a single-user route but allows one pass", async () => {
  await setup();
  fireEvent.change(screen.getByLabelText("First assignee"), {
    target: { value: "u1" },
  });
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Lead rotation count" }),
    { target: { value: "2" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
  expect(api.post).not.toHaveBeenCalled();
  expect(toast.error).toHaveBeenCalledWith(
    "Repeating rotation requires at least two users",
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Lead rotation count" }),
    { target: { value: "1" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/auto-assignment/rules",
      expect.objectContaining({ rotationCount: 1 }),
    ),
  );
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
});

it("preserves the draft and displays the backend error after a failed save", async () => {
  await setup();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  jest.mocked(api.patch).mockRejectedValueOnce({
    response: { data: { message: "Route user is inactive" } },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith("Route user is inactive"),
  );
  expect(
    screen.getByRole("spinbutton", { name: "Lead rotation count" }),
  ).toHaveValue(3);
  expect(toast.success).not.toHaveBeenCalled();
});

it("disables save and reset while a request is pending", async () => {
  await setup();
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  let finishSave = () => {};
  jest.mocked(api.patch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSave = () => resolve({ data: rule });
      }),
  );
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  await act(async () => finishSave());
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Create rule" })).toBeEnabled(),
  );
});
