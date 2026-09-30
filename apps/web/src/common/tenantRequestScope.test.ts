import { isCancel } from "axios";
import {
  ACTIVE_ORGANIZATION_KEY,
  assertCurrentOrganization,
  currentOrganizationId,
} from "./tenantRequestScope";

describe("tenant request scope", () => {
  beforeEach(() => localStorage.clear());

  it("accepts responses from the same workspace", () => {
    localStorage.setItem(ACTIVE_ORGANIZATION_KEY, "tenant-a");
    expect(currentOrganizationId()).toBe("tenant-a");
    expect(() => assertCurrentOrganization("tenant-a")).not.toThrow();
  });

  it.each(["tenant-b", null])(
    "discards tenant-a responses after switching to %s",
    (tenant) => {
      if (tenant) localStorage.setItem(ACTIVE_ORGANIZATION_KEY, tenant);
      try {
        assertCurrentOrganization("tenant-a");
        throw new Error("Expected cancellation");
      } catch (error) {
        expect(isCancel(error)).toBe(true);
      }
    },
  );

  it("does not replay platform requests inside a newly selected tenant", () => {
    localStorage.setItem(ACTIVE_ORGANIZATION_KEY, "tenant-b");
    expect(() => assertCurrentOrganization(null)).toThrow("Workspace changed");
  });
});
