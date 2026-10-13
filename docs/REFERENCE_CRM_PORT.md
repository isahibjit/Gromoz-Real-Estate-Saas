# Reference CRM port into SaaS

Compared on 2026-10-13. Reference repository: `../Real Estate CRM`, commit `72198bb5`. Shared source snapshot: `ad1ada38`; the SaaS initial snapshot `85d5f871` matches it throughout `apps` and `packages`, except the API client's base URL. Destination before this continuation: `24e66db1`, branch `port/reference-changes`.

This is a three-way port of the reference application's committed changes, with SaaS adaptations. It is not a deployment or clearance to launch all existing tenant modules.

## Delivered behavior

| Area | Changes |
| --- | --- |
| Lead updates | Shared update/status/reminder dialog and read-only remarks history across lead and follow-up entry points; stable tab height; assignment-change detection; source/location removal from the update form. |
| Lead lists and projects | Expanded name/project/property/mobile/source search, advanced project/property filtering, account attribution/filter/export, project property type, sortable searchable dropdowns, table pagination and site-visit transitions. |
| Access and hierarchy | Manager/team-leader assignment and reporting scopes, booking finance filters, task assignment restrictions, HR hierarchy and visibility overrides, employee-code collision prevention, admin account lockout exemption. |
| Dashboards | Dynamic source-point ranking, team/manager performance scopes, readable rotation activity labels, and safe handling of missing/non-finite tracking coordinates. |
| Portal accounts | Independent MagicBricks/Housing credentials, mapping, routing, archive/restore, counters and activity; tenant-scoped uniqueness, selectors, mutations, webhook ownership and account attribution. Import connector summaries read the new account model. |
| Meta | Form routing overrides, inherited page defaults, Manager/Team Leader permission-protected access, tenant-owned configuration and OAuth state, owned webhook page resolution and tenant-scoped delivery logs. Ambiguous page ownership fails closed. |
| Rotation | Configurable passes, immutable run snapshots, atomic assignment/transfer work and concurrent rule-edit serialization. **Existing tenant-owned-lead suppression remains in effect.** Rules still lack tenant ownership; tenant automatic routing needs its own ownership migration and worker authorization before it can be enabled. |
| Shared UI | Existing SearchableSelect and MultiSelect improvements; existing StatCard and booking updates imported by the earlier commits on this branch are retained. |

## SaaS adaptations and reuse

Retained the SaaS organization resolver, tenant guard/context/access service, platform/workspace navigation and billing, encrypted notification/WhatsApp dispatch services, platform-owned Google Maps key, API request cancellation on workspace changes, and existing PageHeader/WorkspacePage layout. The reference account workspace uses those layout components and the shared API error formatter. The shared LeadUpdateDialog, Meta routing schemas, and account service are reused across their entry points. No dependencies were added.

The account endpoints belong exclusively to the guarded MagicBricks management controller. They are not exposed through the public 99Acres ingestion controller. HTTP regression tests cover the route and authorization boundary.

Provider account lists are read-only; reading an empty account list does not create an account. Legacy primary-account creation handles a concurrent uniqueness race. Platform spectators cannot change accounts or persist connection tests. Credential-owner organization IDs scope public provider matching, deduplication and lead creation. Account activity failures are displayed instead of appearing as an empty history.

Source deployment journals, tooling bootstrap, client-only API base URL changes, generated TypeScript build metadata, secrets and production configuration were not imported. The independent untracked `docs/MOBILE_TENANT_AND_AUTH_API.md` is preserved.

## Database changes

- `20261006144500_add_project_property_type`: project property type.
- `20261009180000_multi_account_portal_integrations`: account model, attribution and routing relation. Adapted for organization ownership and tenant-specific indexes. Existing MagicBricks/Housing rows retain their original organization and credentials. Unowned legacy rows are not adopted by a tenant and cannot ingest public leads. The optional legacy Housing table is copied only when it exists.
- `20261012120000_add_auto_assignment_rotation`: rotation count, cycle, route snapshot and stop reason; legacy active runs retain one pass.

