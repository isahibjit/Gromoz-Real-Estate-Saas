import {
  ArrowRight,
  Bot,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BellRing,
  CircleHelp,
  Filter,
  Info,
  LifeBuoy,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
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
  Textarea,
  cn,
} from "ui";

import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import type { LeadRow } from "../all/allLeadsTypes";
import { useAllLeads } from "../all/useAllLeads";
import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import { reasonOptions } from "../reassign/reassignLeadsData";
import {
  aiInsights,
  assignees,
  assignLeadsSidebarItems,
  assignmentOptions,
  assignmentStats,
  assignmentTabs,
  distributionRecommendations,
  distributionRules,
  distributionSettingsSnapshot,
  distributionStrategyUsage,
  leadAssignmentFunnel,
  realTimeDistributionActivity,
  recentAssignments,
  recommendationChecklist,
} from "./leadAssignmentData";
import type {
  AssigneeOption,
  AssigneeType,
  AssignmentMode,
  AssignmentTab,
  DistributionStrategy,
  LeadSource,
} from "./leadAssignmentTypes";
import { useAssigneesQuery, useAssignLeadsMutation } from "./useLeadAssignment";

const dateOptions = [{ id: "2025-05-20", label: "May 20, 2025" }];

const sourceClass: Record<LeadSource, string> = {
  MagicBricks: "bg-red-50 text-red-600",
  "99Acres": "bg-blue-50 text-blue-700",
  "Google Ads": "bg-green-50 text-green-700",
  Referral: "bg-violet-50 text-violet-700",
  "Walk-In": "bg-orange-50 text-primary",
  "Meta Ads": "bg-sky-50 text-blue-600",
  Justdial: "bg-amber-50 text-amber-700",
};

const assigneeTypeLabel: Record<AssigneeType, string> = {
  telecaller: "Pre Sales Executive",
  "field-executive": "Sales Executive",
  admin: "Admin",
  manager: "Manager",
};

type SearchableAvatarOption = {
  id: string;
  label: string;
  helper?: string;
  avatarUrl?: string;
};

