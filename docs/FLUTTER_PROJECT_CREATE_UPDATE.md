# Flutter project creation and editing: API handoff

Verified against repository source on 9 September 2026. This documents the
existing API, not a new endpoint proposal. Flutter source and production request
traces were not available, so the reported mobile defect is not yet reproduced.

## 1. Issue and required outcome

Projects created/edited in the mobile application must persist Number of floors,
Possession, and every Configuration / Carpet area / Price row. Opening the same
project on web must show the values returned by the API, including duplicate
configuration rows (for example two 2 BHK options with different carpet areas).

Do not solve this using local-only fields or a separate mobile project store.
Reuse the app's existing authenticated API client, models, form controls, upload
flow and state-management pattern. Update both serialization and deserialization.

Critical JSON keys, case-sensitive:

- `numberOfFloors`, not `floors`, `floorCount` or `noOfFloors`.
- `possession`, not `possessionDate`.
- `configurationVariants`, not `units` or a configuration-to-area map.
- Each variant: `id`, `configuration`, `carpetArea`, `priceAmount`, `priceUnit`.

The service explicitly selects supported input keys. Unknown keys may be ignored
without a validation error; HTTP success alone does not prove these fields saved.

## 2. Environment, authentication and endpoints

Use the SAME API environment as web. The web client uses `VITE_API_URL`, falling
back to `/api`. With the current public deployment convention the base is
`https://crmtrueroot.com/api`; confirm deployment configuration before release.
The Nest controller paths themselves do not contain `/api`. Do not double it.

JSON requests:

```http
Authorization: Bearer <current-access-token>
Content-Type: application/json
Accept: application/json
```

| Method | Relative endpoint | Purpose | Response body |
| --- | --- | --- | --- |
| GET | /projects?page=1&limit=20&search=MICL | Paginated list | `{ data: Project[], meta: { page, limit, total } }` |
| GET | /projects/{id} | Load full edit/detail model | Project object, not a data envelope |
| POST | /projects | Create | Project object, normally HTTP 201 |
| PATCH | /projects/{id} | Partial update | Project object, normally HTTP 200 |
| GET | /lead-masters/project_location | Location choices | `{ data: Master[], meta: { category } }` |
| GET | /lead-masters/project_configuration | Configuration choices | Same master envelope |
| GET | /lead-masters/project_status | Project status choices | Same master envelope |
| GET | /lead-masters/project_amenity | Amenity choices | Same master envelope |
| POST | /uploads/images | Upload image | Upload metadata with `url`, `key` |
| POST | /uploads/project-videos | Upload video | Upload metadata |
| POST | /uploads/project-brochures | Upload brochure | Upload metadata |

List supports `search` (name/location) and exact `status`. Page is 1-based;
default limit is 10 and current maximum is 5000. Use ordinary pages, not the
maximum. Display `meta.total`, not the length of the loaded page. Reset to page 1
when changing filters. Master requests support `search`; their response is not
the same pagination contract as projects.

Project controller role allowlist: SUPER_ADMIN, ADMIN, SALES_MANAGER, TEAM_LEADER,
MANAGER, SALES_AGENT, TELECALLER, MARKETING. AuthGuard and RolesGuard apply.
PermissionGuard is present but these project handlers currently have no explicit
RequirePermission metadata. Do not infer that from UI visibility, or bypass the
app's existing access restrictions. Handle 401/403; use existing session refresh,
with one bounded retry rather than endless refresh loops.

Use the UUID returned as `id` for PATCH. GET also has a legacy slug fallback,
but PATCH targets the ID only. There is no project PUT or DELETE in this controller.
Public project routes are not the authenticated editing API.

## 3. Form fields and wire types

