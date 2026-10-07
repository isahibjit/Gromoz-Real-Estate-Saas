import { countLeadMasterValueMatches } from "./leadMasterMatching";

describe("countLeadMasterValueMatches", () => {
  it("keeps scheduled and completed site-visit master counts separate", () => {
    const leads = [
      { statusId: "status-site-visit-scheduled", temperatureId: null },
      { statusId: "status-site-visit-done", temperatureId: null },
      { statusId: "status-revisit-done", temperatureId: null },
    ];

    expect(
      countLeadMasterValueMatches(
        leads,
        "status",
        "status-site-visit-scheduled",
      ),
    ).toBe(1);
    expect(
      countLeadMasterValueMatches(leads, "status", "status-site-visit-done"),
    ).toBe(1);
  });

  it("does not infer a master match from another field", () => {
    const leads = [
      { statusId: "status-site-visit-done", temperatureId: "warm" },
      { statusId: null, temperatureId: "status-site-visit-scheduled" },
    ];

    expect(
      countLeadMasterValueMatches(
        leads,
        "status",
        "status-site-visit-scheduled",
      ),
    ).toBe(0);
  });
});
