import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Download,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";
import { AuditLogRecord } from "../auditLogData";

interface AuditLogTableCardProps {
  data: AuditLogRecord[];
  onRowClick?: (record: AuditLogRecord) => void;
}

function ActionBadge({ action }: { action: AuditLogRecord["action"] }) {
  if (action === "Created") {
    return (
      <Badge className="bg-green-50 text-green-600 hover:bg-green-100 border-0 shadow-none font-bold rounded-md">
        Created
      </Badge>
    );
  }
  if (action === "Updated") {
    return (
      <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-0 shadow-none font-bold rounded-md">
        Updated
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-50 text-red-600 hover:bg-red-100 border-0 shadow-none font-bold rounded-md">
      Deleted
    </Badge>
  );
}

function ValueDisplay({ value }: { value: string }) {
  if (value.startsWith("#") && (value.length === 4 || value.length === 7)) {
    return (
      <div className="flex items-center gap-2">
        <span>{value}</span>
        <span
          className="w-2.5 h-2.5 rounded-full shadow-sm border border-black/10"
          style={{ backgroundColor: value }}
        />
      </div>
    );
  }
  return <span>{value}</span>;
}

export function AuditLogTableCard({
  data,
  onRowClick,
}: AuditLogTableCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b border-slate-100 gap-4">
        <h2 className="text-sm font-extrabold text-secondary">
          Total Records: <span className="text-blue-600">28</span>
        </h2>
        <Button
          variant="outline"
          className="h-9 gap-2 text-sm font-bold text-blue-600 border-blue-200 hover:bg-blue-50 shadow-none"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="px-5 py-3.5 font-bold text-secondary w-12">#</th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-600">
                  Date & Time
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                Master Category
              </th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                Record Name / Code
              </th>
              <th className="px-5 py-3.5 font-bold text-secondary">Action</th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                Field Changed
              </th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                Old Value
              </th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                New Value
              </th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                Changed By
              </th>
              <th className="px-5 py-3.5 font-bold text-secondary">
                IP Address
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={row.id}
                className={`hover:bg-slate-50/50 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
                onClick={() => onRowClick?.(row)}
              >
                <td className="px-5 py-3 font-semibold text-secondary">
                  {row.id}
                </td>
                <td className="px-5 py-3 font-medium text-secondary">
                  {row.dateTime}
                </td>
                <td className="px-5 py-3 font-medium text-muted-foreground">
                  {row.category}
                </td>
                <td className="px-5 py-3 font-medium text-secondary">
                  {row.recordName}
                </td>
                <td className="px-5 py-3">
                  <ActionBadge action={row.action} />
                </td>
                <td className="px-5 py-3 font-medium text-secondary">
                  {row.fieldChanged}
                </td>
                <td className="px-5 py-3 font-medium text-muted-foreground">
                  <ValueDisplay value={row.oldValue} />
                </td>
                <td className="px-5 py-3 font-medium text-secondary">
                  <ValueDisplay value={row.newValue} />
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6 border border-slate-200">
                      {row.changedByAvatar ? (
                        <img
                          src={row.changedByAvatar}
                          alt={row.changedByInitials}
                        />
                      ) : (
                        <AvatarFallback className="text-[10px] bg-slate-100 text-secondary">
                          {row.changedByInitials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="font-semibold text-secondary text-xs">
                      {row.changedBy}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 font-medium text-secondary text-xs">
                  {row.ipAddress}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-t border-slate-100 gap-4">
        <p className="text-xs font-semibold text-muted-foreground">
          Showing 1 to 10 of 28 records
        </p>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md shadow-none border-slate-200 text-muted-foreground hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md shadow-none border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
            >
              1
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md shadow-none border-slate-200 text-secondary hover:bg-slate-50 font-semibold"
            >
              2
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md shadow-none border-slate-200 text-secondary hover:bg-slate-50 font-semibold"
            >
              3
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-md shadow-none border-slate-200 text-muted-foreground hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Rows per page
            </span>
            <Select defaultValue="10">
              <SelectTrigger className="h-8 w-16 text-xs font-bold shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
