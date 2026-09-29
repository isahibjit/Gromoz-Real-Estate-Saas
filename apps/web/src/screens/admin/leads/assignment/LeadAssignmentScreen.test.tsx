import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../../../store";
import { setCredentials } from "../../../../store/slices/authSlice";
import { LeadAssignmentScreen } from "./LeadAssignmentScreen";

let consoleWarnSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

function renderLeadAssignment() {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: "access-token",
      user: {
        id: "user-1",
        email: "admin@truroot.com",
        role: "ADMIN",
        fullName: "Amit Kumar",
      },
    }),
  );

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/leads/assign"]}>
        <LeadAssignmentScreen />
      </MemoryRouter>
    </Provider>,
  );
}

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

test("renders the merged lead assignment workspace", () => {
  renderLeadAssignment();

  expect(
    screen.getByRole("heading", { name: "Lead Assignment", level: 1 }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Lead Management").length).toBeGreaterThan(0);
  expect(
    screen.getByLabelText("Search leads, customers, projects, mobile number"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Assignment Rules" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Bulk Assign" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Open Reassignments" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Unassigned Leads")).toBeInTheDocument();
  expect(screen.getByText("Available Pre Sales Executives")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Unassigned" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(
    screen.getByRole("heading", { name: "Select Leads" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Assign To" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Workload Distribution" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Assignment Insights" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Recent Assignments" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Pro Tip")).toBeInTheDocument();
});

test("lead selection and select-all update assignment summary and disabled state", async () => {
  const user = userEvent.setup();
  renderLeadAssignment();

  expect(screen.getByText("3 Leads")).toBeInTheDocument();

  await user.click(
    screen.getByRole("checkbox", { name: "Select Anjali Mehta" }),
  );
  expect(screen.getByText("4 Leads")).toBeInTheDocument();

  await user.click(screen.getByRole("checkbox", { name: "Select all leads" }));
  expect(screen.getByText("7 Leads")).toBeInTheDocument();

  await user.click(screen.getByRole("checkbox", { name: "Select all leads" }));
  expect(screen.getByText("0 Leads")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Assign Leads" })).toBeDisabled();
});

test("assignee type switching changes table data and summary", async () => {
  const user = userEvent.setup();
  renderLeadAssignment();

  expect(screen.getByText("Pre Sales Executive Name")).toBeInTheDocument();
  expect(screen.getByText("Aditya Patil (Pre Sales Executive)")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Sales Executive" }));
  expect(screen.getByText("Sales Executive Name")).toBeInTheDocument();
  expect(screen.getByText("Amit Joshi (Sales Executive)")).toBeInTheDocument();

  await user.click(screen.getByRole("radio", { name: "Assign to Ravi Nair" }));
  expect(screen.getByText("Ravi Nair (Sales Executive)")).toBeInTheDocument();
});

test("assignment option selection updates the summary", async () => {
  const user = userEvent.setup();
  renderLeadAssignment();

  expect(screen.getAllByText("Round Robin").length).toBeGreaterThan(0);
  await user.click(
    screen.getByRole("radio", { name: /Recommended Assignment/ }),
  );
  expect(screen.getAllByText("Recommended Assignment").length).toBeGreaterThan(
    0,
  );
});

test("manual and bulk tabs keep the assignment workflow available", async () => {
  const user = userEvent.setup();
  renderLeadAssignment();

  expect(
    screen.getByRole("heading", { name: "Select Leads" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Assign To" }),
  ).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Bulk Assignment" }));
  expect(
    screen.getByRole("button", { name: "Bulk Assignment" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByRole("heading", { name: "Select Leads" }),
  ).toBeInTheDocument();
});

test("reassignments tab shows approval-driven reassignment workflow", async () => {
  const user = userEvent.setup();
  renderLeadAssignment();

  await user.click(screen.getByRole("button", { name: "Reassignments" }));

  expect(
    screen.getByRole("heading", { name: "Reassign Leads" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Approval Required")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Suggested Assignee" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Workload Analysis" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Approval Workflow" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Recent Reassignments" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Submit for Approval" }),
  ).toBeInTheDocument();
});

test("assign leads submit keeps frontend adapter behavior", async () => {
  const user = userEvent.setup();
  renderLeadAssignment();

  const assignButton = screen.getByRole("button", { name: "Assign Leads" });
  expect(assignButton).toBeEnabled();

  await user.click(assignButton);
  expect(
    screen.getByText("3 leads ready for assignment to Aditya Patil."),
  ).toBeInTheDocument();
});
