import { cn } from "ui";
import { type MasterCategory } from "../leadMastersData";

interface MasterCategoryPanelProps {
  categories: MasterCategory[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
}

export function MasterCategoryPanel({
  categories,
  activeCategoryId,
  onSelectCategory,
}: MasterCategoryPanelProps) {
  return (
    <div className="shrink-0 rounded-xl border border-slate-200 bg-white py-2 shadow-card lg:w-[260px] xl:w-[280px]">
      <div className="px-4 py-3">
        <h3 className="text-sm font-extrabold text-secondary">
          Master Categories
        </h3>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          const Icon = category.icon;

          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-bold transition-colors",
                isActive
                  ? "bg-indigo-50/80 text-blue-700 before:absolute before:left-2 before:h-6 before:w-[3px] before:rounded-r-full before:bg-blue-600 relative"
                  : "text-secondary hover:bg-slate-50",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  isActive
                    ? "text-blue-600"
                    : "text-muted-foreground group-hover:text-secondary",
                )}
              />
              <span className="flex-1 truncate">{category.name}</span>
              <span
                className={cn(
                  "ml-auto inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                  isActive
                    ? "bg-white text-blue-700 shadow-sm"
                    : "bg-slate-100 text-muted-foreground",
                )}
              >
                {category.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
