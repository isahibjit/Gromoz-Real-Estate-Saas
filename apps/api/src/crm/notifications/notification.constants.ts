export const SUPPORTED_WHATSAPP_EVENTS = [
  'announcement',
  'lead-assigned',
  'lead-reassigned',
  'sla-breach-transferred',
  'follow-up-reminder',
  'site-visit-scheduled',
  'site-visit-updated',
  'site-visit-cancelled',
] as const;

export type SupportedWhatsAppEvent = (typeof SUPPORTED_WHATSAPP_EVENTS)[number];

export const SUPPORTED_WHATSAPP_EVENT_SET = new Set<string>(
  SUPPORTED_WHATSAPP_EVENTS,
);

export interface NotificationEventSetting {
  fcmEnabled: boolean;
  whatsappEnabled: boolean;
}

export const DEFAULT_NOTIFICATION_EVENT_SETTINGS: Readonly<
  Record<string, NotificationEventSetting>
> = {
  'lead-assigned': { fcmEnabled: true, whatsappEnabled: false },
  'lead-reassigned': { fcmEnabled: true, whatsappEnabled: false },
  'sla-breach-transferred': { fcmEnabled: true, whatsappEnabled: false },
  'follow-up-assigned': { fcmEnabled: true, whatsappEnabled: false },
  'follow-up-reminder': { fcmEnabled: true, whatsappEnabled: false },
  'follow-up-renotify': { fcmEnabled: true, whatsappEnabled: false },
  'follow-up-updated': { fcmEnabled: true, whatsappEnabled: false },
  'site-visit-scheduled': { fcmEnabled: true, whatsappEnabled: false },
  'site-visit-reminder': { fcmEnabled: true, whatsappEnabled: false },
  'site-visit-updated': { fcmEnabled: true, whatsappEnabled: false },
  'site-visit-cancelled': { fcmEnabled: true, whatsappEnabled: false },
  'task-assigned': { fcmEnabled: true, whatsappEnabled: false },
  'task-updated': { fcmEnabled: true, whatsappEnabled: false },
  'booking-created': { fcmEnabled: true, whatsappEnabled: false },
  announcement: { fcmEnabled: true, whatsappEnabled: false },
};

export const DEFAULT_WHATSAPP_CUSTOM_HOST = 'partnersv1.pinbot.ai';
