import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../../store";
import { setCredentials } from "../../../store/slices/authSlice";
import { DashboardScreen } from "./dashboard";
import type { AdminDashboardData } from "./useAdminDashboard";
import { useAdminDashboard } from "./useAdminDashboard";
import { useLiveFieldExecutiveLocations } from "../../field-executive/useFieldExecutive";

jest.mock("./DashboardSections", () => ({
  DashboardQuickActions: () => <div>Quick actions</div>,
  DashboardMetricCards: () => <div>Metric cards</div>,
  LiveExecutiveTrackingPanel: () => <div>Live executive tracking</div>,
  PendingFollowUpsPanel: () => <div>Pending follow-ups</div>,
  TodayAgendaPanel: () => <div>{"Today's agenda"}</div>,
  ConversionTrendPanel: () => <div>Lead conversion trend</div>,
  UpcomingSiteVisitsPanel: () => <div>Upcoming site visits</div>,
  TeamPerformancePanel: () => <div>Team performance</div>,
  AlertsPanel: () => <div>Operational alerts</div>,
  RemindersPanel: () => <div>Reminders</div>,
  LeadsBySourceChart: () => <div>Leads by source</div>,
  LeadFunnelChart: () => <div>Lead funnel</div>,
  RecentActivityPanel: () => <div>Recent activity</div>,
}));

jest.mock("./useAdminDashboard", () => ({
  useAdminDashboard: jest.fn(),
}));

jest.mock("../../field-executive/useFieldExecutive", () => ({
  useLiveFieldExecutiveLocations: jest.fn(),
}));

const mockUseAdminDashboard = useAdminDashboard as jest.MockedFunction<
  typeof useAdminDashboard
>;
const mockUseLiveFieldExecutiveLocations =
  useLiveFieldExecutiveLocations as jest.MockedFunction<
    typeof useLiveFieldExecutiveLocations
  >;

const adminDashboardFixture: AdminDashboardData = {
  meta: {
    range: "today",
    label: "Today",
    dateFrom: "2026-06-30T00:00:00.000Z",
    dateTo: "2026-06-30T23:59:59.999Z",
  },
  kpi: {
    totalLeads: 148,
    followUpsDueToday: 22,
    overdueFollowUps: 7,
    siteVisitsPendingToday: 12,
    siteVisitsCompletedToday: 9,
    bookingsDoneToday: 3,
    teamsNeedingAttention: 2,
  },
  metricCards: [
    {
      id: "follow-ups-due",
      label: "Follow-ups due",
      value: 22,
      helper: "vs yesterday",
      change: "25%",
      direction: "up",
    },
  ],
  sourceDistribution: [
    { name: "MagicBricks", value: 62, percent: "41.9%", color: "#082b55" },
  ],
  conversionFunnel: [
    {
      stage: "New lead",
      value: "148",
      percent: "100%",
      width: "100%",
      color: "#082b55",
    },
  ],
  teamPerformance: [
    {
      id: "team-alpha",
      name: "Sales Alpha",
      leaderName: "Khushvinder Kaur",
      telecallerCount: 2,
      fieldExecutiveCount: 3,
      assignedLeads: 45,
      followUpsDone: 12,
      pendingFollowUps: 8,
      overdueFollowUps: 2,
      todaySiteVisitsScheduled: 5,
      todaySiteVisitsCompleted: 4,
      conversionRate: "33%",
      health: "On Track",
      completionRate: "80%",
    },
  ],
  pendingFollowUps: [
    {
      id: "follow-1",
      leadId: "lead-1",
      leadName: "Rohan Sharma",
      leadDisplayId: "TR000001",
      assignedToId: "tele-1",
      assignedToName: "Sushant Singh",
      assignedToRole: "TELECALLER",
      scheduledAt: "2026-06-30T05:00:00.000Z",
      dueLabel: "30 Jun 2026, 10:30 AM",
      nextAction: "Call back after budget confirmation",
      isOverdue: true,
    },
  ],
  todaySiteVisits: [
    {
      id: "visit-1",
      displayId: "SV-1001",
      leadId: "lead-1",
      leadName: "Rohan Sharma",
      leadDisplayId: "TR000001",
      projectName: "Ocean Heights",
      scheduledAt: "2026-06-30T06:00:00.000Z",
      scheduledLabel: "30 Jun 2026, 11:30 AM",
      status: "Confirmed",
      checkedInAt: null,
      checkedOutAt: null,
      assignedExecutiveId: "exec-1",
      assignedExecutiveName: "Khushvinder Kaur",
      assignedExecutiveImage: null,
    },
  ],
  todayAgenda: [
    {
      id: "agenda-1",
      time: "10:00 AM",
      title: "Site visit",
      subtitle: "Sunset Residency",
      type: "Site visit",
      statusLabel: "Confirmed",
      statusTone: "info",
      assigneeName: "Meera Joshi",
    },
  ],
  upcomingSiteVisits: [
    {
      id: "visit-1",
      displayId: "SV-1001",
      projectName: "Sunset Residency",
      projectImage: null,
      leadName: "Rohan Sharma",
      scheduledAt: "2026-06-30T06:00:00.000Z",
      scheduledLabel: "30 Jun 2026, 11:30 AM",
      status: "Confirmed",
      assigneeName: "Khushvinder Kaur",
    },
  ],
  reminders: [
    {
      id: "rem-1",
      title: "Follow up with Sushant Singh",
      leadName: "Rohan Sharma",
      scheduledAt: "2026-06-30T06:00:00.000Z",
      scheduledLabel: "Today, 11:00 AM",
      assigneeName: "Admin User",
    },
  ],
  recentActivity: [
    {
      id: "activity-1",
      title: "Lead assigned",
      subtitle: "Sushant Singh → Meera Joshi",
      occurredAt: "2026-06-30T04:00:00.000Z",
      occurredLabel: "10 mins ago",
      type: "assignment",
    },
  ],
  conversionTrend: {
    summaryRate: "28%",
    summaryChange: "8% vs last week",
    currentWeek: [
      { label: "Mon", rate: 10 },
      { label: "Tue", rate: 20 },
    ],
    previousWeek: [
      { label: "Mon", rate: 8 },
      { label: "Tue", rate: 16 },
    ],
  },
  visitExecutionSummary: {
    pending: 12,
    inProgress: 2,
    completed: 9,
    overdue: 1,
  },
  teamHealthSummary: {
    topTeamName: "Sales Alpha",
    topTeamRate: "80%",
    attentionTeamName: "Sales Beta",
    totalTeams: 2,
  },
  alerts: [
    {
      title: "2 follow-ups are overdue",
      subtitle: "Action required on delayed lead drops.",
      time: "15 mins ago",
      tone: "danger",
    },
  ],
};

