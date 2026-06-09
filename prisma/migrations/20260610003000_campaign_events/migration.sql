-- CreateEnum
CREATE TYPE "CampaignEventType" AS ENUM ('STARTED', 'PAUSED', 'RESUMED', 'COMPLETED');

-- CreateTable
CREATE TABLE "CampaignEvent" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "type" "CampaignEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    "transitionKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignEvent_transitionKey_key" ON "CampaignEvent"("transitionKey");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_occurredAt_idx" ON "CampaignEvent"("campaignId", "occurredAt");

-- CreateIndex
CREATE INDEX "CampaignEvent_campaignId_type_idx" ON "CampaignEvent"("campaignId", "type");

-- AddForeignKey
ALTER TABLE "CampaignEvent" ADD CONSTRAINT "CampaignEvent_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
