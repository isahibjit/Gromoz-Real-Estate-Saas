-- Preserve saved routes and historical assignments. Management overrides use
-- the canonical lead owner field, not either executive role.
ALTER TABLE "IntegrationRoutingRule" ADD COLUMN "ownerId" TEXT;
ALTER TABLE "IntegrationRoutingRule" ALTER COLUMN "assignmentMode" SET DEFAULT 'UNASSIGNED';