| UI field | JSON key | Wire value and rule |
| --- | --- | --- |
| Project name | name | Required nonblank string |
| Location | location | Required master **name string**, not master UUID |
| Developer | developer | Optional free-text string; no developer master required |
| Number of floors | numberOfFloors | Optional positive integer; `27`, not `27 floors` |
| Status | status | Selected master name; server create default is `Active` |
| Possession | possession | Optional string; send date-only `YYYY-MM-DD` for new dates |
| Configuration rows | configurationVariants | Ordered array described below |
| Summary minimum price | priceMin + priceMinUnit | Optional decimal amount and `Lakh` or `Cr` |
| Summary maximum price | priceMax + priceMaxUnit | Optional decimal amount and `Lakh` or `Cr` |
| Amenities | amenities | Array of selected name strings |
| Highlights | highlights | Array of strings, not comma-separated text |
| Description | description | Optional string |
| RERA number | reraNumber | Optional string |
| Cover image / gallery | imageUrl / imageGallery | URL string / array of URL strings |
| Videos | videoUrl / videoUrls | Primary URL / ordered URL array |
| Brochures | brochures | Ordered metadata array, see uploads |
| Coordinates | latitude / longitude | Optional numeric values, latitude -90..90, longitude -180..180 |
| Geofence radius | geofenceRadiusM | Positive integer metres; server create default 150 |

Project Name and Location remain mandatory in the UX. Developer, Possession and
summary Price Range must not block saving when blank. Replace Sales Owner with
Number of floors in the mobile project form. Do not erase legacy `salesOwnerId`
on update; it remains stored for other workflows.

Master objects include IDs and names, but project location/configuration/status
store names. Preserve an existing selected value even if no longer returned in
the master list; never clear old project data just because an option is missing.

### Repeatable configuration variants

```json
{
  "id": "mobile-variant-1",
  "configuration": "2 BHK",
  "carpetArea": "555",
  "priceAmount": "1.24",
  "priceUnit": "Cr"
}
```

Keep rows as a List, not a Map keyed by configuration. Generate a stable unique
row ID on addition and preserve returned IDs during edits. IDs are JSON row
identifiers, not unit IDs. Duplicate configuration names are explicitly supported.

Carpet area and price amount are stored/returned as strings. The server tolerates
numeric inputs by converting them, but Flutter should send plain decimal strings.
Do not include commas, currency symbols, `sq.ft.`, `Lakh`, or `Cr` in these values.
Carpet area is sq.ft. and, if entered, must be positive. Price amount may be zero
or positive; blank is `""`, not zero. Units must be exactly `Lakh` or `Cr`.

Variant price `"1.24"` + `"Cr"` stays in that form. Do not multiply it into rupees.
Conversely, project-level summary `minPrice`/`maxPrice` responses are rupee values
and may be decimal strings. Parse them safely, keeping null distinct from zero.
For summary writes use `priceMin: "1.24", priceMinUnit: "Cr"`, OR use raw rupees
as `minPrice: 12400000` without a unit. Do not mix the two conventions.

The backend currently drops rows with no configuration, replaces invalid carpet
and price amounts with empty strings, and defaults unrecognized units to `Cr`.
Validate in Flutter before sending; do not depend on a server 400 for these cases.

`configurations` is a deduplicated summary derived from variants, not the rows.
`configurationCarpetAreas` is legacy compatibility data; it loses repeated
configurations and cannot store prices. Do not use it as the new editing source.

## 4. Create example

Example data only; choose actual master names from this environment.

```http
POST /projects
```

```json
{
  "name": "MICL Mira Road",
  "location": "Mira Road East",
  "developer": "MICL",
  "status": "Under Construction",
  "numberOfFloors": 27,
  "possession": "2027-03-31",
  "priceMin": "1.24",
  "priceMinUnit": "Cr",
  "priceMax": "1.64",
  "priceMaxUnit": "Cr",
  "configurationVariants": [
    { "id": "mobile-variant-1", "configuration": "2 BHK", "carpetArea": "555", "priceAmount": "1.24", "priceUnit": "Cr" },
    { "id": "mobile-variant-2", "configuration": "2 BHK", "carpetArea": "681", "priceAmount": "1.64", "priceUnit": "Cr" }
  ],
  "amenities": [],
  "highlights": [],
  "imageGallery": [],
  "videoUrls": [],
  "brochures": []
}
```

The returned root Project object includes `id`, `numberOfFloors`, `possession`,
`configurationVariants`, derived `configurations`, legacy carpet data, rupee
`minPrice`/`maxPrice`, display `priceRange`, and other project fields. Save the
returned ID and parse the actual response, not a locally reconstructed object.

