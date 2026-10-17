import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../../../../common/api";
import { usePermission } from "../../../../common/access/usePermission";
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
jest.mock("../../../../common/access/usePermission", () => ({
  usePermission: jest.fn(),
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
    note: "Call after 6 pm",
    mobile: "8888888888",
    status: "INTERESTED",
    createdAt: "2026-10-12T07:00:00Z",
    updatedAt: "2026-10-12T07:00:00Z",
  },
];
let failSearch = false;
let savedNote: string | undefined;
beforeEach(() => {
  jest.clearAllMocks();
  failSearch = false;
  savedNote = undefined;
  jest.mocked(usePermission).mockReturnValue({
    canView: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    canPunchIn: false,
    canPunchOut: false,
  });
  jest.mocked(api.patch).mockResolvedValue({ data: {} });
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    const search = String(config?.params?.search ?? "").toLowerCase();
    const results = contacts.map((contact) => (
      contact.id === "sandeep" && savedNote !== undefined
        ? { ...contact, note: savedNote }
        : contact
    )).filter((contact) =>
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

test("clicking an empty note saves only the note and refreshes the contact row", async () => {
  jest.mocked(api.patch).mockImplementation(async () => {
    savedNote = "Requested a call tomorrow";
    return { data: {} };
  });
  renderContacts();
  await userEvent.click(await screen.findByRole("button", { name: "Edit note for Sandeep Kumar" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "  Requested a call tomorrow  ");
  await userEvent.click(screen.getByRole("button", { name: "Save note" }));

  await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
    "/contact-leads/sandeep", { note: "Requested a call tomorrow" },
  ));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.getByRole("button", { name: "Edit note for Sandeep Kumar" })).toHaveTextContent("Requested a call tomorrow");
});

test("existing notes open in full and cancel discards changes", async () => {
  renderContacts();
  await userEvent.click(await screen.findByRole("button", { name: "Edit note for Another customer" }));
  const note = screen.getByRole("textbox", { name: "Note" });
  expect(note).toHaveValue("Call after 6 pm");
  await userEvent.type(note, " tomorrow");
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(api.patch).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Edit note for Another customer" }));
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("Call after 6 pm");
});

test("clearing an existing note submits an empty note", async () => {
  renderContacts();
  await userEvent.click(await screen.findByRole("button", { name: "Edit note for Another customer" }));
  await userEvent.clear(screen.getByRole("textbox", { name: "Note" }));
  await userEvent.click(screen.getByRole("button", { name: "Save note" }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/contact-leads/other", { note: "" }));
});

test.each([
  [{ response: { data: { message: "Unable to save contact note" } } }, "Unable to save contact note"],
  [{ response: { data: { message: { message: "Nested validation error" } } } }, "Nested validation error"],
  [{}, "Contact lead action failed"],
])("a failed note save shows its error and keeps the draft for retry (%#)", async (error, message) => {
  jest.mocked(api.patch).mockRejectedValueOnce(error);
  renderContacts();
  await userEvent.click(await screen.findByRole("button", { name: "Edit note for Sandeep Kumar" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "Keep this draft");
  await userEvent.click(screen.getByRole("button", { name: "Save note" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("Keep this draft");
  await userEvent.click(screen.getByRole("button", { name: "Save note" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("users without update permission can read the full note without saving", async () => {
  jest.mocked(usePermission).mockReturnValue({
    canView: true, canCreate: false, canUpdate: false, canDelete: false,
    canPunchIn: false, canPunchOut: false,
  });
  renderContacts();
  await userEvent.click(await screen.findByRole("button", { name: "View note for Another customer" }));
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("Call after 6 pm");
  expect(screen.getByRole("textbox", { name: "Note" })).toHaveAttribute("readonly");
  expect(screen.queryByRole("button", { name: "Save note" })).not.toBeInTheDocument();
  await userEvent.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(api.patch).not.toHaveBeenCalled();
});

test("note saving disables repeat submission until the request finishes", async () => {
  let finishSave: () => void = () => { throw new Error("No save pending"); };
  jest.mocked(api.patch).mockImplementationOnce(() => new Promise((resolve) => {
    finishSave = () => resolve({ data: {} });
  }));
  renderContacts();
  await userEvent.click(await screen.findByRole("button", { name: "Edit note for Sandeep Kumar" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "New note");
  await userEvent.click(screen.getByRole("button", { name: "Save note" }));
  expect(await screen.findByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Note" })).toBeDisabled();
  expect(api.patch).toHaveBeenCalledTimes(1);
  finishSave();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
