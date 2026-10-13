BEGIN;

ALTER TABLE "AutoAssignmentRule" ADD COLUMN "rotationCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AutoAssignmentRule" ADD CONSTRAINT "AutoAssignmentRule_rotationCount_positive" CHECK ("rotationCount" >= 1);
ALTER TABLE "AutoAssignmentEvent" ADD COLUMN "currentCycle" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "routeSnapshot" JSONB,
  ADD COLUMN "stopReason" TEXT;
ALTER TABLE "AutoAssignmentEvent" ADD CONSTRAINT "AutoAssignmentEvent_currentCycle_positive" CHECK ("currentCycle" >= 1);

-- Freeze legacy active runs at one pass without modifying owner, index, deadline, or history.
UPDATE "AutoAssignmentEvent" AS event
SET "routeSnapshot" = jsonb_build_object(
  'userIds', CASE
    WHEN rule."initialUserId" IS NOT NULL AND NOT COALESCE(rule."transferSequence", '[]'::jsonb) @> jsonb_build_array(rule."initialUserId")
      THEN jsonb_build_array(rule."initialUserId") || COALESCE(rule."transferSequence", '[]'::jsonb)
    ELSE COALESCE(rule."transferSequence", '[]'::jsonb)
  END,
  'rotationCount', 1,
  'transferTimeMinutes', GREATEST(rule."transferTimeMinutes", 1)
)
FROM "AutoAssignmentRule" AS rule
WHERE event."ruleId" = rule."id" AND event."status" = 'ACTIVE';

COMMIT;
