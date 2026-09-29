import type { SlaMetricCard, SlaSignal } from "./slaTypes";

const adminLeadSignals: Record<string, SlaSignal> = {
  TR001245: {
    status: "on-time",
    deadlineLabel: "First response in 11 min",
    ownerName: "Sneha Iyer",
    escalationRequired: false,
    responseTimeLabel: "06m 18s",
    lastActivityLabel: "Follow-up completed today",
  },
  TR001244: {
    status: "due-soon",
    deadlineLabel: "Follow-up due in 45 min",
    ownerName: "Vikram Singh",
    escalationRequired: false,
    responseTimeLabel: "13m 42s",
    lastActivityLabel: "Waiting for brochure reply",
  },
  TR001243: {
    status: "on-time",
    deadlineLabel: "Site visit SLA due tomorrow",
    ownerName: "Aditya Patil",
    escalationRequired: false,
    responseTimeLabel: "09m 10s",
    lastActivityLabel: "Visit slot confirmed",
  },
  TR001242: {
    status: "due-soon",
    deadlineLabel: "Proposal follow-up due today",
    ownerName: "Pooja Sharma",
    escalationRequired: true,
    responseTimeLabel: "17m 05s",
    lastActivityLabel: "Proposal sent, no acknowledgment",
  },
  TR001241: {
    status: "breached",
    deadlineLabel: "Response breached at 09:30 AM",
    breachDuration: "1h 20m",
    ownerName: "Rahul Mehta",
    escalationRequired: true,
    responseTimeLabel: "28m 40s",
    lastActivityLabel: "No callback after missed connect",
  },
  TR001240: {
    status: "on-time",
    deadlineLabel: "Next follow-up tomorrow",
    ownerName: "Sneha Iyer",
    escalationRequired: false,
    responseTimeLabel: "10m 54s",
    lastActivityLabel: "Lead acknowledged on WhatsApp",
  },
  TR001239: {
    status: "due-soon",
    deadlineLabel: "Negotiation check-in due in 2h",
    ownerName: "Aditya Patil",
    escalationRequired: false,
    responseTimeLabel: "14m 25s",
    lastActivityLabel: "Pricing objection pending",
  },
  TR001238: {
    status: "breached",
    deadlineLabel: "Follow-up breached yesterday",
    breachDuration: "18h 10m",
    ownerName: "Vikram Singh",
    escalationRequired: true,
    responseTimeLabel: "31m 06s",
    lastActivityLabel: "No contact since last reminder",
  },
};

const telecallerLeadSignals: Record<string, SlaSignal> = {
  LTR1250: {
    status: "due-soon",
    deadlineLabel: "Due in 30 mins",
    ownerName: "Amit Kumar",
    escalationRequired: false,
    responseTimeLabel: "07m 25s",
    lastActivityLabel: "Call queued for today",
  },
  LTR1249: {
    status: "on-time",
    deadlineLabel: "Due in 3h 30m",
    ownerName: "Amit Kumar",
    escalationRequired: false,
    responseTimeLabel: "09m 42s",
    lastActivityLabel: "Brochure opened by lead",
  },
  LTR1248: {
    status: "on-time",
    deadlineLabel: "Tomorrow, 10:00 AM",
    ownerName: "Amit Kumar",
    escalationRequired: false,
    responseTimeLabel: "11m 08s",
    lastActivityLabel: "New lead waiting for first call",
  },
  LTR1247: {
    status: "due-soon",
    deadlineLabel: "Tomorrow, 04:00 PM",
    ownerName: "Amit Kumar",
    escalationRequired: false,
    responseTimeLabel: "15m 10s",
    lastActivityLabel: "Follow-up scheduled",
  },
  LTR1246: {
    status: "breached",
    deadlineLabel: "Breached 1 day ago",
    breachDuration: "1d 02h",
    ownerName: "Amit Kumar",
    escalationRequired: true,
    responseTimeLabel: "24m 35s",
    lastActivityLabel: "No response from lead",
  },
  LTR1245: {
    status: "on-time",
    deadlineLabel: "24 May 2025, 12:00 PM",
    ownerName: "Amit Kumar",
    escalationRequired: false,
    responseTimeLabel: "08m 48s",
    lastActivityLabel: "Lead marked not interested",
  },
  LTR1244: {
    status: "on-time",
    deadlineLabel: "22 May 2025, 03:00 PM",
    ownerName: "Amit Kumar",
    escalationRequired: false,
    responseTimeLabel: "10m 11s",
    lastActivityLabel: "Interested lead awaiting brochure",
  },
  LTR1243: {
    status: "due-soon",
    deadlineLabel: "23 May 2025, 11:00 AM",
    ownerName: "Amit Kumar",
    escalationRequired: false,
    responseTimeLabel: "12m 02s",
    lastActivityLabel: "New lead not yet qualified",
  },
};

