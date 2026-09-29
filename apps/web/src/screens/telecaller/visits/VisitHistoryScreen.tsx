import { useState } from "react";
import { ChevronRight, Search, CalendarDays } from "lucide-react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";

import { DashboardSidebar } from "../../admin/dashboard/DashboardSidebar";
import { DashboardHeader } from "../../admin/dashboard/DashboardHeader";
import { telecallerSidebarItems } from "../dashboard/telecallerDashboardData";
import { SiteVisitsWorkspace } from "../../admin/leads/site-visits/SiteVisitsScreen";

export function VisitHistoryScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={telecallerSidebarItems}
        activeItem="Site Visits"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="min-w-0 flex-1">
        <DashboardHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span>Dashboard</span>
              <ChevronRight className="size-3.5" />
              <span>Site Visits</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Visit History</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search site visits"
                value={search}
                placeholder="Search by lead, project, executive, mobile number..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
            <Select defaultValue="week">
              <SelectTrigger
                aria-label="Date range"
                className="h-10 w-[200px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <CalendarDays className="h-4 w-4 text-info mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">May 20 - May 26, 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DashboardHeader>
        <main className="space-y-5 p-4 sm:p-6">
          <SiteVisitsWorkspace
            fieldExecutiveRoute={false}
            search={search}
            onSearchChange={setSearch}
          />
        </main>
      </div>
    </div>
  );
}
