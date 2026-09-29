import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../../../store";
import { setCredentials } from "../../../../store/slices/authSlice";
import { CreateSiteVisitActionDialog } from "./CreateSiteVisitActionDialog";
import toast from "react-hot-toast";
import { SiteVisitsScreen, CreateSiteVisitModal, type CreateVisitFormState } from "./SiteVisitsScreen";
import {
  useSiteVisitMutations,
  useSiteVisitOptions,
  useSiteVisits,
} from "./useSiteVisits";

jest.mock("../../../../common/api", () => ({ api: { get: jest.fn().mockResolvedValue({ data: { data: [] } }), post: jest.fn() } }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

jest.mock("../../../../common/services/auth.api", () => ({
  logout: jest.fn(),
}));

jest.mock("./useSiteVisits", () => ({
  useSiteVisits: jest.fn(),
  useSiteVisitOptions: jest.fn(),
  useSiteVisitMutations: jest.fn(),
}));

const mockUseSiteVisits = useSiteVisits as jest.Mock;
const mockUseSiteVisitOptions = useSiteVisitOptions as jest.Mock;
const mockUseSiteVisitMutations = useSiteVisitMutations as jest.Mock;
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
});

function renderSiteVisits(content = <SiteVisitsScreen />) {
  const store = makeStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  store.dispatch(
    setCredentials({
      accessToken: "access-token",
      user: {
        id: "user-1",
        email: "admin@truroot.com",
        role: "ADMIN",
        fullName: "Admin User",
        permissions: [],
      },
    }),
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={["/leads/site-visits"]}>
          {content}
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockUseSiteVisits.mockReturnValue({
    isError: true,
    data: undefined,
    refetch: jest.fn(),
  });
  mockUseSiteVisitOptions.mockReturnValue({
    data: {
      executives: [
        {
          id: "exec-1",
          name: "Amit Joshi",
          role: "SALES_AGENT",
        },
      ],
      leads: [],
      projects: [],
    },
  });
  mockUseSiteVisitMutations.mockReturnValue({
    createVisit: {
      isPending: false,
      mutateAsync: jest.fn(),
    },
    updateVisit: {
      isPending: false,
      mutateAsync: jest.fn(),
    },
  });
  consoleWarnSpy = jest
    .spyOn(console, "warn")
    .mockImplementation(() => undefined);
  consoleErrorSpy = jest
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
});

test("create modal retains scheduling fields without executive selection", async () => {
  const user = userEvent.setup();
  renderSiteVisits();

  await user.click(screen.getByRole("button", { name: "Create Site Visit" }));

  expect(screen.getByText("Field Handoff")).toBeInTheDocument();
  expect(within(screen.getByRole("dialog")).queryByText("Assigned Executive")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Assigned executive")).not.toBeInTheDocument();
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

test("renders the dedicated site visits page with hot-leads style bucket tabs", () => {
  renderSiteVisits();

  expect(
    screen.getByRole("heading", { name: "Site Visits", level: 1 }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "All Visits (7)" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Upcoming (2)" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Scheduled (2)" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Completed (2)" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Cancelled (1)" }),
  ).toBeInTheDocument();
});

test("switching visit tabs filters the table", async () => {
  const user = userEvent.setup();
  renderSiteVisits();

  await user.click(screen.getByRole("button", { name: "Cancelled (1)" }));

  expect(screen.getByText("Sunset Residency")).toBeInTheDocument();
  expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
});

test("site visits table keeps row actions inside the actions menu", async () => {
  const user = userEvent.setup();
  renderSiteVisits();

  expect(
    screen.queryByRole("menuitem", { name: "Open Project" }),
  ).not.toBeInTheDocument();

  await user.click(
    screen.getAllByRole("button", { name: /Open actions for/i })[0],
  );

  expect(
    screen.getByRole("menuitem", { name: /View site visit/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("menuitem", { name: /Open Project/ }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("menuitem", { name: /Mark Completed/ }),
  ).toBeInTheDocument();
});


test("shared form can submit a valid schedule without an executive", async () => {
  const onSubmit = jest.fn();
  const form: CreateVisitFormState = {
    leadId: "lead-1", projectId: "project-1", unitId: "", date: "2026-10-10",
    time: "10:00 AM", visitType: "Site Visit", meetingPoint: "Sales Gallery",
    durationMinutes: "60", transportMode: "Own Vehicle", visitorCount: "2", specialRequest: "",
  };
  render(<CreateSiteVisitModal open form={form} rows={[]} isSaving={false}
    onOpenChange={jest.fn()} onChange={jest.fn()} onSubmit={onSubmit} />);
  expect(screen.getByRole("button", { name: "Schedule Visit" })).toBeEnabled();
  await userEvent.click(screen.getByRole("button", { name: "Schedule Visit" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});


function prepareActionDialog() {
  mockUseSiteVisitOptions.mockReturnValue({ data: {
    executives: [],
    leads: [{ id: "lead-1", name: "Test client", phone: "1234567890", displayId: "TR001", preferredProjectId: "project-1" }],
    projects: [{ id: "project-1", name: "Test project", location: "Mumbai", units: [] }],
  } });
  const onOpenChange = jest.fn();
  renderSiteVisits(<CreateSiteVisitActionDialog open onOpenChange={onOpenChange}
    lead={{ id: "lead-1", name: "Test client", preferredProjectId: "project-1" }} />);
  fireEvent.change(screen.getByLabelText("Visit date"), { target: { value: "2026-10-10" } });
  return onOpenChange;
}

test("lead action submits scheduling data without assignment overrides", async () => {
  const onOpenChange = prepareActionDialog();
  const createVisit = mockUseSiteVisitMutations().createVisit.mutateAsync;
  await userEvent.click(screen.getByRole("button", { name: "Schedule Visit" }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  expect(createVisit).toHaveBeenCalledWith(expect.objectContaining({ leadId: "lead-1", projectId: "project-1" }));
  const payload = createVisit.mock.calls[0][0];
  expect(payload).not.toHaveProperty("assignedExecutiveId");
  expect(payload).not.toHaveProperty("assigneeId");
});

test("assignment validation errors preserve the entered schedule and display the API message", async () => {
  const onOpenChange = prepareActionDialog();
  const message = "Assign an active field executive to this client before scheduling a site visit.";
  mockUseSiteVisitMutations().createVisit.mutateAsync.mockRejectedValueOnce({ response: { data: { message } } });
  await userEvent.click(screen.getByRole("button", { name: "Schedule Visit" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith(message));
  expect(onOpenChange).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Visit date")).toHaveValue("2026-10-10");
});
