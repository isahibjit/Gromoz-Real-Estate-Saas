import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getUserRoleLabel } from "../../../../common/roleLabels";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  SearchableSelect,
  Textarea,
  cn,
} from "ui";

import { api } from "../../../../common/api";
import { useAppSelector } from "../../../../store";
import {
  scheduledValueToDateInput,
  scheduledValueToPickerTime,
} from "../../../../common/time";
import { useLeadListFilterOptions } from "./useAllLeads";
import { useProjects } from "../../projects/useProjectsApi";
import type { ProjectCatalogItem } from "../../projects/projectsData";
import {
  budgetRangeOptions as fallbackBudgetRangeOptions,
  carpetAreaRangeOptions as fallbackCarpetAreaRangeOptions,
  configurationOptions as fallbackConfigurationOptions,
  defaultAddLeadFormData,
  locationOptions as fallbackLocationOptions,
  possessionTimelineOptions as fallbackPossessionOptions,
  priorityOptions as fallbackPriorityOptions,
  propertyTypeOptions as fallbackPropertyTypeOptions,
  statusOptions as fallbackStatusOptions,
  zoneOptions as fallbackZoneOptions,
} from "../add/addLeadData";
import type { AddLeadErrors, AddLeadFormData } from "../add/addLeadTypes";
import { buildLeadPayload, useCreateLead } from "../add/useCreateLead";
import type { LeadFilterOption } from "./useAllLeads";
import { useMasterOptions } from "../../projects/useProjectMasters";

interface AddLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceOptions: LeadFilterOption[];
  assigneeOptions: LeadFilterOption[];
}

interface EditLeadModalProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LiveLeadRecord = {
  id: string;
  name?: string | null;
  email?: string | null;
  mobileCountryCode?: string | null;
  mobile?: string | null;
  alternateCountryCode?: string | null;
  alternateMobile?: string | null;
  sourceId?: string | null;
  statusId?: string | null;
  priorityId?: string | null;
  campaignId?: string | null;
  telecallerId?: string | null;
  fieldExecutiveId?: string | null;
  managerId?: string | null;
  heardAboutUs?: string | null;
  interestLevel?: string | null;
  referenceBy?: string | null;
  remarks?: string | null;
  createdAt?: string | null;
  followUps?: Array<{
    scheduledAt?: string | null;
    typeId?: string | null;
  }>;
  requirement?: {
    propertyType?: string | null;
    configuration?: string | null;
    budgetRange?: string | null;
    minBudget?: number | string | null;
    maxBudget?: number | string | null;
    preferredLocation?: string | null;
    preferredProjectId?: string | null;
    possessionTimeline?: string | null;
    carpetAreaRange?: string | null;
    purpose?: string | null;
    minArea?: number | string | null;
    maxArea?: number | string | null;
    zone?: string | null;
  } | null;
};

type LeadCaptureModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceOptions: LeadFilterOption[];
  assigneeOptions: LeadFilterOption[];
  initialData: AddLeadFormData;
  title: string;
  description: string;
  timestampLabel: string;
  timestampValue: string;
  submitLabel: string;
  successMessage: string;
  errorMessage: string;
  isPending: boolean;
  loading?: boolean;
  defaultToNewLeadStatus?: boolean;
  selfAssignmentUser?: {
    id: string;
    role?: string | null;
    fullName?: string | null;
    email?: string | null;
  } | null;
  onSubmit: (formData: AddLeadFormData) => Promise<void>;
};

type AssignmentMode = "self" | "manual";

function FormField({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold text-secondary">
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
        {hint ? (
          <span className="text-[11px] font-semibold text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </span>
      {children}
      {error ? (
        <p className="text-xs font-bold text-destructive">{error}</p>
      ) : null}
    </label>
  );
}

function roleLabel(role?: string) {
  return getUserRoleLabel(role) || "Team member";
}

function formatDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeCountryCode(value?: string | null, fallback = "+91") {
  return value?.trim() || fallback;
}

function sanitizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}

function splitBudget(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { amount: "", unit: "lakh" };
  }
  if (numeric >= 10000000) {
    return { amount: String(numeric / 10000000), unit: "crore" };
  }
  if (numeric >= 1000 && numeric < 100000) {
    return { amount: String(numeric / 1000), unit: "thousand" };
  }
  return { amount: String(numeric / 100000), unit: "lakh" };
}

