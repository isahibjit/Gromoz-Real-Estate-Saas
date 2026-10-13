import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../store";
import { setCredentials } from "../../store/slices/authSlice";
import { PerformanceRankingCard } from "./PerformanceRankingCard";
import {
  type DashboardRankingsResponse,
  useDashboardRankings,
} from "./useDashboardRankings";

jest.mock("./useDashboardRankings", () => ({
  useDashboardRankings: jest.fn(),
}));

jest.mock("ui", () => {
  const actual = jest.requireActual("ui");
  return {
    ...actual,
    SearchableSelect: ({
      ariaLabel,
      onValueChange,
      options,
      value,
    }: {
      ariaLabel: string;
      onValueChange: (value: string) => void;
      options: Array<{ label: string; value: string }>;
      value: string;
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
  };
});

const mockUseDashboardRankings = useDashboardRankings as jest.MockedFunction<
  typeof useDashboardRankings
>;

const rankingsFixture: DashboardRankingsResponse = {
  meta: {
    range: "monthly",
    mode: "both",
    dateFrom: "2026-10-01T00:00:00.000Z",
    dateTo: "2026-10-31T23:59:59.999Z",
    label: "October 2026",
    scopedToTeam: true,
    peerRole: "TELECALLER",
    rankingScopeTeamIds: ["team-a", "team-b"],
    rankingScopeTeamNames: ["Team A", "Team B"],
    rankingScopeLabel: "Team A, Team B",
  },
  summary: {
    currentUserRank: 1,
    currentTeamRank: 1,
    currentUserPoints: 10,
    currentTeamPoints: 20,
    totalScore: 20,
    topUser: null,
    topTeam: null,
  },
  userRankings: [],
  teamRankings: [],
  filters: {
    canViewAll: true,
    teams: [
      { id: "team-a", name: "Team A" },
      { id: "team-b", name: "Team B" },
    ],
    users: [
      { id: "user-a", name: "Agent A", role: "TELECALLER", teamId: "team-a" },
      { id: "user-b", name: "Agent B", role: "TELECALLER", teamId: "team-b" },
    ],
  },
};

function renderCard() {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "access-token",
      user: {
        id: "user-a",
        email: "agent-a@example.com",
        role: "TELECALLER",
        fullName: "Agent A",
        permissions: [
          {
            moduleKey: "top_performers",
            canView: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canPunchIn: false,
            canPunchOut: false,
          },
        ],
      },
    }),
  );

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <PerformanceRankingCard />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  mockUseDashboardRankings.mockReturnValue({
    data: rankingsFixture,
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useDashboardRankings>);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("forwards scoped ranking filters for an authorized non-admin user", () => {
  renderCard();

  expect(mockUseDashboardRankings).toHaveBeenLastCalledWith(
    expect.objectContaining({
      mode: "both",
      teamId: "all",
      userId: "all",
    }),
  );

  fireEvent.change(screen.getByLabelText("Filter ranking by team"), {
    target: { value: "team-b" },
  });
  expect(mockUseDashboardRankings).toHaveBeenLastCalledWith(
    expect.objectContaining({
      mode: "both",
      teamId: "team-b",
      userId: "all",
    }),
  );

  fireEvent.change(screen.getByLabelText("Filter ranking by employee"), {
    target: { value: "user-b" },
  });
  expect(mockUseDashboardRankings).toHaveBeenLastCalledWith(
    expect.objectContaining({
      mode: "both",
      teamId: "team-b",
      userId: "user-b",
    }),
  );
});
