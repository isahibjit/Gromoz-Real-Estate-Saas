-- AlterTable
ALTER TABLE "LeadMasterValue" ADD COLUMN "showInStatsCard" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showInFilterBar" BOOLEAN NOT NULL DEFAULT true;
