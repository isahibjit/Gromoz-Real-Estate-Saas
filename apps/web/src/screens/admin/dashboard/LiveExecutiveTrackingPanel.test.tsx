import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { LiveFieldExecutiveLocation } from "../../field-executive/useFieldExecutive";
import { LiveExecutiveTrackingPanel } from "./DashboardSections";

jest.mock("@vis.gl/react-google-maps", () => ({
  APIProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  Map: ({
    children,
    defaultCenter,
  }: {
    children: ReactNode;
    defaultCenter: { lat: number; lng: number };
  }) => (
    <div
      data-testid="executive-map"
      data-center={`${defaultCenter.lat},${defaultCenter.lng}`}
    >
      {children}
    </div>
  ),
  AdvancedMarker: ({
    position,
  }: {
    position: { lat: number; lng: number };
  }) => (
    <div data-testid="executive-marker">
      {position.lat},{position.lng}
    </div>
  ),
  useMap: () => null,
}));

const originalApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;
beforeEach(() => {
  process.env.VITE_GOOGLE_MAPS_API_KEY = "test-map-key";
});
afterAll(() => {
  if (originalApiKey === undefined) delete process.env.VITE_GOOGLE_MAPS_API_KEY;
  else process.env.VITE_GOOGLE_MAPS_API_KEY = originalApiKey;
});

function executive(
  id: string,
  tracking: LiveFieldExecutiveLocation["tracking"],
): LiveFieldExecutiveLocation {
  return { id, name: id, role: "SALES_AGENT", isActive: true, tracking };
}

function renderPanel(rows: LiveFieldExecutiveLocation[]) {
  return render(
    <MemoryRouter>
      <LiveExecutiveTrackingPanel rows={rows} />
    </MemoryRouter>,
  );
}

test("renders an executive with null tracking without a marker or map link", () => {
  renderPanel([executive("Offline executive", null)]);
  expect(screen.getByText("Offline executive")).toBeInTheDocument();
  expect(screen.getByText("Last sync -")).toBeInTheDocument();
  expect(screen.queryByTestId("executive-marker")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Open map" }),
  ).not.toBeInTheDocument();
  expect(screen.getByTestId("executive-map")).toHaveAttribute(
    "data-center",
    "19.076,72.8777",
  );
});

test("keeps null-location executives selectable alongside valid tracking", () => {
  renderPanel([
    executive("Offline executive", null),
    executive("Tracked executive", {
      latitude: 19.1,
      longitude: 72.9,
      isTracking: true,
    }),
  ]);
  expect(screen.getAllByTestId("executive-marker")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /Tracked executive/ }));
  expect(screen.getByRole("link", { name: "Open map" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/search/?api=1&query=19.1,72.9",
  );
  fireEvent.click(screen.getByRole("button", { name: /Offline executive/ }));
  expect(
    screen.queryByRole("link", { name: "Open map" }),
  ).not.toBeInTheDocument();
});

test.each([
  {},
  { latitude: 19.1 },
  { latitude: Number.NaN, longitude: 72.9 },
  { latitude: 19.1, longitude: Number.POSITIVE_INFINITY },
])("skips incomplete or non-finite coordinates %j", (tracking) => {
  renderPanel([executive("No usable coordinates", tracking)]);
  expect(screen.queryByTestId("executive-marker")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Open map" }),
  ).not.toBeInTheDocument();
});

test("treats zero coordinates as valid for map centering, markers, and links", () => {
  renderPanel([executive("Zero coordinates", { latitude: 0, longitude: 0 })]);
  expect(screen.getByTestId("executive-map")).toHaveAttribute(
    "data-center",
    "0,0",
  );
  expect(screen.getByTestId("executive-marker")).toHaveTextContent("0,0");
  expect(screen.getByRole("link", { name: "Open map" })).toHaveAttribute(
    "href",
    "https://www.google.com/maps/search/?api=1&query=0,0",
  );
});

test("handles an empty executive list", () => {
  renderPanel([]);
  expect(screen.queryByTestId("executive-map")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Open map" }),
  ).not.toBeInTheDocument();
});

test("shows map configuration fallback without crashing on null tracking", () => {
  delete process.env.VITE_GOOGLE_MAPS_API_KEY;
  renderPanel([executive("Offline executive", null)]);
  expect(screen.getByText("Live map unavailable")).toBeInTheDocument();
  expect(screen.getByText("Offline executive")).toBeInTheDocument();
});
