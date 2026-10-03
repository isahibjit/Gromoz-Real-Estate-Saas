import React, { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Download,
  ExternalLink,
  FileSpreadsheet,
  HelpCircle,
  LifeBuoy,
  Search,
  CloudUpload,
  Check,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
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
  cn,
} from "ui";

import { api } from "../../../../common/api";
import { DashboardSidebar } from "../../dashboard/DashboardSidebar";
import { DashboardHeader } from "../../dashboard/DashboardHeader";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { useProjects } from "../../projects/useProjectsApi";
import { useLeadListFilterOptions } from "../all/useAllLeads";
import { assignLeadsSidebarItems } from "../assignment/leadAssignmentData";
import {
  duplicateRecords,
  filePreviewRows,
  importSummarySegments,
  importTips,
  mappingRows,
  qualitySegments,
  uploadSteps,
  validationErrors,
} from "./bulkUploadData";
import type { ColumnMappingRow, DonutSegment } from "./bulkUploadTypes";

const SAMPLE_FILE_NAME = "truroot-leads-sample.csv";
const DEFAULT_FIELD_OPTION = "--Select Field--";
const LEAD_STATIC_CRM_FIELD_OPTIONS = [
  "Added Date",
  "Last Update",
  "Lead Name",
  "Mobile Number",
  "Alternate Mobile Number",
  "Email Address",
  "Property Type",
  "Budget Range",
  "Preferred Location",
  "Lead Source",
  "Lead Status",
  "Priority",
  "Lead Type",
  "Lead Rating",
  "Project",
  "Remarks / Notes",
];
const CONTACT_STATIC_CRM_FIELD_OPTIONS = [
  "Customer Name",
  "Mobile Number",
  "Alternate Mobile Number",
  "Email ID",
  "Lead Source",
  "Project",
  "Note",
] as const;
const IMPORT_MASTER_CATEGORIES = [
  "source",
  "status",
  "priority",
  "temperature",
  "rating",
] as const;

type ApiMasterValue = {
  id: string;
  name: string;
  isActive?: boolean;
};

type ImportTargetType = "LEAD" | "CONTACT_LEAD";

type ParsedImportRow = Record<string, string>;
type MappedImportRow = Record<string, string>;

type LeadImportRecord = {
  id: string;
};

type ImportRowOverride = {
  assignedTo?: string;
  projectName?: string;
  source?: string;
  leadStatus?: string;
  telecaller?: string;
  fieldExecutive?: string;
};

type ImportLinkField = keyof ImportRowOverride;

type ImportLinkOption = {
  label: string;
  value: string;
};

const CLEAR_IMPORT_OVERRIDE = "__keep_original__";

const slugToTitle = (value: string) =>
  value === "temperature"
    ? "Type"
    :
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");

const detectCrmField = (header: string, targetType: ImportTargetType) => {
  const normalized = normalizeHeader(header);
  const labelMap: Array<[RegExp, string]> =
    targetType === "CONTACT_LEAD"
      ? [
          [/(customer|full)\s+name|lead\s+name|name/, "Customer Name"],
          [/(phone|mobile)/, "Mobile Number"],
          [/(alternate).*(phone|mobile)|alt/, "Alternate Mobile Number"],
          [/(email)/, "Email ID"],
          [/(source)/, "Lead Source"],
          [/(project)/, "Project"],
          [/(remark|note|comment)/, "Note"],
        ]
      : [
          [/(customer|full)\s+name|lead\s+name|name/, "Lead Name"],
          [/(phone|mobile)/, "Mobile Number"],
          [/(alternate).*(phone|mobile)|alt/, "Alternate Mobile Number"],
          [/(email)/, "Email Address"],
          [/(project)/, "Project"],
          [/(location|city|area)/, "Preferred Location"],
          [/(budget)/, "Budget Range"],
          [/(property)/, "Property Type"],
          [/(source)/, "Lead Source"],
          [/(status)/, "Lead Status"],
          [/(priority)/, "Priority"],
          [/(temperature|type)/, "Lead Type"],
          [/(rating)/, "Lead Rating"],
          [/(remark|note|comment)/, "Remarks / Notes"],
        ];

  return (
    labelMap.find(([pattern]) => pattern.test(normalized))?.[1] ??
    DEFAULT_FIELD_OPTION
  );
};

function useImportMappingFieldOptions(targetType: ImportTargetType) {
  const mastersQuery = useQuery({
    queryKey: ["lead-import", "mapping-field-options", targetType],
    queryFn: async () => {
      if (targetType === "CONTACT_LEAD") {
        return [];
      }
      const results = await Promise.all(
        IMPORT_MASTER_CATEGORIES.map(async (category) => {
          try {
            const response = await api.get<{ data: ApiMasterValue[] }>(
              `/lead-masters/${category}`,
              { params: { limit: 100 } },
            );
            const items =
              response.data?.data?.filter((item) => item.isActive !== false) ??
              [];
            return items.length > 0 ? `Lead ${slugToTitle(category)}` : null;
          } catch {
            return null;
          }
        }),
      );

      return results.filter((value): value is string => Boolean(value));
    },
  });

  const options = useMemo(() => {
    const staticOptions =
      targetType === "CONTACT_LEAD"
        ? [...CONTACT_STATIC_CRM_FIELD_OPTIONS]
        : [...LEAD_STATIC_CRM_FIELD_OPTIONS];

    return [...new Set([...staticOptions, ...(mastersQuery.data ?? [])])].concat(
      DEFAULT_FIELD_OPTION,
    );
  }, [mastersQuery.data, targetType]);

  return {
    options,
    isLoading: mastersQuery.isLoading,
  };
}

