import { isPlatformHost, tenantSlugFromHost } from "@truroot/shared";
import { api } from "./api";
import {
  loginTenantQueryKey,
  resolveTenantFromHost,
  TenantNotFoundError,
} from "./tenantResolver";

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
        organization: {
          id: "tenant-a",
          slug: "cedar",
          name: "Cedar",
          status: "ACTIVE",
        },
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

  it("rejects unknown hosts and removes all stale workspace context", async () => {
    jest.mocked(isPlatformHost).mockReturnValue(false);
    jest.mocked(tenantSlugFromHost).mockReturnValue("xyz");
    localStorage.setItem("active_organization_id", "other-tenant");
    localStorage.setItem("active_organization_slug", "other");
    localStorage.setItem("active_organization_data", "other branding");
    jest.mocked(api.get).mockResolvedValue({ data: { found: false } });

    await expect(
      resolveTenantFromHost({ hostname: "xyz.gromoze.com", search: "" }),
    ).rejects.toMatchObject({
      name: "TenantNotFoundError",
      host: "xyz.gromoze.com",
    });
    expect(localStorage.getItem("active_organization_id")).toBeNull();
    expect(localStorage.getItem("active_organization_slug")).toBeNull();
    expect(localStorage.getItem("active_organization_data")).toBeNull();
  });

  it.each(["org", "tenant", "slug"])(
    "does not let ?%s override the tenant hostname",
    async (parameter) => {
      jest.mocked(isPlatformHost).mockReturnValue(false);
      jest.mocked(api.get).mockResolvedValue({ data: { found: false } });
      await expect(
        resolveTenantFromHost({
          hostname: "xyz.gromoze.com",
          search: `?${parameter}=cedar`,
        }),
      ).rejects.toBeInstanceOf(TenantNotFoundError);
      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith(
        "/organizations/resolve-domain?host=xyz.gromoze.com",
        { timeout: 10_000 },
      );
    },
  );

  it("preserves explicit workspace links on the platform host", async () => {
    jest.mocked(isPlatformHost).mockReturnValue(true);
    const organization = {
      id: "tenant-a",
      name: "Cedar",
      slug: "cedar",
      status: "ACTIVE",
    };
    jest
      .mocked(api.get)
      .mockResolvedValue({ data: { found: true, organization } });
    await expect(
      resolveTenantFromHost({
        hostname: "crm.gromoze.com",
        search: "?org=cedar",
      }),
    ).resolves.toEqual(organization);
    expect(api.get).toHaveBeenCalledWith(
      "/organizations/resolve-domain?host=cedar",
      { timeout: 10_000 },
    );
    expect(
      JSON.parse(localStorage.getItem("active_organization_data") || "null"),
    ).toEqual(organization);
  });

  it("looks up verified custom domains by their complete hostname", async () => {
    jest.mocked(isPlatformHost).mockReturnValue(false);
    jest.mocked(tenantSlugFromHost).mockReturnValue(null);
    const organization = {
      id: "tenant-a",
      name: "Cedar",
      slug: "cedar",
      status: "SUSPENDED",
    };
    jest
      .mocked(api.get)
      .mockResolvedValue({ data: { found: true, organization } });
    await expect(
      resolveTenantFromHost({ hostname: "crm.cedar.example", search: "" }),
    ).resolves.toEqual(organization);
    expect(api.get).toHaveBeenCalledWith(
      "/organizations/resolve-domain?host=crm.cedar.example",
      { timeout: 10_000 },
    );
  });

  it("keeps service outages distinguishable from a missing workspace", async () => {
    jest.mocked(isPlatformHost).mockReturnValue(false);
    const failure = new Error("Network error");
    jest.mocked(api.get).mockRejectedValue(failure);
    await expect(resolveTenantFromHost()).rejects.toBe(failure);
    expect(localStorage.getItem("active_organization_slug")).toBeNull();
  });

  it.each([
    { found: true, organization: null },
    {},
    { found: true, organization: { id: "tenant-a" } },
  ])(
    "does not classify an invalid API response as a missing workspace: %p",
    async (data) => {
      jest.mocked(isPlatformHost).mockReturnValue(false);
      jest.mocked(api.get).mockResolvedValue({ data });
      await expect(resolveTenantFromHost()).rejects.not.toBeInstanceOf(
        TenantNotFoundError,
      );
      expect(localStorage.getItem("active_organization_id")).toBeNull();
    },
  );

  it("does not key tenant host resolution by unrelated search filters", () => {
    jest.mocked(isPlatformHost).mockReturnValue(false);
    window.history.replaceState(null, "", "/?search=lead");
    expect(loginTenantQueryKey()).toEqual([
      "login-tenant",
      window.location.host,
      "",
    ]);
    window.history.replaceState(null, "", "/");
  });
});
