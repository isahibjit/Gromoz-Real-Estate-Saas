/*
  Warnings:

  - You are about to drop the `WhatsappLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WhatsappTemplate` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "WhatsappLog" DROP CONSTRAINT "WhatsappLog_leadId_fkey";

-- AlterTable
ALTER TABLE "PortalIntegration" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "WhatsappLog";

-- DropTable
DROP TABLE "WhatsappTemplate";

-- AddForeignKey
ALTER TABLE "LeadProjectInterest" ADD CONSTRAINT "LeadProjectInterest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadProjectInterest" ADD CONSTRAINT "LeadProjectInterest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ProjectUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
