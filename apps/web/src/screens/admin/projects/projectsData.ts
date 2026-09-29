export type ProjectStatus =
  | "Active"
  | "Ready To Move"
  | "Under Construction"
  | "High Demand";
export type UnitAvailabilityStatus = "Available" | "Hold" | "Booked" | "Sold";

export interface ProjectUnit {
  id: string;
  projectId: string;
  imageUrl?: string;
  tower: string;
  unitNumber: string;
  configuration: string;
  carpetArea: string;
  floor: string;
  facing: string;
  price: string;
  availability: UnitAvailabilityStatus;
  bookingStatus: string;
  visitCount: number;
  salesOwner?: string;
  imageGallery?: string[];
}

export interface ProjectLinkedLead {
  id: string;
  name: string;
  stage: string;
  owner: string;
  budget: string;
  projectId: string;
  unitId?: string;
}

export interface ProjectLinkedVisit {
  id: string;
  leadId: string;
  leadName: string;
  status: "Upcoming" | "Scheduled" | "Completed" | "Cancelled";
  date: string;
  time: string;
  projectId: string;
  unitId?: string;
  assignedExecutive: string;
}

export interface ProjectBrochure {
  url: string;
  storageKey?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number | null;
}

export type ProjectConfigurationPriceUnit = "Lakh" | "Cr";

export interface ProjectConfigurationVariant {
  id: string;
  configuration: string;
  carpetArea: string;
  priceAmount: string;
  priceUnit: ProjectConfigurationPriceUnit;
}

export interface ProjectCatalogItem {
  id: string;
  name: string;
  location: string;
  developer: string;
  status: ProjectStatus;
  possession: string;
  priceRange: string;
  configurations: string[];
  configurationCarpetAreas?: Record<string, string>;
  configurationVariants?: ProjectConfigurationVariant[];
  numberOfFloors?: number | null;
  amenities: string[];
  highlights?: string[];
  description: string;
  reraNumber?: string;
  imageUrl: string;
  imageGallery?: string[];
  videoUrl?: string;
  videoUrls?: string[];
  videos?: string[];
  brochureUrl?: string;
  brochureStorageKey?: string;
  brochureFileName?: string;
  brochureMimeType?: string;
  brochureSizeBytes?: number;
  brochures?: ProjectBrochure[];
  imageTone: string;
  salesOwner: string;
  activeLeads: number;
  upcomingVisits: number;
  demandScore: number;
  latitude?: number | null;
  longitude?: number | null;
  geofenceRadiusM?: number | null;
  units: ProjectUnit[];
  linkedLeads: ProjectLinkedLead[];
  linkedVisits: ProjectLinkedVisit[];
}

