import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Info, Plus, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { ConfirmDeleteDialog, Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, cn } from "ui";
import toast from "react-hot-toast";

import { MasterCategoryPanel } from "./components/MasterCategoryPanel";
import { MasterHelpCard } from "./components/MasterHelpCard";
import { MasterDetailCard } from "./components/MasterDetailCard";
import { MasterDataTable } from "./components/MasterDataTable";
import { MasterRecordModal } from "./components/MasterRecordModal";
import { MasterWarningNote } from "./components/MasterWarningNote";
import { CustomizeStatsAndPillsModal } from "../components/CustomizeStatsAndPillsModal";
import { api } from "../../../../common/api";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import { usePermission } from "../../../../common/access/usePermission";
import {
  createDefaultFilters,
  getInitialFormValues,
  getInitialLeadMasterRows,
  getMasterCategories,
  leadMasterConfigs,
  visibleMasterCategoryDefinitions,
  type LeadMasterBaseRow,
  type LeadMasterCategoryId,
  type LeadMasterFilterState,
} from "./leadMastersData";

const rowsPerPageDefault = 5;

const leadMasterCategoryIds = visibleMasterCategoryDefinitions.map(
  (category) => category.id as LeadMasterCategoryId,
);

const scoreEnabledCategoryIds = new Set<LeadMasterCategoryId>(["status"]);

type ApiLeadMasterValue = {
  id: string;
  sortOrder?: number | null;
  name?: string | null;
  code?: string | null;
  description?: string | null;
  group?: string | null;
  category?: string | null;
  type?: string | null;
  status?: string | null;
  statusType?: string | null;
  isActive?: boolean | null;
  isSystemDefault?: boolean | null;
  probability?: number | null;
  weight?: number | null;
  manualScore?: number | null;
  score?: number | null;
  pointsEnabled?: boolean | null;
  channel?: string | null;
  reasonCategory?: string | null;
  tagColor?: string | null;
  ratingValue?: number | null;
  displayColor?: string | null;
  triggerAction?: string | null;
  allowFollowUp?: boolean | null;
  followUpNotificationEnabled?: boolean | null;
  followUpRenotifyMinutes?: number | null;
  autoAssignActive?: boolean | null;
 showInStatsCard?: boolean | null;
 showInFilterBar?: boolean | null;

};

function normalizeStatusType(value?: string | null) {
  return value === "System Default" ? "System Default" : "Custom";
}

function getCategoryFilterValue(row: LeadMasterBaseRow) {
  return row.category ?? row.type ?? row.reasonCategory ?? row.channel;
}

function sortRows(rows: LeadMasterBaseRow[]) {
  return [...rows].sort((left, right) => left.sortOrder - right.sortOrder);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response
      ?.data?.message === "string"
  ) {
    return (error as { response: { data: { message: string } } }).response.data
      .message;
  }

  return fallback;
}

function toApiRow(row: ApiLeadMasterValue): LeadMasterBaseRow {
  return {
    id: row.id,
    sortOrder: row.sortOrder ?? 0,
    name: row.name ?? "",
    code: row.code ?? "",
    description: row.description ?? "",
    category: row.group ?? row.category ?? "",
    type: row.type ?? "",
    status: row.status ?? "Active",
    statusType: normalizeStatusType(row.statusType),
    isActive: row.isActive ?? true,
    isSystemDefault: row.isSystemDefault ?? false,
    probability: row.probability ?? 0,
    weight: row.weight ?? 0,
    score: row.manualScore ?? row.score ?? 0,
    pointsEnabled: row.pointsEnabled ?? true,
    channel: row.channel ?? "",
    reasonCategory: row.reasonCategory ?? "",
    tagColor: row.tagColor ?? "",
    ratingValue: row.ratingValue ?? 0,
    displayColor: row.displayColor ?? "",
    triggerAction: row.triggerAction ?? "NONE",
    allowFollowUp: row.allowFollowUp ?? true,
    followUpNotificationEnabled: row.followUpNotificationEnabled ?? true,
    followUpRenotifyMinutes: row.followUpRenotifyMinutes ?? 0,
    autoAssignActive: row.autoAssignActive ?? true,
    showInStatsCard: row.showInStatsCard ?? true,
    showInFilterBar: row.showInFilterBar ?? true,
  };
}

