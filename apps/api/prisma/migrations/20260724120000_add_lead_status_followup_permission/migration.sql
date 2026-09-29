ALTER TABLE "LeadMasterValue"
ADD COLUMN "allowFollowUp" BOOLEAN NOT NULL DEFAULT true;

UPDATE "LeadMasterValue" value
SET "allowFollowUp" = false
FROM "LeadMasterCategory" category
WHERE value."categoryId" = category."id"
  AND category."code" = 'status'
  AND (
    LOWER(value."name") IN ('not interested', 'lost lead', 'lost')
    OR LOWER(value."code") IN ('not_interested', 'lost_lead', 'lost')
  );
