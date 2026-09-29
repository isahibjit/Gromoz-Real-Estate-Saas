# Dedicated Mobile CRM API & Flutter Integration Specification

**Date:** 10 September 2026  
**Status:** Implemented on Backend & Ready for Mobile Consumption  
**Target Roles:** `TELECALLER`, `SALES_AGENT`, `MANAGER`, `TEAM_LEADER`, `SALES_MANAGER`, `ADMIN`, `SUPER_ADMIN`  
**Base URL:** `https://crmtrueroot.com/api` (or local `http://<server-ip>:3000`)

---

## 1. Executive Summary: Why Mobile Showed Wrong Counts

In the Flutter application (`LeadListWidget`, `MyFollowUpsScreen`, and `DashboardScreen`), counts diverged and showed incorrect totals due to two core issues:

1. **Client-Side In-Memory Counting on a Capped Slice:**  
   The Flutter app fetched leads via `context.read<LeadProvider>().fetchLeads(limit: 500)`.  
   In `_buildTabs`, filter pills rendered counts using `provider.countForMasterItem(item)`.  
   - If leads exceeded 500 or pagination occurred, only the fetched slice was counted.
   - When the user selected a filter pill, Flutter re-fetched only that subset (e.g., only "New Leads"). As a result, the in-memory list shrank, causing **all other pills to suddenly drop to (0)** or display incorrect totals.
2. **Contract Discrepancy between Dashboard & Lead List:**  
   The Mobile Dashboard fetched from legacy endpoint logic (counting leads created "today" or using regex strings), producing numbers like `NEW LEADS: 177` and `INTERESTED LEADS: 6`, while the Lead List pills showed `New Lead (153)` and `Interested (5)`.

### The Solution
We have implemented a **dedicated Mobile CRM API** (`/mobile/leads/*`) that calculates 100% of counts directly inside PostgreSQL using fast `GROUP BY statusId / temperatureId` aggregations respecting user scopes.

Mobile screens **no longer need to count leads in memory**. The server sends authoritative counts for both stats cards and filter pills.

---

## 2. Dedicated Mobile Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/mobile/leads/summary` | **Single Source of Truth** for all Dashboard stats cards, SLA metrics, and Filter Bar pills with real backend counts. |
| `GET` | `/mobile/leads` | High-performance, paginated lead list with pre-resolved relations (status, temperature, project, latest follow-up, formatted date labels). |
| `GET` | `/mobile/leads/masters` | Single-request bootstrap returning all dropdown options (statuses, temperatures, sources, projects, configurations, assignees). |
| `GET` | `/mobile/leads/follow-ups` | Follow-up queue returning enriched follow-ups along with server-calculated queue SLA summary metrics (`todayCount`, `overdueCount`, `breachedCount`, etc.). |

---

## 3. Detailed Endpoint Specifications

### 3.1. `GET /mobile/leads/summary`
Returns database-calculated counts for Stats Cards, Filter Pills, and SLA metrics.

#### Headers
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

#### Optional Query Parameters
| Parameter | Type | Description |
|---|---|---|
| `assignedToId` | `string` | Filter counts by assigned user ID (for Managers/Admins). |
| `projectId` | `string` | Filter counts by project UUID. |
| `dateFrom` | `string` | ISO Date / YYYY-MM-DD start filter. |
| `dateTo` | `string` | ISO Date / YYYY-MM-DD end filter. |
| `search` | `string` | Optional search term. |

