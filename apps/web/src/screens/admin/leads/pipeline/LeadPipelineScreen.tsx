import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bath,
  BedDouble,
  Bell,
  Building2,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  FolderKanban,
  Import,
  IndianRupee,
  Info,
  ListFilter,
  Loader2,
  MessageCircle,
  Phone,
  Plus,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "../../../../common/apiError";
import {
  Avatar,
  Badge,
  Button,
  Card,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SearchableSelect,
  SearchInput,
  ScrollArea,
  Textarea,
  cn,
  AvatarFallback,
} from "ui";
import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { scheduledInputToIso } from "../../../../common/time";

import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import type {
  PipelineColumn,
  PipelineLead,
  PipelineStatus,
} from "./useLeadPipeline";
import {
  useLeadPipeline,
  useMovePipelineLead,
  type PipelineFilters,
} from "./useLeadPipeline";
import { useProjects } from "../../projects/useProjectsApi";
import type {
  ProjectCatalogItem,
  ProjectUnit,
} from "../../projects/projectsData";
import {
  bookingAmountUnitOptions,
  getFirstInventoryImage,
  normalizeBookingAmountInput,
  toBookingAmountRupees,
  type BookingAmountUnit,
} from "../../bookings/bookingUiUtils";
import {
  CreateSiteVisitModal,
  type CreateVisitFormState,
} from "../site-visits/SiteVisitsScreen";
import { useSiteVisitOptions } from "../site-visits/useSiteVisits";

const initialFilters: PipelineFilters = {
  search: "",
  sourceId: "all",
  propertyType: "all",
  configuration: "all",
  assignedToId: "all",
  managerId: "all",
  executiveId: "all",
  projectId: "all",
  from: "",
  to: "",
};

