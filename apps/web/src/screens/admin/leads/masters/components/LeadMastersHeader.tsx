import {
  CalendarDays,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";
import { DashboardHeader } from "../../../dashboard/DashboardHeader";

interface LeadMastersHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  onMobileMenuOpen: () => void;
  onDesktopSidebarToggle: () => void;
  activeCategoryName?: string;
  activeSubCategoryName?: string;
  sectionTitle?: string;
}

export function LeadMastersHeader({
  search,
  onSearchChange,
  onMobileMenuOpen,
  onDesktopSidebarToggle,
  activeCategoryName,
  activeSubCategoryName,
  sectionTitle = "Lead Masters",
}: LeadMastersHeaderProps) {
  return (
    <DashboardHeader
      onMobileMenuOpen={onMobileMenuOpen}
      onDesktopSidebarToggle={onDesktopSidebarToggle}
      breadcrumbs={
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {activeCategoryName ? (
            <>
              <span>{sectionTitle}</span>
              <ChevronRight className="size-3.5" />
              <span
                className={cn(
                  activeSubCategoryName
                    ? "text-muted-foreground"
                    : "text-foreground",
                )}
              >
                {activeCategoryName}
              </span>
              {activeSubCategoryName && (
                <>
                  <ChevronRight className="size-3.5" />
                  <span className="text-foreground">
                    {activeSubCategoryName}
                  </span>
                </>
              )}
            </>
          ) : (
            <span className="text-foreground">{sectionTitle}</span>
          )}
        </div>
      }
    >
      <div className="flex items-center gap-3 w-full">
        <div className="relative flex-1 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search masters"
            value={search}
            placeholder="Search masters..."
            className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
            ⌘ K
          </span>
        </div>
        <Select defaultValue="all">
          <SelectTrigger
            aria-label="Branch"
            className="h-10 w-[160px] rounded-md text-sm font-bold shadow-none bg-white"
          >
            <SelectValue />
          </SelectTrigger>
  
        </Select>
      </div>
    </DashboardHeader>
  );
}
