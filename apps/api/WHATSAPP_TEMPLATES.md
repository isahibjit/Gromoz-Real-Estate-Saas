# WhatsApp notification templates

The existing Pinbot transport now sends template messages, with body parameters
in the order submitted to K3. Names use `trueroot`, as shown in the provider list.
English defaults to `en`; set `WHATSAPP_TEMPLATE_LANGUAGE` only if the approved
templates use a different language code. No database migration is required.

| Template | Body parameters |
| --- | --- |
| trueroot_announcement | Recipient name, title, message |
| trueroot_lead_assigned | Recipient name, lead name, dispatch time (IST) |
| trueroot_follow_up_reminder | Recipient name, lead name, scheduled time (IST) |
| trueroot_site_visit_reminder | Recipient name, lead name, project, scheduled time (IST) |
| trueroot_site_visit_update | Recipient name, status, lead name, project, scheduled time (IST) |
| trueroot_site_visit_cancelled | Recipient name, lead name, project, scheduled time (IST) |

Existing assignment, follow-up reminder, announcement and visit update events
use these mappings. Completed visits and unknown events are not misrepresented
as announcements. Missing required data skips WhatsApp with a warning; FCM is
unaffected. The site-visit reminder mapping is ready but no existing automatic
site-visit reminder dispatcher was found; adding that scheduler is separate work.

The screenshot showed Pending for all templates. Obtain approval before testing.
Static website buttons need no runtime parameters. Dynamic buttons or headers
would require additional components and are not supported by this body-only setup.

Deploy the API build and restart the process. Test an announcement with WhatsApp
enabled and then with both FCM and WhatsApp enabled: each should submit WhatsApp
once. Check the provider delivery report using the returned message ID. An
accepted response is not proof of delivery; delivery webhook persistence is not
implemented here. No real messages were sent during local verification.
