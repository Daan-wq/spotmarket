ALTER TABLE "DiscordMessageTemplate"
  ADD COLUMN "buttons" JSONB NOT NULL DEFAULT '[]'::jsonb;
