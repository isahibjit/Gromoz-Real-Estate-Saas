import {
  canStartSiteVisitStatusTransition,
  splitSiteVisitLeadUpdate,
} from "./siteVisitStatusTransition";

describe("site-visit status transitions", () => {
  it("blocks a triggered site-visit status for zero or multiple leads", () => {
    expect(canStartSiteVisitStatusTransition("CREATE_SITE_VISIT", 0)).toBe(
      false,
    );
    expect(canStartSiteVisitStatusTransition("CREATE_SITE_VISIT", 2)).toBe(
      false,
    );
    expect(canStartSiteVisitStatusTransition("CREATE_SITE_VISIT", 1)).toBe(
      true,
    );
  });

  it("keeps the protected status out of ordinary lead writes", () => {
    expect(
      splitSiteVisitLeadUpdate(
        {
          statusId: "site-visit-scheduled",
          remarks: "Bring the brochure",
        },
        "site-visit-scheduled",
      ),
    ).toEqual({
      ordinaryPayload: { remarks: "Bring the brochure" },
      leadStatusId: "site-visit-scheduled",
    });
  });
});
