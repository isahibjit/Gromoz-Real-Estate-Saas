import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "ui";
import { type LeadStatusRow } from "../leadMastersData";

interface LeadStatusDataTableProps {
  data: LeadStatusRow[];
  onEdit?: (status: LeadStatusRow) => void;
  onDelete?: (status: LeadStatusRow) => void;
  onToggleActive?: (status: LeadStatusRow, isActive: boolean) => void;
}

export function LeadStatusDataTable({
  data,
  onEdit,
  onDelete,
  onToggleActive,
}: LeadStatusDataTableProps) {
  return (
    <div className="w-full bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-100">
            <TableRow className="hover:bg-transparent border-0">
              {[
                "#",
                "Status Name",
                "Code",
                "Description",
                "Category",
                "Default Next Status",
                "Status Type",
                "Is Active",
                "Actions",
              ].map((heading, i) => (
                <TableHead
                  key={heading}
                  className={cn(
                    "h-11 whitespace-nowrap px-4 text-sm font-bold text-secondary",
                    i === 8 ? "text-right" : "",
                  )}
                >
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.id} className="group hover:bg-slate-50/50">
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {row.sortOrder}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-blue-600">
                  {row.name}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-bold text-secondary">
                  {row.code}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-semibold text-secondary">
                  {row.description}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge
                    className={cn(
                      "border-0 px-2 py-1 text-[11px] font-extrabold",
                      row.category === "Open" && "bg-blue-50 text-blue-700",
                      row.category === "In Progress" &&
                        "bg-orange-50 text-orange-600",
                      row.category === "Closed" &&
                        "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {row.category}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-semibold text-secondary">
                  {row.defaultNextStatus}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Badge
                    className={cn(
                      "border-0 px-2 py-1 text-[11px] font-extrabold",
                      row.statusType === "System Default"
                        ? "bg-purple-50 text-purple-700"
                        : "bg-emerald-50 text-emerald-700",
                    )}
                  >
                    {row.statusType}
                  </Badge>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Switch
                    checked={row.isActive}
                    onCheckedChange={(checked) =>
                      onToggleActive?.(row, checked)
                    }
                  />
                </TableCell>
                <TableCell className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit?.(row)}
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete?.(row)}
                      className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mt-1">
          Showing 1 to {data.length} of {data.length} statuses
        </div>

        <div className="flex flex-col items-end gap-3 sm:ml-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded border-slate-200 text-slate-400 shadow-none hover:text-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="navy"
                className="h-8 w-8 rounded px-0 text-xs font-bold shadow-none"
              >
                1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded border-slate-200 text-slate-400 shadow-none hover:text-secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-secondary">
                Rows per page
              </span>
              <Select defaultValue="10">
                <SelectTrigger className="h-8 w-[65px] text-xs font-bold rounded shadow-none border-slate-200">
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
    </div>
  );
}