Minimal valid mobile form submission can be just `name` and `location`; do not
invent mandatory values for optional fields. Prefer selecting a real status.

## 5. Update and intentional clearing

```http
PATCH /projects/<project-uuid>
```

```json
{
  "numberOfFloors": 28,
  "possession": "2027-06-30",
  "configurationVariants": [
    { "id": "mobile-variant-1", "configuration": "2 BHK", "carpetArea": "555", "priceAmount": "1.30", "priceUnit": "Cr" },
    { "id": "mobile-variant-2", "configuration": "2 BHK", "carpetArea": "681", "priceAmount": "1.64", "priceUnit": "Cr" }
  ]
}
```

PATCH should send only intentionally edited fields. Omitted fields generally
remain unchanged. Arrays replace the whole saved collection: send ALL retained
variant rows, not only the changed row. A removed row must be absent from the array.

| Intent | Payload |
| --- | --- |
| Keep existing floors/date/variants | Omit the respective keys |
| Clear floors | `"numberOfFloors": null` |
| Clear possession or developer | `"possession": null`, `"developer": null` |
| Clear all configuration variants | `"configurationVariants": []` |
| Clear one variant price | Keep row, set its `priceAmount` to `""` |
| Clear brochures | `"brochures": []` |
| Clear videos | `"videoUrls": []` together with `"videoUrl": null` |

Do not use a generic serializer that removes every null: explicit null clears
supported nullable fields. Do not serialize untouched fields as empty arrays/nulls.
Do not include IDs/timestamps/counters/units from the response in an edit request.

Known API limitation: clearing existing summary `minPrice`/`maxPrice` with null
or empty strings currently becomes an omitted Prisma update, so the previous
price remains. Do not pretend this operation succeeded or replace it with zero.
This needs a separate backend fix; blank prices on creation are supported.

## 6. Possession dates and legacy web behavior

Store newly selected dates as `YYYY-MM-DD` under `possession`. Display dates in
the user's preferred format without changing the wire format. This is a calendar
date: do not convert local midnight through UTC and accidentally shift a day.

The API currently stores `possession` as a nullable STRING without date validation.
Existing values may therefore be `Ready by Mar 2027`, a date-only value, or other
legacy text. Preserve unparseable legacy text when untouched. Show it as an
existing value with an explicit action to replace it with a new date; do not guess
an exact day for a month-only possession value.

Confirmed web inconsistency: ProjectsScreen.createProject calls
formatProjectPossession and saves `Ready by <month> <year>`. ProjectDetailsScreen
passes possession directly into DatePicker. That formatted text is not a valid
HTML date-input value. A blank web date field can therefore be a web rendering
issue even when the API preserved the value. Web creation should ultimately send
date-only values and legacy display must be handled separately. This handoff
does not change that implementation or migrate historical dates.

## 7. Uploads

Upload with authenticated multipart/form-data using field name `file`; let the
HTTP client generate the multipart boundary. Then include returned remote URLs
in the project JSON. Never save device paths, `file://` URIs or local thumbnails
as project images/brochures.

Controller size ceilings: images/videos 100 MiB; brochures 25 MiB. These are not
guarantees that every MIME type is accepted; surface upload-service validation
errors. Video/brochure responses include `url`, `key`, `mimeType`, `sizeBytes`.

Example brochure mapping after a successful upload:

```json
{
  "brochures": [
    {
      "url": "<returned-url>",
      "storageKey": "<returned-key>",
      "fileName": "project-brochure.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 123456
    }
  ]
}
```

The first brochure is mirrored into legacy primary-brochure fields by the API.
Preserve existing uploads and their metadata unless the user removes them. Project
creation and file uploads are separate operations, not a single transaction.
Do not automatically delete remote uploads on a form failure without a supported
cleanup API. Prevent Save while required uploads are still running or failed.

## 8. Flutter implementation checklist

1. Extend the existing Project model with nullable integer floors, nullable string
   possession, and ordered configuration variants. Add fromJson/toJson tests.
2. Model variants with string IDs, configuration, carpetArea, priceAmount and an
   explicit Lakh/Cr unit. Accept number-or-string decimal responses safely.
3. On edit, fetch GET /projects/{id}; do not initialize solely from a stale list
   item. Preserve optional values, row order and duplicate configurations.