const lostReasons = [
  "Budget Issue",
  "Competitor",
  "No Response",
  "Not Interested",
  "Other",
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const requiresDetails = (status: PipelineStatus) => {
  const name = status.name.toLowerCase();
  const code = status.code.toLowerCase();
  return (
    name.includes("site visit") ||
    code.includes("booked") ||
    code.includes("won") ||
    name.includes("booked") ||
    name.includes("won") ||
    name.includes("lost")
  );
};

const isConversionStatus = (status: PipelineStatus | null) => {
  const name = status?.name.toLowerCase() ?? "";
  const code = status?.code.toLowerCase() ?? "";
  return (
    code.includes("booked") ||
    code.includes("won") ||
    name.includes("booked") ||
    name.includes("won")
  );
};

const isUnavailableUnit = (unit?: ProjectUnit) =>
  Boolean(
    unit &&
      (unit.availability === "Booked" ||
        unit.availability === "Sold" ||
        unit.bookingStatus.toLowerCase() === "booked"),
  );

function PipelineSelect({
  value,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: Array<{ id: string; name: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 min-w-[150px] rounded-md bg-card text-xs font-bold shadow-none">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LeadCard({
  lead,
  onDragStart,
}: {
  lead: PipelineLead;
  onDragStart: (lead: PipelineLead) => void;
}) {
  return (
    <Card
      draggable
      onDragStart={() => onDragStart(lead)}
      className="cursor-grab rounded-lg border-slate-200 bg-card p-3 shadow-none transition hover:border-primary/35 hover:shadow-sm active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-[11px] text-primary">
              {initials(lead.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-foreground">
              {lead.name}
            </p>
            <p className="truncate text-[11px] font-semibold text-muted-foreground">
              {lead.mobile}
            </p>
          </div>
        </div>
        <Button
          asChild
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-secondary"
        >
          <Link to={`/leads/${lead.id}`} aria-label={`View ${lead.name}`}>
            <Eye className="size-3.5" />
          </Link>
        </Button>
      </div>

      <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-muted-foreground">
        <div className="flex justify-between gap-2">
          <span className="truncate">{lead.source}</span>
          <span className="shrink-0 font-extrabold text-secondary">
            {lead.budget}
          </span>
        </div>
        <p className="truncate text-foreground">{lead.propertyRequirement}</p>
        {lead.project ? <p className="truncate">{lead.project}</p> : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold text-muted-foreground">
            {lead.assignedUser?.name ?? "Unassigned"}
          </p>
          <p className="text-[10px] font-semibold text-muted-foreground">
            {lead.lastActivity}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-secondary"
            aria-label={`Call ${lead.name}`}
          >
            <Phone className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-success"
            aria-label={`WhatsApp ${lead.name}`}
          >
            <MessageCircle className="size-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function PipelineColumnCard({
  column,
  status,
  active,
  onDropLead,
  onDragStart,
}: {
  column: PipelineColumn;
  status: PipelineStatus;
  active: boolean;
  onDropLead: (status: PipelineStatus) => void;
  onDragStart: (lead: PipelineLead) => void;
}) {
  return (
    <section
      className={cn(
        "flex max-h-[660px] min-h-[520px] w-[286px] shrink-0 flex-col rounded-xl border bg-slate-50/80 transition-colors",
        active ? "border-primary/50 bg-primary/5" : "border-slate-200",
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropLead(status)}
    >
      <div className="sticky top-0 z-10 rounded-t-xl border-b border-slate-200 bg-card/95 p-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: column.color }}
              />
              <h2 className="truncate text-sm font-extrabold text-foreground">
                {column.name}
              </h2>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
              {column.count.toLocaleString("en-IN")} Leads
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className="text-sm font-extrabold"
              style={{ color: column.color }}
            >
              {column.count}
            </p>
            <p className="text-[11px] font-bold text-secondary">
              {column.valueLabel}
            </p>
          </div>
        </div>
      </div>

      <div className="crm-sidebar-scrollbar flex-1 space-y-3 overflow-y-auto p-3">
        {column.leads.length ? (
          column.leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} />
          ))
        ) : (
          <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-card px-4 text-center">
            <p className="text-xs font-semibold text-muted-foreground">
              No leads in this stage.
            </p>
          </div>
        )}
        {column.hiddenCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full text-xs"
          >
            + {column.hiddenCount.toLocaleString("en-IN")} more leads
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-extrabold text-secondary">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
  );
}

function CreateVisitSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-md bg-blue-50 text-blue-700">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-extrabold text-secondary">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function CreateVisitSummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-extrabold text-secondary">
        {value || "-"}
      </p>
    </div>
  );
}

function MoveDetailsDialog({
  open,
  status,
  lead,
  projectCatalog,
  submitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  status: PipelineStatus | null;
  lead: PipelineLead | null;
  projectCatalog: ProjectCatalogItem[];
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string, string>>({});
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const statusName = status?.name.toLowerCase() ?? "";
  const isBooked = isConversionStatus(status);
  const isLost = statusName.includes("lost");
  const selectedProject = projectCatalog.find(
    (project) => project.id === values.projectId,
  );
  const selectedUnit = selectedProject?.units.find(
    (unit) => unit.id === values.unitId,
  );
  const bookingAmountUnit =
    (values.bookingAmountUnit as BookingAmountUnit | undefined) ?? "Lakh";
  const bookingAmountInRupees = toBookingAmountRupees(
    values.bookingAmount ?? "",
    bookingAmountUnit,
  );
  const selectedUnitImage = getFirstInventoryImage(
    selectedUnit,
    selectedProject,
  );
  const selectedProjectImage = getFirstInventoryImage(
    undefined,
    selectedProject,
  );
  const unitTitle = selectedUnit
    ? [selectedUnit.tower, `Unit ${selectedUnit.unitNumber}`]
        .filter(Boolean)
        .join(", ")
    : "";
  const bedroomCount = selectedUnit?.configuration?.match(/\d+/)?.[0];

  const canSubmitBooking =
    !isBooked ||
    (values.projectId &&
      values.projectId !== "all" &&
      values.projectId !== "" &&
      values.unitId &&
      values.unitId !== "all" &&
      values.unitId !== "" &&
      bookingAmountInRupees &&
      values.bookingDate &&
      !isUnavailableUnit(selectedUnit));

  const submitValues = (() => {
    if (!isBooked || !bookingAmountInRupees) return values;
    const nextValues: Record<string, string> = {
      ...values,
      bookingAmount: bookingAmountInRupees,
    };
    delete nextValues.bookingAmountUnit;
    return nextValues;
  })();

  const updateValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const previewImages = useMemo(() => {
    const images: string[] = [];
    if (selectedUnit) {
      const unitGallery = selectedUnit.imageGallery?.filter(Boolean) ?? [];
      if (unitGallery.length > 0) return unitGallery as string[];
      if (selectedUnit.imageUrl) return [selectedUnit.imageUrl] as string[];
    }
    if (selectedProject) {
      const projectGallery =
        selectedProject.imageGallery?.filter(Boolean) ?? [];
      if (projectGallery.length > 0) return projectGallery as string[];
      if (selectedProject.imageUrl)
        return [selectedProject.imageUrl] as string[];
      const firstImg = getFirstInventoryImage(undefined, selectedProject);
      if (firstImg) return [firstImg];
    }
    return images;
  }, [selectedProject, selectedUnit]);

  useEffect(() => {
    if (open) setValues({});
  }, [open, lead?.id, status?.id]);

  useEffect(() => {
    setPreviewImageIndex(0);
  }, [values.projectId, values.unitId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-xl rounded-[14px] bg-white",
          isBooked && "h-[92vh] max-h-[760px] max-w-6xl overflow-hidden p-0",
        )}
      >
        {isBooked ? (
          <div className="grid h-full min-h-0 lg:grid-cols-[310px_minmax(0,1fr)]">
            <ScrollArea className="h-full w-full min-h-0 border-r border-slate-200 bg-slate-50/70">
              <aside className="p-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-12 items-center justify-center rounded-[12px] bg-blue-50 text-blue-700">
                    <CalendarCheck className="size-6" />
                  </span>
                  <div>
                    <p className="text-xl font-extrabold text-secondary">
                      Create Booking
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-muted-foreground">
                      Confirm the inventory and booking details to convert this
                      lead.
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <CreateVisitSummaryCard
                    label="Selected Lead"
                    value={lead?.name ?? "Not selected"}
                  />
                  <CreateVisitSummaryCard
                    label="Phone"
                    value={lead?.mobile ?? "-"}
                  />
                  <CreateVisitSummaryCard
                    label="Project"
                    value={selectedProject?.name ?? "Not selected"}
                  />
                  <CreateVisitSummaryCard
                    label="Unit"
                    value={unitTitle || "-"}
                  />
                </div>

                {/* Premium Preview Gallery */}
                {previewImages.length > 0 && (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs font-extrabold text-secondary uppercase tracking-wider">
                      Property Preview
                    </p>
                    <div className="group relative h-40 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
                      <img
                        src={
                          previewImages[
                            previewImageIndex % previewImages.length
                          ]
                        }
                        alt="Property Preview"
                        className="h-full w-full object-cover transition-all duration-300 group-hover:scale-105"
                      />

                      {previewImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="absolute left-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-secondary opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                            onClick={() =>
                              setPreviewImageIndex(
                                (prev) =>
                                  (prev - 1 + previewImages.length) %
                                  previewImages.length,
                              )
                            }
                          >
                            <ChevronLeft className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-secondary opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                            onClick={() =>
                              setPreviewImageIndex(
                                (prev) => (prev + 1) % previewImages.length,
                              )
                            }
                          >
                            <ChevronRight className="size-3.5" />
                          </button>
                        </>
                      )}

                      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                        {selectedUnit ? "Unit Photo" : "Project Photo"}
                      </div>
                    </div>

                    {previewImages.length > 1 && (
                      <ScrollArea className="w-full">
                        <div className="flex gap-1.5 pb-1">
                          {previewImages.map((imgUrl: string, idx: number) => (
                            <button
                              key={`${idx}-${imgUrl}`}
                              type="button"
                              className={cn(
                                "h-10 w-14 shrink-0 overflow-hidden rounded border bg-slate-100 transition-all",
                                idx === previewImageIndex % previewImages.length
                                  ? "border-primary ring-1 ring-primary"
                                  : "border-slate-200 hover:border-slate-300",
                              )}
                              onClick={() => setPreviewImageIndex(idx)}
                            >
                              <img
                                src={imgUrl}
                                alt={`Thumbnail ${idx + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                <div className="mt-6 rounded-md border border-blue-100 bg-blue-50/50 px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 size-4 shrink-0 text-blue-700" />
                    <div>
                      <p className="text-xs font-extrabold text-secondary">
                        Booking Tip
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">
                        Confirming the booking will automatically mark the
                        selected unit as "Booked" and convert the lead.
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </ScrollArea>

            <div className="flex min-h-0 min-w-0 flex-col bg-white">
              <DialogHeader className="border-b border-slate-100 px-6 py-5">
                <DialogTitle className="text-2xl font-extrabold text-secondary">
                  Convert Lead / Create Booking
                </DialogTitle>
                <DialogDescription className="text-sm font-semibold text-muted-foreground">
                  Confirm the inventory and booking details before converting{" "}
                  {lead?.name ?? "this lead"}.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="min-h-0 flex-1 overflow-hidden">
                <div className="space-y-4 p-6">
                  <CreateVisitSection icon={UserCheck} title="Lead Context">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5 md:col-span-2">
                        <FieldLabel label="Lead" required />
                        <CreateVisitSummaryCard
                          label="Selected Lead"
                          value={
                            lead?.name
                              ? `${lead.name} - ${lead.mobile}`
                              : "Not selected"
                          }
                        />
                      </div>
                      <CreateVisitSummaryCard
                        label="Lead Stage"
                        value={status?.name ?? "-"}
                      />
                      <CreateVisitSummaryCard
                        label="Lead Source"
                        value={lead?.source ?? "-"}
                      />
                    </div>
                  </CreateVisitSection>

                  <CreateVisitSection icon={Building2} title="Property Details">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <FieldLabel label="Project" required />
                        <SearchableSelect
                          value={values.projectId ?? ""}
                          placeholder="Search project"
                          searchPlaceholder="Search projects..."
                          noOptionsText="No projects found"
                          portaled={false}
                          modal={false}
                          options={projectCatalog.map((project) => ({
                            label: `${project.name} - ${project.location}`,
                            value: project.id,
                            avatarUrl:
                              getFirstInventoryImage(undefined, project) ||
                              undefined,
                          }))}
                          onValueChange={(value) =>
                            setValues((current) => ({
                              ...current,
                              projectId: value === "all" ? "" : value,
                              unitId: "",
                            }))
                          }
                          className="h-11 rounded-[10px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Unit" required />
                        <SearchableSelect
                          value={values.unitId ?? ""}
                          disabled={!selectedProject}
                          placeholder="Search unit"
                          searchPlaceholder="Search units..."
                          noOptionsText={
                            selectedProject
                              ? "No units found"
                              : "Select project first"
                          }
                          portaled={false}
                          modal={false}
                          options={(selectedProject?.units ?? []).map(
                            (unit) => ({
                              label: `${unit.tower}, Unit ${unit.unitNumber} (${unit.configuration} - ${unit.price})`,
                              value: unit.id,
                              avatarUrl:
                                getFirstInventoryImage(unit, selectedProject) ||
                                undefined,
                            }),
                          )}
                          onValueChange={(value) =>
                            updateValue("unitId", value === "all" ? "" : value)
                          }
                          className="h-11 rounded-[10px]"
                        />
                      </div>
                      <CreateVisitSummaryCard
                        label="Location"
                        value={selectedProject?.location ?? "-"}
                      />
                      <CreateVisitSummaryCard
                        label="Price / Budget"
                        value={selectedUnit?.price ?? lead?.budget ?? "-"}
                      />
                    </div>
                  </CreateVisitSection>

                  <CreateVisitSection
                    icon={CalendarCheck}
                    title="Booking Details"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <FieldLabel label="Booking Amount" required />
                        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
                          <div className="relative">
                            <IndianRupee className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={values.bookingAmount ?? ""}
                              inputMode="decimal"
                              placeholder="Enter amount"
                              className="h-11 rounded-[10px] pl-9 text-sm font-semibold shadow-none"
                              onChange={(event) =>
                                updateValue(
                                  "bookingAmount",
                                  normalizeBookingAmountInput(
                                    event.target.value,
                                  ),
                                )
                              }
                            />
                          </div>
                          <Select
                            value={bookingAmountUnit}
                            onValueChange={(value) =>
                              updateValue("bookingAmountUnit", value)
                            }
                          >
                            <SelectTrigger
                              aria-label="Booking amount unit"
                              className="h-11 rounded-[10px] bg-card text-sm font-bold shadow-none"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {bookingAmountUnitOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel label="Booking Date" required />
                        <DatePicker
                          value={values.bookingDate ?? ""}
                          className="h-11 rounded-[10px] text-sm font-semibold shadow-none"
                          onChange={(event) =>
                            updateValue("bookingDate", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <FieldLabel label="Booking Notes" />
                        <div className="relative">
                          <Textarea
                            value={values.notes ?? ""}
                            maxLength={300}
                            placeholder="Add context for this booking (e.g., customer preference, payment mode, remarks...)"
                            className="min-h-[80px] rounded-[10px] pr-16 text-sm font-semibold shadow-none resize-none"
                            onChange={(event) =>
                              updateValue("notes", event.target.value)
                            }
                          />
                          <span className="absolute bottom-3 right-3 text-xs font-bold text-muted-foreground">
                            {(values.notes ?? "").length} / 300
                          </span>
                        </div>
                      </div>
                    </div>
                  </CreateVisitSection>
                </div>
              </ScrollArea>

              <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-white">
                <p className="text-xs font-semibold text-muted-foreground">
                  Required: lead, project, unit, amount, and booking date.
                </p>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-[10px] px-5 text-sm shadow-none"
                    onClick={() => onOpenChange(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    className="h-10 rounded-[10px] px-5 text-sm gap-2"
                    disabled={submitting || !canSubmitBooking}
                    onClick={() => onSubmit(submitValues)}
                  >
                    <CalendarCheck className="size-4" />
                    {submitting ? "Updating..." : "Create Booking"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Move Lead to {status?.name}</DialogTitle>
              <DialogDescription>
                Complete the required details before updating{" "}
                {lead?.name ?? "this lead"}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 mt-4">
              {isLost ? (
                <>
                  <label className="space-y-1.5 text-xs font-extrabold text-foreground">
                    Lost Reason
                    <PipelineSelect
                      value={values.lostReason ?? "all"}
                      placeholder="Reasons"
                      options={lostReasons.map((name) => ({ id: name, name }))}
                      onChange={(value) => updateValue("lostReason", value)}
                    />
                  </label>
                  <label className="space-y-1.5 text-xs font-extrabold text-foreground">
                    Competitor
                    <Input
                      value={values.lostCompetitor ?? ""}
                      placeholder="Optional competitor name"
                      onChange={(event) =>
                        updateValue("lostCompetitor", event.target.value)
                      }
                    />
                  </label>
                </>
              ) : null}

              <label className="space-y-1.5 text-xs font-extrabold text-foreground">
                Notes
                <div className="relative">
                  <Textarea
                    value={values.notes ?? ""}
                    placeholder="Add context for this stage update"
                    className="min-h-[80px] rounded-md text-sm font-semibold shadow-none"
                    onChange={(event) =>
                      updateValue("notes", event.target.value)
                    }
                  />
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-md px-5 text-xs shadow-none"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="h-10 rounded-md px-5 text-xs"
                disabled={submitting}
                onClick={() => onSubmit(submitValues)}
              >
                {submitting ? "Updating..." : "Update Stage"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function LeadPipelineScreen() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(initialFilters);
  const [draggedLead, setDraggedLead] = useState<PipelineLead | null>(null);
  const [pendingStatus, setPendingStatus] = useState<PipelineStatus | null>(
    null,
  );
  const [pendingLead, setPendingLead] = useState<PipelineLead | null>(null);
  const [siteVisitForm, setSiteVisitForm] = useState<CreateVisitFormState>({
    leadId: "",
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
  const pipelineQuery = useLeadPipeline(filters);
  const projectsQuery = useProjects();
  const siteVisitOptionsQuery = useSiteVisitOptions();
  const moveLead = useMovePipelineLead();

  const statusMap = useMemo(
    () =>
      new Map<string, PipelineStatus>(
        pipelineQuery.data?.filters.statuses.map((status: PipelineStatus) => [
          status.id,
          status,
        ]) ?? [],
      ),
    [pipelineQuery.data?.filters.statuses],
  );

  const submitMove = async (
    lead: PipelineLead,
    status: PipelineStatus,
    values: Record<string, string> = {},
  ) => {
    try {
      await moveLead.mutateAsync({
        leadId: lead.id,
        statusId: status.id,
        ...Object.fromEntries(
          Object.entries(values).filter(
            ([, value]) => value && value !== "all",
          ),
        ),
      });
      toast.success(`Moved ${lead.name} to ${status.name}`);
      setPendingLead(null);
      setPendingStatus(null);
    } catch (error) {
      const message = getApiErrorMessage(error, "Could not update lead stage");
      toast.error(message);
    }
  };

  const handleDropLead = (status: PipelineStatus) => {
    if (!draggedLead) return;
    if (requiresDetails(status)) {
      setPendingLead(draggedLead);
      setPendingStatus(status);
      if (status.name.toLowerCase().includes("site visit")) {
        const projectId =
          projectsQuery.data?.projects.find(
            (project: any) => project.name === draggedLead.project,
          )?.id ?? "";
        setSiteVisitForm((current) => ({
          ...current,
          leadId: draggedLead.id,
          projectId,
          unitId: "",
          date: "",
          specialRequest: "",
        }));
      }
      return;
    }
    void submitMove(draggedLead, status);
  };

  const updateFilter = (key: keyof PipelineFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const data = pipelineQuery.data;

  useDashboardLayout(
    {
      sidebar: {
        activeItem: "Lead Management",
        activeChild: "Lead Pipeline",
      },
      header: {
        search: filters.search,
        onSearchChange: (value) => updateFilter("search", value),
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Link to="/dashboard" className="text-secondary hover:underline">
              Dashboard
            </Link>
            <ChevronRight className="size-3.5" />
            <span>Lead Management</span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Lead Pipeline</span>
          </div>
        ),
      },
    },
    [filters.search],
  );

  return (
    <>
      <main className="space-y-5 p-5 sm:p-6">
        <section className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="size-6 text-primary" />
              <h1 className="text-2xl font-extrabold text-foreground">
                Lead Pipeline
              </h1>
            </div>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Drag and drop leads across stages and manage the sales funnel
              efficiently.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 text-xs"
            >
              Pipeline View
              <ListFilter className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 text-xs"
            >
              <Filter className="size-4" />
              Filters
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-2 text-xs"
              onClick={() => navigate("/leads/conversion-analytics")}
            >
              <BarChart3 className="size-4" />
              View Analytics
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-10 gap-2 text-xs"
              onClick={() =>
                navigate("/leads/all", { state: { openAddLead: true } })
              }
            >
              <Plus className="size-4" />
              Add New Lead
            </Button>
          </div>
        </section>

        <section className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-3 xl:col-span-2 2xl:col-span-2">
            <SearchInput
              aria-label="Search pipeline leads"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search leads, customers, projects, mobile number..."
              className="h-10 text-sm"
            />
          </div>
          <PipelineSelect
            value={filters.sourceId}
            placeholder="Lead Sources"
            options={data?.filters.sources ?? []}
            onChange={(value) => updateFilter("sourceId", value)}
          />
          <PipelineSelect
            value={filters.propertyType}
            placeholder="Property Types"
            options={data?.filters.propertyTypes ?? []}
            onChange={(value) => updateFilter("propertyType", value)}
          />
          <PipelineSelect
            value={filters.configuration}
            placeholder="Configurations"
            options={data?.filters.configurations ?? []}
            onChange={(value) => updateFilter("configuration", value)}
          />
          <PipelineSelect
            value={filters.assignedToId}
            placeholder="Assigned To"
            options={data?.filters.users ?? []}
            onChange={(value) => updateFilter("assignedToId", value)}
          />
          <PipelineSelect
            value={filters.executiveId}
            placeholder="Executives"
            options={(data?.filters.executives ?? []).map((user: any) => ({
              id: user.id,
              name: user.name,
            }))}
            onChange={(value) => updateFilter("executiveId", value)}
          />
          <PipelineSelect
            value={filters.managerId}
            placeholder="Managers"
            options={(data?.filters.users ?? []).filter(
              (user: any) =>
                user.role?.includes("MANAGER") || user.role === "ADMIN",
            )}
            onChange={(value) => updateFilter("managerId", value)}
          />
          <PipelineSelect
            value={filters.projectId}
            placeholder="Projects"
            options={data?.filters.projects ?? []}
            onChange={(value) => updateFilter("projectId", value)}
          />
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => updateFilter("from", event.target.value)}
            className="h-10 w-full text-xs font-bold"
            aria-label="From date"
          />
          <Input
            type="date"
            value={filters.to}
            onChange={(event) => updateFilter("to", event.target.value)}
            className="h-10 w-full text-xs font-bold"
            aria-label="To date"
          />
        </section>

        {pipelineQuery.isLoading ? (
          <Card className="flex min-h-[420px] items-center justify-center rounded-xl border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Loading pipeline...
            </div>
          </Card>
        ) : null}

        {pipelineQuery.error ? (
          <Card className="rounded-xl border-destructive/20 bg-destructive/5 p-6 text-sm font-semibold text-destructive shadow-sm">
            Failed to load lead pipeline.
          </Card>
        ) : null}

        {data ? (
          <>
            <section className="rounded-xl border bg-card p-3 shadow-sm">
              <div className="crm-sidebar-scrollbar flex gap-3 overflow-x-auto pb-2">
                {data.columns.map((column: PipelineColumn) => {
                  const status = statusMap.get(column.id);
                  if (!status) return null;
                  return (
                    <PipelineColumnCard
                      key={column.id}
                      column={column}
                      status={status}
                      active={pendingStatus?.id === status.id}
                      onDropLead={handleDropLead}
                      onDragStart={setDraggedLead}
                    />
                  );
                })}
              </div>
            </section>

            <section className="grid gap-3 rounded-xl border bg-card p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {data.summary.map((item: any) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="text-[11px] font-bold text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-foreground">
                    {item.count.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs font-bold text-secondary">
                    {item.valueLabel}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid gap-5 xl:grid-cols-[1fr_1.15fr_1.15fr]">
              <Card className="rounded-xl border-slate-200 p-5 shadow-sm">
                <h2 className="text-sm font-extrabold text-foreground">
                  Quick Actions
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
                  {[
                    ["Add New Lead", Plus, "/leads/all"],
                    ["Import Leads", Import, "/leads/import"],
                    ["Schedule Follow-Up", CalendarPlus, "/leads/follow-up"],
                    ["Send Notification", Bell, "/leads/all"],
                    ["Export Leads", Download, "/leads/all"],
                  ].map(([label, Icon, to]) => (
                    <Button
                      key={label as string}
                      asChild
                      type="button"
                      variant="outline"
                      className="h-16 flex-col gap-1 text-[11px]"
                    >
                      <Link
                        to={to as string}
                        state={
                          label === "Add New Lead"
                            ? { openAddLead: true }
                            : undefined
                        }
                      >
                        <Icon className="size-4 text-primary" />
                        {label as string}
                      </Link>
                    </Button>
                  ))}
                </div>
              </Card>

              <Card className="rounded-xl border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-extrabold text-foreground">
                    Lead Stage Performance
                  </h2>
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary"
                  >
                    <Link to="/leads/conversion-analytics">View Report</Link>
                  </Button>
                </div>
                <div className="mt-5 space-y-3">
                  {data.stagePerformance.map((item: any) => (
                    <div
                      key={item.stage}
                      className="grid grid-cols-[110px_1fr_42px] items-center gap-3 text-xs font-bold"
                    >
                      <span className="truncate text-foreground">
                        {item.stage}
                      </span>
                      <div className="h-2.5 rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: item.width,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                      <span className="text-right text-muted-foreground">
                        {item.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="rounded-xl border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-extrabold text-foreground">
                    Top Performing Sources
                  </h2>
                  <Button
                    asChild
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-primary"
                  >
                    <Link to="/reports/lead-source-analytics">View Report</Link>
                  </Button>
                </div>
                <div className="mt-5 space-y-3">
                  {data.topSources.length ? (
                    data.topSources.map((item: any) => (
                      <div
                        key={item.name}
                        className="grid grid-cols-[100px_56px_1fr_44px] items-center gap-3 text-xs font-bold"
                      >
                        <span className="truncate text-foreground">
                          {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          {item.count} Leads
                        </span>
                        <div className="h-2.5 rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                        <span className="text-right text-muted-foreground">
                          {item.percent}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm font-semibold text-muted-foreground">
                      No source data available yet.
                    </p>
                  )}
                </div>
              </Card>
            </section>
          </>
        ) : null}
      </main>
      <MoveDetailsDialog
        open={Boolean(
          pendingLead &&
            pendingStatus &&
            !pendingStatus.name.toLowerCase().includes("site visit"),
        )}
        lead={pendingLead}
        status={pendingStatus}
        projectCatalog={projectsQuery.data?.projects ?? []}
        submitting={moveLead.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLead(null);
            setPendingStatus(null);
          }
        }}
        onSubmit={(values) => {
          if (pendingLead && pendingStatus) {
            void submitMove(pendingLead, pendingStatus, values);
          }
        }}
      />
      <CreateSiteVisitModal
        open={Boolean(
          pendingLead &&
            pendingStatus?.name.toLowerCase().includes("site visit"),
        )}
        form={siteVisitForm}
        rows={[]}
        optionsData={siteVisitOptionsQuery.data}
        isSaving={moveLead.isPending}
        onOpenChange={(open) => {
          if (!open) {
            setPendingLead(null);
            setPendingStatus(null);
          }
        }}
        onChange={(field, value) =>
          setSiteVisitForm((current) => ({ ...current, [field]: value }))
        }
        onSubmit={() => {
          if (!pendingLead || !pendingStatus) return;
          void submitMove(pendingLead, pendingStatus, {
            projectId: siteVisitForm.projectId,
            unitId: siteVisitForm.unitId,
            scheduledAt: scheduledInputToIso(
              siteVisitForm.date,
              siteVisitForm.time,
            ),
            visitType: siteVisitForm.visitType,
            durationMinutes: siteVisitForm.durationMinutes,
            meetingPoint: siteVisitForm.meetingPoint,
            transportMode: siteVisitForm.transportMode,
            visitorCount: siteVisitForm.visitorCount,
            specialRequest: siteVisitForm.specialRequest,
          });
        }}
      />
    </>
  );
}
