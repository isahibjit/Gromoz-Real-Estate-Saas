import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Info, Plus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button, ConfirmDeleteDialog } from "ui";

import { usePermission } from "../../../../common/access/usePermission";
import { api } from "../../../../common/api";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { LeadMastersHeader } from "../../leads/masters/components/LeadMastersHeader";
import { MasterCategoryPanel } from "../../leads/masters/components/MasterCategoryPanel";
import { MasterDataTable } from "../../leads/masters/components/MasterDataTable";
import { MasterDetailCard } from "../../leads/masters/components/MasterDetailCard";
import { MasterHelpCard } from "../../leads/masters/components/MasterHelpCard";
import { MasterRecordModal } from "../../leads/masters/components/MasterRecordModal";
import { MasterWarningNote } from "../../leads/masters/components/MasterWarningNote";
import {
  type LeadMasterBaseRow,
  type LeadMasterFilterState,
} from "../../leads/masters/leadMastersData";
import {
  createDefaultProjectMasterFilters,
  getInitialProjectMasterFormValues,
  getInitialProjectMasterRows,
  getProjectMasterCategories,
  projectMasterCategoryRecord,
  projectMasterConfigs,
  type ProjectMasterCategoryId,
} from "./projectMastersData";

const rowsPerPageDefault = 5;

const projectMasterCategoryIds = Object.keys(
  projectMasterConfigs,
) as ProjectMasterCategoryId[];

function getCategoryFilterValue(row: LeadMasterBaseRow) {
  return row.category ?? row.type ?? row.reasonCategory ?? row.channel;
}

function sortRows(rows: LeadMasterBaseRow[]) {
  return [...rows].sort((left, right) => left.sortOrder - right.sortOrder);
}

function toApiRow(row: any): LeadMasterBaseRow {
  return {
    id: row.id,
    sortOrder: row.sortOrder ?? 0,
    name: row.name ?? "",
    code: row.code ?? "",
    description: row.description ?? "",
    category: row.group ?? row.category ?? "",
    type: row.type ?? "",
    status: row.status ?? "Active",
    statusType: row.statusType ?? "Custom",
    isActive: row.isActive ?? true,
    isSystemDefault: row.isSystemDefault ?? false,
    probability: row.probability ?? 0,
    weight: row.weight ?? 0,
    score: row.manualScore ?? row.score ?? 0,
    channel: row.channel ?? "",
    reasonCategory: row.reasonCategory ?? "",
    tagColor: row.tagColor ?? "",
    ratingValue: row.ratingValue ?? 0,
    displayColor: row.displayColor ?? "",
  };
}

function toPayload(values: LeadMasterBaseRow) {
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
    isSystemDefault: values.isSystemDefault,
    sortOrder: values.sortOrder,
    displayColor: values.displayColor,
  };
}

