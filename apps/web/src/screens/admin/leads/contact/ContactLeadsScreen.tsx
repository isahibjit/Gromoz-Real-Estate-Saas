import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Download,
  Filter,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Shuffle,
  Target,
  Trash2,
  UserPlus,
  UsersRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  MultiSelect,
  SearchableSelect,
  Select,
  SelectContent,
  TablePageSizeOptions,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  type ColumnDef,
  type SearchableSelectOption,
} from "ui";

import { api } from "../../../../common/api";
import { getApiErrorMessage } from "../../../../common/apiError";
import { canAccess } from "../../../../common/access/access";
import { usePermission } from "../../../../common/access/usePermission";
import { useAppSelector } from "../../../../store";
import { useProjects } from "../../projects/useProjectsApi";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import { addLeadSidebarItems } from "../add/addLeadData";
import {
  StatsRow,
  type LeadStatsRowItem,
} from "../components/StatsRow";
import {
  useLeadListFilterOptions,
  type LeadFilterOption,
} from "../all/useAllLeads";

type ContactLeadStatus =
  | "COLD"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CONVERTED"
  | "ARCHIVED";

interface ContactLead {
  id: string;
  customerName: string;
  mobileCountryCode?: string | null;
  mobile: string;
  alternateCountryCode?: string | null;
  alternateMobile?: string | null;
  email?: string | null;
  sourceId?: string | null;
  sourceName?: string | null;
  note?: string | null;
  status: ContactLeadStatus;
  assignedToId?: string | null;
  assignedToName?: string | null;
  preferredProjectId?: string | null;
  projectName?: string | null;
  projectArea?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ContactLeadListResponse {
  data: ContactLead[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

interface ContactLeadStatsResponse {
  data: {
    total: number;
    cold: number;
    interested: number;
    notInterested: number;
    converted: number;
  };
}

interface ContactLeadForm {
  customerName: string;
  mobile: string;
  alternateMobile: string;
  email: string;
  sourceId: string;
  preferredProjectId: string;
  assignedToId: string;
  note: string;
}

type ContactLeadPatch = Partial<ContactLeadForm>;

interface ContactLeadFilters {
  status: ContactLeadStatus[];
  sourceId: string[];
  assignedToId: string[];
  preferredProjectId: string[];
  teamId: string[];
  area: string[];
  configuration: string[];
  dateRange: DateRangeFilter;
  from: string;
  to: string;
}

type DateRangeFilter =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "lastMonth"
  | "custom";

const emptyForm: ContactLeadForm = {
  customerName: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  sourceId: "",
  preferredProjectId: "",
  assignedToId: "",
  note: "",
};

const initialFilters: ContactLeadFilters = {
  status: [],
  sourceId: [],
  assignedToId: [],
  preferredProjectId: [],
  teamId: [],
  area: [],
  configuration: [],
  dateRange: "all",
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

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not Set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not Set";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

const resolveDateRange = (range: DateRangeFilter) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (range === "all" || range === "custom") {
    return { from: "", to: "" };
  }

  if (range === "today") {
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "yesterday") {
    start.setDate(now.getDate() - 1);
    return { from: toDateInput(start), to: toDateInput(start) };
  }

  if (range === "last7") {
    start.setDate(now.getDate() - 6);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "last30") {
    start.setDate(now.getDate() - 29);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  if (range === "lastMonth") {
    start.setMonth(now.getMonth() - 1, 1);
    end.setDate(0);
    return { from: toDateInput(start), to: toDateInput(end) };
  }

  start.setDate(1);
  return { from: toDateInput(start), to: toDateInput(end) };
};

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

const contactStatusLabel = (status: ContactLeadStatus) =>
  status
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const contactStatusTone = (status: ContactLeadStatus) => {
  if (status === "COLD") return "bg-blue-50 text-blue-700";
  if (status === "INTERESTED") return "bg-orange-50 text-primary";
  if (status === "NOT_INTERESTED") return "bg-red-50 text-red-700";
  if (status === "CONVERTED") return "bg-green-50 text-success";
  return "bg-slate-100 text-secondary";
};

const formatContactNumber = (contact: ContactLead) =>
  `${contact.mobileCountryCode ?? "+91"} ${contact.mobile}`;

const contactSearchPlaceholder =
  "Search contact leads, mobile number, project...";

const normalizeMultiFilterValue = (value: readonly string[]) =>
  value.length ? value.join(",") : undefined;

const statusFilterOptions: Array<{
  label: string;
  value: ContactLeadStatus;
}> = [
  { label: "Cold", value: "COLD" },
  { label: "Interested", value: "INTERESTED" },
  { label: "Not interested", value: "NOT_INTERESTED" },
  { label: "Converted", value: "CONVERTED" },
];

function ContactLeadIdentityCell({ contact }: { contact: ContactLead }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-extrabold text-secondary">
        {contact.customerName}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
        {contact.email || contact.note || "No note added"}
      </p>
    </div>
  );
}

function ContactLeadActionMenu({
  contact,
  canUpdate,
  canDelete,
  onEdit,
  onInterested,
  onNotInterested,
  onConvert,
  onDelete,
}: {
  contact: ContactLead;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (contact: ContactLead) => void;
  onInterested: (contact: ContactLead) => void;
  onNotInterested: (contact: ContactLead) => void;
  onConvert: (contact: ContactLead) => void;
  onDelete: (contact: ContactLead) => void;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-md"
          aria-label={`Open actions for ${contact.customerName}`}
        >
          <MoreVertical className="size-4 text-blue-700" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[240px] rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_18px_50px_rgba(15,37,68,0.16)]"
      >
        <DropdownMenuLabel className="px-3 py-2">
          <span className="block text-xs font-extrabold text-secondary">
            {contact.customerName}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-semibold text-muted-foreground">
            {formatContactNumber(contact)}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canUpdate ? (
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-blue-50 focus:text-blue-700"
            onSelect={() => onEdit(contact)}
          >
            <Pencil className="size-4 text-blue-700" />
            Edit
          </DropdownMenuItem>
        ) : null}
        {canUpdate && contact.status === "COLD" ? (
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-orange-50 focus:text-primary"
            onSelect={() => onInterested(contact)}
          >
            <Target className="size-4 text-primary" />
            Mark Interested
          </DropdownMenuItem>
        ) : null}
        {canUpdate &&
        (contact.status === "COLD" || contact.status === "INTERESTED") ? (
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-red-700 focus:bg-red-50 focus:text-red-800"
            onSelect={() => onNotInterested(contact)}
          >
            <CircleX className="size-4" />
            Mark not interested
          </DropdownMenuItem>
        ) : null}
        {canUpdate &&
        contact.status !== "CONVERTED" &&
        contact.status !== "ARCHIVED" &&
        contact.status !== "NOT_INTERESTED" ? (
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-secondary focus:bg-green-50 focus:text-success"
            onSelect={() => onConvert(contact)}
          >
            <Shuffle className="size-4 text-success" />
            Convert to Lead
          </DropdownMenuItem>
        ) : null}
        {canUpdate && canDelete ? <DropdownMenuSeparator /> : null}
        {canDelete ? (
          <DropdownMenuItem
            className="gap-3 rounded-[10px] px-3 py-2 text-xs font-extrabold text-red-700 focus:bg-red-50 focus:text-red-800"
            onSelect={() => onDelete(contact)}
          >
            <Trash2 className="size-4" />
            Delete contact
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ContactLeadModal({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  isPending,
  sourceOptions,
  assigneeOptions,
  projectOptions,
  selectedProject,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ContactLeadForm;
  onFormChange: (patch: Partial<ContactLeadForm>) => void;
  onSubmit: () => void;
  isPending: boolean;
  sourceOptions: Array<{ label: string; value: string }>;
  assigneeOptions: Array<{
    label: string;
    value: string;
    avatarUrl?: string;
    description?: string;
  }>;
  projectOptions: Array<{
    label: string;
    value: string;
    imageUrl?: string;
    description?: string;
  }>;
  selectedProject?: {
    id: string;
    name: string;
    location: string;
    developer: string;
    imageUrl: string;
  };
  editing: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-visible rounded-xl bg-white p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <DialogTitle className="text-lg font-extrabold text-secondary">
            {editing ? "Edit contact lead" : "Add contact lead"}
          </DialogTitle>
          <p className="text-sm font-semibold text-muted-foreground">
            Capture cold-contact details using the same workflow quality as the
            active lead workspace.
          </p>
        </DialogHeader>
        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Source *
              </span>
              <SearchableSelect
                value={form.sourceId}
                onValueChange={(value) => onFormChange({ sourceId: value })}
                options={sourceOptions}
                placeholder="Select lead source"
                searchPlaceholder="Search lead sources..."
                noOptionsText="No lead sources found"
                className="h-11 bg-white"
                modal={false}
                portaled={false}
              />
            </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Customer Name *
                </span>
                <Input
                  type="text"
                  value={form.customerName}
                  autoComplete="name"
                  onChange={(event) =>
                    onFormChange({ customerName: event.target.value })
                  }
                  placeholder="Enter customer full name"
                  className="h-11 rounded-[10px] text-sm font-semibold"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Mobile Number *
                </span>
                <Input
                  type="tel"
                  value={form.mobile}
                  inputMode="numeric"
                  autoComplete="tel"
                  onChange={(event) =>
                    onFormChange({
                      mobile: event.target.value.replace(/[^\d]/g, ""),
                    })
                  }
                  placeholder="Enter mobile number"
                  className="h-11 rounded-[10px] text-sm font-semibold"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Alternate Mobile Number
                </span>
                <Input
                  value={form.alternateMobile}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  onChange={(event) =>
                    onFormChange({
                      alternateMobile: event.target.value.replace(/[^\d]/g, ""),
                    })
                  }
                  placeholder="Enter alternate number"
                  className="h-11 rounded-[10px] text-sm font-semibold"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-extrabold text-secondary">
                  Email ID
                </span>
                <Input
                  type="email"
                  value={form.email}
                  autoComplete="email"
                  onChange={(event) => onFormChange({ email: event.target.value })}
                  placeholder="Enter email address"
                  className="h-11 rounded-[10px] text-sm font-semibold"
                />
              </label>
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Assign To
              </span>
                  <SearchableSelect
                    value={form.assignedToId}
                    onValueChange={(value) => onFormChange({ assignedToId: value })}
                    options={assigneeOptions}
                    placeholder="Select employee"
                    searchPlaceholder="Search employee by name or role"
                    noOptionsText="No employees found"
                    className="h-11 rounded-[10px] bg-white text-sm font-semibold"
                    contentClassName="min-w-[320px]"
                    modal={false}
                    portaled={false}
                  />
            </label>
          </div>
          <div className="rounded-[14px] border border-slate-200 bg-white p-4">
            <div className="mb-3">
              <p className="text-sm font-extrabold text-secondary">
                Project mapping
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Attach the contact to the right project context from the start.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Project Name
                  </span>
                    <SearchableSelect
                      value={form.preferredProjectId}
                      onValueChange={(value) =>
                        onFormChange({ preferredProjectId: value })
                      }
                      options={projectOptions}
                      placeholder="Search and select a project"
                      searchPlaceholder="Search by project, location, or developer..."
                      noOptionsText="No projects found"
                      className="h-11 rounded-[10px] bg-white text-sm font-semibold"
                      contentClassName="min-w-[360px]"
                      modal={false}
                      portaled={false}
                    />
                  </label>
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Note
                  </span>
                    <Textarea
                      value={form.note}
                      onChange={(event) => onFormChange({ note: event.target.value })}
                      placeholder="Add context, call summary, or cold-contact notes"
                      className="min-h-[108px] rounded-[10px] py-3 text-sm font-semibold"
                    />
                  </label>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                {selectedProject ? (
                  <div className="space-y-3">
                    <img
                      src={selectedProject.imageUrl}
                      alt={selectedProject.name}
                      className="h-36 w-full rounded-lg object-cover"
                    />
                    <div>
                      <p className="text-sm font-extrabold text-secondary">
                        {selectedProject.name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {selectedProject.location}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {selectedProject.developer}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full min-h-[212px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-4 text-center">
                    <div>
                      <p className="text-sm font-extrabold text-secondary">
                        No project selected yet
                      </p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        Search and attach a project to improve context for later
                        lead conversion.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={onSubmit}>
            {editing ? "Save contact" : "Add contact lead"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ContactLeadNoteDialog({
  contact,
  canUpdate,
  isPending,
  onClose,
  onSave,
}: {
  contact: ContactLead;
  canUpdate: boolean;
  isPending: boolean;
  onClose: () => void;
  onSave: (note: string) => Promise<void>;
}) {
  const [note, setNote] = useState(contact.note ?? "");
  const [errorMessage, setErrorMessage] = useState("");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isPending) onClose();
      }}
    >
      <DialogContent className="max-w-lg gap-0 p-0" showCloseButton={!isPending}>
        <DialogHeader className="border-b border-slate-100 px-6 py-4 pr-12">
          <DialogTitle>Contact note</DialogTitle>
          <DialogDescription>{contact.customerName}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canUpdate || isPending) return;
            setErrorMessage("");
            try {
              await onSave(note.trim());
            } catch (error) {
              setErrorMessage(getApiErrorMessage(error, "Contact lead action failed"));
            }
          }}
        >
          <div className="space-y-3 px-6 py-4">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-secondary">Note</span>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                readOnly={!canUpdate}
                disabled={isPending}
                rows={6}
                placeholder="Add context, call summary, or cold-contact notes"
              />
            </label>
            {errorMessage ? (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onClose}
            >
              {canUpdate ? "Cancel" : "Close"}
            </Button>
            {canUpdate ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : "Save note"}
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FiltersCard({
  filters,
  activeFilterCount,
  sourceOptions,
  assigneeOptions,
  teamOptions,
  areaOptions,
  configurationOptions,
  projectOptions,
  onApply,
  onReset,
  onFilterChange,
}: {
  filters: ContactLeadFilters;
  activeFilterCount: number;
  sourceOptions: LeadFilterOption[];
  assigneeOptions: LeadFilterOption[];
  teamOptions: LeadFilterOption[];
  areaOptions: LeadFilterOption[];
  configurationOptions: LeadFilterOption[];
  projectOptions: Array<{ label: string; value: string }>;
  onApply: () => void;
  onReset: () => void;
  onFilterChange: <K extends keyof ContactLeadFilters>(
    key: K,
    value: ContactLeadFilters[K],
  ) => void;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sourceSearchOptions = sourceOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const assigneeSearchOptions = assigneeOptions.map((option) => ({
    label: option.label,
    value: option.value,
    description: option.role?.replace(/_/g, " "),
  }));
  const filterFields = [
    {
      key: "sourceId",
      label: "Lead Source",
      placeholder: "All Source",
      options: sourceSearchOptions,
      searchPlaceholder: "Search lead source...",
    },
    {
      key: "status",
      label: "Lead Status",
      placeholder: "All Status",
      options: statusFilterOptions,
      searchPlaceholder: "Search contact status...",
    },
    {
      key: "preferredProjectId",
      label: "Project",
      placeholder: "All Projects",
      options: projectOptions,
      searchPlaceholder: "Search by project, location, or developer...",
    },
    {
      key: "assignedToId",
      label: "Assigned To",
      placeholder: "All Assigned To",
      options: assigneeSearchOptions,
      searchPlaceholder: "Search assignee...",
    },
    {
      key: "teamId",
      label: "Team-wise",
      placeholder: "All Teams",
      options: teamOptions,
      searchPlaceholder: "Search teams...",
    },
    {
      key: "area",
      label: "Area-wise",
      placeholder: "All Areas",
      options: areaOptions,
      searchPlaceholder: "Search areas...",
    },
    {
      key: "configuration",
      label: "Configuration",
      placeholder: "All Configuration",
      options: configurationOptions,
      searchPlaceholder: "Search configuration...",
    },
  ] satisfies Array<{
    key:
      | "sourceId"
      | "status"
      | "preferredProjectId"
      | "assignedToId"
      | "teamId"
      | "area"
      | "configuration";
    label: string;
    placeholder: string;
    options: Array<{ label: string; value: string; description?: string }>;
    searchPlaceholder: string;
  }>;

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-secondary">
              Advanced filters
            </h3>
            <Badge
              variant="neutral"
              className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600"
            >
              {activeFilterCount} active
            </Badge>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">
            Refine contact leads by ownership, source, status, project, area,
            configuration, and date.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md px-4 shadow-none sm:self-start"
          aria-expanded={!isCollapsed}
          onClick={() => setIsCollapsed((current) => !current)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          {isCollapsed ? "Show filters" : "Hide filters"}
        </Button>
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isCollapsed
            ? "max-h-0 opacity-0 pt-0"
            : "max-h-[1200px] opacity-100 pt-4",
        )}
      >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filterFields.map((filter) => (
          <label key={filter.key} className="space-y-2">
            <span className="text-xs font-extrabold text-secondary">
              {filter.label}
            </span>
            <MultiSelect
              value={filters[filter.key]}
              onValueChange={(value) => onFilterChange(filter.key, value)}
              options={filter.options}
              placeholder={filter.placeholder}
              ariaLabel={filter.label}
              searchPlaceholder={filter.searchPlaceholder}
              selectedLabelText={filter.label.toLowerCase()}
              selectedLabelTextPlural={filter.label.toLowerCase()}
              showTriggerIcon={false}
              showTriggerSummary={false}
              className="min-h-10 rounded-md bg-white"
              contentClassName="min-w-[280px]"
              modal={false}
              portaled={false}
            />
          </label>
        ))}
        <label className="space-y-2">
          <span className="text-xs font-extrabold text-secondary">
            Date Range
          </span>
          <SearchableSelect
            value={filters.dateRange}
            onValueChange={(value) => {
              const dateRange = value as DateRangeFilter;
              const resolved = resolveDateRange(dateRange);
              onFilterChange("dateRange", dateRange);
              onFilterChange("from", resolved.from);
              onFilterChange("to", resolved.to);
            }}
            options={dateRangeOptions}
            placeholder="All Date Range"
            searchPlaceholder="Search date range..."
            noOptionsText="No date range found"
            className="h-11 bg-white"
            contentClassName="min-w-[260px]"
            modal={false}
            portaled={false}
          />
        </label>
        {filters.dateRange === "custom" ? (
          <div className="grid gap-3 md:col-span-2 xl:col-span-2 xl:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                From
              </span>
              <DatePicker
                aria-label="Contact lead start date"
                value={filters.from}
                max={filters.to || undefined}
                className="h-11 rounded-md text-xs font-bold shadow-none"
                onChange={(event) =>
                  onFilterChange("from", event.target.value)
                }
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">To</span>
              <DatePicker
                aria-label="Contact lead end date"
                value={filters.to}
                min={filters.from || undefined}
                className="h-11 rounded-md text-xs font-bold shadow-none"
                onChange={(event) => onFilterChange("to", event.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          className="h-10 rounded-md px-5"
          onClick={onApply}
        >
          <Filter className="h-4 w-4" />
          Apply Filter
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-md px-5 shadow-none"
          onClick={onReset}
        >
          Reset
        </Button>
      </div>
      </div>
    </Card>
  );
}

function ContactsTable({
  rows,
  total,
  currentPage,
  rowsPerPage,
  isLoading,
  errorMessage,
  onRetry,
  canUpdate,
  canDelete,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
  onNote,
  onInterested,
  onNotInterested,
  onDelete,
  onBulkInterested,
  onBulkNotInterested,
  onConvert,
  onBulkConvert,
  onBulkAssign,
  onBulkSource,
  onBulkProject,
  onBulkDelete,
  sourceOptions,
  assigneeOptions,
  projectOptions,
  projectsById,
}: {
  rows: ContactLead[];
  total: number;
  currentPage: number;
  rowsPerPage: number;
  isLoading: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  canUpdate: boolean;
  canDelete: boolean;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (limit: number) => void;
  onEdit: (contact: ContactLead) => void;
  onNote: (contact: ContactLead) => void;
  onInterested: (contact: ContactLead) => void;
  onNotInterested: (contact: ContactLead) => void;
  onDelete: (contact: ContactLead) => void;
  onBulkInterested: (contacts: ContactLead[]) => void;
  onBulkNotInterested: (contacts: ContactLead[]) => void;
  onConvert: (contact: ContactLead) => void;
  onBulkConvert: (contacts: ContactLead[]) => void;
  onBulkAssign: (contacts: ContactLead[], assigneeId: string) => void;
  onBulkSource: (contacts: ContactLead[], sourceId: string) => void;
  onBulkProject: (contacts: ContactLead[], projectId: string) => void;
  onBulkDelete?: (contacts: ContactLead[]) => void;
  sourceOptions: LeadFilterOption[];
  assigneeOptions: SearchableSelectOption[];
  projectOptions: SearchableSelectOption[];
  projectsById: Map<
    string,
    { id: string; name: string; location: string; imageUrl: string }
  >;
}) {
  const navigate = useNavigate();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [activeUpdateModal, setActiveUpdateModal] = useState<
    "assign" | "source" | "project" | null
  >(null);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    setSelectedContactIds((current) =>
      current.filter((id) => rows.some((contact) => contact.id === id)),
    );
  }, [rows]);

  const allSelected =
    rows.length > 0 && selectedContactIds.length === rows.length;
  const selectedContacts = rows.filter((contact) =>
    selectedContactIds.includes(contact.id),
  );
  const selectedCount = selectedContacts.length;
  const interestedEligibleContacts = selectedContacts.filter(
    (contact) => contact.status === "COLD",
  );
  const notInterestedEligibleContacts = selectedContacts.filter(
    (contact) =>
      contact.status === "COLD" || contact.status === "INTERESTED",
  );
  const convertibleContacts = selectedContacts.filter(
    (contact) =>
      contact.status !== "CONVERTED" &&
      contact.status !== "ARCHIVED" &&
      contact.status !== "NOT_INTERESTED",
  );
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const pageStartIndex = (currentPage - 1) * rowsPerPage;
  const rangeStart = total === 0 ? 0 : pageStartIndex + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(pageStartIndex + rows.length, total);
  const paginationItems = buildPaginationItems(currentPage, totalPages);

  const toggleAll = useCallback(() => {
    setSelectedContactIds((current) =>
      current.length === rows.length ? [] : rows.map((contact) => contact.id),
    );
  }, [rows]);

  const toggleContact = (contactId: string) => {
    setSelectedContactIds((current) =>
      current.includes(contactId)
        ? current.filter((id) => id !== contactId)
        : [...current, contactId],
    );
  };

  const openUpdateModal = (modal: "assign" | "source" | "project") => {
    if (!selectedCount) {
      toast.error("Select at least one contact lead");
      return;
    }
    setActiveUpdateModal(modal);
  };

  const closeUpdateModal = () => {
    setActiveUpdateModal(null);
    setSelectedAssigneeId("");
    setSelectedSourceId("");
    setSelectedProjectId("");
  };

  const submitAssign = () => {
    if (!selectedAssigneeId) {
      toast.error("Select an assignee");
      return;
    }
    onBulkAssign(selectedContacts, selectedAssigneeId);
    closeUpdateModal();
  };

  const submitSource = () => {
    if (!selectedSourceId) {
      toast.error("Select a lead source");
      return;
    }
    onBulkSource(selectedContacts, selectedSourceId);
    closeUpdateModal();
  };

  const submitProject = () => {
    if (!selectedProjectId) {
      toast.error("Select a project");
      return;
    }
    onBulkProject(selectedContacts, selectedProjectId);
    closeUpdateModal();
  };

  const columns = useMemo<ColumnDef<ContactLead>[]>(
    () => [
      {
        id: "select",
        className: "!w-[44px] !px-2",
        headerClassName: "!w-[44px] !px-2",
        header: (
          <Checkbox
            aria-label="Select all contact leads"
            checked={allSelected}
            onChange={toggleAll}
            className="gap-0"
          />
        ),
        cell: (contact: ContactLead) => (
          <Checkbox
            aria-label={`Select ${contact.customerName}`}
            checked={selectedContactIds.includes(contact.id)}
            onChange={() => toggleContact(contact.id)}
            className="gap-0"
          />
        ),
      },
      {
        id: "addedDate",
        header: "Added Date",
        className: "w-[92px] max-w-[92px]",
        headerClassName: "w-[92px]",
        cell: (contact: ContactLead) => (
          <span className="whitespace-pre-line text-[11px] font-semibold text-secondary">
            {formatDateTime(contact.createdAt)}
          </span>
        ),
      },
      {
        id: "lastUpdate",
        header: "Last Update",
        className: "w-[92px] max-w-[92px]",
        headerClassName: "w-[92px]",
        cell: (contact: ContactLead) => (
          <span className="whitespace-pre-line text-[11px] font-semibold text-secondary">
            {formatDateTime(contact.updatedAt)}
          </span>
        ),
      },
      {
        id: "source",
        header: "Source",
        className: "w-[96px] max-w-[96px]",
        headerClassName: "w-[96px]",
        cell: (contact: ContactLead) => (
          <Badge className="inline-flex max-w-full whitespace-nowrap border-0 bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-700">
            {contact.sourceName || "Unknown"}
          </Badge>
        ),
      },
      {
        id: "name",
        header: "Name",
        className: "min-w-0 w-[124px] max-w-[124px]",
        headerClassName: "w-[124px]",
        cell: (contact: ContactLead) => <ContactLeadIdentityCell contact={contact} />,
      },
      {
        id: "number",
        header: "Number",
        className: "w-[145px] max-w-[145px]",
        headerClassName: "w-[145px]",
        cell: (contact: ContactLead) => (
          <span className="block truncate whitespace-nowrap text-[11px] font-semibold text-secondary">
            {formatContactNumber(contact)}
          </span>
        ),
      },
      {
        id: "projectName",
        header: "Project Name",
        className: "w-[160px] max-w-[160px]",
        headerClassName: "w-[160px]",
        cell: (contact: ContactLead) => {
          const project = contact.preferredProjectId
            ? projectsById.get(contact.preferredProjectId)
            : undefined;

          if (!project && !contact.projectName) {
            return (
              <span className="text-xs font-semibold text-muted-foreground">
                Not mapped
              </span>
            );
          }

          if (project) {
            return (
              <button
                type="button"
                className="block w-full min-w-0 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-50"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-extrabold text-secondary">
                    {project.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground">
                    {project.location}
                  </span>
                </span>
              </button>
            );
          }

          return (
            <div>
              <p className="truncate text-[11px] font-extrabold text-secondary">
                {contact.projectName}
              </p>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">
                {contact.projectArea || "Project area not available"}
              </p>
            </div>
          );
        },
      },
      {
        id: "assignedTo",
        header: "Assigned To",
        className: "w-[142px] max-w-[142px]",
        headerClassName: "w-[142px]",
        cell: (contact: ContactLead) => (
          <div>
            <p className="truncate text-[11px] font-extrabold text-secondary">
              {contact.assignedToName || "Unassigned"}
            </p>
            <p className="truncate text-[10px] font-semibold text-muted-foreground">
              Contact owner
            </p>
          </div>
        ),
      },
      {
        id: "contactStatus",
        header: "Contact Status",
        className: "w-[114px] max-w-[114px]",
        headerClassName: "w-[114px]",
        cell: (contact: ContactLead) => (
          <Badge
            className={cn(
              "inline-flex w-fit max-w-full whitespace-nowrap border-0 px-2 py-0.5 text-[10px] font-extrabold leading-none",
              contactStatusTone(contact.status),
            )}
          >
            {contactStatusLabel(contact.status)}
          </Badge>
        ),
      },
      {
        id: "note",
        header: "Note",
        className: "w-[164px] max-w-[164px]",
        headerClassName: "w-[164px]",
        cell: (contact: ContactLead) => (
          <Button
            type="button"
            variant="ghost"
            className="block h-auto w-full truncate p-1 text-left text-[10px] font-semibold text-muted-foreground"
            aria-label={`${canUpdate ? "Edit" : "View"} note for ${contact.customerName}`}
            title={contact.note || "No note added"}
            onClick={() => onNote(contact)}
          >
            {contact.note || "No note added"}
          </Button>
        ),
      },
      {
        id: "actions",
        header: "Action Button",
        headerClassName: "w-[88px] text-right",
        className: "w-[88px] text-right align-middle",
        cell: (contact: ContactLead) => (
          !canUpdate && !canDelete ? (
            <span className="text-xs font-semibold text-muted-foreground">View only</span>
          ) : (
            <ContactLeadActionMenu
              contact={contact}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onEdit={onEdit}
              onInterested={onInterested}
              onNotInterested={onNotInterested}
              onConvert={onConvert}
              onDelete={onDelete}
            />
          )
        ),
      },
    ].map((column, index) => ({
      ...column,
      className: cn(index > 0 && "border-l border-slate-100", column.className),
      headerClassName: cn(
        index > 0 && "border-l border-slate-200",
        column.headerClassName,
      ),
    })),
    [
      allSelected,
      navigate,
      onConvert,
      onEdit,
      onNote,
      onInterested,
      onNotInterested,
      onDelete,
      projectsById,
      canDelete,
      canUpdate,
      selectedContactIds,
      toggleAll,
    ],
  );

  if (errorMessage) {
    return (
      <Card role="alert" className="space-y-3 p-6">
        <p className="font-semibold text-secondary">
          Could not load contact leads
        </p>
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            onClick={onRetry}
            disabled={isLoading}
          >
            Retry
          </Button>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          {isLoading
            ? "Loading contact leads..."
            : total === 0
              ? "Showing 0 of 0 contact leads"
              : `Showing ${rangeStart} to ${rangeEnd} of ${total} contact leads`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="text-xs font-extrabold text-secondary">
            {selectedCount} selected
          </p>
          {canUpdate || canDelete ? (
            <div className="flex items-center gap-2">
              {canUpdate ? (
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-md shadow-none"
                    >
                      Update
                      <ChevronRight className="h-4 w-4 rotate-90" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={() => openUpdateModal("assign")}>
                    Assign To
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openUpdateModal("source")}>
                    Lead Source
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openUpdateModal("project")}>
                    Project Name
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={interestedEligibleContacts.length === 0}
                    onClick={() => onBulkInterested(interestedEligibleContacts)}
                  >
                    Mark interested
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={convertibleContacts.length === 0}
                    onClick={() => onBulkConvert(convertibleContacts)}
                  >
                    Convert selected
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={notInterestedEligibleContacts.length === 0}
                    onClick={() =>
                      onBulkNotInterested(notInterestedEligibleContacts)
                    }
                  >
                    Mark not interested
                  </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              {canDelete && onBulkDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md text-red-700 hover:bg-red-50 hover:text-red-800 shadow-none"
                  disabled={selectedCount === 0}
                  onClick={() => onBulkDelete(selectedContacts)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <DataTable
        className="rounded-none border-0 shadow-none"
        tableClassName="table-fixed"
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyMessage="No contact leads found for these filters."
      />
      <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-xs font-semibold text-secondary">
          Rows {rowsPerPage}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-8 w-8 rounded-md p-0 shadow-none"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <Button
                key={`ellipsis-${index}`}
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
                disabled
              >
                ...
              </Button>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === currentPage ? "navy" : "outline"}
                className="h-8 w-8 rounded-md p-0 text-xs shadow-none"
                onClick={() => onPageChange(item)}
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
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Select
          value={String(rowsPerPage)}
          onValueChange={(value) => onRowsPerPageChange(Number(value))}
        >
          <SelectTrigger
            aria-label="Contact rows per page"
            className="h-8 w-[140px] rounded-md text-xs font-bold shadow-none"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TablePageSizeOptions sizes={[8, 10, 20]} labelPrefix="Rows per page" />
          </SelectContent>
        </Select>
      </div>
      <Dialog
        open={activeUpdateModal === "assign"}
        onOpenChange={(open) => (!open ? closeUpdateModal() : undefined)}
      >
        <DialogContent className="max-w-xl overflow-visible rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Assign contact leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Assign To
              </span>
              <SearchableSelect
                value={selectedAssigneeId}
                onValueChange={setSelectedAssigneeId}
                options={assigneeOptions}
                placeholder="Select employee"
                searchPlaceholder="Search employee by name or role..."
                noOptionsText="No employees found"
                className="h-11 bg-white"
                contentClassName="min-w-[320px]"
                modal={false}
                portaled={false}
              />
            </label>
            <p className="text-xs font-semibold text-muted-foreground">
              {selectedCount} selected contact lead
              {selectedCount === 1 ? "" : "s"} will be assigned to this
              employee.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button type="button" onClick={submitAssign}>
              Assign leads
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={activeUpdateModal === "source"}
        onOpenChange={(open) => (!open ? closeUpdateModal() : undefined)}
      >
        <DialogContent className="max-w-xl overflow-visible rounded-xl bg-white p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-lg font-extrabold text-secondary">
              Update lead source
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Lead Source
              </span>
              <SearchableSelect
                value={selectedSourceId}
                onValueChange={setSelectedSourceId}
                options={sourceOptions}
                placeholder="Select lead source"
                searchPlaceholder="Search lead sources..."
                noOptionsText="No lead sources found"
                className="h-11 bg-white"
                contentClassName="min-w-[300px]"
                modal={false}
                portaled={false}
              />
            </label>
            <p className="text-xs font-semibold text-muted-foreground">
              {selectedCount} selected contact lead
              {selectedCount === 1 ? "" : "s"} will receive this source.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button type="button" onClick={submitSource}>
              Update source
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
              Update project
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <label className="space-y-2">
              <span className="text-xs font-extrabold text-secondary">
                Project Name
              </span>
              <SearchableSelect
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                options={projectOptions}
                placeholder="Select project"
                searchPlaceholder="Search by project, location, or developer..."
                noOptionsText="No projects found"
                className="h-11 bg-white"
                contentClassName="min-w-[360px]"
                modal={false}
                portaled={false}
              />
            </label>
            <p className="text-xs font-semibold text-muted-foreground">
              {selectedCount} selected contact lead
              {selectedCount === 1 ? "" : "s"} will be linked to this project.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <Button type="button" variant="outline" onClick={closeUpdateModal}>
              Close
            </Button>
            <Button type="button" onClick={submitProject}>
              Update project
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function ContactLeadsScreen() {
  const queryClient = useQueryClient();
  const currentUser = useAppSelector((state) => state.auth.user);
  const { canCreate, canUpdate, canDelete } = usePermission("contact_leads");
  const projectsQuery = useProjects("");
  const filterOptions = useLeadListFilterOptions();
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftFilters, setDraftFilters] =
    useState<ContactLeadFilters>(initialFilters);
  const [appliedFilters, setAppliedFilters] =
    useState<ContactLeadFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactLead | null>(null);
  const [noteContact, setNoteContact] = useState<ContactLead | null>(null);
  const [form, setForm] = useState<ContactLeadForm>(emptyForm);
  const navigate = useNavigate();
  const [contactPendingDeletion, setContactPendingDeletion] =
    useState<ContactLead | null>(null);
  const [leadWorkspaceScope, setLeadWorkspaceScope] = useState<"mine" | "team">("team");
  const [contactsPendingBulkDelete, setContactsPendingBulkDelete] = useState<ContactLead[] | null>(null);
  const isTeamLeadContactViewer =
    currentUser?.role === "TEAM_LEADER" || currentUser?.role === "MANAGER";
  const canCreateContacts = canCreate && !isTeamLeadContactViewer;
  const canUpdateContacts = canUpdate && !isTeamLeadContactViewer;
  const canDeleteContacts =
    canDelete &&
    ["SUPER_ADMIN", "ADMIN", "SALES_MANAGER"].includes(currentUser?.role ?? "");
  const canImportContacts =
    canCreateContacts &&
    canAccess(currentUser, "leads", "create") &&
    canAccess(currentUser, "page.import_leads");
  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: addLeadSidebarItems,
        activeItem: "Lead Management",
        activeChild: "Contact Leads",
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span>Lead Management</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Contact Leads</span>
          </div>
        ),
        headerContent: (
          <div className="flex w-full items-center gap-3">
            <div className="relative max-w-xl flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search contact leads"
                value={draftSearch}
                placeholder={contactSearchPlaceholder}
                className="h-10 rounded-md border-slate-200 bg-white pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setDraftSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setAppliedFilters(draftFilters);
                    setSearch(draftSearch.trim());
                    setCurrentPage(1);
                  }
                }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
          </div>
        ),
      },
    },
    [draftFilters, draftSearch],
  );

  const contactsQuery = useQuery({
    queryKey: ["contact-leads", search, appliedFilters, currentPage, rowsPerPage, leadWorkspaceScope, isTeamLeadContactViewer],
    placeholderData: keepPreviousData,
    queryFn: async () =>
      (
        await api.get<ContactLeadListResponse>("/contact-leads", {
          params: {
            page: currentPage,
            limit: rowsPerPage,
            search: search || undefined,
            scope: isTeamLeadContactViewer ? leadWorkspaceScope : undefined,
            status: normalizeMultiFilterValue(appliedFilters.status),
            sourceId: normalizeMultiFilterValue(appliedFilters.sourceId),
            assignedToId: normalizeMultiFilterValue(appliedFilters.assignedToId),
            preferredProjectId: normalizeMultiFilterValue(
              appliedFilters.preferredProjectId,
            ),
            teamId: normalizeMultiFilterValue(appliedFilters.teamId),
            area: normalizeMultiFilterValue(appliedFilters.area),
            configuration: normalizeMultiFilterValue(
              appliedFilters.configuration,
            ),
            dateFrom: appliedFilters.from || undefined,
            dateTo: appliedFilters.to || undefined,
          },
        })
      ).data,
  });
  const contactStatsQuery = useQuery({
    queryKey: [
      "contact-leads",
      "stats",
      search,
      appliedFilters,
      leadWorkspaceScope,
      isTeamLeadContactViewer,
    ],
    queryFn: async () =>
      (
        await api.get<ContactLeadStatsResponse>("/contact-leads/stats", {
          params: {
            search: search || undefined,
            scope: isTeamLeadContactViewer ? leadWorkspaceScope : undefined,
            status: normalizeMultiFilterValue(appliedFilters.status),
            sourceId: normalizeMultiFilterValue(appliedFilters.sourceId),
            assignedToId: normalizeMultiFilterValue(appliedFilters.assignedToId),
            preferredProjectId: normalizeMultiFilterValue(
              appliedFilters.preferredProjectId,
            ),
            teamId: normalizeMultiFilterValue(appliedFilters.teamId),
            area: normalizeMultiFilterValue(appliedFilters.area),
            configuration: normalizeMultiFilterValue(
              appliedFilters.configuration,
            ),
            dateFrom: appliedFilters.from || undefined,
            dateTo: appliedFilters.to || undefined,
          },
        })
      ).data,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["contact-leads"] });
    await queryClient.invalidateQueries({ queryKey: ["leads"] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const createContact = useMutation({
    mutationFn: async (payload: ContactLeadForm) =>
      (await api.post("/contact-leads", payload)).data,
    onSuccess: invalidate,
  });

  const updateContact = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ContactLeadPatch;
    }) => (await api.patch(`/contact-leads/${id}`, payload)).data,
    onSuccess: invalidate,
  });

  const markInterested = useMutation({
    mutationFn: async (id: string) =>
      (await api.patch(`/contact-leads/${id}/interest`)).data,
    onSuccess: invalidate,
  });

  const markNotInterested = useMutation({
    mutationFn: async (id: string) =>
      (await api.patch(`/contact-leads/${id}/not-interested`)).data,
    onSuccess: invalidate,
  });

  const convertContact = useMutation({
    mutationFn: async (id: string) =>
      (await api.post(`/contact-leads/${id}/convert`)).data,
    onSuccess: invalidate,
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) =>
      (await api.delete(`/contact-leads/${id}`)).data,
    onSuccess: invalidate,
  });

  const rows = contactsQuery.data?.data ?? [];
  const totalRows = contactsQuery.data?.meta.total ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const statsData = contactStatsQuery.data?.data;
  const projects = useMemo(
    () => projectsQuery.data?.projects ?? [],
    [projectsQuery.data?.projects],
  );
  const projectsById = useMemo(
    () =>
      new Map<string, { id: string; name: string; location: string; developer: string; imageUrl: string }>(
        projects.map((project: { id: string; name: string; location: string; developer: string; imageUrl: string }) => [
          project.id,
          {
            id: project.id,
            name: project.name,
            location: project.location,
            developer: project.developer,
            imageUrl: project.imageUrl,
          },
        ]),
      ),
    [projects],
  );

  const sourceSearchOptions = filterOptions.options.sourceOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }));
  const assigneeSearchOptions = filterOptions.options.ownerOptions.map((option) => ({
    label: option.label,
    value: option.value,
    avatarUrl: option.image,
    description: option.role?.replace(/_/g, " "),
  }));
  const projectSearchOptions = projects.map((project: { id: string; name: string; location: string; developer: string; imageUrl: string }) => ({
    label: project.name,
    value: project.id,
    imageUrl: project.imageUrl,
    description: [project.location, project.developer]
      .filter(Boolean)
      .join(" · "),
  }));
  const selectedProject =
    form.preferredProjectId && form.preferredProjectId !== "all"
      ? projectsById.get(form.preferredProjectId)
      : undefined;

  const stats = useMemo<LeadStatsRowItem[]>(
    () => {
      const counts = {
        total: statsData?.total ?? 0,
        cold: statsData?.cold ?? 0,
        interested: statsData?.interested ?? 0,
        notInterested: statsData?.notInterested ?? 0,
        converted: statsData?.converted ?? 0,
      };

      return [
        {
          label: "Total Contact Leads",
          value: counts.total.toLocaleString("en-IN"),
          helper: "All visible contacts",
          change: "",
          icon: UsersRound,
          tone: "bg-blue-50 text-blue-700",
        },
        {
          label: "Cold Contacts",
          value: counts.cold.toLocaleString("en-IN"),
          helper: "Waiting for qualification",
          change: "",
          icon: UserPlus,
          tone: "bg-cyan-50 text-cyan-700",
        },
        {
          label: "Interested Contacts",
          value: counts.interested.toLocaleString("en-IN"),
          helper: "Ready to nurture",
          change: "",
          icon: Target,
          tone: "bg-orange-50 text-primary",
        },
        {
          label: "Not interested",
          value: counts.notInterested.toLocaleString("en-IN"),
          helper: "Not ready to proceed",
          change: "",
          icon: CircleX,
          tone: "bg-red-50 text-red-700",
        },
        {
          label: "Converted Contacts",
          value: counts.converted.toLocaleString("en-IN"),
          helper: "Moved to active leads",
          change: "",
          icon: CheckCircle2,
          tone: "bg-green-50 text-success",
        },
      ];
    },
    [statsData],
  );

  useEffect(() => {
    if (!modalOpen) return;

    if (editingContact) {
      setForm({
        customerName: editingContact.customerName,
        mobile: editingContact.mobile,
        alternateMobile: editingContact.alternateMobile ?? "",
        email: editingContact.email ?? "",
        sourceId: editingContact.sourceId ?? "",
        preferredProjectId: editingContact.preferredProjectId ?? "",
        assignedToId: editingContact.assignedToId ?? "",
        note: editingContact.note ?? "",
      });
      return;
    }

    setForm(emptyForm);
  }, [editingContact, modalOpen]);

  const openCreateModal = () => {
    setEditingContact(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (contact: ContactLead) => {
    setEditingContact(contact);
    setModalOpen(true);
  };

  const closeModal = (open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setEditingContact(null);
      setForm(emptyForm);
    }
  };

  const handleFilterChange = <K extends keyof ContactLeadFilters>(
    key: K,
    value: ContactLeadFilters[K],
  ) => {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setSearch(draftSearch.trim());
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setDraftFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setSearch("");
    setDraftSearch("");
    setCurrentPage(1);
  };

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const activeFilterCount =
    (appliedFilters.status.length ? 1 : 0) +
    (appliedFilters.sourceId.length ? 1 : 0) +
    (appliedFilters.assignedToId.length ? 1 : 0) +
    (appliedFilters.preferredProjectId.length ? 1 : 0) +
    (appliedFilters.teamId.length ? 1 : 0) +
    (appliedFilters.area.length ? 1 : 0) +
    (appliedFilters.configuration.length ? 1 : 0) +
    (appliedFilters.dateRange !== "all" ? 1 : 0);

  const handleSubmit = async () => {
    if (!form.customerName || !form.mobile || !form.sourceId) {
      toast.error("Source, customer name, and mobile are required");
      return;
    }

    try {
      const payload = { ...form, note: form.note.trim() };
      if (editingContact) {
        await updateContact.mutateAsync({ id: editingContact.id, payload });
        toast.success("Contact lead updated");
      } else {
        await createContact.mutateAsync(payload);
        toast.success("Contact lead added");
      }
      closeModal(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Contact lead action failed"));
    }
  };

  const runAction = async (
    action: () => Promise<unknown>,
    successMessage: string,
  ) => {
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Contact lead action failed"));
    }
  };

  const runBulkAction = async (
    contacts: ContactLead[],
    action: (contact: ContactLead) => Promise<unknown>,
    successMessage: string,
    emptyMessage: string,
  ) => {
    if (!contacts.length) {
      toast.error(emptyMessage);
      return;
    }

    try {
      await Promise.all(contacts.map((contact) => action(contact)));
      toast.success(
        `${successMessage} (${contacts.length} contact${contacts.length === 1 ? "" : "s"})`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Contact lead action failed"));
    }
  };

  const runBulkPatchAction = async (
    contacts: ContactLead[],
    payload: ContactLeadPatch,
    successMessage: string,
    emptyMessage: string,
  ) => {
    if (!contacts.length) {
      toast.error(emptyMessage);
      return;
    }

    try {
      await Promise.all(
        contacts.map((contact) =>
          api.patch(`/contact-leads/${contact.id}`, payload),
        ),
      );
      await invalidate();
      toast.success(
        `${successMessage} (${contacts.length} contact${
          contacts.length === 1 ? "" : "s"
        })`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Contact lead action failed"));
    }
  };

  const handleStatClick = (label: string) => {
    switch (label) {
      case "Total Contact Leads":
        setDraftFilters((current) => ({ ...current, status: [] }));
        setAppliedFilters((current) => ({ ...current, status: [] }));
        break;
      case "Cold Contacts":
        setDraftFilters((current) => ({ ...current, status: ["COLD"] }));
        setAppliedFilters((current) => ({ ...current, status: ["COLD"] }));
        break;
      case "Interested Contacts":
        setDraftFilters((current) => ({ ...current, status: ["INTERESTED"] }));
        setAppliedFilters((current) => ({
          ...current,
          status: ["INTERESTED"],
        }));
        break;
      case "Not interested":
        setDraftFilters((current) => ({
          ...current,
          status: ["NOT_INTERESTED"],
        }));
        setAppliedFilters((current) => ({
          ...current,
          status: ["NOT_INTERESTED"],
        }));
        break;
      case "Converted Contacts":
        setDraftFilters((current) => ({ ...current, status: ["CONVERTED"] }));
        setAppliedFilters((current) => ({
          ...current,
          status: ["CONVERTED"],
        }));
        break;
      default:
        break;
    }
    setCurrentPage(1);
  };

  return (
    <main className="mx-auto space-y-8 p-4 sm:p-6">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold text-secondary">
            <UsersRound className="h-7 w-7 text-blue-700" />
            Contact Leads Dashboard
          </h1>
          <p className="mt-2 text-sm font-semibold text-blue-800">
            Store cold contacts in a dedicated workspace until they show interest
            and convert into active leads.
          </p>
        </div>
        <div className="flex gap-3">
          {canImportContacts ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md px-5 shadow-none"
              onClick={() => navigate("/leads/import?target=contact&method=excel-csv")}
            >
              <Download className="mr-2 h-4 w-4" />
              Import Contact Leads
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md px-5 shadow-none"
            onClick={() => {
              if (!rows.length) {
                toast.error("No contact leads available to export");
                return;
              }

              const headers = [
                "Added Date",
                "Last Update",
                "Source",
                "Name",
                "Number",
                "Project Name",
                "Assigned To",
                "Contact Status",
                "Note",
              ];
              const csvRows = rows.map((contact: ContactLead) => [
                formatDateTime(contact.createdAt),
                formatDateTime(contact.updatedAt),
                contact.sourceName || "Unknown",
                contact.customerName,
                formatContactNumber(contact),
                contact.projectName || "Not mapped",
                contact.assignedToName || "Unassigned",
                contactStatusLabel(contact.status),
                contact.note || "",
              ]);
              const csv = [headers, ...csvRows]
                .map((row) =>
                  row
                    .map((value: unknown) =>
                      `"${String(value ?? "").replace(/"/g, '""')}"`,
                    )
                    .join(","),
                )
                .join("\n");

              const blob = new Blob([csv], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `contact-leads-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
              link.click();
              URL.revokeObjectURL(url);
              toast.success(
                `Exported ${rows.length} contact lead${rows.length === 1 ? "" : "s"}`,
              );
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Contacts
          </Button>
          {isTeamLeadContactViewer ? (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1">
              <Button
                type="button"
                variant={leadWorkspaceScope === "mine" ? "navy" : "ghost"}
                size="sm"
                className="h-8 rounded-md text-xs font-extrabold"
                onClick={() => {
                  setLeadWorkspaceScope("mine");
                  setCurrentPage(1);
                }}
              >
                My contact leads
              </Button>
              <Button
                type="button"
                variant={leadWorkspaceScope === "team" ? "navy" : "ghost"}
                size="sm"
                className="h-8 rounded-md text-xs font-extrabold"
                onClick={() => {
                  setLeadWorkspaceScope("team");
                  setCurrentPage(1);
                }}
              >
                Team contact leads
              </Button>
            </div>
          ) : null}
          {canCreateContacts ? (
            <Button type="button" className="h-11 rounded-md px-5" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add Contact Lead
            </Button>
          ) : null}
        </div>
      </section>

      <StatsRow
        stats={stats}
        onStatClick={handleStatClick}
        activeLabels={stats
          .filter((item) => {
            if (item.label === "Total Contact Leads") {
              return appliedFilters.status.length === 0;
            }
            if (item.label === "Cold Contacts") {
              return appliedFilters.status.includes("COLD");
            }
            if (item.label === "Interested Contacts") {
              return appliedFilters.status.includes("INTERESTED");
            }
            if (item.label === "Not interested") {
              return appliedFilters.status.includes("NOT_INTERESTED");
            }
            if (item.label === "Converted Contacts") {
              return appliedFilters.status.includes("CONVERTED");
            }
            return false;
          })
          .map((item) => item.label)}
      />

      <section className="space-y-5">
        <FiltersCard
          filters={draftFilters}
          activeFilterCount={activeFilterCount}
          sourceOptions={filterOptions.options.sourceOptions}
          assigneeOptions={filterOptions.options.ownerOptions}
          teamOptions={filterOptions.options.teamOptions}
          areaOptions={filterOptions.options.areaOptions}
          configurationOptions={filterOptions.options.configurationOptions}
          projectOptions={projectSearchOptions}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
          onFilterChange={handleFilterChange}
        />
        <ContactsTable
          rows={rows}
          total={totalRows}
          currentPage={currentPage}
          rowsPerPage={rowsPerPage}
          isLoading={contactsQuery.isLoading}
          errorMessage={
            contactsQuery.isError
              ? getApiErrorMessage(contactsQuery.error, "Please try again.")
              : undefined
          }
          onRetry={() => void contactsQuery.refetch()}
          canUpdate={canUpdateContacts}
          canDelete={canDeleteContacts}
          onPageChange={setCurrentPage}
          onRowsPerPageChange={(limit) => {
            setRowsPerPage(limit);
            setCurrentPage(1);
          }}
          onEdit={openEditModal}
          onNote={setNoteContact}
          onInterested={(contact) =>
            runAction(
              () => markInterested.mutateAsync(contact.id),
              "Contact marked interested",
            )
          }
          onBulkInterested={(contacts) =>
            runBulkAction(
              contacts,
              (contact) => markInterested.mutateAsync(contact.id),
              "Selected contacts marked interested",
              "Select at least one cold contact to mark interested",
            )
          }
          onNotInterested={(contact) =>
            runAction(
              () => markNotInterested.mutateAsync(contact.id),
              "Contact marked not interested",
            )
          }
          onDelete={setContactPendingDeletion}
          onBulkDelete={
            canDeleteContacts ? setContactsPendingBulkDelete : undefined
          }
          onBulkNotInterested={(contacts) =>
            runBulkAction(
              contacts,
              (contact) => markNotInterested.mutateAsync(contact.id),
              "Selected contacts marked not interested",
              "Select at least one cold or interested contact",
            )
          }
          onConvert={(contact) =>
            runAction(
              () => convertContact.mutateAsync(contact.id),
              "Converted to active lead",
            )
          }
          onBulkConvert={(contacts) =>
            runBulkAction(
              contacts,
              (contact) => convertContact.mutateAsync(contact.id),
              "Selected contacts converted to active leads",
              "Select at least one eligible contact to convert",
            )
          }
          onBulkAssign={(contacts, assigneeId) =>
            runBulkPatchAction(
              contacts,
              { assignedToId: assigneeId },
              "Selected contacts assigned",
              "Select at least one contact lead to assign",
            )
          }
          onBulkSource={(contacts, sourceId) =>
            runBulkPatchAction(
              contacts,
              { sourceId },
              "Selected contact sources updated",
              "Select at least one contact lead to update",
            )
          }
          onBulkProject={(contacts, projectId) =>
            runBulkPatchAction(
              contacts,
              { preferredProjectId: projectId },
              "Selected contact projects updated",
              "Select at least one contact lead to update",
            )
          }
          sourceOptions={sourceSearchOptions}
          assigneeOptions={assigneeSearchOptions}
          projectOptions={projectSearchOptions}
          projectsById={projectsById}
        />
      </section>

      {noteContact ? (
        <ContactLeadNoteDialog
          key={noteContact.id}
          contact={noteContact}
          canUpdate={canUpdateContacts}
          isPending={updateContact.isPending}
          onClose={() => setNoteContact(null)}
          onSave={async (note) => {
            await updateContact.mutateAsync({
              id: noteContact.id,
              payload: { note },
            });
            toast.success("Contact note updated");
            setNoteContact(null);
          }}
        />
      ) : null}
      <ContactLeadModal
        open={modalOpen}
        onOpenChange={closeModal}
        form={form}
        onFormChange={(patch) =>
          setForm((current: ContactLeadForm) => ({ ...current, ...patch }))
        }
        onSubmit={handleSubmit}
        isPending={createContact.isPending || updateContact.isPending}
        sourceOptions={sourceSearchOptions}
        assigneeOptions={assigneeSearchOptions}
        projectOptions={projectSearchOptions}
        selectedProject={selectedProject}
        editing={Boolean(editingContact)}
      />
      <ConfirmDeleteDialog
        open={Boolean(contactPendingDeletion)}
        title="Delete contact lead?"
        description={`${contactPendingDeletion?.customerName ?? "This contact"} will be permanently removed from Contact Leads. It will not appear in Deleted Leads.`}
        entityName={contactPendingDeletion?.customerName}
        confirmLabel="Delete contact"
        isLoading={deleteContact.isPending}
        onConfirm={async () => {
          if (!contactPendingDeletion) return;
          try {
            await deleteContact.mutateAsync(contactPendingDeletion.id);
            toast.success("Contact lead deleted");
            setContactPendingDeletion(null);
          } catch (error) {
            toast.error(getApiErrorMessage(error, "Contact lead action failed"));
          }
        }}
        onCancel={() => setContactPendingDeletion(null)}
        onClose={() => setContactPendingDeletion(null)}
      />
      <ConfirmDeleteDialog
        open={Boolean(contactsPendingBulkDelete && contactsPendingBulkDelete.length > 0)}
        title="Delete selected contact leads?"
        description={`${contactsPendingBulkDelete?.length ?? 0} selected contact leads will be permanently deleted. They will not appear in Deleted Leads.`}
        entityName={`${contactsPendingBulkDelete?.length ?? 0} Contact Leads`}
        confirmLabel="Delete permanently"
        isLoading={deleteContact.isPending}
        onConfirm={async () => {
          if (!contactsPendingBulkDelete || !contactsPendingBulkDelete.length) return;
          try {
            await Promise.all(
              contactsPendingBulkDelete.map((contact) =>
                deleteContact.mutateAsync(contact.id),
              ),
            );
            toast.success(
              `${contactsPendingBulkDelete.length} contact lead${contactsPendingBulkDelete.length === 1 ? "" : "s"} deleted permanently`,
            );
            setContactsPendingBulkDelete(null);
          } catch (error) {
            toast.error(getApiErrorMessage(error, "Contact lead action failed"));
          }
        }}
        onCancel={() => setContactsPendingBulkDelete(null)}
        onClose={() => setContactsPendingBulkDelete(null)}
      />
    </main>
  );
}
