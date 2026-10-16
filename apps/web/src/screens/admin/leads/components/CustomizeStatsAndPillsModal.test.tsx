import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomizeStatsAndPillsModal } from "./CustomizeStatsAndPillsModal";
import { api } from "../../../../common/api";
import {
  DEFAULT_FOLLOW_UP_CORE_ITEMS,
  type UnifiedCardItem,
} from "../../../../common/hooks/useLeadCardPreferences";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));

const status: UnifiedCardItem = {
  id: "interested",
  name: "Interested",
  category: "status",
  order: 6,
  showInStatsCard: true,
  showInFilterBar: true,
};
const followUpKey = "crm_card_prefs_v2_follow_up";
const allLeadsKey = "crm_card_prefs_v2_all_leads";

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)}>Reopen customization</button>
      <CustomizeStatsAndPillsModal open={open} onOpenChange={setOpen} />
    </>
  );
}

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  // Use real query hooks with already-loaded masters for the reopen reproduction.
  queryClient.setQueryData(
    ["lead-masters", "status"],
    [
      {
        ...status,
        code: "INTERESTED",
        sortOrder: 1,
        isActive: true,
      },
    ],
  );
  queryClient.setQueryData(["lead-masters", "temperature"], []);
  return render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
}

function switches() {
  const name = screen.getByText("Interested", { selector: "h4, p" });
  const row = name.closest("[data-drag-index]");
  if (!(row instanceof HTMLElement)) throw new Error("Missing Interested row");
  return within(row).getAllByRole("switch");
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: {
      data:
        url === "/lead-masters/status"
          ? [{ ...status, code: "INTERESTED", sortOrder: 1, isActive: true }]
          : [],
    },
  }));
  jest.mocked(api.post).mockResolvedValue({ data: { success: true } });
});

it("loads saved Follow-Ups toggles rather than All Leads when switching workspaces", async () => {
  localStorage.setItem(
    followUpKey,
    JSON.stringify([
      ...DEFAULT_FOLLOW_UP_CORE_ITEMS,
      { ...status, showInStatsCard: false, showInFilterBar: false },
    ]),
  );
  renderModal();
  await userEvent.click(screen.getByRole("button", { name: "Follow-Ups" }));
  expect(switches()[0]).not.toBeChecked();
  expect(switches()[1]).not.toBeChecked();
  expect(screen.getByText("Today's Follow-Ups")).toBeInTheDocument();
});

it("keeps off values after save, reopening, workspace switching and remount", async () => {
  const view = renderModal();
  await userEvent.click(screen.getByRole("button", { name: "Follow-Ups" }));
  await userEvent.click(switches()[0]);
  await userEvent.click(switches()[1]);
  await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(api.post).not.toHaveBeenCalled();
  expect(localStorage.getItem(allLeadsKey)).toBeNull();
  await userEvent.click(
    screen.getByRole("button", { name: "Reopen customization" }),
  );
  expect(switches()[0]).not.toBeChecked();
  expect(switches()[1]).not.toBeChecked();
  await userEvent.click(screen.getByRole("button", { name: "All Leads" }));
  expect(switches()[0]).toBeChecked();
  await userEvent.click(screen.getByRole("button", { name: "Follow-Ups" }));
  expect(switches()[0]).not.toBeChecked();
  view.unmount();
  renderModal();
  await userEvent.click(screen.getByRole("button", { name: "Follow-Ups" }));
  expect(switches()[0]).not.toBeChecked();
  expect(switches()[1]).not.toBeChecked();
});

it("does not report success or replace saved preferences after an API failure", async () => {
  jest.mocked(api.post).mockRejectedValue({
    response: { data: { message: "Insufficient permissions" } },
  });
  renderModal();
  await userEvent.click(switches()[0]);
  await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Insufficient permissions",
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(switches()[0]).not.toBeChecked();
  expect(localStorage.getItem(followUpKey)).toBeNull();
  expect(localStorage.getItem(allLeadsKey)).toBeNull();
});

it("reset and cancel do not save changes", async () => {
  localStorage.setItem(
    followUpKey,
    JSON.stringify([
      ...DEFAULT_FOLLOW_UP_CORE_ITEMS,
      { ...status, showInStatsCard: false },
    ]),
  );
  renderModal();
  await userEvent.click(screen.getByRole("button", { name: "Follow-Ups" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Reset to Defaults" }),
  );
  expect(switches()[0]).toBeChecked();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.post).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Reopen customization" }),
  );
  expect(switches()[0]).not.toBeChecked();
});

it("shows pending state until saving completes", async () => {
  let finish: () => void = () => {
    throw new Error("Save not started");
  };
  jest.mocked(api.post).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = () => resolve({ data: { success: true } });
      }),
  );
  renderModal();
  await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Follow-Ups" })).toBeDisabled();
  expect(switches()[0]).toBeDisabled();
  expect(switches()[0].closest("fieldset")?.parentElement).toHaveClass(
    "overflow-y-auto",
    "min-h-0",
  );
  finish();
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("loads masters arriving after the dialog opens without overwriting an edited draft", async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  jest.mocked(api.get).mockImplementation(() => new Promise(() => {}));
  render(
    <QueryClientProvider client={queryClient}>
      <Harness />
    </QueryClientProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "Follow-Ups" }));
  fireEvent.click(screen.getByRole("button", { name: "Stats Cards (5)" }));
  queryClient.setQueryData(
    ["lead-masters", "status"],
    [{ ...status, sortOrder: 1, isActive: true }],
  );
  queryClient.setQueryData(["lead-masters", "temperature"], []);
  await waitFor(() =>
    expect(
      screen.getByText("Interested", { selector: "h4, p" }),
    ).toBeInTheDocument(),
  );
  await userEvent.click(switches()[0]);
  queryClient.setQueryData(
    ["lead-masters", "status"],
    [{ ...status, sortOrder: 1, isActive: true, description: "Changed" }],
  );
  await waitFor(() => expect(switches()[0]).not.toBeChecked());
});