*(Note: If logged in as `TELECALLER` or `SALES_AGENT`, scoping is automatically applied on the server).*

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "totalLeads": 197,
    "quickStats": {
      "todayFollowUps": 12,
      "overdueFollowUps": 2,
      "upcomingFollowUps": 45,
      "completedTodayFollowUps": 8,
      "pendingQueueCount": 59
    },
    "queueSla": {
      "breachedCount": 2,
      "dueNextHourCount": 4,
      "managerAttentionCount": 1
    },
    "statsCards": [
      {
        "id": "7bf31a89-21b3-4f9e-8c31-9f93c78d4621",
        "key": "NEW_LEAD",
        "title": "New Leads",
        "count": 153,
        "color": "#0284C7",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "7bf31a89-21b3-4f9e-8c31-9f93c78d4621",
        "sortOrder": 1
      },
      {
        "id": "e81d4a02-5c91-4e7a-9a1b-312984b512c0",
        "key": "INTERESTED",
        "title": "Interested Leads",
        "count": 5,
        "color": "#10B981",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "e81d4a02-5c91-4e7a-9a1b-312984b512c0",
        "sortOrder": 2
      },
      {
        "id": "d04a6211-54b1-4c12-a1f9-90b14112e452",
        "key": "NOT_INTERESTED",
        "title": "Not Interested",
        "count": 4,
        "color": "#64748B",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "d04a6211-54b1-4c12-a1f9-90b14112e452",
        "sortOrder": 3
      },
      {
        "id": "f512c984-6721-419b-a01c-619284ba9012",
        "key": "HOT_LEAD",
        "title": "Hot Leads",
        "count": 17,
        "color": "#EF4444",
        "category": "temperature",
        "filterKey": "temperatureId",
        "filterValue": "f512c984-6721-419b-a01c-619284ba9012",
        "sortOrder": 4
      },
      {
        "id": "a90184b2-3819-4c81-8172-519284ba1902",
        "key": "SITE_VISIT_DONE",
        "title": "Site Visit Done",
        "count": 16,
        "color": "#8B5CF6",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "a90184b2-3819-4c81-8172-519284ba1902",
        "sortOrder": 5
      },
      {
        "id": "c19284ba-1284-4d81-9182-3819284b1823",
        "key": "RE_VISIT_DONE",
        "title": "Re-Visit Done",
        "count": 1,
        "color": "#06B6D4",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "c19284ba-1284-4d81-9182-3819284b1823",
        "sortOrder": 6
      },
      {
        "id": "b819284c-4918-4a91-9182-128374ba9182",
        "key": "BOOKING_DONE",
        "title": "Booking Done",
        "count": 3,
        "color": "#059669",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "b819284c-4918-4a91-9182-128374ba9182",
        "sortOrder": 7
      }
    ],
    "filterPills": [
      {
        "id": "all",
        "name": "All",
        "count": 197,
        "color": "#0F172A",
        "category": "all",
        "filterKey": null,
        "filterValue": null,
        "sortOrder": -1
      },
      {
        "id": "7bf31a89-21b3-4f9e-8c31-9f93c78d4621",
        "name": "New Lead",
        "count": 153,
        "color": "#0284C7",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "7bf31a89-21b3-4f9e-8c31-9f93c78d4621",
        "sortOrder": 1
      },
      {
        "id": "e81d4a02-5c91-4e7a-9a1b-312984b512c0",
        "name": "Interested",
        "count": 5,
        "color": "#10B981",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "e81d4a02-5c91-4e7a-9a1b-312984b512c0",
        "sortOrder": 2
      },
      {
        "id": "a90184b2-3819-4c81-8172-519284ba1902",
        "name": "Site Visit Done",
        "count": 16,
        "color": "#8B5CF6",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "a90184b2-3819-4c81-8172-519284ba1902",
        "sortOrder": 3
      },
      {
        "id": "b819284c-4918-4a91-9182-128374ba9182",
        "name": "Booking Done",
        "count": 3,
        "color": "#059669",
        "category": "status",
        "filterKey": "statusId",
        "filterValue": "b819284c-4918-4a91-9182-128374ba9182",
        "sortOrder": 4
      }
    ]
  }
}
```

---

### 3.2. `GET /mobile/leads`
Returns the mobile-optimized lead listing. All card relations are pre-resolved and formatted for direct binding to `_buildLeadCard`.

#### Query Parameters
| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `1` | Current page number. |
| `limit` | `number` | `25` | Page size (e.g. 20, 25, 50). |
| `search` | `string` | `null` | Searches lead name, mobile, email, displayId. |
| `statusId` | `string` | `null` | Filter by Master Status UUID. |
| `temperatureId` | `string` | `null` | Filter by Master Temperature UUID. |
| `projectId` | `string` | `null` | Filter by Project UUID. |
| `configuration` | `string` | `null` | Filter by configuration (e.g. "2 BHK"). |
| `propertyType` | `string` | `null` | Filter by property type (e.g. "Apartment"). |
| `assignedTo` | `string` | `null` | Filter by assigned user UUID. |
| `dateFrom` | `string` | `null` | Start date (YYYY-MM-DD). |
| `dateTo` | `string` | `null` | End date (YYYY-MM-DD). |
| `sort` | `string` | `"desc"`| Sort order (`desc` or `asc` by createdAt). |

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "c1f2043a-7a51-4091-b3b4-4b52b9a7c301",
      "displayId": "LD-10192",
      "name": "Karl Marx",
      "initials": "KM",
      "phone": "8080265434",
      "email": "karl.marx@example.com",
      "status": {
        "id": "7bf31a89-21b3-4f9e-8c31-9f93c78d4621",
        "name": "New Lead",
        "color": "#0284C7",
        "allowFollowUp": true
      },
      "temperature": {
        "id": "f512c984-6721-419b-a01c-619284ba9012",
        "name": "Hot Lead",
        "color": "#EF4444"
      },
      "project": {
        "id": "p019284a-3819-4c12-8910-128374ba9012",
        "name": "1Aerocity Corporate Park",
        "location": "Andheri (E), Mumbai"
      },
      "configuration": "2 BHK",
      "budgetRange": "1 Cr - 1.5 Cr",
      "location": "Andheri (E), Mumbai",
      "nextFollowUp": {
        "id": "fu-019284a-1928-4c12-9182-128374ba9182",
        "scheduledAt": "2026-09-12T16:30:00.000Z",
        "scheduledLabel": "12 Sep, 10:00 PM",
        "isOverdue": false,
        "remarks": "Interested: Test"
      },
      "remark": "Interested: Test",
      "assignedTo": {
        "id": "u-019284a-3819-4c12-9182-128374ba9182",
        "name": "Rajesh Sharma",
        "role": "TELECALLER"
      },
      "createdAt": "2026-09-10T02:30:00.000Z",
      "createdLabel": "10 Sep, 8:00 AM",
      "updatedAt": "2026-09-10T03:15:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 197,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 3.3. `GET /mobile/leads/masters`
Single-request bootstrap endpoint returning all master options for filter dropdowns and reschedule modals.

#### Sample Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "statuses": [
      {
        "id": "7bf31a89-21b3-4f9e-8c31-9f93c78d4621",
        "name": "New Lead",
        "code": "NEW_LEAD",
        "color": "#0284C7",
        "allowFollowUp": true,
        "showInStatsCard": true,
        "showInFilterBar": true,
        "sortOrder": 1
      },
      {
        "id": "e81d4a02-5c91-4e7a-9a1b-312984b512c0",
        "name": "Interested",
        "code": "INTERESTED",
        "color": "#10B981",
        "allowFollowUp": true,
        "showInStatsCard": true,
        "showInFilterBar": true,
        "sortOrder": 2
      }
    ],
    "temperatures": [
      {
        "id": "f512c984-6721-419b-a01c-619284ba9012",
        "name": "Hot Lead",
        "code": "HOT",
        "color": "#EF4444",
        "sortOrder": 1
      },
      {
        "id": "warm-uuid-1",
        "name": "Warm Lead",
        "code": "WARM",
        "color": "#F59E0B",
        "sortOrder": 2
      },
      {
        "id": "cold-uuid-1",
        "name": "Cold Lead",
        "code": "COLD",
        "color": "#64748B",
        "sortOrder": 3
      }
    ],
    "sources": [
      { "id": "src-1", "name": "Meta Ads", "code": "META_ADS" },
      { "id": "src-2", "name": "MagicBricks", "code": "MAGICBRICKS" }
    ],
    "projects": [
      {
        "id": "proj-1",
        "name": "1Aerocity Corporate Park",
        "location": "Andheri (E), Mumbai"
      }
    ],
    "configurations": [
      "1 BHK",
      "2 BHK",
      "3 BHK",
      "4 BHK",
      "5 BHK",
      "Penthouse",
      "Studio"
    ],
    "budgetRanges": [
      "50 Lakh - 75 Lakh",
      "75 Lakh - 1 Cr",
      "1 Cr - 1.5 Cr",
      "1.5 Cr - 2 Cr",
      "2 Cr - 3 Cr",
      "3 Cr+"
    ],
    "propertyTypes": ["Apartment", "Commercial", "Plot", "Villa"],
    "assignees": [
      {
        "id": "u-1",
        "name": "Rajesh Sharma",
        "email": "rajesh@trueroot.com",
        "role": "TELECALLER"
      }
    ]
  }
}
```

