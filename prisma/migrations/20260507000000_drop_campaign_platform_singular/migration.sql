-- Drop the legacy singular Campaign.platform column.
-- All readers now consume Campaign.platforms[] (Phase 2).
-- The Platform enum is preserved — Campaign.platforms still uses it.

ALTER TABLE "Campaign" DROP COLUMN "platform";
