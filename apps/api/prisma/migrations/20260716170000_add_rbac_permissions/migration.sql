-- Add HR role to existing role enum.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'HR';

CREATE TABLE IF NOT EXISTS "AccessTemplate" (
  "id" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT false,
  "canCreate" BOOLEAN NOT NULL DEFAULT false,
  "canUpdate" BOOLEAN NOT NULL DEFAULT false,
  "canDelete" BOOLEAN NOT NULL DEFAULT false,
  "isSystemDefault" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccessTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserModulePermission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moduleKey" TEXT NOT NULL,
  "canView" BOOLEAN NOT NULL DEFAULT false,
  "canCreate" BOOLEAN NOT NULL DEFAULT false,
  "canUpdate" BOOLEAN NOT NULL DEFAULT false,
  "canDelete" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserModulePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccessTemplate_role_moduleKey_key" ON "AccessTemplate"("role", "moduleKey");
CREATE INDEX IF NOT EXISTS "AccessTemplate_role_idx" ON "AccessTemplate"("role");
CREATE UNIQUE INDEX IF NOT EXISTS "UserModulePermission_userId_moduleKey_key" ON "UserModulePermission"("userId", "moduleKey");
CREATE INDEX IF NOT EXISTS "UserModulePermission_userId_idx" ON "UserModulePermission"("userId");
CREATE INDEX IF NOT EXISTS "UserModulePermission_moduleKey_idx" ON "UserModulePermission"("moduleKey");

ALTER TABLE "UserModulePermission"
  ADD CONSTRAINT "UserModulePermission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserModulePermission"
  ADD CONSTRAINT "UserModulePermission_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