---

### 3.4. `GET /mobile/leads/follow-ups`
Returns follow-up items enriched with the server-calculated summary:
```json
{
  "success": true,
  "data": [...],
  "summary": {
    "todayCount": 12,
    "overdueCount": 2,
    "upcomingCount": 45,
    "completedTodayCount": 8,
    "pendingCount": 59,
    "breachedCount": 2,
    "dueNextHourCount": 4,
    "managerAttentionCount": 1
  },
  "meta": { "page": 1, "limit": 25, "total": 59 }
}
```

---

## 4. Flutter Integration Blueprint

### Step 1: Update `LeadMasterProvider` or `LeadProvider`
Fetch `/mobile/leads/summary` whenever the Lead screen or Dashboard loads.

```dart
class LeadSummaryModel {
  final int totalLeads;
  final List<FilterPillItem> filterPills;
  final List<StatsCardItem> statsCards;
  final QuickStats quickStats;
  final QueueSla queueSla;

  LeadSummaryModel({
    required this.totalLeads,
    required this.filterPills,
    required this.statsCards,
    required this.quickStats,
    required this.queueSla,
  });

  factory LeadSummaryModel.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>? ?? {};
    return LeadSummaryModel(
      totalLeads: data['totalLeads'] ?? 0,
      filterPills: (data['filterPills'] as List? ?? [])
          .map((item) => FilterPillItem.fromJson(item))
          .toList(),
      statsCards: (data['statsCards'] as List? ?? [])
          .map((item) => StatsCardItem.fromJson(item))
          .toList(),
      quickStats: QuickStats.fromJson(data['quickStats'] ?? {}),
      queueSla: QueueSla.fromJson(data['queueSla'] ?? {}),
    );
  }
}
```

