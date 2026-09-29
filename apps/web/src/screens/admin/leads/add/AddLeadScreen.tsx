import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MapPin, Search, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import {
  addLeadSidebarItems,
  budgetRangeOptions as fallbackBudgetRangeOptions,
  carpetAreaRangeOptions as fallbackCarpetAreaRangeOptions,
  configurationOptions as fallbackConfigurationOptions,
  defaultAddLeadFormData,
  leadSourceOptions as fallbackLeadSourceOptions,
  locationOptions as fallbackLocationOptions,
  possessionTimelineOptions as fallbackPossessionTimelineOptions,
  propertyTypeOptions as fallbackPropertyTypeOptions,
  priorityOptions as fallbackPriorityOptions,
  projectOptions as fallbackProjectOptions,
  quickActionItems,
  stageOptions as fallbackStageOptions,
  statusOptions as fallbackStatusOptions,
  zoneOptions as fallbackZoneOptions,
} from "./addLeadData";
import {
  LeadSummaryCard,
  QuickActionsCard,
  RecommendedProjectsCard,
} from "./AddLeadSideCards";
import { LeadInformationForm } from "./LeadInformationForm";
import type { AddLeadErrors, AddLeadFormData } from "./addLeadTypes";
import { useLeadListFilterOptions } from "../all/useAllLeads";
import { useProjects } from "../../projects/useProjectsApi";
import { useCreateLead } from "./useCreateLead";
import { useSiteVisitOptions } from "../site-visits/useSiteVisits";
import { useMasterOptions } from "../../projects/useProjectMasters";


const dateOptions = [{ id: "2025-05-20", label: "May 20, 2025" }];
const addLeadDraftStorageKey = "truroot:add-lead-draft";

const requiredMessages: Partial<Record<keyof AddLeadFormData, string>> = {
  leadName: "Lead name is required.",
  mobileNumber: "Mobile number is required.",
  propertyType: "Property type is required.",
  budgetRange: "Budget is required.",
  preferredLocation: "Preferred location is required.",
  leadSource: "Lead source is required.",
  leadStage: "Lead stage is required.",
  leadStatus: "Lead status is required.",
  telecallerId: "Pre Sales assignment is required.",
};

