import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { api } from "../api";
import {
  useLeadCardPreferences,
  type WorkspaceTarget,
} from "./useLeadCardPreferences";

jest.mock("../api", () => ({ api: { get: jest.fn(), post: jest.fn() } }));

const status = {
  id: "new",
  name: "New Lead",
  code: "NEW_LEAD",
  sortOrder: 1,
  isActive: true,
  showInStatsCard: true,
  showInFilterBar: true,
};
const cachedStatus = {
  ...status,
  category: "status",
  order: 2,
  showInStatsCard: false,
  showInFilterBar: false,
};

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: { data: url === "/lead-masters/status" ? [status] : [] },
  }));
  jest.mocked(api.post).mockResolvedValue({ data: { success: true } });
});

function mount(workspace: WorkspaceTarget = "all_leads") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(() => useLeadCardPreferences(workspace), { wrapper }),
    client,
  };
}

test("a fresh Manager browser loads all enabled shared cards even without cached preferences", async () => {
  const { result } = mount();
  await waitFor(() =>
    expect(result.current.statsCards.map((item) => item.name)).toEqual([
      "Total Leads",
      "New Lead",
    ]),
  );
});

test("stale local All Leads switches cannot hide shared enabled cards", async () => {
  localStorage.setItem(
    "crm_card_prefs_v2_all_leads",
    JSON.stringify([cachedStatus]),
  );
  const { result } = mount();
  await waitFor(() =>
    expect(result.current.statsCards.map((item) => item.name)).toContain(
      "New Lead",
    ),
  );
  expect(result.current.filterPills.map((item) => item.name)).toContain(
    "New Lead",
  );
});

test("stale Admin switches cannot resurrect cards disabled in shared configuration", async () => {
  localStorage.setItem(
    "crm_card_prefs_v2_all_leads",
    JSON.stringify([{ ...cachedStatus, showInStatsCard: true }]),
  );
  jest.mocked(api.get).mockImplementation(async (url) => ({
    data: {
      data:
        url === "/lead-masters/status"
          ? [{ ...status, showInStatsCard: false }]
          : [],
    },
  }));
  const { result } = mount();
  await waitFor(() => expect(result.current.statusMaster.isSuccess).toBe(true));
  await waitFor(() =>
    expect(result.current.statsCards.map((item) => item.name)).toEqual([
      "Total Leads",
    ]),
  );
});

test("server configuration changes update an already-open All Leads workspace", async () => {
  const { result, client } = mount();
  await waitFor(() =>
    expect(result.current.statsCards.map((item) => item.name)).toContain(
      "New Lead",
    ),
  );
  act(() =>
    client.setQueryData(
      ["lead-masters", "status"],
      [{ ...status, showInStatsCard: false }],
    ),
  );
  await waitFor(() =>
    expect(result.current.statsCards.map((item) => item.name)).not.toContain(
      "New Lead",
    ),
  );
});

test("cross-tab legacy storage updates cannot replace shared All Leads switches", async () => {
  const { result } = mount();
  await waitFor(() =>
    expect(result.current.statsCards.map((item) => item.name)).toContain(
      "New Lead",
    ),
  );
  localStorage.setItem(
    "crm_card_prefs_v2_all_leads",
    JSON.stringify([cachedStatus]),
  );
  act(() => window.dispatchEvent(new Event("storage")));
  expect(result.current.statsCards.map((item) => item.name)).toContain(
    "New Lead",
  );
});

test("Follow-Ups saves preserve its switches without overwriting global master flags", async () => {
  const { result } = mount("follow_up");
  await waitFor(() =>
    expect(result.current.items.some((item) => item.id === status.id)).toBe(
      true,
    ),
  );
  await act(async () =>
    result.current.savePreferences(
      result.current.items.map((item) => ({
        ...item,
        showInStatsCard: false,
        showInFilterBar: false,
      })),
    ),
  );
  expect(api.post).not.toHaveBeenCalled();
  expect(result.current.statsCards).toHaveLength(0);
  expect(result.current.filterPills).toHaveLength(0);
  expect(localStorage.getItem("crm_card_prefs_v2_follow_up")).not.toBeNull();
  expect(localStorage.getItem("crm_card_prefs_v2_all_leads")).toBeNull();
});

test("All Leads customization still saves shared master flags", async () => {
  const { result } = mount();
  await waitFor(() =>
    expect(result.current.items.some((item) => item.id === status.id)).toBe(
      true,
    ),
  );
  await act(async () => result.current.savePreferences(result.current.items));
  expect(api.post).toHaveBeenCalledWith("/lead-masters/bulk-reorder", {
    items: [
      expect.objectContaining({
        id: "new",
        showInStatsCard: true,
        showInFilterBar: true,
      }),
    ],
  });
});

test("tenant preferences ignore legacy unscoped values and another tenant's settings", async () => {
  localStorage.setItem("active_organization_id", "tenant-a");
  const hidden = JSON.stringify([{ ...cachedStatus, name: "Other tenant card" }]);
  localStorage.setItem("crm_card_prefs_v2_follow_up", hidden);
  localStorage.setItem("crm_card_prefs_v2_follow_up:tenant-b", hidden);
  const { result } = mount("follow_up");
  await waitFor(() => expect(result.current.statusMaster.isSuccess).toBe(true));
  expect(result.current.statsCards.map((item) => item.name)).toContain("New Lead");
  expect(result.current.items.map((item) => item.name)).not.toContain("Other tenant card");
  await act(async () => result.current.savePreferences(result.current.items));
  expect(localStorage.getItem("crm_card_prefs_v2_follow_up:tenant-a")).not.toBeNull();
  expect(localStorage.getItem("crm_card_prefs_v2_follow_up:tenant-b")).toBe(hidden);
  expect(localStorage.getItem("crm_card_prefs_v2_follow_up")).toBe(hidden);
});

test("a saved Follow-Up layout is restored only inside its own tenant", async () => {
  localStorage.setItem("active_organization_id", "tenant-a");
  const first = mount("follow_up");
  await waitFor(() => expect(first.result.current.statusMaster.isSuccess).toBe(true));
  await act(async () => first.result.current.savePreferences(first.result.current.items.map(
    (item) => ({ ...item, showInStatsCard: false, showInFilterBar: false }),
  )));
  first.unmount();
  localStorage.setItem("active_organization_id", "tenant-b");
  const second = mount("follow_up");
  await waitFor(() => expect(second.result.current.statusMaster.isSuccess).toBe(true));
  expect(second.result.current.statsCards.map((item) => item.name)).toContain("New Lead");
  second.unmount();
  localStorage.setItem("active_organization_id", "tenant-a");
  const restored = mount("follow_up");
  await waitFor(() => expect(restored.result.current.statusMaster.isSuccess).toBe(true));
  expect(restored.result.current.statsCards).toHaveLength(0);
});

test("a save finishing after a tenant switch does not publish stale local preferences", async () => {
  localStorage.setItem("active_organization_id", "tenant-a");
  const { result } = mount();
  await waitFor(() => expect(result.current.statusMaster.isSuccess).toBe(true));
  jest.mocked(api.post).mockImplementation(async () => {
    localStorage.setItem("active_organization_id", "tenant-b");
    return { data: { success: true } };
  });
  await act(async () => {
    await expect(result.current.savePreferences(result.current.items)).rejects.toThrow("Workspace changed");
  });
  expect(localStorage.getItem("crm_card_prefs_v2_all_leads:tenant-a")).toBeNull();
  expect(localStorage.getItem("crm_card_prefs_v2_all_leads:tenant-b")).toBeNull();
});