function mapImportRow(
  row: ParsedImportRow,
  mappingRows: ColumnMappingRow[],
  mappings: Record<string, string>,
  targetType: ImportTargetType,
): MappedImportRow {
  const mapped: Record<string, string> = {};

  for (const mappingRow of mappingRows) {
    const crmField = mappings[mappingRow.id];
    if (!crmField || crmField === DEFAULT_FIELD_OPTION) continue;
    mapped[crmField] = row[mappingRow.fileColumn] ?? "";
  }

  if (targetType === "CONTACT_LEAD") {
    return {
      customerName: mapped["Customer Name"] ?? "",
      mobile: mapped["Mobile Number"] ?? "",
      alternateMobile: mapped["Alternate Mobile Number"] ?? "",
      email: mapped["Email ID"] ?? "",
      source: mapped["Lead Source"] ?? "",
      projectName: mapped["Project"] ?? "",
      note: mapped["Note"] ?? "",
    };
  }

  return {
    name: mapped["Lead Name"] ?? "",
    mobile: mapped["Mobile Number"] ?? "",
    alternateMobile: mapped["Alternate Mobile Number"] ?? "",
    email: mapped["Email Address"] ?? "",
    propertyType: mapped["Property Type"] ?? "",
    budget: mapped["Budget Range"] ?? "",
    preferredLocation: mapped["Preferred Location"] ?? "",
    source: mapped["Lead Source"] ?? "",
    leadStage: mapped["Lead Stage"] ?? "",
    leadStatus: mapped["Lead Status"] ?? "",
    priority: mapped["Priority"] ?? "",
    leadType: mapped["Lead Type"] ?? "",
    leadTemperature: mapped["Lead Type"] ?? "",
    leadRating: mapped["Lead Rating"] ?? "",
    projectName: mapped["Project"] ?? "",
    remarks: mapped["Remarks / Notes"] ?? "",
  };
}

function applyImportRowOverrides(
  rows: MappedImportRow[],
  overrides: Record<number, ImportRowOverride>,
): MappedImportRow[] {
  return rows.map((row, index) => ({
    ...row,
    ...(overrides[index] ?? {}),
  }));
}

function getImportRowDisplayValue(
  row: MappedImportRow,
  field: ImportLinkField,
  options: ImportLinkOption[],
) {
  const value = row[field];
  if (!value) return "Not set";
  return options.find((option) => option.value === value)?.label ?? value;
}

