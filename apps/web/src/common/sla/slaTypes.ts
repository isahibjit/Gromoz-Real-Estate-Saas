export type SlaStatus = "on-time" | "due-soon" | "breached";

export interface SlaSignal {
  status: SlaStatus;
  deadlineLabel: string;
  breachDuration?: string;
  ownerName: string;
  escalationRequired: boolean;
  responseTimeLabel: string;
  lastActivityLabel: string;
}

export interface SlaMetricCard {
  label: string;
  value: string;
  helper: string;
  status?: SlaStatus;
  to?: string;
}
