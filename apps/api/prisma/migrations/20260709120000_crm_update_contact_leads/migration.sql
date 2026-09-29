-- CreateEnum
CREATE TYPE "ContactLeadStatus" AS ENUM ('COLD', 'INTERESTED', 'CONVERTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AutoAssignmentEventStatus" AS ENUM ('ACTIVE', 'STOPPED', 'EXHAUSTED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "highlights" JSONB,
ADD COLUMN "reraNumber" TEXT,
ADD COLUMN "brochureUrl" TEXT,
ADD COLUMN "brochureStorageKey" TEXT,
ADD COLUMN "brochureFileName" TEXT,
ADD COLUMN "brochureMimeType" TEXT,
ADD COLUMN "brochureSizeBytes" INTEGER;

-- CreateTable
CREATE TABLE "ContactLead" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "customerName" TEXT NOT NULL,
    "mobileCountryCode" TEXT NOT NULL DEFAULT '+91',
    "mobile" TEXT NOT NULL,
    "alternateCountryCode" TEXT,
    "alternateMobile" TEXT,
    "email" TEXT,
    "preferredProjectId" TEXT,
    "note" TEXT,
    "assignedToId" TEXT,
    "status" "ContactLeadStatus" NOT NULL DEFAULT 'COLD',
    "convertedLeadId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadListColumnPreference" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "visibleColumns" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadListColumnPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoAssignmentRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default auto assignment',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "initialUserId" TEXT,
    "transferSequence" JSONB NOT NULL,
    "transferTimeMinutes" INTEGER NOT NULL DEFAULT 2,
    "sourceId" TEXT,
    "projectId" TEXT,
    "teamId" TEXT,
    "userRules" JSONB,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoAssignmentRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoAssignmentEvent" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT,
    "leadId" TEXT NOT NULL,
    "currentUserId" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "AutoAssignmentEventStatus" NOT NULL DEFAULT 'ACTIVE',
    "history" JSONB,
    "lastCheckedAt" TIMESTAMP(3),
    "exhaustedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoAssignmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactLead_mobile_idx" ON "ContactLead"("mobile");
CREATE INDEX "ContactLead_sourceId_idx" ON "ContactLead"("sourceId");
CREATE INDEX "ContactLead_preferredProjectId_idx" ON "ContactLead"("preferredProjectId");
CREATE INDEX "ContactLead_assignedToId_idx" ON "ContactLead"("assignedToId");
CREATE INDEX "ContactLead_status_createdAt_idx" ON "ContactLead"("status", "createdAt");
CREATE INDEX "AutoAssignmentRule_isEnabled_idx" ON "AutoAssignmentRule"("isEnabled");
CREATE INDEX "AutoAssignmentRule_sourceId_idx" ON "AutoAssignmentRule"("sourceId");
CREATE INDEX "AutoAssignmentRule_projectId_idx" ON "AutoAssignmentRule"("projectId");
CREATE INDEX "AutoAssignmentRule_teamId_idx" ON "AutoAssignmentRule"("teamId");
CREATE INDEX "AutoAssignmentEvent_status_dueAt_idx" ON "AutoAssignmentEvent"("status", "dueAt");
CREATE INDEX "AutoAssignmentEvent_leadId_status_idx" ON "AutoAssignmentEvent"("leadId", "status");
