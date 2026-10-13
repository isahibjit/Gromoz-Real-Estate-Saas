import type { LeadFilterOption } from "../all/useAllLeads";
import {
  getRoutingAssigneeOptions,
  mapRoutingAssigneeSelection,
} from "./routingAssignee";

const options: LeadFilterOption[] = [
  { value: "telecaller-1", label: "Pre Sales", role: "TELECALLER" },
  { value: "sales-agent-1", label: "Sales Agent", role: "SALES_AGENT" },
  { value: "admin-1", label: "Admin", role: "ADMIN" },
  { value: "manager-1", label: "Manager", role: "MANAGER" },
  { value: "team-leader-1", label: "Team Leader", role: "TEAM_LEADER" },
  {
    value: "sales-manager-1",
    label: "Sales Manager",
    role: "SALES_MANAGER",
  },
  { value: "unknown-1", label: "Unknown" },
];

describe("routing assignee helpers", () => {
  it("offers Pre Sales, Sales Agent, and management-role users", () => {
    expect(getRoutingAssigneeOptions(options)).toEqual(options.slice(0, 6));
  });

  it("maps a Telecaller exclusively to telecallerId", () => {
    expect(mapRoutingAssigneeSelection("telecaller-1", options)).toEqual({
      ownerId: "",
      telecallerId: "telecaller-1",
      fieldExecutiveId: "",
    });
  });

  it("maps a Sales Agent exclusively to fieldExecutiveId", () => {
    expect(mapRoutingAssigneeSelection("sales-agent-1", options)).toEqual({
      ownerId: "",
      telecallerId: "",
      fieldExecutiveId: "sales-agent-1",
    });
  });

  it.each(["admin-1", "manager-1", "team-leader-1", "sales-manager-1"])(
    "maps a management role %s exclusively to ownerId",
    (value) => {
      expect(mapRoutingAssigneeSelection(value, options)).toEqual({
        ownerId: value,
        telecallerId: "",
        fieldExecutiveId: "",
      });
    },
  );

  it("clears all assignments for an empty selection", () => {
    expect(mapRoutingAssigneeSelection("", options)).toEqual({
      ownerId: "",
      telecallerId: "",
      fieldExecutiveId: "",
    });
  });

  it("does not populate any field for an unknown-role selection", () => {
    expect(mapRoutingAssigneeSelection("unknown-1", options)).toEqual({
      ownerId: "",
      telecallerId: "",
      fieldExecutiveId: "",
    });
  });
});
