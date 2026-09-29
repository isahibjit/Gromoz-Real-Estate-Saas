ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "RoleTwoFactorSetting" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleTwoFactorSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleTwoFactorSetting_role_key" ON "RoleTwoFactorSetting"("role");
CREATE INDEX "RoleTwoFactorSetting_role_idx" ON "RoleTwoFactorSetting"("role");

ALTER TABLE "RoleTwoFactorSetting" ADD CONSTRAINT "RoleTwoFactorSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
