ALTER TABLE "Campaign"
ADD COLUMN "discordRoleId" TEXT,
ADD COLUMN "discordChannelId" TEXT;

CREATE UNIQUE INDEX "Campaign_discordRoleId_key" ON "Campaign"("discordRoleId");
CREATE UNIQUE INDEX "Campaign_discordChannelId_key" ON "Campaign"("discordChannelId");
