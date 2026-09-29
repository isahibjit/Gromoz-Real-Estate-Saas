ALTER TABLE "FollowUp"
ADD COLUMN "reminderSentAt" TIMESTAMP(3);

CREATE TABLE "MobileDeviceToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "deviceId" TEXT,
    "appVersion" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileDeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MobileDeviceToken_token_key" ON "MobileDeviceToken"("token");
CREATE INDEX "MobileDeviceToken_userId_isActive_idx" ON "MobileDeviceToken"("userId", "isActive");
CREATE INDEX "MobileDeviceToken_platform_isActive_idx" ON "MobileDeviceToken"("platform", "isActive");
CREATE INDEX "FollowUp_setReminder_completedAt_reminderSentAt_scheduledAt_idx" ON "FollowUp"("setReminder", "completedAt", "reminderSentAt", "scheduledAt");

ALTER TABLE "MobileDeviceToken"
ADD CONSTRAINT "MobileDeviceToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
