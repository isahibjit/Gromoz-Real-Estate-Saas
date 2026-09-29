CREATE TABLE "RealtimeOutboxEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "publishedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RealtimeOutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RealtimeOutboxEvent_publishedAt_availableAt_idx"
ON "RealtimeOutboxEvent"("publishedAt", "availableAt");

CREATE INDEX "RealtimeOutboxEvent_leaseExpiresAt_idx"
ON "RealtimeOutboxEvent"("leaseExpiresAt");

CREATE INDEX "RealtimeOutboxEvent_aggregateType_aggregateId_idx"
ON "RealtimeOutboxEvent"("aggregateType", "aggregateId");
