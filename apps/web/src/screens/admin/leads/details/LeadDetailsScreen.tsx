import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bath,
  BedDouble,
  Building2,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  Flame,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  Ruler,
  Search,
  Tags,
  UserRoundPlus,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "ui";
import toast from "react-hot-toast";

import { api } from "../../../../common/api";
import {
  formatDateForDisplay,
  formatTimeForDisplay,
  parseScheduledDateTime,
} from "../../../../common/time";
import { SlaBadge } from "../../../../common/sla/SlaBadge";
import { getAdminLeadSla } from "../../../../common/sla/slaData";
import type { SlaStatus } from "../../../../common/sla/slaTypes";
import { WorkspacePage } from "../../../../components/layout/PageHeader";
import { fieldExecutiveSidebarItems } from "../../../field-executive/fieldExecutiveData";
import {
  buildFieldExecutiveLeadSiteVisitsPath,
  isFieldExecutivePath,
} from "../../../field-executive/fieldExecutiveRouteContext";
import { telecallerSidebarItems } from "../../../telecaller/dashboard/telecallerDashboardData";
import { useDashboardLayout } from "../../dashboard/DashboardLayoutContext";
import { addLeadSidebarItems } from "../add/addLeadData";
import {
  CreateFollowUpDialog,
  type LeadActionTarget,
} from "../components/LeadActionsMenu";
import { CreateSiteVisitActionDialog } from "../site-visits/CreateSiteVisitActionDialog";
import { leadDetailsTabs } from "./leadDetailsData";
import type {
  LeadDetailsData,
  SiteVisitItem,
  SiteVisitStatus,
  TimelineItem,
} from "./leadDetailsTypes";
import { ActivitiesTimelineTab } from "./tabs/ActivitiesTimelineTab";
import { BookingsTab } from "./tabs/BookingsTab";
import { NotesTab } from "./tabs/NotesTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { EditLeadModal } from "../all/AddLeadModal";
import {
  useBulkAssignSelectedLeads,
  useLeadListFilterOptions,
} from "../all/useAllLeads";
import { SiteVisitsTab } from "./tabs/SiteVisitsTab";

type LiveLeadRecord = {
  id: string;
  displayId?: string;
  name: string;
  sourceName?: string | null;
  stageName?: string | null;
  statusName?: string | null;
  priorityName?: string | null;
  temperatureId?: string | null;
  campaignName?: string | null;
  temperatureName?: string | null;
  ownerName?: string | null;
  managerName?: string | null;
  telecallerName?: string | null;
  fieldExecutiveName?: string | null;
  email?: string | null;
  mobileCountryCode?: string | null;
  mobile?: string | null;
  alternateCountryCode?: string | null;
  alternateMobile?: string | null;
  heardAboutUs?: string | null;
  referenceBy?: string | null;
  interestLevel?: string | null;
  remarks?: string | null;
  leadScore?: number | null;
  leadScoreLabel?: string | null;
  leadScoreBreakdown?: Array<{
    category: string;
    label: string;
    score: number;
  }>;
  createdAt?: string | null;
  updatedAt?: string | null;
  ownerId?: string | null;
  telecallerId?: string | null;
  fieldExecutiveId?: string | null;
  preferredProjectName?: string | null;
  preferredProjectLocation?: string | null;
  requirement?: {
    propertyType?: string | null;
    configuration?: string | null;
    budgetRange?: string | null;
    minBudget?: string | number | null;
    maxBudget?: string | number | null;
    budgetUnit?: string | null;
    preferredLocation?: string | null;
    preferredProjectId?: string | null;
    possessionTimeline?: string | null;
    occupation?: string | null;
    purpose?: string | null;
    carpetAreaRange?: string | null;
    minArea?: string | number | null;
    maxArea?: string | number | null;
    zone?: string | null;
  } | null;
  notes?: Array<{
    id: string;
    text?: string | null;
    authorId?: string | null;
    authorName?: string | null;
    authorImage?: string | null;
    createdAt?: string;
    isPinned?: boolean | null;
  }>;
  documents?: Array<{
    id: string;
    name?: string | null;
    createdAt?: string | null;
    sizeBytes?: number | null;
  }>;
  activities?: Array<{
    id: string;
    title?: string | null;
    description?: string | null;
    occurredAt?: string | null;
    type?: string | null;
  }>;
  callLogs?: Array<{
    id: string;
    direction?: string | null;
    startedAt?: string | null;
    durationSeconds?: number | null;
    outcome?: string | null;
    notes?: string | null;
  }>;
  whatsappLogs?: Array<{
    id: string;
    sentAt?: string | null;
    deliveryStatus?: string | null;
    messageText?: string | null;
  }>;
  followUps?: Array<{
    id?: string | null;
    scheduledAt?: string | null;
    completedAt?: string | null;
    nextAction?: string | null;
    notes?: string | null;
    assignedToId?: string | null;
    assignedToName?: string | null;
    typeId?: string | null;
    typeName?: string | null;
    statusId?: string | null;
    statusName?: string | null;
  }>;
  tasks?: Array<{
    id: string;
    title: string;
    type?: string | null;
    priority?: string | null;
    status?: string | null;
    dueAt?: string | null;
    assignedToId?: string | null;
    assignedToName?: string | null;
  }>;
  siteVisits?: Array<{
    id: string;
    displayId?: string;
    status?: string | null;
    visitType?: string | null;
    scheduledAt?: string | null;
    projectId?: string | null;
    unitId?: string | null;
    projectName?: string | null;
    unitLabel?: string | null;
    assignedExecutiveId?: string | null;
    assignedExecutiveName?: string | null;
    durationMinutes?: number | null;
    meetingPoint?: string | null;
    transportMode?: string | null;
    visitorCount?: number | null;
    specialRequest?: string | null;
    notes?: string | null;
    feedback?: string | null;
    reminderAt?: string | null;
  }>;
  bookings?: Array<{
    id: string;
    leadId?: string;
    projectId?: string | null;
    projectName?: string | null;
    unitId?: string | null;
    unitLabel?: string | null;
    amount?: number | null;
    bookingAmount?: number | null;
    bookingDate?: string | null;
    status?: string | null;
  }>;
  projectInterests?: Array<{
    id: string;
    projectId?: string | null;
    unitId?: string | null;
    projectName?: string | null;
    projectLocation?: string | null;
    configuration?: string | null;
    priceRange?: string | null;
    imageUrl?: string | null;
    matchPercent?: number | null;
    unitLabel?: string | null;
    isPrimary?: boolean | null;
  }>;
};

