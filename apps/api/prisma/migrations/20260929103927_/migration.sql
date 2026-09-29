-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('TRIAL', 'SETUP_PENDING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('STARTER', 'GROWTH', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "AttendanceRecord" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "EmailConnector" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "IntegrationRoutingRule" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "LeadMasterValue" ADD COLUMN     "autoAssignActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "PayrollRecord" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "TeamLeaderVisibilityGrant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TeamMembership" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'SETUP_PENDING',
    "planTier" "PlanTier" NOT NULL DEFAULT 'STARTER',
    "allocatedSeats" INTEGER NOT NULL DEFAULT 1,
    "pricePerSeatMonth" DOUBLE PRECISION NOT NULL DEFAULT 500.0,
    "setupFeeAmount" DOUBLE PRECISION NOT NULL DEFAULT 9999.0,
    "setupFeePaid" BOOLEAN NOT NULL DEFAULT false,
    "razorpayCustomerId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALES_AGENT',
    "isOwner" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'SALES_AGENT',
    "token" TEXT NOT NULL,
    "invitedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingTransaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "type" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "razorpayOrderId" TEXT,
    "status" TEXT NOT NULL,
    "receiptUrl" TEXT,
    "invoiceNumber" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousingIntegration" (
    "id" TEXT NOT NULL,
    "webhookKeyId" TEXT NOT NULL,
    "apiKey" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "fieldMapping" JSONB,
    "lastWebhookReceivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HousingIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_organizationId_idx" ON "OrganizationInvitation"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_email_idx" ON "OrganizationInvitation"("email");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE UNIQUE INDEX "BillingTransaction_razorpayPaymentId_key" ON "BillingTransaction"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "BillingTransaction_organizationId_idx" ON "BillingTransaction"("organizationId");

-- CreateIndex
CREATE INDEX "BillingTransaction_razorpayPaymentId_idx" ON "BillingTransaction"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "HousingIntegration_webhookKeyId_key" ON "HousingIntegration"("webhookKeyId");

-- CreateIndex
CREATE INDEX "AttendanceRecord_organizationId_idx" ON "AttendanceRecord"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "LeaveRequest_organizationId_idx" ON "LeaveRequest"("organizationId");

-- CreateIndex
CREATE INDEX "PayrollRecord_organizationId_idx" ON "PayrollRecord"("organizationId");

-- CreateIndex
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "Team"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingTransaction" ADD CONSTRAINT "BillingTransaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
