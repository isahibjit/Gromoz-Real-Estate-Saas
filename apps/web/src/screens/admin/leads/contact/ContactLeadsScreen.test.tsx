import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../../../common/api";
import {
  DashboardLayoutProvider,
  useDashboardLayoutContext,
} from "../../dashboard/DashboardLayoutContext";
import { ContactLeadsScreen } from "./ContactLeadsScreen";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
jest.mock("../../../../store", () => ({
  useAppSelector: () => ({ id: "admin", role: "SUPER_ADMIN" }),
}));
jest.mock("../../projects/useProjectsApi", () => ({
  useProjects: () => ({ data: { projects: [] } }),
}));
jest.mock("../all/useAllLeads", () => ({
  useLeadListFilterOptions: () => ({
    options: {
      sourceOptions: [],
      ownerOptions: [],
      teamOptions: [],
      areaOptions: [],
      configurationOptions: [],
    },
  }),
}));

const contacts = [
  {
    id: "sandeep",
    customerName: "Sandeep Kumar",
    mobile: "9999999999",
    status: "COLD",
    createdAt: "2026-10-13T07:00:00Z",
    updatedAt: "2026-10-13T07:00:00Z",
  },
  {
    id: "other",
    customerName: "Another customer",
    mobile: "8888888888",
    status: "INTERESTED",
    createdAt: "2026-10-12T07:00:00Z",
    updatedAt: "2026-10-12T07:00:00Z",
  },
];
let failSearch = false;
beforeEach(() => {
  jest.clearAllMocks();
  failSearch = false;
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    const search = String(config?.params?.search ?? "").toLowerCase();
    const results = contacts.filter((contact) =>
      contact.customerName.toLowerCase().includes(search),
    );
    if (url === "/contact-leads/stats")
      return {
        data: {
          data: {
            total: results.length,
            cold: results.length,
            interested: 0,
            notInterested: 0,
            converted: 0,
          },
        },
      };
    if (url === "/contact-leads" && failSearch && search)
      throw {
        response: { data: { message: "Search temporarily unavailable" } },
      };
    return {
      data: {
        data: results,
        meta: { page: 1, limit: 10, total: results.length },
      },
    };
  });
});

function Header() {
  const layout = useDashboardLayoutContext();
  return <>{layout?.header.headerContent}</>;
}
function renderContacts() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <DashboardLayoutProvider>
          <Header />
          <ContactLeadsScreen />
        </DashboardLayoutProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test("the actual header Enter search sends the trimmed term to both list and totals", async () => {
  renderContacts();
  await screen.findByText("Another customer");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search contact leads" }),
    " sandeep {Enter}",
  );
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      "/contact-leads",
      expect.objectContaining({
        params: expect.objectContaining({ search: "sandeep", page: 1 }),
      }),
    ),
  );
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      "/contact-leads/stats",
      expect.objectContaining({
        params: expect.objectContaining({ search: "sandeep" }),
      }),
    ),
  );
  await waitFor(() =>
    expect(screen.queryByText("Another customer")).not.toBeInTheDocument(),
  );
  expect(screen.getByText("Sandeep Kumar")).toBeInTheDocument();
});

test("clearing and submitting the search restores the unfiltered contact list", async () => {
  renderContacts();
  await screen.findByText("Another customer");
  const input = screen.getByRole("textbox", { name: "Search contact leads" });
  await userEvent.type(input, "sandeep{Enter}");
  await waitFor(() =>
    expect(screen.queryByText("Another customer")).not.toBeInTheDocument(),
  );
  await userEvent.clear(input);
  await userEvent.type(input, "{Enter}");
  await screen.findByText("Another customer");
  expect(screen.getByText("Sandeep Kumar")).toBeInTheDocument();
});

test("a true no-match result shows the normal empty state", async () => {
  renderContacts();
  await screen.findByText("Another customer");
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search contact leads" }),
    "no-match{Enter}",
  );
  await screen.findByText("No contact leads found for these filters.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("an API search failure is not shown as zero contacts and Retry restores the matches", async () => {
  renderContacts();
  await screen.findByText("Another customer");
  failSearch = true;
  await userEvent.type(
    screen.getByRole("textbox", { name: "Search contact leads" }),
    "sandeep{Enter}",
  );
  await screen.findByRole("alert");
  expect(
    screen.getByText("Search temporarily unavailable"),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("No contact leads found for these filters."),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByText("Showing 0 of 0 contact leads"),
  ).not.toBeInTheDocument();
  failSearch = false;
  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  await screen.findByText("Sandeep Kumar");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
