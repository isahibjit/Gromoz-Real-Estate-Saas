import { isPlatformHost, tenantSlugFromHost } from "@truroot/shared";
import { api } from "./api";
import { resolveTenantFromHost } from "./tenantResolver";

jest.mock("./api", () => ({ api: { get: jest.fn() } }));
jest.mock("@truroot/shared", () => ({
  isPlatformHost: jest.fn(),
  tenantSlugFromHost: jest.fn(),
}));

describe("tenant login resolution", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  it("makes the host slug available while tenant lookup is in flight", async () => {
    jest.mocked(isPlatformHost).mockReturnValue(false);
    jest.mocked(tenantSlugFromHost).mockReturnValue("cedar");
    let finishLookup!: (value: unknown) => void;
    jest.mocked(api.get).mockReturnValue(
      new Promise((resolve) => {
        finishLookup = resolve;
      }),
    );

    const lookup = resolveTenantFromHost();
    expect(localStorage.getItem("active_organization_slug")).toBe("cedar");
    finishLookup({
      data: {
        found: true,
        organization: { id: "tenant-a", slug: "cedar", name: "Cedar" },
      },
    });
    await lookup;
    expect(localStorage.getItem("active_organization_id")).toBe("tenant-a");
  });

  it("clears a previously selected tenant when opening platform login", async () => {
    jest.mocked(isPlatformHost).mockReturnValue(true);
    localStorage.setItem("active_organization_id", "tenant-a");
    localStorage.setItem("active_organization_slug", "cedar");

    await expect(resolveTenantFromHost()).resolves.toBeNull();
    expect(localStorage.getItem("active_organization_id")).toBeNull();
    expect(localStorage.getItem("active_organization_slug")).toBeNull();
  });
});
