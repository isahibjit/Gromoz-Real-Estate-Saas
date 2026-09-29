-- AlterTable
ALTER TABLE "LeadImport"
ADD COLUMN "targetType" TEXT NOT NULL DEFAULT 'LEAD';

-- CreateIndex
CREATE INDEX "LeadImport_targetType_createdAt_idx" ON "LeadImport"("targetType", "createdAt");
