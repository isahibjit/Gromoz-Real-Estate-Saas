export interface WhatsAppTemplateContext {
  type: string;
  recipientName: string;
  title: string;
  body: string;
  leadName?: string;
  leadReference?: string;
  scheduledAt?: string | Date;
  projectName?: string;
  status?: string;
}

export function buildWhatsAppTemplate(
  context: WhatsAppTemplateContext,
  language = 'en',
) {
  const date = context.scheduledAt ? new Date(context.scheduledAt) : null;
  const schedule =
    date && Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date) + ' IST'
      : '';
  const lead = context.leadName || context.leadReference || '';
  let name: string;
  let values: string[];
  switch (context.type) {
    case 'announcement':
      name = 'trueroot_announcement';
      values = [context.recipientName, context.title, context.body];
      break;
    case 'lead-assigned':
    case 'lead-reassigned':
    case 'sla-breach-transferred':
      name = 'trueroot_lead_assigned';
      values = [context.recipientName, lead, schedule];
      break;
    case 'follow-up-reminder':
      name = 'trueroot_follow_up_reminder';
      values = [context.recipientName, lead, schedule];
      break;
    case 'site-visit-scheduled':
    case 'site-visit-updated':
      if (context.status === 'Cancelled') {
        name = 'trueroot_site_visit_cancelled';
        values = [
          context.recipientName,
          lead,
          context.projectName || '',
          schedule,
        ];
      } else if (context.status?.trim()) {
        name = 'trueroot_site_visit_update';
        values = [
          context.recipientName,
          context.status!,
          lead,
          context.projectName || '',
          schedule,
        ];
      } else return null;
      break;
    case 'site-visit-cancelled':
      name = 'trueroot_site_visit_cancelled';
      values = [
        context.recipientName,
        lead,
        context.projectName || '',
        schedule,
      ];
      break;
    default:
      return null;
  }
  const normalized = values.map((value) => value.replace(/\s+/g, ' ').trim());
  if (normalized.some((value) => !value)) return null;
  return {
    name,
    language: { code: language },
    components: [
      {
        type: 'body',
        parameters: normalized.map((text) => ({ type: 'text', text })),
      },
    ],
  };
}
