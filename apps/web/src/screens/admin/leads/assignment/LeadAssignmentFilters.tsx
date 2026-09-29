import { Calendar, Filter } from "lucide-react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

function FilterSelect({
  label,
  value,
  items,
}: {
  label: string;
  value: string;
  items: string[];
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <Select defaultValue={value}>
        <SelectTrigger className="h-11 min-w-[145px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function LeadAssignmentFilters() {
  return (
    <div className="grid gap-4 border-b px-5 py-4 md:grid-cols-[1fr_1fr_1fr_1.5fr_auto] md:items-end">
      <FilterSelect
        label="Source"
        value="All Sources"
        items={[
          "All Sources",
          "MagicBricks",
          "99acres",
          "Meta Ads",
          "Google Ads",
        ]}
      />
      <FilterSelect
        label="Project"
        value="All Projects"
        items={[
          "All Projects",
          "Green Heights",
          "Skyline Residences",
          "Urban Nest",
        ]}
      />
      <FilterSelect
        label="Priority"
        value="All Priority"
        items={["All Priority", "High", "Medium", "Low"]}
      />
      <label className="space-y-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Date Range
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-between px-3 text-xs font-semibold"
        >
          <span className="flex items-center gap-2">
            <Calendar className="size-4" />
            01 May 2025 - 31 May 2025
          </span>
        </Button>
      </label>
      <Button type="button" variant="outline" className="h-11 px-5 text-xs">
        <Filter className="size-4" />
        Filters
      </Button>
    </div>
  );
}
