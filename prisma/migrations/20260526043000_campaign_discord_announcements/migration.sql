-- Track one Discord campaign announcement per campaign.
ALTER TABLE "Campaign" ADD COLUMN "discordAnnouncementChannelId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "discordAnnouncementMessageId" TEXT;
ALTER TABLE "Campaign" ADD COLUMN "discordAnnouncementSentAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Campaign_discordAnnouncementMessageId_key" ON "Campaign"("discordAnnouncementMessageId");
CREATE INDEX "Campaign_discordAnnouncementChannelId_idx" ON "Campaign"("discordAnnouncementChannelId");
