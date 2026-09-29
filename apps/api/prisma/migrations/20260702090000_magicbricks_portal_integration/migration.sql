-- CreateTable
CREATE TABLE "PortalIntegration" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "webhookKeyId" TEXT NOT NULL,
    "fieldMapping" JSONB,
    "notes" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastLeadReceivedAt" TIMESTAMP(3),
    "totalLeadsReceived" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortalIntegration_provider_key" ON "PortalIntegration"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "PortalIntegration_webhookKeyId_key" ON "PortalIntegration"("webhookKeyId");

-- CreateIndex
CREATE INDEX "PortalIntegration_provider_isActive_idx" ON "PortalIntegration"("provider", "isActive");
