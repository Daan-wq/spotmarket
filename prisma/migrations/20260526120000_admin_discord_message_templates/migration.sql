CREATE TYPE "DiscordMessageTemplateKind" AS ENUM ('DRAFT', 'TEMPLATE');

CREATE TABLE "DiscordMessageTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "DiscordMessageTemplateKind" NOT NULL DEFAULT 'DRAFT',
  "content" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DiscordMessageTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DiscordMessageTemplate_kind_updatedAt_idx"
  ON "DiscordMessageTemplate"("kind", "updatedAt");

CREATE INDEX "DiscordMessageTemplate_createdByUserId_idx"
  ON "DiscordMessageTemplate"("createdByUserId");

CREATE INDEX "DiscordMessageTemplate_updatedByUserId_idx"
  ON "DiscordMessageTemplate"("updatedByUserId");

ALTER TABLE "DiscordMessageTemplate"
  ADD CONSTRAINT "DiscordMessageTemplate_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DiscordMessageTemplate"
  ADD CONSTRAINT "DiscordMessageTemplate_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
