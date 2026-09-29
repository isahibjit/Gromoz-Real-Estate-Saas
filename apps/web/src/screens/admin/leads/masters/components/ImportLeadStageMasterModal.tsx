import { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  Info,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  ConfirmDeleteDialog,
  cn,
} from "ui";
import toast from "react-hot-toast";

interface ImportLeadStageMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function ImportLeadStageMasterModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportLeadStageMasterModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skipErrors, setSkipErrors] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);

  const handleClose = () => {
    setFile(null);
    setError(null);
    setPreviewData([]);
    setTotalRows(0);
    setSkipErrors(true);
    setSkipDuplicates(true);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls")
    ) {
      setError("Only .xlsx, .xls files are allowed.");
      setFile(null);
      setPreviewData([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Max file size: 5MB.");
      setFile(null);
      setPreviewData([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    setFile(selectedFile);
    // Mock parsing and preview API
    setTimeout(() => {
      setTotalRows(15);
      setPreviewData([
        {
          stageName: "New",
          code: "NEW",
          description: "New lead captured",
          probability: 10,
          type: "Open",
          nextStage: "Contacted",
        },
        {
          stageName: "Contacted",
          code: "CONT",
          description: "Initial contact",
          probability: 20,
          type: "Open",
          nextStage: "Interested",
        },
        {
          stageName: "Interested",
          code: "INT",
          description: "Showed interest",
          probability: 40,
          type: "Open",
          nextStage: "Site Visit",
        },
        {
          stageName: "Site Visit",
          code: "SV",
          description: "Visited site",
          probability: 60,
          type: "In Progress",
          nextStage: "Negotiation",
        },
        {
          stageName: "Negotiation",
          code: "NEG",
          description: "Price discussion",
          probability: 80,
          type: "In Progress",
          nextStage: "Booking",
        },
      ]);
    }, 500);
  };

  const handleImport = () => {
    if (!file) return;
    setShowConfirm(true);
  };

  const executeImport = () => {
    setIsImporting(true);
    // TODO: Verify with backend team if destructive replacement is intended or if we just append.
    // Replace API integration should go here.
    setTimeout(() => {
      setIsImporting(false);
      setShowConfirm(false);
      toast.success("Lead stages imported successfully");
      onImportSuccess();
      handleClose();
    }, 1000);
  };

  const handleDownloadTemplate = () => {
    // TODO: Hook up to real download API
    const csvContent =
      "Stage Name,Code,Description,Probability %,Type,Default Next Stage\n" +
      "Sample Stage,SMPL,This is a sample stage,10,Open,Contacted\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "LeadStage_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Template downloaded");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="max-w-[800px] p-0 overflow-hidden bg-white gap-0 flex flex-col max-h-[90vh] md:h-auto"
          showCloseButton={false}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex flex-col gap-1 pr-4">
              <h2 className="text-[22px] font-extrabold text-secondary">
                Import Lead Stage Master
              </h2>
              <p className="text-sm font-medium text-muted-foreground">
                Upload an Excel file to import lead stages in bulk.
              </p>
            </div>
            <button
              onClick={handleClose}
              aria-label="Close"
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
            {/* Section 1 */}
            <Section
              number={1}
              title="Download Template"
              description="Download the template and fill your data. Make sure you do not change the column headers."
            >
              <div className="flex justify-between items-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                <span className="text-sm font-semibold text-secondary">
                  LeadStage_Template.csv
                </span>
                <Button
                  variant="outline"
                  className="h-9 px-4 font-bold shadow-none text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </Section>

            {/* Section 2 */}
            <Section
              number={2}
              title="Upload File"
              description="Upload the filled template to import data."
            >
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors",
                  error
                    ? "border-red-300 bg-red-50/50"
                    : file
                    ? "border-emerald-300 bg-emerald-50/30"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-50",
                )}
              >
                <div
                  className={cn(
                    "h-12 w-12 rounded-lg flex items-center justify-center",
                    file
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-blue-50 text-blue-600",
                  )}
                >
                  {file ? (
                    <FileSpreadsheet className="h-6 w-6" />
                  ) : (
                    <UploadCloud className="h-6 w-6" />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-secondary">
                    {file ? file.name : "Drag and drop your file here"}
                  </p>
                  {!file && (
                    <p className="text-xs font-medium text-muted-foreground mt-1">
                      or
                    </p>
                  )}
                </div>
                {!file && (
                  <Button
                    variant="outline"
                    className="h-9 px-4 font-bold shadow-none text-blue-600 border-blue-200 hover:bg-blue-50 mt-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="h-4 w-4 mr-2" />
                    Browse File
                  </Button>
                )}
                {file && (
                  <Button
                    variant="ghost"
                    className="h-8 px-3 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 mt-1"
                    onClick={() => {
                      setFile(null);
                      setPreviewData([]);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove File
                  </Button>
                )}
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleFileChange}
                />
              </div>
              {error && (
                <p className="text-xs font-bold text-red-500 mt-2 text-center">
                  {error}
                </p>
              )}
              <p className="text-[11px] font-medium text-slate-500 mt-2 text-center">
                Only .xlsx, .xls files are allowed. Max file size: 5MB
              </p>
            </Section>

            {/* Section 3 (Preview) */}
            {file && previewData.length > 0 && (
              <Section
                number={3}
                title="Preview Data"
                description="Please preview the data before importing."
              >
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent border-0">
                        {[
                          "Stage Name",
                          "Code",
                          "Description",
                          "Probability %",
                          "Type",
                          "Default Next Stage",
                        ].map((h) => (
                          <TableHead
                            key={h}
                            className="h-9 px-4 text-[11px] font-bold text-secondary whitespace-nowrap"
                          >
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, i) => (
                        <TableRow
                          key={i}
                          className="hover:bg-slate-50/50 border-slate-100"
                        >
                          <TableCell className="px-4 py-2.5 text-[12px] font-bold text-secondary">
                            {row.stageName}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-[12px] font-medium text-secondary">
                            {row.code}
                          </TableCell>
                          <TableCell
                            className="px-4 py-2.5 text-[12px] font-medium text-secondary truncate max-w-[120px]"
                            title={row.description}
                          >
                            {row.description}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-[12px] font-medium text-secondary">
                            {row.probability}%
                          </TableCell>
                          <TableCell className="px-4 py-2.5">
                            <Badge
                              className={cn(
                                "border-0 px-2 py-0.5 text-[10px] font-extrabold",
                                row.type === "Open"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-orange-50 text-orange-600",
                              )}
                            >
                              {row.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-[12px] font-medium text-secondary">
                            {row.nextStage}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-slate-500">
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  Showing first 5 rows of data. Total rows: {totalRows}
                </div>
              </Section>
            )}

            {/* Section 4 */}
            <Section number={file ? 4 : 3} title="Import Options">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Checkbox
                    checked={skipErrors}
                    onChange={(e) => setSkipErrors(e.target.checked)}
                    label={
                      <div className="flex flex-col ml-1">
                        <span className="text-sm font-bold text-secondary">
                          Skip rows with errors
                        </span>
                        <span className="text-xs font-medium text-muted-foreground mt-0.5">
                          Valid rows will be imported
                        </span>
                      </div>
                    }
                  />
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <Checkbox
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    label={
                      <div className="flex flex-col ml-1">
                        <span className="text-sm font-bold text-secondary">
                          Do not import duplicates
                        </span>
                        <span className="text-xs font-medium text-muted-foreground mt-0.5">
                          Duplicate stages (by code) will be skipped
                        </span>
                      </div>
                    }
                  />
                </div>
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-11 px-6 font-bold shadow-none text-secondary"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleImport}
              disabled={!file}
              className="h-11 px-6 font-bold shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              Import Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={showConfirm}
        title="Confirm Import Lead Stages"
        description="Importing this data will replace the existing lead stage master data. Existing data will be removed. Are you sure you want to continue?"
        confirmLabel="Yes, Import Data"
        cancelLabel="Cancel"
        destructive={true}
        icon={<AlertTriangle className="w-6 h-6 text-red-500" />}
        isLoading={isImporting}
        onConfirm={executeImport}
        onCancel={() => setShowConfirm(false)}
        onClose={() => {
          if (!isImporting) setShowConfirm(false);
        }}
      />
    </>
  );
}

function Section({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 mt-0.5">
        {number}
      </div>
      <div className="flex-1 space-y-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-[15px] font-extrabold text-secondary">{title}</h3>
          {description && (
            <p className="text-[13px] font-medium text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
