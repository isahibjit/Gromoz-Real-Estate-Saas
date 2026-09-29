import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Mail,
  Menu,
  Search,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

export interface BreadcrumbItem {
  label: string;
  isLast?: boolean;
}

interface TopHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  onMobileMenuOpen: () => void;
  onDesktopSidebarToggle: () => void;
  breadcrumbs: BreadcrumbItem[];
}

export function TopHeader({
  search,
  onSearchChange,
  onMobileMenuOpen,
  onDesktopSidebarToggle,
  breadcrumbs,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={onMobileMenuOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex text-secondary"
            aria-label="Toggle sidebar"
            onClick={onDesktopSidebarToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden items-center gap-2 text-sm font-bold text-muted-foreground md:flex">
            {breadcrumbs.map((item, index) => (
              <span key={index} className="flex items-center gap-2">
                <span className={item.isLast ? "text-blue-600" : ""}>
                  {item.label}
                </span>
                {!item.isLast && <ChevronRight className="h-4 w-4" />}
              </span>
            ))}
          </div>
        </div>
        <div className="grid flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search leads"
              value={search}
              placeholder="Search leads by name, mobile, email or Lead ID..."
              className="h-11 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
              onChange={(event) => onSearchChange(event.target.value)}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
              ⌘ K
            </span>
          </div>
          <Select defaultValue="date">
            <SelectTrigger
              aria-label="Date range"
              className="h-11 rounded-md text-sm font-bold shadow-none"
            >
              <CalendarDays className="h-4 w-4 text-blue-500" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">May 20 - May 26, 2025</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative rounded-md border border-slate-200 bg-white"
            >
              <Bell className="h-4 w-4 text-secondary" />
              <span className="absolute -right-2 -top-1 flex h-5 w-5 translate-x-0.5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-extrabold text-white leading-none shadow-sm ring-2 ring-white">
                12
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative rounded-md border border-slate-200 bg-white"
            >
              <Mail className="h-4 w-4 text-green-500" />
              <span className="absolute -right-2 -top-1 flex h-5 w-5 translate-x-0.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white leading-none shadow-sm ring-2 ring-white">
                5
              </span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-auto rounded-md border border-slate-200 px-2 py-1.5 hover:bg-slate-50"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>AK</AvatarFallback>
              </Avatar>
              <span className="hidden text-left md:block">
                <span className="block text-sm font-extrabold text-secondary">
                  Amit Kumar
                </span>
                <span className="block text-xs font-semibold text-muted-foreground">
                  Marketing Manager
                </span>
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
