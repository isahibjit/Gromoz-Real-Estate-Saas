import {
  buildLeadAssignmentChanges,
  getLeadAssignmentEntries,
  getPreSalesAssignmentId,
} from "./leadAssignmentChanges";

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

  it("does not treat the owner as an existing Pre Sales assignment", () => {
    expect(
      buildLeadAssignmentChanges(
        [{ ownerId: "pre-sales-1", fieldExecutiveId: "sales-1" }],
        { telecallerId: "pre-sales-1", fieldExecutiveId: "sales-1" },
      ),
    ).toEqual({
      telecallerUnchangedForAll: false,
      fieldExecutiveUnchangedForAll: true,
      assignments: [{ toUserId: "pre-sales-1", assigneeType: "telecaller" }],
    });
  });
});

describe("executive assignment display", () => {
  it("shows the actual Pre Sales and Sales assignees independently", () => {
    expect(
      getLeadAssignmentEntries({
        ownerId: "sales-1",
        ownerName: "Akshat",
        telecallerId: "pre-sales-1",
        telecallerName: "Afreen",
        fieldExecutiveId: "sales-1",
        fieldExecutiveName: "Akshat",
      }),
    ).toEqual([
      { label: "Pre Sales Executive", value: "Afreen" },
      { label: "Sales Executive", value: "Akshat" },
    ]);
  });

  it("does not display the same sales employee as Pre Sales as well", () => {
    const lead = {
      ownerId: "sales-1",
      ownerName: "Akshat",
      telecallerId: "sales-1",
      telecallerName: "Akshat",
      fieldExecutiveId: "sales-1",
      fieldExecutiveName: "Akshat",
    };
    expect(getLeadAssignmentEntries(lead)).toEqual([
      { label: "Sales Executive", value: "Akshat" },
    ]);
    expect(getPreSalesAssignmentId(lead)).toBe("");
  });

  it("keeps different employees with the same name", () => {
    expect(
      getLeadAssignmentEntries({
        telecallerId: "pre-sales-1",
        telecallerName: "Akshat",
        fieldExecutiveId: "sales-1",
        fieldExecutiveName: "Akshat",
      }),
    ).toEqual([
      { label: "Pre Sales Executive", value: "Akshat" },
      { label: "Sales Executive", value: "Akshat" },
    ]);
  });

  it("does not invent a Pre Sales assignee for a sales-owned lead", () => {
    const lead = {
      ownerId: "sales-1",
      ownerName: "Akshat",
      fieldExecutiveId: "sales-1",
      fieldExecutiveName: "Akshat",
    };
    expect(getLeadAssignmentEntries(lead)).toEqual([
      { label: "Sales Executive", value: "Akshat" },
    ]);
    expect(getPreSalesAssignmentId(lead)).toBe("");
  });

  it("shows a Pre Sales-only assignment and preserves generic owner fallback", () => {
    expect(
      getLeadAssignmentEntries({
        ownerName: "Akshat",
        telecallerId: "pre-sales-1",
        telecallerName: "Afreen",
      }),
    ).toEqual([{ label: "Pre Sales Executive", value: "Afreen" }]);
    expect(getPreSalesAssignmentId({ telecallerId: "pre-sales-1" })).toBe(
      "pre-sales-1",
    );
    expect(getLeadAssignmentEntries({ ownerName: "Manager" })).toEqual([
      { label: "Owner", value: "Manager" },
    ]);
  });
});
