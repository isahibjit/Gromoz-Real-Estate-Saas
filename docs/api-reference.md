# Truroot CRM API Reference

Base URL variables:
- Local: `http://localhost:5002`
- Postman variable: `{{baseUrl}}`

Authentication:
- Most endpoints require login through `POST /auth/login`.
- The API sets `accessToken` and `refreshToken` cookies. The Postman collection also stores returned token values into variables when present.
- Protected endpoints may use `Authorization: Bearer {{accessToken}}` plus cookies.
- RBAC is enforced through role guards and module permissions.

Common pagination/query params:
- `page`: page number, example `1`
- `limit`: rows per page, example `10`
- `search`: free text search
- `dateFrom`, `dateTo`: ISO date strings, example `2026-07-01`

## System

### `GET /`
Root health response.

### `GET /hello`
Simple hello/debug endpoint.

### `GET /health`
Aggregated health response.

### `GET /health/live`
Liveness probe.

### `GET /health/ready`
Readiness probe. Returns `503` if dependencies are not ready.

## Auth

### `POST /auth/login`
Logs in and sets auth cookies.

Body:
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

### `POST /auth/refresh`
Refreshes auth cookies using the `refreshToken` cookie.

### `POST /auth/logout`
Invalidates refresh session when available and clears auth cookies.

## Dashboard

### `GET /dashboard/admin`
Admin dashboard data.

Params:
```json
{
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31"
}
```

### `GET /dashboard/admin/performance`
Admin-wide employee performance dashboard.

Params:
```json
{
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31",
  "role": "all",
  "teamId": "all",
  "userId": "all",
  "activityType": "all",
  "page": "1",
  "limit": "20"
}
```

### `GET /dashboard/rankings`
User/team leaderboard based on lead status scoring.

Params:
```json
{
  "range": "monthly",
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31",
  "teamId": "all",
  "userId": "all",
  "mode": "both"
}
```

### `GET /dashboard/telecaller`
Pre Sales dashboard for the logged-in user.

### `GET /dashboard/field-executive`
Field executive dashboard for the logged-in user.

## Access Control

### `GET /access/modules`
Lists canonical permission modules.

### `GET /access/templates`
Lists role permission templates.

### `PATCH /access/templates/:role`
Updates the permission template for a role.

Body:
```json
{
  "permissions": [
    {
      "moduleKey": "leads",
      "canView": true,
      "canCreate": true,
      "canUpdate": true,
      "canDelete": false
    }
  ]
}
```

### `GET /access/users/:id`
Gets a user’s effective and custom access.

### `PATCH /access/users/:id`
Updates a user’s custom module permissions.

Body:
```json
{
  "permissions": [
    {
      "moduleKey": "projects",
      "canView": true,
      "canCreate": false,
      "canUpdate": false,
      "canDelete": false
    }
  ]
}
```

### `DELETE /access/users/:id`
Resets user access overrides to role defaults.

## Employees And Teams

### `GET /employees`
Lists employees. Admin/HR scoped.

Params:
```json
{
  "search": "Sneha",
  "role": "TELECALLER",
  "teamId": "all",
  "status": "Active",
  "page": "1",
  "limit": "10"
}
```

### `GET /employees/me`
Gets the logged-in employee profile.

### `GET /employees/:id`
Gets one employee profile.

### `POST /employees`
Creates an employee.

Body:
```json
{
  "fullName": "Pre Sales Test",
  "email": "telecaller@example.com",
  "phone": "9876543210",
  "role": "TELECALLER",
  "designation": "Pre Sales",
  "teamId": "{{teamId}}",
  "shiftId": "{{shiftId}}",
  "monthlyBasic": 30000,
  "monthlyAllowances": 5000,
  "monthlyDeductions": 0,
  "joiningDate": "2026-07-01",
  "password": "Password@123",
  "permissions": [
    {
      "moduleKey": "projects",
      "canView": true,
      "canCreate": false,
      "canUpdate": false,
      "canDelete": false
    }
  ]
}
```