export const projectsCatalog: ProjectCatalogItem[] = [
  {
    id: "ocean-heights",
    name: "Ocean Heights",
    location: "Andheri (E), Mumbai",
    developer: "Truroot Realty",
    status: "High Demand",
    possession: "Ready by Dec 2025",
    priceRange: "INR 1.18 Cr - 2.5 Cr",
    configurations: ["2 BHK", "3 BHK"],
    amenities: [
      "Parking",
      "Gym",
      "Swimming Pool",
      "Club House",
      "Kids Play Area",
    ],
    description:
      "Premium residential towers near New Link Road with strong demand from west Mumbai families.",
    imageUrl:
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=900&h=520",
    imageTone: "from-slate-200 via-white to-blue-100",
    salesOwner: "Sneha Iyer",
    activeLeads: 42,
    upcomingVisits: 9,
    demandScore: 95,
    units: [
      {
        id: "ocean-b-1203",
        projectId: "ocean-heights",
        tower: "Tower B",
        unitNumber: "1203",
        configuration: "2 BHK",
        carpetArea: "842 sq.ft.",
        floor: "12",
        facing: "West",
        price: "INR 1.32 Cr",
        availability: "Available",
        bookingStatus: "Open",
        visitCount: 8,
      },
      {
        id: "ocean-a-904",
        projectId: "ocean-heights",
        tower: "Tower A",
        unitNumber: "904",
        configuration: "2 BHK",
        carpetArea: "815 sq.ft.",
        floor: "9",
        facing: "East",
        price: "INR 1.26 Cr",
        availability: "Hold",
        bookingStatus: "Family revisit",
        visitCount: 5,
      },
      {
        id: "ocean-c-1601",
        projectId: "ocean-heights",
        tower: "Tower C",
        unitNumber: "1601",
        configuration: "3 BHK",
        carpetArea: "1,184 sq.ft.",
        floor: "16",
        facing: "Sea View",
        price: "INR 2.18 Cr",
        availability: "Available",
        bookingStatus: "Open",
        visitCount: 4,
      },
    ],
    linkedLeads: [
      {
        id: "TR001245",
        name: "Rahul Sharma",
        stage: "Interested",
        owner: "Sneha Iyer",
        budget: "INR 1 Cr - INR 1.5 Cr",
        projectId: "ocean-heights",
        unitId: "ocean-b-1203",
      },
      {
        id: "TR001252",
        name: "Anjali Mehta",
        stage: "Site Visit",
        owner: "Rahul Mehta",
        budget: "INR 1.5 Cr - INR 2 Cr",
        projectId: "ocean-heights",
        unitId: "ocean-c-1601",
      },
    ],
    linkedVisits: [
      {
        id: "SV-1007",
        leadId: "TR001245",
        leadName: "Rahul Sharma",
        status: "Upcoming",
        date: "21 May 2025",
        time: "11:00 AM",
        projectId: "ocean-heights",
        unitId: "ocean-b-1203",
        assignedExecutive: "Sneha Iyer",
      },
      {
        id: "SV-1006",
        leadId: "TR001245",
        leadName: "Rahul Sharma",
        status: "Scheduled",
        date: "15 May 2025",
        time: "03:00 PM",
        projectId: "ocean-heights",
        unitId: "ocean-a-904",
        assignedExecutive: "Rahul Mehta",
      },
    ],
  },
  {
    id: "skyline-enclave",
    name: "Skyline Enclave",
    location: "Goregaon (E), Mumbai",
    developer: "Truroot Realty",
    status: "Active",
    possession: "Mar 2026",
    priceRange: "INR 1.05 Cr - 1.4 Cr",
    configurations: ["2 BHK", "3 BHK"],
    amenities: ["Gym", "Jogging Track", "Co-working Lounge", "Parking"],
    description:
      "Transit-friendly project near the western express corridor with compact premium units.",
    imageUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=900&h=520",
    imageTone: "from-blue-100 via-white to-slate-200",
    salesOwner: "Aditya Patil",
    activeLeads: 31,
    upcomingVisits: 6,
    demandScore: 88,
    units: [
      {
        id: "skyline-c-702",
        projectId: "skyline-enclave",
        tower: "Tower C",
        unitNumber: "702",
        configuration: "2 BHK",
        carpetArea: "768 sq.ft.",
        floor: "7",
        facing: "East",
        price: "INR 1.12 Cr",
        availability: "Available",
        bookingStatus: "Open",
        visitCount: 6,
      },
      {
        id: "skyline-a-1104",
        projectId: "skyline-enclave",
        tower: "Tower A",
        unitNumber: "1104",
        configuration: "3 BHK",
        carpetArea: "1,038 sq.ft.",
        floor: "11",
        facing: "Garden",
        price: "INR 1.38 Cr",
        availability: "Booked",
        bookingStatus: "Token received",
        visitCount: 9,
      },
    ],
    linkedLeads: [
      {
        id: "TR001243",
        name: "Vikram Singh",
        stage: "Site Visit",
        owner: "Aditya Patil",
        budget: "INR 1 Cr - INR 1.35 Cr",
        projectId: "skyline-enclave",
        unitId: "skyline-c-702",
      },
    ],
    linkedVisits: [
      {
        id: "SV-1011",
        leadId: "TR001243",
        leadName: "Vikram Singh",
        status: "Upcoming",
        date: "22 May 2025",
        time: "02:00 PM",
        projectId: "skyline-enclave",
        unitId: "skyline-c-702",
        assignedExecutive: "Amit Joshi",
      },
    ],
  },
  {
    id: "lakeview-residency",
    name: "Lakeview Residency",
    location: "Powai, Mumbai",
    developer: "Lakeview Infra",
    status: "Under Construction",
    possession: "Sep 2026",
    priceRange: "INR 92 Lakh - 2.1 Cr",
    configurations: ["1 BHK", "2 BHK", "3 BHK"],
    amenities: ["Lake Deck", "Gym", "Multipurpose Hall", "EV Parking"],
    description:
      "Urban lake-facing community with flexible inventory for first-time buyers and investors.",
    imageUrl:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=900&h=520",
    imageTone: "from-cyan-100 via-white to-slate-200",
    salesOwner: "Pooja Sharma",
    activeLeads: 27,
    upcomingVisits: 4,
    demandScore: 81,
    units: [
      {
        id: "lake-b-504",
        projectId: "lakeview-residency",
        tower: "Tower B",
        unitNumber: "504",
        configuration: "2 BHK",
        carpetArea: "742 sq.ft.",
        floor: "5",
        facing: "Lake",
        price: "INR 1.16 Cr",
        availability: "Available",
        bookingStatus: "Open",
        visitCount: 3,
      },
      {
        id: "lake-a-1802",
        projectId: "lakeview-residency",
        tower: "Tower A",
        unitNumber: "1802",
        configuration: "3 BHK",
        carpetArea: "1,125 sq.ft.",
        floor: "18",
        facing: "Lake",
        price: "INR 1.96 Cr",
        availability: "Available",
        bookingStatus: "Open",
        visitCount: 2,
      },
    ],
    linkedLeads: [
      {
        id: "TR001238",
        name: "Neha Kapoor",
        stage: "Interested",
        owner: "Pooja Sharma",
        budget: "INR 1 Cr - INR 1.8 Cr",
        projectId: "lakeview-residency",
        unitId: "lake-b-504",
      },
    ],
    linkedVisits: [
      {
        id: "SV-1010",
        leadId: "TR001238",
        leadName: "Neha Kapoor",
        status: "Scheduled",
        date: "23 May 2025",
        time: "05:00 PM",
        projectId: "lakeview-residency",
        unitId: "lake-b-504",
        assignedExecutive: "Sneha Iyer",
      },
    ],
  },
  {
    id: "palm-springs",
    name: "Palm Springs",
    location: "Andheri (W), Mumbai",
    developer: "Palm Habitat",
    status: "Ready To Move",
    possession: "Immediate",
    priceRange: "INR 2.8 Cr - 5.5 Cr",
    configurations: ["3 BHK", "4 BHK"],
    amenities: ["Club House", "Pool", "Concierge", "Private Parking"],
    description:
      "Ready luxury inventory for high-value buyers seeking larger west Mumbai apartments.",
    imageUrl:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=900&h=520",
    imageTone: "from-stone-100 via-white to-slate-200",
    salesOwner: "Rahul Sharma",
    activeLeads: 18,
    upcomingVisits: 2,
    demandScore: 76,
    units: [
      {
        id: "palm-d-1102",
        projectId: "palm-springs",
        tower: "Tower D",
        unitNumber: "1102",
        configuration: "3 BHK",
        carpetArea: "1,356 sq.ft.",
        floor: "11",
        facing: "West",
        price: "INR 3.1 Cr",
        availability: "Available",
        bookingStatus: "Negotiation",
        visitCount: 7,
      },
      {
        id: "palm-e-2101",
        projectId: "palm-springs",
        tower: "Tower E",
        unitNumber: "2101",
        configuration: "4 BHK",
        carpetArea: "1,920 sq.ft.",
        floor: "21",
        facing: "Sea View",
        price: "INR 5.2 Cr",
        availability: "Sold",
        bookingStatus: "Closed",
        visitCount: 11,
      },
    ],
    linkedLeads: [
      {
        id: "TR001229",
        name: "Amit Singh",
        stage: "Negotiation",
        owner: "Rahul Sharma",
        budget: "INR 3 Cr - INR 4 Cr",
        projectId: "palm-springs",
        unitId: "palm-d-1102",
      },
    ],
    linkedVisits: [
      {
        id: "SV-1009",
        leadId: "TR001229",
        leadName: "Amit Singh",
        status: "Completed",
        date: "19 May 2025",
        time: "12:30 PM",
        projectId: "palm-springs",
        unitId: "palm-d-1102",
        assignedExecutive: "Rahul Mehta",
      },
    ],
  },
  {
    id: "sunset-residency",
    name: "Sunset Residency",
    location: "Malad, Mumbai",
    developer: "Sunset Homes",
    status: "Ready To Move",
    possession: "Immediate",
    priceRange: "INR 98 Lakh - 1.65 Cr",
    configurations: ["2 BHK"],
    amenities: ["Parking", "Gym", "Terrace Garden"],
    description:
      "Ready-to-move mid-market project with quick booking inventory in Malad.",
    imageUrl:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=900&h=520",
    imageTone: "from-orange-100 via-white to-slate-200",
    salesOwner: "Vikram Singh",
    activeLeads: 14,
    upcomingVisits: 1,
    demandScore: 72,
    units: [
      {
        id: "sunset-a-604",
        projectId: "sunset-residency",
        tower: "Tower A",
        unitNumber: "604",
        configuration: "2 BHK",
        carpetArea: "724 sq.ft.",
        floor: "6",
        facing: "West",
        price: "INR 1.05 Cr",
        availability: "Available",
        bookingStatus: "Open",
        visitCount: 4,
      },
    ],
    linkedLeads: [
      {
        id: "TR001245",
        name: "Rahul Sharma",
        stage: "Interested",
        owner: "Sneha Iyer",
        budget: "INR 1 Cr - INR 1.5 Cr",
        projectId: "sunset-residency",
        unitId: "sunset-a-604",
      },
    ],
    linkedVisits: [
      {
        id: "SV-1004",
        leadId: "TR001245",
        leadName: "Rahul Sharma",
        status: "Cancelled",
        date: "02 May 2025",
        time: "02:00 PM",
        projectId: "sunset-residency",
        unitId: "sunset-a-604",
        assignedExecutive: "Vikram Singh",
      },
    ],
  },
];

