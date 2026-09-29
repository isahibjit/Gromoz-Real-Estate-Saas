import { ChevronDown, Info, Send, Settings2 } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
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
  SearchableSelect,
  Textarea,
  cn,
} from "ui";

import { ClockTimePicker } from "../assignment/ClockTimePicker";
import { FollowUpDatePicker } from "../assignment/FollowUpDatePicker";
import {
  campaignOptions,
  configurationOptions as fallbackConfigurationOptions,
  countryCodeOptions,
  budgetRangeOptions as fallbackBudgetRangeOptions,
  carpetAreaRangeOptions as fallbackCarpetAreaRangeOptions,
  followUpTypeOptions,
  genderOptions,
  heardAboutUsOptions,
  interestLevelOptions,
  propertyTypeOptions as fallbackPropertyTypeOptions,
  purposeOptions,
  referrerOptions,
  possessionTimelineOptions as fallbackPossessionOptions,
  zoneOptions as fallbackZoneOptions,
} from "./addLeadData";
import type {
  AddLeadErrors,
  AddLeadFormData,
  AssigneeOption,
  SelectOption,
} from "./addLeadTypes";

function FormField({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-extrabold text-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-bold text-destructive">{error}</p>
      ) : null}
    </div>
  );
}

function SectionBadge({ index, title }: { index: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-xs font-extrabold text-white px-2 py-1">
        {index}.
      </span>
      <h2 className="text-base font-extrabold text-secondary">{title}</h2>
    </div>
  );
}

function FormSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 border-b border-slate-100 px-5 py-5 last:border-b-0">
      <SectionBadge index={index} title={title} />
      {children}
    </section>
  );
}

