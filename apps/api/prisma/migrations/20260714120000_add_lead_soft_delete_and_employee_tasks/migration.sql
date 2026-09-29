ALTER TABLE "Lead"
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedById" TEXT,
ADD COLUMN "deleteReason" TEXT;

ALTER TABLE "Task"
ADD COLUMN "description" TEXT,
ADD COLUMN "createdById" TEXT,
ADD COLUMN "completedAt" TIMESTAMP(3);

ALTER TABLE "Task"
ALTER COLUMN "status" SET DEFAULT 'Pending';

CREATE INDEX "Lead_deletedAt_idx" ON "Lead"("deletedAt");
CREATE INDEX "Task_assignedToId_status_dueAt_idx" ON "Task"("assignedToId", "status", "dueAt");
CREATE INDEX "Task_leadId_idx" ON "Task"("leadId");
