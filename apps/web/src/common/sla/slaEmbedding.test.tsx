import { readFileSync } from "fs";
import { resolve } from "path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../store";
import { setCredentials } from "../../store/slices/authSlice";
import { AllLeadsScreen } from "../../screens/admin/leads/all/AllLeadsScreen";
import { addLeadSidebarItems } from "../../screens/admin/leads/add/addLeadData";
import { assignLeadsSidebarItems } from "../../screens/admin/leads/assignment/leadAssignmentData";
import { sidebarItems } from "../../screens/admin/dashboard/dashboardData";
import { TelecallerSlaActionCards } from "../../screens/telecaller/dashboard/TelecallerDashboardSections";

let consoleWarnSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: jest.fn(() => false),
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: jest.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: jest.fn(),
  });
});

beforeEach(() => {
  consoleWarnSpy = jest
    .spyOn(console, "warn")
    .mockImplementation(() => undefined);
  consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

function flattenSidebarLabels(
  items: Array<{ label: string; children?: Array<{ label: string }> }>,
) {
  return items.flatMap((item) => [
    item.label,
    ...(item.children?.map((child) => child.label) ?? []),
  ]);
}

function renderAllLeads() {
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
      <MemoryRouter initialEntries={["/leads/all"]}>
        <AllLeadsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

test("shared admin sidebar configs no longer expose SLA Dashboard", () => {
  const labels = [
    ...flattenSidebarLabels(sidebarItems),
    ...flattenSidebarLabels(addLeadSidebarItems),
    ...flattenSidebarLabels(assignLeadsSidebarItems),
  ];

  expect(labels).not.toContain("SLA Dashboard");
});

test("legacy SLA route now redirects to follow-up leads in app routing", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

  expect(appSource).toContain(
    'const SLA_DASHBOARD_PATH = "/leads/sla-dashboard";',
  );
  expect(appSource).toContain("path={SLA_DASHBOARD_PATH}");
  expect(appSource).toContain("<Navigate to={FOLLOW_UP_LEADS_PATH} replace />");
});

test("all leads SLA filter narrows the queue to breached leads", async () => {
  const user = userEvent.setup();
  renderAllLeads();

  expect(screen.getByText("TR001245")).toBeInTheDocument();
  expect(screen.getByText("TR001241")).toBeInTheDocument();

  await user.click(screen.getByRole("combobox", { name: "SLA Status" }));
  await user.click(screen.getByRole("option", { name: "Breached" }));

  expect(screen.queryByText("TR001245")).not.toBeInTheDocument();
  expect(screen.getByText("TR001241")).toBeInTheDocument();
  expect(screen.getByText("TR001238")).toBeInTheDocument();
  expect(screen.getAllByText("Breached").length).toBeGreaterThan(0);
});

test("telecaller SLA action widget renders personal action signals", () => {
  render(
    <MemoryRouter>
      <TelecallerSlaActionCards />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: "SLA Action Queue" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Overdue Follow-ups")).toBeInTheDocument();
  expect(screen.getByText("Due In Next Hour")).toBeInTheDocument();
  expect(screen.getByText("Missed SLA")).toBeInTheDocument();
  expect(screen.getByText("Needs Immediate Response")).toBeInTheDocument();
});
