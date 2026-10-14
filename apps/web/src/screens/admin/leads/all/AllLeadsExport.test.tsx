import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AllLeadsScreen } from "./AllLeadsScreen";
import { api } from "../../../../common/api";
import { downloadLeadRowsCsv } from "../components/exportCsv";
import toast from "react-hot-toast";

jest.mock("../../../../common/api", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));
jest.mock("../../../../store", () => ({
  useAppSelector: () => ({ id: "admin", role: "SUPER_ADMIN" }),
}));
jest.mock("./useLeadRealtimeInvalidation", () => ({
  useLeadRealtimeInvalidation: () => undefined,
}));
jest.mock("../components/exportCsv", () => ({
  downloadLeadRowsCsv: jest.fn(),
}));
jest.mock("./AddLeadModal", () => ({
  AddLeadModal: () => null,
  EditLeadModal: () => null,
}));
jest.mock("../components/LeadPreviewDialog", () => ({
  LeadPreviewDialog: () => null,
}));
jest.mock("../components/LeadActionsMenu", () => ({
  LeadActionsMenu: () => null,
}));
jest.mock("../../bookings/CreateBookingDialog", () => ({
  CreateBookingDialog: () => null,
}));
jest.mock("../site-visits/SiteVisitsScreen", () => ({
  CreateSiteVisitModal: () => null,
}));
jest.mock("../site-visits/useSiteVisits", () => ({
  useSiteVisits: () => ({ data: { rows: [] } }),
  useSiteVisitOptions: () => ({ data: { projects: [] } }),
  useSiteVisitMutations: () => ({ createVisit: { isPending: false } }),
}));
jest.mock("../../projects/useProjectsApi", () => ({
  useProjects: () => ({ data: { projects: [] } }),
}));
jest.mock("./useAllLeads", () => ({
  ...jest.requireActual("./useAllLeads"),
  useLeadListFilterOptions: () => ({
    options: {
      sourceOptions: [],
      integrationAccountOptions: [],
      statusOptions: [],
      stageOptions: [],
      leadTypeOptions: [],
      budgetOptions: [],
      propertyTypeOptions: [],
      configurationOptions: [],
      areaOptions: [],
      ownerOptions: [],
      telecallerOptions: [],
      teamOptions: [],
      projectOptions: [
        { value: "project", label: "Mira Road Sudo" },
        { value: "other", label: "Other project" },
      ],
    },
  }),
  useLeadColumnPreferences: () => ({
    query: {
      data: {
        visibleColumns: ["name", "source", "projectName"],
        lockedColumns: [],
        systemColumns: [
          { id: "name", label: "Name" },
          { id: "source", label: "Source" },
          { id: "projectName", label: "Project Name" },
        ],
      },
    },
    mutation: { mutate: jest.fn() },
  }),
}));
jest.mock("ui", () => ({
  ...jest.requireActual("ui"),
  MultiSelect: ({
    ariaLabel,
    value,
    options,
    onValueChange,
  }: {
    ariaLabel: string;
    value: string[];
    options: Array<{ value: string; label: string }>;
    onValueChange: (value: string[]) => void;
  }) => (
    <select
      multiple
      aria-label={ariaLabel}
      value={value}
      onChange={(event) =>
        onValueChange(
          Array.from(event.target.selectedOptions, (option) => option.value),
        )
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const leads = Array.from({ length: 34 }, (_, index) => ({
  id: `lead-${index}`,
  displayId: `TR${String(index).padStart(6, "0")}`,
  name: `Customer ${index}`,
  mobile: "9999999999",
  statusName: "New Lead",
  sourceName: "Meta Ads",
  projectName: index < 23 ? "Mira Road Sudo" : "Other project",
  requirement: { preferredProjectId: index < 23 ? "project" : "other" },
}));
let failExport = false;
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  failExport = false;
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    if (url !== "/leads") return { data: { data: [], enabledFields: [] } };
    if (failExport && Number(config?.params?.limit) > 10)
      throw { response: { data: { message: "Export request failed" } } };
    const filtered =
      config?.params?.projectId === "project" ? leads.slice(0, 23) : leads;
    const limit = Number(config?.params?.limit ?? 10);
    const page = Number(config?.params?.page ?? 1);
    return {
      data: {
        data: filtered.slice((page - 1) * limit, page * limit),
        meta: { page, limit, total: filtered.length },
      },
    };
  });
});

async function openFilters() {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>
        <AllLeadsScreen />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByText("Customer 0");
  await userEvent.click(
    screen.getByRole("button", { name: /Advanced filters/ }),
  );
}

it("exports every applied-project match, not the ten loaded table rows or an unsaved draft", async () => {
  await openFilters();
  await userEvent.selectOptions(
    screen.getByRole("listbox", { name: "Project", exact: true }),
    "project",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Apply Filter", exact: true }),
  );
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      "/leads",
      expect.objectContaining({
        params: expect.objectContaining({ projectId: "project", limit: 10 }),
      }),
    ),
  );
  await userEvent.selectOptions(
    screen.getByRole("listbox", { name: "Project", exact: true }),
    "other",
  );
  await userEvent.deselectOptions(
    screen.getByRole("listbox", { name: "Project", exact: true }),
    "project",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Export Leads", exact: true }),
  );
  const dialog = await screen.findByRole("dialog", {
    name: "Choose export columns",
  });
  expect(
    within(dialog).getByText(/Export 23 filtered leads/),
  ).toBeInTheDocument();
  await userEvent.click(
    within(dialog).getByRole("checkbox", {
      name: "Include Source",
      exact: true,
    }),
  );
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Export CSV", exact: true }),
  );
  expect(downloadLeadRowsCsv).toHaveBeenCalledWith(
    expect.objectContaining({
      rows: expect.arrayContaining([
        expect.objectContaining({ backendId: "lead-22" }),
      ]),
    }),
  );
  expect(jest.mocked(downloadLeadRowsCsv).mock.calls[0][0].rows).toHaveLength(
    23,
  );
  expect(
    jest.mocked(downloadLeadRowsCsv).mock.calls[0][0].visibleColumns,
  ).toEqual(["name", "projectName"]);
});

