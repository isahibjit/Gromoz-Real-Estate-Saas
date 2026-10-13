import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LeadsTable } from "./AllLeadsScreen";
import type { LeadRow } from "./allLeadsTypes";
import { api } from "../../../../common/api";
import { useBulkPatchSelectedLeads } from "./useAllLeads";
import { scheduledInputToIso } from "../../../../common/time";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock("../../projects/useProjectsApi", () => ({
  useProjects: () => ({ data: { projects: [] } }),
}));
jest.mock("../components/LeadPreviewDialog", () => ({
  LeadPreviewDialog: () => null,
}));
jest.mock("../components/LeadActionsMenu", () => ({
  LeadActionsMenu: () => null,
}));
jest.mock("../../bookings/CreateBookingDialog", () => ({
  CreateBookingDialog: () => null,
}));
jest.mock("../site-visits/SiteVisitsScreen", () => ({
  CreateSiteVisitModal: () => null,
}));
jest.mock("../site-visits/useSiteVisits", () => ({
  useSiteVisitOptions: () => ({ data: { projects: [] } }),
  useSiteVisitMutations: () => ({ createVisit: { isPending: false } }),
}));
jest.mock("./useAllLeads", () => ({
  ...jest.requireActual("./useAllLeads"),
  useBulkUpdateLeadSource: () => ({ isPending: false }),
  useBulkAssignSelectedLeads: () => ({ isPending: false }),
  useBulkPatchSelectedLeads: jest.fn(),
  useLeadColumnPreferences: () => ({
    query: {
      data: {
        visibleColumns: ["name", "executive", "leadStatus", "remark"],
        lockedColumns: [],
        systemColumns: [
          { id: "name", label: "Name" },
          { id: "executive", label: "Executive" },
          { id: "leadStatus", label: "Lead Status" },
          { id: "remark", label: "Remark" },
        ],
      },
    },
    mutation: { mutate: jest.fn() },
  }),
  useLeadUpdateFieldPermissions: () => ({
    query: {
      isLoading: false,
      data: {
        enabledFields: [
          "status",
          "leadType",
          "budget",
          "configuration",
          "remark",
          "followUpDate",
        ],
      },
    },
  }),
}));
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  SearchableSelect: ({
    value,
    onValueChange,
    options,
    placeholder,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? placeholder}
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

const mockBulkPatch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useBulkPatchSelectedLeads).mockReturnValue({
    isPending: false,
    mutateAsync: mockBulkPatch,
  } as unknown as ReturnType<typeof useBulkPatchSelectedLeads>);
  jest.mocked(api.get).mockResolvedValue({
    data: {
      notes: [
        {
          id: "note",
          text: "Existing customer remark",
          authorName: "Afreen",
        },
      ],
    },
  });
});

const lead: LeadRow = {
  id: "display-id",
  backendId: "backend-id",
  name: "Customer One",
  avatarSeed: "CO",
  mobile: "+919999999999",
  addedDate: "12 Oct 2026",
  lastUpdate: "12 Oct 2026",
  source: "Meta Ads",
  budget: "Not Set",
  propertyType: "Residential",
  projectName: "Not Set",
  statusId: "new",
  statusName: "New Lead",
  stage: "New",
  stageTone: "blue",
  status: "New Lead",
  priority: "Normal",
  leadType: "Warm",
  assignedTo: "Afreen",
  assignedRole: "Pre Sales",
  lastFollowUp: "Not Set",
  nextFollowUp: "Not Set",
  remark: "Call back tomorrow",
  leadScore: 0,
  leadScoreLabel: "New",
  budgetRange: "budget",
  configuration: "3 BHK",
};

function renderTable(rows: LeadRow[] = [lead]) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <LeadsTable
          rows={rows}
          total={1}
          isLoading={false}
          activeLeadBucketFilter="all"
          completedSiteVisitLeadIds={new Set()}
          selectedSlaFilter="all"
          sourceOptions={[]}
          statusOptions={[
            { value: "new", label: "New Lead", allowFollowUp: true },
          ]}
          leadTypeOptions={[]}
          budgetOptions={[{ value: "budget", label: "One crore" }]}
          configurationOptions={[{ value: "3 BHK", label: "3 BHK" }]}
          areaOptions={[]}
          assigneeOptions={[]}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("renders a duplicated sales assignee once in the Executive column", () => {
  renderTable([
    {
      ...lead,
      ownerId: "sales-1",
      ownerName: "Akshat",
      telecallerId: "sales-1",
      telecallerName: "Akshat",
      fieldExecutiveId: "sales-1",
      fieldExecutiveName: "Akshat",
    },
  ]);

  expect(screen.getAllByText("Akshat")).toHaveLength(1);
  expect(screen.getByText("Sales Executive")).toBeInTheDocument();
  expect(screen.queryByText("Pre Sales Executive")).not.toBeInTheDocument();
});

