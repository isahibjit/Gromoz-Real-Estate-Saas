# Pre Sales and Sales dashboards: repair prompt and API handoff

Source audit: 9 September 2026. Documentation only; no dashboard implementation
or production data was changed. The supplied Dart screens were inspected alongside
the current NestJS dashboard service. No authenticated production response or
Flutter provider implementation was supplied, so runtime behavior still needs
verification. Do not attribute every zero to the mobile parser.

## 1. Copy-ready developer assignment

Repair the existing Pre Sales (TELECALLER) and Sales Executive (SALES_AGENT)
dashboards so every KPI represents the correct metric for the authenticated user.
Fix both the mobile field mappings and the backend aggregate contract. Preserve
existing navigation, attendance/camera flows, site-visit tracking, maps, rankings,
notification actions and branding. Reuse Provider, DashboardProvider, the existing
authenticated API client, metric cards and TodaysFollowUpsFab. Do not replace the
whole app architecture or introduce another state-management framework.

Do not fake unavailable metrics with zero, count a capped list as a global total,
or substitute visit metrics for lead/follow-up metrics. Genuine server zero must
remain zero. The Today Follow Up card, tasks section and floating badge must use
the same metric, scope and refresh state. Supply unit/widget/integration tests
and sanitized request/response evidence for both roles before closing the issue.

Work with the API developer on the server blockers below. Do not call admin
endpoints from an employee account to obtain missing counts. Proposed fields in
this document are NOT currently available and must not be assumed deployed.

## 2. Evidence supplied and files still required

Attachment A: `06034c21-780e-4301-a5d1-602b1850e75a/pasted-text.txt` contains
TelecallerDashboardScreen / TelecallerDashboardView, summary construction,
metric parsing and shared TelecallerDashboardFeatureSections.

Attachment B: `6e62459f-8bdd-4191-bf83-ace2eb49bbe4/pasted-text.txt` contains
FieldExecutiveDashboardView, _FieldDashboardData, _ExecutiveMetrics and
_dashboardInt. Line references below refer to these pasted attachments.

Before changing the Flutter data layer, inspect these imports in its repository:

- `provider/dashboard_provider.dart`: fetchTelecallerDashboard and
  fetchFieldExecutiveDashboard; confirm URLs, auth and caching.
- `data/models/api_response.dart`: confirm whether `.data` is the raw HTTP body
  or has already removed a response envelope.
- `provider/leads_provider.dart`: follow-up/lead scopes, pagination and models.
- `provider/site_visits_provider.dart`: filters, parsed dates and shared list state.
- `widget/todays_follow_ups_fab.dart`: its count source, closure rules and lifecycle.
- AuthProvider, AppRouter and the app shell: role mapping, session reset and
  route-return behavior.

These dependencies were not attached. In particular, the floating badge's exact
calculation cannot be established from the two screens alone.

## 3. Confirmed findings

### Pre Sales screen

1. A:1165-1194 prefers API KPIs over list calculations. `_kpiInt` at A:3947 already
   handles `{ value: n }`, `{ count: n }`, `{ total: n }`, numbers and numeric
   strings. The previous hypothesis that this screen cannot parse `.value` is
   NOT supported by the submitted code. Inspect ApiResponse wrapping separately.
2. The server's `kpi.newLeads.value` counts leads created today, while the fallback
   counts leads matching New status. Which result appears changes the meaning of
   the same card. This is a semantic contract defect, not a number-format defect.
3. The server sends `hotLeads: 0` and `coldLeads: 0` as constants. The parser
   correctly honors them, so the local hot-lead fallback never replaces them.
   Fix the server; do not add `if zero then use fallback`.
4. A:189-194 loads at most 500 leads, 500 follow-ups and 100 visits. Fallback
   totals/metrics cannot represent the full dataset. Increasing limits is not a
   production fix. Separate preview lists from aggregate counts.
5. A:1150-1159 takes the maximum of matching lead counts and visit-record counts.
   These are different units and potentially overlapping sets. `max` is not a
   valid deduplication or aggregation strategy.
6. A:263-270 does not include a missing dashboard response in its error condition.
   Dashboard failure may silently activate partial-list calculations. Each data
   source needs an independent load/error state.
7. A:188 starts a multi-service Future.wait without screen-level try/finally.
   If a provider throws instead of returning null, loading can remain active.
   The initial `_isLoading && _hasLoaded` guard also permits overlapping loads
   before the first successful load; use an in-flight/request-generation policy.
8. The root screen instantiates TodaysFollowUpsFab without passing its summary.
   This is not proof of the widget's bug, but confirms the screen itself does not
   bind the badge directly to the displayed Today Follow Up count.

