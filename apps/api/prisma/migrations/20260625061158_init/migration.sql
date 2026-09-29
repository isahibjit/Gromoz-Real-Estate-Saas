-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SALES_MANAGER', 'SALES_AGENT', 'TELECALLER', 'MARKETING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "avatarStorageKey" TEXT,
    "avatarMimeType" TEXT,
    "avatarUpdatedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "lastPasswordChange" TIMESTAMP(3),
    "refreshTokenHash" TEXT,
    "passwordResetTokenHash" TEXT,
    "passwordResetExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "designation" TEXT,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "employmentStatus" TEXT NOT NULL DEFAULT 'Active',
    "phone" TEXT,
    "address" TEXT,
    "reportingToId" TEXT,
    "monthlyBasic" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyAllowances" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Present',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceAudit" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "actorId" TEXT,
    "previous" JSONB,
    "current" JSONB,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "holidayDate" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveType" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "reviewerId" TEXT,
    "reviewerNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRecord" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "basicSalary" DECIMAL(65,30) NOT NULL,
    "allowances" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "payableDays" DECIMAL(65,30) NOT NULL,
    "presentDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paidLeaveDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unpaidDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "holidayDays" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossPay" DECIMAL(65,30) NOT NULL,
    "netPay" DECIMAL(65,30) NOT NULL,
    "adjustment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adjustmentNote" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedById" TEXT,
    "reopenReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payslip" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "leaderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamOld" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "location" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamOld_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadMasterCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadMasterCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadMasterValue" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT,
    "type" TEXT,
    "statusType" TEXT NOT NULL DEFAULT 'Custom',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultNextValueId" TEXT,
    "probability" INTEGER,
    "weight" INTEGER,
    "manualScore" INTEGER,
    "channel" TEXT,
    "reasonCategory" TEXT,
    "displayColor" TEXT,
    "tagColor" TEXT,
    "ratingValue" INTEGER,
    "expectedTime" INTEGER,
    "expectedTimeUnit" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadMasterValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "mobileCountryCode" TEXT NOT NULL DEFAULT '+91',
    "mobile" TEXT NOT NULL,
    "alternateCountryCode" TEXT,
    "alternateMobile" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "sourceId" TEXT,
    "campaignId" TEXT,
    "stageId" TEXT,
    "statusId" TEXT,
    "priorityId" TEXT,
    "temperatureId" TEXT,
    "ratingId" TEXT,
    "interestLevel" TEXT,
    "heardAboutUs" TEXT,
    "remarks" TEXT,
    "referenceBy" TEXT,
    "ownerId" TEXT,
    "managerId" TEXT,
    "telecallerId" TEXT,
    "fieldExecutiveId" TEXT,
    "createdById" TEXT,
    "assignedAt" TIMESTAMP(3),
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "lostReasonId" TEXT,
    "lostCompetitor" TEXT,
    "lostAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadRequirement" (
    "leadId" TEXT NOT NULL,
    "propertyType" TEXT,
    "configuration" TEXT,
    "minBudget" DECIMAL(65,30),
    "maxBudget" DECIMAL(65,30),
    "budgetUnit" TEXT,
    "preferredLocation" TEXT,
    "preferredProjectId" TEXT,
    "possessionTimeline" TEXT,
    "purpose" TEXT,
    "minArea" DECIMAL(65,30),
    "maxArea" DECIMAL(65,30),
    "occupation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadRequirement_pkey" PRIMARY KEY ("leadId")
);

