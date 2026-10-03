import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from "../Table/Table";
import { cn } from "../../lib/utils";

export interface ColumnDef<TData> {
  id?: string;
  header: React.ReactNode;
  accessorKey?: keyof TData | string;
  cell?: (row: TData) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

function getAccessorValue<TData>(
  row: TData,
  accessorKey: keyof TData | string,
): React.ReactNode {
  if (typeof row !== "object" || row === null) {
    return null;
  }

  const value = (row as Record<string, unknown>)[String(accessorKey)];

  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return value;
  }

  return String(value);
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  onRowClick?: (row: TData) => void;
  skeletonRowCount?: number;
  minHeight?: string;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  emptyMessage = "No results found.",
  className,
  tableClassName,
  onRowClick,
  skeletonRowCount = 6,
  minHeight = "min-h-[440px]",
}: DataTableProps<TData>) {
  const padRowCount =
    !isLoading && data.length > 0 && data.length < skeletonRowCount
      ? skeletonRowCount - data.length
      : 0;

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        minHeight,
        className,
      )}
    >


      <div className="min-h-0 flex-1 overflow-x-auto">
        <Table className={cn("w-full", tableClassName)}>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              {columns.map((col, index) => (
                <TableHead
                  key={index}
                  className={cn(
                    "px-2.5 py-3 text-xs font-bold text-foreground",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/70">
            {isLoading ? (
              Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                <TableRow
                  key={`skeleton-row-${rowIndex}`}
                  className="animate-pulse hover:bg-transparent"
                >
                  {columns.map((col, colIndex) => (
                    <TableCell
                      key={`skeleton-col-${colIndex}`}
                      className={cn(
                        "px-2.5 py-3.5 align-middle",
                        col.className,
                      )}
                    >
                      {colIndex === 0 ? (
                        <div className="flex items-center gap-2.5">
                          <div className="h-4 w-4 shrink-0 rounded border border-slate-200 bg-slate-200/80" />
                          <div className="h-3.5 w-16 rounded bg-slate-200/80" />
                        </div>
                      ) : colIndex === 1 ? (
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 rounded bg-slate-200/80" />
                          <div className="h-2.5 w-16 rounded bg-slate-200/50" />
                        </div>
                      ) : colIndex === 2 ? (
                        <div className="h-3.5 w-24 rounded bg-slate-200/70" />
                      ) : colIndex === 3 ? (
                        <div className="h-5 w-16 rounded-full bg-slate-200/70" />
                      ) : (
                        <div
                          className={cn(
                            "h-3.5 rounded bg-slate-200/60",
                            colIndex % 3 === 0
                              ? "w-20"
                              : colIndex % 2 === 0
                              ? "w-16"
                              : "w-12",
                          )}
                        />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-80">
                  <TableEmpty>{emptyMessage}</TableEmpty>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {data.map((row, rowIndex) => (
                  <TableRow
                    key={rowIndex}
                    className={cn(
                      "animate-in fade-in-50 duration-200 transition-colors hover:bg-muted/45",
                      onRowClick && "cursor-pointer",
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col, colIndex) => (
                      <TableCell
                        key={colIndex}
                        className={cn(
                          "px-2.5 py-3 align-top xl:align-middle",
                          col.className,
                        )}
                      >
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                          ? getAccessorValue(row, col.accessorKey)
                          : null}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {padRowCount > 0
                  ? Array.from({ length: padRowCount }).map((_, padIdx) => (
                      <TableRow
                        key={`pad-row-${padIdx}`}
                        aria-hidden="true"
                        className="pointer-events-none hover:bg-transparent"
                      >
                        <TableCell
                          colSpan={columns.length}
                          className="h-12 border-0 bg-transparent"
                        />
                      </TableRow>
                    ))
                  : null}
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
