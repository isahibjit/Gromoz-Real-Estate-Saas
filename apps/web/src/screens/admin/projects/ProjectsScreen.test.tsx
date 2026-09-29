import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { makeStore } from "../../../store";
import { setCredentials } from "../../../store/slices/authSlice";
import { ProjectDetailsScreen } from "./ProjectDetailsScreen";
import { ProjectsScreen } from "./ProjectsScreen";
import { UnitDetailsScreen } from "./UnitDetailsScreen";

jest.mock("../../../common/services/auth.api", () => ({
  logout: jest.fn(),
}));

let consoleWarnSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

function renderWithProviders(
  path: string,
  element: React.ReactNode,
  routePath = path,
) {
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
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={element} />
          </Routes>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: () => undefined,
    });
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: () => undefined,
    });
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: () => undefined,
    });
  }
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

test("projects list renders and tab switching filters projects", async () => {
  const user = userEvent.setup();
  renderWithProviders("/projects", <ProjectsScreen />);

  expect(
    screen.getByRole("heading", { name: "Projects", level: 1 }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "All Projects (5)" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Ocean Heights").length).toBeGreaterThan(0);

  await user.click(screen.getByRole("button", { name: "Ready To Move (2)" }));

  expect(screen.getAllByText("Palm Springs").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Sunset Residency").length).toBeGreaterThan(0);
  expect(screen.queryByText("Skyline Enclave")).not.toBeInTheDocument();
});

test("projects list allows creating and viewing a local project", async () => {
  const user = userEvent.setup();
  renderWithProviders("/projects", <ProjectsScreen />);

  await user.click(screen.getByRole("button", { name: "Add Project" }));
  expect(screen.getByLabelText("Project Image")).toHaveAttribute(
    "type",
    "file",
  );
  await user.type(screen.getByLabelText("Project Name"), "Harbour Crest");
  await user.click(screen.getByRole("button", { name: "Location" }));
  await user.click(screen.getByRole("menuitem", { name: /Bandra/i }));
  await user.clear(screen.getByLabelText("Developer"));
  await user.type(screen.getByLabelText("Developer"), "Truroot Realty");
  await user.type(screen.getByLabelText("Possession"), "2026-12-01");
  await user.type(screen.getByLabelText("Minimum Price"), "1.4");
  await user.type(screen.getByLabelText("Maximum Price"), "2.8");
  await user.click(screen.getByRole("button", { name: "Configurations" }));
  await user.click(screen.getByRole("menuitemcheckbox", { name: /2 BHK/ }));
  await user.click(screen.getByRole("menuitemcheckbox", { name: /3 BHK/ }));
  await user.type(screen.getByLabelText("Number of floors"), "27");
  await user.click(screen.getByRole("button", { name: "Create Project" }));

  expect(screen.getByText("Harbour Crest added locally.")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Harbour Crest" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Bandra, Mumbai").length).toBeGreaterThan(0);
  expect(screen.getAllByText("INR 1.4 Cr - 2.8 Cr").length).toBeGreaterThan(0);
});

test("project details route renders linked units, leads, and visits", () => {
  renderWithProviders(
    "/projects/ocean-heights",
    <ProjectDetailsScreen />,
    "/projects/:projectId",
  );

  expect(
    screen.getByRole("heading", { name: "Ocean Heights", level: 1 }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Unit Inventory" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Tower B, Unit 1203").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Rahul Sharma").length).toBeGreaterThan(0);
  expect(screen.getByText("Scheduled Site Visits")).toBeInTheDocument();
});

test("project inventory allows creating and viewing a local unit", async () => {
  const user = userEvent.setup();
  renderWithProviders(
    "/projects/ocean-heights",
    <ProjectDetailsScreen />,
    "/projects/:projectId",
  );

  await user.click(screen.getByRole("button", { name: "Add Unit" }));
  expect(screen.getByLabelText("Unit Image")).toHaveAttribute("type", "file");
  await user.type(screen.getByLabelText("Unit Number"), "2201");
  await user.type(screen.getByLabelText("Carpet Area"), "910");
  await user.type(screen.getByLabelText("Floor"), "22");
  await user.type(screen.getByLabelText("Price"), "1.48");
  await user.click(screen.getByRole("button", { name: "Create Unit" }));

  expect(
    screen.getByText("Tower B, Unit 2201 added locally."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Tower B, Unit 2201" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("910 sq.ft.").length).toBeGreaterThan(0);
  expect(screen.getAllByText("INR 1.48 Cr").length).toBeGreaterThan(0);
});

test("unit details route renders unit and property information", () => {
  renderWithProviders(
    "/projects/ocean-heights/inventory/ocean-b-1203",
    <UnitDetailsScreen />,
    "/projects/:projectId/inventory/:inventoryId",
  );

  expect(
    screen.getByRole("heading", { name: "Tower B, Unit 1203", level: 1 }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Ocean Heights · Andheri (E), Mumbai"),
  ).toBeInTheDocument();
  expect(screen.getByText("842 sq.ft.")).toBeInTheDocument();
  expect(screen.getByText("INR 1.32 Cr")).toBeInTheDocument();
});

test("projects list allows creating a project without optional Configurations and Sales Owner", async () => {
  const user = userEvent.setup();
  renderWithProviders("/projects", <ProjectsScreen />);

  await user.click(screen.getByRole("button", { name: "Add Project" }));
  await user.type(screen.getByLabelText("Project Name"), "Custom Project");
  await user.click(screen.getByRole("button", { name: "Location" }));
  await user.click(screen.getByRole("menuitem", { name: /Bandra/i }));
  await user.clear(screen.getByLabelText("Developer"));
  await user.type(screen.getByLabelText("Developer"), "Truroot Realty");
  await user.type(screen.getByLabelText("Possession"), "2026-12-01");
  await user.type(screen.getByLabelText("Minimum Price"), "1.5");
  await user.type(screen.getByLabelText("Maximum Price"), "3.0");
  // Leave Configurations and Sales Owner empty
  await user.click(screen.getByRole("button", { name: "Create Project" }));

  expect(screen.getByText("Custom Project added locally.")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Custom Project" }),
  ).toBeInTheDocument();
});

test("project details route renders correctly when configurations is empty", () => {
  const testProject = {
    id: "empty-config-project",
    name: "Empty Config Project",
    location: "Bandra, Mumbai",
    developer: "Truroot Realty",
    status: "Active" as const,
    possession: "Ready by Dec 2026",
    priceRange: "INR 1.0 Cr - 2.0 Cr",
    configurations: [],
    amenities: [],
    description: "Test project details with empty configurations",
    imageUrl: "",
    imageTone: "from-slate-100 via-white to-blue-100",
    salesOwner: "",
    activeLeads: 0,
    upcomingVisits: 0,
    demandScore: 0,
    units: [],
    linkedLeads: [],
    linkedVisits: [],
  };

  const { projectsCatalog } = require("./projectsData");
  projectsCatalog.push(testProject);

  renderWithProviders(
    "/projects/empty-config-project",
    <ProjectDetailsScreen />,
    "/projects/:projectId",
  );

  expect(
    screen.getByRole("heading", { name: "Empty Config Project", level: 1 }),
  ).toBeInTheDocument();
  expect(screen.queryByText("2 BHK, 3 BHK")).not.toBeInTheDocument();

  // clean up
  projectsCatalog.pop();
});