-- CreateTable
CREATE TABLE "LeadProjectInterest" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "unitId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "matchPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadProjectInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromUserId" TEXT,
    "toUserId" TEXT NOT NULL,
    "assigneeType" TEXT NOT NULL,
    "strategy" TEXT,
    "reason" TEXT,
    "assignedById" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "typeId" TEXT,
    "statusId" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "lastContactAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "notes" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "setReminder" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "title" TEXT NOT NULL,
    "type" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "dueAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT,
    "text" TEXT NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "name" TEXT NOT NULL,
    "storageKey" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "developer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Active',
    "possession" TEXT,
    "minPrice" DECIMAL(65,30),
    "maxPrice" DECIMAL(65,30),
    "configurations" JSONB,
    "amenities" JSONB,
    "description" TEXT,
    "imageUrl" TEXT,
    "imageGallery" JSONB,
    "salesOwnerId" TEXT,
    "demandScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUnit" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tower" TEXT,
    "unitNumber" TEXT NOT NULL,
    "configuration" TEXT,
    "carpetAreaSqft" DECIMAL(65,30),
    "floor" TEXT,
    "facing" TEXT,
    "price" DECIMAL(65,30),
    "availability" TEXT NOT NULL DEFAULT 'Available',
    "bookingStatus" TEXT NOT NULL DEFAULT 'Open',
    "salesOwnerId" TEXT,
    "imageUrl" TEXT,
    "imageGallery" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "displayId" TEXT,
    "leadId" TEXT NOT NULL,
    "projectId" TEXT,
    "unitId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Scheduled',
    "visitType" TEXT NOT NULL DEFAULT 'Site Visit',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "assignedExecutiveId" TEXT,
    "meetingPoint" TEXT,
    "transportMode" TEXT,
    "visitorCount" INTEGER,
    "specialRequest" TEXT,
    "notes" TEXT,
    "feedback" TEXT,
    "rating" INTEGER,
    "reminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "checkedInLatitude" DECIMAL(65,30),
    "checkedInLongitude" DECIMAL(65,30),
    "checkedInAccuracyM" DECIMAL(65,30),
    "checkedOutAt" TIMESTAMP(3),
    "checkedOutLatitude" DECIMAL(65,30),
    "checkedOutLongitude" DECIMAL(65,30),
    "checkedOutAccuracyM" DECIMAL(65,30),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "projectId" TEXT,
    "unitId" TEXT,
    "bookingAmount" DECIMAL(65,30) NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "receiptDocumentId" TEXT,
    "closedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "leadId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "method" TEXT,
    "receiptId" TEXT,
    "invoiceDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "userId" TEXT,
    "direction" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSeconds" INTEGER,
    "outcome" TEXT,
    "followUpStatus" TEXT,
    "notes" TEXT,
    "recordingStorageKey" TEXT,
    "recordingId" TEXT,
    "customerResponse" TEXT,
    "nextFollowUpId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "userId" TEXT,
    "messageType" TEXT NOT NULL DEFAULT 'Template',
    "templateId" TEXT,
    "messageText" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'Queued',
    "readAt" TIMESTAMP(3),
    "responseText" TEXT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadImport" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "fileName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "newLeads" INTEGER NOT NULL DEFAULT 0,
    "duplicates" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "importedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadImportRow" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB,
    "mappedData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "errorField" TEXT,
    "errorMessage" TEXT,
    "duplicateGroupId" TEXT,

    CONSTRAINT "LeadImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuplicateLeadGroup" (
    "id" TEXT NOT NULL,
    "detectedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,
    "matchPercent" INTEGER NOT NULL,
    "scoreLabel" TEXT NOT NULL,
    "existingLeadId" TEXT NOT NULL,
    "duplicateLeadId" TEXT NOT NULL,
    "criteria" JSONB,
    "status" TEXT NOT NULL DEFAULT 'Detected',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "DuplicateLeadGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "badge" TEXT,
    "message" TEXT,
    "details" JSONB,
    "entityType" TEXT,
    "entityId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "cost" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_userId_key" ON "EmployeeProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeProfile_employeeCode_key" ON "EmployeeProfile"("employeeCode");

-- CreateIndex
CREATE INDEX "EmployeeProfile_employmentStatus_idx" ON "EmployeeProfile"("employmentStatus");

-- CreateIndex
CREATE INDEX "AttendanceRecord_attendanceDate_status_idx" ON "AttendanceRecord"("attendanceDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_employeeId_attendanceDate_key" ON "AttendanceRecord"("employeeId", "attendanceDate");

-- CreateIndex
CREATE INDEX "AttendanceAudit_attendanceId_createdAt_idx" ON "AttendanceAudit"("attendanceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Holiday_holidayDate_key" ON "Holiday"("holidayDate");

-- CreateIndex
CREATE INDEX "LeaveRequest_employeeId_status_idx" ON "LeaveRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PayrollRecord_year_month_status_idx" ON "PayrollRecord"("year", "month", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_employeeId_year_month_key" ON "PayrollRecord"("employeeId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "Payslip_payrollId_key" ON "Payslip"("payrollId");

-- CreateIndex
CREATE INDEX "Payslip_employeeId_generatedAt_idx" ON "Payslip"("employeeId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Team_leaderId_key" ON "Team"("leaderId");

-- CreateIndex
CREATE UNIQUE INDEX "LeadMasterCategory_code_key" ON "LeadMasterCategory"("code");

-- CreateIndex
CREATE INDEX "LeadMasterValue_categoryId_isActive_idx" ON "LeadMasterValue"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LeadMasterValue_categoryId_code_key" ON "LeadMasterValue"("categoryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_displayId_key" ON "Lead"("displayId");

-- CreateIndex
CREATE INDEX "Lead_mobile_idx" ON "Lead"("mobile");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_stageId_idx" ON "Lead"("stageId");

-- CreateIndex
CREATE INDEX "Lead_statusId_idx" ON "Lead"("statusId");

-- CreateIndex
CREATE INDEX "Lead_sourceId_idx" ON "Lead"("sourceId");

-- CreateIndex
CREATE INDEX "Lead_ownerId_idx" ON "Lead"("ownerId");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "LeadProjectInterest_leadId_idx" ON "LeadProjectInterest"("leadId");

-- CreateIndex
CREATE INDEX "LeadProjectInterest_projectId_idx" ON "LeadProjectInterest"("projectId");

-- CreateIndex
CREATE INDEX "LeadProjectInterest_projectId_unitId_idx" ON "LeadProjectInterest"("projectId", "unitId");

-- CreateIndex
CREATE INDEX "LeadAssignment_leadId_isCurrent_idx" ON "LeadAssignment"("leadId", "isCurrent");

-- CreateIndex
CREATE INDEX "LeadAssignment_toUserId_idx" ON "LeadAssignment"("toUserId");

-- CreateIndex
CREATE INDEX "FollowUp_assignedToId_scheduledAt_idx" ON "FollowUp"("assignedToId", "scheduledAt");

-- CreateIndex
CREATE INDEX "FollowUp_statusId_idx" ON "FollowUp"("statusId");

-- CreateIndex
CREATE INDEX "FollowUp_leadId_idx" ON "FollowUp"("leadId");

-- CreateIndex
CREATE INDEX "Activity_leadId_occurredAt_idx" ON "Activity"("leadId", "occurredAt");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_location_idx" ON "Project"("location");

-- CreateIndex
CREATE INDEX "ProjectUnit_projectId_availability_idx" ON "ProjectUnit"("projectId", "availability");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectUnit_projectId_tower_unitNumber_key" ON "ProjectUnit"("projectId", "tower", "unitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_displayId_key" ON "SiteVisit"("displayId");

-- CreateIndex
CREATE INDEX "SiteVisit_assignedExecutiveId_scheduledAt_idx" ON "SiteVisit"("assignedExecutiveId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SiteVisit_projectId_scheduledAt_idx" ON "SiteVisit"("projectId", "scheduledAt");

-- CreateIndex
CREATE INDEX "SiteVisit_status_idx" ON "SiteVisit"("status");

-- CreateIndex
CREATE INDEX "CallLog_userId_startedAt_idx" ON "CallLog"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "CallLog_leadId_idx" ON "CallLog"("leadId");

-- CreateIndex
CREATE INDEX "CallLog_outcome_idx" ON "CallLog"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappTemplate_code_key" ON "WhatsappTemplate"("code");

-- CreateIndex
CREATE INDEX "WhatsappLog_userId_sentAt_idx" ON "WhatsappLog"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "WhatsappLog_leadId_idx" ON "WhatsappLog"("leadId");

-- CreateIndex
CREATE INDEX "WhatsappLog_deliveryStatus_idx" ON "WhatsappLog"("deliveryStatus");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceAudit" ADD CONSTRAINT "AttendanceAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "PayrollRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadMasterValue" ADD CONSTRAINT "LeadMasterValue_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LeadMasterCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadRequirement" ADD CONSTRAINT "LeadRequirement_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadProjectInterest" ADD CONSTRAINT "LeadProjectInterest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUnit" ADD CONSTRAINT "ProjectUnit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProjectUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProjectUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappLog" ADD CONSTRAINT "WhatsappLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadImportRow" ADD CONSTRAINT "LeadImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "LeadImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
