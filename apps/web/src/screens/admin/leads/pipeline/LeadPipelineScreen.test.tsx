import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";

import { makeStore } from "../../../../store";
import { setCredentials } from "../../../../store/slices/authSlice";
import { LeadPipelineScreen } from "./LeadPipelineScreen";
import { useLeadPipeline, useMovePipelineLead } from "./useLeadPipeline";
import { useProjects } from "../../projects/useProjectsApi";
import { useSiteVisitOptions } from "../site-visits/useSiteVisits";

jest.mock("../../../../common/services/auth.api", () => ({
  logout: jest.fn(),
}));

jest.mock("./useLeadPipeline", () => ({
  useLeadPipeline: jest.fn(),
  useMovePipelineLead: jest.fn(),
}));

jest.mock("../../projects/useProjectsApi", () => ({
  useProjects: jest.fn(),
}));

jest.mock("../site-visits/useSiteVisits", () => ({
  useSiteVisitOptions: jest.fn(),
}));

const mockUseLeadPipeline = useLeadPipeline as jest.Mock;
const mockUseMovePipelineLead = useMovePipelineLead as jest.Mock;
const mockUseProjects = useProjects as jest.Mock;
const mockUseSiteVisitOptions = useSiteVisitOptions as jest.Mock;
const mutateAsync = jest.fn();
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
  mutateAsync.mockResolvedValue({});
  mockUseMovePipelineLead.mockReturnValue({
    mutateAsync,
    isPending: false,
  });
  mockUseLeadPipeline.mockReturnValue({
    isLoading: false,
    error: null,
    data: {
      filters: {
        statuses: [
          {
            id: "status-new",
            name: "New Lead",
            code: "NEW_LEAD",
            color: "#2563EB",
            sortOrder: 1,
          },
          {
            id: "status-booked",
            name: "Booked",
            code: "BOOKED",
            color: "#16A34A",
            sortOrder: 2,
          },
          {
            id: "status-site-visit",
            name: "Site Visit",
            code: "SITE_VISIT",
            color: "#EA580C",
            sortOrder: 3,
          },
        ],
        sources: [],
        users: [],
        projects: [{ id: "project-1", name: "Ocean Heights" }],
      },
      columns: [
        {
          id: "status-new",
          name: "New Lead",
          code: "NEW_LEAD",
          color: "#2563EB",
          count: 1,
          value: 15000000,
          valueLabel: "INR 1.50 Cr",
          hiddenCount: 0,
          leads: [
            {
              id: "lead-1",
              displayId: "TR001",
              name: "Rahul Sharma",
              mobile: "+91 98765 43210",
              source: "Google Ads",
              propertyRequirement: "2 BHK in Andheri",
              budget: "INR 1.50 Cr",
              assignedUser: null,
              project: "Ocean Heights",
              lastActivity: "Today",
            },
          ],
        },
        {
          id: "status-booked",
          name: "Booked",
          code: "BOOKED",
          color: "#16A34A",
          count: 0,
          value: 0,
          valueLabel: "INR 0",
          hiddenCount: 0,
          leads: [],
        },
        {
          id: "status-site-visit",
          name: "Site Visit",
          code: "SITE_VISIT",
          color: "#EA580C",
          count: 0,
          value: 0,
          valueLabel: "INR 0",
          hiddenCount: 0,
          leads: [],
        },
      ],
      summary: [],
      stagePerformance: [],
      topSources: [],
      meta: {
        totalLeads: 1,
        totalValueLabel: "INR 1.50 Cr",
        limitPerColumn: 10,
      },
    },
  });
  mockUseProjects.mockReturnValue({
    data: {
      projects: [
        {
          id: "project-1",
          name: "Ocean Heights",
          location: "Andheri (E), Mumbai",
          developer: "Truroot Realty",
          status: "Active",
          possession: "Ready",
          priceRange: "INR 1.50 Cr",
          configurations: ["2 BHK"],
          amenities: [],
          description: "",
          imageUrl: "",
          imageTone: "",
          salesOwner: "",
          activeLeads: 1,
          upcomingVisits: 0,
          demandScore: 80,
          linkedLeads: [],
          linkedVisits: [],
          units: [
            {
              id: "unit-1",
              projectId: "project-1",
              tower: "Tower A",
              unitNumber: "1204",
              configuration: "2 BHK",
              carpetArea: "850 sq.ft.",
              floor: "12",
              facing: "West",
              price: "INR 1.50 Cr",
              availability: "Available",
              bookingStatus: "Open",
              visitCount: 0,
            },
          ],
        },
      ],
    },
  });
  mockUseSiteVisitOptions.mockReturnValue({
    data: {
      executives: [
        {
          id: "executive-1",
          name: "Amit Joshi",
          role: "SALES_AGENT",
        },
      ],
      leads: [
        {
          id: "lead-1",
          displayId: "TR001",
          name: "Rahul Sharma",
          phone: "+91 98765 43210",
        },
      ],
      projects: [],
    },
  });
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

function renderPipeline() {
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
      },
    }),
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter initialEntries={["/leads/pipeline"]}>
          <LeadPipelineScreen />
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

test("opens conversion booking modal when a lead is moved to Booked", async () => {
  renderPipeline();

  const leadCard = screen
    .getByText("Rahul Sharma")
    .closest("[draggable='true']");
  const bookedColumn = screen.getByRole("heading", { name: "Booked" }).closest(
    "section",
  );

  expect(leadCard).not.toBeNull();
  expect(bookedColumn).not.toBeNull();

  fireEvent.dragStart(leadCard as Element);
  fireEvent.drop(bookedColumn as Element);

  expect(
    screen.getByRole("heading", { name: "Convert Lead / Create Booking" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Booking confirmation required")).toBeInTheDocument();
  expect(screen.getByText("Project")).toBeInTheDocument();
  expect(screen.getByText("Unit")).toBeInTheDocument();
  expect(screen.getByText("Booking Amount")).toBeInTheDocument();
  expect(screen.getByText("Booking Date")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create Booking" })).toBeDisabled();
  expect(mutateAsync).not.toHaveBeenCalled();
});

test("opens the full site visit scheduling dialog when a lead moves to Site Visit", () => {
  renderPipeline();

  const leadCard = screen
    .getByText("Rahul Sharma")
    .closest("[draggable='true']");
  const siteVisitColumn = screen
    .getByRole("heading", { name: "Site Visit" })
    .closest("section");

  fireEvent.dragStart(leadCard as Element);
  fireEvent.drop(siteVisitColumn as Element);

  expect(screen.getByRole("heading", { name: "Plan Site Visit" })).toBeInTheDocument();
  expect(screen.getByText("Lead Context")).toBeInTheDocument();
  expect(screen.getByText("Property Details")).toBeInTheDocument();
  expect(screen.getByText("Field Handoff")).toBeInTheDocument();
  expect(screen.getByLabelText("Visit date")).toBeInTheDocument();
  expect(screen.getByText("Visit Time")).toBeInTheDocument();
});
