import { Avatar, AvatarFallback, Badge } from "ui";
import { Chrome } from "lucide-react"; // Generic fallback for browser, or we can use custom icons if we had them.
import { AuditLogRecord } from "../../auditLogData";

interface AuditRecordInformationProps {
  record: AuditLogRecord;
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

export function AuditRecordInformation({
  record,
}: AuditRecordInformationProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-[15px] font-extrabold text-blue-600">
        Record Information
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        {/* Left Column */}
        <div className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">
              Master Category
            </span>
            <span className="text-sm font-semibold text-secondary flex gap-2">
              <span className="text-muted-foreground font-normal">:</span>{" "}
              {record.category || "—"}
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">
              Record Name / Code
            </span>
            <span className="text-sm font-semibold text-secondary flex gap-2">
              <span className="text-muted-foreground font-normal">:</span>{" "}
              {record.recordName || "—"}
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">
              Action Performed
            </span>
            <span className="text-sm font-semibold text-secondary flex gap-2 items-center">
              <span className="text-muted-foreground font-normal mr-2">:</span>
              <ActionBadge action={record.action} />
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">
              Date & Time
            </span>
            <span className="text-sm font-semibold text-secondary flex gap-2">
              <span className="text-muted-foreground font-normal">:</span>{" "}
              {record.dateTime || "—"}
            </span>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">Changed By</span>
            <div className="text-sm font-semibold text-secondary flex gap-2 items-center">
              <span className="text-muted-foreground font-normal mr-2">:</span>
              <Avatar className="h-6 w-6 border border-slate-200">
                {record.changedByAvatar ? (
                  <img
                    src={record.changedByAvatar}
                    alt={record.changedByInitials}
                  />
                ) : (
                  <AvatarFallback className="text-[10px] bg-slate-100 text-secondary">
                    {record.changedByInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              {record.changedBy || "—"}
            </div>
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">User Role</span>
            <span className="text-sm font-semibold text-secondary flex gap-2">
              <span className="text-muted-foreground font-normal">:</span>{" "}
              {record.userRole || "—"}
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">IP Address</span>
            <span className="text-sm font-semibold text-secondary flex gap-2">
              <span className="text-muted-foreground font-normal">:</span>{" "}
              {record.ipAddress || "—"}
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr] items-center gap-2">
            <span className="text-sm font-bold text-secondary">
              Device / Browser
            </span>
            <span className="text-sm font-semibold text-secondary flex gap-2 items-center">
              <span className="text-muted-foreground font-normal mr-2">:</span>
              {record.deviceBrowser?.includes("Chrome") && (
                <Chrome className="h-4 w-4 text-green-500" />
              )}
              {record.deviceBrowser || "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
