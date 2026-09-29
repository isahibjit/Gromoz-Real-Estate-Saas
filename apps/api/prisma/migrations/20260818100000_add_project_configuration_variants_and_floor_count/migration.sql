ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "configurationVariants" JSONB,
  ADD COLUMN IF NOT EXISTS "numberOfFloors" INTEGER;

-- Keep legacy carpet-size data usable while moving each configuration into an
-- ordered variant row. Existing projects receive blank per-variant prices.
UPDATE "Project"
SET "configurationVariants" = (
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', CONCAT('legacy-', key),
        'configuration', key,
        'carpetArea', value,
        'priceAmount', '',
        'priceUnit', 'Cr'
      )
      ORDER BY key
    ),
    '[]'::jsonb
  )
  FROM jsonb_each_text("Project"."configurationCarpetAreas")
)
WHERE "configurationVariants" IS NULL
  AND "configurationCarpetAreas" IS NOT NULL
  AND jsonb_typeof("configurationCarpetAreas") = 'object';
