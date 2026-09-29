ALTER TABLE "LeadMasterValue"
ADD COLUMN "followUpNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "followUpRenotifyMinutes" INTEGER;
