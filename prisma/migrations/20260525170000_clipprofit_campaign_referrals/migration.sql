ALTER TABLE "Campaign"
ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

WITH target AS (
  SELECT id
  FROM "Campaign"
  WHERE lower("name") = 'clipprofit'
  ORDER BY "createdAt" DESC
  LIMIT 1
)
UPDATE "Campaign"
SET
  "slug" = 'clipprofit',
  "linkInBioRequired" = 'Plaats je persoonlijke ClipProfit-link in je bio.',
  "bioRequirement" = COALESCE("bioRequirement", 'Plaats je persoonlijke ClipProfit-link in je bio.')
WHERE id IN (SELECT id FROM target)
  AND "slug" IS NULL;

ALTER TABLE "SignupTicket"
ADD COLUMN "campaignSlug" TEXT,
ADD COLUMN "clickId" TEXT;

CREATE TABLE "CampaignReferralAttribution" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referralCode" TEXT NOT NULL,
  "clickId" TEXT NOT NULL,
  "referredUserId" TEXT,
  "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "signedUpAt" TIMESTAMP(3),
  "onboardedAt" TIMESTAMP(3),
  "discordLinkedAt" TIMESTAMP(3),
  "socialConnectedAt" TIMESTAMP(3),
  "firstSubmissionAt" TIMESTAMP(3),
  "activeAt" TIMESTAMP(3),
  "firstEarnedAmount" DECIMAL(10,2),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CampaignReferralAttribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CampaignReferralAttribution_clickId_key"
ON "CampaignReferralAttribution"("clickId");

CREATE UNIQUE INDEX "CampaignReferralAttribution_campaignId_referredUserId_key"
ON "CampaignReferralAttribution"("campaignId", "referredUserId");

CREATE INDEX "CampaignReferralAttribution_campaignId_idx"
ON "CampaignReferralAttribution"("campaignId");

CREATE INDEX "CampaignReferralAttribution_referrerId_idx"
ON "CampaignReferralAttribution"("referrerId");

CREATE INDEX "CampaignReferralAttribution_campaignId_referrerId_idx"
ON "CampaignReferralAttribution"("campaignId", "referrerId");

CREATE INDEX "CampaignReferralAttribution_referredUserId_idx"
ON "CampaignReferralAttribution"("referredUserId");

CREATE INDEX "CampaignReferralAttribution_onboardedAt_idx"
ON "CampaignReferralAttribution"("onboardedAt");

CREATE INDEX "CampaignReferralAttribution_activeAt_idx"
ON "CampaignReferralAttribution"("activeAt");

ALTER TABLE "CampaignReferralAttribution"
ADD CONSTRAINT "CampaignReferralAttribution_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignReferralAttribution"
ADD CONSTRAINT "CampaignReferralAttribution_referrerId_fkey"
FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignReferralAttribution"
ADD CONSTRAINT "CampaignReferralAttribution_referredUserId_fkey"
FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
