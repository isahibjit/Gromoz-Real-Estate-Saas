import { readFileSync } from "fs";
import { resolve } from "path";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { makeStore } from "../../../../store";
import { setCredentials } from "../../../../store/slices/authSlice";
import { addLeadSidebarItems } from "../add/addLeadData";
import { assignLeadsSidebarItems } from "../assignment/leadAssignmentData";
import { sidebarItems } from "../../dashboard/dashboardData";
import { ImportLeadsScreen } from "./ImportLeadsScreen";

const apiGet = jest.fn();
jest.mock("../../../../common/api", () => ({
  api: { get: (...args: unknown[]) => apiGet(...args) },
}));

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
  apiGet.mockImplementation(async (url: string) => {
    if (url === "/lead-imports/stats") {
      return {
        data: {
          sourceCounts: {},
          connectors: [],
          totalLeads: 0,
          newLeads: 0,
          duplicates: 0,
          totalImports: 1,
        },
      };
    }
    return {
      data: {
        data: [
          {
            id: "import-1",
            source: "MagicBricks",
            targetType: "LEAD",
            fileName: "MagicBricks_20May.xlsx",
            totalRecords: 1,
            newLeads: 1,
            updatedLeads: 0,
            duplicates: 0,
            errors: 0,
            status: "Completed",
            progress: 100,
            importedByName: "Admin User",
            createdAt: "2026-05-20T10:00:00.000Z",
          },
        ],
        meta: { total: 1 },
      },
    };
  });
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

function flattenLabels(
  items: Array<{ label: string; children?: Array<{ label: string }> }>,
) {
  return items.flatMap((item) => [
    item.label,
    ...(item.children?.map((child) => child.label) ?? []),
  ]);
}

function renderImport(initialEntry = "/leads/import") {
  const store = makeStore();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/leads/import" element={<ImportLeadsScreen />} />
            <Route
              path="/leads/import/connect/magicbricks"
              element={<div>MagicBricks connector route</div>}
            />
          </Routes>
        </MemoryRouter>
      </Provider>
    </QueryClientProvider>,
  );
}

test("admin lead navigation exposes one import entry", () => {
  const labels = [
    ...flattenLabels(sidebarItems),
    ...flattenLabels(addLeadSidebarItems),
    ...flattenLabels(assignLeadsSidebarItems),
  ];

  expect(labels.filter((label) => label === "Import Leads")).toHaveLength(3);
  expect(labels).not.toContain("Bulk Upload Leads");
});

test("import leads opens portal connectors by default", () => {
  renderImport();

  expect(
    screen.getByRole("heading", { name: "Import Leads" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("tab", { name: "Portal Connectors" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    screen.getByRole("tab", { name: "Excel / CSV Upload" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("tab", { name: "Import History" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /MagicBricks/i }),
  ).toBeInTheDocument();
});

test("excel csv method renders the existing upload workflow", async () => {
  const user = userEvent.setup();
  renderImport();

  await user.click(screen.getByRole("tab", { name: "Excel / CSV Upload" }));

  expect(
    screen.getByRole("tab", { name: "Excel / CSV Upload" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    screen.getByRole("heading", { name: "Excel / CSV Upload" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Drag & drop your file here or"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Choose File" })).toBeInTheDocument();
});

test("history method renders import status table and filters", async () => {
  const user = userEvent.setup();
  renderImport();

  await user.click(screen.getByRole("tab", { name: "Import History" }));

  expect(screen.getByRole("tab", { name: "Import History" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("Recent Imports")).toBeInTheDocument();
  expect(screen.getByLabelText("Source filter")).toBeInTheDocument();
  expect(screen.getByLabelText("Search imports")).toBeInTheDocument();
  expect(screen.getByText("MagicBricks_20May.xlsx")).toBeInTheDocument();
});

test("query param opens excel csv method directly", () => {
  renderImport("/leads/import?method=excel-csv");

  expect(
    screen.getByRole("tab", { name: "Excel / CSV Upload" }),
  ).toHaveAttribute("aria-selected", "true");
  expect(
    screen.getByRole("heading", { name: "Excel / CSV Upload" }),
  ).toBeInTheDocument();
});

test("magicbricks connector entry still navigates to connector flow", async () => {
  const user = userEvent.setup();
  renderImport();

  await user.click(screen.getByRole("button", { name: /MagicBricks/i }));

  expect(screen.getByText("MagicBricks connector route")).toBeInTheDocument();
});

test("legacy bulk upload route redirects to the excel csv method", () => {
  const appSource = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

  expect(appSource).toContain(
    'const BULK_UPLOAD_LEADS_PATH = "/leads/bulk-upload";',
  );
  expect(appSource).toContain(
    "<Navigate to={`${IMPORT_LEADS_PATH}?method=excel-csv`} replace />",
  );
});