export const adminDashboardSlaMetrics: SlaMetricCard[] = [
  {
    label: "Breached Today",
    value: "27",
    helper: "Needs manager action",
    status: "breached",
    to: "/leads/follow-up",
  },
  {
    label: "At Risk",
    value: "14",
    helper: "Due in next 60 mins",
    status: "due-soon",
    to: "/leads/all",
  },
  {
    label: "Within SLA",
    value: "66.2%",
    helper: "Across active lead queue",
    status: "on-time",
    to: "/leads/all",
  },
  {
    label: "Avg First Response",
    value: "18m 42s",
    helper: "6m faster than last week",
    to: "/leads/follow-up",
  },
];

export const telecallerDashboardSlaMetrics: SlaMetricCard[] = [
  {
    label: "Overdue Follow-ups",
    value: "06",
    helper: "Requires immediate action",
    status: "breached",
    to: "/telecaller/leads/my",
  },
  {
    label: "Due In Next Hour",
    value: "04",
    helper: "Prioritize these first",
    status: "due-soon",
    to: "/telecaller/leads/my",
  },
  {
    label: "Missed SLA",
    value: "03",
    helper: "Escalate if not resolved",
    status: "breached",
    to: "/telecaller/leads/my",
  },
  {
    label: "Needs Immediate Response",
    value: "08",
    helper: "High-intent live queue",
    status: "on-time",
    to: "/telecaller/leads/my",
  },
];

export const followUpQueueSlaMetrics: SlaMetricCard[] = [
  {
    label: "Overdue",
    value: "23",
    helper: "Breached follow-ups",
    status: "breached",
  },
  {
    label: "Due Soon",
    value: "19",
    helper: "Next 60 minutes",
    status: "due-soon",
  },
  {
    label: "Escalation Required",
    value: "07",
    helper: "Manager attention",
    status: "breached",
  },
];

export const telecallerPerformanceSlaMetrics: SlaMetricCard[] = [
  {
    label: "Avg Response Time",
    value: "08m 14s",
    helper: "Faster than team average",
  },
  {
    label: "On-time Follow-up %",
    value: "91%",
    helper: "This week",
    status: "on-time",
  },
  {
    label: "Breaches",
    value: "03",
    helper: "Open SLA misses",
    status: "breached",
  },
];

export function getAdminLeadSla(leadId: string): SlaSignal {
  return (
    adminLeadSignals[leadId] ?? {
      status: "on-time",
      deadlineLabel: "Within configured SLA",
      ownerName: "Unassigned",
      escalationRequired: false,
      responseTimeLabel: "12m 00s",
      lastActivityLabel: "No SLA event recorded",
    }
  );
}

export function getTelecallerLeadSla(leadId: string): SlaSignal {
  return (
    telecallerLeadSignals[leadId] ?? {
      status: "on-time",
      deadlineLabel: "Within configured SLA",
      ownerName: "Current owner",
      escalationRequired: false,
      responseTimeLabel: "10m 00s",
      lastActivityLabel: "No SLA event recorded",
    }
  );
}
