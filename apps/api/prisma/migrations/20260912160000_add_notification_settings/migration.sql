-- CreateTable
CREATE TABLE "NotificationSetting" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "globalFcmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "globalWhatsAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "eventSettings" JSONB,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSetting_pkey" PRIMARY KEY ("id")
);
