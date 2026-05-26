ALTER TABLE "DiscordMessageTemplate"
  ADD COLUMN "messageMode" TEXT NOT NULL DEFAULT 'CONTENT',
  ADD COLUMN "channelId" TEXT,
  ADD COLUMN "embeds" JSONB NOT NULL DEFAULT '[]'::jsonb;