function normalizeConfiguration(value?: string | null) {
  return value?.trim() || "";
}

function normalizeOptionMatcher(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function findNewLeadStatusValue(options: Array<{ value: string; label: string }>) {
  return (
    options.find((option) =>
      ["newlead", "new"].includes(normalizeOptionMatcher(option.label)),
    )?.value ??
    options.find((option) =>
      ["newlead", "new"].includes(normalizeOptionMatcher(option.value)),
    )?.value ??
    ""
  );
}

function formatBudgetRange(
  budgetRange?: string | null,
  minBudget?: number | string | null,
  maxBudget?: number | string | null,
) {
  if (budgetRange?.trim()) return budgetRange.trim();
  const min = splitBudget(minBudget);
  const max = splitBudget(maxBudget);
  if (!min.amount || !max.amount) return "";
  return `${min.amount} ${min.unit} - ${max.amount} ${max.unit}`;
}

function formatAreaRange(
  carpetAreaRange?: string | null,
  minArea?: number | string | null,
  maxArea?: number | string | null,
) {
  if (carpetAreaRange?.trim()) return carpetAreaRange.trim();
  if (!minArea || !maxArea) return "";
  return `${minArea} - ${maxArea} sq ft`;
}

function mapLeadToAddLeadFormData(lead: LiveLeadRecord): AddLeadFormData {
  const nextFollowUp = lead.followUps?.[0]?.scheduledAt
    ? new Date(lead.followUps[0].scheduledAt)
    : null;

  return {
    ...defaultAddLeadFormData,
    leadName: lead.name?.trim() || "",
    mobileNumber: lead.mobile?.trim() || "",
    mobileCountryCode: normalizeCountryCode(lead.mobileCountryCode),
    alternateNumber: lead.alternateMobile?.trim() || "",
    alternateCountryCode: normalizeCountryCode(lead.alternateCountryCode),
    emailAddress: lead.email?.trim() || "",
    propertyType: lead.requirement?.propertyType?.trim() || "",
    configuration: normalizeConfiguration(lead.requirement?.configuration),
    budgetRange: formatBudgetRange(
      lead.requirement?.budgetRange,
      lead.requirement?.minBudget,
      lead.requirement?.maxBudget,
    ),
    minBudget: "",
    minBudgetUnit: "lakh",
    maxBudget: "",
    maxBudgetUnit: "lakh",
    preferredLocation: lead.requirement?.preferredLocation?.trim() || "",
    preferredProject: lead.requirement?.preferredProjectId?.trim() || "",
    possessionTimeline: lead.requirement?.possessionTimeline?.trim() || "",
    carpetAreaRange: formatAreaRange(
      lead.requirement?.carpetAreaRange,
      lead.requirement?.minArea,
      lead.requirement?.maxArea,
    ),
    purpose: lead.requirement?.purpose?.trim() || "",
    minArea: "",
    maxArea: "",
    zone: lead.requirement?.zone?.trim() || "",
    leadSource: lead.sourceId?.trim() || "",
    campaign: lead.campaignId?.trim() || "",
    leadStatus: lead.statusId?.trim() || "",
    priority: lead.priorityId?.trim() || "",
    interestLevel: lead.interestLevel?.trim() || "",
    heardAboutUs: lead.heardAboutUs?.trim() || "",
    remarks: lead.remarks?.trim() || "",
    managerId: lead.managerId?.trim() || "",
    telecallerId: lead.telecallerId?.trim() || "",
    fieldExecutiveId: lead.fieldExecutiveId?.trim() || "",
    referenceBy: lead.referenceBy?.trim() || "",
    assignDate: lead.createdAt?.slice(0, 10) || "",
    autoAssignFollowUp: Boolean(nextFollowUp),
    followUpDate: scheduledValueToDateInput(lead.followUps?.[0]?.scheduledAt),
    followUpTime: scheduledValueToPickerTime(lead.followUps?.[0]?.scheduledAt),
    followUpType: lead.followUps?.[0]?.typeId?.trim() || "",
  };
}

function LeadCaptureModal({
  open,
  onOpenChange,
  sourceOptions,
  assigneeOptions,
  initialData,
  title,
  description,
  timestampLabel,
  timestampValue,
  submitLabel,
  successMessage,
  errorMessage,
  isPending,
  loading = false,
  defaultToNewLeadStatus = false,
  selfAssignmentUser,
  onSubmit,
}: LeadCaptureModalProps) {
  const [formData, setFormData] = useState<AddLeadFormData>(initialData);
  const [errors, setErrors] = useState<AddLeadErrors>({});
  const [hasAppliedDefaultStatus, setHasAppliedDefaultStatus] = useState(false);
  const canAssignToSelf =
    selfAssignmentUser?.role === "TELECALLER" ||
    selfAssignmentUser?.role === "SALES_AGENT";
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>(
    canAssignToSelf ? "self" : "manual",
  );
  const projectsQuery = useProjects();
  const filterOptionsQuery = useLeadListFilterOptions();
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
    fallbackPossessionOptions.map((option) => ({
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

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setFormData(initialData);
    setHasAppliedDefaultStatus(false);
  }, [initialData, open]);

  const updateField = <K extends keyof AddLeadFormData>(
    key: K,
    value: AddLeadFormData[K],
  ) => {
    setFormData((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const projectOptions = useMemo(
    () =>
      (projectsQuery.data?.projects ?? []).map((project: ProjectCatalogItem) => ({
        value: project.id,
        label: project.name,
        description: [project.location, project.developer || project.priceRange]
          .filter(Boolean)
          .join(" · "),
      })),
    [projectsQuery.data?.projects],
  );
  const locationOptions = useMemo(
    () =>
      locationMasters.options.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [locationMasters.options],
  );
  const configurationOptions = useMemo(
    () =>
      configurationMasters.options.length > 0
        ? configurationMasters.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackConfigurationOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
    [configurationMasters.options],
  );
  const propertyTypeOptions = useMemo(
    () =>
      propertyTypeMasters.options.length > 0
        ? propertyTypeMasters.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackPropertyTypeOptions.map((option) => ({
            value: option.label,
            label: option.label,
          })),
    [propertyTypeMasters.options],
  );
  const possessionOptions = useMemo(
    () =>
      possessionMasters.options.length > 0
        ? possessionMasters.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackPossessionOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
    [possessionMasters.options],
  );
  const zoneOptions = useMemo(
    () =>
      zoneMasters.options.length > 0
        ? zoneMasters.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackZoneOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
    [zoneMasters.options],
  );
  const budgetRangeOptions = useMemo(
    () =>
      budgetRangeMasters.options.length > 0
        ? budgetRangeMasters.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackBudgetRangeOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
    [budgetRangeMasters.options],
  );
  const carpetAreaOptions = useMemo(
    () =>
      carpetAreaMasters.options.length > 0
        ? carpetAreaMasters.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackCarpetAreaRangeOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
    [carpetAreaMasters.options],
  );

  const selectedProject = useMemo(
    () =>
      (projectsQuery.data?.projects ?? []).find(
        (project: ProjectCatalogItem) => project.id === formData.preferredProject,
      ),
    [formData.preferredProject, projectsQuery.data?.projects],
  );

  const sourceSearchOptions = useMemo(
    () =>
      sourceOptions.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [sourceOptions],
  );
  const statusOptions = useMemo(
    () =>
      filterOptionsQuery.options.statusOptions.length > 0
        ? filterOptionsQuery.options.statusOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackStatusOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
    [filterOptionsQuery.options.statusOptions],
  );

  useEffect(() => {
    if (
      !open ||
      !defaultToNewLeadStatus ||
      hasAppliedDefaultStatus ||
      formData.leadStatus ||
      statusOptions.length === 0
    ) {
      return;
    }

    const newLeadStatus = findNewLeadStatusValue(statusOptions);
    if (!newLeadStatus) return;

    setFormData((current) =>
      current.leadStatus ? current : { ...current, leadStatus: newLeadStatus },
    );
    setHasAppliedDefaultStatus(true);
  }, [
    defaultToNewLeadStatus,
    formData.leadStatus,
    hasAppliedDefaultStatus,
    open,
    statusOptions,
  ]);
  const priorityOptions = useMemo(
    () =>
      filterOptionsQuery.options.priorityOptions.length > 0
        ? filterOptionsQuery.options.priorityOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))
        : fallbackPriorityOptions.map((option) => ({
            value: option.id,
            label: option.label,
          })),
    [filterOptionsQuery.options.priorityOptions],
  );

  const assigneeSearchOptions = useMemo(
    () =>
      assigneeOptions.map((option) => ({
        value: option.value,
        label: option.label,
        description: roleLabel(option.role),
      })),
    [assigneeOptions],
  );
  const manualAssigneeValue =
    formData.telecallerId || formData.fieldExecutiveId || "";
  const selfAssignmentRoleLabel =
    selfAssignmentUser?.role === "SALES_AGENT"
      ? "Sales Executive"
      : "Pre Sales Executive";
  const selfAssignmentName =
    selfAssignmentUser?.fullName?.trim() ||
    selfAssignmentUser?.email?.trim() ||
    "your account";

  useEffect(() => {
    if (!open) return;
    setAssignmentMode(
        canAssignToSelf &&
        !initialData.telecallerId &&
        !initialData.fieldExecutiveId
        ? "self"
        : "manual",
    );
  }, [
    canAssignToSelf,
    initialData.fieldExecutiveId,
    initialData.telecallerId,
    open,
  ]);

  const updateManualAssignee = (value: string) => {
    const selected = assigneeOptions.find((option) => option.value === value);
    if (!value) {
      updateField("telecallerId", "");
      updateField("fieldExecutiveId", "");
      return;
    }
    if (selected?.role === "SALES_AGENT") {
      updateField("fieldExecutiveId", value);
      updateField("telecallerId", "");
      return;
    }
    updateField("telecallerId", value);
    updateField("fieldExecutiveId", "");
  };

  const close = () => {
    setErrors({});
    setFormData(initialData);
    onOpenChange(false);
  };

  const validateStepOne = () => {
    const nextErrors: AddLeadErrors = {};

    if (!formData.leadSource.trim()) {
      nextErrors.leadSource = "Lead source is required.";
    }
    if (!formData.leadName.trim()) {
      nextErrors.leadName = "Customer name is required.";
    }
    if (!formData.mobileNumber.trim()) {
      nextErrors.mobileNumber = "Mobile number is required.";
    }
    setErrors((current) => {
      const next = { ...current };
      delete next.leadSource;
      delete next.leadName;
      delete next.mobileNumber;
      delete next.propertyType;
      delete next.budgetRange;
      delete next.preferredLocation;
      return { ...next, ...nextErrors };
    });
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validateStepOne()) {
      return;
    }

    try {
      const payload =
        canAssignToSelf && assignmentMode === "self" && selfAssignmentUser?.id
          ? {
              ...formData,
              telecallerId:
                selfAssignmentUser.role === "TELECALLER"
                  ? selfAssignmentUser.id
                  : "",
              fieldExecutiveId:
                selfAssignmentUser.role === "SALES_AGENT"
                  ? selfAssignmentUser.id
                  : "",
            }
          : formData;
      await onSubmit(payload);
      toast.success(successMessage);
      close();
    } catch {
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}
    >
      <DialogContent className="flex h-[min(88dvh,760px)] w-[calc(100vw-2rem)] max-w-[1160px] flex-col overflow-x-hidden overflow-y-hidden rounded-xl bg-white p-0 sm:w-[min(94vw,1160px)]">
        <DialogHeader className="border-b border-slate-100 px-5 py-4 pr-14 sm:px-6 sm:pr-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <DialogTitle className="text-[1.6rem] font-extrabold tracking-[-0.02em] text-secondary">
                {title}
              </DialogTitle>
              <p className="text-sm font-semibold text-muted-foreground">
                {description}
              </p>
            </div>
            <div className="max-w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left sm:text-right">
              <p className="text-[11px] font-bold text-muted-foreground">
                {timestampLabel}
              </p>
              <p className="mt-1 whitespace-nowrap text-sm font-bold text-secondary">
                {timestampValue}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 sm:px-6">
          {loading ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-sm font-semibold text-muted-foreground">
              Loading lead details...
            </div>
          ) : (
            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(290px,320px)]">
              <div className="min-w-0 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    label="Source"
                    required
                    error={errors.leadSource}
                  >
                    <SearchableSelect
                      value={formData.leadSource}
                      onValueChange={(value) => updateField("leadSource", value)}
                      ariaLabel="Lead source"
                      placeholder="Select lead source"
                      searchPlaceholder="Search lead sources..."
                      noOptionsText="No lead sources found"
                      className="h-11 rounded-[10px]"
                      options={sourceSearchOptions}
                      modal={false}
                      portaled={false}
                    />
                  </FormField>

                  <FormField label="Lead Status" error={errors.leadStatus}>
                    <SearchableSelect
                      value={formData.leadStatus}
                      onValueChange={(value) => updateField("leadStatus", value)}
                      ariaLabel="Lead status"
                      placeholder={
                        filterOptionsQuery.isLoading
                          ? "Loading statuses..."
                          : "Select lead status"
                      }
                      searchPlaceholder="Search lead statuses..."
                      noOptionsText="No lead statuses found"
                      disabled={
                        filterOptionsQuery.isLoading ||
                        statusOptions.length === 0
                      }
                      className="h-11 rounded-[10px]"
                      options={statusOptions}
                      modal={false}
                      portaled={false}
                    />
                  </FormField>

                  <FormField
                    label="Customer name"
                    required
                    error={errors.leadName}
                  >
                    <Input
                      name="lead-customer-name"
                      autoComplete="name"
                      value={formData.leadName}
                      placeholder="Enter customer full name"
                      className="h-11 rounded-[10px] text-sm font-semibold"
                      onChange={(event) =>
                        updateField("leadName", event.target.value)
                      }
                    />
                  </FormField>

                  <FormField
                    label="Mobile number"
                    required
                    error={errors.mobileNumber}
                  >
                    <Input
                      name="lead-mobile-number"
                      autoComplete="tel"
                      value={formData.mobileNumber}
                      inputMode="tel"
                      placeholder="Enter mobile number"
                      className="h-11 rounded-[10px] text-sm font-semibold"
                      onChange={(event) =>
                        updateField(
                          "mobileNumber",
                          sanitizePhoneNumber(event.target.value),
                        )
                      }
                    />
                  </FormField>

                  <FormField label="Alternate mobile number">
                    <Input
                      name="lead-alternate-mobile-number"
                      autoComplete="tel-national"
                      value={formData.alternateNumber}
                      inputMode="tel"
                      placeholder="Enter alternate number"
                      className="h-11 rounded-[10px] text-sm font-semibold"
                      onChange={(event) =>
                        updateField(
                          "alternateNumber",
                          sanitizePhoneNumber(event.target.value),
                        )
                      }
                    />
                  </FormField>

                  <FormField label="Email ID">
                    <Input
                      type="email"
                      name="lead-email-address"
                      autoComplete="email"
                      value={formData.emailAddress}
                      placeholder="Enter email address"
                      className="h-11 rounded-[10px] text-sm font-semibold"
                      onChange={(event) =>
                        updateField("emailAddress", event.target.value)
                      }
                    />
                  </FormField>


                </div>

                <FormField label="Note">
                  <Textarea
                    value={formData.remarks}
                    placeholder="Add lead notes, call summary, or inquiry details"
                    className="min-h-[72px] rounded-[10px] py-3 text-sm font-semibold"
                    onChange={(event) =>
                      updateField("remarks", event.target.value)
                    }
                  />
                </FormField>

                <div className="rounded-[14px] border border-slate-200 bg-slate-50/70 p-3.5">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                      <MapPin className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Property requirements
                      </h3>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Capture requirement fields using lead masters.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Property type" error={errors.propertyType}>
                      <SearchableSelect
                        value={formData.propertyType}
                        onValueChange={(value) => updateField("propertyType", value)}
                        ariaLabel="Property type"
                        placeholder="Select property type"
                        searchPlaceholder="Search property types..."
                        noOptionsText="No property types found"
                        className="h-11 rounded-[10px] bg-white"
                        options={propertyTypeOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>

                    <FormField label="Budget" error={errors.budgetRange}>
                      <SearchableSelect
                        value={formData.budgetRange}
                        onValueChange={(value) => updateField("budgetRange", value)}
                        ariaLabel="Budget"
                        placeholder="Select budget"
                        searchPlaceholder="Search budgets..."
                        noOptionsText="No budget ranges found"
                        className="h-11 rounded-[10px] bg-white"
                        options={budgetRangeOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>

                    <FormField label="Configuration">
                      <SearchableSelect
                        value={formData.configuration}
                        onValueChange={(value) =>
                          updateField("configuration", value)
                        }
                        ariaLabel="Configuration"
                        placeholder="Select configuration"
                        searchPlaceholder="Search configurations..."
                        noOptionsText="No configurations found"
                        className="h-11 rounded-[10px] bg-white"
                        options={configurationOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>

                    <FormField label="Location" error={errors.preferredLocation}>
                      <SearchableSelect
                        value={formData.preferredLocation}
                        onValueChange={(value) =>
                          updateField("preferredLocation", value)
                        }
                        ariaLabel="Preferred location"
                        placeholder="Select location"
                        searchPlaceholder="Search locations..."
                        noOptionsText="No locations found"
                        className="h-11 rounded-[10px] bg-white"
                        options={locationOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>

                    <FormField label="Zone">
                      <SearchableSelect
                        value={formData.zone}
                        onValueChange={(value) => updateField("zone", value)}
                        ariaLabel="Zone"
                        placeholder="Select zone"
                        searchPlaceholder="Search zones..."
                        noOptionsText="No zones found"
                        className="h-11 rounded-[10px] bg-white"
                        options={zoneOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>

                    <FormField label="Possession">
                      <SearchableSelect
                        value={formData.possessionTimeline}
                        onValueChange={(value) =>
                          updateField("possessionTimeline", value)
                        }
                        ariaLabel="Possession"
                        placeholder="Select possession"
                        searchPlaceholder="Search possession timelines..."
                        noOptionsText="No possession options found"
                        className="h-11 rounded-[10px] bg-white"
                        options={possessionOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>

                    <FormField label="Carpet area">
                      <SearchableSelect
                        value={formData.carpetAreaRange}
                        onValueChange={(value) =>
                          updateField("carpetAreaRange", value)
                        }
                        ariaLabel="Carpet area"
                        placeholder="Select carpet area"
                        searchPlaceholder="Search carpet area ranges..."
                        noOptionsText="No carpet area ranges found"
                        className="h-11 rounded-[10px] bg-white"
                        options={carpetAreaOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>
                  </div>
                </div>
              </div>

              <div className="min-w-0 space-y-4 lg:sticky lg:top-0">
                <div className="rounded-[14px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                      <Building2 className="size-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-secondary">
                        Project selection
                      </h3>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Attach the lead to the right project.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <FormField
                      label="Project name"
                      error={errors.preferredProject}
                    >
                      <SearchableSelect
                        value={formData.preferredProject}
                        onValueChange={(value) => {
                          const project = (
                            projectsQuery.data?.projects ?? []
                          ).find((item: ProjectCatalogItem) => item.id === value);
                          updateField("preferredProject", value);
                          if (project?.location) {
                            updateField("preferredLocation", project.location);
                          }
                        }}
                        ariaLabel="Preferred project"
                        placeholder={
                          projectsQuery.isLoading
                            ? "Loading projects..."
                            : "Search and select a project"
                        }
                        searchPlaceholder="Search projects..."
                        noOptionsText="No projects found"
                        disabled={
                          projectsQuery.isLoading || projectOptions.length === 0
                        }
                        className="h-11 rounded-[10px]"
                        options={projectOptions}
                        modal={false}
                        portaled={false}
                      />
                    </FormField>

                    <FormField
                      label="Project area / location"
                      hint="Auto-filled"
                    >
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={formData.preferredLocation}
                          placeholder="Selected project location"
                          className="h-11 rounded-[10px] pl-10 text-sm font-semibold"
                          onChange={(event) =>
                            updateField("preferredLocation", event.target.value)
                          }
                        />
                      </div>
                    </FormField>

                    {selectedProject ? (
                      <div className="rounded-[12px] border border-slate-200 bg-white p-3">
                        <p className="truncate text-sm font-extrabold text-secondary">
                          {selectedProject.name}
                        </p>
                        <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                          {selectedProject.location}
                        </p>
                        <p className="truncate text-xs font-semibold text-muted-foreground">
                          {selectedProject.developer ||
                            selectedProject.priceRange}
                        </p>
                      </div>
                    ) : (
                      <p className="rounded-[10px] border border-dashed border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-muted-foreground">
                        Search by project name, location, or developer.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-[14px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                      <UserRound className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-extrabold text-secondary">
                        Assign to
                      </p>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Choose whether this lead belongs to you or another employee.
                      </p>
                    </div>
                  </div>
                  {canAssignToSelf ? (
                    <div className="mb-3 grid gap-2">
                      <Button
                        type="button"
                        variant={assignmentMode === "self" ? "primary" : "outline"}
                        className="h-auto w-full justify-start rounded-[10px] px-3 py-2.5 text-left shadow-none"
                        onClick={() => setAssignmentMode("self")}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-extrabold">
                            Auto assign to me
                          </span>
                          <span className="block truncate text-[11px] font-semibold opacity-80">
                            {selfAssignmentName} · {selfAssignmentRoleLabel}
                          </span>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant={assignmentMode === "manual" ? "primary" : "outline"}
                        className="h-auto w-full justify-start rounded-[10px] px-3 py-2.5 text-left shadow-none"
                        onClick={() => setAssignmentMode("manual")}
                      >
                        <span className="min-w-0">
                          <span className="block text-xs font-extrabold">
                            Assign to someone
                          </span>
                          <span className="block text-[11px] font-semibold opacity-80">
                            Select Pre Sales or Sales Executive
                          </span>
                        </span>
                      </Button>
                    </div>
                  ) : null}
                  <SearchableSelect
                    value={manualAssigneeValue}
                    onValueChange={updateManualAssignee}
                    ariaLabel="Assign lead to user"
                    placeholder="Search employee by name or role"
                    searchPlaceholder="Search employees..."
                    noOptionsText="No matching users found"
                    className="h-11 rounded-[10px] bg-white"
                    options={assigneeSearchOptions}
                    disabled={canAssignToSelf && assignmentMode === "self"}
                    modal={false}
                    portaled={false}
                  />
                  {canAssignToSelf && assignmentMode === "self" ? (
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                      This lead will be assigned to your {selfAssignmentRoleLabel}
                      profile when saved.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-[10px] px-5 shadow-none"
            onClick={close}
          >
            Cancel
          </Button>

          <Button
            type="button"
            className="h-11 rounded-[10px] px-5"
            disabled={isPending}
            onClick={submit}
          >
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AddLeadModal({
  open,
  onOpenChange,
  sourceOptions,
  assigneeOptions,
}: AddLeadModalProps) {
  const createLead = useCreateLead();
  const user = useAppSelector((state) => state.auth.user);

  return (
    <LeadCaptureModal
      open={open}
      onOpenChange={onOpenChange}
      sourceOptions={sourceOptions}
      assigneeOptions={assigneeOptions}
      initialData={defaultAddLeadFormData}
      title="Add lead"
      description="Capture contact details, project requirements, and assignment in one workspace."
      timestampLabel="Auto timestamp"
      timestampValue={formatDateTime()}
      submitLabel="Save lead"
      successMessage="Lead added successfully"
      errorMessage="Could not add lead"
      isPending={createLead.isPending}
      defaultToNewLeadStatus
      selfAssignmentUser={user}
      onSubmit={async (formData) => {
        await createLead.mutateAsync(formData);
      }}
    />
  );
}

export function EditLeadModal({
  leadId,
  open,
  onOpenChange,
}: EditLeadModalProps) {
  const queryClient = useQueryClient();
  const filterOptionsQuery = useLeadListFilterOptions();
  const leadQuery = useQuery({
    queryKey: ["lead-edit-modal", leadId],
    enabled: open && Boolean(leadId),
    queryFn: async () => (await api.get<LiveLeadRecord>(`/leads/${leadId}`)).data,
  });
  const updateLeadMutation = useMutation({
    mutationFn: async (formData: AddLeadFormData) =>
      (await api.patch(`/leads/${leadId}`, buildLeadPayload(formData))).data,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead-edit-modal", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["lead-timeline", leadId] }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["follow-ups"] }),
      ]);
    },
  });

  const initialData = useMemo(
    () =>
      leadQuery.data
        ? mapLeadToAddLeadFormData(leadQuery.data)
        : defaultAddLeadFormData,
    [leadQuery.data],
  );

  return (
    <LeadCaptureModal
      open={open}
      onOpenChange={onOpenChange}
      sourceOptions={filterOptionsQuery.options.sourceOptions}
      assigneeOptions={filterOptionsQuery.options.ownerOptions}
      initialData={initialData}
      title="Edit lead"
      description="Update the same lead-capture fields without leaving the current workflow."
      timestampLabel="Lead created"
      timestampValue={formatDateTime(leadQuery.data?.createdAt)}
      submitLabel="Update lead"
      successMessage="Lead updated successfully"
      errorMessage="Could not update lead"
      isPending={updateLeadMutation.isPending}
      loading={leadQuery.isLoading && !leadQuery.data}
      onSubmit={async (formData) => {
        await updateLeadMutation.mutateAsync(formData);
      }}
    />
  );
}