function validateForm(formData: AddLeadFormData, mode: "lead" | "assign") {
  const errors: AddLeadErrors = {};

  Object.entries(requiredMessages).forEach(([field, message]) => {
    const value = formData[field as keyof AddLeadFormData];
    if (typeof value === "string" && !value.trim()) {
      errors[field as keyof AddLeadFormData] = message;
    }
  });

  if (mode === "assign") {
    if (!formData.followUpType.trim()) {
      errors.followUpType = "Follow-up type is required for assignment.";
    }
    if (!formData.followUpDate.trim()) {
      errors.followUpDate = "Follow-up date is required for assignment.";
    }
  }

  return errors;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function loadDraft() {
  try {
    const stored = window.localStorage.getItem(addLeadDraftStorageKey);
    if (!stored) {
      return defaultAddLeadFormData;
    }
    return {
      ...defaultAddLeadFormData,
      ...(JSON.parse(stored) as Partial<AddLeadFormData>),
    };
  } catch {
    return defaultAddLeadFormData;
  }
}

export function AddLeadScreen() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState<AddLeadFormData>(loadDraft);
  const [errors, setErrors] = useState<AddLeadErrors>({});
  const [statusMessage, setStatusMessage] = useState("");
  const createLead = useCreateLead();
  const filterOptionsQuery = useLeadListFilterOptions();
  const projectsQuery = useProjects();
  const siteVisitOptionsQuery = useSiteVisitOptions();
  const locationMasters = useMasterOptions(
    "project_location",
    fallbackLocationOptions.map((option) => ({
      label: option.label,
      value: option.label,
    })),
  );
  const propertyTypeMasters = useMasterOptions(
    "property_type",
    fallbackPropertyTypeOptions.map((option) => ({
      label: option.label,
      value: option.label,
    })),
  );
  const configurationMasters = useMasterOptions(
    "project_configuration",
    fallbackConfigurationOptions.map((option) => ({
      label: option.label,
      value: option.label,
    })),
  );
  const possessionMasters = useMasterOptions(
    "possession_timeline",
    fallbackPossessionTimelineOptions.map((option) => ({
      label: option.label,
      value: option.label,
    })),
  );
  const zoneMasters = useMasterOptions(
    "project_zone",
    fallbackZoneOptions.map((option) => ({
      label: option.label,
      value: option.label,
    })),
  );
  const budgetRangeMasters = useMasterOptions(
    "lead_budget_range",
    fallbackBudgetRangeOptions.map((option) => ({
      label: option.label,
      value: option.label,
    })),
  );
  const carpetAreaMasters = useMasterOptions(
    "carpet_area_range",
    fallbackCarpetAreaRangeOptions.map((option) => ({
      label: option.label,
      value: option.label,
    })),
  );

  const quickActionLookup = useMemo(
    () => new Set(quickActionItems.map((action) => action.id)),
    [],
  );

  const leadSourceOptions = useMemo(
    () =>
      filterOptionsQuery.options.sourceOptions.length > 0
        ? filterOptionsQuery.options.sourceOptions.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackLeadSourceOptions,
    [filterOptionsQuery.options.sourceOptions],
  );

  const stageOptions = useMemo(
    () =>
      filterOptionsQuery.options.stageOptions.length > 0
        ? filterOptionsQuery.options.stageOptions.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackStageOptions,
    [filterOptionsQuery.options.stageOptions],
  );

  const statusOptions = useMemo(
    () =>
      filterOptionsQuery.options.statusOptions.length > 0
        ? filterOptionsQuery.options.statusOptions.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackStatusOptions,
    [filterOptionsQuery.options.statusOptions],
  );

  const priorityOptions = useMemo(
    () =>
      filterOptionsQuery.options.priorityOptions.length > 0
        ? filterOptionsQuery.options.priorityOptions.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackPriorityOptions,
    [filterOptionsQuery.options.priorityOptions],
  );

  const locationOptions = useMemo(
    () =>
      locationMasters.options.length > 0
        ? locationMasters.options.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackLocationOptions,
    [locationMasters.options],
  );

  const projectOptions = useMemo(
    () =>
      (projectsQuery.data?.projects ?? []).length > 0
        ? (projectsQuery.data?.projects ?? []).map((project) => ({
            id: project.id,
            label: project.name,
          }))
        : fallbackProjectOptions,
    [projectsQuery.data?.projects],
  );
  const configurationOptions = useMemo(
    () =>
      configurationMasters.options.length > 0
        ? configurationMasters.options.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackConfigurationOptions,
    [configurationMasters.options],
  );
  const propertyTypeOptions = useMemo(
    () =>
      propertyTypeMasters.options.length > 0
        ? propertyTypeMasters.options.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackPropertyTypeOptions,
    [propertyTypeMasters.options],
  );
  const possessionOptions = useMemo(
    () =>
      possessionMasters.options.length > 0
        ? possessionMasters.options.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackPossessionTimelineOptions,
    [possessionMasters.options],
  );
  const zoneOptions = useMemo(
    () =>
      zoneMasters.options.length > 0
        ? zoneMasters.options.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackZoneOptions,
    [zoneMasters.options],
  );
  const budgetRangeOptions = useMemo(
    () =>
      budgetRangeMasters.options.length > 0
        ? budgetRangeMasters.options.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackBudgetRangeOptions,
    [budgetRangeMasters.options],
  );
  const carpetAreaOptions = useMemo(
    () =>
      carpetAreaMasters.options.length > 0
        ? carpetAreaMasters.options.map((option) => ({
            id: option.value,
            label: option.label,
          }))
        : fallbackCarpetAreaRangeOptions,
    [carpetAreaMasters.options],
  );

  const telecallerOptions = useMemo(
    () =>
      filterOptionsQuery.options.telecallerOptions.map((option) => ({
        id: option.value,
        name: option.label,
        role: "Pre Sales Executive",
        initials: initials(option.label),
        avatarUrl: option.image,
      })),
    [filterOptionsQuery.options.telecallerOptions],
  );

  const fieldExecutiveOptions = useMemo(
    () =>
      (siteVisitOptionsQuery.data?.executives ?? [])
        .filter((executive) => executive.role === "SALES_AGENT")
        .map((executive) => ({
          id: executive.id,
          name: executive.name,
          role: "Sales Executive",
          initials: initials(executive.name),
          avatarUrl: executive.image,
        })),
    [siteVisitOptionsQuery.data?.executives],
  );

  const selectedTelecallerName = useMemo(
    () =>
      telecallerOptions.find((option) => option.id === formData.telecallerId)
        ?.name,
    [formData.telecallerId, telecallerOptions],
  );

  const selectedFieldExecutiveName = useMemo(
    () =>
      fieldExecutiveOptions.find(
        (option) => option.id === formData.fieldExecutiveId,
      )?.name,
    [fieldExecutiveOptions, formData.fieldExecutiveId],
  );

  const updateField = <K extends keyof AddLeadFormData>(
    field: K,
    value: AddLeadFormData[K],
  ) => {
    setFormData((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const resetForm = () => {
    setFormData(defaultAddLeadFormData);
    setErrors({});
    setStatusMessage("");
    window.localStorage.removeItem(addLeadDraftStorageKey);
  };

  const saveDraft = () => {
    setErrors({});
    window.localStorage.setItem(
      addLeadDraftStorageKey,
      JSON.stringify(formData),
    );
    toast.success("Draft saved");
    setStatusMessage("Draft saved and ready to resume on this device.");
  };

  const saveLead = async () => {
    const nextErrors = validateForm(formData, "lead");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage("");
      return;
    }
    try {
      const lead = await createLead.mutateAsync(formData);
      window.localStorage.removeItem(addLeadDraftStorageKey);
      toast.success("Lead added successfully");
      setStatusMessage(`Lead ${lead.displayId ?? ""} added successfully.`);
      navigate("/leads/all");
    } catch (error) {
      toast.error("Could not add lead");
      setStatusMessage("");
    }
  };

  const saveAndAssign = async () => {
    const nextErrors = validateForm(formData, "assign");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatusMessage("");
      return;
    }
    try {
      const lead = await createLead.mutateAsync({
        ...formData,
        autoAssignFollowUp: true,
      });
      window.localStorage.removeItem(addLeadDraftStorageKey);
      toast.success("Lead added and assigned successfully");
      setStatusMessage(
        `Lead ${lead.displayId ?? ""} added and assigned successfully.`,
      );
      navigate("/leads/all");
    } catch (error) {
      toast.error("Could not add and assign lead");
      setStatusMessage("");
    }
  };

  const handleQuickAction = (actionId: string) => {
    if (!quickActionLookup.has(actionId)) {
      return;
    }

    setStatusMessage(
      `Quick action "${actionId}" is wired as a UI placeholder. Connect it to the existing modal or route when available.`,
    );
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={addLeadSidebarItems}
        activeItem="Lead Management"
        activeChild="Add New Lead"
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
              <span>Lead Management</span>
              <ChevronRight className="size-3.5" />
              <span className="text-foreground">Add New Lead</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads, customers, projects"
                value={search}
                placeholder="Search leads, customers, projects..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none"
                onChange={(event) => setSearch(event.target.value)}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>

          </div>
        </DashboardHeader>

        <main className="p-4 sm:p-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.72fr)]">
          <LeadInformationForm
            formData={formData}
            errors={errors}
            statusMessage={statusMessage}
            leadSourceOptions={leadSourceOptions}
            stageOptions={stageOptions}
            statusOptions={statusOptions}
            priorityOptions={priorityOptions}
            configurationOptions={configurationOptions}
            possessionOptions={possessionOptions}
            zoneOptions={zoneOptions}
            budgetRangeOptions={budgetRangeOptions}
            carpetAreaOptions={carpetAreaOptions}
            propertyTypeOptions={propertyTypeOptions}
            locationOptions={locationOptions}
            projectOptions={projectOptions}
            telecallerOptions={telecallerOptions}
            fieldExecutiveOptions={fieldExecutiveOptions}
            onChange={updateField}
            onCancel={resetForm}
            onSaveDraft={saveDraft}
              onSaveLead={saveLead}
              onSaveAndAssign={saveAndAssign}
              isSaving={createLead.isPending}
            />

            <aside className="space-y-4">
              <RecommendedProjectsCard
                formData={formData}
                projects={projectsQuery.data?.projects ?? []}
              />
              <LeadSummaryCard
                formData={formData}
                telecallerName={selectedTelecallerName}
                fieldExecutiveName={selectedFieldExecutiveName}
              />
              <QuickActionsCard onAction={handleQuickAction} />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
