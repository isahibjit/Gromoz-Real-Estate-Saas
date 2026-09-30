-- Tenant-owned WhatsApp provider configuration and durable dispatch outbox.
CREATE TYPE "WhatsAppProviderMode" AS ENUM ('PLATFORM', 'CUSTOM_PINBOT');
CREATE TYPE "WhatsAppDispatchStatus" AS ENUM ('QUEUED', 'PROCESSING', 'RETRYING', 'ACCEPTED', 'FAILED', 'SKIPPED');

ALTER TABLE "NotificationSetting"
  ADD COLUMN "organizationId" TEXT,
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "globalWhatsAppEnabled" SET DEFAULT false;

CREATE UNIQUE INDEX "NotificationSetting_organizationId_key"
  ON "NotificationSetting"("organizationId");

ALTER TABLE "NotificationSetting"
  ADD CONSTRAINT "NotificationSetting_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "organizationId" TEXT;

CREATE INDEX "Notification_organizationId_createdAt_idx"
  ON "Notification"("organizationId", "createdAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OrganizationWhatsAppConfig" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "providerMode" "WhatsAppProviderMode" NOT NULL DEFAULT 'PLATFORM',
  "encryptedCustomApiKey" TEXT,
  "customApiUrl" TEXT,
  "customSenderNumber" TEXT,
  "customTemplateLanguage" TEXT NOT NULL DEFAULT 'en',
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationWhatsAppConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationWhatsAppConfig_organizationId_key"
  ON "OrganizationWhatsAppConfig"("organizationId");

ALTER TABLE "OrganizationWhatsAppConfig"
  ADD CONSTRAINT "OrganizationWhatsAppConfig_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WhatsAppDispatch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "notificationId" TEXT NOT NULL,
  "recipientUserId" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "templateLanguage" TEXT NOT NULL,
  "templateParameters" JSONB NOT NULL,
  "recipientMasked" TEXT,
  "status" "WhatsAppDispatchStatus" NOT NULL DEFAULT 'QUEUED',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseExpiresAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "providerMessageId" TEXT,
  "lastError" TEXT,
  "acceptedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "skippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppDispatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppDispatch_notificationId_key"
  ON "WhatsAppDispatch"("notificationId");
CREATE INDEX "WhatsAppDispatch_organizationId_createdAt_idx"
  ON "WhatsAppDispatch"("organizationId", "createdAt");
CREATE INDEX "WhatsAppDispatch_status_availableAt_idx"
  ON "WhatsAppDispatch"("status", "availableAt");
CREATE INDEX "WhatsAppDispatch_leaseExpiresAt_idx"
  ON "WhatsAppDispatch"("leaseExpiresAt");
CREATE INDEX "WhatsAppDispatch_recipientUserId_idx"
  ON "WhatsAppDispatch"("recipientUserId");

ALTER TABLE "WhatsAppDispatch"
  ADD CONSTRAINT "WhatsAppDispatch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppDispatch"
  ADD CONSTRAINT "WhatsAppDispatch_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsAppDispatch"
  ADD CONSTRAINT "WhatsAppDispatch_recipientUserId_fkey"
  FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WhatsAppDispatchAttempt" (
  "id" TEXT NOT NULL,
  "dispatchId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL,
  "status" "WhatsAppDispatchStatus" NOT NULL,
  "httpStatus" INTEGER,
  "providerMessageId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WhatsAppDispatchAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppDispatchAttempt_dispatchId_attemptNumber_key"
  ON "WhatsAppDispatchAttempt"("dispatchId", "attemptNumber");
CREATE INDEX "WhatsAppDispatchAttempt_dispatchId_startedAt_idx"
  ON "WhatsAppDispatchAttempt"("dispatchId", "startedAt");

ALTER TABLE "WhatsAppDispatchAttempt"
  ADD CONSTRAINT "WhatsAppDispatchAttempt_dispatchId_fkey"
  FOREIGN KEY ("dispatchId") REFERENCES "WhatsAppDispatch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the legacy global row for rollback inspection. Each tenant receives
-- the legacy FCM choices, but all WhatsApp masters and event switches start off.
INSERT INTO "NotificationSetting" (
  "id",
  "organizationId",
  "globalFcmEnabled",
  "globalWhatsAppEnabled",
  "eventSettings",
  "updatedById",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  organization."id",
  COALESCE(legacy."globalFcmEnabled", true),
  false,
  CASE
    WHEN jsonb_typeof(legacy."eventSettings") = 'object' THEN (
      SELECT COALESCE(
        jsonb_object_agg(
          entry.key,
          CASE
            WHEN jsonb_typeof(entry.value) = 'object'
              THEN entry.value || '{"whatsappEnabled": false}'::jsonb
            ELSE '{"fcmEnabled": true, "whatsappEnabled": false}'::jsonb
          END
        ),
        '{}'::jsonb
      )
      FROM jsonb_each(legacy."eventSettings") AS entry(key, value)
    )
    ELSE '{}'::jsonb
  END,
  legacy."updatedById",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Organization" AS organization
LEFT JOIN "NotificationSetting" AS legacy ON legacy."id" = 'global'
ON CONFLICT ("organizationId") DO NOTHING;
