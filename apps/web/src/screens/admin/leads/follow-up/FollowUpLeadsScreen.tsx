import {
  ArrowDown,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
  Search,
  Send,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  MultiSelect,
  SearchableSelect,
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
import {
  formatTimeForDisplay,
  parseScheduledDateTime,
  scheduledInputToIso,
} from "../../../../common/time";
import { api } from "../../../../common/api";

import { fieldExecutiveSidebarItems } from "../../../field-executive/fieldExecutiveData";
import { followUpQueueSlaMetrics } from "../../../../common/sla/slaData";
import { SlaBadge } from "../../../../common/sla/SlaBadge";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { projectsCatalog } from "../../projects/projectsData";
import { telecallerSidebarItems } from "../../../telecaller/dashboard/telecallerDashboardData";
import { addLeadSidebarItems } from "../add/addLeadData";

import {
  useAllLeads,
  useBulkAssignSelectedLeads,
  useBulkPatchSelectedLeads,
  useLeadUpdateFieldPermissions,
  useLeadListFilterOptions,
  type LeadFilterOption,
} from "../all/useAllLeads";
import type { LeadRow } from "../all/allLeadsTypes";
import { ClockTimePicker } from "../assignment/ClockTimePicker";
import { LeadPreviewDialog } from "../components/LeadPreviewDialog";
import type { FollowUpLead, FollowUpStatus } from "./followUpLeadsTypes";
import {
  useFollowUpMutations,
  useFollowUpsList,
  type FollowUpWorkspaceApiRecord,
} from "./useFollowUpsWorkspace";
import { useLeadCardPreferences } from "../../../../common/hooks/useLeadCardPreferences";

type RouteMode = "admin" | "telecaller" | "field-executive";
type FollowUpDateRangeFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";
type FollowUpSlaFilter = "all" | "on-time" | "due-soon" | "breached";

interface FollowUpFilters {
  assignedToIds: string[];
  statuses: string[];
  sourceIds: string[];
  leadStatusIds: string[];
  leadTypeIds: string[];
  projectIds: string[];
  budgetRanges: string[];
  configurations: string[];
  locations: string[];
  dateRange: FollowUpDateRangeFilter;
  from: string;
  to: string;
  slaStatus: FollowUpSlaFilter;
}

const initialFollowUpFilters: FollowUpFilters = {
  assignedToIds: [],
  statuses: [],
  sourceIds: [],
  leadStatusIds: [],
  leadTypeIds: [],
  projectIds: [],
  budgetRanges: [],
  configurations: [],
  locations: [],
  dateRange: "all",
  from: "",
  to: "",
  slaStatus: "all",
};

function getInitialFollowUpFilters(search: string): FollowUpFilters {
  const params = new URLSearchParams(search);
  if (params.get("queue") === "today-pending") {
    return {
      ...initialFollowUpFilters,
      dateRange: "today",
    };
  }
  return initialFollowUpFilters;
}

const callCompletionOutcomes = [
  { value: "Connected", label: "Connected" },
  { value: "Callback Requested", label: "Callback Requested" },
  { value: "No Answer", label: "No Answer" },
  { value: "Interested", label: "Interested" },
  { value: "Not Interested", label: "Not Interested" },
] as const;

const followUpDateRangeOptions: Array<{
  label: string;
  value: FollowUpDateRangeFilter;
}> = [
  { label: "All Date Range", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom Range", value: "custom" },
];

const followUpStatusFilterOptions = [
  "Due Now",
  "Due Soon",
  "Upcoming",
  "Overdue",
  "Completed",
].map((status) => ({ label: status, value: status }));

const followUpTimes = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
  "05:00 PM",
  "06:00 PM",
  "07:00 PM",
];

interface LeadRemarkNote {
  id: string;
  text?: string | null;
  createdAt?: string | null;
  isPinned?: boolean | null;
  authorName?: string | null;
  authorImage?: string | null;
}

interface LeadRemarkDetails {
  id: string;
  remarks?: string | null;
  notes?: LeadRemarkNote[];
}

const formatRemarkTimestamp = (value?: string | null) => {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const initialsFromName = (value?: string | null) =>
  (value ?? "Team Member")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function toDateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function getDayBoundary(dateValue: string, boundary: "start" | "end") {
  if (!dateValue) return "";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  if (boundary === "end") {
    date.setHours(23, 59, 59, 999);
  }
  return date.toISOString();
}

function resolveFollowUpDateRange(filters: FollowUpFilters) {
  const now = new Date();
  const today = toDateInputValue(now);

  if (filters.dateRange === "today") {
    return {
      from: getDayBoundary(today, "start"),
      to: getDayBoundary(today, "end"),
    };
  }

  if (filters.dateRange === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const value = toDateInputValue(yesterday);
    return {
      from: getDayBoundary(value, "start"),
      to: getDayBoundary(value, "end"),
    };
  }

  if (filters.dateRange === "last7") {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return {
      from: getDayBoundary(toDateInputValue(from), "start"),
      to: getDayBoundary(today, "end"),
    };
  }

  if (filters.dateRange === "last30") {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    return {
      from: getDayBoundary(toDateInputValue(from), "start"),
      to: getDayBoundary(today, "end"),
    };
  }

  if (filters.dateRange === "thisMonth") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      from: getDayBoundary(toDateInputValue(from), "start"),
      to: getDayBoundary(today, "end"),
    };
  }

  if (filters.dateRange === "lastMonth") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      from: getDayBoundary(toDateInputValue(from), "start"),
      to: getDayBoundary(toDateInputValue(to), "end"),
    };
  }

  if (filters.dateRange === "custom") {
    return {
      from: getDayBoundary(filters.from, "start"),
      to: getDayBoundary(filters.to, "end"),
    };
  }

  return { from: "", to: "" };
}

function countActiveFollowUpFilters(filters: FollowUpFilters) {
  return (
    filters.assignedToIds.length +
    filters.statuses.length +
    filters.sourceIds.length +
    filters.leadStatusIds.length +
    filters.leadTypeIds.length +
    filters.projectIds.length +
    filters.budgetRanges.length +
    filters.configurations.length +
    filters.locations.length +
    (filters.dateRange !== "all" ? 1 : 0) +
    (filters.slaStatus !== "all" ? 1 : 0)
  );
}

function followUpSlaMatches(
  status: FollowUpStatus,
  slaStatus: FollowUpSlaFilter,
) {
  if (slaStatus === "all") return true;
  if (slaStatus === "breached") return status === "Overdue";
  if (slaStatus === "due-soon") {
    return status === "Due Now" || status === "Due Soon";
  }
  return status !== "Overdue";
}

function selectedOptionMatches(
  selectedValues: string[],
  actualValue: string | null | undefined,
  actualLabel: string | null | undefined,
  options: LeadFilterOption[],
) {
  if (selectedValues.length === 0) return true;
  const normalizedActual = [actualValue, actualLabel]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
  const selectedLabels = selectedValues
    .map(
      (value) =>
        options.find((option) => option.value === value)?.label ?? value,
    )
    .map((value) => String(value).trim().toLowerCase());

  return (
    selectedValues.some((value) =>
      normalizedActual.includes(String(value).trim().toLowerCase()),
    ) ||
    selectedLabels.some((label) =>
      normalizedActual.some(
        (actual) =>
          actual === label || actual.includes(label) || label.includes(actual),
      ),
    )
  );
}

function tabName(tab: string) {
  return tab.replace(/\s*\(\d+\)$/, "");
}

