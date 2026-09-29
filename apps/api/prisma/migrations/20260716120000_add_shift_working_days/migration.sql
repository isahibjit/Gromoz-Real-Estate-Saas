ALTER TABLE "ShiftTemplate"
ADD COLUMN "workingDays" INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5,6]::INTEGER[];

UPDATE "ShiftTemplate"
SET "workingDays" = COALESCE(
  (SELECT "workingDays" FROM "PayrollSetting" ORDER BY "createdAt" ASC LIMIT 1),
  ARRAY[1,2,3,4,5,6]::INTEGER[]
)
WHERE "workingDays" = ARRAY[1,2,3,4,5,6]::INTEGER[];
