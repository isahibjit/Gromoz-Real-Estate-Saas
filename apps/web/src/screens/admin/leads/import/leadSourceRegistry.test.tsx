import { LEAD_SOURCE_CONNECTORS } from "./leadSourceRegistry";

describe("lead source connector registry", () => {
  it("contains only supported tenant connectors with canonical routes", () => {
    expect(
      LEAD_SOURCE_CONNECTORS.map(({ id, route }) => ({ id, route })),
    ).toEqual([
      {
        id: "magicbricks",
        route: "/leads/import/connect/magicbricks",
      },
      { id: "99acres", route: "/leads/import/connect/99acres" },
      { id: "housing", route: "/leads/import/connect/housing" },
      { id: "meta", route: "/leads/import/connect/meta" },
      { id: "website", route: "/leads/import/connect/website" },
    ]);
  });

  it("does not expose unsupported or non-connector lead sources", () => {
    const ids = LEAD_SOURCE_CONNECTORS.map(({ id }) => id as string);

    expect(ids).not.toEqual(
      expect.arrayContaining([
        "whatsapp",
        "indiamart",
        "google",
        "justdial",
        "referral",
        "walk-in",
      ]),
    );
  });
});