function avatar(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
    seed,
  )}`;
}

function toInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(value: string | Date) {
  return formatTimeForDisplay(value) || "10:00 AM";
}

function formatLastContact(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function deriveDateGroup(date: Date): "Today" | "Tomorrow" | string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (date.toDateString() === now.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function deriveStatus(item: {
  completedAt?: string | null;
  scheduledAt: string;
}): FollowUpStatus {
  if (item.completedAt) return "Completed";
  const scheduledAt = parseScheduledDateTime(item.scheduledAt);
  if (!scheduledAt) return "Upcoming";
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  if (scheduledAt < startOfToday) return "Overdue";

  const diffMinutes = (scheduledAt.getTime() - now.getTime()) / 60000;
  if (diffMinutes <= 60) return "Due Now";
  if (diffMinutes <= 240) return "Due Soon";
  return "Upcoming";
}

function formatLeadMobile(lead?: FollowUpWorkspaceApiRecord["lead"] | null) {
  const mobile = lead?.mobile?.trim();
  if (!mobile) return "Not Available";
  const countryCode = lead?.mobileCountryCode?.trim();
  if (!countryCode || mobile.startsWith("+")) return mobile;
  return `${countryCode} ${mobile}`;
}

function mapApiFollowUpToLead(item: FollowUpWorkspaceApiRecord): FollowUpLead {
  const leadName = item.lead?.name?.trim() || "Lead";
  const requirement = item.lead?.requirement;
  const propertyBits = [
    requirement?.configuration || requirement?.propertyType || "Property",
    requirement?.preferredLocation || "Location pending",
  ].filter(Boolean);
  const scheduledAt = parseScheduledDateTime(item.scheduledAt) ?? new Date();
  const owner = item.assignedToName?.trim() || "Assigned user";
  const remarks = item.remarks?.trim() || item.notes?.trim() || "";
  const executiveName =
    item.lead?.fieldExecutiveName?.trim() ||
    item.lead?.telecallerName?.trim() ||
    item.lead?.ownerName?.trim() ||
    owner;

  return {
    id: item.id,
    leadId: item.leadId || item.lead?.id || undefined,
    assignedToId: item.assignedToId ?? undefined,
    sourceId: item.lead?.sourceId ?? null,
    leadStatusId: item.lead?.statusId ?? null,
    leadTypeId: item.lead?.temperatureId ?? null,
    preferredProjectId: requirement?.preferredProjectId ?? null,
    budgetRange: requirement?.budgetRange ?? null,
    configuration: requirement?.configuration ?? null,
    preferredLocation: requirement?.preferredLocation ?? null,
    name: leadName,
    initials: toInitials(leadName),
    property: propertyBits.join(" | "),
    source: item.lead?.sourceName?.trim() || "Unknown Source",
    mobile: formatLeadMobile(item.lead),
    projectName:
      item.lead?.projectName?.trim() ||
      requirement?.preferredLocation?.trim() ||
      "Not selected",
    executiveName,
    leadStatus: item.lead?.statusName?.trim() || "Not Set",
    leadType: item.lead?.temperatureName?.trim() || "Warm",
    scheduledAt: item.scheduledAt,
    dateGroup: deriveDateGroup(scheduledAt),
    time: formatTime(scheduledAt),
    lastContact: item.completedAt
      ? "Completed"
      : formatLastContact(scheduledAt),
    lastContactTime: formatTime(item.completedAt || item.scheduledAt),
    owner,
    ownerAvatarUrl: avatar(owner),
    status: deriveStatus(item),
    remark: remarks || "No remarks added",
  };
}

function getTodayDateString() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function getTomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function statusTone(status: FollowUpStatus) {
  if (status === "Due Now") return "bg-green-100 text-success";
  if (status === "Due Soon") return "bg-orange-100 text-primary";
  if (status === "Overdue") return "bg-red-100 text-red-600";
  if (status === "Completed") return "bg-slate-100 text-muted-foreground";
  return "bg-blue-100 text-blue-700";
}

function formatProjectUnitLabel(unit: {
  tower: string;
  unitNumber: string;
  configuration: string;
  availability: string;
}) {
  return `${unit.tower}, Unit ${unit.unitNumber} • ${unit.configuration} • ${unit.availability}`;
}

function formatPropertyDetail(
  projectName: string,
  location: string,
  unit?: {
    tower: string;
    unitNumber: string;
    configuration: string;
  },
) {
  if (!unit) {
    return `${projectName} | ${location}`;
  }
  return `${unit.tower}, Unit ${unit.unitNumber} | ${unit.configuration} | ${location}`;
}

function formatCompletionNotes(remarks: string, callOutcome: string) {
  const trimmedRemarks = remarks.trim();
  return `Call Outcome: ${callOutcome}\nRemarks: ${trimmedRemarks}`;
}

function StatsRow({
  stats,
  onStatClick,
}: {
  stats: Array<{
    label: string;
    value: string;
    change: string;
    helper: string;
    icon: typeof CalendarCheck;
    tone: string;
  }>;
  onStatClick: (label: string) => void;
}) {
  return (
    <section className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,12rem),1fr))]">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <button
            key={stat.label}
            type="button"
            className="min-w-0 text-left"
            onClick={() => onStatClick(stat.label)}
          >
            <Card className="min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white p-3 shadow-card transition hover:border-blue-200 sm:p-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-md sm:size-12",
                    stat.tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 truncate text-xl font-extrabold leading-none text-secondary sm:text-2xl">
                    {stat.value}
                  </p>
                  <p className="mt-2 truncate text-xs font-semibold text-secondary">
                    {stat.helper}
                  </p>
                  <p className="mt-1 truncate text-[11px] font-extrabold text-blue-700">
                    {stat.change}
                  </p>
                </div>
              </div>
            </Card>
          </button>
        );
      })}
    </section>
  );
}

function SlaQueueHighlights() {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-secondary">
              Queue SLA Snapshot
            </h2>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              Follow-up response health across the current queue
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {followUpQueueSlaMetrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-md border border-slate-100 bg-slate-50 p-3"
            >
              <p className="text-xs font-bold text-muted-foreground">
                {metric.label}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xl font-extrabold text-secondary">
                  {metric.value}
                </span>
                {metric.status ? <SlaBadge status={metric.status} /> : null}
              </div>
              <p className="mt-2 text-xs font-semibold text-secondary">
                {metric.helper}
              </p>
            </div>
          ))}
        </div>
      </Card>
      <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
        <h2 className="text-base font-extrabold text-secondary">
          Queue Guidance
        </h2>
        <div className="mt-4 space-y-3 text-xs font-semibold text-secondary">
          <p>Prioritize overdue follow-ups before starting fresh outreach.</p>
          <p>
            Use reschedule and next-action updates to keep the queue accurate.
          </p>
          <p>Completed follow-ups move out of the live queue automatically.</p>
        </div>
      </Card>
    </section>
  );
}

function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 shadow-card",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold text-secondary">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

function CalendarCard({
  selectedDate,
  onDateSelect,
}: {
  selectedDate: string;
  onDateSelect: (date: string) => void;
}) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dates = Array.from({ length: 35 }, (_, index) => String(index + 1));
  return (
    <Panel title="Follow-Up Calendar">
      <div className="mb-4 flex items-center justify-between text-sm font-extrabold text-blue-700">
        <ChevronLeft className="h-4 w-4" />
        <span>Current Queue View</span>
        <ChevronRight className="h-4 w-4" />
      </div>
      <div className="grid grid-cols-7 gap-y-3 text-center text-xs">
        {days.map((day) => (
          <span key={day} className="font-extrabold text-muted-foreground">
            {day}
          </span>
        ))}
        {dates.map((date) => {
          const active = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              className="grid justify-items-center gap-1 focus:outline-none"
              onClick={() => onDateSelect(date)}
            >
              <span
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full font-extrabold transition-colors",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-secondary hover:bg-slate-100",
                )}
              >
                {date}
              </span>
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  active ? "bg-blue-600" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function findOptionValue(
  options: Array<{ label: string; value: string }>,
  value?: string | null,
) {
  if (!value) return "";
  return (
    options.find((option) => option.value === value)?.value ??
    options.find((option) => option.label.toLowerCase() === value.toLowerCase())
      ?.value ??
    ""
  );
}

function FollowUpLeadUpdateDialog({
  lead,
  row,
  open,
  statusOptions,
  leadTypeOptions,
  budgetOptions,
  areaOptions,
  configurationOptions,
  sourceOptions,
  enabledUpdateFields,
  onOpenChange,
  onSaved,
}: {
  lead: FollowUpLead | null;
  row?: LeadRow;
  open: boolean;
  statusOptions: LeadFilterOption[];
  leadTypeOptions: Array<{ label: string; value: string }>;
  budgetOptions: Array<{ label: string; value: string }>;
  areaOptions: Array<{ label: string; value: string }>;
  configurationOptions: Array<{ label: string; value: string }>;
  sourceOptions: Array<{ label: string; value: string }>;
  enabledUpdateFields: string[];
  onOpenChange: (open: boolean) => void;
  onSaved: (
    leadId: string,
    payload: Record<string, string | boolean>,
  ) => Promise<void>;
}) {
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00 AM");
  const [remark, setRemark] = useState("");
  const [statusId, setStatusId] = useState("");
  const [leadTypeId, setLeadTypeId] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [location, setLocation] = useState("");
  const [configuration, setConfiguration] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const canUpdateField = (field: string) => enabledUpdateFields.includes(field);

  const selectedStatusOption = statusOptions.find(
    (option) => option.value === statusId,
  );
  const selectedStatusAllowsFollowUp =
    selectedStatusOption?.allowFollowUp ?? true;

  useEffect(() => {
    if (!open || !lead) return;
    setFollowUpDate("");
    setFollowUpTime(lead.time || "10:00 AM");
    setRemark("");
    setStatusId(
      findOptionValue(statusOptions, row?.statusId ?? lead.leadStatus),
    );
    setLeadTypeId(
      findOptionValue(leadTypeOptions, row?.temperatureId ?? lead.leadType),
    );
    setBudgetRange(findOptionValue(budgetOptions, row?.budgetRange));
    setLocation(findOptionValue(areaOptions, row?.preferredLocation));
    setConfiguration(findOptionValue(configurationOptions, row?.configuration));
    setSourceId(findOptionValue(sourceOptions, row?.sourceId ?? lead.source));
  }, [
    areaOptions,
    budgetOptions,
    configurationOptions,
    lead,
    leadTypeOptions,
    open,
    row,
    sourceOptions,
    statusOptions,
  ]);

  const submit = async () => {
    if (!lead?.leadId) {
      toast.error("Lead reference is missing for this follow-up");
      return;
    }

    const trimmedRemark = remark.trim();
    const payload: Record<string, string> = {};
    if (statusId && canUpdateField("status")) payload.statusId = statusId;
    if (leadTypeId && canUpdateField("leadType"))
      payload.temperatureId = leadTypeId;
    if (budgetRange && canUpdateField("budget"))
      payload.budgetRange = budgetRange;
    if (location && canUpdateField("location"))
      payload.preferredLocation = location;
    if (configuration && canUpdateField("configuration"))
      payload.configuration = configuration;
    if (sourceId && canUpdateField("source")) payload.sourceId = sourceId;
    if (trimmedRemark && canUpdateField("remark"))
      payload.remarks = trimmedRemark;

    const hasStatusUpdate =
      Boolean(statusId) && statusId !== (lead.leadStatusId ?? "");
    const shouldCompleteAndCreateNext =
      selectedStatusAllowsFollowUp &&
      canUpdateField("followUpDate") &&
      canUpdateField("remark") &&
      Boolean(followUpDate || trimmedRemark || hasStatusUpdate);
    if (shouldCompleteAndCreateNext && !followUpDate) {
      toast.error("Select the next follow-up date");
      return;
    }
    if (shouldCompleteAndCreateNext && !trimmedRemark) {
      toast.error("Enter the current remark for this follow-up");
      return;
    }
    if (!Object.keys(payload).length && !shouldCompleteAndCreateNext) {
      toast.error("Select at least one field to update");
      return;
    }

    setIsSaving(true);
    try {
      await onSaved(lead.leadId, {
        ...payload,
        ...(shouldCompleteAndCreateNext
          ? {
              followUpId: lead.id,
              nextScheduledAt: scheduledInputToIso(
                followUpDate,
                followUpTime,
              ),
              remarks: trimmedRemark,
              notes: trimmedRemark,
              completed: true,
              nextAssignedToId: lead.assignedToId ?? "",
            }
          : {}),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col overflow-hidden rounded-xl bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-secondary">
            Update reminder, status & remark
          </DialogTitle>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            Changing a status or remark requires a follow-up date. Statuses
            configured without follow-ups remain exempt.
          </p>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {canUpdateField("status") ? (
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Status
                </span>
                <SearchableSelect
                  value={statusId}
                  onValueChange={(value) => {
                    setStatusId(value);
                    if (
                      statusOptions.find((option) => option.value === value)
                        ?.allowFollowUp === false
                    ) {
                      setFollowUpDate("");
                    }
                  }}
                  options={statusOptions}
                  placeholder="Select status"
                  searchPlaceholder="Search statuses..."
                  noOptionsText="No statuses found"
                  className="h-11 bg-white"
                  modal={false}
                  portaled={false}
                />
              </label>
            ) : null}
            {canUpdateField("leadType") ? (
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Type
                </span>
                <SearchableSelect
                  value={leadTypeId}
                  onValueChange={setLeadTypeId}
                  options={leadTypeOptions}
                  placeholder="Select type"
                  searchPlaceholder="Search lead types..."
                  noOptionsText="No lead types found"
                  className="h-11 bg-white"
                  modal={false}
                  portaled={false}
                />
              </label>
            ) : null}
            {canUpdateField("followUpDate") && canUpdateField("remark") ? (
              <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <p className="text-xs font-extrabold text-secondary">
                    Follow-up reminder
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {!selectedStatusAllowsFollowUp
                      ? `Disabled because ${
                          selectedStatusOption?.label ?? "this status"
                        } does not allow follow-up creation.`
                      : "Required when you change status or remark. These details create the next follow-up."}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Follow-up date
                    </span>
                    <DatePicker
                      aria-label="Follow-up date"
                      value={followUpDate}
                      className="h-11 bg-white"
                      disabled={!selectedStatusAllowsFollowUp}
                      onChange={(event) => setFollowUpDate(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-xs font-extrabold text-secondary">
                      Follow-up time
                    </span>
                    <ClockTimePicker
                      value={followUpTime}
                      options={followUpTimes}
                      disabled={!selectedStatusAllowsFollowUp}
                      widthClassName="w-full bg-white"
                      onChange={setFollowUpTime}
                    />
                  </label>
                </div>
              </div>
            ) : null}
            {canUpdateField("budget") ? (
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Budget
                </span>
                <SearchableSelect
                  value={budgetRange}
                  onValueChange={setBudgetRange}
                  options={budgetOptions}
                  placeholder="Select budget"
                  searchPlaceholder="Search budgets..."
                  noOptionsText="No budget ranges found"
                  className="h-11 bg-white"
                  modal={false}
                  portaled={false}
                />
              </label>
            ) : null}
            {canUpdateField("location") ? (
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Location
                </span>
                <SearchableSelect
                  value={location}
                  onValueChange={setLocation}
                  options={areaOptions}
                  placeholder="Select location"
                  searchPlaceholder="Search locations..."
                  noOptionsText="No locations found"
                  className="h-11 bg-white"
                  modal={false}
                  portaled={false}
                />
              </label>
            ) : null}
            {canUpdateField("configuration") ? (
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Configuration
                </span>
                <SearchableSelect
                  value={configuration}
                  onValueChange={setConfiguration}
                  options={configurationOptions}
                  placeholder="Select configuration"
                  searchPlaceholder="Search configurations..."
                  noOptionsText="No configurations found"
                  className="h-11 bg-white"
                  modal={false}
                  portaled={false}
                />
              </label>
            ) : null}
            {canUpdateField("source") ? (
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Source
                </span>
                <SearchableSelect
                  value={sourceId}
                  onValueChange={setSourceId}
                  options={sourceOptions}
                  placeholder="Select source"
                  searchPlaceholder="Search sources..."
                  noOptionsText="No sources found"
                  className="h-11 bg-white"
                  modal={false}
                  portaled={false}
                />
              </label>
            ) : null}
            {canUpdateField("remark") ? (
              <label className="space-y-2 sm:col-span-2">
                <span className="text-xs font-extrabold text-secondary">
                  Remark
                </span>
                <Textarea
                  value={remark}
                  onChange={(event) => setRemark(event.target.value)}
                  placeholder="Enter new remark..."
                  className="min-h-20 bg-white"
                />
              </label>
            ) : null}
          </div>

          <p className="px-6 text-xs font-semibold text-muted-foreground">
            1 selected lead will receive the filled updates.
          </p>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void submit()}
          >
            {isSaving ? "Updating Lead..." : "Update Lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowUpAssignLeadDialog({
  lead,
  open,
  telecallerOptions,
  fieldExecutiveOptions,
  onOpenChange,
  onSaved,
}: {
  lead: FollowUpLead | null;
  open: boolean;
  telecallerOptions: Array<{ label: string; value: string }>;
  fieldExecutiveOptions: Array<{ label: string; value: string }>;
  onOpenChange: (open: boolean) => void;
  onSaved: (
    leadId: string,
    assignments: Array<{
      toUserId: string;
      assigneeType: "telecaller" | "field-executive";
    }>,
  ) => Promise<void>;
}) {
  const [telecallerId, setTelecallerId] = useState("");
  const [fieldExecutiveId, setFieldExecutiveId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTelecallerId("");
    setFieldExecutiveId("");
  }, [lead?.leadId, open]);

  const submit = async () => {
    if (!lead?.leadId) {
      toast.error("Lead reference is missing for this follow-up");
      return;
    }

    const assignments = [
      telecallerId
        ? {
            toUserId: telecallerId,
            assigneeType: "telecaller" as const,
          }
        : null,
      fieldExecutiveId
        ? {
            toUserId: fieldExecutiveId,
            assigneeType: "field-executive" as const,
          }
        : null,
    ].filter(Boolean) as Array<{
      toUserId: string;
      assigneeType: "telecaller" | "field-executive";
    }>;

    if (!assignments.length) {
      toast.error("Select a Pre Sales Executive user or sales executive");
      return;
    }

    setIsSaving(true);
    try {
      await onSaved(lead.leadId, assignments);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,38rem)] rounded-md border border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <DialogTitle className="text-lg font-extrabold text-secondary">
            Assign lead
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            Assign {lead?.name ?? "this lead"} to a Pre Sales Executive user, sales
            executive, or both.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <SearchableSelect
            label="Pre Sales Executive"
            value={telecallerId}
            options={telecallerOptions}
            placeholder="Select Pre Sales Executive"
            ariaLabel="Pre Sales Executive"
            searchPlaceholder="Search Pre Sales Executive..."
            noOptionsText="No Pre Sales Executive users found"
            onValueChange={setTelecallerId}
            portaled={false}
            modal={false}
          />
          <SearchableSelect
            label="Sales executive"
            value={fieldExecutiveId}
            options={[
              {
                label: "Not assigned",
                value: "",
              },
              ...fieldExecutiveOptions,
            ]}
            placeholder="Not assigned"
            ariaLabel="Sales executive"
            searchPlaceholder="Search sales executive..."
            noOptionsText="No sales executives found"
            onValueChange={setFieldExecutiveId}
            portaled={false}
            modal={false}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md shadow-none"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-10 rounded-md"
            disabled={isSaving}
            onClick={() => void submit()}
          >
            {isSaving ? "Assigning..." : "Assign lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FollowUpRemarksDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: FollowUpLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const filterOptionsQuery = useLeadListFilterOptions();
  const [activeTab, setActiveTab] = useState<"add" | "history">("add");
  const [remark, setRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00 AM");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState("");
  const [selectedConfiguration, setSelectedConfiguration] = useState("");

  const budgetSearchOptions = filterOptionsQuery.options.budgetOptions.map(
    (option) => ({ label: option.label, value: option.value }),
  );
  const configurationSearchOptions =
    filterOptionsQuery.options.configurationOptions.map((option) => ({
      label: option.label,
      value: option.value,
    }));

  useEffect(() => {
    if (!open) return;
    setActiveTab("add");
    setRemark("");
    setFollowUpDate("");
    setFollowUpTime("10:00 AM");
    setSelectedBudgetRange("");
    setSelectedConfiguration("");
  }, [lead?.leadId, open]);

  const detailsQuery = useQuery({
    queryKey: ["lead-remarks", lead?.leadId],
    enabled: open && Boolean(lead?.leadId),
    queryFn: async () =>
      (await api.get<LeadRemarkDetails>(`/leads/${lead?.leadId}`)).data,
  });

  const addRemark = useMutation({
    mutationFn: async () => {
      if (!lead?.leadId) throw new Error("Lead reference is missing");
      const text = remark.trim();
      if (!text) throw new Error("Enter a remark");
      if (!followUpDate) throw new Error("Please select a follow-up date");
      const leadPatchPayload: Record<string, string> = { remarks: text };
      if (selectedBudgetRange)
        leadPatchPayload.budgetRange = selectedBudgetRange;
      if (selectedConfiguration)
        leadPatchPayload.configuration = selectedConfiguration;
      await api.patch(`/leads/${lead.leadId}`, leadPatchPayload);
      const { data } = await api.post<LeadRemarkNote>(
        `/leads/${lead.leadId}/notes`,
        { text, isPinned: false },
      );
      await api.post(`/leads/${lead.leadId}/follow-ups`, {
        scheduledAt: scheduledInputToIso(followUpDate, followUpTime),
        assignedToId: lead.assignedToId,
        status: "Scheduled",
        remarks: text,
        notes: text,
      });
      return data;
    },
    onSuccess: async () => {
      toast.success("Remark and follow-up saved");
      setRemark("");
      setFollowUpDate("");
      setSelectedBudgetRange("");
      setSelectedConfiguration("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["lead-remarks", lead?.leadId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["lead-details", lead?.leadId],
        }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
    onError: (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "Could not save remark",
      ),
  });

  const notes = detailsQuery.data?.notes ?? [];
  const latestRemark = notes[0] ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(94vw,46rem)] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 text-left">
          <DialogTitle className="text-lg font-extrabold text-secondary">
            Remarks
          </DialogTitle>
          <DialogDescription className="text-xs font-semibold text-muted-foreground">
            Add a new remark or review the history for{" "}
            {lead?.name ?? "this lead"}.
          </DialogDescription>
        </DialogHeader>
        <div className="border-b border-slate-100 px-5 py-3">
          <div className="flex gap-2">
            {[
              { id: "add", label: "Add New Remarks" },
              { id: "history", label: "Remarks History" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-extrabold transition-colors",
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-secondary hover:bg-slate-200",
                )}
                onClick={() => setActiveTab(tab.id as "add" | "history")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "add" ? (
            <div className="space-y-4">
              {latestRemark ? (
                <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-extrabold text-secondary">
                    Latest remark
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-secondary">
                    {latestRemark.text?.trim() || "Internal remark"}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                    {formatRemarkTimestamp(latestRemark.createdAt)}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-secondary">
                    Follow-up date <span className="text-red-600">*</span>
                  </label>
                  <DatePicker
                    aria-label="Follow-up date"
                    value={followUpDate}
                    className="h-10 rounded-md"
                    onChange={(event) => setFollowUpDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-secondary">
                    Follow-up time
                  </label>
                  <ClockTimePicker
                    value={followUpTime}
                    options={followUpTimes}
                    widthClassName="w-full"
                    onChange={setFollowUpTime}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Budget
                  </span>
                  <SearchableSelect
                    value={selectedBudgetRange}
                    onValueChange={setSelectedBudgetRange}
                    options={budgetSearchOptions}
                    placeholder="Select budget"
                    searchPlaceholder="Search budgets..."
                    noOptionsText="No budget ranges found"
                    className="h-11 bg-white"
                    modal={false}
                    portaled={false}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Configuration
                  </span>
                  <SearchableSelect
                    value={selectedConfiguration}
                    onValueChange={setSelectedConfiguration}
                    options={configurationSearchOptions}
                    placeholder="Select configuration"
                    searchPlaceholder="Search configurations..."
                    noOptionsText="No configurations found"
                    className="h-11 bg-white"
                    modal={false}
                    portaled={false}
                  />
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary">
                  Remarks
                </label>
                <Textarea
                  value={remark}
                  placeholder="Write the latest client response or internal context"
                  className="min-h-[132px] rounded-md text-sm font-semibold"
                  onChange={(event) => setRemark(event.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  className="h-10 rounded-md"
                  disabled={addRemark.isPending}
                  onClick={() => addRemark.mutate()}
                >
                  <Send className="h-4 w-4" />
                  {addRemark.isPending ? "Saving..." : "Save remark"}
                </Button>
              </div>
            </div>
          ) : detailsQuery.isLoading ? (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
              Loading remarks history...
            </div>
          ) : notes.length ? (
            <div className="space-y-3">
              {notes.map((note: LeadRemarkNote) => (
                <div
                  key={note.id}
                  className="rounded-md border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage
                          src={note.authorImage ?? undefined}
                          alt={note.authorName ?? "Team Member"}
                        />
                        <AvatarFallback className="bg-blue-50 text-blue-700">
                          {initialsFromName(note.authorName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-extrabold text-secondary">
                          {note.authorName ?? "Team Member"}
                        </p>
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {formatRemarkTimestamp(note.createdAt)}
                        </p>
                      </div>
                    </div>
                    {note.isPinned ? (
                      <Badge className="border-0 bg-orange-50 text-orange-600">
                        Pinned
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-secondary">
                    {note.text?.trim() || "Internal remark"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
              No remarks have been added yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getFollowUpPillTone(color?: string, label?: string) {
  if (color) {
    const c = color.toLowerCase();
    if (c === "blue" || c.includes("1b64f2") || c.includes("3b82f6") || c.includes("2563eb"))
      return "bg-[#eaf2ff] text-[#1b64f2] hover:bg-[#dbe9ff] hover:text-[#1b64f2]";
    if (c === "purple" || c.includes("b026d3") || c.includes("7c3aed") || c.includes("a855f7"))
      return "bg-[#fbf0ff] text-[#b026d3] hover:bg-[#f5dcff] hover:text-[#b026d3]";
    if (c === "red" || c.includes("e11d48") || c.includes("ef4444") || c.includes("dc2626"))
      return "bg-[#ffebe9] text-[#e11d48] hover:bg-[#ffd6d2] hover:text-[#e11d48]";
    if (c === "orange" || c === "amber" || c.includes("d97706") || c.includes("ea580c"))
      return "bg-[#fff8e6] text-[#d97706] hover:bg-[#ffedc2] hover:text-[#d97706]";
    if (c === "cyan" || c.includes("0284c7") || c.includes("0891b2"))
      return "bg-[#e6f7ff] text-[#0284c7] hover:bg-[#cceeff] hover:text-[#0284c7]";
    if (c === "emerald" || c === "green" || c.includes("059669") || c.includes("16a34a"))
      return "bg-[#ecfdf5] text-[#059669] hover:bg-[#d1fae5] hover:text-[#059669]";
    if (c === "slate" || c.includes("475569"))
      return "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900";
  }
  const l = (label || "").toLowerCase();
  if (l.includes("new")) return "bg-[#eaf2ff] text-[#1b64f2] hover:bg-[#dbe9ff] hover:text-[#1b64f2]";
  if (l.includes("interest")) return "bg-[#fbf0ff] text-[#b026d3] hover:bg-[#f5dcff] hover:text-[#b026d3]";
  if (l.includes("hot")) return "bg-[#ffebe9] text-[#e11d48] hover:bg-[#ffd6d2] hover:text-[#e11d48]";
  if (l.includes("schedule") || l.includes("visit")) return "bg-[#fff8e6] text-[#d97706] hover:bg-[#ffedc2] hover:text-[#d97706]";
  if (l.includes("done") || l.includes("completed")) return "bg-[#e6f7ff] text-[#0284c7] hover:bg-[#cceeff] hover:text-[#0284c7]";
  return "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900";
}

function FollowUpTableCard({
  routeMode,
  activeTab,
  rows,
  statusTabs,
  onTabChange,
  onEditLead,
  onUpdateLead,
  onAssignLead,
  onOpenRemarks,
  onAddFollowUp,
  onToggleFilters,
  activeFilterCount,
  quickLeadStatusFilters,
  appliedLeadStatusIds,
  appliedLeadTypeIds,
  onQuickLeadStatusFilter,
  allLeadsForCounts,
  filters,
  isFilterCollapsed = true,
  adminRoute = false,
  ownerOptions,
  sourceOptions,
  leadStatusOptions,
  leadTypeOptions,
  projectOptions,
  budgetOptions,
  configurationOptions,
  locationOptions,
  onApplyFilters,
  onChange,
  onDateRangeChange,
  onResetFilters,
}: {
  routeMode: RouteMode;
  activeTab: string;
  rows: FollowUpLead[];
  statusTabs: string[];
  onTabChange: (tab: string) => void;
  onEditLead: (lead: FollowUpLead) => void;
  onUpdateLead: (lead: FollowUpLead) => void;
  onAssignLead: (lead: FollowUpLead) => void;
  onOpenRemarks: (lead: FollowUpLead) => void;
  onAddFollowUp: () => void;
  onToggleFilters: () => void;
  activeFilterCount: number;
  quickLeadStatusFilters?: Array<{
    label: string;
    value: string;
    kind?: "status" | "temperature";
    color?: string;
  }>;
  appliedLeadStatusIds?: string[];
  appliedLeadTypeIds?: string[];
  onQuickLeadStatusFilter?: (
    statusId: string,
    kind?: "status" | "temperature",
  ) => void;
  allLeadsForCounts?: FollowUpLead[];
  filters?: FollowUpFilters;
  isFilterCollapsed?: boolean;
  adminRoute?: boolean;
  telecallerRoute?: boolean;
  ownerOptions?: Array<{ label: string; value: string; avatarUrl?: string }>;
  sourceOptions?: LeadFilterOption[];
  leadStatusOptions?: LeadFilterOption[];
  leadTypeOptions?: LeadFilterOption[];
  projectOptions?: LeadFilterOption[];
  budgetOptions?: LeadFilterOption[];
  configurationOptions?: LeadFilterOption[];
  locationOptions?: LeadFilterOption[];
  onApplyFilters?: () => void;
  onChange?: <K extends keyof FollowUpFilters>(
    key: K,
    value: FollowUpFilters[K],
  ) => void;
  onDateRangeChange?: (value: FollowUpDateRangeFilter) => void;
  onResetFilters?: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);
  const navigate = useNavigate();
  const leadBasePath =
    routeMode === "telecaller"
      ? "/telecaller/leads"
      : routeMode === "field-executive"
      ? "/field-executive/leads"
      : "/leads";
  const tableHeaders = [
    "Lead Details",
    "Project Name",
    "Executive",
    "Lead Status",
    "Lead Type",
    "Follow-up Date",
    "Last Contact",
    "Remark",
  ];
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const pageStartIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows = rows.slice(
    pageStartIndex,
    pageStartIndex + rowsPerPage,
  );
  const rangeStart = totalRows === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd =
    totalRows === 0
      ? 0
      : Math.min(pageStartIndex + paginatedRows.length, totalRows);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, rowsPerPage, totalRows]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const hasAnyFilterActive =
    (appliedLeadStatusIds && appliedLeadStatusIds.length > 0) ||
    (appliedLeadTypeIds && appliedLeadTypeIds.length > 0);

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      {/* Row 1: Quick Status Filter Buttons + Advanced Filters Toggle Button */}
      {quickLeadStatusFilters && quickLeadStatusFilters.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 pb-3">
          <div
            className="flex flex-wrap items-center gap-2"
            aria-label="Quick lead status filters"
          >
            <button
              type="button"
              aria-pressed={!hasAnyFilterActive}
              className={cn(
                "h-10 rounded-[14px] px-4 text-sm font-extrabold border-0 shadow-none transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/20",
                !hasAnyFilterActive
                  ? "bg-[#0f1b36] text-white shadow-sm hover:bg-[#162548] hover:text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900",
              )}
              onClick={() => onQuickLeadStatusFilter?.("")}
            >
              All ({allLeadsForCounts?.length ?? rows.length})
            </button>
            {quickLeadStatusFilters.map((filter) => {
              const isTemperature = filter.kind === "temperature";
              const isActive = isTemperature
                ? appliedLeadTypeIds?.includes(filter.value)
                : appliedLeadStatusIds?.includes(filter.value);
              const count = (allLeadsForCounts ?? rows).filter((lead) => {
                if (isTemperature) {
                  return (
                    lead.leadTypeId === filter.value ||
                    lead.leadType?.trim().toLowerCase() ===
                      filter.label.toLowerCase()
                  );
                }
                return (
                  lead.leadStatusId === filter.value ||
                  lead.leadStatus?.trim().toLowerCase() ===
                    filter.label.toLowerCase()
                );
              }).length;
              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  className={cn(
                    "h-10 rounded-[14px] px-4 text-sm font-extrabold border-0 shadow-none transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/20",
                    isActive
                      ? "bg-[#0f1b36] text-white shadow-sm hover:bg-[#162548] hover:text-white"
                      : getFollowUpPillTone(filter.color, filter.label),
                  )}
                  onClick={() =>
                    onQuickLeadStatusFilter?.(filter.value, filter.kind)
                  }
                >
                  {filter.label} ({count})
                </button>
              );
            })}

            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-9 rounded-md px-3 text-xs font-extrabold shadow-none",
                !isFilterCollapsed
                  ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                  : "border-slate-200 bg-white text-secondary hover:bg-slate-50",
              )}
              onClick={onToggleFilters}
              aria-expanded={!isFilterCollapsed}
              aria-label={
                isFilterCollapsed ? "Expand filters" : "Collapse filters"
              }
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Advanced filters
              <Badge
                variant="neutral"
                className="ml-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600"
              >
                {activeFilterCount} active
              </Badge>
              {isFilterCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 ml-1 text-primary" />
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Row 2 (next line to Row 1): Status Tabs & Add Action */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/40 p-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 gap-6 overflow-x-auto pb-1">
          {statusTabs.map((tab) => {
            const tabBase = tabName(tab);
            const selected = tabBase === activeTab;
            return (
              <button
                key={tab}
                type="button"
                className={cn(
                  "whitespace-nowrap border-b-2 pb-2 text-sm font-extrabold transition-colors",
                  selected
                    ? "border-blue-600 text-blue-700"
                    : tabBase.startsWith("Overdue")
                    ? "border-transparent text-red-600"
                    : "border-transparent text-secondary hover:text-blue-700",
                )}
                onClick={() => onTabChange(tabBase)}
              >
                {tab}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            className="h-9 rounded-md bg-primary px-4 text-xs font-extrabold text-white shadow-none hover:bg-primary/95"
            onClick={onAddFollowUp}
          >
            Add Follow-Up
          </Button>
        </div>
      </div>

      {/* Collapsible Advanced Filters Section */}
      {filters && onChange && onDateRangeChange ? (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out border-b border-slate-100 bg-slate-50/20",
            isFilterCollapsed
              ? "max-h-0 opacity-0 p-0 border-b-0"
              : "max-h-[1400px] opacity-100 p-4",
          )}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {adminRoute ? (
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Assigned to
                </span>
                <MultiSelect
                  value={filters.assignedToIds}
                  onValueChange={(value) => onChange("assignedToIds", value)}
                  options={ownerOptions ?? []}
                  placeholder="All owners"
                  ariaLabel="Assigned to"
                  className="min-h-10 rounded-md bg-white"
                  contentClassName="min-w-[280px]"
                  searchPlaceholder="Search owners..."
                  selectedLabelText="owner"
                  selectedLabelTextPlural="owners"
                  showTriggerIcon={false}
                  showTriggerSummary={false}
                  modal={false}
                  portaled={false}
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Follow-up status
              </span>
              <MultiSelect
                value={filters.statuses}
                onValueChange={(value) => onChange("statuses", value)}
                options={followUpStatusFilterOptions}
                placeholder="All statuses"
                ariaLabel="Follow-up status"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search status..."
                selectedLabelText="status"
                selectedLabelTextPlural="statuses"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Lead status
              </span>
              <MultiSelect
                value={filters.leadStatusIds}
                onValueChange={(value) => onChange("leadStatusIds", value)}
                options={leadStatusOptions ?? []}
                placeholder="All lead statuses"
                ariaLabel="Lead status"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search lead status..."
                selectedLabelText="status"
                selectedLabelTextPlural="statuses"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Lead type
              </span>
              <MultiSelect
                value={filters.leadTypeIds}
                onValueChange={(value) => onChange("leadTypeIds", value)}
                options={leadTypeOptions ?? []}
                placeholder="All lead types"
                ariaLabel="Lead type"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search lead type..."
                selectedLabelText="type"
                selectedLabelTextPlural="types"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Lead source
              </span>
              <MultiSelect
                value={filters.sourceIds}
                onValueChange={(value) => onChange("sourceIds", value)}
                options={sourceOptions ?? []}
                placeholder="All Source"
                ariaLabel="Lead source"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search source..."
                selectedLabelText="source"
                selectedLabelTextPlural="sources"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Project
              </span>
              <MultiSelect
                value={filters.projectIds}
                onValueChange={(value) => onChange("projectIds", value)}
                options={projectOptions ?? []}
                placeholder="All projects"
                ariaLabel="Project"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search project..."
                selectedLabelText="project"
                selectedLabelTextPlural="projects"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Budget
              </span>
              <MultiSelect
                value={filters.budgetRanges}
                onValueChange={(value) => onChange("budgetRanges", value)}
                options={budgetOptions ?? []}
                placeholder="All budgets"
                ariaLabel="Budget"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search budget..."
                selectedLabelText="budget"
                selectedLabelTextPlural="budgets"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Configuration
              </span>
              <MultiSelect
                value={filters.configurations}
                onValueChange={(value) => onChange("configurations", value)}
                options={configurationOptions ?? []}
                placeholder="All configurations"
                ariaLabel="Configuration"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search configuration..."
                selectedLabelText="configuration"
                selectedLabelTextPlural="configurations"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Location
              </span>
              <MultiSelect
                value={filters.locations}
                onValueChange={(value) => onChange("locations", value)}
                options={locationOptions ?? []}
                placeholder="All locations"
                ariaLabel="Location"
                className="min-h-10 rounded-md bg-white"
                contentClassName="min-w-[280px]"
                searchPlaceholder="Search location..."
                selectedLabelText="location"
                selectedLabelTextPlural="locations"
                showTriggerIcon={false}
                showTriggerSummary={false}
                modal={false}
                portaled={false}
              />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Date Range
              </span>
              <div className="space-y-2">
                <SearchableSelect
                  value={filters.dateRange}
                  onValueChange={(value) =>
                    onDateRangeChange(value as FollowUpDateRangeFilter)
                  }
                  options={followUpDateRangeOptions}
                  placeholder="All Date Range"
                  ariaLabel="Date Range"
                  searchPlaceholder="Search date range..."
                  className="bg-white"
                  contentClassName="min-w-[260px]"
                  modal={false}
                  portaled={false}
                />
                {filters.dateRange === "custom" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <DatePicker
                      aria-label="Follow-up range start"
                      value={filters.from}
                      max={filters.to || undefined}
                      className="h-10 rounded-md text-xs font-bold shadow-none bg-white"
                      onChange={(event) => onChange("from", event.target.value)}
                    />
                    <DatePicker
                      aria-label="Follow-up range end"
                      value={filters.to}
                      min={filters.from || undefined}
                      className="h-10 rounded-md text-xs font-bold shadow-none bg-white"
                      onChange={(event) => onChange("to", event.target.value)}
                    />
                  </div>
                ) : null}
              </div>
            </div>


            <div className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                SLA Status
              </span>
              <SearchableSelect
                value={filters.slaStatus}
                onValueChange={(value) =>
                  onChange("slaStatus", value as FollowUpSlaFilter)
                }
                options={[
                  { label: "All SLA Statuses", value: "all" },
                  { label: "On Time", value: "on-time" },
                  { label: "Due Soon", value: "due-soon" },
                  { label: "Breached", value: "breached" },
                ]}
                placeholder="All SLA Statuses"
                ariaLabel="SLA Status"
                searchPlaceholder="Search SLA status..."
                className="bg-white"
                contentClassName="min-w-[260px]"
                modal={false}
                portaled={false}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end md:col-span-2 xl:col-span-4">
              {onApplyFilters ? (
                <Button
                  type="button"
                  className="h-10 rounded-md px-6"
                  onClick={onApplyFilters}
                >
                  <Filter className="h-4 w-4" />
                  Apply Filter
                </Button>
              ) : null}
              {onResetFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-md px-5 shadow-none bg-white"
                  onClick={onResetFilters}
                >
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table className="min-w-[850px] table-fixed">
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent">
              {tableHeaders.map((head, index) => (
                <TableHead
                  key={head}
                  className={cn(
                    "h-11 whitespace-nowrap px-3 text-[11px] font-extrabold text-secondary",
                    index > 0 && "border-l border-slate-200",
                    head === "Lead Details" && "w-[124px]",
                    head === "Project Name" && "w-[150px]",
                    head === "Executive" && "w-[145px]",
                    head === "Lead Status" && "w-[112px]",
                    head === "Lead Type" && "w-[105px]",
                    head === "Follow-up Date" && "w-[126px]",
                    head === "Last Contact" && "w-[118px]",
                    head === "Remark" && "w-[210px]",
                  )}
                >
                  {head}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-100">
            {paginatedRows.map((lead) => {
              const leadRouteId = lead.leadId;
              return (
                <TableRow
                  key={lead.id}
                  className="transition-colors hover:bg-slate-50/50"
                >
                  <TableCell className="w-[124px] px-3 py-3 align-top">
                    <div className="min-w-0">
                      <button
                        type="button"
                        className="block max-w-full truncate text-left text-xs font-extrabold text-secondary hover:text-blue-700 hover:underline"
                        title={lead.name}
                        onClick={() => {
                          if (!leadRouteId) {
                            toast.error(
                              "Lead reference is missing for this follow-up",
                            );
                            return;
                          }
                          setPreviewLeadId(leadRouteId);
                        }}
                      >
                        {lead.name}
                      </button>
                      <p className="truncate text-[11px] font-semibold text-muted-foreground">
                        {lead.mobile}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-muted-foreground">
                        {lead.source}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell
                    className="w-[150px] cursor-pointer border-l border-slate-100 px-3 py-3 align-top text-xs font-semibold text-secondary hover:bg-slate-50"
                    onClick={() => onUpdateLead(lead)}
                  >
                    <p className="truncate font-extrabold">
                      {lead.projectName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {lead.property}
                    </p>
                  </TableCell>
                  <TableCell
                    className="w-[145px] cursor-pointer border-l border-slate-100 px-3 py-3 align-top text-xs font-semibold text-secondary hover:bg-slate-50"
                    onClick={() => onAssignLead(lead)}
                  >
                    <p className="truncate font-extrabold">
                      {lead.executiveName}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {lead.owner}
                    </p>
                  </TableCell>
                  <TableCell
                    className="w-[112px] cursor-pointer border-l border-slate-100 px-3 py-3 align-top hover:bg-slate-50"
                    onClick={() => onUpdateLead(lead)}
                  >
                    <Badge className="border-0 bg-blue-100 text-[10px] font-extrabold text-blue-700">
                      {lead.leadStatus}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="w-[105px] cursor-pointer border-l border-slate-100 px-3 py-3 align-top hover:bg-slate-50"
                    onClick={() => onUpdateLead(lead)}
                  >
                    <Badge className="border border-green-200 bg-green-50 text-[10px] font-extrabold text-success">
                      {lead.leadType}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="w-[126px] cursor-pointer border-l border-slate-100 px-3 py-3 align-top text-xs font-semibold text-secondary hover:bg-slate-50"
                    onClick={() => onEditLead(lead)}
                  >
                    <p className="font-extrabold text-blue-700">
                      {lead.dateGroup}
                    </p>
                    <p>{lead.time}</p>
                  </TableCell>
                  <TableCell className="w-[118px] border-l border-slate-100 px-3 py-3 align-top text-xs font-semibold text-secondary">
                    <p>{lead.lastContact}</p>
                    <p>{lead.lastContactTime}</p>
                    <Badge
                      className={cn(
                        "mt-1 border-0 text-[10px] font-extrabold",
                        statusTone(lead.status),
                      )}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="w-[210px] cursor-pointer border-l border-slate-100 px-3 py-3 align-top hover:bg-slate-50"
                    onClick={() => onOpenRemarks(lead)}
                  >
                    <p className="line-clamp-2 text-xs font-semibold leading-5 text-secondary">
                      {lead.remark}
                    </p>
                  </TableCell>
                </TableRow>
              );
            })}
            {totalRows === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tableHeaders.length}
                  className="px-4 py-10 text-center text-sm font-semibold text-muted-foreground"
                >
                  No follow-ups found for the selected filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          {totalRows === 0
            ? "Showing 0 of 0 follow-ups"
            : `Showing ${rangeStart} to ${rangeEnd} of ${totalRows} follow-ups`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[76px] text-center text-xs font-bold text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            disabled={currentPage >= totalPages}
            onClick={() =>
              setCurrentPage((page) => Math.min(totalPages, page + 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => setRowsPerPage(Number(value))}
          >
            <SelectTrigger className="h-8 w-[120px] rounded-md text-xs font-bold shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Rows 10</SelectItem>
              <SelectItem value="25">Rows 25</SelectItem>
              <SelectItem value="50">Rows 50</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <LeadPreviewDialog
        leadId={previewLeadId}
        open={Boolean(previewLeadId)}
        onOpenChange={(open) => {
          if (!open) setPreviewLeadId(null);
        }}
        onOpenDetails={(leadId) => {
          setPreviewLeadId(null);
          navigate(`${leadBasePath}/${leadId}`);
        }}
      />
    </Card>
  );
}

function RightRail({
  selectedDate,
  onDateSelect,
  overdueLeads,
  onQuickAction,
  onViewAllOverdue,
}: {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  overdueLeads: FollowUpLead[];
  onQuickAction: (label: string) => void;
  onViewAllOverdue: () => void;
}) {
  const quickActions = [
    {
      label: "Add Follow-Up",
      helper: "Schedule a new follow-up",
      icon: CalendarClock,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "View Today Queue",
      helper: "Focus on today’s active queue",
      icon: CalendarDays,
      tone: "bg-orange-50 text-primary",
    },
    {
      label: "Review Overdue",
      helper: "Handle delayed follow-ups first",
      icon: CheckCircle2,
      tone: "bg-red-50 text-red-600",
    },
  ];

  return (
    <aside className="space-y-5">
      <CalendarCard selectedDate={selectedDate} onDateSelect={onDateSelect} />
      <Panel
        title={`Overdue Follow-Ups (${overdueLeads.length})`}
        action={
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-1 text-xs font-extrabold text-blue-700 hover:bg-slate-50"
            onClick={onViewAllOverdue}
          >
            View All
          </Button>
        }
      >
        <div className="space-y-4">
          {overdueLeads.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-slate-50"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={item.ownerAvatarUrl} alt={item.name} />
                <AvatarFallback>{item.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-secondary">
                  {item.name}
                </p>
                <p className="truncate text-xs font-semibold text-muted-foreground">
                  {item.property}
                </p>
              </div>
              <span className="shrink-0 text-xs font-extrabold text-red-600">
                Overdue
              </span>
            </div>
          ))}
          {overdueLeads.length === 0 ? (
            <p className="py-2 text-center text-xs font-semibold text-muted-foreground">
              No overdue follow-ups!
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-md text-xs font-extrabold shadow-none hover:bg-slate-50"
            onClick={onViewAllOverdue}
          >
            View All Overdue
          </Button>
        </div>
      </Panel>
      <Panel title="Quick Actions">
        <div className="space-y-1">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                className="h-auto w-full justify-between rounded-md px-2 py-3 text-left hover:bg-slate-50"
                onClick={() => onQuickAction(action.label)}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      action.tone,
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-extrabold text-secondary">
                      {action.label}
                    </span>
                    <span className="block text-xs font-semibold text-muted-foreground">
                      {action.helper}
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-blue-700" />
              </Button>
            );
          })}
        </div>
      </Panel>
    </aside>
  );
}

function AnalyticsCards({ rows }: { rows: FollowUpLead[] }) {
  const performanceList = useMemo(() => {
    const completedCount = rows.filter(
      (row) => row.status === "Completed",
    ).length;
    const pendingCount = rows.filter(
      (row) => row.status !== "Completed",
    ).length;
    const contactedCount = rows.filter(
      (row) => row.lastContact !== "Never",
    ).length;
    const dueTodayCount = rows.filter(
      (row) =>
        row.dateGroup === "Today" &&
        row.status !== "Completed" &&
        row.status !== "Overdue",
    ).length;
    const timeSlots = [
      {
        time: "09 AM",
        count: rows.filter((row) => row.time.includes("09:")).length,
      },
      {
        time: "11 AM",
        count: rows.filter((row) => row.time.includes("11:")).length,
      },
      {
        time: "02 PM",
        count: rows.filter((row) => row.time.includes("02:")).length,
      },
      {
        time: "05 PM",
        count: rows.filter((row) => row.time.includes("05:")).length,
      },
    ];
    const bestSlot = [...timeSlots].sort(
      (left, right) => right.count - left.count,
    )[0];

    return [
      {
        label: "Completed",
        value: String(completedCount),
        change: `${completedCount} done`,
        tone: "text-success",
      },
      {
        label: "Pending",
        value: String(pendingCount),
        change: `${dueTodayCount} due today`,
        tone: "text-blue-700",
      },
      {
        label: "Contacted",
        value: String(contactedCount),
        change: `${
          rows.length ? Math.round((contactedCount / rows.length) * 100) : 0
        }%`,
        tone: "text-violet-700",
      },
      {
        label: "Best Slot",
        value: bestSlot?.time ?? "--",
        change: `${bestSlot?.count ?? 0} follow-ups`,
        tone: "text-primary",
      },
    ];
  }, [rows]);

  return (
    <section className="grid items-start gap-5 xl:grid-cols-[1fr_0.85fr]">
      <Panel title="Follow-Up Performance">
        <p className="-mt-3 mb-4 text-xs font-semibold text-muted-foreground">
          Live queue summary
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {performanceList.map((metric) => (
            <div
              key={metric.label}
              className="min-w-0 rounded-md border border-slate-200 bg-slate-50/70 p-3"
            >
              <p className={cn("truncate text-xs font-extrabold", metric.tone)}>
                {metric.label}
              </p>
              <div className="mt-2 flex min-w-0 items-end justify-between gap-2">
                <span
                  className={cn(
                    "truncate text-2xl font-extrabold leading-none",
                    metric.tone,
                  )}
                >
                  {metric.value}
                </span>
                <span className="min-w-0 text-right text-[11px] font-extrabold leading-4 text-success">
                  {metric.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Best Time to Follow-Up">
        <p className="-mt-3 mb-4 text-xs font-semibold text-muted-foreground">
          Derived from scheduled slots in the current queue
        </p>
        <div className="grid gap-3 sm:grid-cols-4">
          {["09 AM", "11 AM", "02 PM", "05 PM"].map((slot, index) => {
            const count = rows.filter((row) =>
              row.time.includes(slot.split(" ")[0]),
            ).length;
            return (
              <div
                key={slot}
                className={cn(
                  "rounded-md border border-slate-200 p-3",
                  index === 1 && "border-green-100 bg-green-50/50",
                )}
              >
                <p className="text-sm font-extrabold text-blue-900">{slot}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Scheduled
                  </span>
                  <span className="text-sm font-extrabold text-blue-700">
                    {count}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

export function FollowUpLeadsScreen() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTabName, setActiveTabName] = useState(() =>
    new URLSearchParams(location.search).get("queue") === "today-pending"
      ? "Today"
      : "All Follow-Ups",
  );
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [draftFilters, setDraftFilters] = useState<FollowUpFilters>(() =>
    getInitialFollowUpFilters(location.search),
  );
  const [appliedFilters, setAppliedFilters] = useState<FollowUpFilters>(() =>
    getInitialFollowUpFilters(location.search),
  );
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [reschedulingLead, setReschedulingLead] = useState<FollowUpLead | null>(
    null,
  );
  const [updatingLead, setUpdatingLead] = useState<FollowUpLead | null>(null);
  const [assigningLead, setAssigningLead] = useState<FollowUpLead | null>(null);
  const [remarkLead, setRemarkLead] = useState<FollowUpLead | null>(null);
  const [completionLead, setCompletionLead] = useState<FollowUpLead | null>(
    null,
  );
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [completionCallOutcome, setCompletionCallOutcome] =
    useState<string>("Connected");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [formProperty, setFormProperty] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formDate, setFormDate] = useState(getTodayDateString());
  const [formTime, setFormTime] = useState("10:00 AM");
  const [formNotes, setFormNotes] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [formAssignedToId, setFormAssignedToId] = useState("");

  const routeMode: RouteMode = location.pathname.startsWith("/telecaller/")
    ? "telecaller"
    : location.pathname.startsWith("/field-executive/")
    ? "field-executive"
    : "admin";
  const telecallerRoute = routeMode === "telecaller";
  const fieldExecutiveRoute = routeMode === "field-executive";
  const adminRoute = routeMode === "admin";
  const employeeFollowUpRoute = telecallerRoute || fieldExecutiveRoute;
  const appliedDateRange = useMemo(
    () => resolveFollowUpDateRange(appliedFilters),
    [appliedFilters],
  );
  const activeFilterCount = countActiveFollowUpFilters(appliedFilters);

  const followUpsQuery = useFollowUpsList({
    search,
    dateFrom: appliedDateRange.from || undefined,
    dateTo: appliedDateRange.to || undefined,
    limit: 500,
  });
  const leadOptionsQuery = useAllLeads("");
  const leadFilterOptions = useLeadListFilterOptions();
  const updateFieldPermissions = useLeadUpdateFieldPermissions();
  const bulkAssign = useBulkAssignSelectedLeads();
  const bulkPatch = useBulkPatchSelectedLeads();
  const queryClient = useQueryClient();
  const { createFollowUp, updateFollowUp } = useFollowUpMutations();
  const enabledUpdateFields = updateFieldPermissions.query.data
    ?.enabledFields ?? [
    "status",
    "leadType",
    "projectName",
    "executive",
    "budget",
    "location",
    "configuration",
    "followUpDate",
    "remark",
  ];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("queue") !== "today-pending") return;

    const nextFilters = getInitialFollowUpFilters(location.search);
    setActiveTabName("Today");
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }, [location.search]);

  const followUpRecords = useMemo(
    () => followUpsQuery.data?.data ?? [],
    [followUpsQuery.data?.data],
  );
  const leads = useMemo(() => {
    const rawList = followUpRecords.map((record: FollowUpWorkspaceApiRecord) => {
      const lead = mapApiFollowUpToLead(record);
      return employeeFollowUpRoute
        ? { ...lead, type: "Call" as const }
        : lead;
    });

    const map = new Map<string, FollowUpLead>();
    for (const item of rawList) {
      const cleanMobile = item.mobile ? String(item.mobile).replace(/\D/g, "") : "";
      const key =
        item.leadId ||
        (cleanMobile.length >= 10 ? cleanMobile.slice(-10) : "") ||
        (item.name && item.name !== "Lead" ? item.name.toLowerCase().trim() : "") ||
        item.id;

      const existing = map.get(key);
      if (!existing) {
        map.set(key, item);
        continue;
      }
      const itemIsPending = item.status !== "Completed";
      const existingIsPending = existing.status !== "Completed";

      if (itemIsPending && !existingIsPending) {
        map.set(key, item);
      } else if (itemIsPending === existingIsPending) {
        const itemTime = parseScheduledDateTime(item.scheduledAt)?.getTime() ?? 0;
        const existingTime = parseScheduledDateTime(existing.scheduledAt)?.getTime() ?? 0;
        if (itemTime >= existingTime) {
          map.set(key, item);
        }
      }
    }
    return Array.from(map.values());
  }, [followUpRecords, employeeFollowUpRoute]);

  const leadOptions = useMemo(
    () =>
      (leadOptionsQuery.data?.rows ?? []).map((lead) => ({
        label: `${lead.name} (${lead.mobile})`,
        value: lead.backendId ?? lead.id,
        className: "text-xs font-semibold",
      })),
    [leadOptionsQuery.data?.rows],
  );

  const leadOptionMap = useMemo(
    () =>
      new Map(
        (leadOptionsQuery.data?.rows ?? []).map((lead) => [
          lead.backendId ?? lead.id,
          lead,
        ]),
      ),
    [leadOptionsQuery.data?.rows],
  );

  const projectOptions = useMemo(
    () =>
      projectsCatalog.map((project) => ({
        label: `${project.name} (${project.location})`,
        value: project.id,
        className: "text-xs font-semibold",
      })),
    [],
  );

  const projectOptionMap = useMemo(
    () => new Map(projectsCatalog.map((project) => [project.id, project])),
    [],
  );

  const selectedProject = selectedProjectId
    ? projectOptionMap.get(selectedProjectId)
    : undefined;
  const selectedLead = selectedLeadId
    ? leadOptionMap.get(selectedLeadId)
    : undefined;
  const updatingLeadRow = updatingLead?.leadId
    ? leadOptionMap.get(updatingLead.leadId)
    : undefined;
  const completionRequiresCallOutcome = employeeFollowUpRoute;

  const unitOptions = useMemo(
    () =>
      (selectedProject?.units ?? []).map((unit) => ({
        label: formatProjectUnitLabel(unit),
        value: unit.id,
        className: "text-xs font-semibold",
      })),
    [selectedProject],
  );

  const followUpAssigneeOptions = useMemo(() => {
    if (!selectedLead) {
      return [];
    }

    return [
      selectedLead.telecallerId && selectedLead.telecallerName
        ? {
            value: selectedLead.telecallerId,
            label: `${selectedLead.telecallerName} (Pre Sales Executive)`,
            className: "text-xs font-semibold",
          }
        : null,
      selectedLead.fieldExecutiveId && selectedLead.fieldExecutiveName
        ? {
            value: selectedLead.fieldExecutiveId,
            label: `${selectedLead.fieldExecutiveName} (Sales Executive)`,
            className: "text-xs font-semibold",
          }
        : null,
      selectedLead.ownerId &&
      selectedLead.ownerName &&
      selectedLead.ownerId !== selectedLead.telecallerId &&
      selectedLead.ownerId !== selectedLead.fieldExecutiveId
        ? {
            value: selectedLead.ownerId,
            label: `${selectedLead.ownerName} (Owner)`,
            className: "text-xs font-semibold",
          }
        : null,
    ].filter(Boolean) as Array<{
      value: string;
      label: string;
      className: string;
    }>;
  }, [selectedLead]);

  const assignableOptions = useMemo(() => {
    if (!adminRoute) {
      return [];
    }
    const seen = new Map<string, string>();
    followUpRecords.forEach((record: FollowUpWorkspaceApiRecord) => {
      if (record.assignedToId && record.assignedToName) {
        seen.set(record.assignedToId, record.assignedToName);
      }
    });
    return Array.from(seen.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [adminRoute, followUpRecords]);
  const ownerFilterOptions = useMemo(
    () =>
      assignableOptions.map((option) => ({
        ...option,
        avatarUrl: avatar(option.label),
      })),
    [assignableOptions],
  );
  const telecallerAssignOptions = useMemo(
    () =>
      leadFilterOptions.options.telecallerOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    [leadFilterOptions.options.telecallerOptions],
  );
  const fieldExecutiveAssignOptions = useMemo(
    () =>
      leadFilterOptions.options.ownerOptions
        .filter((option) => option.role === "SALES_AGENT")
        .map((option) => ({
          label: option.label,
          value: option.value,
        })),
    [leadFilterOptions.options.ownerOptions],
  );

  const handleFilterChange = <K extends keyof FollowUpFilters>(
    key: K,
    value: FollowUpFilters[K],
  ) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const handleDateRangeChange = (value: FollowUpDateRangeFilter) => {
    setDraftFilters((current) => ({
      ...current,
      dateRange: value,
      from: value === "custom" ? current.from : "",
      to: value === "custom" ? current.to : "",
    }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setFiltersCollapsed(true);
  };

  const handleResetFilters = () => {
    setDraftFilters(initialFollowUpFilters);
    setAppliedFilters(initialFollowUpFilters);
  };

  const cardPreferences = useLeadCardPreferences("follow_up");

  const statsList = useMemo(() => {
    const todayLeads = leads.filter(
      (lead: FollowUpLead) =>
        lead.dateGroup === "Today" &&
        lead.status !== "Completed" &&
        lead.status !== "Overdue",
    );
    const overdueLeads = leads.filter(
      (lead: FollowUpLead) => lead.status === "Overdue",
    );
    const upcomingLeads = leads.filter(
      (lead: FollowUpLead) =>
        lead.status === "Upcoming" || lead.status === "Due Soon",
    );
    const completedLeads = leads.filter(
      (lead: FollowUpLead) => lead.status === "Completed",
    );
    const pendingLeads = leads.filter(
      (lead: FollowUpLead) => lead.status !== "Completed",
    );

    const getFollowUpStatusTone = (colorOrName?: string): string => {
      if (!colorOrName) return "bg-blue-50 text-blue-700";
      const norm = colorOrName.toLowerCase();
      if (
        norm.includes("green") ||
        norm.includes("#059669") ||
        norm.includes("#16a34a")
      )
        return "bg-green-50 text-success";
      if (
        norm.includes("orange") ||
        norm.includes("red") ||
        norm.includes("#ea580c") ||
        norm.includes("#dc2626") ||
        norm.includes("#e11d48")
      )
        return "bg-orange-50 text-primary";
      if (norm.includes("blue") || norm.includes("#2563eb"))
        return "bg-blue-50 text-blue-700";
      if (
        norm.includes("violet") ||
        norm.includes("purple") ||
        norm.includes("#7c3aed")
      )
        return "bg-violet-50 text-violet-700";
      if (
        norm.includes("cyan") ||
        norm.includes("#0284c7") ||
        norm.includes("#0891b2")
      )
        return "bg-cyan-50 text-cyan-700";
      return "bg-blue-50 text-blue-700";
    };

    const configuredCards = cardPreferences.statsCards;

    if (configuredCards.length > 0) {
      return configuredCards.map((item) => {
        if (
          item.id === "core:today-followups" ||
          item.name.toLowerCase().includes("today's follow-up")
        ) {
          return {
            label: item.name,
            value: String(todayLeads.length),
            change: `${
              leads.filter((lead: FollowUpLead) => lead.dateGroup === "Today")
                .length
            } total`,
            helper: item.description || "Due in the current queue",
            icon: CalendarCheck,
            tone: item.displayColor
              ? getFollowUpStatusTone(item.displayColor)
              : "bg-blue-50 text-blue-700",
          };
        }

        if (
          item.id === "core:overdue-followups" ||
          item.name.toLowerCase().includes("overdue")
        ) {
          return {
            label: item.name,
            value: String(overdueLeads.length),
            change: `${overdueLeads.length} delayed`,
            helper: item.description || "Needs immediate attention",
            icon: TrendingUp,
            tone: item.displayColor
              ? getFollowUpStatusTone(item.displayColor)
              : "bg-orange-50 text-primary",
          };
        }

        if (
          item.id === "core:upcoming-followups" ||
          item.name.toLowerCase().includes("upcoming")
        ) {
          return {
            label: item.name,
            value: String(upcomingLeads.length),
            change: `${
              leads.filter((lead: FollowUpLead) => lead.status === "Upcoming")
                .length
            } upcoming`,
            helper: item.description || "Scheduled next actions",
            icon: CalendarDays,
            tone: item.displayColor
              ? getFollowUpStatusTone(item.displayColor)
              : "bg-green-50 text-success",
          };
        }

        if (
          item.id === "core:completed-followups" ||
          item.name.toLowerCase().includes("completed")
        ) {
          return {
            label: item.name,
            value: String(completedLeads.length),
            change: `${completedLeads.length} closed`,
            helper: item.description || "Marked complete",
            icon: CheckCircle2,
            tone: item.displayColor
              ? getFollowUpStatusTone(item.displayColor)
              : "bg-violet-50 text-violet-700",
          };
        }

        if (
          item.id === "core:pending-queue" ||
          item.name.toLowerCase().includes("pending")
        ) {
          return {
            label: item.name,
            value: String(pendingLeads.length),
            change: `${leads.length} total`,
            helper: item.description || "Open follow-up workload",
            icon: CalendarClock,
            tone: item.displayColor
              ? getFollowUpStatusTone(item.displayColor)
              : "bg-blue-50 text-blue-700",
          };
        }

        if (item.category === "lead_type") {
          const count = leads.filter(
            (lead: FollowUpLead) =>
              lead.leadTypeId === item.id ||
              (lead.leadType &&
                lead.leadType.toLowerCase().includes(item.name.toLowerCase())),
          ).length;
          return {
            label: item.name,
            value: String(count),
            change: `${count} leads`,
            helper: item.description || "Lead classification",
            icon: TrendingUp,
            tone: getFollowUpStatusTone(item.displayColor || "orange"),
          };
        }

        const count = leads.filter(
          (lead: FollowUpLead) =>
            lead.leadStatusId === item.id ||
            (lead.leadStatus &&
              lead.leadStatus.toLowerCase().includes(item.name.toLowerCase())),
        ).length;
        return {
          label: item.name,
          value: String(count),
          change: `${count} leads`,
          helper: item.description || "Pipeline status",
          icon: CalendarCheck,
          tone: getFollowUpStatusTone(item.displayColor || "blue"),
        };
      });
    }

    return [
      {
        label: "Today's Follow-Ups",
        value: String(todayLeads.length),
        change: `${
          leads.filter((lead: FollowUpLead) => lead.dateGroup === "Today")
            .length
        } total`,
        helper: "Due in the current queue",
        icon: CalendarCheck,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        label: "Overdue Follow-Ups",
        value: String(overdueLeads.length),
        change: `${overdueLeads.length} delayed`,
        helper: "Needs immediate attention",
        icon: TrendingUp,
        tone: "bg-orange-50 text-primary",
      },
      {
        label: "Upcoming Follow-Ups",
        value: String(upcomingLeads.length),
        change: `${
          leads.filter((lead: FollowUpLead) => lead.status === "Upcoming")
            .length
        } upcoming`,
        helper: "Scheduled next actions",
        icon: CalendarDays,
        tone: "bg-green-50 text-success",
      },
      {
        label: "Completed Today",
        value: String(completedLeads.length),
        change: `${completedLeads.length} closed`,
        helper: "Marked complete",
        icon: CheckCircle2,
        tone: "bg-violet-50 text-violet-700",
      },
      {
        label: "Pending Queue",
        value: String(pendingLeads.length),
        change: `${leads.length} total`,
        helper: "Open follow-up workload",
        icon: CalendarClock,
        tone: "bg-blue-50 text-blue-700",
      },
    ];
  }, [leads, cardPreferences.statsCards]);

  const statusTabs = useMemo(
    () => [
      `All Follow-Ups (${leads.length})`,
      `Today (${
        leads.filter(
          (lead: FollowUpLead) =>
            lead.dateGroup === "Today" &&
            lead.status !== "Completed" &&
            lead.status !== "Overdue",
        ).length
      })`,
      `Overdue (${
        leads.filter((lead: FollowUpLead) => lead.status === "Overdue").length
      })`,
      `Upcoming (${
        leads.filter(
          (lead: FollowUpLead) =>
            lead.status === "Upcoming" || lead.status === "Due Soon",
        ).length
      })`,
      `Completed (${
        leads.filter((lead: FollowUpLead) => lead.status === "Completed").length
      })`,
    ],
    [leads],
  );

  const filteredRows = useMemo(
    () =>
      leads.filter((lead: FollowUpLead) => {
        const scheduledAt = parseScheduledDateTime(lead.scheduledAt);
        const from = appliedDateRange.from
          ? new Date(appliedDateRange.from)
          : null;
        const to = appliedDateRange.to ? new Date(appliedDateRange.to) : null;
        const tabMatches =
          activeTabName === "All Follow-Ups" ||
          (activeTabName === "Today" &&
            lead.dateGroup === "Today" &&
            lead.status !== "Completed" &&
            lead.status !== "Overdue") ||
          (activeTabName === "Overdue" && lead.status === "Overdue") ||
          (activeTabName === "Upcoming" &&
            (lead.status === "Upcoming" || lead.status === "Due Soon")) ||
          (activeTabName === "Completed" && lead.status === "Completed");
        const ownerMatches =
          !adminRoute ||
          appliedFilters.assignedToIds.length === 0 ||
          appliedFilters.assignedToIds.includes(lead.assignedToId ?? "");
        const statusMatches =
          appliedFilters.statuses.length === 0 ||
          appliedFilters.statuses.includes(lead.status);
        const dateMatches =
          !scheduledAt ||
          ((!from || scheduledAt >= from) && (!to || scheduledAt <= to));
        const slaMatches = followUpSlaMatches(
          lead.status,
          appliedFilters.slaStatus,
        );
        const sourceMatches = selectedOptionMatches(
          appliedFilters.sourceIds,
          lead.sourceId,
          lead.source,
          leadFilterOptions.options.sourceOptions,
        );
        const leadStatusMatches = selectedOptionMatches(
          appliedFilters.leadStatusIds,
          lead.leadStatusId,
          lead.leadStatus,
          leadFilterOptions.options.statusOptions,
        );
        const leadTypeMatches = selectedOptionMatches(
          appliedFilters.leadTypeIds,
          lead.leadTypeId,
          lead.leadType,
          leadFilterOptions.options.leadTypeOptions,
        );
        const projectMatches = selectedOptionMatches(
          appliedFilters.projectIds,
          lead.preferredProjectId,
          lead.projectName,
          projectOptions,
        );
        const budgetMatches = selectedOptionMatches(
          appliedFilters.budgetRanges,
          lead.budgetRange,
          lead.budgetRange,
          leadFilterOptions.options.budgetOptions,
        );
        const configurationMatches = selectedOptionMatches(
          appliedFilters.configurations,
          lead.configuration,
          lead.configuration,
          leadFilterOptions.options.configurationOptions,
        );
        const locationMatches = selectedOptionMatches(
          appliedFilters.locations,
          lead.preferredLocation,
          lead.preferredLocation,
          leadFilterOptions.options.areaOptions,
        );

        return (
          tabMatches &&
          ownerMatches &&
          statusMatches &&
          dateMatches &&
          slaMatches &&
          sourceMatches &&
          leadStatusMatches &&
          leadTypeMatches &&
          projectMatches &&
          budgetMatches &&
          configurationMatches &&
          locationMatches &&
          (!search ||
            lead.name.toLowerCase().includes(search.toLowerCase()) ||
            lead.property.toLowerCase().includes(search.toLowerCase()) ||
            lead.mobile.toLowerCase().includes(search.toLowerCase()))
        );
      }),
    [
      activeTabName,
      adminRoute,
      appliedDateRange.from,
      appliedDateRange.to,
      appliedFilters.assignedToIds,
      appliedFilters.budgetRanges,
      appliedFilters.configurations,
      appliedFilters.slaStatus,
      appliedFilters.leadStatusIds,
      appliedFilters.leadTypeIds,
      appliedFilters.locations,
      appliedFilters.projectIds,
      appliedFilters.sourceIds,
      appliedFilters.statuses,
      leadFilterOptions.options.areaOptions,
      leadFilterOptions.options.budgetOptions,
      leadFilterOptions.options.configurationOptions,
      leadFilterOptions.options.leadTypeOptions,
      leadFilterOptions.options.sourceOptions,
      leadFilterOptions.options.statusOptions,
      leads,
      projectOptions,
      search,
    ],
  );

  const quickLeadStatusFilters = useMemo(() => {
    if (cardPreferences.filterPills.length > 0) {
      return cardPreferences.filterPills.map((pill) => ({
        label: pill.name,
        value: pill.id,
        kind:
          pill.category === "lead_type"
            ? ("temperature" as const)
            : ("status" as const),
        color: pill.displayColor,
      }));
    }

    const defaultLabels = [
      "New Lead",
      "Interested",
      "Hot Lead",
      "Site Visit Schedule",
      "Site Visit Done",
      "Revisit Done",
    ];
    return defaultLabels.map((label) => {
      const match = leadFilterOptions.options.statusOptions.find(
        (opt) => opt.label.trim().toLowerCase() === label.toLowerCase(),
      );
      return {
        label,
        value: match?.value ?? label,
        kind: "status" as const,
      };
    });
  }, [cardPreferences.filterPills, leadFilterOptions.options.statusOptions]);

  const handleQuickLeadStatusFilter = (
    statusId: string,
    kind?: "status" | "temperature",
  ) => {
    if (!statusId) {
      const nextFilters = {
        ...appliedFilters,
        leadStatusIds: [],
        leadTypeIds: [],
      };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
      return;
    }

    if (kind === "temperature") {
      const nextLeadTypeIds =
        appliedFilters.leadTypeIds.length === 1 &&
        appliedFilters.leadTypeIds[0] === statusId
          ? []
          : [statusId];
      const nextFilters = {
        ...appliedFilters,
        leadTypeIds: nextLeadTypeIds,
      };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
    } else {
      const nextLeadStatusIds =
        appliedFilters.leadStatusIds.length === 1 &&
        appliedFilters.leadStatusIds[0] === statusId
          ? []
          : [statusId];
      const nextFilters = {
        ...appliedFilters,
        leadStatusIds: nextLeadStatusIds,
      };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
    }
  };

  const resetScheduleForm = () => {
    setReschedulingLead(null);
    setSelectedLeadId("");
    setFormAssignedToId("");
    setSelectedProjectId("");
    setSelectedUnitId("");
    setFormProperty("");
    setFormMobile("");
    setFormDate(getTodayDateString());
    setFormTime("10:00 AM");
    setFormNotes("");
  };

  const syncProjectSelection = (projectId: string) => {
    setSelectedProjectId(projectId);

    const project = projectOptionMap.get(projectId);
    if (!project) {
      setSelectedUnitId("");
      setFormProperty("");
      return;
    }

    const defaultUnit =
      project.units.find((unit) => unit.availability === "Available") ??
      project.units[0];

    if (!defaultUnit) {
      setSelectedUnitId("");
      setFormProperty(formatPropertyDetail(project.name, project.location));
      return;
    }

    setSelectedUnitId(defaultUnit.id);
    setFormProperty(
      formatPropertyDetail(project.name, project.location, defaultUnit),
    );
  };

  const syncUnitSelection = (unitId: string) => {
    setSelectedUnitId(unitId);

    if (!selectedProject) {
      return;
    }

    const unit = selectedProject.units.find((item) => item.id === unitId);
    setFormProperty(
      formatPropertyDetail(
        selectedProject.name,
        selectedProject.location,
        unit,
      ),
    );
  };

  const handleOpenCreate = () => {
    resetScheduleForm();
    setIsScheduleOpen(true);
  };

  const handleRescheduleLead = (lead: FollowUpLead) => {
    setReschedulingLead(lead);
    setSelectedLeadId(lead.leadId ?? "");
    setFormAssignedToId(lead.assignedToId ?? "");
    setFormProperty(lead.property);
    setFormMobile(lead.mobile);
    setFormDate(
      lead.dateGroup === "Tomorrow"
        ? getTomorrowDateString()
        : getTodayDateString(),
    );
    setFormTime(lead.time);
    setFormNotes(lead.remark === "No remarks added" ? "" : lead.remark);
    setIsScheduleOpen(true);
  };

  const handleOpenLeadUpdate = (lead: FollowUpLead) => {
    setUpdatingLead(lead);
  };

  const handleOpenAssignLead = (lead: FollowUpLead) => {
    if (!adminRoute) {
      setUpdatingLead(lead);
      return;
    }
    setAssigningLead(lead);
  };

  const handleOpenRemarks = (lead: FollowUpLead) => {
    setRemarkLead(lead);
  };

  const handleSaveLeadAssignment = async (
    leadId: string,
    assignments: Array<{
      toUserId: string;
      assigneeType: "telecaller" | "field-executive";
    }>,
  ) => {
    await bulkAssign.mutateAsync({
      leadIds: [leadId],
      assignments,
      strategy: "manual",
      reason: "Assign lead from follow-up workspace",
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["leads"] }),
      queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] }),
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    ]);
    toast.success("Lead assigned");
    setAssigningLead(null);
  };

  const handleSaveLeadUpdate = async (
    leadId: string,
    payloadWithFollowUp: Record<string, string | boolean>,
  ) => {
    const {
      followUpId,
      nextScheduledAt,
      nextAssignedToId,
      completed,
      notes,
      ...leadPayload
    } = payloadWithFollowUp;
    const finalPayload: Record<string, any> = { ...leadPayload };

    if (nextScheduledAt) {
      finalPayload.nextFollowUpAt = String(nextScheduledAt);
    }

    try {
      await bulkPatch.mutateAsync({
        leadIds: [leadId],
        payload: finalPayload,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["lead-remarks", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);

      toast.success(
        nextScheduledAt
          ? "Lead status and follow-up updated"
          : "Lead status updated",
      );
      setUpdatingLead(null);
    } catch {
      toast.error("Could not update lead");
    }
  };

  // const handleCompleteLead = (lead: FollowUpLead) => {
  //   setCompletionLead(lead);
  //   setCompletionRemarks("");
  //   setCompletionCallOutcome("Connected");
  // };

  const handleConfirmComplete = () => {
    if (!completionLead?.leadId) {
      toast.error("Lead context is missing for this follow-up");
      return;
    }
    if (!completionRemarks.trim()) {
      toast.error(
        completionRequiresCallOutcome
          ? "Add the call summary before completing this follow-up"
          : "Add completion remarks before completing this follow-up",
      );
      return;
    }
    const completionNote = formatCompletionNotes(
      completionRemarks,
      completionCallOutcome,
    );

    updateFollowUp.mutate(
      {
        leadId: completionLead.leadId,
        followUpId: completionLead.id,
        payload: {
          completed: true,
          status: "Completed",
          remarks: completionNote,
          notes: completionNote,
        },
      },
      {
        onSuccess: () => {
          toast.success("Follow-up marked completed");
          setCompletionLead(null);
          setCompletionRemarks("");
          setCompletionCallOutcome("Connected");
        },
        onError: () => toast.error("Unable to complete follow-up"),
      },
    );
  };

  const handleQuickAction = (label: string) => {
    if (label === "Add Follow-Up") {
      handleOpenCreate();
      return;
    }
    if (label === "View Today Queue") {
      setActiveTabName("Today");
      return;
    }
    if (label === "Review Overdue") {
      setActiveTabName("Overdue");
    }
  };

  const handleDateSelect = (date: string) => {
    if (date === "20") {
      setActiveTabName("Today");
      return;
    }
    setActiveTabName("Upcoming");
  };

  const currentSidebarItems = fieldExecutiveRoute
    ? fieldExecutiveSidebarItems
    : telecallerRoute
    ? telecallerSidebarItems
    : addLeadSidebarItems;
  const activeSidebarItem = fieldExecutiveRoute
    ? "Follow-ups"
    : telecallerRoute
    ? "Follow-Ups"
    : "Lead Management";
  const selectedCalendarDate = activeTabName === "Today" ? "20" : "21";

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={currentSidebarItems}
        activeItem={activeSidebarItem}
        activeChild={adminRoute ? "Follow-Up Leads" : undefined}
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
              {adminRoute ? (
                <>
                  <span>Lead Management</span>
                  <ChevronRight className="size-3.5" />
                  <span className="text-foreground">Follow-Up Leads</span>
                </>
              ) : (
                <span className="text-foreground">My Follow-Ups</span>
              )}
            </div>
          }
        >
          <div className="flex w-full items-center gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search follow-ups"
                value={search}
                placeholder="Search leads, projects, or mobile number..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                Cmd K
              </span>
            </div>
          </div>
        </DashboardHeader>

        <main className="space-y-5 p-4 sm:p-6">
          <section>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-extrabold text-secondary">
                {adminRoute ? "Follow-Up Leads" : "My Follow-Ups"}
              </h1>
              <Info className="h-4 w-4 text-blue-700" />
            </div>
            <p className="mt-2 text-sm font-semibold text-blue-900">
              {adminRoute
                ? "Manage follow-ups from one live workspace across Pre Sales and field execution queues."
                : "Track and action only the follow-ups assigned to you from the same premium workspace."}
            </p>
          </section>

          <StatsRow
            stats={statsList}
            onStatClick={(label) => {
              const l = label.toLowerCase();
              if (l.includes("today")) setActiveTabName("Today");
              else if (l.includes("overdue")) setActiveTabName("Overdue");
              else if (l.includes("upcoming")) setActiveTabName("Upcoming");
              else if (l.includes("completed")) setActiveTabName("Completed");
              else if (l.includes("pending") || l.includes("queue"))
                setActiveTabName("All Follow-Ups");
            }}
          />
          <SlaQueueHighlights />

          <section className="space-y-5">
            <FollowUpTableCard
              routeMode={routeMode}
              activeTab={activeTabName}
              rows={filteredRows}
              statusTabs={statusTabs}
              onTabChange={setActiveTabName}
              onEditLead={handleRescheduleLead}
              onUpdateLead={handleOpenLeadUpdate}
              onAssignLead={handleOpenAssignLead}
              onOpenRemarks={handleOpenRemarks}
              onAddFollowUp={handleOpenCreate}
              onToggleFilters={() => setFiltersCollapsed((current) => !current)}
              activeFilterCount={activeFilterCount}
              quickLeadStatusFilters={quickLeadStatusFilters}
              appliedLeadStatusIds={appliedFilters.leadStatusIds}
              appliedLeadTypeIds={appliedFilters.leadTypeIds}
              onQuickLeadStatusFilter={handleQuickLeadStatusFilter}
              allLeadsForCounts={leads}
              filters={draftFilters}
              isFilterCollapsed={filtersCollapsed}
              adminRoute={adminRoute}
              telecallerRoute={telecallerRoute}
              ownerOptions={ownerFilterOptions}
              sourceOptions={leadFilterOptions.options.sourceOptions}
              leadStatusOptions={leadFilterOptions.options.statusOptions}
              leadTypeOptions={leadFilterOptions.options.leadTypeOptions}
              projectOptions={projectOptions}
              budgetOptions={leadFilterOptions.options.budgetOptions}
              configurationOptions={
                leadFilterOptions.options.configurationOptions
              }
              locationOptions={leadFilterOptions.options.areaOptions}
              onApplyFilters={handleApplyFilters}
              onChange={handleFilterChange}
              onDateRangeChange={handleDateRangeChange}
              onResetFilters={handleResetFilters}
            />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <AnalyticsCards rows={leads} />
              <RightRail
                selectedDate={selectedCalendarDate}
                onDateSelect={handleDateSelect}
                overdueLeads={leads.filter(
                  (lead: FollowUpLead) => lead.status === "Overdue",
                )}
                onQuickAction={handleQuickAction}
                onViewAllOverdue={() => setActiveTabName("Overdue")}
              />
            </div>
          </section>
        </main>
      </div>

      <FollowUpLeadUpdateDialog
        lead={updatingLead}
        row={updatingLeadRow}
        open={Boolean(updatingLead)}
        statusOptions={leadFilterOptions.options.statusOptions}
        leadTypeOptions={leadFilterOptions.options.leadTypeOptions}
        budgetOptions={leadFilterOptions.options.budgetOptions}
        areaOptions={leadFilterOptions.options.areaOptions}
        configurationOptions={leadFilterOptions.options.configurationOptions}
        sourceOptions={leadFilterOptions.options.sourceOptions}
        enabledUpdateFields={enabledUpdateFields}
        onOpenChange={(open) => {
          if (!open) setUpdatingLead(null);
        }}
        onSaved={handleSaveLeadUpdate}
      />

      <FollowUpAssignLeadDialog
        lead={assigningLead}
        open={Boolean(assigningLead)}
        telecallerOptions={telecallerAssignOptions}
        fieldExecutiveOptions={fieldExecutiveAssignOptions}
        onOpenChange={(open) => {
          if (!open) setAssigningLead(null);
        }}
        onSaved={handleSaveLeadAssignment}
      />

      <FollowUpRemarksDialog
        lead={remarkLead}
        open={Boolean(remarkLead)}
        onOpenChange={(open) => {
          if (!open) setRemarkLead(null);
        }}
      />

      <Dialog
        modal
        open={isScheduleOpen}
        onOpenChange={(open) => {
          setIsScheduleOpen(open);
          if (!open) resetScheduleForm();
        }}
      >
        <DialogContent className="flex max-h-[88vh] w-[min(92vw,48rem)] max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-0">
          <DialogHeader className="mb-0 shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              {reschedulingLead
                ? "Reschedule Follow-Up"
                : "Schedule New Follow-Up"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              {reschedulingLead
                ? `Update the follow-up details for ${reschedulingLead.name}.`
                : "Schedule a fresh follow-up task for a lead."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              let scheduledAt: string;
              try {
                scheduledAt = scheduledInputToIso(formDate, formTime);
              } catch {
                toast.error("Select a valid follow-up date and time");
                return;
              }
              const payload = {
                assignedToId:
                  adminRoute && !reschedulingLead
                    ? formAssignedToId || undefined
                    : undefined,
                scheduledAt,
                remarks: formNotes,
                notes: formNotes,
                status: reschedulingLead ? "Rescheduled" : "Scheduled",
              };

              if (reschedulingLead?.leadId) {
                updateFollowUp.mutate(
                  {
                    leadId: reschedulingLead.leadId,
                    followUpId: reschedulingLead.id,
                    payload,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Follow-up updated");
                      setIsScheduleOpen(false);
                      resetScheduleForm();
                    },
                    onError: () => toast.error("Unable to update follow-up"),
                  },
                );
                return;
              }

              if (!selectedLeadId) {
                toast.error("Select a lead first");
                return;
              }

              createFollowUp.mutate(
                {
                  leadId: selectedLeadId,
                  payload,
                },
                {
                  onSuccess: () => {
                    toast.success("Follow-up created");
                    setIsScheduleOpen(false);
                    resetScheduleForm();
                  },
                  onError: () => toast.error("Unable to create follow-up"),
                },
              );
            }}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
              {!reschedulingLead ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-secondary">
                      Lead Name
                    </label>
                    <SearchableSelect
                      value={selectedLeadId}
                      onValueChange={(leadId) => {
                        setSelectedLeadId(leadId);
                        const selectedLead = leadOptionMap.get(leadId);
                        if (selectedLead) {
                          setFormMobile(selectedLead.mobile);
                          setFormProperty(selectedLead.propertyType);
                          setFormAssignedToId(
                            selectedLead.telecallerId ??
                              selectedLead.fieldExecutiveId ??
                              selectedLead.ownerId ??
                              "",
                          );
                        }
                      }}
                      options={leadOptions}
                      placeholder="Search lead by name or number..."
                      searchPlaceholder="Search leads by name or number..."
                      portaled={false}
                      modal={false}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-secondary">
                      Choose Project
                    </label>
                    <SearchableSelect
                      value={selectedProjectId}
                      onValueChange={syncProjectSelection}
                      options={projectOptions}
                      placeholder="Choose a project..."
                      searchPlaceholder="Search projects..."
                      noOptionsText="No matching projects"
                      portaled={false}
                      modal={false}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-secondary">
                        Unit Detail
                      </label>
                      <SearchableSelect
                        value={selectedUnitId}
                        onValueChange={syncUnitSelection}
                        options={unitOptions}
                        placeholder={
                          selectedProjectId
                            ? "Choose a unit..."
                            : "Select project first"
                        }
                        searchPlaceholder="Search units..."
                        noOptionsText="No units found for this project"
                        disabled={!selectedProjectId}
                        portaled={false}
                        modal={false}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-secondary">
                        Mobile Number
                      </label>
                      <Input
                        placeholder="e.g. +91 99999 99999"
                        value={formMobile}
                        onChange={(e) => setFormMobile(e.target.value)}
                        disabled
                        className="h-10 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-secondary">
                      Property Detail
                    </label>
                    <Input
                      placeholder="Select project and unit to populate details"
                      value={formProperty}
                      readOnly
                      className="h-10 text-xs font-semibold"
                    />
                  </div>

                  {adminRoute ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-secondary">
                        Assign Follow-Up To
                      </label>
                      <SearchableSelect
                        value={formAssignedToId}
                        onValueChange={setFormAssignedToId}
                        options={followUpAssigneeOptions}
                        placeholder="Choose Pre Sales or sales executive..."
                        searchPlaceholder="Search assignees..."
                        noOptionsText="No lead assignees available"
                        disabled={!selectedLeadId}
                        portaled={false}
                        modal={false}
                      />
                    </div>
                  ) : null}
                </>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-extrabold text-secondary">
                    Date
                  </label>
                  <DatePicker
                    aria-label="Follow-up date"
                    value={formDate}
                    className="h-10 rounded-md text-xs font-semibold"
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-extrabold text-secondary">
                    Time
                  </label>
                  <ClockTimePicker
                    value={formTime}
                    onChange={setFormTime}
                    options={[
                      "09:00 AM",
                      "10:00 AM",
                      "11:00 AM",
                      "12:00 PM",
                      "01:00 PM",
                      "02:00 PM",
                      "03:00 PM",
                      "04:00 PM",
                      "05:00 PM",
                      "06:00 PM",
                      "07:00 PM",
                    ]}
                    placeholder="Select time"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary">
                  Remarks
                </label>
                <Textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Add remarks for the next follow-up..."
                  className="min-h-[88px] text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4 sm:px-6">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md text-xs font-bold"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  createFollowUp.isPending ||
                  updateFollowUp.isPending ||
                  (!reschedulingLead && !selectedLeadId)
                }
                className="h-9 rounded-md text-xs font-bold"
              >
                {createFollowUp.isPending || updateFollowUp.isPending
                  ? "Saving..."
                  : reschedulingLead
                  ? "Update Follow-Up"
                  : "Schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        modal
        open={Boolean(completionLead)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletionLead(null);
            setCompletionRemarks("");
            setCompletionCallOutcome("Connected");
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-xl border border-slate-200 bg-white p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Complete Follow-Up
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              {completionLead ? (
                <>
                  Close the follow-up for {completionLead.name} with clear
                  outcome remarks.
                </>
              ) : (
                "Capture the follow-up outcome before closing it."
              )}
            </DialogDescription>
          </DialogHeader>

          {completionLead ? (
            <div className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-secondary">
                      {completionLead.name}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {completionLead.property}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-secondary">
                      Scheduled {completionLead.dateGroup} at{" "}
                      {completionLead.time}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "border-0 text-[10px] font-extrabold",
                      statusTone(completionLead.status),
                    )}
                  >
                    {completionLead.status}
                  </Badge>
                </div>
              </div>

              {completionRequiresCallOutcome ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-secondary">
                    Call Outcome
                  </label>
                  <Select
                    value={completionCallOutcome}
                    onValueChange={setCompletionCallOutcome}
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {callCompletionOutcomes.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="text-xs font-semibold"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-secondary">
                  {completionRequiresCallOutcome
                    ? "How did the call go?"
                    : "Completion Remarks"}
                </label>
                <Textarea
                  value={completionRemarks}
                  onChange={(event) => setCompletionRemarks(event.target.value)}
                  placeholder={
                    completionRequiresCallOutcome
                      ? "Summarize the discussion, lead response, and agreed next step."
                      : "Add the final outcome, client response, or any important handoff remarks."
                  }
                  className="min-h-[120px] text-xs font-semibold"
                />
                <p className="text-xs font-semibold text-muted-foreground">
                  {completionRequiresCallOutcome
                    ? "These remarks will capture the call outcome and remain visible in the follow-up history."
                    : "This remark will remain visible in the follow-up history for operational clarity."}
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-md text-xs font-bold"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  disabled={
                    updateFollowUp.isPending || !completionRemarks.trim()
                  }
                  className="h-9 rounded-md text-xs font-bold"
                  onClick={handleConfirmComplete}
                >
                  {updateFollowUp.isPending
                    ? "Saving..."
                    : "Complete Follow-Up"}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
