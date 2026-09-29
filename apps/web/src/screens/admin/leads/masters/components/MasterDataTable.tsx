import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  TablePageSizeOptions,
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

import {
  type LeadMasterBaseRow,
  type LeadMasterColumn,
} from "../leadMastersData";

interface MasterDataTableProps {
  columns: LeadMasterColumn[];
  data: LeadMasterBaseRow[];
  page: number;
  rowsPerPage: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
  onEdit: (row: LeadMasterBaseRow) => void;
  onDelete: (row: LeadMasterBaseRow) => void;
  onToggleActive: (row: LeadMasterBaseRow, isActive: boolean) => void;
  onToggleField?: (
    row: LeadMasterBaseRow,
    fieldKey: string,
    nextValue: boolean,
  ) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export function MasterDataTable({
  columns,
  data,
  page,
  rowsPerPage,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleField,
  canUpdate = true,
  canDelete = true,
}: MasterDataTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));
  const pageStart = totalCount === 0 ? 0 : page * rowsPerPage + 1;
  const pageEnd = totalCount === 0 ? 0 : page * rowsPerPage + data.length;

  const renderText = (row: LeadMasterBaseRow, column: LeadMasterColumn) => {
    const value = column.valueKey ? row[column.valueKey] : undefined;

    if (column.key === "allowFollowUp") {
      return row.allowFollowUp === false ? "Blocked" : "Allowed";
    }

    if (column.key === "followUpNotificationEnabled") {
      return row.followUpNotificationEnabled === false ? "Off" : "On";
    }

    if (column.key === "pointsEnabled") {
      return row.pointsEnabled === false ? "Not Scorable" : "Scorable";
    }

    if (column.key === "followUpRenotifyMinutes") {
      const minutes = Number(row.followUpRenotifyMinutes ?? 0);
      return minutes >= 2 ? `Every ${minutes} min` : "Once";
    }

    if (value === undefined || value === null || value === "") {
      return column.emptyText ?? "—";
    }

    if (column.suffix && typeof value === "number") {
      return `${value}${column.suffix}`;
    }

    return String(value);
  };

  return (
    <div className="w-full bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-slate-100 bg-slate-50/80">
            <TableRow className="border-0 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  className={cn(
                    "h-11 whitespace-nowrap px-4 text-sm font-bold text-secondary",
                    column.align === "right" && "text-right",
                  )}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm font-semibold text-muted-foreground"
                >
                  No master records match the current search and filters.
                </TableCell>
              </TableRow>
            ) : null}

            {data.map((row, index) => (
              <TableRow key={row.id} className="group hover:bg-slate-50/60">
                {columns.map((column) => {
                  if (column.kind === "index") {
                    return (
                      <TableCell
                        key={column.key}
                        className="px-4 py-3 text-xs font-extrabold text-secondary"
                      >
                        {page * rowsPerPage + index + 1}
                      </TableCell>
                    );
                  }

                  if (column.kind === "badge") {
                    const value = column.valueKey
                      ? row[column.valueKey]
                      : undefined;
                    const hasValue =
                      value !== undefined && value !== null && value !== "";
                    const displayValue =
                      column.key === "allowFollowUp"
                        ? value
                          ? "Allowed"
                          : "Blocked"
                        : column.key === "autoAssignActive"
                          ? row.autoAssignActive === false
                            ? "Manual Only"
                            : "Auto-Assign Active"
                          : hasValue
                            ? String(value)
                            : column.emptyText ?? "—";

                    const badgeStyleKey =
                      column.key === "autoAssignActive"
                        ? row.autoAssignActive === false
                          ? "Blocked"
                          : "Allowed"
                        : String(value);

                    return (
                      <TableCell key={column.key} className="px-4 py-3">
                        <Badge
                          title={String(displayValue)}
                          className={cn(
                            "border-0 px-2 py-1 text-[11px] font-extrabold",
                            hasValue
                              ? column.badgeStyles?.[badgeStyleKey]
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          {displayValue}
                        </Badge>
                      </TableCell>
                    );
                  }

                  if (column.kind === "color") {
                    const value = column.valueKey
                      ? row[column.valueKey]
                      : undefined;

                    return (
                      <TableCell key={column.key} className="px-4 py-3">
                        {value ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded-full border border-slate-200"
                              style={{
                                backgroundColor: String(value),
                              }}
                            />
                            <span className="text-xs font-semibold text-secondary">
                              {String(value)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    );
                  }

                  if (column.kind === "toggle") {
                    const checked = column.valueKey
                      ? Boolean(row[column.valueKey])
                      : false;

                    return (
                      <TableCell key={column.key} className="px-4 py-3">
                        <Switch
                          checked={checked}
                          disabled={!canUpdate}
                          onCheckedChange={(nextValue) => {
                            if (!canUpdate) return;
                            if (onToggleField) {
                              onToggleField(
                                row,
                                column.valueKey ?? column.key,
                                nextValue,
                              );
                            } else {
                              onToggleActive(row, nextValue);
                            }
                          }}
                        />
                      </TableCell>
                    );
                  }

                  if (column.kind === "actions") {
                    const showEdit = canUpdate;
                    const showDelete = canDelete && !row.isSystemDefault;

                    return (
                      <TableCell
                        key={column.key}
                        className="px-4 py-3 text-right"
                      >
                        <div className="flex items-center justify-end gap-1">
                          {showEdit ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onEdit(row)}
                              className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {showDelete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(row)}
                              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {!showEdit && !showDelete ? (
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              Read only
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                    );
                  }

                  return (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "px-4 py-3 text-xs font-semibold text-secondary",
                        column.valueKey === "name" &&
                          "font-extrabold text-blue-600",
                      )}
                    >
                      {renderText(row, column)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          Showing {pageStart} to {pageEnd} of {totalCount} records
        </div>

        <div className="flex flex-col items-end gap-3 sm:ml-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded border-slate-200 text-slate-400 shadow-none hover:text-secondary"
                disabled={page === 0}
                onClick={() => onPageChange(Math.max(0, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="navy"
                className="h-8 min-w-8 rounded px-3 text-xs font-bold shadow-none"
              >
                {page + 1}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded border-slate-200 text-slate-400 shadow-none hover:text-secondary"
                disabled={page + 1 >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-secondary">
                Rows per page
              </span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => onRowsPerPageChange(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px] rounded border-slate-200 text-xs font-bold shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <TablePageSizeOptions sizes={[5, 10, 20]} labelPrefix="" />
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