const projectGalleryFallbacks: Record<string, string[]> = {
  "ocean-heights": [
    "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=900&h=520",
  ],
  "skyline-enclave": [
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=900&h=520",
  ],
  "lakeview-residency": [
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&q=80&w=900&h=520",
  ],
  "palm-springs": [
    "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1600607687644-c7171b42498b?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&q=80&w=900&h=520",
  ],
  "sunset-residency": [
    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80&w=900&h=520",
    "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&q=80&w=900&h=520",
  ],
};

export const getProjectImageGallery = (project: ProjectCatalogItem) => {
  const gallery = project.imageGallery?.filter(Boolean);
  if (gallery?.length) return gallery;
  return projectGalleryFallbacks[project.id] ?? [project.imageUrl];
};

export const getProjectById = (projectId: string | undefined) =>
  projectsCatalog.find((project) => project.id === projectId);

export const getProjectByName = (projectName: string | undefined) =>
  projectsCatalog.find(
    (project) => project.name.toLowerCase() === projectName?.toLowerCase(),
  );

export const getUnitsByProjectId = (projectId: string | undefined) =>
  getProjectById(projectId)?.units ?? [];

export const getUnitById = (
  projectId: string | undefined,
  unitId: string | undefined,
) => getUnitsByProjectId(projectId).find((unit) => unit.id === unitId);

