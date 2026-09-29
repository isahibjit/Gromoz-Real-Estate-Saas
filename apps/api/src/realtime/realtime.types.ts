export const LEAD_CREATED_EVENT = 'lead.created' as const;

export type LeadCreatedRealtimeEvent = {
  version: 1;
  eventId: string;
  type: typeof LEAD_CREATED_EVENT;
  leadId: string;
  occurredAt: string;
};

export type RealtimeSocketUser = {
  id: string;
  role: string;
};