### `PATCH /employees/:id`
Updates employee profile/payroll/team/shift/access fields.

### `GET /teams`
Lists teams visible to the actor.

### `GET /teams/:id`
Gets team details.

### `POST /teams`
Creates a team.

Body:
```json
{
  "name": "Sales Alpha",
  "code": "ALPHA",
  "leaderUserId": "{{employeeId}}",
  "description": "Primary sales team"
}
```

### `PATCH /teams/:id`
Updates team fields.

### `POST /teams/:id/members`
Adds a member to a team.

Body:
```json
{
  "memberUserId": "{{employeeId}}"
}
```

### `DELETE /teams/:id/members/:memberId`
Removes a team member.

## Attendance, Shifts, Holidays, Leaves

### `GET /attendance`
Lists attendance rows, including generated rows for absent/holiday/leave days.

Params:
```json
{
  "employeeId": "{{employeeId}}",
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31",
  "status": "Present",
  "page": "1",
  "limit": "10"
}
```

### `GET /attendance/today`
Gets logged-in user’s punch status for today.

### `GET /attendance/report.pdf`
Downloads monthly attendance PDF.

Params:
```json
{
  "employeeId": "{{employeeId}}",
  "month": "7",
  "year": "2026"
}
```

### `POST /attendance/punch-in`
Punches in. Selfie image is required.

Body:
```json
{
  "checkInImageUrl": "https://example.com/selfie.jpg"
}
```

### `POST /attendance/punch-out`
Punches out for today.

### `PATCH /attendance/:id/correct`
Manual attendance correction.

Body:
```json
{
  "status": "Present",
  "checkInAt": "2026-07-22T09:35:00.000Z",
  "checkOutAt": "2026-07-22T18:30:00.000Z",
  "reason": "Manual correction approved by HR"
}
```

### `GET /shifts`
Lists shift templates.

### `POST /shifts`
Creates a shift template.

Body:
```json
{
  "name": "Telecalling shift",
  "startTimeMinutes": 600,
  "endTimeMinutes": 1140,
  "lateGraceMinutes": 10,
  "lateThresholdCount": 3,
  "latePenaltyStatus": "Half Day",
  "workingDays": [1, 2, 3, 4, 5, 6],
  "isActive": true
}
```

### `PATCH /shifts/:id`
Updates a shift template.

### `GET /holidays`
Lists holidays.

Params:
```json
{
  "year": "2026",
  "month": "7",
  "status": "Approved"
}
```

### `POST /holidays`
Creates a holiday.

Body:
```json
{
  "name": "Independence Day",
  "date": "2026-08-15",
  "type": "Public Holiday",
  "isActive": true
}
```

### `PATCH /holidays/:id`
Updates a holiday.

### `DELETE /holidays/:id`
Deletes/removes a holiday.

### `GET /leaves`
Lists leave requests.

Params:
```json
{
  "employeeId": "{{employeeId}}",
  "status": "Pending",
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31"
}
```

### `POST /leaves`
Creates a leave request.

Body:
```json
{
  "leaveType": "Casual Leave",
  "startDate": "2026-07-25",
  "endDate": "2026-07-26",
  "reason": "Personal work"
}
```

### `PATCH /leaves/:id/cancel`
Cancels own leave request.

### `PATCH /leaves/:id/decision`
Approves or rejects a leave request.

Body:
```json
{
  "status": "Approved",
  "decisionNote": "Approved by HR"
}
```

## Payroll, Payslips, Mail

### `GET /payroll/settings`
Gets payroll settings.

### `PATCH /payroll/settings`
Updates payroll settings.

Body:
```json
{
  "salaryDivisorType": "WORKING_DAYS",
  "fixedMonthlyDays": 30,
  "lopDeductionEnabled": true
}
```

