import {
  Building2,
  CheckCircle2,
  Compass,
  Coins,
  Home,
  Landmark,
  Layers3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import {
  type LeadMasterBaseRow,
  type LeadMasterConfig,
  type LeadMasterFilterState,
  type LeadMasterFormField,
  type LeadMasterStat,
  type MasterCategory,
  type MasterCategoryDefinition,
} from "../../leads/masters/leadMastersData";
import { DEFAULT_PROJECT_WHATSAPP_TEMPLATE } from "../projectWhatsappShare";

export type ProjectMasterCategoryId =
  | "property_type"
  | "project_location"
  | "project_configuration"
  | "possession_timeline"
  | "project_zone"
  | "lead_budget_range"
  | "carpet_area_range"
  | "project_amenity"
  | "project_status"
  | "project_developer"
  | "project_whatsapp_template"
  | "unit_tower"
  | "unit_facing"
  | "unit_availability"
  | "unit_booking_status";

const colorOptions = [
  { label: "Blue", value: "#2563EB" },
  { label: "Green", value: "#059669" },
  { label: "Orange", value: "#EA580C" },
  { label: "Rose", value: "#E11D48" },
  { label: "Violet", value: "#7C3AED" },
  { label: "Slate", value: "#475569" },
];

const statusTypeField: LeadMasterFormField = {
  key: "statusType",
  label: "Status Type",
  type: "select",
  required: true,
  options: [
    { label: "System Default", value: "System Default" },
    { label: "Custom", value: "Custom" },
  ],
};

const activeField: LeadMasterFormField = {
  key: "isActive",
  label: "Is Active",
  type: "toggle",
};

const baseStats = (totalLabel: string): LeadMasterStat[] => [
  { key: "total", label: totalLabel },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
  { key: "systemDefault", label: "System Default" },
];

const createRows = (
  categoryId: ProjectMasterCategoryId,
  group: string,
  values: string[],
): LeadMasterBaseRow[] =>
  values.map((name, index) => ({
    id: `${categoryId}-${index + 1}`,
    sortOrder: index + 1,
    name,
    code: name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
    description: "",
    category: group,
    statusType: "System Default",
    isActive: true,
    isSystemDefault: true,
    displayColor: colorOptions[index % colorOptions.length].value,
  }));

export const projectMasterCategoryDefinitions: MasterCategoryDefinition[] = [
  {
    id: "property_type",
    name: "Property Type Master",
    icon: Home,
    description:
      "Manage property types used in lead requirement capture such as apartment, villa, and plot.",
  },
  {
    id: "project_location",
    name: "Project Location Master",
    icon: MapPin,
    description:
      "Manage project locations used while creating projects and matching leads.",
  },
  {
    id: "project_configuration",
    name: "Configuration Master",
    icon: Home,
    description:
      "Manage inventory configurations such as 1 BHK, 2 BHK, studio, and penthouse.",
  },
  {
    id: "possession_timeline",
    name: "Possession Master",
    icon: CheckCircle2,
    description:
      "Manage possession timelines used while capturing lead requirements and project readiness.",
  },
  {
    id: "project_zone",
    name: "Zone Master",
    icon: MapPin,
    description:
      "Manage zones such as harbour line, east, west, and Navi Mumbai for lead requirements.",
  },
  {
    id: "lead_budget_range",
    name: "Budget Master",
    icon: Coins,
    description:
      "Manage budget buckets used while capturing buyer requirement budgets.",
  },
  {
    id: "carpet_area_range",
    name: "Carpet Area Master",
    icon: Building2,
    description:
      "Manage carpet-area buckets used in lead requirement qualification.",
  },
  {
    id: "project_amenity",
    name: "Amenities Master",
    icon: Sparkles,
    description:
      "Manage amenities available for project creation and project preference capture.",
  },
  {
    id: "project_status",
    name: "Project Status Master",
    icon: ShieldCheck,
    description:
      "Manage lifecycle statuses shown across project cards, filters, and reporting.",
  },
  {
    id: "project_developer",
    name: "Developer Master",
    icon: Landmark,
    description: "Manage developer and builder names used on project records.",
  },
  {
    id: "project_whatsapp_template",
    name: "Project WhatsApp Template",
    icon: MessageCircle,
    description:
      "Manage project share message templates used when opening WhatsApp Web from project cards.",
  },
  {
    id: "unit_tower",
    name: "Tower Master",
    icon: Building2,
    description: "Manage tower labels used while creating inventory units.",
  },
  {
    id: "unit_facing",
    name: "Facing Master",
    icon: Compass,
    description:
      "Manage unit-facing values such as east, west, garden, lake, and sea view.",
  },
  {
    id: "unit_availability",
    name: "Unit Availability Master",
    icon: CheckCircle2,
    description:
      "Manage availability statuses used for inventory lifecycle updates.",
  },
  {
    id: "unit_booking_status",
    name: "Booking Status Master",
    icon: Layers3,
    description: "Manage booking and reservation labels used on unit records.",
  },
];

const rows = {
  property_type: createRows("property_type", "Property", [
    "Apartment",
    "Villa",
    "Plot",
    "Commercial",
  ]),
  project_location: createRows("project_location", "Project", [
    "Andheri (E), Mumbai",
    "Goregaon (E), Mumbai",
    "Powai, Mumbai",
    "Andheri (W), Mumbai",
    "Malad, Mumbai",
    "Bandra, Mumbai",
  ]),
  project_configuration: createRows("project_configuration", "Inventory", [
    "1 BHK",
    "2 BHK",
    "3 BHK",
    "4 BHK",
    "5 BHK",
    "Studio",
    "Penthouse",
  ]),
  possession_timeline: createRows("possession_timeline", "Timeline", [
    "Immediate",
    "Within 3 Months",
    "Within 6 Months",
    "Within 12 Months",
    "Ready to Move",
    "Under Construction",
  ]),
  project_zone: createRows("project_zone", "Location", [
    "Central",
    "Harbour Line",
    "Western",
    "Western Line",
    "Eastern",
    "East",
    "West",
    "South Mumbai",
    "Thane",
    "Navi Mumbai",
  ]),
  lead_budget_range: createRows("lead_budget_range", "Budget", [
    "50 Lakh - 75 Lakh",
    "75 Lakh - 1 Cr",
    "1 Cr - 1.5 Cr",
    "1.5 Cr - 2 Cr",
    "2 Cr - 3 Cr",
    "3 Cr+",
  ]),
  carpet_area_range: createRows("carpet_area_range", "Area", [
    "400 - 600 sq ft",
    "600 - 800 sq ft",
    "800 - 1000 sq ft",
    "1000 - 1500 sq ft",
    "1500 - 2000 sq ft",
    "2000+ sq ft",
  ]),
  project_amenity: createRows("project_amenity", "Amenity", [
    "Gym",
    "Parking",
    "Club House",
    "Swimming Pool",
    "Landscaped Garden",
    "Children's Play Area",
    "Jogging Track",
    "Security",
    "Lake Deck",
    "EV Parking",
    "Terrace Garden",
  ]),
  project_status: createRows("project_status", "Project Status", [
    "Active",
    "Ready To Move",
    "Under Construction",
    "High Demand",
  ]),
  project_developer: createRows("project_developer", "Developer", [
    "Truroot Realty",
    "Lakeview Infra",
    "Palm Habitat",
    "Sunset Homes",
  ]),
  project_whatsapp_template: [
    {
      id: "project_whatsapp_template-1",
      sortOrder: 1,
      name: "Default project share",
      code: "DEFAULT_PROJECT_SHARE",
      description: DEFAULT_PROJECT_WHATSAPP_TEMPLATE,
      category: "WhatsApp",
      statusType: "System Default",
      isActive: true,
      isSystemDefault: true,
      displayColor: "#059669",
    },
  ],
  unit_tower: createRows("unit_tower", "Tower", [
    "Tower A",
    "Tower B",
    "Tower C",
    "Tower D",
    "Tower E",
    "Tower Z",
  ]),
  unit_facing: createRows("unit_facing", "Facing", [
    "East",
    "West",
    "North",
    "South",
    "Garden",
    "Sea View",
    "Lake",
    "Road",
  ]),
  unit_availability: createRows("unit_availability", "Inventory Status", [
    "Available",
    "Hold",
    "Booked",
    "Sold",
  ]),
  unit_booking_status: createRows("unit_booking_status", "Booking Status", [
    "Open",
    "Family revisit",
    "Negotiation",
    "Token received",
    "Closed",
  ]),
} satisfies Record<ProjectMasterCategoryId, LeadMasterBaseRow[]>;

const commonColumns: LeadMasterConfig["columns"] = [
  { key: "index", label: "#", kind: "index" },
  { key: "name", label: "Name", kind: "text", valueKey: "name" },
  { key: "category", label: "Category", kind: "badge", valueKey: "category" },
  {
    key: "statusType",
    label: "Status Type",
    kind: "badge",
    valueKey: "statusType",
    badgeStyles: {
      "System Default": "bg-violet-50 text-violet-700",
      Custom: "bg-slate-100 text-slate-700",
    },
  },
  { key: "isActive", label: "Is Active", kind: "toggle", valueKey: "isActive" },
  { key: "actions", label: "Actions", kind: "actions", align: "right" },
];

const commonFields = (
  nameLabel: string,
  groupOptions: string[],
): LeadMasterFormField[] => [
  {
    key: "name",
    label: nameLabel,
    type: "text",
    required: true,
    placeholder: `Enter ${nameLabel.toLowerCase()}`,
    maxLength: 80,
  },
  {
    key: "category",
    label: "Category",
    type: "select",
    required: true,
    options: groupOptions.map((value) => ({ label: value, value })),
  },
  statusTypeField,
  {
    key: "displayColor",
    label: "Display Color",
    type: "color",
    options: colorOptions,
  },
  activeField,
];

const configFor = (
  index: number,
  totalLabel: string,
  addLabel: string,
  nameLabel: string,
  groupOptions: string[],
): LeadMasterConfig => ({
  category: projectMasterCategoryDefinitions[index],
  totalLabel,
  addLabel,
  addTitle: addLabel,
  editTitle: `Edit ${nameLabel}`,
  searchPlaceholder: `Search ${nameLabel.toLowerCase()} by name`,
  helperText:
    "Project masters are reused across project creation, inventory creation, filters, and reports.",
  stats: baseStats(totalLabel),
  filterLabel: "Category",
  filterOptions: groupOptions.map((value) => ({ label: value, value })),
  columns: commonColumns,
  formFields: commonFields(nameLabel, groupOptions),
});

const whatsappTemplateColumns: LeadMasterConfig["columns"] = [
  { key: "index", label: "#", kind: "index" },
  { key: "name", label: "Template Name", kind: "text", valueKey: "name" },
  {
    key: "description",
    label: "Message Template",
    kind: "text",
    valueKey: "description",
    emptyText: "-",
  },
  {
    key: "statusType",
    label: "Status Type",
    kind: "badge",
    valueKey: "statusType",
    badgeStyles: {
      "System Default": "bg-violet-50 text-violet-700",
      Custom: "bg-slate-100 text-slate-700",
    },
  },
  { key: "isActive", label: "Is Active", kind: "toggle", valueKey: "isActive" },
  { key: "actions", label: "Actions", kind: "actions", align: "right" },
];

export const projectMasterConfigs: Record<
  ProjectMasterCategoryId,
  LeadMasterConfig
> = {
  property_type: configFor(
    0,
    "Total Property Types",
    "Add Property Type",
    "Property Type",
    ["Property"],
  ),
  project_location: configFor(
    1,
    "Total Locations",
    "Add Project Location",
    "Project Location",
    ["Project"],
  ),
  project_configuration: configFor(
    2,
    "Total Configurations",
    "Add Configuration",
    "Configuration",
    ["Inventory"],
  ),
  possession_timeline: configFor(
    3,
    "Total Possession Timelines",
    "Add Possession Timeline",
    "Possession Timeline",
    ["Timeline"],
  ),
  project_zone: configFor(4, "Total Zones", "Add Zone", "Zone", ["Location"]),
  lead_budget_range: configFor(
    5,
    "Total Budget Buckets",
    "Add Budget Bucket",
    "Budget Bucket",
    ["Budget"],
  ),
  carpet_area_range: configFor(
    6,
    "Total Carpet Area Buckets",
    "Add Carpet Area Bucket",
    "Carpet Area Bucket",
    ["Area"],
  ),
  project_amenity: configFor(7, "Total Amenities", "Add Amenity", "Amenity", [
    "Amenity",
  ]),
  project_status: configFor(
    8,
    "Total Statuses",
    "Add Project Status",
    "Project Status",
    ["Project Status"],
  ),
  project_developer: configFor(
    9,
    "Total Developers",
    "Add Developer",
    "Developer",
    ["Developer"],
  ),
  project_whatsapp_template: {
    category: projectMasterCategoryDefinitions[10],
    totalLabel: "Total Templates",
    addLabel: "Add WhatsApp Template",
    addTitle: "Add WhatsApp Template",
    editTitle: "Edit WhatsApp Template",
    searchPlaceholder: "Search WhatsApp templates by name or body",
    helperText:
      "Project WhatsApp templates are used to render the share preview before opening WhatsApp Web.",
    stats: baseStats("Total Templates"),
    filterLabel: "Category",
    filterOptions: [{ label: "WhatsApp", value: "WhatsApp" }],
    columns: whatsappTemplateColumns,
    formFields: [
      {
        key: "name",
        label: "Template Name",
        type: "text",
        required: true,
        placeholder: "Enter template name",
        maxLength: 80,
      },
      {
        key: "description",
        label: "Message Template",
        type: "textarea",
        required: true,
        placeholder: DEFAULT_PROJECT_WHATSAPP_TEMPLATE,
        maxLength: 3000,
      },
      {
        key: "category",
        label: "Category",
        type: "select",
        required: true,
        options: [{ label: "WhatsApp", value: "WhatsApp" }],
      },
      statusTypeField,
      activeField,
    ],
  },
  unit_tower: configFor(11, "Total Towers", "Add Tower", "Tower", ["Tower"]),
  unit_facing: configFor(12, "Total Facing Values", "Add Facing", "Facing", [
    "Facing",
  ]),
  unit_availability: configFor(
    13,
    "Total Availability Statuses",
    "Add Availability Status",
    "Availability Status",
    ["Inventory Status"],
  ),
  unit_booking_status: configFor(
    14,
    "Total Booking Statuses",
    "Add Booking Status",
    "Booking Status",
    ["Booking Status"],
  ),
};

export function getInitialProjectMasterRows(): Record<
  ProjectMasterCategoryId,
  LeadMasterBaseRow[]
> {
  return Object.fromEntries(
    (Object.keys(rows) as ProjectMasterCategoryId[]).map((key) => [
      key,
      rows[key].map((row) => ({ ...row })),
    ]),
  ) as Record<ProjectMasterCategoryId, LeadMasterBaseRow[]>;
}

export function getProjectMasterCategories(
  data: Record<ProjectMasterCategoryId, LeadMasterBaseRow[]>,
): MasterCategory[] {
  return projectMasterCategoryDefinitions.map((category) => ({
    ...category,
    count: data[category.id as ProjectMasterCategoryId].length,
  }));
}

export function createDefaultProjectMasterFilters(): LeadMasterFilterState {
  return {
    search: "",
    activity: "all",
    statusType: "all",
    categoryValue: "all",
  };
}

export function getInitialProjectMasterFormValues(
  categoryId: ProjectMasterCategoryId,
): LeadMasterBaseRow {
  const sample = rows[categoryId][0] as Partial<LeadMasterBaseRow> | undefined;

  return {
    id: "",
    sortOrder: 0,
    name: "",
    code: "",
    description: "",
    category: sample?.category ?? "",
    type: sample?.type ?? "",
    status: "Active",
    statusType: "Custom",
    isActive: true,
    isSystemDefault: false,
    displayColor: sample?.displayColor ?? colorOptions[0].value,
  };
}

export function projectMasterCategoryRecord<T>(
  value: T,
): Record<ProjectMasterCategoryId, T> {
  return {
    property_type: value,
    project_location: value,
    project_configuration: value,
    possession_timeline: value,
    project_zone: value,
    lead_budget_range: value,
    carpet_area_range: value,
    project_amenity: value,
    project_status: value,
    project_developer: value,
    project_whatsapp_template: value,
    unit_tower: value,
    unit_facing: value,
    unit_availability: value,
    unit_booking_status: value,
  };
}