it("does not open a download dialog or generate a partial file when the full export request fails", async () => {
  const error = jest.spyOn(toast, "error");
  await openFilters();
  failExport = true;
  await userEvent.click(
    screen.getByRole("button", { name: "Export Leads", exact: true }),
  );
  await waitFor(() =>
    expect(error).toHaveBeenCalledWith("Export request failed"),
  );
  expect(
    screen.queryByRole("dialog", { name: "Choose export columns" }),
  ).not.toBeInTheDocument();
  expect(downloadLeadRowsCsv).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Export Leads", exact: true }),
  ).toBeEnabled();
  error.mockRestore();
});

it("shows preparation state and blocks repeat export requests until all records are ready", async () => {
  await openFilters();
  const normalFetch = jest.mocked(api.get).getMockImplementation();
  let finish: () => void = () => {
    throw new Error("Export not started");
  };
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === "/leads" && Number(config?.params?.limit) > 10)
      return new Promise((resolve) => {
        finish = () =>
          resolve({ data: { data: leads, meta: { total: leads.length } } });
      });
    if (!normalFetch) throw new Error("Missing mock");
    return normalFetch(url, config);
  });
  await userEvent.click(
    screen.getByRole("button", { name: "Export Leads", exact: true }),
  );
  expect(
    screen.getByRole("button", { name: "Preparing export…" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("dialog", { name: "Choose export columns" }),
  ).not.toBeInTheDocument();
  finish();
  const dialog = await screen.findByRole("dialog", {
    name: "Choose export columns",
  });
  await userEvent.click(
    within(dialog).getByRole("button", { name: "Cancel", exact: true }),
  );
  expect(downloadLeadRowsCsv).not.toHaveBeenCalled();
});

it("discards prepared results when applied filters change while the export is loading", async () => {
  const error = jest.spyOn(toast, "error");
  await openFilters();
  const normalFetch = jest.mocked(api.get).getMockImplementation();
  let finish: () => void = () => {
    throw new Error("Export not started");
  };
  let pending = true;
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    if (pending && url === "/leads" && Number(config?.params?.limit) > 10) {
      pending = false;
      return new Promise((resolve) => {
        finish = () =>
          resolve({ data: { data: leads, meta: { total: leads.length } } });
      });
    }
    if (!normalFetch) throw new Error("Missing mock");
    return normalFetch(url, config);
  });
  await userEvent.click(
    screen.getByRole("button", { name: "Export Leads", exact: true }),
  );
  await userEvent.selectOptions(
    screen.getByRole("listbox", { name: "Project", exact: true }),
    "project",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Apply Filter", exact: true }),
  );
  finish();
  await waitFor(() =>
    expect(error).toHaveBeenCalledWith(
      "The filters or workspace changed. Please export again.",
    ),
  );
  expect(downloadLeadRowsCsv).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("dialog", { name: "Choose export columns" }),
  ).not.toBeInTheDocument();
  error.mockRestore();
});