Prisma schema validation and generation were performed. **These migrations were not applied to a database.** Apply and verify them before running the upgraded API against a deployment database. No production data, services, proxy configuration or credentials were changed.

## Verification

| Check | Result |
| --- | --- |
| API build and TypeScript | Pass; clean build produces `dist/src/app.controller.js`. |
| Web production build | Pass; existing bundle-size warning remains. |
| API suite | 56 suites, 350 tests passed; 3 database suites / 20 tests skipped. |
| Focused frontend suite | 10 suites, 76 tests passed. |
| Last full frontend suite | 183 passed, 32 failed; the same 32 failed cases are reproduced by the baseline. |
| Frontend TypeScript comparison | No new diagnostic groups by file/code/message compared with the original SaaS snapshot. |
| Focused lint | New account services, routing helpers/dialogs and tenant/HTTP regression tests pass. |
| Whole touched-file lint | Existing failures remain; baseline comparison found substantially more pre-existing formatting violations. |
| Prisma schema | Validation and generation pass; no database migration applied. |
| Git diff whitespace check | Pass. |

 No authenticated browser walkthrough, live provider delivery, or database-backed migration/locking test was performed. Database-dependent API suites remain skipped unless their explicit test flags are enabled.

The original SaaS frontend has existing failing tests, TypeScript diagnostics and lint findings. A detached checkout of `24e66db1`, using the same Jest import-meta transformer for comparison, reproduced the same 32 failing frontend cases. Its business source was not modified. The port introduces no new frontend TypeScript diagnostics by file/code/message. Existing unrelated failures are not suppressed.

The newly added account/routing components, account services and HTTP/tenant regression tests pass focused ESLint checks. Whole-repository lint still reports existing issues; a baseline comparison was performed, and unused imports/state introduced by this port were removed.

Existing release limitations in `TENANT_ISOLATION_STATUS.md` still require separate work. In particular, other global settings/business models, shared employment identities and Meta webhook signature verification are not completed by this port. The Meta tenant changes here supersede that older document's statement that Meta configuration and delivery lookup are entirely global.

## Reference commits inspected

Production-source commits in `ad1ada38..72198bb5` are listed below. Revert/reapply sequences were resolved from the final reference snapshot, not replayed as duplicate changes. Deployment-only documentation commits do not belong in the SaaS application's deployment history.