function SelectField({
  value,
  placeholder,
  options,
  ariaLabel,
  invalid,
  onChange,
  renderOption,
}: {
  value: string;
  placeholder: string;
  options: SelectOption[];
  ariaLabel: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  renderOption?: (option: SelectOption) => ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          "h-11 rounded-[10px] text-sm font-semibold shadow-none",
          invalid && "border-destructive",
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {renderOption ? renderOption(option) : option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CountryFlag({ code }: { code: string }) {
  if (code === "+1") {
    return (
      <span
        aria-label="United States flag"
        className="block h-[14px] w-5 rounded-[2px] bg-[repeating-linear-gradient(to_bottom,#b22234_0_2px,#ffffff_2px_4px)] before:absolute"
      />
    );
  }

  if (code === "+971") {
    return (
      <span
        aria-label="United Arab Emirates flag"
        className="block h-[14px] w-5 rounded-[2px] bg-[linear-gradient(to_right,#ef4444_0_22%,transparent_22%),linear-gradient(to_bottom,#16a34a_0_33.33%,#ffffff_33.33%_66.66%,#111827_66.66%_100%)]"
      />
    );
  }

  return (
    <span
      aria-label="India flag"
      className="relative block h-[14px] w-5 rounded-[2px] bg-[linear-gradient(to_bottom,#ff9933_0_33.33%,#ffffff_33.33%_66.66%,#138808_66.66%_100%)]"
    >
      <span className="absolute left-1/2 top-1/2 size-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#000080]" />
    </span>
  );
}

function PhoneInputField({
  value,
  countryCode,
  ariaLabel,
  placeholder,
  invalid,
  onValueChange,
  onCountryCodeChange,
}: {
  value: string;
  countryCode: string;
  ariaLabel: string;
  placeholder: string;
  invalid?: boolean;
  onValueChange: (value: string) => void;
  onCountryCodeChange: (value: string) => void;
}) {
  const selectedCountry = countryCodeOptions.find(
    (option) => option.id === countryCode,
  );

  return (
    <div
      className={cn(
        "flex h-11 overflow-hidden rounded-[10px] border bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/20",
        invalid && "border-destructive",
      )}
    >
      <div className="flex w-11 items-center justify-center border-r bg-slate-50">
        <CountryFlag code={countryCode} />
      </div>
      <Select value={countryCode} onValueChange={onCountryCodeChange}>
        <SelectTrigger
          aria-label={`${ariaLabel} country code`}
          className="h-full w-[76px] rounded-none border-0 px-2 text-sm font-bold shadow-none focus:ring-0"
        >
          <span>{selectedCountry?.label ?? countryCode}</span>
        </SelectTrigger>
        <SelectContent>
          {countryCodeOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <span className="inline-flex items-center gap-2">
                <CountryFlag code={option.id} />
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        className="h-full rounded-none border-0 px-3 font-semibold focus-visible:ring-0"
        onChange={(event) => onValueChange(event.target.value)}
      />
    </div>
  );
}

function DateInputField({
  ariaLabel,
  value,
  placeholder,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FollowUpDatePicker
      value={value}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      className="h-11 rounded-[10px] text-sm font-semibold"
      onChange={onChange}
    />
  );
}

function AvatarSelectField({
  value,
  ariaLabel,
  placeholder,
  options,
  onChange,
}: {
  value: string;
  ariaLabel: string;
  placeholder: string;
  options: AssigneeOption[];
  onChange: (value: string) => void;
}) {
  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      ariaLabel={ariaLabel}
      placeholder={placeholder}
      searchPlaceholder={placeholder}
      noOptionsText="No matching assignees found"
      className="h-11 rounded-[10px] text-sm font-semibold"
      options={options.map((option) => ({
        value: option.id,
        label: option.name,
        avatarUrl: option.avatarUrl,
        className: "text-sm font-semibold text-secondary",
      }))}
    />
  );
}

function RangeFields({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_16px_minmax(0,1fr)] items-center gap-2">
      {left}
      <span className="text-center text-muted-foreground">-</span>
      {right}
    </div>
  );
}

function InfoNote() {
  return (
    <div className="mx-5 mb-5 flex items-start gap-2 rounded-[12px] border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-secondary">
      <Info className="mt-0.5 size-4 shrink-0 text-info" />
      <span>
        Note: All fields marked with <span className="text-destructive">*</span>{" "}
        are mandatory. Please ensure accurate details for better lead management
        and conversion.
      </span>
    </div>
  );
}

function InputField({
  ariaLabel,
  invalid,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "aria-label"> & {
  ariaLabel: string;
  invalid?: boolean;
}) {
  return (
    <Input
      aria-label={ariaLabel}
      invalid={invalid}
      className={cn("h-11 rounded-[10px] text-sm font-semibold", className)}
      {...props}
    />
  );
}

function UnitInputField({
  ariaLabel,
  value,
  placeholder,
  unit,
  invalid,
  onChange,
}: {
  ariaLabel: string;
  value: string;
  placeholder: string;
  unit: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <InputField
        type="number"
        min="0"
        inputMode="numeric"
        ariaLabel={ariaLabel}
        value={value}
        invalid={invalid}
        placeholder={placeholder}
        className="pr-16"
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-extrabold text-secondary">
        {unit}
      </span>
    </div>
  );
}

export function LeadInformationForm({
  formData,
  errors,
  statusMessage,
  leadSourceOptions,
  stageOptions,
  statusOptions,
  priorityOptions,
  configurationOptions = fallbackConfigurationOptions,
  possessionOptions = fallbackPossessionOptions,
  zoneOptions = fallbackZoneOptions,
  budgetRangeOptions = fallbackBudgetRangeOptions,
  carpetAreaOptions = fallbackCarpetAreaRangeOptions,
  propertyTypeOptions = fallbackPropertyTypeOptions,
  locationOptions,
  projectOptions,
  telecallerOptions,
  fieldExecutiveOptions,
  onChange,
  onCancel,
  onSaveDraft,
  onSaveLead,
  onSaveAndAssign,
  isSaving = false,
}: {
  formData: AddLeadFormData;
  errors: AddLeadErrors;
  statusMessage?: string;
  leadSourceOptions: SelectOption[];
  stageOptions: SelectOption[];
  statusOptions: SelectOption[];
  priorityOptions: SelectOption[];
  configurationOptions?: SelectOption[];
  possessionOptions?: SelectOption[];
  zoneOptions?: SelectOption[];
  budgetRangeOptions?: SelectOption[];
  carpetAreaOptions?: SelectOption[];
  propertyTypeOptions?: SelectOption[];
  locationOptions: SelectOption[];
  projectOptions: SelectOption[];
  telecallerOptions: AssigneeOption[];
  fieldExecutiveOptions: AssigneeOption[];
  onChange: <K extends keyof AddLeadFormData>(
    field: K,
    value: AddLeadFormData[K],
  ) => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onSaveLead: () => void;
  onSaveAndAssign: () => void;
  isSaving?: boolean;
}) {
  return (
    <Card className="overflow-hidden rounded-md border border-slate-200  shadow-card">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-[2rem] font-extrabold tracking-[-0.02em] text-secondary">
            Add New Lead
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            Capture new property lead details and assign to the right executive.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 rounded-[10px] px-4 text-sm font-bold shadow-none"
        >
          <Settings2 className="size-4" />
          View Lead Form Settings
          <ChevronDown className="size-4" />
        </Button>
      </div>

      {statusMessage ? (
        <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-success">
          {statusMessage}
        </div>
      ) : null}

      <FormSection index={1} title="Basic Information">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Lead Name" required error={errors.leadName}>
            <InputField
              ariaLabel="Lead Name"
              value={formData.leadName}
              invalid={Boolean(errors.leadName)}
              placeholder="Enter full name"
              onChange={(event) => onChange("leadName", event.target.value)}
            />
          </FormField>

          <FormField label="Mobile Number" required error={errors.mobileNumber}>
            <PhoneInputField
              ariaLabel="Mobile Number"
              value={formData.mobileNumber}
              countryCode={formData.mobileCountryCode}
              placeholder="Enter mobile number"
              invalid={Boolean(errors.mobileNumber)}
              onValueChange={(value) => onChange("mobileNumber", value)}
              onCountryCodeChange={(value) =>
                onChange("mobileCountryCode", value)
              }
            />
          </FormField>

          <FormField label="Alternate Number">
            <PhoneInputField
              ariaLabel="Alternate Number"
              value={formData.alternateNumber}
              countryCode={formData.alternateCountryCode}
              placeholder="Enter alternate number"
              onValueChange={(value) => onChange("alternateNumber", value)}
              onCountryCodeChange={(value) =>
                onChange("alternateCountryCode", value)
              }
            />
          </FormField>

          <FormField label="Email Address">
            <InputField
              ariaLabel="Email Address"
              value={formData.emailAddress}
              placeholder="Enter email address"
              onChange={(event) => onChange("emailAddress", event.target.value)}
            />
          </FormField>

          <FormField label="Gender">
            <SelectField
              value={formData.gender}
              placeholder="Select gender"
              options={genderOptions}
              ariaLabel="Gender"
              onChange={(value) => onChange("gender", value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection index={2} title="Property Requirements">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FormField label="Property Type" required error={errors.propertyType}>
            <SelectField
              value={formData.propertyType}
              placeholder="Select property type"
              options={propertyTypeOptions}
              ariaLabel="Property Type"
              invalid={Boolean(errors.propertyType)}
              onChange={(value) => onChange("propertyType", value)}
            />
          </FormField>

          <FormField label="Configuration">
            <SelectField
              value={formData.configuration}
              placeholder="Select configuration"
              options={configurationOptions}
              ariaLabel="Configuration"
              onChange={(value) => onChange("configuration", value)}
            />
          </FormField>

          <FormField label="Budget" required error={errors.budgetRange}>
            <SelectField
              value={formData.budgetRange}
              placeholder="Select budget"
              options={budgetRangeOptions}
              ariaLabel="Budget"
              invalid={Boolean(errors.budgetRange)}
              onChange={(value) => onChange("budgetRange", value)}
            />
          </FormField>

          <FormField
            label="Location"
            required
            error={errors.preferredLocation}
          >
            <SelectField
              value={formData.preferredLocation}
              placeholder="Select preferred location"
              options={locationOptions}
              ariaLabel="Preferred Location"
              invalid={Boolean(errors.preferredLocation)}
              onChange={(value) => onChange("preferredLocation", value)}
            />
          </FormField>

          <FormField label="Zone">
            <SelectField
              value={formData.zone}
              placeholder="Select zone"
              options={zoneOptions}
              ariaLabel="Zone"
              onChange={(value) => onChange("zone", value)}
            />
          </FormField>

          <FormField label="Preferred Project (Optional)">
            <SelectField
              value={formData.preferredProject}
              placeholder="Select project"
              options={projectOptions}
              ariaLabel="Preferred Project"
              onChange={(value) => onChange("preferredProject", value)}
            />
          </FormField>

          <FormField label="Possession">
            <SelectField
              value={formData.possessionTimeline}
              placeholder="Select possession"
              options={possessionOptions}
              ariaLabel="Possession"
              onChange={(value) => onChange("possessionTimeline", value)}
            />
          </FormField>

          <FormField label="Carpet Area">
            <SelectField
              value={formData.carpetAreaRange}
              placeholder="Select carpet area"
              options={carpetAreaOptions}
              ariaLabel="Carpet Area"
              onChange={(value) => onChange("carpetAreaRange", value)}
            />
          </FormField>

          <FormField label="Purpose">
            <SelectField
              value={formData.purpose}
              placeholder="Select purpose"
              options={purposeOptions}
              ariaLabel="Purpose"
              onChange={(value) => onChange("purpose", value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection index={3} title="Lead Information">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField label="Lead Source" required error={errors.leadSource}>
            <SelectField
              value={formData.leadSource}
              placeholder="Select lead source"
              options={leadSourceOptions}
              ariaLabel="Lead Source"
              invalid={Boolean(errors.leadSource)}
              onChange={(value) => onChange("leadSource", value)}
            />
          </FormField>

          <FormField label="Campaign (If Any)">
            <SelectField
              value={formData.campaign}
              placeholder="Select campaign"
              options={campaignOptions}
              ariaLabel="Campaign"
              onChange={(value) => onChange("campaign", value)}
            />
          </FormField>

          <FormField label="Lead Stage" required error={errors.leadStage}>
            <SelectField
              value={formData.leadStage}
              placeholder="Select stage"
              options={stageOptions}
              ariaLabel="Lead Stage"
              invalid={Boolean(errors.leadStage)}
              onChange={(value) => onChange("leadStage", value)}
            />
          </FormField>

          <FormField label="Lead Status" required error={errors.leadStatus}>
            <SelectField
              value={formData.leadStatus}
              placeholder="Select status"
              options={statusOptions}
              ariaLabel="Lead Status"
              invalid={Boolean(errors.leadStatus)}
              onChange={(value) => onChange("leadStatus", value)}
            />
          </FormField>



          <FormField label="Interest Level">
            <SelectField
              value={formData.interestLevel}
              placeholder="Select interest level"
              options={interestLevelOptions}
              ariaLabel="Interest Level"
              onChange={(value) => onChange("interestLevel", value)}
            />
          </FormField>

          <FormField label="How did you hear about us?">
            <SelectField
              value={formData.heardAboutUs}
              placeholder="Select option"
              options={heardAboutUsOptions}
              ariaLabel="How did you hear about us"
              onChange={(value) => onChange("heardAboutUs", value)}
            />
          </FormField>

          <FormField label="Remarks / Notes">
            <Textarea
              aria-label="Remarks / Notes"
              value={formData.remarks}
              placeholder="Enter remarks or notes"
              className="min-h-[44px] rounded-[10px] py-3 text-sm font-semibold"
              onChange={(event) => onChange("remarks", event.target.value)}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection index={4} title="Assignment">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField
            label="Assign To (Pre Sales)"
            required
            error={errors.telecallerId}
          >
            <AvatarSelectField
              value={formData.telecallerId}
              ariaLabel="Assign To Pre Sales"
              placeholder="Search Pre Sales"
              options={telecallerOptions}
              onChange={(value) => onChange("telecallerId", value)}
            />
          </FormField>

          <FormField label="Assign To (Sales Executive)">
            <AvatarSelectField
              value={formData.fieldExecutiveId}
              ariaLabel="Assign To Sales Executive"
              placeholder="Search sales executive"
              options={fieldExecutiveOptions}
              onChange={(value) => onChange("fieldExecutiveId", value)}
            />
          </FormField>

          <FormField label="Reference By (Optional)">
            <SelectField
              value={formData.referenceBy}
              placeholder="Select referrer"
              options={referrerOptions}
              ariaLabel="Reference By"
              onChange={(value) => onChange("referenceBy", value)}
            />
          </FormField>

          <FormField label="Assign Date">
            <DateInputField
              ariaLabel="Assign Date"
              value={formData.assignDate}
              placeholder="dd-mm-yyyy"
              onChange={(value) => onChange("assignDate", value)}
            />
          </FormField>

          <div className="space-y-1.5">
            <div className="h-[18px]" aria-hidden="true" />
            <div className="flex h-11 items-center">
              <Checkbox
                aria-label="Auto Assign Next Follow-up"
                checked={formData.autoAssignFollowUp}
                label={
                  <span className="text-sm font-semibold text-secondary">
                    Auto Assign Next Follow-up
                  </span>
                }
                onChange={(event) =>
                  onChange("autoAssignFollowUp", event.target.checked)
                }
              />
            </div>
          </div>

          <FormField
            label="Follow-up Date & Time"
            error={errors.followUpDate || errors.followUpTime}
          >
            <div className="grid gap-2">
              <FollowUpDatePicker
                value={formData.followUpDate}
                onChange={(value) => onChange("followUpDate", value)}
              />
              <ClockTimePicker
                value={formData.followUpTime}
                options={[
                  "09:00 AM",
                  "10:00 AM",
                  "11:00 AM",
                  "12:00 PM",
                  "03:00 PM",
                  "06:00 PM",
                ]}
                onChange={(value) => onChange("followUpTime", value)}
              />
            </div>
          </FormField>

          <FormField label="Follow-up Type" error={errors.followUpType}>
            <SelectField
              value={formData.followUpType}
              placeholder="Select follow-up type"
              options={followUpTypeOptions}
              ariaLabel="Follow-up Type"
              onChange={(value) => onChange("followUpType", value)}
            />
          </FormField>
        </div>
      </FormSection>

      <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="outline"
          className="h-11 min-w-[88px] rounded-[10px] px-5 shadow-none"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-[10px] px-5 shadow-none"
            onClick={onSaveDraft}
          >
            <Info className="size-4" />
            Save as Draft
          </Button>
          <Button
            type="button"
            variant="navy"
            className="h-11 rounded-[10px] px-5"
            disabled={isSaving}
            onClick={onSaveLead}
          >
            {isSaving ? "Saving..." : "Save Lead"}
          </Button>
          <Button
            type="button"
            className="h-11 rounded-[10px] bg-gradient-to-r from-primary to-[#ff7c1f] px-5"
            disabled={isSaving}
            onClick={onSaveAndAssign}
          >
            <Send className="size-4" />
            {isSaving ? "Saving..." : "Save & Assign"}
          </Button>
        </div>
      </div>

      <InfoNote />
    </Card>
  );
}