const fieldExecutiveTabs = [
  "Overview",
  "Activities Timeline",
  "Site Visits",
  "Notes",
];

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}, ${date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const resolvedDateTime = (value?: string | null, fallback?: string) => {
  const formatted = formatDateTime(value);
  return formatted === "-" ? fallback ?? "-" : formatted;
};

const formatVisitDate = (value?: string | null) => formatDateForDisplay(value);

const formatVisitTime = (date?: string | null) => {
  if (!date) return "10:00 AM";
  return formatTimeForDisplay(date);
};

const getDueLabel = (date?: string | null) => {
  if (!date) return "Due Today";
  const now = new Date();
  const scheduled = parseScheduledDateTime(date);
  if (!scheduled) return "Due Today";
  if (scheduled < now) return "Overdue";

  const isToday =
    scheduled.getDate() === now.getDate() &&
    scheduled.getMonth() === now.getMonth() &&
    scheduled.getFullYear() === now.getFullYear();

  if (isToday) return "Due Today";
  return `In ${Math.ceil(
    (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  )} Days`;
};

const formatBudgetRange = (
  budgetRange?: string | null,
  minBudget?: string | number | null,
  maxBudget?: string | number | null,
) => {
  if (budgetRange?.trim()) return budgetRange.trim();
  const values = [minBudget, maxBudget]
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => `INR ${value}`);
  return values.length ? values.join(" - ") : "Budget not captured";
};

const normalizeVisitStatus = (value?: string | null): SiteVisitStatus => {
  if (value === "Completed" || value === "Cancelled" || value === "Upcoming") {
    return value;
  }
  return "Scheduled";
};

const normalizeVisitType = (
  value?: string | null,
): SiteVisitItem["visitType"] => {
  if (value === "Re-Visit" || value === "Virtual Visit") return value;
  return "Site Visit";
};

const normalizeTaskPriority = (
  value?: string | null,
): "High" | "Medium" | "Low" => {
  if (value === "High" || value === "Medium" || value === "Low") {
    return value;
  }
  return "Medium";
};

const normalizeTaskStatus = (
  value?: string | null,
): "Open" | "In Progress" | "Completed" | "Overdue" => {
  if (
    value === "Open" ||
    value === "In Progress" ||
    value === "Completed" ||
    value === "Overdue"
  ) {
    return value;
  }
  return "Open";
};

const avatarUrlForName = (name: string) =>
  `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(
    name,
  )}`;

const formatMoney = (value?: string | number | null) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "INR 0";
  if (numeric >= 10000000) return `INR ${(numeric / 10000000).toFixed(2)} Cr`;
  if (numeric >= 100000) return `INR ${(numeric / 100000).toFixed(2)} Lakh`;
  return `INR ${numeric.toLocaleString("en-IN")}`;
};

const formatAreaRange = (
  carpetAreaRange?: string | null,
  minArea?: string | number | null,
  maxArea?: string | number | null,
) => {
  if (carpetAreaRange?.trim()) return carpetAreaRange.trim();
  const values = [minArea, maxArea]
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "Area not captured";
  if (values.length === 1) return `${values[0].toLocaleString("en-IN")} sq.ft.`;
  return `${values[0].toLocaleString("en-IN")} - ${values[1].toLocaleString(
    "en-IN",
  )} sq.ft.`;
};

const safeValue = (value?: string | number | null, fallback = "-") => {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized ? normalized : fallback;
};

const deriveScore = (lead: LiveLeadRecord) => {
  const score = Number(lead.leadScore ?? 0);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(score, 100));
};

const scoreLabelFor = (score: number) => {
  if (score <= 0) return "Not scored";
  if (score >= 85) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 45) return "Moderate";
  return "Developing";
};

const conversionLabelFor = (lead: LiveLeadRecord) => {
  const score = deriveScore(lead);
  return `${Math.max(15, Math.min(score, 95))}%`;
};

const conversionToneFor = (score: number) => {
  if (score >= 80) return "Very High";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  return "Low";
};

const deriveTemperature = (lead: LiveLeadRecord) =>
  safeValue(lead.temperatureName ?? lead.interestLevel, "Warm");

const createEmptyLeadDetails = (leadId?: string): LeadDetailsData => ({
  profile: {
    id: leadId ?? "-",
    name: "Lead",
    avatarUrl: avatarUrlForName("Lead"),
    tag: "LEAD",
    status: "Not Set",
    phone: "-",
    email: "-",
    location: "-",
    source: "Unknown",
    stage: "New Lead",
    assignedTo: "Unassigned",
    createdOn: "-",
    lastUpdated: "-",
    score: 0,
    scoreLabel: "Not Scored",
    scoreBreakdown: [],
    conversion: "0%",
    conversionTone: "Low",
    revenue: "INR 0",
    temperature: "Warm",
    engagement: "0%",
  },
  about: [],
  requirements: [
    { label: "Property Type", value: "Not captured", icon: Building2 },
    { label: "Budget Range", value: "Budget not captured", icon: WalletCards },
    { label: "Preferred Location", value: "Not captured", icon: MapPin },
    { label: "Preferred Project", value: "Not selected", icon: Tags },
    { label: "Configuration", value: "Not captured", icon: BedDouble },
    { label: "Carpet Area", value: "Area not captured", icon: Ruler },
    {
      label: "Possession Timeline",
      value: "Not captured",
      icon: CalendarCheck,
    },
    { label: "Floor Preference", value: "Not captured", icon: Bath },
  ],
  amenities: [],
  campaign: [],
  notes: [],
  noteMeta: "No internal notes yet",
  timeline: [],
  engagement: [],
  communication: [
    {
      label: "Total Calls",
      value: "0",
      icon: Phone,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Total WhatsApp",
      value: "0",
      icon: MessageCircle,
      tone: "bg-green-50 text-success",
    },
    {
      label: "Total Site Visits",
      value: "0",
      icon: MapPin,
      tone: "bg-cyan-50 text-cyan-600",
    },
  ],
  documents: [],
  booking: null,
  bookingsList: [],
  followUp: null,
  siteVisits: {
    stats: [],
    coordinator: { name: "-", role: "-", phone: "-", email: "-" },
    upcoming: {
      date: "-",
      time: "-",
      property: "-",
      location: "-",
      status: "Scheduled",
      assignedExecutive: "-",
      executivePhone: "-",
      visitType: "Site Visit",
    },
    selectedVisit: {
      project: "-",
      unit: "-",
      towerUnit: "-",
      address: "-",
      agenda: "-",
      meetingPoint: "-",
      notes: "",
    },
    timeline: [],
    actions: [],
    visitedProperties: [],
    recommendedProperties: [],
    visits: [],
  },
  tasksList: [],
  paymentsList: [],
  fullNotesList: [],
  matchingProjects: [],
});

const iconForTimelineType = (type?: string | null): TimelineItem["icon"] => {
  const normalized = String(type ?? "").toUpperCase();
  if (normalized.includes("CALL") || normalized.includes("FOLLOW"))
    return Phone;
  if (normalized.includes("SITE") || normalized.includes("VISIT"))
    return MapPin;
  if (normalized.includes("TASK")) return ClipboardCheck;
  if (normalized.includes("NOTE") || normalized.includes("REMARK")) {
    return MessageCircle;
  }
  return UserRoundCheck;
};

