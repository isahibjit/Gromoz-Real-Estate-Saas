import {
  displayReference,
  displayText,
  presentRecordDetails,
} from "./displayReference";

const id = "2fa1d240-da15-410c-9bd7-3da88d16afe1";

test("keeps business references and replaces internal identifiers with readable labels", () => {
  expect(displayReference("TR-1042", "Lead")).toBe("TR-1042");
  expect(displayReference("INV-2026-014", "Invoice")).toBe("INV-2026-014");
  expect(displayReference(id.toUpperCase(), "Lead")).toBe("Lead");
  expect(displayReference(id.replaceAll("-", ""), "Lead")).toBe("Lead");
  expect(displayReference(null, "Unassigned")).toBe("Unassigned");
  expect(displayText(`Record ${id} unavailable`)).toBe(
    "Record internal reference unavailable",
  );
});

test("removes nested UUID values and keys without mutating the API record", () => {
  const original = {
    leadId: id,
    name: "Buyer",
    count: 2,
    nested: { [id]: "internal", displayId: "TR-1042" },
    list: [id, "Saved"],
    reason: `Record ${id} changed`,
    empty: null,
  };
  expect(presentRecordDetails(original)).toEqual({
    name: "Buyer",
    count: 2,
    nested: { displayId: "TR-1042" },
    list: ["Saved"],
    reason: "Record internal reference changed",
    empty: null,
  });
  expect(original.leadId).toBe(id);
  expect(original.nested[id]).toBe("internal");
});
