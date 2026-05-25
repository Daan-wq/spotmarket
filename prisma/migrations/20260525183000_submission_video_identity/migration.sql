-- Add durable platform video identities for global submission dedupe.
-- Values are nullable so existing rows can be backfilled safely by
-- scripts/backfill-submission-video-identities.ts before they participate in
-- the uniqueness constraint.
ALTER TABLE "CampaignSubmission"
  ADD COLUMN "normalizedPlatform" TEXT,
  ADD COLUMN "platformVideoId" TEXT;

CREATE UNIQUE INDEX "CampaignSubmission_normalizedPlatform_platformVideoId_key"
  ON "CampaignSubmission"("normalizedPlatform", "platformVideoId");
