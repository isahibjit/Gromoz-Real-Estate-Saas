import { buildLeadAssignmentChanges } from "./leadAssignmentChanges";

describe("buildLeadAssignmentChanges", () => {
  it("omits an unchanged Pre Sales assignment when adding a Sales Executive", () => {
    expect(
      buildLeadAssignmentChanges(
        [{ ownerId: "pre-sales-1", telecallerId: "pre-sales-1" }],
        {
          telecallerId: "pre-sales-1",
          fieldExecutiveId: "sales-1",
        },
      ),
    ).toEqual({
      telecallerUnchangedForAll: true,
      fieldExecutiveUnchangedForAll: false,
      assignments: [{ toUserId: "sales-1", assigneeType: "field-executive" }],
    });
  });

  it("omits both assignments when neither selection changed", () => {
    expect(
      buildLeadAssignmentChanges(
        [
          {
            ownerId: "pre-sales-1",
            telecallerId: "pre-sales-1",
            fieldExecutiveId: "sales-1",
          },
        ],
        {
          telecallerId: "pre-sales-1",
          fieldExecutiveId: "sales-1",
        },
      ).assignments,
    ).toEqual([]);
  });

  it("keeps a selected assignment when it differs for any selected lead", () => {
    expect(
      buildLeadAssignmentChanges(
        [{ telecallerId: "pre-sales-1" }, { telecallerId: "pre-sales-2" }],
        {
          telecallerId: "pre-sales-1",
          fieldExecutiveId: "",
        },
      ).assignments,
    ).toEqual([{ toUserId: "pre-sales-1", assigneeType: "telecaller" }]);
  });
});