### `GET /payroll`
Lists payroll runs.

Params:
```json
{
  "month": "7",
  "year": "2026",
  "status": "Draft"
}
```

### `POST /payroll/run`
Creates a payroll run.

Body:
```json
{
  "month": 7,
  "year": 2026,
  "employeeIds": ["{{employeeId}}"]
}
```

### `PATCH /payroll/:id/finalize`
Finalizes payroll.

Body:
```json
{
  "note": "Verified and finalized"
}
```

### `PATCH /payroll/:id/pay`
Marks payroll as paid.

### `GET /payslips`
Lists payslips.

### `GET /payslips/:id`
Gets a payslip document/details.

### `POST /mail/test-send`
Sends a test mail template.

Body:
```json
{
  "to": "hr@example.com",
  "subject": "Test mail",
  "message": "This is a test email from Truroot CRM."
}
```

## Leads

### `GET /leads`
Lists active leads. Deleted leads are excluded.

Params:
```json
{
  "search": "Arjun",
  "page": "1",
  "limit": "10",
  "source": "MagicBricks",
  "status": "Interested",
  "leadType": "Hot",
  "configuration": "2 BHK",
  "project": "Palm Springs",
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31"
}
```

### `GET /leads/deleted`
Lists soft-deleted leads.

### `GET /leads/:id`
Gets lead details.

### `POST /leads`
Creates a lead.

Body:
```json
{
  "name": "Arjun Mehta",
  "email": "arjun@example.com",
  "mobileCountryCode": "+91",
  "mobile": "9876543210",
  "sourceId": "{{sourceId}}",
  "statusId": "{{statusId}}",
  "temperatureId": "{{leadTypeId}}",
  "telecallerId": "{{telecallerId}}",
  "fieldExecutiveId": "{{fieldExecutiveId}}",
  "remarks": "Looking for ready possession.",
  "requirement": {
    "propertyType": "Apartment",
    "configuration": "2 BHK",
    "budgetRange": "75 Lakh - 1 Cr",
    "preferredLocation": "Malad, Mumbai",
    "preferredProjectId": "{{projectId}}",
    "possessionTimeline": "Ready To Move",
    "carpetAreaRange": "650 - 800 sq ft",
    "zone": "Western Line"
  }
}
```

### `PATCH /leads/:id`
Updates lead details, status, type, assignment, and requirement fields.

### `DELETE /leads/:id`
Soft-deletes a lead.

Body:
```json
{
  "deleteReason": "Duplicate enquiry"
}
```

### `PATCH /leads/:id/restore`
Restores a soft-deleted lead.

### `POST /leads/:id/assign`
Assigns one lead.

Body:
```json
{
  "telecallerId": "{{telecallerId}}",
  "fieldExecutiveId": "{{fieldExecutiveId}}",
  "managerId": "{{managerId}}"
}
```

### `POST /leads/bulk-assign`
Bulk assigns leads.

Body:
```json
{
  "leadIds": ["{{leadId}}"],
  "telecallerId": "{{telecallerId}}",
  "fieldExecutiveId": "{{fieldExecutiveId}}",
  "duplicate": false
}
```

### `PATCH /leads/bulk/source`
Bulk updates source.

Body:
```json
{
  "leadIds": ["{{leadId}}"],
  "sourceId": "{{sourceId}}"
}
```

### `POST /leads/:id/pipeline-move`
Moves a lead in the pipeline.

Body:
```json
{
  "stageId": "{{stageId}}",
  "statusId": "{{statusId}}",
  "remark": "Moved after follow-up"
}
```

### `GET /leads/pipeline`
Returns pipeline columns and grouped leads.

### `GET /leads/follow-ups`
Lists follow-up leads.

### `GET /leads/my-follow-ups`
Lists logged-in employee follow-ups.

### `GET /leads/field-executive/follow-ups`
Lists field-executive follow-ups.