function toPayload(values: LeadMasterBaseRow, categoryId: LeadMasterCategoryId) {
  return {
    name: values.name,
    code:
      values.code ||
      values.name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_|_$/g, ""),
    description: values.description,
    category: values.category,
    type: values.type,
    statusType: values.statusType,
    isActive: values.isActive,
    isSystemDefault: values.statusType === "System Default",
    sortOrder: values.sortOrder,
    probability: values.probability,
    weight: values.weight,
    showInStatsCard: values.showInStatsCard ?? true,
    showInFilterBar: values.showInFilterBar ?? true,
    ...(categoryId === "status" ? { score: values.score } : {}),
    ...(categoryId === "source"
      ? {
          pointsEnabled: values.pointsEnabled ?? true,
          autoAssignActive: values.autoAssignActive ?? true,
        }
      : {}),
    channel: values.channel,
    reasonCategory: values.reasonCategory,
    displayColor: values.displayColor,
    tagColor: values.tagColor,
    ratingValue: values.ratingValue,
    triggerAction: values.triggerAction ?? "NONE",
    allowFollowUp: values.allowFollowUp ?? true,
    followUpNotificationEnabled: values.followUpNotificationEnabled ?? true,
    followUpRenotifyMinutes: values.followUpNotificationEnabled
      ? values.followUpRenotifyMinutes || null
      : null,
  };
}

const createCategoryRecord = <T,>(value: T) => ({
  stage: value,
  status: value,
  source: value,
  priority: value,
  temperature: value,
  lead_budget_range: value,
  project_configuration: value,
  project_location: value,
  lost_reason: value,
  followup_type: value,
  followup_status: value,
  tag: value,
  rating: value,
});

