-- Booking commercial snapshots and brokerage calculations
ALTER TABLE "Booking"
  ADD COLUMN "agreementValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "remarks" TEXT,
  ADD COLUMN "leadCreatedAtSnapshot" TIMESTAMP(3),
  ADD COLUMN "leadSourceSnapshot" TEXT,
  ADD COLUMN "customerNameSnapshot" TEXT,
  ADD COLUMN "customerMobileSnapshot" TEXT,
  ADD COLUMN "projectNameSnapshot" TEXT,
  ADD COLUMN "towerWingSnapshot" TEXT,
  ADD COLUMN "flatNoSnapshot" TEXT,
  ADD COLUMN "configurationSnapshot" TEXT,
  ADD COLUMN "baseBrokeragePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "ladderBrokeragePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "aopBrokeragePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "gstPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "tdsPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "passbackAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "baseBrokerageAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "ladderBrokerageAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "aopBrokerageAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "grossBrokerageAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "gstAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "tdsAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN "netBrokerageAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;

UPDATE "Booking"
SET "agreementValue" = "bookingAmount"
WHERE "agreementValue" = 0;

CREATE INDEX "Booking_bookingDate_status_idx" ON "Booking"("bookingDate", "status");
CREATE INDEX "Booking_projectId_status_idx" ON "Booking"("projectId", "status");

-- Payment ledger fields for brokerage and incentive components
ALTER TABLE "Payment"
  ADD COLUMN "receivedDate" TIMESTAMP(3),
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'BROKERAGE',
  ADD COLUMN "component" TEXT,
  ADD COLUMN "recipientUserId" TEXT,
  ADD COLUMN "referenceNo" TEXT,
  ADD COLUMN "remarks" TEXT;

CREATE INDEX "Payment_bookingId_kind_component_idx" ON "Payment"("bookingId", "kind", "component");
CREATE INDEX "Payment_recipientUserId_paymentDate_idx" ON "Payment"("recipientUserId", "paymentDate");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProjectBrokerageRule" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "baseBrokeragePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "ladderBrokeragePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "aopBrokeragePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "gstPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "tdsPct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "passbackDefaultAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "salesIncentivePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "preSalesIncentivePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "teamLeaderIncentivePct" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectBrokerageRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectBrokerageRule_projectId_key" ON "ProjectBrokerageRule"("projectId");
ALTER TABLE "ProjectBrokerageRule" ADD CONSTRAINT "ProjectBrokerageRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBrokerageRule" ADD CONSTRAINT "ProjectBrokerageRule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "BookingIncentive" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "roleType" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "percentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "extraAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'Pending',
  "paymentDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingIncentive_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingIncentive_bookingId_roleType_key" ON "BookingIncentive"("bookingId", "roleType");
CREATE INDEX "BookingIncentive_recipientUserId_paymentStatus_idx" ON "BookingIncentive"("recipientUserId", "paymentStatus");
ALTER TABLE "BookingIncentive" ADD CONSTRAINT "BookingIncentive_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingIncentive" ADD CONSTRAINT "BookingIncentive_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserCommissionTarget" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "roleScope" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "targetValue" INTEGER NOT NULL DEFAULT 0,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserCommissionTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCommissionTarget_userId_roleScope_year_month_key" ON "UserCommissionTarget"("userId", "roleScope", "year", "month");
CREATE INDEX "UserCommissionTarget_year_month_roleScope_idx" ON "UserCommissionTarget"("year", "month", "roleScope");
ALTER TABLE "UserCommissionTarget" ADD CONSTRAINT "UserCommissionTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserCommissionTarget" ADD CONSTRAINT "UserCommissionTarget_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IncentiveVisibilitySetting" (
  "id" TEXT NOT NULL,
  "roleScope" TEXT NOT NULL,
  "visibilityScope" TEXT NOT NULL DEFAULT 'OWN',
  "canEdit" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncentiveVisibilitySetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncentiveVisibilitySetting_roleScope_key" ON "IncentiveVisibilitySetting"("roleScope");
ALTER TABLE "IncentiveVisibilitySetting" ADD CONSTRAINT "IncentiveVisibilitySetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "IncentiveVisibilitySetting" ("id", "roleScope", "visibilityScope", "canEdit", "updatedAt")
VALUES
  ('d7e1dc1d-5617-4da2-a6c2-f16600f3e1a1', 'SALES', 'OWN', false, CURRENT_TIMESTAMP),
  ('a2b3cf89-df58-4059-bd97-9976541c7b5c', 'PRE_SALES', 'OWN', false, CURRENT_TIMESTAMP),
  ('0cba275b-2846-4584-971b-618ab0749704', 'TEAM_LEADER', 'OWN_AND_TEAM', false, CURRENT_TIMESTAMP)
ON CONFLICT ("roleScope") DO NOTHING;
