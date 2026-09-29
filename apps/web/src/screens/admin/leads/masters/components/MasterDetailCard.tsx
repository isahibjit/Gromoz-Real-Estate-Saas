import { type ReactNode } from "react";
import { Filter, RotateCcw, Search } from "lucide-react";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

import {
  type LeadMasterFilterState,
  type LeadMasterStat,
  type MasterCategory,
} from "../leadMastersData";
import { MasterStatsCard } from "./MasterStatsCard";

interface MasterDetailCardProps {
  category: MasterCategory;
  stats: Record<LeadMasterStat["key"], number>;
  totalLabel: string;
  searchPlaceholder: string;
  filterLabel?: string;
  filterOptions?: { label: string; value: string }[];
  filters: LeadMasterFilterState;
  showFilters: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (nextState: Partial<LeadMasterFilterState>) => void;
  onToggleFilters: () => void;
  onResetFilters: () => void;
  children?: ReactNode;
}

export function MasterDetailCard({
  category,
  stats,
  totalLabel,
  searchPlaceholder,
  filterLabel,
  filterOptions,
  filters,
  showFilters,
  onSearchChange,
  onFilterChange,
  onToggleFilters,
  onResetFilters,
  children,
}: MasterDetailCardProps) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-secondary">
              {category.name}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {category.description}
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  aria-label={`Search ${category.name}`}
                  value={filters.search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 rounded-md border-slate-200 pl-9 pr-4 text-sm font-semibold shadow-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 rounded-md border-slate-200 px-4 shadow-none"
                  onClick={onToggleFilters}
                >
                  <Filter className="h-4 w-4" />
                  <span className="font-bold">Filters</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 gap-2 rounded-md border-slate-200 px-4 shadow-none"
                  onClick={onResetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="font-bold">Reset</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showFilters ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select
              value={filters.activity}
              onValueChange={(value) =>
                onFilterChange({
                  activity: value as LeadMasterFilterState["activity"],
                })
              }
            >
              <SelectTrigger className="h-10 text-sm font-semibold shadow-none">
                <SelectValue placeholder="Filter by activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activity</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.statusType}
              onValueChange={(value) =>
                onFilterChange({
                  statusType: value as LeadMasterFilterState["statusType"],
                })
              }
            >
              <SelectTrigger className="h-10 text-sm font-semibold shadow-none">
                <SelectValue placeholder="Filter by status type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status types</SelectItem>
                <SelectItem value="system_default">System Default</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {filterOptions?.length ? (
              <Select
                value={filters.categoryValue}
                onValueChange={(value) =>
                  onFilterChange({ categoryValue: value })
                }
              >
                <SelectTrigger className="h-10 text-sm font-semibold shadow-none">
                  <SelectValue
                    placeholder={
                      filterLabel
                        ? `Filter by ${filterLabel.toLowerCase()}`
                        : "Filter by type"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All {filterLabel ?? "types"}
                  </SelectItem>
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <MasterStatsCard
          total={stats.total}
          active={stats.active}
          inactive={stats.inactive}
          systemDefault={stats.systemDefault}
          totalLabel={totalLabel}
        />

        <div className="rounded-lg border border-slate-200">{children}</div>
      </div>
    </div>
  );
}