function uniqueImportOptions(options: ImportLinkOption[]) {
  const seen = new Set<string>();
  return options.filter((option) => {
    const key = option.value.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadLeadSampleFile(targetType: ImportTargetType) {
  const contactSampleRows = [
    ["Customer Name", "Rahul Sharma"],
    ["Mobile Number", "9876543210"],
    ["Alternate Mobile Number", "9822001122"],
    ["Email ID", "rahul.sharma@email.com"],
    ["Lead Source", "MagicBricks"],
    ["Project", "Sunset Residency"],
    ["Note", "Interested in 2 BHK inventory"],
  ];
  const sourceRows =
    targetType === "CONTACT_LEAD"
      ? contactSampleRows.map(([fileColumn, sampleData], index) => ({
          id: `contact-${index}`,
          fileColumn,
          sampleData,
        }))
      : mappingRows.filter(
          (row) => row.fileColumn !== "--Select Column--" && row.sampleData !== "--",
        );
  const headerRow = sourceRows.map((row) => toCsvValue(row.fileColumn)).join(",");
  const sampleDataRow = sourceRows
    .map((row) => toCsvValue(row.sampleData))
    .join(",");
  const csvContent = [headerRow, sampleDataRow].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = SAMPLE_FILE_NAME;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
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
          className="mt-4 h-10 w-full rounded-md bg-primary text-sm font-bold text-white hover:bg-primary-hover"
        >
          Upgrade Plan
        </Button>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-md border border-slate-200 bg-white shadow-card",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-secondary">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function Dropzone({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <Card 
      className="rounded-md border border-dashed border-blue-400 bg-white p-6 shadow-card"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="grid items-center gap-6 md:grid-cols-[220px_minmax(0,1fr)_220px]">
        <div className="flex justify-center">
          <CloudUpload className="h-24 w-24 text-blue-400" />
        </div>
        <div>
          <p className="text-2xl font-extrabold text-secondary">
            Drag & drop your file here or
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileInput}
          />
          <Button
            type="button"
            variant="navy"
            className="mt-4 h-11 rounded-md px-10"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </Button>
          <p className="mt-4 text-sm font-semibold text-blue-800">
            Supports Excel (.xlsx, .xls) and CSV (.csv) files
          </p>
          <p className="mt-1 text-sm font-semibold text-blue-800">
            Maximum file size: 20MB
          </p>
        </div>
        <div className="hidden justify-center md:flex">
          <CloudUpload className="h-20 w-20 text-slate-300" />
        </div>
      </div>
    </Card>
  );
}

function UploadStepper({ currentStep = 2 }: { currentStep?: number }) {
  return (
    <Card className="overflow-x-auto rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex min-w-[860px] items-center justify-between gap-3">
        {uploadSteps.map((step, index) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          return (
            <div key={step.id} className="flex flex-1 items-center gap-3">
              <span
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white",
                  done && "bg-secondary",
                  active && "bg-primary",
                  !done && !active && "bg-slate-400",
                )}
              >
                {step.id}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-secondary">
                  {step.title}
                </p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {step.helper}
                </p>
              </div>
              {index < uploadSteps.length - 1 ? (
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ColumnMappingTable({
  rows,
  mappings,
  crmFieldOptions,
  onMappingChange,
}: {
  rows: ColumnMappingRow[];
  mappings: Record<string, string>;
  crmFieldOptions: string[];
  onMappingChange: (id: string, value: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-200">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            {["File Columns", "CRM Fields", "Sample Data"].map((heading) => (
              <TableHead
                key={heading}
                className="h-10 px-4 text-xs font-extrabold text-secondary"
              >
                {heading}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="min-w-[220px] px-4 py-2.5 text-xs font-extrabold text-secondary">
                <div className="flex items-center justify-between gap-3">
                  <span>{row.fileColumn}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </TableCell>
              <TableCell className="min-w-[240px] px-4 py-2.5">
                <Select
                  value={mappings[row.id]}
                  onValueChange={(value) => onMappingChange(row.id, value)}
                >
                  <SelectTrigger
                    aria-label={`${row.fileColumn} CRM field`}
                    className="h-9 rounded-md text-xs font-bold shadow-none"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {crmFieldOptions.map((field) => (
                      <SelectItem key={field} value={field}>
                        {field}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="min-w-[220px] px-4 py-2.5 text-xs font-semibold text-secondary">
                {row.sampleData}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function FilePreviewCard({
  fileName,
  rows,
}: {
  fileName?: string;
  rows: ParsedImportRow[];
}) {
  const previewHeaders = rows.length ? Object.keys(rows[0]).slice(0, 4) : [];
  const previewData = rows.length ? rows.slice(0, 5) : [];

  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-none">
      <div className="flex items-center gap-3 border-b border-slate-100 p-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-green-600 text-white">
          <FileSpreadsheet className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-secondary">
            File Preview
          </h3>
          <p className="text-xs font-semibold text-muted-foreground">
            {fileName || "Preview rows"}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              {(previewHeaders.length
                ? previewHeaders
                : ["Full Name", "Mobile Number", "Email Address"]
              ).map((heading) => (
                <TableHead
                  key={heading}
                  className="h-10 px-4 text-xs font-extrabold text-secondary"
                >
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(previewData.length
              ? previewData.map((row, index) => (
                  <TableRow key={`${fileName ?? "preview"}-${index}`}>
                    {previewHeaders.map((header, cellIndex) => (
                      <TableCell
                        key={`${header}-${cellIndex}`}
                        className={cn(
                          "whitespace-nowrap px-4 py-3 text-xs text-secondary",
                          cellIndex === 0 ? "font-extrabold" : "font-semibold",
                        )}
                      >
                        {String(row[header] || "—")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : filePreviewRows.map((row) => (
                  <TableRow key={row.email}>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-secondary">
                      {row.name}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-secondary">
                      {row.mobile}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-secondary">
                      {row.email}
                    </TableCell>
                  </TableRow>
                )))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 p-4 text-xs font-semibold text-secondary">
        <span>Total Rows: {rows.length || 125}</span>
        <span>
          Showing {Math.min(rows.length || 5, 5)} of {rows.length || 125}
        </span>
      </div>
    </Card>
  );
}

function ColumnMappingCard({
  mappings,
  crmFieldOptions,
  onMappingChange,
  rows,
  previewRows,
  fileName,
}: {
  mappings: Record<string, string>;
  crmFieldOptions: string[];
  onMappingChange: (id: string, value: string) => void;
  rows: ColumnMappingRow[];
  previewRows: ParsedImportRow[];
  fileName?: string;
}) {
  return (
    <Panel
      title="Map Your Columns"
      subtitle="Map the columns in your file with CRM fields"
      action={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-xs font-extrabold text-secondary">
            <Checkbox checked readOnly />
            First row contains header
          </label>
          <span className="hidden h-8 w-px bg-slate-200 sm:block" />
          <span className="text-xs font-extrabold text-secondary">
            Mapping Preset
          </span>
          <Select defaultValue="default">
            <SelectTrigger
              aria-label="Mapping preset"
              className="h-9 w-[220px] rounded-md text-xs font-bold shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Mapping</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
        <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
          <ColumnMappingTable
            rows={rows}
            mappings={mappings}
            crmFieldOptions={crmFieldOptions}
            onMappingChange={onMappingChange}
          />
          <FilePreviewCard fileName={fileName} rows={previewRows} />
        </div>
      </Panel>
    );
  }

function ImportOverrideSelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value?: string;
  options: ImportLinkOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      value={value || CLEAR_IMPORT_OVERRIDE}
      disabled={disabled}
      onValueChange={(nextValue) =>
        onChange(nextValue === CLEAR_IMPORT_OVERRIDE ? "" : nextValue)
      }
    >
      <SelectTrigger
        aria-label={label}
        className="h-9 min-w-[160px] rounded-md text-xs font-bold shadow-none"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={CLEAR_IMPORT_OVERRIDE}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ImportLinkingTable({
  rows,
  targetType,
  selectedRows,
  rowOverrides,
  projectOptions,
  sourceOptions,
  statusOptions,
  assigneeOptions,
  telecallerOptions,
  fieldExecutiveOptions,
  onToggleRow,
  onToggleAll,
  onOverrideChange,
  onBulkOverride,
  onClearSelectedOverrides,
}: {
  rows: MappedImportRow[];
  targetType: ImportTargetType;
  selectedRows: Set<number>;
  rowOverrides: Record<number, ImportRowOverride>;
  projectOptions: ImportLinkOption[];
  sourceOptions: ImportLinkOption[];
  statusOptions: ImportLinkOption[];
  assigneeOptions: ImportLinkOption[];
  telecallerOptions: ImportLinkOption[];
  fieldExecutiveOptions: ImportLinkOption[];
  onToggleRow: (index: number, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onOverrideChange: (
    index: number,
    field: ImportLinkField,
    value: string,
  ) => void;
  onBulkOverride: (field: ImportLinkField, value: string) => void;
  onClearSelectedOverrides: () => void;
}) {
  const allSelected = rows.length > 0 && selectedRows.size === rows.length;
  const selectedCount = selectedRows.size;
  const isLeadImport = targetType === "LEAD";

  return (
    <Panel
      title="Review and link imported leads"
      subtitle="Select rows to bulk assign project, source, status, Pre Sales, and sales executive before import."
      action={
        <div className="flex items-center gap-2 text-xs font-extrabold text-secondary">
          <span>{selectedCount} selected</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-md shadow-none"
            disabled={!selectedCount}
            onClick={onClearSelectedOverrides}
          >
            Clear overrides
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-4">
        <div className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 lg:grid-cols-5">
          <ImportOverrideSelect
            label="Bulk project"
            value=""
            options={projectOptions}
            placeholder="Set project"
            disabled={!selectedCount}
            onChange={(value) => value && onBulkOverride("projectName", value)}
          />
          <ImportOverrideSelect
            label="Bulk source"
            value=""
            options={sourceOptions}
            placeholder="Set source"
            disabled={!selectedCount}
            onChange={(value) => value && onBulkOverride("source", value)}
          />
          {isLeadImport ? (
            <ImportOverrideSelect
              label="Bulk status"
              value=""
              options={statusOptions}
              placeholder="Set status"
              disabled={!selectedCount}
              onChange={(value) => value && onBulkOverride("leadStatus", value)}
            />
          ) : (
            <ImportOverrideSelect
              label="Bulk assigned to"
              value=""
              options={assigneeOptions}
              placeholder="Set assignee"
              disabled={!selectedCount}
              onChange={(value) => value && onBulkOverride("assignedTo", value)}
            />
          )}
          {isLeadImport ? (
            <ImportOverrideSelect
              label="Bulk Pre Sales Executive"
              value=""
              options={telecallerOptions}
              placeholder="Set Pre Sales Executive"
              disabled={!selectedCount}
              onChange={(value) => value && onBulkOverride("telecaller", value)}
            />
          ) : null}
          {isLeadImport ? (
            <ImportOverrideSelect
              label="Bulk sales executive"
              value=""
              options={fieldExecutiveOptions}
              placeholder="Set sales executive"
              disabled={!selectedCount}
              onChange={(value) =>
                value && onBulkOverride("fieldExecutive", value)
              }
            />
          ) : null}
        </div>

        <div className="max-h-[520px] overflow-auto rounded-md border border-slate-200">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-slate-50">
              <TableRow>
                <TableHead className="w-12 px-3">
                  <Checkbox
                    aria-label="Select all imported rows"
                    checked={allSelected}
                    onChange={(event) => onToggleAll(event.currentTarget.checked)}
                  />
                </TableHead>
                <TableHead className="min-w-[220px] px-3 text-xs font-extrabold text-secondary">
                  Lead
                </TableHead>
                <TableHead className="min-w-[190px] px-3 text-xs font-extrabold text-secondary">
                  Project
                </TableHead>
                <TableHead className="min-w-[170px] px-3 text-xs font-extrabold text-secondary">
                  Source
                </TableHead>
                {isLeadImport ? (
                  <TableHead className="min-w-[170px] px-3 text-xs font-extrabold text-secondary">
                    Status
                  </TableHead>
                ) : null}
                <TableHead className="min-w-[180px] px-3 text-xs font-extrabold text-secondary">
                  {isLeadImport ? "Pre Sales Executive" : "Assigned to"}
                </TableHead>
                {isLeadImport ? (
                  <TableHead className="min-w-[180px] px-3 text-xs font-extrabold text-secondary">
                    Sales executive
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row, index) => {
                  const rowName =
                    targetType === "CONTACT_LEAD"
                      ? row.customerName
                      : row.name;
                  const selected = selectedRows.has(index);
                  const override = rowOverrides[index] ?? {};
                  return (
                    <TableRow key={`${row.mobile || rowName || "row"}-${index}`}>
                      <TableCell className="px-3 py-3">
                        <Checkbox
                          aria-label={`Select row ${index + 1}`}
                          checked={selected}
                          onChange={(event) =>
                            onToggleRow(index, event.currentTarget.checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <p className="text-xs font-extrabold text-secondary">
                          {rowName || `Imported row ${index + 1}`}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                          {row.mobile || "No mobile number"}
                        </p>
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <ImportOverrideSelect
                          label={`Project for row ${index + 1}`}
                          value={override.projectName}
                          options={projectOptions}
                          placeholder={getImportRowDisplayValue(
                            row,
                            "projectName",
                            projectOptions,
                          )}
                          onChange={(value) =>
                            onOverrideChange(index, "projectName", value)
                          }
                        />
                      </TableCell>
                      <TableCell className="px-3 py-3">
                        <ImportOverrideSelect
                          label={`Source for row ${index + 1}`}
                          value={override.source}
                          options={sourceOptions}
                          placeholder={getImportRowDisplayValue(
                            row,
                            "source",
                            sourceOptions,
                          )}
                          onChange={(value) =>
                            onOverrideChange(index, "source", value)
                          }
                        />
                      </TableCell>
                      {isLeadImport ? (
                        <TableCell className="px-3 py-3">
                          <ImportOverrideSelect
                            label={`Status for row ${index + 1}`}
                            value={override.leadStatus}
                            options={statusOptions}
                            placeholder={getImportRowDisplayValue(
                              row,
                              "leadStatus",
                              statusOptions,
                            )}
                            onChange={(value) =>
                              onOverrideChange(index, "leadStatus", value)
                            }
                          />
                        </TableCell>
                      ) : null}
                      <TableCell className="px-3 py-3">
                        <ImportOverrideSelect
                          label={`${isLeadImport ? "Pre Sales Executive" : "Assignee"} for row ${index + 1}`}
                          value={
                            isLeadImport ? override.telecaller : override.assignedTo
                          }
                          options={
                            isLeadImport ? telecallerOptions : assigneeOptions
                          }
                          placeholder={getImportRowDisplayValue(
                            row,
                            isLeadImport ? "telecaller" : "assignedTo",
                            isLeadImport ? telecallerOptions : assigneeOptions,
                          )}
                          onChange={(value) =>
                            onOverrideChange(
                              index,
                              isLeadImport ? "telecaller" : "assignedTo",
                              value,
                            )
                          }
                        />
                      </TableCell>
                      {isLeadImport ? (
                        <TableCell className="px-3 py-3">
                          <ImportOverrideSelect
                            label={`Sales executive for row ${index + 1}`}
                            value={override.fieldExecutive}
                            options={fieldExecutiveOptions}
                            placeholder={getImportRowDisplayValue(
                              row,
                              "fieldExecutive",
                              fieldExecutiveOptions,
                            )}
                            onChange={(value) =>
                              onOverrideChange(index, "fieldExecutive", value)
                            }
                          />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={isLeadImport ? 7 : 6}
                    className="px-4 py-8 text-center text-xs font-semibold text-muted-foreground"
                  >
                    Upload a file and map columns to review imported rows.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Panel>
  );
}

function StatusTableCard({
  title,
  count,
  tone,
  children,
  footer,
}: {
  title: string;
  count: string;
  tone: string;
  children: ReactNode;
  footer: string;
}) {
  return (
    <Card className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-card">
      <div className={cn("flex items-center gap-5 px-4 py-3", tone)}>
        <h3 className="text-base font-extrabold">{title}</h3>
        <span className="text-xs font-extrabold">{count}</span>
      </div>
      {children}
      <Button
        type="button"
        variant="ghost"
        className="m-3 h-8 px-2 text-xs font-extrabold text-blue-700"
      >
        {footer}
      </Button>
    </Card>
  );
}

function ValidationErrorsCard({ rows }: { rows: typeof validationErrors }) {
  return (
    <StatusTableCard
      title="Validation Errors"
      count={`${rows.length} Error${rows.length === 1 ? "" : "s"} Found`}
      tone="bg-red-50 text-red-600"
      footer="Download Error Report"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {["Row", "Field Name", "Issue", "Found Value", "Action"].map(
                (h) => (
                  <TableHead
                    key={h}
                    className="h-10 px-4 text-xs font-extrabold text-secondary"
                  >
                    {h}
                  </TableHead>
                ),
              )}
            </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? rows.map((row) => (
                <TableRow key={`${row.row}-${row.fieldName}`}>
                <TableCell className="px-4 py-3 text-xs font-semibold">
                  {row.row}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {row.fieldName}
                </TableCell>
                <TableCell className="min-w-[250px] px-4 py-3 text-xs font-semibold">
                  {row.issue}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-semibold text-secondary">
                  {row.foundValue}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 text-xs text-blue-700"
                  >
                    Edit
                  </Button>
                </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
                    No validation errors found in this file.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </StatusTableCard>
    );
  }

function DuplicateRecordsCard({ rows }: { rows: typeof duplicateRecords }) {
  return (
    <StatusTableCard
      title="Duplicate Records"
      count={`${rows.length} Duplicate${rows.length === 1 ? "" : "s"} Found`}
      tone="bg-orange-50 text-primary"
      footer="View All Duplicates"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {["Duplicate Lead", "Existing Lead", "Match Score", "Action"].map(
                (h) => (
                  <TableHead
                    key={h}
                    className="h-10 px-4 text-xs font-extrabold text-secondary"
                  >
                    {h}
                  </TableHead>
                ),
              )}
            </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? rows.map((row) => (
                <TableRow key={row.duplicateLead}>
                <TableCell className="px-4 py-3 text-xs font-extrabold text-secondary">
                  {row.duplicateLead}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-semibold text-secondary">
                  {row.existingLead}
                </TableCell>
                <TableCell className="px-4 py-3 text-xs font-semibold text-secondary">
                  {row.matchScore}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 text-xs text-blue-700"
                  >
                    View
                  </Button>
                </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="px-4 py-6 text-center text-xs font-semibold text-muted-foreground">
                    No duplicate mobile numbers were found in this file.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </StatusTableCard>
    );
  }

function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  return (
    <div className="relative h-36 w-36 shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={segments}
            dataKey="value"
            innerRadius="58%"
            outerRadius="84%"
            startAngle={90}
            endAngle={-270}
            stroke="#fff"
            strokeWidth={2}
          >
            {segments.map((segment) => (
              <Cell key={segment.label} fill={segment.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <strong className="text-2xl font-extrabold text-secondary">
          {centerValue}
        </strong>
        <span className="mt-1 text-xs font-bold text-muted-foreground">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}

function DonutSummaryCard({
  title,
  segments,
  centerValue,
  centerLabel,
}: {
  title: string;
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  return (
    <Panel title={title}>
      <div className="flex flex-col gap-5 p-4 sm:flex-row sm:items-center">
        <DonutChart
          segments={segments}
          centerValue={centerValue}
          centerLabel={centerLabel}
        />
        <div className="flex-1 space-y-4">
          {segments.map((segment) => (
            <div
              key={segment.label}
              className="grid grid-cols-[10px_1fr_auto] items-center gap-3 text-xs"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="font-semibold text-secondary">
                {segment.value}
              </span>
              <span className="font-semibold text-muted-foreground">
                {segment.label}
                {segment.helper ? ` ${segment.helper}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function DuplicateCheckCard({ duplicateCount }: { duplicateCount: number }) {
  return (
    <Panel title="Duplicate Check">
      <div className="p-4">
        <div className="flex gap-3 text-primary">
          <FileSpreadsheet className="h-5 w-5" />
          <div>
              <p className="text-sm font-extrabold">
                {duplicateCount} duplicate record{duplicateCount === 1 ? "" : "s"} found
              </p>
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                Duplicates will be skipped during import.
              </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="mt-5 h-10 w-full rounded-md border-blue-600 text-blue-700 shadow-none"
        >
          Review Duplicates
        </Button>
      </div>
    </Panel>
  );
}

function ImportTipsCard() {
  return (
    <Panel title="Tips for Better Import">
      <div className="space-y-3 p-4">
        {importTips.map((tip) => (
          <div
            key={tip.label}
            className="flex items-center gap-2 text-xs font-semibold text-secondary"
          >
            <Check className="h-4 w-4 rounded-full border border-success p-0.5 text-success" />
            {tip.label}
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="mx-2 mb-3 h-8 px-2 text-xs font-extrabold text-blue-700"
      >
        View Import Guidelines <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    </Panel>
  );
}

export function BulkUploadLeadsWorkspace({
  embedded = false,
  targetType = "LEAD",
}: {
  embedded?: boolean;
  targetType?: ImportTargetType;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [dynamicMappingRows, setDynamicMappingRows] = useState<ColumnMappingRow[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [validationRows, setValidationRows] = useState(validationErrors);
  const [duplicateRows, setDuplicateRows] = useState(duplicateRecords);
  const [summarySegments, setSummarySegments] = useState(importSummarySegments);
  const [qualitySummary, setQualitySummary] = useState(qualitySegments);
  const [selectedImportRows, setSelectedImportRows] = useState<Set<number>>(
    () => new Set(),
  );
  const [rowOverrides, setRowOverrides] = useState<
    Record<number, ImportRowOverride>
  >({});
  const { options: crmFieldOptions } = useImportMappingFieldOptions(targetType);
  const filterOptionsQuery = useLeadListFilterOptions();
  const projectsQuery = useProjects();

  const projectLinkOptions = useMemo<ImportLinkOption[]>(
    () =>
      uniqueImportOptions(
        (projectsQuery.data?.projects ?? []).map((project) => ({
          label: project.name,
          value: project.id,
        })),
      ),
    [projectsQuery.data?.projects],
  );

  const sourceLinkOptions = filterOptionsQuery.options.sourceOptions;
  const statusLinkOptions = filterOptionsQuery.options.statusOptions;
  const assigneeLinkOptions = filterOptionsQuery.options.ownerOptions;
  const telecallerLinkOptions = filterOptionsQuery.options.telecallerOptions;
  const fieldExecutiveLinkOptions = useMemo<ImportLinkOption[]>(
    () =>
      filterOptionsQuery.options.ownerOptions.filter(
        (option) => option.role === "SALES_AGENT",
      ),
    [filterOptionsQuery.options.ownerOptions],
  );

  const currentRows = dynamicMappingRows.length ? dynamicMappingRows : mappingRows;
  const mappedImportRows = useMemo(
    () =>
      applyImportRowOverrides(
        parsedRows.map((row) =>
          mapImportRow(row, currentRows, mappings, targetType),
        ),
        rowOverrides,
      ),
    [currentRows, mappings, parsedRows, rowOverrides, targetType],
  );

  const importMutation = useMutation({
    mutationFn: async (rows: Record<string, string>[]) =>
      (
        await api.post<LeadImportRecord>("/lead-imports", {
          source: "Excel/CSV",
          fileName: file?.name,
          targetType,
          rows,
        })
      ).data,
    onSuccess: async (record) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lead-imports"] }),
        queryClient.invalidateQueries({
          queryKey: targetType === "CONTACT_LEAD" ? ["contact-leads"] : ["leads"],
        }),
      ]);
      toast.success(
        `${targetType === "CONTACT_LEAD" ? "Contact leads" : "Leads"} imported successfully`,
      );
      navigate(
        `/leads/import/summary/${record.id}?source=excel-csv&target=${targetType === "CONTACT_LEAD" ? "contact" : "lead"}`,
      );
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Import failed");
    },
  });

  const updateMapping = (id: string, value: string) => {
    setMappings((current) => ({ ...current, [id]: value }));
  };

  const handleDownloadSampleFile = () => {
    downloadLeadSampleFile(targetType);
    toast.success("Sample CSV downloaded.");
  };

  const updateValidationState = (
    rows: ParsedImportRow[],
    mappingRows: ColumnMappingRow[],
    mappingState: Record<string, string>,
    overrideState: Record<number, ImportRowOverride> = rowOverrides,
  ) => {
    const normalizedRows = applyImportRowOverrides(
      rows.map((row) =>
        mapImportRow(row, mappingRows, mappingState, targetType),
      ),
      overrideState,
    );
    const nextValidationRows = normalizedRows.flatMap((row, index) => {
      const issues: typeof validationErrors = [];
      const name =
        targetType === "CONTACT_LEAD" ? row.customerName : row.name;
      if (!name) {
        issues.push({
          row: index + 2,
          fieldName: targetType === "CONTACT_LEAD" ? "Customer Name" : "Lead Name",
          issue: "Missing required name field",
          foundValue: "Blank",
        });
      }
      if (!row.mobile) {
        issues.push({
          row: index + 2,
          fieldName: "Mobile Number",
          issue: "Missing required mobile number",
          foundValue: "Blank",
        });
      }
      return issues;
    });

    const seenMobiles = new Map<string, string>();
    const nextDuplicateRows: typeof duplicateRecords = [];
    normalizedRows.forEach((row) => {
      if (!row.mobile) return;
      const existing = seenMobiles.get(row.mobile);
      const label =
        targetType === "CONTACT_LEAD" ? row.customerName : row.name;
      if (existing) {
        nextDuplicateRows.push({
          duplicateLead: label || row.mobile,
          existingLead: existing,
          matchScore: "100%",
        });
        return;
      }
      seenMobiles.set(row.mobile, label || row.mobile);
    });

    const validCount = Math.max(
      normalizedRows.length - nextValidationRows.length - nextDuplicateRows.length,
      0,
    );
    const qualityScore = normalizedRows.length
      ? Math.round((validCount / normalizedRows.length) * 100)
      : 0;

    setValidationRows(nextValidationRows);
    setDuplicateRows(nextDuplicateRows);
    setSummarySegments([
      { label: "Valid Records", value: validCount, color: "#0f9f5f" },
      { label: "Duplicates Found", value: nextDuplicateRows.length, color: "#ff6b00" },
      { label: "Errors Found", value: nextValidationRows.length, color: "#ef4444" },
      {
        label: "Unmapped Rows",
        value: Math.max(normalizedRows.length - validCount - nextDuplicateRows.length - nextValidationRows.length, 0),
        color: "#94a3b8",
      },
    ]);
    setQualitySummary([
      { label: "Valid Data", value: validCount, helper: `${qualityScore}%`, color: "#22a447" },
      {
        label: "Needs Attention",
        value: nextDuplicateRows.length + nextValidationRows.length,
        helper: `${Math.max(100 - qualityScore, 0)}%`,
        color: "#ff9f0a",
      },
      { label: "Poor Data", value: nextValidationRows.length, helper: "", color: "#ef4444" },
    ]);
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
        header: 1,
        defval: "",
      });
      const [headerRow = [], ...dataRows] = matrix;
      const headers = headerRow
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      const parsed = dataRows
        .filter((row) => row.some((cell) => String(cell ?? "").trim()))
        .map((row) =>
          headers.reduce<ParsedImportRow>((accumulator, header, index) => {
            accumulator[header] = String(row[index] ?? "").trim();
            return accumulator;
          }, {}),
        );

      const mappingRowsFromFile = headers.map((header, index) => ({
        id: `col-${index}`,
        fileColumn: header,
        crmField: detectCrmField(header, targetType),
        sampleData: parsed[0]?.[header] || "N/A",
      }));
      const initialMappings = Object.fromEntries(
        mappingRowsFromFile.map((row) => [row.id, row.crmField]),
      );

      setParsedRows(parsed);
      setDynamicMappingRows(mappingRowsFromFile);
      setMappings(initialMappings);
      setSelectedImportRows(new Set(parsed.map((_, index) => index)));
      setRowOverrides({});
      updateValidationState(parsed, mappingRowsFromFile, initialMappings, {});
      toast.success(`${selectedFile.name} is ready for mapping.`);
    } catch {
      toast.error("Could not parse this file. Please upload a valid CSV or Excel file.");
      setFile(null);
      setParsedRows([]);
      setDynamicMappingRows([]);
      setMappings({});
      setSelectedImportRows(new Set());
      setRowOverrides({});
    }
  };

  const handleToggleImportRow = (index: number, checked: boolean) => {
    setSelectedImportRows((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const handleToggleAllImportRows = (checked: boolean) => {
    setSelectedImportRows(
      checked ? new Set(parsedRows.map((_, index) => index)) : new Set(),
    );
  };

  const handleImportRowOverrideChange = (
    index: number,
    field: ImportLinkField,
    value: string,
  ) => {
    setRowOverrides((current) => {
      const next = { ...current };
      const currentOverride = { ...(next[index] ?? {}) };
      if (value) {
        currentOverride[field] = value;
      } else {
        delete currentOverride[field];
      }

      if (Object.keys(currentOverride).length) {
        next[index] = currentOverride;
      } else {
        delete next[index];
      }
      return next;
    });
  };

  const handleBulkImportRowOverride = (
    field: ImportLinkField,
    value: string,
  ) => {
    if (!value || selectedImportRows.size === 0) return;
    setRowOverrides((current) => {
      const next = { ...current };
      selectedImportRows.forEach((index) => {
        next[index] = {
          ...(next[index] ?? {}),
          [field]: value,
        };
      });
      return next;
    });
  };

  const handleClearSelectedOverrides = () => {
    if (selectedImportRows.size === 0) return;
    setRowOverrides((current) => {
      const next = { ...current };
      selectedImportRows.forEach((index) => {
        delete next[index];
      });
      return next;
    });
  };

  const handleImport = () => {
    importMutation.mutate(mappedImportRows);
  };

  const handleBack = () => {
    setFile(null);
    setParsedRows([]);
    setDynamicMappingRows([]);
    setMappings({});
    setSelectedImportRows(new Set());
    setRowOverrides({});
  };

  useEffect(() => {
    if (!parsedRows.length || !currentRows.length) return;
    updateValidationState(parsedRows, currentRows, mappings, rowOverrides);
  }, [parsedRows, currentRows, mappings, rowOverrides]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          {embedded ? (
            <h2 className="text-xl font-extrabold text-secondary">
              Excel / CSV Upload
            </h2>
          ) : (
            <h1 className="text-3xl font-extrabold text-secondary">
              {targetType === "CONTACT_LEAD" ? "Bulk Upload Contact Leads" : "Bulk Upload Leads"}
            </h1>
          )}
          <p className="mt-2 text-sm font-semibold text-muted-foreground">
            {targetType === "CONTACT_LEAD"
              ? "Upload cold contacts using Excel/CSV and land them directly in the Contact Leads workspace."
              : "Upload multiple leads at once using Excel/CSV file. The system will validate and process your data."}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-md px-5 shadow-none"
            onClick={handleDownloadSampleFile}
          >
            <Download className="h-4 w-4" />
            Download Sample File
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 rounded-md px-3 text-blue-700"
          >
            <HelpCircle className="h-4 w-4" />
            Need Help?
          </Button>
        </div>
      </section>
      <UploadStepper currentStep={file ? 2 : 1} />
      
      {!file ? (
        <section className="mt-5">
          <Dropzone onFileSelect={handleFileSelect} />
        </section>
      ) : (
        <section className="space-y-5">
          <div className="space-y-5">
            <ColumnMappingCard
              mappings={mappings}
              crmFieldOptions={crmFieldOptions}
              onMappingChange={updateMapping}
              rows={currentRows}
              previewRows={parsedRows}
              fileName={file?.name}
            />
            <ImportLinkingTable
              rows={mappedImportRows}
              targetType={targetType}
              selectedRows={selectedImportRows}
              rowOverrides={rowOverrides}
              projectOptions={projectLinkOptions}
              sourceOptions={sourceLinkOptions}
              statusOptions={statusLinkOptions}
              assigneeOptions={assigneeLinkOptions}
              telecallerOptions={telecallerLinkOptions}
              fieldExecutiveOptions={fieldExecutiveLinkOptions}
              onToggleRow={handleToggleImportRow}
              onToggleAll={handleToggleAllImportRows}
              onOverrideChange={handleImportRowOverrideChange}
              onBulkOverride={handleBulkImportRowOverride}
              onClearSelectedOverrides={handleClearSelectedOverrides}
            />
          <div className="grid gap-5 xl:grid-cols-2">
            <ValidationErrorsCard rows={validationRows} />
            <DuplicateRecordsCard rows={duplicateRows} />
          </div>
          <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-md px-8 shadow-none"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md px-12 shadow-none"
                onClick={() =>
                  updateValidationState(
                    parsedRows,
                    currentRows,
                    mappings,
                    rowOverrides,
                  )
                }
              >
                Revalidate
              </Button>
              <Button
                type="button"
                className="h-11 rounded-md bg-primary px-12 hover:bg-primary-hover"
                onClick={handleImport}
                disabled={importMutation.isPending || mappedImportRows.length === 0}
              >
                {importMutation.isPending
                  ? "Importing..."
                  : `Import ${targetType === "CONTACT_LEAD" ? "Contacts" : "Leads"}`}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <aside className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <DonutSummaryCard
            title="Import Summary"
            segments={summarySegments}
            centerValue={String(parsedRows.length || 0)}
            centerLabel="Total Records"
          />
          <DonutSummaryCard
            title="Data Quality Score"
            segments={qualitySummary}
            centerValue={`${parsedRows.length ? Math.max(0, Math.round((summarySegments[0]?.value ?? 0) / parsedRows.length * 100)) : 0}%`}
            centerLabel="Good"
          />
          <DuplicateCheckCard duplicateCount={duplicateRows.length} />
          <ImportTipsCard />
        </aside>
      </section>
      )}
    </div>
  );
}

export function BulkUploadLeadsScreen() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  return (
    <>
      <DashboardSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        items={assignLeadsSidebarItems}
        activeItem="Lead Management"
        activeChild="Import Leads"
        onCollapse={() => setCollapsed((value) => !value)}
        onMobileClose={() => setMobileOpen(false)}
      />
      <DashboardHeader
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopSidebarToggle={() => setCollapsed((value) => !value)}
          breadcrumbs={
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span>Dashboard</span>
              <ArrowRight className="size-3.5" />
              <span>Lead Management</span>
              <ArrowRight className="size-3.5" />
              <span className="text-foreground">Bulk Upload Leads</span>
            </div>
          }
        >
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
            <Select defaultValue="date">
              <SelectTrigger
                aria-label="Date"
                className="h-10 w-[160px] rounded-md text-sm font-bold shadow-none bg-white"
              >
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-info mr-1" />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">May 20, 2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
      </DashboardHeader>
      <WorkspacePage>
          <BulkUploadLeadsWorkspace />
      </WorkspacePage>
    </>
  );
}
