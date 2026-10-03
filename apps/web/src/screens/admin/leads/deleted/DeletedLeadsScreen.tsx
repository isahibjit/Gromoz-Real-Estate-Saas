import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmDeleteDialog,
  DataTable,
  Input,
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  TablePageSizeOptions,
  cn,
  type ColumnDef,
} from "ui";

import { api } from "../../../../common/api";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";

interface DeletedLeadRow {
  id: string;
  displayId: string;
  name: string;
  mobile: string;
  email?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  sourceName?: string | null;
  statusName?: string | null;
  stageName?: string | null;
  temperatureName?: string | null;
  leadType?: string | null;
  nextFollowUpAt?: string | null;
  remarks?: string | null;
  requirement?: string | null;
  projectName?: string | null;
  projectArea?: string | null;
  project?: string | { id?: string; name?: string; location?: string } | null;
  assignedTo?: string | null;
  ownerName?: string | null;
  telecallerName?: string | null;
  fieldExecutiveName?: string | null;
  deletedAt?: string | null;
  deletedByName?: string | null;
  deleteReason?: string | null;
}

const resolveProjectName = (lead: DeletedLeadRow): string => {
  if (lead.projectName && typeof lead.projectName === "string") return lead.projectName;
  if (typeof lead.project === "string" && lead.project) return lead.project;
  if (
    lead.project &&
    typeof lead.project === "object" &&
    typeof lead.project.name === "string" &&
    lead.project.name
  ) {
    return lead.project.name;
  }
  return "Not Set";
};

const resolveProjectArea = (lead: DeletedLeadRow): string => {
  if (lead.projectArea && typeof lead.projectArea === "string") return lead.projectArea;
  if (
    lead.project &&
    typeof lead.project === "object" &&
    typeof lead.project.location === "string" &&
    lead.project.location
  ) {
    return lead.project.location;
  }
  if (lead.requirement && typeof lead.requirement === "string") return lead.requirement;
  return "No location";
};

interface DeletedLeadsResponse {
  data: DeletedLeadRow[];
  meta: { page: number; limit: number; total: number };
}

const formatTableDateTime = (value?: string | null) => {
  if (!value) return "Not Set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}\n${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const statusTone = (value?: string | null) => {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized.includes("lost")) return "bg-red-100 text-red-600";
  if (normalized.includes("book") || normalized.includes("won"))
    return "bg-green-100 text-success";
  if (normalized.includes("visit")) return "bg-violet-100 text-violet-700";
  if (normalized.includes("follow")) return "bg-orange-100 text-primary";
  if (normalized.includes("contact")) return "bg-cyan-100 text-cyan-700";
  if (normalized.includes("interest")) return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-secondary";
};

const deletedLeadAssignments = (lead: DeletedLeadRow) => {
  const entries: Array<{ label: string; value: string }> = [];
  if (lead.telecallerName) {
    entries.push({ label: "Pre Sales Executive", value: lead.telecallerName });
  }
  if (lead.fieldExecutiveName) {
    entries.push({ label: "Sales Executive", value: lead.fieldExecutiveName });
  }
  if (!entries.length && lead.ownerName) {
    entries.push({ label: "Owner", value: lead.ownerName });
  }
  if (!entries.length && lead.assignedTo) {
    entries.push({ label: "Assigned", value: lead.assignedTo });
  }
  return entries;
};

