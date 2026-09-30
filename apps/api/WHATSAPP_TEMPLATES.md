# Tenant WhatsApp notification templates

WhatsApp is a tenant-owned, disabled-by-default notification channel. Each
workspace uses either the platform Pinbot sender or its own encrypted Pinbot
credentials. Custom mode never falls back to the platform sender.

Platform credentials are read from `WHATSAPP_PLATFORM_API_URL`,
`WHATSAPP_PLATFORM_API_KEY`, and `WHATSAPP_PLATFORM_WABA_NUMBER`. Template
language defaults to `en` through `WHATSAPP_PLATFORM_TEMPLATE_LANGUAGE`.
The former `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`, `WHATSAPP_WABA_NUMBER`, and
`WHATSAPP_TEMPLATE_LANGUAGE` names remain read-only compatibility aliases.
Tenant-owned API tokens require `WHATSAPP_CREDENTIAL_ENCRYPTION_KEY` and their
HTTPS endpoint host must appear in `WHATSAPP_CUSTOM_API_HOST_ALLOWLIST`.

| Template | Body parameters |
| --- | --- |
| trueroot_announcement | Recipient name, title, message |
| trueroot_lead_assigned | Recipient name, lead name, dispatch time (IST) |
| trueroot_follow_up_reminder | Recipient name, lead name, scheduled time (IST) |
| trueroot_site_visit_update | Recipient name, status, lead name, project, scheduled time (IST) |
| trueroot_site_visit_cancelled | Recipient name, lead name, project, scheduled time (IST) |

Supported events are announcements, lead assignment/reassignment, SLA transfer,
follow-up reminders, and scheduled/updated/cancelled site visits. Other events
remain FCM-only. Messages target active staff who belong exclusively to the
selected tenant; client numbers, platform users, orphan users, and shared users
are excluded.

The outbox records queued, processing, retrying, accepted, failed, and skipped
states. Provider acceptance means the provider returned a message ID; it is not
proof that the recipient received or read the message.

Apply the Prisma migration, deploy the API build, restart the process, configure
a provider in the tenant notification settings, and only then enable the master
WhatsApp switch. No real messages are sent by build or unit-test validation.
