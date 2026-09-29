import type { LucideIcon } from "lucide-react";

export interface LabelValue {
  label: string;
  value: string;
}

export interface LeadDetailsProfile {
  id: string;
  name: string;
  avatarUrl: string;
  tag: string;
  status: string;
  phone: string;
  email: string;
  location: string;
  source: string;
  stage: string;
  assignedTo: string;
  createdOn: string;
  lastUpdated: string;
  score: number;
  scoreLabel: string;
  scoreBreakdown?: Array<{
    category: string;
    label: string;
    score: number;
  }>;
  conversion: string;
  conversionTone: string;
  revenue: string;
  temperature: string;
  engagement: string;
}

export interface PropertyRequirement {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface TimelineItem {
  id: string;
  time: string;
  title: string;
  description: string;
  date: string;
  helper?: string;
  icon: LucideIcon;
  tone: string;
}

export interface EngagementSegment {
  label: string;
  value: string;
  color: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  date: string;
  size: string;
}

export interface BookingSummary {
  project: string;
  unit: string;
  amount: string;
  date: string;
  id: string;
  status: string;
  leadId?: string;
  projectId?: string;
  unitId?: string;
  rawAmount?: number;
}

export interface FollowUpSummary {
  id?: string;
  leadId?: string;
  date: string;
  time: string;
  due: string;
  type: string;
  assignedTo: string;
  nextAction?: string;
  status?: string;
  notes: string;
}

export interface SiteVisitStat {
  label: string;
  value: string;
  helper: string;
  tone: string;
}

export interface SiteVisitCoordinator {
  name: string;
  role: string;
  phone: string;
  email: string;
}

export interface UpcomingSiteVisit {
  date: string;
  time: string;
  property: string;
  location: string;
  status: string;
  assignedExecutive: string;
  executivePhone: string;
  visitType: string;
}

export interface SelectedVisitDetails {
  project: string;
  unit: string;
  towerUnit: string;
  address: string;
  agenda: string;
  meetingPoint: string;
  notes: string;
}

export interface SiteVisitTimelineItem {
  title: string;
  time: string;
  status: string;
  tone: string;
}

export interface SiteVisitProperty {
  name: string;
  location: string;
  configuration: string;
  helper: string;
  status?: string;
}

export interface SiteVisitAction {
  label: string;
  primary?: boolean;
}

export type SiteVisitStatus =
  | "Upcoming"
  | "Scheduled"
  | "Completed"
  | "Cancelled";

export interface SiteVisitReminder {
  enabled: boolean;
  date: string;
  time: string;
}

export interface SiteVisitItem {
  id: string;
  projectId?: string;
  unitId?: string;
  status: SiteVisitStatus;
  visitType: "Site Visit" | "Re-Visit" | "Virtual Visit";
  date: string;
  time: string;
  project: string;
  unit?: string;
  location: string;
  assignedExecutive: string;
  duration: string;
  meetingPoint?: string;
  transportMode?: string;
  visitors?: string;
  specialRequest?: string;
  notes?: string;
  feedback?: string;
  rating?: number | null;
  reminder: SiteVisitReminder;
  createdAt: string;
}

export interface SiteVisitsData {
  stats: SiteVisitStat[];
  coordinator: SiteVisitCoordinator;
  upcoming: UpcomingSiteVisit;
  selectedVisit: SelectedVisitDetails;
  timeline: SiteVisitTimelineItem[];
  actions: SiteVisitAction[];
  visitedProperties: SiteVisitProperty[];
  recommendedProperties: SiteVisitProperty[];
  visits: SiteVisitItem[];
}

export interface TaskItem {
  id: string;
  title: string;
  type: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Completed" | "Overdue";
  dueDate: string;
  assignedTo: string;
  assignedToId?: string;
}

export interface PaymentItem {
  id: string;
  amount: string;
  date: string;
  status: "Paid" | "Pending" | "Overdue";
  method: string;
  receiptId?: string;
}

export interface NoteItem {
  id: string;
  text: string;
  author: string;
  authorRole: string;
  date: string;
  isPinned?: boolean;
  avatarUrl?: string;
}

export interface MatchingProject {
  id: string;
  projectId?: string;
  name: string;
  location: string;
  matchScore: number;
  configuration: string;
  priceRange: string;
  imageUrl?: string;
}

export interface LeadDetailsData {
  profile: LeadDetailsProfile;
  preferredProjectId?: string;
  about: LabelValue[];
  requirements: PropertyRequirement[];
  amenities: string[];
  campaign: LabelValue[];
  notes: string[];
  noteMeta: string;
  timeline: TimelineItem[];
  engagement: EngagementSegment[];
  communication: Array<LabelValue & { icon: LucideIcon; tone: string }>;
  documents: DocumentItem[];
  booking: BookingSummary | null;
  bookingsList?: BookingSummary[];
  followUp: FollowUpSummary | null;
  siteVisits: SiteVisitsData;
  tasksList?: TaskItem[];
  paymentsList?: PaymentItem[];
  fullNotesList?: NoteItem[];
  matchingProjects?: MatchingProject[];
}
