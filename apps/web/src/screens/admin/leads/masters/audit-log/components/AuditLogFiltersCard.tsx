import { CalendarDays, Filter, RefreshCcw } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

import { visibleMasterCategoryDefinitions } from "../../leadMastersData";

export function AuditLogFiltersCard() {
  return (
    <div className="mb-6 flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:flex-row xl:items-end">
      <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">
            Master Category
          </label>
          <Select defaultValue="status">
            <SelectTrigger className="h-10 text-sm font-semibold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibleMasterCategoryDefinitions.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">
            Record Name / Code
          </label>
          <Input
            placeholder="Search by name or code"
            className="h-10 text-sm font-semibold shadow-none placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Action</label>
          <Select defaultValue="all">
            <SelectTrigger className="h-10 text-sm font-semibold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
              <SelectItem value="deactivated">Deactivated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Changed By</label>
          <Select defaultValue="all">
            <SelectTrigger className="h-10 text-sm font-semibold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="amit">Amit Kumar</SelectItem>
              <SelectItem value="priya">Priya Singh</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-secondary">Date Range</label>
          <Select defaultValue="range">
            <SelectTrigger className="h-10 text-sm font-semibold shadow-none">
              <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-blue-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="range">May 20, 2025 - May 26, 2025</SelectItem>
              <SelectItem value="last30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center gap-3 pt-2 xl:w-auto xl:pt-0">
        <Button
          variant="outline"
          className="h-10 flex-1 gap-2 border-blue-200 font-bold text-blue-600 shadow-none hover:bg-blue-50 xl:flex-none"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
        <Button
          variant="outline"
          className="h-10 flex-1 gap-2 border-slate-200 font-bold text-secondary shadow-none hover:bg-slate-50 xl:flex-none"
        >
          <RefreshCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