export function DeletedLeadsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [restoreLead, setRestoreLead] = useState<DeletedLeadRow | null>(null);
  const [permanentDeleteLead, setPermanentDeleteLead] =
    useState<DeletedLeadRow | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [bulkRestoreOpen, setBulkRestoreOpen] = useState(false);
  const [bulkPermanentDeleteOpen, setBulkPermanentDeleteOpen] = useState(false);

  useDashboardLayout(
    {
      sidebar: { activeItem: "Lead Management", activeChild: "Deleted Leads" },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span>Lead Management</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Deleted Leads</span>
          </div>
        ),
      },
    },
    [],
  );

  const deletedLeads = useQuery({
    queryKey: ["leads", "deleted", search, page, rowsPerPage],
    queryFn: async () =>
      (
        await api.get<DeletedLeadsResponse>("/leads/deleted", {
          params: { search: search || undefined, page, limit: rowsPerPage },
        })
      ).data,
  });

  const restoreMutation = useMutation({
    mutationFn: async (leadId: string) =>
      (await api.patch(`/leads/${leadId}/restore`)).data,
    onSuccess: () => {
      toast.success("Lead restored");
      setRestoreLead(null);
      void queryClient.invalidateQueries({ queryKey: ["leads"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => toast.error("Could not restore lead"),
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: async (leadId: string) =>
      (await api.delete(`/leads/${leadId}/permanent`)).data,
    onSuccess: async (_data, deletedLeadId) => {
      toast.success("Lead permanently deleted");
      setPermanentDeleteLead(null);
      setSelectedLeadIds((current) =>
        current.filter((id) => id !== deletedLeadId),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: () => toast.error("Could not permanently delete lead"),
  });

  const rows = useMemo(
    () => deletedLeads.data?.data ?? [],
    [deletedLeads.data?.data],
  );
  const total = deletedLeads.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const rangeStart = total === 0 ? 0 : (page - 1) * rowsPerPage + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * rowsPerPage, total);
  const currentPageLeadIds = useMemo(
    () => rows.map((lead: DeletedLeadRow) => lead.id),
    [rows],
  );
  const currentPageLeadIdSet = useMemo(
    () => new Set(currentPageLeadIds),
    [currentPageLeadIds],
  );
  const selectedVisibleLeadIds = useMemo(
    () => selectedLeadIds.filter((leadId) => currentPageLeadIdSet.has(leadId)),
    [currentPageLeadIdSet, selectedLeadIds],
  );
  const selectedCount = selectedVisibleLeadIds.length;
  const allSelected =
    currentPageLeadIds.length > 0 &&
    currentPageLeadIds.every((leadId: string) => selectedVisibleLeadIds.includes(leadId));

  useEffect(() => {
    setSelectedLeadIds((current) => {
      const next = current.filter((leadId) => currentPageLeadIdSet.has(leadId));
      return next.length === current.length ? current : next;
    });
  }, [currentPageLeadIdSet]);

  const toggleAll = useCallback(() => {
    if (!currentPageLeadIds.length) return;
    setSelectedLeadIds((current) => {
      const isAllSelected = currentPageLeadIds.every((id) =>
        current.includes(id),
      );
      if (isAllSelected) {
        return current.filter((id) => !currentPageLeadIds.includes(id));
      }
      return Array.from(new Set([...current, ...currentPageLeadIds]));
    });
  }, [currentPageLeadIds]);

  const toggleLead = useCallback((leadId: string) => {
    setSelectedLeadIds((current) =>
      current.includes(leadId)
        ? current.filter((id) => id !== leadId)
        : [...current, leadId],
    );
  }, []);
  const bulkRestoreMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedVisibleLeadIds.map((leadId) =>
          api.patch(`/leads/${leadId}/restore`),
        ),
      );
    },
    onSuccess: async () => {
      toast.success(
        `${selectedCount} lead${selectedCount === 1 ? "" : "s"} restored`,
      );
      setBulkRestoreOpen(false);
      setSelectedLeadIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: () => toast.error("Could not restore selected leads"),
  });
  const bulkPermanentDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedVisibleLeadIds.map((leadId) =>
          api.delete(`/leads/${leadId}/permanent`),
        ),
      );
    },
    onSuccess: async () => {
      toast.success(
        `${selectedCount} lead${
          selectedCount === 1 ? "" : "s"
        } permanently deleted`,
      );
      setBulkPermanentDeleteOpen(false);
      setSelectedLeadIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onError: () => toast.error("Could not permanently delete selected leads"),
  });
  const stats = useMemo(
    () => [
      { label: "Deleted leads", value: total },
      { label: "On this page", value: rows.length },
      {
        label: "With reason",
        value: rows.filter((row: DeletedLeadRow) => row.deleteReason).length,
      },
    ],
    [rows, total],
  );

  const columns = useMemo<ColumnDef<DeletedLeadRow>[]>(
    () =>
      [
        {
          id: "select",
          header: (
            <Checkbox
              id="deleted-leads-select-all"
              checked={allSelected}
              aria-label="Select all deleted leads"
              onChange={toggleAll}
              className="gap-0 cursor-pointer"
            />
          ),
          className: "!w-[44px] !px-2",
          headerClassName: "!w-[44px] !px-2",
          cell: (lead: DeletedLeadRow) => (
            <div
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center"
            >
              <Checkbox
                id={`deleted-lead-select-${lead.id}`}
                checked={selectedLeadIds.includes(lead.id)}
                aria-label={`Select ${lead.name}`}
                onChange={() => toggleLead(lead.id)}
                className="gap-0 cursor-pointer"
              />
            </div>
          ),
        },
        {
          id: "addedDate",
          header: "Added Date",
          className: "w-[118px] max-w-[118px] pr-4",
          headerClassName: "w-[118px] pr-4",
          cell: (lead: DeletedLeadRow) => (
            <span className="whitespace-pre-line text-[10px] font-semibold text-secondary">
              {formatTableDateTime(lead.createdAt)}
            </span>
          ),
        },
        {
          id: "lastUpdate",
          header: "Last Update",
          className: "w-[118px] max-w-[118px] pl-4",
          headerClassName: "w-[118px] pl-4",
          cell: (lead: DeletedLeadRow) => (
            <span className="whitespace-pre-line text-[10px] font-semibold text-secondary">
              {formatTableDateTime(lead.updatedAt)}
            </span>
          ),
        },
        {
          id: "source",
          header: "Source",
          className: "w-[96px] max-w-[96px]",
          headerClassName: "w-[96px]",
          cell: (lead: DeletedLeadRow) => (
            <Badge className="inline-flex max-w-full whitespace-nowrap border-0 bg-blue-50 px-1.5 py-0.5 text-[9px] font-extrabold text-blue-700">
              {lead.sourceName || "Unknown"}
            </Badge>
          ),
        },
        {
          id: "name",
          header: "Name",
          className: "min-w-0 w-[110px] max-w-[110px]",
          headerClassName: "w-[110px]",
          cell: (lead: DeletedLeadRow) => (
            <span className="block truncate text-[10px] font-extrabold text-secondary">
              {lead.name}
            </span>
          ),
        },
        {
          id: "number",
          header: "Number",
          className: "w-[104px] max-w-[104px]",
          headerClassName: "w-[104px]",
          cell: (lead: DeletedLeadRow) => (
            <span className="block truncate text-[10px] font-semibold text-secondary">
              {lead.mobile}
            </span>
          ),
        },
        {
          id: "projectName",
          header: "Project Name",
          className: "w-[160px] max-w-[160px]",
          headerClassName: "w-[160px]",
          cell: (lead: DeletedLeadRow) => (
            <div className="min-w-0">
              <p className="truncate text-[10px] font-extrabold text-secondary">
                {resolveProjectName(lead)}
              </p>
              <p className="mt-0.5 truncate text-[9px] font-semibold text-muted-foreground">
                {resolveProjectArea(lead)}
              </p>
            </div>
          ),
        },
        {
          id: "executive",
          header: "Executive",
          className: "w-[142px] max-w-[142px]",
          headerClassName: "w-[142px]",
          cell: (lead: DeletedLeadRow) => {
            const entries = deletedLeadAssignments(lead);
            return entries.length ? (
              <div className="min-w-0 space-y-2">
                {entries.map((entry) => (
                  <div key={`${lead.id}-${entry.label}`} className="min-w-0">
                    <p className="truncate text-[10px] font-extrabold text-secondary">
                      {entry.value}
                    </p>
                    <p className="truncate text-[9px] font-semibold text-muted-foreground">
                      {entry.label}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[10px] font-semibold text-muted-foreground">
                Unassigned
              </span>
            );
          },
        },
        {
          id: "leadStatus",
          header: "Lead Status",
          className: "w-[106px] max-w-[106px]",
          headerClassName: "w-[106px]",
          cell: (lead: DeletedLeadRow) => {
            const status = lead.statusName || lead.stageName || "Deleted";
            return (
              <Badge
                className={cn(
                  "inline-flex w-fit max-w-full whitespace-nowrap border-0 px-2 py-0.5 text-[9px] font-extrabold leading-none",
                  statusTone(status),
                )}
              >
                {status}
              </Badge>
            );
          },
        },
        {
          id: "leadType",
          header: "Lead Type",
          className: "w-[92px] max-w-[92px]",
          headerClassName: "w-[92px]",
          cell: (lead: DeletedLeadRow) => (
            <span className="inline-flex h-6 min-w-[64px] items-center justify-center rounded-md border border-success/25 bg-success/10 px-1.5 text-[9px] font-extrabold text-success">
              {lead.temperatureName || lead.leadType || "Warm"}
            </span>
          ),
        },
        {
          id: "followUpDate",
          header: "Follow-up Date",
          className: "w-[144px] max-w-[144px] pl-4",
          headerClassName: "w-[144px] pl-4",
          cell: (lead: DeletedLeadRow) => (
            <span className="whitespace-pre-line text-[9px] font-semibold text-secondary">
              {formatTableDateTime(lead.nextFollowUpAt)}
            </span>
          ),
        },
        {
          id: "remark",
          header: "Remark",
          className: "w-[164px] max-w-[164px]",
          headerClassName: "w-[164px]",
          cell: (lead: DeletedLeadRow) => (
            <span className="block w-full truncate text-[9px] font-semibold text-muted-foreground">
              {lead.remarks?.trim() || lead.deleteReason || "Not Set"}
            </span>
          ),
        },
        {
          id: "actions",
          header: "Action Button",
          headerClassName: "w-[88px] text-right",
          className: "w-[88px] text-right align-middle",
          cell: (lead: DeletedLeadRow) => (
            <div className="flex justify-end gap-1.5">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-8 rounded-md p-0 shadow-none"
                aria-label={`Restore ${lead.name}`}
                title="Restore lead"
                onClick={() => setRestoreLead(lead)}
              >
                <RotateCcw className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-8 w-8 rounded-md p-0 shadow-none"
                aria-label={`Permanently delete ${lead.name}`}
                title="Permanently delete lead"
                onClick={() => setPermanentDeleteLead(lead)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ),
        },
      ].map((column, index) => ({
        ...column,
        className: cn(
          index > 0 && "border-l border-slate-100",
          column.className,
        ),
        headerClassName: cn(
          index > 0 && "border-l border-slate-200",
          column.headerClassName,
        ),
      })),
    [allSelected, selectedLeadIds, toggleAll, toggleLead],
  );

  return (
    <WorkspacePage>
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-secondary">
            <Trash2 className="size-6 text-red-600" />
            Deleted Leads
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Review leads moved out of active work and restore them when needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md px-4 shadow-none"
            onClick={() => deletedLeads.refetch()}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="rounded-md border border-slate-200 bg-white p-4 shadow-none"
          >
            <p className="text-xs font-bold text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-secondary">
              {stat.value}
            </p>
          </Card>
        ))}
        <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-none">
          <p className="text-xs font-bold text-muted-foreground">
            Selected
          </p>
          <p className="mt-1 text-2xl font-extrabold text-secondary">
            {selectedCount}
          </p>
        </Card>
      </section>

      <Card className="rounded-md border border-slate-200 bg-white shadow-none">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full flex-col gap-2 lg:max-w-4xl lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                aria-label="Search deleted leads"
                placeholder="Search by lead, mobile, or ID..."
                className="h-10 rounded-md pl-10 text-sm font-semibold shadow-none"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelectedLeadIds([]);
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4 shadow-none"
              disabled={!selectedCount || bulkRestoreMutation.isPending}
              onClick={() => setBulkRestoreOpen(true)}
            >
              <RotateCcw className="size-4" />
              Recover selected ({selectedCount})
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-10 rounded-md px-4 shadow-none"
              disabled={!selectedCount || bulkPermanentDeleteMutation.isPending}
              onClick={() => setBulkPermanentDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Permanent delete ({selectedCount})
            </Button>
            {selectedCount ? (
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-md px-3 text-xs font-bold text-muted-foreground shadow-none"
                onClick={() => setSelectedLeadIds([])}
              >
                <X className="size-4" />
                Clear
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="w-fit rounded-md border-0 bg-slate-100 px-3 py-1 text-xs font-extrabold text-secondary">
              {selectedCount} selected
            </Badge>
            <Badge className="w-fit rounded-md border-0 bg-slate-100 px-3 py-1 text-xs font-extrabold text-secondary">
              {total} total
            </Badge>
          </div>
        </div>

        <DataTable
          className="border-0 shadow-none rounded-none"
          tableClassName="table-fixed"
          columns={columns}
          data={rows}
          isLoading={deletedLeads.isLoading}
          emptyMessage="No deleted leads found."
        />

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            Showing {rangeStart} to {rangeEnd} of {total} deleted leads
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={String(rowsPerPage)}
              onValueChange={(value) => {
                setRowsPerPage(Number(value));
                setPage(1);
                setSelectedLeadIds([]);
              }}
            >
              <SelectTrigger
                aria-label="Rows per page"
                className="h-8 w-[118px] rounded-md text-xs font-bold shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <TablePageSizeOptions sizes={[10, 25, 50, 100]} />
              </SelectContent>
            </Select>
            <span className="px-2 text-xs font-semibold text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md px-3 text-xs shadow-none"
              disabled={page <= 1}
              onClick={() => {
                setPage((value) => Math.max(1, value - 1));
                setSelectedLeadIds([]);
              }}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-8 rounded-md px-3 text-xs shadow-none"
              disabled={page >= totalPages}
              onClick={() => {
                setPage((value) => Math.min(totalPages, value + 1));
                setSelectedLeadIds([]);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDeleteDialog
        open={Boolean(restoreLead)}
        title="Restore deleted lead?"
        description={`Restore ${restoreLead?.name ?? "this lead"} back to active lead lists.`}
        confirmLabel="Restore Lead"
        cancelLabel="Cancel"
        destructive={false}
        isLoading={restoreMutation.isPending}
        icon={<RotateCcw className="size-6 text-blue-600" />}
        onConfirm={() => restoreLead && restoreMutation.mutate(restoreLead.id)}
        onCancel={() => setRestoreLead(null)}
        onClose={() => setRestoreLead(null)}
      />
      <ConfirmDeleteDialog
        open={bulkRestoreOpen}
        title="Recover selected leads?"
        description={`${selectedCount} selected lead${
          selectedCount === 1 ? "" : "s"
        } will be restored back to active lead lists.`}
        confirmLabel="Recover Selected"
        cancelLabel="Cancel"
        destructive={false}
        isLoading={bulkRestoreMutation.isPending}
        icon={<RotateCcw className="size-6 text-blue-600" />}
        onConfirm={() => bulkRestoreMutation.mutate()}
        onCancel={() => setBulkRestoreOpen(false)}
        onClose={() => setBulkRestoreOpen(false)}
      />
      <ConfirmDeleteDialog
        open={Boolean(permanentDeleteLead)}
        title="Permanently delete lead?"
        description={`Delete ${
          permanentDeleteLead?.name ?? "this lead"
        } forever. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        destructive
        isLoading={permanentDeleteMutation.isPending}
        icon={<Trash2 className="size-6 text-red-600" />}
        onConfirm={() =>
          permanentDeleteLead &&
          permanentDeleteMutation.mutate(permanentDeleteLead.id)
        }
        onCancel={() => setPermanentDeleteLead(null)}
        onClose={() => setPermanentDeleteLead(null)}
      />
      <ConfirmDeleteDialog
        open={bulkPermanentDeleteOpen}
        title="Permanently delete selected leads?"
        description={`${selectedCount} selected lead${
          selectedCount === 1 ? "" : "s"
        } will be deleted forever. This cannot be undone.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        destructive
        isLoading={bulkPermanentDeleteMutation.isPending}
        icon={<Trash2 className="size-6 text-red-600" />}
        onConfirm={() => bulkPermanentDeleteMutation.mutate()}
        onCancel={() => setBulkPermanentDeleteOpen(false)}
        onClose={() => setBulkPermanentDeleteOpen(false)}
      />
    </WorkspacePage>
  );
}
