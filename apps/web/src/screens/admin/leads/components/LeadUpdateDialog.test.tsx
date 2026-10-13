import { useState } from "react";
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
import { LeadUpdateDialog } from "./LeadUpdateDialog";
import { api } from "../../../../common/api";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), patch: jest.fn(), post: jest.fn() },
}));
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  SearchableSelect: ({
    ariaLabel,
    value,
    onValueChange,
    options,
  }: {
    ariaLabel: string;
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const mockGet = jest.mocked(api.get);
beforeAll(() =>
  notifyManager.setNotifyFunction((callback) => {
    act(callback);
  }),
);
afterAll(() => notifyManager.setNotifyFunction((callback) => callback()));
beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({
    data: {
      notes: [
        {
          id: "note-1",
          text: "Customer requested a weekend visit",
          authorName: "Afreen",
          createdAt: "2026-10-12T04:30:00Z",
          isPinned: true,
        },
      ],
    },
  });
});

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof LeadUpdateDialog>> = {},
) {
  const onClose = jest.fn();
  const onSubmit = jest.fn();
  function Host() {
    const [remark, setRemark] = useState("");
    return (
      <LeadUpdateDialog
        selectedLeads={[{ id: "lead-1", name: "Customer One" }]}
        canUpdate
        isSaving={false}
        onClose={onClose}
        onSubmit={onSubmit}
        {...overrides}
      >
        <textarea
          aria-label="Remark draft"
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
        />
      </LeadUpdateDialog>
    );
  }
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Host />
    </QueryClientProvider>,
  );
  return { onClose, onSubmit };
}

test("opens the existing update form without fetching history or writing data", () => {
  renderDialog();
  expect(
    screen.getByRole("heading", { name: "Update reminder, status & remark" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Update lead" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("Customer One")).toBeInTheDocument();
  expect(mockGet).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
});

test("fetches authorized lead history on demand and shows author, time, text, and pin", async () => {
  const { onSubmit } = renderDialog();
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  expect(
    await screen.findByText("Customer requested a weekend visit"),
  ).toBeInTheDocument();
  expect(screen.getByText("Afreen")).toBeInTheDocument();
  expect(screen.getByText(/12 Oct 2026/)).toBeInTheDocument();
  expect(screen.getByText("Pinned")).toBeInTheDocument();
  expect(mockGet).toHaveBeenCalledWith("/leads/lead-1");
  expect(
    screen.queryByRole("button", { name: "Update Lead" }),
  ).not.toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
});

test("preserves the draft while switching between update and history", async () => {
  renderDialog();
  fireEvent.change(screen.getByRole("textbox", { name: "Remark draft" }), {
    target: { value: "Call again tomorrow" },
  });
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  await screen.findByText("Customer requested a weekend visit");
  await userEvent.click(screen.getByRole("tab", { name: "Update lead" }));
  expect(screen.getByRole("textbox", { name: "Remark draft" })).toHaveValue(
    "Call again tomorrow",
  );
});

test("switches bulk history one selected lead at a time without leaking the previous lead", async () => {
  mockGet.mockResolvedValueOnce({
    data: { notes: [{ id: "first", text: "First lead only" }] },
  });
  mockGet.mockResolvedValueOnce({
    data: { notes: [{ id: "second", text: "Second lead only" }] },
  });
  renderDialog({
    selectedLeads: [
      { id: "lead-1", name: "One" },
      { id: "lead-2", name: "Two" },
    ],
  });
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  await screen.findByText("First lead only");
  fireEvent.change(
    screen.getByRole("combobox", { name: "Lead for remarks history" }),
    { target: { value: "lead-2" } },
  );
  await screen.findByText("Second lead only");
  expect(screen.queryByText("First lead only")).not.toBeInTheDocument();
  expect(mockGet).toHaveBeenCalledWith("/leads/lead-2");
});

test("shows API failures and allows retry without discarding the draft", async () => {
  mockGet.mockRejectedValueOnce({
    response: { data: { message: "You cannot view this lead" } },
  });
  renderDialog();
  fireEvent.change(screen.getByRole("textbox", { name: "Remark draft" }), {
    target: { value: "Keep draft" },
  });
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "You cannot view this lead",
  );
  expect(screen.getByRole("dialog")).toHaveClass("h-[88vh]", "overflow-hidden");
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByText("Customer requested a weekend visit");
  await userEvent.click(screen.getByRole("tab", { name: "Update lead" }));
  expect(screen.getByRole("textbox", { name: "Remark draft" })).toHaveValue(
    "Keep draft",
  );
});

test("renders the history empty state", async () => {
  mockGet.mockResolvedValue({ data: { notes: [] } });
  renderDialog();
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  expect(
    await screen.findByText("No remarks history available yet."),
  ).toBeInTheDocument();
});

test("permits read-only history but exposes no update action", async () => {
  renderDialog({ canUpdate: false });
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Update Lead" }),
  ).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  await screen.findByText("Customer requested a weekend visit");
});

test("closes without submitting or writing", async () => {
  const { onClose, onSubmit } = renderDialog();
  await userEvent.click(screen.getAllByRole("button", { name: "Close" })[0]);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
  expect(api.patch).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
});

test("disables close and submission during saving", () => {
  renderDialog({ isSaving: true });
  expect(screen.getByRole("button", { name: "Close" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();
});

test("uses the existing submit handler only from the update tab", async () => {
  const { onSubmit } = renderDialog();
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
});

test("keeps one viewport-bounded shell through update, loading, and empty history", async () => {
  let finishHistory = () => {};
  mockGet.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishHistory = () => resolve({ data: { notes: [] } });
      }),
  );
  renderDialog();
  const dialog = screen.getByRole("dialog");
  const shellClasses = dialog.className;
  expect(dialog).toHaveClass("h-[88vh]", "max-h-[88vh]", "overflow-hidden");
  expect(screen.getByRole("heading").parentElement).toHaveClass("shrink-0");
  expect(
    screen.getByRole("button", { name: "Update Lead" }).parentElement,
  ).toHaveClass("shrink-0");
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Loading remarks history...",
  );
  expect(dialog.className).toBe(shellClasses);
  await act(async () => finishHistory());
  await screen.findByText("No remarks history available yet.");
  expect(dialog.className).toBe(shellClasses);
  await userEvent.click(screen.getByRole("tab", { name: "Update lead" }));
  expect(dialog.className).toBe(shellClasses);
});

test("keeps long history inside the flexible scrolling body with fixed header and footer", async () => {
  mockGet.mockResolvedValue({
    data: {
      notes: Array.from({ length: 30 }, (_, index) => ({
        id: `note-${index}`,
        text: `History entry ${index}`,
      })),
    },
  });
  renderDialog();
  await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
  await screen.findByText("History entry 29");
  expect(
    screen.getByRole("tabpanel", { name: "Remarks history" }).parentElement,
  ).toHaveClass("min-h-0", "flex-1", "overflow-y-auto");
  expect(screen.getByRole("heading").parentElement).toHaveClass("shrink-0");
  expect(
    screen.getAllByRole("button", { name: "Close" })[0].parentElement,
  ).toHaveClass("shrink-0");
  expect(screen.getByRole("dialog")).toHaveClass("h-[88vh]", "overflow-hidden");
});
