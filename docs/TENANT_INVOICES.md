# Tenant invoices

## Invoice templates

Platform Settings → Invoice settings includes a template editor for future invoices. It supports classic and compact layouts, the supplied Solverix logo by default, an uploaded PNG/JPEG logo or no logo, a readable accent color, a document heading, additional payment information and a footer message. Uploaded logos are limited to 256 KB and 2048 × 2048 pixels. Remote logo URLs, SVG and executable markup are not accepted.

Save the business details and template together, download the PDF preview, then explicitly enable invoicing. Template changes reset preview/activation just like issuer changes. Preview activation checks the settings revision, so a concurrently changed template cannot inherit approval from an older PDF.

New invoice snapshots embed the selected template and logo bytes. Issued and paid documents retain their original logo, layout and commercial terms after later template changes; older snapshots without template data retain the legacy Gromoze layout. Template notes supplement standard terms and do not change prices, deadlines, GST treatment or payment behavior. The historical-backfill preview fingerprint includes template settings.

Migration `20261024120000_invoice_templates` adds the nullable `PlatformInvoiceSettings.template` JSON field. Run the normal migration deployment before starting the updated API. Existing settings use the default template without rewriting invoice records. No additional npm dependency or public logo upload URL is required.

Invoice issuance is disabled after migration. Existing payment flows remain available.

## Enable issuance

1. Apply Prisma migrations and deploy the API and web application together.
2. As an active platform super administrator, open Platform Settings → Invoice settings.
3. Save the seller's business name, full billing address and contact email. Phone is optional.
4. Download and review the PDF preview. It does not allocate an invoice number or create a charge.
5. Select **Enable invoicing**. A background worker checks due charges every minute.

Changing seller details disables new issuance and requires another preview and activation. Issued invoices retain their saved identity, prices, quantities and line items. Tenant owners and administrators find invoices under **Subscription & support → Invoices** (`/billing`). Employees cannot access these APIs.

## Charges and payment

Platform administrators can inspect each tenant's **Billing & invoices** section on its detail page. Counts cover actual invoice records across all environments; overdue is part of unpaid. Test/live balances remain separate, and the read-only invoice table supports environment filters, details and protected PDF downloads without selecting or impersonating the workspace.

**Manage tenant → Billing** shows the first 30-day seat charge, any one-time setup fee, invoice issuance information and the recorded payment deadline. Early payment remains available during a trial. **Create first-payment link** does not schedule a charge: the customer must open the link and authorize payment. The interface distinguishes queued invoice email, SMTP acceptance and a requested Razorpay notification from confirmed inbox delivery. Missing dates remain “Not recorded”/“Not scheduled”; no trial deadline is invented for display.

Generating a link reuses matching issued invoices, including when new issuance has been disabled. Changed saved terms are disclosed before an unpaid invoice is replaced. Paid invoices are never repriced. Billing records refresh after failed link creation too, because an invoice may already have been issued before a provider failure.

- Setup and seat-purchase invoices are issued before checkout. Trial conversion and renewals are issued within 14 days of the recorded due date.
- Workspace rates and purchased seat allowances determine charges. Renewals add 30 days from the later of the old expiry or payment confirmation; no annual billing, GST calculations or automatic debit is introduced.
- Amounts are stored in minor currency units. Setup, seat upgrades, browser verification and signed Razorpay webhooks share invoice settlement for new checkouts.
- Provider capture status, order association, total and currency must match. Failed/authorized/partial/refunded payments do not settle an invoice.
- Unpaid renewal invoices are voided and replaced if a seat purchase changes their charge. A paid invoice is never repriced.
- Test invoices have a separate `GZ-TEST-...` sequence, visible labels and separately labelled outstanding balances. Switching Razorpay environments does not make old invoices payable in the new environment.
- Late payments against void invoices, duplicate payments or payments for suspended/cancelled workspaces require reconciliation. They never silently grant access. There is no manual “mark paid” or automatic refund action.

Subscribe the existing billing webhook to `payment.captured`, `payment.failed` and `payment_link.paid`. Preserve its raw request body for signature validation. Configure real Razorpay credentials to accept live payments; test keys create test activity only.

## Email and document privacy

Issued and paid PDFs are queued after commit for active tenant owner administrators, using platform SMTP and tenant-scoped email logs. SMTP failure does not undo settlement. Normal failed sends retry with backoff. An uncertain post-SMTP outcome is flagged `UNCERTAIN`; review SMTP and email logs before resending, rather than blindly duplicating a message.

PDF downloads require authentication and workspace authorization, and responses use `private, no-store`. Documents are rendered from snapshots rather than served from public uploads. The renderer uses the unchanged supplied logo in `apps/api/src/billing/assets`; retain this source asset in the deployed Git checkout when building with plain `tsc`.

## Historical backfill

In Invoice settings, preview historical candidates and separately select **Confirm historical backfill**. The preview expires after one hour. The background job reports processed, created and skipped records; repeated processing does not create duplicate invoices.

Only captured, unrefunded INR payments matching the provider lookup are eligible. Payments inaccessible using the configured Razorpay environment, mismatched totals, unsupported types and reconciliation cases are skipped. Historical invoices receive a new issue date, retain the recorded payment date and use a single recorded-payment line when original itemization is unavailable. They do not email old customers automatically.

Changing issuer settings or payment mode stops a running backfill at its next check. Review the result and start a fresh preview using the correct settings.

## Verification

The CI workflow includes API/UI invoice tests and PostgreSQL lifecycle/concurrency checks. Database tests require `RUN_SUBSCRIPTION_DATABASE_TESTS=1` and `SUBSCRIPTION_DATABASE_URL` pointing to a disposable local database ending in `_subscription_test` (or the explicit CI database). Do not point them at production.

Test and build success does not establish production migration, SMTP delivery, Razorpay configuration or live-browser verification. These must be checked after deployment and before enabling invoice issuance.
