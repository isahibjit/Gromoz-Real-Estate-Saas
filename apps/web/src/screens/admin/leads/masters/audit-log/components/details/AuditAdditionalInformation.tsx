import { displayReference } from "../../../../../../../common/displayReference";
interface AuditAdditionalInformationProps {
  remarks?: string;
  reference?: string;
}

export function AuditAdditionalInformation({
  remarks,
  reference,
}: AuditAdditionalInformationProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-extrabold text-blue-600">
        Additional Information
      </h3>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="grid grid-cols-[100px_1fr] items-start gap-2">
          <span className="text-sm font-bold text-secondary">Remarks</span>
          <span className="text-sm font-semibold text-secondary flex gap-2">
            <span className="text-muted-foreground font-normal">:</span>
            {remarks || "—"}
          </span>
        </div>
        <div className="grid grid-cols-[100px_1fr] items-start gap-2">
          <span className="text-sm font-bold text-secondary">Reference</span>
          <span className="text-sm font-semibold text-secondary flex gap-2">
            <span className="text-muted-foreground font-normal">:</span>
            {displayReference(reference, "—")}
          </span>
        </div>
      </div>
    </div>
  );
}