| Commit | Description |
| --- | --- |
| `7b89165c` | done |
| `37bf9160` | feat: add CRM controller, service, and task management UI components |
| `ed248a00` | feat: implement CRM controllers and services for managing leads, tasks, and contacts |
| `6ebec572` | fix(rbac): allow read lookup view for employees and leads in task dialog and add DialogDescription |
| `9e40fb42` | fix(leads): fix datatable pagination issue and add property type to projects |
| `5e0b1555` | feat: create migration |
| `c7f45fb1` | fix(leads): make site visit status transitions atomic |
| `58dae8a7` | fix(auth): exempt admin accounts (SUPER_ADMIN, ADMIN, BACKEND) from 3-failed-attempts deactivation and lockout |
| `8bd7b667` | feat(auto-assignment): implement role-flexible auto assignment logic and add tests |
| `ec0d9082` | fix(hr): generate unique employeeCode to prevent duplicate key constraint failure |
| `18693ca2` | fix(ui): fix MultiSelect trigger height overflow, badge padding, and redundant summary text |
| `88088309` | feat(ui): make hierarchy overflow counter interactive with search, avatars, and expandable list |
| `790c1c9f` | fix(lead-filters): resolve project and property type advanced filtering zero-results issue |
| `fb8f3c8b` | feat(crm): enhance lead search to query name, project name, property type, phone number, and source |
| `84b2cad1` | feat(security): strictly scope TL, Manager and non-admin permissions across leads, contact leads, attendance, tasks and site visits |
| `fb1169d7` | feat(hr): reorder Add/Edit Employee modal sections to match client sequence (Profile -> Role/Payroll -> Hierarchy -> Lead Visibility -> Ranking -> Access) |
| `6ffcfa9d` | fix(access-control & auto-assignment): clean up role options dropdown and fix auto-transfer timer false positive |
| `9fe15cb3` | fix(leads): increase mobile number column width to prevent truncation |
| `afe071ee` | fix(hr): fix invalid Prisma UserWhereInput role filter in listAttendance |
| `e0485421` | fix(rbac): allow team leaders and managers to view employee profile pages and team details without redirecting to dashboard |
| `fbba4976` | fix(auto-assignment): sync auto assignment timer for explicit assignees on lead creation and ignore system log activities in hasLeadActionAfter |
| `4f570af2` | fix(access-control): replace undefined roleOptions with templateRoleOptions in AccessControlScreen |
| `7accb7b3` | fix(rankings): evaluate live sourcePointsByValue dynamically so toggling pointsEnabled on source updates performance rankings |
| `94d09d13` | fix(ui): remove forgot password link from login card and simplify meta form switch to a single toggle |
| `2a61dd99` | feat(ui): sort projects and users A-Z and rank search matches by relevance |
| `88c6e690` | fix(rbac): enforce user visibility scope on tasks, site visits, bookings, incentives, and attendance |
| `c759e87c` | feat(pipeline): add search box and A-Z sorting to lead pipeline filter dropdowns |
| `c05fec44` | fix(dashboard): resolve performance ranking team scoping and user filtering for team leaders |
| `3c471c5f` | feat(leads): remove location and source fields from update reminder status and remark modal |
| `194d58ba` | feat(tasks): restrict task assignment dropdown in create modal to admin, HR, TL and Backend unless explicitly allowed |
| `8e473164` | fix(leads): completely purge location and source from follow-ups update modal and update permissions |
| `034351fb` | feat(performance): simplify ranking logic and add tests for scoped filters |
| `0e6c75c7` | feat: implement CRM assignment-scope authorization and roles guard |
| `46d90bb3` | feat(assignment): implement lead assignment changes logic and tests |
| `cd78fafd` | fix(auth): scope manager dashboard and lead assignment |
| `4e47e146` | feat(stat-card): add valueClassName prop for customizable styling |
| `1fbd2e6c` | fix(bookings): scope finance report for team leaders |
| `1d8b4b70` | fix(integrations): validate lead routing overrides |
| `b1477be4` | feat(integrations): support multiple portal accounts |
| `ac7068db` | feat: enhance routing assignee functionality with ownerId support |
| `b78db02c` | feat(bookings): integrate project configuration options in booking screens |
| `52497fcd` | feat(bookings): replace Select with SearchableSelect for improved unit type selection |
| `1814d3ce` | fix(bookings): scope team and executive filters to a manager's hierarchy |
| `98dbc1d2` | fix(migrations): tolerate absent legacy housing table |
| `84baa93f` | fix(performance): scope lead report for manager hierarchy |
| `c1b515af` | Revert "fix(performance): scope lead report for manager hierarchy" |
| `fe2dfdef` | fix(performance): scope lead report for manager hierarchy |
| `9015ec95` | fix(performance): enhance admin performance data retrieval with role-based scoping |
| `a5773b60` | test(performance): cover manager employee scope |
| `7b300206` | feat(meta): add optional lead-form routing overrides |
| `0392df65` | fix(meta): allow permission-granted manager import access |
| `462db867` | fix(dashboard): handle executives without tracking coordinates |
| `cfb98498` | feat(leads): unify update and remarks history dialog |
| `fefa0371` | feat(follow-ups): reuse shared lead update and remarks history |
| `b6751053` | feat: configurable lead rotation passes with atomic routing [skip ci] |
| `66fc5f63` | fix: serialize concurrent rotation rule edits [skip ci] |
| `0c8ae3c2` | fix: show readable lead labels in rotation activity [skip ci] |
| `b9b72d5c` | fix: keep lead update modal height stable across tabs [skip ci] |