export const getUnitByLabel = (
  projectId: string | undefined,
  unitLabel: string | undefined,
) => {
  const normalized = unitLabel?.toLowerCase();
  if (!normalized) return undefined;
  return getUnitsByProjectId(projectId).find(
    (unit) =>
      `${unit.tower}, Unit ${unit.unitNumber}`.toLowerCase() === normalized ||
      `${unit.tower} ${unit.unitNumber}`.toLowerCase() === normalized ||
      unit.configuration.toLowerCase() === normalized,
  );
};

export const getProjectOptions = () =>
  projectsCatalog.map((project) => ({ id: project.id, label: project.name }));

export const formatUnitLabel = (unit: ProjectUnit | undefined) => {
  if (!unit) return "";
  const tower = unit.tower && unit.tower !== "-" ? unit.tower : "";
  return [tower, `Unit ${unit.unitNumber}`].filter(Boolean).join(", ");
};

export const resolveProjectUnit = ({
  projectId,
  unitId,
  projectName,
  unitLabel,
}: {
  projectId?: string;
  unitId?: string;
  projectName?: string;
  unitLabel?: string;
}) => {
  const project = getProjectById(projectId) ?? getProjectByName(projectName);
  const unit =
    getUnitById(project?.id, unitId) ?? getUnitByLabel(project?.id, unitLabel);

  return {
    project,
    unit,
    projectId: project?.id ?? projectId,
    unitId: unit?.id ?? unitId,
    projectName: project?.name ?? projectName ?? "",
    unitLabel: formatUnitLabel(unit) || unitLabel || "",
    location: project?.location ?? "",
  };
};
