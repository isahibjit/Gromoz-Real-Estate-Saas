import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Flame,
  Frown,
  GripVertical,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  Send,
  Target,
  Trash2,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  useLeadStatusMaster,
  useLeadTypeMaster,
} from "../../../../common/hooks/useLeadStatusMaster";
import {
  useLeadCardPreferences,
  type UnifiedCardItem,
} from "../../../../common/hooks/useLeadCardPreferences";
import { getApiErrorMessage } from "../../../../common/apiError";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDeleteDialog,
  DataTable,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  MultiSelect,
  SearchableSelect,
  Select,
  SelectContent,
  TablePageSizeOptions,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  type ColumnDef,
} from "ui";

import { api } from "../../../../common/api";
import { usePermission } from "../../../../common/access/usePermission";
import { ExecutiveCell } from "../../../../common/components/DataTableCells";
import { scheduledInputToIso } from "../../../../common/time";
import { useAppSelector } from "../../../../store";
import { WorkspacePage } from "../../../../components/layout/PageHeader";

import { useLocation, useNavigate } from "react-router-dom";
import { getAdminLeadSla } from "../../../../common/sla/slaData";
import { fieldExecutiveSidebarItems } from "../../../field-executive/fieldExecutiveData";
import { isFieldExecutivePath } from "../../../field-executive/fieldExecutiveRouteContext";
import { telecallerSidebarItems } from "../../../telecaller/dashboard/telecallerDashboardData";
import {
  CreateBookingDialog,
  type CreateBookingDialogDefaults,
} from "../../bookings/CreateBookingDialog";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import type { ProjectCatalogItem } from "../../projects/projectsData";
import { useProjects } from "../../projects/useProjectsApi";
import { addLeadSidebarItems } from "../add/addLeadData";
import { ClockTimePicker } from "../assignment/ClockTimePicker";
import { LeadActionsMenu } from "../components/LeadActionsMenu";
import { LeadPreviewDialog } from "../components/LeadPreviewDialog";

import { StatsRow, type LeadStatsRowItem } from "../components/StatsRow";
import { downloadLeadRowsCsv } from "../components/exportCsv";
import {
  CreateSiteVisitModal,
  type CreateVisitFormState,
} from "../site-visits/SiteVisitsScreen";
import {
  useSiteVisitMutations,
  useSiteVisitOptions,
  useSiteVisits,
} from "../site-visits/useSiteVisits";
import { AddLeadModal, EditLeadModal } from "./AddLeadModal";
import type { LeadRow } from "./allLeadsTypes";
import {
  LEAD_TABLE_MAX_ROWS,
  useAllLeads,
  useBulkAssignSelectedLeads,
  useBulkPatchSelectedLeads,
  useBulkUpdateLeadSource,
  useLeadColumnPreferences,
  useLeadListFilterOptions,
  useLeadUpdateFieldPermissions,
  useTeamLeadWorkspace,
  type LeadFilterOption,
  type LeadListFilters,
  type TeamLeadWorkspaceResponse,
} from "./useAllLeads";
import { useLeadRealtimeInvalidation } from "./useLeadRealtimeInvalidation";
import toast from "react-hot-toast";

type SlaFilter = "all" | "on-time" | "due-soon" | "breached";
type LeadBucketFilter =
  | "all"
  | "new"
  | "hot"
  | "cold"
  | "interested"
  | "follow-up"
  | "site-visit"
  | "site-visit-completed"
  | "revisit-completed"
  | "booked"
  | "not-interested";
type DateRangeFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

const rawIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const leadColumnDefaults = [
  "addedDate",
  "lastUpdate",
  "source",
  "name",
  "number",
  "projectName",
  "executive",
  "leadStatus",
  "leadType",
  "followUpDate",
  "remark",
  "actions",
] as const;

const exportColumnFallback = [
  { id: "addedDate", label: "Added Date" },
  { id: "lastUpdate", label: "Last Update" },
  { id: "source", label: "Source" },
  { id: "name", label: "Name" },
  { id: "number", label: "Number" },
  { id: "email", label: "Email" },
  { id: "projectName", label: "Project Name" },
  { id: "executive", label: "Executive" },
  { id: "leadStatus", label: "Lead Status" },
  { id: "leadType", label: "Lead Type" },
  { id: "followUpDate", label: "Follow-up Date" },
  { id: "remark", label: "Remark" },
] as const;

const exportOnlyColumnOptions = [{ id: "email", label: "Email" }] as const;

type ExportColumnOption = {
  id: string;
  label: string;
};

const tableLabel = (value: string, fallback: string) =>
  rawIdPattern.test(value) ? fallback : value;

const findStatusFilterOption = (
  options: readonly LeadFilterOption[],
  label: string,
) =>
  options.find(
    (option) => option.label.trim().toLowerCase() === label.toLowerCase(),
  );

const assignmentEntries = (lead: LeadRow) => {
  const entries: Array<{ label: string; value: string }> = [];

  if (lead.telecallerName) {
    entries.push({ label: "Pre Sales Executive", value: lead.telecallerName });
  }

  if (lead.fieldExecutiveName) {
    entries.push({
      label: "Sales Executive",
      value: lead.fieldExecutiveName,
    });
  }

  if (
    entries.length === 0 &&
    lead.ownerName &&
    lead.ownerName !== lead.telecallerName &&
    lead.ownerName !== lead.fieldExecutiveName
  ) {
    entries.push({ label: "Owner", value: lead.ownerName });
  }

  return entries;
};

const initialLeadFilters: LeadListFilters = {
  sourceId: [],
  statusId: [],
  stageId: [],
  temperatureId: [],
  propertyType: [],
  configuration: [],
  ownerId: [],
  telecallerId: [],
  teamId: [],
  area: [],
  projectId: [],
  from: "",
  to: "",
};

const dateRangeOptions: Array<{ label: string; value: DateRangeFilter }> = [
  { label: "All Date Range", value: "all" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom Range", value: "custom" },
];

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
];

const createDefaultSiteVisitForm = (leadId = ""): CreateVisitFormState => ({
  leadId,
  projectId: "",
  unitId: "",
  date: "",
  time: "10:00 AM",
  visitType: "Site Visit",
  meetingPoint: "Sales Gallery",
  durationMinutes: "60",
  transportMode: "Own Vehicle",
  visitorCount: "2",
  specialRequest: "",
});

// Date filters represent the user's calendar day, not a UTC timestamp.
const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toReadableDatePrefix = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const leadMatchesDatePrefix = (value: string | undefined, date: Date) =>
  Boolean(value?.split("\n")[0] === toReadableDatePrefix(date));

const leadMatchesMonth = (value: string | undefined, date: Date) =>
  Boolean(
    value?.split("\n")[0].endsWith(
      date.toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      }),
    ),
  );