### `POST /leads/:id/follow-ups`
Creates follow-up/reminder.

Body:
```json
{
  "assignedToId": "{{employeeId}}",
  "scheduledAt": "2026-07-24T11:00:00.000Z",
  "status": "Scheduled",
  "setReminder": true,
  "remarks": "Call and confirm site visit availability.",
  "notes": "Call and confirm site visit availability."
}
```

### `PATCH /leads/:leadId/follow-ups/:id`
Updates follow-up timing/status/remarks.

### `GET /leads/:id/bookings`
Lists bookings for a lead.

### `POST /leads/:id/bookings`
Creates booking for a lead.

Body:
```json
{
  "projectId": "{{projectId}}",
  "unitId": "{{unitId}}",
  "bookingAmount": 500000,
  "bookingDate": "2026-07-22",
  "paymentMode": "Bank Transfer",
  "remarks": "Token received."
}
```

### `PATCH /leads/:leadId/bookings/:bookingId`
Updates booking details/status.

### `GET /leads/:id/timeline`
Gets activity timeline for a lead.

### `POST /leads/:id/tasks`
Creates lead-scoped task.

Body:
```json
{
  "title": "Collect documents",
  "description": "Collect PAN and Aadhaar copies.",
  "assignedToId": "{{employeeId}}",
  "dueAt": "2026-07-25T10:00:00.000Z",
  "priority": "High",
  "status": "Pending"
}
```

### `PATCH /leads/:leadId/tasks/:taskId`
Updates lead-scoped task.

### `POST /leads/:id/notes`
Adds lead remark/note.

Body:
```json
{
  "content": "Client asked for ready-to-move inventory.",
  "remarks": "Client asked for ready-to-move inventory."
}
```

## Contact Leads

### `GET /contact-leads`
Lists contact leads.

### `POST /contact-leads`
Creates contact lead.

Body:
```json
{
  "customerName": "Rohan Sharma",
  "mobile": "9876500000",
  "email": "rohan@example.com",
  "source": "Website",
  "projectName": "Palm Springs",
  "note": "Asked for pricing."
}
```

### `PATCH /contact-leads/:id`
Updates contact lead.

### `PATCH /contact-leads/:id/interest`
Marks contact lead interested.

### `PATCH /contact-leads/:id/unarchive`
Restores archived contact lead.

### `POST /contact-leads/:id/convert`
Converts contact lead to CRM lead.

### `DELETE /contact-leads/:id`
Archives contact lead.

## Lead Masters And Columns

### `GET /lead-masters/:category`
Lists master values by category.

Important categories:
- `source`
- `status`
- `temperature`
- `priority`
- `property_type`
- `project_configuration`
- `project_location`
- `project_zone`
- `possession_timeline`
- `lead_budget_range`
- `carpet_area_range`
- `project_whatsapp_template`

Params:
```json
{
  "activeOnly": "true",
  "search": "Magic"
}
```

### `POST /lead-masters/:category`
Creates a master value.

Body:
```json
{
  "name": "MagicBricks",
  "label": "MagicBricks",
  "manualScore": 10,
  "isActive": true,
  "triggerAction": "NONE"
}
```

For `project_whatsapp_template`, store the template body in `description`.

### `PATCH /lead-masters/:category/:id`
Updates a master value.

### `DELETE /lead-masters/:category/:id`
Soft-deletes/deactivates master value according to service behavior.

### `GET /lead-list-columns`
Gets lead table column visibility.

### `PATCH /lead-list-columns`
Updates lead table column visibility.

Body:
```json
{
  "visibleColumns": ["addedDate", "source", "name", "number", "projectName", "leadStatus", "leadType", "remark"]
}
```

## Auto Assignment

### `GET /auto-assignment/rules`
Lists configured auto-assignment rules.

### `POST /auto-assignment/rules`
Creates an auto-assignment rule.

