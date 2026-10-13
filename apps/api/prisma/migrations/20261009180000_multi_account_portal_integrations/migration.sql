-- CreateTable
CREATE TABLE "LeadSourceConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "provider" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "webhookKeyId" TEXT NOT NULL,
    "apiKey" TEXT,
    "fieldMapping" JSONB,
    "settings" JSONB,
    "credentials" JSONB,
    "notes" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastTestStatus" TEXT,
    "lastLeadReceivedAt" TIMESTAMP(3),
    "totalLeadsReceived" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LeadSourceConnection_pkey" PRIMARY KEY ("id")
);

-- Add account attribution and account-scoped routing.
ALTER TABLE "Lead" ADD COLUMN "integrationConnectionId" TEXT;
ALTER TABLE "IntegrationRoutingRule" ADD COLUMN "connectionId" TEXT;

-- Preserve the current MagicBricks configuration exactly as the primary account.
INSERT INTO "LeadSourceConnection" (
    "id", "organizationId", "provider", "name", "status", "isActive", "isPrimary",
    "webhookKeyId", "fieldMapping", "settings", "credentials", "notes",
    "lastTestedAt", "lastTestStatus", "lastLeadReceivedAt", "totalLeadsReceived",
    "createdById", "updatedById", "createdAt", "updatedAt"
)
SELECT
    'magicbricks:' || "id", "organizationId", 'magicbricks', 'Primary account', "status", "isActive", true,
    "webhookKeyId", "fieldMapping", "settings", "credentials", "notes",
    "lastTestedAt", "lastTestStatus", "lastLeadReceivedAt", "totalLeadsReceived",
    "createdById", "updatedById", "createdAt", "updatedAt"
FROM "PortalIntegration"
WHERE "provider" = 'magicbricks'
ON CONFLICT DO NOTHING;

-- Some installations used the legacy Housing.com table without recording its
-- creation in Prisma migration history. Copy it when present, but keep a fresh
-- database deployable when that legacy table never existed.
DO $$
BEGIN
  IF to_regclass('"HousingIntegration"') IS NOT NULL THEN
    INSERT INTO "LeadSourceConnection" (
        "id", "organizationId", "provider", "name", "status", "isActive", "isPrimary",
        "webhookKeyId", "apiKey", "fieldMapping", "lastLeadReceivedAt",
        "createdById", "createdAt", "updatedAt"
    )
    SELECT
        'housing:' || "id", "organizationId", 'housing', 'Primary account',
        CASE WHEN "isActive" THEN 'Configured' ELSE 'Paused' END,
        "isActive", true, "webhookKeyId", "apiKey", "fieldMapping",
        "lastWebhookReceivedAt", "createdById", "createdAt", "updatedAt"
    FROM "HousingIntegration"
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

CREATE UNIQUE INDEX "LeadSourceConnection_webhookKeyId_key" ON "LeadSourceConnection"("webhookKeyId");
CREATE UNIQUE INDEX "LeadSourceConnection_tenant_provider_name_key" ON "LeadSourceConnection"("organizationId", "provider", "name");
CREATE UNIQUE INDEX "LeadSourceConnection_tenant_provider_external_key" ON "LeadSourceConnection"("organizationId", "provider", "externalAccountId");
CREATE UNIQUE INDEX "LeadSourceConnection_tenant_provider_name_ci_key" ON "LeadSourceConnection"("organizationId", "provider", LOWER("name"));
CREATE INDEX "LeadSourceConnection_tenant_provider_archived_created_idx" ON "LeadSourceConnection"("organizationId", "provider", "archivedAt", "createdAt");
CREATE INDEX "LeadSourceConnection_tenant_provider_active_idx" ON "LeadSourceConnection"("organizationId", "provider", "isActive");
CREATE INDEX "Lead_integrationConnectionId_idx" ON "Lead"("integrationConnectionId");
CREATE UNIQUE INDEX "IntegrationRoutingRule_connectionId_key" ON "IntegrationRoutingRule"("connectionId");

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_integrationConnectionId_fkey"
FOREIGN KEY ("integrationConnectionId") REFERENCES "LeadSourceConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IntegrationRoutingRule" ADD CONSTRAINT "IntegrationRoutingRule_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "LeadSourceConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadSourceConnection" ADD CONSTRAINT "LeadSourceConnection_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
