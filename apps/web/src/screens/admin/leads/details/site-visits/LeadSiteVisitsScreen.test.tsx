import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { LeadSiteVisitsScreen } from "./LeadSiteVisitsScreen";

jest.mock("../../site-visits/SiteVisitsScreen", () => ({
  SiteVisitsScreen: ({ leadId }: { leadId?: string }) => (
    <div>Live site visits for {leadId}</div>
  ),
}));

test("keeps the lead route scoped to the persistent site visit workspace", () => {
  render(
    <MemoryRouter initialEntries={["/leads/TR001245/site-visits"]}>
      <Routes>
        <Route path="/leads/:leadId/site-visits" element={<LeadSiteVisitsScreen />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("Live site visits for TR001245")).toBeInTheDocument();
});