const toneForTimelineType = (type?: string | null) => {
  const normalized = String(type ?? "").toUpperCase();
  if (normalized.includes("CALL") || normalized.includes("FOLLOW")) {
    return "bg-cyan-50 text-cyan-600";
  }
  if (normalized.includes("SITE") || normalized.includes("VISIT")) {
    return "bg-orange-50 text-primary";
  }
  if (normalized.includes("TASK")) return "bg-blue-50 text-blue-700";
  if (normalized.includes("NOTE") || normalized.includes("REMARK")) {
    return "bg-green-50 text-success";
  }
  return "bg-slate-100 text-secondary";
};

const buildOverviewTimeline = (lead: LiveLeadRecord): TimelineItem[] => {
  const activityRows: Array<{
    id: string;
    title: string;
    description: string;
    occurredAt?: string | null;
    helper?: string;
    type?: string | null;
    actorName?: string | null;
  }> = [
    ...(lead.activities ?? []).map((item: any) => ({
      id: item.id,
      title: safeValue(item.title, "Lead updated"),
      description: safeValue(item.description, "Lead activity logged in CRM."),
      occurredAt: item.occurredAt,
      type: item.type,
      actorName: item.actorName || item.actor?.fullName || item.userName,
    })),
    ...(lead.callLogs ?? []).map((item: any) => ({
      id: item.id,
      title: item.direction === "OUTBOUND" ? "Outgoing Call" : "Incoming Call",
      description: safeValue(item.outcome, "Call activity logged."),
      occurredAt: item.startedAt,
      helper:
        item.durationSeconds && item.durationSeconds > 0
          ? `Duration: ${Math.floor(item.durationSeconds / 60)
              .toString()
              .padStart(2, "0")}:${(item.durationSeconds % 60)
              .toString()
              .padStart(2, "0")}`
          : undefined,
      type: "CALL",
      actorName: item.userName || item.createdByName,
    })),
    ...(lead.whatsappLogs ?? []).map((item: any) => ({
      id: item.id,
      title: "WhatsApp Message",
      description: safeValue(
        item.messageText ?? item.deliveryStatus,
        "WhatsApp activity logged.",
      ),
      occurredAt: item.sentAt,
      type: "WHATSAPP",
      actorName: item.senderName || item.userName,
    })),
  ];

  return activityRows
    .sort(
      (left, right) =>
        new Date(right.occurredAt ?? 0).getTime() -
        new Date(left.occurredAt ?? 0).getTime(),
    )
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      time: item.occurredAt
        ? new Date(item.occurredAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      title: item.title,
      description: item.description,
      helper: [item.helper, item.actorName ? `by ${item.actorName}` : null]
        .filter(Boolean)
        .join(" · "),
      date: item.occurredAt
        ? new Date(item.occurredAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "-",
      icon: iconForTimelineType(item.type),
      tone: toneForTimelineType(item.type),
    }));
};

