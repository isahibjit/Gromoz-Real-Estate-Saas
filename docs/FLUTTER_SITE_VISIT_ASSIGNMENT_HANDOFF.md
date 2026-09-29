# Flutter developer handoff: remove site visit executive selection

Date: 9 September 2026

Status: Implementation request for a planned backend contract. Backend changes are not yet implemented or deployed as part of this document. Flutter source was not available for inspection.

## Ready-to-send developer prompt

Please update the Flutter CRM application's site visit creation/scheduling flow to meet this client requirement:

> “Site visit create me Executive assign ka option nikal dijiye. Jiska client hai usii ke CRM me schedule hoga. Kisi other Executive ko assign ka option nikal dijiye.”

Remove the **Assigned Executive** dropdown from every screen/dialog that can schedule a site visit. The visit must be assigned automatically by the backend to the field executive already assigned to that client. The user must not choose another executive.

### 1. Inspect and reuse the existing application

Trace the actual screen, form validation, state/provider/controller, request model, API service, and success refresh behavior before changing anything. Search for `Assigned Executive`, `assignedExecutiveId`, `assigneeId`, `/site-visits`, and `pipeline-move`.

Check standalone scheduling, lead details/actions, lead status/pipeline transitions, and role-specific scheduling screens wherever they exist. Do not assume filenames or create parallel implementations. Reuse the existing authenticated API client, form controls, error handling, and state management.

### 2. Assignment rule

- The planned server source is the client's saved `fieldExecutiveId`.
- `ownerId` can be a telecaller in this CRM; do not substitute it for `fieldExecutiveId`.
- Do not assign the logged-in user automatically, select the first executive, or calculate a fallback in Flutter.
- The backend saves and returns `assignedExecutiveId`; continue parsing it and displaying the assigned executive on saved visit lists/details.
- A manager or another authorized user scheduling for client A must still create the visit for A's assigned field executive.
- If the saved client has no active eligible field executive, show the backend's validation error. The user must use the existing client-assignment workflow before scheduling.

### 3. Required Flutter changes

1. Remove the executive dropdown and any executive picker navigation from scheduling forms.
2. Remove associated required validation, selected-executive form state, and save-button conditions.
3. Remove `assignedExecutiveId` and `assigneeId` from site visit creation request serialization. Do not send `fieldExecutiveId` as an alternative assignment override. If request/response models are shared, separate request serialization carefully so response data remains supported.
4. Apply the same omission to status/pipeline requests that create site visits.
5. Do not expose executive reassignment in visit edit/reschedule screens or include assignment changes in PATCH payloads.
6. Preserve all other fields, validation, date/time conversion, permissions, navigation, loading states, and duplicate-submit prevention.
7. Optionally show the client's field executive as read-only information if supported by existing lead data. Do not make that cached value authoritative or require it for successful submission when the server can resolve it.
8. Keep the form open with entered values on an API error. Display the existing backend error message through the app's standard error UI.
9. After success, refresh the applicable visit list, lead details, and dashboard using existing mechanisms. Verify the saved visit's executive from the server response or a subsequent fetch.
10. Keep existing check-in/out, maps, tracking, reminders, and saved-visit executive labels working. Keep authorized list filters; they are outside the scheduling-selector removal.

### 4. API coordination

Use the app's existing configured API base URL and authentication. The paths below are relative to that base; do not change environments or hardcode a new host.

| Endpoint | Planned behavior relevant to this change |
| --- | --- |
| `GET /site-visits/options` | Existing lead options include `fieldExecutiveId` and `fieldExecutiveName`; response fields remain available |
| `POST /site-visits` | Send scheduling data without assignment keys; server derives the executive from the saved lead |
| `POST /leads/:id/pipeline-move` | If moving to a site visit status, send the existing status/scheduling data without assignment keys; server derives the executive |
| `PATCH /site-visits/:id` | Edit supported visit fields without changing assignment |
| `GET /site-visits/:id` | Existing saved visit assignment remains available for display and verification |

Illustrative minimal direct-creation JSON after backend deployment:

```json
{
  "leadId": "<existing-lead-id>",
  "projectId": "<existing-project-id>",
  "scheduledAt": "<timestamp-produced-by-existing-app-date-time-conversion>",
  "visitType": "Site Visit"
}
```

Replace the illustrative values with real form data. Continue sending the existing optional scheduling fields when filled. Do not change timezone semantics or response envelopes as part of this task.

For pipeline scheduling, keep the existing `statusId`, `projectId`, `scheduledAt`, and other applicable fields. Do not hardcode status IDs or switch an existing pipeline flow to direct creation, which could bypass its status update.

**Release dependency:** The currently inspected backend requires a submitted executive. Do not release a Flutter build that omits it until the backend team confirms both creation paths support automatic assignment. During development, a backend validation error is not a reason to restore the selector or send a guessed assignee.

The planned backend also tolerates older creation requests containing executive keys by ignoring those keys and resolving the saved lead assignment. Verify this compatibility with the backend team; do not assume it is already deployed.

### 5. Acceptance checks

- Schedule a visit for a client assigned to executive A, logged in as A: no selector appears, creation succeeds, and the saved visit belongs to A.
- Schedule for the same client as another authorized user: the saved visit still belongs to A; the acting user remains the creator.
- Test all actual creation entry points, including status/pipeline scheduling.
- Check a missing or inactive field executive: show a clear server error, preserve the form, and create no visit.
- Change the client's assigned field executive through an authorized workflow while a scheduling form is open: the saved visit uses the server's current assignment when creation is processed.
- Confirm outgoing direct and pipeline creation requests contain no assignment override keys.
- Reschedule/edit a saved visit: supported changes persist and the assigned executive stays unchanged.
- Verify correct visit list/details and dashboard refresh. Verify notification delivery to A where the test environment supports push; report untested delivery explicitly.
- Confirm the dropdown is absent across supported mobile sizes and save remains usable without an executive selection.
- Run Flutter analysis and relevant tests; build the release artifact using the project's existing process and perform a real-device scheduling check.

### 6. Scope and delivery report

Do not bulk reassign historical visits or implement automatic transfer of existing visits when a client is reassigned. Those are separate business decisions. Do not add dependencies, local-only persistence, or new assignment APIs for this change.

Please return:

1. Changed files and existing widgets/services/state management reused.
2. Screens and scheduling entry points covered.
3. Sanitized request/response evidence showing the server-assigned executive.
4. Screenshots or a short recording showing scheduling without the selector.
5. Analysis/test/build results, tested device, app version, API environment, and backend compatibility confirmation.
6. Any remaining issues or checks that could not be completed.

The requirement is complete when scheduling works without selecting an executive, the server saves the client's assigned field executive, and all affected mobile flows have been verified against the updated backend.