4. Load masters using the existing repository. Add rows with independent controls
   and stable keys, removable individually. Use numeric keyboards and inline errors.
5. Keep blank optional fields valid; validate positive integer floors, positive
   entered carpet area, nonnegative price and min <= max for entered summary prices.
6. Submit once; disable repeated taps while saving. Do not auto-retry an ambiguous
   failed POST, since create has no idempotency-key handling and can duplicate data.
7. Await the request; handle the returned Project object and invalidate project
   list/detail caches. Preserve user input if the server fails. Do not navigate
   away or show success before receiving a successful response.
8. GET the saved project again during verification. Compare the three reported
   fields, then open the same UUID in web. Refresh web before diagnosing stale UI;
   mobile cache invalidation does not refresh a different browser session.
9. Record sanitized method, URL, payload and response for failures in development.
   Never log bearer tokens, credentials or unrestricted personal data.

Missing new variants on legacy records: prefer the server-enriched variant list.
If an older API returns no variants, convert each legacy carpet-map entry into
one row with blank price and Cr unit. Configurations with no carpet data can be
shown as rows with blank area/price. Never overwrite real variants with that
lossy fallback, and never deduplicate the variant list.

## 9. Diagnosis and acceptance tests

Capture a real mobile save and the immediate GET response before assigning blame:

| Observation | Investigate |
| --- | --- |
| Request has no floors/date/variants | Flutter controller-to-model or toJson mapping |
| Request uses wrong field names | Flutter request DTO |
| GET retains values but mobile is blank | Flutter fromJson/edit initialization/cache |
| GET retains date text but web date input is blank | Web possession formatting inconsistency |
| GET loses values despite correct payload | Deployed API version, migrations, normalizers and DB |
| Different IDs or results between mobile/web | Different environment, wrong ID or stale cache |

Required release tests:

- Mobile create with floors 27, full possession date, two 2 BHK rows of different
  carpet areas/prices. GET, restart app and open web: all values match.
- Mobile edit floors/date/one row price; retain the other row and all unrelated
  project images, brochures, summary prices and stored sales-owner data.
- Add/remove duplicate rows; order and row identity survive reload.
- Create with blank developer, possession and summary price range.
- Clear floors, possession, all variants, and a single variant price; verify GET.
- Test Lakh and Cr without double currency conversion or treating blank as zero.
- Reject zero/negative/fractional floors and invalid entered carpet/price text.
- Edit legacy carpet-map and month-only possession data without silent loss.
- Web-created project loads/edits in mobile; mobile-created project loads/edits
  in web. Verify the same project UUID and API base URL.
- Failed upload, offline save, expired auth and repeated taps do not fake success
  or create duplicate projects. Display server messages, including floor errors.

API is currently loosely typed for project bodies and not all invalid input is
guaranteed to yield clean 400 responses. Missing project GET returns 404; PATCH
does not have the same explicit existence check. Handle non-2xx generically too.

## 10. Source references and scope

- `apps/api/src/crm/crm.controllers.ts`: ProjectsController and LeadMastersController.
- `apps/api/src/crm/crm.service.ts`: createProject, updateProject, getProject,
  listProjects, enrichProject, normalizeProjectConfigurationVariants,
  normalizeOptionalFloorCount, parsePriceInput and listMasters.
- `apps/api/prisma/schema.prisma`: Project and ProjectUnit storage.
- `apps/api/src/uploads/uploads.controller.ts`: upload routes and size limits.
- `apps/web/src/screens/admin/projects/useProjectsApi.ts`: API response mapping,
  uploads, create/update requests and web cache invalidation.
- `apps/web/src/screens/admin/projects/ProjectsScreen.tsx`: creation payload and
  formatProjectPossession.
- `apps/web/src/screens/admin/projects/ProjectDetailsScreen.tsx`: editing payload
  and possession DatePicker binding.

No Flutter code, API behavior, database schema or production data was changed
while preparing this document. Existing deployment must include the Project
numberOfFloors/configurationVariants schema changes. Build success alone is not
mobile-to-web round-trip verification. Complete the tests above on the deployed
environment with sanitized evidence before marking the reported issue fixed.