const mergeLiveLeadDetails = (
  baseData: LeadDetailsData,
  lead: LiveLeadRecord,
): LeadDetailsData => {
  const profileId = lead.displayId ?? lead.id;
  const leadLocation =
    lead.requirement?.preferredLocation ?? lead.preferredProjectLocation ?? "-";
  const siteVisits: SiteVisitItem[] = (lead.siteVisits ?? []).map((visit) => ({
    id: visit.displayId ?? visit.id,
    projectId: visit.projectId ?? undefined,
    unitId: visit.unitId ?? undefined,
    status: normalizeVisitStatus(visit.status),
    visitType: normalizeVisitType(visit.visitType),
    date: formatVisitDate(visit.scheduledAt),
    time: formatVisitTime(visit.scheduledAt),
    project: visit.projectName ?? "Assigned Project",
    unit: visit.unitLabel ?? "Unit pending",
    location: leadLocation,
    assignedExecutive:
      visit.assignedExecutiveName ??
      lead.fieldExecutiveName ??
      "Assigned Executive",
    duration: visit.durationMinutes ? `${visit.durationMinutes} Minutes` : "-",
    meetingPoint: visit.meetingPoint ?? "-",
    transportMode: visit.transportMode ?? "-",
    visitors: visit.visitorCount ? String(visit.visitorCount) : "1",
    specialRequest: visit.specialRequest ?? "",
    notes: visit.notes ?? "",
    feedback: visit.feedback ?? "",
    reminder: {
      enabled: Boolean(visit.reminderAt),
      date: formatVisitDate(visit.reminderAt),
      time: formatVisitTime(visit.reminderAt),
    },
    createdAt: formatDateTime(visit.scheduledAt),
  }));
  const latestFollowUp =
    lead.followUps?.find((item) => !item.completedAt) ?? lead.followUps?.[0];
  const bookings =
    lead.bookings?.map((booking) => ({
      id: booking.id,
      leadId: booking.leadId ?? lead.id,
      projectId: booking.projectId ?? undefined,
      unitId: booking.unitId ?? undefined,
      project: booking.projectName ?? "Project",
      unit: booking.unitLabel ?? "Unit pending",
      amount: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(booking.bookingAmount ?? booking.amount ?? 0),
      rawAmount: booking.bookingAmount ?? booking.amount ?? 0,
      date: formatVisitDate(booking.bookingDate),
      status: booking.status ?? "Scheduled",
    })) ?? [];
  const tasks =
    lead.tasks?.map((task) => ({
      id: task.id,
      title: task.title,
      type: task.type ?? "Task",
      priority: normalizeTaskPriority(task.priority),
      status: normalizeTaskStatus(task.status),
      dueDate: formatVisitDate(task.dueAt),
      assignedTo: task.assignedToName ?? "Unassigned",
      assignedToId: task.assignedToId ?? undefined,
    })) ?? [];
  const fullNotesList =
    lead.notes?.map((note) => ({
      id: note.id,
      text: safeValue(note.text, "Internal note"),
      author: safeValue(note.authorName, "Team Member"),
      authorRole: "CRM Note",
      date: formatDateTime(note.createdAt),
      isPinned: Boolean(note.isPinned),
      avatarUrl: note.authorImage ?? undefined,
    })) ?? [];
  const matchingProjects =
    lead.projectInterests?.map((item, index) => ({
      id: item.id ?? `${item.projectId ?? "project"}-${index}`,
      projectId: item.projectId ?? undefined,
      name: safeValue(item.projectName, "Project"),
      location: safeValue(item.projectLocation, "-"),
      matchScore: item.matchPercent ?? (item.isPrimary ? 90 : 75),
      configuration: safeValue(item.configuration, item.unitLabel ?? "-"),
      priceRange: safeValue(item.priceRange, "Price on request"),
      imageUrl: item.imageUrl ?? undefined,
    })) ?? [];
  const score = deriveScore(lead);
  const callCount = lead.callLogs?.length ?? 0;
  const whatsappCount = lead.whatsappLogs?.length ?? 0;
  const siteVisitCount = siteVisits.length;
  const totalEngagement = callCount + whatsappCount + siteVisitCount;
  const topBooking = bookings[0] ?? null;

  return {
    ...baseData,
    preferredProjectId: lead.requirement?.preferredProjectId ?? undefined,
    profile: {
      id: profileId,
      name: lead.name,
      avatarUrl: avatarUrlForName(lead.name),
      tag: safeValue(lead.priorityName ?? lead.stageName, "Lead").toUpperCase(),
      status: safeValue(lead.statusName, "Active"),
      phone: `${lead.mobileCountryCode ?? "+91"} ${lead.mobile ?? "-"}`,
      email: safeValue(lead.email),
      location: leadLocation,
      source: safeValue(lead.sourceName, "Unknown"),
      stage:
        lead.stageName ??
        (siteVisits[0]?.status === "Scheduled" ? "Site Visit" : "New Lead"),
      assignedTo:
        [
          lead.telecallerName ? `${lead.telecallerName} (Pre Sales Executive)` : null,
          lead.fieldExecutiveName
            ? `${lead.fieldExecutiveName} (Sales Executive)`
            : null,
          !lead.telecallerName && !lead.fieldExecutiveName && lead.ownerName
            ? `${lead.ownerName} (Admin)`
            : null,
        ]
          .filter(Boolean)
          .join(" • ") || "Unassigned",
      createdOn: resolvedDateTime(lead.createdAt, "-"),
      lastUpdated: resolvedDateTime(
        lead.updatedAt ?? latestFollowUp?.scheduledAt,
        "-",
      ),
      score,
      scoreLabel: safeValue(lead.leadScoreLabel, scoreLabelFor(score)),
      scoreBreakdown: lead.leadScoreBreakdown ?? [],
      conversion: conversionLabelFor(lead),
      conversionTone: conversionToneFor(score),
      revenue: topBooking?.amount ?? formatMoney(lead.requirement?.maxBudget),
      temperature: deriveTemperature(lead),
      engagement: `${
        totalEngagement
          ? Math.min(
              100,
              Math.max(
                10,
                Math.round(
                  ((siteVisitCount + callCount) / Math.max(totalEngagement, 1)) *
                    100,
                ),
              ),
            )
          : 0
      }%`,
    },
    about: [
      { label: "Full Name", value: safeValue(lead.name) },
      {
        label: "Mobile Number",
        value: safeValue(
          lead.mobile
            ? `${lead.mobileCountryCode ?? "+91"} ${lead.mobile}`
            : null,
        ),
      },
      {
        label: "Alternate Number",
        value: safeValue(
          lead.alternateMobile
            ? `${lead.alternateCountryCode ?? "+91"} ${lead.alternateMobile}`
            : null,
        ),
      },
      { label: "Email Address", value: safeValue(lead.email) },
      {
        label: "Occupation",
        value: safeValue(lead.requirement?.occupation, "Not captured"),
      },
      { label: "Address", value: safeValue(leadLocation, "Not captured") },
    ],
    requirements: [
      {
        label: "Property Type",
        value: safeValue(lead.requirement?.propertyType, "Not captured"),
        icon: Building2,
      },
      {
        label: "Budget Range",
        value: formatBudgetRange(
          lead.requirement?.budgetRange,
          lead.requirement?.minBudget,
          lead.requirement?.maxBudget,
        ),
        icon: WalletCards,
      },
      {
        label: "Preferred Location",
        value: safeValue(lead.requirement?.preferredLocation, "Not captured"),
        icon: MapPin,
      },
      {
        label: "Preferred Project",
        value: safeValue(lead.preferredProjectName, "Not selected"),
        icon: Tags,
      },
      {
        label: "Configuration",
        value: safeValue(lead.requirement?.configuration, "Not captured"),
        icon: BedDouble,
      },
      {
        label: "Zone",
        value: safeValue(lead.requirement?.zone, "Not captured"),
        icon: MapPin,
      },
      {
        label: "Carpet Area",
        value: formatAreaRange(
          lead.requirement?.carpetAreaRange,
          lead.requirement?.minArea,
          lead.requirement?.maxArea,
        ),
        icon: Ruler,
      },
      {
        label: "Possession Timeline",
        value: safeValue(lead.requirement?.possessionTimeline, "Not captured"),
        icon: CalendarCheck,
      },
      {
        label: "Floor Preference",
        value: "Not captured",
        icon: Bath,
      },
    ],
    amenities: [],
    campaign: [
      { label: "Lead Source", value: safeValue(lead.sourceName, "Unknown") },
      {
        label: "Campaign",
        value: safeValue(lead.campaignName, "Not captured"),
      },
      {
        label: "Reference",
        value: safeValue(lead.referenceBy, "Not captured"),
      },
      {
        label: "Heard About Us",
        value: safeValue(lead.heardAboutUs, "Not captured"),
      },
    ],
    notes: fullNotesList.map((note) => note.text),
    noteMeta: fullNotesList[0]
      ? `Last noted by ${fullNotesList[0].author} on ${fullNotesList[0].date}`
      : "No internal notes yet",
    timeline: buildOverviewTimeline(lead),
    engagement: totalEngagement
      ? [
          {
            label: "Calls",
            value: `${callCount} (${Math.round(
              (callCount / totalEngagement) * 100,
            )}%)`,
            color: "#2563eb",
          },
          {
            label: "WhatsApp",
            value: `${whatsappCount} (${Math.round(
              (whatsappCount / totalEngagement) * 100,
            )}%)`,
            color: "#22c55e",
          },
          {
            label: "Site Visits",
            value: `${siteVisitCount} (${Math.round(
              (siteVisitCount / totalEngagement) * 100,
            )}%)`,
            color: "#14b8a6",
          },
        ]
      : [],
    communication: [
      {
        label: "Total Calls",
        value: String(callCount),
        icon: Phone,
        tone: "bg-blue-50 text-blue-700",
      },
      {
        label: "Total WhatsApp",
        value: String(whatsappCount),
        icon: MessageCircle,
        tone: "bg-green-50 text-success",
      },
      {
        label: "Total Site Visits",
        value: String(siteVisitCount),
        icon: MapPin,
        tone: "bg-cyan-50 text-cyan-600",
      },
    ],
    documents:
      lead.documents?.map((document) => ({
        id: document.id,
        name: document.name ?? "Lead document",
        date: formatDateTime(document.createdAt),
        size:
          document.sizeBytes && Number.isFinite(document.sizeBytes)
            ? `${Math.max(document.sizeBytes / 1024 / 1024, 0.1).toFixed(1)} MB`
            : "Document",
      })) ?? [],
    booking: topBooking,
    bookingsList: bookings,
    followUp: latestFollowUp
      ? {
          id: latestFollowUp?.id ?? undefined,
          leadId: lead.id,
          date: formatVisitDate(latestFollowUp?.scheduledAt),
          time: formatVisitTime(latestFollowUp?.scheduledAt),
          due: getDueLabel(latestFollowUp?.scheduledAt),
          type:
            latestFollowUp?.typeName ?? latestFollowUp?.typeId ?? "Follow-up",
          assignedTo:
            latestFollowUp?.assignedToName ??
            latestFollowUp?.assignedToId ??
            "Unassigned",
          nextAction: latestFollowUp?.nextAction ?? "Follow up with lead",
          status:
            latestFollowUp?.statusName ?? latestFollowUp?.statusId ?? "Pending",
          notes: latestFollowUp?.notes ?? lead.remarks ?? "No notes added",
        }
      : null,
    tasksList: tasks,
    fullNotesList,
    matchingProjects,
    siteVisits: {
      stats: [
        {
          label: "Assigned Visits",
          value: String(siteVisits.length),
          helper: "Linked to this lead",
          tone: "bg-blue-50 text-blue-700",
        },
        {
          label: "Upcoming Visits",
          value: String(
            siteVisits.filter(
              (visit) =>
                visit.status === "Upcoming" || visit.status === "Scheduled",
            ).length,
          ),
          helper: "Next scheduled handoffs",
          tone: "bg-violet-50 text-violet-700",
        },
        {
          label: "Completed Visits",
          value: String(
            siteVisits.filter((visit) => visit.status === "Completed").length,
          ),
          helper: "Visited properties",
          tone: "bg-green-50 text-success",
        },
        {
          label: "Cancelled Visits",
          value: String(
            siteVisits.filter((visit) => visit.status === "Cancelled").length,
          ),
          helper: "Needs reschedule",
          tone: "bg-red-50 text-red-600",
        },
      ],
      coordinator: {
        name: safeValue(lead.telecallerName ?? lead.ownerName),
        role: lead.telecallerName ? "Pre Sales Executive" : "Lead Owner",
        phone: `${lead.mobileCountryCode ?? "+91"} ${lead.mobile ?? "-"}`,
        email: safeValue(lead.email),
      },
      upcoming: siteVisits[0]
        ? {
            date: siteVisits[0].date,
            time: siteVisits[0].time,
            property: siteVisits[0].project,
            location: siteVisits[0].location,
            status: siteVisits[0].status,
            assignedExecutive: siteVisits[0].assignedExecutive,
            executivePhone: "-",
            visitType: siteVisits[0].visitType,
          }
        : baseData.siteVisits.upcoming,
      selectedVisit: siteVisits[0]
        ? {
            project: siteVisits[0].project,
            unit: siteVisits[0].unit ?? "-",
            towerUnit: siteVisits[0].unit ?? "-",
            address: siteVisits[0].location,
            agenda: latestFollowUp?.nextAction ?? "Lead visit discussion",
            meetingPoint: siteVisits[0].meetingPoint ?? "-",
            notes: siteVisits[0].notes ?? "",
          }
        : baseData.siteVisits.selectedVisit,
      timeline: siteVisits.map((visit) => ({
        title: `${visit.visitType} • ${visit.project}`,
        time: `${visit.date}, ${visit.time}`,
        status: visit.status,
        tone:
          visit.status === "Completed"
            ? "bg-green-50 text-success"
            : visit.status === "Cancelled"
            ? "bg-red-50 text-red-600"
            : "bg-orange-50 text-primary",
      })),
      actions: [],
      visitedProperties: siteVisits
        .filter((visit) => visit.status === "Completed")
        .map((visit) => ({
          name: visit.project,
          location: `Visited on ${visit.date}`,
          configuration: visit.unit ?? "-",
          helper: "Completed",
          status: "Completed",
        })),
      recommendedProperties: matchingProjects.slice(0, 3).map((project) => ({
        name: project.name,
        location: project.location,
        configuration: project.configuration,
        helper: "View Details",
      })),
      visits: siteVisits,
    },
  };
};

