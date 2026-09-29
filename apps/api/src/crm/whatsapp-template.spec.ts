import { buildWhatsAppTemplate } from './whatsapp-template';

describe('WhatsApp templates', () => {
  const context = {
    type: 'announcement', recipientName: 'Employee', title: 'Meeting', body: 'At 10 AM',
    leadName: 'Rahul Sharma', scheduledAt: '2026-09-08T10:00:00Z',
    projectName: 'Ananta', status: 'Scheduled',
  };
  it.each([
    ['announcement', 'trueroot_announcement', 3],
    ['lead-assigned', 'trueroot_lead_assigned', 3],
    ['lead-reassigned', 'trueroot_lead_assigned', 3],
    ['sla-breach-transferred', 'trueroot_lead_assigned', 3],
    ['follow-up-reminder', 'trueroot_follow_up_reminder', 3],
    ['site-visit-reminder', 'trueroot_site_visit_reminder', 4],
    ['site-visit-scheduled', 'trueroot_site_visit_update', 5],
  ])('%s maps to the exact provider name and parameter count', (type, name, count) => {
    const result = buildWhatsAppTemplate({ ...context, type });
    expect(result?.name).toBe(name);
    expect(result?.components[0].parameters).toHaveLength(count);
    expect(result?.language.code).toBe('en');
  });
  it('maps cancellation separately and renders lead name', () => {
    const result = buildWhatsAppTemplate({ ...context, type: 'site-visit-updated', status: 'Cancelled' });
    expect(result?.name).toBe('trueroot_site_visit_cancelled');
    expect(result?.components[0].parameters.map(p => p.text)).toEqual([
      'Employee', 'Rahul Sharma', 'Ananta', expect.stringContaining('IST'),
    ]);
  });
  it('falls back to leadReference if leadName is not provided', () => {
    const fallbackResult = buildWhatsAppTemplate({
      ...context,
      type: 'lead-assigned',
      leadName: undefined,
      leadReference: 'TR000123',
    });
    expect(fallbackResult?.components[0].parameters.map(p => p.text)).toEqual([
      'Employee', 'TR000123', expect.stringContaining('IST'),
    ]);
  });
  it('does not send completion as scheduling or arbitrary events as announcements', () => {
    expect(buildWhatsAppTemplate({ ...context, type: 'site-visit-updated', status: 'Completed' })).toBeNull();
    expect(buildWhatsAppTemplate({ ...context, type: 'test-notification' })).toBeNull();
  });
  it('rejects missing required data and invalid schedules', () => {
    expect(buildWhatsAppTemplate({ ...context, body: ' ' })).toBeNull();
    expect(buildWhatsAppTemplate({ ...context, type: 'follow-up-reminder', scheduledAt: 'invalid' })).toBeNull();
  });
  it('normalizes announcement whitespace and preserves parameter order', () => {
    expect(buildWhatsAppTemplate({ ...context, body: 'One\nTwo' })?.components[0].parameters.map(p => p.text))
      .toEqual(['Employee', 'Meeting', 'One Two']);
  });
});
