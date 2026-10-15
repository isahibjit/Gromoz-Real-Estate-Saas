# Reference CRM continuation — 15 October 2026

Reference: `../Real Estate CRM`, `client/main` at `47c282c5`.
Destination baseline: `63665ebb` on `port/reference-changes`.
This batch ports the three reference commits after `50da043b` and retains the earlier SaaS adaptations.

## Delivered changes

| Reference commit | Behavior in SaaS |
| --- | --- |
| `3f9e101f` | Legacy website routes that saved an active management employee in a single executive slot resolve to the canonical owner field. The editor and receiver share the same normalization helper. Stored routing configuration is preserved; conflicting assignments retain strict validation. |
| `c3b14d21` | MagicBricks, Housing, Website and Meta cards count successful captures by their originating audit action, independently of subsequent CRM source changes. Counts use distinct active lead IDs. |
| `47c282c5` | Contact note cells open a dialog to view, edit or clear the full note. Saves send only the note, refresh the existing contact queries, preserve failed drafts and prevent duplicate submissions. Users without update access receive a read-only view. |

## SaaS safeguards and reuse

- Website normalization uses the credential-owner organization's employee filter. Foreign and shared identities and platform administrators are excluded by the existing `TenantAccessService.employeeWhere` policy. New routing writes and lead creation retain their tenant and role checks.
- Connector statistics bind the active organization separately to both the audit record and its joined lead. Duplicate audits, deleted leads and mismatched tenant records cannot inflate the count.
- Contact list, count and direct mutation queries now intersect the existing role scope with employees in the selected workspace. Assigned contacts follow their exclusive employee membership; unassigned contacts require a creator in that workspace. Reassignment uses the existing tenant employee assertion.
- The note UI reuses `Dialog`, `DialogDescription`, `Button`, `Textarea`, `usePermission`, the existing contact mutation/cache invalidation and API error formatter. The existing guarded `PATCH /contact-leads/:id` contract is unchanged.
- No dependencies, schema changes or migrations were added in this batch. The routing owner migration from the previous port remains a prerequisite wherever it has not yet been applied.

Contact leads still lack a persisted organization ID. These checks use the existing exclusive-membership policy; ambiguous legacy contacts are excluded. A durable ownership migration and the other limitations in [TENANT_ISOLATION_STATUS.md](TENANT_ISOLATION_STATUS.md) remain separate work.

## Verification

| Check | Result |
| --- | --- |
| Default API suite | 63 suites / 466 tests passed; 4 opt-in database suites / 31 tests skipped. |
| Disposable PostgreSQL routing suite | 11 tests passed with `INTEGRATION_ROUTING_DB_TEST=1`. Covers migration preservation, legacy website ingestion, foreign-owner rejection, duplicate/deleted/foreign capture counts, contact note isolation and authenticated HTTP permission enforcement. |
| Contact Leads frontend suite | 10 tests passed, including save, clear, cancel, retry, read-only access and pending submission behavior. |
| Full frontend suite | 252 passed / 30 failed. Failed case names exactly match the stored pre-port frontend baseline; no new failures. |
| API production compilation | Passed with incremental compilation disabled and output redirected to `.git/reference-port-20261015/api-build`. Emitted `main.js` verified. |
| Web production build | Passed; existing bundle-size warning remains. |
| Lint | Note UI/tests and new import-statistics/database tests pass. No lint findings on changed API lines; existing findings remain in surrounding API code. |
| Git whitespace/conflict checks | Passed. |

Raw validation results are in `.git/reference-port-20261015/`. The frontend baseline is `.git/reference-port-20261014/web-final.json`; its web sources match the destination baseline for this batch.

Only disposable database fixtures were created and removed. No application-database migrations, production deployment, authenticated browser walkthrough or live provider delivery was performed.