### Sales Executive screen

1. B:4181-4210 reads newLeads, missedFollowUps, interestedLeads,
   notInterestedLeads, hotLeads and reVisitDone, but the existing field-executive
   API does not return them. `_dashboardInt` at B:4311 returns zero for absent
   fields. Those cards can show manufactured zeros rather than real counts.
2. B:4186 uses `pendingFollowUps` as an alias for today's follow-ups. Current API
   pendingFollowUps includes future dates, so that alias has the wrong meaning.
3. B:880-893 passes unrelated values into TelecallerDashboardFeatureSections:

| Section input | Currently passed | Why incorrect |
| --- | --- | --- |
| missedFollowUps | _data.missedVisits | Visits are not follow-ups |
| interestedLeads | _data.upcomingVisits | Scheduled visits do not count interested leads |
| notInterestedLeads | _data.missedVisits | Missing a visit is not a lead status |
| todayCallFollowUps | _data.pendingFollowUps | All pending follow-ups are not today's calls |
| dueNextHour | _data.upcomingVisits | Upcoming visits have no one-hour follow-up restriction |
| missedSla | _data.missedCheckIns | A missed check-in is not the follow-up SLA metric |
| needsImmediateResponse | _data.pendingCheckIns | Different business concept |

4. B:1855 renders `_data.todayFollowUps` in the card, but B:882 passes
   `_data.myDayFollowUpsToday` into shared sections. These must not drift.
5. The shared feature-section constructor in A:983 constructs a summary with
   `hotLeads: 0` and an empty upcoming-follow-ups list. Refactor it to accept the
   actual typed summary/section data rather than inventing missing metrics.
6. `_dashboardInt` accepts a List by returning its length and recursively searches
   arbitrary nested maps. That hides contract drift and can pick an unrelated
   field. Use explicit endpoint adapters rather than adding more aliases.
7. `_loadTodayVisitRoute` uses session employeeId before other identity candidates.
   Verify the provider's fieldExecutiveId filter expects User.id, not an employee
   profile ID or display code. Keep route filters consistent with server identity.

### Backend blockers, not Flutter-only work

Source: `apps/api/src/dashboard/dashboard.service.ts`:

- getTelecallerDashboardData (around 3924): New Leads uses createdAt >= server
  midnight, not current lead status. Total leads only filters telecallerId and
  does not exclude deleted leads. Interest KPIs use legacy interestLevel, which
  may disagree with status-master-based lead screens.
- Telecaller today's follow-ups has only a lower bound, no tomorrow cutoff and
  no completedAt filter. Missed follow-ups uses scheduledAt < now, while the
  Dart fallback uses scheduledAt < todayStart. They are different definitions.
- Its per-query `.catch(() => 0)` hides database errors as valid KPI results.
- getFieldExecutiveDashboardData (around 4162): pendingFollowUps is incomplete
  assigned follow-ups from today onward, not today-only and not all pending.
  myDay.followUpsToday aliases that same value.
- Both endpoints use server-local day boundaries, which need not equal IST.
- IMPORTANT SCOPE BUG: completedVisits uses `{ ...visitWhere, OR: completion }`.
  visitWhere itself holds the user's visibility OR; the second OR overwrites it.
  This can count other users' completed visits. Combine predicates with
  `AND: [visitWhere, completionPredicate]` and test unrelated users explicitly.
- Sales missing metrics must be supplied by authorized server aggregates, not
  guessed from its first page of visits or another role's dashboard.

## 4. Current API contract (available today)

Use the existing mobile base URL aligned with web (public convention:
`https://crmtrueroot.com/api`) and `Authorization: Bearer <access token>`.
No userId is needed on these endpoints: the backend uses authenticated `sub`.

| Role | Endpoint | Root object |
| --- | --- | --- |
| Pre Sales / TELECALLER | GET /dashboard/telecaller | `kpi` (singular) |
| Sales Executive / SALES_AGENT | GET /dashboard/field-executive | `kpis` (plural) |

Both require dashboard permission. The telecaller controller also permits ADMIN
and SUPER_ADMIN, but still scopes by their own authenticated ID; that is not an
admin-wide dashboard. Field-executive route currently permits SALES_AGENT only.
These two controller methods do not consume query filters. Do not assume passing
teamId, dates or status makes their counts filter-aware.

Current Pre Sales response paths:

| Path | Shape | Current semantics / limitation |
| --- | --- | --- |
| kpi.totalAssignedLeads | number | telecallerId assignment, includes deleted records |
| kpi.newLeads.value | number | Created since server midnight |
| kpi.todaysFollowUps.value | number | All assigned scheduled since midnight, including future/completed |
| kpi.missedFollowUps.value | number | Incomplete assigned follow-ups before now |
| kpi.interestedLeads | number | interestLevel in Interested/High/Very High |
| kpi.notInterestedLeads | number | interestLevel equals Not Interested |
| kpi.hotLeads / coldLeads | number | Hardcoded zero |
| kpi.siteVisitScheduled | number | Assigned-executive visits in Scheduled/Upcoming |
| kpi.bookingsDone.value | number | Existing booking aggregate; do not infer period from badge alone |
| kpi.convertedLeads.value | number | Alias of bookingsDone |

It does not currently return Site Visit Done or Re-Visit Done KPI keys expected
by the Dart fallback reader. Keep nested value/badge objects intact for existing
web consumers during any backend change.

Current Sales `kpis` numeric fields:

```text
assignedLeads, todaysVisits, upcomingVisits, completedVisits,
pendingFollowUps, missedVisits, checkInsPending, bookingsAssisted
```

`myDay` contains todaysVisits, followUpsToday, checkInsPending, completedVisits
(today's checked-out schedule items) and nextVisit. `kpis.completedVisits` is not
the same metric as `myDay.completedVisits`. Do not substitute one for the other.

No newLeads, interestedLeads, notInterestedLeads, hotLeads, reVisitDone or
missedFollowUps are currently present in Sales kpis. The screenshot's zero values
are consistent with the supplied Dart defaults, not evidence the database is empty.

## 5. Agreed target semantics before implementation

Recommended contract for these status-oriented cards, based on the client request.
Confirm with the product/API owner and apply identically to card-click lists:

| Metric | Target definition |
| --- | --- |
| Total Leads | Non-deleted distinct leads visible in this user's lead workspace |
| New Leads | Those leads currently in the New Lead master status, regardless of creation date |
| Today Follow Up | Incomplete visible/assigned follow-up records in today's IST day window |
| Missed Follow Up | Incomplete visible/assigned follow-up records scheduled before today's IST start |
| Interested / Not Interested | Distinct scoped leads by their configured status master |
| Hot Leads | Distinct scoped leads by the existing hot/temperature master classification |
| Site Visit Done | Distinct scoped leads with a qualifying completed primary visit |
| Re-Visit Done | Distinct scoped leads with a qualifying completed revisit |
| Booking Done | Distinct scoped leads with qualifying confirmed/completed bookings |

If the intended metric is visit records or bookings rather than distinct leads,
label it accordingly and document its unit. Do not mix units in lead charts.
Missed-before-today is chosen to avoid overlap with Today's pending; a separate
Overdue Now metric can include today's past times if required. Do not silently
switch the definition based on endpoint availability.

Retain 'created today' as a separately named metric if needed. Remove the Today
badge from a status-based New Leads card. Use master identity/classification,
not substring tests such as 'interested' that also match 'not interested'.

Backend must reuse the lead workspace visibility policy rather than merely
combining all historical associations. Check task ownership and visibility for
follow-up aggregates. Do not expose unrelated users' aggregate counts.

Use Asia/Kolkata business day boundaries as a half-open interval [start, end).
For 9 September 2026 IST that is 2026-09-08T18:30:00Z through (excluding)
2026-09-09T18:30:00Z. Do not use device/server midnight as the authority.

## 6. Suggested additive API contract (not implemented)

Avoid breaking existing web/mobile clients by changing singular/plural roots or
replacing existing nested KPI objects in place. Add an explicitly versioned shared
summary to BOTH existing role endpoints, then migrate consumers deliberately.
Example shape below uses synthetic numbers to illustrate the contract only:

```json
{
  "leadSummary": {
    "version": 1,
    "timezone": "Asia/Kolkata",
    "asOf": "2026-09-09T06:30:00Z",
    "dayStart": "2026-09-08T18:30:00Z",
    "dayEndExclusive": "2026-09-09T18:30:00Z",
    "totalLeads": 190,
    "newLeads": 25,
    "todayFollowUps": 1,
    "missedFollowUps": 3,
    "interestedLeads": 12,
    "notInterestedLeads": 7,
    "hotLeads": 4,
    "siteVisitDoneLeads": 14,
    "reVisitDoneLeads": 2,
    "bookingDoneLeads": 1
  }
}
```

Return complete aggregate counts, not counts computed after pagination. Preserve
existing visit execution fields for maps/check-in sections. Add genuine call/SLA
metrics only if implemented; otherwise mark those sections unavailable instead
of deriving them from visits. Fix legacy scope leaks immediately, even while
rollout of the additive contract is staged.

## 7. Flutter repair implementation

1. Inspect the missing providers and capture each role's real response first.
   Verify singular kpi vs plural kpis, ApiResponse envelope and authenticated role.
2. Introduce/extend one typed dashboard summary in DashboardProvider, with an
   explicit adapter per supported API version. Keep provider state separated by
   account and role. Missing or malformed required metrics are unavailable/error,
   not zero. An API-provided zero remains a valid count.
3. Remove authoritative KPI fallbacks based on capped LeadProvider lists. Keep
   paginated lists for previews only. Never use list length or max(list counts)
   to manufacture a dashboard total.
4. Rebind _ExecutiveMetrics and TelecallerDashboardFeatureSections to the same
   typed summary. Remove all visit-to-lead/follow-up substitutions listed above.
   Replace the shared section's hardcoded values with supported inputs.
5. Connect TodaysFollowUpsFab, both Today cards and task sections to the same
   Provider selector/count. Inspect the widget implementation before editing.
   If its intended meaning is 'due now', rename it instead of showing two
   different counts under today's label.
6. Render loading separately from loaded zero. On refresh failure retain the last
   successful values with a stale/retry indicator; initial failure shows unavailable.
   Do not replace a good summary with empty defaults after a null response.
7. Make refresh single-flight or request-generation guarded. An old request must
   not overwrite a newer response or the next signed-in user's state. Use
   try/catch/finally and mounted checks; stop subscriptions/timers on dispose.
8. Refresh on successful lead/status/assignment/follow-up/site-visit/booking
   changes, route return, pull-to-refresh and app resume. Coalesce triggers and
   isolate optional attendance/ranking/map errors from core dashboard state.
9. Card taps must open existing authorized lists with predicates matching the
   count, including IST bounds and incomplete status for follow-ups. Inspect
   supported list API parameters and route arguments; do not invent filter names.
10. Preserve unrelated UI functionality. A redesigned card does not fix an API
    contract. Implement the smallest model/provider/binding changes necessary.

Do not 'fix' zero by fetching an admin dashboard, using a different userId,
changing roles, or replacing server zero with cached nonzero values.

## 8. Verification checklist

| Test | Expected result |
| --- | --- |
| API newLeads is nested zero on legacy Pre Sales | Parsed as genuine zero, not replaced by local count |
| API required metric missing | Unavailable/contract error, not fabricated zero |
| Sales API lacks six fields | No silent zero fallback; backend dependency reported |
| Old New-status lead exists, none created today | Status New metric counts it; Created Today stays zero |
| Yesterday/today/tomorrow incomplete follow-ups | Only today in Today, yesterday in Missed, tomorrow in neither |
| Completed follow-up today | Excluded from pending Today and floating badge |
| 00:00 IST and next-day 00:00 IST | Start included, next-day start excluded |
| More than 500 leads / 100 visits | Aggregates remain complete, not capped |
| Multiple completed visits for one lead | Lead metric counts once; execution visit count may differ |
| Completed visit for unrelated employee | Does not affect current user's metrics |
| Delete/archive a lead | Apply the same active/visibility policy as target list |
| Failed core endpoint / failed optional rankings | Honest error/stale state; rankings do not destroy valid KPIs |
| Rapid refresh / login as another account | Old response does not overwrite new/account state |
| Follow-up completed in another screen | Card, tasks and badge refresh to the same value |
| Pre Sales and Sales card taps | Matching authorized filtered list total |

Add pure parser tests, summary binding/widget tests, provider race/error tests,
and backend aggregate tests with fixed clock and two unrelated users. Run Flutter
analyze/tests and API tests/build. Live validation must compare response values
with the UI and filtered list for the SAME user/environment, not different roles.

## 9. Required delivery evidence

- List changed Flutter files and reused components/providers.
- List API fixes and any new contract version/fields; no invented endpoints.
- Supply sanitized response snippets for both roles, screenshots of matching
  cards/badge/list and the test results.
- Record failures separately from zero counts. Redact bearer tokens and personal
  details. Do not mark the issue fixed based only on a screenshot or a build.

Backend reference: `apps/api/src/dashboard/dashboard.controller.ts` and
`apps/api/src/dashboard/dashboard.service.ts`. Related existing lead authorization:
`apps/api/src/crm/lead-visibility.service.ts`. Check list semantics in CrmService
before extracting/reusing predicates. Flutter references are attachment A/B and
the missing imported files listed in section 2, not files present in this CRM repo.
