# Site visit assignment: implementation plan

Date: 9 September 2026

Status: Proposed implementation. Source analysis completed; no application changes or live verification performed.

## Client requirement

Remove the Assigned Executive selector from site visit creation/scheduling in web and mobile. A visit must be scheduled for the executive already assigned to the client; the scheduling user cannot choose another executive.

## Proposed business rule

Use the saved lead's `fieldExecutiveId` as the source of assignment. This is an explicit implementation assumption: this CRM separates `ownerId`, `telecallerId`, and `fieldExecutiveId`. `ownerId` can remain the telecaller, so it is not interchangeable with the client's field executive. The existing All Leads scheduling flow already prefills `fieldExecutiveId`.

| Situation | Required behavior |
| --- | --- |
| Client has an active, eligible field executive A | Save the visit with `assignedExecutiveId = A` |
| Another authorized user schedules the visit | Assign A; retain the scheduling user as `createdById` |
| An older client sends executive B or `assigneeId` | Ignore the caller's assignment and derive A on the server |
| No field executive, inactive executive, or ineligible executive | Reject creation with a clear validation message; never fall back to the logged-in user or telecaller |
| Client assignment changes while the form is open | Resolve the saved assignment when processing the request; do not trust cached form data |
| Editing/rescheduling an existing visit | Preserve its assigned executive; reject an explicit different/null assignment, while allowing an unchanged value from older clients |
| Client reassigned after a visit was created | Preserve existing visits in this scope; new visits use the new assignment |

Suggested missing-assignment message: “Assign an active field executive to this client before scheduling a site visit.” Preserve existing eligibility roles unless a separate requirement changes them.

Historical corrections and automatic transfer of existing upcoming visits are separate policy decisions, not part of this fix.

## Confirmed source findings

- `apps/api/src/crm/crm.service.ts`: `createSiteVisit` accepts `assignedExecutiveId`/`assigneeId`; its eligibility check does not establish lead ownership.
- `moveLeadInPipeline` creates visits separately inside a transaction when the target status name includes “site visit.” It also accepts the caller's executive.
- `updateSiteVisit` permits caller-driven assignment changes.
- `listSiteVisits` scopes SALES_AGENT and TELECALLER lists by `assignedExecutiveId`; notifications and dashboards also use the saved visit assignment.
- `apps/web/src/screens/admin/leads/site-visits/SiteVisitsScreen.tsx` exports the shared `CreateSiteVisitModal` and requires executive selection.
- Callers include `CreateSiteVisitActionDialog.tsx`, `all/AllLeadsScreen.tsx`, and `pipeline/LeadPipelineScreen.tsx`. Field executive and telecaller workspaces reuse the site visit workspace.
- The routed `details/site-visits/LeadSiteVisitsScreen.tsx` contains a separate selector and sample-backed local state. It must not be treated as a verified persistent scheduling screen.
- Flutter source is not present in this checkout. The separate mobile handoff describes expected behavior without inventing Flutter filenames.

## Implementation sequence

### 1. Backend: make assignment authoritative

1. Add a small reusable assignment resolver within the existing CRM service. Load only the required saved lead fields, reject missing/deleted leads using existing conventions, and validate the assigned field executive with existing eligibility logic.
2. Apply the resolver to both `POST /site-visits` and `POST /leads/:id/pipeline-move` when it creates a visit. Use the pipeline transaction client for its assignment lookup and validation so failure rolls back the status change and visit together.
3. Ignore supplied creation assignment keys for compatibility with older mobile versions. Derive assignment for every role allowed to schedule; there is no admin selection exception.
4. On `PATCH /site-visits/:id`, prevent assignment changes without blocking ordinary schedule, notes, feedback, or status updates. Treat the stored assignment as authoritative for existing visits.
5. Preserve authentication, role checks, lead access controls, response shapes, audit actor, and notification behavior. Confirm the caller is allowed to act on the selected lead; automatic assignment is not authorization.
6. Retain the database assignment field and current API response fields. No schema migration is expected. Update API examples that imply a caller-selected executive.

### 2. Web: update every scheduling entry point

1. Reuse `CreateSiteVisitModal`, `useSiteVisitOptions`, `useSiteVisitMutations`, and existing form/error components.
2. Remove the executive selector, selection state, required-field checks, and assignment keys from creation payloads in the shared modal and each caller.
3. Keep date, time, project, unit, meeting point, and other scheduling behavior intact. Render backend validation using the established error pattern; do not leave the save button disabled because the removed field is empty.
4. If useful, show the assigned field executive as read-only information from existing lead options. This is informational; the backend decides the saved assignment.
5. Retain executive labels on saved visits and authorized executive list filters. The request removes scheduling choices, not reporting information.
6. Account for the older routed lead-site-visits screen. Prefer connecting its entry point to the existing persistent workspace with the correct lead context, preserving navigation and permissions, rather than extending sample-only scheduling. Validate this route explicitly.

### 3. Flutter

Send `FLUTTER_SITE_VISIT_ASSIGNMENT_HANDOFF.md` to the mobile developer. They must inspect all actual mobile scheduling flows, remove the selector and request assignment keys, preserve response parsing, and coordinate with the backend release.

### 4. Verification

| Check | Expected result |
| --- | --- |
| Direct creation for client assigned to A, without an assignment key | Visit saves for A |
| Creation submits B through either legacy assignment key | Visit still saves for A |
| Authorized manager/telecaller creates for A | A receives the visit; creator remains the acting user |
| Missing/inactive/ineligible field executive | Clear error; no visit created |
| Pipeline scheduling fails assignment validation | Neither status change nor visit is persisted |
| Patch changes/removes assigned executive | Rejected; stored assignment unchanged |
| Ordinary edit of historical visit | Other supported fields update; assignment preserved |
| Assignment changes while form is open | Saved lead assignment is used when processing creation |
| Lists, details, dashboard, notification recipient | Reflect the saved executive, respecting existing role visibility |
| Web entry points and Flutter entry points | No executive selector; successful save without selection |

Add focused backend tests for the assignment contract and rollback. Update relevant web form tests, including submission without the removed field. Run affected tests, TypeScript checks, lint without automatic unrelated edits, and API/web builds. Perform authenticated API and browser/device checks; report any unavailable delivery or device verification separately.

### 5. Rollout

Deploy and verify the compatible backend first: the current API rejects creation without an executive, so a UI-only release would fail. Release the web and Flutter changes after the new contract is verified. Test an older mobile request against the new backend and test the new app against the intended environment before distributing the APK.

## Completion evidence

Record changed files, reused components/services, test results, API request/response evidence with personal data removed, web screenshots, and mobile build/device evidence. Do not mark both platforms complete until the Flutter change has been verified.
