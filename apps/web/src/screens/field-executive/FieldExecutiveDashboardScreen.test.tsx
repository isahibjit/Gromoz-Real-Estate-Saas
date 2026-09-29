import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { api } from "../../common/api";
import { makeStore } from "../../store";
import { setCredentials } from "../../store/slices/authSlice";
import { FieldExecutiveDashboardScreen } from "./FieldExecutiveDashboardScreen";

jest.mock("../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn() },
}));
jest.mock("./RouteMap", () => ({
  RouteMap: () => <div>Route map</div>,
}));

const mockedApi = api as jest.Mocked<typeof api>;

test("renders field executive metrics from the scoped dashboard endpoint", async () => {
  mockedApi.get.mockImplementation(async (url) => {
    if (url === "/dashboard/field-executive") {
      return {
        data: {
          kpis: {
            assignedLeads: 2,
            todaysVisits: 1,
            upcomingVisits: 2,
            completedVisits: 1,
            pendingFollowUps: 1,
            missedVisits: 0,
            checkInsPending: 1,
            bookingsAssisted: 1,
          },
          myDay: {
            todaysVisits: 1,
            followUpsToday: 1,
            checkInsPending: 1,
            completedVisits: 0,
            nextVisit: "10:00 am",
          },
          todaySchedule: [],
          funnel: [],
          checkInStatus: { checkedIn: 0, checkedOut: 0, pending: 1, missed: 0 },
          followUps: [],
          recentActivities: [],
        },
      };
    }
    if (url === "/site-visits") {
      return { data: { data: [], meta: { total: 0 } } };
    }
    if (url === "/attendance/today") {
      return {
        data: {
          status: "Not Checked In",
          canPunchIn: true,
          canPunchOut: false,
          shift: {
            name: "Field operations shift",
            scheduleLabel: "09:00 - 18:00",
          },
        },
      };
    }
    throw new Error(`Unexpected API request: ${url}`);
  });
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "token",
      user: {
        id: "field-1",
        email: "field.executive@gmail.com",
        fullName: "Field Executive User",
        role: "SALES_AGENT",
        permissions: [
          {
            moduleKey: "attendance",
            canView: true,
            canCreate: false,
            canUpdate: false,
            canDelete: false,
            canPunchIn: true,
            canPunchOut: true,
          },
        ],
      },
    }),
  );

  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Provider store={store}>
        <MemoryRouter>
          <FieldExecutiveDashboardScreen />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );

  expect(
    await screen.findByRole("heading", { name: "Dashboard" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Assigned Leads")).toBeInTheDocument();
  expect(screen.getByText("Today's Upcoming Site Visits")).toBeInTheDocument();
  expect(screen.getByText("Today's punch")).toBeInTheDocument();
  expect(mockedApi.get).toHaveBeenCalledWith("/dashboard/field-executive");
});
