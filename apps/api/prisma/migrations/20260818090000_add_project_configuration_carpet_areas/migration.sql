-- Carpet area is configured once per project configuration rather than per unit.
ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "configurationCarpetAreas" JSONB;
