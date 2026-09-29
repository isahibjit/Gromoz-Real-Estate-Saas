ALTER TABLE "AccessTemplate"
ADD COLUMN "canPunchIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canPunchOut" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "UserModulePermission"
ADD COLUMN "canPunchIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "canPunchOut" BOOLEAN NOT NULL DEFAULT false;

UPDATE "AccessTemplate"
SET
  "canPunchIn" = "canView",
  "canPunchOut" = "canView",
  "canCreate" = false,
  "canDelete" = false
WHERE "moduleKey" = 'attendance';

UPDATE "UserModulePermission"
SET
  "canPunchIn" = "canView",
  "canPunchOut" = "canView",
  "canCreate" = false,
  "canDelete" = false
WHERE "moduleKey" = 'attendance';

UPDATE "AccessTemplate"
SET "canUpdate" = false
WHERE
  "moduleKey" = 'attendance'
  AND "role" NOT IN ('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER');

UPDATE "UserModulePermission" AS permission
SET "canUpdate" = false
FROM "User" AS target
WHERE
  permission."userId" = target."id"
  AND permission."moduleKey" = 'attendance'
  AND target."role" NOT IN ('SUPER_ADMIN', 'ADMIN', 'HR', 'SALES_MANAGER');
