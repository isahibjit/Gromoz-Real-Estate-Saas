# Tenant isolation status — 2026-09-30

This is a partial security repair, **not clearance to launch as a fully isolated multi-tenant SaaS**. The original application still has global business models and unscoped endpoints.

## Repaired in this change

- `/employees`, `/teams`, and `/access` resolve a validated tenant before role/permission authorization. Platform super admins must explicitly select a tenant; ordinary users need an active membership. Invalid/conflicting headers and ambiguous membership selection fail closed.
- Platform privileges are rechecked against the database. Tenant membership cannot grant platform super-admin status. The subsequent role guard preserves the resolved tenant role rather than restoring the global JWT role.
- The existing async tenant context now surrounds handler subscription/execution. Concurrent handlers do not share organization IDs.
- Employee lists and counts filter by membership. Employee detail/update/delete and access-control targets reject foreign IDs. New employees receive membership in the selected organization in the same nested write as user creation; user-supplied organization IDs are not used.
- Teams are filtered by organization, including nested members/leaders and employee hierarchy/visibility relations. Team/member assignments validate referenced tenant ownership. New teams receive the selected organization ID.
- Tenant HR/access audit events carry the selected organization ID.
- Frontend requests remember the organization they started in. Responses and retries are cancelled after a workspace change. Cross-tab organization changes reload the tab to discard query/UI state; existing same-tab entry/exit handlers already hard-navigate.
- Invitation creation requires an active platform/workspace administrator, cannot assign `SUPER_ADMIN`, and no longer immediately attaches an existing global identity based only on its email.
- MagicBricks, 99Acres, Housing, and Website management controllers require a validated tenant. The CRM controller helper uses only the guard-resolved tenant; organization resolution rechecks the actor and active membership instead of accepting a raw header or choosing the first membership.
- Scoped portal lookups never fall back to another tenant or an unowned connection. Housing and Website provision separate connections using tenant-unique upserts. All provider types are intended to be available to all tenants; existing connection credentials are not shared.
- Website ingestion now requires a valid Website connection API key with non-null ownership. Duplicate queries, in-process duplicate lock keys, project matching, lead creation, and delivery log rows/counts are tenant-bound. Tenant-owned lead creation validates referenced projects, teams, and assignees before writing.
- New-lead realtime recipient queries filter by the lead's tenant and active membership. They exclude platform accounts, shared identities, and unowned leads; permission checks use the membership role. This is a temporary safeguard for existing user-scoped socket rooms.

## Intentional restrictions

- HR profiles, employee permission overrides, and several other user-owned records are still singletons per global user. HR/access targets therefore exclude users with memberships in another organization, including inactive memberships. They also exclude platform accounts and users with no membership. This is a temporary safety restriction, not complete support for people employed by multiple tenants.
- Role templates are still platform-wide. Tenant workspace edits are rejected and templates are displayed as locked. Employee-specific overrides remain available for exclusively owned employees. Membership-owned templates are required to restore tenant-specific template editing.
- Existing accounts cannot be directly added to another tenant through invitations. A verified acceptance flow and membership-owned employment records are required. The existing invitation-generation endpoint is not evidence of a complete invitation-acceptance flow.
- Legacy rows with no organization are not automatically assigned to whichever tenant happens to open a page.
- Legacy automatic assignment/transfer rules have no tenant ownership. They do not run for tenant-owned leads, and pending tenant-lead transfer events are stopped when processed. Explicit validated assignments remain available. Migrate rules, sequences, and background transfer authorization before restoring automatic assignment.
- The Website email alert path used a global email connector/environment fallback and sent to that connector's sender address, with a hardcoded legacy sender fallback. It has been removed to prevent cross-tenant disclosure. Restore alerts only with tenant-owned mail configuration and recipients.
- Legacy Website keys without an organization no longer ingest leads. Each tenant must configure its own connection. New Website connections start with no connected websites instead of a hardcoded client website and sample lead count.

## Read-only database findings

The configured database contained two organizations, four users, one user without membership, and zero users with multiple memberships. The unowned user was not automatically assigned; platform accounts legitimately need no tenant membership.

Nullable organization fields were checked: no unassigned leads, projects, teams, attendance, leave, or payroll rows; six unassigned audit events; three unassigned portal integrations and one unassigned Housing integration. Counts are a snapshot, not a permanent invariant. No application rows or schema were changed during this audit.

The generated Prisma client initially had inconsistent artifacts for portal ownership. Regenerating it from `apps/api/prisma/schema.prisma` resolved the runtime validation error. Regeneration is not a database migration.

