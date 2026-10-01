ALTER TABLE "LeadImport"
ADD COLUMN "organizationId" TEXT;

CREATE INDEX "LeadImport_organizationId_targetType_createdAt_idx"
ON "LeadImport"("organizationId", "targetType", "createdAt");

ALTER TABLE "LeadImport"
ADD CONSTRAINT "LeadImport_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "OrganizationGoogleMapsConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "keyLastFour" TEXT NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationGoogleMapsConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationGoogleMapsConfig_organizationId_key"
ON "OrganizationGoogleMapsConfig"("organizationId");

CREATE INDEX "OrganizationGoogleMapsConfig_updatedById_idx"
ON "OrganizationGoogleMapsConfig"("updatedById");

ALTER TABLE "OrganizationGoogleMapsConfig"
ADD CONSTRAINT "OrganizationGoogleMapsConfig_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationGoogleMapsConfig"
ADD CONSTRAINT "OrganizationGoogleMapsConfig_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