const resolveDateRange = (range: DateRangeFilter) => {
  const end = new Date();
  const start = new Date(end);

  if (range === "all" || range === "custom") {
    return { from: "", to: "" };
  }

  if (range === "today") {
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "yesterday") {
    start.setDate(end.getDate() - 1);
    return { from: toDateInput(start), to: toDateInput(start) };
  }

  if (range === "last7") {
    start.setDate(end.getDate() - 6);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "last30") {
    start.setDate(end.getDate() - 29);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "lastMonth") {
    start.setMonth(end.getMonth() - 1, 1);
    end.setDate(0);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  start.setDate(1);
  return { from: toDateInput(start), to: toDateInput(end) };
};

const clickableStatFilters: Partial<Record<string, LeadBucketFilter>> = {
  "New Leads": "new",
  "Hot Leads": "hot",
  "Interested Leads": "interested",
  "Follow-Up Due": "follow-up",
  "Site Visits Scheduled": "site-visit",
  "Site Visits Done": "site-visit-completed",
  "Re-Visit Done": "revisit-completed",
  "Bookings Done": "booked",
  "Not Interested": "not-interested",
};

const getStatusIcon = (name: string): LucideIcon => {
  const norm = name.toLowerCase();
  if (norm.includes("new")) return UserPlus;
  if (norm.includes("hot")) return Flame;
  if (norm.includes("interest")) return Target;
  if (norm.includes("follow")) return PhoneCall;
  if (norm.includes("visit") && norm.includes("done")) return CalendarCheck;
  if (norm.includes("visit") || norm.includes("schedule")) return CalendarDays;
  if (norm.includes("revisit") || norm.includes("re-visit")) return RotateCcw;
  if (norm.includes("book") || norm.includes("won")) return CheckCircle2;
  if (norm.includes("not") || norm.includes("lost")) return Frown;
  return Activity;
};

const getStatusTone = (colorOrName?: string): string => {
  if (!colorOrName) return "bg-slate-50 text-slate-700";
  const norm = colorOrName.toLowerCase();
  if (
    norm.includes("green") ||
    norm.includes("#059669") ||
    norm.includes("new")
  )
    return "bg-green-50 text-success";
  if (
    norm.includes("orange") ||
    norm.includes("red") ||
    norm.includes("#ea580c") ||
    norm.includes("hot")
  )
    return "bg-orange-50 text-primary";
  if (
    norm.includes("blue") ||
    norm.includes("#2563eb") ||
    norm.includes("interest")
  )
    return "bg-blue-50 text-blue-700";
  if (
    norm.includes("violet") ||
    norm.includes("purple") ||
    norm.includes("#7c3aed") ||
    norm.includes("follow")
  )
    return "bg-violet-50 text-violet-600";
  if (
    norm.includes("cyan") ||
    norm.includes("#0284c7") ||
    norm.includes("visit")
  )
    return "bg-cyan-50 text-cyan-700";
  return "bg-slate-50 text-slate-700";
};

type DisplayStatItem = {
  label: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone: string;
  change?: string;
};

const hasUsableProjectCatalogItem = (
  project: ProjectCatalogItem | null | undefined,
): project is ProjectCatalogItem =>
  Boolean(
    project &&
      typeof project.id === "string" &&
      project.id.trim() &&
      typeof project.name === "string" &&
      project.name.trim(),
  );

const hasUsableCardItem = (
  item: UnifiedCardItem | null | undefined,
): item is UnifiedCardItem =>
  Boolean(
    item &&
      typeof item.id === "string" &&
      item.id.trim() &&
      typeof item.name === "string" &&
      item.name.trim(),
  );

const hasUsableWorkspaceMember = (
  member: TeamLeadWorkspaceResponse["members"][number] | null | undefined,
): member is TeamLeadWorkspaceResponse["members"][number] =>
  Boolean(
    member &&
      typeof member.id === "string" &&
      member.id.trim() &&
      typeof member.name === "string" &&
      member.name.trim(),
  );

type LeadWorkspaceScope = "mine" | "team";

const leadWorkspaceRoleLabel = (role?: string | null) => {
  switch (role) {
    case "SALES_AGENT":
    case "FIELD_EXECUTIVE":
      return "Sales Executive";
    case "TELECALLER":
      return "Pre Sales Executive";
    case "SALES_MANAGER":
      return "Sales Manager";
    case "TEAM_LEADER":
      return "Team Leader";
    case "MANAGER":
      return "Manager";
    case "ADMIN":
      return "Admin";
    default:
      return role ?? "Employee";
  }
};

type ColumnOption = readonly [string, string];

function isDisplayStatItem(
  stat: DisplayStatItem | null,
): stat is DisplayStatItem {
  return stat !== null;
}

function isColumnOption(
  option: ColumnOption | undefined,
): option is ColumnOption {
  return option !== undefined;
}

function isLeadColumn(
  column: ColumnDef<LeadRow> | undefined,
): column is ColumnDef<LeadRow> {
  return column !== undefined;
}

function buildPaginationItems(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

type LeadRemarkDetails = {
  id: string;
  name: string;
  remarks?: string | null;
  notes?: LeadRemarkNote[];
};

type LeadRemarkNote = {
  id: string;
  text?: string | null;
  authorName?: string | null;
  authorImage?: string | null;
  createdAt?: string | null;
  isPinned?: boolean | null;
};

type RemarkTab = "add" | "history";

type LeadsCache = {
  rows: LeadRow[];
  total: number;
};

function patchLeadRemarkCache(
  queryClient: QueryClient,
  leadIds: string[],
  remark: string,
) {
  const nextRemark = remark.trim();
  if (!nextRemark || !leadIds.length) return;
  const leadIdSet = new Set(leadIds);
  queryClient.setQueriesData<LeadsCache>(
    { queryKey: ["leads"] },
    (current?: LeadsCache) => {
      if (!current || !Array.isArray(current.rows)) return current;
      return {
        ...current,
        rows: current.rows.map((row: LeadRow) =>
          leadIdSet.has(row.backendId ?? row.id)
            ? { ...row, remark: nextRemark }
            : row,
        ),
      };
    },
  );
}

const formatRemarkTimestamp = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const initialsFromName = (value?: string | null) =>
  String(value ?? "TM")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function RemarksDialog({
  lead,
  open,
  onOpenChange,
}: {
  lead: {
    id: string;
    name: string;
    remark: string;
    mobile?: string;
    requirement?: string;
    ownerId?: string;
    telecallerId?: string;
    fieldExecutiveId?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const lastLeadRef = useRef(lead);
  if (lead) {
    lastLeadRef.current = lead;
  }
  const activeLead = lead || lastLeadRef.current;
  const queryClient = useQueryClient();
  const filterOptionsQuery = useLeadListFilterOptions();
  const [activeTab, setActiveTab] = useState<RemarkTab>("add");
  const [newRemark, setNewRemark] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("10:00 AM");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState("");
  const [selectedConfiguration, setSelectedConfiguration] = useState("");
  const [latestSavedRemark, setLatestSavedRemark] =
    useState<LeadRemarkNote | null>(null);

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
    setNewRemark("");
    setFollowUpDate("");
    setFollowUpTime("10:00 AM");
    setSelectedBudgetRange("");
    setSelectedConfiguration("");
    setLatestSavedRemark(null);
  }, [activeLead?.id, open]);

  const detailsQuery = useQuery({
    queryKey: ["lead-remarks", activeLead?.id],
    enabled: open && Boolean(activeLead?.id),
    queryFn: async () => {
      const { data } = await api.get<LeadRemarkDetails>(
        `/leads/${activeLead?.id}`,
      );
      return data;
    },
  });

  const addRemark = useMutation({
    mutationFn: async () => {
      if (!activeLead?.id) throw new Error("Lead is required");
      const text = newRemark.trim();
      if (!text) throw new Error("Please enter a remark");
      if (!followUpDate) throw new Error("Please select a follow-up date");
      const leadPatchPayload: Record<string, string> = { remarks: text };
      if (selectedBudgetRange)
        leadPatchPayload.budgetRange = selectedBudgetRange;
      if (selectedConfiguration)
        leadPatchPayload.configuration = selectedConfiguration;
      await api.patch(`/leads/${activeLead.id}`, leadPatchPayload);
      const { data } = await api.post<LeadRemarkNote>(
        `/leads/${activeLead.id}/notes`,
        {
          text,
          isPinned: false,
        },
      );
      await api.post(`/leads/${activeLead.id}/follow-ups`, {
        scheduledAt: scheduledInputToIso(followUpDate, followUpTime),
        assignedToId:
          activeLead.telecallerId ??
          activeLead.fieldExecutiveId ??
          activeLead.ownerId,
        status: "Scheduled",
        remarks: text,
        notes: text,
      });
      return data;
    },
    onSuccess: async (createdNote) => {
      toast.success(
        followUpDate ? "Remark and follow-up saved" : "Remark added",
      );
      setLatestSavedRemark(createdNote);
      queryClient.setQueryData<LeadRemarkDetails | undefined>(
        ["lead-remarks", activeLead?.id],
        (current?: LeadRemarkDetails) => {
          if (!current) return current;
          const remainingNotes =
            current.notes?.filter(
              (note: LeadRemarkNote) => note.id !== createdNote.id,
            ) ?? [];
          return {
            ...current,
            notes: [createdNote, ...remainingNotes],
          };
        },
      );
      patchLeadRemarkCache(
        queryClient,
        activeLead?.id ? [activeLead.id] : [],
        createdNote.text?.trim() || newRemark.trim(),
      );
      setNewRemark("");
      setFollowUpDate("");
      setFollowUpTime("10:00 AM");
      setSelectedBudgetRange("");
      setSelectedConfiguration("");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["lead-remarks", activeLead?.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ["lead-details", activeLead?.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
    },
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Could not save remark",
      );
    },
  });

  const notes = detailsQuery.data?.notes ?? [];
  const latestRemark = latestSavedRemark ?? notes[0] ?? null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[min(94vw,52rem)] max-w-3xl rounded-xl p-0">
          <DialogHeader className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-extrabold text-secondary">
                  Remarks
                </DialogTitle>
                <p className="text-sm font-semibold text-muted-foreground">
                  {activeLead?.name ?? "Lead"}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex gap-2">
              {[
                { id: "add", label: "Add New Remarks" },
                { id: "history", label: "Remarks History" },
              ].map((tab) => {
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-extrabold transition-colors",
                      selected
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-secondary hover:bg-slate-200",
                    )}
                    onClick={() => setActiveTab(tab.id as RemarkTab)}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-4">
            {activeTab === "add" ? (
              <div className="space-y-4">
                {latestRemark ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold text-secondary">
                          Latest remark
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-secondary">
                          {latestRemark.text?.trim() || "Internal remark"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
                        {formatRemarkTimestamp(latestRemark.createdAt)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
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

                <div className="grid gap-4 md:grid-cols-2">
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

                <div className="space-y-3">
                  <label className="block text-xs font-extrabold text-secondary">
                    Remarks
                  </label>
                  <Textarea
                    value={newRemark}
                    placeholder="Write the latest call summary, context, or next-step remark"
                    className="min-h-[132px] rounded-md text-sm font-semibold"
                    onChange={(event) => setNewRemark(event.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      className="h-10 rounded-md px-4"
                      disabled={addRemark.isPending}
                      onClick={() => addRemark.mutate()}
                    >
                      <Send className="h-4 w-4" />
                      {addRemark.isPending ? "Saving..." : "Save Remark"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : detailsQuery.isLoading ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
                Loading remarks history...
              </div>
            ) : notes.length ? (
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {notes.map((note: LeadRemarkNote) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
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
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-muted-foreground">
                No remarks history available yet.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function matchesLeadBucketFilter(
  lead: LeadRow,
  filter: LeadBucketFilter,
  completedSiteVisitLeadIds: ReadonlySet<string> = new Set(),
) {
  const lifecycle = `${lead.status} ${lead.stage} ${
    lead.interestLevel ?? ""
  }`.toLowerCase();
  const priority = (lead.priority || "").toLowerCase();
  const leadType = (lead.leadType || "").toLowerCase();

  if (filter === "all") return true;
  if (filter === "new") {
    return (
      !lead.statusId ||
      lead.status === "Not Set" ||
      lifecycle.includes("new") ||
      lifecycle.includes("fresh")
    );
  }
  if (filter === "hot")
    return (
      leadType.includes("hot") ||
      priority.includes("high") ||
      priority.includes("urgent") ||
      priority.includes("p1") ||
      lifecycle.includes("hot")
    );
  if (filter === "cold")
    return (
      leadType.includes("cold") ||
      priority.includes("low") ||
      lifecycle.includes("cold")
    );
  if (filter === "interested") {
    return (
      lifecycle.includes("interest") &&
      !lifecycle.includes("not interest") &&
      !lifecycle.includes("uninterested")
    );
  }
  if (filter === "follow-up") return lifecycle.includes("follow");
  if (filter === "site-visit-completed") {
    return (
      completedSiteVisitLeadIds.has(lead.backendId ?? lead.id) ||
      lifecycle.includes("visit done") ||
      lifecycle.includes("visit completed")
    );
  }
  if (filter === "revisit-completed") {
    return lifecycle.includes("re-visit") || lifecycle.includes("revisit");
  }
  if (filter === "booked") {
    return (
      lifecycle.includes("book") ||
      lifecycle.includes("won") ||
      lifecycle.includes("convert")
    );
  }
  if (filter === "not-interested") {
    return (
      Boolean(lead.lostAt) ||
      Boolean(lead.lostReasonId) ||
      Boolean(lead.lostReasonName) ||
      lifecycle.includes("lost") ||
      lifecycle.includes("not interest") ||
      lifecycle.includes("uninterested")
    );
  }
  return lifecycle.includes("site visit") || lifecycle.includes("visit");
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

function TeamLeadWorkspacePanel({
  workspace,
  selectedMemberId,
  onMemberChange,
}: {
  workspace?: TeamLeadWorkspaceResponse;
  selectedMemberId: string;
  onMemberChange: (memberId: string) => void;
}) {
  const members = (workspace?.members ?? []).filter(hasUsableWorkspaceMember);
  const memberOptions = [
    { label: "All team members", value: "all" },
    ...members.map((member) => ({
      label: member.name,
      value: member.id,
    })),
  ];

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold text-secondary">
              Team leads dashboard
            </h2>
            <p className="text-xs font-semibold text-muted-foreground">
              {workspace?.meta.teamName
                ? `${workspace.meta.teamName} member activity, assignments, follow-ups, and booking progress.`
                : "Member activity, assignments, follow-ups, and booking progress."}
            </p>
          </div>
          <label className="w-full space-y-2 sm:max-w-xs">
            <span className="text-xs font-extrabold text-secondary">
              Member drill-down
            </span>
            <SearchableSelect
              value={selectedMemberId}
              onValueChange={onMemberChange}
              options={memberOptions}
              placeholder="All team members"
              ariaLabel="Filter by team member"
              searchPlaceholder="Search member..."
              contentClassName="min-w-[260px]"
              modal={false}
              portaled={false}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
        {members.length ? (
          members.map((member) => (
            <div
              key={member.id}
              className={cn(
                "rounded-lg border border-slate-200 bg-white p-3 transition-colors",
                selectedMemberId === member.id
                  ? "border-blue-200 bg-blue-50/60"
                  : "hover:bg-slate-50",
              )}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border border-slate-200 bg-white">
                  <AvatarImage
                    src={member.image ?? undefined}
                    alt={member.name}
                  />
                  <AvatarFallback className="bg-slate-100 text-xs font-extrabold text-secondary">
                    {member.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-secondary">
                        {member.name}
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {leadWorkspaceRoleLabel(member.role)}
                      </p>
                    </div>
                    <Badge
                      variant="neutral"
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600"
                    >
                      {member.assignedLeads} leads
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md bg-slate-50 p-2">
                      <p className="text-sm font-extrabold text-secondary">
                        {member.hotLeads}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        Priority
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2">
                      <p className="text-sm font-extrabold text-secondary">
                        {member.pendingFollowUps}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        Follow-ups
                      </p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-2">
                      <p className="text-sm font-extrabold text-secondary">
                        {member.bookedLeads}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground">
                        Booked
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-muted-foreground">
                    <span>{member.overdueFollowUps} overdue</span>
                    <span>·</span>
                    <span>
                      {member.completedSiteVisits}/{member.siteVisits} visits
                      done
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-muted-foreground md:col-span-2 xl:col-span-3">
            No team members are mapped yet. Add members from the Teams screen to
            populate this dashboard.
          </div>
        )}
      </div>
    </Card>
  );
}

export function LeadsTable({
  rows,
  summaryRows,
  total,
  currentPage: externalCurrentPage,
  onPageChange: externalOnPageChange,
  rowsPerPage: externalRowsPerPage,
  onRowsPerPageChange: externalOnRowsPerPageChange,
  isLoading,
  activeLeadBucketFilter,
  completedSiteVisitLeadIds,
  selectedSlaFilter,
  sourceOptions,
  statusOptions,
  leadTypeOptions,
  budgetOptions,
  configurationOptions,
  areaOptions,
  assigneeOptions,
  onEditLead,
  quickLeadStatusFilters,
  appliedStatusIds,
  appliedTemperatureIds,
  onQuickLeadStatusFilter,
  filters,
  dateRange,
  filterOptions,
  onApplyFilters,
  onExportLeads,
  onDateRangeChange,
  onFilterChange,
  onResetFilters,
  onSlaFilterChange,
  isFilterCollapsed = false,
  hideTeamFilter = false,
}: {
  rows: LeadRow[];
  summaryRows?: LeadRow[];
  total: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  rowsPerPage?: number;
  onRowsPerPageChange?: (size: number) => void;
  isLoading: boolean;
  activeLeadBucketFilter: LeadBucketFilter;
  completedSiteVisitLeadIds: ReadonlySet<string>;
  selectedSlaFilter: SlaFilter;
  sourceOptions: LeadFilterOption[];
  statusOptions: LeadFilterOption[];
  leadTypeOptions: LeadFilterOption[];
  budgetOptions: LeadFilterOption[];
  configurationOptions: LeadFilterOption[];
  areaOptions: LeadFilterOption[];
  assigneeOptions: LeadFilterOption[];
  onEditLead?: (leadId: string) => void;
  quickLeadStatusFilters?: Array<{
    label: string;
    value: string;
    kind?: "status" | "temperature";
    color?: string;
  }>;
  appliedStatusIds?: string[];
  appliedTemperatureIds?: string[];
  onQuickLeadStatusFilter?: (
    filter:
      | string
      | { label: string; value: string; kind?: "status" | "temperature" },
  ) => void;
  filters?: LeadListFilters;
  dateRange?: DateRangeFilter;
  filterOptions?: {
    sourceOptions: LeadFilterOption[];
    statusOptions: LeadFilterOption[];
    leadTypeOptions: LeadFilterOption[];
    stageOptions: LeadFilterOption[];
    propertyTypeOptions: LeadFilterOption[];
    configurationOptions: LeadFilterOption[];
    areaOptions: LeadFilterOption[];
    projectOptions: LeadFilterOption[];
    ownerOptions: LeadFilterOption[];
    teamOptions: LeadFilterOption[];
  };
  onApplyFilters?: () => void;
  onExportLeads?: () => void;
  onDateRangeChange?: (value: DateRangeFilter) => void;
  onFilterChange?: <K extends keyof LeadListFilters>(
    key: K,
    value: LeadListFilters[K],
  ) => void;
  onResetFilters?: () => void;
  onSlaFilterChange?: (value: SlaFilter) => void;
  isFilterCollapsed?: boolean;
  hideTeamFilter?: boolean;
}) {
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [previewLeadId, setPreviewLeadId] = useState<string | null>(null);
  const [remarkLead, setRemarkLead] = useState<{
    id: string;
    name: string;
    remark: string;
    mobile?: string;
    requirement?: string;
    ownerId?: string;
    telecallerId?: string;
    fieldExecutiveId?: string;
  } | null>(null);
  const [bulkSourceId, setBulkSourceId] = useState("");
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dropTargetColumnId, setDropTargetColumnId] = useState<string | null>(
    null,
  );
  const [activeUpdateModal, setActiveUpdateModal] = useState<
    | "assign"
    | "duplicate"
    | "source"
    | "status"
    | "leadType"
    | "leadUpdate"
    | "project"
    | null
  >(null);
  const [selectedTelecallerId, setSelectedTelecallerId] = useState("");
  const [selectedFieldExecutiveId, setSelectedFieldExecutiveId] = useState("");
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [selectedLeadTypeId, setSelectedLeadTypeId] = useState("");
  const [leadUpdateFollowUpDate, setLeadUpdateFollowUpDate] = useState("");
  const [leadUpdateFollowUpTime, setLeadUpdateFollowUpTime] =
    useState("10:00 AM");
  const [selectedRemark, setSelectedRemark] = useState("");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedConfiguration, setSelectedConfiguration] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [projectUpdateEnabled, setProjectUpdateEnabled] = useState(false);
  const [duplicateReminder, setDuplicateReminder] = useState(true);
  const [duplicateRemark, setDuplicateRemark] = useState(true);
  const [internalPage, setInternalPage] = useState(1);
  const [internalRowsPerPage, setInternalRowsPerPage] = useState(10);
  const currentPage = externalCurrentPage ?? internalPage;
  const setCurrentPage = (action: number | ((prev: number) => number)) => {
    const next = typeof action === "function" ? action(currentPage) : action;
    if (externalOnPageChange) {
      externalOnPageChange(next);
    } else {
      setInternalPage(next);
    }
  };
  const rowsPerPage = externalRowsPerPage ?? internalRowsPerPage;
  const setRowsPerPage = (size: number) => {
    if (externalOnRowsPerPageChange) {
      externalOnRowsPerPageChange(size);
    } else {
      setInternalRowsPerPage(size);
    }
  };
  const bulkSource = useBulkUpdateLeadSource();
  const bulkAssign = useBulkAssignSelectedLeads();
  const bulkPatch = useBulkPatchSelectedLeads();
  const queryClient = useQueryClient();
  const columnsPreference = useLeadColumnPreferences();
  const updateFieldPermissions = useLeadUpdateFieldPermissions();
  const projectsQuery = useProjects("");
  const siteVisitOptionsQuery = useSiteVisitOptions("");
  const siteVisitMutations = useSiteVisitMutations();
  const [triggerSiteVisitOpen, setTriggerSiteVisitOpen] = useState(false);
  const [triggerBookingLead, setTriggerBookingLead] = useState<{
    id: string;
    name: string;
    mobile?: string;
    defaults?: CreateBookingDialogDefaults;
  } | null>(null);
  const lastTriggerBookingLead = useRef<{
    id: string;
    name: string;
    mobile?: string;
    defaults?: CreateBookingDialogDefaults;
  } | null>(null);

  if (triggerBookingLead) {
    lastTriggerBookingLead.current = triggerBookingLead;
  }
  const activeBookingLead =
    triggerBookingLead || lastTriggerBookingLead.current;
  const [triggerSiteVisitForm, setTriggerSiteVisitForm] =
    useState<CreateVisitFormState>(() => createDefaultSiteVisitForm());
  const navigate = useNavigate();
  const location = useLocation();
  const fieldExecutiveRoute = isFieldExecutivePath(location.pathname);
  const telecallerRoute = location.pathname.startsWith("/telecaller/");
  const employeeRoute = fieldExecutiveRoute || telecallerRoute;
  const visibleRows = rows.filter((lead) => {
    const matchesSla =
      selectedSlaFilter === "all" ||
      getAdminLeadSla(lead.id).status === selectedSlaFilter;
    const matchesBucket =
      activeLeadBucketFilter === "all" ||
      matchesLeadBucketFilter(
        lead,
        activeLeadBucketFilter,
        completedSiteVisitLeadIds,
      );
    return matchesSla && matchesBucket;
  });
  const totalVisibleRows = total || visibleRows.length;
  const totalPages = Math.max(1, Math.ceil(totalVisibleRows / rowsPerPage));
  const pageStartIndex = (currentPage - 1) * rowsPerPage;
  const paginatedRows =
    rows.length <= rowsPerPage
      ? visibleRows
      : visibleRows.slice(pageStartIndex, pageStartIndex + rowsPerPage);
  const rangeStart = totalVisibleRows === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd =
    totalVisibleRows === 0
      ? 0
      : Math.min(pageStartIndex + paginatedRows.length, totalVisibleRows);
  const paginationItems = buildPaginationItems(currentPage, totalPages);
  const allSelected =
    paginatedRows.length > 0 &&
    paginatedRows.every((lead) => selectedLeadIds.includes(lead.id));
  const selectedBackendLeadIds = visibleRows
    .filter((lead) => selectedLeadIds.includes(lead.id))
    .map((lead) => lead.backendId ?? lead.id);
  const selectedRows = visibleRows.filter((lead) =>
    selectedLeadIds.includes(lead.id),
  );
  const selectedCount = selectedBackendLeadIds.length;
  const bulkDeleteLeads = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedBackendLeadIds.map((leadId) =>
          api.delete(`/leads/${leadId}`, { data: {} }),
        ),
      );
    },
    onSuccess: async () => {
      toast.success(
        `${selectedCount} lead${
          selectedCount === 1 ? "" : "s"
        } moved to Deleted Leads`,
      );
      setBulkDeleteOpen(false);
      setSelectedLeadIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["deleted-leads"] }),
      ]);
    },
    onError: () => {
      toast.error("Could not delete selected leads");
    },
  });
  const visibleColumnIds = columnsPreference.query.data?.visibleColumns ?? [
    ...leadColumnDefaults,
  ];
  const canViewSourceColumn = visibleColumnIds.includes("source");
  const enabledUpdateFields =
    updateFieldPermissions.query.data?.enabledFields ?? [];
  const canUpdateField = (field: string) =>
    updateFieldPermissions.query.isLoading ||
    enabledUpdateFields.includes(field);
  const canUpdateAnyLeadField = (fields: string[]) =>
    fields.some((field) => canUpdateField(field));
  const canUpdateExecutive = canUpdateField("executive");
  const canUpdateSource = canUpdateField("source");
  const canUpdateProject = canUpdateField("projectName");
  const canUpdateCombinedFields = canUpdateAnyLeadField([
    "status",
    "leadType",
    "budget",
    "location",
    "configuration",
    "source",
    "remark",
    "followUpDate",
  ]);
  const lockedColumnIds = new Set(
    columnsPreference.query.data?.lockedColumns ?? [],
  );
  const columnOptions: readonly ColumnOption[] =
    columnsPreference.query.data?.systemColumns.map(
      (column: { id: string; label: string }) =>
        [column.id, column.label] as const,
    ) ?? [
      ["addedDate", "Added Date"],
      ["lastUpdate", "Last Update"],
      ["source", "Source"],
      ["name", "Name"],
      ["number", "Number"],
      ["projectName", "Project Name"],
      ["executive", "Executive"],
      ["leadStatus", "Lead Status"],
      ["leadType", "Lead Type"],
      ["followUpDate", "Follow-up Date"],
      ["remark", "Remark"],
      ["actions", "Action Button"],
    ];
  const assigneeSearchOptions = assigneeOptions.map((option) => ({
    label: option.label,
    value: option.value,
    description: option.role?.replace(/_/g, " "),
  }));
  const telecallerSearchOptions = assigneeSearchOptions.filter((option) => {
    const source = assigneeOptions.find(
      (assignee) => assignee.value === option.value,
    );
    return source?.role === "TELECALLER";
  });
  const fieldExecutiveSearchOptions = assigneeSearchOptions.filter((option) => {
    const source = assigneeOptions.find(
      (assignee) => assignee.value === option.value,
    );
    return source?.role === "SALES_AGENT";
  });
  const optionalTelecallerSearchOptions = [
    {
      label: "Not assigned",
      value: "",
      description: "Assign a Pre Sales user later",
    },
    ...telecallerSearchOptions,
  ];
  const optionalFieldExecutiveSearchOptions = [
    {
      label: "Not assigned",
      value: "",
      description: "Assign a sales executive later",
    },
    ...fieldExecutiveSearchOptions,
  ];
  const statusSearchOptions = statusOptions.map((option) => ({
    label: option.label,
    value: option.value,
    description:
      option.allowFollowUp === false
        ? "Follow-up creation disabled"
        : option.triggerAction === "CREATE_SITE_VISIT"
        ? "Triggers site visit flow"
        : option.triggerAction === "CREATE_BOOKING"
        ? "Triggers booking flow"
        : undefined,
  }));
  const leadTypeSearchOptions = leadTypeOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const budgetSearchOptions = budgetOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const locationSearchOptions = areaOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const configurationSearchOptions = configurationOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const sourceSearchOptions = sourceOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const projectSearchOptions = useMemo(
    () =>
      (projectsQuery.data?.projects ?? [])
        .filter(hasUsableProjectCatalogItem)
        .map((project) => ({
          label: project.name,
          value: project.id,
          description: [project.location, project.developer]
            .filter(Boolean)
            .join(" · "),
        })),
    [projectsQuery.data?.projects],
  );
  const projectLookupById = useMemo(
    () =>
      new Map<string, ProjectCatalogItem>(
        (projectsQuery.data?.projects ?? [])
          .filter(hasUsableProjectCatalogItem)
          .map((project) => [project.id, project]),
      ),
    [projectsQuery.data?.projects],
  );
  const projectLookupByName = useMemo(
    () =>
      new Map<string, ProjectCatalogItem>(
        (projectsQuery.data?.projects ?? [])
          .filter(hasUsableProjectCatalogItem)
          .map((project) => [project.name.trim().toLowerCase(), project]),
      ),
    [projectsQuery.data?.projects],
  );
  const selectedStatusTriggerAction =
    statusOptions.find((option) => option.value === selectedStatusId)
      ?.triggerAction ?? "NONE";
  const selectedStatusOption = statusOptions.find(
    (option) => option.value === selectedStatusId,
  );
  const selectedStatusAllowsFollowUp =
    selectedStatusOption?.allowFollowUp ?? true;
  const selectedStatusTriggerLabel =
    selectedStatusTriggerAction === "CREATE_SITE_VISIT"
      ? "Create site visit"
      : selectedStatusTriggerAction === "CREATE_BOOKING"
      ? "Create booking"
      : "";
  const selectedProjectSummary = useMemo<SelectedProjectSummary>(() => {
    const uniqueProjects = new Map<string, string>();

    for (const lead of selectedRows) {
      const normalizedProjectName = lead.projectName.trim();
      const resolvedProject =
        (lead.projectId ? projectLookupById.get(lead.projectId) : undefined) ??
        (normalizedProjectName
          ? projectLookupByName.get(normalizedProjectName.toLowerCase())
          : undefined);
      const projectId = resolvedProject?.id ?? lead.projectId ?? "";
      const projectName = resolvedProject?.name ?? normalizedProjectName;

      if (!projectName) continue;
      uniqueProjects.set(projectId || projectName.toLowerCase(), projectName);
    }

    if (!uniqueProjects.size) {
      return {
        kind: "none",
        message:
          "No project linked. Project will stay empty unless you enable project update.",
      };
    }

    if (uniqueProjects.size === 1) {
      const [projectName] = uniqueProjects.values();
      return {
        kind: "same",
        projectName,
        message: `Current project: ${projectName}. It will remain unchanged unless you enable project update.`,
      };
    }

    return {
      kind: "mixed",
      message:
        "Selected leads have different current projects. Existing projects will remain unchanged unless you enable project update.",
    };
  }, [projectLookupById, projectLookupByName, selectedRows]);

  const toggleAll = () => {
    setSelectedLeadIds(allSelected ? [] : paginatedRows.map((lead) => lead.id));
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId)
        ? current.filter((id) => id !== leadId)
        : [...current, leadId],
    );
  };

  const ensureSelection = () => {
    if (!selectedCount) {
      toast.error("Select at least one lead");
      return false;
    }
    return true;
  };

  const openUpdateModal = (
    modal:
      | "assign"
      | "duplicate"
      | "source"
      | "status"
      | "leadType"
      | "leadUpdate"
      | "project",
  ) => {
    if (!ensureSelection()) return;
    if ((modal === "assign" || modal === "duplicate") && !canUpdateExecutive) {
      toast.error("You are not allowed to update executive assignment");
      return;
    }
    if (modal === "source" && !canUpdateSource) {
      toast.error("You are not allowed to update lead source");
      return;
    }
    if (modal === "project" && !canUpdateProject) {
      toast.error("You are not allowed to update project name");
      return;
    }
    if (
      (modal === "status" || modal === "leadType" || modal === "leadUpdate") &&
      !canUpdateCombinedFields
    ) {
      toast.error("You are not allowed to update these lead fields");
      return;
    }
    if (modal === "assign" || modal === "duplicate") {
      if (selectedRows.length === 1) {
        setSelectedTelecallerId(
          selectedRows[0].telecallerId || selectedRows[0].ownerId || "",
        );
        setSelectedFieldExecutiveId(selectedRows[0].fieldExecutiveId || "");
      } else if (selectedRows.length > 1) {
        const firstTelecaller =
          selectedRows[0].telecallerId || selectedRows[0].ownerId || "";
        const allSameTelecaller = selectedRows.every(
          (row) => (row.telecallerId || row.ownerId || "") === firstTelecaller,
        );
        setSelectedTelecallerId(allSameTelecaller ? firstTelecaller : "");

        const firstFe = selectedRows[0].fieldExecutiveId || "";
        const allSameFe = selectedRows.every(
          (row) => (row.fieldExecutiveId || "") === firstFe,
        );
        setSelectedFieldExecutiveId(allSameFe ? firstFe : "");
      }
    }

    setActiveUpdateModal(
      modal === "status" || modal === "leadType" ? "leadUpdate" : modal,
    );
  };

  const openLeadUpdateModal = (
    lead: LeadRow,
    intent: "status" | "leadType" = "status",
  ) => {
    setSelectedLeadIds([lead.id]);
    setSelectedStatusId(intent === "status" ? lead.statusId ?? "" : "");
    setSelectedLeadTypeId(lead.temperatureId ?? "");
    setBulkSourceId(lead.sourceId ?? "");
    setLeadUpdateFollowUpDate("");
    setLeadUpdateFollowUpTime("10:00 AM");
    setSelectedRemark("");
    setSelectedBudgetRange(lead.budgetRange ?? "");
    setSelectedLocation(lead.preferredLocation ?? "");
    setSelectedConfiguration(lead.configuration ?? "");
    setActiveUpdateModal("leadUpdate");
  };

  const openAssignModalForLead = (lead: LeadRow) => {
    setSelectedLeadIds([lead.id]);
    setSelectedTelecallerId(lead.telecallerId || lead.ownerId || "");
    setSelectedFieldExecutiveId(lead.fieldExecutiveId || "");
    setProjectUpdateEnabled(false);
    setSelectedProjectId(lead.projectId || "");
    setActiveUpdateModal("assign");
  };

  const findPreviewLeadRow = () =>
    previewLeadId
      ? visibleRows.find(
          (lead) =>
            (lead.backendId ?? lead.id) === previewLeadId ||
            lead.id === previewLeadId,
        )
      : undefined;

  const openPreviewAction = (action: (lead: LeadRow) => void) => {
    const lead = findPreviewLeadRow();
    if (!lead) {
      toast.error("Could not find this lead in the current table");
      return;
    }
    setPreviewLeadId(null);
    action(lead);
  };

  const openSourceModalForLead = (lead: LeadRow) => {
    setSelectedLeadIds([lead.id]);
    setBulkSourceId(lead.sourceId ?? "");
    setActiveUpdateModal("source");
  };

  const openProjectModalForLead = (lead: LeadRow) => {
    setSelectedLeadIds([lead.id]);
    setSelectedProjectId(lead.projectId ?? "");
    setActiveUpdateModal("project");
  };

  const openRemarkModalForLead = (lead: LeadRow) => {
    setRemarkLead({
      id: lead.backendId ?? lead.id,
      name: lead.name,
      remark: lead.remark,
      mobile: lead.mobile,
      requirement: lead.propertyType,
      ownerId: lead.ownerId,
      telecallerId: lead.telecallerId,
      fieldExecutiveId: lead.fieldExecutiveId,
    });
  };

  const handleLeadUpdateStatusChange = (statusId: string) => {
    setSelectedStatusId(statusId);
    const statusAllowsFollowUp =
      statusOptions.find((option) => option.value === statusId)
        ?.allowFollowUp ?? true;
    if (!statusAllowsFollowUp) {
      setLeadUpdateFollowUpDate("");
      setLeadUpdateFollowUpTime("10:00 AM");
    }
  };

  const closeUpdateModal = () => {
    setActiveUpdateModal(null);
    setSelectedTelecallerId("");
    setSelectedFieldExecutiveId("");
    setBulkSourceId("");
    setSelectedStatusId("");
    setSelectedLeadTypeId("");
    setLeadUpdateFollowUpDate("");
    setLeadUpdateFollowUpTime("10:00 AM");
    setSelectedRemark("");
    setSelectedBudgetRange("");
    setSelectedLocation("");
    setSelectedConfiguration("");
    setSelectedProjectId("");
    setProjectUpdateEnabled(false);
    setDuplicateReminder(true);
    setDuplicateRemark(true);
  };

  const submitSource = async () => {
    if (!bulkSourceId) {
      toast.error("Select a lead source");
      return;
    }
    try {
      await bulkSource.mutateAsync({
        leadIds: selectedBackendLeadIds,
        sourceId: bulkSourceId,
      });
      setSelectedLeadIds([]);
      closeUpdateModal();
      toast.success("Lead source updated");
    } catch {
      toast.error("Could not update lead source");
    }
  };

  const submitAssign = async (duplicate = false) => {
    const shouldUpdateProject = projectUpdateEnabled;
    const telecallerUnchangedForAll =
      duplicate &&
      Boolean(selectedTelecallerId) &&
      selectedRows.length > 0 &&
      selectedRows.every(
        (lead) =>
          (lead.telecallerId ?? lead.ownerId ?? "") === selectedTelecallerId,
      );
    const fieldExecutiveUnchangedForAll =
      duplicate &&
      Boolean(selectedFieldExecutiveId) &&
      selectedRows.length > 0 &&
      selectedRows.every(
        (lead) => (lead.fieldExecutiveId ?? "") === selectedFieldExecutiveId,
      );
    const assignments = [
      ...(selectedTelecallerId && !telecallerUnchangedForAll
        ? [
            {
              toUserId: selectedTelecallerId,
              assigneeType: "telecaller" as const,
            },
          ]
        : []),
      ...(selectedFieldExecutiveId && !fieldExecutiveUnchangedForAll
        ? [
            {
              toUserId: selectedFieldExecutiveId,
              assigneeType: "field-executive" as const,
            },
          ]
        : []),
    ];
    if (shouldUpdateProject && !selectedProjectId) {
      toast.error("Select a project to update");
      return;
    }
    if (!assignments.length && !shouldUpdateProject) {
      toast.error(
        duplicate
          ? "No duplicate assignment or project changes selected"
          : "Select a Pre Sales user, sales executive, or enable project update",
      );
      return;
    }

    let assignmentApplied = false;

    try {
      if (assignments.length) {
        await bulkAssign.mutateAsync({
          leadIds: selectedBackendLeadIds,
          assignments,
          strategy: duplicate ? "duplicate-assign" : "manual",
          reason: duplicate
            ? "Duplicate and assign selected leads"
            : "Assign selected leads",
          duplicateReminder: duplicate ? duplicateReminder : undefined,
          duplicateRemark: duplicate ? duplicateRemark : undefined,
        });
        assignmentApplied = true;
      }
      if (shouldUpdateProject) {
        await bulkPatch.mutateAsync({
          leadIds: selectedBackendLeadIds,
          payload: { preferredProject: selectedProjectId },
        });
      }
      setSelectedLeadIds([]);
      closeUpdateModal();
      if (duplicate) {
        const successParts: string[] = [];
        if (selectedTelecallerId) {
          successParts.push(
            telecallerUnchangedForAll
              ? "Pre Sales kept as-is"
              : "Pre Sales duplication updated",
          );
        }
        if (selectedFieldExecutiveId) {
          successParts.push(
            fieldExecutiveUnchangedForAll
              ? "Sales executive kept as-is"
              : "Sales executive duplication updated",
          );
        }
        if (shouldUpdateProject) {
          successParts.push("Project updated");
        }
        toast.success(
          successParts.length
            ? successParts.join(". ")
            : "Selected lead projects updated",
        );
      } else if (assignments.length && shouldUpdateProject) {
        toast.success("Selected leads assigned and project updated");
      } else if (assignments.length) {
        toast.success("Selected leads assigned");
      } else {
        toast.success("Selected lead projects updated");
      }
    } catch {
      if (assignmentApplied && shouldUpdateProject) {
        toast.error("Assignments saved, but project could not be updated");
        return;
      }
      if (duplicate) {
        toast.error(
          shouldUpdateProject
            ? "Could not duplicate, assign, and update the selected project"
            : "Could not duplicate and assign selected leads",
        );
        return;
      }
      toast.error(
        shouldUpdateProject
          ? assignments.length
            ? "Could not assign selected leads and update project"
            : "Could not update selected lead projects"
          : "Could not assign selected leads",
      );
    }
  };

  const openTriggerFlow = (
    triggerAction: string,
    lead: LeadRow | undefined,
    successMessage: string,
  ) => {
    if (triggerAction === "NONE" || !triggerAction) {
      toast.success(successMessage);
      return;
    }

    if (selectedCount !== 1 || !lead) {
      toast.success(
        "Status updated. Site visit/booking creation is available for single-lead updates only.",
      );
      return;
    }

    const leadId = lead.backendId ?? lead.id;
    if (triggerAction === "CREATE_SITE_VISIT") {
      setTriggerSiteVisitForm({
        ...createDefaultSiteVisitForm(leadId),
        projectId: lead.projectId ?? "",
      });
      setTriggerSiteVisitOpen(true);
      toast.success(`${successMessage}. Continue with the site visit details.`);
      return;
    }

    if (triggerAction === "CREATE_BOOKING") {
      setTriggerBookingLead({
        id: leadId,
        name: lead.name,
        mobile: lead.mobile,
        defaults: {
          projectId: lead.projectId,
          preferredProjectName:
            lead.projectName !== "Not Set" ? lead.projectName : undefined,
          preferredLocation:
            lead.preferredLocation ?? lead.projectArea ?? undefined,
          preferredConfiguration: lead.configuration ?? undefined,
          preferredBudget: lead.budget,
        },
      });
      toast.success(`${successMessage}. Continue with the booking details.`);
      return;
    }

    toast.success(successMessage);
  };

  const updateTriggerSiteVisitForm = <K extends keyof CreateVisitFormState>(
    field: K,
    value: CreateVisitFormState[K],
  ) => {
    setTriggerSiteVisitForm((current) => ({ ...current, [field]: value }));
  };

  const submitTriggerSiteVisit = async () => {
    if (
      !triggerSiteVisitForm.leadId ||
      !triggerSiteVisitForm.projectId ||
      !triggerSiteVisitForm.date ||
      !triggerSiteVisitForm.time
    ) {
      toast.error(
        "Complete lead, project, date, and time to create the site visit",
      );
      return;
    }

    await siteVisitMutations.createVisit.mutateAsync({
      leadId: triggerSiteVisitForm.leadId,
      projectId: triggerSiteVisitForm.projectId,
      unitId: triggerSiteVisitForm.unitId || undefined,
      visitType: triggerSiteVisitForm.visitType,
      scheduledAt: scheduledInputToIso(
        triggerSiteVisitForm.date,
        triggerSiteVisitForm.time,
      ),
      meetingPoint: triggerSiteVisitForm.meetingPoint || undefined,
      durationMinutes:
        Number(triggerSiteVisitForm.durationMinutes) || undefined,
      transportMode: triggerSiteVisitForm.transportMode || undefined,
      visitorCount: Number(triggerSiteVisitForm.visitorCount) || undefined,
      specialRequest: triggerSiteVisitForm.specialRequest || undefined,
      status: "Scheduled",
    });
    toast.success("Site visit created");
    setTriggerSiteVisitOpen(false);
    setTriggerSiteVisitForm(createDefaultSiteVisitForm());
  };

  const submitLeadUpdate = async () => {
    const followUpAllowedForSelectedStatus = selectedStatusAllowsFollowUp;
    const trimmedRemark = selectedRemark.trim();
    const hasStatusUpdate =
      Boolean(selectedStatusId) &&
      selectedRows.some((lead) => lead.statusId !== selectedStatusId);
    const hasRemarkUpdate =
      Boolean(trimmedRemark) &&
      selectedRows.some(
        (lead) =>
          (lead.remark === "Not Set" ? "" : lead.remark.trim()) !==
          trimmedRemark,
      );
    const requiresFollowUp =
      (hasStatusUpdate || hasRemarkUpdate) &&
      followUpAllowedForSelectedStatus &&
      canUpdateField("followUpDate") &&
      canUpdateField("remark");
    const shouldCreateFollowUp =
      followUpAllowedForSelectedStatus &&
      canUpdateField("followUpDate") &&
      canUpdateField("remark") &&
      (requiresFollowUp || Boolean(leadUpdateFollowUpDate));
    const payload: Record<string, string> = {};

    if (!followUpAllowedForSelectedStatus && leadUpdateFollowUpDate) {
      toast.error(
        "Follow-up creation is disabled for the selected lead status",
      );
      return;
    }

    if ((requiresFollowUp || shouldCreateFollowUp) && !selectedRows.length) {
      toast.error("Select at least one lead to create a follow-up");
      return;
    }

    if ((requiresFollowUp || shouldCreateFollowUp) && !leadUpdateFollowUpDate) {
      toast.error("Select the follow-up date");
      return;
    }

    if ((requiresFollowUp || shouldCreateFollowUp) && !trimmedRemark) {
      toast.error("Enter a remark for the follow-up");
      return;
    }

    if (selectedStatusId && canUpdateField("status"))
      payload.statusId = selectedStatusId;
    if (selectedLeadTypeId && canUpdateField("leadType"))
      payload.temperatureId = selectedLeadTypeId;
    if (selectedBudgetRange && canUpdateField("budget"))
      payload.budgetRange = selectedBudgetRange;
    if (selectedLocation && canUpdateField("location"))
      payload.preferredLocation = selectedLocation;
    if (selectedConfiguration && canUpdateField("configuration"))
      payload.configuration = selectedConfiguration;
    if (bulkSourceId && canUpdateField("source"))
      payload.sourceId = bulkSourceId;
    if (selectedProjectId) {
      payload.preferredProject = selectedProjectId;
    }
    if (trimmedRemark && canUpdateField("remark")) {
      payload.remarks = trimmedRemark;
    }
    if (shouldCreateFollowUp) {
      try {
        payload.nextFollowUpAt = scheduledInputToIso(
          leadUpdateFollowUpDate,
          leadUpdateFollowUpTime,
        );
      } catch {
        toast.error("Select a valid follow-up date and time");
        return;
      }
    }

    if (!Object.keys(payload).length && !shouldCreateFollowUp) {
      toast.error("Select at least one field to update");
      return;
    }

    const hasLeadUpdates = Object.keys(payload).length > 0;
    let leadUpdateCompleted = false;
    try {
      const triggerAction = selectedStatusTriggerAction;
      const triggerLead = selectedRows[0];
      if (hasLeadUpdates) {
        await bulkPatch.mutateAsync({
          leadIds: selectedBackendLeadIds,
          payload,
        });
        leadUpdateCompleted = true;
      }
      if (shouldCreateFollowUp) {
        const followUpRemark = trimmedRemark;
        await Promise.all(
          selectedRows.map((lead) =>
            api.post(`/leads/${lead.backendId ?? lead.id}/follow-ups`, {
              scheduledAt: payload.nextFollowUpAt,
              assignedToId:
                lead.telecallerId ||
                lead.fieldExecutiveId ||
                lead.ownerId ||
                undefined,
              status: "Scheduled",
              remarks: followUpRemark,
              notes: followUpRemark,
            }),
          ),
        );
        patchLeadRemarkCache(
          queryClient,
          selectedRows.map((lead) => lead.backendId ?? lead.id),
          followUpRemark,
        );
      }
      setSelectedLeadIds([]);
      closeUpdateModal();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["lead-details"] }),
        queryClient.invalidateQueries({ queryKey: ["lead-remarks"] }),
        queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      const successMessage =
        (requiresFollowUp || shouldCreateFollowUp) && hasLeadUpdates
          ? selectedCount === 1
            ? "Lead updated and follow-up created"
            : "Selected leads updated and follow-ups created"
          : requiresFollowUp || shouldCreateFollowUp
          ? selectedCount === 1
            ? "Follow-up created"
            : "Follow-ups created"
          : selectedCount === 1
          ? "Lead updated"
          : "Selected leads updated";
      if (hasLeadUpdates && selectedStatusId) {
        openTriggerFlow(triggerAction, triggerLead, successMessage);
        return;
      }
      toast.success(successMessage);
    } catch (error) {
      toast.error(
        leadUpdateCompleted && shouldCreateFollowUp
          ? "Lead updated, but follow-up could not be created"
          : hasLeadUpdates
          ? "Could not update selected leads"
          : "Could not create follow-up reminder",
      );
    }
  };

  const submitProject = async () => {
    if (!selectedProjectId) {
      toast.error("Select a project");
      return;
    }
    try {
      await bulkPatch.mutateAsync({
        leadIds: selectedBackendLeadIds,
        payload: { preferredProject: selectedProjectId },
      });
      setSelectedLeadIds([]);
      closeUpdateModal();
      toast.success("Lead project updated");
    } catch {
      toast.error("Could not update lead project");
    }
  };

  const toggleColumn = (columnId: string, checked: boolean) => {
    if (lockedColumnIds.has(columnId) && !checked) return;
    const next = checked
      ? [...visibleColumnIds, columnId]
      : visibleColumnIds.filter((id: string) => id !== columnId);
    columnsPreference.mutation.mutate(next);
  };

  const moveColumn = (columnId: string, direction: "up" | "down") => {
    const currentIndex = visibleColumnIds.indexOf(columnId);
    if (currentIndex < 0) return;

    const targetIndex =
      direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= visibleColumnIds.length) return;

    const next = [...visibleColumnIds];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    columnsPreference.mutation.mutate(next);
  };

  const reorderColumns = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const currentIndex = visibleColumnIds.indexOf(draggedId);
    const targetIndex = visibleColumnIds.indexOf(targetId);
    if (currentIndex < 0 || targetIndex < 0) return;

    const next = [...visibleColumnIds];
    const [moved] = next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, moved);
    columnsPreference.mutation.mutate(next);
  };

  const visibleColumnEntries = visibleColumnIds
    .map((id: string) => columnOptions.find(([columnId]) => columnId === id))
    .filter(isColumnOption);

  const resetColumns = () => {
    columnsPreference.mutation.mutate([...leadColumnDefaults]);
  };

  const columns = useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        id: "select",
        className: "!w-[44px] !px-2",
        headerClassName: "!w-[44px] !px-2",
        header: (
          <Checkbox
            aria-label="Select all leads"
            checked={allSelected}
            onChange={toggleAll}
            className="gap-0"
          />
        ),
        cell: (lead) => (
          <Checkbox
            aria-label={`Select ${lead.name}`}
            checked={selectedLeadIds.includes(lead.id)}
            onChange={() => toggleLead(lead.id)}
            className="gap-0"
          />
        ),
      },
      {
        id: "addedDate",
        header: "Added Date",
        className: "w-[92px] max-w-[92px]",
        headerClassName: "w-[92px]",
        cell: (lead) => (
          <span className="whitespace-pre-line text-[11px] font-semibold text-secondary">
            {lead.addedDate}
          </span>
        ),
      },
      {
        id: "lastUpdate",
        header: "Last Update",
        className: "w-[92px] max-w-[92px]",
        headerClassName: "w-[92px]",
        cell: (lead) => (
          <span className="whitespace-pre-line text-[11px] font-semibold text-secondary">
            {lead.lastUpdate}
          </span>
        ),
      },
      {
        id: "source",
        header: "Source",
        className: "w-[96px] max-w-[96px]",
        headerClassName: "w-[96px]",
        cell: (lead) => (
          <Badge className="inline-flex max-w-full whitespace-nowrap border-0 bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">
            {tableLabel(lead.source, "Unknown")}
          </Badge>
        ),
      },
      {
        id: "name",
        header: "Name",
        className: "min-w-0 w-[110px] max-w-[110px]",
        headerClassName: "w-[110px]",
        cell: (lead) => (
          <div className="min-w-0">
            <button
              type="button"
              className="block max-w-full truncate text-left text-[11px] font-extrabold text-secondary hover:text-primary hover:underline"
              onClick={() => setPreviewLeadId(lead.backendId ?? lead.id)}
              title={lead.name}
            >
              {lead.name}
            </button>
          </div>
        ),
      },
      {
        id: "number",
        header: "Number",
        className: "w-[104px] max-w-[104px]",
        headerClassName: "w-[104px]",
        cell: (lead) => (
          <span className="block truncate text-[11px] font-semibold text-secondary">
            {lead.mobile}
          </span>
        ),
      },
      {
        id: "projectName",
        header: "Project Name",
        className: "w-[160px] max-w-[160px]",
        headerClassName: "w-[160px]",
        cell: (lead) => {
          const project =
            (lead.projectId
              ? projectLookupById.get(lead.projectId)
              : undefined) ??
            projectLookupByName.get(lead.projectName.trim().toLowerCase());

          if (!project) {
            return (
              <div className="min-w-0">
                <p className="truncate text-[11px] font-extrabold text-secondary">
                  {lead.projectName}
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
                  {compactCellText(lead.projectArea || lead.propertyType)}
                </p>
              </div>
            );
          }

          return (
            <button
              type="button"
              className="block w-full min-w-0 rounded-lg px-1 py-1 text-left transition-colors hover:bg-slate-50"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <span className="block truncate text-[11px] font-extrabold text-secondary">
                {project.name}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground">
                {project.location || lead.projectArea || lead.propertyType}
              </span>
            </button>
          );
        },
      },
      {
        id: "executive",
        header: "Executive",
        className: "w-[142px] max-w-[142px]",
        headerClassName: "w-[142px]",
        cell: (lead) => {
          const entries = assignmentEntries(lead);
          if (entries.length > 0) {
            return (
              <button
                type="button"
                className="block w-full min-w-0 space-y-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50"
                onClick={() => openAssignModalForLead(lead)}
              >
                {entries.map((entry) => (
                  <div key={`${lead.id}-${entry.label}`} className="min-w-0">
                    <p className="truncate text-[11px] font-extrabold text-secondary">
                      {entry.value}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-muted-foreground">
                      {entry.label}
                    </p>
                  </div>
                ))}
              </button>
            );
          }
          return (
            <button
              type="button"
              className="block w-full min-w-0 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50"
              onClick={() => openAssignModalForLead(lead)}
            >
              <ExecutiveCell
                id={lead.id}
                name={lead.assignedTo}
                email={lead.assignedRole}
              />
            </button>
          );
        },
      },
      {
        id: "leadStatus",
        header: "Lead Status",
        className: "w-[106px] max-w-[106px]",
        headerClassName: "w-[106px]",
        cell: (lead) => (
          <button
            type="button"
            className="inline-flex max-w-full align-top"
            onClick={() => openLeadUpdateModal(lead, "status")}
          >
            <Badge
              className={cn(
                "inline-flex w-fit max-w-full whitespace-nowrap border-0 px-2 py-0.5 text-[10px] font-extrabold leading-none transition-opacity hover:opacity-85",
                lead.stageTone,
              )}
            >
              {tableLabel(lead.status, "New Lead")}
            </Badge>
          </button>
        ),
      },
      {
        id: "leadType",
        header: "Lead Type",
        className: "w-[92px] max-w-[92px]",
        headerClassName: "w-[92px]",
        cell: (lead) => (
          <button
            type="button"
            className="inline-flex h-6 min-w-[64px] items-center justify-center rounded-md border border-success/25 bg-success/10 px-1.5 text-[10px] font-extrabold text-success transition-opacity hover:opacity-85"
            onClick={() => openLeadUpdateModal(lead, "leadType")}
          >
            {lead.leadType}
          </button>
        ),
      },
      {
        id: "followUpDate",
        header: "Follow-up Date",
        className: "w-[96px] max-w-[96px]",
        headerClassName: "w-[96px]",
        cell: (lead) => (
          <span className="whitespace-pre-line text-[10px] font-semibold text-secondary">
            {lead.nextFollowUp}
          </span>
        ),
      },
      {
        id: "remark",
        header: "Remark",
        className: "w-[164px] max-w-[164px]",
        headerClassName: "w-[164px]",
        cell: (lead) => (
          <button
            type="button"
            className="block w-full truncate text-left text-[10px] font-semibold text-muted-foreground transition-colors hover:text-secondary"
            onClick={() =>
              setRemarkLead({
                id: lead.backendId ?? lead.id,
                name: lead.name,
                remark: lead.remark,
                mobile: lead.mobile,
                requirement: lead.propertyType,
                ownerId: lead.ownerId,
                telecallerId: lead.telecallerId,
                fieldExecutiveId: lead.fieldExecutiveId,
              })
            }
          >
            {lead.remark}
          </button>
        ),
      },
      {
        id: "actions",
        header: "Action Button",
        headerClassName: "w-[88px] text-right",
        className: "w-[88px] text-right align-middle",
        cell: (lead) => (
          <LeadActionsMenu
            lead={{
              id: lead.backendId ?? lead.id,
              name: lead.name,
              mobile: lead.mobile,
              requirement: lead.propertyType,
              ownerId: lead.ownerId,
              telecallerId: lead.telecallerId,
              fieldExecutiveId: lead.fieldExecutiveId,
            }}
            allowEdit={!fieldExecutiveRoute && !telecallerRoute}
            allowDelete={!fieldExecutiveRoute && !telecallerRoute}
            onEdit={
              onEditLead ? (actionLead) => onEditLead(actionLead.id) : undefined
            }
          />
        ),
      },
    ],
    [
      allSelected,
      navigate,
      projectLookupById,
      projectLookupByName,
      selectedLeadIds,
      fieldExecutiveRoute,
      onEditLead,
      openLeadUpdateModal,
      telecallerRoute,
      toggleAll,
      toggleLead,
    ],
  );

  const orderedColumns = useMemo<ColumnDef<LeadRow>[]>(() => {
    const nextColumns = [
      columns[0],
      ...visibleColumnIds
        .map((columnId: string) =>
          columns.find((column) => String(column.id) === columnId),
        )
        .filter(isLeadColumn),
    ];

    return nextColumns.map((column, index) => ({
      ...column,
      className: cn(index > 0 && "border-l border-slate-100", column.className),
      headerClassName: cn(
        index > 0 && "border-l border-slate-200",
        column.headerClassName,
      ),
    }));
  }, [columns, visibleColumnIds]);
  const assignmentActionPending = bulkAssign.isPending || bulkPatch.isPending;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    rowsPerPage,
    totalVisibleRows,
    activeLeadBucketFilter,
    selectedSlaFilter,
  ]);

  const multiSelectFields = [
    "sourceId",
    "statusId",
    "temperatureId",
    "propertyType",
    "configuration",
    "area",
    "projectId",
    "ownerId",
    "teamId",
  ] as const;
  type MultiSelectFilterKey = (typeof multiSelectFields)[number];
  type FilterField = {
    key: MultiSelectFilterKey;
    label: string;
    placeholder: string;
    options: LeadFilterOption[];
  };

  const filterFields = useMemo(() => {
    if (!filterOptions) return [];
    return (
      [
        {
          key: "sourceId",
          label: "Lead Source",
          placeholder: "All Source",
          options: filterOptions.sourceOptions,
        },
        {
          key: "statusId",
          label: "Lead Status",
          placeholder: "All Status",
          options: filterOptions.statusOptions,
        },
        {
          key: "temperatureId",
          label: "Lead Type",
          placeholder: "All Lead Types",
          options: filterOptions.leadTypeOptions,
        },
        {
          key: "propertyType",
          label: "Property Type",
          placeholder: "All Property Type",
          options: filterOptions.propertyTypeOptions,
        },
        {
          key: "configuration",
          label: "Configuration",
          placeholder: "All Configuration",
          options: filterOptions.configurationOptions,
        },
        {
          key: "ownerId",
          label: "Assigned To",
          placeholder: "All Assigned To",
          options: filterOptions.ownerOptions,
        },
        {
          key: "teamId",
          label: "Team-wise",
          placeholder: "All Teams",
          options: filterOptions.teamOptions,
        },
        {
          key: "area",
          label: "Area-wise",
          placeholder: "All Areas",
          options: filterOptions.areaOptions,
        },
        {
          key: "projectId",
          label: "Project",
          placeholder: "All Projects",
          options: filterOptions.projectOptions,
        },
      ] satisfies FilterField[]
    ).filter((filter) => {
      if (hideTeamFilter && filter.key === "teamId") return false;
      if (!canViewSourceColumn && filter.key === "sourceId") return false;
      return true;
    });
  }, [filterOptions, hideTeamFilter, canViewSourceColumn]);

  const activeFilterCount = useMemo(() => {
    if (!filters) return 0;
    return (
      multiSelectFields.filter((key) => {
        if (hideTeamFilter && key === "teamId") return false;
        if (!canViewSourceColumn && key === "sourceId") return false;
        return (filters[key] ?? []).length > 0;
      }).length +
      (dateRange && dateRange !== "all" ? 1 : 0) +
      (selectedSlaFilter && selectedSlaFilter !== "all" ? 1 : 0)
    );
  }, [
    filters,
    hideTeamFilter,
    canViewSourceColumn,
    dateRange,
    selectedSlaFilter,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-5">
      {filters &&
      filterOptions &&
      onFilterChange &&
      onDateRangeChange &&
      onSlaFilterChange &&
      !isFilterCollapsed ? (
        <Card
          id="all-leads-advanced-filters"
          className="rounded-md border border-slate-200 bg-white p-4 shadow-card space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-blue-700" />
              <h3 className="text-sm font-extrabold text-secondary">
                Advanced Filters
              </h3>
              <Badge
                variant="neutral"
                className="rounded-md bg-blue-50 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700 border border-blue-200"
              >
                {activeFilterCount} active
              </Badge>
            </div>
            {activeFilterCount > 0 && onResetFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs font-extrabold text-slate-500 hover:text-slate-900"
                onClick={onResetFilters}
              >
                Reset all
              </Button>
            ) : null}
          </div>

          <div className="space-y-4 pt-1">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filterFields.map((filter) => (
                <div key={filter.key} className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    {filter.label}
                  </span>
                  <MultiSelect
                    value={filters[filter.key] ?? []}
                    onValueChange={(value) => onFilterChange(filter.key, value)}
                    options={filter.options.map((option: LeadFilterOption) => ({
                      label: option.label,
                      value: option.value,
                    }))}
                    placeholder={filter.placeholder}
                    ariaLabel={filter.label}
                    className="min-h-10 rounded-md bg-white"
                    contentClassName="min-w-[280px]"
                    searchPlaceholder={`Search ${filter.label.toLowerCase()}...`}
                    selectedLabelText={filter.label.toLowerCase()}
                    selectedLabelTextPlural={filter.label.toLowerCase()}
                    showTriggerIcon={false}
                    showTriggerSummary={false}
                    modal={false}
                    portaled={false}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Date Range
                </span>
                <div className="space-y-2">
                  <SearchableSelect
                    value={dateRange ?? "all"}
                    onValueChange={(value) =>
                      onDateRangeChange(value as DateRangeFilter)
                    }
                    options={dateRangeOptions}
                    placeholder="All Date Range"
                    ariaLabel="Date Range"
                    searchPlaceholder="Search date range..."
                    className="bg-white"
                    contentClassName="min-w-[260px]"
                    modal={false}
                    portaled={false}
                  />
                  {dateRange === "custom" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <DatePicker
                        aria-label="Custom range start date"
                        value={filters.from}
                        max={filters.to || undefined}
                        className="h-10 rounded-md text-xs font-bold shadow-none bg-white"
                        onChange={(event) =>
                          onFilterChange("from", event.target.value)
                        }
                      />
                      <DatePicker
                        aria-label="Custom range end date"
                        value={filters.to}
                        min={filters.from || undefined}
                        className="h-10 rounded-md text-xs font-bold shadow-none bg-white"
                        onChange={(event) =>
                          onFilterChange("to", event.target.value)
                        }
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
                  value={selectedSlaFilter ?? "all"}
                  onValueChange={(value) =>
                    onSlaFilterChange(
                      value as "all" | "on-time" | "due-soon" | "breached",
                    )
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
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-3">
              {onApplyFilters ? (
                <Button
                  type="button"
                  className="h-9 rounded-md px-6 text-xs font-extrabold"
                  onClick={onApplyFilters}
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  Apply Filter
                </Button>
              ) : null}
              {onResetFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md px-5 text-xs font-extrabold shadow-none bg-white"
                  onClick={onResetFilters}
                >
                  Reset
                </Button>
              ) : null}
              {onExportLeads ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md px-5 text-xs font-extrabold shadow-none bg-white"
                  onClick={onExportLeads}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export Leads
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
        {quickLeadStatusFilters && quickLeadStatusFilters.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 pb-3">
            <div
              className="flex flex-wrap items-center gap-2.5"
              aria-label="Quick lead status filters"
            >
              {(() => {
                const isAllActive =
                  activeLeadBucketFilter === "all" &&
                  (!appliedStatusIds || appliedStatusIds.length === 0) &&
                  (!appliedTemperatureIds ||
                    appliedTemperatureIds.length === 0);
                const countSource =
                  summaryRows && summaryRows.length > 0 ? summaryRows : rows;
                return (
                  <button
                    type="button"
                    aria-pressed={isAllActive}
                    className={cn(
                      "h-10 rounded-[14px] px-4 text-sm font-extrabold border-0 shadow-none transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/20",
                      isAllActive
                        ? "bg-[#0f1b36] text-white shadow-sm hover:bg-[#162548] hover:text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900",
                    )}
                    onClick={() => onQuickLeadStatusFilter?.("")}
                  >
                    All ({countSource.length})
                  </button>
                );
              })()}
              {quickLeadStatusFilters.map((filter) => {
                const countSource =
                  summaryRows && summaryRows.length > 0 ? summaryRows : rows;
                const isTemperature = filter.kind === "temperature";
                const filterBucketMap: Record<string, LeadBucketFilter> = {
                  "new lead": "new",
                  interested: "interested",
                  "hot lead": "hot",
                  "site visit schedule": "site-visit",
                  "site visit done": "site-visit-completed",
                  "revisit done": "revisit-completed",
                  "re-visit done": "revisit-completed",
                  "booking done": "booked",
                  "not interested": "not-interested",
                };
                const filterBucket =
                  filterBucketMap[filter.label.trim().toLowerCase()];
                const isActive = isTemperature
                  ? Boolean(appliedTemperatureIds?.includes(filter.value))
                  : Boolean(appliedStatusIds?.includes(filter.value)) ||
                    Boolean(
                      filterBucket && activeLeadBucketFilter === filterBucket,
                    );

                const count = isTemperature
                  ? countSource.filter((lead) => {
                      if (
                        lead.temperatureId &&
                        lead.temperatureId === filter.value
                      )
                        return true;
                      const p = (lead.priority || "").trim().toLowerCase();
                      const l = (lead.leadType || "").trim().toLowerCase();
                      const target = filter.label.trim().toLowerCase();
                      return (p && p === target) || (l && l === target);
                    }).length
                  : countSource.filter((lead) => {
                      if (lead.statusId && lead.statusId === filter.value)
                        return true;
                      const s = (lead.status || "").trim().toLowerCase();
                      const stage = (lead.stage || "").trim().toLowerCase();
                      const target = filter.label.trim().toLowerCase();
                      if (
                        s &&
                        (s === target || s === filter.value.toLowerCase())
                      )
                        return true;
                      if (stage && stage === target) return true;
                      if (
                        filterBucket &&
                        activeLeadBucketFilter === filterBucket
                      ) {
                        return matchesLeadBucketFilter(
                          lead,
                          filterBucket,
                          completedSiteVisitLeadIds,
                        );
                      }
                      return false;
                    }).length;

                const getPillTone = () => {
                  if (filter.color) {
                    const c = filter.color.toLowerCase();
                    if (
                      c === "blue" ||
                      c.includes("1b64f2") ||
                      c.includes("3b82f6")
                    )
                      return "bg-[#eaf2ff] text-[#1b64f2] hover:bg-[#dbe9ff] hover:text-[#1b64f2]";
                    if (
                      c === "purple" ||
                      c.includes("b026d3") ||
                      c.includes("7c3aed") ||
                      c.includes("a855f7")
                    )
                      return "bg-[#fbf0ff] text-[#b026d3] hover:bg-[#f5dcff] hover:text-[#b026d3]";
                    if (
                      c === "red" ||
                      c.includes("e11d48") ||
                      c.includes("ef4444")
                    )
                      return "bg-[#ffebe9] text-[#e11d48] hover:bg-[#ffd6d2] hover:text-[#e11d48]";
                    if (
                      c === "orange" ||
                      c === "amber" ||
                      c.includes("d97706") ||
                      c.includes("f59e0b")
                    )
                      return "bg-[#fff8e6] text-[#d97706] hover:bg-[#ffedc2] hover:text-[#d97706]";
                    if (
                      c === "cyan" ||
                      c.includes("0284c7") ||
                      c.includes("06b6d4")
                    )
                      return "bg-[#e6f7ff] text-[#0284c7] hover:bg-[#cceeff] hover:text-[#0284c7]";
                    if (
                      c === "emerald" ||
                      c === "green" ||
                      c.includes("059669") ||
                      c.includes("10b981")
                    )
                      return "bg-[#ecfdf5] text-[#059669] hover:bg-[#d1fae5] hover:text-[#059669]";
                    if (c === "pink" || c.includes("db2777"))
                      return "bg-[#fdf2f8] text-[#db2777] hover:bg-[#fce7f3] hover:text-[#db2777]";
                    if (c === "indigo" || c.includes("4f46e5"))
                      return "bg-[#eef2ff] text-[#4f46e5] hover:bg-[#e0e7ff] hover:text-[#4f46e5]";
                  }
                  const l = filter.label.toLowerCase();
                  if (l.includes("new"))
                    return "bg-[#eaf2ff] text-[#1b64f2] hover:bg-[#dbe9ff] hover:text-[#1b64f2]";
                  if (l.includes("interest"))
                    return "bg-[#fbf0ff] text-[#b026d3] hover:bg-[#f5dcff] hover:text-[#b026d3]";
                  if (l.includes("hot"))
                    return "bg-[#ffebe9] text-[#e11d48] hover:bg-[#ffd6d2] hover:text-[#e11d48]";
                  if (l.includes("warm"))
                    return "bg-[#fff8e6] text-[#d97706] hover:bg-[#ffedc2] hover:text-[#d97706]";
                  if (l.includes("cold"))
                    return "bg-[#e6f7ff] text-[#0284c7] hover:bg-[#cceeff] hover:text-[#0284c7]";
                  if (l.includes("schedule"))
                    return "bg-[#fff8e6] text-[#d97706] hover:bg-[#ffedc2] hover:text-[#d97706]";
                  if (l.includes("site visit done"))
                    return "bg-[#e6f7ff] text-[#0284c7] hover:bg-[#cceeff] hover:text-[#0284c7]";
                  if (l.includes("revisit"))
                    return "bg-[#f3e8ff] text-[#7c3aed] hover:bg-[#e9d5ff] hover:text-[#7c3aed]";
                  return "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900";
                };

                return (
                  <button
                    key={`${filter.kind ?? "status"}-${filter.value}`}
                    type="button"
                    aria-pressed={isActive}
                    className={cn(
                      "h-10 rounded-[14px] px-4 text-sm font-extrabold border-0 shadow-none transition-all cursor-pointer outline-none focus:ring-2 focus:ring-primary/20",
                      isActive
                        ? "bg-[#0f1b36] text-white shadow-sm hover:bg-[#162548] hover:text-white"
                        : getPillTone(),
                    )}
                    onClick={() => onQuickLeadStatusFilter?.(filter)}
                  >
                    {filter.label} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/40 p-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-extrabold text-secondary">
              {selectedCount} selected
            </p>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md bg-white shadow-none"
                >
                  Update
                  <ChevronRight className="h-4 w-4 rotate-90" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {canUpdateExecutive ? (
                  <>
                    <DropdownMenuItem onClick={() => openUpdateModal("assign")}>
                      Assign To
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openUpdateModal("duplicate")}
                    >
                      Duplicate & Assign To
                    </DropdownMenuItem>
                  </>
                ) : null}
                {canViewSourceColumn && canUpdateSource ? (
                  <DropdownMenuItem onClick={() => openUpdateModal("source")}>
                    Lead Source
                  </DropdownMenuItem>
                ) : null}
                {canUpdateField("status") ? (
                  <DropdownMenuItem onClick={() => openUpdateModal("status")}>
                    Status
                  </DropdownMenuItem>
                ) : null}
                {canUpdateField("leadType") ? (
                  <DropdownMenuItem onClick={() => openUpdateModal("leadType")}>
                    Lead Type
                  </DropdownMenuItem>
                ) : null}
                {canUpdateProject ? (
                  <DropdownMenuItem onClick={() => openUpdateModal("project")}>
                    Project Name
                  </DropdownMenuItem>
                ) : null}
                {!canUpdateExecutive &&
                !canUpdateSource &&
                !canUpdateField("status") &&
                !canUpdateField("leadType") &&
                !canUpdateProject ? (
                  <DropdownMenuItem disabled>
                    No update actions allowed
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            {!employeeRoute ? (
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-md border-red-200 bg-white text-red-600 shadow-none hover:bg-red-50 hover:text-red-700"
                disabled={!selectedCount || bulkDeleteLeads.isPending}
                onClick={() => setBulkDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-md bg-white shadow-none"
            onClick={() => setColumnDialogOpen(true)}
          >
            Column visibility
          </Button>
        </div>
        <DataTable
          className="border-0 shadow-none rounded-none"
          tableClassName="table-fixed"
          columns={orderedColumns}
          data={paginatedRows}
          isLoading={isLoading}
          emptyMessage="No leads found for these filters."
        />
        <ConfirmDeleteDialog
          open={bulkDeleteOpen}
          title="Delete selected leads?"
          description={`${selectedCount} selected lead${
            selectedCount === 1 ? "" : "s"
          } will be moved to Deleted Leads. You can restore ${
            selectedCount === 1 ? "it" : "them"
          } later.`}
          confirmLabel="Delete Selected"
          isLoading={bulkDeleteLeads.isPending}
          onConfirm={() => bulkDeleteLeads.mutate()}
          onCancel={() => setBulkDeleteOpen(false)}
          onClose={() => setBulkDeleteOpen(false)}
        />
        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-semibold text-secondary">
            {isLoading
              ? "Loading leads..."
              : `Showing ${rangeStart} to ${rangeEnd} of ${totalVisibleRows} leads`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-8 w-8 rounded-md p-0 shadow-none"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {paginationItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-8 w-8 items-center justify-center text-xs font-bold text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  type="button"
                  variant={item === currentPage ? "navy" : "outline"}
                  className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
                  onClick={() => setCurrentPage(item)}
                >
                  {item}
                </Button>
              ),
            )}
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
          </div>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => setRowsPerPage(Number(value))}
          >
            <SelectTrigger
              aria-label="Rows per page"
              className="h-8 w-[100px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <TablePageSizeOptions sizes={[8, 16, 24]} />
            </SelectContent>
          </Select>
        </div>
      </Card>
      <Dialog
        open={activeUpdateModal === "assign"}
        onOpenChange={(open) => (!open ? closeUpdateModal() : undefined)}
      >
        <DialogContent className="max-w-xl overflow-visible rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Assign Leads To
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Pre Sales Executive
                </span>
                <SearchableSelect
                  value={selectedTelecallerId}
                  onValueChange={setSelectedTelecallerId}
                  options={optionalTelecallerSearchOptions}
                  placeholder="Select Pre Sales Executive"
                  searchPlaceholder="Search Pre Sales Executive..."
                  noOptionsText="No Pre Sales Executive users found"
                  className="h-11 bg-white"
                  contentClassName="min-w-[300px]"
                  modal={false}
                  portaled={false}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Sales Executive
                </span>
                <SearchableSelect
                  value={selectedFieldExecutiveId}
                  onValueChange={setSelectedFieldExecutiveId}
                  options={optionalFieldExecutiveSearchOptions}
                  placeholder="Not assigned"
                  searchPlaceholder="Search sales executive..."
                  noOptionsText="No sales executives found"
                  className="h-11 bg-white"
                  contentClassName="min-w-[300px]"
                  modal={false}
                  portaled={false}
                />
              </label>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Assign one employee from either role, or one from both roles in
              the same action, to {selectedCount} selected lead
              {selectedCount === 1 ? "" : "s"}.
            </p>
            <ProjectUpdateSection
              enabled={projectUpdateEnabled}
              onEnabledChange={setProjectUpdateEnabled}
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              projectSearchOptions={projectSearchOptions}
              selectedProjectSummary={selectedProjectSummary}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button
              type="button"
              disabled={assignmentActionPending}
              onClick={() => submitAssign(false)}
            >
              Assign Leads
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={activeUpdateModal === "duplicate"}
        onOpenChange={(open) => (!open ? closeUpdateModal() : undefined)}
      >
        <DialogContent className="max-w-xl overflow-visible rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Duplicate & Assign Leads To
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Pre Sales Executive
                </span>
                <SearchableSelect
                  value={selectedTelecallerId}
                  onValueChange={setSelectedTelecallerId}
                  options={optionalTelecallerSearchOptions}
                  placeholder="Select Pre Sales Executive"
                  searchPlaceholder="Search Pre Sales Executive..."
                  noOptionsText="No Pre Sales Executive users found"
                  className="h-11 bg-white"
                  contentClassName="min-w-[300px]"
                  modal={false}
                  portaled={false}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Sales Executive
                </span>
                <SearchableSelect
                  value={selectedFieldExecutiveId}
                  onValueChange={setSelectedFieldExecutiveId}
                  options={optionalFieldExecutiveSearchOptions}
                  placeholder="Not assigned"
                  searchPlaceholder="Search sales executive..."
                  noOptionsText="No sales executives found"
                  className="h-11 bg-white"
                  contentClassName="min-w-[300px]"
                  modal={false}
                  portaled={false}
                />
              </label>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              Select either role or assign one employee from each role in the
              same action.
            </p>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-extrabold text-secondary">
                Duplicate options
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Checkbox
                  label="Duplicate Follow-up"
                  checked={duplicateReminder}
                  className="rounded-md bg-white px-3 py-2 shadow-sm"
                  onChange={(event) =>
                    setDuplicateReminder(event.currentTarget.checked)
                  }
                />
                <Checkbox
                  label="Duplicate Remark"
                  checked={duplicateRemark}
                  className="rounded-md bg-white px-3 py-2 shadow-sm"
                  onChange={(event) =>
                    setDuplicateRemark(event.currentTarget.checked)
                  }
                />
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">
              {selectedCount} selected lead{selectedCount === 1 ? "" : "s"} will
              be duplicated and assigned to the selected employee.
            </p>
            <ProjectUpdateSection
              enabled={projectUpdateEnabled}
              onEnabledChange={setProjectUpdateEnabled}
              selectedProjectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              projectSearchOptions={projectSearchOptions}
              selectedProjectSummary={selectedProjectSummary}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button
              type="button"
              disabled={assignmentActionPending}
              onClick={() => submitAssign(true)}
            >
              Assign Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={activeUpdateModal === "leadUpdate"}
        onOpenChange={(open) => (!open ? closeUpdateModal() : undefined)}
      >
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
                    value={selectedStatusId}
                    onValueChange={handleLeadUpdateStatusChange}
                    options={statusSearchOptions}
                    placeholder="Select status"
                    searchPlaceholder="Search statuses..."
                    noOptionsText="No statuses found"
                    className="h-11 bg-white"
                    modal={false}
                    portaled={false}
                  />
                  {selectedStatusTriggerLabel ? (
                    <span className="block rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-primary">
                      Trigger action: {selectedStatusTriggerLabel}. After this
                      status is saved, continue with the configured business
                      flow for the selected lead.
                    </span>
                  ) : null}
                </label>
              ) : null}
              {canUpdateField("leadType") ? (
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Type
                  </span>
                  <SearchableSelect
                    value={selectedLeadTypeId}
                    onValueChange={setSelectedLeadTypeId}
                    options={leadTypeSearchOptions}
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
                        value={leadUpdateFollowUpDate}
                        className="h-11 bg-white"
                        disabled={!selectedStatusAllowsFollowUp}
                        onChange={(event) =>
                          setLeadUpdateFollowUpDate(event.target.value)
                        }
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs font-extrabold text-secondary">
                        Follow-up time
                      </span>
                      <ClockTimePicker
                        value={leadUpdateFollowUpTime}
                        options={followUpTimes}
                        disabled={!selectedStatusAllowsFollowUp}
                        widthClassName="w-full bg-white"
                        onChange={setLeadUpdateFollowUpTime}
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
              ) : null}
              {canUpdateField("location") ? (
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Location
                  </span>
                  <SearchableSelect
                    value={selectedLocation}
                    onValueChange={setSelectedLocation}
                    options={locationSearchOptions}
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
              ) : null}
              {canUpdateField("source") ? (
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Source
                  </span>
                  <SearchableSelect
                    value={bulkSourceId}
                    onValueChange={setBulkSourceId}
                    options={sourceSearchOptions}
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
                    value={selectedRemark}
                    onChange={(event) =>
                      setSelectedRemark(event.currentTarget.value)
                    }
                    placeholder="Enter new remark..."
                    className="min-h-20 bg-white"
                  />
                </label>
              ) : null}
            </div>

            <p className="text-xs font-semibold text-muted-foreground">
              {selectedCount} selected lead{selectedCount === 1 ? "" : "s"} will
              receive the filled updates.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button
              type="button"
              disabled={bulkPatch.isPending}
              onClick={submitLeadUpdate}
            >
              Update Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <CreateSiteVisitModal
        open={triggerSiteVisitOpen}
        form={triggerSiteVisitForm}
        rows={[]}
        optionsData={siteVisitOptionsQuery.data}
        isSaving={siteVisitMutations.createVisit.isPending}
        lockedLeadId={triggerSiteVisitForm.leadId}
        onOpenChange={(open) => {
          setTriggerSiteVisitOpen(open);
          if (!open) {
            setTriggerSiteVisitForm(createDefaultSiteVisitForm());
          }
        }}
        onChange={updateTriggerSiteVisitForm}
        onSubmit={() => {
          void submitTriggerSiteVisit().catch((error: unknown) =>
            toast.error(
              getApiErrorMessage(error, "Unable to schedule site visit"),
            ),
          );
        }}
      />
      {activeBookingLead ? (
        <CreateBookingDialog
          open={Boolean(triggerBookingLead)}
          lead={activeBookingLead}
          defaults={activeBookingLead.defaults}
          projects={siteVisitOptionsQuery.data?.projects ?? []}
          masterConfigurationOptions={configurationOptions.map((o) => o.value)}
          onOpenChange={(open) => {
            if (!open) {
              setTriggerBookingLead(null);
            }
          }}
          onCreated={() => {
            void Promise.all([
              queryClient.invalidateQueries({ queryKey: ["leads"] }),
              queryClient.invalidateQueries({ queryKey: ["lead-details"] }),
              queryClient.invalidateQueries({ queryKey: ["bookings"] }),
            ]);
          }}
        />
      ) : null}
      <LeadPreviewDialog
        leadId={previewLeadId}
        open={Boolean(previewLeadId)}
        onOpenChange={(open) => {
          if (!open) setPreviewLeadId(null);
        }}
        onOpenDetails={(leadId) => {
          setPreviewLeadId(null);
          navigate(`/leads/${leadId}`);
        }}
        actions={{
          assign: {
            enabled: canUpdateExecutive,
            onClick: () => openPreviewAction(openAssignModalForLead),
          },
          status: {
            enabled: canUpdateField("status"),
            onClick: () =>
              openPreviewAction((lead) => openLeadUpdateModal(lead, "status")),
          },
          leadType: {
            enabled: canUpdateField("leadType"),
            onClick: () =>
              openPreviewAction((lead) =>
                openLeadUpdateModal(lead, "leadType"),
              ),
          },
          followUp: {
            enabled: canUpdateAnyLeadField(["followUpDate", "remark"]),
            onClick: () =>
              openPreviewAction((lead) => openLeadUpdateModal(lead, "status")),
          },
          requirement: {
            enabled: canUpdateAnyLeadField([
              "budget",
              "location",
              "configuration",
            ]),
            onClick: () =>
              openPreviewAction((lead) => openLeadUpdateModal(lead, "status")),
          },
          source: canViewSourceColumn
            ? {
                enabled: canUpdateSource,
                onClick: () => openPreviewAction(openSourceModalForLead),
              }
            : undefined,
          project: {
            enabled: canUpdateProject,
            onClick: () => openPreviewAction(openProjectModalForLead),
          },
          remark: {
            enabled: canUpdateField("remark"),
            onClick: () => openPreviewAction(openRemarkModalForLead),
          },
        }}
      />
      <Dialog
        open={activeUpdateModal === "source"}
        onOpenChange={(open) => (!open ? closeUpdateModal() : undefined)}
      >
        <DialogContent className="max-w-xl overflow-visible rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Update Lead Source
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Lead Source
              </span>
              <SearchableSelect
                value={bulkSourceId}
                onValueChange={setBulkSourceId}
                options={sourceSearchOptions}
                placeholder="Select lead source"
                searchPlaceholder="Search lead sources..."
                noOptionsText="No lead sources found"
                className="h-11 bg-white"
                modal={false}
                portaled={false}
              />
            </label>
            <p className="text-xs font-semibold text-muted-foreground">
              {selectedCount} selected lead{selectedCount === 1 ? "" : "s"} will
              receive this source.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button
              type="button"
              disabled={bulkSource.isPending}
              onClick={submitSource}
            >
              Update Source
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={activeUpdateModal === "project"}
        onOpenChange={(open) => (!open ? closeUpdateModal() : undefined)}
      >
        <DialogContent className="max-w-xl overflow-visible rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Update Project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Project Name
              </span>
              <SearchableSelect
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                options={projectSearchOptions}
                placeholder="Select project"
                searchPlaceholder="Search by project, location, or developer..."
                noOptionsText="No projects found"
                className="h-12 bg-white"
                contentClassName="min-w-[360px]"
                modal={false}
                portaled={false}
              />
            </label>
            <p className="text-xs font-semibold text-muted-foreground">
              {selectedCount} selected lead{selectedCount === 1 ? "" : "s"} will
              be linked to this project.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button
              type="button"
              disabled={bulkPatch.isPending}
              onClick={submitProject}
            >
              Update Project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={columnDialogOpen} onOpenChange={setColumnDialogOpen}>
        <DialogContent className="flex h-[min(78vh,760px)] w-[min(92vw,64rem)] max-w-4xl flex-col overflow-hidden rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-extrabold text-secondary">
                  Lead page column visibility
                </DialogTitle>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  Control which columns appear and how they are ordered in the
                  All Leads table.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Visible now
                </p>
                <p className="mt-1 text-sm font-extrabold text-secondary">
                  {visibleColumnIds.length} / {columnOptions.length}
                </p>
              </div>
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
              <section className="rounded-[14px] border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm font-extrabold text-secondary">
                    Visible column order
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Rearrange only the columns that are currently visible.
                  </p>
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto px-4 py-4">
                  {visibleColumnEntries.map(
                    ([id, label]: ColumnOption, index: number) => (
                      <div
                        key={id}
                        draggable={!columnsPreference.mutation.isPending}
                        onDragStart={(event) => {
                          setDraggedColumnId(id);
                          setDropTargetColumnId(id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", id);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggedColumnId && draggedColumnId !== id) {
                            setDropTargetColumnId(id);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const droppedColumnId =
                            event.dataTransfer.getData("text/plain") ||
                            draggedColumnId;
                          if (!droppedColumnId) return;
                          reorderColumns(droppedColumnId, id);
                          setDraggedColumnId(null);
                          setDropTargetColumnId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedColumnId(null);
                          setDropTargetColumnId(null);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition-colors",
                          columnsPreference.mutation.isPending
                            ? "cursor-default"
                            : "cursor-grab active:cursor-grabbing",
                          draggedColumnId === id && "opacity-60",
                          dropTargetColumnId === id &&
                            draggedColumnId !== id &&
                            "border-primary bg-orange-50",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-muted-foreground shadow-none">
                            <GripVertical className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-secondary">
                              {label}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground">
                              Position {index + 1}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 bg-white shadow-none"
                            disabled={
                              columnsPreference.mutation.isPending ||
                              index === 0
                            }
                            onClick={() => moveColumn(id, "up")}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8 bg-white shadow-none"
                            disabled={
                              columnsPreference.mutation.isPending ||
                              index === visibleColumnEntries.length - 1
                            }
                            onClick={() => moveColumn(id, "down")}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section className="rounded-[14px] border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm font-extrabold text-secondary">
                    Show or hide columns
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Changes are saved immediately. Locked system columns remain
                    visible.
                  </p>
                </div>
                <div className="max-h-[420px] overflow-y-auto px-4 py-4">
                  <div className="grid gap-3">
                    {columnOptions.map(([id, label]) => {
                      const isChecked = visibleColumnIds.includes(id);
                      const isLocked = lockedColumnIds.has(id);
                      return (
                        <Checkbox
                          key={id}
                          label={isLocked ? `${label} (locked)` : label}
                          checked={isChecked}
                          disabled={isLocked}
                          className={cn(
                            "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:bg-slate-50",
                            isLocked && "cursor-not-allowed opacity-75",
                          )}
                          onChange={() => toggleColumn(id, !isChecked)}
                        />
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p
              className="text-xs font-semibold text-muted-foreground"
              aria-live="polite"
            >
              {columnsPreference.mutation.isPending
                ? "Saving column preferences..."
                : "Preferences are saved automatically."}
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={columnsPreference.mutation.isPending}
                onClick={resetColumns}
              >
                Reset
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setColumnDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <RemarksDialog
        lead={remarkLead}
        open={Boolean(remarkLead)}
        onOpenChange={(open) => {
          if (!open) {
            setRemarkLead(null);
          }
        }}
      />
    </div>
  );
}

export function AllLeadsScreen() {
  useLeadRealtimeInvalidation();
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as { openAddLead?: boolean } | null;
  const searchParams = new URLSearchParams(location.search);
  const requestedBucket = searchParams.get("bucket");
  const requestedWorkspaceScope = searchParams.get("scope");
  const requestedOpenAddLead = searchParams.get("openAddLead") === "true";
  const [search, setSearch] = useState("");
  const [draftFilters, setDraftFilters] =
    useState<LeadListFilters>(initialLeadFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<LeadListFilters>(initialLeadFilters);
  const [selectedDateRange, setSelectedDateRange] =
    useState<DateRangeFilter>("all");
  const [selectedSlaFilter, setSelectedSlaFilter] = useState<SlaFilter>("all");
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [activeLeadBucketFilter, setActiveLeadBucketFilter] =
    useState<LeadBucketFilter>(() =>
      requestedBucket === "hot" || requestedBucket === "cold"
        ? requestedBucket
        : "all",
    );
  const [addLeadOpen, setAddLeadOpen] = useState(
    () => routeState?.openAddLead === true || requestedOpenAddLead,
  );
  const [editLeadId, setEditLeadId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedExportColumnIds, setSelectedExportColumnIds] = useState<
    string[]
  >([]);
  const authUser = useAppSelector((state) => state.auth.user);
  const { canCreate: canCreateLead } = usePermission("leads");
  const fieldExecutiveRoute = isFieldExecutivePath(location.pathname);
  const telecallerRoute = location.pathname.startsWith("/telecaller/");
  const scopedLeadRole =
    authUser?.role === "TEAM_LEADER" || authUser?.role === "MANAGER";
  const employeeRoute =
    fieldExecutiveRoute || telecallerRoute || scopedLeadRole;
  const [leadWorkspaceScope, setLeadWorkspaceScope] =
    useState<LeadWorkspaceScope>(() =>
      requestedWorkspaceScope === "team" ? "team" : "mine",
    );
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState("all");
  const meQuery = useQuery({
    queryKey: ["employees", "me", "lead-workspace"],
    queryFn: async () => (await api.get("/employees/me")).data,
    enabled: employeeRoute,
    retry: false,
  });
  const isMappedTeamLeader = Boolean(meQuery.data?.isTeamLeader);
  const canUseScopedLeadWorkspace = isMappedTeamLeader || scopedLeadRole;
  const isTeamLeadScope =
    employeeRoute && canUseScopedLeadWorkspace && leadWorkspaceScope === "team";
  const activeTeamMemberId =
    selectedTeamMemberId === "all" ? undefined : selectedTeamMemberId;

  useEffect(() => {
    if (!canUseScopedLeadWorkspace && leadWorkspaceScope === "team") {
      setLeadWorkspaceScope("mine");
      setSelectedTeamMemberId("all");
    }
  }, [canUseScopedLeadWorkspace, leadWorkspaceScope]);

  useEffect(() => {
    const shouldOpenAddLead =
      routeState?.openAddLead === true || requestedOpenAddLead;
    const shouldSetBucket =
      requestedBucket === "hot" || requestedBucket === "cold";

    if (!shouldOpenAddLead && !shouldSetBucket) {
      return;
    }

    if (shouldOpenAddLead) {
      setAddLeadOpen(true);
    }

    if (shouldSetBucket) {
      setActiveLeadBucketFilter(requestedBucket as LeadBucketFilter);
    }

    navigate(
      {
        pathname: location.pathname,
        search: "",
      },
      {
        replace: true,
        state: null,
      },
    );
  }, [
    location.pathname,
    location.search,
    navigate,
    requestedBucket,
    requestedOpenAddLead,
    routeState?.openAddLead,
  ]);

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: fieldExecutiveRoute
          ? fieldExecutiveSidebarItems
          : telecallerRoute
          ? telecallerSidebarItems
          : addLeadSidebarItems,
        activeItem: fieldExecutiveRoute ? "My Leads" : "Lead Management",
        activeChild: fieldExecutiveRoute
          ? undefined
          : telecallerRoute
          ? "My Leads"
          : "All Leads",
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span>
              {fieldExecutiveRoute ? "Field Operations" : "Lead Management"}
            </span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">
              {isTeamLeadScope
                ? "Team Leads"
                : fieldExecutiveRoute || telecallerRoute
                ? "My Leads"
                : "All Leads"}
            </span>
          </div>
        ),
        headerContent: (
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="lead-list-search"
                autoComplete="off"
                aria-label="Search leads"
                value={search}
                placeholder={
                  fieldExecutiveRoute
                    ? "Search assigned leads, mobile number, property..."
                    : telecallerRoute
                    ? "Search my assigned leads, mobile number, property..."
                    : "Search leads, customers, projects, mobile number, property..."
                }
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none bg-white"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
          </div>
        ),
      },
    },
    [fieldExecutiveRoute, isTeamLeadScope, telecallerRoute, search],
  );

  const filterOptionsQuery = useLeadListFilterOptions();
  const screenColumnPreference = useLeadColumnPreferences();
  const screenVisibleColumnIds =
    screenColumnPreference.query.data?.visibleColumns ?? leadColumnDefaults;
  const exportableColumns = useMemo<ExportColumnOption[]>(() => {
    const screenExportColumns = (
      screenColumnPreference.query.data?.systemColumns ?? exportColumnFallback
    )
      .filter(
        (column: { id: string; label: string }) => column.id !== "actions",
      )
      .map((column: { id: string; label: string }) => ({
        id: column.id,
        label: column.label,
      }));
    const existingIds = new Set(
      screenExportColumns.map((column: { id: string }) => column.id),
    );
    return [
      ...screenExportColumns,
      ...exportOnlyColumnOptions.filter(
        (column) => !existingIds.has(column.id),
      ),
    ];
  }, [screenColumnPreference.query.data?.systemColumns]);
  const canViewSourceColumn = screenVisibleColumnIds.includes("source");
  const effectiveAppliedFilters = useMemo<LeadListFilters>(
    () =>
      canViewSourceColumn
        ? appliedFilters
        : { ...appliedFilters, sourceId: [] },
    [appliedFilters, canViewSourceColumn],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeLeadBucketFilter, appliedFilters]);

  const leadsSegment =
    activeLeadBucketFilter === "hot"
      ? "hot"
      : activeLeadBucketFilter === "cold"
      ? "cold"
      : activeLeadBucketFilter === "not-interested"
      ? "lost"
      : activeLeadBucketFilter === "new"
      ? "new"
      : activeLeadBucketFilter === "interested"
      ? "interested"
      : activeLeadBucketFilter === "follow-up"
      ? "follow-up"
      : activeLeadBucketFilter === "site-visit"
      ? "site-visit"
      : activeLeadBucketFilter === "site-visit-completed"
      ? "site-visit-completed"
      : activeLeadBucketFilter === "revisit-completed"
      ? "revisit-completed"
      : activeLeadBucketFilter === "booked"
      ? "booked"
      : undefined;

  const summaryAppliedFilters = useMemo<LeadListFilters>(
    () => ({
      ...effectiveAppliedFilters,
      statusId: [],
      stageId: [],
    }),
    [effectiveAppliedFilters],
  );

  const leadsQuery = useAllLeads(
    search,
    leadsSegment,
    undefined,
    effectiveAppliedFilters,
    rowsPerPage,
    currentPage,
  );
  const summaryLeadsQuery = useAllLeads(
    search,
    undefined,
    undefined,
    summaryAppliedFilters,
    LEAD_TABLE_MAX_ROWS,
    1,
  );
  const teamLeadWorkspaceQuery = useTeamLeadWorkspace(
    search,
    effectiveAppliedFilters,
    activeTeamMemberId,
    100,
    isTeamLeadScope,
  );
  const siteVisitsQuery = useSiteVisits("", LEAD_TABLE_MAX_ROWS);
  const rows = useMemo(
    () =>
      isTeamLeadScope
        ? teamLeadWorkspaceQuery.data?.rows ?? []
        : leadsQuery.data?.rows ?? [],
    [
      isTeamLeadScope,
      leadsQuery.data?.rows,
      leadsQuery.isError,
      teamLeadWorkspaceQuery.data?.rows,
    ],
  );
  const summaryRows = useMemo(
    () =>
      isTeamLeadScope
        ? teamLeadWorkspaceQuery.data?.rows ?? []
        : summaryLeadsQuery.data?.rows ?? rows,
    [
      isTeamLeadScope,
      rows,
      summaryLeadsQuery.data?.rows,
      teamLeadWorkspaceQuery.data?.rows,
    ],
  );
  const totalPipelineLeads = isTeamLeadScope
    ? teamLeadWorkspaceQuery.data?.meta.total ?? rows.length
    : summaryLeadsQuery.data?.total ?? leadsQuery.data?.total ?? rows.length;
  const tableTotalRows = isTeamLeadScope
    ? teamLeadWorkspaceQuery.data?.meta.total ?? rows.length
    : leadsQuery.data?.total ?? rows.length;
  const totalRows = totalPipelineLeads;
  const activeAdvancedFilterCount = useMemo(
    () =>
      [
        draftFilters.sourceId,
        draftFilters.statusId,
        draftFilters.stageId,
        draftFilters.temperatureId,
        draftFilters.propertyType,
        draftFilters.configuration,
        draftFilters.ownerId,
        draftFilters.telecallerId,
        draftFilters.teamId,
        draftFilters.area,
        draftFilters.projectId ?? [],
      ].filter((values) => values.length > 0).length +
      (selectedDateRange !== "all" ? 1 : 0) +
      (selectedSlaFilter !== "all" ? 1 : 0),
    [draftFilters, selectedDateRange, selectedSlaFilter],
  );
  const statusMasterQuery = useLeadStatusMaster();
  const leadTypeMasterQuery = useLeadTypeMaster();
  const cardPreferences = useLeadCardPreferences("all_leads");
  const completedSiteVisitLeadIds = useMemo(
    () =>
      new Set(
        (siteVisitsQuery.data?.rows ?? [])
          .filter((visit) => visit.checkedOutAt || visit.status === "Completed")
          .map((visit) => visit.leadId),
      ),
    [siteVisitsQuery.data?.rows],
  );
  const quickLeadStatusFilters = useMemo(() => {
    if (cardPreferences.filterPills.length > 0) {
      return cardPreferences.filterPills
        .filter(hasUsableCardItem)
        .map((pill) => ({
          label: pill.name,
          value: pill.id,
          kind:
            pill.category === "lead_type"
              ? ("temperature" as const)
              : ("status" as const),
          color: pill.displayColor,
        }));
    }

    const statusPills =
      statusMasterQuery.filterBarStatuses.length > 0
        ? statusMasterQuery.filterBarStatuses
            .filter((status) => Boolean(status.name?.trim()))
            .map((status) => ({
              label: status.name,
              value: status.id,
              kind: "status" as const,
              color: status.displayColor,
            }))
        : [
            { label: "New Lead", value: "new", kind: "status" as const },
            {
              label: "Interested",
              value: "interested",
              kind: "status" as const,
            },
            { label: "Hot Lead", value: "hot", kind: "status" as const },
            {
              label: "Site Visit Schedule",
              value: "site-visit",
              kind: "status" as const,
            },
            {
              label: "Site Visit Done",
              value: "site-visit-completed",
              kind: "status" as const,
            },
            {
              label: "Revisit Done",
              value: "revisit-completed",
              kind: "status" as const,
            },
          ];

    const leadTypePills = leadTypeMasterQuery.filterBarLeadTypes
      .filter((type) => Boolean(type.name?.trim()))
      .map((type) => ({
        label: type.name,
        value: type.id,
        kind: "temperature" as const,
        color: type.displayColor,
      }));

    return [...statusPills, ...leadTypePills];
  }, [
    cardPreferences.filterPills,
    statusMasterQuery.filterBarStatuses,
    leadTypeMasterQuery.filterBarLeadTypes,
  ]);
  const exportRows = useMemo(
    () =>
      rows.filter((lead) => {
        const matchesSla =
          selectedSlaFilter === "all" ||
          getAdminLeadSla(lead.id).status === selectedSlaFilter;
        const matchesBucket = matchesLeadBucketFilter(
          lead,
          activeLeadBucketFilter,
          completedSiteVisitLeadIds,
        );
        return matchesSla && matchesBucket;
      }),
    [
      activeLeadBucketFilter,
      completedSiteVisitLeadIds,
      rows,
      selectedSlaFilter,
    ],
  );
  const displayStats = useMemo(() => {
    if (isTeamLeadScope && teamLeadWorkspaceQuery.data) {
      const summary = teamLeadWorkspaceQuery.data.summary;
      return [
        {
          label: "Team Leads",
          value: summary.totalTeamLeads,
          helper: teamLeadWorkspaceQuery.data.meta.teamName,
          icon: UsersRound,
          tone: "bg-blue-50 text-blue-700",
        },
        {
          label: "New Leads",
          value: summary.newLeads,
          helper: "Added today",
          icon: UserPlus,
          tone: "bg-green-50 text-success",
        },
        {
          label: "Hot Leads",
          value: summary.hotLeads,
          helper: "Priority pipeline",
          icon: Flame,
          tone: "bg-orange-50 text-primary",
        },
        {
          label: "Follow-Up Due",
          value: summary.pendingFollowUps,
          helper: `${summary.overdueFollowUps} overdue`,
          icon: PhoneCall,
          tone: "bg-violet-50 text-violet-600",
        },
        {
          label: "Site Visits Scheduled",
          value: summary.scheduledSiteVisits,
          helper: `${summary.completedSiteVisits} completed`,
          icon: CalendarCheck,
          tone: "bg-cyan-50 text-cyan-700",
        },
        {
          label: "Bookings Done",
          value: summary.bookedLeads,
          helper: "Converted team leads",
          icon: CheckCircle2,
          tone: "bg-green-50 text-success",
        },
      ];
    }

    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonthCount = summaryRows.filter((lead) =>
      leadMatchesMonth(lead.addedDate, now),
    ).length;
    const previousMonthCount = summaryRows.filter((lead) =>
      leadMatchesMonth(lead.addedDate, previousMonth),
    ).length;
    const totalChange =
      previousMonthCount > 0
        ? `${(
            ((currentMonthCount - previousMonthCount) / previousMonthCount) *
            100
          ).toFixed(1)}%`
        : currentMonthCount > 0
        ? "100.0%"
        : "";
    const countByBucket = (bucket: LeadBucketFilter) =>
      summaryRows.filter((lead) =>
        matchesLeadBucketFilter(lead, bucket, completedSiteVisitLeadIds),
      ).length;

    const activeCardsList =
      cardPreferences.statsCards.length > 0
        ? cardPreferences.statsCards.filter(hasUsableCardItem)
        : [
            ...statusMasterQuery.statsCardStatuses.map((s) => ({
              ...s,
              category: "status" as const,
            })),
            ...leadTypeMasterQuery.statsCardLeadTypes.map((t) => ({
              ...t,
              category: "lead_type" as const,
            })),
          ];

    if (
      activeCardsList.length > 0 &&
      !fieldExecutiveRoute &&
      !telecallerRoute
    ) {
      const bucketKeyMap: Record<string, LeadBucketFilter> = {
        "new lead": "new",
        new: "new",
        interested: "interested",
        "hot lead": "hot",
        hot: "hot",
        "site visit schedule": "site-visit",
        "site visit scheduled": "site-visit",
        "site visit done": "site-visit-completed",
        "revisit done": "revisit-completed",
        "re-visit done": "revisit-completed",
        "bookings done": "booked",
        booked: "booked",
        "not interested": "not-interested",
      };

      const hasTotalLeadsInConfig = activeCardsList.some(
        (i) =>
          i.id === "core:total-leads" || i.name.toLowerCase() === "total leads",
      );

      const dynamicCards: DisplayStatItem[] = [
        ...(!hasTotalLeadsInConfig && cardPreferences.statsCards.length === 0
          ? [
              {
                label: "Total Leads",
                value: totalRows,
                helper: "vs last month",
                change: totalChange,
                icon: UsersRound,
                tone: "bg-blue-50 text-blue-700",
              },
            ]
          : []),
        ...activeCardsList.map((item) => {
          if (
            item.id === "core:total-leads" ||
            item.name.toLowerCase() === "total leads"
          ) {
            return {
              label: item.name,
              value: totalRows,
              helper:
                ("description" in item && (item as any).description) ||
                "vs last month",
              change: totalChange,
              icon: UsersRound,
              tone: item.displayColor
                ? getStatusTone(item.displayColor)
                : "bg-blue-50 text-blue-700",
            };
          }

          if (item.category === "lead_type") {
            const count = summaryRows.filter(
              (lead) =>
                lead.temperatureId === item.id ||
                (lead.priority &&
                  lead.priority
                    .toLowerCase()
                    .includes(item.name.toLowerCase())),
            ).length;
            return {
              label: item.name,
              value: count,
              helper:
                ("description" in item && (item as any).description) ||
                "Lead qualification",
              icon: Flame,
              tone: getStatusTone(
                item.displayColor ||
                  ("tagColor" in item && (item as any).tagColor) ||
                  "orange",
              ),
            };
          }

          const bucket = bucketKeyMap[item.name.toLowerCase()];
          const count = bucket
            ? countByBucket(bucket)
            : summaryRows.filter(
                (lead) =>
                  lead.statusId === item.id ||
                  (lead.statusId &&
                    lead.statusId.toLowerCase() === item.id.toLowerCase()) ||
                  (lead.statusName &&
                    lead.statusName.toLowerCase() ===
                      item.name.toLowerCase()) ||
                  (lead.status &&
                    lead.status.toLowerCase() === item.name.toLowerCase()),
              ).length;
          return {
            label: item.name,
            value: count,
            helper:
              ("description" in item && (item as any).description) ||
              "Pipeline status",
            icon: getStatusIcon(item.name),
            tone: getStatusTone(
              item.displayColor ||
                ("tagColor" in item && (item as any).tagColor) ||
                item.name,
            ),
          };
        }),
      ];
      return dynamicCards;
    }

    const newLeads = countByBucket("new");
    const hotLeads = countByBucket("hot");
    const interestedLeads = countByBucket("interested");
    const followUpDue = countByBucket("follow-up");
    const siteVisits = countByBucket("site-visit");
    const siteVisitsCompleted = countByBucket("site-visit-completed");
    const revisitDone = countByBucket("revisit-completed");
    const convertedLeads = countByBucket("booked");
    const lostLeads = countByBucket("not-interested");

    const baseStats: DisplayStatItem[] = [
      {
        label: "Total Leads",
        value: totalRows,
        helper: "vs last month",
        change: totalChange,
        icon: UsersRound,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        label: "New Leads",
        value: selectedDateRange === "today" ? totalRows : newLeads,
        helper: selectedDateRange === "today" ? "Filtered: Today" : "New Lead",
        icon: UserPlus,
        tone: "bg-green-50 text-success",
      },
      {
        label: "Hot Leads",
        value: hotLeads,
        helper: "Qualified",
        icon: Flame,
        tone: "bg-orange-50 text-primary",
      },
      {
        label: "Interested Leads",
        value: interestedLeads,
        helper: "Active interest",
        icon: Target,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        label: "Follow-Up Due",
        value: followUpDue,
        helper: "Pending",
        icon: PhoneCall,
        tone: "bg-violet-50 text-violet-600",
      },
      {
        label: "Site Visits Scheduled",
        value: siteVisits,
        helper: "Scheduled",
        icon: CalendarCheck,
        tone: "bg-orange-50 text-primary",
      },
      {
        label: "Site Visits Done",
        value: siteVisitsCompleted,
        helper: siteVisitsQuery.isLoading ? "Loading" : "Done",
        icon: CalendarDays,
        tone: "bg-cyan-50 text-cyan-700",
      },
      {
        label: "Re-Visit Done",
        value: revisitDone,
        helper: "Completed revisits",
        icon: CalendarCheck,
        tone: "bg-violet-50 text-violet-700",
      },
      {
        label: "Bookings Done",
        value: convertedLeads,
        helper: "This Month",
        icon: CheckCircle2,
        tone: "bg-green-50 text-success",
      },
      {
        label: "Not Interested",
        value: lostLeads,
        helper: "Inactive Leads",
        icon: Frown,
        tone: "bg-red-50 text-red-500",
      },
    ];

    if (!fieldExecutiveRoute && !telecallerRoute) return baseStats;

    const routeFollowUpDue = rows.filter(
      (lead) => lead.nextFollowUp !== "Not Set",
    ).length;
    const routeSiteVisits = rows.filter(
      (lead) => lead.stage === "Site Visit",
    ).length;
    const routeHotLeads = rows.filter(
      (lead) => lead.priority === "High" || lead.priority === "Urgent",
    ).length;
    const totalLabel = fieldExecutiveRoute ? "My Leads" : "My Leads";
    const totalHelper = fieldExecutiveRoute
      ? "Leads assigned to you as sales executive"
      : "Pre Sales-assigned leads";
    const followUpLabel = fieldExecutiveRoute
      ? "Upcoming Follow-Ups"
      : "Upcoming Follow-Ups";
    const followUpHelper = fieldExecutiveRoute
      ? "Scheduled next steps"
      : "Due for telecalling";
    const hotLabel = fieldExecutiveRoute ? "Priority Leads" : "Priority Leads";
    const hotHelper = fieldExecutiveRoute
      ? "High-intent leads"
      : "Hot or urgent leads";
    const siteVisitLabel = fieldExecutiveRoute
      ? "Site Visit Stage"
      : "Site Visit Stage";
    const siteVisitHelper = fieldExecutiveRoute
      ? "Ready for handoff"
      : "Ready for field coordination";
    const routeStats = baseStats
      .map<DisplayStatItem | null>((stat) => {
        switch (stat.label) {
          case "Total Leads":
            return {
              ...stat,
              label: totalLabel,
              value: totalRows,
              helper: totalHelper,
              change: undefined,
            };
          case "New Leads":
            return {
              ...stat,
              label: followUpLabel,
              value: routeFollowUpDue,
              helper: followUpHelper,
              change: undefined,
            };
          case "Hot Leads":
            return {
              ...stat,
              label: hotLabel,
              value: routeHotLeads,
              helper: hotHelper,
              change: undefined,
            };
          case "Follow-Up Due":
            return {
              ...stat,
              label: siteVisitLabel,
              value: routeSiteVisits,
              helper: siteVisitHelper,
              change: undefined,
            };
          default:
            return null;
        }
      })
      .filter(isDisplayStatItem);
    return routeStats;
  }, [
    fieldExecutiveRoute,
    isTeamLeadScope,
    rows,
    completedSiteVisitLeadIds,
    siteVisitsQuery.isLoading,
    selectedDateRange,
    summaryRows,
    telecallerRoute,
    teamLeadWorkspaceQuery.data,
    totalRows,
    statusMasterQuery.statsCardStatuses,
    leadTypeMasterQuery.statsCardLeadTypes,
    cardPreferences.statsCards,
  ]);
  const statsRowItems = useMemo<LeadStatsRowItem[]>(
    () =>
      displayStats.map((stat: any) => ({
        label: stat.label,
        value: String(stat.value),
        change: stat.change ? String(stat.change).replace(/^↑\s*/, "") : "",
        helper: stat.helper ?? "",
        icon: stat.icon,
        tone: stat.tone,
      })),
    [displayStats],
  );

  const handleStatClick = (label: string) => {
    if (
      label === "Total Leads" ||
      label === "Team Leads" ||
      label === "My Leads"
    ) {
      setActiveLeadBucketFilter("all");
      setAppliedFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
      setDraftFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
      return;
    }

    const matchedStatus = statusMasterQuery.allStatuses.find(
      (s) => s.name?.toLowerCase() === label.toLowerCase(),
    );
    if (matchedStatus) {
      const isAlreadySelected =
        appliedFilters.statusId.length === 1 &&
        appliedFilters.statusId[0] === matchedStatus.id;
      const nextStatusIds = isAlreadySelected ? [] : [matchedStatus.id];
      setAppliedFilters((prev) => ({ ...prev, statusId: nextStatusIds }));
      setDraftFilters((prev) => ({ ...prev, statusId: nextStatusIds }));
      setActiveLeadBucketFilter("all");
      return;
    }

    const matchedLeadType = leadTypeMasterQuery.allLeadTypes.find(
      (t) => t.name?.toLowerCase() === label.toLowerCase(),
    );
    if (matchedLeadType) {
      const isAlreadySelected =
        appliedFilters.temperatureId.length === 1 &&
        appliedFilters.temperatureId[0] === matchedLeadType.id;
      const nextTempIds = isAlreadySelected ? [] : [matchedLeadType.id];
      setAppliedFilters((prev) => ({ ...prev, temperatureId: nextTempIds }));
      setDraftFilters((prev) => ({ ...prev, temperatureId: nextTempIds }));
      setActiveLeadBucketFilter("all");
      return;
    }

    const nextBucket = clickableStatFilters[label];
    if (nextBucket) {
      setActiveLeadBucketFilter((current) =>
        current === nextBucket ? "all" : nextBucket,
      );
      setAppliedFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
      setDraftFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
      return;
    }
  };

  const handleResetFilters = () => {
    setDraftFilters(initialLeadFilters);
    setAppliedFilters(initialLeadFilters);
    setSelectedDateRange("all");
    setSelectedSlaFilter("all");
    setActiveLeadBucketFilter("all");
    setSelectedTeamMemberId("all");
  };

  const handleFilterChange = <K extends keyof LeadListFilters>(
    key: K,
    value: LeadListFilters[K],
  ) => {
    setDraftFilters((prev) => {
      const nextFilters = { ...prev, [key]: value };
      if (selectedDateRange === "custom" && (key === "from" || key === "to")) {
        setAppliedFilters(nextFilters);
      }
      return nextFilters;
    });
  };

  const handleQuickLeadStatusFilter = (
    filterOrId:
      | string
      | { label: string; value: string; kind?: "status" | "temperature" },
  ) => {
    if (typeof filterOrId === "object" && filterOrId.kind === "temperature") {
      const typeId = filterOrId.value;
      const nextTempIds =
        appliedFilters.temperatureId.length === 1 &&
        appliedFilters.temperatureId[0] === typeId
          ? []
          : [typeId];
      const nextFilters = { ...appliedFilters, temperatureId: nextTempIds };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
      return;
    }

    const bucketOrStatusId =
      typeof filterOrId === "object" ? filterOrId.value : filterOrId;

    const bucketMap: Record<string, LeadBucketFilter> = {
      new: "new",
      "new lead": "new",
      interested: "interested",
      hot: "hot",
      "hot lead": "hot",
      "site-visit": "site-visit",
      "site visit scheduled": "site-visit",
      "site visit schedule": "site-visit",
      "site-visit-completed": "site-visit-completed",
      "site visit done": "site-visit-completed",
      "revisit-completed": "revisit-completed",
      "re-visit done": "revisit-completed",
      "revisit done": "revisit-completed",
    };

    const targetBucket = bucketMap[bucketOrStatusId.toLowerCase()];
    if (targetBucket) {
      setActiveLeadBucketFilter((current) =>
        current === targetBucket ? "all" : targetBucket,
      );
      setAppliedFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
      setDraftFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
    } else if (!bucketOrStatusId) {
      setActiveLeadBucketFilter("all");
      setAppliedFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
      setDraftFilters((prev) => ({
        ...prev,
        statusId: [],
        temperatureId: [],
      }));
    } else {
      const matchedType = leadTypeMasterQuery.allLeadTypes.find(
        (t) =>
          t.id === bucketOrStatusId ||
          t.name?.toLowerCase() === bucketOrStatusId.toLowerCase(),
      );
      if (matchedType) {
        const nextTempIds =
          appliedFilters.temperatureId.length === 1 &&
          appliedFilters.temperatureId[0] === matchedType.id
            ? []
            : [matchedType.id];
        const nextFilters = { ...appliedFilters, temperatureId: nextTempIds };
        setDraftFilters(nextFilters);
        setAppliedFilters(nextFilters);
        return;
      }

      const nextStatusIds =
        appliedFilters.statusId.length === 1 &&
        appliedFilters.statusId[0] === bucketOrStatusId
          ? []
          : [bucketOrStatusId];
      const nextFilters = { ...appliedFilters, statusId: nextStatusIds };
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setActiveLeadBucketFilter("all");
    }
  };

  const handleDateRangeChange = (value: DateRangeFilter) => {
    setSelectedDateRange(value);
    if (value === "custom") {
      setDraftFilters((prev) => {
        const nextFilters = { ...prev, from: "", to: "" };
        setAppliedFilters(nextFilters);
        return nextFilters;
      });
      return;
    }
    const { from, to } = resolveDateRange(value);
    setDraftFilters((prev) => {
      const nextFilters = { ...prev, from, to };
      setAppliedFilters(nextFilters);
      return nextFilters;
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
  };

  const handleExportLeads = () => {
    if (!exportRows.length) {
      toast.error("No leads available to export");
      return;
    }

    if (!exportableColumns.length) {
      toast.error("No export columns are available for your role");
      return;
    }

    const exportableSet = new Set(exportableColumns.map((c) => c.id));
    const activeVisibleColumns = screenVisibleColumnIds.filter((id: string) =>
      exportableSet.has(id),
    );

    setSelectedExportColumnIds(
      activeVisibleColumns.length > 0
        ? activeVisibleColumns
        : exportableColumns.map((column) => column.id),
    );
    setExportDialogOpen(true);
  };

  const handleConfirmExportLeads = () => {
    if (!exportRows.length) {
      toast.error("No leads available to export");
      return;
    }

    if (!selectedExportColumnIds.length) {
      toast.error("Choose at least one column to export");
      return;
    }

    downloadLeadRowsCsv({
      rows: exportRows,
      filePrefix: "leads-export",
      visibleColumns: selectedExportColumnIds,
    });
    setExportDialogOpen(false);
    toast.success(
      `Exported ${exportRows.length} lead${exportRows.length === 1 ? "" : "s"}`,
    );
  };

  return (
    <WorkspacePage className="space-y-8">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-secondary">
            <UsersRound className="h-7 w-7 text-blue-700" />
            {isTeamLeadScope
              ? "Team Leads"
              : fieldExecutiveRoute || telecallerRoute
              ? "My Leads"
              : "All Leads Dashboard"}
          </h1>
          <p className="mt-2 text-sm font-semibold text-blue-800">
            {isTeamLeadScope
              ? "View your team members' assigned leads, follow-ups, site visits, and booking progress without changing your own lead list."
              : fieldExecutiveRoute
              ? "Leads assigned to you for field execution. Manage them separately from your site-visit schedule."
              : telecallerRoute
              ? "Leads assigned to you as Pre Sales. Track follow-ups, qualification, and next actions from the same premium workspace."
              : "A comprehensive view of all your leads. Monitor, filter, and manage your entire pipeline here."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {employeeRoute && canUseScopedLeadWorkspace ? (
            <div
              className="inline-flex rounded-md border border-slate-200 bg-white p-1 shadow-card"
              role="tablist"
              aria-label="Lead workspace scope"
            >
              {(
                [
                  ["mine", "My leads"],
                  [
                    "team",
                    authUser?.role === "MANAGER"
                      ? "Report leads"
                      : "Team leads",
                  ],
                ] as const
              ).map(([scope, label]) => (
                <button
                  key={scope}
                  type="button"
                  role="tab"
                  aria-selected={leadWorkspaceScope === scope}
                  className={cn(
                    "h-9 rounded px-3 text-xs font-extrabold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20",
                    leadWorkspaceScope === scope
                      ? "bg-primary text-white"
                      : "text-secondary hover:bg-slate-50",
                  )}
                  onClick={() => {
                    setLeadWorkspaceScope(scope);
                    setActiveLeadBucketFilter("all");
                    setSelectedTeamMemberId("all");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {!fieldExecutiveRoute && !telecallerRoute ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md px-5 shadow-none"
              onClick={() => navigate("/leads/conversion-analytics")}
            >
              <Target className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          ) : null}
          {!isTeamLeadScope && canCreateLead ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md px-5 shadow-none"
              onClick={() => setAddLeadOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Lead
            </Button>
          ) : null}
        </div>
      </section>
      <StatsRow
        stats={statsRowItems}
        onStatClick={handleStatClick}
        activeLabels={statsRowItems
          .filter(
            (stat) =>
              (activeLeadBucketFilter !== "all" &&
                clickableStatFilters[stat.label] === activeLeadBucketFilter) ||
              (appliedFilters.statusId.length > 0 &&
                statusMasterQuery.allStatuses.some(
                  (s) =>
                    appliedFilters.statusId.includes(s.id) &&
                    s.name?.toLowerCase() === stat.label.toLowerCase(),
                )) ||
              (appliedFilters.temperatureId.length > 0 &&
                leadTypeMasterQuery.allLeadTypes.some(
                  (t) =>
                    appliedFilters.temperatureId.includes(t.id) &&
                    t.name?.toLowerCase() === stat.label.toLowerCase(),
                )),
          )
          .map((stat) => stat.label)}
      />
      {isTeamLeadScope ? (
        teamLeadWorkspaceQuery.isError ? (
          <Card className="rounded-md border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700 shadow-card">
            Unable to load team leads. Confirm this employee is still mapped as
            an active team leader.
          </Card>
        ) : (
          <TeamLeadWorkspacePanel
            workspace={teamLeadWorkspaceQuery.data}
            selectedMemberId={selectedTeamMemberId}
            onMemberChange={setSelectedTeamMemberId}
          />
        )
      ) : null}
      <section className="space-y-5">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 shadow-card">
            <div>
              <p className="text-sm font-extrabold text-secondary">
                Lead filters
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                Refine the lead table without leaving this workspace.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-9 rounded-md px-3 text-xs font-extrabold shadow-none",
                !filtersCollapsed
                  ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                  : "bg-white text-secondary hover:bg-slate-50",
              )}
              onClick={() => setFiltersCollapsed((current) => !current)}
              aria-expanded={!filtersCollapsed}
              aria-controls="all-leads-advanced-filters"
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Advanced filters
              <Badge
                variant="neutral"
                className="ml-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600"
              >
                {activeAdvancedFilterCount} active
              </Badge>
              {filtersCollapsed ? (
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              ) : (
                <ArrowDown className="ml-1 h-3.5 w-3.5 text-primary" />
              )}
            </Button>
          </div>
          <LeadsTable
            rows={rows}
            summaryRows={summaryRows}
            total={tableTotalRows}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
            isLoading={
              isTeamLeadScope
                ? teamLeadWorkspaceQuery.isLoading
                : leadsQuery.isLoading
            }
            activeLeadBucketFilter={activeLeadBucketFilter}
            completedSiteVisitLeadIds={completedSiteVisitLeadIds}
            selectedSlaFilter={selectedSlaFilter}
            sourceOptions={filterOptionsQuery.options.sourceOptions}
            statusOptions={filterOptionsQuery.options.statusOptions}
            leadTypeOptions={filterOptionsQuery.options.leadTypeOptions}
            budgetOptions={filterOptionsQuery.options.budgetOptions}
            configurationOptions={
              filterOptionsQuery.options.configurationOptions
            }
            areaOptions={filterOptionsQuery.options.areaOptions}
            assigneeOptions={filterOptionsQuery.options.ownerOptions}
            onEditLead={isTeamLeadScope ? undefined : setEditLeadId}
            quickLeadStatusFilters={quickLeadStatusFilters}
            appliedStatusIds={appliedFilters.statusId}
            appliedTemperatureIds={appliedFilters.temperatureId}
            onQuickLeadStatusFilter={handleQuickLeadStatusFilter}
            filters={draftFilters}
            dateRange={selectedDateRange}
            filterOptions={filterOptionsQuery.options}
            onApplyFilters={handleApplyFilters}
            onExportLeads={handleExportLeads}
            onDateRangeChange={handleDateRangeChange}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            onSlaFilterChange={setSelectedSlaFilter}
            isFilterCollapsed={filtersCollapsed}
            hideTeamFilter={isTeamLeadScope}
          />
        </div>
        {/* Parked for now: Lead Insights, Top Hot Leads, and Recent Lead Activities cards. */}
        {/* <RightRail /> */}
      </section>
      <AddLeadModal
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        sourceOptions={filterOptionsQuery.options.sourceOptions}
        assigneeOptions={filterOptionsQuery.options.ownerOptions}
      />
      {editLeadId ? (
        <EditLeadModal
          leadId={editLeadId}
          open={Boolean(editLeadId)}
          onOpenChange={(open) => {
            if (!open) {
              setEditLeadId(null);
            }
          }}
        />
      ) : null}
      <ExportLeadColumnsDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        columns={exportableColumns}
        selectedColumnIds={selectedExportColumnIds}
        onSelectedColumnIdsChange={setSelectedExportColumnIds}
        rowCount={exportRows.length}
        onExport={handleConfirmExportLeads}
      />
    </WorkspacePage>
  );
}

function ExportLeadColumnsDialog({
  open,
  onOpenChange,
  columns,
  selectedColumnIds,
  onSelectedColumnIdsChange,
  rowCount,
  onExport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ExportColumnOption[];
  selectedColumnIds: string[];
  onSelectedColumnIdsChange: (columnIds: string[]) => void;
  rowCount: number;
  onExport: () => void;
}) {
  const [search, setSearch] = useState("");
  const selectedColumnSet = useMemo(
    () => new Set(selectedColumnIds),
    [selectedColumnIds],
  );
  const filteredColumns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return columns;
    return columns.filter((column) =>
      column.label.toLowerCase().includes(normalizedSearch),
    );
  }, [columns, search]);
  const visibleSelectedCount = filteredColumns.filter((column) =>
    selectedColumnSet.has(column.id),
  ).length;

  const toggleColumn = (columnId: string, checked: boolean) => {
    onSelectedColumnIdsChange(
      checked
        ? Array.from(new Set([...selectedColumnIds, columnId]))
        : selectedColumnIds.filter((id) => id !== columnId),
    );
  };

  const selectAllColumns = () => {
    onSelectedColumnIdsChange(columns.map((column) => column.id));
  };

  const clearColumns = () => {
    onSelectedColumnIdsChange([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(680px,calc(100vw-2rem))] max-w-none flex-col overflow-hidden rounded-md p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-12">
          <DialogTitle className="text-xl font-extrabold text-secondary">
            Choose export columns
          </DialogTitle>
          <DialogDescription className="text-sm font-semibold text-muted-foreground">
            Export {rowCount} filtered lead{rowCount === 1 ? "" : "s"}. All
            available columns are selected by default.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search columns..."
                aria-label="Search export columns"
                className="h-10 rounded-md border-slate-200 pl-10 text-sm font-semibold shadow-none"
              />
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs shadow-none"
                onClick={selectAllColumns}
              >
                Select all
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-4 text-xs shadow-none"
                onClick={clearColumns}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {filteredColumns.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredColumns.map((column) => (
                <div
                  key={column.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md border p-3 transition-colors",
                    selectedColumnSet.has(column.id)
                      ? "border-primary/40 bg-orange-50/40"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-secondary">
                      {column.label}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                      Include in CSV export
                    </p>
                  </div>
                  <Checkbox
                    aria-label={`Include ${column.label}`}
                    checked={selectedColumnSet.has(column.id)}
                    className="shrink-0 gap-0"
                    onChange={(event) =>
                      toggleColumn(column.id, event.target.checked)
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-6 text-center shadow-none">
              <p className="text-sm font-extrabold text-secondary">
                No columns found
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Try a different column search.
              </p>
            </Card>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-muted-foreground">
            {selectedColumnIds.length} of {columns.length} columns selected
            {search.trim()
              ? ` · ${visibleSelectedCount} selected in search results`
              : ""}
          </p>
          <div className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 rounded-md shadow-none sm:flex-none"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-10 flex-1 rounded-md bg-primary px-5 text-white sm:flex-none"
              disabled={!selectedColumnIds.length || !rowCount}
              onClick={onExport}
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type SelectedProjectSummary =
  | { kind: "none"; message: string }
  | { kind: "same"; message: string; projectName: string }
  | { kind: "mixed"; message: string };

function compactCellText(value?: string | null) {
  return (value ?? "").replace(/\s*\n+\s*/g, " · ").trim();
}

function ProjectUpdateSection({
  enabled,
  onEnabledChange,
  selectedProjectId,
  onProjectChange,
  projectSearchOptions,
  selectedProjectSummary,
}: {
  enabled: boolean;
  onEnabledChange: (checked: boolean) => void;
  selectedProjectId: string;
  onProjectChange: (value: string) => void;
  projectSearchOptions: Array<{
    label: string;
    value: string;
    imageUrl?: string;
    description?: string;
  }>;
  selectedProjectSummary: SelectedProjectSummary;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-extrabold text-secondary">
            Project update
          </p>
          <p className="text-xs font-semibold text-muted-foreground">
            {selectedProjectSummary.message}
          </p>
        </div>
        <Checkbox
          checked={enabled}
          className="rounded-md bg-white px-3 py-2 shadow-none"
          label="Update project"
          onChange={(event) => onEnabledChange(event.currentTarget.checked)}
        />
      </div>
      {enabled ? (
        <label className="mt-4 block space-y-2">
          <span className="text-xs font-extrabold text-secondary">
            New project
          </span>
          <SearchableSelect
            value={selectedProjectId}
            onValueChange={onProjectChange}
            options={projectSearchOptions}
            placeholder="Select project"
            searchPlaceholder="Search by project, location, or developer..."
            noOptionsText="No projects found"
            className="h-11 bg-white"
            contentClassName="min-w-[360px]"
            modal={false}
            portaled={false}
          />
        </label>
      ) : null}
    </div>
  );
}
