CREATE TABLE "SupportTicket" (
 "id" TEXT NOT NULL, "number" SERIAL NOT NULL, "organizationId" TEXT NOT NULL,
 "requesterId" TEXT, "requesterName" TEXT NOT NULL, "requesterEmail" TEXT NOT NULL,
 "category" TEXT NOT NULL, "priority" TEXT NOT NULL DEFAULT 'NORMAL', "status" TEXT NOT NULL DEFAULT 'OPEN',
 "subject" TEXT NOT NULL, "description" TEXT NOT NULL, "targetPlanCode" TEXT,
 "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupportTicket_number_key" ON "SupportTicket"("number");
CREATE INDEX "SupportTicket_organizationId_createdAt_idx" ON "SupportTicket"("organizationId", "createdAt");
CREATE INDEX "SupportTicket_organizationId_status_idx" ON "SupportTicket"("organizationId", "status");
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
