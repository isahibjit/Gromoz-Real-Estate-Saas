export interface AuditLogChange {
  fieldName: string;
  oldValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  valueType?:
    | "text"
    | "number"
    | "percentage"
    | "color"
    | "boolean"
    | "icon"
    | "date";
}

export interface AuditLogRecord {
  id: string;
  dateTime: string;
  category: string;
  recordName: string;
  action: "Created" | "Updated" | "Deleted";
  fieldChanged: string; // Used for summary table
  oldValue: string; // Used for summary table
  newValue: string; // Used for summary table
  changedBy: string;
  changedByInitials: string;
  changedByAvatar?: string;
  userRole: string; // New
  ipAddress: string;
  deviceBrowser: string; // New
  changes: AuditLogChange[]; // New
  remarks?: string; // New
  reference?: string; // New
}

export const auditLogRecords: AuditLogRecord[] = [
  {
    id: "1",
    dateTime: "May 26, 2025 02:45 PM",
    category: "Lead Stage Master",
    recordName: "Negotiation (NEG)",
    action: "Updated",
    fieldChanged: "Probability %",
    oldValue: "70%",
    newValue: "80%",
    changedBy: "Amit Kumar",
    changedByInitials: "AK",
    userRole: "Marketing Manager",
    ipAddress: "192.168.1.45",
    deviceBrowser: "Chrome on Windows",
    remarks: "Updated stage details as per new sales process.",
    reference: "—",
    changes: [
      {
        fieldName: "Probability %",
        oldValue: "70",
        newValue: "80",
        valueType: "percentage",
      },
      {
        fieldName: "Default Next Stage",
        oldValue: "Interested",
        newValue: "Negotiation",
        valueType: "text",
      },
      {
        fieldName: "Stage Color",
        oldValue: "#F87171",
        newValue: "#EF4444",
        valueType: "color",
      },
      {
        fieldName: "Description",
        oldValue: "Discussion on price",
        newValue: "Discussion on price & terms",
        valueType: "text",
      },
      {
        fieldName: "Expected Time",
        oldValue: null,
        newValue: "5 Days",
        valueType: "text",
      },
      {
        fieldName: "Icon",
        oldValue: "mdi-account-plus",
        newValue: "mdi-user-plus",
        valueType: "icon",
      },
      {
        fieldName: "Is Active",
        oldValue: true,
        newValue: true,
        valueType: "boolean",
      },
    ],
  },
  {
    id: "2",
    dateTime: "May 26, 2025 02:30 PM",
    category: "Lead Stage Master",
    recordName: "Site Visit (SV)",
    action: "Updated",
    fieldChanged: "Default Next Stage",
    oldValue: "Interested",
    newValue: "Negotiation",
    changedBy: "Priya Singh",
    changedByInitials: "PS",
    userRole: "Sales Executive",
    ipAddress: "192.168.1.12",
    deviceBrowser: "Safari on macOS",
    remarks: "Updated default next stage mapping.",
    changes: [
      {
        fieldName: "Default Next Stage",
        oldValue: "Interested",
        newValue: "Negotiation",
        valueType: "text",
      },
    ],
  },
  {
    id: "3",
    dateTime: "May 26, 2025 01:15 PM",
    category: "Lead Stage Master",
    recordName: "New (NEW)",
    action: "Created",
    fieldChanged: "—",
    oldValue: "—",
    newValue: "—",
    changedBy: "Rohit Verma",
    changedByInitials: "RV",
    userRole: "Admin",
    ipAddress: "192.168.1.78",
    deviceBrowser: "Chrome on macOS",
    remarks: "Created initial system stage.",
    changes: [
      {
        fieldName: "Stage Name",
        oldValue: null,
        newValue: "New",
        valueType: "text",
      },
      { fieldName: "Code", oldValue: null, newValue: "NEW", valueType: "text" },
      {
        fieldName: "Probability %",
        oldValue: null,
        newValue: "10",
        valueType: "percentage",
      },
    ],
  },
  {
    id: "4",
    dateTime: "May 26, 2025 12:10 PM",
    category: "Lead Stage Master",
    recordName: "Lost (LOST)",
    action: "Updated",
    fieldChanged: "Stage Color",
    oldValue: "#F87171",
    newValue: "#EF4444",
    changedBy: "Amit Kumar",
    changedByInitials: "AK",
    userRole: "Marketing Manager",
    ipAddress: "192.168.1.45",
    deviceBrowser: "Chrome on Windows",
    remarks: "Changed color to match brand guidelines.",
    changes: [
      {
        fieldName: "Stage Color",
        oldValue: "#F87171",
        newValue: "#EF4444",
        valueType: "color",
      },
    ],
  },
  {
    id: "5",
    dateTime: "May 25, 2025 05:40 PM",
    category: "Lead Stage Master",
    recordName: "Booking (BK)",
    action: "Updated",
    fieldChanged: "Probability %",
    oldValue: "90%",
    newValue: "100%",
    changedBy: "Neha Patel",
    changedByInitials: "NP",
    userRole: "Sales Manager",
    ipAddress: "192.168.1.66",
    deviceBrowser: "Firefox on Windows",
    changes: [
      {
        fieldName: "Probability %",
        oldValue: "90",
        newValue: "100",
        valueType: "percentage",
      },
    ],
  },
  {
    id: "6",
    dateTime: "May 25, 2025 04:22 PM",
    category: "Lead Stage Master",
    recordName: "Interested (INT)",
    action: "Updated",
    fieldChanged: "Description",
    oldValue: "Lead showed interest",
    newValue: "Lead showed interest in property",
    changedBy: "Suresh Yadav",
    changedByInitials: "SY",
    userRole: "Sales Executive",
    ipAddress: "192.168.1.88",
    deviceBrowser: "Edge on Windows",
    changes: [
      {
        fieldName: "Description",
        oldValue: "Lead showed interest",
        newValue: "Lead showed interest in property",
        valueType: "text",
      },
    ],
  },
  {
    id: "7",
    dateTime: "May 25, 2025 03:05 PM",
    category: "Lead Stage Master",
    recordName: "Negotiation (NEG)",
    action: "Updated",
    fieldChanged: "Expected Time",
    oldValue: "7 Days",
    newValue: "5 Days",
    changedBy: "Amit Kumar",
    changedByInitials: "AK",
    userRole: "Marketing Manager",
    ipAddress: "192.168.1.45",
    deviceBrowser: "Chrome on Windows",
    changes: [
      {
        fieldName: "Expected Time",
        oldValue: "7 Days",
        newValue: "5 Days",
        valueType: "text",
      },
    ],
  },
  {
    id: "8",
    dateTime: "May 25, 2025 11:30 AM",
    category: "Lead Stage Master",
    recordName: "Contacted (CONT)",
    action: "Deleted",
    fieldChanged: "—",
    oldValue: "—",
    newValue: "—",
    changedBy: "Priya Singh",
    changedByInitials: "PS",
    userRole: "Sales Executive",
    ipAddress: "192.168.1.12",
    deviceBrowser: "Safari on macOS",
    remarks: "Removed obsolete stage.",
    changes: [
      {
        fieldName: "Stage Name",
        oldValue: "Contacted",
        newValue: null,
        valueType: "text",
      },
      {
        fieldName: "Code",
        oldValue: "CONT",
        newValue: null,
        valueType: "text",
      },
    ],
  },
  {
    id: "9",
    dateTime: "May 24, 2025 06:18 PM",
    category: "Lead Stage Master",
    recordName: "Site Visit (SV)",
    action: "Updated",
    fieldChanged: "Type",
    oldValue: "Open",
    newValue: "In Progress",
    changedBy: "Rohit Verma",
    changedByInitials: "RV",
    userRole: "Admin",
    ipAddress: "192.168.1.78",
    deviceBrowser: "Chrome on macOS",
    changes: [
      {
        fieldName: "Type",
        oldValue: "Open",
        newValue: "In Progress",
        valueType: "text",
      },
    ],
  },
  {
    id: "10",
    dateTime: "May 24, 2025 04:50 PM",
    category: "Lead Stage Master",
    recordName: "New (NEW)",
    action: "Updated",
    fieldChanged: "Icon",
    oldValue: "mdi-account-plus",
    newValue: "mdi-user-plus",
    changedBy: "Neha Patel",
    changedByInitials: "NP",
    userRole: "Sales Manager",
    ipAddress: "192.168.1.66",
    deviceBrowser: "Firefox on Windows",
    changes: [
      {
        fieldName: "Icon",
        oldValue: "mdi-account-plus",
        newValue: "mdi-user-plus",
        valueType: "icon",
      },
    ],
  },
];
