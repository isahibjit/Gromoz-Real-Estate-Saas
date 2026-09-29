import { Badge, cn } from "ui";

import type { SlaStatus } from "./slaTypes";

const statusClass: Record<SlaStatus, string> = {
  "on-time": "bg-green-50 text-success",
  "due-soon": "bg-orange-50 text-primary",
  breached: "bg-red-50 text-red-600",
};

const statusLabel: Record<SlaStatus, string> = {
  "on-time": "On Time",
  "due-soon": "Due Soon",
  breached: "Breached",
};

export function SlaBadge({
  status,
  className,
}: {
  status: SlaStatus;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "border-0 px-2 py-1 text-[10px] font-extrabold",
        statusClass[status],
        className,
      )}
    >
      {statusLabel[status]}
    </Badge>
  );
}