function CircularScore({
  score,
  size = 112,
}: {
  score: number;
  size?: number;
}) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(#00a76f ${score * 3.6}deg, #e8edf4 0deg)`,
      }}
    >
      <div className="grid h-[72%] w-[72%] place-items-center rounded-full bg-white text-center">
        <span className="text-2xl font-extrabold leading-none text-secondary">
          {score}
        </span>
        <span className="-mt-3 text-[11px] font-bold text-secondary">/100</span>
      </div>
    </div>
  );
}

function LeadProfileSummary({
  data,
  leadTypeOptions,
  selectedLeadTypeId,
  leadTypePending,
  onLeadTypeChange,
}: {
  data: LeadDetailsData;
  leadTypeOptions: Array<{ label: string; value: string }>;
  selectedLeadTypeId: string;
  leadTypePending: boolean;
  onLeadTypeChange: (value: string) => void;
}) {
  const { profile } = data;
  const scoreFactors = profile.scoreBreakdown ?? [];

  return (
    <Card className="rounded-md border border-slate-200 bg-yellow-50 p-5 shadow-card">
      <div className="grid gap-5 xl:grid-cols-[minmax(360px,1.35fr)_minmax(260px,0.9fr)_190px_300px]">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Avatar className="h-28 w-28 shrink-0">
            <AvatarImage src={profile.avatarUrl} alt={profile.name} />
            <AvatarFallback>
              {profile.name
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Badge className="border-0 bg-orange-50 px-3 py-1 text-[11px] font-extrabold text-primary">
              {profile.tag}
            </Badge>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-extrabold tracking-normal text-secondary">
                {profile.name}
              </h1>
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-sm font-extrabold text-blue-700">
                {profile.id}
              </span>
              <Badge className="border-0 bg-blue-50 px-2 py-1 text-xs font-extrabold text-blue-700">
                {profile.status}
              </Badge>
            </div>
            <div className="mt-4 space-y-3 text-sm font-semibold text-secondary">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-blue-700" />
                {profile.phone}
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-700" />
                {profile.email}
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-700" />
                {profile.location}
              </p>
            </div>
            <p className="mt-4 text-sm font-bold text-secondary">
              Lead Source:{" "}
              <Badge className="ml-2 border-0 bg-red-50 text-red-600">
                {profile.source}
              </Badge>
            </p>
          </div>
        </div>

        <div className="border-slate-200 xl:border-l xl:pl-6">
          {[
            ["Lead Stage", profile.stage],
            ["Lead Status", profile.status],
            ["Assigned To", profile.assignedTo],
            ["Created On", profile.createdOn],
            ["Last Updated", profile.lastUpdated],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[105px_minmax(0,1fr)] gap-4 py-2 text-sm"
            >
              <span className="font-semibold text-muted-foreground">
                {label}
              </span>
              <span className="font-extrabold text-secondary">{value}</span>
            </div>
          ))}
        </div>

        <div className="grid place-items-center rounded-md border border-slate-200 p-4 text-center">
          <p className="mb-3 text-sm font-extrabold text-secondary">
            Lead Score
          </p>
          <CircularScore score={profile.score} />
          <Badge className="mt-3 border-0 bg-green-50 text-success">
            {profile.scoreLabel}
          </Badge>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-auto p-0 text-xs font-bold text-blue-700 hover:bg-transparent hover:text-blue-800 hover:underline"
              >
                View Scoring Logic
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-white border border-slate-200 p-6 rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold text-secondary">
                  How is this score calculated?
                </DialogTitle>
                <DialogDescription className="text-xs font-semibold text-muted-foreground">
                  The score is calculated from active Lead Master score weights.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-3 rounded-md border border-slate-100 bg-slate-50 p-4">
                {scoreFactors.length ? (
                  scoreFactors.map((factor) => (
                    <div
                      key={`${factor.category}-${factor.label}`}
                      className="flex justify-between gap-4 text-sm font-semibold text-secondary"
                    >
                      <span className="min-w-0">
                        {factor.category}:{" "}
                        <span className="font-extrabold">{factor.label}</span>
                      </span>
                      <span className="font-extrabold text-success">
                        +{factor.score}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold text-muted-foreground">
                    No active master score matched this lead yet.
                  </p>
                )}
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-sm font-extrabold text-secondary">
                  <span>Total Score</span>
                  <span>{profile.score}/100</span>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border border-slate-200 p-4">
          <div className="flex items-center justify-between border-b border-slate-100 py-3.5">
            <span className="text-sm font-semibold text-muted-foreground">
              Estimated Conversion
            </span>
            <span className="text-base font-extrabold text-secondary">
              {profile.conversion}{" "}
              <span className="ml-2 text-xs font-extrabold text-primary">
                {profile.conversionTone}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 py-3.5">
            <span className="text-sm font-semibold text-muted-foreground">
              Estimated Revenue
            </span>
            <span className="text-base font-extrabold text-secondary">
              {profile.revenue}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-100 py-3.5">
            <span className="text-sm font-semibold text-muted-foreground">
              Lead Type
            </span>
            <Select
              value={selectedLeadTypeId}
              onValueChange={onLeadTypeChange}
              disabled={leadTypePending}
            >
              <SelectTrigger className="h-8 w-[125px] rounded-md border-slate-200 text-xs font-extrabold shadow-none">
                <SelectValue placeholder={profile.temperature} />
              </SelectTrigger>
              <SelectContent>
                {leadTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      {option.label.toLowerCase().includes("hot") ? (
                        <Flame className="h-3.5 w-3.5 text-primary" />
                      ) : null}
                      {option.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between pt-3.5">
            <span className="text-sm font-semibold text-muted-foreground">
              Engagement Score
            </span>
            <span className="text-base font-extrabold text-secondary">
              {profile.engagement}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function DetailTabs({
  activeTab,
  onTabChange,
  tabs = leadDetailsTabs,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: string[];
}) {
  return (
    <div className="overflow-x-auto border-b border-slate-200">
      <div className="flex min-w-max gap-8 px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabChange(tab)}
            className={cn(
              "border-b-2 px-1 py-4 text-sm font-extrabold transition-colors",
              tab === activeTab
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:text-primary",
            )}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

function LeadSlaSummaryCard({ data }: { data: LeadDetailsData }) {
  const hasOverdueFollowUp = data.followUp?.due
    .toLowerCase()
    .includes("overdue");
  const hasDueTodayFollowUp = data.followUp?.due
    .toLowerCase()
    .includes("today");

  const status: SlaStatus = hasOverdueFollowUp
    ? "breached"
    : hasDueTodayFollowUp
    ? "due-soon"
    : "on-time";

  const deadlineLabel = hasOverdueFollowUp
    ? `Follow-up breached on ${data.followUp?.date}`
    : data.followUp
    ? `Follow-up: ${data.followUp.date} ${data.followUp.time}`
    : "Within configured SLA";

  const ownerName = data.profile.assignedTo || "Unassigned";
  const responseTimeLabel = "12m 00s"; // Note: Actual first response time calculation requires detailed audit logs
  const breachDuration = hasOverdueFollowUp ? "Active Breach" : null;
  const escalationRequired = Boolean(hasOverdueFollowUp);
  const lastActivityLabel = data.timeline[0]?.title ?? "No SLA event recorded";

  const sla = {
    status,
    deadlineLabel,
    ownerName,
    responseTimeLabel,
    breachDuration,
    lastActivityLabel,
    escalationRequired,
  };

  return (
    <Card className="rounded-md border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-secondary">
            SLA Summary
          </h2>
          <p className="text-xs font-semibold text-muted-foreground">
            Operational response and follow-up health
          </p>
        </div>
        <SlaBadge status={sla.status} />
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,11rem),1fr))]">
        <div>
          <p className="text-[11px] font-bold text-muted-foreground">
            Current Status
          </p>
          <p className="mt-1 text-sm font-extrabold text-secondary">
            {sla.deadlineLabel}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground">
            First Response
          </p>
          <p className="mt-1 text-sm font-extrabold text-secondary">
            {sla.responseTimeLabel}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground">Owner</p>
          <p className="mt-1 text-sm font-extrabold text-secondary">
            {sla.ownerName}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground">
            Breach Duration
          </p>
          <p className="mt-1 text-sm font-extrabold text-secondary">
            {sla.breachDuration ?? "No active breach"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold text-muted-foreground">
            Last SLA Activity
          </p>
          <p className="mt-1 text-sm font-extrabold text-secondary">
            {sla.lastActivityLabel}
          </p>
        </div>
      </div>
      {sla.escalationRequired ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-600">
          Escalation required because this lead has an active SLA breach.
        </div>
      ) : null}
    </Card>
  );
}

export function LeadDetailsScreen() {
  const location = useLocation();
  const fieldExecutiveRoute = isFieldExecutivePath(location.pathname);
  const telecallerRoute = location.pathname.startsWith("/telecaller/");
  const [activeTab, setActiveTab] = useState(
    fieldExecutiveRoute ? "Site Visits" : "Overview",
  );
  const [siteVisitOpen, setSiteVisitOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [editLeadOpen, setEditLeadOpen] = useState(false);
  const [assignLeadOpen, setAssignLeadOpen] = useState(false);
  const [selectedTelecallerId, setSelectedTelecallerId] = useState("");
  const [selectedFieldExecutiveId, setSelectedFieldExecutiveId] = useState("");
  const [assignmentIntent, setAssignmentIntent] = useState<
    "assign" | "reassign"
  >("assign");
  const { leadId } = useParams();
  const navigate = useNavigate();
  const defaultData = useMemo(() => createEmptyLeadDetails(leadId), [leadId]);
  const filterOptionsQuery = useLeadListFilterOptions();
  const bulkAssign = useBulkAssignSelectedLeads();
  const queryClient = useQueryClient();
  const leadQuery = useQuery<LiveLeadRecord>({
    queryKey: ["lead-details", leadId, fieldExecutiveRoute, telecallerRoute],
    queryFn: async () => (await api.get(`/leads/${leadId}`)).data,
    enabled: Boolean(leadId),
  });
  const data = useMemo(
    () =>
      leadQuery.data
        ? mergeLiveLeadDetails(defaultData, leadQuery.data)
        : defaultData,
    [defaultData, leadQuery.data],
  );
  const resolvedLeadId = leadQuery.data?.id ?? leadId ?? data.profile.id;
  const updateLeadType = useMutation({
    mutationFn: async (temperatureId: string) =>
      (await api.patch(`/leads/${resolvedLeadId}`, { temperatureId })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["lead-details"] });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
      await leadQuery.refetch();
      toast.success("Lead type updated");
    },
    onError: () => toast.error("Could not update lead type"),
  });
  const telecallerSearchOptions = useMemo(
    () =>
      filterOptionsQuery.options.telecallerOptions.map((option) => ({
        label: option.label,
        value: option.value,
        avatarUrl: option.image,
        description: option.role?.replace(/_/g, " "),
      })),
    [filterOptionsQuery.options.telecallerOptions],
  );
  const optionalFieldExecutiveSearchOptions = useMemo(
    () => [
      {
        label: "Not assigned",
        value: "",
        description: "Assign a sales executive later",
      },
      ...filterOptionsQuery.options.ownerOptions
        .filter((option) => option.role === "SALES_AGENT")
        .map((option) => ({
          label: option.label,
          value: option.value,
          avatarUrl: option.image,
          description: option.role?.replace(/_/g, " "),
        })),
    ],
    [filterOptionsQuery.options.ownerOptions],
  );
  const telecallerOptionLookup = useMemo(
    () =>
      new Map(telecallerSearchOptions.map((option) => [option.value, option])),
    [telecallerSearchOptions],
  );
  const fieldExecutiveOptionLookup = useMemo(
    () =>
      new Map(
        optionalFieldExecutiveSearchOptions.map((option) => [
          option.value,
          option,
        ]),
      ),
    [optionalFieldExecutiveSearchOptions],
  );
  const currentTelecallerName =
    leadQuery.data?.telecallerName?.trim() || "Not assigned";
  const currentFieldExecutiveName =
    leadQuery.data?.fieldExecutiveName?.trim() || "Not assigned yet";
  const backTo =
    typeof location.state === "object" &&
    location.state &&
    "from" in location.state &&
    typeof location.state.from === "string"
      ? location.state.from
      : fieldExecutiveRoute
      ? "/field-executive/leads"
      : telecallerRoute
      ? "/telecaller/leads/my"
      : "/leads/all";
  const visibleTabs = fieldExecutiveRoute
    ? fieldExecutiveTabs
    : leadDetailsTabs;
  const followUpLeadTarget: LeadActionTarget = {
    id: resolvedLeadId,
    name: data.profile.name,
    mobile: data.profile.phone,
    requirement:
      leadQuery.data?.requirement?.configuration ||
      leadQuery.data?.requirement?.propertyType ||
      leadQuery.data?.requirement?.preferredLocation ||
      undefined,
    ownerId: leadQuery.data?.ownerId ?? undefined,
    telecallerId: leadQuery.data?.telecallerId ?? undefined,
    fieldExecutiveId: leadQuery.data?.fieldExecutiveId ?? undefined,
    preferredProjectId:
      leadQuery.data?.requirement?.preferredProjectId ?? undefined,
  };

  const closeAssignLeadModal = () => {
    setAssignLeadOpen(false);
    setSelectedTelecallerId("");
    setSelectedFieldExecutiveId("");
    setAssignmentIntent("assign");
  };

  const handleAssignLead = async () => {
    const currentTelecallerId = leadQuery.data?.telecallerId ?? "";
    const currentFieldExecutiveId = leadQuery.data?.fieldExecutiveId ?? "";
    const effectiveAssignments: Array<{
      toUserId: string;
      assigneeType: "telecaller" | "field-executive";
      fromName: string;
      toName: string;
      verb: "assigned" | "reassigned";
      roleLabel: string;
    }> = [];

    if (!selectedTelecallerId && !selectedFieldExecutiveId) {
      toast.error("Select a Pre Sales user or sales executive");
      return;
    }

    if (selectedTelecallerId && selectedTelecallerId !== currentTelecallerId) {
      if (assignmentIntent === "assign" && currentTelecallerId) {
        toast.error(
          "This lead already has a Pre Sales user. Switch to reassign to replace them.",
        );
        return;
      }
      effectiveAssignments.push({
        toUserId: selectedTelecallerId,
        assigneeType: "telecaller",
        fromName: currentTelecallerName,
        toName:
          telecallerOptionLookup.get(selectedTelecallerId)?.label ??
          "Selected Pre Sales Executive user",
        verb: currentTelecallerId ? "reassigned" : "assigned",
        roleLabel: "Pre Sales Executive",
      });
    }

    if (
      selectedFieldExecutiveId &&
      selectedFieldExecutiveId !== currentFieldExecutiveId
    ) {
      if (assignmentIntent === "assign" && currentFieldExecutiveId) {
        toast.error(
          "This lead already has a sales executive. Switch to reassign to replace them.",
        );
        return;
      }
      effectiveAssignments.push({
        toUserId: selectedFieldExecutiveId,
        assigneeType: "field-executive",
        fromName: currentFieldExecutiveName,
        toName:
          fieldExecutiveOptionLookup.get(selectedFieldExecutiveId)?.label ??
          "Selected sales executive",
        verb: currentFieldExecutiveId ? "reassigned" : "assigned",
        roleLabel: "Sales executive",
      });
    }

    if (!effectiveAssignments.length) {
      toast.error("No assignment changes selected");
      return;
    }

    try {
      await bulkAssign.mutateAsync({
        leadIds: [resolvedLeadId],
        assignments: effectiveAssignments.map(({ toUserId, assigneeType }) => ({
          toUserId,
          assigneeType,
        })),
        strategy:
          assignmentIntent === "reassign" ? "manual-reassignment" : "manual",
        reason:
          assignmentIntent === "reassign"
            ? "Lead reassigned from lead details"
            : "Lead assigned from lead details",
      });
      const successMessage = effectiveAssignments
        .map((assignment) =>
          assignment.verb === "reassigned"
            ? `${assignment.roleLabel} reassigned from ${assignment.fromName} to ${assignment.toName}`
            : `${assignment.roleLabel} assigned to ${assignment.toName}`,
        )
        .join("; ");
      closeAssignLeadModal();
      toast.success(successMessage);
    } catch {
      toast.error("Could not assign lead");
    }
  };

  useEffect(() => {
    const openFromState =
      typeof location.state === "object" &&
      location.state &&
      "openEditLead" in location.state &&
      location.state.openEditLead === true;

    if (!openFromState) {
      return;
    }

    setEditLeadOpen(true);
    navigate(
      { pathname: location.pathname, search: location.search },
      {
        replace: true,
        state:
          typeof location.state === "object" && location.state
            ? Object.fromEntries(
                Object.entries(location.state).filter(
                  ([key]) => key !== "openEditLead",
                ),
              )
            : null,
      },
    );
  }, [location.pathname, location.search, location.state, navigate]);

  useDashboardLayout(
    {
      sidebar: {
        sidebarItems: fieldExecutiveRoute
          ? fieldExecutiveSidebarItems
          : telecallerRoute
          ? telecallerSidebarItems
          : addLeadSidebarItems,
        activeItem: fieldExecutiveRoute
          ? "My Leads"
          : telecallerRoute
          ? "Lead Management"
          : "Lead Management",
        activeChild: telecallerRoute
          ? "My Leads"
          : fieldExecutiveRoute
          ? undefined
          : "All Leads",
      },
      header: {
        breadcrumbs: (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <span>Dashboard</span>
            <ChevronRight className="size-3.5" />
            <span>
              {fieldExecutiveRoute
                ? "Field Operations"
                : telecallerRoute
                ? "Lead Management"
                : "Lead Management"}
            </span>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Lead Details</span>
          </div>
        ),
        headerContent: (
          <div className="flex items-center gap-3 w-full">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search leads"
                placeholder="Search leads, customers, projects, mobile number..."
                className="h-10 rounded-md border-slate-200 pl-11 pr-14 text-sm font-semibold shadow-none bg-white"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-extrabold text-muted-foreground">
                ⌘ K
              </span>
            </div>
          </div>
        ),
      },
    },
    [fieldExecutiveRoute, telecallerRoute],
  );

  if (leadQuery.isLoading) {
    return (
      <WorkspacePage className="text-sm font-semibold text-muted-foreground">
        Loading lead details...
      </WorkspacePage>
    );
  }

  return (
    <>
      <WorkspacePage>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
            onClick={() => navigate(backTo)}
          >
            <ArrowLeft className="h-4 w-4" />
            {fieldExecutiveRoute ? "Back to My Leads" : "Back to Leads"}
          </Button>
          {!fieldExecutiveRoute && !telecallerRoute ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
              onClick={() => setEditLeadOpen(true)}
            >
              <Edit3 className="h-4 w-4" />
              Edit Lead
            </Button>
          ) : null}
          {!fieldExecutiveRoute && !telecallerRoute ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
              onClick={() => setAssignLeadOpen(true)}
            >
              <UserRoundPlus className="h-4 w-4" />
              Assign Lead
            </Button>
          ) : null}
          {fieldExecutiveRoute ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
              onClick={() =>
                navigate(buildFieldExecutiveLeadSiteVisitsPath(resolvedLeadId))
              }
            >
              <MapPin className="h-4 w-4" />
              Site Visits
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md px-4 text-xs font-extrabold shadow-none"
              onClick={() => setSiteVisitOpen(true)}
            >
              <MapPin className="h-4 w-4" />
              Create Site Visit
            </Button>
          )}
          {!fieldExecutiveRoute ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-md shadow-none"
              aria-label="More lead actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <LeadProfileSummary
          data={data}
          leadTypeOptions={filterOptionsQuery.options.leadTypeOptions}
          selectedLeadTypeId={leadQuery.data?.temperatureId ?? ""}
          leadTypePending={updateLeadType.isPending}
          onLeadTypeChange={(value) => updateLeadType.mutate(value)}
        />
        {!fieldExecutiveRoute ? <LeadSlaSummaryCard data={data} /> : null}
        <DetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={visibleTabs}
        />

        {activeTab === "Activities Timeline" ? (
          <ActivitiesTimelineTab />
        ) : activeTab === "Site Visits" ? (
          <SiteVisitsTab
            data={data}
            leadId={resolvedLeadId}
            onManageVisits={() =>
              navigate(
                fieldExecutiveRoute
                  ? buildFieldExecutiveLeadSiteVisitsPath(resolvedLeadId)
                  : `/leads/${resolvedLeadId}/site-visits`,
              )
            }
          />
        ) : activeTab === "Bookings" ? (
          <BookingsTab data={data} leadId={resolvedLeadId} />
        ) : activeTab === "Notes" ? (
          <NotesTab data={data} leadId={resolvedLeadId} />
        ) : (
          <OverviewTab
            data={data}
            leadId={resolvedLeadId}
            onViewFullTimeline={() => setActiveTab("Activities Timeline")}
          />
        )}
      </WorkspacePage>
      {!fieldExecutiveRoute ? (
        <CreateSiteVisitActionDialog
          lead={{
            id: resolvedLeadId,
            name: data.profile.name,
            mobile: data.profile.phone,
          }}
          open={siteVisitOpen}
          onOpenChange={setSiteVisitOpen}
        />
      ) : null}
      <CreateFollowUpDialog
        lead={followUpLeadTarget}
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
      />
      {!fieldExecutiveRoute && !telecallerRoute ? (
        <Dialog
          open={assignLeadOpen}
          onOpenChange={(open) => {
            if (!open) {
              closeAssignLeadModal();
              return;
            }
            setAssignLeadOpen(true);
          }}
        >
          <DialogContent className="max-w-xl overflow-visible rounded-xl bg-white p-0">
            <DialogHeader className="border-b border-slate-100 px-6 py-5">
              <DialogTitle className="text-lg font-extrabold text-secondary">
                Assign Lead To
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 px-6 py-5">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-extrabold text-secondary">
                    Assignment intent
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    Choose whether you are adding a missing owner or replacing
                    the current assignee for this lead.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentIntent("assign")}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      assignmentIntent === "assign"
                        ? "border-primary bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <p className="text-sm font-extrabold text-secondary">
                      Assign
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Use this when the role is still unassigned.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentIntent("reassign")}
                    className={cn(
                      "rounded-xl border px-4 py-3 text-left transition-colors",
                      assignmentIntent === "reassign"
                        ? "border-primary bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300",
                    )}
                  >
                    <p className="text-sm font-extrabold text-secondary">
                      Reassign
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      Use this when you want a from-to transfer recorded in the
                      activity timeline.
                    </p>
                  </button>
                </div>
              </div>
              {assignmentIntent === "reassign" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-normal text-muted-foreground">
                      Current Pre Sales
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-secondary">
                      {currentTelecallerName}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-normal text-muted-foreground">
                      Current site visit owner
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-secondary">
                      {currentFieldExecutiveName}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Pre Sales
                  </span>
                  <SearchableSelect
                    value={selectedTelecallerId}
                    onValueChange={setSelectedTelecallerId}
                    options={telecallerSearchOptions}
                    placeholder="Select Pre Sales"
                    searchPlaceholder="Search Pre Sales..."
                    noOptionsText="No Pre Sales users found"
                    className="h-11 bg-white"
                    contentClassName="min-w-[300px]"
                    modal={false}
                    portaled={false}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-extrabold text-secondary">
                    Sales Executive
                  </span>
                  <SearchableSelect
                    value={selectedFieldExecutiveId}
                    onValueChange={setSelectedFieldExecutiveId}
                    options={optionalFieldExecutiveSearchOptions}
                    placeholder="Not assigned"
                    searchPlaceholder="Search sales executive..."
                    noOptionsText="No sales executives found"
                    className="h-11 bg-white"
                    contentClassName="min-w-[300px]"
                    modal={false}
                    portaled={false}
                  />
                </label>
              </div>
              <p className="text-xs font-semibold text-muted-foreground">
                You can update one role or both roles in the same action. If a
                role is already occupied, switch to reassign before replacing
                that assignee.
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={closeAssignLeadModal}
              >
                Close
              </Button>
              <Button
                type="button"
                disabled={bulkAssign.isPending}
                onClick={handleAssignLead}
              >
                Assign Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
      {!fieldExecutiveRoute && !telecallerRoute ? (
        <EditLeadModal
          leadId={resolvedLeadId}
          open={editLeadOpen}
          onOpenChange={setEditLeadOpen}
        />
      ) : null}
    </>
  );
}