Body:
```json
{
  "name": "Default auto assignment",
  "isActive": true,
  "rotationMinutes": 2,
  "fallbackUserIds": ["{{telecallerId}}", "{{fieldExecutiveId}}"],
  "transferSequence": ["{{telecallerId}}", "{{fieldExecutiveId}}"],
  "criteria": {
    "sourceIds": ["{{sourceId}}"],
    "statusIds": ["{{statusId}}"]
  }
}
```

### `PATCH /auto-assignment/rules/:id`
Updates an auto-assignment rule.

### `DELETE /auto-assignment/rules/:id`
Deletes an auto-assignment rule.

### `GET /auto-assignment/events`
Lists auto-assignment events/audit history.

Params:
```json
{
  "page": "1",
  "limit": "20",
  "ruleId": "{{autoAssignmentRuleId}}"
}
```

## Projects, Units, Site Visits, Bookings

### `GET /projects`
Lists projects.

Params:
```json
{
  "search": "Palm",
  "status": "Active",
  "location": "Malad"
}
```

### `POST /projects`
Creates project.

Body:
```json
{
  "name": "Palm Springs",
  "developer": "Truroot Realty",
  "location": "Malad, Mumbai",
  "description": "Ready-to-move residential project.",
  "status": "Active",
  "possession": "Ready To Move",
  "priceRange": "75 Lakh - 1.5 Cr",
  "configurations": ["2 BHK", "3 BHK"],
  "amenities": ["Lift", "Gym", "Parking"],
  "highlights": ["Near railway station"],
  "imageGallery": ["https://example.com/project.jpg"]
}
```

### `GET /projects/:id`
Gets project details.

### `PATCH /projects/:id`
Updates project.

### `GET /projects/:id/units`
Lists project inventory units.

### `GET /projects/:id/units/:unitId`
Gets one unit.

### `POST /projects/:id/units`
Creates unit.

Body:
```json
{
  "unitNumber": "A-1201",
  "tower": "A",
  "configuration": "2 BHK",
  "carpetArea": 750,
  "price": 9500000,
  "status": "Available"
}
```

### `PATCH /projects/:id/units/:unitId`
Updates unit.

### `GET /projects/:id/leads`
Lists leads mapped to a project.

### `POST /projects/:id/units/:unitId/link-lead`
Links a lead to a unit.

Body:
```json
{
  "leadId": "{{leadId}}"
}
```

### `GET /site-visits`
Lists site visits.

Params:
```json
{
  "search": "Arjun",
  "status": "Scheduled",
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31",
  "fieldExecutiveId": "{{fieldExecutiveId}}"
}
```

### `GET /site-visits/options`
Gets data needed to create site visits.

### `POST /site-visits`
Creates site visit.

Body:
```json
{
  "leadId": "{{leadId}}",
  "projectId": "{{projectId}}",
  "fieldExecutiveId": "{{fieldExecutiveId}}",
  "scheduledAt": "2026-07-25T11:00:00.000Z",
  "notes": "Client will visit with family."
}
```

### `GET /site-visits/:id`
Gets site visit details.

### `PATCH /site-visits/:id`
Updates site visit.

### `POST /site-visits/:id/check-in`
Checks in to a site visit.

Body:
```json
{
  "latitude": 19.076,
  "longitude": 72.8777,
  "accuracy": 25
}
```

### `POST /site-visits/:id/check-out`
Checks out from a site visit.

### `POST /site-visits/tracking/ping`
Records live field executive location.

Body:
```json
{
  "latitude": 19.076,
  "longitude": 72.8777,
  "accuracy": 25
}
```

### `POST /site-visits/tracking/stop`
Stops live tracking for logged-in field executive.

### `GET /site-visits/tracking/live`
Lists live field executive locations.

### `GET /bookings`
Lists bookings.

## Tasks, Calls, Imports, Integrations, Reports, Notifications

### `GET /tasks`
Lists employee tasks.

