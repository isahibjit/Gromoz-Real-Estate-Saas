# Tenant subscription and support workspace

Owners and tenant administrators open **Subscription & support** from the sidebar (`/billing`). Other employees and platform spectators cannot read billing or ticket APIs. An expired trial owner can sign in and manage billing; CRM endpoints retain the existing workspace-access policy. No automatic suspension was added.

## Features and contracts

- Successful password and OTP sign-ins send one alert to the selected tenant's active owner(s). Membership is checked using `x-organization-id`, `x-tenant-id`, or `x-tenant-slug`. Missing, conflicting, ambiguous, and platform login contexts are skipped. Workspace Settings > Preferences controls `preferences.loginAlertsEnabled` (default true). Platform SMTP sends and tenant-tagged EmailLog rows record these alerts.
- Employee creation and invitations share an organization row lock and a capacity check. Active memberships and unexpired pending invitations consume seats. Employee forms retain their data when the reusable seat checkout opens.
- `GET /billing/overview` adds plan display name, active catalog choices, contact details, pending invitation count, deadline, days remaining, and expiry state while retaining existing response fields.
- `GET /billing/transactions` accepts page, pageSize, status, type, from, to. Receipt downloads appear only for supplied HTTPS receipt URLs. No legal/GST PDF invoices are generated.
- `GET/POST /support/tickets`, `GET /support/tickets/:code`, `PATCH /support/tickets/:code/status`, and `POST /support/tickets/:code/retry-email` use tenant scope and human-facing `GR-000001` ticket codes. Plan changes are saved as PLAN_CHANGE tickets for review; they do not change plan terms or start checkout.
- Seat checkout quantities and charges are persisted server-side. Verification is tenant-bound and idempotent; signed `payment.captured` webhooks use the same application path. Payment failures do not grant seats. See [Razorpay payment webhook payloads](https://github.com/razorpay/markdown-docs/blob/master/webhooks/payments.md).

## Rollout

1. Generate Prisma Client and apply migrations with the existing release process. The new `20261021120000_tenant_support_tickets` migration adds ticket storage and retains requester snapshots when an employee is removed.
2. Configure platform SMTP. Set `PLATFORM_SUPPORT_EMAIL` to the Gromoze support inbox; if absent, support notifications use `SMTP_FROM`, then `SMTP_USER`. A failed email retains the ticket with a failed-delivery state and can be retried from its details dialog.
3. Set `BILLING_REMINDERS_ENABLED=true` to run renewal emails. The existing interval setting is reused. Trials and paid subscriptions receive milestones at 14, 7, 3, 1 days and after expiry, with tenant-tagged email logs and Redis locks preventing repeated delivery. Cancellation/payment/deadline changes are rechecked before dispatch. Missed pre-expiry milestones are not backfilled as a burst.
4. Subscribe the Razorpay webhook to payment.captured and payment.failed; retain payment_link.paid for setup payment links. Provider credentials and secrets stay outside Git.

## Verification

The CI workflow runs new API/UI regression tests. `workspace.database.spec.ts` runs only when RUN_SUBSCRIPTION_DATABASE_TESTS=1 and SUBSCRIPTION_DATABASE_URL is a disposable local database named with the suffix `_subscription_test` (or the existing gromoze_ci database when CI=true). It checks concurrent membership/invitation capacity, duplicate payment verification, and ticket retention. Never point it at customer data.

Live SMTP delivery and real Razorpay checkout still require validation in the configured deployment. Catalog display names come from the existing commercial_plans.json store; existing tenant seat rates remain the source of the checkout price. Plan-change requests do not alter those rates.