## Applied local migration

`20260930090000_tenant_integration_uniqueness` was applied to the configured local database. It replaces global portal-provider uniqueness with organization/provider uniqueness, enforces one Housing connection per organization, and adds organization indexes/foreign keys where missing. A subsequent migration-status check reported all 51 migrations applied.

The migration does not assign the four legacy integrations, copy credentials, or change connection ownership. The user's requirement that every tenant can use every provider type does not authorize sharing existing connection accounts.

## Remaining release blockers

1. **CRM/dashboard/other HR routes:** most controllers in `crm.controllers.ts`, `dashboard.controller.ts`, and non-employee controllers in `hr.controllers.ts` still lack tenant enforcement. Their services contain global reads/writes, exports, metrics, and user selectors. Adding a guard alone will not scope those queries.
2. **Ownership migration:** business models including contact leads, tasks, campaigns, shifts, holidays, settings, notifications, and imports lack explicit tenant ownership. Child models need an enforced tenant-owned parent chain, tenant-safe foreign keys, and tenant-local uniqueness. Backfill only from confirmed ownership; quarantine ambiguous legacy rows. Do not default all old data to the first tenant.
3. **Integrations/webhooks:** Meta still uses legacy shared connection/settings lookup, unsigned incoming webhook handling, global deduplication/log queries, and OAuth state without organization binding. It is not tenant-safe. Remaining portal normalization, master-data ownership, runtime DDL fallbacks, imports, and assignment rules also need review/migration. Confirm owners of the four unassigned integrations before migrating them; never make credentials global just because provider types are shared.
4. **Realtime/background work/uploads:** new-lead recipients are now constrained, but websocket rooms remain user-scoped rather than tenant-scoped; platform spectating and multi-membership realtime delivery are intentionally excluded. Other notifications, outbox payloads, scheduled work, object access, caches, and upload/download authorization still require tenant-bound identities independent of HTTP context.
5. **Shared identities and credentials:** global employee profiles/permissions and global user deletion/cascades are not a safe multi-membership employment model. Legacy employee responses also expose recoverable passwords, and the edit form falls back to a default password. Remove credential disclosure together with that form behavior, migrate password storage, and review/reset exposed credentials before release.
6. **Platform boundary and onboarding:** platform endpoints and auth/session permissions need consistent current-account privilege checks and tenant-aware authorization. Workspace settings/billing mutations and invitation acceptance require a dedicated authorization review. Frontend visibility is not authorization.

## Validation and reproduction

From `apps/api`:

```powershell
npm.cmd exec -- prisma generate --schema=prisma/schema.prisma
npm.cmd exec tsc -- --noEmit --incremental false
npm.cmd test -- --runInBand src/common/tenant src/hr src/access src/auth/guards/roles.guard.tenant.spec.ts src/organization/organization.service.tenant-isolation.spec.ts src/crm/crm.website-integration.spec.ts src/crm/crm.magicbricks.spec.ts src/crm/crm.integration-tenant-isolation.spec.ts src/crm/lead-visibility.tenant-isolation.spec.ts
node scripts/audit-tenant-ownership.cjs
$env:TENANT_ISOLATION_READONLY='1'
npm.cmd test -- --runInBand src/common/tenant/tenant-isolation.database.spec.ts
Remove-Item Env:TENANT_ISOLATION_READONLY
```

The opt-in database suite uses the actual employee/team service queries against the configured database and performs reads only. It requires at least two organizations with a foreign member to exercise cross-tenant rejection. It does not simulate browser login or test live HTTP authorization. Default unit runs skip this suite.

From `apps/web`:

```powershell
npm.cmd test -- --runInBand src/common/tenantRequestScope.test.ts
npm.cmd run build
```

Tenant-focused tests, Website/MagicBricks tests, and all three read-only database checks passed. The latest full API run has 197 passed, three failed, and three opt-in database tests skipped. Remaining failures: site-visit-assignment test missing a master-value mock, Meta OAuth config-id expectation, and auth-controller test missing providers. Do not describe the entire suite as passing.

API TypeScript checking and `npm.cmd exec -- nest build` passed. The standard `npm.cmd run build` prebuild failed while regenerating Prisma because Windows held a lock on `query_engine-windows.dll.node`; repository Node processes were left running. Frontend tenant-request tests and the web build passed. Repository-wide lint has not been certified clean. No authenticated browser session or deployed API was validated, and no production deployment was performed.