export function LeadMastersScreen() {
  const { canCreate, canUpdate, canDelete } = usePermission("lead_masters");
  const queryClient = useQueryClient();
  const [activeCategoryId, setActiveCategoryId] =
    useState<LeadMasterCategoryId>("status");
  const [rowsByCategory, setRowsByCategory] = useState(
    getInitialLeadMasterRows,
  );
  const [filtersByCategory, setFiltersByCategory] = useState(
    createCategoryRecord<LeadMasterFilterState>(createDefaultFilters()),
  );
  const [showFiltersByCategory, setShowFiltersByCategory] = useState(
    createCategoryRecord(false),
  );
  const [pageByCategory, setPageByCategory] = useState(createCategoryRecord(0));
  const [rowsPerPageByCategory, setRowsPerPageByCategory] = useState(
    createCategoryRecord(rowsPerPageDefault),
  );
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState<"add" | "edit">("add");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<LeadMasterBaseRow>(
    getInitialFormValues("status"),
  );
  const [deleteRow, setDeleteRow] = useState<LeadMasterBaseRow | null>(null);
  const [customizeModalOpen, setCustomizeModalOpen] = useState(false);

  const activeConfig = leadMasterConfigs[activeCategoryId];
  const activeFilters = filtersByCategory[activeCategoryId];
  const activeRows = rowsByCategory[activeCategoryId];
  const activePage = pageByCategory[activeCategoryId];
  const activeRowsPerPage = rowsPerPageByCategory[activeCategoryId];

  useEffect(() => {
    let ignore = false;

    Promise.all(
      leadMasterCategoryIds.map(async (categoryId) => {
        const { data } = await api.get(`/lead-masters/${categoryId}`, {
          params: { limit: 100 },
        });
        return [
          categoryId,
          (data.data as ApiLeadMasterValue[]).map(toApiRow),
        ] as const;
      }),
    )
      .then((entries) => {
        if (ignore) return;
        setRowsByCategory((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      })
      .catch(() => {
        if (!ignore) {
          toast.error("Could not load lead masters. Showing defaults.");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const categories = useMemo(
    () => getMasterCategories(rowsByCategory),
    [rowsByCategory],
  );
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ??
    categories[0];

  const filteredRows = useMemo(() => {
    const search = activeFilters.search.trim().toLowerCase();

    return sortRows(activeRows).filter((row) => {
      const matchesSearch =
        search.length === 0 ||
        row.name.toLowerCase().includes(search);

      const matchesActivity =
        activeFilters.activity === "all" ||
        (activeFilters.activity === "active" ? row.isActive : !row.isActive);

      const matchesStatusType =
        activeFilters.statusType === "all" ||
        (activeFilters.statusType === "system_default"
          ? row.isSystemDefault
          : !row.isSystemDefault);

      const categoryValue = getCategoryFilterValue(row);
      const matchesCategory =
        activeFilters.categoryValue === "all" ||
        categoryValue === activeFilters.categoryValue;

      return (
        matchesSearch && matchesActivity && matchesStatusType && matchesCategory
      );
    });
  }, [activeFilters, activeRows]);

  const paginatedRows = useMemo(() => {
    const start = activePage * activeRowsPerPage;
    return filteredRows.slice(start, start + activeRowsPerPage);
  }, [activePage, activeRowsPerPage, filteredRows]);

  const stats = useMemo(
    () => ({
      total: activeRows.length,
      active: activeRows.filter((row) => row.isActive).length,
      inactive: activeRows.filter((row) => !row.isActive).length,
      systemDefault: activeRows.filter((row) => row.isSystemDefault).length,
    }),
    [activeRows],
  );

  const scorePreview = useMemo(() => {
    const activeScoreRows = activeRows.filter((row) => row.isActive);
    const scores = activeScoreRows.map((row) => Number(row.score ?? 0));
    const scoredRows = activeScoreRows
      .filter((row) => Number(row.score ?? 0) > 0)
      .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0))
      .slice(0, 4);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);

    return {
      activeCount: activeScoreRows.length,
      averageScore: scores.length ? Math.round(totalScore / scores.length) : 0,
      maxScore: scores.length ? Math.max(...scores) : 0,
      hasOnlyZeroScores: activeScoreRows.length > 0 && totalScore === 0,
      scoredRows,
    };
  }, [activeRows]);

  const showScorePreview = scoreEnabledCategoryIds.has(activeCategoryId);

  const setFiltersForCategory = (partial: Partial<LeadMasterFilterState>) => {
    setFiltersByCategory((current) => ({
      ...current,
      [activeCategoryId]: {
        ...current[activeCategoryId],
        ...partial,
      },
    }));
    setPageByCategory((current) => ({
      ...current,
      [activeCategoryId]: 0,
    }));
  };

  const resetFiltersForCategory = () => {
    setFiltersByCategory((current) => ({
      ...current,
      [activeCategoryId]: createDefaultFilters(),
    }));
    setPageByCategory((current) => ({
      ...current,
      [activeCategoryId]: 0,
    }));
  };

  const updateRowsForCategory = (
    updater: (rows: LeadMasterBaseRow[]) => LeadMasterBaseRow[],
  ) => {
    setRowsByCategory((current) => ({
      ...current,
      [activeCategoryId]: updater(current[activeCategoryId]),
    }));
  };

  const openAddModal = () => {
    setRecordModalMode("add");
    setEditingRowId(null);
    setFormValues(getInitialFormValues(activeCategoryId));
    setRecordModalOpen(true);
  };

  const openEditModal = (row: LeadMasterBaseRow) => {
    setRecordModalMode("edit");
    setEditingRowId(row.id);
    setFormValues({ ...row });
    setRecordModalOpen(true);
  };

  const invalidateLeadMasters = () => {
    void queryClient.invalidateQueries({ queryKey: ["lead-masters"] });
  };

  const saveRecord = async () => {
    try {
      if (recordModalMode === "add") {
        const nextSortOrder = activeRows.length + 1;
        const payload = toPayload(
          { ...formValues, sortOrder: nextSortOrder },
          activeCategoryId,
        );
        const created = await api
          .post(`/lead-masters/${activeCategoryId}`, payload)
          .then((response) => toApiRow(response.data));

        updateRowsForCategory((rows) => [...rows, created]);
        toast.success(`${activeConfig.category.name} record created`);
      } else if (editingRowId) {
        const updated = await api
          .patch(
            `/lead-masters/${activeCategoryId}/${editingRowId}`,
            toPayload(formValues, activeCategoryId),
          )
          .then((response) => toApiRow(response.data));

        updateRowsForCategory((rows) =>
          rows.map((row) => (row.id === editingRowId ? updated : row)),
        );
        toast.success(`${activeConfig.category.name} record updated`);
      }

      invalidateLeadMasters();
      setRecordModalOpen(false);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save master record"));
    }
  };

  const handleDelete = (row: LeadMasterBaseRow) => {
    if (row.isSystemDefault) {
      toast.error("System default masters cannot be deleted.");
      return;
    }

    setDeleteRow(row);
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;

    try {
      await api.delete(`/lead-masters/${activeCategoryId}/${deleteRow.id}`);
      updateRowsForCategory((rows) =>
        rows
          .filter((row) => row.id !== deleteRow.id)
          .map((row, index) => ({
            ...row,
            sortOrder: index + 1,
          })),
      );
      invalidateLeadMasters();
      setDeleteRow(null);
      toast.success("Master record deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not delete master record"));
    }
  };

  const handleToggleActive = async (row: LeadMasterBaseRow, isActive: boolean) => {
    try {
      const updated = await api
        .patch(`/lead-masters/${activeCategoryId}/${row.id}`, { isActive })
        .then((response) => toApiRow(response.data));

      updateRowsForCategory((rows) =>
        rows.map((currentRow) =>
          currentRow.id === row.id ? updated : currentRow,
        ),
      );
      invalidateLeadMasters();
      toast.success(isActive ? "Master activated" : "Master deactivated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update master status"));
    }
  };

  const handleToggleField = async (
    row: LeadMasterBaseRow,
    fieldKey: string,
    nextValue: boolean,
  ) => {
    try {
      const updated = await api
        .patch(`/lead-masters/${activeCategoryId}/${row.id}`, {
          [fieldKey]: nextValue,
        })
        .then((response) => toApiRow(response.data));

      updateRowsForCategory((rows) =>
        rows.map((currentRow) =>
          currentRow.id === row.id ? updated : currentRow,
        ),
      );
      invalidateLeadMasters();
      const label =
        fieldKey === "showInStatsCard"
          ? nextValue
            ? "Stat card enabled"
            : "Stat card hidden"
          : fieldKey === "showInFilterBar"
          ? nextValue
            ? "Filter pill enabled"
            : "Filter pill hidden"
          : nextValue
          ? "Master activated"
          : "Master deactivated";
      toast.success(label);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update master record"));
    }
  };

  const setFormField = (
    key: keyof LeadMasterBaseRow,
    value: string | number | boolean,
  ) => {
    setFormValues((current) => {
      if (key === "followUpNotificationEnabled" && value === false) {
        return {
          ...current,
          followUpNotificationEnabled: false,
          followUpRenotifyMinutes: 0,
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  };

  const modalConfig = useMemo(() => {
    const config = leadMasterConfigs[activeCategoryId];

    return {
      ...config,
      formFields: config.formFields.map((field) => {
        if (field.key === "defaultNextStage") {
          return {
            ...field,
            options: activeRows
              .filter((row) => row.id !== editingRowId)
              .map((row) => ({
                label: row.name,
                value: row.name,
              })),
          };
        }

        if (field.key === "defaultNextStatus") {
          return {
            ...field,
            options: activeRows
              .filter((row) => row.id !== editingRowId)
              .map((row) => ({
                label: row.name,
                value: row.name,
              })),
          };
        }

        return field;
      }),
    };
  }, [activeCategoryId, activeRows, editingRowId]);

  const sectionTitle = "Lead Masters";
  const activeSubCategoryName = recordModalOpen
    ? recordModalMode === "add"
      ? activeConfig.addTitle
      : activeConfig.editTitle
    : undefined;

  useDashboardLayout({
    sidebar: {
      activeItem: "Masters",
      activeChild: "Leads",
    },
    header: {
      breadcrumbs: (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          {activeConfig.category.name ? (
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
                {activeConfig.category.name}
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
      ),
      headerContent: (
        <div className="flex items-center gap-3 w-full">
          <div className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search masters"
              value={activeFilters.search}
              placeholder="Search masters..."
              className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none bg-white"
              onChange={(event) => setFiltersForCategory({ search: event.target.value })}
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
      )
    },
  }, [activeFilters.search, activeConfig.category.name, activeSubCategoryName]);

  return (
    <>
        <WorkspacePage>
          <div className="mx-auto space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-secondary">
                    Lead Masters
                  </h1>
                  <Info className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Manage and maintain all masters used in the lead management
                  lifecycle.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canUpdate ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4 font-bold shadow-none hover:bg-slate-50 gap-2"
                    onClick={() => setCustomizeModalOpen(true)}
                  >
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                    Customize Stats & Pills
                  </Button>
                ) : null}

                {canCreate ? (
                  <Button
                    type="button"
                    className="h-10 px-6 font-bold shadow-sm"
                    onClick={openAddModal}
                  >
                    <Plus className="h-4 w-4" />
                    {activeConfig.addLabel}
                  </Button>
                ) : null}
              </div>
            </header>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="flex flex-col gap-4">
                <MasterCategoryPanel
                  categories={categories}
                  activeCategoryId={activeCategoryId}
                  onSelectCategory={(categoryId) =>
                    setActiveCategoryId(categoryId as LeadMasterCategoryId)
                  }
                />
                <MasterHelpCard />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4">
                {showScorePreview ? (
                  <section className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-extrabold text-secondary">
                          Lead score preview
                        </p>
                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                          This score contributes to the lead's total score when
                          this value is selected on a lead. Changes affect score
                          calculations immediately.
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-muted-foreground">
                            Active
                          </p>
                          <p className="text-base font-extrabold text-secondary">
                            {scorePreview.activeCount}
                          </p>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-muted-foreground">
                            Average
                          </p>
                          <p className="text-base font-extrabold text-secondary">
                            {scorePreview.averageScore}
                          </p>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <p className="text-[11px] font-bold text-muted-foreground">
                            Highest
                          </p>
                          <p className="text-base font-extrabold text-secondary">
                            {scorePreview.maxScore}
                          </p>
                        </div>
                      </div>
                    </div>
                    {scorePreview.hasOnlyZeroScores ? (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                        All active records in this category have a score of 0.
                        Leads using these values will not gain score from this
                        category.
                      </div>
                    ) : scorePreview.scoredRows.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {scorePreview.scoredRows.map((row) => (
                          <span
                            key={row.id}
                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-secondary"
                          >
                            {row.name}: {row.score}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </section>
                ) : null}
                <MasterDetailCard
                  category={activeCategory}
                  stats={stats}
                  totalLabel={activeConfig.totalLabel}
                  searchPlaceholder={activeConfig.searchPlaceholder}
                  filterLabel={activeConfig.filterLabel}
                  filterOptions={activeConfig.filterOptions}
                  filters={activeFilters}
                  showFilters={showFiltersByCategory[activeCategoryId]}
                  onSearchChange={(value) =>
                    setFiltersForCategory({ search: value })
                  }
                  onFilterChange={setFiltersForCategory}
                  onToggleFilters={() =>
                    setShowFiltersByCategory((current) => ({
                      ...current,
                      [activeCategoryId]: !current[activeCategoryId],
                    }))
                  }
                  onResetFilters={resetFiltersForCategory}
                >
                  <MasterDataTable
                    columns={activeConfig.columns}
                    data={paginatedRows}
                    page={activePage}
                    rowsPerPage={activeRowsPerPage}
                    totalCount={filteredRows.length}
                    onPageChange={(nextPage) =>
                      setPageByCategory((current) => ({
                        ...current,
                        [activeCategoryId]: nextPage,
                      }))
                    }
                    onRowsPerPageChange={(value) => {
                      setRowsPerPageByCategory((current) => ({
                        ...current,
                        [activeCategoryId]: value,
                      }));
                      setPageByCategory((current) => ({
                        ...current,
                        [activeCategoryId]: 0,
                      }));
                    }}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                    onToggleField={handleToggleField}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                  />
                </MasterDetailCard>

                <MasterWarningNote />
              </div>
            </div>
          </div>
        </WorkspacePage>

      <MasterRecordModal
        open={recordModalOpen}
        mode={recordModalMode}
        categoryId={activeCategoryId}
        config={modalConfig}
        values={formValues}
        onChange={setFormField}
        onClose={() => setRecordModalOpen(false)}
        onSave={saveRecord}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleteRow)}
        title={`Delete ${activeConfig.category.name} entry?`}
        description={`This will permanently remove ${
          deleteRow?.name ?? "this record"
        } from ${activeConfig.category.name}. This action cannot be undone.`}
        entityName={deleteRow?.name}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteRow(null)}
        onClose={() => setDeleteRow(null)}
      />

      <CustomizeStatsAndPillsModal
        open={customizeModalOpen}
        onOpenChange={setCustomizeModalOpen}
      />
    </>
  );
}
