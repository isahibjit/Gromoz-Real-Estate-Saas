# Reference CRM continuation — 16 October 2026

Reference: `../Real Estate CRM`, `client/main` at `9b77b3a9`.
Destination baseline: `d1657e95` on `port/reference-changes`.
This batch ports the four committed reference changes after `47c282c5`.

## Delivered changes

| Reference commit | Behavior in SaaS |
| --- | --- |
| `32ab634` | Staff reporting options include active Managers and Sales Managers alongside Team Leaders; inactive staff and self-selection remain excluded. Existing paginated, tenant-scoped employee loading and assignment checks are preserved. |
| `b2d0e97` | All Leads cards and pills follow shared server master configuration across roles and browsers. Follow-Up customizations remain local and do not overwrite master visibility flags. Masters refresh when returning to the window. |
| `328bae3` | Sales and Pre Sales can see Contact Leads and Payroll when their module/page permissions allow it. Payroll processing controls still require administrator roles plus create/update access. Commission targets use the full named period: 1, 3, 6 or 12 months; custom ranges retain their calendar-month calculation. |
| `9b77b3a9` | Removes only the Source account selector from All Leads advanced filters. Source and project filters, pagination and complete filtered export remain. Manual lead creation offers an editable added timestamp, initialized to now; malformed explicit dates fail before writes and other callers may omit the field. |

## SaaS adaptations and reuse

- Card preferences are stored separately per tenant using the existing organization selector. Unscoped legacy preferences are not automatically assigned to a tenant. A save that completes after switching organizations cannot publish stale local settings. Existing request cancellation, query hooks, master APIs and preference events are reused.
- Payroll now resolves tenant membership before role and permission guards. Reads intersect the payroll row's organization, exclusive employee membership, and existing self/admin filters; nested led-team data is tenant-filtered.
- The shared payroll scope is reused for draft amendments, finalization and payment lookup. Runs select exclusively owned employees, stamp new rows with the active organization and reject conflicting or unowned historical payroll instead of adopting it. Incentive lookups follow the booking's lead organization.
- Existing `Input`, `FormField`, modal, lead mutation/cache invalidation, reporting selector, permission hook and time conversion utilities are reused. The selected added timestamp is independent of assignment and follow-up dates. Integrations can continue supplying valid `Date` values.
- Gromoze artwork, theme tokens and customer branding overrides are unchanged. No dependencies, schema changes or migrations were added. The earlier routing-owner migration remains a prerequisite in databases where it has not been applied.

## Verification

| Check | Result |
| --- | --- |
| Default API suite | 64 suites / 501 tests passed; 4 opt-in database suites / 31 cases skipped. |
| Disposable PostgreSQL routing suite | 11 tests passed with `INTEGRATION_ROUTING_DB_TEST=1`, including tenant routing, migration preservation, capture counts, contact isolation and authenticated contact permissions. |
| Full frontend suite | 293 passed / 30 failed. An untouched archive of `d1657e95` produced 256 passed / the exact same 30 failed case names. No new failing cases. |
| Focused frontend checks | All 8 affected suites passed before the additional SaaS cases; tenant preference/reporting checks then passed 19 cases and the final export suite passed 5 cases. Covers tenant-local saves/restoration, stale responses, reporting hierarchy, permission-controlled payroll, lead timestamps and filtered export. |
| API production compilation | Passed with incremental compilation disabled and isolated output. Emitted `src/main.js` verified. |
| Web production build | Passed; existing bundle-size warning remains. |
| Frontend TypeScript comparison | 364 diagnostic entries in both baseline and current sources; no introduced diagnostic signatures. The repository does not have a clean full frontend type check. Three unsupported role-query options in the newly ported test were corrected. |
| Lint comparison | New tests and changed frontend targets checked. Existing diagnostics remain in surrounding files; no new diagnostics on changed lines. API text was normalized to LF for a meaningful comparison against Git's baseline. |
| Whitespace and scope checks | No whitespace/conflict errors; no changes to Gromoze assets or theme files. Reference working tree was not modified. |

Raw reports, the checked baseline sources, and logs are in `.git/reference-port-20261016/`. The temporary extracted baseline was moved into that local Git review directory after comparison.

## Limits

This is not a complete tenant-isolation audit or a production release. Payroll settings and several HR/user-owned models remain legacy shared configuration; this batch does not migrate those models. Payroll rows without organization ownership are deliberately excluded, and shared employment identities retain the existing restriction. See `TENANT_ISOLATION_STATUS.md` for broader limitations.

Only disposable database fixtures were created and removed. No application-database migration, deployment, authenticated browser walkthrough, real payroll payment, or live provider delivery was performed. The PostgreSQL suite reported a delayed Jest shutdown warning and then exited successfully.
