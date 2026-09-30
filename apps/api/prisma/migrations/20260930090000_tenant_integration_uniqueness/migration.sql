-- Integration types are shared capabilities; connection records are tenant-owned.
-- Leave legacy NULL owners unassigned. Do not copy or transfer credentials.
BEGIN;
ALTER TABLE "PortalIntegration" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE "HousingIntegration" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- The original single-client index prevents two tenants using the same provider.
DROP INDEX IF EXISTS "PortalIntegration_provider_key";
CREATE UNIQUE INDEX IF NOT EXISTS "PortalIntegration_organizationId_provider_key"
  ON "PortalIntegration" ("organizationId", "provider");
CREATE UNIQUE INDEX IF NOT EXISTS "HousingIntegration_organizationId_key"
  ON "HousingIntegration" ("organizationId");

CREATE INDEX IF NOT EXISTS "PortalIntegration_organizationId_isActive_idx"
  ON "PortalIntegration" ("organizationId", "isActive");
CREATE INDEX IF NOT EXISTS "HousingIntegration_organizationId_isActive_idx"
  ON "HousingIntegration" ("organizationId", "isActive");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PortalIntegration_organizationId_fkey'
    AND conrelid = '"PortalIntegration"'::regclass) THEN
    ALTER TABLE "PortalIntegration" ADD CONSTRAINT "PortalIntegration_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HousingIntegration_organizationId_fkey'
    AND conrelid = '"HousingIntegration"'::regclass) THEN
    ALTER TABLE "HousingIntegration" ADD CONSTRAINT "HousingIntegration_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
COMMIT;
