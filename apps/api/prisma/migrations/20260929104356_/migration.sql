/*
  Warnings:

  - A unique constraint covering the columns `[customDomain]` on the table `Organization` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "brandingPrimaryColor" TEXT NOT NULL DEFAULT '#0D1F3D',
ADD COLUMN     "brandingSecondaryColor" TEXT NOT NULL DEFAULT '#E20613',
ADD COLUMN     "city" TEXT,
ADD COLUMN     "collapsedLogoUrl" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'India',
ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customDomainSslStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "customDomainTxtRecord" TEXT,
ADD COLUMN     "customDomainVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "primaryEmail" TEXT,
ADD COLUMN     "primaryPhone" TEXT,
ADD COLUMN     "showLogoInLogin" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "showLogoInSidebar" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sidebarLogoHeight" INTEGER NOT NULL DEFAULT 42,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "workspaceSettingsJson" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");
