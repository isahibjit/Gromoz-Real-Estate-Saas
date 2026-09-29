CREATE TYPE "LeadVisibilityOverrideAccess" AS ENUM ('ALLOW', 'BLOCK');

CREATE TABLE "LeadVisibilityOverride" (
  "id" TEXT NOT NULL,
  "viewerUserId" TEXT NOT NULL,
  "targetUserId" TEXT NOT NULL,
  "accessType" "LeadVisibilityOverrideAccess" NOT NULL,
  "updatedById" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LeadVisibilityOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadVisibilityOverride_viewerUserId_targetUserId_key"
  ON "LeadVisibilityOverride"("viewerUserId", "targetUserId");

CREATE INDEX "LeadVisibilityOverride_viewerUserId_idx"
  ON "LeadVisibilityOverride"("viewerUserId");

CREATE INDEX "LeadVisibilityOverride_targetUserId_idx"
  ON "LeadVisibilityOverride"("targetUserId");

CREATE INDEX "LeadVisibilityOverride_accessType_idx"
  ON "LeadVisibilityOverride"("accessType");

ALTER TABLE "LeadVisibilityOverride"
  ADD CONSTRAINT "LeadVisibilityOverride_viewerUserId_fkey"
  FOREIGN KEY ("viewerUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadVisibilityOverride"
  ADD CONSTRAINT "LeadVisibilityOverride_targetUserId_fkey"
  FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadVisibilityOverride"
  ADD CONSTRAINT "LeadVisibilityOverride_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