type SearchableTextOption = {
  id: string;
  label: string;
  helper?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PersonAvatar({
  name,
  image,
  className = "size-8",
  fallbackClassName,
}: {
  name: string;
  image?: string;
  className?: string;
  fallbackClassName?: string;
}) {
  return (
    <Avatar
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100",
        className,
      )}
    >
      {image ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 block rounded-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url("${image}")` }}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          image
            ? "opacity-0"
            : "bg-slate-100 text-[10px] font-extrabold text-secondary",
          fallbackClassName,
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

function SectionHeader({
  step,
  title,
  badge,
  children,
}: {
  step: number;
  title: string;
  badge?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-secondary text-sm font-extrabold text-white px-2 py-1">
          {step}
        </span>
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {badge ? (
          <Badge className="border-0 bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-600">
            {badge}
          </Badge>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function LeadSourceBadge({ source }: { source: LeadSource }) {
  return (
    <Badge
      className={cn(
        "border-0 px-2 py-1 text-[11px] font-extrabold",
        sourceClass[source],
      )}
    >
      {source}
    </Badge>
  );
}

function ScoreToken({
  value,
  tone = "success",
}: {
  value: string | number;
  tone?: "success" | "info" | "warning";
}) {
  const toneClass = {
    success: "border-success/70 bg-green-50 text-success",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    warning: "border-orange-200 bg-orange-50 text-primary",
  };

  return (
    <span
      className={cn(
        "inline-flex min-w-10 items-center justify-center rounded-full border px-2.5 py-1 text-xs font-extrabold",
        toneClass[tone],
      )}
    >
      {value}
    </span>
  );
}

function Pagination({
  totalLabel,
  pages,
}: {
  totalLabel: string;
  pages: string[];
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold text-secondary">{totalLabel}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 rounded-md shadow-none "
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((page) => (
          <Button
            key={page}
            type="button"
            variant={page === "1" ? "navy" : "outline"}
            className="size-8 rounded-md px-2 py-1 text-xs shadow-none"
          >
            {page}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          className="size-8 rounded-md px-2 py-1 text-xs shadow-none"
        >
          ...
        </Button>
        <Button
          type="button"
          variant="outline"
          className="size-8 rounded-md px-2 py-1 text-xs shadow-none"
        >
          23
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 rounded-md shadow-none"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function SelectLeadsCard({
  leads,
  selectedLeadIds,
  onToggleLead,
  onToggleAll,
}: {
  leads: LeadRow[];
  selectedLeadIds: string[];
  onToggleLead: (leadId: string) => void;
  onToggleAll: () => void;
}) {
  const allSelected =
    leads.length > 0 &&
    leads.every((lead) => selectedLeadIds.includes(lead.id));
  return (
    <Card className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <SectionHeader
        step={1}
        title="Select Leads"
        badge={`${leads.length} Unassigned Leads`}
      />
      <div className="flex gap-3 px-4 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search leads"
            placeholder="Search leads..."
            className="h-10 rounded-md pl-9 text-sm font-semibold"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md px-3 text-xs shadow-none"
        >
          <Filter className="size-4" />
          Filter
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4">
                <Checkbox
                  aria-label="Select all leads"
                  checked={allSelected}
                  onChange={onToggleAll}
                />
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Lead Name
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Mobile Number
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Source
              </TableHead>
              <TableHead className="whitespace-nowrap text-right text-xs font-extrabold text-secondary">
                Priority Weight
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="px-4 py-2.5">
                  <Checkbox
                    aria-label={`Select ${lead.name}`}
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={() => onToggleLead(lead.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap py-2.5">
                  <div className="flex items-center gap-2">
                    <PersonAvatar name={lead.name} className="size-12" />
                    <span className="text-xs font-extrabold text-secondary">
                      {lead.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs font-semibold text-secondary">
                  {lead.mobile}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <LeadSourceBadge source={lead.source as LeadSource} />
                </TableCell>
                <TableCell className="text-right">
                  <ScoreToken value={lead.priority} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-auto">
        <Pagination
          totalLabel={`Showing ${leads.length} leads`}
          pages={["1"]}
        />
      </div>
    </Card>
  );
}

function AssignToCard({
  assignees,
  assigneeType,
  selectedAssigneeId,
  onAssigneeTypeChange,
  onAssigneeChange,
}: {
  assignees: AssigneeOption[];
  assigneeType: AssigneeType;
  selectedAssigneeId: string;
  onAssigneeTypeChange: (value: AssigneeType) => void;
  onAssigneeChange: (value: string) => void;
}) {
  const visibleAssignees = assignees.filter(
    (assignee) => assignee.type === assigneeType,
  );
  return (
    <Card className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <SectionHeader step={2} title="Assign To">
        <div className="inline-grid rounded-md border border-slate-200 bg-slate-50 p-0.5 sm:grid-cols-2">
          {(["telecaller", "field-executive"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              className={cn(
                "h-8 rounded-md px-3 text-xs font-extrabold hover:bg-white",
                assigneeType === type &&
                  "border border-primary/30 bg-white text-primary hover:bg-white",
              )}
              onClick={() => onAssigneeTypeChange(type)}
            >
              {assigneeTypeLabel[type]}
            </Button>
          ))}
        </div>
      </SectionHeader>
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search assignees"
            placeholder={`Search ${assigneeTypeLabel[
              assigneeType
            ].toLowerCase()}s...`}
            className="h-10 rounded-md pl-9 text-sm font-semibold"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4" />
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                {assigneeTypeLabel[assigneeType]} Name
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Current Load
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Capacity
              </TableHead>
              <TableHead className="whitespace-nowrap text-right text-xs font-extrabold text-secondary">
                Performance
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAssignees.map((assignee) => (
              <TableRow key={assignee.id}>
                <TableCell className="px-4 py-2.5">
                  <input
                    aria-label={`Assign to ${assignee.name}`}
                    type="radio"
                    name="assignee"
                    checked={selectedAssigneeId === assignee.id}
                    className="size-4 accent-secondary"
                    onChange={() => onAssigneeChange(assignee.id)}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap py-2.5">
                  <div className="flex items-center gap-3">
                    <PersonAvatar
                      name={assignee.name}
                      image={assignee.avatarUrl}
                      className="12"
                    />
                    <span className="text-xs font-extrabold text-secondary">
                      {assignee.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-semibold text-secondary">
                  {assignee.currentLoad}
                </TableCell>
                <TableCell className="text-xs font-semibold text-secondary">
                  {assignee.capacity}
                </TableCell>
                <TableCell className="text-right">
                  <ScoreToken value={`${assignee.performance}%`} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-auto">
        <Pagination
          totalLabel={`Showing 1 to ${visibleAssignees.length} of ${
            assigneeType === "telecaller" ? 24 : visibleAssignees.length
          } ${assigneeTypeLabel[assigneeType].toLowerCase()}s`}
          pages={["1", "2", "3", "4"]}
        />
      </div>
    </Card>
  );
}

function AssignmentOptionsCard({
  value,
  onChange,
}: {
  value: AssignmentMode;
  onChange: (value: AssignmentMode) => void;
}) {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary">
        Assignment Options
      </h3>
      <div className="mt-4 space-y-3">
        {assignmentOptions.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-3"
          >
            <input
              type="radio"
              name="assignment-option"
              checked={value === option.id}
              className="mt-1 size-4 accent-secondary"
              onChange={() => onChange(option.id)}
            />
            <span className="min-w-0">
              <span className="inline-flex items-center gap-2 text-xs font-extrabold text-secondary">
                {option.title}
                {option.recommended ? (
                  <Badge className="border-0 bg-green-50 text-[10px] text-success">
                    Recommended
                  </Badge>
                ) : null}
              </span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}

function AssignmentSummaryCard({
  selectedCount,
  selectedAssignee,
  assignmentMode,
}: {
  selectedCount: number;
  selectedAssignee?: AssigneeOption;
  assignmentMode: AssignmentMode;
}) {
  const expectedLoad = selectedAssignee
    ? `${selectedAssignee.currentLoad + selectedCount} / ${
        selectedAssignee.capacity
      } Leads`
    : "Not selected";
  const assignmentType =
    assignmentOptions.find((option) => option.id === assignmentMode)?.title ??
    "Manual Assignment";
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-secondary">
            Assignment Summary
          </h3>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Live preview of the selected handoff outcome
          </p>
        </div>
        <Badge className="border-0 bg-slate-100 text-secondary">
          {selectedCount} Selected
        </Badge>
      </div>
      <div className="mt-4 space-y-3 text-xs">
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-muted-foreground">
              Selected Leads
            </span>
            <span className="font-extrabold text-secondary">
              {selectedCount} Leads
            </span>
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-muted-foreground">
              Assign To
            </span>
            <span className="max-w-[180px] text-right font-extrabold text-secondary">
              {selectedAssignee
                ? `${selectedAssignee.name} (${
                    assigneeTypeLabel[selectedAssignee.type]
                  })`
                : "Not selected"}
            </span>
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-muted-foreground">
              Assignment Type
            </span>
            <span className="font-extrabold text-secondary">
              {assignmentType}
            </span>
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-muted-foreground">
              Expected Capacity After
            </span>
            <span className="text-right font-extrabold text-secondary">
              {expectedLoad}
            </span>
          </div>
        </div>
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="flex justify-between gap-4">
            <span className="font-semibold text-muted-foreground">
              Estimated Completion Time
            </span>
            <span className="text-right font-extrabold text-secondary">
              20 May 2025, 04:00 PM
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function AssignmentRecommendationCard({
  assignees,
  selectedAssignee,
}: {
  assignees: AssigneeOption[];
  selectedAssignee?: AssigneeOption;
}) {
  const assignee = selectedAssignee ?? assignees[0];

  if (!assignee) return null;
  return (
    <Card className="overflow-hidden rounded-md border border-emerald-200 bg-[linear-gradient(180deg,rgba(240,253,244,0.95),rgba(255,255,255,1))] p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-extrabold text-emerald-900">
            Recommendation
          </h3>
          <p className="mt-1 text-xs font-semibold text-emerald-800/80">
            Best-fit assignee based on capacity, performance, and active load.
          </p>
        </div>
        <Badge className="border-0 bg-green-100 text-xs font-extrabold text-success">
          Best Match
        </Badge>
      </div>
      <div className="mt-5 rounded-md border border-emerald-100 bg-white/90 p-4">
        <div className="flex items-center gap-3">
          <PersonAvatar
            name={assignee.name}
            image={assignee.avatarUrl}
            className="size-12"
            fallbackClassName="text-xs"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-secondary">
              {assignee.name}
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {assigneeTypeLabel[assignee.type]} • {assignee.currentLoad}/
              {assignee.capacity} active leads
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-success">92%</p>
            <p className="text-[11px] font-bold text-muted-foreground">
              Capacity fit
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-bold text-muted-foreground">
              Performance
            </p>
            <p className="mt-1 text-sm font-extrabold text-secondary">
              {assignee.performance}%
            </p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-bold text-muted-foreground">
              Current Load
            </p>
            <p className="mt-1 text-sm font-extrabold text-secondary">
              {assignee.currentLoad} leads
            </p>
          </div>
          <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
            <p className="text-[11px] font-bold text-muted-foreground">
              Capacity Left
            </p>
            <p className="mt-1 text-sm font-extrabold text-secondary">
              {Math.max(assignee.capacity - assignee.currentLoad, 0)} leads
            </p>
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {recommendationChecklist.map((item) => (
          <div
            key={item}
            className="flex items-start gap-2 text-xs font-semibold leading-5 text-secondary"
          >
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-5 h-10 w-full rounded-md bg-white text-xs font-extrabold shadow-none"
      >
        View Analysis
      </Button>
    </Card>
  );
}

function ReassignmentBenefitCard({
  title,
  helper,
  icon: Icon,
}: {
  title: string;
  helper: string;
  icon: typeof ShieldCheck;
}) {
  return (
    <Card className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card">
      <div className="flex items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm font-extrabold text-secondary">{title}</p>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

function WorkloadDistributionCard({
  assignees,
}: {
  assignees: AssigneeOption[];
}) {
  const segments = [
    {
      label: "Low (0-10)",
      users: assignees.filter((a) => a.currentLoad <= 10).length,
      color: "#16a34a",
    },
    {
      label: "Medium (11-20)",
      users: assignees.filter((a) => a.currentLoad > 10 && a.currentLoad <= 20)
        .length,
      color: "#f97316",
    },
    {
      label: "High (21-30)",
      users: assignees.filter((a) => a.currentLoad > 20 && a.currentLoad <= 30)
        .length,
      color: "#2563eb",
    },
    {
      label: "Overload (31+)",
      users: assignees.filter((a) => a.currentLoad > 30).length,
      color: "#e11d48",
    },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.users, 0) || 1;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary">
        Workload Distribution
      </h3>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-36 w-36 shrink-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90 overflow-visible"
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#eef2f7"
              strokeWidth="18"
            />
            {segments.map((segment) => {
              const dash = (segment.users / total) * circumference;
              const circle = (
                <circle
                  key={segment.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeLinecap="butt"
                  strokeWidth="18"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-extrabold text-secondary">{total}</p>
              <p className="text-xs font-bold text-muted-foreground">
                Total Users
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <span className="flex items-center gap-2 font-semibold text-secondary">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label}
              </span>
              <span className="font-extrabold text-secondary">
                {segment.users} Users
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function AssignmentInsightsCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary">
        Assignment Insights
      </h3>
      <div className="mt-4 divide-y divide-slate-100">
        {aiInsights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div
              key={insight.title}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full",
                  insight.tone,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-secondary">
                  {insight.title}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {insight.helper}
                </p>
              </div>
              <span className="text-sm font-extrabold text-secondary">
                {insight.value}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RecentAssignmentsCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-secondary">
          Recent Assignments
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-xs font-bold text-primary"
        >
          View All
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {recentAssignments.map((item) => (
          <div
            key={`${item.time}-${item.leadName}`}
            className="grid grid-cols-[64px_20px_minmax(0,1fr)] items-center gap-3 text-xs"
          >
            <span className="font-semibold text-muted-foreground">
              {item.time}
            </span>
            <Check className="size-4 rounded-full bg-success p-0.5 text-white" />
            <span className="min-w-0">
              <span className="font-extrabold text-secondary">
                {item.leadName}
              </span>
              <span className="ml-2 text-muted-foreground">
                Assigned to {item.assigneeName}
              </span>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ProTipCard() {
  return (
    <Card className="rounded-md border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-card">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-white text-primary">
          <CircleHelp className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-secondary">Pro Tip</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-secondary">
            Use the recommended distribution flow for better lead balancing and
            higher conversion rates.
          </p>
        </div>
        <Bot className="size-10 shrink-0 text-info" />
      </div>
    </Card>
  );
}

function DistributionRulesCard({
  selectedStrategy,
  onSelectStrategy,
}: {
  selectedStrategy: DistributionStrategy;
  onSelectStrategy: (strategy: DistributionStrategy) => void;
}) {
  const selectedRule = distributionRules.find(
    (rule) => rule.id === selectedStrategy,
  );
  return (
    <Card className="overflow-visible rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-extrabold text-secondary">
          Distribution Rules (Active)
        </h3>
        <Badge className="border-0 bg-green-50 text-success">
          {selectedRule?.title ?? "Round Robin"}
        </Badge>
      </div>
      <div className="divide-y divide-slate-100">
        {distributionRules.map((rule) => {
          const Icon = rule.icon;
          const selected = selectedStrategy === rule.id;
          return (
            <Button
              key={rule.id}
              type="button"
              variant="ghost"
              className={cn(
                "h-auto w-full justify-start rounded-md px-2 py-3 text-left hover:bg-slate-50",
                selected && "bg-blue-50 hover:bg-blue-50",
              )}
              onClick={() => onSelectStrategy(rule.id)}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md",
                  rule.tone,
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-secondary">
                  {rule.title}
                </span>
                <span className="mt-1 block text-xs font-semibold text-muted-foreground">
                  {rule.description}
                </span>
              </span>
              <Badge className="border-0 bg-green-50 text-[10px] text-success">
                {rule.status}
              </Badge>
            </Button>
          );
        })}
      </div>
    </Card>
  );
}

function SearchableAvatarSelect({
  ariaLabel,
  value,
  placeholder,
  options,
  emptyMessage,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  placeholder: string;
  options: SearchableAvatarOption[];
  emptyMessage: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedQuery) {
      return true;
    }
    return [option.label, option.helper].some(
      (field) => field?.toLowerCase().includes(normalizedQuery),
    );
  });

  return (
    <div className="relative">
      {selectedOption && !open ? (
        <PersonAvatar
          name={selectedOption.label}
          image={selectedOption.avatarUrl}
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2"
          fallbackClassName="text-[9px]"
        />
      ) : (
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      )}
      <Input
        aria-label={ariaLabel}
        value={open ? query : selectedOption?.label ?? ""}
        placeholder={selectedOption ? "" : placeholder}
        className={cn(
          "h-11 rounded-md pr-10 text-sm font-semibold shadow-none",
          selectedOption && !open ? "pl-11" : "pl-9",
        )}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-card">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-50",
                  option.id === value && "bg-blue-50",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <PersonAvatar
                  name={option.label}
                  image={option.avatarUrl}
                  className="h-8 w-8"
                  fallbackClassName="text-[10px]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-secondary">
                    {option.label}
                  </span>
                  {option.helper ? (
                    <span className="block truncate text-xs font-semibold text-muted-foreground">
                      {option.helper}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchableTextSelect({
  ariaLabel,
  value,
  placeholder,
  options,
  emptyMessage,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  placeholder: string;
  options: SearchableTextOption[];
  emptyMessage: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = options.filter((option) => {
    if (!normalizedQuery) {
      return true;
    }
    return [option.label, option.helper].some(
      (field) => field?.toLowerCase().includes(normalizedQuery),
    );
  });

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        aria-label={ariaLabel}
        value={open ? query : selectedOption?.label ?? ""}
        placeholder={selectedOption ? "" : placeholder}
        className="h-11 rounded-md pl-9 pr-10 text-sm font-semibold shadow-none"
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-card">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left hover:bg-slate-50",
                  option.id === value && "bg-blue-50",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span className="mt-1 inline-flex size-2 shrink-0 rounded-full bg-blue-600" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-secondary">
                    {option.label}
                  </span>
                  {option.helper ? (
                    <span className="block truncate text-xs font-semibold text-muted-foreground">
                      {option.helper}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs font-semibold text-muted-foreground">
              {emptyMessage}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SearchableLeadPicker({
  leads,
  selectedLeadIds,
  onSelectedLeadIdsChange,
}: {
  leads: LeadRow[];
  selectedLeadIds: string[];
  onSelectedLeadIdsChange: (value: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const buildLeadMeta = (lead: LeadRow) =>
    [lead.id, lead.mobile, lead.propertyType].filter(Boolean).join(" • ");
  const selectedLeads = leads.filter((lead) =>
    selectedLeadIds.includes(lead.id),
  );
  const filteredLeads = leads.filter((lead) => {
    const normalizedQuery = query.trim().toLowerCase();
    return (
      !normalizedQuery ||
      lead.name.toLowerCase().includes(normalizedQuery) ||
      lead.id.toLowerCase().includes(normalizedQuery) ||
      (lead.backendId?.toLowerCase().includes(normalizedQuery) ?? false) ||
      lead.mobile.toLowerCase().includes(normalizedQuery) ||
      lead.propertyType.toLowerCase().includes(normalizedQuery) ||
      lead.stage.toLowerCase().includes(normalizedQuery)
    );
  });

  const toggleLead = (leadId: string) => {
    onSelectedLeadIdsChange(
      selectedLeadIds.includes(leadId)
        ? selectedLeadIds.filter((id) => id !== leadId)
        : [...selectedLeadIds, leadId],
    );
    setQuery("");
  };

  return (
    <div className="space-y-2">
      <span className="text-xs font-extrabold text-secondary">
        Select Leads <span className="text-red-500">*</span>
      </span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search and select reassignment leads"
          value={query}
          placeholder={
            selectedLeads.length > 0
              ? "Search more leads..."
              : "Search leads by name, lead ID, phone, project..."
          }
          className="h-11 rounded-md pl-9 pr-9 text-sm font-bold text-secondary shadow-none"
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        {open ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-card">
            {filteredLeads.length > 0 ? (
              filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left hover:bg-slate-50",
                    selectedLeadIds.includes(lead.id) && "bg-blue-50",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => toggleLead(lead.id)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <PersonAvatar name={lead.name} className="size-8" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-extrabold text-secondary">
                        {lead.name}
                      </span>
                      <span className="block truncate text-xs font-semibold text-muted-foreground">
                        {buildLeadMeta(lead)}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Badge className="border-0 bg-blue-50 text-blue-700">
                      {lead.stage}
                    </Badge>
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded border border-slate-200",
                        selectedLeadIds.includes(lead.id) &&
                          "border-blue-600 bg-blue-600 text-white",
                      )}
                    >
                      {selectedLeadIds.includes(lead.id) ? (
                        <Check className="h-3 w-3" />
                      ) : null}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="py-2 text-xs font-semibold text-muted-foreground">
                No leads found
              </p>
            )}
          </div>
        ) : null}
      </div>
      {selectedLeads.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-md border border-slate-100 bg-slate-50 p-2">
          {selectedLeads.map((lead) => (
            <span
              key={lead.id}
              className="inline-flex max-w-full items-center gap-2 rounded-md bg-white px-2.5 py-1.5 text-xs font-extrabold text-secondary shadow-sm"
            >
              <PersonAvatar
                name={lead.name}
                className="size-5"
                fallbackClassName="text-[9px]"
              />
              <span className="truncate">{lead.name}</span>
              <span className="text-muted-foreground">•</span>
              <span className="truncate text-muted-foreground">{lead.id}</span>
              <button
                type="button"
                aria-label={`Remove ${lead.name}`}
                className="rounded text-muted-foreground hover:text-red-500"
                onClick={() => toggleLead(lead.id)}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex justify-between rounded-md bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700">
        <span>{selectedLeads.length} Leads Selected</span>
        <span>Preview Leads</span>
      </div>
    </div>
  );
}

function ReassignForm({
  leads,
  assignees,
  assigneeType,
  onAssigneeTypeChange,
  selectedLeadIds,
  onSelectedLeadIdsChange,
  newOwnerId,
  onNewOwnerChange,
  reasonId,
  onReasonChange,
  notes,
  onNotesChange,
  canSubmit,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  leads: LeadRow[];
  assignees: AssigneeOption[];
  assigneeType: AssigneeType;
  onAssigneeTypeChange: (value: AssigneeType) => void;
  selectedLeadIds: string[];
  onSelectedLeadIdsChange: (value: string[]) => void;
  newOwnerId: string;
  onNewOwnerChange: (value: string) => void;
  reasonId: string;
  onReasonChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  canSubmit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const selectedLeads = leads.filter((lead) =>
    selectedLeadIds.includes(lead.id),
  );
  const currentOwners = Array.from(
    new Set(
      selectedLeads
        .map((lead) => lead.assignedTo)
        .filter((value) => value && value !== "Unassigned"),
    ),
  );
  const ownerHelper =
    currentOwners.length > 1
      ? currentOwners.join(", ")
      : selectedLeads[0]?.assignedRole ?? "Current assignment will be replaced";
  const assigneeOptions = assignees
    .filter((option) => option.type === assigneeType)
    .map((option) => ({
      id: option.id,
      label: option.name,
      helper: `${option.currentLoad} active leads • capacity ${option.capacity}`,
      avatarUrl: option.avatarUrl,
    }));
  const reasonSelectOptions = reasonOptions.map((option) => ({
    id: option.id,
    label: option.label,
    helper: "Reassignment reason",
  }));
  const selectedReason = reasonOptions.find((reason) => reason.id === reasonId);
  const ownerHeadline =
    currentOwners.length === 0
      ? "No current owner selected"
      : currentOwners.length === 1
      ? currentOwners[0]
      : `${currentOwners.length} owners selected`;
  const notificationHelper = selectedReason
    ? `The reassigned employee will receive a notification with the lead, the new assignment, and the reason: ${selectedReason.label}.`
    : "The reassigned employee will receive a notification with the lead, the new assignment, and your reason.";

  return (
    <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-col gap-5 border-b border-slate-100 px-5 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700">
            <ArrowRight className="size-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-[2rem] font-extrabold leading-none text-secondary">
                Reassign Leads
              </h3>
              <Badge className="border-0 bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
                Admin Action
              </Badge>
            </div>
            <p className="mt-3 text-sm font-semibold text-muted-foreground">
              Move selected leads to a different Pre Sales user or sales executive
              with a clear operational reason.
            </p>
          </div>
        </div>
        <div className="inline-grid rounded-xl border border-slate-200 bg-white p-1 sm:grid-cols-2">
          {(["telecaller", "field-executive"] as const).map((type) => (
            <Button
              key={type}
              type="button"
              variant="ghost"
              className={cn(
                "h-12 rounded-lg px-6 text-sm font-extrabold hover:bg-slate-50",
                assigneeType === type &&
                  "border border-primary/30 bg-orange-50 text-primary hover:bg-orange-50",
              )}
              onClick={() => onAssigneeTypeChange(type)}
            >
              {type === "telecaller" ? "Pre Sales Executive" : "Sales Executive"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 px-5 py-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.8fr)]">
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white px-2 py-1">
                  1
                </span>
                <span className="text-xl font-extrabold text-secondary">
                  Lead Selection
                </span>
              </div>
              <span className="text-xs font-bold text-muted-foreground">
                Search, review, and pick the leads to reassign
              </span>
            </div>
            <SearchableLeadPicker
              leads={leads}
              selectedLeadIds={selectedLeadIds}
              onSelectedLeadIdsChange={onSelectedLeadIdsChange}
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white px-2 py-1">
                2
              </span>
              <span className="text-xl font-extrabold text-secondary">
                Reassign Reason
              </span>
              <span className="text-red-500">*</span>
            </div>
            <SearchableTextSelect
              ariaLabel="Search reassignment reason"
              value={reasonId}
              placeholder="Search reason"
              options={reasonSelectOptions}
              emptyMessage="No reasons found"
              onChange={onReasonChange}
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-sm font-extrabold text-white px-2 py-1">
                3
              </span>
              <span className="text-xl font-extrabold text-secondary">
                Additional Notes (Optional)
              </span>
            </div>
            <div className="relative">
              <Textarea
                aria-label="Reassignment notes"
                value={notes}
                className="min-h-[124px] rounded-md pr-14 text-sm font-semibold"
                placeholder="Add context about workload, territory, availability, or the exact reassignment reason..."
                maxLength={300}
                onChange={(event) => onNotesChange(event.target.value)}
              />
              <span className="absolute bottom-3 right-3 text-xs font-bold text-muted-foreground">
                {notes.length}/300
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-extrabold text-secondary">
              Current Owner
            </p>
            <div
              className={cn(
                "mt-5",
                currentOwners.length > 0
                  ? "flex items-center gap-4"
                  : "space-y-2",
              )}
            >
              {currentOwners.length > 0 ? (
                <Avatar className="size-10 shrink-0 border border-slate-200">
                  <AvatarFallback className="bg-slate-100 text-sm font-extrabold text-secondary">
                    {currentOwners.length === 1
                      ? initials(currentOwners[0])
                      : "CO"}
                  </AvatarFallback>
                </Avatar>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-2xl font-extrabold text-secondary">
                  {ownerHeadline}
                </p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {ownerHelper}
                </p>
                <p className="mt-2 text-sm font-extrabold text-red-500">
                  {selectedLeadIds.length} Leads
                </p>
              </div>
            </div>
          </div>

          <label className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              Reassign To <span className="text-red-500">*</span>
            </span>
            <SearchableAvatarSelect
              ariaLabel="Search new assignee"
              value={newOwnerId}
              placeholder={`Search ${
                assigneeType === "telecaller" ? "Pre Sales user" : "sales executive"
              }`}
              options={assigneeOptions}
              emptyMessage="No matching assignees available"
              onChange={onNewOwnerChange}
            />
          </label>

          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex items-start gap-3">
              <BellRing className="mt-1 size-5 shrink-0 text-blue-700" />
              <div>
                <p className="text-sm font-extrabold text-secondary">
                  Notification
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-secondary">
                  {notificationHelper}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-extrabold text-secondary">
                  Reassignment Policy
                </p>
                <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
                  Reassignment is executed directly by admin. No approval
                  workflow is required.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-blue-700">
            <Info className="h-4 w-4" />
            Reassignment is executed directly by admin. No approval workflow is
            required.
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md px-8 shadow-none"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || isSubmitting}
            className="h-11 rounded-md px-10"
            onClick={onSubmit}
          >
            {isSubmitting ? "Reassigning..." : "Reassign Leads"}
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DistributionStrategyUsageCard() {
  const total = distributionStrategyUsage.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary">
        Distribution Strategy Usage
      </h3>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-36 w-36 shrink-0">
          <svg
            aria-hidden="true"
            viewBox="0 0 120 120"
            className="h-full w-full -rotate-90 overflow-visible"
          >
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke="#eef2f7"
              strokeWidth="18"
            />
            {distributionStrategyUsage.map((item) => {
              const dash = (item.value / total) * circumference;
              const circle = (
                <circle
                  key={item.label}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="18"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-2xl font-extrabold text-secondary">1,248</p>
              <p className="text-xs font-bold text-muted-foreground">
                Total Leads
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {distributionStrategyUsage.map((item) => (
            <div
              key={item.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 text-xs"
            >
              <span className="flex items-center gap-2 font-semibold text-secondary">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </span>
              <span className="font-extrabold text-secondary">
                {item.percent} ({item.value})
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function LeadAssignmentFunnelCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary">
        Lead Assignment Funnel
      </h3>
      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(180px,1fr)_minmax(0,1fr)] sm:items-center">
        <div className="space-y-1.5">
          {leadAssignmentFunnel.map((stage) => (
            <div
              key={stage.label}
              className="mx-auto h-11 rounded-sm text-center text-xs font-extrabold leading-[44px] text-white"
              style={{ width: stage.width, backgroundColor: stage.color }}
            >
              {stage.label}
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {leadAssignmentFunnel.map((stage) => (
            <div key={`${stage.label}-value`} className="text-xs">
              <p className="font-extrabold text-secondary">{stage.label}</p>
              <p className="mt-1 font-semibold text-muted-foreground">
                {stage.value} ({stage.helper})
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function RealTimeDistributionActivityCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary">
        Real-time Distribution Activity
      </h3>
      <div className="mt-4 space-y-3">
        {realTimeDistributionActivity.map((activity) => {
          const Icon = activity.icon;
          return (
            <div
              key={activity.leadId}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3"
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-md",
                  activity.tone,
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-secondary">
                  Lead ID #{activity.leadId}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs font-semibold",
                    activity.status === "failed"
                      ? "text-red-500"
                      : "text-muted-foreground",
                  )}
                >
                  {activity.status === "failed" ? "Failed" : "Assigned"} to{" "}
                  {activity.assigneeName}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-secondary">
                {activity.time}
              </span>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-4 h-10 w-full rounded-md text-xs font-extrabold shadow-none"
      >
        View All Activity
        <ArrowRight className="size-4" />
      </Button>
    </Card>
  );
}

function ExecutiveWorkloadOverviewCard({
  assignees,
}: {
  assignees: AssigneeOption[];
}) {
  const rows = assignees.map((a) => {
    const utilization = Math.round((a.currentLoad / a.capacity) * 100) || 0;
    return {
      id: a.id,
      name: a.name,
      role: assigneeTypeLabel[a.type] || "Executive",
      activeLeads: a.currentLoad,
      capacity: a.capacity,
      utilization,
      status: utilization > 80 ? "High" : utilization < 50 ? "Low" : "Optimal",
      performanceScore: a.performance,
      avatarUrl: a.avatarUrl,
    };
  });
  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="flex items-center justify-between px-4 py-4">
        <h3 className="text-sm font-extrabold text-secondary">
          Executive Workload Overview
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-xs text-blue-700"
        >
          View All Executives
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap px-4 text-xs font-extrabold text-secondary">
                Executive
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Active Leads
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Capacity
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Utilization
              </TableHead>
              <TableHead className="whitespace-nowrap text-xs font-extrabold text-secondary">
                Status
              </TableHead>
              <TableHead className="whitespace-nowrap text-right text-xs font-extrabold text-secondary">
                Performance Score
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <PersonAvatar
                      name={row.name}
                      image={row.avatarUrl}
                      className="size-8"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-secondary">
                        {row.name}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {row.role}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-xs font-semibold text-secondary">
                  {row.activeLeads}
                </TableCell>
                <TableCell className="text-xs font-semibold text-secondary">
                  {row.capacity}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className={cn(
                          "block h-full rounded-full",
                          row.status === "High"
                            ? "bg-primary"
                            : row.status === "Low"
                            ? "bg-red-500"
                            : "bg-success",
                        )}
                        style={{ width: `${row.utilization}%` }}
                      />
                    </span>
                    <span className="text-xs font-semibold text-secondary">
                      {row.utilization}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={cn(
                      "border-0 text-[10px]",
                      row.status === "High"
                        ? "bg-orange-50 text-primary"
                        : row.status === "Low"
                        ? "bg-red-50 text-red-500"
                        : "bg-green-50 text-success",
                    )}
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex size-8 items-center justify-center rounded-full border-2 border-success text-xs font-extrabold text-success">
                    {row.performanceScore}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function DistributionSettingsSnapshotCard() {
  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <h3 className="text-sm font-extrabold text-secondary">
        Distribution Settings Snapshot
      </h3>
      <div className="mt-4 divide-y divide-slate-100">
        {distributionSettingsSnapshot.map((setting) => {
          const Icon = setting.icon;
          return (
            <div
              key={setting.label}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <span className="flex items-center gap-3 text-xs font-semibold text-secondary">
                <Icon className="size-4 text-blue-700" />
                {setting.label}
              </span>
              <span className="flex items-center gap-2 text-right text-xs font-extrabold text-secondary">
                {setting.value}
                {setting.enabled ? (
                  <span className="h-5 w-9 rounded-full bg-success p-0.5">
                    <span className="block size-4 translate-x-4 rounded-full bg-white" />
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-4 h-10 w-full rounded-md text-xs font-extrabold shadow-none"
      >
        Manage Settings
        <ArrowRight className="size-4" />
      </Button>
    </Card>
  );
}

function DistributionInsightsCard() {
  return (
    <Card className="rounded-md border border-violet-100 bg-violet-50/60 p-4 shadow-card">
      <h3 className="flex items-center gap-2 text-sm font-extrabold text-secondary">
        <Sparkles className="size-4 text-violet-600" />
        Insights & Recommendations
      </h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {distributionRecommendations.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-md border border-white/80 bg-white p-4"
            >
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-md",
                  item.tone,
                )}
              >
                <Icon className="size-4" />
              </span>
              <p className="mt-3 text-xs font-extrabold text-secondary">
                {item.title}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-secondary">
                {item.description}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 h-7 px-0 text-xs text-blue-700"
              >
                View Details <ArrowRight className="size-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DistributionEngineWorkspace({
  selectedStrategy,
  onSelectStrategy,
}: {
  selectedStrategy: DistributionStrategy;
  onSelectStrategy: (strategy: DistributionStrategy) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 2xl:grid-cols-[1fr_1fr]">
        <DistributionRulesCard
          selectedStrategy={selectedStrategy}
          onSelectStrategy={onSelectStrategy}
        />
        <DistributionStrategyUsageCard />
      </div>
      <div className="grid gap-5 2xl:grid-cols-[1fr_1fr]">
        <LeadAssignmentFunnelCard />
        <RealTimeDistributionActivityCard />
      </div>
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.8fr)]">
        <ExecutiveWorkloadOverviewCard assignees={assignees} />
        <DistributionSettingsSnapshotCard />
      </div>
      <DistributionInsightsCard />
    </div>
  );
}

export function LeadAssignmentScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<AssignmentTab>("unassigned");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedReassignLeadIds, setSelectedReassignLeadIds] = useState<
    string[]
  >([]);
  const [assigneeType, setAssigneeType] = useState<AssigneeType>("telecaller");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("aditya-patil");
  const [newOwnerId, setNewOwnerId] = useState("vikram-singh");
  const [reassignReasonId, setReassignReasonId] = useState("workload");
  const [reassignNotes, setReassignNotes] = useState("");
  const [assignmentMode, setAssignmentMode] =
    useState<AssignmentMode>("round-robin");
  const [selectedDistributionStrategy, setSelectedDistributionStrategy] =
    useState<DistributionStrategy>("round-robin");
  const [statusMessage, setStatusMessage] = useState("");

  const unassignedLeadsQuery = useAllLeads("", undefined, undefined, {
    ownerId: "unassigned",
  });
  const assignedLeadsQuery = useAllLeads("", undefined, undefined, {
    ownerId: "all",
  });
  const assigneesQuery = useAssigneesQuery();
  const assignLeadsMutation = useAssignLeadsMutation();

  const unassignedLeads = unassignedLeadsQuery.data?.rows ?? [];
  const reassignableLeads = useMemo(
    () =>
      (assignedLeadsQuery.data?.rows ?? []).filter(
        (lead) => lead.assignedTo && lead.assignedTo !== "Unassigned",
      ),
    [assignedLeadsQuery.data?.rows],
  );
  const assignees = useMemo<AssigneeOption[]>(
    () => assigneesQuery.data ?? [],
    [assigneesQuery.data],
  );

  useEffect(() => {
    if (!assignees.length) return;
    if (
      !selectedAssigneeId ||
      !assignees.some((item) => item.id === selectedAssigneeId)
    ) {
      const nextAssignee = assignees.find((item) => item.type === assigneeType);
      if (nextAssignee) {
        setSelectedAssigneeId(nextAssignee.id);
      }
    }
    if (!newOwnerId || !assignees.some((item) => item.id === newOwnerId)) {
      const nextOwner = assignees.find((item) => item.type === assigneeType);
      if (nextOwner) {
        setNewOwnerId(nextOwner.id);
      }
    }
  }, [assigneeType, assignees, newOwnerId, selectedAssigneeId]);

  const selectedAssignee = useMemo(
    () => assignees.find((assignee) => assignee.id === selectedAssigneeId),
    [assignees, selectedAssigneeId],
  );
  const selectedDistributionRule = useMemo(
    () =>
      distributionRules.find(
        (rule) => rule.id === selectedDistributionStrategy,
      ),
    [selectedDistributionStrategy],
  );
  const selectedReassignReason = reasonOptions.find(
    (reason) => reason.id === reassignReasonId,
  );
  const selectedReassignAssignee = useMemo(
    () => assignees.find((assignee) => assignee.id === newOwnerId),
    [assignees, newOwnerId],
  );
  const stats = useMemo<LeadStatsRowItem[]>(
    () =>
      assignmentStats.map((stat) => {
        let value = stat.value;
        if (stat.label === "Unassigned Leads") {
          value = unassignedLeads.length.toString();
        }
        if (stat.label === "Available Pre Sales") {
          value = assignees
            .filter((assignee) => assignee.type === "telecaller")
            .length.toString();
        }
        if (stat.label === "Available Executives") {
          value = assignees
            .filter((assignee) => assignee.type === "field-executive")
            .length.toString();
        }
        return {
          label: stat.label,
          value,
          change: "",
          helper: stat.helper ?? "",
          icon: stat.icon,
          tone: stat.tone,
        };
      }),
    [assignees, unassignedLeads.length],
  );
  const canAssign =
    activeTab === "ai"
      ? selectedLeadIds.length > 0 && Boolean(selectedDistributionRule)
      : activeTab === "reassignments"
      ? selectedReassignLeadIds.length > 0 &&
        Boolean(selectedReassignAssignee) &&
        Boolean(selectedReassignReason)
      : selectedLeadIds.length > 0 && Boolean(selectedAssignee);

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId)
        ? current.filter((id) => id !== leadId)
        : [...current, leadId],
    );
  };

  const toggleAll = () => {
    setSelectedLeadIds((current) =>
      unassignedLeads.length > 0 &&
      unassignedLeads.every((lead) => current.includes(lead.id))
        ? []
        : unassignedLeads.map((lead) => lead.id),
    );
  };

  const changeAssigneeType = (type: AssigneeType) => {
    setAssigneeType(type);
    setSelectedAssigneeId(
      assignees.find((assignee) => assignee.type === type)?.id ?? "",
    );
    setNewOwnerId(
      assignees.find((assignee) => assignee.type === type)?.id ?? "",
    );
  };

  const changeDistributionStrategy = (strategy: DistributionStrategy) => {
    setSelectedDistributionStrategy(strategy);
    setAssignmentMode(strategy === "project" ? "ai" : strategy);
    setStatusMessage(
      `${
        distributionRules.find((rule) => rule.id === strategy)?.title ??
        "Distribution"
      } selected for recommended assignment.`,
    );
  };

  const assignLeads = () => {
    if (!canAssign) {
      return;
    }
    if (activeTab === "reassignments") {
      assignLeadsMutation.mutate(
        {
          leadIds: selectedReassignLeadIds.map(
            (leadId) =>
              reassignableLeads.find((lead) => lead.id === leadId)?.backendId ??
              leadId,
          ),
          toUserId: newOwnerId,
          assigneeId: newOwnerId,
          assigneeType,
          reason: selectedReassignReason?.label,
          notes: reassignNotes,
          strategy: "manual-reassignment",
        },
        {
          onSuccess: () => {
            setStatusMessage(
              `${selectedReassignLeadIds.length} leads reassigned to ${
                selectedReassignAssignee?.name ?? "selected assignee"
              }. A notification has been sent with the reassignment reason.`,
            );
            toast.success(
              `${selectedReassignLeadIds.length} lead${
                selectedReassignLeadIds.length === 1 ? "" : "s"
              } reassigned to ${
                selectedReassignAssignee?.name ?? "selected assignee"
              }.`,
            );
            setSelectedReassignLeadIds([]);
            setReassignNotes("");
          },
          onError: (error) => {
            setStatusMessage(`Reassignment failed: ${error.message}`);
            toast.error(error.message || "Could not reassign leads");
          },
        },
      );
      return;
    }
    if (activeTab === "ai") {
      setStatusMessage(
        `${
          selectedLeadIds.length
        } leads ready for recommended assignment using ${
          selectedDistributionRule?.title ?? "selected strategy"
        }.`,
      );
      void {
        selectedLeadIds,
        selectedDistributionStrategy,
        selectedRule: selectedDistributionRule?.id,
        assignmentMode,
        tab: activeTab,
      };
      return;
    }
    if (!selectedAssignee) {
      return;
    }

    assignLeadsMutation.mutate(
      {
        leadIds: selectedLeadIds.map(
          (leadId) =>
            unassignedLeads.find((lead) => lead.id === leadId)?.backendId ??
            leadId,
        ),
        assigneeId: selectedAssignee.id,
        assigneeType,
        strategy: assignmentMode,
        toUserId: selectedAssignee.id,
      },
      {
        onSuccess: () => {
          setStatusMessage(
            `${selectedLeadIds.length} leads successfully assigned to ${selectedAssignee.name}.`,
          );
          toast.success(
            `${selectedLeadIds.length} lead${
              selectedLeadIds.length === 1 ? "" : "s"
            } assigned to ${selectedAssignee.name}.`,
          );
          setSelectedLeadIds([]);
        },
        onError: (error) => {
          setStatusMessage(`Assignment failed: ${error.message}`);
          toast.error(error.message || "Could not assign leads");
        },
      },
    );
  };

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Lead Assignment"
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
              <span className="text-foreground">Lead Assignment</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads, customers, projects, mobile number"
                value={search}
                placeholder="Search leads, customers, projects, mobile number..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
            <Select defaultValue="2025-05-20">
              <SelectTrigger
                aria-label="Date"
                className="h-10 w-[160px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-4 text-info mr-1" />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {dateOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </DashboardHeader>

      <WorkspacePage>
          <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h1 className="text-[2rem] font-extrabold text-secondary">
                Lead Assignment
              </h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                Assign unassigned leads and reassign owned leads directly from
                one admin workspace.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md px-5 text-sm shadow-none"
                onClick={() =>
                  setStatusMessage(
                    "Assignment rules are shown in the distribution workspace.",
                  )
                }
              >
                <Settings2 className="size-4" />
                Assignment Rules
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md px-5 text-sm shadow-none"
                onClick={() => setActiveTab("reassignments")}
              >
                <ArrowRight className="size-4" />
                Open Reassignments
              </Button>
            </div>
          </section>

          <StatsRow stats={stats} />

          <section
            className={cn(
              "grid gap-5",
              activeTab === "reassignments"
                ? "grid-cols-1"
                : "2xl:grid-cols-[minmax(0,2.45fr)_minmax(320px,0.7fr)]",
            )}
          >
            <div className="space-y-5">
              <Card className="rounded-md border border-slate-200 bg-white px-4 py-0 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-6 overflow-x-auto">
                    {assignmentTabs.map((tab) => (
                      <Button
                        key={tab.id}
                        type="button"
                        variant="ghost"
                        aria-pressed={activeTab === tab.id}
                        className={cn(
                          "h-14 rounded-none border-b-2 border-transparent px-2 text-sm font-extrabold text-secondary hover:bg-transparent",
                          activeTab === tab.id && "border-primary text-primary",
                        )}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mb-3 h-10 rounded-md px-4 text-xs font-extrabold shadow-none sm:mb-0"
                  >
                    <Filter className="size-4" />
                    Filters
                  </Button>
                </div>
              </Card>

              {statusMessage ? (
                <div className="rounded-md border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
                  {statusMessage}
                </div>
              ) : null}

              {activeTab === "ai" ? (
                <DistributionEngineWorkspace
                  selectedStrategy={selectedDistributionStrategy}
                  onSelectStrategy={changeDistributionStrategy}
                />
              ) : activeTab === "reassignments" ? (
                <>
                  <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.78fr)]">
                    <div className="min-w-0">
                      <ReassignForm
                        leads={reassignableLeads}
                        assignees={assignees}
                        assigneeType={assigneeType}
                        onAssigneeTypeChange={changeAssigneeType}
                        selectedLeadIds={selectedReassignLeadIds}
                        onSelectedLeadIdsChange={setSelectedReassignLeadIds}
                        newOwnerId={newOwnerId}
                        onNewOwnerChange={setNewOwnerId}
                        reasonId={reassignReasonId}
                        onReasonChange={setReassignReasonId}
                        notes={reassignNotes}
                        onNotesChange={setReassignNotes}
                        canSubmit={canAssign}
                        isSubmitting={assignLeadsMutation.isPending}
                        onCancel={() => {
                          setSelectedReassignLeadIds([]);
                          setReassignNotes("");
                        }}
                        onSubmit={assignLeads}
                      />
                      <div className="mt-5 grid gap-4 xl:grid-cols-3">
                        <ReassignmentBenefitCard
                          title="Secure & Compliant"
                          helper="All reassignments are logged and auditable"
                          icon={ShieldCheck}
                        />
                        <ReassignmentBenefitCard
                          title="Instant Notifications"
                          helper="Stakeholders are notified in real-time"
                          icon={BellRing}
                        />
                        <ReassignmentBenefitCard
                          title="Data-Driven Decisions"
                          helper="Optimize workload and improve performance"
                          icon={Sparkles}
                        />
                      </div>
                    </div>
                    <div className="space-y-5 xl:sticky xl:top-24">
                      <AssignmentSummaryCard
                        selectedCount={selectedReassignLeadIds.length}
                        selectedAssignee={selectedReassignAssignee}
                        assignmentMode={"round-robin"}
                      />
                      <ExecutiveWorkloadOverviewCard assignees={assignees} />
                      <ProTipCard />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] 2xl:items-stretch">
                    <SelectLeadsCard
                      leads={unassignedLeads}
                      selectedLeadIds={selectedLeadIds}
                      onToggleLead={toggleLead}
                      onToggleAll={toggleAll}
                    />
                    <div className="hidden h-full items-center justify-center 2xl:flex">
                      <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-white shadow-card">
                        <ArrowRight className="size-5" />
                      </span>
                    </div>
                    <AssignToCard
                      assignees={assignees}
                      assigneeType={assigneeType}
                      selectedAssigneeId={selectedAssigneeId}
                      onAssigneeTypeChange={changeAssigneeType}
                      onAssigneeChange={setSelectedAssigneeId}
                    />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-3">
                    <AssignmentOptionsCard
                      value={assignmentMode}
                      onChange={setAssignmentMode}
                    />
                    <AssignmentSummaryCard
                      selectedCount={selectedLeadIds.length}
                      selectedAssignee={selectedAssignee}
                      assignmentMode={assignmentMode}
                    />
                    <AssignmentRecommendationCard
                      assignees={assignees}
                      selectedAssignee={selectedAssignee}
                    />
                  </div>
                </>
              )}

              {activeTab !== "reassignments" ? (
                <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-md px-8 shadow-none"
                    onClick={() => {
                      setSelectedLeadIds([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-md px-5 shadow-none"
                    >
                      <Calendar className="size-4" />
                      Schedule Assignment
                    </Button>
                    <Button
                      type="button"
                      disabled={!canAssign || assignLeadsMutation.isPending}
                      className="h-11 rounded-md px-10"
                      onClick={assignLeads}
                    >
                      {assignLeadsMutation.isPending
                        ? "Assigning..."
                        : activeTab === "ai"
                        ? "Run Auto Assignment"
                        : "Assign Leads"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {activeTab === "reassignments" ? null : (
              <aside className="space-y-4">
                <WorkloadDistributionCard assignees={assignees} />
                <AssignmentInsightsCard />
                <RecentAssignmentsCard />
                <ProTipCard />
              </aside>
            )}
          </section>
      </WorkspacePage>
    </>
  );
}