### Step 2: Render Filter Pills in `LeadListWidget.dart`
Replace client-side counting:
```dart
// OLD BUGGY CODE:
// count: _masterItemCount(leadProvider, filterPills[i]) -> (counted in-memory over limit: 500)

// NEW ROBUST CODE:
// Use the server-sent pill list directly from summary:
final filterPills = summary.filterPills;

for (var i = 0; i < filterPills.length; i++) ...[
  _buildFilterPill(
    label: filterPills[i].name,
    count: filterPills[i].count, // <-- Exact count from server!
    isSelected: _selectedStatusId == filterPills[i].filterValue,
    displayColor: filterPills[i].color,
    onTap: () => _selectPillFilter(filterPills[i]),
  ),
]
```

### Step 3: Render Stats Cards in `DashboardScreen.dart`
The Dashboard screen can now either:
1. Dynamically render `summary.statsCards` directly using `ListView` or `GridView`, OR
2. Bind existing cards directly to `summary.statsCards.firstWhere((c) => c.key == 'NEW_LEAD').count`.

This guarantees:
- **Total Leads: 197** on Dashboard == **All (197)** on Lead List.
- **New Leads: 153** on Dashboard == **New Lead (153)** on Lead List.
- **Interested: 5** on Dashboard == **Interested (5)** on Lead List.
- **Hot Leads: 17** on Dashboard == **Hot Leads (17)** on Lead List.
- **Zero drift, zero desync, zero client-side miscounting.**