export function ProjectMastersScreen() {
  const { canCreate, canUpdate, canDelete } = usePermission("property_masters");
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const initialCategoryId = projectMasterCategoryIds.includes(
    requestedCategory as ProjectMasterCategoryId,
  )
    ? (requestedCategory as ProjectMasterCategoryId)
    : "project_location";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] =
    useState<ProjectMasterCategoryId>(initialCategoryId);
  const [rowsByCategory, setRowsByCategory] = useState(
    getInitialProjectMasterRows,
  );
  const [filtersByCategory, setFiltersByCategory] = useState(
    projectMasterCategoryRecord<LeadMasterFilterState>(
      createDefaultProjectMasterFilters(),
    ),
  );
  const [showFiltersByCategory, setShowFiltersByCategory] = useState(
    projectMasterCategoryRecord(false),
  );
  const [pageByCategory, setPageByCategory] = useState(
    projectMasterCategoryRecord(0),
  );
  const [rowsPerPageByCategory, setRowsPerPageByCategory] = useState(
    projectMasterCategoryRecord(rowsPerPageDefault),
  );
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState<"add" | "edit">("add");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<LeadMasterBaseRow>(
    getInitialProjectMasterFormValues("project_location"),
  );
  const [deleteRow, setDeleteRow] = useState<LeadMasterBaseRow | null>(null);

  const activeConfig = projectMasterConfigs[activeCategoryId];
  const activeFilters = filtersByCategory[activeCategoryId];
  const activeRows = rowsByCategory[activeCategoryId];
  const activePage = pageByCategory[activeCategoryId];
  const activeRowsPerPage = rowsPerPageByCategory[activeCategoryId];

  useEffect(() => {
    let ignore = false;

    Promise.all(
      projectMasterCategoryIds.map(async (categoryId) => {
        const { data } = await api.get(`/property-masters/${categoryId}`, {
          params: { limit: 100 },
        });
        return [categoryId, (data.data as any[]).map(toApiRow)] as const;
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
        if (!ignore)
          toast.error("Could not load project masters. Showing defaults.");
      });

    return () => {
      ignore = true;
    };
  }, []);

  const categories = useMemo(
    () => getProjectMasterCategories(rowsByCategory),
    [rowsByCategory],
  );
  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) ??
    categories[0];

  const filteredRows = useMemo(() => {
    const search = activeFilters.search.trim().toLowerCase();

    return sortRows(activeRows).filter((row) => {
      const searchableValues =
        activeCategoryId === "project_whatsapp_template"
          ? [row.name, row.description]
          : [row.name];
      const matchesSearch =
        search.length === 0 ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );
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
  }, [activeCategoryId, activeFilters, activeRows]);

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

  const setFiltersForCategory = (partial: Partial<LeadMasterFilterState>) => {
    setFiltersByCategory((current) => ({
      ...current,
      [activeCategoryId]: {
        ...current[activeCategoryId],
        ...partial,
      },
    }));
    setPageByCategory((current) => ({ ...current, [activeCategoryId]: 0 }));
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
    setFormValues(getInitialProjectMasterFormValues(activeCategoryId));
    setRecordModalOpen(true);
  };

  const openEditModal = (row: LeadMasterBaseRow) => {
    setRecordModalMode("edit");
    setEditingRowId(row.id);
    setFormValues({ ...row });
    setRecordModalOpen(true);
  };

  const saveRecord = async () => {
    if (recordModalMode === "add") {
      const nextSortOrder = activeRows.length + 1;
      const payload = toPayload({ ...formValues, sortOrder: nextSortOrder });
      const created = await api
        .post(`/property-masters/${activeCategoryId}`, payload)
        .then((response) => toApiRow(response.data));
      updateRowsForCategory((rows) => [...rows, created]);
      toast.success(`${activeConfig.category.name} record created`);
    } else if (editingRowId) {
      const updated = await api
        .patch(
          `/property-masters/${activeCategoryId}/${editingRowId}`,
          toPayload(formValues),
        )
        .then((response) => toApiRow(response.data));
      updateRowsForCategory((rows) =>
        rows.map((row) => (row.id === editingRowId ? updated : row)),
      );
      toast.success(`${activeConfig.category.name} record updated`);
    }

    setRecordModalOpen(false);
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
    await api.delete(`/property-masters/${activeCategoryId}/${deleteRow.id}`);
    updateRowsForCategory((rows) =>
      rows
        .filter((row) => row.id !== deleteRow.id)
        .map((row, index) => ({ ...row, sortOrder: index + 1 })),
    );
    setDeleteRow(null);
    toast.success("Master record deleted");
  };

  const handleToggleActive = async (
    row: LeadMasterBaseRow,
    isActive: boolean,
  ) => {
    const updated = await api
      .patch(`/property-masters/${activeCategoryId}/${row.id}`, { isActive })
      .then((response) => toApiRow(response.data));
    updateRowsForCategory((rows) =>
      rows.map((currentRow) =>
        currentRow.id === row.id ? updated : currentRow,
      ),
    );
    toast.success(isActive ? "Master activated" : "Master deactivated");
  };

  const setFormField = (
    key: keyof LeadMasterBaseRow,
    value: string | number | boolean,
  ) => {
    setFormValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <DashboardSidebar
        activeItem="Masters"
        activeChild="Projects"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <LeadMastersHeader
          search={activeFilters.search}
          onSearchChange={(value) => setFiltersForCategory({ search: value })}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          activeCategoryName={activeConfig.category.name}
          activeSubCategoryName={
            recordModalOpen
              ? recordModalMode === "add"
                ? activeConfig.addTitle
                : activeConfig.editTitle
              : undefined
          }
          sectionTitle="Project Masters"
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          <div className="mx-auto space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-secondary">
                    Project Masters
                  </h1>
                  <Info className="h-4 w-4 text-blue-500" />
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground">
                  Manage reusable project and inventory masters used in project
                  creation, unit creation, filters, and reports.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 font-bold shadow-none hover:bg-slate-50"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  Audit Log
                </Button>
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
                    setActiveCategoryId(categoryId as ProjectMasterCategoryId)
                  }
                />
                <MasterHelpCard />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-4">
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
                  onResetFilters={() =>
                    setFiltersForCategory(createDefaultProjectMasterFilters())
                  }
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
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                  />
                </MasterDetailCard>
                <MasterWarningNote />
              </div>
            </div>
          </div>
        </main>
      </div>

      <MasterRecordModal
        open={recordModalOpen}
        mode={recordModalMode}
        categoryId={activeCategoryId}
        config={activeConfig}
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
    </div>
  );
}
