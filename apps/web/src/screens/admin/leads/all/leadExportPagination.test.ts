import { api } from "../../../../common/api";
import {
  fetchLeadRowsForExport,
  LEAD_TABLE_MAX_ROWS,
  type ApiLead,
  type LeadListFilters,
} from "./useAllLeads";

jest.mock("../../../../common/api", () => ({ api: { get: jest.fn() } }));
const lead = (index: number): ApiLead => ({
  id: `lead-${index}`,
  displayId: `TR${index}`,
  name: `Customer ${index}`,
  mobile: "9999999999",
});
const filters: LeadListFilters = {
  sourceId: ["meta", "housing"],
  integrationConnectionId: ["account"],
  statusId: ["interested"],
  stageId: ["stage"],
  temperatureId: ["hot"],
  propertyType: ["Residential"],
  configuration: ["3 BHK"],
  ownerId: ["owner"],
  telecallerId: ["pre-sales"],
  teamId: ["team"],
  area: ["Mira Road"],
  projectId: ["project"],
  from: "2026-10-01",
  to: "2026-10-13",
};

function mockPages(
  records: ApiLead[],
  batchSize = LEAD_TABLE_MAX_ROWS,
  teamScope = false,
) {
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    if (url !== "/leads" && url !== "/leads/team-workspace")
      return { data: { data: [] } };
    const page = Number(config?.params?.page);
    const pageRows = records.slice((page - 1) * batchSize, page * batchSize);
    return {
      data: {
        ...(teamScope ? { rows: pageRows, members: [] } : { data: pageRows }),
        meta: { total: records.length, limit: batchSize, page },
      },
    };
  });
}
beforeEach(() => jest.clearAllMocks());

it("fetches more than one API batch without a 10-row or 5000-row export cap", async () => {
  mockPages(
    Array.from({ length: LEAD_TABLE_MAX_ROWS + 1 }, (_, index) => lead(index)),
  );
  const rows = await fetchLeadRowsForExport({
    search: "",
    filters,
    teamScope: false,
  });
  expect(rows).toHaveLength(LEAD_TABLE_MAX_ROWS + 1);
  expect(new Set(rows.map((row) => row.backendId)).size).toBe(rows.length);
  expect(api.get).toHaveBeenCalledWith(
    "/leads",
    expect.objectContaining({
      params: expect.objectContaining({
        page: 2,
        limit: LEAD_TABLE_MAX_ROWS,
        projectId: "project",
      }),
    }),
  );
});

it("preserves every applied filter and search/segment on every page", async () => {
  mockPages([lead(1), lead(2), lead(3)], 2);
  await fetchLeadRowsForExport({
    search: "customer",
    segment: "interested",
    filters,
    teamScope: false,
  });
  const calls = jest
    .mocked(api.get)
    .mock.calls.filter(([url]) => url === "/leads");
  expect(calls).toHaveLength(2);
  for (const [, config] of calls)
    expect(config?.params).toMatchObject({
      search: "customer",
      segment: "interested",
      sourceId: "meta,housing",
      integrationConnectionId: "account",
      statusId: "interested",
      stageId: "stage",
      temperatureId: "hot",
      propertyType: "Residential",
      configuration: "3 BHK",
      ownerId: "owner",
      telecallerId: "pre-sales",
      teamId: "team",
      area: "Mira Road",
      projectId: "project",
      from: "2026-10-01",
      to: "2026-10-13",
    });
});

it("uses only the team endpoint and selected member for scoped team exports", async () => {
  mockPages([lead(1), lead(2), lead(3)], 2, true);
  const rows = await fetchLeadRowsForExport({
    search: "customer",
    filters,
    teamScope: true,
    memberId: "member",
  });
  expect(rows).toHaveLength(3);
  expect(api.get).not.toHaveBeenCalledWith("/leads", expect.anything());
  for (const [, config] of jest.mocked(api.get).mock.calls)
    expect(config?.params).toMatchObject({
      scope: "team",
      memberId: "member",
      projectId: "project",
      integrationConnectionId: "account",
      statusId: "interested",
    });
});

it("returns an empty set for genuinely empty results", async () => {
  mockPages([]);
  await expect(
    fetchLeadRowsForExport({ search: "", teamScope: false }),
  ).resolves.toEqual([]);
});

it("fails rather than returning a partial result when a later page fails", async () => {
  mockPages([lead(1), lead(2), lead(3)], 2);
  const normalFetch = jest.mocked(api.get).getMockImplementation();
  jest.mocked(api.get).mockImplementation(async (url, config) => {
    if (url === "/leads" && config?.params?.page === 2)
      throw new Error("Connection lost");
    if (!normalFetch) throw new Error("Missing mock");
    return normalFetch(url, config);
  });
  await expect(
    fetchLeadRowsForExport({ search: "", teamScope: false }),
  ).rejects.toThrow("Connection lost");
});

it.each(["duplicate", "changed total", "empty page", "invalid row"])(
  "rejects %s instead of silently downloading fewer leads",
  async (kind) => {
    jest.mocked(api.get).mockImplementation(async (url, config) => {
      if (url !== "/leads") return { data: { data: [] } };
      const page = Number(config?.params?.page);
      return {
        data: {
          data:
            page === 1
              ? [lead(1)]
              : kind === "duplicate"
              ? [lead(1)]
              : kind === "invalid row"
              ? [null]
              : [],
          meta: { total: page === 2 && kind === "changed total" ? 3 : 2 },
        },
      };
    });
    await expect(
      fetchLeadRowsForExport({ search: "", teamScope: false }),
    ).rejects.toThrow(/try/i);
  },
);
