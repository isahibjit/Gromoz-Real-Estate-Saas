import { Download } from "lucide-react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "ui";
import { AuditLogRecord } from "../auditLogData";
import { AuditRecordInformation } from "./details/AuditRecordInformation";
import { AuditChangesSummaryTable } from "./details/AuditChangesSummaryTable";
import { AuditAdditionalInformation } from "./details/AuditAdditionalInformation";

interface ViewAuditLogDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AuditLogRecord | null;
  isLoading?: boolean;
}

export function ViewAuditLogDetailsModal({
  open,
  onOpenChange,
  record,
  isLoading,
}: ViewAuditLogDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[720px] max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden bg-white">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl font-extrabold text-secondary">
            View Audit Log Details
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-4 w-1/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-32 w-full bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-4 w-1/4 bg-slate-100 rounded animate-pulse mt-8" />
              <div className="h-48 w-full bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ) : !record ? (
            <div className="py-12 text-center text-sm font-semibold text-muted-foreground">
              No record selected.
            </div>
          ) : (
            <>
              <AuditRecordInformation record={record} />

              <div className="h-px bg-slate-100 w-full" />

              <AuditChangesSummaryTable changes={record.changes} />

              <AuditAdditionalInformation
                remarks={record.remarks}
                reference={record.reference}
              />
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center justify-end gap-3 bg-white">
          <Button
            variant="outline"
            className="h-10 px-6 font-bold text-secondary border-slate-200 hover:bg-slate-50 shadow-none"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            className="h-10 px-6 gap-2 font-bold text-white bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 border-0 shadow-sm"
            disabled={!record || isLoading}
            onClick={() => {
              // TODO: Wire up actual download API
              console.log("Downloading audit log", record?.id);
            }}
          >
            <Download className="h-4 w-4" />
            Download Log
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
