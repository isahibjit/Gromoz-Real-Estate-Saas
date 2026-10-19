import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../../common/api";
import { useAppSelector } from "../../../store";
import { EmailSettingsScreen } from "../../admin/settings/EmailSettingsScreen";
import { MailTemplateManager } from "./MailTemplateManager";
import { PayrollSettingsPage } from "./PayrollSettingsPage";

jest.mock("../../../common/api", () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock("../../../store", () => ({ useAppSelector: jest.fn() }));

function mount(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("active_organization_id", "tenant-a");
  jest.clearAllMocks();
  jest.mocked(api.get).mockResolvedValue({ data: [] });
  jest.mocked(useAppSelector).mockReturnValue({
    role: "ADMIN",
    permissions: [
      { moduleKey: "notifications", canView: true },
      { moduleKey: "page.notification_settings", canView: true },
    ],
  });
});

test("the WhatsApp section points to real settings instead of a client placeholder", async () => {
  mount(<PayrollSettingsPage />);
  await userEvent.click(screen.getByRole("button", { name: "WhatsApp API" }));
  expect(screen.getByRole("link", { name: "Open notification settings" })).toHaveAttribute("href", "/settings/notifications");
  expect(screen.queryByText(/API Status: Connected/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/trurootrealty\.com/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Sync Now" })).not.toBeInTheDocument();
});

test("employees without notification settings access are directed to an administrator", async () => {
  jest.mocked(useAppSelector).mockReturnValue({ role: "HR", permissions: [] });
  mount(<PayrollSettingsPage />);
  await userEvent.click(screen.getByRole("button", { name: "WhatsApp API" }));
  expect(screen.getByText(/Contact your workspace administrator/i)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Open notification settings" })).not.toBeInTheDocument();
});

test("a new email connector starts without another client's credentials", async () => {
  mount(<EmailSettingsScreen />);
  await userEvent.click(screen.getByRole("button", { name: /Link Gmail \/ SMTP Connector/i }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByPlaceholderText("name@example.com")).toHaveValue("");
  expect(within(dialog).getByPlaceholderText("Enter your SMTP password")).toHaveValue("");
  expect(within(dialog).getByPlaceholderText("e.g. Your company")).toHaveValue("");
});

test("legacy unscoped email templates are not loaded into another workspace", async () => {
  localStorage.setItem("truroot_hr_mail_templates_v1", JSON.stringify({ templates: [{ key: "employee-welcome", label: "Old client template", subject: "Old client subject", variables: [] }] }));
  mount(<MailTemplateManager />);
  expect(await screen.findByRole("heading", { name: "Employee Welcome" })).toBeInTheDocument();
  expect(screen.queryByText("Old client template")).not.toBeInTheDocument();
  expect(localStorage.getItem("truroot_hr_mail_templates_v1")).not.toBeNull();
});

test("email drafts stay scoped to their workspace", async () => {
  const storedTemplate = {
    key: "employee-welcome", label: "Tenant A draft", description: "Draft", subject: "Welcome A",
    fromName: "Team A", htmlBody: "<p>Hello</p>", enabled: true, variables: [],
  };
  localStorage.setItem("gromoze_hr_mail_templates_v1:tenant-a", JSON.stringify({ templates: [storedTemplate] }));
  const view = mount(<MailTemplateManager />);
  expect(await screen.findByRole("heading", { name: "Tenant A draft" })).toBeInTheDocument();
  localStorage.setItem("active_organization_id", "tenant-b");
  view.rerender(<QueryClientProvider client={new QueryClient()}><MemoryRouter><MailTemplateManager /></MemoryRouter></QueryClientProvider>);
  expect(await screen.findByRole("heading", { name: "Employee Welcome" })).toBeInTheDocument();
  expect(screen.queryByText("Tenant A draft")).not.toBeInTheDocument();
  expect(localStorage.getItem("gromoze_hr_mail_templates_v1:tenant-a")).not.toBeNull();
});
