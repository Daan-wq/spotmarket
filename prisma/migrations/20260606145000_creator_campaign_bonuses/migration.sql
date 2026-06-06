-- CreateTable
CREATE TABLE "CreatorCampaignBonus" (
    "id" TEXT NOT NULL,
    "creatorProfileId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorCampaignBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatorCampaignBonus_reference_key" ON "CreatorCampaignBonus"("reference");

-- CreateIndex
CREATE INDEX "CreatorCampaignBonus_creatorProfileId_createdAt_idx" ON "CreatorCampaignBonus"("creatorProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "CreatorCampaignBonus_campaignId_createdAt_idx" ON "CreatorCampaignBonus"("campaignId", "createdAt");

-- AddForeignKey
ALTER TABLE "CreatorCampaignBonus" ADD CONSTRAINT "CreatorCampaignBonus_creatorProfileId_fkey" FOREIGN KEY ("creatorProfileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorCampaignBonus" ADD CONSTRAINT "CreatorCampaignBonus_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
