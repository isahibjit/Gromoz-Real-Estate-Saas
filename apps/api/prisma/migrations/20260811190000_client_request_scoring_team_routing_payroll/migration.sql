-- Source master point eligibility and payroll PF override support.
ALTER TABLE "LeadMasterValue"
  ADD COLUMN IF NOT EXISTS "pointsEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "PayrollRecord"
  ADD COLUMN IF NOT EXISTS "pfAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pfOverrideReason" TEXT,
  ADD COLUMN IF NOT EXISTS "pfUpdatedById" TEXT,
  ADD COLUMN IF NOT EXISTS "pfUpdatedAt" TIMESTAMP(3);

-- A leader can lead more than one team. Team membership remains many-to-many,
-- while EmployeeProfile.teamId is retained as the primary payroll/attendance team.
DROP INDEX IF EXISTS "Team_leaderId_key";
CREATE INDEX IF NOT EXISTS "Team_leaderId_idx" ON "Team"("leaderId");

CREATE TABLE IF NOT EXISTS "TeamMembership" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamMembership_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamMembership"
      ADD CONSTRAINT "TeamMembership_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamMembership_userId_fkey'
  ) THEN
    ALTER TABLE "TeamMembership"
      ADD CONSTRAINT "TeamMembership_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMembership_teamId_userId_key"
  ON "TeamMembership"("teamId", "userId");
CREATE INDEX IF NOT EXISTS "TeamMembership_teamId_idx"
  ON "TeamMembership"("teamId");
CREATE INDEX IF NOT EXISTS "TeamMembership_userId_idx"
  ON "TeamMembership"("userId");
CREATE INDEX IF NOT EXISTS "TeamMembership_userId_isPrimary_idx"
  ON "TeamMembership"("userId", "isPrimary");

INSERT INTO "TeamMembership" ("id", "teamId", "userId", "isPrimary", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "teamId", "userId", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "EmployeeProfile"
WHERE "teamId" IS NOT NULL
ON CONFLICT ("teamId", "userId") DO UPDATE SET
  "isPrimary" = true,
  "updatedAt" = CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "TeamLeaderVisibilityGrant" (
  "id" TEXT NOT NULL,
  "leaderUserId" TEXT NOT NULL,
  "teamId" TEXT,
  "userId" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamLeaderVisibilityGrant_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamLeaderVisibilityGrant_leaderUserId_fkey'
  ) THEN
    ALTER TABLE "TeamLeaderVisibilityGrant"
      ADD CONSTRAINT "TeamLeaderVisibilityGrant_leaderUserId_fkey"
      FOREIGN KEY ("leaderUserId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamLeaderVisibilityGrant_teamId_fkey'
  ) THEN
    ALTER TABLE "TeamLeaderVisibilityGrant"
      ADD CONSTRAINT "TeamLeaderVisibilityGrant_teamId_fkey"
      FOREIGN KEY ("teamId") REFERENCES "Team"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamLeaderVisibilityGrant_userId_fkey'
  ) THEN
    ALTER TABLE "TeamLeaderVisibilityGrant"
      ADD CONSTRAINT "TeamLeaderVisibilityGrant_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TeamLeaderVisibilityGrant_updatedById_fkey'
  ) THEN
    ALTER TABLE "TeamLeaderVisibilityGrant"
      ADD CONSTRAINT "TeamLeaderVisibilityGrant_updatedById_fkey"
      FOREIGN KEY ("updatedById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "TeamLeaderVisibilityGrant_leaderUserId_idx"
  ON "TeamLeaderVisibilityGrant"("leaderUserId");
CREATE INDEX IF NOT EXISTS "TeamLeaderVisibilityGrant_teamId_idx"
  ON "TeamLeaderVisibilityGrant"("teamId");
CREATE INDEX IF NOT EXISTS "TeamLeaderVisibilityGrant_userId_idx"
  ON "TeamLeaderVisibilityGrant"("userId");

CREATE TABLE IF NOT EXISTS "IntegrationRoutingRule" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "accountKey" TEXT,
  "accountLabel" TEXT,
  "pageId" TEXT,
  "pageName" TEXT,
  "formId" TEXT,
  "formName" TEXT,
  "campaignId" TEXT,
  "campaignName" TEXT,
  "sourceId" TEXT,
  "teamId" TEXT,
  "projectId" TEXT,
  "telecallerId" TEXT,
  "fieldExecutiveId" TEXT,
  "assignmentMode" TEXT NOT NULL DEFAULT 'AUTO_ASSIGN',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationRoutingRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "IntegrationRoutingRule_provider_isActive_idx"
  ON "IntegrationRoutingRule"("provider", "isActive");
CREATE INDEX IF NOT EXISTS "IntegrationRoutingRule_accountKey_idx"
  ON "IntegrationRoutingRule"("accountKey");
CREATE INDEX IF NOT EXISTS "IntegrationRoutingRule_pageId_formId_campaignId_idx"
  ON "IntegrationRoutingRule"("pageId", "formId", "campaignId");
CREATE INDEX IF NOT EXISTS "IntegrationRoutingRule_teamId_idx"
  ON "IntegrationRoutingRule"("teamId");
