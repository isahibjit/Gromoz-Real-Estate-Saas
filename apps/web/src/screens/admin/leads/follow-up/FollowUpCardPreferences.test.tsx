import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FollowUpLeadsScreen } from "./FollowUpLeadsScreen";
import { api } from "../../../../common/api";
import { DEFAULT_FOLLOW_UP_CORE_ITEMS } from "../../../../common/hooks/useLeadCardPreferences";

jest.mock("../../../../common/api", () => ({ api: { get: jest.fn() } }));
jest.mock("../../dashboard/DashboardSidebar", () => ({
  DashboardSidebar: () => null,
}));
jest.mock("../../dashboard/DashboardHeader", () => ({
  DashboardHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
jest.mock("../all/useAllLeads", () => ({
  useAllLeads: () => ({ data: { rows: [] } }),
  useBulkAssignSelectedLeads: () => ({}),
  useBulkPatchSelectedLeads: () => ({}),
  useLeadUpdateFieldPermissions: () => ({
    query: { data: { enabledFields: [] } },
  }),
  useLeadListFilterOptions: () => ({
    options: {
      sourceOptions: [],
      ownerOptions: [],
      telecallerOptions: [],
      teamOptions: [],
      areaOptions: [],
      budgetOptions: [],
      configurationOptions: [],
      leadTypeOptions: [],
      statusOptions: [{ value: "interested", label: "Interested" }],
    },
  }),
}));

beforeEach(() => {
  localStorage.clear();
  jest
    .mocked(api.get)
    .mockResolvedValue({ data: { data: [], meta: { total: 0 } } });
});

function renderFollowUps(hidden: boolean) {
  localStorage.setItem(
    "crm_card_prefs_v2_follow_up",
    JSON.stringify([
      ...DEFAULT_FOLLOW_UP_CORE_ITEMS.map((item) => ({
        ...item,
        showInStatsCard: !hidden,
      })),
      {
        id: "interested",
        name: "Interested",
        category: "status",
        order: 6,
        showInStatsCard: !hidden,
        showInFilterBar: !hidden,
      },
    ]),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(
    ["lead-masters", "status"],
    [
      {
        id: "interested",
        name: "Interested",
        code: "INTERESTED",
        isActive: true,
        sortOrder: 1,
        showInStatsCard: true,
        showInFilterBar: true,
      },
    ],
  );
  queryClient.setQueryData(["lead-masters", "temperature"], []);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/leads/follow-up"]}>
        <FollowUpLeadsScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

it("does not resurrect default cards or pills when all saved items are hidden", () => {
  renderFollowUps(true);
  expect(screen.queryByText("Today's Follow-Ups")).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Quick lead status filters"),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Interested (0)" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "New Lead (0)" }),
  ).not.toBeInTheDocument();
});

it("continues showing configured cards and pills when enabled", () => {
  renderFollowUps(false);
  expect(screen.getByText("Today's Follow-Ups")).toBeInTheDocument();
  expect(
    within(screen.getByLabelText("Quick lead status filters")).getByRole(
      "button",
      { name: "Interested (0)" },
    ),
  ).toBeInTheDocument();
});
