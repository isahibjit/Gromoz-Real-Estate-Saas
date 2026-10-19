-- Existing records remain unassigned until their ownership can be verified.
ALTER TABLE "EmailConnector" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "EmailLog" ADD COLUMN "organizationId" TEXT;

CREATE INDEX "EmailConnector_organizationId_isDefault_isActive_idx"
  ON "EmailConnector"("organizationId", "isDefault", "isActive");
CREATE INDEX "EmailLog_organizationId_sentAt_idx"
  ON "EmailLog"("organizationId", "sentAt");

ALTER TABLE "EmailConnector" ADD CONSTRAINT "EmailConnector_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
