import { CheckCircle2, XCircle } from "lucide-react";
import { displayReference } from "../../../../../../../common/displayReference";
import { AuditLogChange } from "../../auditLogData";

interface AuditChangesSummaryTableProps {
  changes: AuditLogChange[];
}

function FormattedValue({
  value,
  valueType,
}: {
  value: string | number | boolean | null;
  valueType?: string;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-secondary font-medium">—</span>;
  }
  if (typeof value === "string" && !displayReference(value, "")) {
    return <span className="text-secondary font-medium">Reference updated</span>;
  }

  if (valueType === "color" && typeof value === "string") {
    return (
      <div className="flex items-center gap-2 font-semibold text-secondary">
        <span>{value}</span>
        <span
          className="w-2.5 h-2.5 rounded-full shadow-sm border border-black/10"
          style={{ backgroundColor: value }}
        />
      </div>
    );
  }

  if (valueType === "boolean") {
    return (
      <div className="flex items-center gap-1.5 font-semibold text-secondary">
        {value ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Yes
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-500" /> No
          </>
        )}
      </div>
    );
  }

  if (valueType === "percentage") {
    const strVal = String(value);
    return (
      <span className="font-semibold text-secondary">
        {strVal.endsWith("%") ? strVal : `${strVal}%`}
      </span>
    );
  }

  return <span className="font-semibold text-secondary">{String(value)}</span>;
}

export function AuditChangesSummaryTable({
  changes,
}: AuditChangesSummaryTableProps) {
  if (!changes || changes.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-[15px] font-extrabold text-blue-600">
          Changes Summary
        </h3>
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
          <p className="text-sm font-semibold text-muted-foreground">
            No changes recorded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-extrabold text-blue-600">
        Changes Summary
      </h3>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-3.5 font-bold text-secondary">
                  Field Name
                </th>
                <th className="px-5 py-3.5 font-bold text-red-500">
                  Old Value
                </th>
                <th className="px-5 py-3.5 font-bold text-green-600">
                  New Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {changes.map((change, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-5 py-3.5 font-semibold text-secondary">
                    {change.fieldName}
                  </td>
                  <td className="px-5 py-3.5">
                    <FormattedValue
                      value={change.oldValue}
                      valueType={change.valueType}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <FormattedValue
                      value={change.newValue}
                      valueType={change.valueType}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
