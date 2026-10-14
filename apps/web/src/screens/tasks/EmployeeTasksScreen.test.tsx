import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { api } from "../../common/api";
import { EmployeeTasksScreen } from "./EmployeeTasksScreen";

const flags = (key: string, create = true, update = true, remove = true) => ({
  moduleKey: key,
  canView: true,
  canCreate: create,
  canUpdate: update,
  canDelete: remove,
  canPunchIn: false,
  canPunchOut: false,
});
let mockUser = {
  id: "hr",
  role: "HR",
  fullName: "HR employee",
  permissions: [flags("tasks"), flags("employees")],
};

jest.mock("../../store", () => ({ useAppSelector: () => mockUser }));
jest.mock("../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("../admin/dashboard/DashboardLayoutContext", () => ({
  useDashboardLayout: jest.fn(),
}));
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  SearchableSelect: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value="">Select</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => (
    <select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const task = {
  id: "task",
  title: "Check employee documents",
  assignedToId: "employee",
  assignedToName: "Employee",
  status: "Pending",
  priority: "Medium",
};
beforeEach(() => {
  jest.clearAllMocks();
  mockUser = {
    id: "hr",
    role: "HR",
    fullName: "HR employee",
    permissions: [flags("tasks"), flags("employees")],
  };
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data:
      url === "/tasks"
        ? { data: [task], meta: { total: 1, page: 1, limit: 100 } }
        : {
            data: [
              {
                id: "employee",
                fullName: "Employee",
                email: "employee@example.com",
                role: "SALES_AGENT",
                isActive: true,
              },
            ],
          },
  }));
  jest.mocked(api.post).mockResolvedValue({ data: task });
  jest.mocked(api.patch).mockResolvedValue({ data: task });
});
function renderTasks() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <EmployeeTasksScreen />
    </QueryClientProvider>,
  );
}

test("read-only HR permissions do not show create, edit, delete, or status-changing actions", async () => {
  mockUser.permissions = [
    flags("tasks", false, false, false),
    flags("employees"),
  ];
  renderTasks();
  await screen.findByText(task.title);
  expect(
    screen.queryByRole("button", { name: "Create Task" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByTitle("Edit task")).not.toBeInTheDocument();
  expect(screen.queryByTitle("Delete task")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Start" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Completed", { selector: "span" }),
  ).not.toBeInTheDocument();
  expect(api.get).not.toHaveBeenCalledWith("/leads", expect.anything());
});

test("HR with create permission can select another employee and create without lead permission", async () => {
  renderTasks();
  await screen.findByText(task.title);
  await userEvent.click(screen.getByRole("button", { name: "Create Task" }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Task title" }),
    "Prepare documents",
  );
  await userEvent.selectOptions(
    screen.getByRole("combobox", { name: "Assign task to employee" }),
    "employee",
  );
  await userEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Create Task",
    }),
  );
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/tasks",
      expect.objectContaining({
        title: "Prepare documents",
        assignedToId: "employee",
        leadId: undefined,
      }),
    ),
  );
  expect(api.get).not.toHaveBeenCalledWith("/leads", expect.anything());
});

test("edit action obeys update permission independently of create/delete", async () => {
  mockUser.permissions = [
    flags("tasks", false, true, false),
    flags("employees"),
  ];
  renderTasks();
  await screen.findByText(task.title);
  expect(
    screen.queryByRole("button", { name: "Create Task" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByTitle("Delete task")).not.toBeInTheDocument();
  await userEvent.click(screen.getByTitle("Edit task"));
  await userEvent.clear(screen.getByRole("textbox", { name: "Task title" }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Task title" }),
    "Updated documents",
  );
  await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith(
      "/tasks/task",
      expect.objectContaining({
        title: "Updated documents",
        assignedToId: "employee",
      }),
    ),
  );
});

test("save failures display the backend reason and keep the draft open", async () => {
  jest.mocked(api.patch).mockRejectedValue({
    response: {
      data: { message: "Selected user is outside your permitted scope" },
    },
  });
  renderTasks();
  await screen.findByText(task.title);
  await userEvent.click(screen.getByTitle("Edit task"));
  await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "Selected user is outside your permitted scope",
    ),
  );
  expect(screen.getByRole("textbox", { name: "Task title" })).toHaveValue(
    task.title,
  );
  expect(toast.success).not.toHaveBeenCalled();
});
