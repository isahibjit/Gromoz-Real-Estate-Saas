import { displayReference } from "../../../../common/displayReference";
import { useMemo, useState, type ReactNode, type ChangeEvent } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  LifeBuoy,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "ui";

import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { assignLeadsSidebarItems } from "../assignment/leadAssignmentData";
import {
  StatsRow as SharedStatsRow,
  type LeadStatsRowItem,
} from "../components/StatsRow";
import {
  duplicateGroups,
  duplicateReportSegments,
  duplicateSources,
  duplicateStats,
  duplicateTabs,
  duplicateTips,
  mergeIcon,
} from "./duplicateLeadsData";
import type { DuplicateGroup } from "./duplicateLeadsTypes";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function SidebarFooter() {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600">
            <LifeBuoy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-extrabold">Need Help?</p>
            <p className="text-xs font-semibold text-white/75">
              Contact Support
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-md border border-white/15 bg-white/6 p-4 text-white">
        <p className="text-sm font-extrabold">Trueroot Realty CRM</p>
        <p className="mt-1 text-sm font-bold text-[#ffc78f]">Premium Plan</p>
        <p className="mt-3 text-xs font-semibold text-white/75">
          Valid till 31 Dec 2025
        </p>
        <Button
          type="button"
          className="mt-4 h-10 w-full rounded-md bg-primary text-sm font-bold text-white hover:bg-primary/90"
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}



function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function ScoreRing({ group }: { group: DuplicateGroup }) {
  return (
    <div className="grid justify-items-center gap-2">
      <div
        className={cn(
          "grid h-20 w-20 place-items-center rounded-full border-[7px]",
          group.tone,
        )}
      >
        <span className="text-xl font-extrabold text-secondary">
          {group.score}%
        </span>
      </div>
      <span
        className={cn(
          "text-xs font-extrabold",
          group.scoreLabel === "Low Match"
            ? "text-blue-700"
            : group.scoreLabel === "High Match"
            ? "text-success"
            : "text-primary",
        )}
      >
        {group.scoreLabel}
      </span>
    </div>
  );
}