function renderDashboard() {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "access-token",
      user: {
        id: "user-1",
        email: "admin@truroot.com",
        role: "ADMIN",
        fullName: "Admin User",
      },
    }),
  );

  return render(
    <Provider store={store}>
      <MemoryRouter>
        <DashboardScreen />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  mockUseAdminDashboard.mockImplementation(
    () =>
      ({
        data: adminDashboardFixture,
        isLoading: false,
        error: null,
      }) as ReturnType<typeof useAdminDashboard>,
  );
  mockUseLiveFieldExecutiveLocations.mockReturnValue({
    data: { rows: [] },
  } as ReturnType<typeof useLiveFieldExecutiveLocations>);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("renders the redesigned admin dashboard layout", () => {
  renderDashboard();

  expect(screen.getByText("Quick actions")).toBeInTheDocument();
  expect(screen.getByText("Metric cards")).toBeInTheDocument();
  expect(screen.getByText("Live executive tracking")).toBeInTheDocument();
  expect(screen.getByText("Pending follow-ups")).toBeInTheDocument();
  expect(screen.getByText("Today's agenda")).toBeInTheDocument();
  expect(screen.getByText("Lead conversion trend")).toBeInTheDocument();
  expect(screen.getByText("Upcoming site visits")).toBeInTheDocument();
  expect(screen.getByText("Team performance")).toBeInTheDocument();
  expect(screen.getByText("Operational alerts")).toBeInTheDocument();
  expect(screen.getByText("Reminders")).toBeInTheDocument();
  expect(screen.getByText("Leads by source")).toBeInTheDocument();
  expect(screen.getByText("Lead funnel")).toBeInTheDocument();
  expect(screen.getByText("Recent activity")).toBeInTheDocument();
});

test("renders the timeframe selector with the default range", () => {
  renderDashboard();

  expect(screen.getByRole("combobox", { name: /timeframe/i })).toBeInTheDocument();
  expect(mockUseAdminDashboard).toHaveBeenLastCalledWith("today");
});
