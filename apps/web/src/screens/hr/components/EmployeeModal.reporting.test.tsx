import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "../../../common/api";
import { EmployeeModal, type Employee } from "./EmployeeModal";

jest.mock("../../../common/api", () => ({ api: { get: jest.fn() } }));

const candidates = [
  { id: "anil", fullName: "Anil Maurya", role: "MANAGER", isActive: true },
  { id: "sameer", fullName: "Sameer", role: "MANAGER", isActive: true },
  {
    id: "sales-manager",
    fullName: "Sales manager",
    role: "SALES_MANAGER",
    isActive: true,
  },
  {
    id: "leader",
    fullName: "Ankit Yadav",
    role: "TEAM_LEADER",
    isActive: true,
  },
  {
    id: "admin",
    fullName: "Rajesh Maurya",
    role: "SUPER_ADMIN",
    isActive: true,
  },
  {
    id: "inactive",
    fullName: "Inactive manager",
    role: "MANAGER",
    isActive: false,
  },
  {
    id: "staff",
    fullName: "Another salesperson",
    role: "SALES_AGENT",
    isActive: true,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: {
      data: url === "/employees" ? candidates : [],
      meta: { total: candidates.length },
    },
  }));
});

async function openReporting(role = "TELECALLER", id = "employee") {
  const onSave = jest.fn().mockResolvedValue(true);
  const employee: Employee = {
    id,
    fullName: "Test employee",
    email: "employee@example.test",
    role,
    joiningDate: "2026-10-15",
    monthlyBasic: 10000,
  };
  render(
    <EmployeeModal
      isOpen
      onClose={jest.fn()}
      onSave={onSave}
      employee={employee}
    />,
  );
  const trigger = await screen.findByRole("button", {
    name: "Reporting manager",
  });
  await waitFor(() => expect(trigger).toBeEnabled());
  await userEvent.click(trigger);
  return { onSave, menu: screen.getByRole("menu") };
}

test.each([
  "TELECALLER",
  "SALES_AGENT",
  "FIELD_EXECUTIVE",
  "MARKETING",
  "BACKEND",
])("%s can choose active Managers and Team Leaders", async (role) => {
  const { menu } = await openReporting(role);
  for (const name of [
    "Anil Maurya",
    "Sameer",
    "Sales manager",
    "Ankit Yadav",
  ]) {
    expect(
      within(menu).getByRole("menuitem", { name: new RegExp(name) }),
    ).toBeInTheDocument();
  }
  expect(within(menu).queryByText("Inactive manager")).not.toBeInTheDocument();
  expect(
    within(menu).queryByText("Another salesperson"),
  ).not.toBeInTheDocument();
  expect(within(menu).queryByText("Rajesh Maurya")).not.toBeInTheDocument();
});

test("a Manager can choose the active Super Admin as reporting manager", async () => {
  const { menu } = await openReporting("MANAGER");
  expect(within(menu).getByText("Rajesh Maurya")).toBeInTheDocument();
  expect(within(menu).queryByText("Ankit Yadav")).not.toBeInTheDocument();
});

test("creating a new Pre Sales employee shows the existing active Managers", async () => {
  render(<EmployeeModal isOpen onClose={jest.fn()} onSave={jest.fn()} />);
  const trigger = await screen.findByRole("button", {
    name: "Reporting manager",
  });
  await waitFor(() => expect(trigger).toBeEnabled());
  await userEvent.click(trigger);
  const menu = screen.getByRole("menu");
  expect(within(menu).getByText("Anil Maurya")).toBeInTheDocument();
  expect(within(menu).getByText("Sameer")).toBeInTheDocument();
});

test("a Team Leader cannot select themselves as reporting manager", async () => {
  const { menu } = await openReporting("TEAM_LEADER", "leader");
  expect(within(menu).queryByText("Ankit Yadav")).not.toBeInTheDocument();
  expect(within(menu).getByText("Anil Maurya")).toBeInTheDocument();
});

test("selecting a Manager submits the existing reportingToId field", async () => {
  const { menu, onSave } = await openReporting();
  await userEvent.click(within(menu).getByText("Anil Maurya"));
  await userEvent.click(
    screen.getByRole("button", {
      name: /Save changes|Update employee|Save employee/i,
    }),
  );
  await waitFor(() =>
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ reportingToId: "anil" }),
    ),
  );
});
