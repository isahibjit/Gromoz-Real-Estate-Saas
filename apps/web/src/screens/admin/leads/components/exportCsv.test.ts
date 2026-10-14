import * as XLSX from "xlsx";
import { downloadLeadRowsCsv } from "./exportCsv";

it("writes all 294 rows to the actual CSV, including properly quoted multiline values", async () => {
  let exportedBlob: Blob | undefined;
  const createObjectURL = jest.fn((blob: Blob) => {
    exportedBlob = blob;
    return "blob:export-test";
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: jest.fn(),
  });
  const click = jest
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => undefined);
  try {
    downloadLeadRowsCsv({
      rows: Array.from({ length: 294 }, (_, index) => ({
        name: `Customer "${index}"`,
        addedDate: "13 Oct 2026\n10:00 am",
        projectName: "Mira Road Sudo",
      })),
      filePrefix: "leads-export",
      visibleColumns: ["name", "addedDate", "projectName"],
    });
    if (!exportedBlob) throw new Error("CSV file was not created");
    const csvBlob = exportedBlob;
    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(csvBlob);
    });
    const workbook = XLSX.read(csv, { type: "string", raw: true });
    const records = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets[workbook.SheetNames[0]],
      { header: 1 },
    );
    expect(records).toHaveLength(295);
    expect(records[0]).toEqual(["Name", "Added Date", "Project Name"]);
    expect(records[294]).toEqual([
      'Customer "293"',
      "13 Oct 2026\n10:00 am",
      "Mira Road Sudo",
    ]);
    expect(click).toHaveBeenCalledTimes(1);
  } finally {
    click.mockRestore();
  }
});