test("renders distinct Pre Sales and Sales assignments in the Executive column", () => {
  renderTable([
    {
      ...lead,
      telecallerId: "pre-sales-1",
      telecallerName: "Afreen",
      fieldExecutiveId: "sales-1",
      fieldExecutiveName: "Akshat",
    },
  ]);

  expect(
    screen.getByRole("button", {
      name: "Afreen Pre Sales Executive Akshat Sales Executive",
    }),
  ).toBeInTheDocument();
});

test.each(["remark", "status"])(
  "the %s entry point opens the same update form with history",
  async (entry) => {
    renderTable();
    await userEvent.click(
      entry === "remark"
        ? screen.getByRole("button", { name: "Update remark for Customer One" })
        : screen.getByRole("button", { name: "New Lead" }),
    );
    expect(
      screen.getByRole("heading", { name: "Update reminder, status & remark" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Select status" })).toHaveValue(
      "new",
    );
    expect(screen.getByRole("combobox", { name: "Select budget" })).toHaveValue(
      "budget",
    );
    expect(
      screen.getByRole("combobox", { name: "Select configuration" }),
    ).toHaveValue("3 BHK");
    expect(screen.getByPlaceholderText("Enter new remark...")).toHaveValue("");
    await userEvent.click(screen.getByRole("tab", { name: "Remarks history" }));
    await screen.findByText("Existing customer remark");
    expect(api.get).toHaveBeenCalledWith("/leads/backend-id");
    expect(mockBulkPatch).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  },
);

test("remark entry uses existing follow-up validation before any write", async () => {
  renderTable();
  await userEvent.click(
    screen.getByRole("button", { name: "Update remark for Customer One" }),
  );
  fireEvent.change(screen.getByPlaceholderText("Enter new remark..."), {
    target: { value: "New remark" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  expect(mockBulkPatch).not.toHaveBeenCalled();
  expect(api.post).not.toHaveBeenCalled();
});

test("remark entry saves via the existing lead update and follow-up workflow", async () => {
  renderTable();
  await userEvent.click(
    screen.getByRole("button", { name: "Update remark for Customer One" }),
  );
  fireEvent.change(screen.getByPlaceholderText("Enter new remark..."), {
    target: { value: "New customer remark" },
  });
  fireEvent.change(screen.getByLabelText("Follow-up date", { exact: true }), {
    target: { value: "2026-10-13" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("heading", {
        name: "Update reminder, status & remark",
      }),
    ).not.toBeInTheDocument(),
  );
  expect(mockBulkPatch).toHaveBeenCalledWith({
    leadIds: ["backend-id"],
    payload: expect.objectContaining({
      statusId: "new",
      remarks: "New customer remark",
      nextFollowUpAt: scheduledInputToIso("2026-10-13", "10:00 AM"),
    }),
  });
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.post).toHaveBeenCalledWith(
    "/leads/backend-id/follow-ups",
    expect.objectContaining({ remarks: "New customer remark" }),
  );
});

test("a failed lead update keeps the form and draft and creates no follow-up", async () => {
  mockBulkPatch.mockRejectedValueOnce(new Error("Update failed"));
  renderTable();
  await userEvent.click(
    screen.getByRole("button", { name: "Update remark for Customer One" }),
  );
  fireEvent.change(screen.getByPlaceholderText("Enter new remark..."), {
    target: { value: "Keep this draft" },
  });
  fireEvent.change(screen.getByLabelText("Follow-up date", { exact: true }), {
    target: { value: "2026-10-13" },
  });
  await userEvent.click(screen.getByRole("button", { name: "Update Lead" }));
  await waitFor(() => expect(mockBulkPatch).toHaveBeenCalledTimes(1));
  expect(screen.getByPlaceholderText("Enter new remark...")).toHaveValue(
    "Keep this draft",
  );
  expect(api.post).not.toHaveBeenCalled();
});
