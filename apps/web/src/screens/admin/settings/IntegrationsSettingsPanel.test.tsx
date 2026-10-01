import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { IntegrationsSettingsPanel } from "./IntegrationsSettingsPanel";

jest.mock("../leads/import/useLeadImportStats", () => ({
  useLeadImportStats: () => ({
    data: { connectors: [] },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

test("shows tenant lead connectors without tenant Google Maps configuration", () => {
  render(
    <MemoryRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <IntegrationsSettingsPanel />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: "Lead-source integrations" }),
  ).toBeInTheDocument();
  expect(screen.getByText("MagicBricks")).toBeInTheDocument();
  expect(screen.getByText("99acres")).toBeInTheDocument();
  expect(screen.getByText("Housing.com")).toBeInTheDocument();
  expect(screen.getByText("Meta Lead Ads")).toBeInTheDocument();
  expect(screen.getByText("Website Lead Capture")).toBeInTheDocument();
  expect(screen.queryByText("Google Maps")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /configure maps/i }),
  ).not.toBeInTheDocument();
});
