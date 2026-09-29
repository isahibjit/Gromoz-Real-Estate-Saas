-- Migration: Add notificationEmail & EmailConnector table if missing
-- Date: 2026-09-08

CREATE TABLE IF NOT EXISTS "EmailConnector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'smtp',
    "host" TEXT NOT NULL DEFAULT 'smtp.gmail.com',
    "port" INTEGER NOT NULL DEFAULT 465,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "fromName" TEXT,
    "fromEmail" TEXT NOT NULL,
    "notificationEmail" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailConnector_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailLog" (
    "id" TEXT NOT NULL,
    "connectorId" TEXT,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Sent',
    "error" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmailLog_connectorId_fkey'
    ) THEN
        ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_connectorId_fkey" 
        FOREIGN KEY ("connectorId") REFERENCES "EmailConnector"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

ALTER TABLE "EmailConnector" ADD COLUMN IF NOT EXISTS "notificationEmail" TEXT;
