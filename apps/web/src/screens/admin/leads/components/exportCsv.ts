interface ExportCsvOptions {
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  filePrefix: string;
}

export interface ExportableLeadRow {
  addedDate?: string;
  lastUpdate?: string;
  source?: string;
  integrationAccountName?: string;
  name: string;
  mobile?: string;
  email?: string | null;
  projectName?: string;
  telecallerName?: string | null;
  fieldExecutiveName?: string | null;
  ownerName?: string | null;
  status?: string;
  leadType?: string;
  nextFollowUp?: string;
  remark?: string;
}

export function downloadCsvFile({
  headers,
  rows,
  filePrefix,
}: ExportCsvOptions) {
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const exportDate = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `${filePrefix}-${exportDate}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export function downloadLeadRowsCsv({
  rows,
  filePrefix,
  visibleColumns,
}: {
  rows: ExportableLeadRow[];
  filePrefix: string;
  visibleColumns?: readonly string[];
}) {
  const selectedCols = visibleColumns ?? [
    "addedDate",
    "lastUpdate",
    "source",
    "name",
    "number",
    "email",
    "projectName",
    "executive",
    "leadStatus",
    "leadType",
    "followUpDate",
    "remark",
  ];

  const columnMap: Record<
    string,
    { id: string; header: string; value: (lead: ExportableLeadRow) => string | number | null | undefined }
  > = {
    addedDate: { id: "addedDate", header: "Added Date", value: (lead) => lead.addedDate },
    lastUpdate: { id: "lastUpdate", header: "Last Update", value: (lead) => lead.lastUpdate },
    source: { id: "source", header: "Source", value: (lead) => lead.source },
    sourceAccount: {
      id: "sourceAccount",
      header: "Source Account",
      value: (lead) => lead.integrationAccountName ?? "Legacy / unattributed",
    },
    name: { id: "name", header: "Name", value: (lead) => lead.name },
    number: { id: "number", header: "Number", value: (lead) => lead.mobile },
    email: { id: "email", header: "Email", value: (lead) => lead.email },
    projectName: { id: "projectName", header: "Project Name", value: (lead) => lead.projectName },
    executive: {
      id: "executive",
      header: "Executive",
      value: (lead) =>
        lead.ownerName || lead.telecallerName || lead.fieldExecutiveName || "Unassigned",
    },
    leadStatus: { id: "leadStatus", header: "Lead Status", value: (lead) => lead.status },
    status: { id: "status", header: "Lead Status", value: (lead) => lead.status },
    leadType: { id: "leadType", header: "Lead Type", value: (lead) => lead.leadType },
    followUpDate: {
      id: "followUpDate",
      header: "Follow-up Date",
      value: (lead) => lead.nextFollowUp,
    },
    remark: { id: "remark", header: "Remark", value: (lead) => lead.remark },
  };

  const exportColumns: Array<{
    id: string;
    header: string;
    value: (lead: ExportableLeadRow) => string | number | null | undefined;
  }> = [];

  const addedIds = new Set<string>();
  for (const colId of selectedCols) {
    const def = columnMap[colId];
    if (def && !addedIds.has(def.header)) {
      addedIds.add(def.header);
      exportColumns.push(def);
    }
  }

  downloadCsvFile({
    headers: exportColumns.map((column) => column.header),
    rows: rows.map((lead) => exportColumns.map((column) => column.value(lead))),
    filePrefix,
  });
}