Params:
```json
{
  "assignedToId": "{{employeeId}}",
  "status": "Pending",
  "leadId": "{{leadId}}",
  "dateFrom": "2026-07-01",
  "dateTo": "2026-07-31",
  "page": "1",
  "limit": "10"
}
```

### `POST /tasks`
Creates employee task.

Body:
```json
{
  "title": "Call high priority prospects",
  "description": "Call assigned hot leads and update remarks.",
  "assignedToId": "{{employeeId}}",
  "leadId": "{{leadId}}",
  "dueAt": "2026-07-25T10:00:00.000Z",
  "priority": "High",
  "status": "Pending"
}
```

### `PATCH /tasks/:id`
Updates employee task.

### `GET /call-logs`
Lists call history.

### `POST /call-logs`
Creates a call log.

Body:
```json
{
  "leadId": "{{leadId}}",
  "direction": "Outgoing",
  "outcome": "Connected",
  "durationSeconds": 240,
  "remarks": "Client asked for callback tomorrow."
}
```

### `GET /lead-imports`
Lists lead imports.

### `POST /lead-imports`
Creates/imports leads.

Body:
```json
{
  "source": "Excel",
  "targetType": "LEAD",
  "rows": [
    {
      "name": "Imported Lead",
      "mobile": "9876500001",
      "source": "MagicBricks",
      "leadStatus": "New Lead",
      "projectName": "Palm Springs",
      "remarks": "Imported from sheet"
    }
  ],
  "defaults": {
    "sourceId": "{{sourceId}}",
    "statusId": "{{statusId}}",
    "projectId": "{{projectId}}",
    "telecallerId": "{{telecallerId}}",
    "fieldExecutiveId": "{{fieldExecutiveId}}"
  }
}
```

### `GET /integrations/magicbricks`
Gets MagicBricks integration config.

### `PATCH /integrations/magicbricks`
Saves MagicBricks config.

Body:
```json
{
  "isEnabled": true,
  "sourceId": "{{sourceId}}"
}
```

### `POST /integrations/magicbricks/generate-api-key`
Regenerates webhook API key.

### `PATCH /integrations/magicbricks/field-mapping`
Saves MagicBricks field mapping.

Body:
```json
{
  "mapping": {
    "name": "customerName",
    "mobile": "phone",
    "email": "email",
    "projectName": "project"
  }
}
```

### `POST /integrations/magicbricks/test`
Tests integration config/mapping.

### `POST /integrations/magicbricks/leads`
Public MagicBricks webhook.

Headers:
```json
{
  "x-api-key": "{{magicbricksApiKey}}"
}
```

Body:
```json
{
  "customerName": "Webhook Lead",
  "phone": "9876500002",
  "email": "webhook@example.com",
  "project": "Palm Springs",
  "source": "MagicBricks"
}
```

### `GET /duplicates`
Lists duplicate leads.

### `GET /reports/source-analytics`
Gets source analytics.

### `GET /reports/conversion-analytics`
Gets conversion analytics.

### `GET /notifications`
Lists notifications.

Params:
```json
{
  "page": "1",
  "limit": "20",
  "unreadOnly": "false"
}
```

### `PATCH /notifications/:id/read`
Marks notification read.

### `PATCH /notifications/mark-all-read`
Marks all notifications read.

### `POST /notifications/device-tokens`
Registers FCM token.

Body:
```json
{
  "token": "fcm-device-token",
  "platform": "android",
  "deviceId": "device-123"
}
```

### `DELETE /notifications/device-tokens`
Unregisters FCM token.

Body:
```json
{
  "token": "fcm-device-token"
}
```

## Uploads

### `POST /uploads/images`
Uploads an image.

Body: `multipart/form-data`
- `file`: image file, max 5 MB

### `POST /uploads/project-brochures`
Uploads a project brochure.

Body: `multipart/form-data`
- `file`: brochure file, max 10 MB