function LeadInfo({ lead }: { lead: DuplicateGroup["existing"] }) {
  return (
    <div className="grid grid-cols-[42px_minmax(0,1fr)] gap-3">
      <Avatar className="h-10 w-10">
        <AvatarImage src={lead.avatarUrl} alt={lead.name} />
        <AvatarFallback>{initials(lead.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-extrabold text-secondary">
          {lead.name}
        </p>
        <p className="text-xs font-extrabold text-blue-700">{displayReference(lead.id, "Lead")}</p>
        <p className="truncate text-xs font-semibold text-secondary">
          {lead.mobile}
        </p>
        <p className="truncate text-xs font-semibold text-muted-foreground">
          {lead.email}
        </p>
        <p className="text-xs font-semibold text-muted-foreground">
          Added on: {lead.addedOn}
        </p>
      </div>
    </div>
  );
}

function getDuplicateTabLabel(tab: string) {
  return tab.replace(/\s*\(\d+\)$/, "");
}

function DuplicateTable({
  activeTab,
  groups,
  onTabChange,
}: {
  activeTab: string;
  groups: DuplicateGroup[];
  onTabChange: (tab: string) => void;
}) {
  const MergeIcon = mergeIcon;
  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap gap-x-6 gap-y-2">
          {duplicateTabs.map((tab) => {
            const selected = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                aria-pressed={selected}
                className={cn(
                  "whitespace-nowrap border-b-2 pb-2 text-sm font-extrabold transition-colors",
                  selected
                    ? "border-primary text-primary"
                    : "border-transparent text-secondary hover:text-primary",
                )}
                onClick={() => onTabChange(tab)}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Select defaultValue="all">
            <SelectTrigger className="h-10 w-32 rounded-md text-xs font-bold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              aria-label="Search duplicates"
              placeholder="Search duplicates..."
              className="h-10 w-52 rounded-md border border-slate-200 pl-9 pr-3 text-xs font-semibold outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {[
                "Duplicate Group",
                "Matching Criteria",
                "Match Score",
                "Lead Details (Existing)",
                "Lead Details (Duplicate)",
                "Actions",
              ].map((head) => (
                <TableHead
                  key={head}
                  className="h-11 whitespace-nowrap px-4 text-xs font-extrabold text-secondary"
                >
                  {head}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="min-w-[220px] px-4 py-4">
                  <div className="flex gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500">
                      <UsersIcon />
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-secondary">
                        Group ID: #{displayReference(group.id, "Duplicate group")}
                      </p>
                      <p className="mt-3 text-xs font-semibold text-muted-foreground">
                        Detected on: {group.detectedOn}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        Source: {group.source}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="min-w-[250px] px-4 py-4">
                  <div className="space-y-2">
                    {group.criteria.map((criterion) => (
                      <div
                        key={criterion.label}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="text-xs font-semibold text-secondary">
                          {criterion.label}: {criterion.value}
                        </span>
                        <Badge
                          className={cn(
                            "border-0 text-[10px] font-extrabold",
                            criterion.match === "Exact Match"
                              ? "bg-green-50 text-success"
                              : "bg-orange-50 text-primary",
                          )}
                        >
                          {criterion.match}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4">
                  <ScoreRing group={group} />
                </TableCell>
                <TableCell className="min-w-[240px] px-4 py-4">
                  <LeadInfo lead={group.existing} />
                </TableCell>
                <TableCell className="min-w-[240px] px-4 py-4">
                  <LeadInfo lead={group.duplicate} />
                </TableCell>
                <TableCell className="min-w-[130px] px-4 py-4">
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 w-full rounded-md text-xs font-extrabold text-blue-700 shadow-none"
                    >
                      <MergeIcon className="h-4 w-4" />
                      Merge
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-full rounded-md text-xs font-extrabold text-secondary"
                    >
                      Keep Separate
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-full rounded-md text-xs font-extrabold text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {groups.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground"
                >
                  No duplicate groups found for{" "}
                  {getDuplicateTabLabel(activeTab)}.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          Showing {groups.length ? `1 to ${groups.length}` : "0"} of{" "}
          {groups.length} duplicate groups
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {["1", "2", "3", "4", "5"].map((page) => (
            <Button
              key={page}
              type="button"
              variant={page === "1" ? "navy" : "outline"}
              className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
            >
              {page}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
          >
            ...
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
          >
            20
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select defaultValue="5">
          <SelectTrigger className="h-8 w-[110px] rounded-md text-xs font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">Rows 5</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}

function UsersIcon() {
  return <span className="text-lg font-extrabold">2</span>;
}

function DonutReport() {
  return (
    <Panel title="Duplicate View Report">
      <div className="flex items-center gap-5">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-[conic-gradient(#ef4444_0_33%,#f97316_33%_79%,#2563eb_79%_100%)]">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center">
            <span className="text-2xl font-extrabold text-secondary">98</span>
            <span className="-mt-3 text-[10px] font-bold text-muted-foreground">
              Total Duplicates
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-4">
          {duplicateReportSegments.map((segment) => (
            <div
              key={segment.label}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex items-center gap-2 font-semibold text-secondary">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label}
              </span>
              <span className="font-extrabold text-secondary">
                {segment.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function RightRail() {
  return (
    <aside className="space-y-5">
      <DonutReport />
      <Panel title="Recommendation">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-secondary">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold leading-6 text-secondary">
            <strong>32 high match duplicates found.</strong>
            <br />
            Merge recommended to improve data quality.
          </p>
        </div>
      </Panel>
      <Panel title="Top Duplicate Sources">
        <div className="space-y-3">
          {duplicateSources.map((source) => (
            <div
              key={source.source}
              className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0"
            >
              <span className="font-semibold text-secondary">
                {source.source}
              </span>
              <span className="font-extrabold text-secondary">
                {source.duplicates}
              </span>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 h-9 w-full rounded-md text-xs font-extrabold text-blue-700"
        >
          View All Sources <ChevronRight className="h-4 w-4" />
        </Button>
      </Panel>
      <Panel title="Tips">
        <div className="space-y-3">
          {duplicateTips.map((tip) => (
            <p
              key={tip.text}
              className="flex items-center gap-2 text-sm font-semibold text-secondary"
            >
              <CheckCircle2 className="h-4 w-4 text-success" />
              {tip.text}
            </p>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          className="mt-4 h-9 rounded-md px-1 text-xs font-extrabold text-blue-700"
        >
          View Duplicate Rules
        </Button>
      </Panel>
    </aside>
  );
}

export function DuplicateLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(duplicateTabs[0]);
  const stats = useMemo<LeadStatsRowItem[]>(
    () =>
      duplicateStats.map((stat) => ({
        label: stat.label,
        value: String(stat.value),
        change: "",
        helper: stat.helper ?? "",
        icon: stat.icon,
        tone: stat.tone,
      })),
    [],
  );

  const filteredDuplicateGroups = duplicateGroups.filter((group) => {
    const tabLabel = getDuplicateTabLabel(activeTab);
    if (tabLabel === "All Duplicates") {
      return true;
    }
    if (tabLabel === "Ignored" || tabLabel === "Merged") {
      return false;
    }
    return group.scoreLabel === tabLabel;
  });

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Duplicate Leads"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <DashboardHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span>Dashboard</span>
              <ChevronRight className="size-3.5" />
              <span>Lead Management</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Duplicate Leads</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads"
                value={search}
                placeholder="Search leads, customers, projects, mobile number..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>


          </div>
      </DashboardHeader>
      <WorkspacePage>
          <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-secondary">
                Duplicate Leads
              </h1>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                Duplicate detection helps you keep your database clean and
                accurate.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-5 text-xs font-extrabold shadow-none"
              >
                <Settings className="h-4 w-4" />
                Duplicate Rules
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-5 text-xs font-extrabold shadow-none"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                type="button"
                className="h-10 rounded-md bg-primary px-6 text-xs font-extrabold text-white hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" />
                Scan for Duplicates
              </Button>
            </div>
          </section>
          <SharedStatsRow stats={stats} />
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <DuplicateTable
              activeTab={activeTab}
              groups={filteredDuplicateGroups}
              onTabChange={setActiveTab}
            />
            <RightRail />
          </section>
      </WorkspacePage>
    </>
  );
}
